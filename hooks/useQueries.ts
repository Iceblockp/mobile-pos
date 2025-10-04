import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useDatabase } from '@/context/DatabaseContext';
import {
  Product,
  Category,
  Supplier,
  SupplierWithStats,
  SupplierProduct,
  Sale,
  Expense,
  ExpenseCategory,
  Customer,
  StockMovement,
  BulkPricing,
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
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
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
    list: (searchQuery?: string, page?: number, pageSize?: number) =>
      [
        ...queryKeys.suppliers.lists(),
        { searchQuery, page, pageSize },
      ] as const,
    details: () => [...queryKeys.suppliers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.suppliers.details(), id] as const,
    products: (supplierId: string) =>
      [...queryKeys.suppliers.all, 'products', supplierId] as const,
    analytics: (supplierId: string) =>
      [...queryKeys.suppliers.all, 'analytics', supplierId] as const,
  },

  // Customers
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (searchQuery?: string, page?: number, pageSize?: number) =>
      [
        ...queryKeys.customers.lists(),
        { searchQuery, page, pageSize },
      ] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.customers.details(), id] as const,
    purchaseHistory: (customerId: string, page?: number, pageSize?: number) =>
      [
        ...queryKeys.customers.all,
        'purchaseHistory',
        customerId,
        page,
        pageSize,
      ] as const,
    statistics: (customerId: string) =>
      [...queryKeys.customers.all, 'statistics', customerId] as const,
    analytics: () => [...queryKeys.customers.all, 'analytics'] as const,
    purchasePatterns: (customerId: string) =>
      [
        ...queryKeys.customers.analytics(),
        'purchasePatterns',
        customerId,
      ] as const,
    lifetimeValue: (customerId: string) =>
      [
        ...queryKeys.customers.analytics(),
        'lifetimeValue',
        customerId,
      ] as const,
    segmentation: () =>
      [...queryKeys.customers.analytics(), 'segmentation'] as const,
  },

  // Stock Movements
  stockMovements: {
    all: ['stockMovements'] as const,
    lists: () => [...queryKeys.stockMovements.all, 'list'] as const,
    list: (filters?: any, page?: number, pageSize?: number) =>
      [
        ...queryKeys.stockMovements.lists(),
        { filters, page, pageSize },
      ] as const,
    byProduct: (productId: string, page?: number, pageSize?: number) =>
      [
        ...queryKeys.stockMovements.all,
        'byProduct',
        productId,
        page,
        pageSize,
      ] as const,
    summary: (productId?: string, startDate?: Date, endDate?: Date) =>
      [
        ...queryKeys.stockMovements.all,
        'summary',
        productId,
        startDate?.toISOString(),
        endDate?.toISOString(),
      ] as const,
  },

  // Bulk Pricing
  bulkPricing: {
    all: ['bulkPricing'] as const,
    byProduct: (productId: string) =>
      [...queryKeys.bulkPricing.all, 'byProduct', productId] as const,
    calculation: (productId: string, quantity: number) =>
      [
        ...queryKeys.bulkPricing.all,
        'calculation',
        productId,
        quantity,
      ] as const,
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
    items: (saleId: string) =>
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
    revenueExpensesTrend: (startDate: Date, endDate: Date) =>
      [
        ...queryKeys.analytics.all,
        'revenueExpensesTrend',
        startDate.toISOString(),
        endDate.toISOString(),
      ] as const,
    profitMarginTrend: (startDate: Date, endDate: Date) =>
      [
        ...queryKeys.analytics.all,
        'profitMarginTrend',
        startDate.toISOString(),
        endDate.toISOString(),
      ] as const,
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
export const useProducts = (includeBulkPricing: boolean = false) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: [...queryKeys.products.lists(), { includeBulkPricing }],
    queryFn: () =>
      includeBulkPricing ? db!.getProductsWithBulkPricing() : db!.getProducts(),
    enabled: isReady && !!db,
    staleTime: 3 * 60 * 1000, // 3 minutes - products change frequently
    gcTime: 10 * 60 * 1000,
  });
};

// Note: getProduct method doesn't exist in database service
// If needed, implement getProduct in database service or use getProducts and filter
// export const useProduct = (id: string) => { ... }

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
export const useSuppliers = (
  searchQuery?: string,
  page: number = 1,
  pageSize: number = 50
) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.suppliers.list(searchQuery, page, pageSize),
    queryFn: () => db!.getSuppliersWithStats(searchQuery, page, pageSize),
    enabled: isReady && !!db,
    staleTime: 15 * 60 * 1000, // 15 minutes - suppliers rarely change
    gcTime: 30 * 60 * 1000,
  });
};

