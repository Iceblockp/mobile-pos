// Error handling and recovery service for data import/export operations

export interface ErrorRecoveryStrategy {
  errorType: string;
  strategy: 'retry' | 'skip' | 'rollback' | 'user_intervention';
  maxRetries?: number;
  retryDelay?: number;
  userPrompt?: string;
  recoveryAction?: () => Promise<void>;
}

export interface ErrorResolution {
  action: 'retry' | 'skip' | 'rollback' | 'abort';
  message?: string;
}

export interface Checkpoint {
  id: string;
  timestamp: string;
  operation: string;
  data: any;
  recordsProcessed: number;
}

export class ErrorHandlingService {
  private checkpoints: Map<string, Checkpoint> = new Map();
  private errorStrategies: Map<string, ErrorRecoveryStrategy> = new Map();

  constructor() {
    this.initializeErrorStrategies();
  }

  private initializeErrorStrategies() {
    // File errors
    this.errorStrategies.set('FILE_NOT_FOUND', {
      errorType: 'FILE_NOT_FOUND',
      strategy: 'user_intervention',
      userPrompt:
        'The selected file could not be found. Please select a valid file.',
    });

    this.errorStrategies.set('INVALID_FILE_FORMAT', {
      errorType: 'INVALID_FILE_FORMAT',
      strategy: 'user_intervention',
      userPrompt:
        'The file format is invalid. Please select a valid JSON export file.',
    });

    this.errorStrategies.set('FILE_CORRUPTED', {
      errorType: 'FILE_CORRUPTED',
      strategy: 'user_intervention',
      userPrompt:
        'The file appears to be corrupted. Please try with a different file.',
    });

    // Data errors
    this.errorStrategies.set('INVALID_DATA_STRUCTURE', {
      errorType: 'INVALID_DATA_STRUCTURE',
      strategy: 'skip',
      userPrompt: 'Some data has invalid structure and will be skipped.',
    });

    this.errorStrategies.set('MISSING_REQUIRED_FIELDS', {
      errorType: 'MISSING_REQUIRED_FIELDS',
      strategy: 'skip',
      userPrompt: 'Records with missing required fields will be skipped.',
    });

    this.errorStrategies.set('DATA_TYPE_MISMATCH', {
      errorType: 'DATA_TYPE_MISMATCH',
      strategy: 'skip',
      userPrompt: 'Records with incorrect data types will be skipped.',
    });

    // Edge case errors for selective export/import
    this.errorStrategies.set('EMPTY_DATA_TYPE', {
      errorType: 'EMPTY_DATA_TYPE',
      strategy: 'user_intervention',
      userPrompt:
        'The selected data type has no records. An empty export file will be created.',
    });

    this.errorStrategies.set('MISSING_DATA_TYPE', {
      errorType: 'MISSING_DATA_TYPE',
      strategy: 'user_intervention',
      userPrompt:
        'The import file does not contain the selected data type. Please check available data types.',
    });

    this.errorStrategies.set('CORRUPTED_DATA_SECTION', {
      errorType: 'CORRUPTED_DATA_SECTION',
      strategy: 'skip',
      userPrompt:
        'Some data sections are corrupted and will be skipped. Valid data will still be processed.',
    });

    this.errorStrategies.set('MALFORMED_RECORDS', {
      errorType: 'MALFORMED_RECORDS',
      strategy: 'skip',
      userPrompt:
        'Some records are malformed and will be skipped. Valid records will still be processed.',
    });

    this.errorStrategies.set('CIRCULAR_REFERENCE', {
      errorType: 'CIRCULAR_REFERENCE',
      strategy: 'skip',
      userPrompt:
        'Records with circular references will be skipped to prevent processing errors.',
    });

    this.errorStrategies.set('INVALID_NUMERIC_DATA', {
      errorType: 'INVALID_NUMERIC_DATA',
      strategy: 'skip',
      userPrompt:
        'Records with invalid numeric data will be skipped or sanitized where possible.',
    });

    this.errorStrategies.set('DATA_TYPE_VALIDATION_FAILED', {
      errorType: 'DATA_TYPE_VALIDATION_FAILED',
      strategy: 'skip',
      userPrompt: 'Records that fail data type validation will be skipped.',
    });

    // Database errors
    this.errorStrategies.set('CONSTRAINT_VIOLATION', {
      errorType: 'CONSTRAINT_VIOLATION',
      strategy: 'retry',
      maxRetries: 3,
      retryDelay: 1000,
      userPrompt: 'Database constraint violation. Retrying with adjusted data.',
    });

    this.errorStrategies.set('REFERENCE_INTEGRITY_ERROR', {
      errorType: 'REFERENCE_INTEGRITY_ERROR',
      strategy: 'skip',
      userPrompt: 'Records with invalid references will be skipped.',
    });

    this.errorStrategies.set('TRANSACTION_FAILED', {
      errorType: 'TRANSACTION_FAILED',
      strategy: 'rollback',
      userPrompt: 'Transaction failed. Rolling back to previous state.',
    });

    // System errors
    this.errorStrategies.set('MEMORY_LIMIT_EXCEEDED', {
      errorType: 'MEMORY_LIMIT_EXCEEDED',
      strategy: 'retry',
      maxRetries: 2,
      userPrompt: 'Memory limit exceeded. Reducing batch size and retrying.',
      recoveryAction: async () => {
        console.log('Reducing batch size due to memory constraints');
      },
    });

    this.errorStrategies.set('STORAGE_SPACE_INSUFFICIENT', {
      errorType: 'STORAGE_SPACE_INSUFFICIENT',
      strategy: 'user_intervention',
      userPrompt:
        'Insufficient storage space. Please free up space and try again.',
    });

    this.errorStrategies.set('NETWORK_ERROR', {
      errorType: 'NETWORK_ERROR',
      strategy: 'retry',
      maxRetries: 3,
      retryDelay: 2000,
      userPrompt: 'Network error occurred. Retrying...',
    });
  }

