import { DataImportService } from '../../services/dataImportService';
import { DatabaseService } from '../../services/database';

// Mock the database service
jest.mock('../../services/database');
jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
}));

describe('DataImportService - Relationship Fix', () => {
  let dataImportService: DataImportService;
  let mockDb: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    mockDb = new DatabaseService() as jest.Mocked<DatabaseService>;
    dataImportService = new DataImportService(mockDb);
  });

  describe('Universal Conflict Detection', () => {
    beforeEach(() => {
      // Mock existing data
      mockDb.getProducts.mockResolvedValue([
        { id: 'product-1', name: 'Existing Product', barcode: 'EXIST001' },
      ]);
      mockDb.getSuppliers.mockResolvedValue([
        { id: 'supplier-1', name: 'Existing Supplier' },
      ]);
      mockDb.getCategories.mockResolvedValue([
        { id: 'category-1', name: 'Existing Category' },
      ]);
      mockDb.getCustomers.mockResolvedValue([]);
      mockDb.getSalesPaginated.mockResolvedValue([]);
      mockDb.getExpenses.mockResolvedValue([]);
      mockDb.getStockMovements.mockResolvedValue([]);
      mockDb.getBulkPricingForProduct.mockResolvedValue([]);
    });

    test('should detect UUID-based conflicts for products', async () => {
      const importData = {
        products: [
          { id: 'product-1', name: 'New Product Name', price: 100, cost: 50 },
        ],
      };

      const result = await dataImportService.detectAllConflicts(importData);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflictsByType.products).toHaveLength(1);
      expect(result.conflictsByType.products[0].matchedBy).toBe('uuid');
      expect(result.conflictsByType.products[0].message).toContain('product-1');
    });

    test('should detect name-based conflicts for products when UUID is different', async () => {
      const importData = {
        products: [
          { id: 'product-2', name: 'Existing Product', price: 100, cost: 50 },
        ],
      };

      const result = await dataImportService.detectAllConflicts(importData);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflictsByType.products).toHaveLength(1);
      expect(result.conflictsByType.products[0].matchedBy).toBe('name');
      expect(result.conflictsByType.products[0].message).toContain(
        'Existing Product'
      );
    });

    test('should detect barcode-based conflicts for products', async () => {
      const importData = {
        products: [
          {
            id: 'product-2',
            name: 'Different Name',
            barcode: 'EXIST001',
            price: 100,
            cost: 50,
          },
        ],
      };

      const result = await dataImportService.detectAllConflicts(importData);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflictsByType.products).toHaveLength(1);
      expect(result.conflictsByType.products[0].matchedBy).toBe('name');
      expect(result.conflictsByType.products[0].message).toContain('EXIST001');
    });

    test('should detect UUID-based conflicts for suppliers', async () => {
      const importData = {
        suppliers: [{ id: 'supplier-1', name: 'New Supplier Name' }],
      };

      const result = await dataImportService.detectAllConflicts(importData);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflictsByType.suppliers).toHaveLength(1);
      expect(result.conflictsByType.suppliers[0].matchedBy).toBe('uuid');
    });

    test('should detect name-based conflicts for suppliers', async () => {
      const importData = {
        suppliers: [{ id: 'supplier-2', name: 'Existing Supplier' }],
      };

      const result = await dataImportService.detectAllConflicts(importData);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflictsByType.suppliers).toHaveLength(1);
      expect(result.conflictsByType.suppliers[0].matchedBy).toBe('name');
    });

    test('should not detect conflicts for new records', async () => {
      const importData = {
        products: [
          { id: 'product-new', name: 'New Product', price: 100, cost: 50 },
        ],
        suppliers: [{ id: 'supplier-new', name: 'New Supplier' }],
      };

      const result = await dataImportService.detectAllConflicts(importData);

      expect(result.hasConflicts).toBe(false);
      expect(result.conflictsByType.products).toHaveLength(0);
      expect(result.conflictsByType.suppliers).toHaveLength(0);
    });

    test('should handle validation errors', async () => {
      const importData = {
        products: [
          { id: 'product-invalid', price: 100, cost: 50 }, // Missing name
        ],
      };

      const result = await dataImportService.detectAllConflicts(importData);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflictsByType.products).toHaveLength(1);
      expect(result.conflictsByType.products[0].type).toBe('validation_failed');
      expect(result.conflictsByType.products[0].message).toContain(
        'missing required fields'
      );
    });
  });

  describe('Product Relationship Resolution', () => {
    beforeEach(() => {
      // Mock existing categories and suppliers
      mockDb.getCategories.mockResolvedValue([
        { id: 'cat-1', name: 'Electronics' },
        { id: 'cat-2', name: 'Books' },
      ]);
      mockDb.getSuppliers.mockResolvedValue([
        { id: 'sup-1', name: 'Tech Corp' },
        { id: 'sup-2', name: 'Book Store' },
      ]);
      mockDb.addCategory.mockResolvedValue('new-cat-id');
      mockDb.addSupplier.mockResolvedValue('new-sup-id');
    });

    test('should resolve category by valid UUID', async () => {
      // Access private method for testing
      const resolveCategoryId = (
        dataImportService as any
      ).resolveCategoryId.bind(dataImportService);

      const result = await resolveCategoryId('cat-1', 'Some Name');

      expect(result).toBe('cat-1');
    });

    test('should resolve category by name when UUID is invalid', async () => {
      const resolveCategoryId = (
        dataImportService as any
      ).resolveCategoryId.bind(dataImportService);

      const result = await resolveCategoryId('invalid-uuid', 'Electronics');

      expect(result).toBe('cat-1');
    });

    test('should create new category when name not found', async () => {
      const resolveCategoryId = (
        dataImportService as any
      ).resolveCategoryId.bind(dataImportService);

      const result = await resolveCategoryId(undefined, 'New Category');

      expect(mockDb.addCategory).toHaveBeenCalledWith({
        name: 'New Category',
        description: '',
      });
      expect(result).toBe('new-cat-id');
    });

    test('should use default category when no reference provided', async () => {
      const resolveCategoryId = (
        dataImportService as any
      ).resolveCategoryId.bind(dataImportService);

      const result = await resolveCategoryId(undefined, undefined);

      expect(result).toBe('cat-1'); // First existing category
    });

    test('should resolve supplier by valid UUID', async () => {
      const resolveSupplierId = (
        dataImportService as any
      ).resolveSupplierId.bind(dataImportService);

      const result = await resolveSupplierId('sup-1', 'Some Name');

      expect(result).toBe('sup-1');
    });

    test('should resolve supplier by name when UUID is invalid', async () => {
      const resolveSupplierId = (
        dataImportService as any
      ).resolveSupplierId.bind(dataImportService);

      const result = await resolveSupplierId('invalid-uuid', 'Tech Corp');

      expect(result).toBe('sup-1');
    });

    test('should create new supplier when name not found', async () => {
      const resolveSupplierId = (
        dataImportService as any
      ).resolveSupplierId.bind(dataImportService);

      const result = await resolveSupplierId(undefined, 'New Supplier');

      expect(mockDb.addSupplier).toHaveBeenCalledWith({
        name: 'New Supplier',
        contact_name: '',
        phone: '',
        email: '',
        address: '',
      });
      expect(result).toBe('new-sup-id');
    });

    test('should return null when no supplier reference provided', async () => {
      const resolveSupplierId = (
        dataImportService as any
      ).resolveSupplierId.bind(dataImportService);

      const result = await resolveSupplierId(undefined, undefined);

      expect(result).toBeNull();
    });
  });

  describe('Record Processing', () => {
    beforeEach(() => {
      mockDb.addProduct.mockResolvedValue('new-product-id');
      mockDb.addSupplier.mockResolvedValue('new-supplier-id');
      mockDb.addCategory.mockResolvedValue('new-category-id');
      mockDb.updateProduct.mockResolvedValue();
      mockDb.updateSupplier.mockResolvedValue();
      mockDb.updateCategory.mockResolvedValue();
    });

    test('should add new product with resolved relationships', async () => {
      // Mock relationship resolution
      mockDb.getCategories.mockResolvedValue([
        { id: 'cat-1', name: 'Electronics' },
      ]);
      mockDb.getSuppliers.mockResolvedValue([
        { id: 'sup-1', name: 'Tech Corp' },
      ]);

      const addRecord = (dataImportService as any).addRecord.bind(
        dataImportService
      );

      await addRecord('products', {
        id: 'prod-1',
        name: 'Test Product',
        category_id: 'cat-1',
        supplier_id: 'sup-1',
        price: 100,
        cost: 50,
      });

      expect(mockDb.addProduct).toHaveBeenCalledWith({
        id: 'prod-1',
        name: 'Test Product',
        barcode: null,
        category_id: 'cat-1',
        supplier_id: 'sup-1',
        price: 100,
        cost: 50,
        quantity: 0,
        min_stock: 10,
        imageUrl: null,
      });
    });

    test('should update existing supplier', async () => {
      const updateRecord = (dataImportService as any).updateRecord.bind(
        dataImportService
      );

      await updateRecord(
        'suppliers',
        { name: 'Updated Supplier', phone: '123-456-7890' },
        { id: 'sup-1', name: 'Old Supplier' }
      );

      expect(mockDb.updateSupplier).toHaveBeenCalledWith('sup-1', {
        name: 'Updated Supplier',
        contact_name: '',
        phone: '123-456-7890',
        email: '',
        address: '',
      });
    });

    test('should update existing category', async () => {
      const updateRecord = (dataImportService as any).updateRecord.bind(
        dataImportService
      );

      await updateRecord(
        'categories',
        { name: 'Updated Category', description: 'New description' },
        { id: 'cat-1', name: 'Old Category' }
      );

      expect(mockDb.updateCategory).toHaveBeenCalledWith('cat-1', {
        name: 'Updated Category',
        description: 'New description',
      });
    });
  });

  describe('Validation', () => {
    test('should validate required fields for products', () => {
      const validateRecordRequiredFields = (
        dataImportService as any
      ).validateRecordRequiredFields.bind(dataImportService);

      expect(
        validateRecordRequiredFields(
          { name: 'Test', price: 100, cost: 50 },
          'products'
        )
      ).toBe(true);
      expect(
        validateRecordRequiredFields({ price: 100, cost: 50 }, 'products')
      ).toBe(false); // Missing name
      expect(
        validateRecordRequiredFields({ name: 'Test', cost: 50 }, 'products')
      ).toBe(false); // Missing price
    });

    test('should validate data types for products', () => {
      const validateRecordDataTypes = (
        dataImportService as any
      ).validateRecordDataTypes.bind(dataImportService);

      expect(
        validateRecordDataTypes(
          { name: 'Test', price: 100, cost: 50 },
          'products'
        )
      ).toBe(true);
      expect(
        validateRecordDataTypes({ name: 123, price: 100, cost: 50 }, 'products')
      ).toBe(false); // Invalid name type
      expect(
        validateRecordDataTypes(
          { name: 'Test', price: 'invalid', cost: 50 },
          'products'
        )
      ).toBe(false); // Invalid price type
    });

    test('should validate required fields for suppliers', () => {
      const validateRecordRequiredFields = (
        dataImportService as any
      ).validateRecordRequiredFields.bind(dataImportService);

      expect(
        validateRecordRequiredFields({ name: 'Test Supplier' }, 'suppliers')
      ).toBe(true);
      expect(validateRecordRequiredFields({}, 'suppliers')).toBe(false); // Missing name
    });
  });
});
