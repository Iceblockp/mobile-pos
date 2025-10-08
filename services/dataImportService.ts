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
  dataType?: string; // The specific data type that was imported
  availableDataTypes?: string[]; // Data types available in the import file
  processedDataTypes?: string[]; // Data types actually processed
  detailedCounts?: Record<string, number>; // Detailed counts for each data type in the file
  actualProcessedCounts?: Record<
    string,
    { imported: number; updated: number; skipped: number }
  >; // Actual counts processed per data type
  validationMessage?: string; // Detailed validation message about data type availability
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
  recordType: string; // New field to identify the data type
  matchedBy: 'uuid' | 'name' | 'other'; // New field to show matching criteria
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

  // Validate that import file contains the selected data type
  validateDataTypeAvailability(
    importData: any,
    selectedType: string
  ): {
    isValid: boolean;
    availableTypes: string[];
    message?: string;
    detailedCounts?: Record<string, number>;
    corruptedSections?: string[];
    validationErrors?: string[];
  } {
    const dataTypeMap: Record<string, string[]> = {
      all: [
        'products',
        'sales',
        'customers',
        'expenses',
        'stockMovements',
        'bulkPricing',
      ],
    };

    const validationErrors: string[] = [];
    const corruptedSections: string[] = [];

    try {
      // Comprehensive validation of import data structure
      if (!importData) {
        return {
          isValid: false,
          availableTypes: [],
          message: 'Import file is empty or null',
          detailedCounts: {},
          corruptedSections: [],
          validationErrors: ['Import file is empty or null'],
        };
      }

      if (typeof importData !== 'object') {
        return {
          isValid: false,
          availableTypes: [],
          message: 'Import file does not contain valid JSON object',
          detailedCounts: {},
          corruptedSections: [],
          validationErrors: ['Import file does not contain valid JSON object'],
        };
      }

      if (!importData.data) {
        return {
          isValid: false,
          availableTypes: [],
          message:
            'Import file does not contain valid data structure (missing "data" field)',
          detailedCounts: {},
          corruptedSections: [],
          validationErrors: ['Missing "data" field in import file'],
        };
      }

      if (typeof importData.data !== 'object') {
        return {
          isValid: false,
          availableTypes: [],
          message: 'Import file data field is not a valid object',
          detailedCounts: {},
          corruptedSections: [],
          validationErrors: ['Data field is not a valid object'],
        };
      }

      // Get available data types in the file with counts and validate each section
      const availableTypes: string[] = [];
      const detailedCounts: Record<string, number> = {};

      Object.keys(importData.data).forEach((key) => {
        try {
          const section = importData.data[key];

          if (!Array.isArray(section)) {
            if (section !== null && section !== undefined) {
              validationErrors.push(
                `Data section "${key}" is not an array (found ${typeof section})`
              );
              corruptedSections.push(key);
            }
            detailedCounts[key] = 0;
            return;
          }

          // Validate array contents
          const validRecords = this.validateDataSection(section, key);
          const count = validRecords.length;
          detailedCounts[key] = count;

          if (count > 0) {
            availableTypes.push(key);
          }

          // Report corrupted records
          if (validRecords.length < section.length) {
            const corruptedCount = section.length - validRecords.length;
            validationErrors.push(
              `Data section "${key}" has ${corruptedCount} corrupted/invalid records out of ${section.length}`
            );
            if (validRecords.length === 0) {
              corruptedSections.push(key);
            }
          }
        } catch (error) {
          validationErrors.push(
            `Error validating data section "${key}": ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
          corruptedSections.push(key);
          detailedCounts[key] = 0;
        }
      });

      // Only 'all' data type is supported now
      if (selectedType !== 'all') {
        return {
          isValid: false,
          availableTypes,
          message: `Unsupported data type: ${selectedType}. Only 'all' data import is supported.`,
          detailedCounts,
          corruptedSections,
          validationErrors,
        };
      }

      // For 'all' type, we accept any available data
      const hasValidData = availableTypes.length > 0;
      let message: string | undefined;

      if (!hasValidData) {
        if (corruptedSections.length > 0) {
          message = `Import file contains only corrupted data sections: ${corruptedSections.join(
            ', '
          )}`;
        } else {
          message = 'Import file does not contain any valid data';
        }
      } else if (corruptedSections.length > 0) {
        message = `Some data sections are corrupted and will be skipped: ${corruptedSections.join(
          ', '
        )}`;
      }

      // Accept files with any valid dataType for backward compatibility
      if (
        importData.dataType &&
        ![
          'all',
          'complete',
          'products',
          'sales',
          'customers',
          'expenses',
          'stock_movements',
          'bulk_pricing',
        ].includes(importData.dataType)
      ) {
        return {
          isValid: false,
          availableTypes,
          message: `Import file has unsupported dataType: ${importData.dataType}`,
          detailedCounts,
          corruptedSections,
          validationErrors,
        };
      }

      return {
        isValid: true,
        availableTypes,
        detailedCounts,
        corruptedSections,
        validationErrors:
          validationErrors.length > 0 ? validationErrors : undefined,
      };
    } catch (error) {
      return {
        isValid: false,
        availableTypes: [],
        message: `Error validating import file: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        detailedCounts: {},
        corruptedSections: [],
        validationErrors: [
          `Validation error: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        ],
      };
    }
  }

  // Validate individual data section for corrupted or malformed data
  private validateDataSection(section: any[], sectionName: string): any[] {
    if (!Array.isArray(section)) {
      return [];
    }

    const validRecords: any[] = [];

    section.forEach((record, index) => {
      try {
        // Basic validation - must be an object
        if (!record || typeof record !== 'object') {
          console.warn(
            `Skipping invalid ${sectionName} record at index ${index}: not an object`
          );
          return;
        }

        // Check for circular references
        try {
          JSON.stringify(record);
        } catch (error) {
          console.warn(
            `Skipping ${sectionName} record at index ${index}: circular reference or non-serializable data`
          );
          return;
        }

        // Validate required fields based on section type
        if (!this.validateRecordRequiredFields(record, sectionName)) {
          console.warn(
            `Skipping ${sectionName} record at index ${index}: missing required fields`
          );
          return;
        }

        // Validate data types
        if (!this.validateRecordDataTypes(record, sectionName)) {
          console.warn(
            `Skipping ${sectionName} record at index ${index}: invalid data types`
          );
          return;
        }

        validRecords.push(record);
      } catch (error) {
        console.warn(
          `Skipping corrupted ${sectionName} record at index ${index}:`,
          error
        );
      }
    });

    return validRecords;
  }

  // Validate required fields for different record types
  private validateRecordRequiredFields(
    record: any,
    sectionName: string
  ): boolean {
    try {
      switch (sectionName) {
        case 'products':
          return !!(
            record.name &&
            record.price !== undefined &&
            record.cost !== undefined
          );
        case 'sales':
          return !!(record.total !== undefined && record.payment_method);
        case 'customers':
          return !!record.name;
        case 'expenses':
          return !!(record.amount !== undefined && record.description);
        case 'stockMovements':
          return !!(
            record.product_id &&
            record.movement_type &&
            record.quantity !== undefined
          );
        case 'bulkPricing':
          return !!(
            record.product_id &&
            record.min_quantity !== undefined &&
            record.bulk_price !== undefined
          );
        case 'categories':
          return !!record.name;
        case 'suppliers':
          return !!record.name;
        case 'expenseCategories':
          return !!record.name;
        case 'saleItems':
          return !!(
            record.product_id &&
            record.quantity !== undefined &&
            record.price !== undefined
          );
        default:
          return true; // For unknown types, assume valid
      }
    } catch (error) {
      console.error(
        `Error validating required fields for ${sectionName}:`,
        error
      );
      return false;
    }
  }

  // Validate data types for record fields
  private validateRecordDataTypes(record: any, sectionName: string): boolean {
    try {
      switch (sectionName) {
        case 'products':
          return (
            typeof record.name === 'string' &&
            typeof record.price === 'number' &&
            !isNaN(record.price) &&
            typeof record.cost === 'number' &&
            !isNaN(record.cost) &&
            (record.quantity === undefined ||
              (typeof record.quantity === 'number' && !isNaN(record.quantity)))
          );
        case 'sales':
          return (
            typeof record.total === 'number' &&
            !isNaN(record.total) &&
            typeof record.payment_method === 'string'
          );
        case 'customers':
          return typeof record.name === 'string';
        case 'expenses':
          return (
            typeof record.amount === 'number' &&
            !isNaN(record.amount) &&
            typeof record.description === 'string'
          );
        case 'stockMovements':
          return (
            typeof record.product_id === 'string' &&
            typeof record.movement_type === 'string' &&
            typeof record.quantity === 'number' &&
            !isNaN(record.quantity)
          );
        case 'bulkPricing':
          return (
            typeof record.product_id === 'string' &&
            typeof record.min_quantity === 'number' &&
            !isNaN(record.min_quantity) &&
            typeof record.bulk_price === 'number' &&
            !isNaN(record.bulk_price)
          );
        default:
          return true; // For unknown types, assume valid
      }
    } catch (error) {
      console.error(`Error validating data types for ${sectionName}:`, error);
      return false;
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

  // Compare records by UUID - primary matching method
  private compareByUUID(record: any, existing: any): boolean {
    // Check if both records have valid UUIDs
    if (!record.id || !existing.id) {
      return false;
    }

    // Validate that both UUIDs are properly formatted
    if (!isValidUUID(record.id) || !isValidUUID(existing.id)) {
      return false;
    }

    // Perform exact string matching on UUIDs
    return record.id === existing.id;
  }

  // Compare records by name - fallback matching method
  private compareByName(
    record: any,
    existing: any,
    recordType: string
  ): boolean {
    // Record type mapping for different matching criteria
    const recordTypeMatchingMap: Record<
      string,
      (record: any, existing: any) => boolean
    > = {
      products: (record: any, existing: any) => {
        // Match by name or barcode (backward compatible with existing logic)
        return (
          (record.name && existing.name && record.name === existing.name) ||
          (record.barcode &&
            existing.barcode &&
            record.barcode === existing.barcode)
        );
      },
      customers: (record: any, existing: any) => {
        // Match by name or phone (backward compatible with existing logic)
        return (
          (record.name && existing.name && record.name === existing.name) ||
          (record.phone && existing.phone && record.phone === existing.phone)
        );
      },
      sales: (record: any, existing: any) => {
        // For sales, we typically don't match by name since they're unique transactions
        // But we can match by a combination of fields if needed
        return false;
      },
      expenses: (record: any, existing: any) => {
        // For expenses, we typically don't match by name since they're unique transactions
        return false;
      },
      stockMovements: (record: any, existing: any) => {
        // For stock movements, we typically don't match by name since they're unique transactions
        return false;
      },
      bulkPricing: (record: any, existing: any) => {
        // For bulk pricing, we typically don't match by name since they're unique configurations
        return false;
      },
      categories: (record: any, existing: any) => {
        // Match categories by name
        return record.name && existing.name && record.name === existing.name;
      },
      suppliers: (record: any, existing: any) => {
        // Match suppliers by name
        return record.name && existing.name && record.name === existing.name;
      },
      expenseCategories: (record: any, existing: any) => {
        // Match expense categories by name
        return record.name && existing.name && record.name === existing.name;
      },
      saleItems: (record: any, existing: any) => {
        // For sale items, we typically don't match by name since they're part of sales
        return false;
      },
    };

    // Get the matching function for the record type
    const matchingFunction = recordTypeMatchingMap[recordType];

    if (!matchingFunction) {
      // For unknown record types, fall back to basic name matching
      return record.name && existing.name && record.name === existing.name;
    }

    try {
      return matchingFunction(record, existing);
    } catch (error) {
      console.warn(`Error in name matching for ${recordType}:`, error);
      return false;
    }
  }

  // Universal conflict detection method - tries UUID matching first, then name matching
  private detectRecordConflict(
    record: any,
    existingRecords: any[],
    recordType: string
  ): DataConflict | null {
    try {
      // Validate input parameters
      if (!record || !Array.isArray(existingRecords) || !recordType) {
        return null;
      }

      // Try to find a matching existing record
      let matchedRecord: any = null;
      let matchedBy: 'uuid' | 'name' | 'other' = 'other';

      // First, try UUID-based matching (primary method)
      for (const existingRecord of existingRecords) {
        if (this.compareByUUID(record, existingRecord)) {
          matchedRecord = existingRecord;
          matchedBy = 'uuid';
          break;
        }
      }

      // If no UUID match found, try name-based matching (fallback method)
      if (!matchedRecord) {
        for (const existingRecord of existingRecords) {
          if (this.compareByName(record, existingRecord, recordType)) {
            matchedRecord = existingRecord;
            matchedBy = 'name';
            break;
          }
        }
      }

      // If a match was found, create a conflict
      if (matchedRecord) {
        // Determine the appropriate message based on matching criteria
        let message: string;
        if (matchedBy === 'uuid') {
          message = `${recordType} with UUID "${record.id}" already exists`;
        } else if (matchedBy === 'name') {
          // Create a more specific message based on record type
          switch (recordType) {
            case 'products':
              if (record.barcode && matchedRecord.barcode === record.barcode) {
                message = `Product with barcode "${record.barcode}" already exists`;
              } else {
                message = `Product "${record.name}" already exists`;
              }
              break;
            case 'customers':
              if (record.phone && matchedRecord.phone === record.phone) {
                message = `Customer with phone "${record.phone}" already exists`;
              } else {
                message = `Customer "${record.name}" already exists`;
              }
              break;
            default:
              message = `${recordType} "${
                record.name || record.id || 'Unknown'
              }" already exists`;
          }
        } else {
          message = `${recordType} already exists`;
        }

        return {
          type: 'duplicate',
          record,
          existingRecord: matchedRecord,
          message,
          index: 0, // This will be set by the caller
          recordType,
          matchedBy,
        };
      }

      // No conflict found
      return null;
    } catch (error) {
      console.warn(`Error in detectRecordConflict for ${recordType}:`, error);
      return null;
    }
  }

  // Detect conflicts with existing data
  private async detectConflicts(
    data: any,
    dataType: string
  ): Promise<DataConflict[]> {
    const conflicts: DataConflict[] = [];

    try {
      // Get existing data for comparison - all data types
      const existingProducts = await this.db.getProducts();
      const existingCustomers = await this.db.getCustomers();
      const existingCategories = await this.db.getCategories();

      // Get existing sales data (using paginated method with large limit to get all)
      const existingSales = await this.db.getSalesPaginated(1, 10000);

      // Get existing expenses data
      const existingExpenses = await this.db.getExpenses(10000);

      // Get existing stock movements data
      const existingStockMovements = await this.db.getStockMovements(
        {},
        1,
        10000
      );

      // Get existing bulk pricing data for all products
      const existingBulkPricing: any[] = [];
      for (const product of existingProducts) {
        const productBulkPricing = await this.db.getBulkPricingForProduct(
          product.id
        );
        existingBulkPricing.push(...productBulkPricing);
      }

      // Define data type mapping for processing
      const dataTypeMapping = [
        { key: 'products', existing: existingProducts },
        { key: 'customers', existing: existingCustomers },
        { key: 'sales', existing: existingSales },
        { key: 'expenses', existing: existingExpenses },
        { key: 'stockMovements', existing: existingStockMovements },
        { key: 'bulkPricing', existing: existingBulkPricing },
      ];

      // Process each data type using universal conflict detection
      for (const { key, existing } of dataTypeMapping) {
        if (data[key] && Array.isArray(data[key])) {
          data[key].forEach((record: any, index: number) => {
            try {
              // Validate record data before checking conflicts
              if (!this.validateRecordRequiredFields(record, key)) {
                conflicts.push({
                  type: 'validation_failed',
                  record: record,
                  message: `${key} at index ${index} has missing required fields`,
                  index,
                  recordType: key,
                  matchedBy: 'other',
                });
                return;
              }

              if (!this.validateRecordDataTypes(record, key)) {
                conflicts.push({
                  type: 'validation_failed',
                  record: record,
                  message: `${key} at index ${index} has invalid data types`,
                  index,
                  recordType: key,
                  matchedBy: 'other',
                });
                return;
              }

              // Use universal conflict detection method
              const conflict = this.detectRecordConflict(record, existing, key);
              if (conflict) {
                // Set the correct index for the conflict
                conflict.index = index;
                conflicts.push(conflict);
              }

              // Check for reference integrity (product references, category references, etc.)
              this.checkReferenceIntegrity(record, key, index, conflicts, {
                existingProducts,
                existingCustomers,
                existingCategories,
              });
            } catch (error) {
              conflicts.push({
                type: 'validation_failed',
                record: record,
                message: `${key} at index ${index} is corrupted: ${
                  error instanceof Error ? error.message : 'Unknown error'
                }`,
                index,
                recordType: key,
                matchedBy: 'other',
              });
            }
          });
        }
      }
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      conflicts.push({
        type: 'validation_failed',
        record: null,
        message: `Error during conflict detection: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        index: -1,
        recordType: 'unknown',
        matchedBy: 'other',
      });
    }

    return conflicts;
  }

  // Helper method to check reference integrity for different record types
  private checkReferenceIntegrity(
    record: any,
    recordType: string,
    index: number,
    conflicts: DataConflict[],
    existingData: {
      existingProducts: any[];
      existingCustomers: any[];
      existingCategories: any[];
    }
  ): void {
    const { existingProducts, existingCustomers, existingCategories } =
      existingData;

    try {
      switch (recordType) {
        case 'products':
          // Check category reference
          if (
            record.category &&
            !existingCategories.find((c) => c.name === record.category)
          ) {
            conflicts.push({
              type: 'reference_missing',
              record: record,
              field: 'category',
              message: `Category "${record.category}" not found`,
              index,
              recordType: recordType,
              matchedBy: 'other',
            });
          }
          break;

        case 'sales':
          // Check customer reference
          if (
            record.customer_id &&
            !existingCustomers.find((c) => c.id === record.customer_id)
          ) {
            conflicts.push({
              type: 'reference_missing',
              record: record,
              field: 'customer_id',
              message: `Customer with ID "${record.customer_id}" not found`,
              index,
              recordType: recordType,
              matchedBy: 'other',
            });
          }
          break;

        case 'stockMovements':
          // Check product reference
          if (
            record.product_id &&
            !existingProducts.find((p) => p.id === record.product_id)
          ) {
            conflicts.push({
              type: 'reference_missing',
              record: record,
              field: 'product_id',
              message: `Product with ID "${record.product_id}" not found`,
              index,
              recordType: recordType,
              matchedBy: 'other',
            });
          }
          break;

        case 'bulkPricing':
          // Check product reference
          if (
            record.product_id &&
            !existingProducts.find((p) => p.id === record.product_id)
          ) {
            conflicts.push({
              type: 'reference_missing',
              record: record,
              field: 'product_id',
              message: `Product with ID "${record.product_id}" not found`,
              index,
              recordType: recordType,
              matchedBy: 'other',
            });
          }
          break;

        // Other record types don't have reference integrity checks currently
        default:
          break;
      }
    } catch (error) {
      console.warn(
        `Error checking reference integrity for ${recordType}:`,
        error
      );
    }
  }

  // Sanitize and recover corrupted data where possible
  private sanitizeImportRecord(record: any, sectionName: string): any | null {
    try {
      if (!record || typeof record !== 'object') {
        return null;
      }

      const sanitized = { ...record };

      // Remove circular references and functions
      Object.keys(sanitized).forEach((key) => {
        const value = sanitized[key];
        if (typeof value === 'function') {
          delete sanitized[key];
        } else if (value && typeof value === 'object') {
          try {
            JSON.stringify(value);
          } catch (error) {
            console.warn(
              `Removing circular reference in ${sectionName}.${key}`
            );
            delete sanitized[key];
          }
        }
      });

      // Sanitize based on section type
      switch (sectionName) {
        case 'products':
          return this.sanitizeProductRecord(sanitized);
        case 'sales':
          return this.sanitizeSaleRecord(sanitized);
        case 'customers':
          return this.sanitizeCustomerRecord(sanitized);
        case 'expenses':
          return this.sanitizeExpenseRecord(sanitized);
        case 'stockMovements':
          return this.sanitizeStockMovementRecord(sanitized);
        case 'bulkPricing':
          return this.sanitizeBulkPricingRecord(sanitized);
        default:
          return sanitized;
      }
    } catch (error) {
      console.error(`Error sanitizing ${sectionName} record:`, error);
      return null;
    }
  }

  // Sanitize product records
  private sanitizeProductRecord(product: any): any | null {
    try {
      // Ensure required fields exist
      if (!product.name || typeof product.name !== 'string') {
        return null;
      }

      // Sanitize numeric fields
      if (product.price !== undefined) {
        const price = parseFloat(product.price);
        if (isNaN(price) || price <= 0) {
          return null;
        }
        product.price = price;
      }

      if (product.cost !== undefined) {
        const cost = parseFloat(product.cost);
        if (isNaN(cost) || cost <= 0) {
          return null;
        }
        product.cost = cost;
      }

      if (product.quantity !== undefined) {
        const quantity = parseInt(product.quantity);
        if (isNaN(quantity) || quantity < 0) {
          product.quantity = 0;
        } else {
          product.quantity = quantity;
        }
      }

      // Sanitize string fields
      product.name = product.name.toString().trim();
      if (product.barcode) {
        product.barcode = product.barcode.toString().trim();
      }

      return product;
    } catch (error) {
      console.error('Error sanitizing product record:', error);
      return null;
    }
  }

  // Sanitize sale records
  private sanitizeSaleRecord(sale: any): any | null {
    try {
      // Ensure required fields exist
      if (sale.total === undefined || sale.total === null) {
        return null;
      }

      const total = parseFloat(sale.total);
      if (isNaN(total) || total <= 0) {
        return null;
      }
      sale.total = total;

      if (!sale.payment_method || typeof sale.payment_method !== 'string') {
        return null;
      }

      sale.payment_method = sale.payment_method.toString().trim();

      return sale;
    } catch (error) {
      console.error('Error sanitizing sale record:', error);
      return null;
    }
  }

  // Sanitize customer records
  private sanitizeCustomerRecord(customer: any): any | null {
    try {
      if (!customer.name || typeof customer.name !== 'string') {
        return null;
      }

      customer.name = customer.name.toString().trim();

      if (customer.phone) {
        customer.phone = customer.phone.toString().trim();
      }

      if (customer.email) {
        customer.email = customer.email.toString().trim();
      }

      return customer;
    } catch (error) {
      console.error('Error sanitizing customer record:', error);
      return null;
    }
  }

  // Sanitize expense records
  private sanitizeExpenseRecord(expense: any): any | null {
    try {
      if (expense.amount === undefined || expense.amount === null) {
        return null;
      }

      const amount = parseFloat(expense.amount);
      if (isNaN(amount) || amount <= 0) {
        return null;
      }
      expense.amount = amount;

      if (!expense.description || typeof expense.description !== 'string') {
        return null;
      }

      expense.description = expense.description.toString().trim();

      return expense;
    } catch (error) {
      console.error('Error sanitizing expense record:', error);
      return null;
    }
  }

  // Sanitize stock movement records
  private sanitizeStockMovementRecord(movement: any): any | null {
    try {
      if (!movement.product_id || !movement.movement_type) {
        return null;
      }

      if (movement.quantity === undefined || movement.quantity === null) {
        return null;
      }

      const quantity = parseFloat(movement.quantity);
      if (isNaN(quantity)) {
        return null;
      }
      movement.quantity = quantity;

      movement.product_id = movement.product_id.toString().trim();
      movement.movement_type = movement.movement_type.toString().trim();

      return movement;
    } catch (error) {
      console.error('Error sanitizing stock movement record:', error);
      return null;
    }
  }

  // Sanitize bulk pricing records
  private sanitizeBulkPricingRecord(bulkPricing: any): any | null {
    try {
      if (!bulkPricing.product_id) {
        return null;
      }

      if (
        bulkPricing.min_quantity === undefined ||
        bulkPricing.bulk_price === undefined
      ) {
        return null;
      }

      const minQuantity = parseInt(bulkPricing.min_quantity);
      const bulkPrice = parseFloat(bulkPricing.bulk_price);

      if (
        isNaN(minQuantity) ||
        minQuantity <= 0 ||
        isNaN(bulkPrice) ||
        bulkPrice <= 0
      ) {
        return null;
      }

      bulkPricing.min_quantity = minQuantity;
      bulkPricing.bulk_price = bulkPrice;
      bulkPricing.product_id = bulkPricing.product_id.toString().trim();

      return bulkPricing;
    } catch (error) {
      console.error('Error sanitizing bulk pricing record:', error);
      return null;
    }
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

      // Validate that the file contains products data
      const dataTypeValidation = this.validateDataTypeAvailability(
        importData,
        'products'
      );
      if (!dataTypeValidation.isValid) {
        return {
          success: false,
          imported: 0,
          updated: 0,
          skipped: 0,
          errors: [
            {
              index: -1,
              record: null,
              message:
                dataTypeValidation.message || 'Products data not available',
              code: 'MISSING_DATA_TYPE',
            },
          ],
          conflicts: [],
          duration: Date.now() - startTime,
          dataType: 'products',
          availableDataTypes: dataTypeValidation.availableTypes,
          processedDataTypes: [],
          detailedCounts: dataTypeValidation.detailedCounts,
          validationMessage: dataTypeValidation.message,
        };
      }

      if (!importData.data || !importData.data.products) {
        throw new Error('No products data found in import file');
      }

      console.log('Products to import:', importData.data.products.length);

      const products = importData.data.products;
      // Only process products-related data: products, categories, suppliers, and bulk pricing
      const categories = importData.data.categories || [];
      const suppliers = importData.data.suppliers || [];
      const bulkPricing = importData.data.bulkPricing || [];

      this.updateProgress(
        'Validating data...',
        0,
        products.length + categories.length + suppliers.length
      );

      // Get existing data
      const existingProducts = await this.db.getProducts();
      const existingCategories = await this.db.getCategories();
      const existingSuppliers = await this.db.getSuppliers();

      // Import categories first if they exist in the file and don't exist in database
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

      // Import suppliers if they exist in the file and don't exist in database
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
                  recordType: 'products',
                  matchedBy: 'name',
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

      // Process bulk pricing data if available
      if (bulkPricing.length > 0) {
        this.updateProgress('Importing bulk pricing...', 0, bulkPricing.length);

        for (const [index, item] of bulkPricing.entries()) {
          try {
            // Find product by UUID first, then by name
            let product = null;
            if (item.productId && isValidUUID(item.productId)) {
              const allProducts = await this.db.getProducts();
              product = allProducts.find((p) => p.id === item.productId);
            }
            if (!product && item.productName) {
              const allProducts = await this.db.getProducts();
              product = allProducts.find((p) => p.name === item.productName);
            }

            if (product) {
              // Clear existing bulk pricing for this product
              const existingTiers = await this.db.getBulkPricingForProduct(
                product.id
              );
              for (const tier of existingTiers) {
                await this.db.deleteBulkPricing(tier.id);
              }

              // Add new bulk pricing tiers
              for (const tier of item.bulkTiers || []) {
                try {
                  await this.db.addBulkPricing({
                    product_id: product.id,
                    min_quantity: tier.min_quantity,
                    bulk_price: tier.bulk_price,
                  });
                } catch (error) {
                  console.error('Bulk pricing tier import error:', error);
                }
              }
            }
          } catch (error) {
            console.error('Bulk pricing import error:', error);
          }

          this.updateProgress(
            'Importing bulk pricing...',
            index + 1,
            bulkPricing.length
          );
        }
      }

      const duration = Date.now() - startTime;

      // Calculate actual processed counts for each data type
      const actualProcessedCounts: Record<
        string,
        { imported: number; updated: number; skipped: number }
      > = {};

      // For products import, we process products, categories, suppliers, and bulk pricing
      const processedTypes = [
        'products',
        'categories',
        'suppliers',
        'bulkPricing',
      ].filter(
        (type) =>
          importData.data[type] &&
          Array.isArray(importData.data[type]) &&
          importData.data[type].length > 0
      );

      // Set counts for products (main data type)
      actualProcessedCounts.products = { imported, updated, skipped };

      // Set counts for related data types (categories and suppliers are typically all imported)
      if (importData.data.categories?.length > 0) {
        actualProcessedCounts.categories = {
          imported: categories.length,
          updated: 0,
          skipped: 0,
        };
      }
      if (importData.data.suppliers?.length > 0) {
        actualProcessedCounts.suppliers = {
          imported: suppliers.length,
          updated: 0,
          skipped: 0,
        };
      }
      if (importData.data.bulkPricing?.length > 0) {
        actualProcessedCounts.bulkPricing = {
          imported: bulkPricing.length,
          updated: 0,
          skipped: 0,
        };
      }

      return {
        success: true,
        imported,
        updated,
        skipped,
        errors,
        conflicts,
        duration,
        dataType: 'products',
        availableDataTypes: dataTypeValidation.availableTypes,
        processedDataTypes: processedTypes,
        detailedCounts: dataTypeValidation.detailedCounts,
        actualProcessedCounts,
        validationMessage: `Successfully processed products data. ${imported} products imported, ${updated} updated, ${skipped} skipped.`,
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
        dataType: 'products',
        availableDataTypes: [],
        processedDataTypes: [],
        detailedCounts: {},
        actualProcessedCounts: {},
        validationMessage: `Import failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
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

      // Validate that the file contains customers data
      const dataTypeValidation = this.validateDataTypeAvailability(
        importData,
        'customers'
      );
      if (!dataTypeValidation.isValid) {
        return {
          success: false,
          imported: 0,
          updated: 0,
          skipped: 0,
          errors: [
            {
              index: -1,
              record: null,
              message:
                dataTypeValidation.message || 'Customers data not available',
              code: 'MISSING_DATA_TYPE',
            },
          ],
          conflicts: [],
          duration: Date.now() - startTime,
          dataType: 'customers',
          availableDataTypes: dataTypeValidation.availableTypes,
          processedDataTypes: [],
          detailedCounts: dataTypeValidation.detailedCounts,
          validationMessage: dataTypeValidation.message,
        };
      }

      if (!importData.data || !importData.data.customers) {
        throw new Error('No customers data found in import file');
      }

      const customers = importData.data.customers;
      // Only process customer data - no related data types for customers
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
                  recordType: 'customers',
                  matchedBy: 'name',
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
        dataType: 'customers',
        availableDataTypes: dataTypeValidation.availableTypes,
        processedDataTypes: ['customers'],
        detailedCounts: dataTypeValidation.detailedCounts,
        actualProcessedCounts: {
          customers: { imported, updated, skipped },
        },
        validationMessage: `Successfully processed customers data. ${imported} customers imported, ${updated} updated, ${skipped} skipped.`,
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
        dataType: 'customers',
        availableDataTypes: [],
        processedDataTypes: [],
        detailedCounts: {},
        actualProcessedCounts: {},
        validationMessage: `Import failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
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
    let conflicts: DataConflict[] = [];

    try {
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const importData = JSON.parse(fileContent);

      // Validate that the file contains stock movements data
      const dataTypeValidation = this.validateDataTypeAvailability(
        importData,
        'stockMovements'
      );
      if (!dataTypeValidation.isValid) {
        return {
          success: false,
          imported: 0,
          updated: 0,
          skipped: 0,
          errors: [
            {
              index: -1,
              record: null,
              message:
                dataTypeValidation.message ||
                'Stock movements data not available',
              code: 'MISSING_DATA_TYPE',
            },
          ],
          conflicts: [],
          duration: Date.now() - startTime,
          dataType: 'stockMovements',
          availableDataTypes: dataTypeValidation.availableTypes,
          processedDataTypes: [],
          detailedCounts: dataTypeValidation.detailedCounts,
          validationMessage: dataTypeValidation.message,
        };
      }

      if (!importData.data || !importData.data.stockMovements) {
        throw new Error('No stock movements data found in import file');
      }

      // Use enhanced conflict detection for all data types in the import file
      conflicts = await this.detectConflicts(importData.data, 'stockMovements');

      // If conflicts exist and user wants to be asked, return conflicts for resolution
      if (conflicts.length > 0 && options.conflictResolution === 'ask') {
        return {
          success: false,
          imported: 0,
          updated: 0,
          skipped: 0,
          errors: [],
          conflicts,
          duration: Date.now() - startTime,
          dataType: 'stockMovements',
          availableDataTypes: dataTypeValidation.availableTypes,
          processedDataTypes: [],
          detailedCounts: dataTypeValidation.detailedCounts,
          validationMessage:
            'Conflicts detected. Please resolve them to continue.',
        };
      }

      const movements = importData.data.stockMovements;
      // Only process stock movements data - no related data types
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

            // Handle conflicts using universal conflict resolution
            const recordConflict = conflicts.find((c) => c.record === movement);

            if (recordConflict) {
              if (options.conflictResolution === 'skip') {
                skipped++;
                continue;
              } else if (options.conflictResolution === 'update') {
                // For stock movements, we typically don't update existing movements, so skip
                skipped++;
                continue;
              }
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
        dataType: 'stockMovements',
        availableDataTypes: dataTypeValidation.availableTypes,
        processedDataTypes: ['stockMovements'],
        detailedCounts: dataTypeValidation.detailedCounts,
        actualProcessedCounts: {
          stockMovements: { imported, updated, skipped },
        },
        validationMessage: `Successfully processed stock movements data. ${imported} movements imported, ${updated} updated, ${skipped} skipped.`,
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
        dataType: 'stockMovements',
        availableDataTypes: [],
        processedDataTypes: [],
        detailedCounts: {},
        actualProcessedCounts: {},
        validationMessage: `Import failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
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
    let conflicts: DataConflict[] = [];

    try {
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const importData = JSON.parse(fileContent);

      // Validate that the file contains bulk pricing data
      const dataTypeValidation = this.validateDataTypeAvailability(
        importData,
        'bulkPricing'
      );
      if (!dataTypeValidation.isValid) {
        return {
          success: false,
          imported: 0,
          updated: 0,
          skipped: 0,
          errors: [
            {
              index: -1,
              record: null,
              message:
                dataTypeValidation.message || 'Bulk pricing data not available',
              code: 'MISSING_DATA_TYPE',
            },
          ],
          conflicts: [],
          duration: Date.now() - startTime,
          dataType: 'bulkPricing',
          availableDataTypes: dataTypeValidation.availableTypes,
          processedDataTypes: [],
          detailedCounts: dataTypeValidation.detailedCounts,
          validationMessage: dataTypeValidation.message,
        };
      }

      if (!importData.data || !importData.data.bulkPricing) {
        throw new Error('No bulk pricing data found in import file');
      }

      // Use enhanced conflict detection for all data types in the import file
      conflicts = await this.detectConflicts(importData.data, 'bulkPricing');

      // If conflicts exist and user wants to be asked, return conflicts for resolution
      if (conflicts.length > 0 && options.conflictResolution === 'ask') {
        return {
          success: false,
          imported: 0,
          updated: 0,
          skipped: 0,
          errors: [],
          conflicts,
          duration: Date.now() - startTime,
          dataType: 'bulkPricing',
          availableDataTypes: dataTypeValidation.availableTypes,
          processedDataTypes: [],
          detailedCounts: dataTypeValidation.detailedCounts,
          validationMessage:
            'Conflicts detected. Please resolve them to continue.',
        };
      }

      const bulkPricingData = importData.data.bulkPricing;
      // Only process bulk pricing data - no related data types
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

          // Handle conflicts using universal conflict resolution
          const recordConflict = conflicts.find((c) => c.record === item);

          if (recordConflict) {
            if (options.conflictResolution === 'skip') {
              skipped++;
              continue;
            } else if (options.conflictResolution === 'update') {
              // For bulk pricing, we can update by clearing existing and adding new
              const existingTiers = await this.db.getBulkPricingForProduct(
                product.id
              );
              for (const tier of existingTiers) {
                await this.db.deleteBulkPricing(tier.id);
              }
            }
          }

          // Clear existing bulk pricing for this product (if not already done in conflict resolution)
          if (!recordConflict || options.conflictResolution !== 'update') {
            const existingTiers = await this.db.getBulkPricingForProduct(
              product.id
            );
            for (const tier of existingTiers) {
              await this.db.deleteBulkPricing(tier.id);
            }
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
            if (recordConflict && options.conflictResolution === 'update') {
              updated++;
            } else {
              imported++;
            }
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
        dataType: 'bulkPricing',
        availableDataTypes: dataTypeValidation.availableTypes,
        processedDataTypes: ['bulkPricing'],
        detailedCounts: dataTypeValidation.detailedCounts,
        actualProcessedCounts: {
          bulkPricing: { imported, updated, skipped },
        },
        validationMessage: `Successfully processed bulk pricing data. ${imported} bulk pricing rules imported, ${updated} updated, ${skipped} skipped.`,
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
        dataType: 'bulkPricing',
        availableDataTypes: [],
        processedDataTypes: [],
        detailedCounts: {},
        actualProcessedCounts: {},
        validationMessage: `Import failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
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
    let conflicts: DataConflict[] = [];

    try {
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const importData = JSON.parse(fileContent);

      // Validate that the file contains sales data
      const dataTypeValidation = this.validateDataTypeAvailability(
        importData,
        'sales'
      );
      if (!dataTypeValidation.isValid) {
        return {
          success: false,
          imported: 0,
          updated: 0,
          skipped: 0,
          errors: [
            {
              index: -1,
              record: null,
              message: dataTypeValidation.message || 'Sales data not available',
              code: 'MISSING_DATA_TYPE',
            },
          ],
          conflicts: [],
          duration: Date.now() - startTime,
          dataType: 'sales',
          availableDataTypes: dataTypeValidation.availableTypes,
          processedDataTypes: [],
          detailedCounts: dataTypeValidation.detailedCounts,
          validationMessage: dataTypeValidation.message,
        };
      }

      if (!importData.data || !importData.data.sales) {
        throw new Error('No sales data found in import file');
      }

      // Use enhanced conflict detection for all data types in the import file
      conflicts = await this.detectConflicts(importData.data, 'sales');

      // If conflicts exist and user wants to be asked, return conflicts for resolution
      if (conflicts.length > 0 && options.conflictResolution === 'ask') {
        return {
          success: false,
          imported: 0,
          updated: 0,
          skipped: 0,
          errors: [],
          conflicts,
          duration: Date.now() - startTime,
          dataType: 'sales',
          availableDataTypes: dataTypeValidation.availableTypes,
          processedDataTypes: [],
          detailedCounts: dataTypeValidation.detailedCounts,
          validationMessage:
            'Conflicts detected. Please resolve them to continue.',
        };
      }

      const sales = importData.data.sales;
      // Only process sales data and their associated sale items

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

            // Handle conflicts using universal conflict resolution
            const recordConflict = conflicts.find((c) => c.record === sale);

            if (recordConflict) {
              if (options.conflictResolution === 'skip') {
                skipped++;
                continue;
              } else if (options.conflictResolution === 'update') {
                // For sales, we typically don't update existing sales, so skip
                skipped++;
                continue;
              }
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
        dataType: 'sales',
        availableDataTypes: dataTypeValidation.availableTypes,
        processedDataTypes: ['sales'].filter(
          (type) =>
            importData.data[type] &&
            Array.isArray(importData.data[type]) &&
            importData.data[type].length > 0
        ),
        detailedCounts: dataTypeValidation.detailedCounts,
        actualProcessedCounts: {
          sales: { imported, updated, skipped },
        },
        validationMessage: `Successfully processed sales data. ${imported} sales imported, ${updated} updated, ${skipped} skipped.`,
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
        dataType: 'sales',
        availableDataTypes: [],
        processedDataTypes: [],
        detailedCounts: {},
        actualProcessedCounts: {},
        validationMessage: `Import failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
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
    let conflicts: DataConflict[] = [];

    try {
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const importData = JSON.parse(fileContent);

      // Validate that the file contains expenses data
      const dataTypeValidation = this.validateDataTypeAvailability(
        importData,
        'expenses'
      );
      if (!dataTypeValidation.isValid) {
        return {
          success: false,
          imported: 0,
          updated: 0,
          skipped: 0,
          errors: [
            {
              index: -1,
              record: null,
              message:
                dataTypeValidation.message || 'Expenses data not available',
              code: 'MISSING_DATA_TYPE',
            },
          ],
          conflicts: [],
          duration: Date.now() - startTime,
          dataType: 'expenses',
          availableDataTypes: dataTypeValidation.availableTypes,
          processedDataTypes: [],
          detailedCounts: dataTypeValidation.detailedCounts,
          validationMessage: dataTypeValidation.message,
        };
      }

      if (!importData.data || !importData.data.expenses) {
        throw new Error('No expenses data found in import file');
      }

      // Use enhanced conflict detection for all data types in the import file
      conflicts = await this.detectConflicts(importData.data, 'expenses');

      // If conflicts exist and user wants to be asked, return conflicts for resolution
      if (conflicts.length > 0 && options.conflictResolution === 'ask') {
        return {
          success: false,
          imported: 0,
          updated: 0,
          skipped: 0,
          errors: [],
          conflicts,
          duration: Date.now() - startTime,
          dataType: 'expenses',
          availableDataTypes: dataTypeValidation.availableTypes,
          processedDataTypes: [],
          detailedCounts: dataTypeValidation.detailedCounts,
          validationMessage:
            'Conflicts detected. Please resolve them to continue.',
        };
      }

      const expenses = importData.data.expenses;
      // Only process expenses-related data: expenses and expense categories
      const expenseCategories = importData.data.expenseCategories || [];

      this.updateProgress(
        'Importing expense categories...',
        0,
        expenses.length + expenseCategories.length
      );

      // Import expense categories first if they exist in the file
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

            // Handle conflicts using universal conflict resolution
            const recordConflict = conflicts.find((c) => c.record === expense);

            if (recordConflict) {
              if (options.conflictResolution === 'skip') {
                skipped++;
                continue;
              } else if (options.conflictResolution === 'update') {
                // For expenses, we typically don't update existing expenses, so skip
                skipped++;
                continue;
              }
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

      const processedTypes = ['expenses', 'expenseCategories'].filter(
        (type) =>
          importData.data[type] &&
          Array.isArray(importData.data[type]) &&
          importData.data[type].length > 0
      );

      // Calculate actual processed counts for each data type
      const actualProcessedCounts: Record<
        string,
        { imported: number; updated: number; skipped: number }
      > = {};
      actualProcessedCounts.expenses = { imported, updated, skipped };

      if (importData.data.expenseCategories?.length > 0) {
        actualProcessedCounts.expenseCategories = {
          imported: expenseCategories.length,
          updated: 0,
          skipped: 0,
        };
      }

      return {
        success: true,
        imported,
        updated,
        skipped,
        errors,
        conflicts,
        duration: Date.now() - startTime,
        dataType: 'expenses',
        availableDataTypes: dataTypeValidation.availableTypes,
        processedDataTypes: processedTypes,
        detailedCounts: dataTypeValidation.detailedCounts,
        actualProcessedCounts,
        validationMessage: `Successfully processed expenses data. ${imported} expenses imported, ${updated} updated, ${skipped} skipped.`,
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
        dataType: 'expenses',
        availableDataTypes: [],
        processedDataTypes: [],
        detailedCounts: {},
        actualProcessedCounts: {},
        validationMessage: `Import failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  // Import all data
  async importAllData(
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

      const processedDataTypes = Object.keys(data).filter(
        (key) => Array.isArray(data[key]) && data[key].length > 0
      );

      // Calculate detailed counts for all data types
      const detailedCounts: Record<string, number> = {};
      Object.keys(data).forEach((key) => {
        if (Array.isArray(data[key])) {
          detailedCounts[key] = data[key].length;
        }
      });

      return {
        success: true,
        imported: totalImported,
        updated: totalUpdated,
        skipped: totalSkipped,
        errors: allErrors,
        conflicts: allConflicts,
        duration: Date.now() - startTime,
        dataType: 'all',
        availableDataTypes: processedDataTypes,
        processedDataTypes: processedDataTypes,
        detailedCounts,
        validationMessage: `Successfully processed complete backup. ${totalImported} records imported, ${totalUpdated} updated, ${totalSkipped} skipped across ${processedDataTypes.length} data types.`,
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
        dataType: 'all',
        availableDataTypes: [],
        processedDataTypes: [],
        detailedCounts: {},
        validationMessage: `Complete backup import failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
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

  // Generate detailed import summary for UI display
  generateImportSummary(result: ImportResult): string {
    if (!result.success) {
      return (
        result.validationMessage ||
        `Import failed: ${result.errors[0]?.message || 'Unknown error'}`
      );
    }

    let summary = result.validationMessage || '';

    if (
      result.detailedCounts &&
      Object.keys(result.detailedCounts).length > 0
    ) {
      summary += '\n\nFile contents:';
      Object.entries(result.detailedCounts).forEach(([type, count]) => {
        summary += `\n- ${type}: ${count} records`;
      });
    }

    if (
      result.actualProcessedCounts &&
      Object.keys(result.actualProcessedCounts).length > 0
    ) {
      summary += '\n\nProcessed:';
      Object.entries(result.actualProcessedCounts).forEach(([type, counts]) => {
        summary += `\n- ${type}: ${counts.imported} imported, ${counts.updated} updated, ${counts.skipped} skipped`;
      });
    }

    if (result.errors.length > 0) {
      summary += `\n\nWarnings: ${result.errors.length} issues encountered during import`;
    }

    return summary;
  }

  // Validate import file and provide detailed feedback about available data types
  async validateImportFileWithFeedback(
    fileUri: string,
    selectedDataType: string
  ): Promise<{
    isValid: boolean;
    message: string;
    availableTypes: string[];
    detailedCounts: Record<string, number>;
    canProceed: boolean;
  }> {
    try {
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const importData = JSON.parse(fileContent);

      const validation = this.validateDataTypeAvailability(
        importData,
        selectedDataType
      );

      let message = '';
      if (validation.isValid) {
        message = `✓ Import file contains ${selectedDataType} data and is ready for import.`;
        if (validation.detailedCounts) {
          const availableTypesWithCounts = Object.entries(
            validation.detailedCounts
          )
            .filter(([_, count]) => count > 0)
            .map(([type, count]) => `${type} (${count} records)`)
            .join(', ');
          message += `\n\nAvailable data: ${availableTypesWithCounts}`;
        }
      } else {
        message = validation.message || 'Import file validation failed';
      }

      return {
        isValid: validation.isValid,
        message,
        availableTypes: validation.availableTypes,
        detailedCounts: validation.detailedCounts || {},
        canProceed: validation.isValid,
      };
    } catch (error) {
      return {
        isValid: false,
        message: `Failed to read import file: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        availableTypes: [],
        detailedCounts: {},
        canProceed: false,
      };
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
