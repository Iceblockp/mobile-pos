import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock AsyncStorage first
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

// Mock expo modules
vi.mock('expo-file-system', () => ({
  documentDirectory: 'file://mock-directory/',
  readAsStringAsync: vi.fn(),
  writeAsStringAsync: vi.fn(),
  getInfoAsync: vi.fn(),
}));

vi.mock('expo-document-picker', () => ({
  getDocumentAsync: vi.fn(),
}));

vi.mock('expo-crypto', () => ({
  digestStringAsync: vi.fn(),
  randomUUID: vi.fn(() =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    })
  ),
}));

vi.mock('expo-sharing', () => ({
  shareAsync: vi.fn(),
}));

// Mock the database service
vi.mock('../../services/database', () => ({
  DatabaseService: vi.fn().mockImplementation(() => ({
    getProducts: vi.fn().mockResolvedValue([]),
    getCustomers: vi.fn().mockResolvedValue([]),
    getCategories: vi.fn().mockResolvedValue([]),
    getSalesPaginated: vi.fn().mockResolvedValue([]),
    getExpenses: vi.fn().mockResolvedValue([]),
    getStockMovements: vi.fn().mockResolvedValue([]),
    getBulkPricingForProduct: vi.fn().mockResolvedValue([]),
  })),
}));

// Import after mocking
import { DataImportService } from '../../services/dataImportService';
import { DatabaseService } from '../../services/database';
import { generateUUID, isValidUUID } from '../../utils/uuid';

