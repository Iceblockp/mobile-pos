// Mock expo modules first
jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
}));
jest.mock('expo-document-picker', () => ({}));

import { DataImportService } from '../../services/dataImportService';
import { DatabaseService } from '../../services/database';

// Mock dependencies
jest.mock('../../services/database');

const mockDatabase = {
  addProduct: jest.fn(),
  addSale: jest.fn(),
  addCustomer: jest.fn(),
  addExpense: jest.fn(),
  addStockMovement: jest.fn(),
  addBulkPricing: jest.fn(),
  getProducts: jest.fn(),
  getCustomers: jest.fn(),
  getCategories: jest.fn(),
  getSuppliers: jest.fn(),
  getSales: jest.fn(),
  getExpenses: jest.fn(),
  getStockMovements: jest.fn(),
  getBulkPricing: jest.fn(),
  getProductByName: jest.fn(),
  getCustomerByPhone: jest.fn(),
  updateProduct: jest.fn(),
  updateCustomer: jest.fn(),
  updateSale: jest.fn(),
  updateExpense: jest.fn(),
  updateStockMovement: jest.fn(),
  updateBulkPricing: jest.fn(),
} as unknown as DatabaseService;

// Get the mocked FileSystem
const mockFileSystem = require('expo-file-system');

describe('DataImportService - Selective Import Functionality', () => {
  let importService: DataImportService;

  beforeEach(() => {
    importService = new DataImportService(mockDatabase);
    jest.clearAllMocks();

    // Setup default mock returns
    (mockDatabase.getProducts as jest.Mock).mockResolvedValue([]);
    (mockDatabase.getCustomers as jest.Mock).mockResolvedValue([]);
    (mockDatabase.getCategories as jest.Mock).mockResolvedValue([]);
    (mockDatabase.getSuppliers as jest.Mock).mockResolvedValue([]);
    (mockDatabase.getSales as jest.Mock).mockResolvedValue([]);
    (mockDatabase.getExpenses as jest.Mock).mockResolvedValue([]);
    (mockDatabase.getStockMovements as jest.Mock).mockResolvedValue([]);
    (mockDatabase.getBulkPricing as jest.Mock).mockResolvedValue([]);
  });

  const defaultOptions = {
    batchSize: 10,
    conflictResolution: 'skip' as const,
    validateReferences: true,
    createMissingReferences: false,
  };

  describe('importProducts - Selective Processing', () => {
    it('should only process products-related data when importing products', async () => {
      const mockData = {
        metadata: {
          dataType: 'products',
          version: '2.0',
          recordCount: 5,
        },
        data: {
          products: [
            { name: 'Product 1', price: 100, cost: 50 },
            { name: 'Product 2', price: 200, cost: 100 },
          ],
          categories: [{ name: 'Category 1' }],
          suppliers: [{ name: 'Supplier 1' }],
          bulkPricing: [
            { product_id: 'prod1', min_quantity: 10, bulk_price: 90 },
          ],
          // These should be ignored for products import
          sales: [{ total: 500, payment_method: 'cash' }],
          customers: [{ name: 'Customer 1' }],
          expenses: [{ amount: 100, description: 'Test expense' }],
          stockMovements: [
            { product_id: 'prod1', movement_type: 'in', quantity: 10 },
          ],
        },
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockData)
      );
      (mockDatabase.getProductByName as jest.Mock).mockResolvedValue(null);
      (mockDatabase.addProduct as jest.Mock).mockResolvedValue({ id: 1 });

      const result = await importService.importProducts(
        'mock-file-uri',
        defaultOptions
      );

      expect(result.success).toBe(true);
      expect(result.dataType).toBe('products');
      expect(result.processedDataTypes).toContain('products');

      // Should process products-related data
      expect(mockDatabase.addProduct).toHaveBeenCalledTimes(2);

      // Should NOT process non-products data
      expect(mockDatabase.addSale).not.toHaveBeenCalled();
      expect(mockDatabase.addCustomer).not.toHaveBeenCalled();
      expect(mockDatabase.addExpense).not.toHaveBeenCalled();
      expect(mockDatabase.addStockMovement).not.toHaveBeenCalled();
    });

    it('should return error when products data is missing', async () => {
      const mockData = {
        metadata: {
          dataType: 'sales',
          version: '2.0',
          recordCount: 1,
        },
        data: {
          sales: [{ total: 500, payment_method: 'cash' }],
          customers: [{ name: 'Customer 1' }],
          // No products data
        },
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockData)
      );

      const result = await importService.importProducts(
        'mock-file-uri',
        defaultOptions
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_DATA_TYPE');
      expect(result.errors[0].message).toContain('products data');
      expect(result.availableDataTypes).toEqual(['sales', 'customers']);
      expect(mockDatabase.addProduct).not.toHaveBeenCalled();
    });

    it('should handle empty products data gracefully', async () => {
      const mockData = {
        metadata: {
          dataType: 'products',
          version: '2.0',
          recordCount: 0,
        },
        data: {
          products: [],
          categories: [],
          suppliers: [],
          bulkPricing: [],
        },
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockData)
      );

      const result = await importService.importProducts(
        'mock-file-uri',
        defaultOptions
      );

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('products data');
      expect(mockDatabase.addProduct).not.toHaveBeenCalled();
    });
  });

  describe('importSales - Selective Processing', () => {
    it('should only process sales-related data when importing sales', async () => {
      const mockData = {
        metadata: {
          dataType: 'sales',
          version: '2.0',
          recordCount: 3,
        },
        data: {
          sales: [
            { total: 500, payment_method: 'cash', date: '2024-01-01' },
            { total: 300, payment_method: 'card', date: '2024-01-02' },
          ],
          saleItems: [
            { product_id: 'prod1', quantity: 2, price: 100 },
            { product_id: 'prod2', quantity: 1, price: 300 },
          ],
          // These should be ignored for sales import
          products: [{ name: 'Product 1', price: 100, cost: 50 }],
          customers: [{ name: 'Customer 1' }],
          expenses: [{ amount: 100, description: 'Test expense' }],
        },
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockData)
      );
      (mockDatabase.addSale as jest.Mock).mockResolvedValue({ id: 1 });

      const result = await importService.importSales(
        'mock-file-uri',
        defaultOptions
      );

      expect(result.success).toBe(true);
      expect(result.dataType).toBe('sales');
      expect(result.processedDataTypes).toContain('sales');

      // Should process sales data
      expect(mockDatabase.addSale).toHaveBeenCalledTimes(2);

      // Should NOT process non-sales data
      expect(mockDatabase.addProduct).not.toHaveBeenCalled();
      expect(mockDatabase.addCustomer).not.toHaveBeenCalled();
      expect(mockDatabase.addExpense).not.toHaveBeenCalled();
    });

    it('should return error when sales data is missing', async () => {
      const mockData = {
        metadata: {
          dataType: 'products',
          version: '2.0',
          recordCount: 1,
        },
        data: {
          products: [{ name: 'Product 1', price: 100, cost: 50 }],
          // No sales data
        },
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockData)
      );

      const result = await importService.importSales(
        'mock-file-uri',
        defaultOptions
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_DATA_TYPE');
      expect(result.errors[0].message).toContain('sales data');
      expect(result.availableDataTypes).toEqual(['products']);
      expect(mockDatabase.addSale).not.toHaveBeenCalled();
    });
  });

  describe('importCustomers - Selective Processing', () => {
    it('should only process customers data when importing customers', async () => {
      const mockData = {
        metadata: {
          dataType: 'customers',
          version: '2.0',
          recordCount: 2,
        },
        data: {
          customers: [
            {
              name: 'Customer 1',
              phone: '123456789',
              email: 'customer1@test.com',
            },
            { name: 'Customer 2', phone: '987654321' },
          ],
          // These should be ignored for customers import
          products: [{ name: 'Product 1', price: 100, cost: 50 }],
          sales: [{ total: 500, payment_method: 'cash' }],
          expenses: [{ amount: 100, description: 'Test expense' }],
        },
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockData)
      );
      (mockDatabase.getCustomerByPhone as jest.Mock).mockResolvedValue(null);
      (mockDatabase.addCustomer as jest.Mock).mockResolvedValue({ id: 1 });

      const result = await importService.importCustomers(
        'mock-file-uri',
        defaultOptions
      );

      expect(result.success).toBe(true);
      expect(result.dataType).toBe('customers');
      expect(result.processedDataTypes).toContain('customers');

      // Should process customers data
      expect(mockDatabase.addCustomer).toHaveBeenCalledTimes(2);

      // Should NOT process non-customers data
      expect(mockDatabase.addProduct).not.toHaveBeenCalled();
      expect(mockDatabase.addSale).not.toHaveBeenCalled();
      expect(mockDatabase.addExpense).not.toHaveBeenCalled();
    });

    it('should return error when customers data is missing', async () => {
      const mockData = {
        metadata: {
          dataType: 'sales',
          version: '2.0',
          recordCount: 1,
        },
        data: {
          sales: [{ total: 500, payment_method: 'cash' }],
          // No customers data
        },
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockData)
      );

      const result = await importService.importCustomers(
        'mock-file-uri',
        defaultOptions
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_DATA_TYPE');
      expect(result.errors[0].message).toContain('customers data');
      expect(result.availableDataTypes).toEqual(['sales']);
      expect(mockDatabase.addCustomer).not.toHaveBeenCalled();
    });
  });

  describe('importExpenses - Selective Processing', () => {
    it('should only process expenses-related data when importing expenses', async () => {
      const mockData = {
        metadata: {
          dataType: 'expenses',
          version: '2.0',
          recordCount: 3,
        },
        data: {
          expenses: [
            { amount: 100, description: 'Office supplies', category: 'Office' },
            {
              amount: 200,
              description: 'Marketing costs',
              category: 'Marketing',
            },
          ],
          expenseCategories: [{ name: 'Office' }, { name: 'Marketing' }],
          // These should be ignored for expenses import
          products: [{ name: 'Product 1', price: 100, cost: 50 }],
          sales: [{ total: 500, payment_method: 'cash' }],
          customers: [{ name: 'Customer 1' }],
        },
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockData)
      );
      (mockDatabase.addExpense as jest.Mock).mockResolvedValue({ id: 1 });

      const result = await importService.importExpenses(
        'mock-file-uri',
        defaultOptions
      );

      expect(result.success).toBe(true);
      expect(result.dataType).toBe('expenses');
      expect(result.processedDataTypes).toContain('expenses');

      // Should process expenses data
      expect(mockDatabase.addExpense).toHaveBeenCalledTimes(2);

      // Should NOT process non-expenses data
      expect(mockDatabase.addProduct).not.toHaveBeenCalled();
      expect(mockDatabase.addSale).not.toHaveBeenCalled();
      expect(mockDatabase.addCustomer).not.toHaveBeenCalled();
    });

    it('should return error when expenses data is missing', async () => {
      const mockData = {
        metadata: {
          dataType: 'products',
          version: '2.0',
          recordCount: 1,
        },
        data: {
          products: [{ name: 'Product 1', price: 100, cost: 50 }],
          // No expenses data
        },
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockData)
      );

      const result = await importService.importExpenses(
        'mock-file-uri',
        defaultOptions
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_DATA_TYPE');
      expect(result.errors[0].message).toContain('expenses data');
      expect(result.availableDataTypes).toEqual(['products']);
      expect(mockDatabase.addExpense).not.toHaveBeenCalled();
    });
  });

  describe('importStockMovements - Selective Processing', () => {
    it('should only process stock movements data when importing stock movements', async () => {
      const mockData = {
        metadata: {
          dataType: 'stockMovements',
          version: '2.0',
          recordCount: 2,
        },
        data: {
          stockMovements: [
            {
              product_id: 'prod1',
              movement_type: 'in',
              quantity: 10,
              date: '2024-01-01',
            },
            {
              product_id: 'prod2',
              movement_type: 'out',
              quantity: 5,
              date: '2024-01-02',
            },
          ],
          // These should be ignored for stock movements import
          products: [{ name: 'Product 1', price: 100, cost: 50 }],
          sales: [{ total: 500, payment_method: 'cash' }],
          customers: [{ name: 'Customer 1' }],
          expenses: [{ amount: 100, description: 'Test expense' }],
        },
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockData)
      );
      (mockDatabase.addStockMovement as jest.Mock).mockResolvedValue({ id: 1 });

      const result = await importService.importStockMovements(
        'mock-file-uri',
        defaultOptions
      );

      expect(result.success).toBe(true);
      expect(result.dataType).toBe('stockMovements');
      expect(result.processedDataTypes).toContain('stockMovements');

      // Should process stock movements data
      expect(mockDatabase.addStockMovement).toHaveBeenCalledTimes(2);

      // Should NOT process non-stock movements data
      expect(mockDatabase.addProduct).not.toHaveBeenCalled();
      expect(mockDatabase.addSale).not.toHaveBeenCalled();
      expect(mockDatabase.addCustomer).not.toHaveBeenCalled();
      expect(mockDatabase.addExpense).not.toHaveBeenCalled();
    });

    it('should return error when stock movements data is missing', async () => {
      const mockData = {
        metadata: {
          dataType: 'sales',
          version: '2.0',
          recordCount: 1,
        },
        data: {
          sales: [{ total: 500, payment_method: 'cash' }],
          // No stock movements data
        },
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockData)
      );

      const result = await importService.importStockMovements(
        'mock-file-uri',
        defaultOptions
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_DATA_TYPE');
      expect(result.errors[0].message).toContain('stockMovements data');
      expect(result.availableDataTypes).toEqual(['sales']);
      expect(mockDatabase.addStockMovement).not.toHaveBeenCalled();
    });
  });

  describe('importBulkPricing - Selective Processing', () => {
    it('should only process bulk pricing data when importing bulk pricing', async () => {
      const mockData = {
        metadata: {
          dataType: 'bulkPricing',
          version: '2.0',
          recordCount: 2,
        },
        data: {
          bulkPricing: [
            { product_id: 'prod1', min_quantity: 10, bulk_price: 90 },
            { product_id: 'prod2', min_quantity: 20, bulk_price: 180 },
          ],
          // These should be ignored for bulk pricing import
          products: [{ name: 'Product 1', price: 100, cost: 50 }],
          sales: [{ total: 500, payment_method: 'cash' }],
          customers: [{ name: 'Customer 1' }],
        },
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockData)
      );
      (mockDatabase.addBulkPricing as jest.Mock).mockResolvedValue({ id: 1 });

      const result = await importService.importBulkPricing(
        'mock-file-uri',
        defaultOptions
      );

      expect(result.success).toBe(true);
      expect(result.dataType).toBe('bulkPricing');
      expect(result.processedDataTypes).toContain('bulkPricing');

      // Should process bulk pricing data
      expect(mockDatabase.addBulkPricing).toHaveBeenCalledTimes(2);

      // Should NOT process non-bulk pricing data
      expect(mockDatabase.addProduct).not.toHaveBeenCalled();
      expect(mockDatabase.addSale).not.toHaveBeenCalled();
      expect(mockDatabase.addCustomer).not.toHaveBeenCalled();
    });

    it('should return error when bulk pricing data is missing', async () => {
      const mockData = {
        metadata: {
          dataType: 'products',
          version: '2.0',
          recordCount: 1,
        },
        data: {
          products: [{ name: 'Product 1', price: 100, cost: 50 }],
          // No bulk pricing data
        },
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockData)
      );

      const result = await importService.importBulkPricing(
        'mock-file-uri',
        defaultOptions
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_DATA_TYPE');
      expect(result.errors[0].message).toContain('bulkPricing data');
      expect(result.availableDataTypes).toEqual(['products']);
      expect(mockDatabase.addBulkPricing).not.toHaveBeenCalled();
    });
  });
  de;
  scribe('Data Type Validation', () => {
    describe('validateDataTypeAvailability', () => {
      it('should validate available data types correctly', () => {
        const mockData = {
          data: {
            products: [{ name: 'Product 1', price: 100, cost: 50 }],
            sales: [{ total: 500, payment_method: 'cash' }],
            customers: [{ name: 'Customer 1' }],
            expenses: [],
            stockMovements: null,
            bulkPricing: undefined,
          },
        };

        const result = importService.validateDataTypeAvailability(
          mockData,
          'products'
        );

        expect(result.isValid).toBe(true);
        expect(result.availableTypes).toEqual([
          'products',
          'sales',
          'customers',
        ]);
        expect(result.detailedCounts).toEqual({
          products: 1,
          sales: 1,
          customers: 1,
          expenses: 0,
          stockMovements: 0,
          bulkPricing: 0,
        });
      });

      it('should return false for missing data type', () => {
        const mockData = {
          data: {
            products: [{ name: 'Product 1', price: 100, cost: 50 }],
            sales: [{ total: 500, payment_method: 'cash' }],
          },
        };

        const result = importService.validateDataTypeAvailability(
          mockData,
          'customers'
        );

        expect(result.isValid).toBe(false);
        expect(result.availableTypes).toEqual(['products', 'sales']);
        expect(result.message).toContain('customers data');
        expect(result.message).toContain(
          'Available data types: products (1 records), sales (1 records)'
        );
      });

      it('should validate "all" data type when any data is available', () => {
        const mockData = {
          data: {
            products: [{ name: 'Product 1', price: 100, cost: 50 }],
            sales: [],
            customers: null,
          },
        };

        const result = importService.validateDataTypeAvailability(
          mockData,
          'all'
        );

        expect(result.isValid).toBe(true);
        expect(result.availableTypes).toEqual(['products']);
      });

      it('should return false for "all" when no valid data is available', () => {
        const mockData = {
          data: {
            products: [],
            sales: [],
            customers: null,
            expenses: undefined,
          },
        };

        const result = importService.validateDataTypeAvailability(
          mockData,
          'all'
        );

        expect(result.isValid).toBe(false);
        expect(result.message).toContain('does not contain any valid data');
      });

      it('should handle corrupted data sections', () => {
        const mockData = {
          data: {
            products: [
              { name: 'Product 1', price: 100, cost: 50 }, // Valid
              { price: 100 }, // Invalid - missing name
              null, // Invalid - null record
            ],
            sales: 'not an array', // Invalid - not an array
            customers: [{ name: 'Customer 1' }], // Valid
          },
        };

        const result = importService.validateDataTypeAvailability(
          mockData,
          'products'
        );

        expect(result.isValid).toBe(true);
        expect(result.availableTypes).toEqual(['products', 'customers']);
        expect(result.detailedCounts?.products).toBe(1); // Only 1 valid product
        expect(result.detailedCounts?.customers).toBe(1);
        expect(result.corruptedSections).toContain('sales');
        expect(result.validationErrors).toContain(
          'Data section "sales" is not an array (found string)'
        );
      });

      it('should handle empty or null import data', () => {
        const result1 = importService.validateDataTypeAvailability(
          null,
          'products'
        );
        expect(result1.isValid).toBe(false);
        expect(result1.message).toContain('empty or null');

        const result2 = importService.validateDataTypeAvailability(
          {},
          'products'
        );
        expect(result2.isValid).toBe(false);
        expect(result2.message).toContain('missing "data" field');

        const result3 = importService.validateDataTypeAvailability(
          { data: null },
          'products'
        );
        expect(result3.isValid).toBe(false);
        expect(result3.message).toContain('not a valid object');
      });

      it('should validate dataType field mismatch', () => {
        const mockData = {
          dataType: 'sales',
          data: {
            products: [{ name: 'Product 1', price: 100, cost: 50 }],
          },
        };

        const result = importService.validateDataTypeAvailability(
          mockData,
          'products'
        );

        expect(result.isValid).toBe(false);
        expect(result.message).toContain(
          'dataType (sales) does not match selected import option (products)'
        );
      });

      it('should accept matching dataType field', () => {
        const mockData = {
          dataType: 'products',
          data: {
            products: [{ name: 'Product 1', price: 100, cost: 50 }],
          },
        };

        const result = importService.validateDataTypeAvailability(
          mockData,
          'products'
        );

        expect(result.isValid).toBe(true);
      });

      it('should accept "all" or "complete" dataType for any selection', () => {
        const mockData1 = {
          dataType: 'all',
          data: {
            products: [{ name: 'Product 1', price: 100, cost: 50 }],
          },
        };

        const result1 = importService.validateDataTypeAvailability(
          mockData1,
          'products'
        );
        expect(result1.isValid).toBe(true);

        const mockData2 = {
          dataType: 'complete',
          data: {
            sales: [{ total: 500, payment_method: 'cash' }],
          },
        };

        const result2 = importService.validateDataTypeAvailability(
          mockData2,
          'sales'
        );
        expect(result2.isValid).toBe(true);
      });

      it('should return error for unsupported data type', () => {
        const mockData = {
          data: {
            products: [{ name: 'Product 1', price: 100, cost: 50 }],
          },
        };

        const result = importService.validateDataTypeAvailability(
          mockData,
          'unsupported'
        );

        expect(result.isValid).toBe(false);
        expect(result.message).toContain('Unsupported data type: unsupported');
      });
    });
  });

  describe('Error Handling for Missing Data Types', () => {
    it('should provide clear error messages with available alternatives', async () => {
      const mockData = {
        metadata: {
          dataType: 'mixed',
          version: '2.0',
          recordCount: 3,
        },
        data: {
          products: [{ name: 'Product 1', price: 100, cost: 50 }],
          customers: [{ name: 'Customer 1' }],
          // Missing sales data
        },
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockData)
      );

      const result = await importService.importSales(
        'mock-file-uri',
        defaultOptions
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('sales data');
      expect(result.errors[0].message).toContain(
        'Available data types: products (1 records), customers (1 records)'
      );
      expect(result.availableDataTypes).toEqual(['products', 'customers']);
      expect(result.detailedCounts).toEqual({
        products: 1,
        customers: 1,
      });
    });

    it('should handle completely empty import files', async () => {
      const mockData = {
        metadata: {
          dataType: 'empty',
          version: '2.0',
          recordCount: 0,
        },
        data: {},
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockData)
      );

      const result = await importService.importProducts(
        'mock-file-uri',
        defaultOptions
      );

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('products data');
      expect(result.availableDataTypes).toEqual([]);
    });

    it('should handle malformed JSON files', async () => {
      mockFileSystem.readAsStringAsync.mockResolvedValue(
        'invalid json content'
      );

      const result = await importService.importProducts(
        'mock-file-uri',
        defaultOptions
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('IMPORT_FAILED');
    });

    it('should handle files with corrupted data sections', async () => {
      const mockData = {
        metadata: {
          dataType: 'mixed',
          version: '2.0',
          recordCount: 2,
        },
        data: {
          products: [
            { name: 'Valid Product', price: 100, cost: 50 },
            { price: 'invalid' }, // Invalid product
            null, // Null product
          ],
          sales: 'not an array', // Corrupted section
          customers: [{ name: 'Valid Customer' }],
        },
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockData)
      );

      const result = await importService.importSales(
        'mock-file-uri',
        defaultOptions
      );

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('sales data');
      expect(result.availableDataTypes).toEqual(['products', 'customers']);
      expect(result.detailedCounts?.products).toBe(1); // Only valid products counted
      expect(result.detailedCounts?.customers).toBe(1);
    });
  });

  describe('Import Result Feedback', () => {
    it('should return accurate counts for processed data type only', async () => {
      const mockData = {
        metadata: {
          dataType: 'products',
          version: '2.0',
          recordCount: 5,
        },
        data: {
          products: [
            { name: 'Product 1', price: 100, cost: 50 },
            { name: 'Product 2', price: 200, cost: 100 },
            { name: 'Product 3', price: 300, cost: 150 },
          ],
          // Other data that should not affect counts
          sales: [
            { total: 500, payment_method: 'cash' },
            { total: 300, payment_method: 'card' },
          ],
          customers: [{ name: 'Customer 1' }],
        },
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockData)
      );
      (mockDatabase.getProductByName as jest.Mock).mockResolvedValue(null);
      (mockDatabase.addProduct as jest.Mock).mockResolvedValue({ id: 1 });

      const result = await importService.importProducts(
        'mock-file-uri',
        defaultOptions
      );

      expect(result.success).toBe(true);
      expect(result.imported).toBe(3); // Only products count
      expect(result.dataType).toBe('products');
      expect(result.processedDataTypes).toContain('products');
      expect(result.actualProcessedCounts?.products?.imported).toBe(3);

      // Verify other data types were not processed
      expect(mockDatabase.addSale).not.toHaveBeenCalled();
      expect(mockDatabase.addCustomer).not.toHaveBeenCalled();
    });

    it('should provide detailed validation messages', async () => {
      const mockData = {
        metadata: {
          dataType: 'customers',
          version: '2.0',
          recordCount: 1,
        },
        data: {
          products: [{ name: 'Product 1', price: 100, cost: 50 }],
          sales: [{ total: 500, payment_method: 'cash' }],
          // No customers data
        },
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockData)
      );

      const result = await importService.importCustomers(
        'mock-file-uri',
        defaultOptions
      );

      expect(result.success).toBe(false);
      expect(result.validationMessage).toContain('customers data');
      expect(result.validationMessage).toContain(
        'Available data types: products (1 records), sales (1 records)'
      );
      expect(result.detailedCounts).toEqual({
        products: 1,
        sales: 1,
      });
    });
  });
});
