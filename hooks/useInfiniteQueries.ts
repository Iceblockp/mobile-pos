import { useInfiniteQuery } from '@tanstack/react-query';
import { useDatabase } from '@/context/DatabaseContext';
import { queryKeys } from './useQueries';

// Infinite query for expenses with pagination
export const useInfiniteExpenses = (filter: string, selectedDate?: Date) => {
  const { db, isReady } = useDatabase();

  return useInfiniteQuery({
    queryKey: [
      ...queryKeys.expenses.all,
      'infinite',
      filter,
      selectedDate?.toISOString(),
    ],
    queryFn: async ({ pageParam = 1 }) => {
      if (!db) return { data: [], hasMore: false };

      const PAGE_SIZE = 20;
      let expenses;

      if (filter === 'all') {
        expenses = await db.getExpensesPaginated(pageParam, PAGE_SIZE);
      } else {
        // Calculate date range based on filter
        const today = new Date();
        let startDate: Date, endDate: Date;

        switch (filter) {
          case 'today':
            startDate = new Date(today);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(today);
            endDate.setHours(23, 59, 59, 999);
            break;
          case 'week':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(today);
            endDate.setHours(23, 59, 59, 999);
            break;
          case 'month':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 30);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(today);
            endDate.setHours(23, 59, 59, 999);
            break;
          case 'custom':
            if (!selectedDate) return { data: [], hasMore: false };
            startDate = new Date(selectedDate);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(selectedDate);
            endDate.setHours(23, 59, 59, 999);
            break;
          default:
            return { data: [], hasMore: false };
        }

        expenses = await db.getExpensesByDateRangePaginated(
          startDate,
          endDate,
          pageParam,
          PAGE_SIZE
        );
      }

      return {
        data: expenses,
        hasMore: expenses.length === PAGE_SIZE,
        nextPage: expenses.length === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: isReady && !!db,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
  });
};

// Infinite query for sales history (all sales)
export const useInfiniteSales = () => {
  const { db, isReady } = useDatabase();

  return useInfiniteQuery({
    queryKey: [...queryKeys.sales.all, 'infinite'],
    queryFn: async ({ pageParam = 1 }) => {
      if (!db) return { data: [], hasMore: false };

      const PAGE_SIZE = 50;
      const sales = await db.getSalesPaginated(pageParam, PAGE_SIZE);

      return {
        data: sales,
        hasMore: sales.length === PAGE_SIZE,
        nextPage: sales.length === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: isReady && !!db,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Infinite query for sales history by date range
export const useInfiniteSalesByDateRange = (startDate: Date, endDate: Date) => {
  const { db, isReady } = useDatabase();

  return useInfiniteQuery({
    queryKey: [
      ...queryKeys.sales.all,
      'infinite',
      'dateRange',
      startDate.toISOString(),
      endDate.toISOString(),
    ],
    queryFn: async ({ pageParam = 1 }) => {
      if (!db) return { data: [], hasMore: false };

      const PAGE_SIZE = 50;
      const sales = await db.getSalesByDateRangePaginated(
        startDate,
        endDate,
        pageParam,
        PAGE_SIZE
      );

      return {
        data: sales,
        hasMore: sales.length === PAGE_SIZE,
        nextPage: sales.length === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: isReady && !!db,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
