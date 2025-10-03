import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { DatabaseService } from './database';
import {
  ValidationService,
  ValidationResult,
  DatabaseSnapshot,
} from './validationService';
import { ErrorHandlingService, ErrorResolution } from './errorHandlingService';
import { PerformanceOptimizationService } from './performanceOptimizationService';
import { isValidUUID } from '../utils/uuid';

// Import interfaces
export interface ImportOptions {
  batchSize: number;
  conflictResolution: 'update' | 'skip' | 'ask';
  validateReferences: boolean;
  createMissingReferences: boolean;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
  conflicts: DataConflict[];
  duration: number;
}

export interface ImportProgress {
  stage: string;
  current: number;
  total: number;
  percentage: number;
  estimatedTimeRemaining?: number;
}

export interface ImportPreview {
  dataType: string;
  recordCounts: Record<string, number>;
  sampleData: Record<string, any[]>;
  validationSummary: ValidationResult;
  conflicts: DataConflict[];
}

export interface DataConflict {
  type: 'duplicate' | 'reference_missing' | 'validation_failed';
  record: any;
  existingRecord?: any;
  field?: string;
  message: string;
  index: number;
}

export interface ConflictResolution {
  action: 'update' | 'skip' | 'create_new';
  applyToAll?: boolean;
}

export interface ImportError {
  index: number;
  record: any;
  field?: string;
  message: string;
  code: string;
}

export class DataImportService {
  private db: DatabaseService;
  private validationService: ValidationService;
  private errorHandler: ErrorHandlingService;
  private performanceOptimizer: PerformanceOptimizationService;
  private progressCallback?: (progress: ImportProgress) => void;
  private currentCheckpointId?: string;

  constructor(database: DatabaseService) {
    this.db = database;
    this.validationService = new ValidationService();
    this.errorHandler = new ErrorHandlingService();
    this.performanceOptimizer = new PerformanceOptimizationService();
  }

  // Progress tracking
  onProgress(callback: (progress: ImportProgress) => void): void {
    this.progressCallback = callback;
  }

  private updateProgress(stage: string, current: number, total: number): void {
    if (this.progressCallback) {
      const percentage = total > 0 ? (current / total) * 100 : 0;
      this.progressCallback({
        stage,
        current,
        total,
        percentage,
      });
    }
  }

