import {
  DatabaseService,
  Product,
  Sale,
  SaleItem,
  Customer,
} from '@/services/database';
import { CurrencyManager } from '@/services/currencyService';
import * as SQLite from 'expo-sqlite';

describe('Decimal Pricing Integration Tests', () => {
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
    await db.execAsync('DELETE FROM products');
    await db.execAsync('DELETE FROM sales');
    await db.execAsync('DELETE FROM sale_items');
    await db.execAsync('DELETE FROM categories');
    await db.execAsync('DELETE FROM customers');
    await db.execAsync('DELETE FROM stock_movements');
    await db.execAsync('DELETE FROM bulk_pricing');
    await db.execAsync('DELETE FROM expenses');
  });

  describe('End-to-End Sales Process with Decimal Pricing', () => {
    test('should handle complete sales workflow with decimal prices', async () => {
      // Setup: Create category and customer
      const categoryId = await service.addCategory({
        name: 'Electronics',
        description: 'Electronic products',
      });

      const customerId = await service.addCustomer({
        name: 'John Doe',
        phone: '123-456-7890',
        email: 'john@example.com',
        address: '123 Main St',
      });

      // Add products with decimal prices
      const product1Id = await service.addProduct({
        name: 'Smartphone',
        category_id: categoryId,
        price: 599.99,
        cost: 350.5,
        quantity: 10,
        min_stock: 2,
      });

      const product2Id = await service.addProduct({
        name: 'Headphones',
        category_id: categoryId,
        price: 89.95,
        cost: 45.25,
        quantity: 25,
        min_stock: 5,
      });

      // Create sale with decimal calculations
      const saleItems: Omit<SaleItem, 'id' | 'sale_id'>[] = [
        {
          product_id: product1Id,
          quantity: 1,
          price: 599.99,
          cost: 350.5,
          discount: 50.0, // $50 discount
          subtotal: 549.99, // 599.99 - 50.00
        },
        {
          product_id: product2Id,
          quantity: 2,
          price: 89.95,
          cost: 45.25,
          discount: 0.0,
          subtotal: 179.9, // 89.95 * 2
        },
      ];

      const totalAmount = 729.89; // 549.99 + 179.90
      const saleId = await service.addSale({
        customer_id: customerId,
        total: totalAmount,
        items: saleItems,
      });

      // Verify sale was created correctly
      const sale = await service.getSaleById(saleId);
      expect(sale).toBeTruthy();
      expect(sale?.total).toBe(totalAmount);
      expect(sale?.items).toHaveLength(2);

      // Verify individual items
      const smartphoneItem = sale?.items.find(
        (item) => item.product_id === product1Id
      );
      expect(smartphoneItem?.price).toBe(599.99);
      expect(smartphoneItem?.discount).toBe(50.0);
      expect(smartphoneItem?.subtotal).toBe(549.99);

      const headphonesItem = sale?.items.find(
        (item) => item.product_id === product2Id
      );
      expect(headphonesItem?.price).toBe(89.95);
      expect(headphonesItem?.subtotal).toBe(179.9);

      // Verify stock was updated
      const updatedProduct1 = await service.getProductById(product1Id);
      const updatedProduct2 = await service.getProductById(product2Id);
      expect(updatedProduct1?.quantity).toBe(9); // 10 - 1
      expect(updatedProduct2?.quantity).toBe(23); // 25 - 2

      // Verify customer total spent was updated
      const updatedCustomer = await service.getCustomerById(customerId);
      expect(updatedCustomer?.total_spent).toBe(totalAmount);
    });

    test('should handle bulk pricing with decimal calculations', async () => {
      const categoryId = await service.addCategory({
        name: 'Wholesale',
        description: 'Wholesale products',
      });

      const customerId = await service.addCustomer({
        name: 'Bulk Customer',
        phone: '987-654-3210',
        email: 'bulk@example.com',
        address: '456 Business Ave',
      });

      const productId = await service.addProduct({
        name: 'Bulk Item',
        category_id: categoryId,
        price: 25.99,
        cost: 15.5,
        quantity: 100,
        min_stock: 10,
      });

      // Add bulk pricing tiers
      await service.addBulkPricing({
        product_id: productId,
        min_quantity: 10,
        bulk_price: 22.99,
      });

      await service.addBulkPricing({
        product_id: productId,
        min_quantity: 50,
        bulk_price: 19.99,
      });

      // Test bulk pricing calculation
      const bulkPricing = await service.getBulkPricing(productId);
      expect(bulkPricing).toHaveLength(2);

      // Calculate price for 60 items (should use 50+ tier)
      const quantity = 60;
      const applicableTier = bulkPricing
        .filter((tier) => quantity >= tier.min_quantity)
        .sort((a, b) => b.min_quantity - a.min_quantity)[0];

      expect(applicableTier.bulk_price).toBe(19.99);

      // Create sale with bulk pricing
      const saleItems: Omit<SaleItem, 'id' | 'sale_id'>[] = [
        {
          product_id: productId,
          quantity: quantity,
          price: applicableTier.bulk_price,
          cost: 15.5,
          discount: 0.0,
          subtotal: quantity * applicableTier.bulk_price, // 60 * 19.99 = 1199.40
        },
      ];

      const saleId = await service.addSale({
        customer_id: customerId,
        total: 1199.4,
        items: saleItems,
      });

      const sale = await service.getSaleById(saleId);
      expect(sale?.total).toBe(1199.4);
      expect(sale?.items[0].price).toBe(19.99);
      expect(sale?.items[0].subtotal).toBe(1199.4);
    });

    test('should handle complex discount calculations with decimal precision', async () => {
      const categoryId = await service.addCategory({
        name: 'Fashion',
        description: 'Fashion items',
      });

      const customerId = await service.addCustomer({
        name: 'Fashion Customer',
        phone: '555-123-4567',
        email: 'fashion@example.com',
        address: '789 Style St',
      });

      const productId = await service.addProduct({
        name: 'Designer Shirt',
        category_id: categoryId,
        price: 129.99,
        cost: 65.0,
        quantity: 20,
        min_stock: 3,
      });

      // Test percentage-based discount calculation
      const originalPrice = 129.99;
      const discountPercentage = 15; // 15% discount
      const discountAmount =
        Math.round(((originalPrice * discountPercentage) / 100) * 100) / 100; // Round to 2 decimals
      const finalPrice = originalPrice - discountAmount;

      const saleItems: Omit<SaleItem, 'id' | 'sale_id'>[] = [
        {
          product_id: productId,
          quantity: 3,
          price: originalPrice,
          cost: 65.0,
          discount: discountAmount * 3, // Total discount for 3 items
          subtotal: finalPrice * 3,
        },
      ];

      const saleId = await service.addSale({
        customer_id: customerId,
        total: finalPrice * 3,
        items: saleItems,
      });

      const sale = await service.getSaleById(saleId);
      expect(sale?.items[0].discount).toBeCloseTo(discountAmount * 3, 2);
      expect(sale?.items[0].subtotal).toBeCloseTo(finalPrice * 3, 2);
    });
  });

  describe('Currency Formatting Integration', () => {
    test('should format prices correctly with different currencies', async () => {
      // Test with USD
      const usdSettings = CurrencyManager.getCurrency('USD')!;
      await currencyManager.saveCurrencySettings(usdSettings);

      expect(currencyManager.formatPrice(1234.56)).toBe('$1,234.56');
      expect(currencyManager.formatPrice(0.99)).toBe('$0.99');

      // Test with EUR
      const eurSettings = CurrencyManager.getCurrency('EUR')!;
      await currencyManager.saveCurrencySettings(eurSettings);

      expect(currencyManager.formatPrice(1234.56)).toBe('1,234.56 €');
      expect(currencyManager.formatPrice(0.99)).toBe('0.99 €');

      // Test with MMK (no decimals)
      const mmkSettings = CurrencyManager.getCurrency('MMK')!;
      await currencyManager.saveCurrencySettings(mmkSettings);

      expect(currencyManager.formatPrice(1234.56)).toBe('1,235 K'); // Rounded
      expect(currencyManager.formatPrice(0.99)).toBe('1 K'); // Rounded
    });

    test('should parse prices correctly from different currency formats', async () => {
      // Test USD parsing
      const usdSettings = CurrencyManager.getCurrency('USD')!;
      await currencyManager.saveCurrencySettings(usdSettings);

      expect(currencyManager.parsePrice('$1,234.56')).toBe(1234.56);
      expect(currencyManager.parsePrice('$0.99')).toBe(0.99);

      // Test EUR parsing
      const eurSettings = CurrencyManager.getCurrency('EUR')!;
      await currencyManager.saveCurrencySettings(eurSettings);

      expect(currencyManager.parsePrice('1,234.56 €')).toBe(1234.56);
      expect(currencyManager.parsePrice('0.99 €')).toBe(0.99);

      // Test MMK parsing
      const mmkSettings = CurrencyManager.getCurrency('MMK')!;
      await currencyManager.saveCurrencySettings(mmkSettings);

      expect(currencyManager.parsePrice('1,235 K')).toBe(1235);
      expect(currencyManager.parsePrice('1 K')).toBe(1);
    });
  });

  describe('Analytics with Decimal Pricing', () => {
    test('should calculate accurate analytics with decimal prices', async () => {
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      const customerId = await service.addCustomer({
        name: 'Analytics Customer',
        phone: '111-222-3333',
        email: 'analytics@example.com',
        address: '123 Analytics Ave',
      });

      // Add products with decimal prices
      const product1Id = await service.addProduct({
        name: 'Product 1',
        category_id: categoryId,
        price: 19.99,
        cost: 12.5,
        quantity: 50,
        min_stock: 10,
      });

      const product2Id = await service.addProduct({
        name: 'Product 2',
        category_id: categoryId,
        price: 45.75,
        cost: 28.25,
        quantity: 30,
        min_stock: 5,
      });

      // Create multiple sales
      const sale1Items: Omit<SaleItem, 'id' | 'sale_id'>[] = [
        {
          product_id: product1Id,
          quantity: 5,
          price: 19.99,
          cost: 12.5,
          discount: 0.0,
          subtotal: 99.95,
        },
      ];

      const sale2Items: Omit<SaleItem, 'id' | 'sale_id'>[] = [
        {
          product_id: product2Id,
          quantity: 2,
          price: 45.75,
          cost: 28.25,
          discount: 5.0,
          subtotal: 86.5, // (45.75 * 2) - 5.00
        },
      ];

      await service.addSale({
        customer_id: customerId,
        total: 99.95,
        items: sale1Items,
      });

      await service.addSale({
        customer_id: customerId,
        total: 86.5,
        items: sale2Items,
      });

      // Get analytics
      const analytics = await service.getSalesAnalytics();

      expect(analytics.totalRevenue).toBe(186.45); // 99.95 + 86.50

      // Calculate expected profit
      const sale1Profit = (19.99 - 12.5) * 5; // 37.45
      const sale2Profit = (45.75 - 28.25) * 2 - 5.0; // 30.00
      const expectedProfit = sale1Profit + sale2Profit; // 67.45

      expect(analytics.totalProfit).toBeCloseTo(expectedProfit, 2);
    });

    test('should handle profit margin calculations with decimal precision', async () => {
      const categoryId = await service.addCategory({
        name: 'Margin Test',
        description: 'Margin test category',
      });

      const customerId = await service.addCustomer({
        name: 'Margin Customer',
        phone: '444-555-6666',
        email: 'margin@example.com',
        address: '456 Margin St',
      });

      const productId = await service.addProduct({
        name: 'Margin Product',
        category_id: categoryId,
        price: 100.0,
        cost: 60.0,
        quantity: 10,
        min_stock: 2,
      });

      const saleItems: Omit<SaleItem, 'id' | 'sale_id'>[] = [
        {
          product_id: productId,
          quantity: 1,
          price: 100.0,
          cost: 60.0,
          discount: 0.0,
          subtotal: 100.0,
        },
      ];

      await service.addSale({
        customer_id: customerId,
        total: 100.0,
        items: saleItems,
      });

      const analytics = await service.getSalesAnalytics();

      expect(analytics.totalRevenue).toBe(100.0);
      expect(analytics.totalProfit).toBe(40.0); // 100.00 - 60.00

      // Profit margin should be 40%
      const expectedMargin = (40.0 / 100.0) * 100;
      expect(analytics.profitMargin).toBeCloseTo(expectedMargin, 2);
    });
  });

  describe('Stock Movement Integration with Decimal Pricing', () => {
    test('should handle stock movements with decimal unit costs', async () => {
      const categoryId = await service.addCategory({
        name: 'Stock Test',
        description: 'Stock test category',
      });

      const productId = await service.addProduct({
        name: 'Stock Product',
        category_id: categoryId,
        price: 25.99,
        cost: 15.75,
        quantity: 0,
        min_stock: 5,
      });

      // Add stock with decimal unit cost
      await service.addStockMovement({
        product_id: productId,
        type: 'stock_in',
        quantity: 20,
        unit_cost: 14.25,
        note: 'Initial stock with decimal cost',
      });

      // Add another stock movement
      await service.addStockMovement({
        product_id: productId,
        type: 'stock_in',
        quantity: 10,
        unit_cost: 16.5,
        note: 'Additional stock',
      });

      const movements = await service.getStockMovements({ productId });
      expect(movements).toHaveLength(2);
      expect(movements[0].unit_cost).toBe(14.25);
      expect(movements[1].unit_cost).toBe(16.5);

      // Verify product quantity was updated
      const product = await service.getProductById(productId);
      expect(product?.quantity).toBe(30); // 20 + 10
    });

    test('should calculate average cost correctly with decimal values', async () => {
      const categoryId = await service.addCategory({
        name: 'Average Cost Test',
        description: 'Average cost test category',
      });

      const productId = await service.addProduct({
        name: 'Average Cost Product',
        category_id: categoryId,
        price: 30.0,
        cost: 20.0,
        quantity: 0,
        min_stock: 5,
      });

      // Add multiple stock movements with different costs
      await service.addStockMovement({
        product_id: productId,
        type: 'stock_in',
        quantity: 10,
        unit_cost: 18.5,
      });

      await service.addStockMovement({
        product_id: productId,
        type: 'stock_in',
        quantity: 20,
        unit_cost: 21.75,
      });

      await service.addStockMovement({
        product_id: productId,
        type: 'stock_in',
        quantity: 5,
        unit_cost: 19.25,
      });

      // Calculate weighted average cost
      // (10 * 18.50) + (20 * 21.75) + (5 * 19.25) = 185 + 435 + 96.25 = 716.25
      // Total quantity: 35
      // Average cost: 716.25 / 35 = 20.464...

      const movements = await service.getStockMovements({ productId });
      const totalCost = movements.reduce((sum, movement) => {
        return sum + movement.quantity * (movement.unit_cost || 0);
      }, 0);
      const totalQuantity = movements.reduce(
        (sum, movement) => sum + movement.quantity,
        0
      );
      const averageCost = totalCost / totalQuantity;

      expect(averageCost).toBeCloseTo(20.464, 3);
    });
  });

  describe('Data Migration Integration', () => {
    test('should maintain data integrity during decimal migration', async () => {
      // Setup test data with integer prices (simulating old format)
      const categoryId = await service.addCategory({
        name: 'Migration Test',
        description: 'Migration test category',
      });

      const customerId = await service.addCustomer({
        name: 'Migration Customer',
        phone: '777-888-9999',
        email: 'migration@example.com',
        address: '789 Migration Rd',
      });

      // Manually insert data with integer prices
      await db.runAsync(
        `
        INSERT INTO products (name, category_id, price, cost, quantity, min_stock)
        VALUES ('Migration Product', ?, 2500, 1500, 10, 5)
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
        VALUES (?, 5000, datetime('now'))
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
        VALUES (?, ?, 2, 2500, 1500, 0, 5000)
      `,
        [saleId.id, productId.id]
      );

      // Perform migration
      const needsMigration = await service.needsDecimalMigration();
      if (needsMigration) {
        await service.migrateToDecimalPricing();
      }

      // Verify data integrity after migration
      const sale = await service.getSaleById(saleId.id);
      expect(sale?.total).toBe(50.0); // 5000 cents = 50.00
      expect(sale?.items[0].price).toBe(25.0); // 2500 cents = 25.00
      expect(sale?.items[0].cost).toBe(15.0); // 1500 cents = 15.00
      expect(sale?.items[0].subtotal).toBe(50.0); // 5000 cents = 50.00

      const product = await service.getProductById(productId.id);
      expect(product?.price).toBe(25.0); // 2500 cents = 25.00
      expect(product?.cost).toBe(15.0); // 1500 cents = 15.00

      // Verify relationships are maintained
      expect(sale?.customer_id).toBe(customerId);
      expect(sale?.items[0].product_id).toBe(productId.id);
    });
  });
});