// Basic suppliers list (for dropdowns, etc.)
export const useBasicSuppliers = () => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.suppliers.lists(),
    queryFn: () => db!.getSuppliers(),
    enabled: isReady && !!db,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useSupplier = (id: string) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.suppliers.detail(id),
    queryFn: () => db!.getSupplierById(id),
    enabled: isReady && !!db && id.length > 0,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useSupplierProducts = (supplierId: string) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.suppliers.products(supplierId),
    queryFn: () => db!.getSupplierProducts(supplierId),
    enabled: isReady && !!db && supplierId.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - product data changes more frequently
    gcTime: 15 * 60 * 1000,
  });
};

export const useSupplierAnalytics = (supplierId: string) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.suppliers.analytics(supplierId),
    queryFn: () => db!.getSupplierAnalytics(supplierId),
    enabled: isReady && !!db && supplierId.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - analytics data changes frequently
    gcTime: 15 * 60 * 1000,
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

export const useSaleItems = (saleId: string) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.sales.items(saleId),
    queryFn: () => db!.getSaleItems(saleId),
    enabled: isReady && !!db && saleId.length > 0,
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

export const useRevenueExpensesTrend = (startDate: Date, endDate: Date) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.analytics.revenueExpensesTrend(startDate, endDate),
    queryFn: () => db!.getRevenueExpensesTrend(startDate, endDate),
    enabled: isReady && !!db,
    staleTime: 2 * 60 * 1000, // 2 minutes - shorter for real-time updates
    gcTime: 10 * 60 * 1000,
  });
};

export const useProfitMarginTrend = (startDate: Date, endDate: Date) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.analytics.profitMarginTrend(startDate, endDate),
    queryFn: () => db!.getProfitMarginTrend(startDate, endDate),
    enabled: isReady && !!db,
    staleTime: 2 * 60 * 1000, // 2 minutes - shorter for real-time updates
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
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
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
    mutationFn: (id: string) => db!.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    },
  });

  const updateProductWithBulkPricing = useMutation({
    mutationFn: async ({
      id,
      productData,
      bulkPricingTiers,
    }: {
      id: string;
      productData: Partial<Product>;
      bulkPricingTiers?: Array<{ min_quantity: number; bulk_price: number }>;
    }) => {
      // Update product first
      await db!.updateProduct(id, productData);

      // If bulk pricing tiers are provided, update them
      if (bulkPricingTiers) {
        // First validate the tiers
        await db!.validateBulkPricingTiers(id, bulkPricingTiers);

        // Delete existing bulk pricing for this product
        const existingTiers = await db!.getBulkPricingForProduct(id);
        for (const tier of existingTiers) {
          await db!.deleteBulkPricing(tier.id);
        }

        // Add new bulk pricing tiers
        for (const tier of bulkPricingTiers) {
          await db!.addBulkPricing({
            product_id: id,
            min_quantity: tier.min_quantity,
            bulk_price: tier.bulk_price,
          });
        }
      }
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.bulkPricing.byProduct(id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    },
  });

  return {
    addProduct,
    updateProduct,
    deleteProduct,
    updateProductWithBulkPricing,
  };
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
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) =>
      db!.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => db!.deleteCategory(id),
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
      // Invalidate all related queries including chart data
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });

      // Force refresh chart data immediately
      queryClient.refetchQueries({
        queryKey: queryKeys.analytics.all,
        type: 'active',
      });
    },
  });

  const deleteSale = useMutation({
    mutationFn: (saleId: string) => db!.deleteSale(saleId),
    onSuccess: () => {
      // Invalidate all related queries including chart data
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });

      // Force refresh chart data immediately
      queryClient.refetchQueries({
        queryKey: queryKeys.analytics.all,
        type: 'active',
      });
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
      category_id: string;
      amount: number;
      description: string;
      date: string;
    }) => db!.addExpense(category_id, amount, description, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });

      // Force refresh chart data immediately
      queryClient.refetchQueries({
        queryKey: queryKeys.analytics.all,
        type: 'active',
      });
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
      id: string;
      category_id: string;
      amount: number;
      description: string;
      date: string;
    }) => db!.updateExpense(id, category_id, amount, description, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });

      // Force refresh chart data immediately
      queryClient.refetchQueries({
        queryKey: queryKeys.analytics.all,
        type: 'active',
      });
    },
  });

  const deleteExpense = useMutation({
    mutationFn: (id: string) => db!.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });

      // Force refresh chart data immediately
      queryClient.refetchQueries({
        queryKey: queryKeys.analytics.all,
        type: 'active',
      });
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
      id: string;
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
    mutationFn: (id: string) => db!.deleteExpenseCategory(id),
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

// ============ CUSTOMER QUERIES ============
export const useCustomers = (
  searchQuery?: string,
  page: number = 1,
  pageSize: number = 50
) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.customers.list(searchQuery, page, pageSize),
    queryFn: () => db!.getCustomers(searchQuery, page, pageSize),
    enabled: isReady && !!db,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    refetchOnWindowFocus: false, // Don't refetch on window focus for better performance
  });
};

