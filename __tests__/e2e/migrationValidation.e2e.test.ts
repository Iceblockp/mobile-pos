/**
 * End-to-end tests for UUID migration validation
 * Tests complete migration scenarios from start to finish with validation
 */

// Mock implementations for E2E testing
const mockUUIDService = {
  generate: jest.fn(() => {
    // Generate realistic UUIDs for E2E testing
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp.substring(0, 8)}-${random.substring(
      0,
      4
    )}-4${random.substring(4, 7)}-8${random.substring(
      7,
      10
    )}-${random.substring(10, 22)}`;
  }),
  isValid: (uuid: string) => {
    if (!uuid || typeof uuid !== 'string') return false;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },
};

// Mock comprehensive database for E2E testing
const mockDb = {
  execAsync: jest.fn(),
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  runAsync: jest.fn(),
  _db: {
    _db: {
      filename: '/mock/test-database.db',
    },
  },
};

// Mock file system for backup operations
const mockFileSystem = {
  documentDirectory: '/mock/documents/',
  copyAsync: jest.fn(),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
};

// Mock modules
jest.mock('expo-file-system', () => mockFileSystem);
jest.mock('../../utils/uuid', () => ({
  UUIDService: mockUUIDService,
}));

import {
  UUIDMigrationService,
  MigrationReport,
  MigrationValidationReport,
} from '../../services/uuidMigrationService';

describe('UUID Migration Validation E2E', () => {
  let migrationService: UUIDMigrationService;

  beforeEach(() => {
    jest.clearAllMocks();
    migrationService = new UUIDMigrationService(mockDb as any);
  });

  describe('Complete Migration Lifecycle', () => {
    it('should execute complete migration with comprehensive validation', async () => {
      // Simulate a realistic database with interconnected data
      const mockData = {
        categories: [
          { id: 1, name: 'Electronics', description: 'Electronic devices' },
          { id: 2, name: 'Clothing', description: 'Apparel and accessories' },
          { id: 3, name: 'Books', description: 'Books and literature' },
        ],
        suppliers: [
          {
            id: 1,
            name: 'Tech Corp',
            contact_name: 'John Doe',
            phone: '123-456-7890',
          },
          {
            id: 2,
            name: 'Fashion Inc',
            contact_name: 'Jane Smith',
            phone: '098-765-4321',
          },
        ],
        customers: [
          {
            id: 1,
            name: 'Alice Johnson',
            phone: '555-0001',
            total_spent: 150.0,
          },
          { id: 2, name: 'Bob Wilson', phone: '555-0002', total_spent: 89.99 },
        ],
        products: [
          {
            id: 1,
            name: 'Smartphone',
            category_id: 1,
            supplier_id: 1,
            price: 299.99,
            cost: 200.0,
            quantity: 50,
          },
          {
            id: 2,
            name: 'T-Shirt',
            category_id: 2,
            supplier_id: 2,
            price: 19.99,
            cost: 10.0,
            quantity: 100,
          },
          {
            id: 3,
            name: 'Novel',
            category_id: 3,
            supplier_id: null,
            price: 12.99,
            cost: 8.0,
            quantity: 25,
          },
        ],
        sales: [
          {
            id: 1,
            total: 319.98,
            payment_method: 'card',
            customer_id: 1,
            created_at: '2024-01-01 10:00:00',
          },
          {
            id: 2,
            total: 32.98,
            payment_method: 'cash',
            customer_id: 2,
            created_at: '2024-01-02 14:30:00',
          },
        ],
        sale_items: [
          {
            id: 1,
            sale_id: 1,
            product_id: 1,
            quantity: 1,
            price: 299.99,
            cost: 200.0,
            subtotal: 299.99,
          },
          {
            id: 2,
            sale_id: 1,
            product_id: 2,
            quantity: 1,
            price: 19.99,
            cost: 10.0,
            subtotal: 19.99,
          },
          {
            id: 3,
            sale_id: 2,
            product_id: 2,
            quantity: 1,
            price: 19.99,
            cost: 10.0,
            subtotal: 19.99,
          },
          {
            id: 4,
            sale_id: 2,
            product_id: 3,
            quantity: 1,
            price: 12.99,
            cost: 8.0,
            subtotal: 12.99,
          },
        ],
        expense_categories: [
          { id: 1, name: 'Rent', description: 'Monthly rent payments' },
          {
            id: 2,
            name: 'Utilities',
            description: 'Electricity, water, internet',
          },
        ],
        expenses: [
          {
            id: 1,
            category_id: 1,
            amount: 1200.0,
            description: 'January rent',
            date: '2024-01-01',
          },
          {
            id: 2,
            category_id: 2,
            amount: 150.0,
            description: 'Electricity bill',
            date: '2024-01-15',
          },
        ],
        stock_movements: [
          {
            id: 1,
            product_id: 1,
            type: 'stock_in',
            quantity: 50,
            supplier_id: 1,
            unit_cost: 200.0,
          },
          {
            id: 2,
            product_id: 2,
            type: 'stock_in',
            quantity: 100,
            supplier_id: 2,
            unit_cost: 10.0,
          },
          {
            id: 3,
            product_id: 1,
            type: 'stock_out',
            quantity: 1,
            reason: 'sale',
          },
        ],
        bulk_pricing: [
          { id: 1, product_id: 1, min_quantity: 10, bulk_price: 280.0 },
          { id: 2, product_id: 2, min_quantity: 50, bulk_price: 18.0 },
        ],
      };

      // Mock migration not complete initially
      mockDb.getAllAsync.mockResolvedValueOnce([
        { name: 'id', type: 'INTEGER' },
      ]);

      // Mock successful backup creation
      mockFileSystem.copyAsync.mockResolvedValue(undefined);

      // Mock successful table creation and transaction operations
      mockDb.execAsync.mockResolvedValue(undefined);
      mockDb.runAsync.mockResolvedValue(undefined);

      // Mock data retrieval for each table during migration
      const tableOrder = [
        'categories',
        'expense_categories',
        'suppliers',
        'customers',
        'products',
        'sales',
        'sale_items',
        'expenses',
        'stock_movements',
        'bulk_pricing',
      ];

      for (const table of tableOrder) {
        mockDb.getAllAsync.mockResolvedValueOnce(
          mockData[table as keyof typeof mockData] || []
        );
      }

      // Mock UUID mapping queries during migration
      let uuidCounter = 0;
      const uuidMap = new Map<string, string>();

      mockDb.getFirstAsync.mockImplementation(
        (query: string, params?: any[]) => {
          if (
            query.includes('id_mapping') &&
            query.includes('SELECT new_uuid')
          ) {
            const key = `${params?.[0]}_${params?.[1]}`;
            if (!uuidMap.has(key)) {
              uuidMap.set(
                key,
                `uuid-${++uuidCounter}-${Math.random()
                  .toString(36)
                  .substring(2, 15)}`
              );
            }
            return Promise.resolve({ new_uuid: uuidMap.get(key) });
          }
          return Promise.resolve({ count: 0 });
        }
      );

      // Mock comprehensive validation queries
      let validationCallCount = 0;
      mockDb.getFirstAsync.mockImplementation((query: string) => {
        validationCallCount++;

        // UUID format validation - no null/empty UUIDs
        if (query.includes('IS NULL OR') && query.includes('= ""')) {
          return Promise.resolve({ count: 0 });
        }

        // Foreign key validation - no orphaned records
        if (query.includes('LEFT JOIN')) {
          return Promise.resolve({ count: 0 });
        }

        // Record count validation
        if (query.includes('COUNT(*)') && !query.includes('LEFT JOIN')) {
          const tableName = query.match(/FROM (\w+)/)?.[1];
          const tableData = mockData[
            tableName as keyof typeof mockData
          ] as any[];
          return Promise.resolve({ count: tableData?.length || 0 });
        }

        // Data integrity - nil UUID checks
        if (query.includes('00000000-0000-0000-0000-000000000000')) {
          return Promise.resolve({ count: 0 });
        }

        // Index existence checks
        if (query.includes('sqlite_master') && query.includes('index')) {
          return Promise.resolve({ name: 'idx_test_index' });
        }

        return Promise.resolve({ count: 0 });
      });

      // Mock sample records for UUID format validation
      mockDb.getAllAsync.mockImplementation((query: string) => {
        if (query.includes('LIMIT 10')) {
          return Promise.resolve([
            {
              id: 'uuid-sample-1',
              category_id: 'uuid-sample-2',
              supplier_id: 'uuid-sample-3',
            },
          ]);
        }

        // Duplicate checks - no duplicates
        if (query.includes('GROUP BY') && query.includes('HAVING COUNT(*)')) {
          return Promise.resolve([]);
        }

        return Promise.resolve([]);
      });

      // Execute the complete migration
      const report = await migrationService.executeMigration();

      // Verify migration success
      expect(report.success).toBe(true);
      expect(report.tablesProcessed).toEqual([
        'categories',
        'expense_categories',
        'suppliers',
        'customers',
        'products',
        'sales',
        'sale_items',
        'expenses',
        'stock_movements',
        'bulk_pricing',
      ]);

      // Verify record counts match original data
      expect(report.recordsMigrated.categories).toBe(3);
      expect(report.recordsMigrated.products).toBe(3);
      expect(report.recordsMigrated.sales).toBe(2);
      expect(report.recordsMigrated.sale_items).toBe(4);
      expect(report.recordsMigrated.suppliers).toBe(2);
      expect(report.recordsMigrated.customers).toBe(2);
      expect(report.recordsMigrated.expenses).toBe(2);
      expect(report.recordsMigrated.expense_categories).toBe(2);
      expect(report.recordsMigrated.stock_movements).toBe(3);
      expect(report.recordsMigrated.bulk_pricing).toBe(2);

      // Verify total records
      expect(report.totalRecords).toBe(25);

      // Verify validation report
      expect(report.validationReport).toBeDefined();
      expect(report.validationReport?.success).toBe(true);
      expect(report.validationReport?.passedValidations).toBe(4);
      expect(report.validationReport?.totalValidations).toBe(4);

      // Verify all validation categories passed
      expect(
        report.validationReport?.validationResults.uuidFormats.passed
      ).toBe(true);
      expect(
        report.validationReport?.validationResults.foreignKeys.passed
      ).toBe(true);
      expect(
        report.validationReport?.validationResults.recordCounts.passed
      ).toBe(true);
      expect(
        report.validationReport?.validationResults.dataIntegrity.passed
      ).toBe(true);

      // Verify backup was created
      expect(report.backupPath).toBeDefined();
      expect(mockFileSystem.copyAsync).toHaveBeenCalled();

      // Verify migration duration is reasonable
      expect(report.duration).toBeGreaterThan(0);
      expect(report.duration).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify no errors or warnings
      expect(report.errors).toHaveLength(0);
      expect(report.warnings).toHaveLength(0);
    });

    it('should handle migration failure with proper rollback and validation reporting', async () => {
      // Mock migration not complete
      mockDb.getAllAsync.mockResolvedValueOnce([
        { name: 'id', type: 'INTEGER' },
      ]);

      // Mock successful backup creation
      mockFileSystem.copyAsync.mockResolvedValue(undefined);

      // Mock successful initial operations
      mockDb.execAsync.mockResolvedValue(undefined);
      mockDb.runAsync.mockResolvedValue(undefined);

      // Mock data for migration
      mockDb.getAllAsync.mockResolvedValue([{ id: 1, name: 'Test Category' }]);

      // Mock UUID mapping
      mockDb.getFirstAsync.mockResolvedValue({ new_uuid: 'test-uuid-123' });

      // Mock validation failure - simulate foreign key constraint violation
      let validationCallCount = 0;
      mockDb.getFirstAsync.mockImplementation((query: string) => {
        validationCallCount++;

        // First few validation calls pass
        if (validationCallCount <= 15) {
          return Promise.resolve({ count: 0 });
        }

        // Foreign key validation fails
        if (query.includes('LEFT JOIN') && query.includes('products')) {
          return Promise.resolve({ count: 5 }); // 5 orphaned records
        }

        return Promise.resolve({ count: 0 });
      });

      // Mock sample records for UUID format validation
      mockDb.getAllAsync.mockResolvedValue([{ id: 'test-uuid-123' }]);

      // Execute migration (should fail during validation)
      const report = await migrationService.executeMigration();

      // Verify migration failed
      expect(report.success).toBe(false);
      expect(report.errors).toContain(
        expect.stringContaining('Migration validation failed')
      );

      // Verify rollback was attempted
      expect(report.warnings).toContain('Rollback completed successfully');

      // Verify validation report shows the failure
      expect(report.validationReport).toBeUndefined(); // Not included in failed migration
    });

    it('should validate migration performance with large dataset', async () => {
      // Mock migration not complete
      mockDb.getAllAsync.mockResolvedValueOnce([
        { name: 'id', type: 'INTEGER' },
      ]);

      // Mock successful operations
      mockFileSystem.copyAsync.mockResolvedValue(undefined);
      mockDb.execAsync.mockResolvedValue(undefined);
      mockDb.runAsync.mockResolvedValue(undefined);

      // Mock large dataset (simulate 1000 products, 500 sales, etc.)
      const largeDataset = {
        categories: Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          name: `Category ${i + 1}`,
        })),
        products: Array.from({ length: 1000 }, (_, i) => ({
          id: i + 1,
          name: `Product ${i + 1}`,
          category_id: (i % 10) + 1,
          price: 10.0 + i,
          cost: 5.0 + i,
          quantity: 100 - i,
        })),
        sales: Array.from({ length: 500 }, (_, i) => ({
          id: i + 1,
          total: 50.0 + i,
          payment_method: i % 2 === 0 ? 'card' : 'cash',
          customer_id: (i % 100) + 1,
        })),
        customers: Array.from({ length: 100 }, (_, i) => ({
          id: i + 1,
          name: `Customer ${i + 1}`,
          total_spent: i * 10,
        })),
      };

      // Mock data retrieval for large dataset
      mockDb.getAllAsync
        .mockResolvedValueOnce(largeDataset.categories) // categories
        .mockResolvedValueOnce([]) // expense_categories
        .mockResolvedValueOnce([]) // suppliers
        .mockResolvedValueOnce(largeDataset.customers) // customers
        .mockResolvedValueOnce(largeDataset.products) // products
        .mockResolvedValueOnce(largeDataset.sales) // sales
        .mockResolvedValueOnce([]) // sale_items
        .mockResolvedValueOnce([]) // expenses
        .mockResolvedValueOnce([]) // stock_movements
        .mockResolvedValueOnce([]); // bulk_pricing

      // Mock UUID mapping and validation
      mockDb.getFirstAsync.mockResolvedValue({ count: 0 });
      mockDb.getAllAsync.mockResolvedValue([]);

      const startTime = Date.now();
      const report = await migrationService.executeMigration();
      const duration = Date.now() - startTime;

      // Verify migration completed successfully
      expect(report.success).toBe(true);
      expect(report.recordsMigrated.products).toBe(1000);
      expect(report.recordsMigrated.sales).toBe(500);
      expect(report.recordsMigrated.customers).toBe(100);
      expect(report.totalRecords).toBe(1610); // 10 + 1000 + 500 + 100

      // Verify performance is acceptable (should complete within reasonable time)
      expect(duration).toBeLessThan(15000); // 15 seconds for large dataset
      expect(report.duration).toBeGreaterThan(0);

      // Verify validation was performed on large dataset
      expect(report.validationReport?.success).toBe(true);
    });
  });

  describe('Real-world Migration Scenarios', () => {
    it('should handle migration with complex foreign key relationships', async () => {
      // Test scenario: Products with categories and suppliers, sales with customers and products
      const complexData = {
        categories: [{ id: 1, name: 'Electronics' }],
        suppliers: [{ id: 1, name: 'Tech Supplier' }],
        customers: [{ id: 1, name: 'John Doe' }],
        products: [{ id: 1, name: 'Phone', category_id: 1, supplier_id: 1 }],
        sales: [{ id: 1, total: 299.99, customer_id: 1 }],
        sale_items: [
          { id: 1, sale_id: 1, product_id: 1, quantity: 1, price: 299.99 },
        ],
        stock_movements: [
          {
            id: 1,
            product_id: 1,
            type: 'stock_in',
            quantity: 10,
            supplier_id: 1,
          },
        ],
        bulk_pricing: [
          { id: 1, product_id: 1, min_quantity: 5, bulk_price: 280.0 },
        ],
      };

      // Mock migration setup
      mockDb.getAllAsync.mockResolvedValueOnce([
        { name: 'id', type: 'INTEGER' },
      ]);
      mockFileSystem.copyAsync.mockResolvedValue(undefined);
      mockDb.execAsync.mockResolvedValue(undefined);
      mockDb.runAsync.mockResolvedValue(undefined);

      // Mock data retrieval
      const tableOrder = [
        'categories',
        'expense_categories',
        'suppliers',
        'customers',
        'products',
        'sales',
        'sale_items',
        'expenses',
        'stock_movements',
        'bulk_pricing',
      ];
      for (const table of tableOrder) {
        mockDb.getAllAsync.mockResolvedValueOnce(
          complexData[table as keyof typeof complexData] || []
        );
      }

      // Mock UUID mapping and validation
      mockDb.getFirstAsync.mockResolvedValue({ count: 0 });
      mockDb.getAllAsync.mockResolvedValue([]);

      const report = await migrationService.executeMigration();

      expect(report.success).toBe(true);
      expect(
        report.validationReport?.validationResults.foreignKeys.passed
      ).toBe(true);
    });

    it('should detect and prevent migration with data inconsistencies', async () => {
      // Test scenario: Products reference non-existent categories
      mockDb.getAllAsync.mockResolvedValueOnce([
        { name: 'id', type: 'INTEGER' },
      ]);
      mockFileSystem.copyAsync.mockResolvedValue(undefined);
      mockDb.execAsync.mockResolvedValue(undefined);
      mockDb.runAsync.mockResolvedValue(undefined);

      // Mock inconsistent data
      mockDb.getAllAsync
        .mockResolvedValueOnce([]) // No categories
        .mockResolvedValueOnce([]) // expense_categories
        .mockResolvedValueOnce([]) // suppliers
        .mockResolvedValueOnce([]) // customers
        .mockResolvedValueOnce([
          { id: 1, name: 'Orphaned Product', category_id: 999 },
        ]) // Product with invalid category_id
        .mockResolvedValueOnce([]) // sales
        .mockResolvedValueOnce([]) // sale_items
        .mockResolvedValueOnce([]) // expenses
        .mockResolvedValueOnce([]) // stock_movements
        .mockResolvedValueOnce([]); // bulk_pricing

      // Mock validation failure for foreign key constraint
      mockDb.getFirstAsync
        .mockResolvedValue({ count: 0 }) // UUID format validation passes
        .mockResolvedValueOnce({ count: 1 }) // Foreign key validation fails - 1 orphaned product
        .mockResolvedValue({ count: 0 }); // Other validations pass

      const report = await migrationService.executeMigration();

      expect(report.success).toBe(false);
      expect(report.errors).toContain(
        expect.stringContaining('Migration validation failed')
      );
    });
  });
});