  // Validate import file
  async validateImportFile(fileUri: string): Promise<ValidationResult> {
    try {
      const fileContent = await FileSystem.readAsStringAsync(fileUri);

      // First validate file format
      const formatValidation =
        this.validationService.validateFileFormat(fileContent);
      if (!formatValidation.isValid) {
        return formatValidation;
      }

      const data = JSON.parse(fileContent);

      // Validate data structure
      const structureValidation = this.validationService.validateDataStructure(
        data.data,
        data.dataType
      );
      if (!structureValidation.isValid) {
        return structureValidation;
      }

      // Check data integrity
      const integrityValidation =
        this.validationService.checkDataIntegrity(data);

      return {
        isValid:
          formatValidation.isValid &&
          structureValidation.isValid &&
          integrityValidation.isValid,
        errors: [
          ...formatValidation.errors,
          ...structureValidation.errors,
          ...integrityValidation.errors,
        ],
        warnings: [
          ...formatValidation.warnings,
          ...structureValidation.warnings,
          ...integrityValidation.warnings,
        ],
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            field: 'file',
            message:
              error instanceof Error
                ? error.message
                : 'Unknown file validation error',
            code: 'FILE_READ_ERROR',
            severity: 'error' as const,
          },
        ],
        warnings: [],
      };
    }
  }

  // Preview import data
  async previewImportData(fileUri: string): Promise<ImportPreview> {
    try {
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const importData = JSON.parse(fileContent);

      const dataType = importData.dataType || 'unknown';
      const data = importData.data || {};

      // Calculate record counts
      const recordCounts: Record<string, number> = {};
      Object.keys(data).forEach((key) => {
        if (Array.isArray(data[key])) {
          recordCounts[key] = data[key].length;
        }
      });

      // Get sample data (first 3 records of each type)
      const sampleData: Record<string, any[]> = {};
      Object.keys(data).forEach((key) => {
        if (Array.isArray(data[key])) {
          sampleData[key] = data[key].slice(0, 3);
        }
      });

      // Validate the data
      const validationSummary = await this.validateImportFile(fileUri);

      // Validate UUID format
      const uuidErrors = this.validateImportedUUIDs(data);
      if (uuidErrors.length > 0) {
        console.warn('UUID validation warnings in import data:', uuidErrors);
        // Add UUID errors to validation summary
        validationSummary.warnings.push(
          ...uuidErrors.map((error) => ({
            field: 'uuid',
            message: error,
            code: 'INVALID_UUID_FORMAT',
            severity: 'warning' as const,
          }))
        );
      }

      // Detect conflicts
      const conflicts = await this.detectConflicts(data, dataType);

      return {
        dataType,
        recordCounts,
        sampleData,
        validationSummary,
        conflicts,
      };
    } catch (error) {
      throw new Error(
        `Failed to preview import data: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  // Detect conflicts with existing data
  private async detectConflicts(
    data: any,
    dataType: string
  ): Promise<DataConflict[]> {
    const conflicts: DataConflict[] = [];

    try {
      // Get existing data for comparison
      const existingProducts = await this.db.getProducts();
      const existingCustomers = await this.db.getCustomers();
      const existingCategories = await this.db.getCategories();

      // Check for product conflicts
      if (data.products && Array.isArray(data.products)) {
        data.products.forEach((product: any, index: number) => {
          const existingProduct = existingProducts.find(
            (p) =>
              p.name === product.name ||
              (product.barcode && p.barcode === product.barcode)
          );

          if (existingProduct) {
            conflicts.push({
              type: 'duplicate',
              record: product,
              existingRecord: existingProduct,
              message: `Product "${product.name}" already exists`,
              index,
            });
          }

          // Check category reference
          if (
            product.category &&
            !existingCategories.find((c) => c.name === product.category)
          ) {
            conflicts.push({
              type: 'reference_missing',
              record: product,
              field: 'category',
              message: `Category "${product.category}" not found`,
              index,
            });
          }
        });
      }

      // Check for customer conflicts
      if (data.customers && Array.isArray(data.customers)) {
        data.customers.forEach((customer: any, index: number) => {
          const existingCustomer = existingCustomers.find(
            (c) =>
              c.name === customer.name ||
              (customer.phone && c.phone === customer.phone)
          );

          if (existingCustomer) {
            conflicts.push({
              type: 'duplicate',
              record: customer,
              existingRecord: existingCustomer,
              message: `Customer "${customer.name}" already exists`,
              index,
            });
          }
        });
      }

      // Add more conflict detection for other data types as needed
    } catch (error) {
      console.error('Error detecting conflicts:', error);
    }

    return conflicts;
  }

  // Import products
  async importProducts(
    fileUri: string,
    options: ImportOptions
  ): Promise<ImportResult> {
    const startTime = Date.now();
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: ImportError[] = [];
    const conflicts: DataConflict[] = [];

    try {
      this.updateProgress('Reading import file...', 0, 1);

      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const importData = JSON.parse(fileContent);

      console.log('Import data structure:', Object.keys(importData));
      console.log(
        'Import data.data structure:',
        importData.data ? Object.keys(importData.data) : 'No data field'
      );

      if (!importData.data || !importData.data.products) {
        throw new Error('No products data found in import file');
      }

      console.log('Products to import:', importData.data.products.length);

      const products = importData.data.products;
      const categories = importData.data.categories || [];
      const suppliers = importData.data.suppliers || [];

      this.updateProgress(
        'Validating data...',
        0,
        products.length + categories.length
      );

      // Get existing data
      const existingProducts = await this.db.getProducts();
      const existingCategories = await this.db.getCategories();
      const existingSuppliers = await this.db.getSuppliers();

      // Import categories first if they don't exist
      let categoryProgress = 0;
      for (const category of categories) {
        const existingCategory = existingCategories.find(
          (c) =>
            c.name === category.name || (category.id && c.id === category.id)
        );
        if (!existingCategory) {
          try {
            const categoryData: any = {
              name: category.name,
              description: category.description || '',
            };

            // If category has valid UUID, try to use it (for complete backup imports)
            if (category.id && isValidUUID(category.id)) {
              categoryData.id = category.id;
            }

            await this.db.addCategory(categoryData);
          } catch (error) {
            console.error('Error adding category:', error);
          }
        }
        categoryProgress++;
        this.updateProgress(
          'Importing categories...',
          categoryProgress,
          categories.length
        );
      }

      // Import suppliers if they don't exist
      let supplierProgress = 0;
      for (const supplier of suppliers) {
        const existingSupplier = existingSuppliers.find(
          (s) =>
            s.name === supplier.name || (supplier.id && s.id === supplier.id)
        );
        if (!existingSupplier) {
          try {
            const supplierData: any = {
              name: supplier.name,
              contact_name: supplier.contact_name || '',
              phone: supplier.phone || '',
              email: supplier.email || '',
              address: supplier.address || '',
            };

            // If supplier has valid UUID, try to use it (for complete backup imports)
            if (supplier.id && isValidUUID(supplier.id)) {
              supplierData.id = supplier.id;
            }

            await this.db.addSupplier(supplierData);
          } catch (error) {
            console.error('Error adding supplier:', error);
          }
        }
        supplierProgress++;
        this.updateProgress(
          'Importing suppliers...',
          supplierProgress,
          suppliers.length
        );
      }

      // Process products in batches
      this.updateProgress('Importing products...', 0, products.length);

      for (let i = 0; i < products.length; i += options.batchSize) {
        const batch = products.slice(i, i + options.batchSize);

        for (const [batchIndex, product] of batch.entries()) {
          const globalIndex = i + batchIndex;

          try {
            // Validate product data
            const validation =
              this.validationService.validateProductData(product);
            if (!validation.isValid) {
              console.log(
                'Product validation failed:',
                product.name,
                validation.errors
              );
              validation.errors.forEach((error) => {
                errors.push({
                  index: globalIndex,
                  record: product,
                  field: error.field,
                  message: error.message,
                  code: error.code,
                });
              });
              skipped++;
              continue;
            }

            console.log('Processing product:', product.name);

            // Check for conflicts
            const existingProduct = existingProducts.find(
              (p) =>
                p.name === product.name ||
                (product.barcode && p.barcode === product.barcode) ||
                (product.id && p.id === product.id) // Check UUID match
            );

            if (existingProduct) {
              if (options.conflictResolution === 'skip') {
                skipped++;
                continue;
              } else if (options.conflictResolution === 'update') {
                // Update existing product
                const categoryId =
                  product.category_id && isValidUUID(product.category_id)
                    ? product.category_id
                    : await this.findOrCreateCategoryId(product.category);
                const supplierId =
                  product.supplier_id && isValidUUID(product.supplier_id)
                    ? product.supplier_id
                    : await this.findOrCreateSupplierId(
                        product.supplier || suppliers[0]?.name
                      );

                await this.db.updateProduct(existingProduct.id, {
                  name: product.name,
                  barcode: product.barcode || null,
                  category_id: categoryId,
                  price: product.price,
                  cost: product.cost,
                  quantity: product.quantity || 0,
                  min_stock: product.min_stock || 10,
                  supplier_id: supplierId || undefined,
                  imageUrl: product.imageUrl || null,
                });
                updated++;
              } else {
                // Ask for resolution (handled by UI)
                conflicts.push({
                  type: 'duplicate',
                  record: product,
                  existingRecord: existingProduct,
                  message: `Product "${product.name}" already exists`,
                  index: globalIndex,
                });
                skipped++;
              }
            } else {
              // Add new product
              const categoryId =
                product.category_id && isValidUUID(product.category_id)
                  ? product.category_id
                  : await this.findOrCreateCategoryId(product.category);
              const supplierId =
                product.supplier_id && isValidUUID(product.supplier_id)
                  ? product.supplier_id
                  : await this.findOrCreateSupplierId(
                      product.supplier || suppliers[0]?.name
                    );

              console.log(
                'Adding product to database:',
                product.name,
                'categoryId:',
                categoryId,
                'supplierId:',
                supplierId
              );

              // Use existing UUID if valid, otherwise let database generate new one
              const productData: any = {
                name: product.name,
                barcode: product.barcode || null,
                category_id: categoryId,
                price: product.price,
                cost: product.cost,
                quantity: product.quantity || 0,
                min_stock: product.min_stock || 10,
                supplier_id: supplierId || undefined,
                imageUrl: product.imageUrl || null,
              };

              // If product has valid UUID, try to use it (for complete backup imports)
              if (product.id && isValidUUID(product.id)) {
                productData.id = product.id;
              }

              const newProductId = await this.db.addProduct(productData);
              console.log('Product added successfully with ID:', newProductId);
              imported++;
            }
          } catch (error) {
            errors.push({
              index: globalIndex,
              record: product,
              message:
                error instanceof Error ? error.message : 'Unknown import error',
              code: 'IMPORT_ERROR',
            });
            skipped++;
          }

          this.updateProgress(
            'Importing products...',
            globalIndex + 1,
            products.length
          );
        }

        // Small delay between batches to keep UI responsive
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        imported,
        updated,
        skipped,
        errors,
        conflicts,
        duration,
      };
    } catch (error) {
      return {
        success: false,
        imported,
        updated,
        skipped,
        errors: [
          {
            index: -1,
            record: null,
            message:
              error instanceof Error ? error.message : 'Unknown import error',
            code: 'IMPORT_FAILED',
          },
        ],
        conflicts,
        duration: Date.now() - startTime,
      };
    }
  }

  // Import customers
  async importCustomers(
    fileUri: string,
    options: ImportOptions
  ): Promise<ImportResult> {
    const startTime = Date.now();
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: ImportError[] = [];
    const conflicts: DataConflict[] = [];

    try {
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const importData = JSON.parse(fileContent);

      if (!importData.data || !importData.data.customers) {
        throw new Error('No customers data found in import file');
      }

      const customers = importData.data.customers;
      const existingCustomers = await this.db.getCustomers();

      this.updateProgress('Importing customers...', 0, customers.length);

      for (let i = 0; i < customers.length; i += options.batchSize) {
        const batch = customers.slice(i, i + options.batchSize);

        for (const [batchIndex, customer] of batch.entries()) {
          const globalIndex = i + batchIndex;

          try {
            // Validate customer data
            const validation =
              this.validationService.validateCustomerData(customer);
            if (!validation.isValid) {
              validation.errors.forEach((error) => {
                errors.push({
                  index: globalIndex,
                  record: customer,
                  field: error.field,
                  message: error.message,
                  code: error.code,
                });
              });
              skipped++;
              continue;
            }

            // Check for conflicts
            const existingCustomer = existingCustomers.find(
              (c) =>
                c.name === customer.name ||
                (customer.phone && c.phone === customer.phone) ||
                (customer.id && c.id === customer.id) // Check UUID match
            );

            if (existingCustomer) {
              if (options.conflictResolution === 'skip') {
                skipped++;
                continue;
              } else if (options.conflictResolution === 'update') {
                // Update existing customer
                await this.db.updateCustomer(existingCustomer.id, {
                  name: customer.name,
                  phone: customer.phone || '',
                  email: customer.email || '',
                  address: customer.address || '',
                });
                updated++;
              } else {
                conflicts.push({
                  type: 'duplicate',
                  record: customer,
                  existingRecord: existingCustomer,
                  message: `Customer "${customer.name}" already exists`,
                  index: globalIndex,
                });
                skipped++;
              }
            } else {
              // Add new customer
              const customerData: any = {
                name: customer.name,
                phone: customer.phone || '',
                email: customer.email || '',
                address: customer.address || '',
              };

              // If customer has valid UUID, try to use it (for complete backup imports)
              if (customer.id && isValidUUID(customer.id)) {
                customerData.id = customer.id;
              }

              await this.db.addCustomer(customerData);
              imported++;
            }
          } catch (error) {
            errors.push({
              index: globalIndex,
              record: customer,
              message:
                error instanceof Error ? error.message : 'Unknown import error',
              code: 'IMPORT_ERROR',
            });
            skipped++;
          }

          this.updateProgress(
            'Importing customers...',
            globalIndex + 1,
            customers.length
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      return {
        success: true,
        imported,
        updated,
        skipped,
        errors,
        conflicts,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        imported,
        updated,
        skipped,
        errors: [
          {
            index: -1,
            record: null,
            message:
              error instanceof Error ? error.message : 'Unknown import error',
            code: 'IMPORT_FAILED',
          },
        ],
        conflicts,
        duration: Date.now() - startTime,
      };
    }
  }

  // Import stock movements
  async importStockMovements(
    fileUri: string,
    options: ImportOptions
  ): Promise<ImportResult> {
    const startTime = Date.now();
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: ImportError[] = [];
    const conflicts: DataConflict[] = [];

    try {
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const importData = JSON.parse(fileContent);

      if (!importData.data || !importData.data.stockMovements) {
        throw new Error('No stock movements data found in import file');
      }

      const movements = importData.data.stockMovements;
      const products = await this.db.getProducts();

      this.updateProgress('Importing stock movements...', 0, movements.length);

      for (let i = 0; i < movements.length; i += options.batchSize) {
        const batch = movements.slice(i, i + options.batchSize);

        for (const [batchIndex, movement] of batch.entries()) {
          const globalIndex = i + batchIndex;

          try {
            // Validate movement data
            const validation =
              this.validationService.validateStockMovementData(movement);
            if (!validation.isValid) {
              validation.errors.forEach((error) => {
                errors.push({
                  index: globalIndex,
                  record: movement,
                  field: error.field,
                  message: error.message,
                  code: error.code,
                });
              });
              skipped++;
              continue;
            }

            // Find product by UUID first, then by name
            let product = null;
            if (movement.product_id && isValidUUID(movement.product_id)) {
              product = products.find((p) => p.id === movement.product_id);
            }
            if (!product && movement.product_name) {
              product = products.find((p) => p.name === movement.product_name);
            }

            if (!product) {
              if (options.createMissingReferences) {
                // Could create missing product, but for now skip
                errors.push({
                  index: globalIndex,
                  record: movement,
                  field: 'product_id',
                  message: `Product "${
                    movement.product_name || movement.product_id
                  }" not found`,
                  code: 'MISSING_PRODUCT',
                });
              }
              skipped++;
              continue;
            }

            // Add stock movement
            await this.db.addStockMovement({
              product_id: product.id,
              type: movement.type,
              quantity: movement.quantity,
              reason: movement.reason || '',
              supplier_id: movement.supplier_id || null,
              reference_number: movement.reference_number || '',
              unit_cost: movement.unit_cost || null,
            });
            imported++;
          } catch (error) {
            errors.push({
              index: globalIndex,
              record: movement,
              message:
                error instanceof Error ? error.message : 'Unknown import error',
              code: 'IMPORT_ERROR',
            });
            skipped++;
          }

          this.updateProgress(
            'Importing stock movements...',
            globalIndex + 1,
            movements.length
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      return {
        success: true,
        imported,
        updated,
        skipped,
        errors,
        conflicts,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        imported,
        updated,
        skipped,
        errors: [
          {
            index: -1,
            record: null,
            message:
              error instanceof Error ? error.message : 'Unknown import error',
            code: 'IMPORT_FAILED',
          },
        ],
        conflicts,
        duration: Date.now() - startTime,
      };
    }
  }

  // Import bulk pricing
  async importBulkPricing(
    fileUri: string,
    options: ImportOptions
  ): Promise<ImportResult> {
    const startTime = Date.now();
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: ImportError[] = [];
    const conflicts: DataConflict[] = [];

    try {
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const importData = JSON.parse(fileContent);

      if (!importData.data || !importData.data.bulkPricing) {
        throw new Error('No bulk pricing data found in import file');
      }

      const bulkPricingData = importData.data.bulkPricing;
      const products = await this.db.getProducts();

      this.updateProgress(
        'Importing bulk pricing...',
        0,
        bulkPricingData.length
      );

      for (const [index, item] of bulkPricingData.entries()) {
        try {
          // Validate bulk pricing data
          const validation =
            this.validationService.validateBulkPricingData(item);
          if (!validation.isValid) {
            validation.errors.forEach((error) => {
              errors.push({
                index,
                record: item,
                field: error.field,
                message: error.message,
                code: error.code,
              });
            });
            skipped++;
            continue;
          }

          // Find product by UUID first, then by name
          let product = null;
          if (item.productId && isValidUUID(item.productId)) {
            product = products.find((p) => p.id === item.productId);
          }
          if (!product && item.productName) {
            product = products.find((p) => p.name === item.productName);
          }

          if (!product) {
            errors.push({
              index,
              record: item,
              field: 'productId',
              message: `Product "${
                item.productName || item.productId
              }" not found`,
              code: 'MISSING_PRODUCT',
            });
            skipped++;
            continue;
          }

          // Clear existing bulk pricing for this product
          const existingTiers = await this.db.getBulkPricingForProduct(
            product.id
          );
          for (const tier of existingTiers) {
            await this.db.deleteBulkPricing(tier.id);
          }

          // Add new bulk pricing tiers
          let tiersImported = 0;
          for (const tier of item.bulkTiers || []) {
            try {
              await this.db.addBulkPricing({
                product_id: product.id,
                min_quantity: tier.min_quantity,
                bulk_price: tier.bulk_price,
              });
              tiersImported++;
            } catch (error) {
              console.error('Bulk pricing tier import error:', error);
            }
          }

          if (tiersImported > 0) {
            imported++;
          } else {
            skipped++;
          }
        } catch (error) {
          errors.push({
            index,
            record: item,
            message:
              error instanceof Error ? error.message : 'Unknown import error',
            code: 'IMPORT_ERROR',
          });
          skipped++;
        }

        this.updateProgress(
          'Importing bulk pricing...',
          index + 1,
          bulkPricingData.length
        );
      }

      return {
        success: true,
        imported,
        updated,
        skipped,
        errors,
        conflicts,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        imported,
        updated,
        skipped,
        errors: [
          {
            index: -1,
            record: null,
            message:
              error instanceof Error ? error.message : 'Unknown import error',
            code: 'IMPORT_FAILED',
          },
        ],
        conflicts,
        duration: Date.now() - startTime,
      };
    }
  }

  // Import sales
  async importSales(
    fileUri: string,
    options: ImportOptions
  ): Promise<ImportResult> {
    const startTime = Date.now();
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: ImportError[] = [];
    const conflicts: DataConflict[] = [];

    try {
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const importData = JSON.parse(fileContent);

      if (!importData.data || !importData.data.sales) {
        throw new Error('No sales data found in import file');
      }

      const sales = importData.data.sales;

      this.updateProgress('Importing sales...', 0, sales.length);

      // Process sales in batches
      for (let i = 0; i < sales.length; i += options.batchSize) {
        const batch = sales.slice(i, i + options.batchSize);

        for (const [batchIndex, sale] of batch.entries()) {
          const globalIndex = i + batchIndex;

          try {
            // Validate sales data
            const validation = this.validationService.validateSalesData(sale);
            if (!validation.isValid) {
              validation.errors.forEach((error) => {
                errors.push({
                  index: globalIndex,
                  record: sale,
                  field: error.field,
                  message: error.message,
                  code: error.code,
                });
              });
              skipped++;
              continue;
            }

            // Add sale with items (sales are typically not updated, just added)
            const saleItems =
              sale.items && Array.isArray(sale.items)
                ? sale.items.map((item: any) => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price: item.price,
                    cost: item.cost || 0,
                    discount: item.discount || 0,
                    subtotal: item.subtotal,
                  }))
                : [];

            const saleData: any = {
              total: sale.total,
              payment_method: sale.payment_method,
              note: sale.note || null,
              customer_id: sale.customer_id || null,
            };

            // If sale has valid UUID, try to use it (for complete backup imports)
            if (sale.id && isValidUUID(sale.id)) {
              saleData.id = sale.id;
            }

            await this.db.addSale(saleData, saleItems);

            imported++;
          } catch (error) {
            errors.push({
              index: globalIndex,
              record: sale,
              message:
                error instanceof Error ? error.message : 'Unknown import error',
              code: 'IMPORT_ERROR',
            });
            skipped++;
          }

          this.updateProgress(
            'Importing sales...',
            globalIndex + 1,
            sales.length
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      return {
        success: true,
        imported,
        updated,
        skipped,
        errors,
        conflicts,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        imported,
        updated,
        skipped,
        errors: [
          {
            index: -1,
            record: null,
            message:
              error instanceof Error ? error.message : 'Unknown import error',
            code: 'IMPORT_FAILED',
          },
        ],
        conflicts,
        duration: Date.now() - startTime,
      };
    }
  }

  // Import expenses
  async importExpenses(
    fileUri: string,
    options: ImportOptions
  ): Promise<ImportResult> {
    const startTime = Date.now();
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: ImportError[] = [];
    const conflicts: DataConflict[] = [];

    try {
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const importData = JSON.parse(fileContent);

      if (!importData.data || !importData.data.expenses) {
        throw new Error('No expenses data found in import file');
      }

      const expenses = importData.data.expenses;
      const expenseCategories = importData.data.expenseCategories || [];

      this.updateProgress(
        'Importing expense categories...',
        0,
        expenses.length + expenseCategories.length
      );

      // Import expense categories first
      const existingExpenseCategories = await this.db.getExpenseCategories();
      let categoryProgress = 0;

      for (const category of expenseCategories) {
        const existingCategory = existingExpenseCategories.find(
          (c) => c.name === category.name
        );
        if (!existingCategory) {
          try {
            await this.db.addExpenseCategory(
              category.name,
              category.description || ''
            );
          } catch (error) {
            console.error('Error adding expense category:', error);
          }
        }
        categoryProgress++;
        this.updateProgress(
          'Importing expense categories...',
          categoryProgress,
          expenseCategories.length
        );
      }

      // Process expenses in batches
      this.updateProgress('Importing expenses...', 0, expenses.length);

      for (let i = 0; i < expenses.length; i += options.batchSize) {
        const batch = expenses.slice(i, i + options.batchSize);

        for (const [batchIndex, expense] of batch.entries()) {
          const globalIndex = i + batchIndex;

          try {
            // Validate expense data
            const validation =
              this.validationService.validateExpenseData(expense);
            if (!validation.isValid) {
              validation.errors.forEach((error) => {
                errors.push({
                  index: globalIndex,
                  record: expense,
                  field: error.field,
                  message: error.message,
                  code: error.code,
                });
              });
              skipped++;
              continue;
            }

            // Find or create expense category
            const categoryId = await this.findOrCreateExpenseCategoryId(
              expense.category
            );

            // Add expense (expenses are typically not updated, just added)
            await this.db.addExpense(
              categoryId,
              expense.amount,
              expense.description || '',
              expense.date
            );
            imported++;
          } catch (error) {
            errors.push({
              index: globalIndex,
              record: expense,
              message:
                error instanceof Error ? error.message : 'Unknown import error',
              code: 'IMPORT_ERROR',
            });
            skipped++;
          }

          this.updateProgress(
            'Importing expenses...',
            globalIndex + 1,
            expenses.length
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      return {
        success: true,
        imported,
        updated,
        skipped,
        errors,
        conflicts,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        imported,
        updated,
        skipped,
        errors: [
          {
            index: -1,
            record: null,
            message:
              error instanceof Error ? error.message : 'Unknown import error',
            code: 'IMPORT_FAILED',
          },
        ],
        conflicts,
        duration: Date.now() - startTime,
      };
    }
  }

  // Import complete backup
  async importCompleteBackup(
    fileUri: string,
    options: ImportOptions
  ): Promise<ImportResult> {
    const startTime = Date.now();
    let totalImported = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    const allErrors: ImportError[] = [];
    const allConflicts: DataConflict[] = [];

    try {
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const importData = JSON.parse(fileContent);

      if (!importData.data) {
        throw new Error('No data found in import file');
      }

      const data = importData.data;
      let currentStage = 0;
      const totalStages = Object.keys(data).length;

      // Import in order: categories, suppliers, products, customers, bulk pricing, stock movements
      const importOrder = [
        'categories',
        'suppliers',
        'products',
        'customers',
        'sales',
        'expenses',
        'bulkPricing',
        'stockMovements',
      ];

      for (const dataType of importOrder) {
        if (
          data[dataType] &&
          Array.isArray(data[dataType]) &&
          data[dataType].length > 0
        ) {
          this.updateProgress(
            `Importing ${dataType}...`,
            currentStage,
            totalStages
          );

          // Create temporary file for this data type
          const tempData = {
            version: importData.version,
            exportDate: importData.exportDate,
            dataType: dataType,
            data: { [dataType]: data[dataType] },
          };

          const tempFileName = `temp_${dataType}_${Date.now()}.json`;
          const tempFileUri = FileSystem.documentDirectory + tempFileName;

          try {
            await FileSystem.writeAsStringAsync(
              tempFileUri,
              JSON.stringify(tempData)
            );

            let result: ImportResult;
            switch (dataType) {
              case 'products':
                result = await this.importProducts(tempFileUri, options);
                break;
              case 'customers':
                result = await this.importCustomers(tempFileUri, options);
                break;
              case 'sales':
                result = await this.importSales(tempFileUri, options);
                break;
              case 'expenses':
                result = await this.importExpenses(tempFileUri, options);
                break;
              case 'stockMovements':
                result = await this.importStockMovements(tempFileUri, options);
                break;
              case 'bulkPricing':
                result = await this.importBulkPricing(tempFileUri, options);
                break;
              default:
                // Skip unsupported data types for now
                continue;
            }

            totalImported += result.imported;
            totalUpdated += result.updated;
            totalSkipped += result.skipped;
            allErrors.push(...result.errors);
            allConflicts.push(...result.conflicts);

            // Clean up temp file
            await FileSystem.deleteAsync(tempFileUri, { idempotent: true });
          } catch (error) {
            console.error(`Error importing ${dataType}:`, error);
            // Clean up temp file on error
            await FileSystem.deleteAsync(tempFileUri, { idempotent: true });
          }
        }
        currentStage++;
      }

      return {
        success: true,
        imported: totalImported,
        updated: totalUpdated,
        skipped: totalSkipped,
        errors: allErrors,
        conflicts: allConflicts,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        imported: totalImported,
        updated: totalUpdated,
        skipped: totalSkipped,
        errors: [
          {
            index: -1,
            record: null,
            message:
              error instanceof Error ? error.message : 'Unknown import error',
            code: 'IMPORT_FAILED',
          },
        ],
        conflicts: allConflicts,
        duration: Date.now() - startTime,
      };
    }
  }

  // Validate UUID format in imported data
  private validateImportedUUIDs(data: any): string[] {
    const errors: string[] = [];

    // Validate product UUIDs
    if (data.products && Array.isArray(data.products)) {
      data.products.forEach((product: any, index: number) => {
        if (product.id && !isValidUUID(product.id)) {
          errors.push(
            `Product ${index}: Invalid UUID format for id: ${product.id}`
          );
        }
        if (product.category_id && !isValidUUID(product.category_id)) {
          errors.push(
            `Product ${index}: Invalid UUID format for category_id: ${product.category_id}`
          );
        }
        if (product.supplier_id && !isValidUUID(product.supplier_id)) {
          errors.push(
            `Product ${index}: Invalid UUID format for supplier_id: ${product.supplier_id}`
          );
        }
      });
    }

    // Validate category UUIDs
    if (data.categories && Array.isArray(data.categories)) {
      data.categories.forEach((category: any, index: number) => {
        if (category.id && !isValidUUID(category.id)) {
          errors.push(
            `Category ${index}: Invalid UUID format for id: ${category.id}`
          );
        }
      });
    }

    // Validate supplier UUIDs
    if (data.suppliers && Array.isArray(data.suppliers)) {
      data.suppliers.forEach((supplier: any, index: number) => {
        if (supplier.id && !isValidUUID(supplier.id)) {
          errors.push(
            `Supplier ${index}: Invalid UUID format for id: ${supplier.id}`
          );
        }
      });
    }

    // Validate sale UUIDs
    if (data.sales && Array.isArray(data.sales)) {
      data.sales.forEach((sale: any, index: number) => {
        if (sale.id && !isValidUUID(sale.id)) {
          errors.push(`Sale ${index}: Invalid UUID format for id: ${sale.id}`);
        }
        if (sale.customer_id && !isValidUUID(sale.customer_id)) {
          errors.push(
            `Sale ${index}: Invalid UUID format for customer_id: ${sale.customer_id}`
          );
        }
        // Validate sale items
        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach((item: any, itemIndex: number) => {
            if (item.id && !isValidUUID(item.id)) {
              errors.push(
                `Sale ${index}, Item ${itemIndex}: Invalid UUID format for id: ${item.id}`
              );
            }
            if (item.sale_id && !isValidUUID(item.sale_id)) {
              errors.push(
                `Sale ${index}, Item ${itemIndex}: Invalid UUID format for sale_id: ${item.sale_id}`
              );
            }
            if (item.product_id && !isValidUUID(item.product_id)) {
              errors.push(
                `Sale ${index}, Item ${itemIndex}: Invalid UUID format for product_id: ${item.product_id}`
              );
            }
          });
        }
      });
    }

    // Validate customer UUIDs
    if (data.customers && Array.isArray(data.customers)) {
      data.customers.forEach((customer: any, index: number) => {
        if (customer.id && !isValidUUID(customer.id)) {
          errors.push(
            `Customer ${index}: Invalid UUID format for id: ${customer.id}`
          );
        }
      });
    }

    // Validate expense UUIDs
    if (data.expenses && Array.isArray(data.expenses)) {
      data.expenses.forEach((expense: any, index: number) => {
        if (expense.id && !isValidUUID(expense.id)) {
          errors.push(
            `Expense ${index}: Invalid UUID format for id: ${expense.id}`
          );
        }
        if (expense.category_id && !isValidUUID(expense.category_id)) {
          errors.push(
            `Expense ${index}: Invalid UUID format for category_id: ${expense.category_id}`
          );
        }
      });
    }

    // Validate stock movement UUIDs
    if (data.stockMovements && Array.isArray(data.stockMovements)) {
      data.stockMovements.forEach((movement: any, index: number) => {
        if (movement.id && !isValidUUID(movement.id)) {
          errors.push(
            `Stock Movement ${index}: Invalid UUID format for id: ${movement.id}`
          );
        }
        if (movement.product_id && !isValidUUID(movement.product_id)) {
          errors.push(
            `Stock Movement ${index}: Invalid UUID format for product_id: ${movement.product_id}`
          );
        }
        if (movement.supplier_id && !isValidUUID(movement.supplier_id)) {
          errors.push(
            `Stock Movement ${index}: Invalid UUID format for supplier_id: ${movement.supplier_id}`
          );
        }
      });
    }

    return errors;
  }

  // Helper method to find or create category ID
  private async findOrCreateCategoryId(categoryName?: string): Promise<string> {
    if (!categoryName) {
      // Return default category ID or create one
      const categories = await this.db.getCategories();
      if (categories.length > 0) {
        return categories[0].id;
      } else {
        // Create default category
        const defaultCategory = await this.db.addCategory({
          name: 'General',
          description: 'Default category',
        });
        return defaultCategory;
      }
    }

    const categories = await this.db.getCategories();
    const existingCategory = categories.find((c) => c.name === categoryName);

    if (existingCategory) {
      return existingCategory.id;
    } else {
      // Create new category
      return await this.db.addCategory({
        name: categoryName,
        description: '',
      });
    }
  }

  // Helper method to find or create expense category ID
  private async findOrCreateExpenseCategoryId(
    categoryName?: string
  ): Promise<string> {
    if (!categoryName) {
      // Return default expense category ID or create one
      const categories = await this.db.getExpenseCategories();
      if (categories.length > 0) {
        return categories[0].id;
      } else {
        // Create default expense category
        const defaultCategory = await this.db.addExpenseCategory(
          'General',
          'Default expense category'
        );
        return defaultCategory;
      }
    }

    const categories = await this.db.getExpenseCategories();
    const existingCategory = categories.find((c) => c.name === categoryName);

    if (existingCategory) {
      return existingCategory.id;
    } else {
      // Create new expense category
      return await this.db.addExpenseCategory(categoryName, '');
    }
  }

  // Helper method to find or create supplier ID
  private async findOrCreateSupplierId(supplierName?: string): Promise<string> {
    if (!supplierName) {
      // Return default supplier ID or create one
      const suppliers = await this.db.getSuppliers();
      if (suppliers.length > 0) {
        return suppliers[0].id;
      } else {
        // Create default supplier
        const defaultSupplier = await this.db.addSupplier({
          name: 'Default Supplier',
          contact_name: '',
          phone: '',
          email: '',
          address: '',
        });
        return defaultSupplier;
      }
    }

    const suppliers = await this.db.getSuppliers();
    const existingSupplier = suppliers.find((s) => s.name === supplierName);

    if (existingSupplier) {
      return existingSupplier.id;
    } else {
      // Create new supplier
      return await this.db.addSupplier({
        name: supplierName,
        contact_name: '',
        phone: '',
        email: '',
        address: '',
      });
    }
  }

  // Resolve conflicts
  async resolveConflicts(
    conflicts: DataConflict[],
    resolution: ConflictResolution
  ): Promise<void> {
    // This method would be called by the UI after user makes conflict resolution decisions
    // Implementation would depend on the specific conflict resolution logic needed
    for (const conflict of conflicts) {
      switch (resolution.action) {
        case 'update':
          // Update existing record with imported data
          break;
        case 'skip':
          // Skip the conflicting record
          break;
        case 'create_new':
          // Create new record with modified identifier
          break;
      }
    }
  }
}
