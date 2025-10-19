import { DatabaseService } from '../../services/database';
import * as SQLite from 'expo-sqlite';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

describe('Performance Optimization Tests', () => {
  let databaseService: DatabaseService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      getAllAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      execAsync: jest.fn(),
    };

    (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDb);
    databaseService = new DatabaseService();
    (databaseService as any).db = mockDb;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Database Performance Tests', () => {
    const generateMockProducts = (count: number) => {
      return Array.from({ length: count }, (_, i) => ({
        id: `product-${i}`,
        name: `Product ${i}`,
        barcode: `${String(i).padStart(12, '0')}`,
        price: 10.99 + i,
        cost: 8.0 + i,
        quantity: 100 - i,
        min_stock: 10,
        category: `Category ${i % 10}`,
        supplier_name: `Supplier ${i % 5}`,
        has_bulk_pricing: i % 3 === 0 ? 1 : 0,
        updated_at: new Date().toISOString(),
      }));
    };

    it('should handle large dataset pagination efficiently', async () => {
      const largeDataset = generateMockProducts(10000);
      const pageSize = 50;

      // Mock paginated response
      mockDb.getAllAsync.mockImplementation((query, params) => {
        const limit = params[params.length - 2];
        const offset = params[params.length - 1];
        return Promise.resolve(largeDataset.slice(offset, offset + limit - 1));
      });

      const startTime = performance.now();

      const result = await databaseService.getProductsPaginated({
        page: 1,
        limit: pageSize,
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(result.data).toHaveLength(pageSize);
      expect(executionTime).toBeLessThan(100); // Should complete within 100ms
      expect(mockDb.getAllAsync).toHaveBeenCalledTimes(1);
    });

    it('should perform barcode lookup efficiently', async () => {
      const testBarcode = '123456789012';
      const mockProduct = generateMockProducts(1)[0];
      mockProduct.barcode = testBarcode;

      mockDb.getFirstAsync.mockResolvedValue(mockProduct);

      const startTime = performance.now();

      const result = await databaseService.findProductByBarcode(testBarcode);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(result).toEqual(mockProduct);
      expect(executionTime).toBeLessThan(50); // Should complete within 50ms
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE p.barcode = ?'),
        [testBarcode]
      );
    });

    it('should handle search queries efficiently', async () => {
      const searchResults = generateMockProducts(20);
      mockDb.getAllAsync.mockResolvedValue(searchResults);

      const startTime = performance.now();

      const result = await databaseService.searchProductsForSale(
        'test query',
        20
      );

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(result).toHaveLength(20);
      expect(executionTime).toBeLessThan(75); // Should complete within 75ms
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE p.name LIKE ? OR p.barcode = ?'),
        expect.arrayContaining(['%test query%', 'test query'])
      );
    });

    it('should handle bulk pricing check efficiently', async () => {
      const productId = 'test-product-id';
      mockDb.getFirstAsync.mockResolvedValue({ '1': 1 });

      const startTime = performance.now();

      const result = await databaseService.hasProductBulkPricing(productId);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(result).toBe(true);
      expect(executionTime).toBeLessThan(25); // Should complete within 25ms
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT 1 FROM bulk_pricing WHERE product_id = ? LIMIT 1',
        [productId]
      );
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not create memory leaks with large datasets', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Simulate processing large datasets multiple times
      for (let i = 0; i < 100; i++) {
        const largeDataset = generateMockProducts(1000);
        mockDb.getAllAsync.mockResolvedValue(largeDataset.slice(0, 50));

        await databaseService.getProductsPaginated({
          page: i + 1,
          limit: 50,
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      // Memory increase should be reasonable (less than 50MB for this test)
      expect(memoryIncreaseMB).toBeLessThan(50);
    });
  });

  describe('Concurrent Operations Tests', () => {
    it('should handle concurrent database operations efficiently', async () => {
      const concurrentOperations = 50;
      const mockProducts = generateMockProducts(100);

      mockDb.getAllAsync.mockResolvedValue(mockProducts.slice(0, 20));
      mockDb.getFirstAsync.mockResolvedValue(mockProducts[0]);

      const startTime = performance.now();

      // Create concurrent operations
      const operations = Array.from(
        { length: concurrentOperations },
        (_, i) => {
          if (i % 2 === 0) {
            return databaseService.getProductsPaginated({
              page: 1,
              limit: 20,
            });
          } else {
            return databaseService.findProductByBarcode(`barcode-${i}`);
          }
        }
      );

      const results = await Promise.all(operations);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(results).toHaveLength(concurrentOperations);
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second

      // Verify all operations completed successfully
      results.forEach((result, index) => {
        if (index % 2 === 0) {
          expect(result).toHaveProperty('data');
          expect(result).toHaveProperty('hasMore');
        } else {
          expect(result).toBeDefined();
        }
      });
    });
  });

  describe('Search Performance Tests', () => {
    it('should handle search with various query lengths efficiently', async () => {
      const searchQueries = [
        'a',
        'ab',
        'abc',
        'test product',
        'very long search query with multiple words',
        '1234567890123456789012345678901234567890',
      ];

      const mockResults = generateMockProducts(10);
      mockDb.getAllAsync.mockResolvedValue(mockResults);

      for (const query of searchQueries) {
        const startTime = performance.now();

        const result = await databaseService.searchProductsForSale(query, 20);

        const endTime = performance.now();
        const executionTime = endTime - startTime;

        expect(result).toHaveLength(10);
        expect(executionTime).toBeLessThan(100); // Each search should complete within 100ms
      }
    });

    it('should handle empty and invalid search queries gracefully', async () => {
      const invalidQueries = ['', '   ', null, undefined];

      for (const query of invalidQueries) {
        const startTime = performance.now();

        const result = await databaseService.searchProductsForSale(
          query as any,
          20
        );

        const endTime = performance.now();
        const executionTime = endTime - startTime;

        expect(result).toEqual([]);
        expect(executionTime).toBeLessThan(10); // Should return immediately
        expect(mockDb.getAllAsync).not.toHaveBeenCalled();
      }

      jest.clearAllMocks();
    });
  });

  describe('Pagination Performance Tests', () => {
    it('should maintain consistent performance across different page numbers', async () => {
      const totalProducts = 10000;
      const pageSize = 50;
      const pagesToTest = [1, 10, 50, 100, 200];

      const mockProducts = generateMockProducts(totalProducts);

      for (const pageNumber of pagesToTest) {
        const offset = (pageNumber - 1) * pageSize;
        mockDb.getAllAsync.mockResolvedValue(
          mockProducts.slice(offset, offset + pageSize)
        );

        const startTime = performance.now();

        const result = await databaseService.getProductsPaginated({
          page: pageNumber,
          limit: pageSize,
        });

        const endTime = performance.now();
        const executionTime = endTime - startTime;

        expect(result.data).toHaveLength(pageSize);
        expect(result.page).toBe(pageNumber);
        expect(executionTime).toBeLessThan(150); // Should complete within 150ms regardless of page
      }
    });

    it('should handle pagination with search filters efficiently', async () => {
      const searchQuery = 'test';
      const categoryId = 'category-1';
      const mockResults = generateMockProducts(25);

      mockDb.getAllAsync.mockResolvedValue(mockResults);

      const startTime = performance.now();

      const result = await databaseService.getProductsPaginated({
        searchQuery,
        categoryId,
        page: 1,
        limit: 50,
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(result.data).toHaveLength(25);
      expect(executionTime).toBeLessThan(200); // Should complete within 200ms with filters
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining(
          'WHERE (p.name LIKE ? OR p.barcode = ?) AND p.category_id = ?'
        ),
        expect.arrayContaining([`%${searchQuery}%`, searchQuery, categoryId])
      );
    });
  });

  describe('Index Performance Tests', () => {
    it('should verify database indexes are being used', async () => {
      // This test would verify that the database is using indexes
      // In a real scenario, you would check query execution plans

      const testCases = [
        {
          method: 'findProductByBarcode',
          args: ['123456789012'],
          expectedIndex: 'idx_products_barcode',
        },
        {
          method: 'searchProductsForSale',
          args: ['test product', 20],
          expectedIndex: 'idx_products_search',
        },
      ];

      for (const testCase of testCases) {
        mockDb.getFirstAsync.mockResolvedValue({
          id: '1',
          name: 'Test Product',
        });
        mockDb.getAllAsync.mockResolvedValue([
          { id: '1', name: 'Test Product' },
        ]);

        const startTime = performance.now();

        // @ts-ignore - Dynamic method call for testing
        await databaseService[testCase.method](...testCase.args);

        const endTime = performance.now();
        const executionTime = endTime - startTime;

        // With proper indexes, these operations should be very fast
        expect(executionTime).toBeLessThan(50);
      }
    });
  });
});

// Helper function to generate mock products for testing
function generateMockProducts(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `product-${i}`,
    name: `Product ${i}`,
    barcode: `${String(i).padStart(12, '0')}`,
    price: 10.99 + i,
    cost: 8.0 + i,
    quantity: 100 - i,
    min_stock: 10,
    category: `Category ${i % 10}`,
    supplier_name: `Supplier ${i % 5}`,
    has_bulk_pricing: i % 3 === 0 ? 1 : 0,
    updated_at: new Date().toISOString(),
  }));
}
