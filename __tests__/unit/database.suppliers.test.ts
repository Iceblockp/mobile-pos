import {
  DatabaseService,
  Supplier,
  SupplierWithStats,
} from '@/services/database';
import * as SQLite from 'expo-sqlite';

describe('DatabaseService - Supplier Management', () => {
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
    await db.execAsync('DELETE FROM suppliers');
    await db.execAsync('DELETE FROM products');
    await db.execAsync('DELETE FROM stock_movements');
  });

  describe('Basic CRUD Operations', () => {
    test('should add a new supplier', async () => {
      const supplierData = {
        name: 'Test Supplier',
        contact_name: 'John Doe',
        phone: '123-456-7890',
        email: 'john@testsupplier.com',
        address: '123 Test Street',
      };

      const supplierId = await service.addSupplier(supplierData);
      expect(supplierId).toBeGreaterThan(0);

      const supplier = await service.getSupplierById(supplierId);
      expect(supplier).toBeTruthy();
      expect(supplier?.name).toBe(supplierData.name);
      expect(supplier?.email).toBe(supplierData.email);
    });

    test('should add supplier without email', async () => {
      const supplierData = {
        name: 'Test Supplier No Email',
        contact_name: 'Jane Doe',
        phone: '123-456-7890',
        address: '123 Test Street',
      };

      const supplierId = await service.addSupplier(supplierData);
      const supplier = await service.getSupplierById(supplierId);

      expect(supplier).toBeTruthy();
      expect(supplier?.email).toBeUndefined();
    });

    test('should update supplier information', async () => {
      const supplierId = await service.addSupplier({
        name: 'Original Name',
        contact_name: 'John Doe',
        phone: '123-456-7890',
        address: '123 Test Street',
      });

      await service.updateSupplier(supplierId, {
        name: 'Updated Name',
        email: 'updated@email.com',
      });

      const supplier = await service.getSupplierById(supplierId);
      expect(supplier?.name).toBe('Updated Name');
      expect(supplier?.email).toBe('updated@email.com');
      expect(supplier?.contact_name).toBe('John Doe'); // Should remain unchanged
    });

    test('should get all suppliers', async () => {
      await service.addSupplier({
        name: 'Supplier 1',
        contact_name: 'Contact 1',
        phone: '111-111-1111',
        address: 'Address 1',
      });

      await service.addSupplier({
        name: 'Supplier 2',
        contact_name: 'Contact 2',
        phone: '222-222-2222',
        address: 'Address 2',
      });

      const suppliers = await service.getSuppliers();
      expect(suppliers).toHaveLength(2);
      expect(suppliers[0].name).toBe('Supplier 1'); // Should be ordered by name
    });

    test('should delete supplier when no products are associated', async () => {
      const supplierId = await service.addSupplier({
        name: 'Test Supplier',
        contact_name: 'John Doe',
        phone: '123-456-7890',
        address: '123 Test Street',
      });

      await service.deleteSupplier(supplierId);

      const supplier = await service.getSupplierById(supplierId);
      expect(supplier).toBeNull();
    });

    test('should prevent deletion of supplier with associated products', async () => {
      // First add a category
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      // Add supplier
      const supplierId = await service.addSupplier({
        name: 'Test Supplier',
        contact_name: 'John Doe',
        phone: '123-456-7890',
        address: '123 Test Street',
      });

      // Add product with supplier
      await service.addProduct({
        name: 'Test Product',
        category_id: categoryId,
        price: 100,
        cost: 50,
        quantity: 10,
        min_stock: 5,
        supplier_id: supplierId,
      });

      // Try to delete supplier - should fail
      await expect(service.deleteSupplier(supplierId)).rejects.toThrow(
        'Cannot delete supplier with associated products'
      );
    });
  });

  describe('Enhanced Supplier Queries', () => {
    test('should get suppliers with stats', async () => {
      // Add category first
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      // Add supplier
      const supplierId = await service.addSupplier({
        name: 'Test Supplier',
        contact_name: 'John Doe',
        phone: '123-456-7890',
        address: '123 Test Street',
      });

      // Add product
      const productId = await service.addProduct({
        name: 'Test Product',
        category_id: categoryId,
        price: 100,
        cost: 50,
        quantity: 10,
        min_stock: 5,
        supplier_id: supplierId,
      });

      // Add stock movement
      await service.addStockMovement({
        product_id: productId,
        type: 'stock_in',
        quantity: 5,
        supplier_id: supplierId,
        unit_cost: 50,
      });

      const suppliers = await service.getSuppliersWithStats();
      expect(suppliers).toHaveLength(1);
      expect(suppliers[0].total_products).toBe(1);
      expect(suppliers[0].recent_deliveries).toBe(1);
      expect(suppliers[0].total_purchase_value).toBe(250); // 5 * 50
    });

    test('should search suppliers by name', async () => {
      await service.addSupplier({
        name: 'ABC Supplier',
        contact_name: 'John Doe',
        phone: '123-456-7890',
        address: '123 Test Street',
      });

      await service.addSupplier({
        name: 'XYZ Supplier',
        contact_name: 'Jane Doe',
        phone: '987-654-3210',
        address: '456 Test Avenue',
      });

      const searchResults = await service.getSuppliersWithStats('ABC');
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].name).toBe('ABC Supplier');
    });

    test('should search suppliers by contact name', async () => {
      await service.addSupplier({
        name: 'Test Supplier',
        contact_name: 'John Smith',
        phone: '123-456-7890',
        address: '123 Test Street',
      });

      const searchResults = await service.getSuppliersWithStats('Smith');
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].contact_name).toBe('John Smith');
    });

    test('should get supplier products', async () => {
      // Setup data
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      const supplierId = await service.addSupplier({
        name: 'Test Supplier',
        contact_name: 'John Doe',
        phone: '123-456-7890',
        address: '123 Test Street',
      });

      const productId1 = await service.addProduct({
        name: 'Product 1',
        category_id: categoryId,
        price: 100,
        cost: 50,
        quantity: 10,
        min_stock: 5,
        supplier_id: supplierId,
      });

      const productId2 = await service.addProduct({
        name: 'Product 2',
        category_id: categoryId,
        price: 200,
        cost: 100,
        quantity: 20,
        min_stock: 10,
        supplier_id: supplierId,
      });

      // Add stock movements
      await service.addStockMovement({
        product_id: productId1,
        type: 'stock_in',
        quantity: 5,
        supplier_id: supplierId,
      });

      const supplierProducts = await service.getSupplierProducts(supplierId);
      expect(supplierProducts).toHaveLength(2);
      expect(
        supplierProducts.find((p) => p.product_name === 'Product 1')
      ).toBeTruthy();
      expect(
        supplierProducts.find((p) => p.product_name === 'Product 2')
      ).toBeTruthy();
    });

    test('should get supplier analytics', async () => {
      // Setup data
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      const supplierId = await service.addSupplier({
        name: 'Test Supplier',
        contact_name: 'John Doe',
        phone: '123-456-7890',
        address: '123 Test Street',
      });

      const productId = await service.addProduct({
        name: 'Test Product',
        category_id: categoryId,
        price: 100,
        cost: 50,
        quantity: 10,
        min_stock: 5,
        supplier_id: supplierId,
      });

      // Add multiple stock movements
      await service.addStockMovement({
        product_id: productId,
        type: 'stock_in',
        quantity: 10,
        supplier_id: supplierId,
        unit_cost: 50,
      });

      await service.addStockMovement({
        product_id: productId,
        type: 'stock_in',
        quantity: 5,
        supplier_id: supplierId,
        unit_cost: 45,
      });

      const analytics = await service.getSupplierAnalytics(supplierId);
      expect(analytics.totalProducts).toBe(1);
      expect(analytics.totalPurchaseValue).toBe(725); // (10 * 50) + (5 * 45)
      expect(analytics.recentDeliveries).toHaveLength(2);
      expect(analytics.topProducts).toHaveLength(1);
    });
  });

  describe('Data Validation', () => {
    test('should validate required fields', async () => {
      // Test with missing required fields
      await expect(
        service.addSupplier({
          name: '',
          contact_name: 'John Doe',
          phone: '123-456-7890',
          address: '123 Test Street',
        })
      ).rejects.toThrow();
    });

    test('should handle optional email field', async () => {
      const supplierData = {
        name: 'Test Supplier',
        contact_name: 'John Doe',
        phone: '123-456-7890',
        address: '123 Test Street',
      };

      const supplierId = await service.addSupplier(supplierData);
      const supplier = await service.getSupplierById(supplierId);

      expect(supplier?.email).toBeUndefined();
    });
  });

  describe('Relationship Management', () => {
    test('should handle products without suppliers', async () => {
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      // Add product without supplier
      const productId = await service.addProduct({
        name: 'Product Without Supplier',
        category_id: categoryId,
        price: 100,
        cost: 50,
        quantity: 10,
        min_stock: 5,
      });

      const product = await service.getProductById(productId);
      expect(product?.supplier_id).toBeUndefined();
    });

    test('should update product supplier relationships', async () => {
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      const supplier1Id = await service.addSupplier({
        name: 'Supplier 1',
        contact_name: 'John Doe',
        phone: '123-456-7890',
        address: '123 Test Street',
      });

      const supplier2Id = await service.addSupplier({
        name: 'Supplier 2',
        contact_name: 'Jane Doe',
        phone: '987-654-3210',
        address: '456 Test Avenue',
      });

      const productId = await service.addProduct({
        name: 'Test Product',
        category_id: categoryId,
        price: 100,
        cost: 50,
        quantity: 10,
        min_stock: 5,
        supplier_id: supplier1Id,
      });

      // Change supplier
      await service.updateProduct(productId, { supplier_id: supplier2Id });

      const product = await service.getProductById(productId);
      expect(product?.supplier_id).toBe(supplier2Id);
    });
  });

  describe('Performance and Pagination', () => {
    test('should handle pagination correctly', async () => {
      // Add multiple suppliers
      for (let i = 1; i <= 25; i++) {
        await service.addSupplier({
          name: `Supplier ${i.toString().padStart(2, '0')}`,
          contact_name: `Contact ${i}`,
          phone: `123-456-${i.toString().padStart(4, '0')}`,
          address: `${i} Test Street`,
        });
      }

      // Test first page
      const page1 = await service.getSuppliersWithStats(undefined, 1, 10);
      expect(page1).toHaveLength(10);

      // Test second page
      const page2 = await service.getSuppliersWithStats(undefined, 2, 10);
      expect(page2).toHaveLength(10);

      // Test third page
      const page3 = await service.getSuppliersWithStats(undefined, 3, 10);
      expect(page3).toHaveLength(5);
    });

    test('should handle search with pagination', async () => {
      // Add suppliers with different names
      await service.addSupplier({
        name: 'ABC Supplier 1',
        contact_name: 'John Doe',
        phone: '123-456-7890',
        address: '123 Test Street',
      });

      await service.addSupplier({
        name: 'ABC Supplier 2',
        contact_name: 'Jane Doe',
        phone: '987-654-3210',
        address: '456 Test Avenue',
      });

      await service.addSupplier({
        name: 'XYZ Supplier',
        contact_name: 'Bob Smith',
        phone: '555-555-5555',
        address: '789 Test Boulevard',
      });

      const searchResults = await service.getSuppliersWithStats('ABC', 1, 10);
      expect(searchResults).toHaveLength(2);
      expect(searchResults.every((s) => s.name.includes('ABC'))).toBe(true);
    });
  });

  describe('Analytics and Reporting', () => {
    test('should calculate supplier analytics correctly', async () => {
      // Setup test data
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      const supplierId = await service.addSupplier({
        name: 'Test Supplier',
        contact_name: 'John Doe',
        phone: '123-456-7890',
        address: '123 Test Street',
      });

      // Add multiple products
      const productId1 = await service.addProduct({
        name: 'Product 1',
        category_id: categoryId,
        price: 100,
        cost: 50,
        quantity: 10,
        min_stock: 5,
        supplier_id: supplierId,
      });

      const productId2 = await service.addProduct({
        name: 'Product 2',
        category_id: categoryId,
        price: 200,
        cost: 100,
        quantity: 20,
        min_stock: 10,
        supplier_id: supplierId,
      });

      // Add stock movements with different costs
      await service.addStockMovement({
        product_id: productId1,
        type: 'stock_in',
        quantity: 10,
        supplier_id: supplierId,
        unit_cost: 45,
      });

      await service.addStockMovement({
        product_id: productId2,
        type: 'stock_in',
        quantity: 15,
        supplier_id: supplierId,
        unit_cost: 95,
      });

      const analytics = await service.getSupplierAnalytics(supplierId);

      expect(analytics.totalProducts).toBe(2);
      expect(analytics.totalPurchaseValue).toBe(1875); // (10 * 45) + (15 * 95)
      expect(analytics.recentDeliveries).toHaveLength(2);
      expect(analytics.topProducts).toHaveLength(2);
    });

    test('should handle suppliers with no products', async () => {
      const supplierId = await service.addSupplier({
        name: 'Empty Supplier',
        contact_name: 'John Doe',
        phone: '123-456-7890',
        address: '123 Test Street',
      });

      const analytics = await service.getSupplierAnalytics(supplierId);

      expect(analytics.totalProducts).toBe(0);
      expect(analytics.totalPurchaseValue).toBe(0);
      expect(analytics.recentDeliveries).toHaveLength(0);
      expect(analytics.topProducts).toHaveLength(0);
    });

    test('should get supplier products with delivery history', async () => {
      // Setup test data
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      const supplierId = await service.addSupplier({
        name: 'Test Supplier',
        contact_name: 'John Doe',
        phone: '123-456-7890',
        address: '123 Test Street',
      });

      const productId = await service.addProduct({
        name: 'Test Product',
        category_id: categoryId,
        price: 100,
        cost: 50,
        quantity: 10,
        min_stock: 5,
        supplier_id: supplierId,
      });

      // Add stock movements
      await service.addStockMovement({
        product_id: productId,
        type: 'stock_in',
        quantity: 20,
        supplier_id: supplierId,
      });

      await service.addStockMovement({
        product_id: productId,
        type: 'stock_in',
        quantity: 10,
        supplier_id: supplierId,
      });

      const supplierProducts = await service.getSupplierProducts(supplierId);

      expect(supplierProducts).toHaveLength(1);
      expect(supplierProducts[0].product_name).toBe('Test Product');
      expect(supplierProducts[0].total_received).toBe(30);
      expect(supplierProducts[0].last_delivery_date).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent supplier queries', async () => {
      const supplier = await service.getSupplierById(999);
      expect(supplier).toBeNull();

      const products = await service.getSupplierProducts(999);
      expect(products).toHaveLength(0);

      const analytics = await service.getSupplierAnalytics(999);
      expect(analytics.totalProducts).toBe(0);
      expect(analytics.totalPurchaseValue).toBe(0);
    });

    test('should handle invalid supplier updates', async () => {
      const supplierId = await service.addSupplier({
        name: 'Test Supplier',
        contact_name: 'John Doe',
        phone: '123-456-7890',
        address: '123 Test Street',
      });

      // Try to update with invalid data
      await expect(
        service.updateSupplier(supplierId, { name: '' })
      ).rejects.toThrow();
    });

    test('should handle duplicate supplier names gracefully', async () => {
      const supplierData = {
        name: 'Duplicate Supplier',
        contact_name: 'John Doe',
        phone: '123-456-7890',
        address: '123 Test Street',
      };

      await service.addSupplier(supplierData);

      // Adding another supplier with same name should work (business decision)
      const secondSupplierId = await service.addSupplier({
        ...supplierData,
        contact_name: 'Jane Doe',
        phone: '987-654-3210',
      });

      expect(secondSupplierId).toBeGreaterThan(0);
    });

    test('should handle stock movements with null supplier_id', async () => {
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      const supplierId = await service.addSupplier({
        name: 'Test Supplier',
        contact_name: 'John Doe',
        phone: '123-456-7890',
        address: '123 Test Street',
      });

      const productId = await service.addProduct({
        name: 'Test Product',
        category_id: categoryId,
        price: 100,
        cost: 50,
        quantity: 10,
        min_stock: 5,
        supplier_id: supplierId,
      });

      // Add stock movement without supplier
      await service.addStockMovement({
        product_id: productId,
        type: 'stock_in',
        quantity: 5,
        unit_cost: 50,
      });

      // Should still work and not affect supplier analytics
      const analytics = await service.getSupplierAnalytics(supplierId);
      expect(analytics.totalProducts).toBe(1);
      expect(analytics.recentDeliveries).toHaveLength(0); // No deliveries from this supplier
    });
  });

  describe('Integration with Stock Movements', () => {
    test('should handle supplier deletion with stock movements', async () => {
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      const supplierId = await service.addSupplier({
        name: 'Test Supplier',
        contact_name: 'John Doe',
        phone: '123-456-7890',
        address: '123 Test Street',
      });

      const productId = await service.addProduct({
        name: 'Test Product',
        category_id: categoryId,
        price: 100,
        cost: 50,
        quantity: 10,
        min_stock: 5,
      });

      // Add stock movement with supplier
      await service.addStockMovement({
        product_id: productId,
        type: 'stock_in',
        quantity: 5,
        supplier_id: supplierId,
        unit_cost: 50,
      });

      // Should be able to delete supplier (stock movements will have supplier_id set to NULL)
      await service.deleteSupplier(supplierId);

      const supplier = await service.getSupplierById(supplierId);
      expect(supplier).toBeNull();

      // Stock movement should still exist but with null supplier_id
      const movements = await service.getStockMovements({ productId });
      expect(movements).toHaveLength(1);
      expect(movements[0].supplier_id).toBeNull();
    });

    test('should calculate recent deliveries correctly', async () => {
      const categoryId = await service.addCategory({
        name: 'Test Category',
        description: 'Test Description',
      });

      const supplierId = await service.addSupplier({
        name: 'Test Supplier',
        contact_name: 'John Doe',
        phone: '123-456-7890',
        address: '123 Test Street',
      });

      const productId = await service.addProduct({
        name: 'Test Product',
        category_id: categoryId,
        price: 100,
        cost: 50,
        quantity: 10,
        min_stock: 5,
        supplier_id: supplierId,
      });

      // Add recent stock movement (within 30 days)
      await service.addStockMovement({
        product_id: productId,
        type: 'stock_in',
        quantity: 5,
        supplier_id: supplierId,
        unit_cost: 50,
      });

      // Add old stock movement (simulate by manually inserting with old date)
      await db.runAsync(
        `
        INSERT INTO stock_movements (product_id, type, quantity, supplier_id, unit_cost, created_at)
        VALUES (?, 'stock_in', 10, ?, 45, date('now', '-60 days'))
      `,
        [productId, supplierId]
      );

      const suppliers = await service.getSuppliersWithStats();
      expect(suppliers).toHaveLength(1);
      expect(suppliers[0].recent_deliveries).toBe(1); // Only the recent one
      expect(suppliers[0].total_purchase_value).toBeGreaterThan(0); // Should include both
    });
  });
});
