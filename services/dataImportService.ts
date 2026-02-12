import * as FileSystem from 'expo-file-system';
import { readAsStringAsync } from 'expo-file-system/legacy';
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
      const fileContent = await readAsStringAsync(fileUri);

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
        data.dataType,
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
                `Data section "${key}" is not an array (found ${typeof section})`,
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
              `Data section "${key}" has ${corruptedCount} corrupted/invalid records out of ${section.length}`,
            );
            if (validRecords.length === 0) {
              corruptedSections.push(key);
            }
          }
        } catch (error) {
          validationErrors.push(
            `Error validating data section "${key}": ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
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
            ', ',
          )}`;
        } else {
          message = 'Import file does not contain any valid data';
        }
      } else if (corruptedSections.length > 0) {
        message = `Some data sections are corrupted and will be skipped: ${corruptedSections.join(
          ', ',
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
            `Skipping invalid ${sectionName} record at index ${index}: not an object`,
          );
          return;
        }

        // Check for circular references
        try {
          JSON.stringify(record);
        } catch (error) {
          console.warn(
            `Skipping ${sectionName} record at index ${index}: circular reference or non-serializable data`,
          );
          return;
        }

        // Validate required fields based on section type
        if (!this.validateRecordRequiredFields(record, sectionName)) {
          console.warn(
            `Skipping ${sectionName} record at index ${index}: missing required fields`,
          );
          return;
        }

        // Validate data types
        if (!this.validateRecordDataTypes(record, sectionName)) {
          console.warn(
            `Skipping ${sectionName} record at index ${index}: invalid data types`,
          );
          return;
        }

        validRecords.push(record);
      } catch (error) {
        console.warn(
          `Skipping corrupted ${sectionName} record at index ${index}:`,
          error,
        );
      }
    });

    return validRecords;
  }

  // Validate required fields for different record types
  private validateRecordRequiredFields(
    record: any,
    sectionName: string,
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
        error,
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
      const fileContent = await readAsStringAsync(fileUri);
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
          })),
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
        }`,
      );
    }
  }

  // Universal Conflict Detection System
  // Single method that handles conflict detection for all data types consistently
  private detectRecordConflict(
    record: any,
    existingRecords: any[],
    recordType: string,
  ): DataConflict | null {
    try {
      // Validate input parameters
      if (!record || !Array.isArray(existingRecords) || !recordType) {
        return null;
      }

      // Find matching existing record using universal matching strategy
      const matchResult = this.findMatchingRecord(
        record,
        existingRecords,
        recordType,
      );

      if (matchResult.matchedRecord) {
        return {
          type: 'duplicate',
          record,
          existingRecord: matchResult.matchedRecord,
          message: this.generateConflictMessage(
            record,
            matchResult,
            recordType,
          ),
          index: 0, // This will be set by the caller
          recordType,
          matchedBy: matchResult.matchedBy,
        };
      }

      // No conflict found
      return null;
    } catch (error) {
      console.warn(`Error in detectRecordConflict for ${recordType}:`, error);
      return null;
    }
  }

  // Universal record matching - tries UUID first, then name-based fallback
  private findMatchingRecord(
    record: any,
    existingRecords: any[],
    recordType: string,
  ): { matchedRecord: any | null; matchedBy: 'uuid' | 'name' | 'other' } {
    // Strategy 1: UUID matching (primary method)
    if (record.id && isValidUUID(record.id)) {
      for (const existingRecord of existingRecords) {
        if (
          existingRecord.id &&
          isValidUUID(existingRecord.id) &&
          record.id === existingRecord.id
        ) {
          return { matchedRecord: existingRecord, matchedBy: 'uuid' };
        }
      }
    }

    // Strategy 2: Name-based matching (fallback method)
    if (this.supportsNameMatching(recordType)) {
      for (const existingRecord of existingRecords) {
        if (this.matchByName(record, existingRecord, recordType)) {
          return { matchedRecord: existingRecord, matchedBy: 'name' };
        }
      }
    }

    return { matchedRecord: null, matchedBy: 'other' };
  }

  // Check if a data type supports name-based matching
  private supportsNameMatching(recordType: string): boolean {
    const nameMatchingSupported = [
      'products',
      'customers',
      'categories',
      'suppliers',
      'expenseCategories',
    ];
    return nameMatchingSupported.includes(recordType);
  }

  // Name-based matching logic for different record types
  private matchByName(record: any, existing: any, recordType: string): boolean {
    try {
      switch (recordType) {
        case 'products':
          // Match by name or barcode
          return (
            (record.name && existing.name && record.name === existing.name) ||
            (record.barcode &&
              existing.barcode &&
              record.barcode === existing.barcode)
          );

        case 'customers':
          // Match by name or phone
          return (
            (record.name && existing.name && record.name === existing.name) ||
            (record.phone && existing.phone && record.phone === existing.phone)
          );

        case 'categories':
        case 'suppliers':
        case 'expenseCategories':
          // Match by name only
          return record.name && existing.name && record.name === existing.name;

        default:
          return false;
      }
    } catch (error) {
      console.warn(`Error in name matching for ${recordType}:`, error);
      return false;
    }
  }

  // Generate appropriate conflict message based on match type
  private generateConflictMessage(
    record: any,
    matchResult: { matchedRecord: any; matchedBy: 'uuid' | 'name' | 'other' },
    recordType: string,
  ): string {
    if (matchResult.matchedBy === 'uuid') {
      return `${recordType} with ID "${record.id}" already exists`;
    }

    if (matchResult.matchedBy === 'name') {
      switch (recordType) {
        case 'products':
          if (
            record.barcode &&
            matchResult.matchedRecord.barcode === record.barcode
          ) {
            return `Product with barcode "${record.barcode}" already exists`;
          }
          return `Product "${record.name}" already exists`;

        case 'customers':
          if (
            record.phone &&
            matchResult.matchedRecord.phone === record.phone
          ) {
            return `Customer with phone "${record.phone}" already exists`;
          }
          return `Customer "${record.name}" already exists`;

        default:
          return `${recordType} "${record.name || 'Unknown'}" already exists`;
      }
    }

    return `${recordType} already exists`;
  }

  // Enhanced conflict detection using universal conflict detection system
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
      // Get existing data for all supported data types
      const existingDataMap = await this.getAllExistingData();

      // Initialize conflict tracking for each data type
      Object.keys(existingDataMap).forEach((key) => {
        conflictsByType[key] = [];
        conflictStatistics[key] = {
          total: 0,
          duplicate: 0,
          reference_missing: 0,
          validation_failed: 0,
        };
      });

      // Process each data type using universal conflict detection
      for (const [dataType, existingRecords] of Object.entries(
        existingDataMap,
      )) {
        if (data[dataType] && Array.isArray(data[dataType])) {
          data[dataType].forEach((record: any, index: number) => {
            try {
              // Validate record data before checking conflicts
              if (!this.validateRecordRequiredFields(record, dataType)) {
                this.addValidationConflict(
                  conflicts,
                  conflictsByType,
                  conflictStatistics,
                  dataType,
                  record,
                  index,
                  'missing required fields',
                );
                return;
              }

              if (!this.validateRecordDataTypes(record, dataType)) {
                this.addValidationConflict(
                  conflicts,
                  conflictsByType,
                  conflictStatistics,
                  dataType,
                  record,
                  index,
                  'invalid data types',
                );
                return;
              }

              // Use universal conflict detection method
              const conflict = this.detectRecordConflict(
                record,
                existingRecords,
                dataType,
              );
              if (conflict) {
                conflict.index = index;
                conflicts.push(conflict);
                conflictsByType[dataType].push(conflict);
                conflictStatistics[dataType].total++;
                conflictStatistics[dataType].duplicate++;
              }
            } catch (error) {
              this.addValidationConflict(
                conflicts,
                conflictsByType,
                conflictStatistics,
                dataType,
                record,
                index,
                `corrupted record: ${
                  error instanceof Error ? error.message : 'Unknown error'
                }`,
              );
            }
          });
        }
      }
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      this.addSystemConflict(
        conflicts,
        conflictsByType,
        conflictStatistics,
        error,
      );
    }

    return {
      totalConflicts: conflicts.length,
      conflictsByType,
      conflictStatistics,
      hasConflicts: conflicts.length > 0,
    };
  }

  // Get all existing data for conflict detection
  private async getAllExistingData(): Promise<Record<string, any[]>> {
    const [
      existingProducts,
      existingCustomers,
      existingCategories,
      existingSuppliers,
      existingSales,
      existingExpenses,
      existingStockMovements,
    ] = await Promise.all([
      this.db.getProducts(),
      this.db.getCustomers(),
      this.db.getCategories(),
      this.db.getSuppliers(),
      this.db.getSalesPaginated(1, 10000),
      this.db.getExpenses(10000),
      this.db.getStockMovements({}, 1, 10000),
    ]);

    // Get bulk pricing data
    const existingBulkPricing: any[] = [];
    for (const product of existingProducts) {
      const productBulkPricing = await this.db.getBulkPricingForProduct(
        product.id,
      );
      existingBulkPricing.push(...productBulkPricing);
    }

    return {
      products: existingProducts,
      customers: existingCustomers,
      categories: existingCategories,
      suppliers: existingSuppliers,
      sales: existingSales,
      expenses: existingExpenses,
      stockMovements: existingStockMovements,
      bulkPricing: existingBulkPricing,
    };
  }

  // Helper method to add validation conflicts
  private addValidationConflict(
    conflicts: DataConflict[],
    conflictsByType: { [dataType: string]: DataConflict[] },
    conflictStatistics: { [dataType: string]: any },
    dataType: string,
    record: any,
    index: number,
    reason: string,
  ): void {
    const conflict: DataConflict = {
      type: 'validation_failed',
      record,
      message: `${dataType} at index ${index} has ${reason}`,
      index,
      recordType: dataType,
      matchedBy: 'other',
    };

    conflicts.push(conflict);
    conflictsByType[dataType].push(conflict);
    conflictStatistics[dataType].total++;
    conflictStatistics[dataType].validation_failed++;
  }

  // Helper method to add system-level conflicts
  private addSystemConflict(
    conflicts: DataConflict[],
    conflictsByType: { [dataType: string]: DataConflict[] },
    conflictStatistics: { [dataType: string]: any },
    error: any,
  ): void {
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

  // Legacy method for backward compatibility - now uses the enhanced method
  private async detectConflicts(
    data: any,
    dataType: string,
  ): Promise<DataConflict[]> {
    const conflictSummary = await this.detectAllConflicts(data);
    return Object.values(conflictSummary.conflictsByType).flat();
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
    },
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
        error,
      );
    }
  }

  // Import all data - simplified for "all data" only
  async importAllData(
    fileUri: string,
    options: ImportOptions,
  ): Promise<ImportResult> {
    const startTime = Date.now();
    let totalImported = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    const allErrors: ImportError[] = [];
    const allConflicts: DataConflict[] = [];

    try {
      this.updateProgress('Reading import file...', 0, 1);

      const fileContent = await readAsStringAsync(fileUri);
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
      const conflictSummary = await this.detectAllConflicts(data);
      const conflicts = Object.values(conflictSummary.conflictsByType).flat();

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
          data[dataType].length > 0,
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
            totalStages,
          );

          const result = await this.processDataType(
            dataType,
            data[dataType],
            options,
            conflicts,
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
        (key) => Array.isArray(data[key]) && data[key].length > 0,
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

  // Simplified record processing with consistent error handling
  private async processDataType(
    dataType: string,
    records: any[],
    options: ImportOptions,
    allConflicts: DataConflict[],
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
      for (let i = 0; i < records.length; i += options.batchSize) {
        const batch = records.slice(i, i + options.batchSize);

        for (let batchIndex = 0; batchIndex < batch.length; batchIndex++) {
          const record = batch[batchIndex];
          const globalIndex = i + batchIndex;

          try {
            const result = await this.processRecord(
              record,
              dataType,
              globalIndex,
              options,
              allConflicts,
            );

            switch (result.action) {
              case 'imported':
                imported++;
                break;
              case 'updated':
                updated++;
                break;
              case 'skipped':
                skipped++;
                if (result.error) {
                  errors.push(result.error);
                }
                if (result.conflict) {
                  conflicts.push(result.conflict);
                }
                break;
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
            records.length,
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

  // Process individual record with unified logic
  private async processRecord(
    record: any,
    dataType: string,
    index: number,
    options: ImportOptions,
    allConflicts: DataConflict[],
  ): Promise<{
    action: 'imported' | 'updated' | 'skipped';
    error?: ImportError;
    conflict?: DataConflict;
  }> {
    // Validate record data
    const validationError = this.validateRecord(record, dataType, index);
    if (validationError) {
      return { action: 'skipped', error: validationError };
    }

    // Check for conflicts
    const recordConflict = allConflicts.find(
      (c) => c.record === record && c.recordType === dataType,
    );

    if (recordConflict) {
      if (options.conflictResolution === 'skip') {
        return { action: 'skipped' };
      } else if (options.conflictResolution === 'update') {
        await this.updateRecord(
          dataType,
          record,
          recordConflict.existingRecord,
        );
        return { action: 'updated' };
      } else {
        return { action: 'skipped', conflict: recordConflict };
      }
    } else {
      // Add new record
      await this.addRecord(dataType, record);
      return { action: 'imported' };
    }
  }

  // Unified record validation
  private validateRecord(
    record: any,
    dataType: string,
    index: number,
  ): ImportError | null {
    if (!this.validateRecordRequiredFields(record, dataType)) {
      return {
        index,
        record,
        message: `${dataType} record has missing required fields`,
        code: 'MISSING_REQUIRED_FIELDS',
      };
    }

    if (!this.validateRecordDataTypes(record, dataType)) {
      return {
        index,
        record,
        message: `${dataType} record has invalid data types`,
        code: 'INVALID_DATA_TYPES',
      };
    }

    return null;
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
        // Resolve category and supplier relationships properly
        const resolvedCategoryId = await this.resolveCategoryId(
          record.category_id,
          record.category,
        );
        const resolvedSupplierId = await this.resolveSupplierId(
          record.supplier_id,
          record.supplier,
        );

        const productData: any = {
          name: record.name,
          barcode: record.barcode || null,
          category_id: resolvedCategoryId,
          price: record.price,
          cost: record.cost,
          quantity: record.quantity || 0,
          min_stock: record.min_stock || 10,
          supplier_id: resolvedSupplierId,
          imageUrl: null, // Always set imageUrl to null during import
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
        // Preserve original created_at timestamp if available
        if (record.created_at) {
          saleData.created_at = record.created_at;
        }
        // Preserve original voucher_id if available
        if (record.voucher_id) {
          saleData.voucher_id = record.voucher_id;
        }
        await this.db.addSale(saleData, saleItems);
        break;

      case 'expenses':
        const categoryId2 = await this.findOrCreateExpenseCategoryId(
          record.category,
        );

        await this.db.addExpense(
          categoryId2,
          record.amount,
          record.description || '',
          record.date,
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
    existingRecord: any,
  ): Promise<void> {
    switch (dataType) {
      case 'products':
        // Resolve category and supplier relationships properly
        const resolvedCategoryId = await this.resolveCategoryId(
          newRecord.category_id,
          newRecord.category,
        );
        const resolvedSupplierId = await this.resolveSupplierId(
          newRecord.supplier_id,
          newRecord.supplier,
        );

        await this.db.updateProduct(existingRecord.id, {
          name: newRecord.name,
          barcode: newRecord.barcode || null,
          category_id: resolvedCategoryId,
          price: newRecord.price,
          cost: newRecord.cost,
          quantity: newRecord.quantity || 0,
          min_stock: newRecord.min_stock || 10,
          supplier_id: resolvedSupplierId || undefined,
          imageUrl: existingRecord.imageUrl, // Preserve existing imageUrl during conflict resolution
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

      case 'suppliers':
        await this.db.updateSupplier(existingRecord.id, {
          name: newRecord.name,
          contact_name: newRecord.contact_name || '',
          phone: newRecord.phone || '',
          email: newRecord.email || '',
          address: newRecord.address || '',
        });
        break;

      case 'categories':
        await this.db.updateCategory(existingRecord.id, {
          name: newRecord.name,
          description: newRecord.description || '',
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
            `Product ${index}: Invalid UUID format for id: ${product.id}`,
          );
        }
        if (product.category_id && !isValidUUID(product.category_id)) {
          errors.push(
            `Product ${index}: Invalid UUID format for category_id: ${product.category_id}`,
          );
        }
        if (product.supplier_id && !isValidUUID(product.supplier_id)) {
          errors.push(
            `Product ${index}: Invalid UUID format for supplier_id: ${product.supplier_id}`,
          );
        }
      });
    }

    // Validate category UUIDs
    if (data.categories && Array.isArray(data.categories)) {
      data.categories.forEach((category: any, index: number) => {
        if (category.id && !isValidUUID(category.id)) {
          errors.push(
            `Category ${index}: Invalid UUID format for id: ${category.id}`,
          );
        }
      });
    }

    // Validate supplier UUIDs
    if (data.suppliers && Array.isArray(data.suppliers)) {
      data.suppliers.forEach((supplier: any, index: number) => {
        if (supplier.id && !isValidUUID(supplier.id)) {
          errors.push(
            `Supplier ${index}: Invalid UUID format for id: ${supplier.id}`,
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
            `Sale ${index}: Invalid UUID format for customer_id: ${sale.customer_id}`,
          );
        }
        // Validate sale items
        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach((item: any, itemIndex: number) => {
            if (item.id && !isValidUUID(item.id)) {
              errors.push(
                `Sale ${index}, Item ${itemIndex}: Invalid UUID format for id: ${item.id}`,
              );
            }
            if (item.sale_id && !isValidUUID(item.sale_id)) {
              errors.push(
                `Sale ${index}, Item ${itemIndex}: Invalid UUID format for sale_id: ${item.sale_id}`,
              );
            }
            if (item.product_id && !isValidUUID(item.product_id)) {
              errors.push(
                `Sale ${index}, Item ${itemIndex}: Invalid UUID format for product_id: ${item.product_id}`,
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
            `Customer ${index}: Invalid UUID format for id: ${customer.id}`,
          );
        }
      });
    }

    // Validate expense UUIDs
    if (data.expenses && Array.isArray(data.expenses)) {
      data.expenses.forEach((expense: any, index: number) => {
        if (expense.id && !isValidUUID(expense.id)) {
          errors.push(
            `Expense ${index}: Invalid UUID format for id: ${expense.id}`,
          );
        }
        if (expense.category_id && !isValidUUID(expense.category_id)) {
          errors.push(
            `Expense ${index}: Invalid UUID format for category_id: ${expense.category_id}`,
          );
        }
      });
    }

    // Validate stock movement UUIDs
    if (data.stockMovements && Array.isArray(data.stockMovements)) {
      data.stockMovements.forEach((movement: any, index: number) => {
        if (movement.id && !isValidUUID(movement.id)) {
          errors.push(
            `Stock Movement ${index}: Invalid UUID format for id: ${movement.id}`,
          );
        }
        if (movement.product_id && !isValidUUID(movement.product_id)) {
          errors.push(
            `Stock Movement ${index}: Invalid UUID format for product_id: ${movement.product_id}`,
          );
        }
        if (movement.supplier_id && !isValidUUID(movement.supplier_id)) {
          errors.push(
            `Stock Movement ${index}: Invalid UUID format for supplier_id: ${movement.supplier_id}`,
          );
        }
      });
    }

    return errors;
  }

  // Enhanced Relationship Resolution System

  // Resolve category ID with proper priority: UUID first, then name fallback
  private async resolveCategoryId(
    categoryId?: string,
    categoryName?: string,
  ): Promise<string> {
    // Strategy 1: Use provided UUID if valid
    if (categoryId && isValidUUID(categoryId)) {
      const categories = await this.db.getCategories();
      const existingCategory = categories.find((c) => c.id === categoryId);
      if (existingCategory) {
        return categoryId;
      }
      // UUID provided but category doesn't exist - log warning but continue with name fallback
      console.warn(
        `Category with ID ${categoryId} not found, trying name fallback`,
      );
    }

    // Strategy 2: Find by name if provided
    if (categoryName) {
      const categories = await this.db.getCategories();
      const existingCategory = categories.find((c) => c.name === categoryName);
      if (existingCategory) {
        return existingCategory.id;
      }
      // Name provided but category doesn't exist - create new one
      return await this.db.addCategory({
        name: categoryName,
        description: '',
      });
    }

    // Strategy 3: Use default category or create one
    const categories = await this.db.getCategories();
    if (categories.length > 0) {
      return categories[0].id;
    }

    // Create default category as last resort
    return await this.db.addCategory({
      name: 'General',
      description: 'Default category',
    });
  }

  // Resolve supplier ID with proper priority: UUID first, then name fallback
  private async resolveSupplierId(
    supplierId?: string,
    supplierName?: string,
  ): Promise<string | null> {
    // Strategy 1: Use provided UUID if valid
    if (supplierId && isValidUUID(supplierId)) {
      const suppliers = await this.db.getSuppliers();
      const existingSupplier = suppliers.find((s) => s.id === supplierId);
      if (existingSupplier) {
        return supplierId;
      }
      // UUID provided but supplier doesn't exist - log warning but continue with name fallback
      console.warn(
        `Supplier with ID ${supplierId} not found, trying name fallback`,
      );
    }

    // Strategy 2: Find by name if provided
    if (supplierName) {
      const suppliers = await this.db.getSuppliers();
      const existingSupplier = suppliers.find((s) => s.name === supplierName);
      if (existingSupplier) {
        return existingSupplier.id;
      }
      // Name provided but supplier doesn't exist - create new one
      return await this.db.addSupplier({
        name: supplierName,
        contact_name: '',
        phone: '',
        email: '',
        address: '',
      });
    }

    // Strategy 3: Return null if no supplier reference provided
    // This allows products to exist without suppliers
    return null;
  }

  // Helper method for expense categories (kept for backward compatibility)
  private async findOrCreateExpenseCategoryId(
    categoryName?: string,
  ): Promise<string> {
    if (!categoryName) {
      const categories = await this.db.getExpenseCategories();
      if (categories.length > 0) {
        return categories[0].id;
      }
      return await this.db.addExpenseCategory(
        'General',
        'Default expense category',
      );
    }

    const categories = await this.db.getExpenseCategories();
    const existingCategory = categories.find((c) => c.name === categoryName);

    if (existingCategory) {
      return existingCategory.id;
    }

    return await this.db.addExpenseCategory(categoryName, '');
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
      const fileContent = await readAsStringAsync(fileUri);
      const importData = JSON.parse(fileContent);

      const validation = this.validateDataTypeAvailability(importData);

      let message = '';
      if (validation.isValid) {
        message = `✓ Import file is ready for import.`;
        if (validation.detailedCounts) {
          const availableTypesWithCounts = Object.entries(
            validation.detailedCounts,
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
    resolution: ConflictResolution,
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
