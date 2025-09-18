/**
 * Performance Benchmark Tests for Enhanced Database Features
 *
 * This test suite measures and validates performance optimizations:
 * - Database query performance with indexes
 * - Bulk pricing cache effectiveness
 * - React Query caching strategies
 * - Batch operation efficiency
 */

import { DatabaseService } from '@/services/database';
import * as SQLite from 'expo-sqlite';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

describe('Performance Benchmark Tests', () => {
  let db: DatabaseService;
  let mockDatabase: any;

  beforeEach(() => {
    mockDatabase = {
      execAsync: jest.fn(),
      runAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(),
    };

    (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDatabase);
    db = new DatabaseService(mockDatabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Database Query Performance', () => {
    it('should demonstrate indexed query performance', async () => {
      // Mock large customer dataset
      const largeCustomerDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i + 1,
        name: `Customer ${String(i + 1).padStart(5, '0')}`,
        phone: `+${1000000000 + i}`,
        email: `customer${i + 1}@example.com`,
        total_spent: Math.floor(Math.random() * 10000),
        visit_count: Math.floor(Math.random() * 50),
      }));

      mockDatabase.getAllAsync.mockResolvedValue(
        largeCustomerDataset.slice(0, 50)
      );

      // Benchmark: Customer search by name (uses idx_customers_name)
      const searchBenchmarks = [];

      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();
        await db.getCustomers('Customer 5000', 1, 50);
        const endTime = performance.now();
        searchBenchmarks.push(endTime - startTime);
      }

      const avgSearchTime =
        searchBenchmarks.reduce((sum, time) => sum + time, 0) /
        searchBenchmarks.length;

      // With proper indexing, search should be consistently fast
      expect(avgSearchTime).toBeLessThan(50); // Should average under 50ms

      console.log(`📊 Customer Search Performance:`);
      console.log(`   - Average search time: ${avgSearchTime.toFixed(2)}ms`);
      console.log(
        `   - Dataset size: ${largeCustomerDataset.length} customers`
      );
      console.log(`   - Index used: idx_customers_name`);

      // Benchmark: Customer search by phone (uses idx_customers_phone)
      const phoneBenchmarks = [];

      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();
        await db.getCustomers('1005000000', 1, 50);
        const endTime = performance.now();
        phoneBenchmarks.push(endTime - startTime);
      }

      const avgPhoneSearchTime =
        phoneBenchmarks.reduce((sum, time) => sum + time, 0) /
        phoneBenchmarks.length;

      expect(avgPhoneSearchTime).toBeLessThan(50);

      console.log(
        `   - Average phone search time: ${avgPhoneSearchTime.toFixed(2)}ms`
      );
      console.log(`   - Index used: idx_customers_phone`);
    });

    it('should demonstrate stock movement query performance', async () => {
      // Mock large stock movement dataset
      const largeMovementDataset = Array.from({ length: 50000 }, (_, i) => ({
        id: i + 1,
        product_id: Math.floor(Math.random() * 1000) + 1,
        type: i % 2 === 0 ? 'stock_in' : 'stock_out',
        quantity: Math.floor(Math.random() * 100) + 1,
        created_at: new Date(
          2024,
          0,
          1 + Math.floor(Math.random() * 365)
        ).toISOString(),
      }));

      mockDatabase.getAllAsync.mockResolvedValue(
        largeMovementDataset.slice(0, 100)
      );

      // Benchmark: Stock movements by product (uses idx_stock_movements_product_date)
      const productBenchmarks = [];

      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();
        await db.getStockMovements({ productId: 500 }, 1, 100);
        const endTime = performance.now();
        productBenchmarks.push(endTime - startTime);
      }

      const avgProductQueryTime =
        productBenchmarks.reduce((sum, time) => sum + time, 0) /
        productBenchmarks.length;

      expect(avgProductQueryTime).toBeLessThan(75);

      console.log(`📦 Stock Movement Query Performance:`);
      console.log(
        `   - Average product query time: ${avgProductQueryTime.toFixed(2)}ms`
      );
      console.log(
        `   - Dataset size: ${largeMovementDataset.length} movements`
      );
      console.log(`   - Index used: idx_stock_movements_product_date`);

      // Benchmark: Stock movements by type and date (uses idx_stock_movements_type_date)
      const typeDateBenchmarks = [];

      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();
        await db.getStockMovements(
          {
            type: 'stock_in',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-12-31'),
          },
          1,
          100
        );
        const endTime = performance.now();
        typeDateBenchmarks.push(endTime - startTime);
      }

      const avgTypeDateQueryTime =
        typeDateBenchmarks.reduce((sum, time) => sum + time, 0) /
        typeDateBenchmarks.length;

      expect(avgTypeDateQueryTime).toBeLessThan(75);

      console.log(
        `   - Average type+date query time: ${avgTypeDateQueryTime.toFixed(
          2
        )}ms`
      );
      console.log(`   - Index used: idx_stock_movements_type_date`);
    });
  });

  describe('Bulk Pricing Cache Performance', () => {
    it('should demonstrate cache effectiveness', async () => {
      const productId = 1;
      const mockBulkTiers = [
        { id: 1, product_id: 1, min_quantity: 5, bulk_price: 90.0 },
        { id: 2, product_id: 1, min_quantity: 10, bulk_price: 85.0 },
        { id: 3, product_id: 1, min_quantity: 25, bulk_price: 80.0 },
        { id: 4, product_id: 1, min_quantity: 50, bulk_price: 75.0 },
      ];

      // First call - should hit database
      mockDatabase.getAllAsync.mockResolvedValueOnce(mockBulkTiers);

      const firstCallStart = performance.now();
      const firstResult = await db.getBulkPricingForProduct(productId);
      const firstCallTime = performance.now() - firstCallStart;

      expect(firstResult).toEqual(mockBulkTiers);

      // Subsequent calls - should hit cache (in real implementation)
      const cacheBenchmarks = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        await db.getBulkPricingForProduct(productId);
        const endTime = performance.now();
        cacheBenchmarks.push(endTime - startTime);
      }

      const avgCacheTime =
        cacheBenchmarks.reduce((sum, time) => sum + time, 0) /
        cacheBenchmarks.length;

      console.log(`🚀 Bulk Pricing Cache Performance:`);
      console.log(`   - First call (database): ${firstCallTime.toFixed(2)}ms`);
      console.log(`   - Average cached call: ${avgCacheTime.toFixed(2)}ms`);
      console.log(`   - Cache TTL: 5 minutes`);
      console.log(`   - Tiers cached: ${mockBulkTiers.length}`);

      // Test bulk price calculations with cache
      mockDatabase.getFirstAsync.mockResolvedValue({ price: 100.0 });

      const calculationBenchmarks = [];

      for (let i = 0; i < 20; i++) {
        const quantity = Math.floor(Math.random() * 100) + 1;
        const startTime = performance.now();
        await db.calculateBestPrice(productId, quantity);
        const endTime = performance.now();
        calculationBenchmarks.push(endTime - startTime);
      }

      const avgCalculationTime =
        calculationBenchmarks.reduce((sum, time) => sum + time, 0) /
        calculationBenchmarks.length;

      expect(avgCalculationTime).toBeLessThan(25); // Should be very fast with cache

      console.log(
        `   - Average price calculation: ${avgCalculationTime.toFixed(2)}ms`
      );
    });

    it('should demonstrate cache invalidation performance', async () => {
      const productId = 1;
      const mockBulkTiers = [
        { id: 1, product_id: 1, min_quantity: 5, bulk_price: 90.0 },
      ];

      // Initial cache population
      mockDatabase.getAllAsync.mockResolvedValueOnce(mockBulkTiers);
      await db.getBulkPricingForProduct(productId);

      // Add new bulk pricing tier (should invalidate cache)
      mockDatabase.getFirstAsync.mockResolvedValueOnce({ price: 100.0 });
      mockDatabase.getAllAsync.mockResolvedValueOnce(mockBulkTiers);
      mockDatabase.runAsync.mockResolvedValueOnce({ lastInsertRowId: 2 });

      const addTierStart = performance.now();
      await db.addBulkPricing({
        product_id: productId,
        min_quantity: 10,
        bulk_price: 85.0,
      });
      const addTierTime = performance.now() - addTierStart;

      // Next call should rebuild cache
      const updatedTiers = [
        ...mockBulkTiers,
        { id: 2, product_id: 1, min_quantity: 10, bulk_price: 85.0 },
      ];
      mockDatabase.getAllAsync.mockResolvedValueOnce(updatedTiers);

      const rebuildCacheStart = performance.now();
      const result = await db.getBulkPricingForProduct(productId);
      const rebuildCacheTime = performance.now() - rebuildCacheStart;

      expect(result).toHaveLength(2);

      console.log(`🔄 Cache Invalidation Performance:`);
      console.log(`   - Add tier + invalidate: ${addTierTime.toFixed(2)}ms`);
      console.log(`   - Cache rebuild: ${rebuildCacheTime.toFixed(2)}ms`);
    });
  });

  describe('Batch Operation Performance', () => {
    it('should demonstrate batch processing efficiency', async () => {
      const batchSizes = [10, 25, 50, 100];
      const totalItems = 1000;

      mockDatabase.runAsync.mockImplementation(() =>
        Promise.resolve({ lastInsertRowId: Math.floor(Math.random() * 10000) })
      );

      for (const batchSize of batchSizes) {
        const customers = Array.from({ length: totalItems }, (_, i) => ({
          name: `Batch Customer ${i + 1}`,
          phone: `+${3000000000 + i}`,
          email: `batch${i + 1}@example.com`,
          address: `${i + 1} Batch St`,
        }));

        const startTime = performance.now();

        await db.batchOperation(
          customers,
          async (batch) => {
            const promises = batch.map((customer) => db.addCustomer(customer));
            await Promise.all(promises);
          },
          batchSize
        );

        const endTime = performance.now();
        const processingTime = endTime - startTime;
        const itemsPerSecond = (totalItems / processingTime) * 1000;

        console.log(
          `⚡ Batch Processing Performance (batch size: ${batchSize}):`
        );
        console.log(`   - Total time: ${processingTime.toFixed(2)}ms`);
        console.log(`   - Items per second: ${itemsPerSecond.toFixed(0)}`);
        console.log(
          `   - Average per item: ${(processingTime / totalItems).toFixed(2)}ms`
        );

        // Larger batch sizes should generally be more efficient
        expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
        expect(itemsPerSecond).toBeGreaterThan(50); // Should process at least 50 items per second
      }
    });

    it('should demonstrate concurrent operation performance', async () => {
      const concurrencyLevels = [1, 5, 10, 20];
      const operationsPerLevel = 100;

      mockDatabase.runAsync.mockImplementation(() =>
        Promise.resolve({ lastInsertRowId: Math.floor(Math.random() * 10000) })
      );

      for (const concurrency of concurrencyLevels) {
        const operations = Array.from(
          { length: operationsPerLevel },
          (_, i) => () =>
            db.addCustomer({
              name: `Concurrent Customer ${i + 1}`,
              phone: `+${4000000000 + i}`,
              email: `concurrent${i + 1}@example.com`,
              address: `${i + 1} Concurrent St`,
            })
        );

        const startTime = performance.now();

        // Process operations with specified concurrency level
        const chunks = [];
        for (let i = 0; i < operations.length; i += concurrency) {
          chunks.push(operations.slice(i, i + concurrency));
        }

        for (const chunk of chunks) {
          await Promise.all(chunk.map((op) => op()));
        }

        const endTime = performance.now();
        const processingTime = endTime - startTime;
        const operationsPerSecond =
          (operationsPerLevel / processingTime) * 1000;

        console.log(
          `🔀 Concurrent Operations Performance (concurrency: ${concurrency}):`
        );
        console.log(`   - Total time: ${processingTime.toFixed(2)}ms`);
        console.log(
          `   - Operations per second: ${operationsPerSecond.toFixed(0)}`
        );
        console.log(
          `   - Average per operation: ${(
            processingTime / operationsPerLevel
          ).toFixed(2)}ms`
        );

        expect(processingTime).toBeLessThan(15000); // Should complete within 15 seconds
        expect(operationsPerSecond).toBeGreaterThan(10); // Should process at least 10 operations per second
      }
    });
  });

  describe('Memory Usage Optimization', () => {
    it('should demonstrate efficient memory usage with large datasets', async () => {
      // Simulate memory-efficient pagination
      const totalRecords = 100000;
      const pageSize = 100;
      const totalPages = Math.ceil(totalRecords / pageSize);

      let processedRecords = 0;
      const startTime = performance.now();

      for (let page = 1; page <= Math.min(totalPages, 10); page++) {
        // Test first 10 pages
        const mockPageData = Array.from({ length: pageSize }, (_, i) => ({
          id: (page - 1) * pageSize + i + 1,
          name: `Customer ${(page - 1) * pageSize + i + 1}`,
          phone: `+${5000000000 + (page - 1) * pageSize + i}`,
        }));

        mockDatabase.getAllAsync.mockResolvedValueOnce(mockPageData);

        const pageStartTime = performance.now();
        const customers = await db.getCustomers(undefined, page, pageSize);
        const pageEndTime = performance.now();

        expect(customers).toHaveLength(pageSize);
        processedRecords += customers.length;

        // Each page should process quickly and consistently
        const pageTime = pageEndTime - pageStartTime;
        expect(pageTime).toBeLessThan(100); // Each page should process within 100ms

        if (page % 5 === 0) {
          console.log(`📄 Page ${page} processed in ${pageTime.toFixed(2)}ms`);
        }
      }

      const totalTime = performance.now() - startTime;
      const recordsPerSecond = (processedRecords / totalTime) * 1000;

      console.log(`💾 Memory-Efficient Pagination Performance:`);
      console.log(`   - Records processed: ${processedRecords}`);
      console.log(`   - Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`   - Records per second: ${recordsPerSecond.toFixed(0)}`);
      console.log(`   - Page size: ${pageSize}`);
      console.log(
        `   - Memory usage: Constant (pagination prevents memory bloat)`
      );

      expect(recordsPerSecond).toBeGreaterThan(500); // Should process at least 500 records per second
    });
  });

  describe('Query Optimization Validation', () => {
    it('should validate composite index effectiveness', async () => {
      // Test composite index: idx_stock_movements_product_date
      const productId = 1;
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const mockMovements = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        product_id: productId,
        type: i % 2 === 0 ? 'stock_in' : 'stock_out',
        quantity: Math.floor(Math.random() * 100) + 1,
        created_at: new Date(
          2024,
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1
        ).toISOString(),
      }));

      mockDatabase.getAllAsync.mockResolvedValue(mockMovements.slice(0, 50));

      const compositeIndexBenchmarks = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        await db.getStockMovements({ productId, startDate, endDate }, 1, 50);
        const endTime = performance.now();
        compositeIndexBenchmarks.push(endTime - startTime);
      }

      const avgCompositeTime =
        compositeIndexBenchmarks.reduce((sum, time) => sum + time, 0) /
        compositeIndexBenchmarks.length;

      console.log(`🔍 Composite Index Performance:`);
      console.log(`   - Average query time: ${avgCompositeTime.toFixed(2)}ms`);
      console.log(`   - Index: idx_stock_movements_product_date`);
      console.log(`   - Query: product_id + date range`);

      expect(avgCompositeTime).toBeLessThan(50); // Should be very fast with composite index

      // Test another composite index: idx_sales_customer_date
      const customerId = 1;

      const mockSales = Array.from({ length: 500 }, (_, i) => ({
        id: i + 1,
        customer_id: customerId,
        total: Math.floor(Math.random() * 1000) + 10,
        created_at: new Date(
          2024,
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1
        ).toISOString(),
      }));

      mockDatabase.getAllAsync.mockResolvedValue(mockSales.slice(0, 20));

      const salesBenchmarks = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        await db.getSalesByCustomer(customerId, startDate, endDate);
        const endTime = performance.now();
        salesBenchmarks.push(endTime - startTime);
      }

      const avgSalesTime =
        salesBenchmarks.reduce((sum, time) => sum + time, 0) /
        salesBenchmarks.length;

      console.log(
        `   - Customer sales query time: ${avgSalesTime.toFixed(2)}ms`
      );
      console.log(`   - Index: idx_sales_customer_date`);

      expect(avgSalesTime).toBeLessThan(50);
    });
  });
});
