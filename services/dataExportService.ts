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

  // Enhanced data filtering logic to ensure exports contain only selected data type
  private filterDataByType(allData: any, dataType: string): any {
    const filteredData: any = {};

    try {
      // Validate input data structure
      if (!allData || typeof allData !== 'object') {
        throw new Error('Invalid data structure provided for filtering');
      }

      switch (dataType) {
        case 'products':
          filteredData.products = this.validateAndSanitizeArray(
            allData.products,
            'products'
          );
          filteredData.categories = this.validateAndSanitizeArray(
            allData.categories,
            'categories'
          );
          filteredData.suppliers = this.validateAndSanitizeArray(
            allData.suppliers,
            'suppliers'
          );
          filteredData.bulkPricing = this.validateAndSanitizeArray(
            allData.bulkPricing,
            'bulkPricing'
          );
          break;
        case 'sales':
          filteredData.sales = this.validateAndSanitizeArray(
            allData.sales,
            'sales'
          );
          filteredData.saleItems = this.validateAndSanitizeArray(
            allData.saleItems,
            'saleItems'
          );
          break;
        case 'customers':
          filteredData.customers = this.validateAndSanitizeArray(
            allData.customers,
            'customers'
          );
          break;
        case 'expenses':
          filteredData.expenses = this.validateAndSanitizeArray(
            allData.expenses,
            'expenses'
          );
          filteredData.expenseCategories = this.validateAndSanitizeArray(
            allData.expenseCategories,
            'expenseCategories'
          );
          break;
        case 'stock_movements':
          filteredData.stockMovements = this.validateAndSanitizeArray(
            allData.stockMovements,
            'stockMovements'
          );
          break;
        case 'bulk_pricing':
          filteredData.bulkPricing = this.validateAndSanitizeArray(
            allData.bulkPricing,
            'bulkPricing'
          );
          break;
        case 'complete':
          // Validate all data sections for complete backup
          const validatedData: any = {};
          Object.keys(allData).forEach((key) => {
            validatedData[key] = this.validateAndSanitizeArray(
              allData[key],
              key
            );
          });
          return validatedData;
        default:
          throw new Error(`Unsupported data type: ${dataType}`);
      }

      return filteredData;
    } catch (error) {
      console.error('Error filtering data by type:', error);
      throw new Error(
        `Failed to filter data for type '${dataType}': ${
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

  // Calculate actual record count for the selected data type
  private calculateActualRecordCount(data: any, dataType: string): number {
    switch (dataType) {
      case 'products':
        return (
          (data.products?.length || 0) +
          (data.categories?.length || 0) +
          (data.suppliers?.length || 0) +
          (data.bulkPricing?.length || 0)
        );
      case 'sales':
        const saleItemsCount =
          data.sales?.reduce(
            (sum: number, sale: any) => sum + (sale.items?.length || 0),
            0
          ) || 0;
        return (data.sales?.length || 0) + saleItemsCount;
      case 'customers':
        return data.customers?.length || 0;
      case 'expenses':
        return (
          (data.expenses?.length || 0) + (data.expenseCategories?.length || 0)
        );
      case 'stock_movements':
        return data.stockMovements?.length || 0;
      case 'bulk_pricing':
        return data.bulkPricing?.length || 0;
      case 'complete':
        let totalCount = 0;
        for (const value of Object.values(data)) {
          if (Array.isArray(value)) {
            totalCount += value.length;
          }
        }
        return totalCount;
      default:
        return 0;
    }
  }

  // Check if the export is empty for the selected data type
  private isEmptyExport(data: any, dataType: string): boolean {
    return this.calculateActualRecordCount(data, dataType) === 0;
  }

  // Create a standardized export result with proper feedback
  private createExportResult(
    success: boolean,
    dataType: string,
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
      actualDataType: dataType,
      metadata: {
        exportDate: new Date().toISOString(),
        dataType,
        version: '2.0',
        recordCount: actualRecordCount,
        fileSize: 0, // Will be updated after file creation
        emptyExport: isEmpty,
        actualRecordCount,
      },
    };
  }

  // Handle empty data type exports with proper user notification
  private async handleEmptyExport(dataType: string): Promise<ExportResult> {
    try {
      console.log(`Handling empty export for data type: ${dataType}`);

      // Create empty export data structure
      const emptyExportData: ExportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        dataType: dataType as any,
        metadata: {
          exportDate: new Date().toISOString(),
          dataType,
          version: '2.0',
          recordCount: 0,
          fileSize: 0,
          emptyExport: true,
          actualRecordCount: 0,
        },
        data: this.createEmptyDataStructure(dataType),
        relationships: {
          productCategories: {},
          productSuppliers: {},
          saleCustomers: {},
        },
        integrity: {
          checksum: '',
          recordCounts: this.createEmptyRecordCounts(dataType),
          validationRules: this.getValidationRulesForDataType(dataType),
        },
      };

      // Generate empty export file
      const filename = `${dataType}_export_${
        new Date().toISOString().split('T')[0]
      }_empty.json`;
      const fileResult = await this.generateExportFile(
        emptyExportData,
        filename
      );

      return this.createExportResult(
        true,
        dataType,
        0,
        fileResult.fileUri,
        fileResult.filename
      );
    } catch (error) {
      console.error('Error handling empty export:', error);
      return this.createExportResult(
        false,
        dataType,
        0,
        undefined,
        undefined,
        `Failed to create empty export: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  // Create empty data structure for a specific data type
  private createEmptyDataStructure(dataType: string): any {
    const emptyData: any = {};

    switch (dataType) {
      case 'products':
        emptyData.products = [];
        emptyData.categories = [];
        emptyData.suppliers = [];
        emptyData.bulkPricing = [];
        break;
      case 'sales':
        emptyData.sales = [];
        emptyData.saleItems = [];
        break;
      case 'customers':
        emptyData.customers = [];
        break;
      case 'expenses':
        emptyData.expenses = [];
        emptyData.expenseCategories = [];
        break;
      case 'stock_movements':
        emptyData.stockMovements = [];
        break;
      case 'bulk_pricing':
        emptyData.bulkPricing = [];
        break;
      case 'complete':
        emptyData.products = [];
        emptyData.categories = [];
        emptyData.suppliers = [];
        emptyData.sales = [];
        emptyData.saleItems = [];
        emptyData.customers = [];
        emptyData.expenses = [];
        emptyData.expenseCategories = [];
        emptyData.stockMovements = [];
        emptyData.bulkPricing = [];
        break;
    }

    return emptyData;
  }

  // Create empty record counts for a specific data type
  private createEmptyRecordCounts(dataType: string): Record<string, number> {
    const counts: Record<string, number> = {};

    switch (dataType) {
      case 'products':
        counts.products = 0;
        counts.categories = 0;
        counts.suppliers = 0;
        counts.bulkPricing = 0;
        break;
      case 'sales':
        counts.sales = 0;
        counts.saleItems = 0;
        break;
      case 'customers':
        counts.customers = 0;
        break;
      case 'expenses':
        counts.expenses = 0;
        counts.expenseCategories = 0;
        break;
      case 'stock_movements':
        counts.stockMovements = 0;
        break;
      case 'bulk_pricing':
        counts.bulkPricing = 0;
        break;
      case 'complete':
        counts.products = 0;
        counts.categories = 0;
        counts.suppliers = 0;
        counts.sales = 0;
        counts.saleItems = 0;
        counts.customers = 0;
        counts.expenses = 0;
        counts.expenseCategories = 0;
        counts.stockMovements = 0;
        counts.bulkPricing = 0;
        break;
    }

    return counts;
  }

  // Get validation rules for a specific data type
  private getValidationRulesForDataType(dataType: string): string[] {
    switch (dataType) {
      case 'products':
        return ['required_fields', 'positive_prices', 'valid_categories'];
      case 'sales':
        return ['positive_amounts', 'valid_dates', 'valid_payment_methods'];
      case 'customers':
        return ['valid_contact_info', 'unique_identifiers'];
      case 'expenses':
        return ['positive_amounts', 'valid_dates', 'valid_categories'];
      case 'stock_movements':
        return [
          'valid_movement_types',
          'positive_quantities',
          'valid_products',
        ];
      case 'bulk_pricing':
        return ['positive_quantities', 'positive_prices', 'valid_products'];
      case 'complete':
        return [
          'required_fields',
          'positive_amounts',
          'valid_dates',
          'valid_references',
        ];
      default:
        return ['basic_validation'];
    }
  }

  // Generate user-friendly feedback message for export results
  generateExportFeedbackMessage(result: ExportResult): string {
    if (!result.success) {
      return `Export failed: ${result.error || 'Unknown error'}`;
    }

    const dataTypeName = this.getDataTypeDisplayName(
      result.actualDataType || 'unknown'
    );

    if (result.emptyExport) {
      return `${dataTypeName} export completed, but no data was found. An empty export file has been created for consistency.`;
    }

    const recordText = result.recordCount === 1 ? 'record' : 'records';
    return `${dataTypeName} export completed successfully! ${result.recordCount} ${recordText} exported.`;
  }

  // Get user-friendly display name for data types
  private getDataTypeDisplayName(dataType: string): string {
    const displayNames: Record<string, string> = {
      products: 'Products & Inventory',
      sales: 'Sales Data',
      customers: 'Customer Data',
      expenses: 'Expenses',
      stock_movements: 'Stock Movements',
      bulk_pricing: 'Bulk Pricing',
      complete: 'Complete Backup',
    };

    return displayNames[dataType] || dataType;
  }

  // Enhanced progress reporting that reflects actual data being processed
  private updateProgressWithDataType(
    stage: string,
    current: number,
    total: number,
    dataType?: string
  ): void {
    if (this.progressCallback) {
      const percentage = total > 0 ? (current / total) * 100 : 0;
      const enhancedStage = dataType ? `${stage} (${dataType})` : stage;
      this.progressCallback({
        stage: enhancedStage,
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

  // Export products with categories, suppliers, and bulk pricing
  async exportProducts(): Promise<ExportResult> {
    try {
      this.updateProgressWithDataType(
        'Fetching products data...',
        0,
        4,
        'products'
      );

      const products = await this.db.getProducts();
      this.updateProgressWithDataType(
        'Fetching categories...',
        1,
        4,
        'products'
      );

      const categories = await this.db.getCategories();
      this.updateProgressWithDataType(
        'Fetching suppliers...',
        2,
        4,
        'products'
      );

      const suppliers = await this.db.getSuppliers();
      this.updateProgressWithDataType(
        'Fetching bulk pricing...',
        3,
        4,
        'products'
      );

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

      // Filter bulk pricing to only include products with tiers
      const filteredBulkPricing = bulkPricingData.filter(
        (item) => item.bulkTiers.length > 0
      );

      // Apply data filtering to ensure only products-related data is included
      const allData = {
        products: products.map((product) => ({
          ...product,
          created_at: undefined,
          updated_at: undefined,
        })),
        categories,
        suppliers,
        bulkPricing: filteredBulkPricing,
      };

      const filteredData = this.filterDataByType(allData, 'products');
      const actualRecordCount = this.calculateActualRecordCount(
        filteredData,
        'products'
      );

      // Create initial export result
      const initialResult = this.createExportResult(
        true,
        'products',
        actualRecordCount
      );

      const exportData: ExportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        dataType: 'products',
        metadata: {
          ...initialResult.metadata,
          fileSize: 0, // Will be calculated after file creation
        },
        data: filteredData,
        relationships: this.buildRelationshipMappings(
          products,
          categories,
          suppliers,
          []
        ),
        integrity: {
          checksum: '',
          recordCounts: {
            products: filteredData.products?.length || 0,
            categories: filteredData.categories?.length || 0,
            suppliers: filteredData.suppliers?.length || 0,
            bulkPricing: filteredData.bulkPricing?.length || 0,
          },
          validationRules: [
            'required_fields',
            'positive_prices',
            'valid_categories',
          ],
        },
      };

      this.updateProgressWithDataType(
        'Generating export file...',
        4,
        4,
        'products'
      );

      const filename = `products_export_${
        new Date().toISOString().split('T')[0]
      }.json`;
      const fileResult = await this.generateExportFile(exportData, filename);

      // Update the result with file information
      const finalResult = this.createExportResult(
        true,
        'products',
        actualRecordCount,
        fileResult.fileUri,
        fileResult.filename
      );

      // Update metadata with actual file size
      finalResult.metadata.fileSize = exportData.metadata.fileSize;
      finalResult.metadata.checksum = exportData.integrity.checksum;

      return finalResult;
    } catch (error) {
      console.error('Products export error:', error);
      return this.createExportResult(
        false,
        'products',
        0,
        undefined,
        undefined,
        error instanceof Error ? error.message : 'Unknown export error'
      );
    }
  }

  // Export sales with items and customer information
  async exportSales(): Promise<ExportResult> {
    try {
      this.updateProgressWithDataType('Fetching sales data...', 0, 3, 'sales');

      // Get sales from a very early date to get all records
      const startDate = new Date('2020-01-01');
      const endDate = new Date();
      const sales = await this.db.getSalesByDateRange(
        startDate,
        endDate,
        10000
      );

      this.updateProgressWithDataType('Fetching sale items...', 1, 3, 'sales');

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

      this.updateProgressWithDataType(
        'Preparing export data...',
        2,
        3,
        'sales'
      );

      // Apply data filtering to ensure only sales-related data is included
      const allData = {
        sales: salesWithItems,
        saleItems: salesWithItems.flatMap((sale) => sale.items || []),
      };

      const filteredData = this.filterDataByType(allData, 'sales');
      const actualRecordCount = this.calculateActualRecordCount(
        filteredData,
        'sales'
      );

      // Create initial export result
      const initialResult = this.createExportResult(
        true,
        'sales',
        actualRecordCount
      );

      const exportData: ExportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        dataType: 'sales',
        metadata: {
          ...initialResult.metadata,
          fileSize: 0, // Will be calculated after file creation
        },
        data: filteredData,
        relationships: {
          productCategories: {},
          productSuppliers: {},
          saleCustomers: {},
        },
        integrity: {
          checksum: '',
          recordCounts: {
            sales: filteredData.sales?.length || 0,
            saleItems:
              filteredData.sales?.reduce(
                (sum: number, sale: any) => sum + (sale.items?.length || 0),
                0
              ) || 0,
          },
          validationRules: [
            'positive_amounts',
            'valid_dates',
            'valid_payment_methods',
          ],
        },
      };

      this.updateProgressWithDataType(
        'Generating export file...',
        3,
        3,
        'sales'
      );

      const filename = `sales_export_${
        new Date().toISOString().split('T')[0]
      }.json`;
      const fileResult = await this.generateExportFile(exportData, filename);

      // Update the result with file information
      const finalResult = this.createExportResult(
        true,
        'sales',
        actualRecordCount,
        fileResult.fileUri,
        fileResult.filename
      );

      // Update metadata with actual file size
      finalResult.metadata.fileSize = exportData.metadata.fileSize;
      finalResult.metadata.checksum = exportData.integrity.checksum;

      return finalResult;
    } catch (error) {
      console.error('Sales export error:', error);
      return this.createExportResult(
        false,
        'sales',
        0,
        undefined,
        undefined,
        error instanceof Error ? error.message : 'Unknown export error'
      );
    }
  }

  // Export customers with purchase history and statistics
  async exportCustomers(): Promise<ExportResult> {
    try {
      this.updateProgressWithDataType(
        'Fetching customers...',
        0,
        2,
        'customers'
      );

      const customers = await this.db.getCustomers();

      this.updateProgressWithDataType(
        'Fetching customer statistics...',
        1,
        2,
        'customers'
      );

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

      // Apply data filtering to ensure only customer-related data is included
      const allData = {
        customers: customersWithHistory,
      };

      const filteredData = this.filterDataByType(allData, 'customers');
      const actualRecordCount = this.calculateActualRecordCount(
        filteredData,
        'customers'
      );

      // Create initial export result
      const initialResult = this.createExportResult(
        true,
        'customers',
        actualRecordCount
      );

      const exportData: ExportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        dataType: 'customers',
        metadata: {
          ...initialResult.metadata,
          fileSize: 0, // Will be calculated after file creation
        },
        data: filteredData,
        relationships: {
          productCategories: {},
          productSuppliers: {},
          saleCustomers: {},
        },
        integrity: {
          checksum: '',
          recordCounts: {
            customers: filteredData.customers?.length || 0,
          },
          validationRules: ['valid_contact_info', 'unique_identifiers'],
        },
      };

      this.updateProgressWithDataType(
        'Generating export file...',
        2,
        2,
        'customers'
      );

      const filename = `customers_export_${
        new Date().toISOString().split('T')[0]
      }.json`;
      const fileResult = await this.generateExportFile(exportData, filename);

      // Update the result with file information
      const finalResult = this.createExportResult(
        true,
        'customers',
        actualRecordCount,
        fileResult.fileUri,
        fileResult.filename
      );

      // Update metadata with actual file size
      finalResult.metadata.fileSize = exportData.metadata.fileSize;
      finalResult.metadata.checksum = exportData.integrity.checksum;

      return finalResult;
    } catch (error) {
      console.error('Customers export error:', error);
      return this.createExportResult(
        false,
        'customers',
        0,
        undefined,
        undefined,
        error instanceof Error ? error.message : 'Unknown export error'
      );
    }
  }

  // Export expenses with categories
  async exportExpenses(): Promise<ExportResult> {
    try {
      this.updateProgressWithDataType('Fetching expenses...', 0, 2, 'expenses');

      const startDate = new Date('2020-01-01');
      const endDate = new Date();
      const expenses = await this.db.getExpensesByDateRange(
        startDate,
        endDate,
        10000
      );

      this.updateProgressWithDataType(
        'Fetching expense categories...',
        1,
        2,
        'expenses'
      );

      const expenseCategories = await this.db.getExpenseCategories();

      // Apply data filtering to ensure only expense-related data is included
      const allData = {
        expenses,
        expenseCategories,
      };

      const filteredData = this.filterDataByType(allData, 'expenses');
      const actualRecordCount = this.calculateActualRecordCount(
        filteredData,
        'expenses'
      );

      // Create initial export result
      const initialResult = this.createExportResult(
        true,
        'expenses',
        actualRecordCount
      );

      const exportData: ExportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        dataType: 'expenses',
        metadata: {
          ...initialResult.metadata,
          fileSize: 0, // Will be calculated after file creation
        },
        data: filteredData,
        relationships: {
          productCategories: {},
          productSuppliers: {},
          saleCustomers: {},
        },
        integrity: {
          checksum: '',
          recordCounts: {
            expenses: filteredData.expenses?.length || 0,
            expenseCategories: filteredData.expenseCategories?.length || 0,
          },
          validationRules: [
            'positive_amounts',
            'valid_dates',
            'valid_categories',
          ],
        },
      };

      this.updateProgressWithDataType(
        'Generating export file...',
        2,
        2,
        'expenses'
      );

      const filename = `expenses_export_${
        new Date().toISOString().split('T')[0]
      }.json`;
      const fileResult = await this.generateExportFile(exportData, filename);

      // Update the result with file information
      const finalResult = this.createExportResult(
        true,
        'expenses',
        actualRecordCount,
        fileResult.fileUri,
        fileResult.filename
      );

      // Update metadata with actual file size
      finalResult.metadata.fileSize = exportData.metadata.fileSize;
      finalResult.metadata.checksum = exportData.integrity.checksum;

      return finalResult;
    } catch (error) {
      console.error('Expenses export error:', error);
      return this.createExportResult(
        false,
        'expenses',
        0,
        undefined,
        undefined,
        error instanceof Error ? error.message : 'Unknown export error'
      );
    }
  }

  // Export stock movements
  async exportStockMovements(): Promise<ExportResult> {
    try {
      this.updateProgressWithDataType(
        'Fetching stock movements...',
        0,
        1,
        'stock movements'
      );

      const stockMovements = await this.db.getStockMovements({}, 1, 10000);

      // Apply data filtering to ensure only stock movement data is included
      const allData = {
        stockMovements,
      };

      const filteredData = this.filterDataByType(allData, 'stock_movements');
      const actualRecordCount = this.calculateActualRecordCount(
        filteredData,
        'stock_movements'
      );

      // Create initial export result
      const initialResult = this.createExportResult(
        true,
        'stock_movements',
        actualRecordCount
      );

      const exportData: ExportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        dataType: 'stock_movements',
        metadata: {
          ...initialResult.metadata,
          fileSize: 0, // Will be calculated after file creation
        },
        data: filteredData,
        relationships: {
          productCategories: {},
          productSuppliers: {},
          saleCustomers: {},
        },
        integrity: {
          checksum: '',
          recordCounts: {
            stockMovements: filteredData.stockMovements?.length || 0,
          },
          validationRules: [
            'valid_movement_types',
            'positive_quantities',
            'valid_products',
          ],
        },
      };

      this.updateProgressWithDataType(
        'Generating export file...',
        1,
        1,
        'stock movements'
      );

      const filename = `stock_movements_export_${
        new Date().toISOString().split('T')[0]
      }.json`;
      const fileResult = await this.generateExportFile(exportData, filename);

      // Update the result with file information
      const finalResult = this.createExportResult(
        true,
        'stock_movements',
        actualRecordCount,
        fileResult.fileUri,
        fileResult.filename
      );

      // Update metadata with actual file size
      finalResult.metadata.fileSize = exportData.metadata.fileSize;
      finalResult.metadata.checksum = exportData.integrity.checksum;

      return finalResult;
    } catch (error) {
      console.error('Stock movements export error:', error);
      return this.createExportResult(
        false,
        'stock_movements',
        0,
        undefined,
        undefined,
        error instanceof Error ? error.message : 'Unknown export error'
      );
    }
  }

  // Export bulk pricing data
  async exportBulkPricing(): Promise<ExportResult> {
    try {
      this.updateProgressWithDataType(
        'Fetching products...',
        0,
        2,
        'bulk pricing'
      );

      const products = await this.db.getProducts();

      this.updateProgressWithDataType(
        'Fetching bulk pricing data...',
        1,
        2,
        'bulk pricing'
      );

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

      // Apply data filtering to ensure only bulk pricing data is included
      const allData = {
        bulkPricing: filteredBulkPricing,
      };

      const filteredData = this.filterDataByType(allData, 'bulk_pricing');
      const actualRecordCount = this.calculateActualRecordCount(
        filteredData,
        'bulk_pricing'
      );

      // Create initial export result
      const initialResult = this.createExportResult(
        true,
        'bulk_pricing',
        actualRecordCount
      );

      const exportData: ExportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        dataType: 'bulk_pricing',
        metadata: {
          ...initialResult.metadata,
          fileSize: 0, // Will be calculated after file creation
        },
        data: filteredData,
        relationships: {
          productCategories: {},
          productSuppliers: {},
          saleCustomers: {},
        },
        integrity: {
          checksum: '',
          recordCounts: {
            bulkPricing: filteredData.bulkPricing?.length || 0,
          },
          validationRules: [
            'positive_quantities',
            'positive_prices',
            'valid_products',
          ],
        },
      };

      this.updateProgressWithDataType(
        'Generating export file...',
        2,
        2,
        'bulk pricing'
      );

      const filename = `bulk_pricing_export_${
        new Date().toISOString().split('T')[0]
      }.json`;
      const fileResult = await this.generateExportFile(exportData, filename);

      // Update the result with file information
      const finalResult = this.createExportResult(
        true,
        'bulk_pricing',
        actualRecordCount,
        fileResult.fileUri,
        fileResult.filename
      );

      // Update metadata with actual file size
      finalResult.metadata.fileSize = exportData.metadata.fileSize;
      finalResult.metadata.checksum = exportData.integrity.checksum;

      return finalResult;
    } catch (error) {
      console.error('Bulk pricing export error:', error);
      return this.createExportResult(
        false,
        'bulk_pricing',
        0,
        undefined,
        undefined,
        error instanceof Error ? error.message : 'Unknown export error'
      );
    }
  }

  // Export complete backup with all data
  async exportCompleteBackup(): Promise<ExportResult> {
    try {
      this.updateProgressWithDataType(
        'Fetching all data...',
        0,
        8,
        'complete backup'
      );

      // Fetch all data types
      const products = await this.db.getProducts();
      this.updateProgressWithDataType(
        'Fetched products...',
        1,
        8,
        'complete backup'
      );

      const categories = await this.db.getCategories();
      this.updateProgressWithDataType(
        'Fetched categories...',
        2,
        8,
        'complete backup'
      );

      const suppliers = await this.db.getSuppliers();
      this.updateProgressWithDataType(
        'Fetched suppliers...',
        3,
        8,
        'complete backup'
      );

      const startDate = new Date('2020-01-01');
      const endDate = new Date();
      const sales = await this.db.getSalesByDateRange(
        startDate,
        endDate,
        10000
      );
      this.updateProgressWithDataType(
        'Fetched sales...',
        4,
        8,
        'complete backup'
      );

      const salesWithItems = await Promise.all(
        sales.map(async (sale) => {
          const items = await this.db.getSaleItems(sale.id);
          return { ...sale, items };
        })
      );
      this.updateProgressWithDataType(
        'Fetched sale items...',
        5,
        8,
        'complete backup'
      );

      const expenses = await this.db.getExpensesByDateRange(
        startDate,
        endDate,
        10000
      );
      const expenseCategories = await this.db.getExpenseCategories();
      this.updateProgressWithDataType(
        'Fetched expenses...',
        6,
        8,
        'complete backup'
      );

      const customers = await this.db.getCustomers();
      const stockMovements = await this.db.getStockMovements({}, 1, 10000);
      this.updateProgressWithDataType(
        'Fetched customers and stock movements...',
        7,
        8,
        'complete backup'
      );

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

      // Apply data filtering for complete backup (returns all data)
      const allData = {
        products: products.map((product) => ({
          ...product,
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
      };

      const filteredData = this.filterDataByType(allData, 'complete');
      const actualRecordCount = this.calculateActualRecordCount(
        filteredData,
        'complete'
      );

      // Create initial export result
      const initialResult = this.createExportResult(
        true,
        'complete',
        actualRecordCount
      );

      const exportData: ExportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        dataType: 'complete',
        metadata: {
          ...initialResult.metadata,
          fileSize: 0, // Will be calculated after file creation
        },
        data: filteredData,
        relationships: this.buildRelationshipMappings(
          products,
          categories,
          suppliers,
          customers
        ),
        integrity: {
          checksum: '',
          recordCounts: {
            products: filteredData.products?.length || 0,
            categories: filteredData.categories?.length || 0,
            suppliers: filteredData.suppliers?.length || 0,
            sales: filteredData.sales?.length || 0,
            customers: filteredData.customers?.length || 0,
            expenses: filteredData.expenses?.length || 0,
            expenseCategories: filteredData.expenseCategories?.length || 0,
            stockMovements: filteredData.stockMovements?.length || 0,
            bulkPricing: filteredData.bulkPricing?.length || 0,
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

      this.updateProgressWithDataType(
        'Generating complete backup file...',
        8,
        8,
        'complete backup'
      );

      const filename = `complete_backup_${
        new Date().toISOString().split('T')[0]
      }.json`;
      const fileResult = await this.generateExportFile(exportData, filename);

      // Update the result with file information
      const finalResult = this.createExportResult(
        true,
        'complete',
        actualRecordCount,
        fileResult.fileUri,
        fileResult.filename
      );

      // Update metadata with actual file size
      finalResult.metadata.fileSize = exportData.metadata.fileSize;
      finalResult.metadata.checksum = exportData.integrity.checksum;

      return finalResult;
    } catch (error) {
      console.error('Complete backup export error:', error);
      return this.createExportResult(
        false,
        'complete',
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
