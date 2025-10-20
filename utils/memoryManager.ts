import { useEffect, useRef, useCallback } from 'react';

/**
 * Memory management utilities for React Native performance optimization
 */

// Global memory monitoring (development only)
class MemoryMonitor {
  private static instance: MemoryMonitor;
  private memoryWarnings: number = 0;
  private lastMemoryCheck: number = 0;
  private readonly CHECK_INTERVAL = 30000; // 30 seconds

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  startMonitoring() {
    if (__DEV__) {
      try {
        this.checkMemoryUsage();
        setInterval(() => {
          try {
            this.checkMemoryUsage();
          } catch (error) {
            console.error('Memory check error:', error);
          }
        }, this.CHECK_INTERVAL);
      } catch (error) {
        console.error('Memory monitoring setup error:', error);
      }
    }
  }

  private checkMemoryUsage() {
    const now = Date.now();
    if (now - this.lastMemoryCheck < this.CHECK_INTERVAL) {
      return;
    }

    this.lastMemoryCheck = now;

    // Basic memory check using performance API if available
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      const totalMB = memory.totalJSHeapSize / 1024 / 1024;
      const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;

      console.log(
        `Memory Usage: ${usedMB.toFixed(2)}MB / ${totalMB.toFixed(
          2
        )}MB (Limit: ${limitMB.toFixed(2)}MB)`
      );

      // Warn if memory usage is high
      if (usedMB > limitMB * 0.8) {
        this.memoryWarnings++;
        console.warn(`High memory usage detected: ${usedMB.toFixed(2)}MB`);

        if (this.memoryWarnings > 3) {
          console.warn(
            'Persistent high memory usage - consider optimizing components'
          );
        }
      } else {
        this.memoryWarnings = 0;
      }
    }
  }
}

/**
 * Hook for component cleanup and memory management
 */
export const useMemoryCleanup = () => {
  const cleanupFunctions = useRef<Array<() => void>>([]);

  const addCleanup = useCallback((cleanupFn: () => void) => {
    cleanupFunctions.current.push(cleanupFn);
  }, []);

  useEffect(() => {
    return () => {
      // Execute all cleanup functions when component unmounts
      cleanupFunctions.current.forEach((cleanup) => {
        try {
          cleanup();
        } catch (error) {
          console.error('Error during cleanup:', error);
        }
      });
      cleanupFunctions.current = [];
    };
  }, []);

  return { addCleanup };
};

/**
 * Hook for debounced cleanup of expensive operations
 */
export const useDebouncedCleanup = (delay: number = 1000) => {
  const timeoutRef = useRef<any>(null);
  const cleanupFunctions = useRef<Array<() => void>>([]);

  const scheduleCleanup = useCallback(
    (cleanupFn: () => void) => {
      cleanupFunctions.current.push(cleanupFn);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        cleanupFunctions.current.forEach((cleanup) => {
          try {
            cleanup();
          } catch (error) {
            console.error('Error during debounced cleanup:', error);
          }
        });
        cleanupFunctions.current = [];
      }, delay);
    },
    [delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Execute remaining cleanup functions
      cleanupFunctions.current.forEach((cleanup) => {
        try {
          cleanup();
        } catch (error) {
          console.error('Error during final cleanup:', error);
        }
      });
    };
  }, []);

  return { scheduleCleanup };
};

/**
 * Hook for managing query cache size
 */
export const useQueryCacheManager = () => {
  const cacheCleanupInterval = useRef<any>(null);

  useEffect(() => {
    // Clean up stale cache entries every 5 minutes
    cacheCleanupInterval.current = setInterval(() => {
      if (__DEV__) {
        console.log('Performing query cache cleanup...');
      }

      // This would integrate with React Query's cache management
      // The actual implementation would depend on the query client setup
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      if (cacheCleanupInterval.current) {
        clearInterval(cacheCleanupInterval.current);
      }
    };
  }, []);
};

/**
 * Hook for monitoring component render performance
 */
export const useRenderPerformance = (componentName: string) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(0);

  useEffect(() => {
    if (__DEV__) {
      renderCount.current++;
      const now = performance.now();

      if (lastRenderTime.current > 0) {
        const timeSinceLastRender = now - lastRenderTime.current;

        // Warn about frequent re-renders
        if (timeSinceLastRender < 16 && renderCount.current > 5) {
          console.warn(
            `${componentName} is re-rendering frequently (${renderCount.current} renders)`
          );
        }
      }

      lastRenderTime.current = now;

      // Reset counter after a period of stability
      const resetTimeout = setTimeout(() => {
        renderCount.current = 0;
      }, 1000);

      return () => clearTimeout(resetTimeout);
    }
  });
};

// Initialize memory monitoring
if (__DEV__) {
  MemoryMonitor.getInstance().startMonitoring();
}

export { MemoryMonitor };
