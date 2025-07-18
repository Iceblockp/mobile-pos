import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useDatabase } from '@/context/DatabaseContext';
import {
  Product,
  Category,
  Supplier,
  Sale,
  Expense,
  ExpenseCategory,
} from '@/services/database';

// Query keys factory for better organization
export const queryKeys = {
  // Products
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters: string) =>
      [...queryKeys.products.lists(), { filters }] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.products.details(), id] as const,
  },

  // Categories
  categories: {
    all: ['categories'] as const,
    lists: () => [...queryKeys.categories.all, 'list'] as const,
  },

  // Suppliers
  suppliers: {
    all: ['suppliers'] as const,
    lists: () => [...queryKeys.suppliers.all, 'list'] as const,
  },

  // Inventory
  inventory: {
    all: ['inventory'] as const,
    lowStock: () => [...queryKeys.inventory.all, 'lowStock'] as const,
  },

  // Sales
  sales: {
    all: ['sales'] as const,
    analytics: (days: number) =>
      [...queryKeys.sales.all, 'analytics', days] as const,
    history: () => [...queryKeys.sales.all, 'history'] as const,
    paginated: (page: number, pageSize: number) =>
      [...queryKeys.sales.all, 'paginated', page, pageSize] as const,
    byDateRange: (startDate: Date, endDate: Date, limit: number) =>
      [
        ...queryKeys.sales.all,
        'dateRange',
        startDate.toISOString(),
        endDate.toISOString(),
        limit,
      ] as const,
    byDateRangePaginated: (
      startDate: Date,
      endDate: Date,
      page: number,
      pageSize: number
    ) =>
      [
        ...queryKeys.sales.all,
        'dateRangePaginated',
        startDate.toISOString(),
        endDate.toISOString(),
        page,
        pageSize,
      ] as const,
    items: (saleId: number) =>
      [...queryKeys.sales.all, 'items', saleId] as const,
  },

  // Analytics
  analytics: {
    all: ['analytics'] as const,
    custom: (startDate: Date, endDate: Date) =>
      [
        ...queryKeys.analytics.all,
        'custom',
        startDate.toISOString(),
        endDate.toISOString(),
      ] as const,
    dashboard: () => [...queryKeys.analytics.all, 'dashboard'] as const,
  },

  // Expenses
  expenses: {
    all: ['expenses'] as const,
    paginated: (page: number, filter: string, date?: Date) =>
      [
        ...queryKeys.expenses.all,
        'paginated',
        page,
        filter,
        date?.toISOString(),
      ] as const,
    categories: () => [...queryKeys.expenses.all, 'categories'] as const,
    byDateRange: (startDate: Date, endDate: Date, page: number) =>
      [
        ...queryKeys.expenses.all,
        'dateRange',
        startDate.toISOString(),
        endDate.toISOString(),
        page,
      ] as const,
  },
} as const;

// ============ PRODUCT QUERIES ============
export const useProducts = () => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.products.lists(),
    queryFn: () => db!.getProducts(),
    enabled: isReady && !!db,
    staleTime: 3 * 60 * 1000, // 3 minutes - products change frequently
    gcTime: 10 * 60 * 1000,
  });
};

// Note: getProduct method doesn't exist in database service
// If needed, implement getProduct in database service or use getProducts and filter
// export const useProduct = (id: number) => { ... }

// ============ CATEGORY QUERIES ============
export const useCategories = () => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.categories.lists(),
    queryFn: () => db!.getCategories(),
    enabled: isReady && !!db,
    staleTime: 15 * 60 * 1000, // 15 minutes - categories rarely change
    gcTime: 30 * 60 * 1000,
  });
};

// ============ SUPPLIER QUERIES ============
export const useSuppliers = () => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.suppliers.lists(),
    queryFn: () => db!.getSuppliers(),
    enabled: isReady && !!db,
    staleTime: 15 * 60 * 1000, // 15 minutes - suppliers rarely change
    gcTime: 30 * 60 * 1000,
  });
};

// ============ INVENTORY QUERIES ============
export const useLowStockProducts = () => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.inventory.lowStock(),
    queryFn: () => db!.getLowStockProducts(),
    enabled: isReady && !!db,
    staleTime: 1 * 60 * 1000, // 1 minute - inventory changes frequently
    gcTime: 5 * 60 * 1000,
  });
};

// ============ SALES QUERIES ============
export const useSalesAnalytics = (days: number = 30) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.sales.analytics(days),
    queryFn: () => db!.getSalesAnalytics(days),
    enabled: isReady && !!db,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,
  });
};

export const useSalesByDateRange = (
  startDate: Date,
  endDate: Date,
  limit: number = 100
) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.sales.byDateRange(startDate, endDate, limit),
    queryFn: () => db!.getSalesByDateRange(startDate, endDate, limit),
    enabled: isReady && !!db,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
  });
};

export const useSalesPaginated = (page: number, pageSize: number = 50) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.sales.paginated(page, pageSize),
    queryFn: () => db!.getSalesPaginated(page, pageSize),
    enabled: isReady && !!db,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
  });
};

