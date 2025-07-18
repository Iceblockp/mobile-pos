import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface PerformanceMetrics {
  cacheHitRate: number;
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  averageQueryTime: number;
  backgroundUpdates: number;
}

export const usePerformanceMonitor = () => {
  const queryClient = useQueryClient();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    cacheHitRate: 0,
    totalQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageQueryTime: 0,
    backgroundUpdates: 0,
  });

  useEffect(() => {
    const cache = queryClient.getQueryCache();

    // Monitor query cache events
    const unsubscribe = cache.subscribe((event) => {
      if (event?.type === 'queryAdded' || event?.type === 'queryUpdated') {
        setMetrics((prev) => {
          const query = event.query;
          const isFromCache =
            query.state.dataUpdatedAt > 0 && query.state.isFetching === false;

          const newTotalQueries = prev.totalQueries + 1;
          const newCacheHits = isFromCache
            ? prev.cacheHits + 1
            : prev.cacheHits;
          const newCacheMisses = !isFromCache
            ? prev.cacheMisses + 1
            : prev.cacheMisses;
          const newCacheHitRate =
            newTotalQueries > 0 ? (newCacheHits / newTotalQueries) * 100 : 0;

          return {
            ...prev,
            totalQueries: newTotalQueries,
            cacheHits: newCacheHits,
            cacheMisses: newCacheMisses,
            cacheHitRate: newCacheHitRate,
            backgroundUpdates:
              query.state.isFetching && query.state.data
                ? prev.backgroundUpdates + 1
                : prev.backgroundUpdates,
          };
        });
      }
    });

    return unsubscribe;
  }, [queryClient]);

  const resetMetrics = () => {
    setMetrics({
      cacheHitRate: 0,
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageQueryTime: 0,
      backgroundUpdates: 0,
    });
  };

  const getCacheSize = () => {
    return queryClient.getQueryCache().getAll().length;
  };

  const getQueriesByStatus = () => {
    const queries = queryClient.getQueryCache().getAll();
    return {
      fresh: queries.filter((q) => q.isStale() === false).length,
      stale: queries.filter((q) => q.isStale() === true).length,
      fetching: queries.filter((q) => q.state.isFetching).length,
      error: queries.filter((q) => q.state.status === 'error').length,
    };
  };

  return {
    metrics,
    resetMetrics,
    getCacheSize,
    getQueriesByStatus,
  };
};
