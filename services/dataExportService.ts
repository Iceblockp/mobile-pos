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
}

export interface ExportData {
  version: string;
  exportDate: string;
  dataType:
    | 'products'
    | 'sales'
    | 'customers'
    | 'expenses'
    | 'stock_movements'
    | 'bulk_pricing'
    | 'complete';
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

  // Progress tracking
  onProgress(callback: (progress: ExportProgress) => void): void {
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

  // Export products with categories, suppliers, and bulk pricing
  async exportProducts(): Promise<ExportResult> {
    try {
      this.updateProgress('Fetching products data...', 0, 4);

      const products = await this.db.getProducts();
      this.updateProgress('Fetching categories...', 1, 4);

      const categories = await this.db.getCategories();
      this.updateProgress('Fetching suppliers...', 2, 4);

      const suppliers = await this.db.getSuppliers();
      this.updateProgress('Fetching bulk pricing...', 3, 4);

      // Get bulk pricing for all products
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

      const exportData: ExportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        dataType: 'products',
        metadata: {
          exportDate: new Date().toISOString(),
          dataType: 'products',
          version: '2.0',
          recordCount: products.length,
          fileSize: 0, // Will be calculated after file creation
        },
        data: {
          products: products.map((product) => ({
            ...product,
            // Keep UUID IDs for referential integrity
            created_at: undefined,
            updated_at: undefined,
          })),
          categories,
          suppliers,
          bulkPricing: bulkPricingData.filter(
            (item) => item.bulkTiers.length > 0
          ),
        },
        relationships: this.buildRelationshipMappings(
          products,
          categories,
          suppliers,
          []
        ),
        integrity: {
          checksum: '',
          recordCounts: {
            products: products.length,
            categories: categories.length,
            suppliers: suppliers.length,
            bulkPricing: bulkPricingData.filter(
              (item) => item.bulkTiers.length > 0
            ).length,
          },
          validationRules: [
            'required_fields',
            'positive_prices',
            'valid_categories',
          ],
        },
      };

      this.updateProgress('Generating export file...', 4, 4);

      const filename = `products_export_${
        new Date().toISOString().split('T')[0]
      }.json`;
      const result = await this.generateExportFile(exportData, filename);

      return {
        success: true,
        fileUri: result.fileUri,
        filename: result.filename,
        recordCount: products.length,
        metadata: exportData.metadata,
      };
    } catch (error) {
      console.error('Products export error:', error);
      return {
        success: false,
        recordCount: 0,
        error: error instanceof Error ? error.message : 'Unknown export error',
        metadata: {
          exportDate: new Date().toISOString(),
          dataType: 'products',
          version: '2.0',
          recordCount: 0,
          fileSize: 0,
        },
      };
    }
  }

