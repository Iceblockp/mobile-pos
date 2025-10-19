import { useEffect, useRef, useCallback } from 'react';

/**
 * Performance monitoring utilities for React Native
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface ComponentRenderMetric {
  componentName: string;
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  slowRenders: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private componentMetrics: Map<string, ComponentRenderMetric> = new Map();
  private readonly SLOW_RENDER_THRESHOLD = 16; // 16ms for 60fps
  private readonly MAX_METRICS = 1000; // Limit stored metrics

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start measuring a performance metric
   */
  startMeasure(name: string, metadata?: Record<string, any>): string {
    const measureId = `${name}-${Date.now()}-${Math.random()}`;

    if (__DEV__) {
      const metric: PerformanceMetric = {
        name,
        startTime: performance.now(),
        metadata,
      };

      this.metrics.push(metric);

      // Limit stored metrics to prevent memory issues
      if (this.metrics.length > this.MAX_METRICS) {
        this.metrics = this.metrics.slice(-this.MAX_METRICS / 2);
      }
    }

    return measureId;
  }

  /**
   * End measuring a performance metric
   */
  endMeasure(name: string): number | null {
    if (!__DEV__) return null;

    const metric = this.metrics.find((m) => m.name === name && !m.endTime);

    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;

      // Log slow operations
      if (metric.duration > 100) {
        console.warn(
          `Slow operation detected: ${name} took ${metric.duration.toFixed(
            2
          )}ms`,
          metric.metadata
        );
      }

      return metric.duration;
    }

    return null;
  }

  /**
   * Measure a function execution time
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const measureId = this.startMeasure(name, metadata);
    try {
      const result = await fn();
      this.endMeasure(name);
      return result;
    } catch (error) {
      this.endMeasure(name);
      throw error;
    }
  }

  /**
   * Measure a synchronous function execution time
   */
  measureSync<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    const measureId = this.startMeasure(name, metadata);
    try {
      const result = fn();
      this.endMeasure(name);
      return result;
    } catch (error) {
      this.endMeasure(name);
      throw error;
    }
  }

  /**
   * Record component render metrics
   */
  recordComponentRender(componentName: string, renderTime: number) {
    if (!__DEV__) return;

    const existing = this.componentMetrics.get(componentName);

    if (existing) {
      existing.renderCount++;
      existing.lastRenderTime = renderTime;
      existing.averageRenderTime =
        (existing.averageRenderTime + renderTime) / 2;

      if (renderTime > this.SLOW_RENDER_THRESHOLD) {
        existing.slowRenders++;
      }
    } else {
      this.componentMetrics.set(componentName, {
        componentName,
        renderCount: 1,
        averageRenderTime: renderTime,
        lastRenderTime: renderTime,
        slowRenders: renderTime > this.SLOW_RENDER_THRESHOLD ? 1 : 0,
      });
    }

    // Warn about consistently slow renders
    const metric = this.componentMetrics.get(componentName)!;
    if (
      metric.slowRenders > 5 &&
      metric.slowRenders / metric.renderCount > 0.5
    ) {
      console.warn(
        `Component ${componentName} has frequent slow renders: ${metric.slowRenders}/${metric.renderCount}`
      );
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalMetrics: number;
    slowOperations: PerformanceMetric[];
    componentSummary: ComponentRenderMetric[];
    memoryUsage?: any;
  } {
    const slowOperations = this.metrics.filter(
      (m) => m.duration && m.duration > 100
    );

    const componentSummary = Array.from(this.componentMetrics.values()).sort(
      (a, b) => b.slowRenders - a.slowRenders
    );

    let memoryUsage;
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      memoryUsage = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
      };
    }

    return {
      totalMetrics: this.metrics.length,
      slowOperations,
      componentSummary,
      memoryUsage,
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = [];
    this.componentMetrics.clear();
  }

  /**
   * Log performance summary to console
   */
  logSummary() {
    if (!__DEV__) return;

    const summary = this.getPerformanceSummary();

    console.group('Performance Summary');
    console.log(`Total metrics recorded: ${summary.totalMetrics}`);
    console.log(`Slow operations: ${summary.slowOperations.length}`);

    if (summary.memoryUsage) {
      console.log(
        `Memory usage: ${summary.memoryUsage.used}MB / ${summary.memoryUsage.total}MB`
      );
    }

    if (summary.slowOperations.length > 0) {
      console.group('Slow Operations');
      summary.slowOperations.forEach((op) => {
        console.log(`${op.name}: ${op.duration?.toFixed(2)}ms`, op.metadata);
      });
      console.groupEnd();
    }

    if (summary.componentSummary.length > 0) {
      console.group('Component Render Performance');
      summary.componentSummary.slice(0, 10).forEach((comp) => {
        console.log(
          `${comp.componentName}: ${
            comp.renderCount
          } renders, avg ${comp.averageRenderTime.toFixed(2)}ms, ${
            comp.slowRenders
          } slow`
        );
      });
      console.groupEnd();
    }

    console.groupEnd();
  }
}

