import { DataExportService } from '../../services/dataExportService';
import { DatabaseService } from '../../services/database';

// Mock dependencies
jest.mock('../../services/database');
jest.mock('expo-file-system');
jest.mock('expo-sharing');

const mockDatabase = {
  getProducts: jest.fn(),
  getCategories: jest.fn(),
  getSuppliers: jest.fn(),
  getSalesByDateRange: jest.fn(),
  getSaleItems: jest.fn(),
  getExpensesByDateRange: jest.fn(),
  getExpenseCategories: jest.fn(),
  getCustomers: jest.fn(),
  getStockMovements: jest.fn(),
  getBulkPricingForProduct: jest.fn(),
} as unknown as DatabaseService;

describe('DataExportService', () => {
  let exportService: DataExportService;

  beforeEach(() => {
    exportService = new DataExportService(mockDatabase);
    jest.clearAllMocks();
  });

  describe('exportAllData', () => {
    it('should export all data successfully', async () => {
      // Mock all database methods
      (mockDatabase.getProducts as jest.Mock).mockResolvedValue([
        { id: '1', name: 'Product 1', price: 10.99, cost: 5.5 },
        { id: '2', name: 'Product 2', price: 20.99, cost: 10.5 },
      ]);
      (mockDatabase.getCategories as jest.Mock).mockResolvedValue([
        { id: '1', name: 'Category 1' },
      ]);
      (mockDatabase.getSuppliers as jest.Mock).mockResolvedValue([
        { id: '1', name: 'Supplier 1' },
      ]);
      (mockDatabase.getSalesByDateRange as jest.Mock).mockResolvedValue([
        { id: '1', total: 100, payment_method: 'cash' },
      ]);
      (mockDatabase.getSaleItems as jest.Mock).mockResolvedValue([
        { id: '1', product_id: '1', quantity: 2, price: 10.99 },
      ]);
      (mockDatabase.getExpensesByDateRange as jest.Mock).mockResolvedValue([
        { id: '1', amount: 50, description: 'Office supplies' },
      ]);
      (mockDatabase.getExpenseCategories as jest.Mock).mockResolvedValue([
        { id: '1', name: 'Office' },
      ]);
      (mockDatabase.getCustomers as jest.Mock).mockResolvedValue([
        { id: '1', name: 'Customer 1' },
      ]);
      (mockDatabase.getStockMovements as jest.Mock).mockResolvedValue([
        { id: '1', product_id: '1', movement_type: 'in', quantity: 10 },
      ]);
      (mockDatabase.getBulkPricingForProduct as jest.Mock).mockResolvedValue(
        []
      );

      const result = await exportService.exportAllData();

      expect(result.success).toBe(true);
      expect(result.recordCount).toBeGreaterThan(0);
      expect(result.metadata.dataType).toBe('all');
      expect(mockDatabase.getProducts).toHaveBeenCalled();
      expect(mockDatabase.getCategories).toHaveBeenCalled();
      expect(mockDatabase.getSuppliers).toHaveBeenCalled();
    });

    it('should handle export errors gracefully', async () => {
      const error = new Error('Database connection failed');
      (mockDatabase.getProducts as jest.Mock).mockRejectedValue(error);

      const result = await exportService.exportAllData();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
      expect(result.recordCount).toBe(0);
    });

    it('should handle empty data gracefully', async () => {
      // Mock all methods to return empty arrays
      (mockDatabase.getProducts as jest.Mock).mockResolvedValue([]);
      (mockDatabase.getCategories as jest.Mock).mockResolvedValue([]);
      (mockDatabase.getSuppliers as jest.Mock).mockResolvedValue([]);
      (mockDatabase.getSalesByDateRange as jest.Mock).mockResolvedValue([]);
      (mockDatabase.getSaleItems as jest.Mock).mockResolvedValue([]);
      (mockDatabase.getExpensesByDateRange as jest.Mock).mockResolvedValue([]);
      (mockDatabase.getExpenseCategories as jest.Mock).mockResolvedValue([]);
      (mockDatabase.getCustomers as jest.Mock).mockResolvedValue([]);
      (mockDatabase.getStockMovements as jest.Mock).mockResolvedValue([]);
      (mockDatabase.getBulkPricingForProduct as jest.Mock).mockResolvedValue(
        []
      );

      const result = await exportService.exportAllData();

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(0);
      expect(result.emptyExport).toBe(true);
      expect(result.metadata.dataType).toBe('all');
    });
  });

  describe('progress tracking', () => {
    it('should call progress callback during export', async () => {
      // Mock database methods
      (mockDatabase.getProducts as jest.Mock).mockResolvedValue([
        { id: '1', name: 'Product 1', price: 10.99, cost: 5.5 },
      ]);
      (mockDatabase.getCategories as jest.Mock).mockResolvedValue([]);
      (mockDatabase.getSuppliers as jest.Mock).mockResolvedValue([]);
      (mockDatabase.getSalesByDateRange as jest.Mock).mockResolvedValue([]);
      (mockDatabase.getSaleItems as jest.Mock).mockResolvedValue([]);
      (mockDatabase.getExpensesByDateRange as jest.Mock).mockResolvedValue([]);
      (mockDatabase.getExpenseCategories as jest.Mock).mockResolvedValue([]);
      (mockDatabase.getCustomers as jest.Mock).mockResolvedValue([]);
      (mockDatabase.getStockMovements as jest.Mock).mockResolvedValue([]);
      (mockDatabase.getBulkPricingForProduct as jest.Mock).mockResolvedValue(
        []
      );

      const progressCallback = jest.fn();
      exportService.onProgress(progressCallback);

      await exportService.exportAllData();

      expect(progressCallback).toHaveBeenCalled();
      // Check that the final progress call shows completion
      const lastCall =
        progressCallback.mock.calls[progressCallback.mock.calls.length - 1][0];
      expect(lastCall.percentage).toBe(100);
    });
  });

  describe('metadata generation', () => {
    it('should generate correct metadata', async () => {
      (mockDatabase.getProducts as jest.Mock).mockResolvedValue([
        { id: '1', name: 'Product 1', price: 10.99, cost: 5.5 },
      ]);
      (mockDatabase.getCategories as jest.Mock).mockResolvedValue([]);
      (mockDatabase.getSuppliers as jest.Mock).mockResolvedValue([]);
      (mockDatabase.getSalesByDateRange as jest.Mock).mockResolvedValue([]);
      (mockDatabase.getSaleItems as jest.Mock).mockResolvedValue([]);
      (mockDatabase.getExpensesByDateRange as jest.Mock).mockResolvedValue([]);
      (mockDatabase.getExpenseCategories as jest.Mock).mockResolvedValue([]);
      (mockDatabase.getCustomers as jest.Mock).mockResolvedValue([]);
      (mockDatabase.getStockMovements as jest.Mock).mockResolvedValue([]);
      (mockDatabase.getBulkPricingForProduct as jest.Mock).mockResolvedValue(
        []
      );

      const result = await exportService.exportAllData();

      expect(result.metadata).toMatchObject({
        exportDate: expect.any(String),
        dataType: 'all',
        version: '2.0',
        recordCount: expect.any(Number),
        fileSize: expect.any(Number),
      });
    });
  });
});
