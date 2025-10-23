// Performance optimization service for data import/export operations

export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  recordsProcessed: number;
  recordsPerSecond?: number;
  memoryUsage?: {
    used: number;
    total: number;
    percentage: number;
  };
  batchSize: number;
  totalBatches: number;
  averageBatchTime?: number;
}

export interface OptimizationConfig {
  initialBatchSize: number;
  maxBatchSize: number;
  minBatchSize: number;
  memoryThreshold: number; // Percentage of available memory
  adaptiveBatching: boolean;
  enableMemoryCleanup: boolean;
  enableProgressiveLoading: boolean;
}

export class PerformanceOptimizationService {
  private config: OptimizationConfig;
  private metrics: PerformanceMetrics;
  private batchTimes: number[] = [];
  private memoryCheckInterval?: NodeJS.Timeout;

  constructor(config?: Partial<OptimizationConfig>) {
    this.config = {
      initialBatchSize: 25,
      maxBatchSize: 100,
      minBatchSize: 5,
      memoryThreshold: 80,
      adaptiveBatching: true,
      enableMemoryCleanup: true,
      enableProgressiveLoading: true,
      ...config,
    };

    this.metrics = {
      startTime: Date.now(),
      recordsProcessed: 0,
      batchSize: this.config.initialBatchSize,
      totalBatches: 0,
    };
  }

  // Start performance monitoring
  startMonitoring(): void {
    this.metrics.startTime = Date.now();
    this.metrics.recordsProcessed = 0;
    this.metrics.totalBatches = 0;
    this.batchTimes = [];

    if (this.config.enableMemoryCleanup) {
      this.startMemoryMonitoring();
    }
  }

  // Stop performance monitoring
  stopMonitoring(): PerformanceMetrics {
    this.metrics.endTime = Date.now();
    this.metrics.duration = this.metrics.endTime - this.metrics.startTime;
    this.metrics.recordsPerSecond =
      this.metrics.recordsProcessed / (this.metrics.duration / 1000);
    this.metrics.averageBatchTime =
      this.batchTimes.length > 0
        ? this.batchTimes.reduce((sum, time) => sum + time, 0) /
          this.batchTimes.length
        : 0;

    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = undefined;
    }