/**
 * Hook for measuring component render performance
 */
export const usePerformanceMonitor = (componentName: string) => {
  const renderStartTime = useRef<number>(0);
  const monitor = PerformanceMonitor.getInstance();

  useEffect(() => {
    if (__DEV__) {
      renderStartTime.current = performance.now();
    }
  });

  useEffect(() => {
    if (__DEV__ && renderStartTime.current > 0) {
      const renderTime = performance.now() - renderStartTime.current;
      monitor.recordComponentRender(componentName, renderTime);
    }
  });

  const measureOperation = useCallback(
    async <T>(
      operationName: string,
      operation: () => Promise<T>,
      metadata?: Record<string, any>
    ): Promise<T> => {
      return monitor.measureAsync(
        `${componentName}.${operationName}`,
        operation,
        metadata
      );
    },
    [componentName, monitor]
  );

  const measureSync = useCallback(
    <T>(
      operationName: string,
      operation: () => T,
      metadata?: Record<string, any>
    ): T => {
      return monitor.measureSync(
        `${componentName}.${operationName}`,
        operation,
        metadata
      );
    },
    [componentName, monitor]
  );

  return {
    measureOperation,
    measureSync,
    logSummary: monitor.logSummary.bind(monitor),
  };
};

/**
 * Hook for measuring database operations
 */
export const useDatabasePerformanceMonitor = () => {
  const monitor = PerformanceMonitor.getInstance();

  const measureQuery = useCallback(
    async <T>(
      queryName: string,
      queryFn: () => Promise<T>,
      metadata?: Record<string, any>
    ): Promise<T> => {
      return monitor.measureAsync(`db.${queryName}`, queryFn, {
        type: 'database',
        ...metadata,
      });
    },
    [monitor]
  );

  return { measureQuery };
};

/**
 * Hook for measuring network operations
 */
export const useNetworkPerformanceMonitor = () => {
  const monitor = PerformanceMonitor.getInstance();

  const measureRequest = useCallback(
    async <T>(
      requestName: string,
      requestFn: () => Promise<T>,
      metadata?: Record<string, any>
    ): Promise<T> => {
      return monitor.measureAsync(`network.${requestName}`, requestFn, {
        type: 'network',
        ...metadata,
      });
    },
    [monitor]
  );

  return { measureRequest };
};

/**
 * Global performance monitoring setup
 */
export const setupPerformanceMonitoring = () => {
  if (__DEV__) {
    const monitor = PerformanceMonitor.getInstance();

    // Log performance summary every 30 seconds
    setInterval(() => {
      monitor.logSummary();
    }, 30000);

    // Clear metrics every 5 minutes to prevent memory buildup
    setInterval(() => {
      monitor.clearMetrics();
    }, 5 * 60 * 1000);

    console.log('Performance monitoring enabled');
  }
};

export default PerformanceMonitor;
