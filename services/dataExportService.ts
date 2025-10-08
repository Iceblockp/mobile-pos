import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { DatabaseService } from './database';
import { ErrorHandlingService } from './errorHandlingService';
import { PerformanceOptimizationService } from './performanceOptimizationService';
import { isValidUUID } from '../utils/uuid';

// Export interfaces
export interface ExportResult {
  success: boolean;
  fileUri?: string;
  filename?: string;
  recordCount: number;
  error?: string;
  metadata: ExportMetadata;
  emptyExport?: boolean; // Indicates if no records were found for the data type
  actualDataType?: string; // The actual data type that was exported
}

export interface ExportProgress {
  stage: string;
  current: number;
  total: number;
  percentage: number;
  estimatedTimeRemaining?: number;
}

export interface ExportMetadata {
  exportDate: string;
  dataType: string;
  version: string;
  recordCount: number;
  fileSize: number;
  checksum?: string;
  emptyExport?: boolean; // Indicates if this was an empty export
  actualRecordCount?: number; // Actual count of records for the selected data type
}

export interface ExportData {
  version: string;
  exportDate: string;
  dataType: 'all';
  metadata: ExportMetadata;
  data: {
    products?: any[];
    categories?: any[];
    suppliers?: any[];
    sales?: any[];
    saleItems?: any[];
    customers?: any[];
    expenses?: any[];
    expenseCategories?: any[];
    stockMovements?: any[];
    bulkPricing?: any[];
  };
  relationships?: {
    productCategories: Record<string, string>;
    productSuppliers: Record<string, string>;
    saleCustomers: Record<string, string>;
  };
  integrity: {
    checksum: string;
    recordCounts: Record<string, number>;
    validationRules: string[];
  };
}

export class DataExportService {
  private db: DatabaseService;
  private errorHandler: ErrorHandlingService;
  private performanceOptimizer: PerformanceOptimizationService;
  private progressCallback?: (progress: ExportProgress) => void;

  constructor(database: DatabaseService) {
    this.db = database;
    this.errorHandler = new ErrorHandlingService();
    this.performanceOptimizer = new PerformanceOptimizationService();
  }

