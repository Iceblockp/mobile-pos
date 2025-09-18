import {
  DatabaseService,
  Product,
  Sale,
  SaleItem,
  Supplier,
  Customer,
  StockMovement,
} from '@/services/database';
import { CurrencyManager } from '@/services/currencyService';
import * as SQLite from 'expo-sqlite';

describe('Supplier Management End-to-End Tests', () => {
  let db: SQLite.SQLiteDatabase;
  let service: DatabaseService;
  let currencyManager: CurrencyManager;

  beforeAll(async () => {
    db = await SQLite.openDatabaseAsync(':memory:');
    service = new DatabaseService(db);
    await service.createTables();
    currencyManager = CurrencyManager.getInstance();
  });

  afterAll(async () => {
    await db.closeAsync();
  });

  beforeEach(async () => {
    // Clean up data before each test
    await db.execAsync('DELETE FROM suppliers');
    await db.execAsync('DELETE FROM products');
    await db.execAsync('DELETE FROM sales');
    await db.execAsync('DELETE FROM sale_items');
    await db.execAsync('DELETE FROM categories');
    await db.execAsync('DELETE FROM customers');
    await db.execAsync('DELETE FROM stock_movements');
    await db.execAsync('DELETE FROM bulk_pricing');
    await db.execAsync('DELETE FROM expenses');
  });

  describe('Complete Supplier Management Workflow', () => {
    test('should handle complete supplier lifecycle from creation to deletion', async () => {
      // Step 1: Create supplier
      const supplierId = await service.addSupplier({
        name: 'Tech Supplies Inc',
        contact_name: 'John Smith',
        phone: '+1-555-123-4567',
        email: 'john@techsupplies.com',
        address: '123 Tech Street, Silicon Valley, CA 94000',
      });

      expect(supplierId).toBeGreaterThan(0);

      // Step 2: Verify supplier was created
      const supplier = await service.getSupplierById(supplierId);
      expect(supplier).toBeTruthy();
      expect(supplier?.name).toBe('Tech Supplies Inc');
      expect(supplier?.email).toBe('john@techsupplies.com');

      // Step 3: Create category and products associated with supplier
      const categoryId = await service.addCategory({
        name: 'Electronics',
        description: 'Electronic components and devices',
      });

      const product1Id = await service.addProduct({
        name: 'Wireless Mouse',
        category_id: categoryId,
        price: 29.99,
        cost: 18.5,
        quantity: 0,
        min_stock: 10,
        supplier_id: supplierId,
      });

      const product2Id = await service.addProduct({
        name: 'USB Cable',
        category_id: categoryId,
        price: 12.99,
        cost: 7.25,
        quantity: 0,
        min_stock: 20,
        supplier_id: supplierId,
      });

      // Step 4: Add stock movements from supplier
      await service.addStockMovement({
        product_id: product1Id,
        type: 'stock_in',
        quantity: 50,
        supplier_id: supplierId,
        unit_cost: 17.75,
        note: 'Initial stock delivery',
      });

      await service.addStockMovement({
        product_id: product2Id,
        type: 'stock_in',
        quantity: 100,
        supplier_id: supplierId,
        unit_cost: 6.95,
        note: 'Bulk cable order',
      });

      // Step 5: Verify supplier statistics
      const suppliersWithStats = await service.getSuppliersWithStats();
      expect(suppliersWithStats).toHaveLength(1);

      const supplierStats = suppliersWithStats[0];
      expect(supplierStats.total_products).toBe(2);
      expect(supplierStats.recent_deliveries).toBe(2);
      expect(supplierStats.total_purchase_value).toBe(1582.5); // (50 * 17.75) + (100 * 6.95)

      // Step 6: Get supplier products
      const supplierProducts = await service.getSupplierProducts(supplierId);
      expect(supplierProducts).toHaveLength(2);
      expect(
        supplierProducts.find((p) => p.product_name === 'Wireless Mouse')
      ).toBeTruthy();
      expect(
        supplierProducts.find((p) => p.product_name === 'USB Cable')
      ).toBeTruthy();

      // Step 7: Get supplier analytics
      const analytics = await service.getSupplierAnalytics(supplierId);
      expect(analytics.totalProducts).toBe(2);
      expect(analytics.totalPurchaseValue).toBe(1582.5);
      expect(analytics.recentDeliveries).toHaveLength(2);
      expect(analytics.topProducts).toHaveLength(2);

      // Step 8: Update supplier information
      await service.updateSupplier(supplierId, {
        contact_name: 'Jane Smith',
        email: 'jane@techsupplies.com',
      });

      const updatedSupplier = await service.getSupplierById(supplierId);
      expect(updatedSupplier?.contact_name).toBe('Jane Smith');
      expect(updatedSupplier?.email).toBe('jane@techsupplies.com');
      expect(updatedSupplier?.name).toBe('Tech Supplies Inc'); // Should remain unchanged

      // Step 9: Try to delete supplier with products (should fail)
      await expect(service.deleteSupplier(supplierId)).rejects.toThrow(
        'Cannot delete supplier with existing products'
      );

      // Step 10: Remove products and then delete supplier
      await service.deleteProduct(product1Id);
      await service.deleteProduct(product2Id);

      await service.deleteSupplier(supplierId);

      const deletedSupplier = await service.getSupplierById(supplierId);
      expect(deletedSupplier).toBeNull();

      // Step 11: Verify stock movements have null supplier_id
      const movements = await service.getStockMovements({});
      expect(movements).toHaveLength(2);
      expect(movements.every((m) => m.supplier_id === null)).toBe(true);
    });

    test('should handle supplier search and pagination', async () => {
      // Create multiple suppliers
      const suppliers = [
        {
          name: 'Alpha Electronics',
          contact_name: 'Alice Johnson',
          phone: '111-111-1111',
          address: '111 Alpha St',
        },
        {
          name: 'Beta Components',
          contact_name: 'Bob Wilson',
          phone: '222-222-2222',
          address: '222 Beta Ave',
        },
        {
          name: 'Gamma Supplies',
          contact_name: 'Carol Davis',
          phone: '333-333-3333',
          address: '333 Gamma Rd',
        },
        {
          name: 'Delta Tech',
          contact_name: 'David Brown',
          phone: '444-444-4444',
          address: '444 Delta Blvd',
        },
        {
          name: 'Epsilon Parts',
          contact_name: 'Eve Miller',
          phone: '555-555-5555',
          address: '555 Epsilon Way',
        },
      ];

      for (const supplier of suppliers) {
        await service.addSupplier(supplier);
      }

      // Test search functionality
      const alphaResults = await service.getSuppliersWithStats('Alpha');
      expect(alphaResults).toHaveLength(1);
      expect(alphaResults[0].name).toBe('Alpha Electronics');

      const techResults = await service.getSuppliersWithStats('Tech');
      expect(techResults).toHaveLength(1);
      expect(techResults[0].name).toBe('Delta Tech');

      // Test pagination
      const page1 = await service.getSuppliersWithStats(undefined, 1, 3);
      expect(page1).toHaveLength(3);

      const page2 = await service.getSuppliersWithStats(undefined, 2, 3);
      expect(page2).toHaveLength(2);

      // Test search with pagination
      const searchPage1 = await service.getSuppliersWithStats('a', 1, 2); // Should match Alpha and Gamma
      expect(searchPage1).toHaveLength(2);
    });
  });

  describe('Complete Decimal Pricing Workflow', () => {
    test('should handle complete sales process with decimal pricing and currency formatting', async () => {
      // Step 1: Set up currency (USD)
      const usdSettings = CurrencyManager.getCurrency('USD')!;
      await currencyManager.saveCurrencySettings(usdSettings);

      // Step 2: Create test data
      const categoryId = await service.addCategory({
        name: 'Premium Products',
        description: 'High-end premium products',
      });

      const supplierId = await service.addSupplier({
        name: 'Premium Supplier',
        contact_name: 'Premium Contact',
        phone: '999-888-7777',
        address: '999 Premium Ave',
      });

      const customerId = await service.addCustomer({
        name: 'VIP Customer',
        phone: '123-456-7890',
        email: 'vip@customer.com',
        address: '123 VIP Street',
      });

      // Step 3: Create products with decimal prices
      const product1Id = await service.addProduct({
        name: 'Premium Headphones',
        category_id: categoryId,
        price: 299.99,
        cost: 180.5,
        quantity: 0,
        min_stock: 5,
        supplier_id: supplierId,
      });

      const product2Id = await service.addProduct({
        name: 'Wireless Charger',
        category_id: categoryId,
        price: 79.95,
        cost: 45.25,
        quantity: 0,
        min_stock: 10,
        supplier_id: supplierId,
      });

      // Step 4: Add stock with decimal unit costs
      await service.addStockMovement({
        product_id: product1Id,
        type: 'stock_in',
        quantity: 20,
        supplier_id: supplierId,
        unit_cost: 175.75,
        note: 'Premium headphones delivery',
      });

      await service.addStockMovement({
        product_id: product2Id,
        type: 'stock_in',
        quantity: 50,
        supplier_id: supplierId,
        unit_cost: 42.5,
        note: 'Wireless charger bulk order',
      });

      // Step 5: Add bulk pricing
      await service.addBulkPricing({
        product_id: product1Id,
        min_quantity: 5,
        bulk_price: 279.99,
      });

      await service.addBulkPricing({
        product_id: product2Id,
        min_quantity: 10,
        bulk_price: 69.95,
      });

      // Step 6: Create complex sale with discounts
      const saleItems: Omit<SaleItem, 'id' | 'sale_id'>[] = [
        {
          product_id: product1Id,
          quantity: 2,
          price: 299.99,
          cost: 175.75,
          discount: 50.0, // $50 total discount
          subtotal: 549.98, // (299.99 * 2) - 50.00
        },
        {
          product_id: product2Id,
          quantity: 3,
          price: 79.95,
          cost: 42.5,
          discount: 0.0,
          subtotal: 239.85, // 79.95 * 3
        },
      ];

      const totalAmount = 789.83; // 549.98 + 239.85
      const saleId = await service.addSale({
        customer_id: customerId,
        total: totalAmount,
        items: saleItems,
      });

      // Step 7: Verify sale and formatting
      const sale = await service.getSaleById(saleId);
      expect(sale?.total).toBe(totalAmount);

      // Test currency formatting
      const formattedTotal = currencyManager.formatPrice(sale?.total || 0);
      expect(formattedTotal).toBe('$789.83');

      const formattedItemPrice = currencyManager.formatPrice(
        sale?.items[0].price || 0
      );
      expect(formattedItemPrice).toBe('$299.99');

      // Step 8: Verify analytics with decimal precision
      const analytics = await service.getSalesAnalytics();
      expect(analytics.totalRevenue).toBe(totalAmount);

      // Calculate expected profit
      const item1Profit = (299.99 - 175.75) * 2 - 50.0; // 198.48
      const item2Profit = (79.95 - 42.5) * 3; // 112.35
      const expectedProfit = item1Profit + item2Profit; // 310.83

      expect(analytics.totalProfit).toBeCloseTo(expectedProfit, 2);

      // Step 9: Test currency switching
      const mmkSettings = CurrencyManager.getCurrency('MMK')!;
      await currencyManager.saveCurrencySettings(mmkSettings);

      const mmkFormattedTotal = currencyManager.formatPrice(sale?.total || 0);
      expect(mmkFormattedTotal).toBe('790 K'); // Rounded to 0 decimals

      // Step 10: Verify supplier analytics
      const supplierAnalytics = await service.getSupplierAnalytics(supplierId);
      expect(supplierAnalytics.totalProducts).toBe(2);
      expect(supplierAnalytics.totalPurchaseValue).toBe(5640); // (20 * 175.75) + (50 * 42.50)
      expect(supplierAnalytics.recentDeliveries).toHaveLength(2);
    });

    test('should handle data migration from integer to decimal pricing', async () => {
      // Step 1: Simulate old data with integer prices
      const categoryId = await service.addCategory({
        name: 'Migration Category',
        description: 'Category for migration testing',
      });

      const customerId = await service.addCustomer({
        name: 'Migration Customer',
        phone: '555-123-4567',
        email: 'migration@test.com',
        address: '123 Migration St',
      });

      // Manually insert old-format data
      await db.runAsync(
        `
        INSERT INTO products (name, category_id, price, cost, quantity, min_stock)
        VALUES 
          ('Old Product 1', ?, 2999, 1800, 10, 5),
          ('Old Product 2', ?, 1295, 750, 20, 10)
      `,
        [categoryId, categoryId]
      );

      const products = await db.getAllAsync(
        'SELECT id, name FROM products ORDER BY name'
      );
      const product1Id = products[0].id;
      const product2Id = products[1].id;

      await db.runAsync(
        `
        INSERT INTO sales (customer_id, total, created_at)
        VALUES (?, 4294, datetime('now'))
      `,
        [customerId]
      );

      const saleId = (await db.getFirstAsync('SELECT id FROM sales')) as {
        id: number;
      };

      await db.runAsync(
        `
        INSERT INTO sale_items (sale_id, product_id, quantity, price, cost, discount, subtotal)
        VALUES 
          (?, ?, 1, 2999, 1800, 0, 2999),
          (?, ?, 1, 1295, 750, 0, 1295)
      `,
        [saleId.id, product1Id, saleId.id, product2Id]
      );

      // Step 2: Check if migration is needed and perform it
      const needsMigration = await service.needsDecimalMigration();
      if (needsMigration) {
        await service.migrateToDecimalPricing();
      }

      // Step 3: Verify migration results
      const migratedSale = await service.getSaleById(saleId.id);
      expect(migratedSale?.total).toBe(42.94); // 4294 cents = 42.94
      expect(migratedSale?.items[0].price).toBe(29.99); // 2999 cents = 29.99
      expect(migratedSale?.items[0].cost).toBe(18.0); // 1800 cents = 18.00
      expect(migratedSale?.items[1].price).toBe(12.95); // 1295 cents = 12.95
      expect(migratedSale?.items[1].cost).toBe(7.5); // 750 cents = 7.50

      const migratedProducts = await service.getProducts();
      expect(migratedProducts[0].price).toBe(29.99);
      expect(migratedProducts[0].cost).toBe(18.0);
      expect(migratedProducts[1].price).toBe(12.95);
      expect(migratedProducts[1].cost).toBe(7.5);

      // Step 4: Verify data integrity
      expect(migratedSale?.customer_id).toBe(customerId);
      expect(migratedSale?.items).toHaveLength(2);
      expect(migratedSale?.items[0].product_id).toBe(product1Id);
      expect(migratedSale?.items[1].product_id).toBe(product2Id);
    });
  });

  describe('Performance and Stress Testing', () => {
    test('should handle large datasets efficiently', async () => {
      const startTime = Date.now();

      // Create large dataset
      const categoryId = await service.addCategory({
        name: 'Performance Category',
        description: 'Category for performance testing',
      });

      // Create 100 suppliers
      const supplierIds: number[] = [];
      for (let i = 1; i <= 100; i++) {
        const supplierId = await service.addSupplier({
          name: `Supplier ${i.toString().padStart(3, '0')}`,
          contact_name: `Contact ${i}`,
          phone: `555-${i.toString().padStart(3, '0')}-${i
            .toString()
            .padStart(4, '0')}`,
          address: `${i} Supplier Street`,
        });
        supplierIds.push(supplierId);
      }

      // Create 1000 products
      const productIds: number[] = [];
      for (let i = 1; i <= 1000; i++) {
        const supplierId =
          supplierIds[Math.floor(Math.random() * supplierIds.length)];
        const productId = await service.addProduct({
          name: `Product ${i.toString().padStart(4, '0')}`,
          category_id: categoryId,
          price: Math.round((Math.random() * 500 + 10) * 100) / 100, // Random price 10-510
          cost: Math.round((Math.random() * 300 + 5) * 100) / 100, // Random cost 5-305
          quantity: Math.floor(Math.random() * 100),
          min_stock: Math.floor(Math.random() * 20) + 5,
          supplier_id: supplierId,
        });
        productIds.push(productId);
      }

      // Create 5000 stock movements
      for (let i = 1; i <= 5000; i++) {
        const productId =
          productIds[Math.floor(Math.random() * productIds.length)];
        const supplierId =
          supplierIds[Math.floor(Math.random() * supplierIds.length)];

        await service.addStockMovement({
          product_id: productId,
          type: Math.random() > 0.8 ? 'stock_out' : 'stock_in',
          quantity: Math.floor(Math.random() * 50) + 1,
          supplier_id: Math.random() > 0.3 ? supplierId : undefined,
          unit_cost: Math.round((Math.random() * 200 + 5) * 100) / 100,
        });
      }

      const setupTime = Date.now() - startTime;
      console.log(`Data setup completed in ${setupTime}ms`);

      // Test query performance
      const queryStartTime = Date.now();

      // Test supplier queries
      const allSuppliers = await service.getSuppliersWithStats();
      expect(allSuppliers).toHaveLength(100);

      const searchResults = await service.getSuppliersWithStats('Supplier 0');
      expect(searchResults.length).toBeGreaterThan(0);

      const paginatedResults = await service.getSuppliersWithStats(
        undefined,
        1,
        20
      );
      expect(paginatedResults).toHaveLength(20);

      // Test analytics performance
      const randomSupplierId =
        supplierIds[Math.floor(Math.random() * supplierIds.length)];
      const analytics = await service.getSupplierAnalytics(randomSupplierId);
      expect(analytics).toBeTruthy();

      const queryTime = Date.now() - queryStartTime;
      console.log(`Query performance test completed in ${queryTime}ms`);

      // Performance assertions
      expect(setupTime).toBeLessThan(30000); // Setup should complete within 30 seconds
      expect(queryTime).toBeLessThan(5000); // Queries should complete within 5 seconds
    });

    test('should handle concurrent operations safely', async () => {
      const categoryId = await service.addCategory({
        name: 'Concurrent Category',
        description: 'Category for concurrency testing',
      });

      const supplierId = await service.addSupplier({
        name: 'Concurrent Supplier',
        contact_name: 'Concurrent Contact',
        phone: '555-999-8888',
        address: '999 Concurrent Ave',
      });

      const productId = await service.addProduct({
        name: 'Concurrent Product',
        category_id: categoryId,
        price: 50.0,
        cost: 30.0,
        quantity: 1000,
        min_stock: 10,
        supplier_id: supplierId,
      });

      // Simulate concurrent stock movements
      const concurrentOperations = [];
      for (let i = 0; i < 50; i++) {
        concurrentOperations.push(
          service.addStockMovement({
            product_id: productId,
            type: 'stock_out',
            quantity: 1,
            unit_cost: 30.0,
          })
        );
      }

      await Promise.all(concurrentOperations);

      // Verify final state
      const finalProduct = await service.getProductById(productId);
      expect(finalProduct?.quantity).toBe(950); // 1000 - 50

      const movements = await service.getStockMovements({ productId });
      expect(movements).toHaveLength(50);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle database errors gracefully', async () => {
      // Test with invalid data
      await expect(
        service.addSupplier({
          name: '', // Invalid: empty name
          contact_name: 'Test Contact',
          phone: '123-456-7890',
          address: '123 Test St',
        })
      ).rejects.toThrow();

      // Test with non-existent references
      await expect(
        service.addProduct({
          name: 'Test Product',
          category_id: 99999, // Non-existent category
          price: 10.0,
          cost: 5.0,
          quantity: 10,
          min_stock: 5,
        })
      ).rejects.toThrow();

      // Test with invalid supplier ID
      await expect(service.getSupplierAnalytics(99999)).resolves.toEqual({
        totalProducts: 0,
        totalPurchaseValue: 0,
        recentDeliveries: [],
        topProducts: [],
        monthlyPurchases: [],
      });
    });

    test('should maintain data consistency during failures', async () => {
      const categoryId = await service.addCategory({
        name: 'Consistency Test',
        description: 'Category for consistency testing',
      });

      const supplierId = await service.addSupplier({
        name: 'Consistency Supplier',
        contact_name: 'Consistency Contact',
        phone: '555-111-2222',
        address: '111 Consistency St',
      });

      const customerId = await service.addCustomer({
        name: 'Consistency Customer',
        phone: '555-333-4444',
        email: 'consistency@test.com',
        address: '333 Consistency Ave',
      });

      const productId = await service.addProduct({
        name: 'Consistency Product',
        category_id: categoryId,
        price: 25.0,
        cost: 15.0,
        quantity: 100,
        min_stock: 10,
        supplier_id: supplierId,
      });

      // Try to create an invalid sale (should fail but not corrupt data)
      const invalidSaleItems: Omit<SaleItem, 'id' | 'sale_id'>[] = [
        {
          product_id: productId,
          quantity: 150, // More than available stock
          price: 25.0,
          cost: 15.0,
          discount: 0.0,
          subtotal: 3750.0,
        },
      ];

      // This should fail due to insufficient stock
      await expect(
        service.addSale({
          customer_id: customerId,
          total: 3750.0,
          items: invalidSaleItems,
        })
      ).rejects.toThrow();

      // Verify data integrity after failed operation
      const product = await service.getProductById(productId);
      expect(product?.quantity).toBe(100); // Should remain unchanged

      const customer = await service.getCustomerById(customerId);
      expect(customer?.total_spent).toBe(0); // Should remain unchanged

      const sales = await service.getSales();
      expect(sales).toHaveLength(0); // No sales should be created
    });
  });
});
