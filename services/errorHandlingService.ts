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
    for (const [id, cp] of this.checkpoints.entries()) {
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
}
