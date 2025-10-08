import { ValidationService } from '../../services/validationService';

describe('ValidationService', () => {
  let validationService: ValidationService;

  beforeEach(() => {
    validationService = new ValidationService();
  });

  describe('validateProductData', () => {
    it('should validate valid product data', () => {
      const validProduct = {
        name: 'Test Product',
        price: 100,
        stock: 10,
        category: 'Electronics',
      };

      const result = validationService.validateProductData(validProduct);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject product with missing name', () => {
      const invalidProduct = {
        price: 100,
        stock: 10,
      };

      const result = validationService.validateProductData(invalidProduct);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'Product name is required',
        code: 'REQUIRED_FIELD',
      });
    });

    it('should reject product with invalid price', () => {
      const invalidProduct = {
        name: 'Test Product',
        price: -10,
        stock: 10,
      };

      const result = validationService.validateProductData(invalidProduct);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price',
        message: 'Price must be a positive number',
        code: 'INVALID_VALUE',
      });
    });

    it('should reject product with invalid stock', () => {
      const invalidProduct = {
        name: 'Test Product',
        price: 100,
        stock: -5,
      };

      const result = validationService.validateProductData(invalidProduct);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'stock',
        message: 'Stock must be a non-negative number',
        code: 'INVALID_VALUE',
      });
    });

    it('should handle multiple validation errors', () => {
      const invalidProduct = {
        price: -10,
        stock: -5,
      };

      const result = validationService.validateProductData(invalidProduct);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3); // name, price, stock
    });
  });

  describe('validateSaleData', () => {
    it('should validate valid sale data', () => {
      const validSale = {
        productId: 1,
        customerId: 1,
        quantity: 5,
        total: 500,
        date: '2024-01-01',
      };

      const result = validationService.validateSaleData(validSale);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject sale with missing productId', () => {
      const invalidSale = {
        customerId: 1,
        quantity: 5,
        total: 500,
      };

      const result = validationService.validateSaleData(invalidSale);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'productId',
        message: 'Product ID is required',
        code: 'REQUIRED_FIELD',
      });
    });

    it('should reject sale with invalid quantity', () => {
      const invalidSale = {
        productId: 1,
        customerId: 1,
        quantity: 0,
        total: 500,
      };

      const result = validationService.validateSaleData(invalidSale);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'quantity',
        message: 'Quantity must be greater than 0',
        code: 'INVALID_VALUE',
      });
    });

    it('should reject sale with invalid total', () => {
      const invalidSale = {
        productId: 1,
        customerId: 1,
        quantity: 5,
        total: -100,
      };

      const result = validationService.validateSaleData(invalidSale);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'total',
        message: 'Total must be a positive number',
        code: 'INVALID_VALUE',
      });
    });
  });

  describe('validateCustomerData', () => {
    it('should validate valid customer data', () => {
      const validCustomer = {
        name: 'John Doe',
        phone: '123456789',
        email: 'john@example.com',
        address: '123 Main St',
      };

      const result = validationService.validateCustomerData(validCustomer);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject customer with missing name', () => {
      const invalidCustomer = {
        phone: '123456789',
      };

      const result = validationService.validateCustomerData(invalidCustomer);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'Customer name is required',
        code: 'REQUIRED_FIELD',
      });
    });

    it('should reject customer with invalid phone format', () => {
      const invalidCustomer = {
        name: 'John Doe',
        phone: '123', // Too short
      };

      const result = validationService.validateCustomerData(invalidCustomer);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'phone',
        message: 'Phone number must be at least 6 digits',
        code: 'INVALID_FORMAT',
      });
    });

    it('should reject customer with invalid email format', () => {
      const invalidCustomer = {
        name: 'John Doe',
        phone: '123456789',
        email: 'invalid-email',
      };

      const result = validationService.validateCustomerData(invalidCustomer);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'email',
        message: 'Invalid email format',
        code: 'INVALID_FORMAT',
      });
    });
  });

  describe('validateStockMovementData', () => {
    it('should validate valid stock movement data', () => {
      const validMovement = {
        productId: 1,
        type: 'in',
        quantity: 10,
        reason: 'Purchase',
        date: '2024-01-01',
      };

      const result = validationService.validateStockMovementData(validMovement);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject movement with invalid type', () => {
      const invalidMovement = {
        productId: 1,
        type: 'invalid',
        quantity: 10,
      };

      const result =
        validationService.validateStockMovementData(invalidMovement);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'type',
        message: 'Movement type must be "in" or "out"',
        code: 'INVALID_VALUE',
      });
    });

    it('should reject movement with invalid quantity', () => {
      const invalidMovement = {
        productId: 1,
        type: 'in',
        quantity: 0,
      };

      const result =
        validationService.validateStockMovementData(invalidMovement);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'quantity',
        message: 'Quantity must be greater than 0',
        code: 'INVALID_VALUE',
      });
    });
  });

  describe('validateFileStructure', () => {
    it('should validate correct file structure', () => {
      const validData = {
        metadata: {
          dataType: 'products',
          version: '2.0',
          recordCount: 2,
        },
        data: [
          { name: 'Product 1', price: 100 },
          { name: 'Product 2', price: 200 },
        ],
      };

      const result = validationService.validateFileStructure(
        validData,
        'products'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject file with missing metadata', () => {
      const invalidData = {
        data: [{ name: 'Product 1', price: 100 }],
      };

      const result = validationService.validateFileStructure(
        invalidData,
        'products'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'metadata',
        message: 'File metadata is missing',
        code: 'MISSING_METADATA',
      });
    });

    it('should reject file with wrong data type', () => {
      const invalidData = {
        metadata: {
          dataType: 'sales',
          version: '2.0',
          recordCount: 1,
        },
        data: [{ name: 'Product 1', price: 100 }],
      };

      const result = validationService.validateFileStructure(
        invalidData,
        'products'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'dataType',
        message: 'Expected data type "products" but found "sales"',
        code: 'WRONG_DATA_TYPE',
      });
    });

    it('should reject file with mismatched record count', () => {
      const invalidData = {
        metadata: {
          dataType: 'products',
          version: '2.0',
          recordCount: 5, // Wrong count
        },
        data: [
          { name: 'Product 1', price: 100 },
          { name: 'Product 2', price: 200 },
        ],
      };

      const result = validationService.validateFileStructure(
        invalidData,
        'products'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'recordCount',
        message: 'Record count mismatch: expected 5 but found 2',
        code: 'COUNT_MISMATCH',
      });
    });
  });

  describe('sanitizeData', () => {
    it('should sanitize string data', () => {
      const dirtyData = {
        name: '  Product Name  ',
        description: '<script>alert("xss")</script>Clean description',
      };

      const sanitized = validationService.sanitizeData(dirtyData);

      expect(sanitized.name).toBe('Product Name');
      expect(sanitized.description).toBe('Clean description');
    });

    it('should handle nested objects', () => {
      const dirtyData = {
        product: {
          name: '  Nested Product  ',
          category: {
            name: '  Category Name  ',
          },
        },
      };

      const sanitized = validationService.sanitizeData(dirtyData);

      expect(sanitized.product.name).toBe('Nested Product');
      expect(sanitized.product.category.name).toBe('Category Name');
    });

    it('should preserve non-string values', () => {
      const data = {
        name: '  Product  ',
        price: 100,
        active: true,
        tags: ['tag1', '  tag2  '],
      };

      const sanitized = validationService.sanitizeData(data);

      expect(sanitized.name).toBe('Product');
      expect(sanitized.price).toBe(100);
      expect(sanitized.active).toBe(true);
      expect(sanitized.tags).toEqual(['tag1', 'tag2']);
    });
  });
});

