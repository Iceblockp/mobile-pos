import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataExportService } from '../../services/dataExportService';

// Mock the dependencies
vi.mock('expo-file-system', () => ({
  documentDirectory: '/mock/directory/',
  writeAsStringAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('expo-sharing', () => ({
  isAvailableAsync: vi.fn().mockResolvedValue(true),
  shareAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/errorHandlingService', () => ({
  ErrorHandlingService: vi.fn().mockImplementation(() => ({
    logError: vi.fn(),
    handleError: vi.fn(),
  })),
}));

vi.mock('../../services/performanceOptimizationService', () => ({
  PerformanceOptimizationService: vi.fn().mockImplementation(() => ({
    optimize: vi.fn(),
  })),
}));

vi.mock('../../utils/uuid', () => ({
  isValidUUID: vi.fn().mockReturnValue(true),
}));

describe('DataExportService - Export Result Feedback and Validation', () => {
  let mockDb: any;
  let exportService: DataExportService;

  beforeEach(() => {
    mockDb = {
      getProducts: vi.fn().mockResolvedValue([]),
      getCategories: vi.fn().mockResolvedValue([]),
      getSuppliers: vi.fn().mockResolvedValue([]),
      getBulkPricingForProduct: vi.fn().mockResolvedValue([]),
      getSalesByDateRange: vi.fn().mockResolvedValue([]),
      getSaleItems: vi.fn().mockResolvedValue([]),
      getCustomers: vi.fn().mockResolvedValue([]),
      getCustomerPurchaseHistory: vi.fn().mockResolvedValue([]),
      getCustomerStatistics: vi.fn().mockResolvedValue({
        totalSpent: 0,
        visitCount: 0,
        averageOrderValue: 0,
        lastVisit: null,
      }),
      getExpensesByDateRange: vi.fn().mockResolvedValue([]),
      getExpenseCategories: vi.fn().mockResolvedValue([]),
      getStockMovements: vi.fn().mockResolvedValue([]),
    };

    exportService = new DataExportService(mockDb);
  });

  it('should return accurate record counts for empty products export', async () => {
    const result = await exportService.exportProducts();

    expect(result.success).toBe(true);
    expect(result.recordCount).toBe(0);
    expect(result.emptyExport).toBe(true);
    expect(result.actualDataType).toBe('products');
    expect(result.metadata.emptyExport).toBe(true);
    expect(result.metadata.actualRecordCount).toBe(0);
    expect(result.metadata.dataType).toBe('products');
  });

  it('should return accurate record counts for products export with data', async () => {
    // Mock data with actual records
    mockDb.getProducts.mockResolvedValue([
      { id: '1', name: 'Product 1' },
      { id: '2', name: 'Product 2' },
    ]);
    mockDb.getCategories.mockResolvedValue([{ id: '1', name: 'Category 1' }]);
    mockDb.getSuppliers.mockResolvedValue([{ id: '1', name: 'Supplier 1' }]);

    const result = await exportService.exportProducts();

    expect(result.success).toBe(true);
    expect(result.recordCount).toBe(4); // 2 products + 1 category + 1 supplier + 0 bulk pricing
    expect(result.emptyExport).toBe(false);
    expect(result.actualDataType).toBe('products');
    expect(result.metadata.emptyExport).toBe(false);
    expect(result.metadata.actualRecordCount).toBe(4);
  });

  it('should return accurate record counts for empty sales export', async () => {
    const result = await exportService.exportSales();

    expect(result.success).toBe(true);
    expect(result.recordCount).toBe(0);
    expect(result.emptyExport).toBe(true);
    expect(result.actualDataType).toBe('sales');
    expect(result.metadata.dataType).toBe('sales');
  });

  it('should return accurate record counts for sales export with data', async () => {
    // Mock sales data
    const mockSales = [
      {
        id: '1',
        total: 100,
        items: [
          { id: '1', quantity: 2 },
          { id: '2', quantity: 1 },
        ],
      },
      { id: '2', total: 50, items: [{ id: '3', quantity: 1 }] },
    ];

    mockDb.getSalesByDateRange.mockResolvedValue(mockSales);
    mockDb.getSaleItems.mockImplementation((saleId) => {
      const sale = mockSales.find((s) => s.id === saleId);
      return Promise.resolve(sale?.items || []);
    });

    const result = await exportService.exportSales();

    expect(result.success).toBe(true);
    expect(result.recordCount).toBe(5); // 2 sales + 3 sale items
    expect(result.emptyExport).toBe(false);
    expect(result.actualDataType).toBe('sales');
  });

  it('should return accurate record counts for empty customers export', async () => {
    const result = await exportService.exportCustomers();

    expect(result.success).toBe(true);
    expect(result.recordCount).toBe(0);
    expect(result.emptyExport).toBe(true);
    expect(result.actualDataType).toBe('customers');
  });

  it('should return accurate record counts for customers export with data', async () => {
    mockDb.getCustomers.mockResolvedValue([
      { id: '1', name: 'Customer 1' },
      { id: '2', name: 'Customer 2' },
    ]);

    const result = await exportService.exportCustomers();

    expect(result.success).toBe(true);
    expect(result.recordCount).toBe(2);
    expect(result.emptyExport).toBe(false);
    expect(result.actualDataType).toBe('customers');
  });

  it('should handle export errors properly', async () => {
    mockDb.getProducts.mockRejectedValue(new Error('Database error'));

    const result = await exportService.exportProducts();

    expect(result.success).toBe(false);
    expect(result.recordCount).toBe(0);
    expect(result.error).toBe('Database error');
    expect(result.actualDataType).toBe('products');
  });

  it('should ensure consistent export file structure with proper dataType field', async () => {
    const result = await exportService.exportProducts();

    expect(result.metadata.dataType).toBe('products');
    expect(result.metadata.version).toBe('2.0');
    expect(result.metadata.exportDate).toBeDefined();
    expect(result.metadata.recordCount).toBe(0);
    expect(result.metadata.emptyExport).toBe(true);
    expect(result.metadata.actualRecordCount).toBe(0);
  });

  it('should generate appropriate feedback messages for empty exports', async () => {
    const result = await exportService.exportProducts();
    const feedbackMessage = exportService.generateExportFeedbackMessage(result);

    expect(feedbackMessage).toContain('Products & Inventory export completed');
    expect(feedbackMessage).toContain('no data was found');
    expect(feedbackMessage).toContain('empty export file');
  });

  it('should generate appropriate feedback messages for successful exports', async () => {
    // Mock data with actual records
    mockDb.getProducts.mockResolvedValue([
      { id: '1', name: 'Product 1' },
      { id: '2', name: 'Product 2' },
    ]);
    mockDb.getCategories.mockResolvedValue([{ id: '1', name: 'Category 1' }]);
    mockDb.getSuppliers.mockResolvedValue([{ id: '1', name: 'Supplier 1' }]);

    const result = await exportService.exportProducts();
    const feedbackMessage = exportService.generateExportFeedbackMessage(result);

    expect(feedbackMessage).toContain(
      'Products & Inventory export completed successfully'
    );
    expect(feedbackMessage).toContain('4 records exported');
  });

  it('should generate appropriate feedback messages for failed exports', async () => {
    mockDb.getProducts.mockRejectedValue(
      new Error('Database connection failed')
    );

    const result = await exportService.exportProducts();
    const feedbackMessage = exportService.generateExportFeedbackMessage(result);

    expect(feedbackMessage).toContain('Export failed');
    expect(feedbackMessage).toContain('Database connection failed');
  });

  it('should validate that only relevant data sections are populated for each data type', async () => {
    // Mock all data types
    mockDb.getProducts.mockResolvedValue([{ id: '1', name: 'Product 1' }]);
    mockDb.getCategories.mockResolvedValue([{ id: '1', name: 'Category 1' }]);
    mockDb.getSuppliers.mockResolvedValue([{ id: '1', name: 'Supplier 1' }]);
    mockDb.getSalesByDateRange.mockResolvedValue([{ id: '1', total: 100 }]);
    mockDb.getSaleItems.mockResolvedValue([]);
    mockDb.getCustomers.mockResolvedValue([{ id: '1', name: 'Customer 1' }]);

    // Test products export only includes product-related data
    const productsResult = await exportService.exportProducts();
    expect(productsResult.actualDataType).toBe('products');
    expect(productsResult.recordCount).toBe(3); // products + categories + suppliers

    // Test sales export only includes sales-related data
    const salesResult = await exportService.exportSales();
    expect(salesResult.actualDataType).toBe('sales');
    expect(salesResult.recordCount).toBe(1); // only sales, no sale items

    // Test customers export only includes customer data
    const customersResult = await exportService.exportCustomers();
    expect(customersResult.actualDataType).toBe('customers');
    expect(customersResult.recordCount).toBe(1); // only customers
  });
});
