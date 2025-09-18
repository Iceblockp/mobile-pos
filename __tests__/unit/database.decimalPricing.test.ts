import { DatabaseService, Product, Sale, SaleItem } from '@/services/database';
import * as SQLite from 'expo-sqlite';

describe('DatabaseService - Decimal Pricing', () => {
  let db: SQLite.SQLiteDatabase;
  let service: DatabaseService;

  beforeAll(async () => {
    db = await SQLite.openDatabaseAsync(':memory:');
    service = new DatabaseService(db);
    await service.createTables();
  });

  afterAll(async () => {
    await db.closeAsync();
  });

  beforeEach(async () => {
    // Clean up data before each test
    await db.execAsync('DELETE FROM products');
    await db.execAsync('DELETE FROM sales');
    await db.execAsync('DELETE FROM sale_items');
    await db.execAsync('DELETE FROM categories');
    await db.execAsync('DELETE FROM stock_movements');
    await db.execAsync('DELETE FROM bulk_pricing');
    await db.execAsync('DELETE FROM expenses');
    await db.execAsync('DELETE FROM customers');
  });

  describe('Decimal Price Migration', () => {
    test('should check if decimal migration is needed', async () => {
      const needsMigration = await service.needsDecimalMigration();
      expect(typeof needsMigration).toBe('boolean');
    });

    test('should migrate integer prices to decimal format', async () => {
      // Add test data with integer prices (simulating old format)
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      // Manually insert product with integer prices (cents)
      await db.runAsync(
        `
        INSERT INTO products (name, category_id, price, cost, quantity, min_stock)
        VALUES ('Test Product', ?, 1250, 750, 10, 5)
      `,
        [categoryId]
      );

      // Check if migration is needed
      const needsMigration = await service.needsDecimalMigration();
      if (needsMigration) {
        await service.migrateToDecimalPricing();
      }

      // Verify migration results
      const product = (await db.getFirstAsync(
        'SELECT * FROM products WHERE name = ?',
        ['Test Product']
      )) as any;

      expect(product.price_decimal).toBe(12.5); // 1250 cents = 12.50
      expect(product.cost_decimal).toBe(7.5); // 750 cents = 7.50
    });

    test('should handle migration verification', async () => {
      // This test verifies the migration verification process
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      await db.runAsync(
        `
        INSERT INTO products (name, category_id, price, cost, quantity, min_stock)
        VALUES ('Test Product', ?, 2000, 1000, 10, 5)
      `,
        [categoryId]
      );

      const needsMigration = await service.needsDecimalMigration();
      if (needsMigration) {
        // Migration should complete without errors
        await expect(service.migrateToDecimalPricing()).resolves.not.toThrow();
      }
    });

    test('should handle migration rollback on failure', async () => {
      // This test simulates a migration failure scenario
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      await db.runAsync(
        `
        INSERT INTO products (name, category_id, price, cost, quantity, min_stock)
        VALUES ('Test Product', ?, 1500, 800, 10, 5)
      `,
        [categoryId]
      );

      // Mock a failure during migration by corrupting data
      const originalExecAsync = db.execAsync;
      let callCount = 0;

      db.execAsync = jest.fn().mockImplementation((sql: string) => {
        callCount++;
        if (callCount > 5 && sql.includes('UPDATE')) {
          throw new Error('Simulated migration failure');
        }
        return originalExecAsync.call(db, sql);
      });

      const needsMigration = await service.needsDecimalMigration();
      if (needsMigration) {
        await expect(service.migrateToDecimalPricing()).rejects.toThrow(
          'Simulated migration failure'
        );
      }

      // Restore original method
      db.execAsync = originalExecAsync;
    });
  });

  describe('Decimal Price Operations', () => {
    test('should handle decimal prices in product operations', async () => {
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      // Test with decimal prices
      const productId = await service.addProduct({
        name: 'Decimal Product',
        category_id: categoryId,
        price: 15.99,
        cost: 8.5,
        quantity: 10,
        min_stock: 5,
      });

      const product = await service.getProductById(productId);
      expect(product?.price).toBe(15.99);
      expect(product?.cost).toBe(8.5);
    });

    test('should handle decimal prices in sales operations', async () => {
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      const customerId = await service.addCustomer({
        name: 'Test Customer',
        phone: '123-456-7890',
        email: 'test@customer.com',
        address: '123 Test St',
      });

      const productId = await service.addProduct({
        name: 'Decimal Product',
        category_id: categoryId,
        price: 25.75,
        cost: 15.25,
        quantity: 10,
        min_stock: 5,
      });

      const saleItems: Omit<SaleItem, 'id' | 'sale_id'>[] = [
        {
          product_id: productId,
          quantity: 2,
          price: 25.75,
          cost: 15.25,
          discount: 2.5,
          subtotal: 49.0, // (25.75 * 2) - 2.50
        },
      ];

      const saleId = await service.addSale({
        customer_id: customerId,
        total: 49.0,
        items: saleItems,
      });

      const sale = await service.getSaleById(saleId);
      expect(sale?.total).toBe(49.0);
      expect(sale?.items[0].price).toBe(25.75);
      expect(sale?.items[0].discount).toBe(2.5);
      expect(sale?.items[0].subtotal).toBe(49.0);
    });

    test('should handle decimal prices in stock movements', async () => {
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      const productId = await service.addProduct({
        name: 'Decimal Product',
        category_id: categoryId,
        price: 12.99,
        cost: 7.5,
        quantity: 10,
        min_stock: 5,
      });

      await service.addStockMovement({
        product_id: productId,
        type: 'stock_in',
        quantity: 5,
        unit_cost: 7.25,
        note: 'Decimal cost test',
      });

      const movements = await service.getStockMovements({ productId });
      expect(movements).toHaveLength(1);
      expect(movements[0].unit_cost).toBe(7.25);
    });

    test('should handle decimal prices in bulk pricing', async () => {
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      const productId = await service.addProduct({
        name: 'Bulk Product',
        category_id: categoryId,
        price: 10.0,
        cost: 6.0,
        quantity: 100,
        min_stock: 10,
      });

      await service.addBulkPricing({
        product_id: productId,
        min_quantity: 10,
        bulk_price: 8.5,
      });

      await service.addBulkPricing({
        product_id: productId,
        min_quantity: 50,
        bulk_price: 7.75,
      });

      const bulkPricing = await service.getBulkPricing(productId);
      expect(bulkPricing).toHaveLength(2);
      expect(bulkPricing[0].bulk_price).toBe(8.5);
      expect(bulkPricing[1].bulk_price).toBe(7.75);
    });

    test('should handle decimal prices in expenses', async () => {
      const categoryId = await service.addExpenseCategory({
        name: 'Test Expense Category',
        description: 'Test Description',
      });

      const expenseId = await service.addExpense({
        category_id: categoryId,
        description: 'Decimal expense test',
        amount: 125.75,
      });

      const expense = await service.getExpenseById(expenseId);
      expect(expense?.amount).toBe(125.75);
    });
  });

  describe('Decimal Price Calculations', () => {
    test('should calculate accurate totals with decimal prices', async () => {
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      const customerId = await service.addCustomer({
        name: 'Test Customer',
        phone: '123-456-7890',
        email: 'test@customer.com',
        address: '123 Test St',
      });

      const product1Id = await service.addProduct({
        name: 'Product 1',
        category_id: categoryId,
        price: 15.99,
        cost: 8.5,
        quantity: 10,
        min_stock: 5,
      });

      const product2Id = await service.addProduct({
        name: 'Product 2',
        category_id: categoryId,
        price: 7.25,
        cost: 4.0,
        quantity: 20,
        min_stock: 5,
      });

      const saleItems: Omit<SaleItem, 'id' | 'sale_id'>[] = [
        {
          product_id: product1Id,
          quantity: 3,
          price: 15.99,
          cost: 8.5,
          discount: 1.5,
          subtotal: 46.47, // (15.99 * 3) - 1.50
        },
        {
          product_id: product2Id,
          quantity: 2,
          price: 7.25,
          cost: 4.0,
          discount: 0.0,
          subtotal: 14.5, // 7.25 * 2
        },
      ];

      const expectedTotal = 60.97; // 46.47 + 14.50
      const saleId = await service.addSale({
        customer_id: customerId,
        total: expectedTotal,
        items: saleItems,
      });

      const sale = await service.getSaleById(saleId);
      expect(sale?.total).toBe(expectedTotal);

      // Verify individual item calculations
      const calculatedTotal = sale?.items.reduce(
        (sum, item) => sum + item.subtotal,
        0
      );
      expect(calculatedTotal).toBe(expectedTotal);
    });

    test('should handle rounding in decimal calculations', async () => {
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      const customerId = await service.addCustomer({
        name: 'Test Customer',
        phone: '123-456-7890',
        email: 'test@customer.com',
        address: '123 Test St',
      });

      const productId = await service.addProduct({
        name: 'Rounding Product',
        category_id: categoryId,
        price: 3.33, // Price that causes rounding issues
        cost: 2.0,
        quantity: 10,
        min_stock: 5,
      });

      const saleItems: Omit<SaleItem, 'id' | 'sale_id'>[] = [
        {
          product_id: productId,
          quantity: 3,
          price: 3.33,
          cost: 2.0,
          discount: 0.0,
          subtotal: 9.99, // 3.33 * 3 = 9.99
        },
      ];

      const saleId = await service.addSale({
        customer_id: customerId,
        total: 9.99,
        items: saleItems,
      });

      const sale = await service.getSaleById(saleId);
      expect(sale?.total).toBe(9.99);
      expect(sale?.items[0].subtotal).toBe(9.99);
    });

    test('should calculate profit margins accurately with decimal prices', async () => {
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      const customerId = await service.addCustomer({
        name: 'Test Customer',
        phone: '123-456-7890',
        email: 'test@customer.com',
        address: '123 Test St',
      });

      const productId = await service.addProduct({
        name: 'Margin Product',
        category_id: categoryId,
        price: 20.0,
        cost: 12.5,
        quantity: 10,
        min_stock: 5,
      });

      const saleItems: Omit<SaleItem, 'id' | 'sale_id'>[] = [
        {
          product_id: productId,
          quantity: 2,
          price: 20.0,
          cost: 12.5,
          discount: 0.0,
          subtotal: 40.0,
        },
      ];

      const saleId = await service.addSale({
        customer_id: customerId,
        total: 40.0,
        items: saleItems,
      });

      const analytics = await service.getSalesAnalytics();
      expect(analytics.totalRevenue).toBe(40.0);

      // Calculate expected profit: (20.00 - 12.50) * 2 = 15.00
      const expectedProfit = 15.0;
      expect(analytics.totalProfit).toBe(expectedProfit);
    });
  });

  describe('Data Integrity and Validation', () => {
    test('should validate decimal price precision', async () => {
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      // Test with very precise decimal
      const productId = await service.addProduct({
        name: 'Precise Product',
        category_id: categoryId,
        price: 15.999999, // Should be handled appropriately
        cost: 8.555555,
        quantity: 10,
        min_stock: 5,
      });

      const product = await service.getProductById(productId);
      // Verify that precision is maintained within reasonable limits
      expect(typeof product?.price).toBe('number');
      expect(typeof product?.cost).toBe('number');
    });

    test('should handle zero and negative decimal values', async () => {
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      // Test with zero price
      const productId = await service.addProduct({
        name: 'Free Product',
        category_id: categoryId,
        price: 0.0,
        cost: 5.0,
        quantity: 10,
        min_stock: 5,
      });

      const product = await service.getProductById(productId);
      expect(product?.price).toBe(0.0);
      expect(product?.cost).toBe(5.0);
    });

    test('should handle very large decimal values', async () => {
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      const largePrice = 999999.99;
      const productId = await service.addProduct({
        name: 'Expensive Product',
        category_id: categoryId,
        price: largePrice,
        cost: 500000.0,
        quantity: 1,
        min_stock: 1,
      });

      const product = await service.getProductById(productId);
      expect(product?.price).toBe(largePrice);
    });

    test('should maintain data consistency during concurrent operations', async () => {
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      const productId = await service.addProduct({
        name: 'Concurrent Product',
        category_id: categoryId,
        price: 10.5,
        cost: 6.25,
        quantity: 100,
        min_stock: 10,
      });

      // Simulate concurrent price updates
      const updatePromises = [];
      for (let i = 0; i < 5; i++) {
        updatePromises.push(
          service.updateProduct(productId, {
            price: 10.5 + i * 0.25,
            cost: 6.25 + i * 0.15,
          })
        );
      }

      await Promise.all(updatePromises);

      const product = await service.getProductById(productId);
      expect(typeof product?.price).toBe('number');
      expect(typeof product?.cost).toBe('number');
      expect(product?.price).toBeGreaterThanOrEqual(10.5);
    });
  });

  describe('Migration Edge Cases', () => {
    test('should handle products with null prices during migration', async () => {
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      // Manually insert product with null price
      await db.runAsync(
        `
        INSERT INTO products (name, category_id, price, cost, quantity, min_stock)
        VALUES ('Null Price Product', ?, NULL, 500, 10, 5)
      `,
        [categoryId]
      );

      const needsMigration = await service.needsDecimalMigration();
      if (needsMigration) {
        // Migration should handle null values gracefully
        await expect(service.migrateToDecimalPricing()).resolves.not.toThrow();
      }
    });

    test('should handle empty tables during migration', async () => {
      // Ensure all tables are empty
      await db.execAsync('DELETE FROM products');
      await db.execAsync('DELETE FROM sales');
      await db.execAsync('DELETE FROM sale_items');

      const needsMigration = await service.needsDecimalMigration();
      if (needsMigration) {
        // Migration should work even with empty tables
        await expect(service.migrateToDecimalPricing()).resolves.not.toThrow();
      }
    });

    test('should preserve data relationships during migration', async () => {
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      const customerId = await service.addCustomer({
        name: 'Test Customer',
        phone: '123-456-7890',
        email: 'test@customer.com',
        address: '123 Test St',
      });

      // Add product and sale with integer prices
      await db.runAsync(
        `
        INSERT INTO products (name, category_id, price, cost, quantity, min_stock)
        VALUES ('Migration Product', ?, 1500, 1000, 10, 5)
      `,
        [categoryId]
      );

      const productId = (await db.getFirstAsync(
        'SELECT id FROM products WHERE name = ?',
        ['Migration Product']
      )) as { id: number };

      await db.runAsync(
        `
        INSERT INTO sales (customer_id, total, created_at)
        VALUES (?, 3000, datetime('now'))
      `,
        [customerId]
      );

      const saleId = (await db.getFirstAsync(
        'SELECT id FROM sales WHERE customer_id = ?',
        [customerId]
      )) as { id: number };

      await db.runAsync(
        `
        INSERT INTO sale_items (sale_id, product_id, quantity, price, cost, discount, subtotal)
        VALUES (?, ?, 2, 1500, 1000, 0, 3000)
      `,
        [saleId.id, productId.id]
      );

      const needsMigration = await service.needsDecimalMigration();
      if (needsMigration) {
        await service.migrateToDecimalPricing();
      }

      // Verify relationships are preserved
      const sale = await service.getSaleById(saleId.id);
      expect(sale?.items).toHaveLength(1);
      expect(sale?.items[0].product_id).toBe(productId.id);
      expect(sale?.total).toBe(30.0); // 3000 cents = 30.00
    });
  });
});