  // Handle export errors
  async handleExportError(
    error: Error,
    context?: any
  ): Promise<ErrorResolution> {
    const errorType = this.classifyError(error);
    const strategy = this.errorStrategies.get(errorType);

    if (!strategy) {
      return {
        action: 'abort',
        message: `Unknown error: ${error.message}`,
      };
    }

    console.log(`Handling export error: ${errorType}`, error);

    switch (strategy.strategy) {
      case 'retry':
        return {
          action: 'retry',
          message: strategy.userPrompt || 'Retrying operation...',
        };

      case 'skip':
        return {
          action: 'skip',
          message: strategy.userPrompt || 'Skipping problematic data...',
        };

      case 'rollback':
        return {
          action: 'rollback',
          message: strategy.userPrompt || 'Rolling back changes...',
        };

      case 'user_intervention':
        return {
          action: 'abort',
          message: strategy.userPrompt || 'User intervention required.',
        };

      default:
        return {
          action: 'abort',
          message: 'Unable to handle error automatically.',
        };
    }
  }

  // Handle import errors
  async handleImportError(
    error: Error,
    context?: any
  ): Promise<ErrorResolution> {
    const errorType = this.classifyError(error);
    const strategy = this.errorStrategies.get(errorType);

    if (!strategy) {
      return {
        action: 'abort',
        message: `Unknown error: ${error.message}`,
      };
    }

    console.log(`Handling import error: ${errorType}`, error);

    // Execute recovery action if available
    if (strategy.recoveryAction) {
      try {
        await strategy.recoveryAction();
      } catch (recoveryError) {
        console.error('Recovery action failed:', recoveryError);
      }
    }

    switch (strategy.strategy) {
      case 'retry':
        return {
          action: 'retry',
          message: strategy.userPrompt || 'Retrying operation...',
        };

      case 'skip':
        return {
          action: 'skip',
          message: strategy.userPrompt || 'Skipping problematic data...',
        };

      case 'rollback':
        return {
          action: 'rollback',
          message: strategy.userPrompt || 'Rolling back changes...',
        };

      case 'user_intervention':
        return {
          action: 'abort',
          message: strategy.userPrompt || 'User intervention required.',
        };

      default:
        return {
          action: 'abort',
          message: 'Unable to handle error automatically.',
        };
    }
  }

  // Handle validation errors
  async handleValidationError(
    error: Error,
    context?: any
  ): Promise<ErrorResolution> {
    const errorType = this.classifyValidationError(error);
    const strategy = this.errorStrategies.get(errorType);

    if (!strategy) {
      return {
        action: 'skip',
        message: `Validation failed: ${error.message}`,
      };
    }

    return {
      action: 'skip',
      message: strategy.userPrompt || 'Validation failed, skipping record.',
    };
  }