  // Export sales with items and customer information
  async exportSales(): Promise<ExportResult> {
    try {
      this.updateProgress('Fetching sales data...', 0, 3);

      // Get sales from a very early date to get all records
      const startDate = new Date('2020-01-01');
      const endDate = new Date();
      const sales = await this.db.getSalesByDateRange(
        startDate,
        endDate,
        10000
      );

      this.updateProgress('Fetching sale items...', 1, 3);

      // Get sale items for each sale
      const salesWithItems = await Promise.all(
        sales.map(async (sale) => {
          const items = await this.db.getSaleItems(sale.id);
          return {
            ...sale,
            items,
          };
        })
      );

      this.updateProgress('Preparing export data...', 2, 3);

      const exportData: ExportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        dataType: 'sales',
        metadata: {
          exportDate: new Date().toISOString(),
          dataType: 'sales',
          version: '2.0',
          recordCount: sales.length,
          fileSize: 0,
        },
        data: {
          sales: salesWithItems,
        },
        relationships: {
          productCategories: {},
          productSuppliers: {},
          saleCustomers: {},
        },
        integrity: {
          checksum: '',
          recordCounts: {
            sales: sales.length,
            saleItems: salesWithItems.reduce(
              (sum, sale) => sum + sale.items.length,
              0
            ),
          },
          validationRules: [
            'positive_amounts',
            'valid_dates',
            'valid_payment_methods',
          ],
        },
      };

      this.updateProgress('Generating export file...', 3, 3);

      const filename = `sales_export_${
        new Date().toISOString().split('T')[0]
      }.json`;
      const result = await this.generateExportFile(exportData, filename);

      return {
        success: true,
        fileUri: result.fileUri,
        filename: result.filename,
        recordCount: sales.length,
        metadata: exportData.metadata,
      };
    } catch (error) {
      console.error('Sales export error:', error);
      return {
        success: false,
        recordCount: 0,
        error: error instanceof Error ? error.message : 'Unknown export error',
        metadata: {
          exportDate: new Date().toISOString(),
          dataType: 'sales',
          version: '2.0',
          recordCount: 0,
          fileSize: 0,
        },
      };
    }
  }

  // Export customers with purchase history and statistics
  async exportCustomers(): Promise<ExportResult> {
    try {
      this.updateProgress('Fetching customers...', 0, 2);

      const customers = await this.db.getCustomers();

      this.updateProgress('Fetching customer statistics...', 1, 2);

      // Get purchase history and statistics for each customer
      const customersWithHistory = await Promise.all(
        customers.map(async (customer) => {
          try {
            const purchaseHistory = await this.db.getCustomerPurchaseHistory(
              customer.id
            );
            const statistics = await this.db.getCustomerStatistics(customer.id);
            return {
              ...customer,
              purchaseHistory,
              statistics,
            };
          } catch (error) {
            return {
              ...customer,
              purchaseHistory: [],
              statistics: {
                totalSpent: 0,
                visitCount: 0,
                averageOrderValue: 0,
                lastVisit: null,
              },
            };
          }
        })
      );

      const exportData: ExportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        dataType: 'customers',
        metadata: {
          exportDate: new Date().toISOString(),
          dataType: 'customers',
          version: '2.0',
          recordCount: customers.length,
          fileSize: 0,
        },
        data: {
          customers: customersWithHistory,
        },
        relationships: {
          productCategories: {},
          productSuppliers: {},
          saleCustomers: {},
        },
        integrity: {
          checksum: '',
          recordCounts: {
            customers: customers.length,
          },
          validationRules: ['valid_contact_info', 'unique_identifiers'],
        },
      };

      this.updateProgress('Generating export file...', 2, 2);

      const filename = `customers_export_${
        new Date().toISOString().split('T')[0]
      }.json`;
      const result = await this.generateExportFile(exportData, filename);

      return {
        success: true,
        fileUri: result.fileUri,
        filename: result.filename,
        recordCount: customers.length,
        metadata: exportData.metadata,
      };
    } catch (error) {
      console.error('Customers export error:', error);
      return {
        success: false,
        recordCount: 0,
        error: error instanceof Error ? error.message : 'Unknown export error',
        metadata: {
          exportDate: new Date().toISOString(),
          dataType: 'customers',
          version: '2.0',
          recordCount: 0,
          fileSize: 0,
        },
      };
    }
  }

  // Export expenses with categories
  async exportExpenses(): Promise<ExportResult> {
    try {
      this.updateProgress('Fetching expenses...', 0, 2);

      const startDate = new Date('2020-01-01');
      const endDate = new Date();
      const expenses = await this.db.getExpensesByDateRange(
        startDate,
        endDate,
        10000
      );

      this.updateProgress('Fetching expense categories...', 1, 2);

      const expenseCategories = await this.db.getExpenseCategories();

      const exportData: ExportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        dataType: 'expenses',
        metadata: {
          exportDate: new Date().toISOString(),
          dataType: 'expenses',
          version: '2.0',
          recordCount: expenses.length,
          fileSize: 0,
        },
        data: {
          expenses,
          expenseCategories,
        },
        relationships: {
          productCategories: {},
          productSuppliers: {},
          saleCustomers: {},
        },
        integrity: {
          checksum: '',
          recordCounts: {
            expenses: expenses.length,
            expenseCategories: expenseCategories.length,
          },
          validationRules: [
            'positive_amounts',
            'valid_dates',
            'valid_categories',
          ],
        },
      };

      this.updateProgress('Generating export file...', 2, 2);

      const filename = `expenses_export_${
        new Date().toISOString().split('T')[0]
      }.json`;
      const result = await this.generateExportFile(exportData, filename);

      return {
        success: true,
        fileUri: result.fileUri,
        filename: result.filename,
        recordCount: expenses.length,
        metadata: exportData.metadata,
      };
    } catch (error) {
      console.error('Expenses export error:', error);
      return {
        success: false,
        recordCount: 0,
        error: error instanceof Error ? error.message : 'Unknown export error',
        metadata: {
          exportDate: new Date().toISOString(),
          dataType: 'expenses',
          version: '2.0',
          recordCount: 0,
          fileSize: 0,
        },
      };
    }
  }

  // Export stock movements
  async exportStockMovements(): Promise<ExportResult> {
    try {
      this.updateProgress('Fetching stock movements...', 0, 1);

      const stockMovements = await this.db.getStockMovements({}, 1, 10000);

      const exportData: ExportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        dataType: 'stock_movements',
        metadata: {
          exportDate: new Date().toISOString(),
          dataType: 'stock_movements',
          version: '2.0',
          recordCount: stockMovements.length,
          fileSize: 0,
        },
        data: {
          stockMovements,
        },
        relationships: {
          productCategories: {},
          productSuppliers: {},
          saleCustomers: {},
        },
        integrity: {
          checksum: '',
          recordCounts: {
            stockMovements: stockMovements.length,
          },
          validationRules: [
            'valid_movement_types',
            'positive_quantities',
            'valid_products',
          ],
        },
      };

      this.updateProgress('Generating export file...', 1, 1);

      const filename = `stock_movements_export_${
        new Date().toISOString().split('T')[0]
      }.json`;
      const result = await this.generateExportFile(exportData, filename);

      return {
        success: true,
        fileUri: result.fileUri,
        filename: result.filename,
        recordCount: stockMovements.length,
        metadata: exportData.metadata,
      };
    } catch (error) {
      console.error('Stock movements export error:', error);
      return {
        success: false,
        recordCount: 0,
        error: error instanceof Error ? error.message : 'Unknown export error',
        metadata: {
          exportDate: new Date().toISOString(),
          dataType: 'stock_movements',
          version: '2.0',
          recordCount: 0,
          fileSize: 0,
        },
      };
    }
  }

  // Export bulk pricing data
  async exportBulkPricing(): Promise<ExportResult> {
    try {
      this.updateProgress('Fetching products...', 0, 2);

      const products = await this.db.getProducts();

      this.updateProgress('Fetching bulk pricing data...', 1, 2);

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

      // Filter out products without bulk pricing
      const filteredBulkPricing = bulkPricingData.filter(
        (item) => item.bulkTiers.length > 0
      );

      const exportData: ExportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        dataType: 'bulk_pricing',
        metadata: {
          exportDate: new Date().toISOString(),
          dataType: 'bulk_pricing',
          version: '2.0',
          recordCount: filteredBulkPricing.length,
          fileSize: 0,
        },
        data: {
          bulkPricing: filteredBulkPricing,
        },
        relationships: {
          productCategories: {},
          productSuppliers: {},
          saleCustomers: {},
        },
        integrity: {
          checksum: '',
          recordCounts: {
            bulkPricing: filteredBulkPricing.length,
          },
          validationRules: [
            'positive_quantities',
            'positive_prices',
            'valid_products',
          ],
        },
      };

      this.updateProgress('Generating export file...', 2, 2);

      const filename = `bulk_pricing_export_${
        new Date().toISOString().split('T')[0]
      }.json`;
      const result = await this.generateExportFile(exportData, filename);

      return {
        success: true,
        fileUri: result.fileUri,
        filename: result.filename,
        recordCount: filteredBulkPricing.length,
        metadata: exportData.metadata,
      };
    } catch (error) {
      console.error('Bulk pricing export error:', error);
      return {
        success: false,
        recordCount: 0,
        error: error instanceof Error ? error.message : 'Unknown export error',
        metadata: {
          exportDate: new Date().toISOString(),
          dataType: 'bulk_pricing',
          version: '2.0',
          recordCount: 0,
          fileSize: 0,
        },
      };
    }
  }

  // Export complete backup with all data
  async exportCompleteBackup(): Promise<ExportResult> {
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

      const totalRecords =
        products.length +
        sales.length +
        customers.length +
        expenses.length +
        stockMovements.length +
        bulkPricingData.filter((item) => item.bulkTiers.length > 0).length;

      const exportData: ExportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        dataType: 'complete',
        metadata: {
          exportDate: new Date().toISOString(),
          dataType: 'complete',
          version: '2.0',
          recordCount: totalRecords,
          fileSize: 0,
        },
        data: {
          products: products.map((product) => ({
            ...product,
            // Keep UUID IDs for referential integrity
            created_at: undefined,
            updated_at: undefined,
          })),
          categories,
          suppliers,
          sales: salesWithItems,
          customers,
          expenses,
          expenseCategories,
          stockMovements,
          bulkPricing: bulkPricingData.filter(
            (item) => item.bulkTiers.length > 0
          ),
        },
        relationships: this.buildRelationshipMappings(
          products,
          categories,
          suppliers,
          customers
        ),
        integrity: {
          checksum: '',
          recordCounts: {
            products: products.length,
            categories: categories.length,
            suppliers: suppliers.length,
            sales: sales.length,
            customers: customers.length,
            expenses: expenses.length,
            expenseCategories: expenseCategories.length,
            stockMovements: stockMovements.length,
            bulkPricing: bulkPricingData.filter(
              (item) => item.bulkTiers.length > 0
            ).length,
          },
          validationRules: [
            'required_fields',
            'positive_prices',
            'valid_categories',
            'positive_amounts',
            'valid_dates',
            'valid_payment_methods',
            'valid_contact_info',
            'unique_identifiers',
            'valid_movement_types',
            'positive_quantities',
            'valid_products',
          ],
        },
      };

      this.updateProgress('Generating complete backup file...', 8, 8);

      const filename = `complete_backup_${
        new Date().toISOString().split('T')[0]
      }.json`;
      const result = await this.generateExportFile(exportData, filename);

      return {
        success: true,
        fileUri: result.fileUri,
        filename: result.filename,
        recordCount: totalRecords,
        metadata: exportData.metadata,
      };
    } catch (error) {
      console.error('Complete backup export error:', error);
      return {
        success: false,
        recordCount: 0,
        error: error instanceof Error ? error.message : 'Unknown export error',
        metadata: {
          exportDate: new Date().toISOString(),
          dataType: 'complete',
          version: '2.0',
          recordCount: 0,
          fileSize: 0,
        },
      };
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
