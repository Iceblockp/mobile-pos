import {
  DataImportService,
  ConflictSummary,
} from '@/services/dataImportService';
import { DatabaseService } from '@/services/database';

// Mock the database service
jest.mock('@/services/database');

describe('Enhanced Conflict Detection', () => {
  let dataImportService: DataImportService;
  let mockDb: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    mockDb = new DatabaseService() as jest.Mocked<DatabaseService>;
    dataImportService = new DataImportService(mockDb);

    // Mock database methods
    mockDb.getProducts = jest.fn().mockResolvedValue([
      { id: 'prod-1', name: 'Product 1', price: 10.0 },
      { id: 'prod-2', name: 'Product 2', price: 20.0 },
    ]);

    mockDb.getCustomers = jest
      .fn()
      .mockResolvedValue([
        { id: 'cust-1', name: 'Customer 1', phone: '123456789' },
      ]);

    mockDb.getCategories = jest
      .fn()
      .mockResolvedValue([{ id: 'cat-1', name: 'Category 1' }]);

    mockDb.getSalesPaginated = jest.fn().mockResolvedValue([]);
    mockDb.getExpenses = jest.fn().mockResolvedValue([]);
    mockDb.getStockMovements = jest.fn().mockResolvedValue([]);
    mockDb.getBulkPricingForProduct = jest.fn().mockResolvedValue([]);
  });

  test('should return enhanced conflict summary with grouped conflicts', async () => {
    const importData = {
      products: [
        { id: 'prod-1', name: 'Product 1 Updated', price: 15.0 }, // Duplicate by UUID
        { name: 'Product 2', price: 25.0 }, // Duplicate by name
        { name: 'New Product', price: 30.0 }, // No conflict
      ],
      customers: [
        { id: 'cust-1', name: 'Customer 1 Updated', phone: '987654321' }, // Duplicate by UUID
        { name: 'Customer 1', phone: '111222333' }, // Duplicate by name
      ],
    };

    const conflictSummary: ConflictSummary =
      await dataImportService.detectAllConflicts(importData);

    // Check overall structure
    expect(conflictSummary.hasConflicts).toBe(true);
    expect(conflictSummary.totalConflicts).toBeGreaterThan(0);
    expect(conflictSummary.conflictsByType).toBeDefined();
    expect(conflictSummary.conflictStatistics).toBeDefined();

    // Check conflicts are grouped by data type
    expect(conflictSummary.conflictsByType.products).toBeDefined();
    expect(conflictSummary.conflictsByType.customers).toBeDefined();

    // Check statistics are calculated correctly
    expect(conflictSummary.conflictStatistics.products).toBeDefined();
    expect(conflictSummary.conflictStatistics.customers).toBeDefined();

    // Verify product conflicts
    const productConflicts = conflictSummary.conflictsByType.products;
    expect(productConflicts.length).toBeGreaterThan(0);

    // Should have UUID-based conflict for prod-1
    const uuidConflict = productConflicts.find((c) => c.matchedBy === 'uuid');
    expect(uuidConflict).toBeDefined();
    expect(uuidConflict?.record.id).toBe('prod-1');

    // Should have name-based conflict for Product 2
    const nameConflict = productConflicts.find((c) => c.matchedBy === 'name');
    expect(nameConflict).toBeDefined();
    expect(nameConflict?.record.name).toBe('Product 2');

    // Verify customer conflicts
    const customerConflicts = conflictSummary.conflictsByType.customers;
    expect(customerConflicts.length).toBeGreaterThan(0);

    // Check statistics match actual conflicts
    expect(conflictSummary.conflictStatistics.products.total).toBe(
      productConflicts.length
    );
    expect(conflictSummary.conflictStatistics.customers.total).toBe(
      customerConflicts.length
    );
  });

  test('should handle empty data gracefully', async () => {
    const importData = {};

    const conflictSummary: ConflictSummary =
      await dataImportService.detectAllConflicts(importData);

    expect(conflictSummary.hasConflicts).toBe(false);
    expect(conflictSummary.totalConflicts).toBe(0);
    expect(Object.keys(conflictSummary.conflictsByType)).toHaveLength(7); // All data types initialized
    expect(Object.keys(conflictSummary.conflictStatistics)).toHaveLength(7);
  });

  test('should categorize conflict types correctly', async () => {
    const importData = {
      products: [
        { name: 'Product 1' }, // Missing required fields - validation_failed
        { id: 'prod-1', name: 'Product 1 Updated', price: 15.0 }, // Duplicate - duplicate
      ],
      stockMovements: [
        { product_id: 'non-existent', movement_type: 'in', quantity: 10 }, // Missing reference - reference_missing
      ],
    };

    const conflictSummary: ConflictSummary =
      await dataImportService.detectAllConflicts(importData);

    // Check that different conflict types are categorized correctly
    const productStats = conflictSummary.conflictStatistics.products;
    expect(productStats.validation_failed).toBeGreaterThan(0);
    expect(productStats.duplicate).toBeGreaterThan(0);

    const stockMovementStats =
      conflictSummary.conflictStatistics.stockMovements;
    expect(stockMovementStats.reference_missing).toBeGreaterThan(0);
  });
});
