import { ErrorHandlingService } from '../../services/errorHandlingService';

describe('ErrorHandlingService', () => {
  let errorHandler: ErrorHandlingService;

  beforeEach(() => {
    errorHandler = new ErrorHandlingService();
  });

  describe('handleExportError', () => {
    it('should handle file not found error', async () => {
      const error = new Error('file not found');
      const resolution = await errorHandler.handleExportError(error);

      expect(resolution.action).toBe('abort');
      expect(resolution.message).toContain('file could not be found');
    });

    it('should handle invalid file format error', async () => {
      const error = new Error('invalid json format');
      const resolution = await errorHandler.handleExportError(error);

      expect(resolution.action).toBe('abort');
      expect(resolution.message).toContain('file format is invalid');
    });

    it('should handle memory limit exceeded error', async () => {
      const error = new Error('memory limit exceeded');
      const resolution = await errorHandler.handleExportError(error);

      expect(resolution.action).toBe('retry');
      expect(resolution.message).toContain('Memory limit exceeded');
    });

    it('should handle unknown error', async () => {
      const error = new Error('some unknown error');
      const resolution = await errorHandler.handleExportError(error);

      expect(resolution.action).toBe('abort');
      expect(resolution.message).toContain('Unknown error');
    });
  });

  describe('handleImportError', () => {
    it('should handle constraint violation error', async () => {
      const error = new Error('constraint violation occurred');
      const resolution = await errorHandler.handleImportError(error);

      expect(resolution.action).toBe('retry');
      expect(resolution.message).toContain('constraint violation');
    });

    it('should handle transaction failed error', async () => {
      const error = new Error('transaction failed');
      const resolution = await errorHandler.handleImportError(error);

      expect(resolution.action).toBe('rollback');
      expect(resolution.message).toContain('Rolling back');
    });

    it('should handle network error', async () => {
      const error = new Error('network connection failed');
      const resolution = await errorHandler.handleImportError(error);

      expect(resolution.action).toBe('retry');
      expect(resolution.message).toContain('Network error');
    });

    it('should handle data type mismatch error', async () => {
      const error = new Error('type mismatch in field');
      const resolution = await errorHandler.handleImportError(error);

      expect(resolution.action).toBe('skip');
      expect(resolution.message).toContain('incorrect data types');
    });
  });

  describe('handleValidationError', () => {
    it('should handle required field error', async () => {
      const error = new Error('required field missing');
      const resolution = await errorHandler.handleValidationError(error);

      expect(resolution.action).toBe('skip');
      expect(resolution.message).toContain('missing required fields');
    });

    it('should handle format error', async () => {
      const error = new Error('invalid format provided');
      const resolution = await errorHandler.handleValidationError(error);

      expect(resolution.action).toBe('skip');
      expect(resolution.message).toContain('invalid structure');
    });

    it('should handle unknown validation error', async () => {
      const error = new Error('unknown validation issue');
      const resolution = await errorHandler.handleValidationError(error);

      expect(resolution.action).toBe('skip');
      expect(resolution.message).toContain('Validation failed');
    });
  });

  describe('checkpoint management', () => {
    it('should create checkpoint successfully', async () => {
      const checkpointId = await errorHandler.createCheckpoint(
        'test-operation',
        { test: 'data' },
        10
      );

      expect(checkpointId).toMatch(/^checkpoint_\d+_[a-z0-9]+$/);

      const checkpoints = errorHandler.getCheckpoints();
      expect(checkpoints).toHaveLength(1);
      expect(checkpoints[0].operation).toBe('test-operation');
      expect(checkpoints[0].recordsProcessed).toBe(10);
    });

    it('should limit number of checkpoints', async () => {
      // Create more than 10 checkpoints
      for (let i = 0; i < 15; i++) {
        await errorHandler.createCheckpoint(`operation-${i}`, {}, i);
      }

      const checkpoints = errorHandler.getCheckpoints();
      expect(checkpoints.length).toBeLessThanOrEqual(10);
    });

    it('should rollback to checkpoint', async () => {
      const checkpointId = await errorHandler.createCheckpoint(
        'test-operation',
        { test: 'data' },
        5
      );

      // Create another checkpoint after
      await errorHandler.createCheckpoint(
        'later-operation',
        { test: 'later' },
        10
      );

      expect(errorHandler.getCheckpoints()).toHaveLength(2);

      await errorHandler.rollbackToCheckpoint(checkpointId);

      // Should remove checkpoints created after the rollback point
      const remainingCheckpoints = errorHandler.getCheckpoints();
      expect(remainingCheckpoints).toHaveLength(1);
      expect(remainingCheckpoints[0].operation).toBe('test-operation');
    });

    it('should throw error for non-existent checkpoint', async () => {
      await expect(
        errorHandler.rollbackToCheckpoint('non-existent')
      ).rejects.toThrow('Checkpoint non-existent not found');
    });

    it('should clear all checkpoints', () => {
      // Create some checkpoints first
      errorHandler.createCheckpoint('test1', {}, 1);
      errorHandler.createCheckpoint('test2', {}, 2);

      expect(errorHandler.getCheckpoints()).toHaveLength(2);

      errorHandler.clearCheckpoints();

      expect(errorHandler.getCheckpoints()).toHaveLength(0);
    });
  });

  describe('error classification', () => {
    it('should classify file errors correctly', async () => {
      const fileNotFoundError = new Error('ENOENT: no such file');
      const resolution1 = await errorHandler.handleExportError(
        fileNotFoundError
      );
      expect(resolution1.action).toBe('abort');

      const jsonError = new Error('Unexpected token in JSON');
      const resolution2 = await errorHandler.handleExportError(jsonError);
      expect(resolution2.action).toBe('abort');

      const corruptedError = new Error('File is corrupted');
      const resolution3 = await errorHandler.handleExportError(corruptedError);
      expect(resolution3.action).toBe('abort');
    });

    it('should classify database errors correctly', async () => {
      const constraintError = new Error('UNIQUE constraint failed');
      const resolution1 = await errorHandler.handleImportError(constraintError);
      expect(resolution1.action).toBe('retry');

      const foreignKeyError = new Error('foreign key constraint failed');
      const resolution2 = await errorHandler.handleImportError(foreignKeyError);
      expect(resolution2.action).toBe('skip');
    });

    it('should classify system errors correctly', async () => {
      const memoryError = new Error('out of memory');
      const resolution1 = await errorHandler.handleImportError(memoryError);
      expect(resolution1.action).toBe('retry');

      const storageError = new Error('insufficient disk space');
      const resolution2 = await errorHandler.handleImportError(storageError);
      expect(resolution2.action).toBe('abort');
    });
  });

  describe('error strategy management', () => {
    it('should get existing error strategy', () => {
      const strategy = errorHandler.getErrorStrategy('FILE_NOT_FOUND');

      expect(strategy).toBeDefined();
      expect(strategy?.errorType).toBe('FILE_NOT_FOUND');
      expect(strategy?.strategy).toBe('user_intervention');
    });

    it('should return undefined for non-existent strategy', () => {
      const strategy = errorHandler.getErrorStrategy('NON_EXISTENT_ERROR');
      expect(strategy).toBeUndefined();
    });

    it('should add custom error strategy', () => {
      const customStrategy = {
        errorType: 'CUSTOM_ERROR',
        strategy: 'retry' as const,
        maxRetries: 5,
        userPrompt: 'Custom error occurred',
      };

      errorHandler.addErrorStrategy('CUSTOM_ERROR', customStrategy);

      const retrievedStrategy = errorHandler.getErrorStrategy('CUSTOM_ERROR');
      expect(retrievedStrategy).toEqual(customStrategy);
    });
  });
});