  // Simplified data validation for all data export
  private validateAllData(allData: any): any {
    try {
      // Validate input data structure
      if (!allData || typeof allData !== 'object') {
        throw new Error('Invalid data structure provided for validation');
      }

      // Validate all data sections for complete backup
      const validatedData: any = {};
      Object.keys(allData).forEach((key) => {
        validatedData[key] = this.validateAndSanitizeArray(allData[key], key);
      });
      return validatedData;
    } catch (error) {
      console.error('Error validating all data:', error);
      throw new Error(
        `Failed to validate data: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  // Validate and sanitize array data to handle corrupted or malformed data
  private validateAndSanitizeArray(data: any, dataTypeName: string): any[] {
    try {
      // Handle null or undefined
      if (data === null || data === undefined) {
        return [];
      }

      // Handle non-array data
      if (!Array.isArray(data)) {
        console.warn(
          `Expected array for ${dataTypeName}, got ${typeof data}. Converting to empty array.`
        );
        return [];
      }

      // Filter out corrupted records and validate each item
      const sanitizedData = data.filter((item, index) => {
        try {
          // Basic validation - must be an object
          if (!item || typeof item !== 'object') {
            console.warn(
              `Skipping invalid ${dataTypeName} record at index ${index}: not an object`
            );
            return false;
          }

          // Check for required fields based on data type
          if (!this.validateRequiredFields(item, dataTypeName)) {
            console.warn(
              `Skipping invalid ${dataTypeName} record at index ${index}: missing required fields`
            );
            return false;
          }

          // Sanitize the item to remove potentially problematic data
          return this.sanitizeRecord(item, dataTypeName);
        } catch (error) {
          console.warn(
            `Skipping corrupted ${dataTypeName} record at index ${index}:`,
            error
          );
          return false;
        }
      });

      console.log(
        `Validated ${dataTypeName}: ${sanitizedData.length}/${data.length} records passed validation`
      );
      return sanitizedData;
    } catch (error) {
      console.error(`Error validating ${dataTypeName} data:`, error);
      return [];
    }
  }

  // Validate required fields for different data types
  private validateRequiredFields(item: any, dataTypeName: string): boolean {
    try {
      switch (dataTypeName) {
        case 'products':
          return !!(
            item.name &&
            typeof item.price === 'number' &&
            typeof item.cost === 'number'
          );
        case 'sales':
          return !!(
            item.total &&
            typeof item.total === 'number' &&
            item.payment_method
          );
        case 'customers':
          return !!item.name;
        case 'expenses':
          return !!(
            item.amount &&
            typeof item.amount === 'number' &&
            item.description
          );
        case 'stockMovements':
          return !!(
            item.product_id &&
            item.movement_type &&
            typeof item.quantity === 'number'
          );
        case 'bulkPricing':
          return !!(
            item.product_id &&
            typeof item.min_quantity === 'number' &&
            typeof item.bulk_price === 'number'
          );
        case 'categories':
          return !!item.name;
        case 'suppliers':
          return !!item.name;
        case 'expenseCategories':
          return !!item.name;
        case 'saleItems':
          return !!(
            item.product_id &&
            typeof item.quantity === 'number' &&
            typeof item.price === 'number'
          );
        default:
          return true; // For unknown types, assume valid
      }
    } catch (error) {
      console.error(
        `Error validating required fields for ${dataTypeName}:`,
        error
      );
      return false;
    }
  }

  // Sanitize individual records to remove problematic data
  private sanitizeRecord(item: any, dataTypeName: string): any {
    try {
      const sanitized = { ...item };

      // Remove circular references and functions
      Object.keys(sanitized).forEach((key) => {
        const value = sanitized[key];
        if (typeof value === 'function') {
          delete sanitized[key];
        } else if (value && typeof value === 'object') {
          try {
            JSON.stringify(value); // Test for circular references
          } catch (error) {
            console.warn(
              `Removing circular reference in ${dataTypeName}.${key}`
            );
            delete sanitized[key];
          }
        }
      });

      // Sanitize numeric fields
      if (dataTypeName === 'products') {
        if (sanitized.price && typeof sanitized.price !== 'number') {
          sanitized.price = parseFloat(sanitized.price) || 0;
        }
        if (sanitized.cost && typeof sanitized.cost !== 'number') {
          sanitized.cost = parseFloat(sanitized.cost) || 0;
        }
        if (sanitized.quantity && typeof sanitized.quantity !== 'number') {
          sanitized.quantity = parseInt(sanitized.quantity) || 0;
        }
      }

      // Sanitize string fields
      Object.keys(sanitized).forEach((key) => {
        if (typeof sanitized[key] === 'string') {
          // Remove null bytes and control characters
          sanitized[key] = sanitized[key].replace(/[\x00-\x1F\x7F]/g, '');
        }
      });

      return sanitized;
    } catch (error) {
      console.error(`Error sanitizing ${dataTypeName} record:`, error);
      return item; // Return original if sanitization fails
    }
  }

  // Calculate total record count for all data export
  private calculateTotalRecordCount(data: any): number {
    let totalCount = 0;
    for (const value of Object.values(data)) {
      if (Array.isArray(value)) {
        totalCount += value.length;
      }
    }
    return totalCount;
  }

  // Check if the export is empty
  private isEmptyExport(data: any): boolean {
    return this.calculateTotalRecordCount(data) === 0;
  }

  // Create a standardized export result with proper feedback
  private createExportResult(
    success: boolean,
    actualRecordCount: number,
    fileUri?: string,
    filename?: string,
    error?: string
  ): ExportResult {
    const isEmpty = actualRecordCount === 0;

    return {
      success,
      fileUri,
      filename,
      recordCount: actualRecordCount,
      error,
      emptyExport: isEmpty,
      actualDataType: 'all',
      metadata: {
        exportDate: new Date().toISOString(),
        dataType: 'all',
        version: '2.0',
        recordCount: actualRecordCount,
        fileSize: 0, // Will be updated after file creation
        emptyExport: isEmpty,
        actualRecordCount,
      },
    };
  }

  // Handle empty data exports with proper user notification
  private async handleEmptyExport(): Promise<ExportResult> {
    try {
      console.log('Handling empty export for all data');

      // Create empty export data structure
      const emptyExportData: ExportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        dataType: 'all',
        metadata: {
          exportDate: new Date().toISOString(),
          dataType: 'all',
          version: '2.0',
          recordCount: 0,
          fileSize: 0,
          emptyExport: true,
          actualRecordCount: 0,
        },
        data: this.createEmptyDataStructure(),
        relationships: {
          productCategories: {},
          productSuppliers: {},
          saleCustomers: {},
        },
        integrity: {
          checksum: '',
          recordCounts: this.createEmptyRecordCounts(),
          validationRules: this.getValidationRulesForAllData(),
        },
      };

      // Generate empty export file
      const filename = `all_data_export_${
        new Date().toISOString().split('T')[0]
      }_empty.json`;
      const fileResult = await this.generateExportFile(
        emptyExportData,
        filename
      );

      return this.createExportResult(
        true,
        0,
        fileResult.fileUri,
        fileResult.filename
      );
    } catch (error) {
      console.error('Error handling empty export:', error);
      return this.createExportResult(
        false,
        0,
        undefined,
        undefined,
        `Failed to create empty export: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  // Create empty data structure for all data export
  private createEmptyDataStructure(): any {
    return {
      products: [],
      categories: [],
      suppliers: [],
      sales: [],
      saleItems: [],
      customers: [],
      expenses: [],
      expenseCategories: [],
      stockMovements: [],
      bulkPricing: [],
    };
  }

  // Create empty record counts for all data export
  private createEmptyRecordCounts(): Record<string, number> {
    return {
      products: 0,
      categories: 0,
      suppliers: 0,
      sales: 0,
      saleItems: 0,
      customers: 0,
      expenses: 0,
      expenseCategories: 0,
      stockMovements: 0,
      bulkPricing: 0,
    };
  }

  // Get validation rules for all data export
  private getValidationRulesForAllData(): string[] {
    return [
      'required_fields',
      'positive_amounts',
      'valid_dates',
      'valid_references',
    ];
  }

  // Generate user-friendly feedback message for export results
  generateExportFeedbackMessage(result: ExportResult): string {
    if (!result.success) {
      return `Export failed: ${result.error || 'Unknown error'}`;
    }

    if (result.emptyExport) {
      return `All data export completed, but no data was found. An empty export file has been created for consistency.`;
    }

    const recordText = result.recordCount === 1 ? 'record' : 'records';
    return `All data export completed successfully! ${result.recordCount} ${recordText} exported.`;
  }

  // Progress reporting for export operations
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

  // Progress tracking
  onProgress(callback: (progress: ExportProgress) => void): void {
    this.progressCallback = callback;
  }

  // Export all data
  async exportAllData(): Promise<ExportResult> {
    try {
      this.updateProgress('Fetching all data...', 0, 8);

      // Fetch all data types
      const products = await this.db.getProducts();
      this.updateProgress('Fetched products...', 1, 8);

      const categories = await this.db.getCategories();
      this.updateProgress('Fetched categories...', 2, 8);

      const suppliers = await this.db.getSuppliers();
      this.updateProgress('Fetched suppliers...', 3, 8);

      const startDate = new Date('2020-01-01');
      const endDate = new Date();
      const sales = await this.db.getSalesByDateRange(
        startDate,
        endDate,
        10000
      );
      this.updateProgress('Fetched sales...', 4, 8);

      const salesWithItems = await Promise.all(
        sales.map(async (sale) => {
          const items = await this.db.getSaleItems(sale.id);
          return { ...sale, items };
        })
      );
      this.updateProgress('Fetched sale items...', 5, 8);

      const expenses = await this.db.getExpensesByDateRange(
        startDate,
        endDate,
        10000
      );
      const expenseCategories = await this.db.getExpenseCategories();
      this.updateProgress('Fetched expenses...', 6, 8);

      const customers = await this.db.getCustomers();
      const stockMovements = await this.db.getStockMovements({}, 1, 10000);
      this.updateProgress('Fetched customers and stock movements...', 7, 8);

      // Get bulk pricing
      const bulkPricingData = await Promise.all(
        products.map(async (product) => {
          try {
            const bulkTiers = await this.db.getBulkPricingForProduct(
              product.id
            );
            return {
              productId: product.id,
              productName: product.name,
              bulkTiers,
            };
          } catch (error) {
            return {
              productId: product.id,
              productName: product.name,
              bulkTiers: [],
            };
          }
        })
      );

      // Prepare all data
      const allData = {
        products: products.map((product) => ({
          ...product,
          created_at: undefined,
          updated_at: undefined,
        })),
        categories,
        suppliers,
        sales: salesWithItems,
        saleItems: salesWithItems.flatMap((sale) => sale.items || []),
        customers,
        expenses,
        expenseCategories,
        stockMovements,
        bulkPricing: bulkPricingData.filter(
          (item) => item.bulkTiers.length > 0
        ),
      };

      const validatedData = this.validateAllData(allData);
      const totalRecordCount = this.calculateTotalRecordCount(validatedData);

      // Check if export is empty
      if (this.isEmptyExport(validatedData)) {
        return await this.handleEmptyExport();
      }

      // Create export result
      const initialResult = this.createExportResult(true, totalRecordCount);

      const exportData: ExportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        dataType: 'all',
        metadata: {
          ...initialResult.metadata,
          fileSize: 0, // Will be calculated after file creation
        },
        data: validatedData,
        relationships: this.buildRelationshipMappings(
          products,
          categories,
          suppliers,
          customers
        ),
        integrity: {
          checksum: '',
          recordCounts: {
            products: validatedData.products?.length || 0,
            categories: validatedData.categories?.length || 0,
            suppliers: validatedData.suppliers?.length || 0,
            sales: validatedData.sales?.length || 0,
            saleItems: validatedData.saleItems?.length || 0,
            customers: validatedData.customers?.length || 0,
            expenses: validatedData.expenses?.length || 0,
            expenseCategories: validatedData.expenseCategories?.length || 0,
            stockMovements: validatedData.stockMovements?.length || 0,
            bulkPricing: validatedData.bulkPricing?.length || 0,
          },
          validationRules: this.getValidationRulesForAllData(),
        },
      };

      this.updateProgress('Generating export file...', 8, 8);

      const filename = `all_data_export_${
        new Date().toISOString().split('T')[0]
      }.json`;
      const fileResult = await this.generateExportFile(exportData, filename);

      // Update the result with file information
      const finalResult = this.createExportResult(
        true,
        totalRecordCount,
        fileResult.fileUri,
        fileResult.filename
      );

      // Update metadata with actual file size
      finalResult.metadata.fileSize = exportData.metadata.fileSize;
      finalResult.metadata.checksum = exportData.integrity.checksum;

      return finalResult;
    } catch (error) {
      console.error('All data export error:', error);
      return this.createExportResult(
        false,
        0,
        undefined,
        undefined,
        error instanceof Error ? error.message : 'Unknown export error'
      );
    }
  }

  // Generate export file and return file info
  async generateExportFile(
    data: ExportData,
    filename: string
  ): Promise<{ fileUri: string; filename: string }> {
    // Validate UUID format in exported data
    const uuidErrors = this.validateExportedUUIDs(data);
    if (uuidErrors.length > 0) {
      console.warn('UUID validation warnings in export data:', uuidErrors);
      // Add UUID validation warnings to integrity section
      data.integrity.validationRules.push('uuid_format_validation');
    }

    // Ensure consistent export file structure regardless of data type
    this.ensureConsistentFileStructure(data);

    const jsonString = JSON.stringify(data, null, 2);
    const fileUri = FileSystem.documentDirectory + filename;

    // Calculate file size and checksum
    const fileSize = new Blob([jsonString]).size;
    const checksum = this.generateChecksum(jsonString);

    // Update metadata with file info
    data.metadata.fileSize = fileSize;
    data.integrity.checksum = checksum;

    // Write the updated data to file
    const finalJsonString = JSON.stringify(data, null, 2);
    await FileSystem.writeAsStringAsync(fileUri, finalJsonString);

    return { fileUri, filename };
  }

  // Ensure consistent export file structure with proper dataType field
  private ensureConsistentFileStructure(data: ExportData): void {
    // Ensure all required fields are present
    if (!data.version) data.version = '2.0';
    if (!data.exportDate) data.exportDate = new Date().toISOString();
    if (!data.dataType) throw new Error('dataType field is required');

    // Ensure metadata is complete
    if (!data.metadata) {
      data.metadata = {
        exportDate: data.exportDate,
        dataType: data.dataType,
        version: data.version,
        recordCount: 0,
        fileSize: 0,
      };
    }

    // Ensure metadata.dataType matches root dataType
    data.metadata.dataType = data.dataType;

    // Ensure data section exists
    if (!data.data) data.data = {};

    // Ensure relationships section exists
    if (!data.relationships) {
      data.relationships = {
        productCategories: {},
        productSuppliers: {},
        saleCustomers: {},
      };
    }

    // Ensure integrity section exists
    if (!data.integrity) {
      data.integrity = {
        checksum: '',
        recordCounts: {},
        validationRules: [],
      };
    }

    // Validate that only relevant data sections are populated based on dataType
    this.validateDataSectionsForType(data);
  }

  // Validate that only relevant data sections are populated for the selected data type
  private validateDataSectionsForType(data: ExportData): void {
    const allowedSections: Record<string, string[]> = {
      products: ['products', 'categories', 'suppliers', 'bulkPricing'],
      sales: ['sales', 'saleItems'],
      customers: ['customers'],
      expenses: ['expenses', 'expenseCategories'],
      stock_movements: ['stockMovements'],
      bulk_pricing: ['bulkPricing'],
      complete: [
        'products',
        'categories',
        'suppliers',
        'sales',
        'saleItems',
        'customers',
        'expenses',
        'expenseCategories',
        'stockMovements',
        'bulkPricing',
      ],
    };

    const allowed = allowedSections[data.dataType] || [];
    const allPossibleSections = [
      'products',
      'categories',
      'suppliers',
      'sales',
      'saleItems',
      'customers',
      'expenses',
      'expenseCategories',
      'stockMovements',
      'bulkPricing',
    ];

    // Remove sections that shouldn't be present for this data type
    for (const section of allPossibleSections) {
      if (
        !allowed.includes(section) &&
        data.data[section as keyof typeof data.data]
      ) {
        console.warn(
          `Removing unexpected data section '${section}' from ${data.dataType} export`
        );
        delete data.data[section as keyof typeof data.data];
      }
    }
  }

  // Share export file
  async shareExportFile(fileUri: string, title: string): Promise<void> {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: title,
      });
    } else {
      throw new Error('Sharing not available on this device');
    }
  }

  // Generate simple checksum for data integrity
  private generateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // Build relationship mappings for UUID-based foreign keys
  private buildRelationshipMappings(
    products: any[] = [],
    categories: any[] = [],
    suppliers: any[] = [],
    customers: any[] = []
  ): {
    productCategories: Record<string, string>;
    productSuppliers: Record<string, string>;
    saleCustomers: Record<string, string>;
  } {
    const productCategories: Record<string, string> = {};
    const productSuppliers: Record<string, string> = {};
    const saleCustomers: Record<string, string> = {};

    // Map product to category relationships
    products.forEach((product) => {
      if (product.id && product.category_id) {
        const category = categories.find((c) => c.id === product.category_id);
        if (category) {
          productCategories[product.id] = category.name;
        }
      }
    });

    // Map product to supplier relationships
    products.forEach((product) => {
      if (product.id && product.supplier_id) {
        const supplier = suppliers.find((s) => s.id === product.supplier_id);
        if (supplier) {
          productSuppliers[product.id] = supplier.name;
        }
      }
    });

    // Map sale to customer relationships (if customers are provided)
    // This would be populated in sales export methods

    return {
      productCategories,
      productSuppliers,
      saleCustomers,
    };
  }

  // Validate UUID format in exported data
  private validateExportedUUIDs(data: ExportData): string[] {
    const errors: string[] = [];

    // Validate product UUIDs
    if (data.data.products) {
      data.data.products.forEach((product: any, index: number) => {
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
    if (data.data.categories) {
      data.data.categories.forEach((category: any, index: number) => {
        if (category.id && !isValidUUID(category.id)) {
          errors.push(
            `Category ${index}: Invalid UUID format for id: ${category.id}`
          );
        }
      });
    }

    // Validate supplier UUIDs
    if (data.data.suppliers) {
      data.data.suppliers.forEach((supplier: any, index: number) => {
        if (supplier.id && !isValidUUID(supplier.id)) {
          errors.push(
            `Supplier ${index}: Invalid UUID format for id: ${supplier.id}`
          );
        }
      });
    }

    // Validate sale UUIDs
    if (data.data.sales) {
      data.data.sales.forEach((sale: any, index: number) => {
        if (sale.id && !isValidUUID(sale.id)) {
          errors.push(`Sale ${index}: Invalid UUID format for id: ${sale.id}`);
        }
        if (sale.customer_id && !isValidUUID(sale.customer_id)) {
          errors.push(
            `Sale ${index}: Invalid UUID format for customer_id: ${sale.customer_id}`
          );
        }
        // Validate sale items
        if (sale.items) {
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
    if (data.data.customers) {
      data.data.customers.forEach((customer: any, index: number) => {
        if (customer.id && !isValidUUID(customer.id)) {
          errors.push(
            `Customer ${index}: Invalid UUID format for id: ${customer.id}`
          );
        }
      });
    }

    // Validate expense UUIDs
    if (data.data.expenses) {
      data.data.expenses.forEach((expense: any, index: number) => {
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
    if (data.data.stockMovements) {
      data.data.stockMovements.forEach((movement: any, index: number) => {
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
}
