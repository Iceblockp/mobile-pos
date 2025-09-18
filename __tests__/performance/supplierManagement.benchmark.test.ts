import { DatabaseService, Product, Supplier } from '@/services/database';
import { CurrencyManager } from '@/services/currencyService';
import * as SQLite from 'expo-sqlite';

interface BenchmarkResult {
  operation: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  operationsPerSecond: number;
}

describe('Supplier Management Performance Benchmarks', () => {
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

  const benchmark = async (
    operation: string,
    iterations: number,
    testFunction: () => Promise<void>
  ): Promise<BenchmarkResult> => {
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      await testFunction();
    }

    const totalTime = Date.now() - startTime;
    const averageTime = totalTime / iterations;
    const operationsPerSecond = Math.round((iterations / totalTime) * 1000);

    return {
      operation,
      iterations,
      totalTime,
      averageTime,
      operationsPerSecond,
    };
  };

  const logBenchmarkResult = (result: BenchmarkResult) => {
    console.log(`\n📊 ${result.operation}`);
    console.log(`   Iterations: ${result.iterations}`);
    console.log(`   Total Time: ${result.totalTime}ms`);
    console.log(`   Average Time: ${result.averageTime.toFixed(2)}ms`);
    console.log(`   Operations/sec: ${result.operationsPerSecond}`);
  };

  describe('Supplier CRUD Operations Benchmarks', () => {
    test('should benchmark supplier creation', async () => {
      let supplierCounter = 0;

      const result = await benchmark('Supplier Creation', 1000, async () => {
        supplierCounter++;
        await service.addSupplier({
          name: `Benchmark Supplier ${supplierCounter}`,
          contact_name: `Contact ${supplierCounter}`,
          phone: `555-${supplierCounter
            .toString()
            .padStart(3, '0')}-${supplierCounter.toString().padStart(4, '0')}`,
          address: `${supplierCounter} Benchmark Street`,
        });
      });

      logBenchmarkResult(result);
      expect(result.operationsPerSecond).toBeGreaterThan(100); // Should create at least 100 suppliers per second
    });

    test('should benchmark supplier queries with stats', async () => {
      // Setup: Create suppliers with products and stock movements
      const categoryId = await service.addCategory({
        name: 'Benchmark Category',
        description: 'Category for benchmarking',
      });

      const supplierIds: number[] = [];
      for (let i = 1; i <= 100; i++) {
        const supplierId = await service.addSupplier({
          name: `Query Supplier ${i}`,
          contact_name: `Contact ${i}`,
          phone: `555-${i.toString().padStart(3, '0')}-0000`,
          address: `${i} Query Street`,
        });
        supplierIds.push(supplierId);

        // Add products for each supplier
        for (let j = 1; j <= 5; j++) {
          const productId = await service.addProduct({
            name: `Product ${i}-${j}`,
            category_id: categoryId,
            price: Math.random() * 100 + 10,
            cost: Math.random() * 50 + 5,
            quantity: Math.floor(Math.random() * 100),
            min_stock: 10,
            supplier_id: supplierId,
          });

          // Add stock movements
          await service.addStockMovement({
            product_id: productId,
            type: 'stock_in',
            quantity: Math.floor(Math.random() * 50) + 10,
            supplier_id: supplierId,
            unit_cost: Math.random() * 40 + 5,
          });
        }
      }

      const result = await benchmark(
        'Supplier Query with Stats',
        100,
        async () => {
          await service.getSuppliersWithStats();
        }
      );

      logBenchmarkResult(result);
      expect(result.operationsPerSecond).toBeGreaterThan(10); // Should handle at least 10 complex queries per second
    });

    test('should benchmark supplier search operations', async () => {
      const searchTerms = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
      let searchIndex = 0;

      const result = await benchmark('Supplier Search', 500, async () => {
        const searchTerm = searchTerms[searchIndex % searchTerms.length];
        searchIndex++;
        await service.getSuppliersWithStats(searchTerm);
      });

      logBenchmarkResult(result);
      expect(result.operationsPerSecond).toBeGreaterThan(50); // Should handle at least 50 searches per second
    });

    test('should benchmark supplier analytics', async () => {
      // Use existing suppliers from previous test
      const suppliers = await service.getSuppliersWithStats();
      let supplierIndex = 0;

      const result = await benchmark('Supplier Analytics', 100, async () => {
        const supplier = suppliers[supplierIndex % suppliers.length];
        supplierIndex++;
        await service.getSupplierAnalytics(supplier.id);
      });

      logBenchmarkResult(result);
      expect(result.operationsPerSecond).toBeGreaterThan(20); // Should handle at least 20 analytics queries per second
    });
  });

  describe('Decimal Pricing Performance Benchmarks', () => {
    test('should benchmark decimal price calculations', async () => {
      const categoryId = await service.addCategory({
        name: 'Decimal Benchmark',
        description: 'Category for decimal benchmarking',
      });

      const customerId = await service.addCustomer({
        name: 'Benchmark Customer',
        phone: '555-999-8888',
        email: 'benchmark@test.com',
        address: '999 Benchmark Ave',
      });

      // Create products with decimal prices
      const productIds: number[] = [];
      for (let i = 1; i <= 100; i++) {
        const productId = await service.addProduct({
          name: `Decimal Product ${i}`,
          category_id: categoryId,
          price: Math.round((Math.random() * 500 + 10) * 100) / 100,
          cost: Math.round((Math.random() * 300 + 5) * 100) / 100,
          quantity: 1000,
          min_stock: 10,
        });
        productIds.push(productId);
      }

      let saleCounter = 0;
      const result = await benchmark('Decimal Price Sales', 200, async () => {
        saleCounter++;
        const productId = productIds[saleCounter % productIds.length];
        const product = await service.getProductById(productId);

        const saleItems = [
          {
            product_id: productId,
            quantity: Math.floor(Math.random() * 5) + 1,
            price: product!.price,
            cost: product!.cost,
            discount: Math.round(Math.random() * 10 * 100) / 100,
            subtotal: 0, // Will be calculated
          },
        ];

        saleItems[0].subtotal =
          saleItems[0].price * saleItems[0].quantity - saleItems[0].discount;

        await service.addSale({
          customer_id: customerId,
          total: saleItems[0].subtotal,
          items: saleItems,
        });
      });

      logBenchmarkResult(result);
      expect(result.operationsPerSecond).toBeGreaterThan(30); // Should handle at least 30 decimal sales per second
    });

    test('should benchmark currency formatting operations', async () => {
      const testPrices = [];
      for (let i = 0; i < 1000; i++) {
        testPrices.push(Math.random() * 10000);
      }

      // Test USD formatting
      const usdSettings = CurrencyManager.getCurrency('USD')!;
      await currencyManager.saveCurrencySettings(usdSettings);

      let priceIndex = 0;
      const usdResult = await benchmark(
        'USD Price Formatting',
        10000,
        async () => {
          const price = testPrices[priceIndex % testPrices.length];
          priceIndex++;
          currencyManager.formatPrice(price);
        }
      );

      logBenchmarkResult(usdResult);
      expect(usdResult.operationsPerSecond).toBeGreaterThan(1000); // Should format at least 1000 prices per second

      // Test MMK formatting
      const mmkSettings = CurrencyManager.getCurrency('MMK')!;
      await currencyManager.saveCurrencySettings(mmkSettings);

      priceIndex = 0;
      const mmkResult = await benchmark(
        'MMK Price Formatting',
        10000,
        async () => {
          const price = testPrices[priceIndex % testPrices.length];
          priceIndex++;
          currencyManager.formatPrice(price);
        }
      );

      logBenchmarkResult(mmkResult);
      expect(mmkResult.operationsPerSecond).toBeGreaterThan(1000); // Should format at least 1000 prices per second
    });

    test('should benchmark price parsing operations', async () => {
      const usdSettings = CurrencyManager.getCurrency('USD')!;
      await currencyManager.saveCurrencySettings(usdSettings);

      const testPriceStrings = [];
      for (let i = 0; i < 1000; i++) {
        const price = Math.random() * 10000;
        testPriceStrings.push(currencyManager.formatPrice(price));
      }

      let stringIndex = 0;
      const result = await benchmark('Price Parsing', 10000, async () => {
        const priceString =
          testPriceStrings[stringIndex % testPriceStrings.length];
        stringIndex++;
        currencyManager.parsePrice(priceString);
      });

      logBenchmarkResult(result);
      expect(result.operationsPerSecond).toBeGreaterThan(1000); // Should parse at least 1000 prices per second
    });
  });

  describe('Database Migration Performance', () => {
    test('should benchmark decimal migration performance', async () => {
      // Create a fresh database for migration testing
      const migrationDb = await SQLite.openDatabaseAsync(':memory:');
      const migrationService = new DatabaseService(migrationDb);
      await migrationService.createTables();

      // Setup test data with integer prices
      const categoryId = await migrationService.addCategory({
        name: 'Migration Category',
        description: 'Category for migration testing',
      });

      const customerId = await migrationService.addCustomer({
        name: 'Migration Customer',
        phone: '555-123-4567',
        email: 'migration@test.com',
        address: '123 Migration St',
      });

      // Insert large amount of test data with integer prices
      const productIds: number[] = [];
      for (let i = 1; i <= 1000; i++) {
        await migrationDb.runAsync(
          `
          INSERT INTO products (name, category_id, price, cost, quantity, min_stock)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
          [
            `Migration Product ${i}`,
            categoryId,
            Math.floor(Math.random() * 50000) + 1000, // Random price in cents
            Math.floor(Math.random() * 30000) + 500, // Random cost in cents
            Math.floor(Math.random() * 100) + 10,
            Math.floor(Math.random() * 20) + 5,
          ]
        );

        const result = (await migrationDb.getFirstAsync(
          'SELECT id FROM products WHERE name = ?',
          [`Migration Product ${i}`]
        )) as { id: number };
        productIds.push(result.id);
      }

      // Create sales data
      for (let i = 1; i <= 500; i++) {
        await migrationDb.runAsync(
          `
          INSERT INTO sales (customer_id, total, created_at)
          VALUES (?, ?, datetime('now'))
        `,
          [customerId, Math.floor(Math.random() * 100000) + 5000]
        );

        const saleResult = (await migrationDb.getFirstAsync(
          'SELECT id FROM sales ORDER BY id DESC LIMIT 1'
        )) as { id: number };

        // Add sale items
        const numItems = Math.floor(Math.random() * 5) + 1;
        for (let j = 0; j < numItems; j++) {
          const productId =
            productIds[Math.floor(Math.random() * productIds.length)];
          const price = Math.floor(Math.random() * 50000) + 1000;
          const cost = Math.floor(Math.random() * 30000) + 500;
          const quantity = Math.floor(Math.random() * 5) + 1;
          const subtotal = price * quantity;

          await migrationDb.runAsync(
            `
            INSERT INTO sale_items (sale_id, product_id, quantity, price, cost, discount, subtotal)
            VALUES (?, ?, ?, ?, ?, 0, ?)
          `,
            [saleResult.id, productId, quantity, price, cost, subtotal]
          );
        }
      }

      // Benchmark the migration
      const migrationResult = await benchmark(
        'Decimal Price Migration',
        1,
        async () => {
          await migrationService.migrateToDecimalPricing();
        }
      );

      logBenchmarkResult(migrationResult);
      expect(migrationResult.totalTime).toBeLessThan(10000); // Migration should complete within 10 seconds

      // Verify migration accuracy
      const migratedProducts = await migrationService.getProducts();
      expect(migratedProducts.length).toBe(1000);
      expect(migratedProducts[0].price).toBeGreaterThan(0);
      expect(migratedProducts[0].price).toBeLessThan(1000); // Should be converted from cents

      await migrationDb.closeAsync();
    });
  });

  describe('Memory Usage and Resource Management', () => {
    test('should handle large result sets efficiently', async () => {
      // Create large dataset
      const categoryId = await service.addCategory({
        name: 'Memory Test Category',
        description: 'Category for memory testing',
      });

      const supplierIds: number[] = [];
      for (let i = 1; i <= 50; i++) {
        const supplierId = await service.addSupplier({
          name: `Memory Supplier ${i}`,
          contact_name: `Contact ${i}`,
          phone: `555-${i.toString().padStart(3, '0')}-0000`,
          address: `${i} Memory Street`,
        });
        supplierIds.push(supplierId);
      }

      // Create many products per supplier
      for (const supplierId of supplierIds) {
        for (let j = 1; j <= 100; j++) {
          await service.addProduct({
            name: `Memory Product ${supplierId}-${j}`,
            category_id: categoryId,
            price: Math.random() * 100 + 10,
            cost: Math.random() * 50 + 5,
            quantity: Math.floor(Math.random() * 100),
            min_stock: 10,
            supplier_id: supplierId,
          });
        }
      }

      // Test memory usage with large queries
      const memoryResult = await benchmark(
        'Large Dataset Query',
        10,
        async () => {
          const suppliers = await service.getSuppliersWithStats();
          expect(suppliers.length).toBe(50);

          // Process all supplier analytics
          for (const supplier of suppliers) {
            await service.getSupplierAnalytics(supplier.id);
          }
        }
      );

      logBenchmarkResult(memoryResult);
      expect(memoryResult.averageTime).toBeLessThan(5000); // Should complete within 5 seconds per iteration
    });
  });

  describe('Optimization Recommendations', () => {
    test('should provide performance optimization insights', () => {
      console.log('\n🚀 Performance Optimization Recommendations:');
      console.log('');
      console.log('1. Database Indexing:');
      console.log('   - Add index on suppliers.name for faster search');
      console.log(
        '   - Add index on products.supplier_id for supplier-product queries'
      );
      console.log(
        '   - Add index on stock_movements.supplier_id for analytics'
      );
      console.log(
        '   - Add composite index on (product_id, created_at) for movement history'
      );
      console.log('');
      console.log('2. Query Optimization:');
      console.log(
        '   - Use LIMIT and OFFSET for pagination to reduce memory usage'
      );
      console.log(
        '   - Implement query result caching for frequently accessed data'
      );
      console.log('   - Use prepared statements for repeated queries');
      console.log('');
      console.log('3. Currency Formatting:');
      console.log('   - Cache formatted prices to avoid repeated calculations');
      console.log('   - Use memoization for currency formatting functions');
      console.log('   - Pre-format prices during data retrieval when possible');
      console.log('');
      console.log('4. Migration Optimization:');
      console.log('   - Process migration in batches to reduce memory usage');
      console.log('   - Use transactions to ensure data consistency');
      console.log('   - Implement progress tracking for large migrations');
      console.log('');
      console.log('5. Memory Management:');
      console.log('   - Implement result streaming for large datasets');
      console.log(
        '   - Use pagination for UI components displaying large lists'
      );
      console.log('   - Clear unused query results from memory');
    });
  });
});
