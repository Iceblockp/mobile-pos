import { DataImportService } from '../../services/dataImportService';
import { DatabaseService } from '../../services/database';
import * as FileSystem from 'expo-file-system';

// Mock file system
jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
}));

describe('DataImportService - Integration Tests', () => {
  let dataImportService: DataImportService;
  let mockDb: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    mockDb = new DatabaseService() as jest.Mocked<DatabaseService>;
    dataImportService = new DataImportService(mockDb);

    // Mock file system
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('{}');
  });

  describe('Complete Import Process', () => {
    test('should import products with proper relationships', async () => {
      // Setup existing data
      mockDb.getCategories.mockResolvedValue([
        { id: 'cat-1', name: 'Electronics' },
      ]);
      mockDb.getSuppliers.mockResolvedValue([
        { id: 'sup-1', name: 'Tech Corp' },
      ]);
      mockDb.getProducts.mockResolvedValue([]);
      mockDb.getCustomers.mockResolvedValue([]);
      mockDb.getSalesPaginated.mockResolvedValue([]);
      mockDb.getExpenses.mockResolvedValue([]);
      mockDb.getStockMovements.mockResolvedValue([]);
      mockDb.getBulkPricingForProduct.mockResolvedValue([]);

      // Mock add operations
      mockDb.addProduct.mockResolvedValue('new-product-id');

      // Setup import data
      const importData = {
        version: '2.0',
        dataType: 'all',
        data: {
          products: [
            {
              id: 'prod-1',
              name: 'Test Product',
              category_id: 'cat-1',
              supplier_id: 'sup-1',
              price: 100,
              cost: 50,
              quantity: 10,
            },
          ],
        },
      };

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        JSON.stringify(importData)
      );

      const result = await dataImportService.importAllData('test-file.json', {
        batchSize: 10,
        conflictResolution: 'update',
      });

      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);
      expect(mockDb.addProduct).toHaveBeenCalledWith({
        id: 'prod-1',
        name: 'Test Product',
        barcode: null,
        category_id: 'cat-1',
        supplier_id: 'sup-1',
        price: 100,
        cost: 50,
        quantity: 10,
        min_stock: 10,
        imageUrl: null,
      });
    });

    test('should handle supplier conflicts with update resolution', async () => {
      // Setup existing data
      mockDb.getSuppliers.mockResolvedValue([
        { id: 'sup-1', name: 'Existing Supplier', phone: '123-456-7890' },
      ]);
      mockDb.getCategories.mockResolvedValue([]);
      mockDb.getProducts.mockResolvedValue([]);
      mockDb.getCustomers.mockResolvedValue([]);
      mockDb.getSalesPaginated.mockResolvedValue([]);
      mockDb.getExpenses.mockResolvedValue([]);
      mockDb.getStockMovements.mockResolvedValue([]);
      mockDb.getBulkPricingForProduct.mockResolvedValue([]);

      // Mock update operation
      mockDb.updateSupplier.mockResolvedValue();

      // Setup import data with conflicting supplier
      const importData = {
        version: '2.0',
        dataType: 'all',
        data: {
          suppliers: [
            {
              id: 'sup-1',
              name: 'Updated Supplier',
              phone: '987-654-3210',
              email: 'updated@example.com',
            },
          ],
        },
      };

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        JSON.stringify(importData)
      );

      const result = await dataImportService.importAllData('test-file.json', {
        batchSize: 10,
        conflictResolution: 'update',
      });

      expect(result.success).toBe(true);
      expect(result.imported).toBe(0);
      expect(result.updated).toBe(1);
      expect(result.skipped).toBe(0);
      expect(mockDb.updateSupplier).toHaveBeenCalledWith('sup-1', {
        name: 'Updated Supplier',
        contact_name: '',
        phone: '987-654-3210',
        email: 'updated@example.com',
        address: '',
      });
    });

    test('should handle supplier conflicts with skip resolution', async () => {
      // Setup existing data
      mockDb.getSuppliers.mockResolvedValue([
        { id: 'sup-1', name: 'Existing Supplier' },
      ]);
      mockDb.getCategories.mockResolvedValue([]);
      mockDb.getProducts.mockResolvedValue([]);
      mockDb.getCustomers.mockResolvedValue([]);
      mockDb.getSalesPaginated.mockResolvedValue([]);
      mockDb.getExpenses.mockResolvedValue([]);
      mockDb.getStockMovements.mockResolvedValue([]);
      mockDb.getBulkPricingForProduct.mockResolvedValue([]);

      // Setup import data with conflicting supplier
      const importData = {
        version: '2.0',
        dataType: 'all',
        data: {
          suppliers: [
            {
              id: 'sup-1',
              name: 'Updated Supplier',
            },
          ],
        },
      };

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        JSON.stringify(importData)
      );

      const result = await dataImportService.importAllData('test-file.json', {
        batchSize: 10,
        conflictResolution: 'skip',
      });

      expect(result.success).toBe(true);
      expect(result.imported).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockDb.updateSupplier).not.toHaveBeenCalled();
      expect(mockDb.addSupplier).not.toHaveBeenCalled();
    });

    test('should create missing categories and suppliers for products', async () => {
      // Setup existing data (empty)
      mockDb.getCategories.mockResolvedValue([]);
      mockDb.getSuppliers.mockResolvedValue([]);
      mockDb.getProducts.mockResolvedValue([]);
      mockDb.getCustomers.mockResolvedValue([]);
      mockDb.getSalesPaginated.mockResolvedValue([]);
      mockDb.getExpenses.mockResolvedValue([]);
      mockDb.getStockMovements.mockResolvedValue([]);
      mockDb.getBulkPricingForProduct.mockResolvedValue([]);

      // Mock add operations
      mockDb.addCategory.mockResolvedValue('new-cat-id');
      mockDb.addSupplier.mockResolvedValue('new-sup-id');
      mockDb.addProduct.mockResolvedValue('new-product-id');

      // Setup import data with product referencing non-existent category/supplier by name
      const importData = {
        version: '2.0',
        dataType: 'all',
        data: {
          products: [
            {
              id: 'prod-1',
              name: 'Test Product',
              category_id: 'invalid-cat-id',
              category: 'New Category',
              supplier_id: 'invalid-sup-id',
              supplier: 'New Supplier',
              price: 100,
              cost: 50,
            },
          ],
        },
      };

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        JSON.stringify(importData)
      );

      const result = await dataImportService.importAllData('test-file.json', {
        batchSize: 10,
        conflictResolution: 'update',
      });

      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);

      // Should create new category
      expect(mockDb.addCategory).toHaveBeenCalledWith({
        name: 'New Category',
        description: '',
      });

      // Should create new supplier
      expect(mockDb.addSupplier).toHaveBeenCalledWith({
        name: 'New Supplier',
        contact_name: '',
        phone: '',
        email: '',
        address: '',
      });

      // Should add product with resolved relationships
      expect(mockDb.addProduct).toHaveBeenCalledWith({
        id: 'prod-1',
        name: 'Test Product',
        barcode: null,
        category_id: 'new-cat-id',
        supplier_id: 'new-sup-id',
        price: 100,
        cost: 50,
        quantity: 0,
        min_stock: 10,
        imageUrl: null,
      });
    });

    test('should handle multiple import cycles without duplication', async () => {
      // Setup existing data after first import
      const existingSupplier = { id: 'sup-1', name: 'Test Supplier' };
      mockDb.getSuppliers.mockResolvedValue([existingSupplier]);
      mockDb.getCategories.mockResolvedValue([]);
      mockDb.getProducts.mockResolvedValue([]);
      mockDb.getCustomers.mockResolvedValue([]);
      mockDb.getSalesPaginated.mockResolvedValue([]);
      mockDb.getExpenses.mockResolvedValue([]);
      mockDb.getStockMovements.mockResolvedValue([]);
      mockDb.getBulkPricingForProduct.mockResolvedValue([]);

      // Mock update operation
      mockDb.updateSupplier.mockResolvedValue();

      // Setup import data (same supplier)
      const importData = {
        version: '2.0',
        dataType: 'all',
        data: {
          suppliers: [
            {
              id: 'sup-1',
              name: 'Test Supplier',
              phone: '123-456-7890',
            },
          ],
        },
      };

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        JSON.stringify(importData)
      );

      // First import
      const result1 = await dataImportService.importAllData('test-file.json', {
        batchSize: 10,
        conflictResolution: 'update',
      });

      // Second import (should update, not duplicate)
      const result2 = await dataImportService.importAllData('test-file.json', {
        batchSize: 10,
        conflictResolution: 'update',
      });

      expect(result1.success).toBe(true);
      expect(result1.updated).toBe(1);
      expect(result1.imported).toBe(0);

      expect(result2.success).toBe(true);
      expect(result2.updated).toBe(1);
      expect(result2.imported).toBe(0);

      // Should not create new supplier, only update existing
      expect(mockDb.addSupplier).not.toHaveBeenCalled();
      expect(mockDb.updateSupplier).toHaveBeenCalledTimes(2);
    });

    test('should handle validation errors gracefully', async () => {
      // Setup existing data
      mockDb.getCategories.mockResolvedValue([]);
      mockDb.getSuppliers.mockResolvedValue([]);
      mockDb.getProducts.mockResolvedValue([]);
      mockDb.getCustomers.mockResolvedValue([]);
      mockDb.getSalesPaginated.mockResolvedValue([]);
      mockDb.getExpenses.mockResolvedValue([]);
      mockDb.getStockMovements.mockResolvedValue([]);
      mockDb.getBulkPricingForProduct.mockResolvedValue([]);

      // Setup import data with invalid records
      const importData = {
        version: '2.0',
        dataType: 'all',
        data: {
          products: [
            { id: 'prod-1', price: 100, cost: 50 }, // Missing name
            { id: 'prod-2', name: 'Valid Product', price: 100, cost: 50 }, // Valid
          ],
          suppliers: [
            { id: 'sup-1' }, // Missing name
            { id: 'sup-2', name: 'Valid Supplier' }, // Valid
          ],
        },
      };

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        JSON.stringify(importData)
      );

      mockDb.addProduct.mockResolvedValue('new-product-id');
      mockDb.addSupplier.mockResolvedValue('new-supplier-id');
      mockDb.addCategory.mockResolvedValue('default-cat-id');

      const result = await dataImportService.importAllData('test-file.json', {
        batchSize: 10,
        conflictResolution: 'update',
      });

      expect(result.success).toBe(true);
      expect(result.imported).toBe(2); // Only valid records
      expect(result.skipped).toBe(2); // Invalid records
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].message).toContain('missing required fields');
      expect(result.errors[1].message).toContain('missing required fields');
    });
  });
});
