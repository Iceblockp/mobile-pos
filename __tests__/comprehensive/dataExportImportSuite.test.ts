import { DataExportService } from '../../services/dataExportService';
import { DataImportService } from '../../services/dataImportService';
import { ValidationService } from '../../services/validationService';
import { ErrorHandlingService } from '../../services/errorHandlingService';
import { PerformanceOptimizationService } from '../../services/performanceOptimizationService';
import { DatabaseService } from '../../services/database';

// Mock dependencies
jest.mock('expo-file-system');
jest.mock('expo-sharing');
jest.mock('expo-document-picker');

describe('Comprehensive Data Export/Import Test Suite', () => {
  let database: DatabaseService;
  let exportService: DataExportService;
  let importService: DataImportService;
  let validationService: ValidationService;
  let errorHandler: ErrorHandlingService;
  let performanceOptimizer: PerformanceOptimizationService;

  beforeAll(async () => {
    // Initialize services
    database = new DatabaseService();
    await database.initDatabase();

    exportService = new DataExportService(database);
    importService = new DataImportService(database);
    validationService = new ValidationService();
    errorHandler = new ErrorHandlingService();
    performanceOptimizer = new PerformanceOptimizationService();
  });

  afterAll(async () => {
    await database.closeDatabase();
  });

  describe('Service Integration Tests', () => {
    it('should integrate all services without conflicts', () => {
      expect(exportService).toBeDefined();
      expect(importService).toBeDefined();
      expect(validationService).toBeDefined();
      expect(errorHandler).toBeDefined();
      expect(performanceOptimizer).toBeDefined();
    });

    it('should handle service initialization properly', () => {
      const newExportService = new DataExportService(database);
      const newImportService = new DataImportService(database);

      expect(newExportService).toBeInstanceOf(DataExportService);
      expect(newImportService).toBeInstanceOf(DataImportService);
    });
  });

  describe('Data Validation Tests', () => {
    it('should validate all data types correctly', () => {
      // Test product validation
      const validProduct = { name: 'Test Product', price: 100, stock: 10 };
      const productResult = validationService.validateProductData(validProduct);
      expect(productResult.isValid).toBe(true);

      // Test customer validation
      const validCustomer = { name: 'John Doe', phone: '123456789' };
      const customerResult =
        validationService.validateCustomerData(validCustomer);
      expect(customerResult.isValid).toBe(true);

      // Test sale validation
      const validSale = {
        productId: 1,
        customerId: 1,
        quantity: 5,
        total: 500,
      };
      const saleResult = validationService.validateSaleData(validSale);
      expect(saleResult.isValid).toBe(true);

      // Test stock movement validation
      const validMovement = { productId: 1, type: 'in', quantity: 10 };
      const movementResult =
        validationService.validateStockMovementData(validMovement);
      expect(movementResult.isValid).toBe(true);
    });

    it('should reject invalid data consistently', () => {
      // Invalid product (missing name)
      const invalidProduct = { price: 100, stock: 10 };
      const productResult =
        validationService.validateProductData(invalidProduct);
      expect(productResult.isValid).toBe(false);

      // Invalid customer (missing name)
      const invalidCustomer = { phone: '123456789' };
      const customerResult =
        validationService.validateCustomerData(invalidCustomer);
      expect(customerResult.isValid).toBe(false);

      // Invalid sale (zero quantity)
      const invalidSale = {
        productId: 1,
        customerId: 1,
        quantity: 0,
        total: 500,
      };
      const saleResult = validationService.validateSaleData(invalidSale);
      expect(saleResult.isValid).toBe(false);
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle all error types appropriately', async () => {
      // File errors
      const fileError = new Error('file not found');
      const fileResolution = await errorHandler.handleExportError(fileError);
      expect(fileResolution.action).toBe('abort');

      // Database errors
      const dbError = new Error('constraint violation');
      const dbResolution = await errorHandler.handleImportError(dbError);
      expect(dbResolution.action).toBe('retry');

      // Validation errors
      const validationError = new Error('required field missing');
      const validationResolution = await errorHandler.handleValidationError(
        validationError
      );
      expect(validationResolution.action).toBe('skip');
    });

    it('should manage checkpoints correctly', async () => {
      const checkpointId = await errorHandler.createCheckpoint(
        'test-operation',
        { test: 'data' }
      );
      expect(checkpointId).toMatch(/^checkpoint_\d+_[a-z0-9]+$/);

      const checkpoints = errorHandler.getCheckpoints();
      expect(checkpoints).toHaveLength(1);

      await errorHandler.rollbackToCheckpoint(checkpointId);
      // Should not throw error
    });
  });

  describe('Performance Optimization Tests', () => {
    it('should optimize batch sizes appropriately', () => {
      // Small dataset
      const smallBatch = performanceOptimizer.getOptimalBatchSize(50);
      expect(smallBatch).toBeGreaterThan(0);
      expect(smallBatch).toBeLessThanOrEqual(25);

      // Large dataset
      const largeBatch = performanceOptimizer.getOptimalBatchSize(10000);
      expect(largeBatch).toBeGreaterThan(smallBatch);
    });

    it('should track performance metrics', () => {
      performanceOptimizer.startMonitoring();

      // Simulate batch processing
      const startTime = Date.now() - 1000;
      performanceOptimizer.recordBatchTime(startTime, 10);

      const metrics = performanceOptimizer.getCurrentMetrics();
      expect(metrics.recordsProcessed).toBe(10);
      expect(metrics.totalBatches).toBe(1);

      const finalMetrics = performanceOptimizer.stopMonitoring();
      expect(finalMetrics.duration).toBeGreaterThan(0);
    });

    it('should provide performance recommendations', () => {
      const recommendations =
        performanceOptimizer.getPerformanceRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('Memory Management Tests', () => {
    it('should handle large datasets without memory issues', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        value: Math.random() * 1000,
      }));

      // Test streaming processing
      const processedBatches: any[][] = [];
      const processor = async (batch: any[]) => {
        processedBatches.push([...batch]);
      };

      const stream = performanceOptimizer.streamProcess(
        largeDataset,
        processor
      );

      for await (const progress of stream) {
        expect(progress.processed).toBeGreaterThan(0);
        expect(progress.total).toBe(1000);
      }

      const totalProcessed = processedBatches.reduce(
        (sum, batch) => sum + batch.length,
        0
      );
      expect(totalProcessed).toBe(1000);
    });

    it('should clean up memory appropriately', () => {
      // Force garbage collection
      expect(() => {
        performanceOptimizer.forceGarbageCollection();
      }).not.toThrow();

      // Reset metrics
      performanceOptimizer.resetMetrics();
      const metrics = performanceOptimizer.getCurrentMetrics();
      expect(metrics.recordsProcessed).toBe(0);
    });
  });

  describe('File Format Compatibility Tests', () => {
    it('should handle different file format versions', () => {
      // Version 2.0 format
      const v2Data = {
        metadata: { dataType: 'products', version: '2.0', recordCount: 1 },
        data: [{ name: 'Product 1', price: 100 }],
      };

      const v2Result = validationService.validateFileStructure(
        v2Data,
        'products'
      );
      expect(v2Result.isValid).toBe(true);

      // Future version (should still work)
      const futureData = {
        metadata: { dataType: 'products', version: '3.0', recordCount: 1 },
        data: [{ name: 'Product 1', price: 100 }],
      };

      const futureResult = validationService.validateFileStructure(
        futureData,
        'products'
      );
      expect(futureResult.isValid).toBe(true);
    });

    it('should reject malformed file structures', () => {
      // Missing metadata
      const noMetadata = {
        data: [{ name: 'Product 1', price: 100 }],
      };

      const noMetadataResult = validationService.validateFileStructure(
        noMetadata,
        'products'
      );
      expect(noMetadataResult.isValid).toBe(false);

      // Wrong data type
      const wrongType = {
        metadata: { dataType: 'sales', version: '2.0', recordCount: 1 },
        data: [{ name: 'Product 1', price: 100 }],
      };

      const wrongTypeResult = validationService.validateFileStructure(
        wrongType,
        'products'
      );
      expect(wrongTypeResult.isValid).toBe(false);
    });
  });

  describe('Stress Tests', () => {
    it('should handle rapid successive operations', async () => {
      const operations = [];

      // Create multiple concurrent operations
      for (let i = 0; i < 10; i++) {
        operations.push(
          errorHandler.createCheckpoint(`operation-${i}`, { index: i })
        );
      }

      const checkpointIds = await Promise.all(operations);
      expect(checkpointIds).toHaveLength(10);

      // All should be unique
      const uniqueIds = new Set(checkpointIds);
      expect(uniqueIds.size).toBe(10);
    });

    it('should maintain performance under load', async () => {
      performanceOptimizer.startMonitoring();

      // Simulate high-frequency batch processing
      for (let i = 0; i < 100; i++) {
        const startTime = Date.now() - Math.random() * 1000;
        performanceOptimizer.recordBatchTime(
          startTime,
          Math.floor(Math.random() * 50) + 1
        );
      }

      const metrics = performanceOptimizer.stopMonitoring();
      expect(metrics.totalBatches).toBe(100);
      expect(metrics.recordsProcessed).toBeGreaterThan(0);
      expect(metrics.averageBatchTime).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases Tests', () => {
    it('should handle empty datasets gracefully', () => {
      const emptyData = {
        metadata: { dataType: 'products', version: '2.0', recordCount: 0 },
        data: [],
      };

      const result = validationService.validateFileStructure(
        emptyData,
        'products'
      );
      expect(result.isValid).toBe(true);
    });

    it('should handle extremely large single records', () => {
      const largeRecord = {
        name: 'A'.repeat(10000), // Very long name
        price: 100,
        stock: 10,
        description: 'B'.repeat(50000), // Very long description
      };

      const result = validationService.validateProductData(largeRecord);
      expect(result.isValid).toBe(true);
    });

    it('should handle special characters and unicode', () => {
      const unicodeProduct = {
        name: '测试产品 🛍️',
        price: 100,
        stock: 10,
        category: 'Électronique & Gadgets',
      };

      const result = validationService.validateProductData(unicodeProduct);
      expect(result.isValid).toBe(true);

      // Test sanitization
      const sanitized = validationService.sanitizeData(unicodeProduct);
      expect(sanitized.name).toBe('测试产品 🛍️');
    });
  });

  describe('Security Tests', () => {
    it('should sanitize potentially dangerous input', () => {
      const dangerousData = {
        name: '<script>alert("xss")</script>Product',
        description: 'javascript:void(0)',
        category: '<img src=x onerror=alert(1)>',
      };

      const sanitized = validationService.sanitizeData(dangerousData);
      expect(sanitized.name).not.toContain('<script>');
      expect(sanitized.description).not.toContain('javascript:');
      expect(sanitized.category).not.toContain('<img');
    });

    it('should validate file integrity', () => {
      const tamperedData = {
        metadata: { dataType: 'products', version: '2.0', recordCount: 1 },
        data: [
          { name: 'Product 1', price: 100 },
          { name: 'Product 2', price: 200 }, // Extra record not in count
        ],
      };

      const result = validationService.validateFileStructure(
        tamperedData,
        'products'
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'COUNT_MISMATCH',
        })
      );
    });
  });

  describe('Recovery Tests', () => {
    it('should recover from partial failures', async () => {
      // Create checkpoint
      const checkpointId = await errorHandler.createCheckpoint(
        'recovery-test',
        {
          processedRecords: 50,
        }
      );

      // Simulate failure and recovery
      await errorHandler.rollbackToCheckpoint(checkpointId);

      // Should be able to continue from checkpoint
      const checkpoints = errorHandler.getCheckpoints();
      const recoveryPoint = checkpoints.find((cp) => cp.id === checkpointId);
      expect(recoveryPoint).toBeDefined();
      expect(recoveryPoint?.data.processedRecords).toBe(50);
    });

    it('should handle service restart scenarios', () => {
      // Create new service instances (simulating restart)
      const newErrorHandler = new ErrorHandlingService();
      const newPerformanceOptimizer = new PerformanceOptimizationService();

      expect(newErrorHandler).toBeInstanceOf(ErrorHandlingService);
      expect(newPerformanceOptimizer).toBeInstanceOf(
        PerformanceOptimizationService
      );

      // Should start with clean state
      expect(newErrorHandler.getCheckpoints()).toHaveLength(0);
      expect(newPerformanceOptimizer.getCurrentMetrics().recordsProcessed).toBe(
        0
      );
    });
  });
});

