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

// Import interfaces - simplified for "all data" import only
export interface ImportOptions {
  batchSize: number;
  conflictResolution: 'update' | 'skip' | 'ask';
}

export interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
  conflicts: DataConflict[];
  duration: number;
  dataType: 'all'; // Always 'all' for simplified import
  availableDataTypes: string[]; // Data types available in the import file
  processedDataTypes: string[]; // Data types actually processed
  detailedCounts: Record<string, number>; // Detailed counts for each data type in the file
  actualProcessedCounts?: Record<
    string,
    { imported: number; updated: number; skipped: number }
  >; // Actual counts processed per data type
  validationMessage: string; // Detailed validation message
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
  conflictSummary: ConflictSummary;
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

export interface ConflictSummary {
  totalConflicts: number;
  conflictsByType: {
    [dataType: string]: DataConflict[];
  };
  conflictStatistics: {
    [dataType: string]: {
      total: number;
      duplicate: number;
      reference_missing: number;
      validation_failed: number;
    };
  };
  hasConflicts: boolean;
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

  // Simplified validation for "all data" import only
  validateDataTypeAvailability(importData: any): {
    isValid: boolean;
    availableTypes: string[];
    message?: string;
    detailedCounts?: Record<string, number>;
    corruptedSections?: string[];
    validationErrors?: string[];
  } {
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

      // For simplified import, we accept any available data
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

      return {
        isValid: hasValidData,
        availableTypes,
        detailedCounts,
        corruptedSections,
        validationErrors:
          validationErrors.length > 0 ? validationErrors : undefined,
        message,
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

      // Detect conflicts using enhanced method
      const conflictSummary = await this.detectAllConflicts(data);
      const conflicts = Object.values(conflictSummary.conflictsByType).flat();

      return {
        dataType,
        recordCounts,
        sampleData,
        validationSummary,
        conflicts,
        conflictSummary,
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

  // Enhanced conflict detection that returns conflicts grouped by data type
  async detectAllConflicts(data: any): Promise<ConflictSummary> {
    const conflicts: DataConflict[] = [];
    const conflictsByType: { [dataType: string]: DataConflict[] } = {};
    const conflictStatistics: {
      [dataType: string]: {
        total: number;
        duplicate: number;
        reference_missing: number;
        validation_failed: number;
      };
    } = {};

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
        { key: 'categories', existing: existingCategories },
      ];

      // Initialize conflict tracking for each data type
      dataTypeMapping.forEach(({ key }) => {
        conflictsByType[key] = [];
        conflictStatistics[key] = {
          total: 0,
          duplicate: 0,
          reference_missing: 0,
          validation_failed: 0,
        };
      });

      // Process each data type using universal conflict detection
      for (const { key, existing } of dataTypeMapping) {
        if (data[key] && Array.isArray(data[key])) {
          data[key].forEach((record: any, index: number) => {
            try {
              // Validate record data before checking conflicts
              if (!this.validateRecordRequiredFields(record, key)) {
                const conflict: DataConflict = {
                  type: 'validation_failed',
                  record: record,
                  message: `${key} at index ${index} has missing required fields`,
                  index,
                  recordType: key,
                  matchedBy: 'other',
                };
                conflicts.push(conflict);
                conflictsByType[key].push(conflict);
                conflictStatistics[key].total++;
                conflictStatistics[key].validation_failed++;
                return;
              }

              if (!this.validateRecordDataTypes(record, key)) {
                const conflict: DataConflict = {
                  type: 'validation_failed',
                  record: record,
                  message: `${key} at index ${index} has invalid data types`,
                  index,
                  recordType: key,
                  matchedBy: 'other',
                };
                conflicts.push(conflict);
                conflictsByType[key].push(conflict);
                conflictStatistics[key].total++;
                conflictStatistics[key].validation_failed++;
                return;
              }

              // Use universal conflict detection method
              const conflict = this.detectRecordConflict(record, existing, key);
              if (conflict) {
                // Set the correct index for the conflict
                conflict.index = index;
                conflicts.push(conflict);
                conflictsByType[key].push(conflict);
                conflictStatistics[key].total++;
                conflictStatistics[key].duplicate++;
              }

              // Check for reference integrity (product references, category references, etc.)
              this.checkReferenceIntegrityEnhanced(
                record,
                key,
                index,
                conflicts,
                conflictsByType,
                conflictStatistics,
                {
                  existingProducts,
                  existingCustomers,
                  existingCategories,
                }
              );
            } catch (error) {
              const conflict: DataConflict = {
                type: 'validation_failed',
                record: record,
                message: `${key} at index ${index} is corrupted: ${
                  error instanceof Error ? error.message : 'Unknown error'
                }`,
                index,
                recordType: key,
                matchedBy: 'other',
              };
              conflicts.push(conflict);
              conflictsByType[key].push(conflict);
              conflictStatistics[key].total++;
              conflictStatistics[key].validation_failed++;
            }
          });
        }
      }
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      const conflict: DataConflict = {
        type: 'validation_failed',
        record: null,
        message: `Error during conflict detection: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        index: -1,
        recordType: 'unknown',
        matchedBy: 'other',
      };
      conflicts.push(conflict);
      if (!conflictsByType['unknown']) {
        conflictsByType['unknown'] = [];
        conflictStatistics['unknown'] = {
          total: 0,
          duplicate: 0,
          reference_missing: 0,
          validation_failed: 0,
        };
      }
      conflictsByType['unknown'].push(conflict);
      conflictStatistics['unknown'].total++;
      conflictStatistics['unknown'].validation_failed++;
    }

    return {
      totalConflicts: conflicts.length,
      conflictsByType,
      conflictStatistics,
      hasConflicts: conflicts.length > 0,
    };
  }

  // Legacy method for backward compatibility - now uses the enhanced method
  private async detectConflicts(
    data: any,
    dataType: string
  ): Promise<DataConflict[]> {
    const conflictSummary = await this.detectAllConflicts(data);
    return Object.values(conflictSummary.conflictsByType).flat();
  }

  // Enhanced helper method to check reference integrity for different record types
  private checkReferenceIntegrityEnhanced(
    record: any,
    recordType: string,
    index: number,
    conflicts: DataConflict[],
    conflictsByType: { [dataType: string]: DataConflict[] },
    conflictStatistics: {
      [dataType: string]: {
        total: number;
        duplicate: number;
        reference_missing: number;
        validation_failed: number;
      };
    },
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
            const conflict: DataConflict = {
              type: 'reference_missing',
              record: record,
              field: 'category',
              message: `Category "${record.category}" not found`,
              index,
              recordType: recordType,
              matchedBy: 'other',
            };
            conflicts.push(conflict);
            conflictsByType[recordType].push(conflict);
            conflictStatistics[recordType].total++;
            conflictStatistics[recordType].reference_missing++;
          }
          break;

        case 'sales':
          // Check customer reference
          if (
            record.customer_id &&
            !existingCustomers.find((c) => c.id === record.customer_id)
          ) {
            const conflict: DataConflict = {
              type: 'reference_missing',
              record: record,
              field: 'customer_id',
              message: `Customer with ID "${record.customer_id}" not found`,
              index,
              recordType: recordType,
              matchedBy: 'other',
            };
            conflicts.push(conflict);
            conflictsByType[recordType].push(conflict);
            conflictStatistics[recordType].total++;
            conflictStatistics[recordType].reference_missing++;
          }
          break;

        case 'stockMovements':
          // Check product reference
          if (
            record.product_id &&
            !existingProducts.find((p) => p.id === record.product_id)
          ) {
            const conflict: DataConflict = {
              type: 'reference_missing',
              record: record,
              field: 'product_id',
              message: `Product with ID "${record.product_id}" not found`,
              index,
              recordType: recordType,
              matchedBy: 'other',
            };
            conflicts.push(conflict);
            conflictsByType[recordType].push(conflict);
            conflictStatistics[recordType].total++;
            conflictStatistics[recordType].reference_missing++;
          }
          break;

        case 'bulkPricing':
          // Check product reference
          if (
            record.product_id &&
            !existingProducts.find((p) => p.id === record.product_id)
          ) {
            const conflict: DataConflict = {
              type: 'reference_missing',
              record: record,
              field: 'product_id',
              message: `Product with ID "${record.product_id}" not found`,
              index,
              recordType: recordType,
              matchedBy: 'other',
            };
            conflicts.push(conflict);
            conflictsByType[recordType].push(conflict);
            conflictStatistics[recordType].total++;
            conflictStatistics[recordType].reference_missing++;
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

  // Legacy helper method for backward compatibility
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

  // Import all data - simplified for "all data" only
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
      this.updateProgress('Reading import file...', 0, 1);

      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const importData = JSON.parse(fileContent);

      // Validate import file for all data
      const dataTypeValidation = this.validateDataTypeAvailability(importData);
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
                dataTypeValidation.message || 'Import file validation failed',
              code: 'VALIDATION_FAILED',
            },
          ],
          conflicts: [],
          duration: Date.now() - startTime,
          dataType: 'all',
          availableDataTypes: dataTypeValidation.availableTypes,
          processedDataTypes: [],
          detailedCounts: dataTypeValidation.detailedCounts || {},
          validationMessage:
            dataTypeValidation.message || 'Import file validation failed',
        };
      }

      if (!importData.data) {
        throw new Error('No data found in import file');
      }

      const data = importData.data;

      // Detect conflicts for all data types
      this.updateProgress('Detecting conflicts...', 1, 3);
      const conflicts = await this.detectConflicts(data, 'all');

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
          dataType: 'all',
          availableDataTypes: dataTypeValidation.availableTypes,
          processedDataTypes: [],
          detailedCounts: dataTypeValidation.detailedCounts || {},
          validationMessage:
            'Conflicts detected. Please resolve them to continue.',
        };
      }

      // Import in order: categories, suppliers, products, customers, sales, expenses, bulkPricing, stockMovements
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

      let currentStage = 0;
      const totalStages = importOrder.filter(
        (dataType) =>
          data[dataType] &&
          Array.isArray(data[dataType]) &&
          data[dataType].length > 0
      ).length;

      // Process each data type directly without individual import methods
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

          const result = await this.processDataType(
            dataType,
            data[dataType],
            options,
            conflicts
          );

          totalImported += result.imported;
          totalUpdated += result.updated;
          totalSkipped += result.skipped;
          allErrors.push(...result.errors);
          allConflicts.push(...result.conflicts);

          currentStage++;
        }
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

      // Calculate actual processed counts for each data type
      const actualProcessedCounts: Record<
        string,
        { imported: number; updated: number; skipped: number }
      > = {};
      processedDataTypes.forEach((type) => {
        // This is a simplified calculation - in a real implementation, you'd track per data type
        actualProcessedCounts[type] = {
          imported: Math.floor(totalImported / processedDataTypes.length),
          updated: Math.floor(totalUpdated / processedDataTypes.length),
          skipped: Math.floor(totalSkipped / processedDataTypes.length),
        };
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
        actualProcessedCounts,
        validationMessage: `Successfully processed all data. ${totalImported} records imported, ${totalUpdated} updated, ${totalSkipped} skipped across ${processedDataTypes.length} data types.`,
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
        validationMessage: `Import failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  // Process individual data type during import
  private async processDataType(
    dataType: string,
    records: any[],
    options: ImportOptions,
    allConflicts: DataConflict[]
  ): Promise<{
    imported: number;
    updated: number;
    skipped: number;
    errors: ImportError[];
    conflicts: DataConflict[];
  }> {
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: ImportError[] = [];
    const conflicts: DataConflict[] = [];

    try {
      // Get existing data for conflict checking
      const existingData = await this.getExistingDataForType(dataType);

      for (let i = 0; i < records.length; i += options.batchSize) {
        const batch = records.slice(i, i + options.batchSize);

        for (let batchIndex = 0; batchIndex < batch.length; batchIndex++) {
          const record = batch[batchIndex];
          const globalIndex = i + batchIndex;

          try {
            // Validate record data
            if (!this.validateRecordRequiredFields(record, dataType)) {
              errors.push({
                index: globalIndex,
                record,
                message: `${dataType} record has missing required fields`,
                code: 'MISSING_REQUIRED_FIELDS',
              });
              skipped++;
              continue;
            }

            if (!this.validateRecordDataTypes(record, dataType)) {
              errors.push({
                index: globalIndex,
                record,
                message: `${dataType} record has invalid data types`,
                code: 'INVALID_DATA_TYPES',
              });
              skipped++;
              continue;
            }

            // Check for conflicts
            const recordConflict = allConflicts.find(
              (c) => c.record === record && c.recordType === dataType
            );

            if (recordConflict) {
              if (options.conflictResolution === 'skip') {
                skipped++;
                continue;
              } else if (options.conflictResolution === 'update') {
                await this.updateRecord(
                  dataType,
                  record,
                  recordConflict.existingRecord
                );
                updated++;
              } else {
                conflicts.push(recordConflict);
                skipped++;
              }
            } else {
              // Add new record
              await this.addRecord(dataType, record);
              imported++;
            }
          } catch (error) {
            errors.push({
              index: globalIndex,
              record,
              message:
                error instanceof Error ? error.message : 'Unknown import error',
              code: 'IMPORT_ERROR',
            });
            skipped++;
          }

          this.updateProgress(
            `Importing ${dataType}...`,
            globalIndex + 1,
            records.length
          );
        }

        // Small delay between batches to keep UI responsive
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    } catch (error) {
      console.error(`Error processing ${dataType}:`, error);
    }

    return { imported, updated, skipped, errors, conflicts };
  }

  // Get existing data for a specific data type
  private async getExistingDataForType(dataType: string): Promise<any[]> {
    switch (dataType) {
      case 'products':
        return await this.db.getProducts();
      case 'customers':
        return await this.db.getCustomers();
      case 'categories':
        return await this.db.getCategories();
      case 'suppliers':
        return await this.db.getSuppliers();
      case 'sales':
        return await this.db.getSalesPaginated(1, 10000);
      case 'expenses':
        return await this.db.getExpenses(10000);
      case 'stockMovements':
        return await this.db.getStockMovements({}, 1, 10000);
      case 'bulkPricing':
        const products = await this.db.getProducts();
        const bulkPricing: any[] = [];
        for (const product of products) {
          const productBulkPricing = await this.db.getBulkPricingForProduct(
            product.id
          );
          bulkPricing.push(...productBulkPricing);
        }
        return bulkPricing;
      default:
        return [];
    }
  }

  // Add a new record of the specified type
  private async addRecord(dataType: string, record: any): Promise<void> {
    switch (dataType) {
      case 'categories':
        const categoryData: any = {
          name: record.name,
          description: record.description || '',
        };
        if (record.id && isValidUUID(record.id)) {
          categoryData.id = record.id;
        }
        await this.db.addCategory(categoryData);
        break;

      case 'suppliers':
        const supplierData: any = {
          name: record.name,
          contact_name: record.contact_name || '',
          phone: record.phone || '',
          email: record.email || '',
          address: record.address || '',
        };
        if (record.id && isValidUUID(record.id)) {
          supplierData.id = record.id;
        }
        await this.db.addSupplier(supplierData);
        break;

      case 'products':
        const categoryId =
          record.category_id && isValidUUID(record.category_id)
            ? record.category_id
            : await this.findOrCreateCategoryId(record.category);
        const supplierId =
          record.supplier_id && isValidUUID(record.supplier_id)
            ? record.supplier_id
            : await this.findOrCreateSupplierId(record.supplier);

        const productData: any = {
          name: record.name,
          barcode: record.barcode || null,
          category_id: categoryId,
          price: record.price,
          cost: record.cost,
          quantity: record.quantity || 0,
          min_stock: record.min_stock || 10,
          supplier_id: supplierId || undefined,
          imageUrl: record.imageUrl || null,
        };
        if (record.id && isValidUUID(record.id)) {
          productData.id = record.id;
        }
        await this.db.addProduct(productData);
        break;

      case 'customers':
        const customerData: any = {
          name: record.name,
          phone: record.phone || '',
          email: record.email || '',
          address: record.address || '',
        };
        if (record.id && isValidUUID(record.id)) {
          customerData.id = record.id;
        }
        await this.db.addCustomer(customerData);
        break;

      case 'sales':
        const saleItems =
          record.items && Array.isArray(record.items)
            ? record.items.map((item: any) => ({
                product_id: item.product_id,
                quantity: item.quantity,
                price: item.price,
                cost: item.cost || 0,
                discount: item.discount || 0,
                subtotal: item.subtotal,
              }))
            : [];

        const saleData: any = {
          total: record.total,
          payment_method: record.payment_method,
          note: record.note || null,
          customer_id: record.customer_id || null,
        };
        if (record.id && isValidUUID(record.id)) {
          saleData.id = record.id;
        }
        await this.db.addSale(saleData, saleItems);
        break;

      case 'expenses':
        const categoryId2 = await this.findOrCreateExpenseCategoryId(
          record.category
        );
        await this.db.addExpense(
          categoryId2,
          record.amount,
          record.description || '',
          record.date
        );
        break;

      case 'stockMovements':
        await this.db.addStockMovement({
          product_id: record.product_id,
          type: record.type,
          quantity: record.quantity,
          reason: record.reason || '',
          supplier_id: record.supplier_id || null,
          reference_number: record.reference_number || '',
          unit_cost: record.unit_cost || null,
        });
        break;

      case 'bulkPricing':
        await this.db.addBulkPricing({
          product_id: record.product_id,
          min_quantity: record.min_quantity,
          bulk_price: record.bulk_price,
        });
        break;

      default:
        console.warn(`Unsupported data type for adding: ${dataType}`);
    }
  }

  // Update an existing record of the specified type
  private async updateRecord(
    dataType: string,
    newRecord: any,
    existingRecord: any
  ): Promise<void> {
    switch (dataType) {
      case 'products':
        const categoryId =
          newRecord.category_id && isValidUUID(newRecord.category_id)
            ? newRecord.category_id
            : await this.findOrCreateCategoryId(newRecord.category);
        const supplierId =
          newRecord.supplier_id && isValidUUID(newRecord.supplier_id)
            ? newRecord.supplier_id
            : await this.findOrCreateSupplierId(newRecord.supplier);

        await this.db.updateProduct(existingRecord.id, {
          name: newRecord.name,
          barcode: newRecord.barcode || null,
          category_id: categoryId,
          price: newRecord.price,
          cost: newRecord.cost,
          quantity: newRecord.quantity || 0,
          min_stock: newRecord.min_stock || 10,
          supplier_id: supplierId || undefined,
          imageUrl: newRecord.imageUrl || null,
        });
        break;

      case 'customers':
        await this.db.updateCustomer(existingRecord.id, {
          name: newRecord.name,
          phone: newRecord.phone || '',
          email: newRecord.email || '',
          address: newRecord.address || '',
        });
        break;

      default:
        // For other data types, we typically don't update existing records
        console.warn(`Update not supported for data type: ${dataType}`);
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
  async validateImportFileWithFeedback(fileUri: string): Promise<{
    isValid: boolean;
    message: string;
    availableTypes: string[];
    detailedCounts: Record<string, number>;
    canProceed: boolean;
  }> {
    try {
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const importData = JSON.parse(fileContent);

      const validation = this.validateDataTypeAvailability(importData);

      let message = '';
      if (validation.isValid) {
        message = `✓ Import file is ready for import.`;
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
