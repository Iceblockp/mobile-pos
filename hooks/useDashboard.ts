import { useDatabase } from '@/context/DatabaseContext';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './useQueries';

export const useDashboardAnalytics = () => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.analytics.dashboard(),
    queryFn: async () => {
      if (!db) return null;

      const [analyticsData, lowStockProducts, allProducts] = await Promise.all([
        db.getCurrentMonthSalesAnalytics(),
        db.getLowStockProducts(),
        db.getProducts(),
      ]);

      return {
        analytics: analyticsData,
        lowStockCount: lowStockProducts.length,
        totalProducts: allProducts.length,
      };
    },
    enabled: isReady && !!db,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000,
  });
};