// Performance benchmark tests
describe('Performance Benchmarks', () => {
  let performanceOptimizer: PerformanceOptimizationService;

  beforeEach(() => {
    performanceOptimizer = new PerformanceOptimizationService();
  });

  it('should process 1000 records within acceptable time', async () => {
    const testData = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      value: i,
    }));
    const startTime = Date.now();

    const processor = async (batch: any[]) => {
      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 1));
    };

    const stream = performanceOptimizer.streamProcess(testData, processor);

    for await (const progress of stream) {
      // Just consume the stream
    }

    const processingTime = Date.now() - startTime;

    // Should process 1000 records in less than 10 seconds
    expect(processingTime).toBeLessThan(10000);
  });

  it('should maintain memory efficiency with large datasets', async () => {
    const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      data: 'x'.repeat(1000), // 1KB per record
    }));

    const memoryBefore = performanceOptimizer.getMemoryUsage();

    const processor = async (batch: any[]) => {
      // Process batch
    };

    const stream = performanceOptimizer.streamProcess(largeDataset, processor);

    for await (const progress of stream) {
      // Monitor memory during processing
      const currentMemory = performanceOptimizer.getMemoryUsage();
      if (currentMemory && memoryBefore) {
        // Memory usage shouldn't grow excessively
        expect(currentMemory.percentage).toBeLessThan(95);
      }
    }
  });
});
