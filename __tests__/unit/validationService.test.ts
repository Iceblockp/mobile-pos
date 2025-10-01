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