export const useSalesByDateRangePaginated = (
  startDate: Date,
  endDate: Date,
  page: number,
  pageSize: number = 50
) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.sales.byDateRangePaginated(
      startDate,
      endDate,
      page,
      pageSize
    ),
    queryFn: () =>
      db!.getSalesByDateRangePaginated(startDate, endDate, page, pageSize),
    enabled: isReady && !!db,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
  });
};

export const useSaleItems = (saleId: number) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.sales.items(saleId),
    queryFn: () => db!.getSaleItems(saleId),
    enabled: isReady && !!db && saleId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - sale items don't change
    gcTime: 15 * 60 * 1000,
  });
};

// ============ ANALYTICS QUERIES ============
export const useCustomAnalytics = (startDate: Date, endDate: Date) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.analytics.custom(startDate, endDate),
    queryFn: () => db!.getCustomAnalyticsWithExpenses(startDate, endDate),
    enabled: isReady && !!db,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000,
  });
};

export const useDashboardAnalytics = () => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.analytics.dashboard(),
    queryFn: async () => {
      if (!db) return null;

      const [analyticsData, lowStockProducts, allProducts] = await Promise.all([
        db.getSalesAnalytics(30),
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

// ============ EXPENSE QUERIES ============

export const useExpensesPaginated = (
  page: number,
  filter: string,
  selectedDate?: Date
) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.expenses.paginated(page, filter, selectedDate),
    queryFn: async () => {
      if (!db) return [];

      if (filter === 'all') {
        return db.getExpensesPaginated(page, 20); // PAGE_SIZE = 20
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
            if (!selectedDate) return [];
            startDate = new Date(selectedDate);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(selectedDate);
            endDate.setHours(23, 59, 59, 999);
            break;
          default:
            return [];
        }

        return db.getExpensesByDateRangePaginated(startDate, endDate, page, 20);
      }
    },
    enabled: isReady && !!db,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
  });
};

export const useExpenseCategories = () => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.expenses.categories(),
    queryFn: () => db!.getExpenseCategories(),
    enabled: isReady && !!db,
    staleTime: 15 * 60 * 1000, // 15 minutes - categories rarely change
    gcTime: 30 * 60 * 1000,
  });
};

// ============ MUTATIONS ============
export const useProductMutations = () => {
  const queryClient = useQueryClient();
  const { db } = useDatabase();

  const addProduct = useMutation({
    mutationFn: (
      productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>
    ) => db!.addProduct(productData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    },
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Product> }) =>
      db!.updateProduct(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: (id: number) => db!.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    },
  });

  return { addProduct, updateProduct, deleteProduct };
};

export const useCategoryMutations = () => {
  const queryClient = useQueryClient();
  const { db } = useDatabase();

  const addCategory = useMutation({
    mutationFn: (categoryData: Omit<Category, 'id'>) =>
      db!.addCategory(categoryData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Category> }) =>
      db!.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: (id: number) => db!.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });

  return { addCategory, updateCategory, deleteCategory };
};

export const useSaleMutations = () => {
  const queryClient = useQueryClient();
  const { db } = useDatabase();

  const addSale = useMutation({
    mutationFn: ({
      saleData,
      saleItems,
    }: {
      saleData: any;
      saleItems: any[];
    }) => db!.addSale(saleData, saleItems),
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    },
  });

  const deleteSale = useMutation({
    mutationFn: (saleId: number) => db!.deleteSale(saleId),
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    },
  });

  return { addSale, deleteSale };
};

export const useExpenseMutations = () => {
  const queryClient = useQueryClient();
  const { db } = useDatabase();

  const addExpense = useMutation({
    mutationFn: ({
      category_id,
      amount,
      description,
      date,
    }: {
      category_id: number;
      amount: number;
      description: string;
      date: string;
    }) => db!.addExpense(category_id, amount, description, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    },
  });

  const updateExpense = useMutation({
    mutationFn: ({
      id,
      category_id,
      amount,
      description,
      date,
    }: {
      id: number;
      category_id: number;
      amount: number;
      description: string;
      date: string;
    }) => db!.updateExpense(id, category_id, amount, description, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    },
  });

  const deleteExpense = useMutation({
    mutationFn: (id: number) => db!.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    },
  });

  const addExpenseCategory = useMutation({
    mutationFn: ({
      name,
      description,
    }: {
      name: string;
      description?: string;
    }) => db!.addExpenseCategory(name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.expenses.categories(),
      });
    },
  });

  const updateExpenseCategory = useMutation({
    mutationFn: ({
      id,
      name,
      description,
    }: {
      id: number;
      name: string;
      description?: string;
    }) => db!.updateExpenseCategory(id, name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.expenses.categories(),
      });
    },
  });

  const deleteExpenseCategory = useMutation({
    mutationFn: (id: number) => db!.deleteExpenseCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.expenses.categories(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
    },
  });

  return {
    addExpense,
    updateExpense,
    deleteExpense,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
  };
};

// ============ UTILITY HOOKS ============
export const useInvalidateQueries = () => {
  const queryClient = useQueryClient();

  return {
    invalidateProducts: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all }),
    invalidateCategories: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all }),
    invalidateSuppliers: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all }),
    invalidateInventory: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
    invalidateSales: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.all }),
    invalidateAnalytics: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all }),
    invalidateExpenses: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all }),
    invalidateAll: () => queryClient.invalidateQueries(),
  };
};