export const useCustomer = (id: string) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => db!.getCustomerById(id),
    enabled: isReady && !!db && id.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCustomerPurchaseHistory = (
  customerId: string,
  page: number = 1,
  pageSize: number = 20
) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.customers.purchaseHistory(customerId, page, pageSize),
    queryFn: () => db!.getCustomerPurchaseHistory(customerId, page, pageSize),
    enabled: isReady && !!db && customerId.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useCustomerStatistics = (customerId: string) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.customers.statistics(customerId),
    queryFn: () => db!.getCustomerStatistics(customerId),
    enabled: isReady && !!db && customerId.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCustomerMutations = () => {
  const queryClient = useQueryClient();
  const { db } = useDatabase();

  const addCustomer = useMutation({
    mutationFn: (customer: {
      name: string;
      phone?: string;
      email?: string;
      address?: string;
    }) => db!.addCustomer(customer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });

  const updateCustomer = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) =>
      db!.updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });

  const deleteCustomer = useMutation({
    mutationFn: (id: string) => db!.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });

  return {
    addCustomer,
    updateCustomer,
    deleteCustomer,
  };
};

// ============ CUSTOMER ANALYTICS QUERIES ============
export const useCustomerPurchasePatterns = (customerId: string) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.customers.purchasePatterns(customerId),
    queryFn: () => db!.getCustomerPurchasePatterns(customerId),
    enabled: isReady && !!db && customerId.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useCustomerLifetimeValue = (customerId: string) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.customers.lifetimeValue(customerId),
    queryFn: () => db!.calculateCustomerLifetimeValue(customerId),
    enabled: isReady && !!db && customerId.length > 0,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

