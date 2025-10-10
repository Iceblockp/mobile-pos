import { AIAnalyticsService } from '../../services/aiAnalyticsService';
import { DatabaseService } from '../../services/database';

// Mock dependencies
jest.mock('../../services/apiKeyManager');
jest.mock('../../services/dataExportService');
jest.mock('../../services/database');

// Mock fetch
global.fetch = jest.fn();

describe('AI Analytics Data Integration', () => {
  let aiAnalyticsService: AIAnalyticsService;
  let mockDatabaseService: jest.Mocked<DatabaseService>;

  const mockData = {
    products: [
      { id: '1', name: 'Product 1', price: 1000, cost: 500, stock: 10 },
      { id: '2', name: 'Product 2', price: 2000, cost: 1000, stock: 5 },
    ],
    categories: [{ id: '1', name: 'Category 1' }],
    suppliers: [{ id: '1', name: 'Supplier 1', phone: '123456789' }],
    customers: [{ id: '1', name: 'Customer 1', phone: '987654321' }],
    sales: [
      {
        id: '1',
        customerId: '1',
        total: 3000,
        createdAt: new Date().toISOString(),
        items: [
          { productId: '1', quantity: 2, price: 1000 },
          { productId: '2', quantity: 1, price: 2000 },
        ],
      },
    ],
    expenses: [
      { id: '1', amount: 500, description: 'Office supplies', categoryId: '1' },
    ],
    stockMovements: [
      {
        id: '1',
        productId: '1',
        type: 'in',
        quantity: 10,
        reason: 'Initial stock',
      },
    ],
  };

  beforeEach(() => {
    aiAnalyticsService = AIAnalyticsService.getInstance();
    mockDatabaseService =
      DatabaseService.getInstance() as jest.Mocked<DatabaseService>;

    // Setup database mocks
    mockDatabaseService.getProducts.mockResolvedValue(mockData.products);
    mockDatabaseService.getCategories.mockResolvedValue(mockData.categories);
    mockDatabaseService.getSuppliers.mockResolvedValue(mockData.suppliers);
    mockDatabaseService.getCustomers.mockResolvedValue(mockData.customers);
    mockDatabaseService.getSalesByDateRange.mockResolvedValue(mockData.sales);
    mockDatabaseService.getSaleItems.mockResolvedValue(mockData.sales[0].items);
    mockDatabaseService.getExpensesByDateRange.mockResolvedValue(
      mockData.expenses
    );
    mockDatabaseService.getStockMovements.mockResolvedValue(
      mockData.stockMovements
    );

    jest.clearAllMocks();
  });

  describe('getShopData', () => {
    it('should retrieve and format shop data correctly', async () => {
      // Access the private method for testing
      const getShopData = (aiAnalyticsService as any).getShopData.bind(
        aiAnalyticsService
      );

      const shopData = await getShopData();

      expect(shopData).toHaveProperty('products');
      expect(shopData).toHaveProperty('sales');
      expect(shopData).toHaveProperty('customers');
      expect(shopData).toHaveProperty('suppliers');
      expect(shopData).toHaveProperty('expenses');
      expect(shopData).toHaveProperty('stockMovements');
      expect(shopData).toHaveProperty('metadata');

      expect(shopData.products).toHaveLength(2);
      expect(shopData.sales).toHaveLength(1);
      expect(shopData.customers).toHaveLength(1);
      expect(shopData.metadata.totalRecords).toBeGreaterThan(0);
    });

    it('should include sales with items', async () => {
      const getShopData = (aiAnalyticsService as any).getShopData.bind(
        aiAnalyticsService
      );

      const shopData = await getShopData();

      expect(shopData.sales[0]).toHaveProperty('items');
      expect(shopData.sales[0].items).toHaveLength(2);
      expect(shopData.sales[0].items[0]).toHaveProperty('productId');
      expect(shopData.sales[0].items[0]).toHaveProperty('quantity');
    });

    it('should limit data for performance', async () => {
      // Mock large dataset
      const largeSalesData = Array.from({ length: 100 }, (_, i) => ({
        id: `sale-${i}`,
        customerId: '1',
        total: 1000,
        createdAt: new Date().toISOString(),
      }));

      mockDatabaseService.getSalesByDateRange.mockResolvedValue(largeSalesData);

      const getShopData = (aiAnalyticsService as any).getShopData.bind(
        aiAnalyticsService
      );

      const shopData = await getShopData();

      // Should limit to 50 sales with items for AI analysis
      expect(mockDatabaseService.getSaleItems).toHaveBeenCalledTimes(50);
    });

    it('should handle database errors gracefully', async () => {
      mockDatabaseService.getProducts.mockRejectedValue(
        new Error('Database error')
      );

      const getShopData = (aiAnalyticsService as any).getShopData.bind(
        aiAnalyticsService
      );

      await expect(getShopData()).rejects.toThrow(
        'Failed to retrieve shop data'
      );
    });

    it('should use recent data for analysis', async () => {
      const getShopData = (aiAnalyticsService as any).getShopData.bind(
        aiAnalyticsService
      );

      await getShopData();

      // Should call getSalesByDateRange with date range (last 3 months)
      expect(mockDatabaseService.getSalesByDateRange).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        200 // Limit
      );

      // Check that start date is approximately 3 months ago
      const [startDate] = mockDatabaseService.getSalesByDateRange.mock.calls[0];
      const monthsAgo = Math.round(
        (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      expect(monthsAgo).toBeCloseTo(3, 1);
    });
  });

  describe('formatDataForAI', () => {
    it('should format shop data for AI consumption', async () => {
      const getShopData = (aiAnalyticsService as any).getShopData.bind(
        aiAnalyticsService
      );
      const shopData = await getShopData();

      const formattedData = aiAnalyticsService.formatDataForAI(shopData);
      const parsed = JSON.parse(formattedData);

      expect(parsed).toHaveProperty('metadata');
      expect(parsed).toHaveProperty('summary');
      expect(parsed).toHaveProperty('topProducts');
      expect(parsed).toHaveProperty('lowStockProducts');
      expect(parsed).toHaveProperty('customerSummary');
      expect(parsed).toHaveProperty('recentSales');
      expect(parsed).toHaveProperty('recentExpenses');
    });

    it('should include summary statistics', async () => {
      const getShopData = (aiAnalyticsService as any).getShopData.bind(
        aiAnalyticsService
      );
      const shopData = await getShopData();

      const formattedData = aiAnalyticsService.formatDataForAI(shopData);
      const parsed = JSON.parse(formattedData);

      expect(parsed.summary.totalProducts).toBe(2);
      expect(parsed.summary.totalSales).toBe(1);
      expect(parsed.summary.totalCustomers).toBe(1);
      expect(parsed.summary.totalSuppliers).toBe(1);
      expect(parsed.summary.totalExpenses).toBe(1);
      expect(parsed.summary.totalStockMovements).toBe(1);
    });

    it('should identify top products correctly', async () => {
      const getShopData = (aiAnalyticsService as any).getShopData.bind(
        aiAnalyticsService
      );
      const shopData = await getShopData();

      const formattedData = aiAnalyticsService.formatDataForAI(shopData);
      const parsed = JSON.parse(formattedData);

      expect(parsed.topProducts).toHaveLength(2);
      expect(parsed.topProducts[0]).toHaveProperty('productName');
      expect(parsed.topProducts[0]).toHaveProperty('totalSold');
    });

    it('should identify low stock products', async () => {
      // Add a low stock product
      const lowStockProduct = {
        id: '3',
        name: 'Low Stock Product',
        stock: 2,
        minStock: 5,
      };
      mockDatabaseService.getProducts.mockResolvedValue([
        ...mockData.products,
        lowStockProduct,
      ]);

      const getShopData = (aiAnalyticsService as any).getShopData.bind(
        aiAnalyticsService
      );
      const shopData = await getShopData();

      const formattedData = aiAnalyticsService.formatDataForAI(shopData);
      const parsed = JSON.parse(formattedData);

      expect(parsed.lowStockProducts).toHaveLength(1);
      expect(parsed.lowStockProducts[0].name).toBe('Low Stock Product');
      expect(parsed.lowStockProducts[0].currentStock).toBe(2);
      expect(parsed.lowStockProducts[0].minStock).toBe(5);
    });
  });
});