describe('UUID-based Conflict Detection', () => {
  let dataImportService: DataImportService;
  let mockDatabase: vi.Mocked<DatabaseService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDatabase = new DatabaseService() as vi.Mocked<DatabaseService>;
    dataImportService = new DataImportService(mockDatabase);
  });

  describe('compareByUUID method', () => {
    it('should return true when both records have valid matching UUIDs', () => {
      const uuid = generateUUID();
      const record1 = { id: uuid, name: 'Test Record 1' };
      const record2 = { id: uuid, name: 'Test Record 2' };

      // Access private method using bracket notation
      const result = (dataImportService as any).compareByUUID(record1, record2);

      expect(result).toBe(true);
    });

    it('should return false when records have different valid UUIDs', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      const record1 = { id: uuid1, name: 'Test Record 1' };
      const record2 = { id: uuid2, name: 'Test Record 2' };

      const result = (dataImportService as any).compareByUUID(record1, record2);

      expect(result).toBe(false);
    });

    it('should return false when first record has no UUID', () => {
      const uuid = generateUUID();
      const record1 = { name: 'Test Record 1' }; // No id field
      const record2 = { id: uuid, name: 'Test Record 2' };

      const result = (dataImportService as any).compareByUUID(record1, record2);

      expect(result).toBe(false);
    });

    it('should return false when second record has no UUID', () => {
      const uuid = generateUUID();
      const record1 = { id: uuid, name: 'Test Record 1' };
      const record2 = { name: 'Test Record 2' }; // No id field

      const result = (dataImportService as any).compareByUUID(record1, record2);

      expect(result).toBe(false);
    });

    it('should return false when both records have no UUIDs', () => {
      const record1 = { name: 'Test Record 1' };
      const record2 = { name: 'Test Record 2' };

      const result = (dataImportService as any).compareByUUID(record1, record2);

      expect(result).toBe(false);
    });

    it('should return false when first record has invalid UUID', () => {
      const validUuid = generateUUID();
      const record1 = { id: 'invalid-uuid', name: 'Test Record 1' };
      const record2 = { id: validUuid, name: 'Test Record 2' };

      const result = (dataImportService as any).compareByUUID(record1, record2);

      expect(result).toBe(false);
    });

    it('should return false when second record has invalid UUID', () => {
      const validUuid = generateUUID();
      const record1 = { id: validUuid, name: 'Test Record 1' };
      const record2 = { id: 'invalid-uuid', name: 'Test Record 2' };

      const result = (dataImportService as any).compareByUUID(record1, record2);

      expect(result).toBe(false);
    });

    it('should return false when both records have invalid UUIDs', () => {
      const record1 = { id: 'invalid-uuid-1', name: 'Test Record 1' };
      const record2 = { id: 'invalid-uuid-2', name: 'Test Record 2' };

      const result = (dataImportService as any).compareByUUID(record1, record2);

      expect(result).toBe(false);
    });

    it('should return false when UUIDs are null', () => {
      const record1 = { id: null, name: 'Test Record 1' };
      const record2 = { id: null, name: 'Test Record 2' };

      const result = (dataImportService as any).compareByUUID(record1, record2);

      expect(result).toBe(false);
    });

    it('should return false when UUIDs are undefined', () => {
      const record1 = { id: undefined, name: 'Test Record 1' };
      const record2 = { id: undefined, name: 'Test Record 2' };

      const result = (dataImportService as any).compareByUUID(record1, record2);

      expect(result).toBe(false);
    });

    it('should return false when UUIDs are empty strings', () => {
      const record1 = { id: '', name: 'Test Record 1' };
      const record2 = { id: '', name: 'Test Record 2' };

      const result = (dataImportService as any).compareByUUID(record1, record2);

      expect(result).toBe(false);
    });
  });

  describe('compareByName method', () => {
    describe('products record type', () => {
      it('should return true when products have matching names', () => {
        const record1 = { name: 'Test Product', price: 10.0 };
        const record2 = { name: 'Test Product', price: 15.0 };

        const result = (dataImportService as any).compareByName(
          record1,
          record2,
          'products'
        );

        expect(result).toBe(true);
      });

      it('should return true when products have matching barcodes', () => {
        const record1 = { name: 'Product A', barcode: '123456789' };
        const record2 = { name: 'Product B', barcode: '123456789' };

        const result = (dataImportService as any).compareByName(
          record1,
          record2,
          'products'
        );

        expect(result).toBe(true);
      });

      it('should return false when products have different names and no barcodes', () => {
        const record1 = { name: 'Product A', price: 10.0 };
        const record2 = { name: 'Product B', price: 15.0 };

        const result = (dataImportService as any).compareByName(
          record1,
          record2,
          'products'
        );

        expect(result).toBe(false);
      });
    });

    describe('customers record type', () => {
      it('should return true when customers have matching names', () => {
        const record1 = { name: 'John Doe', email: 'john@example.com' };
        const record2 = { name: 'John Doe', email: 'john.doe@example.com' };

        const result = (dataImportService as any).compareByName(
          record1,
          record2,
          'customers'
        );

        expect(result).toBe(true);
      });

      it('should return true when customers have matching phone numbers', () => {
        const record1 = { name: 'John Doe', phone: '+1234567890' };
        const record2 = { name: 'Jane Doe', phone: '+1234567890' };

        const result = (dataImportService as any).compareByName(
          record1,
          record2,
          'customers'
        );

        expect(result).toBe(true);
      });

      it('should return false when customers have different names and no phone numbers', () => {
        const record1 = { name: 'John Doe', email: 'john@example.com' };
        const record2 = { name: 'Jane Doe', email: 'jane@example.com' };

        const result = (dataImportService as any).compareByName(
          record1,
          record2,
          'customers'
        );

        expect(result).toBe(false);
      });
    });

    describe('transaction record types (sales, expenses, stockMovements, bulkPricing)', () => {
      it('should return false for sales records (no name matching)', () => {
        const record1 = { total: 100, payment_method: 'cash' };
        const record2 = { total: 100, payment_method: 'cash' };

        const result = (dataImportService as any).compareByName(
          record1,
          record2,
          'sales'
        );

        expect(result).toBe(false);
      });

      it('should return false for expenses records (no name matching)', () => {
        const record1 = { amount: 50, description: 'Office supplies' };
        const record2 = { amount: 50, description: 'Office supplies' };

        const result = (dataImportService as any).compareByName(
          record1,
          record2,
          'expenses'
        );

        expect(result).toBe(false);
      });

      it('should return false for stockMovements records (no name matching)', () => {
        const record1 = {
          product_id: 'prod1',
          movement_type: 'in',
          quantity: 10,
        };
        const record2 = {
          product_id: 'prod1',
          movement_type: 'in',
          quantity: 10,
        };

        const result = (dataImportService as any).compareByName(
          record1,
          record2,
          'stockMovements'
        );

        expect(result).toBe(false);
      });

      it('should return false for bulkPricing records (no name matching)', () => {
        const record1 = {
          product_id: 'prod1',
          min_quantity: 10,
          bulk_price: 8.0,
        };
        const record2 = {
          product_id: 'prod1',
          min_quantity: 10,
          bulk_price: 8.0,
        };

        const result = (dataImportService as any).compareByName(
          record1,
          record2,
          'bulkPricing'
        );

        expect(result).toBe(false);
      });
    });

    describe('unknown record types', () => {
      it('should fall back to basic name matching for unknown record types', () => {
        const record1 = { name: 'Test Item', value: 'test' };
        const record2 = { name: 'Test Item', value: 'different' };

        const result = (dataImportService as any).compareByName(
          record1,
          record2,
          'unknownType'
        );

        expect(result).toBe(true);
      });

      it('should return false for unknown record types with different names', () => {
        const record1 = { name: 'Test Item A', value: 'test' };
        const record2 = { name: 'Test Item B', value: 'test' };

        const result = (dataImportService as any).compareByName(
          record1,
          record2,
          'unknownType'
        );

        expect(result).toBe(false);
      });
    });

    describe('error handling', () => {
      it('should handle records with missing name fields gracefully', () => {
        const record1 = { price: 10.0 };
        const record2 = { price: 15.0 };

        const result = (dataImportService as any).compareByName(
          record1,
          record2,
          'products'
        );

        expect(result).toBe(false);
      });

      it('should handle null records gracefully', () => {
        const record1 = null;
        const record2 = { name: 'Test' };

        expect(() => {
          (dataImportService as any).compareByName(
            record1,
            record2,
            'products'
          );
        }).not.toThrow();
      });
    });
  });

  describe('detectRecordConflict method', () => {
    describe('UUID-based conflict detection (primary)', () => {
      it('should detect conflict using UUID matching when both records have valid UUIDs', () => {
        const uuid = generateUUID();
        const record = { id: uuid, name: 'New Product' };
        const existingRecord = { id: uuid, name: 'Existing Product' };
        const existingRecords = [existingRecord];

        const result = (dataImportService as any).detectRecordConflict(
          record,
          existingRecords,
          'products'
        );

        expect(result).not.toBeNull();
        expect(result.type).toBe('duplicate');
        expect(result.matchedBy).toBe('uuid');
        expect(result.recordType).toBe('products');
        expect(result.existingRecord).toBe(existingRecord);
        expect(result.message).toContain(uuid);
      });

      it('should prioritize UUID matching over name matching', () => {
        const uuid1 = generateUUID();
        const uuid2 = generateUUID();
        const record = { id: uuid1, name: 'Same Name' };
        const existingRecord1 = { id: uuid2, name: 'Same Name' }; // Same name, different UUID
        const existingRecord2 = { id: uuid1, name: 'Different Name' }; // Same UUID, different name
        const existingRecords = [existingRecord1, existingRecord2];

        const result = (dataImportService as any).detectRecordConflict(
          record,
          existingRecords,
          'products'
        );

        expect(result).not.toBeNull();
        expect(result.matchedBy).toBe('uuid');
        expect(result.existingRecord).toBe(existingRecord2); // Should match by UUID, not name
      });
    });

    describe('Name-based fallback conflict detection', () => {
      it('should fall back to name matching when UUID matching fails', () => {
        const record = { id: 'invalid-uuid', name: 'Test Product' };
        const existingRecord = { id: generateUUID(), name: 'Test Product' };
        const existingRecords = [existingRecord];

        const result = (dataImportService as any).detectRecordConflict(
          record,
          existingRecords,
          'products'
        );

        expect(result).not.toBeNull();
        expect(result.type).toBe('duplicate');
        expect(result.matchedBy).toBe('name');
        expect(result.recordType).toBe('products');
        expect(result.existingRecord).toBe(existingRecord);
      });

      it('should fall back to name matching when records have no UUIDs', () => {
        const record = { name: 'Test Product', price: 10.0 };
        const existingRecord = { name: 'Test Product', price: 15.0 };
        const existingRecords = [existingRecord];

        const result = (dataImportService as any).detectRecordConflict(
          record,
          existingRecords,
          'products'
        );

        expect(result).not.toBeNull();
        expect(result.matchedBy).toBe('name');
        expect(result.existingRecord).toBe(existingRecord);
      });

      it('should create appropriate message for name-based product conflicts', () => {
        const record = { name: 'Test Product', price: 10.0 };
        const existingRecord = { name: 'Test Product', price: 15.0 };
        const existingRecords = [existingRecord];

        const result = (dataImportService as any).detectRecordConflict(
          record,
          existingRecords,
          'products'
        );

        expect(result.message).toBe('Product "Test Product" already exists');
      });

      it('should create appropriate message for barcode-based product conflicts', () => {
        const record = { name: 'Product A', barcode: '123456789' };
        const existingRecord = { name: 'Product B', barcode: '123456789' };
        const existingRecords = [existingRecord];

        const result = (dataImportService as any).detectRecordConflict(
          record,
          existingRecords,
          'products'
        );

        expect(result.message).toBe(
          'Product with barcode "123456789" already exists'
        );
      });

      it('should create appropriate message for phone-based customer conflicts', () => {
        const record = { name: 'John Doe', phone: '+1234567890' };
        const existingRecord = { name: 'Jane Doe', phone: '+1234567890' };
        const existingRecords = [existingRecord];

        const result = (dataImportService as any).detectRecordConflict(
          record,
          existingRecords,
          'customers'
        );

        expect(result.message).toBe(
          'Customer with phone "+1234567890" already exists'
        );
      });
    });

    describe('no conflict scenarios', () => {
      it('should return null when no conflicts are found', () => {
        const record = { id: generateUUID(), name: 'New Product' };
        const existingRecord = {
          id: generateUUID(),
          name: 'Different Product',
        };
        const existingRecords = [existingRecord];

        const result = (dataImportService as any).detectRecordConflict(
          record,
          existingRecords,
          'products'
        );

        expect(result).toBeNull();
      });

      it('should return null when existing records array is empty', () => {
        const record = { id: generateUUID(), name: 'New Product' };
        const existingRecords: any[] = [];

        const result = (dataImportService as any).detectRecordConflict(
          record,
          existingRecords,
          'products'
        );

        expect(result).toBeNull();
      });

      it('should return null for transaction types that do not support name matching', () => {
        const record = { total: 100, payment_method: 'cash' };
        const existingRecord = { total: 100, payment_method: 'cash' };
        const existingRecords = [existingRecord];

        const result = (dataImportService as any).detectRecordConflict(
          record,
          existingRecords,
          'sales'
        );

        expect(result).toBeNull();
      });
    });

    describe('error handling and edge cases', () => {
      it('should handle null record gracefully', () => {
        const existingRecord = { id: generateUUID(), name: 'Existing Product' };
        const existingRecords = [existingRecord];

        const result = (dataImportService as any).detectRecordConflict(
          null,
          existingRecords,
          'products'
        );

        expect(result).toBeNull();
      });

      it('should handle null existing records array gracefully', () => {
        const record = { id: generateUUID(), name: 'New Product' };

        const result = (dataImportService as any).detectRecordConflict(
          record,
          null,
          'products'
        );

        expect(result).toBeNull();
      });

      it('should handle empty record type gracefully', () => {
        const record = { id: generateUUID(), name: 'New Product' };
        const existingRecord = { id: generateUUID(), name: 'Existing Product' };
        const existingRecords = [existingRecord];

        const result = (dataImportService as any).detectRecordConflict(
          record,
          existingRecords,
          ''
        );

        expect(result).toBeNull();
      });

      it('should handle malformed existing records gracefully', () => {
        const record = { id: generateUUID(), name: 'New Product' };
        const existingRecords = [
          null,
          undefined,
          'invalid',
          { malformed: true },
        ];

        const result = (dataImportService as any).detectRecordConflict(
          record,
          existingRecords,
          'products'
        );

        expect(result).toBeNull();
      });

      it('should continue checking other records if one comparison throws an error', () => {
        const uuid = generateUUID();
        const record = { id: uuid, name: 'New Product' };
        const malformedRecord = {
          get id() {
            throw new Error('Test error');
          },
        };
        const validRecord = { id: uuid, name: 'Valid Product' };
        const existingRecords = [malformedRecord, validRecord];

        const result = (dataImportService as any).detectRecordConflict(
          record,
          existingRecords,
          'products'
        );

        expect(result).not.toBeNull();
        expect(result.matchedBy).toBe('uuid');
        expect(result.existingRecord).toBe(validRecord);
      });
    });

    describe('multiple existing records', () => {
      it('should return the first matching record when multiple UUID matches exist', () => {
        const uuid = generateUUID();
        const record = { id: uuid, name: 'New Product' };
        const existingRecord1 = { id: uuid, name: 'First Match' };
        const existingRecord2 = { id: uuid, name: 'Second Match' };
        const existingRecords = [existingRecord1, existingRecord2];

        const result = (dataImportService as any).detectRecordConflict(
          record,
          existingRecords,
          'products'
        );

        expect(result).not.toBeNull();
        expect(result.existingRecord).toBe(existingRecord1);
      });

      it('should return the first matching record when multiple name matches exist', () => {
        const record = { name: 'Test Product' };
        const existingRecord1 = { name: 'Test Product', price: 10 };
        const existingRecord2 = { name: 'Test Product', price: 20 };
        const existingRecords = [existingRecord1, existingRecord2];

        const result = (dataImportService as any).detectRecordConflict(
          record,
          existingRecords,
          'products'
        );

        expect(result).not.toBeNull();
        expect(result.existingRecord).toBe(existingRecord1);
      });
    });
  });
});