export const useCustomerSegmentation = () => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.customers.segmentation(),
    queryFn: () => db!.getCustomerSegmentation(),
    enabled: isReady && !!db,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useCustomerAnalytics = (startDate: Date, endDate: Date) => {
  const { db, isReady } = useDatabase();

  // Create stable query key by using date strings rounded to the day
  const startDateKey = startDate.toISOString().split('T')[0];
  const endDateKey = endDate.toISOString().split('T')[0];

  return useQuery({
    queryKey: ['customerAnalytics', startDateKey, endDateKey],
    queryFn: () => db!.getCustomerAnalytics(startDate, endDate),
    enabled: isReady && !!db,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// ============ STOCK MOVEMENT ANALYTICS QUERIES ============
export const useStockMovementTrends = (startDate?: Date, endDate?: Date) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: [
      'stockMovementTrends',
      startDate?.toISOString(),
      endDate?.toISOString(),
    ],
    queryFn: () => db!.getStockMovementTrends(startDate, endDate),
    enabled: isReady && !!db,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useStockTurnoverRates = () => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: ['stockTurnoverRates'],
    queryFn: () => db!.calculateStockTurnoverRates(),
    enabled: isReady && !!db,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useLowStockPrediction = () => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: ['lowStockPrediction'],
    queryFn: () => db!.predictLowStockItems(),
    enabled: isReady && !!db,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

export const useStockMovementReport = (
  startDate?: Date,
  endDate?: Date,
  productId?: string
) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: [
      'stockMovementReport',
      startDate?.toISOString(),
      endDate?.toISOString(),
      productId,
    ],
    queryFn: () => db!.getStockMovementReport(startDate, endDate, productId),
    enabled: isReady && !!db,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ============ BULK PRICING ANALYTICS QUERIES ============
export const useBulkPricingInsights = () => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: ['bulkPricingInsights'],
    queryFn: () => db!.getBulkPricingInsights(),
    enabled: isReady && !!db,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

export const useBulkPricingOptimization = () => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: ['bulkPricingOptimization'],
    queryFn: () => db!.getBulkPricingOptimizationSuggestions(),
    enabled: isReady && !!db,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useBulkPricingPerformance = (startDate?: Date, endDate?: Date) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: [
      'bulkPricingPerformance',
      startDate?.toISOString(),
      endDate?.toISOString(),
    ],
    queryFn: () => db!.getBulkPricingPerformanceMetrics(startDate, endDate),
    enabled: isReady && !!db,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// ============ STOCK MOVEMENT QUERIES ============
export const useStockMovements = (
  filters?: {
    productId?: string;
    type?: 'stock_in' | 'stock_out';
    startDate?: Date;
    endDate?: Date;
    supplierId?: string;
  },
  page: number = 1,
  pageSize: number = 50
) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.stockMovements.list(filters, page, pageSize),
    queryFn: () => db!.getStockMovements(filters, page, pageSize),
    enabled: isReady && !!db,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000, // 3 minutes garbage collection
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
};

export const useStockMovementsByProduct = (
  productId: string,
  page: number = 1,
  pageSize: number = 20
) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.stockMovements.byProduct(productId, page, pageSize),
    queryFn: () => db!.getStockMovementsByProduct(productId, page, pageSize),
    enabled: isReady && !!db && productId.length > 0,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useStockMovementSummary = (
  productId?: string,
  startDate?: Date,
  endDate?: Date
) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.stockMovements.summary(productId, startDate, endDate),
    queryFn: () => db!.getStockMovementSummary(productId, startDate, endDate),
    enabled: isReady && !!db,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useProductStockSummary = (productId: string) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: [...queryKeys.products.detail(productId), 'stockSummary'],
    queryFn: async () => {
      const [product, stockSummary] = await Promise.all([
        db!
          .getProducts()
          .then((products) => products.find((p) => p.id === productId)),
        db!.getStockMovementSummary(productId),
      ]);
      return { product, stockSummary };
    },
    enabled: isReady && !!db && productId.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useStockMovementMutations = () => {
  const queryClient = useQueryClient();
  const { db } = useDatabase();

  const addStockMovement = useMutation({
    mutationFn: (movement: {
      product_id: string;
      type: 'stock_in' | 'stock_out';
      quantity: number;
      reason?: string;
      supplier_id?: string;
      reference_number?: string;
      unit_cost?: number;
    }) => db!.addStockMovement(movement),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stockMovements.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });

  const updateProductQuantityWithMovement = useMutation({
    mutationFn: ({
      productId,
      movementType,
      quantity,
      reason,
      supplierId,
      referenceNumber,
      unitCost,
    }: {
      productId: string;
      movementType: 'stock_in' | 'stock_out';
      quantity: number;
      reason?: string;
      supplierId?: string;
      referenceNumber?: string;
      unitCost?: number;
    }) =>
      db!.updateProductQuantityWithMovement(
        productId,
        movementType,
        quantity,
        reason,
        supplierId,
        referenceNumber,
        unitCost
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stockMovements.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });

  return {
    addStockMovement,
    updateProductQuantityWithMovement,
  };
};

// ============ BULK PRICING QUERIES ============
export const useBulkPricing = (productId: string) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.bulkPricing.byProduct(productId),
    queryFn: () => db!.getBulkPricingForProduct(productId),
    enabled: isReady && !!db && productId.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - longer cache for bulk pricing
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
};

export const useBulkPriceCalculation = (
  productId: string,
  quantity: number
) => {
  const { db, isReady } = useDatabase();

  return useQuery({
    queryKey: queryKeys.bulkPricing.calculation(productId, quantity),
    queryFn: () => db!.calculateBestPrice(productId, quantity),
    enabled: isReady && !!db && productId.length > 0 && quantity > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes - cache calculations longer
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
};

export const useBulkPricingMutations = () => {
  const queryClient = useQueryClient();
  const { db } = useDatabase();

  const addBulkPricing = useMutation({
    mutationFn: (bulkPricing: {
      product_id: string;
      min_quantity: number;
      bulk_price: number;
    }) => db!.addBulkPricing(bulkPricing),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.bulkPricing.byProduct(variables.product_id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });

  const updateBulkPricing = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BulkPricing> }) =>
      db!.updateBulkPricing(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bulkPricing.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });

  const deleteBulkPricing = useMutation({
    mutationFn: (id: string) => db!.deleteBulkPricing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bulkPricing.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });

  const validateBulkPricingTiers = useMutation({
    mutationFn: ({
      productId,
      tiers,
    }: {
      productId: string;
      tiers: Array<{
        min_quantity: number;
        bulk_price: number;
      }>;
    }) => db!.validateBulkPricingTiers(productId, tiers),
  });

  return {
    addBulkPricing,
    updateBulkPricing,
    deleteBulkPricing,
    validateBulkPricingTiers,
  };
};

export const useSupplierMutations = () => {
  const queryClient = useQueryClient();
  const { db } = useDatabase();

  const addSupplier = useMutation({
    mutationFn: (supplier: {
      name: string;
      contact_name: string;
      phone: string;
      email?: string;
      address: string;
    }) => db!.addSupplier(supplier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
    },
  });

  const updateSupplier = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Supplier> }) =>
      db!.updateSupplier(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.products(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.analytics(variables.id),
      });
    },
  });

  const deleteSupplier = useMutation({
    mutationFn: (id: string) => db!.deleteSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stockMovements.all });
    },
  });

  return {
    addSupplier,
    updateSupplier,
    deleteSupplier,
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
    invalidateCustomers: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all }),
    invalidateStockMovements: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.stockMovements.all }),
    invalidateBulkPricing: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.bulkPricing.all }),
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
