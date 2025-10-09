import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { beforeEach } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { beforeEach } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { beforeEach } from 'vitest';
import { describe } from 'vitest';
import { beforeEach } from 'vitest';
import { describe } from 'vitest';
import { DataImportService } from '../../services/dataImportService';
import { DatabaseService } from '../../services/database';

// Mock dependencies
jest.mock('../../services/database');
jest.mock('expo-file-system');
jest.mock('expo-document-picker');

const mockDatabase = {
  addProduct: jest.fn(),
  addSale: jest.fn(),
  addCustomer: jest.fn(),
  addStockMovement: jest.fn(),
  getProductByName: jest.fn(),
  getCustomerByPhone: jest.fn(),
  updateProduct: jest.fn(),
  updateCustomer: jest.fn(),
} as unknown as DatabaseService;

const mockFileSystem = {
  readAsStringAsync: jest.fn(),
};

// Mock expo-file-system
jest.mock('expo-file-system', () => mockFileSystem);

describe('DataImportService - Simplified All Data Import', () => {
  let importService: DataImportService;

  beforeEach(() => {
    importService = new DataImportService(mockDatabase);
    jest.clearAllMocks();
  });

  describe('importAllData', () => {
    const mockAllData = {
      metadata: {
        dataType: 'all',
        version: '2.0',
        recordCount: 5,
      },
      data: {
        products: [
          { name: 'Product 1', price: 100, stock: 10 },
          { name: 'Product 2', price: 200, stock: 20 },
        ],
        sales: [{ total: 500, payment_method: 'cash', date: '2024-01-01' }],
        customers: [{ name: 'Customer 1', phone: '123456789' }],
        expenses: [
          { amount: 50, description: 'Office supplies', date: '2024-01-01' },
        ],
        stockMovements: [],
        bulkPricing: [],
        shopSettings: { shopName: 'Test Shop', currency: 'USD' },
      },
    };

    beforeEach(() => {
      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockAllData)
      );
    });

    it('should import all data successfully', async () => {
      (mockDatabase.getProductByName as jest.Mock).mockResolvedValue(null);
      (mockDatabase.getCustomerByPhone as jest.Mock).mockResolvedValue(null);
      (mockDatabase.addProduct as jest.Mock).mockResolvedValue({ id: 1 });
      (mockDatabase.addSale as jest.Mock).mockResolvedValue({ id: 1 });
      (mockDatabase.addCustomer as jest.Mock).mockResolvedValue({ id: 1 });

      const options = {
        batchSize: 10,
        conflictResolution: 'skip' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const result = await importService.importAllData(
        'mock-file-uri',
        options
      );

      expect(result.success).toBe(true);
      expect(result.totalImported).toBeGreaterThan(0);
      expect(result.detailedCounts).toBeDefined();
      expect(result.detailedCounts.products.imported).toBe(2);
      expect(result.detailedCounts.sales.imported).toBe(1);
      expect(result.detailedCounts.customers.imported).toBe(1);
      expect(mockDatabase.addProduct).toHaveBeenCalledTimes(2);
      expect(mockDatabase.addSale).toHaveBeenCalledTimes(1);
      expect(mockDatabase.addCustomer).toHaveBeenCalledTimes(1);
    });

    it('should handle conflicts with skip resolution', async () => {
      (mockDatabase.getProductByName as jest.Mock).mockResolvedValue({ id: 1 });
      (mockDatabase.getCustomerByPhone as jest.Mock).mockResolvedValue({
        id: 1,
      });

      const options = {
        batchSize: 10,
        conflictResolution: 'skip' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const result = await importService.importAllData(
        'mock-file-uri',
        options
      );

      expect(result.success).toBe(true);
      expect(result.totalSkipped).toBeGreaterThan(0);
      expect(result.detailedCounts.products.skipped).toBe(2);
      expect(result.detailedCounts.customers.skipped).toBe(1);
      expect(mockDatabase.addProduct).not.toHaveBeenCalled();
      expect(mockDatabase.addCustomer).not.toHaveBeenCalled();
    });

    it('should handle conflicts with update resolution', async () => {
      (mockDatabase.getProductByName as jest.Mock).mockResolvedValue({ id: 1 });
      (mockDatabase.getCustomerByPhone as jest.Mock).mockResolvedValue({
        id: 1,
      });
      (mockDatabase.updateProduct as jest.Mock).mockResolvedValue(true);
      (mockDatabase.updateCustomer as jest.Mock).mockResolvedValue(true);

      const options = {
        batchSize: 10,
        conflictResolution: 'update' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const result = await importService.importAllData(
        'mock-file-uri',
        options
      );

      expect(result.success).toBe(true);
      expect(result.totalUpdated).toBeGreaterThan(0);
      expect(result.detailedCounts.products.updated).toBe(2);
      expect(result.detailedCounts.customers.updated).toBe(1);
      expect(mockDatabase.updateProduct).toHaveBeenCalledTimes(2);
      expect(mockDatabase.updateCustomer).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid file format', async () => {
      mockFileSystem.readAsStringAsync.mockResolvedValue('invalid json');

      const options = {
        batchSize: 10,
        conflictResolution: 'skip' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const result = await importService.importAllData(
        'mock-file-uri',
        options
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('IMPORT_FAILED');
    });

    it('should validate required fields across all data types', async () => {
      const invalidData = {
        metadata: { dataType: 'all', version: '2.0', recordCount: 2 },
        data: {
          products: [{ price: 100 }], // Missing name
          customers: [{ phone: '123456789' }], // Missing name
          sales: [{ total: 500, payment_method: 'cash', date: '2024-01-01' }], // Valid
        },
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(invalidData)
      );

      const options = {
        batchSize: 10,
        conflictResolution: 'skip' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const result = await importService.importAllData(
        'mock-file-uri',
        options
      );

      expect(result.success).toBe(true);
      expect(result.totalSkipped).toBeGreaterThan(0);
      expect(result.detailedCounts.products.skipped).toBe(1);
      expect(result.detailedCounts.customers.skipped).toBe(1);
      expect(result.detailedCounts.sales.imported).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle batch processing for large datasets', async () => {
      const largeData = {
        metadata: { dataType: 'all', version: '2.0', recordCount: 150 },
        data: {
          products: Array.from({ length: 100 }, (_, i) => ({
            name: `Product ${i + 1}`,
            price: (i + 1) * 10,
            stock: i + 1,
          })),
          customers: Array.from({ length: 50 }, (_, i) => ({
            name: `Customer ${i + 1}`,
            phone: `${1000000000 + i}`,
          })),
          sales: [],
          expenses: [],
          stockMovements: [],
          bulkPricing: [],
          shopSettings: {},
        },
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(largeData)
      );
      (mockDatabase.getProductByName as jest.Mock).mockResolvedValue(null);
      (mockDatabase.getCustomerByPhone as jest.Mock).mockResolvedValue(null);
      (mockDatabase.addProduct as jest.Mock).mockResolvedValue({ id: 1 });
      (mockDatabase.addCustomer as jest.Mock).mockResolvedValue({ id: 1 });

      const options = {
        batchSize: 10,
        conflictResolution: 'skip' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const progressCallback = jest.fn();
      importService.onProgress(progressCallback);

      const result = await importService.importAllData(
        'mock-file-uri',
        options
      );

      expect(result.success).toBe(true);
      expect(result.totalImported).toBe(150);
      expect(result.detailedCounts.products.imported).toBe(100);
      expect(result.detailedCounts.customers.imported).toBe(50);
      expect(progressCallback).toHaveBeenCalled();
    });
  });

  describe('detectAllConflicts', () => {
    it('should detect conflicts across all data types', async () => {
      const mockData = {
        metadata: { dataType: 'all', version: '2.0', recordCount: 4 },
        data: {
          products: [
            { name: 'Existing Product', price: 100 },
            { name: 'New Product', price: 200 },
          ],
          customers: [
            { name: 'Existing Customer', phone: '123456789' },
            { name: 'New Customer', phone: '987654321' },
          ],
          sales: [{ total: 500, payment_method: 'cash', date: '2024-01-01' }],
          expenses: [],
          stockMovements: [],
          bulkPricing: [],
          shopSettings: {},
        },
      };

      // Mock existing data
      (mockDatabase.getProductByName as jest.Mock).mockImplementation((name) =>
        name === 'Existing Product' ? { id: 1, name } : null
      );
      (mockDatabase.getCustomerByPhone as jest.Mock).mockImplementation(
        (phone) => (phone === '123456789' ? { id: 1, phone } : null)
      );

      const conflicts = await importService.detectAllConflicts(mockData);

      expect(conflicts.hasConflicts).toBe(true);
      expect(conflicts.totalConflicts).toBe(2);
      expect(conflicts.conflictsByType.products).toHaveLength(1);
      expect(conflicts.conflictsByType.customers).toHaveLength(1);
      expect(conflicts.conflictsByType.products[0].importData.name).toBe(
        'Existing Product'
      );
      expect(conflicts.conflictsByType.customers[0].importData.phone).toBe(
        '123456789'
      );
    });

    it('should return no conflicts when data is unique', async () => {
      const mockData = {
        metadata: { dataType: 'all', version: '2.0', recordCount: 2 },
        data: {
          products: [{ name: 'New Product', price: 100 }],
          customers: [{ name: 'New Customer', phone: '123456789' }],
          sales: [],
          expenses: [],
          stockMovements: [],
          bulkPricing: [],
          shopSettings: {},
        },
      };

      (mockDatabase.getProductByName as jest.Mock).mockResolvedValue(null);
      (mockDatabase.getCustomerByPhone as jest.Mock).mockResolvedValue(null);

      const conflicts = await importService.detectAllConflicts(mockData);

      expect(conflicts.hasConflicts).toBe(false);
      expect(conflicts.totalConflicts).toBe(0);
      expect(Object.keys(conflicts.conflictsByType)).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully across all data types', async () => {
      const mockData = {
        metadata: { dataType: 'all', version: '2.0', recordCount: 2 },
        data: {
          products: [{ name: 'Product 1', price: 100 }],
          customers: [{ name: 'Customer 1', phone: '123456789' }],
          sales: [],
          expenses: [],
          stockMovements: [],
          bulkPricing: [],
          shopSettings: {},
        },
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockData)
      );
      (mockDatabase.getProductByName as jest.Mock).mockResolvedValue(null);
      (mockDatabase.getCustomerByPhone as jest.Mock).mockResolvedValue(null);
      (mockDatabase.addProduct as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );
      (mockDatabase.addCustomer as jest.Mock).mockResolvedValue({ id: 1 });

      const options = {
        batchSize: 10,
        conflictResolution: 'skip' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const result = await importService.importAllData(
        'mock-file-uri',
        options
      );

      expect(result.success).toBe(true);
      expect(result.detailedCounts.products.skipped).toBe(1);
      expect(result.detailedCounts.customers.imported).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should handle empty data gracefully', async () => {
      const mockData = {
        metadata: { dataType: 'all', version: '2.0', recordCount: 0 },
        data: {
          products: [],
          customers: [],
          sales: [],
          expenses: [],
          stockMovements: [],
          bulkPricing: [],
          shopSettings: {},
        },
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockData)
      );

      const options = {
        batchSize: 10,
        conflictResolution: 'skip' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const result = await importService.importAllData(
        'mock-file-uri',
        options
      );

      expect(result.success).toBe(true);
      expect(result.totalImported).toBe(0);
      expect(result.totalUpdated).toBe(0);
      expect(result.totalSkipped).toBe(0);
    });
  });

  describe('compareByName', () => {
    it('should match products by name', () => {
      const record = { name: 'Test Product', barcode: '123456' };
      const existing = { name: 'Test Product', barcode: '789012' };

      // Access private method using bracket notation
      const result = (importService as any).compareByName(
        record,
        existing,
        'products'
      );
      expect(result).toBe(true);
    });

    it('should match products by barcode', () => {
      const record = { name: 'Product A', barcode: '123456' };
      const existing = { name: 'Product B', barcode: '123456' };

      const result = (importService as any).compareByName(
        record,
        existing,
        'products'
      );
      expect(result).toBe(true);
    });

    it('should not match products when neither name nor barcode match', () => {
      const record = { name: 'Product A', barcode: '123456' };
      const existing = { name: 'Product B', barcode: '789012' };

      const result = (importService as any).compareByName(
        record,
        existing,
        'products'
      );
      expect(result).toBe(false);
    });

    it('should match customers by name', () => {
      const record = { name: 'John Doe', phone: '555-1234' };
      const existing = { name: 'John Doe', phone: '555-5678' };

      const result = (importService as any).compareByName(
        record,
        existing,
        'customers'
      );
      expect(result).toBe(true);
    });

    it('should match customers by phone', () => {
      const record = { name: 'John Doe', phone: '555-1234' };
      const existing = { name: 'Jane Doe', phone: '555-1234' };

      const result = (importService as any).compareByName(
        record,
        existing,
        'customers'
      );
      expect(result).toBe(true);
    });

    it('should not match customers when neither name nor phone match', () => {
      const record = { name: 'John Doe', phone: '555-1234' };
      const existing = { name: 'Jane Doe', phone: '555-5678' };

      const result = (importService as any).compareByName(
        record,
        existing,
        'customers'
      );
      expect(result).toBe(false);
    });

    it('should match categories by name', () => {
      const record = { name: 'Electronics' };
      const existing = { name: 'Electronics' };

      const result = (importService as any).compareByName(
        record,
        existing,
        'categories'
      );
      expect(result).toBe(true);
    });

    it('should not match categories when names differ', () => {
      const record = { name: 'Electronics' };
      const existing = { name: 'Clothing' };

      const result = (importService as any).compareByName(
        record,
        existing,
        'categories'
      );
      expect(result).toBe(false);
    });

    it('should return false for transaction-type records (sales, expenses, stockMovements)', () => {
      const record = { id: '1', amount: 100 };
      const existing = { id: '2', amount: 100 };

      expect(
        (importService as any).compareByName(record, existing, 'sales')
      ).toBe(false);
      expect(
        (importService as any).compareByName(record, existing, 'expenses')
      ).toBe(false);
      expect(
        (importService as any).compareByName(record, existing, 'stockMovements')
      ).toBe(false);
      expect(
        (importService as any).compareByName(record, existing, 'bulkPricing')
      ).toBe(false);
    });

    it('should fall back to name matching for unknown record types', () => {
      const record = { name: 'Test Item' };
      const existing = { name: 'Test Item' };

      const result = (importService as any).compareByName(
        record,
        existing,
        'unknownType'
      );
      expect(result).toBe(true);
    });

    it('should handle missing fields gracefully', () => {
      const record = { name: 'Test Product' };
      const existing = { barcode: '123456' };

      const result = (importService as any).compareByName(
        record,
        existing,
        'products'
      );
      expect(result).toBe(false);
    });

    it('should handle null/undefined values gracefully', () => {
      const record = { name: null, barcode: undefined };
      const existing = { name: 'Test', barcode: '123' };

      const result = (importService as any).compareByName(
        record,
        existing,
        'products'
      );
      expect(result).toBe(false);
    });
  });

  describe('progress tracking', () => {
    it('should track progress correctly for all data import', async () => {
      const mockData = {
        metadata: { dataType: 'all', version: '2.0', recordCount: 75 },
        data: {
          products: Array.from({ length: 50 }, (_, i) => ({
            name: `Product ${i + 1}`,
            price: (i + 1) * 10,
          })),
          customers: Array.from({ length: 25 }, (_, i) => ({
            name: `Customer ${i + 1}`,
            phone: `${1000000000 + i}`,
          })),
          sales: [],
          expenses: [],
          stockMovements: [],
          bulkPricing: [],
          shopSettings: {},
        },
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockData)
      );
      (mockDatabase.getProductByName as jest.Mock).mockResolvedValue(null);
      (mockDatabase.getCustomerByPhone as jest.Mock).mockResolvedValue(null);
      (mockDatabase.addProduct as jest.Mock).mockResolvedValue({ id: 1 });
      (mockDatabase.addCustomer as jest.Mock).mockResolvedValue({ id: 1 });

      const options = {
        batchSize: 10,
        conflictResolution: 'skip' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const progressCallback = jest.fn();
      importService.onProgress(progressCallback);

      await importService.importAllData('mock-file-uri', options);

      expect(progressCallback).toHaveBeenCalled();
      const progressCalls = progressCallback.mock.calls;
      expect(progressCalls.length).toBeGreaterThan(1);

      // Check that progress increases
      const firstCall = progressCalls[0][0];
      const lastCall = progressCalls[progressCalls.length - 1][0];
      expect(lastCall.percentage).toBeGreaterThan(firstCall.percentage);
    });
  });
});
