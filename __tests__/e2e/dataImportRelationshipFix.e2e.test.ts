import { DataImportService } from '../../services/dataImportService';
import { DatabaseService } from '../../services/database';
import * as FileSystem from 'expo-file-system';

// Mock file system
jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
}));

describe('DataImportService - End-to-End Tests', () => {
  let dataImportService: DataImportService;
  let mockDb: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    mockDb = new DatabaseService() as jest.Mocked<DatabaseService>;
    dataImportService = new DataImportService(mockDb);
  });

  describe('Real-world Import Scenarios', () => {
    test('should handle complete POS system data import', async () => {
      // Setup existing data (simulating a partially populated system)
      mockDb.getCategories.mockResolvedValue([
        { id: 'cat-1', name: 'Electronics' },
        { id: 'cat-2', name: 'Books' },
      ]);
      mockDb.getSuppliers.mockResolvedValue([
        { id: 'sup-1', name: 'Tech Corp', phone: '123-456-7890' },
      ]);
      mockDb.getProducts.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Existing Product',
          category_id: 'cat-1',
          supplier_id: 'sup-1',
        },
      ]);
      mockDb.getCustomers.mockResolvedValue([]);
      mockDb.getSalesPaginated.mockResolvedValue([]);
      mockDb.getExpenses.mockResolvedValue([]);
      mockDb.getStockMovements.mockResolvedValue([]);
      mockDb.getBulkPricingForProduct.mockResolvedValue([]);

      // Mock database operations
      mockDb.addCategory.mockResolvedValue('new-cat-id');
      mockDb.addSupplier.mockResolvedValue('new-sup-id');
      mockDb.addProduct.mockResolvedValue('new-prod-id');
      mockDb.addCustomer.mockResolvedValue('new-cust-id');
      mockDb.updateProduct.mockResolvedValue();
      mockDb.updateSupplier.mockResolvedValue();

      // Simulate real export data structure
      const realWorldImportData = {
        version: '2.0',
        exportDate: '2025-10-13T14:12:01.927Z',
        dataType: 'all',
        metadata: {
          exportDate: '2025-10-13T14:12:01.927Z',
          dataType: 'all',
          version: '2.0',
          recordCount: 8,
        },
        data: {
          categories: [
            {
              id: 'cat-3',
              name: 'Clothing',
              description: 'Apparel and accessories',
              created_at: '2025-08-18 03:48:47',
            },
          ],
          suppliers: [
            {
              id: 'sup-1', // Existing supplier (should update)
              name: 'Tech Corp',
              contact_name: 'John Doe',
              phone: '987-654-3210', // Updated phone
              email: 'john@techcorp.com',
              address: '123 Tech Street',
              created_at: '2025-08-18 03:48:47',
            },
            {
              id: 'sup-2', // New supplier
              name: 'Fashion House',
              contact_name: 'Jane Smith',
              phone: '555-123-4567',
              email: 'jane@fashionhouse.com',
              address: '456 Fashion Ave',
              created_at: '2025-08-18 03:48:47',
            },
          ],
          products: [
            {
              id: 'prod-1', // Existing product (should update)
              name: 'Updated Product Name',
              barcode: '1234567890123',
              category_id: 'cat-1',
              price: 150, // Updated price
              cost: 75,
              quantity: 25,
              min_stock: 5,
              supplier_id: 'sup-1',
              imageUrl: 'file:///path/to/image.jpg',
              category: 'Electronics', // Display name
              supplier: 'Tech Corp', // Display name
            },
            {
              id: 'prod-2', // New product with valid relationships
              name: 'New Electronics Product',
              barcode: '9876543210987',
              category_id: 'cat-1',
              price: 200,
              cost: 100,
              quantity: 10,
              min_stock: 3,
              supplier_id: 'sup-2',
              imageUrl: null,
              category: 'Electronics',
              supplier: 'Fashion House',
            },
            {
              id: 'prod-3', // New product with new category
              name: 'Clothing Item',
              barcode: '5555555555555',
              category_id: 'cat-3',
              price: 50,
              cost: 25,
              quantity: 100,
              min_stock: 20,
              supplier_id: 'sup-2',
              imageUrl: null,
              category: 'Clothing',
              supplier: 'Fashion House',
            },
            {
              id: 'prod-4', // Product with invalid category_id but valid category name
              name: 'Fallback Product',
              barcode: '7777777777777',
              category_id: 'invalid-cat-id',
              price: 75,
              cost: 40,
              quantity: 15,
              min_stock: 5,
              supplier_id: 'invalid-sup-id',
              imageUrl: null,
              category: 'Electronics', // Should resolve to cat-1
              supplier: 'Tech Corp', // Should resolve to sup-1
            },
          ],
          customers: [
            {
              id: 'cust-1',
              name: 'John Customer',
              phone: '111-222-3333',
              email: 'john@customer.com',
              address: '789 Customer Lane',
              created_at: '2025-08-18 03:48:47',
            },
          ],
        },
      };

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        JSON.stringify(realWorldImportData)
      );

      // Perform import with update conflict resolution
      const result = await dataImportService.importAllData(
        'real-world-export.json',
        {
          batchSize: 25,
          conflictResolution: 'update',
        }
      );

      // Verify overall success
      expect(result.success).toBe(true);
      expect(result.imported).toBe(4); // 1 category + 1 supplier + 1 customer + 1 new product
      expect(result.updated).toBe(2); // 1 existing supplier + 1 existing product
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify categories
      expect(mockDb.addCategory).toHaveBeenCalledWith({
        id: 'cat-3',
        name: 'Clothing',
        description: 'Apparel and accessories',
      });

      // Verify supplier updates
      expect(mockDb.updateSupplier).toHaveBeenCalledWith('sup-1', {
        name: 'Tech Corp',
        contact_name: 'John Doe',
        phone: '987-654-3210',
        email: 'john@techcorp.com',
        address: '123 Tech Street',
      });

      // Verify new supplier
      expect(mockDb.addSupplier).toHaveBeenCalledWith({
        id: 'sup-2',
        name: 'Fashion House',
        contact_name: 'Jane Smith',
        phone: '555-123-4567',
        email: 'jane@fashionhouse.com',
        address: '456 Fashion Ave',
      });

      // Verify product updates with preserved relationships
      expect(mockDb.updateProduct).toHaveBeenCalledWith('prod-1', {
        name: 'Updated Product Name',
        barcode: '1234567890123',
        category_id: 'cat-1', // Preserved relationship
        price: 150,
        cost: 75,
        quantity: 25,
        min_stock: 5,
        supplier_id: 'sup-1', // Preserved relationship
        imageUrl: null, // Set to null during import
      });

      // Verify new products with correct relationships
      expect(mockDb.addProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'prod-2',
          name: 'New Electronics Product',
          category_id: 'cat-1',
          supplier_id: 'sup-2',
        })
      );

      expect(mockDb.addProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'prod-3',
          name: 'Clothing Item',
          category_id: 'cat-3',
          supplier_id: 'sup-2',
        })
      );

      // Verify fallback relationship resolution
      expect(mockDb.addProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'prod-4',
          name: 'Fallback Product',
          category_id: 'cat-1', // Resolved from category name
          supplier_id: 'sup-1', // Resolved from supplier name
        })
      );

      // Verify customer import
      expect(mockDb.addCustomer).toHaveBeenCalledWith({
        id: 'cust-1',
        name: 'John Customer',
        phone: '111-222-3333',
        email: 'john@customer.com',
        address: '789 Customer Lane',
      });
    });

    test('should handle conflict detection and preview correctly', async () => {
      // Setup existing data that will cause conflicts
      mockDb.getCategories.mockResolvedValue([
        { id: 'cat-1', name: 'Electronics' },
      ]);
      mockDb.getSuppliers.mockResolvedValue([
        { id: 'sup-1', name: 'Tech Corp' },
      ]);
      mockDb.getProducts.mockResolvedValue([
        { id: 'prod-1', name: 'Existing Product', barcode: 'EXIST001' },
      ]);
      mockDb.getCustomers.mockResolvedValue([
        { id: 'cust-1', name: 'John Doe', phone: '123-456-7890' },
      ]);
      mockDb.getSalesPaginated.mockResolvedValue([]);
      mockDb.getExpenses.mockResolvedValue([]);
      mockDb.getStockMovements.mockResolvedValue([]);
      mockDb.getBulkPricingForProduct.mockResolvedValue([]);

      // Import data with various conflict scenarios
      const conflictImportData = {
        version: '2.0',
        dataType: 'all',
        data: {
          products: [
            { id: 'prod-1', name: 'Updated Product', price: 100, cost: 50 }, // UUID conflict
            { id: 'prod-2', name: 'Existing Product', price: 200, cost: 100 }, // Name conflict
            {
              id: 'prod-3',
              name: 'New Product',
              barcode: 'EXIST001',
              price: 150,
              cost: 75,
            }, // Barcode conflict
            { id: 'prod-4', name: 'Completely New', price: 300, cost: 150 }, // No conflict
          ],
          suppliers: [
            { id: 'sup-1', name: 'Updated Tech Corp' }, // UUID conflict
            { id: 'sup-2', name: 'Tech Corp' }, // Name conflict
            { id: 'sup-3', name: 'New Supplier' }, // No conflict
          ],
          customers: [
            { id: 'cust-1', name: 'Updated John Doe' }, // UUID conflict
            { id: 'cust-2', name: 'John Doe' }, // Name conflict
            { id: 'cust-3', name: 'Jane Doe', phone: '123-456-7890' }, // Phone conflict
            { id: 'cust-4', name: 'New Customer' }, // No conflict
          ],
        },
      };

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        JSON.stringify(conflictImportData)
      );

      // Test conflict detection
      const conflicts = await dataImportService.detectAllConflicts(
        conflictImportData.data
      );

      expect(conflicts.hasConflicts).toBe(true);
      expect(conflicts.totalConflicts).toBe(7); // 3 products + 2 suppliers + 2 customers

      // Verify product conflicts
      expect(conflicts.conflictsByType.products).toHaveLength(3);
      expect(conflicts.conflictsByType.products[0].matchedBy).toBe('uuid');
      expect(conflicts.conflictsByType.products[1].matchedBy).toBe('name');
      expect(conflicts.conflictsByType.products[2].matchedBy).toBe('name'); // Barcode match

      // Verify supplier conflicts
      expect(conflicts.conflictsByType.suppliers).toHaveLength(2);
      expect(conflicts.conflictsByType.suppliers[0].matchedBy).toBe('uuid');
      expect(conflicts.conflictsByType.suppliers[1].matchedBy).toBe('name');

      // Verify customer conflicts
      expect(conflicts.conflictsByType.customers).toHaveLength(2);
      expect(conflicts.conflictsByType.customers[0].matchedBy).toBe('uuid');
      expect(conflicts.conflictsByType.customers[1].matchedBy).toBe('name');

      // Test preview functionality
      const preview = await dataImportService.previewImportData(
        'conflict-test.json'
      );

      expect(preview.dataType).toBe('all');
      expect(preview.recordCounts.products).toBe(4);
      expect(preview.recordCounts.suppliers).toBe(3);
      expect(preview.recordCounts.customers).toBe(4);
      expect(preview.conflicts).toHaveLength(7);
      expect(preview.conflictSummary.hasConflicts).toBe(true);
    });

    test('should maintain data integrity across multiple import cycles', async () => {
      // Simulate multiple import cycles to ensure no duplication
      let supplierCallCount = 0;
      let productCallCount = 0;

      // Setup dynamic mock responses
      mockDb.getSuppliers.mockImplementation(async () => {
        supplierCallCount++;
        if (supplierCallCount === 1) {
          return []; // First call: no existing suppliers
        }
        return [{ id: 'sup-1', name: 'Test Supplier' }]; // Subsequent calls: supplier exists
      });

      mockDb.getProducts.mockImplementation(async () => {
        productCallCount++;
        if (productCallCount === 1) {
          return []; // First call: no existing products
        }
        return [
          {
            id: 'prod-1',
            name: 'Test Product',
            category_id: 'cat-1',
            supplier_id: 'sup-1',
          },
        ];
      });

      mockDb.getCategories.mockResolvedValue([
        { id: 'cat-1', name: 'Test Category' },
      ]);
      mockDb.getCustomers.mockResolvedValue([]);
      mockDb.getSalesPaginated.mockResolvedValue([]);
      mockDb.getExpenses.mockResolvedValue([]);
      mockDb.getStockMovements.mockResolvedValue([]);
      mockDb.getBulkPricingForProduct.mockResolvedValue([]);

      mockDb.addSupplier.mockResolvedValue('sup-1');
      mockDb.addProduct.mockResolvedValue('prod-1');
      mockDb.updateSupplier.mockResolvedValue();
      mockDb.updateProduct.mockResolvedValue();

      const importData = {
        version: '2.0',
        dataType: 'all',
        data: {
          suppliers: [
            { id: 'sup-1', name: 'Test Supplier', phone: '123-456-7890' },
          ],
          products: [
            {
              id: 'prod-1',
              name: 'Test Product',
              category_id: 'cat-1',
              supplier_id: 'sup-1',
              price: 100,
              cost: 50,
            },
          ],
        },
      };

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        JSON.stringify(importData)
      );

      // First import cycle
      const result1 = await dataImportService.importAllData('test.json', {
        batchSize: 10,
        conflictResolution: 'update',
      });

      expect(result1.success).toBe(true);
      expect(result1.imported).toBe(2); // Both supplier and product added
      expect(result1.updated).toBe(0);

      // Second import cycle (should update, not duplicate)
      const result2 = await dataImportService.importAllData('test.json', {
        batchSize: 10,
        conflictResolution: 'update',
      });

      expect(result2.success).toBe(true);
      expect(result2.imported).toBe(0);
      expect(result2.updated).toBe(2); // Both supplier and product updated

      // Verify no duplication occurred
      expect(mockDb.addSupplier).toHaveBeenCalledTimes(1);
      expect(mockDb.addProduct).toHaveBeenCalledTimes(1);
      expect(mockDb.updateSupplier).toHaveBeenCalledTimes(1);
      expect(mockDb.updateProduct).toHaveBeenCalledTimes(1);
    });
  });
});
