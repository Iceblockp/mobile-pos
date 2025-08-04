import { useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';

interface PerformanceMetrics {
  renderTime: number;
  listSize: number;
  timestamp: number;
}

export const usePerformanceOptimization = (
  listSize: number,
  componentName: string
) => {
  const renderStartTime = useRef<number>(Date.now());
  const metricsRef = useRef<PerformanceMetrics[]>([]);

  useEffect(() => {
    renderStartTime.current = Date.now();
  });

  useEffect(() => {
    const renderTime = Date.now() - renderStartTime.current;

    // Log performance metrics for debugging
    if (__DEV__) {
      const metrics: PerformanceMetrics = {
        renderTime,
        listSize,
        timestamp: Date.now(),
      };

      metricsRef.current.push(metrics);

      // Keep only last 10 measurements
      if (metricsRef.current.length > 10) {
        metricsRef.current.shift();
      }

      // Log performance warning if render time is too high
      if (renderTime > 100) {
        console.warn(
          `[${componentName}] Slow render detected: ${renderTime}ms for ${listSize} items`
        );
      }

      // Log average performance every 5 renders
      if (metricsRef.current.length % 5 === 0) {
        const avgRenderTime =
          metricsRef.current.reduce((sum, m) => sum + m.renderTime, 0) /
          metricsRef.current.length;
        console.log(
          `[${componentName}] Avg render time: ${avgRenderTime.toFixed(
            2
          )}ms for ~${listSize} items`
        );
      }
    }
  }, [listSize, componentName]);

  // Defer heavy operations until after interactions
  const deferHeavyOperation = (callback: () => void) => {
    InteractionManager.runAfterInteractions(callback);
  };

  return {
    deferHeavyOperation,
    getMetrics: () => metricsRef.current,
  };
};
