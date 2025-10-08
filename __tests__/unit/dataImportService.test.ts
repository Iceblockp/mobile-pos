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

describe('DataImportService', () => {
  let importService: DataImportService;

  beforeEach(() => {
    importService = new DataImportService(mockDatabase);
    jest.clearAllMocks();
  });

  describe('importProducts', () => {
    const mockProductData = {
      metadata: {
        dataType: 'products',
        version: '2.0',
        recordCount: 2,
      },
      data: [
        { name: 'Product 1', price: 100, stock: 10 },
        { name: 'Product 2', price: 200, stock: 20 },
      ],
    };

    beforeEach(() => {
      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockProductData)
      );
    });

    it('should import products successfully', async () => {
      (mockDatabase.getProductByName as jest.Mock).mockResolvedValue(null);
      (mockDatabase.addProduct as jest.Mock).mockResolvedValue({ id: 1 });

      const options = {
        batchSize: 10,
        conflictResolution: 'skip' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const result = await importService.importProducts(
        'mock-file-uri',
        options
      );

      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(mockDatabase.addProduct).toHaveBeenCalledTimes(2);
    });

    it('should handle duplicate products with skip resolution', async () => {
      (mockDatabase.getProductByName as jest.Mock).mockResolvedValue({ id: 1 });

      const options = {
        batchSize: 10,
        conflictResolution: 'skip' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const result = await importService.importProducts(
        'mock-file-uri',
        options
      );

      expect(result.success).toBe(true);
      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(2);
      expect(mockDatabase.addProduct).not.toHaveBeenCalled();
    });

    it('should handle duplicate products with update resolution', async () => {
      (mockDatabase.getProductByName as jest.Mock).mockResolvedValue({ id: 1 });
      (mockDatabase.updateProduct as jest.Mock).mockResolvedValue(true);

      const options = {
        batchSize: 10,
        conflictResolution: 'update' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const result = await importService.importProducts(
        'mock-file-uri',
        options
      );

      expect(result.success).toBe(true);
      expect(result.updated).toBe(2);
      expect(mockDatabase.updateProduct).toHaveBeenCalledTimes(2);
    });

    it('should handle invalid file format', async () => {
      mockFileSystem.readAsStringAsync.mockResolvedValue('invalid json');

      const options = {
        batchSize: 10,
        conflictResolution: 'skip' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const result = await importService.importProducts(
        'mock-file-uri',
        options
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('IMPORT_FAILED');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        metadata: { dataType: 'products', version: '2.0', recordCount: 1 },
        data: [{ price: 100 }], // Missing name
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

      const result = await importService.importProducts(
        'mock-file-uri',
        options
      );

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should handle batch processing', async () => {
      const largeData = {
        metadata: { dataType: 'products', version: '2.0', recordCount: 100 },
        data: Array.from({ length: 100 }, (_, i) => ({
          name: `Product ${i + 1}`,
          price: (i + 1) * 10,
          stock: i + 1,
        })),
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(largeData)
      );
      (mockDatabase.getProductByName as jest.Mock).mockResolvedValue(null);
      (mockDatabase.addProduct as jest.Mock).mockResolvedValue({ id: 1 });

      const options = {
        batchSize: 10,
        conflictResolution: 'skip' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const progressCallback = jest.fn();
      importService.onProgress(progressCallback);

      const result = await importService.importProducts(
        'mock-file-uri',
        options
      );

      expect(result.success).toBe(true);
      expect(result.imported).toBe(100);
      expect(progressCallback).toHaveBeenCalled();
    });
  });

  describe('importSales', () => {
    const mockSalesData = {
      metadata: {
        dataType: 'sales',
        version: '2.0',
        recordCount: 2,
      },
      data: [
        { productId: 1, customerId: 1, quantity: 5, total: 500 },
        { productId: 2, customerId: 2, quantity: 3, total: 600 },
      ],
    };

    beforeEach(() => {
      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockSalesData)
      );
    });

    it('should import sales successfully', async () => {
      (mockDatabase.addSale as jest.Mock).mockResolvedValue({ id: 1 });

      const options = {
        batchSize: 10,
        conflictResolution: 'skip' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const result = await importService.importSales('mock-file-uri', options);

      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);
      expect(mockDatabase.addSale).toHaveBeenCalledTimes(2);
    });
  });

  describe('importCustomers', () => {
    const mockCustomerData = {
      metadata: {
        dataType: 'customers',
        version: '2.0',
        recordCount: 2,
      },
      data: [
        { name: 'Customer 1', phone: '123456789' },
        { name: 'Customer 2', phone: '987654321' },
      ],
    };

    beforeEach(() => {
      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockCustomerData)
      );
    });

    it('should import customers successfully', async () => {
      (mockDatabase.getCustomerByPhone as jest.Mock).mockResolvedValue(null);
      (mockDatabase.addCustomer as jest.Mock).mockResolvedValue({ id: 1 });

      const options = {
        batchSize: 10,
        conflictResolution: 'skip' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const result = await importService.importCustomers(
        'mock-file-uri',
        options
      );

      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);
      expect(mockDatabase.addCustomer).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockData = {
        metadata: { dataType: 'products', version: '2.0', recordCount: 1 },
        data: [{ name: 'Product 1', price: 100 }],
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockData)
      );
      (mockDatabase.getProductByName as jest.Mock).mockResolvedValue(null);
      (mockDatabase.addProduct as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const options = {
        batchSize: 10,
        conflictResolution: 'skip' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const result = await importService.importProducts(
        'mock-file-uri',
        options
      );

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
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
    it('should track progress correctly', async () => {
      const mockData = {
        metadata: { dataType: 'products', version: '2.0', recordCount: 50 },
        data: Array.from({ length: 50 }, (_, i) => ({
          name: `Product ${i + 1}`,
          price: (i + 1) * 10,
        })),
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockData)
      );
      (mockDatabase.getProductByName as jest.Mock).mockResolvedValue(null);
      (mockDatabase.addProduct as jest.Mock).mockResolvedValue({ id: 1 });

      const options = {
        batchSize: 10,
        conflictResolution: 'skip' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const progressCallback = jest.fn();
      importService.onProgress(progressCallback);

      await importService.importProducts('mock-file-uri', options);

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
