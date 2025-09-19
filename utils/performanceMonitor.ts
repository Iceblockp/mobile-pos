import { useRef, useEffect, useCallback } from 'react';

// Performance monitoring utilities for price input components
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private renderCounts: Map<string, number> = new Map();
  private renderTimes: Map<string, number[]> = new Map();
  private memoryUsage: number[] = [];
  private infiniteLoopDetector: Map<
    string,
    { count: number; lastTime: number }
  > = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Track component render counts
  trackRender(componentName: string): void {
    const currentCount = this.renderCounts.get(componentName) || 0;
    this.renderCounts.set(componentName, currentCount + 1);

    // Record render time
    const renderTime = performance.now();
    const times = this.renderTimes.get(componentName) || [];
    times.push(renderTime);

    // Keep only last 100 render times
    if (times.length > 100) {
      times.shift();
    }
    this.renderTimes.set(componentName, times);

    // Detect potential infinite loops
    this.detectInfiniteLoop(componentName);
  }

  // Detect potential infinite loops
  private detectInfiniteLoop(componentName: string): void {
    const now = Date.now();
    const detector = this.infiniteLoopDetector.get(componentName) || {
      count: 0,
      lastTime: now,
    };

    // Reset counter if more than 1 second has passed
    if (now - detector.lastTime > 1000) {
      detector.count = 1;
      detector.lastTime = now;
    } else {
      detector.count++;
    }

    this.infiniteLoopDetector.set(componentName, detector);

    // Warn if component renders more than 50 times per second
    if (detector.count > 50) {
      console.warn(
        `Potential infinite loop detected in ${componentName}: ${detector.count} renders in 1 second`
      );

      // Reset to prevent spam
      detector.count = 0;
      detector.lastTime = now;
    }
  }

  // Get render statistics
  getRenderStats(componentName: string): {
    totalRenders: number;
    averageRenderTime: number;
    lastRenderTime: number;
  } {
    const totalRenders = this.renderCounts.get(componentName) || 0;
    const times = this.renderTimes.get(componentName) || [];

    const averageRenderTime =
      times.length > 0
        ? times.reduce((sum, time, index) => {
            if (index === 0) return 0;
            return sum + (time - times[index - 1]);
          }, 0) /
          (times.length - 1)
        : 0;

    const lastRenderTime = times.length > 0 ? times[times.length - 1] : 0;

    return {
      totalRenders,
      averageRenderTime,
      lastRenderTime,
    };
  }

  // Track memory usage
  trackMemoryUsage(): void {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      this.memoryUsage.push(memInfo.usedJSHeapSize);

      // Keep only last 100 measurements
      if (this.memoryUsage.length > 100) {
        this.memoryUsage.shift();
      }
    }
  }

  // Get memory statistics
  getMemoryStats(): {
    currentUsage: number;
    averageUsage: number;
    peakUsage: number;
    isIncreasing: boolean;
  } {
    if (this.memoryUsage.length === 0) {
      return {
        currentUsage: 0,
        averageUsage: 0,
        peakUsage: 0,
        isIncreasing: false,
      };
    }

    const currentUsage = this.memoryUsage[this.memoryUsage.length - 1];
    const averageUsage =
      this.memoryUsage.reduce((sum, usage) => sum + usage, 0) /
      this.memoryUsage.length;
    const peakUsage = Math.max(...this.memoryUsage);

    // Check if memory is consistently increasing (potential leak)
    const recentUsage = this.memoryUsage.slice(-10);
    const isIncreasing =
      recentUsage.length >= 10 &&
      recentUsage.every(
        (usage, index) => index === 0 || usage >= recentUsage[index - 1]
      );

    return {
      currentUsage,
      averageUsage,
      peakUsage,
      isIncreasing,
    };
  }

  // Clear all statistics
  clearStats(): void {
    this.renderCounts.clear();
    this.renderTimes.clear();
    this.memoryUsage = [];
    this.infiniteLoopDetector.clear();
  }

  // Get all component statistics
  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [componentName] of this.renderCounts) {
      stats[componentName] = this.getRenderStats(componentName);
    }

    stats.memory = this.getMemoryStats();

    return stats;
  }
}

