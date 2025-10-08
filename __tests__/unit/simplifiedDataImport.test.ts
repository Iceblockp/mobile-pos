import { DataImportService } from '@/services/dataImportService';
import { DatabaseService } from '@/services/database';

// Mock the database service
jest.mock('@/services/database');

describe('Simplified Data Import', () => {
  let dataImportService: DataImportService;
  let mockDb: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    mockDb = new DatabaseService() as jest.Mocked<DatabaseService>;
    dataImportService = new DataImportService(mockDb);

    // Mock database methods
    mockDb.getProducts = jest.fn().mockResolvedValue([]);
    mockDb.getCustomers = jest.fn().mockResolvedValue([]);
    mockDb.getCategories = jest.fn().mockResolvedValue([]);
    mockDb.getSalesPaginated = jest.fn().mockResolvedValue([]);
    mockDb.getExpenses = jest.fn().mockResolvedValue([]);
    mockDb.getStockMovements = jest.fn().mockResolvedValue([]);
    mockDb.getBulkPricingForProduct = jest.fn().mockResolvedValue([]);
  });

  test('should validate data type availability for simplified import', () => {
    const importData = {
      data: {
        products: [{ id: 'prod-1', name: 'Product 1', price: 10.0, cost: 5.0 }],
        customers: [{ id: 'cust-1', name: 'Customer 1' }],
      },
    };

    const validation =
      dataImportService.validateDataTypeAvailability(importData);

    expect(validation.isValid).toBe(true);
    expect(validation.availableTypes).toContain('products');
    expect(validation.availableTypes).toContain('customers');
    expect(validation.detailedCounts?.products).toBe(1);
    expect(validation.detailedCounts?.customers).toBe(1);
  });

  test('should handle empty import data', () => {
    const importData = {
      data: {},
    };

    const validation =
      dataImportService.validateDataTypeAvailability(importData);

    expect(validation.isValid).toBe(false);
    expect(validation.availableTypes).toHaveLength(0);
    expect(validation.message).toContain('does not contain any valid data');
  });

  test('should handle corrupted import data', () => {
    const importData = {
      data: {
        products: 'not an array', // Invalid data structure
        customers: [
          { id: 'cust-1', name: 'Customer 1' }, // Valid data
        ],
      },
    };

    const validation =
      dataImportService.validateDataTypeAvailability(importData);

    expect(validation.isValid).toBe(true); // Should still be valid because customers is valid
    expect(validation.availableTypes).toContain('customers');
    expect(validation.availableTypes).not.toContain('products');
    expect(validation.corruptedSections).toContain('products');
  });

  test('should detect conflicts in simplified import', async () => {
    // Mock existing data
    mockDb.getProducts.mockResolvedValue([
      { id: 'prod-1', name: 'Existing Product', price: 15.0 },
    ]);

    const importData = {
      products: [
        { id: 'prod-1', name: 'Updated Product', price: 20.0 }, // Conflict by UUID
        { name: 'Existing Product', price: 25.0 }, // Conflict by name
      ],
    };

    const conflictSummary = await dataImportService.detectAllConflicts(
      importData
    );

    expect(conflictSummary.hasConflicts).toBe(true);
    expect(conflictSummary.totalConflicts).toBeGreaterThan(0);
    expect(conflictSummary.conflictsByType.products).toBeDefined();
    expect(conflictSummary.conflictsByType.products.length).toBeGreaterThan(0);

    // Check statistics
    expect(conflictSummary.conflictStatistics.products.total).toBeGreaterThan(
      0
    );
    expect(
      conflictSummary.conflictStatistics.products.duplicate
    ).toBeGreaterThan(0);
  });
});
