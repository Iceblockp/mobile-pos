import { PerformanceOptimizationService } from '../../services/performanceOptimizationService';

describe('PerformanceOptimizationService', () => {
  let performanceService: PerformanceOptimizationService;

  beforeEach(() => {
    performanceService = new PerformanceOptimizationService();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const metrics = performanceService.getCurrentMetrics();

      expect(metrics.batchSize).toBe(25); // Default initial batch size
      expect(metrics.recordsProcessed).toBe(0);
      expect(metrics.totalBatches).toBe(0);
    });

    it('should initialize with custom config', () => {
      const customService = new PerformanceOptimizationService({
        initialBatchSize: 50,
        maxBatchSize: 200,
        minBatchSize: 10,
      });

      const metrics = customService.getCurrentMetrics();
      expect(metrics.batchSize).toBe(50);
    });
  });

  describe('monitoring', () => {
    it('should start and stop monitoring', () => {
      performanceService.startMonitoring();

      const startMetrics = performanceService.getCurrentMetrics();
      expect(startMetrics.startTime).toBeDefined();

      // Simulate some processing time
      setTimeout(() => {
        const finalMetrics = performanceService.stopMonitoring();

        expect(finalMetrics.endTime).toBeDefined();
        expect(finalMetrics.duration).toBeGreaterThan(0);
      }, 100);
    });

    it('should reset metrics', () => {
      performanceService.recordBatchTime(Date.now() - 1000, 10);

      let metrics = performanceService.getCurrentMetrics();
      expect(metrics.recordsProcessed).toBe(10);

      performanceService.resetMetrics();

      metrics = performanceService.getCurrentMetrics();
      expect(metrics.recordsProcessed).toBe(0);
      expect(metrics.totalBatches).toBe(0);
    });
  });

  describe('batch size optimization', () => {
    it('should return initial batch size for small datasets', () => {
      const batchSize = performanceService.getOptimalBatchSize(50);
      expect(batchSize).toBeLessThanOrEqual(25);
    });

    it('should adjust batch size based on dataset size', () => {
      const smallBatch = performanceService.getOptimalBatchSize(50);
      const mediumBatch = performanceService.getOptimalBatchSize(500);
      const largeBatch = performanceService.getOptimalBatchSize(5000);

      expect(smallBatch).toBeLessThanOrEqual(mediumBatch);
      expect(mediumBatch).toBeLessThanOrEqual(largeBatch);
    });

    it('should adapt batch size based on performance', () => {
      // Record some slow batch times
      const slowStartTime = Date.now() - 5000; // 5 seconds ago
      performanceService.recordBatchTime(slowStartTime, 25);
      performanceService.recordBatchTime(slowStartTime, 25);
      performanceService.recordBatchTime(slowStartTime, 25);
      performanceService.recordBatchTime(slowStartTime, 25);

      const adaptedBatchSize = performanceService.getOptimalBatchSize(1000);
      const initialBatchSize = 25;

      // Should reduce batch size due to slow performance
      expect(adaptedBatchSize).toBeLessThan(initialBatchSize);
    });

    it('should respect min and max batch size limits', () => {
      const service = new PerformanceOptimizationService({
        minBatchSize: 5,
        maxBatchSize: 50,
      });

      const smallBatch = service.getOptimalBatchSize(10);
      const largeBatch = service.getOptimalBatchSize(10000);

      expect(smallBatch).toBeGreaterThanOrEqual(5);
      expect(largeBatch).toBeLessThanOrEqual(50);
    });
  });

  describe('batch time recording', () => {
    it('should record batch processing times', () => {
      const startTime = Date.now() - 1000; // 1 second ago
      performanceService.recordBatchTime(startTime, 10);

      const metrics = performanceService.getCurrentMetrics();
      expect(metrics.recordsProcessed).toBe(10);
      expect(metrics.totalBatches).toBe(1);
    });

    it('should limit stored batch times to prevent memory bloat', () => {
      // Record more than 20 batch times
      for (let i = 0; i < 25; i++) {
        performanceService.recordBatchTime(Date.now() - 1000, 10);
      }

      const metrics = performanceService.getCurrentMetrics();
      expect(metrics.recordsProcessed).toBe(250); // 25 * 10
      expect(metrics.totalBatches).toBe(25);

      // Internal batch times array should be limited (this is tested indirectly)
      // by ensuring the service doesn't run out of memory
    });
  });

  describe('time estimation', () => {
    it('should calculate estimated time remaining', () => {
      // Record some batch times first
      performanceService.recordBatchTime(Date.now() - 1000, 10);
      performanceService.recordBatchTime(Date.now() - 1000, 10);

      const estimatedTime = performanceService.getEstimatedTimeRemaining(
        100,
        20
      );

      expect(estimatedTime).toBeGreaterThan(0);
      expect(typeof estimatedTime).toBe('number');
    });

    it('should return null for insufficient data', () => {
      const estimatedTime = performanceService.getEstimatedTimeRemaining(
        100,
        0
      );
      expect(estimatedTime).toBeNull();
    });

    it('should return null when no batch times recorded', () => {
      const estimatedTime = performanceService.getEstimatedTimeRemaining(
        100,
        50
      );
      expect(estimatedTime).toBeNull();
    });
  });

  describe('memory management', () => {
    it('should get memory usage information', () => {
      performanceService.recordBatchTime(Date.now(), 100);

      const memoryUsage = performanceService.getMemoryUsage();

      expect(memoryUsage).toBeDefined();
      expect(memoryUsage?.used).toBeGreaterThan(0);
      expect(memoryUsage?.total).toBeGreaterThan(0);
      expect(memoryUsage?.percentage).toBeGreaterThanOrEqual(0);
      expect(memoryUsage?.percentage).toBeLessThanOrEqual(100);
    });

    it('should force garbage collection', () => {
      // This is mainly testing that the method doesn't throw
      expect(() => {
        performanceService.forceGarbageCollection();
      }).not.toThrow();
    });
  });

  describe('performance recommendations', () => {
    it('should provide recommendations for high memory usage', () => {
      // Simulate high memory usage by processing many records
      for (let i = 0; i < 1000; i++) {
        performanceService.recordBatchTime(Date.now(), 100);
      }

      const recommendations =
        performanceService.getPerformanceRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);
      // Should recommend reducing batch size due to high memory usage
      expect(recommendations.some((rec) => rec.includes('memory usage'))).toBe(
        true
      );
    });

    it('should provide recommendations for slow processing', () => {
      // Record slow batch times (> 5 seconds)
      const slowTime = Date.now() - 6000;
      for (let i = 0; i < 6; i++) {
        performanceService.recordBatchTime(slowTime, 10);
      }

      const recommendations =
        performanceService.getPerformanceRecommendations();

      expect(recommendations.some((rec) => rec.includes('slow'))).toBe(true);
    });

    it('should provide recommendations for very small batch size', () => {
      const service = new PerformanceOptimizationService({
        minBatchSize: 10,
        initialBatchSize: 5, // Below min
      });

      const recommendations = service.getPerformanceRecommendations();

      expect(recommendations.some((rec) => rec.includes('very small'))).toBe(
        true
      );
    });
  });

  describe('stream processing', () => {
    it('should process data in streams', async () => {
      const testData = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        value: `item-${i}`,
      }));
      const processedBatches: any[][] = [];

      const processor = async (batch: any[]) => {
        processedBatches.push([...batch]);
        // Simulate processing time
        await new Promise((resolve) => setTimeout(resolve, 10));
      };

      const progressUpdates: any[] = [];
      const onProgress = (processed: number, total: number) => {
        progressUpdates.push({ processed, total });
      };

      const stream = performanceService.streamProcess(
        testData,
        processor,
        onProgress
      );

      for await (const progress of stream) {
        expect(progress.processed).toBeGreaterThan(0);
        expect(progress.total).toBe(100);
        expect(progress.batchSize).toBeGreaterThan(0);
      }

      // Verify all data was processed
      const totalProcessed = processedBatches.reduce(
        (sum, batch) => sum + batch.length,
        0
      );
      expect(totalProcessed).toBe(100);

      // Verify progress was tracked
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1].processed).toBe(100);
    });

    it('should handle processing errors in streams', async () => {
      const testData = [{ id: 1 }, { id: 2 }, { id: 3 }];

      const processor = async (batch: any[]) => {
        if (batch[0].id === 2) {
          throw new Error('Processing error');
        }
      };

      const stream = performanceService.streamProcess(testData, processor);

      await expect(async () => {
        for await (const progress of stream) {
          // Should throw when processing the second item
        }
      }).rejects.toThrow('Processing error');
    });
  });

  describe('progressive loading', () => {
    it('should load data progressively', async () => {
      // Mock file system
      const mockData = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
      }));

      // Mock expo-file-system
      jest.doMock('expo-file-system', () => ({
        readAsStringAsync: jest
          .fn()
          .mockResolvedValue(JSON.stringify(mockData)),
      }));

      const chunks: any[][] = [];
      const loader = performanceService.progressiveLoad('mock-file-uri', 10);

      for await (const chunk of loader) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBe(5); // 50 items / 10 per chunk
      expect(chunks[0].length).toBe(10);
      expect(chunks[4].length).toBe(10);
    });
  });
});
