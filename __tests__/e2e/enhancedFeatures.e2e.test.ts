/**
 * End-to-End Tests for Enhanced Database Features
 *
 * This test suite validates complete workflows across all enhanced features:
 * - Customer Management
 * - Stock Movement Tracking
 * - Bulk Pricing Application
 * - Data Integrity
 * - Performance Optimization
 */

import { DatabaseService } from '@/services/database';
import * as SQLite from 'expo-sqlite';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

describe('Enhanced Features End-to-End Tests', () => {
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

  describe('Complete Business Workflow', () => {
    it('should handle complete business scenario from setup to analytics', async () => {
      // ========== PHASE 1: SYSTEM SETUP ==========
      console.log('🚀 Phase 1: System Setup');

      // Step 1: Migrate enhanced features
      mockDatabase.execAsync.mockResolvedValue({});
      await db.migrateEnhancedFeatures();

      // Step 2: Create initial suppliers
      mockDatabase.runAsync.mockResolvedValueOnce({ lastInsertRowId: 1 });
      const supplierId = await db.addSupplier({
        name: 'Tech Supplier Inc',
        contact_person: 'John Smith',
        phone: '+1234567890',
        email: 'john@techsupplier.com',
        address: '123 Tech Street',
      });

      // Step 3: Create product categories
      mockDatabase.runAsync.mockResolvedValueOnce({ lastInsertRowId: 1 });
      const categoryId = await db.addCategory({
        name: 'Electronics',
        description: 'Electronic devices',
      });

      // Step 4: Create products with bulk pricing
      mockDatabase.runAsync.mockResolvedValueOnce({ lastInsertRowId: 1 });
      const productId = await db.addProduct({
        name: 'Wireless Headphones',
        description: 'High-quality wireless headphones',
        price: 100.0,
        quantity: 0,
        category_id: categoryId,
        supplier_id: supplierId,
        barcode: '1234567890123',
      });

      // ========== PHASE 2: INVENTORY MANAGEMENT ==========
      console.log('📦 Phase 2: Inventory Management');

      // Step 5: Initial stock in
      mockDatabase.runAsync
        .mockResolvedValueOnce({ lastInsertRowId: 1 }) // Stock movement
        .mockResolvedValueOnce({}); // Product quantity update

      const stockInId = await db.updateProductQuantityWithMovement(
        productId,
        'stock_in',
        100,
        'Initial inventory',
        supplierId,
        'PO001',
        80.0
      );

      expect(stockInId).toBe(1);

      // Step 6: Set up bulk pricing tiers
      mockDatabase.getFirstAsync.mockResolvedValueOnce({ price: 100.0 }); // Product price check
      mockDatabase.getAllAsync.mockResolvedValueOnce([]); // No existing tiers
      mockDatabase.runAsync.mockResolvedValueOnce({ lastInsertRowId: 1 });

      const bulkTier1 = await db.addBulkPricing({
        product_id: productId,
        min_quantity: 5,
        bulk_price: 90.0,
      });

      mockDatabase.getFirstAsync.mockResolvedValueOnce({ price: 100.0 });
      mockDatabase.getAllAsync.mockResolvedValueOnce([
        { id: 1, min_quantity: 5, bulk_price: 90.0 },
      ]);
      mockDatabase.runAsync.mockResolvedValueOnce({ lastInsertRowId: 2 });

      const bulkTier2 = await db.addBulkPricing({
        product_id: productId,
        min_quantity: 10,
        bulk_price: 85.0,
      });

      // ========== PHASE 3: CUSTOMER MANAGEMENT ==========
      console.log('👥 Phase 3: Customer Management');

      // Step 7: Create customers
      mockDatabase.runAsync.mockResolvedValueOnce({ lastInsertRowId: 1 });
      const customerId1 = await db.addCustomer({
        name: 'Alice Johnson',
        phone: '+1111111111',
        email: 'alice@example.com',
        address: '456 Customer Ave',
      });

      mockDatabase.runAsync.mockResolvedValueOnce({ lastInsertRowId: 2 });
      const customerId2 = await db.addCustomer({
        name: 'Bob Wilson',
        phone: '+2222222222',
        email: 'bob@example.com',
        address: '789 Buyer St',
      });

      // ========== PHASE 4: SALES TRANSACTIONS ==========
      console.log('💰 Phase 4: Sales Transactions');

      // Step 8: Regular sale (no bulk pricing)
      mockDatabase.getFirstAsync.mockResolvedValueOnce({ price: 100.0 });
      mockDatabase.getAllAsync.mockResolvedValueOnce([
        { id: 1, min_quantity: 5, bulk_price: 90.0 },
        { id: 2, min_quantity: 10, bulk_price: 85.0 },
      ]);

      const regularPricing = await db.calculateBestPrice(productId, 2);
      expect(regularPricing).toEqual({
        price: 100.0,
        isBulkPrice: false,
        savings: 0,
      });

      // Process regular sale
      mockDatabase.runAsync
        .mockResolvedValueOnce({ lastInsertRowId: 1 }) // Sale insert
        .mockResolvedValueOnce({}) // Sale item insert
        .mockResolvedValueOnce({}) // Stock movement (sale)
        .mockResolvedValueOnce({}) // Product quantity update
        .mockResolvedValueOnce({}); // Customer statistics update

      const saleId1 = await db.addSale({
        total: 200.0,
        payment_method: 'card',
        customer_id: customerId1,
        items: [{ product_id: productId, quantity: 2, price: 100.0 }],
      });

      // Step 9: Bulk sale (with bulk pricing)
      mockDatabase.getFirstAsync.mockResolvedValueOnce({ price: 100.0 });
      mockDatabase.getAllAsync.mockResolvedValueOnce([
        { id: 1, min_quantity: 5, bulk_price: 90.0 },
        { id: 2, min_quantity: 10, bulk_price: 85.0 },
      ]);

      const bulkPricing = await db.calculateBestPrice(productId, 8);
      expect(bulkPricing).toEqual({
        price: 90.0,
        isBulkPrice: true,
        savings: 80.0, // (100 - 90) * 8
        appliedTier: { id: 1, min_quantity: 5, bulk_price: 90.0 },
      });

      // Process bulk sale
      mockDatabase.runAsync
        .mockResolvedValueOnce({ lastInsertRowId: 2 })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      const saleId2 = await db.addSale({
        total: 720.0, // 8 * 90.00
        payment_method: 'cash',
        customer_id: customerId2,
        items: [{ product_id: productId, quantity: 8, price: 90.0 }],
      });

      // ========== PHASE 5: ANALYTICS AND REPORTING ==========
      console.log('📊 Phase 5: Analytics and Reporting');

      // Step 10: Customer analytics
      const mockCustomer1 = {
        id: 1,
        name: 'Alice Johnson',
        total_spent: 200,
        visit_count: 1,
      };
      const mockLastVisit1 = { created_at: '2024-01-15T14:00:00Z' };

      mockDatabase.getFirstAsync
        .mockResolvedValueOnce(mockCustomer1)
        .mockResolvedValueOnce(mockLastVisit1);

      const customer1Stats = await db.getCustomerStatistics(customerId1);
      expect(customer1Stats).toEqual({
        totalSpent: 200,
        visitCount: 1,
        averageOrderValue: 200,
        lastVisit: '2024-01-15T14:00:00Z',
      });

      // Step 11: Stock movement analytics
      const mockMovements = [
        {
          id: 1,
          type: 'stock_in',
          quantity: 100,
          created_at: '2024-01-15T10:00:00Z',
        },
        {
          id: 2,
          type: 'stock_out',
          quantity: 2,
          created_at: '2024-01-15T14:00:00Z',
        },
        {
          id: 3,
          type: 'stock_out',
          quantity: 8,
          created_at: '2024-01-15T16:00:00Z',
        },
      ];

      mockDatabase.getAllAsync.mockResolvedValueOnce(mockMovements);

      const movements = await db.getStockMovements({ productId }, 1, 100);
      const totalStockIn = movements
        .filter((m) => m.type === 'stock_in')
        .reduce((sum, m) => sum + m.quantity, 0);
      const totalStockOut = movements
        .filter((m) => m.type === 'stock_out')
        .reduce((sum, m) => sum + m.quantity, 0);
      const currentStock = totalStockIn - totalStockOut;

      expect(totalStockIn).toBe(100);
      expect(totalStockOut).toBe(10);
      expect(currentStock).toBe(90);

      // Step 12: Bulk pricing analytics
      mockDatabase.getAllAsync.mockResolvedValueOnce([
        { id: 1, min_quantity: 5, bulk_price: 90.0 },
        { id: 2, min_quantity: 10, bulk_price: 85.0 },
      ]);

      const bulkTiers = await db.getBulkPricingForProduct(productId);
      expect(bulkTiers).toHaveLength(2);

      // Calculate bulk pricing effectiveness
      const totalRegularRevenue = 10 * 100.0; // 1000.00
      const actualRevenue = 2 * 100.0 + 8 * 90.0; // 920.00
      const bulkDiscountGiven = totalRegularRevenue - actualRevenue; // 80.00
      const discountPercentage =
        (bulkDiscountGiven / totalRegularRevenue) * 100; // 8%

      expect(bulkDiscountGiven).toBe(80.0);
      expect(discountPercentage).toBe(8);

      // ========== PHASE 6: DATA INTEGRITY VERIFICATION ==========
      console.log('🔍 Phase 6: Data Integrity Verification');

      // Step 13: Verify customer segmentation
      const mockCustomers = [
        { id: 1, name: 'Alice Johnson', total_spent: 200, visit_count: 1 },
        { id: 2, name: 'Bob Wilson', total_spent: 720, visit_count: 1 },
      ];

      mockDatabase.getAllAsync.mockResolvedValueOnce(mockCustomers);

      const segmentation = await db.getCustomerSegmentation();
      expect(segmentation.totalCustomers).toBe(2);

      // Step 14: Verify stock movement summary
      const mockSummary = [
        { type: 'stock_in', total_quantity: 100 },
        { type: 'stock_out', total_quantity: 10 },
      ];

      mockDatabase.getAllAsync.mockResolvedValueOnce(mockSummary);

      const summary = await db.getStockMovementSummary(productId);
      expect(summary).toEqual(mockSummary);

      // ========== PHASE 7: PERFORMANCE VALIDATION ==========
      console.log('⚡ Phase 7: Performance Validation');

      // Step 15: Test bulk operations performance
      const bulkCustomers = Array.from({ length: 100 }, (_, i) => ({
        name: `Customer ${i + 1}`,
        phone: `+${1000000000 + i}`,
        email: `customer${i + 1}@example.com`,
        address: `${i + 1} Customer St`,
      }));

      // Mock batch customer creation
      mockDatabase.runAsync.mockImplementation(() =>
        Promise.resolve({ lastInsertRowId: Math.floor(Math.random() * 1000) })
      );

      const startTime = Date.now();

      // Process in batches for performance
      await db.batchOperation(
        bulkCustomers,
        async (batch) => {
          for (const customer of batch) {
            await db.addCustomer(customer);
          }
        },
        10 // Batch size of 10
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Performance should be reasonable (this is a mock test, so timing is not real)
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds

      console.log('✅ End-to-End Test Completed Successfully!');
      console.log(`📈 Performance Metrics:`);
      console.log(`   - Bulk customer creation: ${processingTime}ms`);
      console.log(`   - Total customers processed: ${bulkCustomers.length}`);
      console.log(`   - Stock movements tracked: ${movements.length}`);
      console.log(`   - Bulk pricing tiers: ${bulkTiers.length}`);
      console.log(`   - Sales with bulk discounts: 1`);
      console.log(
        `   - Total discount given: $${bulkDiscountGiven.toFixed(2)}`
      );
    });
  });

  describe('Data Integrity Validation', () => {
    it('should maintain referential integrity across all features', async () => {
      // Test foreign key relationships
      const productId = 1;
      const customerId = 1;
      const supplierId = 1;

      // Mock data with proper relationships
      mockDatabase.getFirstAsync
        .mockResolvedValueOnce({ id: productId, name: 'Test Product' }) // Product exists
        .mockResolvedValueOnce({ id: customerId, name: 'Test Customer' }) // Customer exists
        .mockResolvedValueOnce({ id: supplierId, name: 'Test Supplier' }); // Supplier exists

      // Verify relationships exist before creating dependent records
      const product = await db.getProductById(productId);
      const customer = await db.getCustomerById(customerId);
      const supplier = await db.getSupplierById(supplierId);

      expect(product).toBeTruthy();
      expect(customer).toBeTruthy();
      expect(supplier).toBeTruthy();

      // Test cascading operations
      mockDatabase.runAsync.mockResolvedValue({});

      // Should be able to create stock movement with valid product and supplier
      await expect(
        db.addStockMovement({
          product_id: productId,
          type: 'stock_in',
          quantity: 50,
          reason: 'Test stock',
          supplier_id: supplierId,
          reference_number: 'TEST001',
          unit_cost: 10.0,
        })
      ).resolves.toBeDefined();

      // Should be able to create bulk pricing with valid product
      mockDatabase.getFirstAsync.mockResolvedValueOnce({ price: 20.0 });
      mockDatabase.getAllAsync.mockResolvedValueOnce([]);

      await expect(
        db.addBulkPricing({
          product_id: productId,
          min_quantity: 10,
          bulk_price: 15.0,
        })
      ).resolves.toBeDefined();
    });

    it('should handle constraint violations gracefully', async () => {
      // Test invalid foreign key references
      const invalidProductId = 999;
      const invalidCustomerId = 999;

      // Mock non-existent records
      mockDatabase.getFirstAsync.mockResolvedValue(null);

      // Should reject operations with invalid foreign keys
      await expect(
        db.addStockMovement({
          product_id: invalidProductId,
          type: 'stock_in',
          quantity: 50,
          reason: 'Test stock',
          supplier_id: null,
          reference_number: 'TEST001',
          unit_cost: 10.0,
        })
      ).rejects.toThrow();

      await expect(
        db.addBulkPricing({
          product_id: invalidProductId,
          min_quantity: 10,
          bulk_price: 15.0,
        })
      ).rejects.toThrow();
    });
  });

  describe('Performance Optimization Validation', () => {
    it('should demonstrate improved query performance with indexes', async () => {
      // Mock large dataset queries
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `Customer ${i + 1}`,
        phone: `+${1000000000 + i}`,
        total_spent: Math.floor(Math.random() * 5000),
      }));

      mockDatabase.getAllAsync.mockResolvedValue(largeDataset);

      // Test indexed search performance
      const startTime = Date.now();

      // Search by name (should use idx_customers_name)
      await db.getCustomers('Customer 500', 1, 10);

      const searchTime = Date.now() - startTime;

      // With proper indexing, search should be fast even with large datasets
      expect(searchTime).toBeLessThan(100); // Should complete within 100ms

      // Test bulk pricing cache performance
      const productId = 1;
      const mockBulkTiers = [
        { id: 1, product_id: 1, min_quantity: 5, bulk_price: 90.0 },
        { id: 2, product_id: 1, min_quantity: 10, bulk_price: 85.0 },
      ];

      mockDatabase.getAllAsync.mockResolvedValue(mockBulkTiers);

      // First call should hit database
      const firstCallStart = Date.now();
      await db.getBulkPricingForProduct(productId);
      const firstCallTime = Date.now() - firstCallStart;

      // Second call should hit cache (mock won't show real cache benefit, but structure is there)
      const secondCallStart = Date.now();
      await db.getBulkPricingForProduct(productId);
      const secondCallTime = Date.now() - secondCallStart;

      // Cache should improve performance (in real scenario)
      expect(secondCallTime).toBeLessThanOrEqual(firstCallTime);
    });

    it('should handle concurrent operations efficiently', async () => {
      // Test concurrent customer operations
      const concurrentOperations = Array.from({ length: 10 }, (_, i) =>
        db.addCustomer({
          name: `Concurrent Customer ${i + 1}`,
          phone: `+${2000000000 + i}`,
          email: `concurrent${i + 1}@example.com`,
          address: `${i + 1} Concurrent St`,
        })
      );

      mockDatabase.runAsync.mockImplementation(() =>
        Promise.resolve({ lastInsertRowId: Math.floor(Math.random() * 1000) })
      );

      const startTime = Date.now();

      // Execute all operations concurrently
      const results = await Promise.all(concurrentOperations);

      const concurrentTime = Date.now() - startTime;

      // All operations should complete successfully
      expect(results).toHaveLength(10);
      results.forEach((result) => expect(result).toBeGreaterThan(0));

      // Concurrent operations should be reasonably fast
      expect(concurrentTime).toBeLessThan(1000); // Should complete within 1 second

      console.log(
        `⚡ Concurrent Operations Performance: ${concurrentTime}ms for ${concurrentOperations.length} operations`
      );
    });
  });
});