// React hook for performance monitoring
export const usePerformanceMonitor = (componentName: string) => {
  const monitor = PerformanceMonitor.getInstance();
  const renderCountRef = useRef(0);

  useEffect(() => {
    renderCountRef.current++;
    monitor.trackRender(componentName);
    monitor.trackMemoryUsage();
  });

  const getStats = useCallback(() => {
    return monitor.getRenderStats(componentName);
  }, [componentName, monitor]);

  const clearStats = useCallback(() => {
    monitor.clearStats();
  }, [monitor]);

  return {
    renderCount: renderCountRef.current,
    getStats,
    clearStats,
  };
};

// Hook for detecting infinite loops in price inputs
export const usePriceInputPerformanceMonitor = (inputName: string) => {
  const monitor = PerformanceMonitor.getInstance();
  const lastValueRef = useRef<string>('');
  const changeCountRef = useRef(0);
  const lastChangeTimeRef = useRef(Date.now());

  const trackValueChange = useCallback(
    (newValue: string) => {
      const now = Date.now();

      // Only count as a change if value actually changed
      if (newValue !== lastValueRef.current) {
        lastValueRef.current = newValue;
        changeCountRef.current++;

        // Reset counter every second
        if (now - lastChangeTimeRef.current > 1000) {
          changeCountRef.current = 1;
          lastChangeTimeRef.current = now;
        }

        // Warn if too many changes per second
        if (changeCountRef.current > 20) {
          console.warn(
            `High frequency value changes detected in ${inputName}: ${changeCountRef.current} changes per second`
          );
        }

        monitor.trackRender(`${inputName}_value_change`);
      }
    },
    [inputName, monitor]
  );

  return {
    trackValueChange,
    getChangeCount: () => changeCountRef.current,
  };
};

// Performance validation utilities
export const validatePerformance = {
  // Check if component renders are within acceptable limits
  checkRenderCount: (
    componentName: string,
    maxRenders: number = 100
  ): boolean => {
    const monitor = PerformanceMonitor.getInstance();
    const stats = monitor.getRenderStats(componentName);
    return stats.totalRenders <= maxRenders;
  },

  // Check if memory usage is stable
  checkMemoryStability: (): boolean => {
    const monitor = PerformanceMonitor.getInstance();
    const memStats = monitor.getMemoryStats();
    return !memStats.isIncreasing;
  },

  // Check if render times are reasonable
  checkRenderPerformance: (
    componentName: string,
    maxRenderTime: number = 16
  ): boolean => {
    const monitor = PerformanceMonitor.getInstance();
    const stats = monitor.getRenderStats(componentName);
    return stats.averageRenderTime <= maxRenderTime;
  },

  // Run all performance checks
  runAllChecks: (
    componentName: string
  ): {
    renderCount: boolean;
    memoryStability: boolean;
    renderPerformance: boolean;
    overall: boolean;
  } => {
    const renderCount = validatePerformance.checkRenderCount(componentName);
    const memoryStability = validatePerformance.checkMemoryStability();
    const renderPerformance =
      validatePerformance.checkRenderPerformance(componentName);

    return {
      renderCount,
      memoryStability,
      renderPerformance,
      overall: renderCount && memoryStability && renderPerformance,
    };
  },
};

// Error tracking for infinite loops
export class InfiniteLoopTracker {
  private static errors: Array<{
    component: string;
    timestamp: number;
    error: string;
    stackTrace?: string;
  }> = [];

  static trackError(
    component: string,
    error: string,
    stackTrace?: string
  ): void {
    this.errors.push({
      component,
      timestamp: Date.now(),
      error,
      stackTrace,
    });

    // Keep only last 50 errors
    if (this.errors.length > 50) {
      this.errors.shift();
    }

    console.error(`Infinite loop error in ${component}:`, error);
  }

  static getErrors(): typeof InfiniteLoopTracker.errors {
    return [...this.errors];
  }

  static clearErrors(): void {
    this.errors = [];
  }

  static getErrorsForComponent(
    component: string
  ): typeof InfiniteLoopTracker.errors {
    return this.errors.filter((error) => error.component === component);
  }
}