// UUID-based Conflict Detection Tests
describe('UUID-based Conflict Detection', () => {
  // Mock the UUID utility
  const mockIsValidUUID = () => true;

  // Create a minimal test class that implements the conflict detection methods
  class ConflictDetectionTester {
    // Compare records by UUID - primary matching method
    compareByUUID(record: any, existing: any): boolean {
      // Check if both records have valid UUIDs
      if (!record.id || !existing.id) {
        return false;
      }

      // Validate that both UUIDs are properly formatted
      if (!mockIsValidUUID(record.id) || !mockIsValidUUID(existing.id)) {
        return false;
      }

      // Perform exact string matching on UUIDs
      return record.id === existing.id;
    }

    // Compare records by name - fallback matching method
    compareByName(record: any, existing: any, recordType: string): boolean {
      // Record type mapping for different matching criteria
      const recordTypeMatchingMap: Record<
        string,
        (record: any, existing: any) => boolean
      > = {
        products: (record: any, existing: any) => {
          return (
            (record.name && existing.name && record.name === existing.name) ||
            (record.barcode &&
              existing.barcode &&
              record.barcode === existing.barcode)
          );
        },
        customers: (record: any, existing: any) => {
          return (
            (record.name && existing.name && record.name === existing.name) ||
            (record.phone && existing.phone && record.phone === existing.phone)
          );
        },
        sales: () => false,
        expenses: () => false,
        stockMovements: () => false,
        bulkPricing: () => false,
      };

      const matchingFunction = recordTypeMatchingMap[recordType];

      if (!matchingFunction) {
        return record.name && existing.name && record.name === existing.name;
      }

      try {
        return matchingFunction(record, existing);
      } catch (error) {
        return false;
      }
    }

    // Universal conflict detection method
    detectRecordConflict(
      record: any,
      existingRecords: any[],
      recordType: string
    ): any | null {
      try {
        if (!record || !Array.isArray(existingRecords) || !recordType) {
          return null;
        }

        let matchedRecord: any = null;
        let matchedBy: 'uuid' | 'name' | 'other' = 'other';

        // First, try UUID-based matching
        for (const existingRecord of existingRecords) {
          if (this.compareByUUID(record, existingRecord)) {
            matchedRecord = existingRecord;
            matchedBy = 'uuid';
            break;
          }
        }

        // If no UUID match found, try name-based matching
        if (!matchedRecord) {
          for (const existingRecord of existingRecords) {
            if (this.compareByName(record, existingRecord, recordType)) {
              matchedRecord = existingRecord;
              matchedBy = 'name';
              break;
            }
          }
        }

        if (matchedRecord) {
          let message: string;
          if (matchedBy === 'uuid') {
            message = `${recordType} with UUID "${record.id}" already exists`;
          } else if (matchedBy === 'name') {
            switch (recordType) {
              case 'products':
                if (
                  record.barcode &&
                  matchedRecord.barcode === record.barcode
                ) {
                  message = `Product with barcode "${record.barcode}" already exists`;
                } else {
                  message = `Product "${record.name}" already exists`;
                }
                break;
              case 'customers':
                if (record.phone && matchedRecord.phone === record.phone) {
                  message = `Customer with phone "${record.phone}" already exists`;
                } else {
                  message = `Customer "${record.name}" already exists`;
                }
                break;
              default:
                message = `${recordType} "${
                  record.name || record.id || 'Unknown'
                }" already exists`;
            }
          } else {
            message = `${recordType} already exists`;
          }

          return {
            type: 'duplicate',
            record,
            existingRecord: matchedRecord,
            message,
            index: 0,
            recordType,
            matchedBy,
          };
        }

        return null;
      } catch (error) {
        return null;
      }
    }
  }

  let tester: ConflictDetectionTester;

  beforeEach(() => {
    tester = new ConflictDetectionTester();
    jest.clearAllMocks();
  });

  describe('compareByUUID method', () => {
    it('should return true when both records have valid matching UUIDs', () => {
      mockIsValidUUID.mockImplementation((uuid: string) => {
        return uuid === 'valid-uuid-1';
      });

      const record = { id: 'valid-uuid-1', name: 'Test Record' };
      const existing = { id: 'valid-uuid-1', name: 'Existing Record' };

      const result = tester.compareByUUID(record, existing);

      expect(result).toBe(true);
      expect(mockIsValidUUID).toHaveBeenCalledWith('valid-uuid-1');
      expect(mockIsValidUUID).toHaveBeenCalledTimes(2);
    });

    it('should return false when UUIDs are valid but different', () => {
      mockIsValidUUID.mockImplementation((uuid: string) => {
        return uuid === 'valid-uuid-1' || uuid === 'valid-uuid-2';
      });

      const record = { id: 'valid-uuid-1', name: 'Test Record' };
      const existing = { id: 'valid-uuid-2', name: 'Existing Record' };

      const result = tester.compareByUUID(record, existing);

      expect(result).toBe(false);
    });

    it('should return false when record has invalid UUID', () => {
      mockIsValidUUID.mockImplementation((uuid: string) => {
        return uuid === 'valid-uuid-1';
      });

      const record = { id: 'invalid-uuid', name: 'Test Record' };
      const existing = { id: 'valid-uuid-1', name: 'Existing Record' };

      const result = tester.compareByUUID(record, existing);

      expect(result).toBe(false);
    });

    it('should return false when record has no id field', () => {
      const record = { name: 'Test Record' };
      const existing = { id: 'valid-uuid-1', name: 'Existing Record' };

      const result = tester.compareByUUID(record, existing);

      expect(result).toBe(false);
      expect(mockIsValidUUID).not.toHaveBeenCalled();
    });

    it('should return false when record id is null', () => {
      const record = { id: null, name: 'Test Record' };
      const existing = { id: 'valid-uuid-1', name: 'Existing Record' };

      const result = tester.compareByUUID(record, existing);

      expect(result).toBe(false);
      expect(mockIsValidUUID).not.toHaveBeenCalled();
    });
  });

  describe('compareByName method with fallback scenarios', () => {
    it('should fall back to name matching for products', () => {
      const record = { id: 'uuid-1', name: 'Test Product', barcode: '123456' };
      const existing = {
        id: 'uuid-2',
        name: 'Test Product',
        barcode: '789012',
      };

      const result = tester.compareByName(record, existing, 'products');

      expect(result).toBe(true);
    });

    it('should fall back to barcode matching for products', () => {
      const record = { id: 'uuid-1', name: 'Product A', barcode: '123456' };
      const existing = { id: 'uuid-2', name: 'Product B', barcode: '123456' };

      const result = tester.compareByName(record, existing, 'products');

      expect(result).toBe(true);
    });

    it('should fall back to name matching for customers', () => {
      const record = { id: 'uuid-1', name: 'John Doe', phone: '555-1234' };
      const existing = { id: 'uuid-2', name: 'John Doe', phone: '555-5678' };

      const result = tester.compareByName(record, existing, 'customers');

      expect(result).toBe(true);
    });

    it('should fall back to phone matching for customers', () => {
      const record = { id: 'uuid-1', name: 'John Doe', phone: '555-1234' };
      const existing = { id: 'uuid-2', name: 'Jane Doe', phone: '555-1234' };

      const result = tester.compareByName(record, existing, 'customers');

      expect(result).toBe(true);
    });

    it('should return false when no matches found', () => {
      const record = { id: 'uuid-1', name: 'Product A', barcode: '123456' };
      const existing = { id: 'uuid-2', name: 'Product B', barcode: '789012' };

      const result = tester.compareByName(record, existing, 'products');

      expect(result).toBe(false);
    });
  });

  describe('detectRecordConflict method - UUID first, then name fallback', () => {
    it('should detect conflict using UUID matching when both records have valid UUIDs', () => {
      mockIsValidUUID.mockImplementation((uuid: string) => {
        return uuid === 'matching-uuid';
      });

      const record = { id: 'matching-uuid', name: 'Test Product' };
      const existingRecords = [
        { id: 'other-uuid', name: 'Other Product' },
        { id: 'matching-uuid', name: 'Existing Product' },
      ];

      const result = tester.detectRecordConflict(
        record,
        existingRecords,
        'products'
      );

      expect(result).not.toBeNull();
      expect(result.type).toBe('duplicate');
      expect(result.recordType).toBe('products');
      expect(result.matchedBy).toBe('uuid');
      expect(result.message).toContain('UUID "matching-uuid" already exists');
      expect(result.existingRecord.id).toBe('matching-uuid');
    });

    it('should fall back to name matching when UUID matching fails', () => {
      mockIsValidUUID.mockReturnValue(false);

      const record = {
        id: 'invalid-uuid-1',
        name: 'Test Product',
        barcode: '123456',
      };
      const existingRecords = [
        { id: 'invalid-uuid-2', name: 'Other Product', barcode: '789012' },
        { id: 'invalid-uuid-3', name: 'Test Product', barcode: '456789' },
      ];

      const result = tester.detectRecordConflict(
        record,
        existingRecords,
        'products'
      );

      expect(result).not.toBeNull();
      expect(result.type).toBe('duplicate');
      expect(result.recordType).toBe('products');
      expect(result.matchedBy).toBe('name');
      expect(result.message).toContain('Product "Test Product" already exists');
      expect(result.existingRecord.name).toBe('Test Product');
    });

    it('should prioritize UUID matching over name matching', () => {
      mockIsValidUUID.mockImplementation((uuid: string) => {
        return uuid === 'uuid-1' || uuid === 'uuid-2';
      });

      const record = { id: 'uuid-1', name: 'Same Name' };
      const existingRecords = [
        { id: 'uuid-2', name: 'Same Name' }, // Matches by name but different UUID
        { id: 'uuid-1', name: 'Different Name' }, // Matches by UUID
      ];

      const result = tester.detectRecordConflict(
        record,
        existingRecords,
        'products'
      );

      expect(result).not.toBeNull();
      expect(result.matchedBy).toBe('uuid');
      expect(result.existingRecord.id).toBe('uuid-1');
      expect(result.existingRecord.name).toBe('Different Name');
    });

    it('should return null when no conflicts are found', () => {
      mockIsValidUUID.mockReturnValue(true);

      const record = { id: 'unique-uuid', name: 'Unique Product' };
      const existingRecords = [
        { id: 'other-uuid-1', name: 'Other Product 1' },
        { id: 'other-uuid-2', name: 'Other Product 2' },
      ];

      const result = tester.detectRecordConflict(
        record,
        existingRecords,
        'products'
      );

      expect(result).toBeNull();
    });

    it('should handle empty existing records array', () => {
      const record = { id: 'some-uuid', name: 'Test Product' };
      const existingRecords: any[] = [];

      const result = tester.detectRecordConflict(
        record,
        existingRecords,
        'products'
      );

      expect(result).toBeNull();
    });

    it('should handle null record gracefully', () => {
      const record = null;
      const existingRecords = [{ id: 'some-uuid', name: 'Existing Product' }];

      const result = tester.detectRecordConflict(
        record,
        existingRecords,
        'products'
      );

      expect(result).toBeNull();
    });

    it('should create appropriate message for barcode matching in products', () => {
      mockIsValidUUID.mockReturnValue(false);

      const record = {
        id: 'invalid-uuid-1',
        name: 'Product A',
        barcode: '123456',
      };
      const existingRecords = [
        { id: 'invalid-uuid-2', name: 'Product B', barcode: '123456' },
      ];

      const result = tester.detectRecordConflict(
        record,
        existingRecords,
        'products'
      );

      expect(result).not.toBeNull();
      expect(result.matchedBy).toBe('name');
      expect(result.message).toContain(
        'Product with barcode "123456" already exists'
      );
    });

    it('should create appropriate message for phone matching in customers', () => {
      mockIsValidUUID.mockReturnValue(false);

      const record = {
        id: 'invalid-uuid-1',
        name: 'John Doe',
        phone: '555-1234',
      };
      const existingRecords = [
        { id: 'invalid-uuid-2', name: 'Jane Doe', phone: '555-1234' },
      ];

      const result = tester.detectRecordConflict(
        record,
        existingRecords,
        'customers'
      );

      expect(result).not.toBeNull();
      expect(result.matchedBy).toBe('name');
      expect(result.message).toContain(
        'Customer with phone "555-1234" already exists'
      );
    });

    it('should handle errors in conflict detection gracefully', () => {
      mockIsValidUUID.mockImplementation(() => {
        throw new Error('UUID validation error');
      });

      const record = { id: 'some-uuid', name: 'Test Product' };
      const existingRecords = [{ id: 'other-uuid', name: 'Other Product' }];

      const result = tester.detectRecordConflict(
        record,
        existingRecords,
        'products'
      );

      expect(result).toBeNull();
    });
  });
});
