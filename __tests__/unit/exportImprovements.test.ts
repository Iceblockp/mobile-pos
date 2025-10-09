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

describe('DataExportService - Simplified All Data Export Feedback', () => {
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
      getExpensesByDateRange: vi.fn().mockResolvedValue([]),
      getExpenseCategories: vi.fn().mockResolvedValue([]),
      getStockMovements: vi.fn().mockResolvedValue([]),
      getShopSettings: vi.fn().mockResolvedValue({}),
    };

    exportService = new DataExportService(mockDb);
  });

  it('should return accurate record counts for empty all data export', async () => {
    const result = await exportService.exportAllData();

    expect(result.success).toBe(true);
    expect(result.recordCount).toBe(0);
    expect(result.emptyExport).toBe(true);
    expect(result.metadata.emptyExport).toBe(true);
    expect(result.metadata.actualRecordCount).toBe(0);
    expect(result.metadata.dataType).toBe('all');
    expect(result.dataCounts).toBeDefined();
    expect(result.dataCounts.products).toBe(0);
    expect(result.dataCounts.sales).toBe(0);
    expect(result.dataCounts.customers).toBe(0);
  });

  it('should return accurate record counts for all data export with data', async () => {
    // Mock data with actual records across all types
    mockDb.getProducts.mockResolvedValue([
      { id: '1', name: 'Product 1' },
      { id: '2', name: 'Product 2' },
    ]);
    mockDb.getCategories.mockResolvedValue([{ id: '1', name: 'Category 1' }]);
    mockDb.getSuppliers.mockResolvedValue([{ id: '1', name: 'Supplier 1' }]);
    mockDb.getSalesByDateRange.mockResolvedValue([{ id: '1', total: 100 }]);
    mockDb.getSaleItems.mockResolvedValue([
      { id: '1', product_id: '1', quantity: 2 },
    ]);
    mockDb.getCustomers.mockResolvedValue([{ id: '1', name: 'Customer 1' }]);
    mockDb.getExpensesByDateRange.mockResolvedValue([
      { id: '1', amount: 50, description: 'Office supplies' },
    ]);
    mockDb.getStockMovements.mockResolvedValue([
      { id: '1', product_id: '1', movement_type: 'in', quantity: 10 },
    ]);
    mockDb.getShopSettings.mockResolvedValue({
      shopName: 'Test Shop',
      currency: 'USD',
    });

    const result = await exportService.exportAllData();

    expect(result.success).toBe(true);
    expect(result.recordCount).toBeGreaterThan(0);
    expect(result.emptyExport).toBe(false);
    expect(result.metadata.emptyExport).toBe(false);
    expect(result.metadata.dataType).toBe('all');
    expect(result.dataCounts.products).toBe(2);
    expect(result.dataCounts.sales).toBe(1);
    expect(result.dataCounts.customers).toBe(1);
    expect(result.dataCounts.expenses).toBe(1);
    expect(result.dataCounts.stockMovements).toBe(1);
    expect(result.dataCounts.shopSettings).toBe(1);
  });

  it('should generate accurate export preview with data counts', async () => {
    // Mock data for preview
    mockDb.getProducts.mockResolvedValue([
      { id: '1', name: 'Product 1' },
      { id: '2', name: 'Product 2' },
    ]);
    mockDb.getSalesByDateRange.mockResolvedValue([{ id: '1', total: 100 }]);
    mockDb.getCustomers.mockResolvedValue([
      { id: '1', name: 'Customer 1' },
      { id: '2', name: 'Customer 2' },
      { id: '3', name: 'Customer 3' },
    ]);
    mockDb.getExpensesByDateRange.mockResolvedValue([]);
    mockDb.getStockMovements.mockResolvedValue([
      { id: '1', product_id: '1', movement_type: 'in', quantity: 10 },
    ]);
    mockDb.getShopSettings.mockResolvedValue({
      shopName: 'Test Shop',
    });

    const preview = await exportService.generateExportPreview();

    expect(preview.dataCounts.products).toBe(2);
    expect(preview.dataCounts.sales).toBe(1);
    expect(preview.dataCounts.customers).toBe(3);
    expect(preview.dataCounts.expenses).toBe(0);
    expect(preview.dataCounts.stockMovements).toBe(1);
    expect(preview.dataCounts.shopSettings).toBe(1);
    expect(preview.totalRecords).toBe(8);
    expect(preview.estimatedFileSize).toBeDefined();
    expect(preview.exportDate).toBeDefined();
  });

  it('should handle empty data in export preview', async () => {
    const preview = await exportService.generateExportPreview();

    expect(preview.totalRecords).toBe(0);
    expect(preview.dataCounts.products).toBe(0);
    expect(preview.dataCounts.sales).toBe(0);
    expect(preview.dataCounts.customers).toBe(0);
    expect(preview.dataCounts.expenses).toBe(0);
    expect(preview.dataCounts.stockMovements).toBe(0);
    expect(preview.dataCounts.bulkPricing).toBe(0);
    expect(preview.dataCounts.shopSettings).toBe(0);
  });

  it('should handle export errors properly', async () => {
    mockDb.getProducts.mockRejectedValue(new Error('Database error'));

    const result = await exportService.exportAllData();

    expect(result.success).toBe(false);
    expect(result.recordCount).toBe(0);
    expect(result.error).toBe('Database error');
  });

  it('should ensure consistent export file structure for all data export', async () => {
    const result = await exportService.exportAllData();

    expect(result.metadata.dataType).toBe('all');
    expect(result.metadata.version).toBe('2.0');
    expect(result.metadata.exportDate).toBeDefined();
    expect(result.metadata.recordCount).toBe(0);
    expect(result.metadata.emptyExport).toBe(true);
    expect(result.metadata.actualRecordCount).toBe(0);
    expect(result.dataCounts).toBeDefined();
  });

  it('should generate appropriate feedback messages for empty all data exports', async () => {
    const result = await exportService.exportAllData();
    const feedbackMessage = exportService.generateExportFeedbackMessage(result);

    expect(feedbackMessage).toContain('All Data export completed');
    expect(feedbackMessage).toContain('no data was found');
    expect(feedbackMessage).toContain('empty export file');
  });

  it('should generate appropriate feedback messages for successful all data exports', async () => {
    // Mock data with actual records
    mockDb.getProducts.mockResolvedValue([
      { id: '1', name: 'Product 1' },
      { id: '2', name: 'Product 2' },
    ]);
    mockDb.getSalesByDateRange.mockResolvedValue([{ id: '1', total: 100 }]);
    mockDb.getCustomers.mockResolvedValue([{ id: '1', name: 'Customer 1' }]);
    mockDb.getShopSettings.mockResolvedValue({
      shopName: 'Test Shop',
    });

    const result = await exportService.exportAllData();
    const feedbackMessage = exportService.generateExportFeedbackMessage(result);

    expect(feedbackMessage).toContain('All Data export completed successfully');
    expect(feedbackMessage).toContain('records exported');
    expect(feedbackMessage).toMatch(/\d+ records exported/);
  });

  it('should generate appropriate feedback messages for failed all data exports', async () => {
    mockDb.getProducts.mockRejectedValue(
      new Error('Database connection failed')
    );

    const result = await exportService.exportAllData();
    const feedbackMessage = exportService.generateExportFeedbackMessage(result);

    expect(feedbackMessage).toContain('Export failed');
    expect(feedbackMessage).toContain('Database connection failed');
  });

  it('should include all data types in all data export', async () => {
    // Mock all data types
    mockDb.getProducts.mockResolvedValue([{ id: '1', name: 'Product 1' }]);
    mockDb.getCategories.mockResolvedValue([{ id: '1', name: 'Category 1' }]);
    mockDb.getSuppliers.mockResolvedValue([{ id: '1', name: 'Supplier 1' }]);
    mockDb.getSalesByDateRange.mockResolvedValue([{ id: '1', total: 100 }]);
    mockDb.getSaleItems.mockResolvedValue([
      { id: '1', product_id: '1', quantity: 2 },
    ]);
    mockDb.getCustomers.mockResolvedValue([{ id: '1', name: 'Customer 1' }]);
    mockDb.getExpensesByDateRange.mockResolvedValue([{ id: '1', amount: 50 }]);
    mockDb.getStockMovements.mockResolvedValue([
      { id: '1', product_id: '1', movement_type: 'in' },
    ]);
    mockDb.getShopSettings.mockResolvedValue({ shopName: 'Test Shop' });

    const result = await exportService.exportAllData();

    expect(result.metadata.dataType).toBe('all');
    expect(result.dataCounts.products).toBe(1);
    expect(result.dataCounts.sales).toBe(1);
    expect(result.dataCounts.customers).toBe(1);
    expect(result.dataCounts.expenses).toBe(1);
    expect(result.dataCounts.stockMovements).toBe(1);
    expect(result.dataCounts.shopSettings).toBe(1);
    expect(result.recordCount).toBeGreaterThan(5); // All data types included
  });

  it('should provide detailed data counts in export result', async () => {
    mockDb.getProducts.mockResolvedValue([
      { id: '1', name: 'Product 1' },
      { id: '2', name: 'Product 2' },
      { id: '3', name: 'Product 3' },
    ]);
    mockDb.getSalesByDateRange.mockResolvedValue([
      { id: '1', total: 100 },
      { id: '2', total: 200 },
    ]);
    mockDb.getCustomers.mockResolvedValue([{ id: '1', name: 'Customer 1' }]);

    const result = await exportService.exportAllData();

    expect(result.dataCounts).toEqual({
      products: 3,
      sales: 2,
      customers: 1,
      expenses: 0,
      stockMovements: 0,
      bulkPricing: 0,
      shopSettings: 0,
    });
  });
});