  // Create checkpoint for rollback capability
  async createCheckpoint(
    operation: string,
    data?: any,
    recordsProcessed: number = 0
  ): Promise<string> {
    const checkpointId = `checkpoint_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const checkpoint: Checkpoint = {
      id: checkpointId,
      timestamp: new Date().toISOString(),
      operation,
      data: data || {},
      recordsProcessed,
    };

    this.checkpoints.set(checkpointId, checkpoint);

    // Keep only the last 10 checkpoints to avoid memory issues
    if (this.checkpoints.size > 10) {
      const oldestKey = Array.from(this.checkpoints.keys())[0];
      this.checkpoints.delete(oldestKey);
    }

    console.log(
      `Created checkpoint: ${checkpointId} for operation: ${operation}`
    );
    return checkpointId;
  }

  // Rollback to checkpoint
  async rollbackToCheckpoint(checkpointId: string): Promise<void> {
    const checkpoint = this.checkpoints.get(checkpointId);

    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }

    console.log(`Rolling back to checkpoint: ${checkpointId}`);

    // In a real implementation, this would restore the database state
    console.log(`Rollback data:`, checkpoint.data);
    console.log(
      `Records processed before rollback: ${checkpoint.recordsProcessed}`
    );

    // Remove checkpoints created after this one
    const checkpointTime = new Date(checkpoint.timestamp).getTime();
    for (const [id, cp] of Array.from(this.checkpoints.entries())) {
      if (new Date(cp.timestamp).getTime() > checkpointTime) {
        this.checkpoints.delete(id);
      }
    }
  }

  // Classify error types
  private classifyError(error: Error): string {
    const message = error.message.toLowerCase();

    // File errors
    if (message.includes('file not found') || message.includes('enoent')) {
      return 'FILE_NOT_FOUND';
    }
    if (
      message.includes('invalid json') ||
      message.includes('unexpected token')
    ) {
      return 'INVALID_FILE_FORMAT';
    }
    if (message.includes('corrupted') || message.includes('malformed')) {
      return 'FILE_CORRUPTED';
    }

    // Data errors
    if (message.includes('invalid data structure')) {
      return 'INVALID_DATA_STRUCTURE';
    }
    if (
      message.includes('missing required') ||
      message.includes('required field')
    ) {
      return 'MISSING_REQUIRED_FIELDS';
    }
    if (message.includes('type mismatch') || message.includes('invalid type')) {
      return 'DATA_TYPE_MISMATCH';
    }

    // Edge case errors for selective export/import
    if (message.includes('no records') || message.includes('empty data type')) {
      return 'EMPTY_DATA_TYPE';
    }
    if (message.includes('does not contain') && message.includes('data type')) {
      return 'MISSING_DATA_TYPE';
    }
    if (
      message.includes('corrupted data section') ||
      message.includes('corrupted section')
    ) {
      return 'CORRUPTED_DATA_SECTION';
    }
    if (
      message.includes('malformed records') ||
      message.includes('invalid records')
    ) {
      return 'MALFORMED_RECORDS';
    }
    if (message.includes('circular reference')) {
      return 'CIRCULAR_REFERENCE';
    }
    if (
      message.includes('invalid numeric') ||
      message.includes('nan') ||
      message.includes('not a number')
    ) {
      return 'INVALID_NUMERIC_DATA';
    }
    if (
      message.includes('validation failed') ||
      message.includes('data type validation')
    ) {
      return 'DATA_TYPE_VALIDATION_FAILED';
    }

    // Database errors
    if (message.includes('constraint') || message.includes('unique')) {
      return 'CONSTRAINT_VIOLATION';
    }
    if (message.includes('foreign key') || message.includes('reference')) {
      return 'REFERENCE_INTEGRITY_ERROR';
    }
    if (message.includes('transaction') || message.includes('rollback')) {
      return 'TRANSACTION_FAILED';
    }

    // System errors
    if (message.includes('memory') || message.includes('out of memory')) {
      return 'MEMORY_LIMIT_EXCEEDED';
    }
    if (message.includes('storage') || message.includes('disk space')) {
      return 'STORAGE_SPACE_INSUFFICIENT';
    }
    if (message.includes('network') || message.includes('connection')) {
      return 'NETWORK_ERROR';
    }

    return 'UNKNOWN_ERROR';
  }

  // Classify validation errors
  private classifyValidationError(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('required field')) {
      return 'MISSING_REQUIRED_FIELDS';
    }
    if (message.includes('invalid format') || message.includes('format')) {
      return 'INVALID_DATA_STRUCTURE';
    }
    if (
      message.includes('type') ||
      message.includes('number') ||
      message.includes('string')
    ) {
      return 'DATA_TYPE_MISMATCH';
    }

    return 'VALIDATION_ERROR';
  }

  // Get error strategy for a specific error type
  getErrorStrategy(errorType: string): ErrorRecoveryStrategy | undefined {
    return this.errorStrategies.get(errorType);
  }

  // Add custom error strategy
  addErrorStrategy(errorType: string, strategy: ErrorRecoveryStrategy): void {
    this.errorStrategies.set(errorType, strategy);
  }

  // Clear all checkpoints
  clearCheckpoints(): void {
    this.checkpoints.clear();
  }

  // Get all checkpoints
  getCheckpoints(): Checkpoint[] {
    return Array.from(this.checkpoints.values());
  }

  // Handle empty data type export scenario
  async handleEmptyDataTypeExport(dataType: string): Promise<ErrorResolution> {
    console.log(`Handling empty data type export for: ${dataType}`);

    return {
      action: 'skip',
      message: `No ${dataType} data found. Creating empty export file for consistency.`,
    };
  }

  // Handle missing data type in import scenario
  async handleMissingDataTypeImport(
    selectedType: string,
    availableTypes: string[]
  ): Promise<ErrorResolution> {
    console.log(
      `Handling missing data type import. Selected: ${selectedType}, Available: ${availableTypes.join(
        ', '
      )}`
    );

    const availableTypesText =
      availableTypes.length > 0
        ? `Available data types: ${availableTypes.join(', ')}`
        : 'No valid data types found in import file';

    return {
      action: 'abort',
      message: `Import file does not contain ${selectedType} data. ${availableTypesText}`,
    };
  }

  // Handle corrupted data sections
  async handleCorruptedDataSections(
    corruptedSections: string[],
    validSections: string[]
  ): Promise<ErrorResolution> {
    console.log(
      `Handling corrupted data sections: ${corruptedSections.join(', ')}`
    );

    if (validSections.length === 0) {
      return {
        action: 'abort',
        message: `All data sections are corrupted: ${corruptedSections.join(
          ', '
        )}. Cannot proceed with import.`,
      };
    }

    return {
      action: 'skip',
      message: `Some data sections are corrupted and will be skipped: ${corruptedSections.join(
        ', '
      )}. Valid sections will be processed: ${validSections.join(', ')}.`,
    };
  }

  // Handle malformed records
  async handleMalformedRecords(
    sectionName: string,
    totalRecords: number,
    validRecords: number
  ): Promise<ErrorResolution> {
    const malformedCount = totalRecords - validRecords;
    console.log(
      `Handling malformed records in ${sectionName}: ${malformedCount}/${totalRecords} records are malformed`
    );

    if (validRecords === 0) {
      return {
        action: 'skip',
        message: `All ${totalRecords} records in ${sectionName} section are malformed and will be skipped.`,
      };
    }

    return {
      action: 'skip',
      message: `${malformedCount} malformed records in ${sectionName} section will be skipped. ${validRecords} valid records will be processed.`,
    };
  }

  // Handle validation failures with detailed feedback
  async handleValidationFailures(
    validationErrors: string[]
  ): Promise<ErrorResolution> {
    console.log('Handling validation failures:', validationErrors);

    const errorSummary =
      validationErrors.length > 3
        ? `${validationErrors.slice(0, 3).join('; ')}... and ${
            validationErrors.length - 3
          } more errors`
        : validationErrors.join('; ');

    return {
      action: 'skip',
      message: `Validation errors found: ${errorSummary}. Invalid data will be skipped.`,
    };
  }

  // Generate comprehensive error report for edge cases
  generateEdgeCaseErrorReport(
    dataType: string,
    availableTypes: string[],
    corruptedSections: string[],
    validationErrors: string[],
    detailedCounts: Record<string, number>
  ): string {
    const report: string[] = [];

    report.push(`=== Data Import/Export Error Report ===`);
    report.push(`Selected Data Type: ${dataType}`);
    report.push(`Timestamp: ${new Date().toISOString()}`);
    report.push('');

    if (availableTypes.length > 0) {
      report.push('Available Data Types:');
      availableTypes.forEach((type) => {
        const count = detailedCounts[type] || 0;
        report.push(`  - ${type}: ${count} records`);
      });
      report.push('');
    } else {
      report.push('No valid data types found in file.');
      report.push('');
    }

    if (corruptedSections.length > 0) {
      report.push('Corrupted Data Sections:');
      corruptedSections.forEach((section) => {
        report.push(`  - ${section}: Contains invalid or malformed data`);
      });
      report.push('');
    }

    if (validationErrors.length > 0) {
      report.push('Validation Errors:');
      validationErrors.forEach((error, index) => {
        report.push(`  ${index + 1}. ${error}`);
      });
      report.push('');
    }

    report.push('Recommendations:');
    if (availableTypes.length > 0 && !availableTypes.includes(dataType)) {
      report.push(
        `  - Select one of the available data types: ${availableTypes.join(
          ', '
        )}`
      );
    }
    if (corruptedSections.length > 0) {
      report.push('  - Fix corrupted data sections in the source file');
      report.push('  - Or select a different data type that is not corrupted');
    }
    if (validationErrors.length > 0) {
      report.push('  - Validate and fix data format issues in the source file');
    }

    return report.join('\n');
  }
}