    return { ...this.metrics };
  }

  // Get optimal batch size based on performance metrics
  getOptimalBatchSize(totalRecords: number): number {
    if (!this.config.adaptiveBatching) {
      return this.config.initialBatchSize;
    }

    // Start with initial batch size
    let optimalSize = this.config.initialBatchSize;

    // Adjust based on total records
    if (totalRecords < 100) {
      optimalSize = Math.min(optimalSize, 10);
    } else if (totalRecords < 1000) {
      optimalSize = Math.min(optimalSize, 25);
    } else if (totalRecords < 10000) {
      optimalSize = Math.min(optimalSize, 50);
    } else {
      optimalSize = Math.min(optimalSize, this.config.maxBatchSize);
    }

    // Adjust based on memory usage
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage && memoryUsage.percentage > this.config.memoryThreshold) {
      optimalSize = Math.max(
        Math.floor(optimalSize * 0.5),
        this.config.minBatchSize
      );
    }

    // Adjust based on previous batch performance
    if (this.batchTimes.length > 3) {
      const recentAverage =
        this.batchTimes.slice(-3).reduce((sum, time) => sum + time, 0) / 3;
      const overallAverage =
        this.batchTimes.reduce((sum, time) => sum + time, 0) /
        this.batchTimes.length;

      if (recentAverage > overallAverage * 1.5) {
        // Recent batches are slower, reduce batch size
        optimalSize = Math.max(
          Math.floor(optimalSize * 0.8),
          this.config.minBatchSize
        );
      } else if (recentAverage < overallAverage * 0.7) {
        // Recent batches are faster, increase batch size
        optimalSize = Math.min(
          Math.floor(optimalSize * 1.2),
          this.config.maxBatchSize
        );
      }
    }

    this.metrics.batchSize = optimalSize;
    return optimalSize;
  }

  // Record batch processing time
  recordBatchTime(startTime: number, recordsInBatch: number): void {
    const batchTime = Date.now() - startTime;
    this.batchTimes.push(batchTime);
    this.metrics.recordsProcessed += recordsInBatch;
    this.metrics.totalBatches++;

    // Keep only the last 20 batch times to avoid memory bloat
    if (this.batchTimes.length > 20) {
      this.batchTimes = this.batchTimes.slice(-20);
    }
  }

  // Get memory usage information
  getMemoryUsage(): { used: number; total: number; percentage: number } | null {
    try {
      // In React Native, we don't have direct access to memory info
      // This is a placeholder for memory monitoring
      // In a real implementation, you might use native modules or estimate based on data size

      // Estimate memory usage based on processed records
      const estimatedMemoryPerRecord = 1024; // 1KB per record estimate
      const estimatedUsed =
        this.metrics.recordsProcessed * estimatedMemoryPerRecord;
      const estimatedTotal = 100 * 1024 * 1024; // 100MB estimate

      return {
        used: estimatedUsed,
        total: estimatedTotal,
        percentage: (estimatedUsed / estimatedTotal) * 100,
      };
    } catch (error) {
      console.warn('Unable to get memory usage:', error);
      return null;
    }
  }

  // Force garbage collection (if available)
  forceGarbageCollection(): void {
    try {
      // In React Native, we don't have direct access to GC
      // This is a placeholder for memory cleanup
      console.log('Requesting garbage collection...');

      // Clear any large temporary variables
      this.cleanupTemporaryData();
    } catch (error) {
      console.warn('Unable to force garbage collection:', error);
    }
  }

  // Clean up temporary data to free memory
  private cleanupTemporaryData(): void {
    // Clear old batch times
    if (this.batchTimes.length > 10) {
      this.batchTimes = this.batchTimes.slice(-10);
    }
  }

  // Start memory monitoring
  private startMemoryMonitoring(): void {
    this.memoryCheckInterval = setInterval(() => {
      const memoryUsage = this.getMemoryUsage();
      if (memoryUsage) {
        this.metrics.memoryUsage = memoryUsage;

        // If memory usage is high, trigger cleanup
        if (memoryUsage.percentage > this.config.memoryThreshold) {
          console.warn(
            `High memory usage detected: ${memoryUsage.percentage.toFixed(1)}%`
          );
          this.forceGarbageCollection();
        }
      }
    }, 5000); // Check every 5 seconds
  }

  // Calculate estimated time remaining
  getEstimatedTimeRemaining(
    totalRecords: number,
    processedRecords: number
  ): number | null {
    if (processedRecords === 0 || this.batchTimes.length === 0) {
      return null;
    }

    const remainingRecords = totalRecords - processedRecords;
    const averageTimePerRecord = this.metrics.averageBatchTime || 0;
    const currentBatchSize = this.metrics.batchSize;

    if (averageTimePerRecord === 0 || currentBatchSize === 0) {
      return null;
    }

    const estimatedBatchesRemaining = Math.ceil(
      remainingRecords / currentBatchSize
    );
    const estimatedTimeRemaining =
      estimatedBatchesRemaining * averageTimePerRecord;

    return estimatedTimeRemaining;
  }

  // Get performance recommendations
  getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const memoryUsage = this.getMemoryUsage();

    if (memoryUsage && memoryUsage.percentage > 90) {
      recommendations.push(
        'Consider reducing batch size due to high memory usage'
      );
    }

    if (this.batchTimes.length > 5) {
      const recentAverage =
        this.batchTimes.slice(-5).reduce((sum, time) => sum + time, 0) / 5;
      if (recentAverage > 5000) {
        // 5 seconds
        recommendations.push(
          'Batch processing is slow, consider optimizing data validation'
        );
      }
    }

    if (this.metrics.batchSize < this.config.minBatchSize) {
      recommendations.push(
        'Batch size is very small, this may impact performance'
      );
    }

    if (this.metrics.recordsPerSecond && this.metrics.recordsPerSecond < 10) {
      recommendations.push(
        'Processing speed is low, consider checking database performance'
      );
    }

    return recommendations;
  }

  // Stream processing for large datasets
  async *streamProcess<T>(
    data: T[],
    processor: (batch: T[]) => Promise<void>,
    onProgress?: (processed: number, total: number) => void
  ): AsyncGenerator<
    { processed: number; total: number; batchSize: number },
    void,
    unknown
  > {
    const total = data.length;
    let processed = 0;

    this.startMonitoring();

    while (processed < total) {
      const batchSize = this.getOptimalBatchSize(total);
      const batch = data.slice(processed, processed + batchSize);

      const batchStartTime = Date.now();

      try {
        await processor(batch);
        this.recordBatchTime(batchStartTime, batch.length);

        processed += batch.length;

        if (onProgress) {
          onProgress(processed, total);
        }

        yield {
          processed,
          total,
          batchSize: this.metrics.batchSize,
        };

        // Allow UI to update between batches
        await new Promise((resolve) => setTimeout(resolve, 10));
      } catch (error) {
        console.error('Batch processing error:', error);
        throw error;
      }
    }

    this.stopMonitoring();
  }

  // Chunked file writing for large exports
  async writeFileInChunks(
    filePath: string,
    data: string,
    chunkSize: number = 1024 * 1024 // 1MB chunks
  ): Promise<void> {
    try {
      // For React Native, we'll write the entire file at once
      // In a real implementation with Node.js, you would use streams
      const FileSystem = require('expo-file-system');
      const outputFile = new FileSystem.File(filePath);
      await outputFile.write(data);

      console.log(`File written successfully: ${filePath}`);
    } catch (error) {
      console.error('Error writing file in chunks:', error);
      throw error;
    }
  }

  // Progressive loading for large imports
  async *progressiveLoad(
    fileUri: string,
    chunkSize: number = 1000
  ): AsyncGenerator<any[], void, unknown> {
    try {
      const { readAsStringAsync } = require('expo-file-system/legacy');
      const fileContent = await readAsStringAsync(fileUri);
      const data = JSON.parse(fileContent);

      // If data is an array, yield in chunks
      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i += chunkSize) {
          yield data.slice(i, i + chunkSize);

          // Allow UI to update between chunks
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      } else {
        // If data is an object, yield the entire object
        yield [data];
      }
    } catch (error) {
      console.error('Error in progressive loading:', error);
      throw error;
    }
  }

  // Get current metrics
  getCurrentMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Reset metrics
  resetMetrics(): void {
    this.metrics = {
      startTime: Date.now(),
      recordsProcessed: 0,
      batchSize: this.config.initialBatchSize,
      totalBatches: 0,
    };
    this.batchTimes = [];
  }
}
