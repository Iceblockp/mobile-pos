import { DataExportService } from '../../services/dataExportService';
import { DatabaseService } from '../../services/database';

// Mock dependencies
jest.mock('../../services/database');
jest.mock('expo-file-system');
jest.mock('expo-sharing');

const mockDatabase = {
  getAllProducts: jest.fn(),
  getAllSales: jest.fn(),
  getAllCustomers: jest.fn(),
  getAllStockMovements: jest.fn(),
} as unknown as DatabaseService;

describe('DataExportService', () => {
  let exportService: DataExportService;

  beforeEach(() => {
    exportService = new DataExportService(mockDatabase);
    jest.clearAllMocks();
  });

  describe('exportProducts', () => {
    it('should export products successfully', async () => {
      const mockProducts = [
        { id: 1, name: 'Product 1', price: 100 },
        { id: 2, name: 'Product 2', price: 200 },
      ];

      (mockDatabase.getAllProducts as jest.Mock).mockResolvedValue(
        mockProducts
      );

      const result = await exportService.exportProducts();

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(2);
      expect(result.metadata.dataType).toBe('products');
      expect(mockDatabase.getAllProducts).toHaveBeenCalled();
    });

    it('should handle export errors gracefully', async () => {
      const error = new Error('Database connection failed');
      (mockDatabase.getAllProducts as jest.Mock).mockRejectedValue(error);

      const result = await exportService.exportProducts();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
      expect(result.recordCount).toBe(0);
    });

    it('should handle empty product list', async () => {
      (mockDatabase.getAllProducts as jest.Mock).mockResolvedValue([]);

      const result = await exportService.exportProducts();

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(0);
      expect(result.metadata.dataType).toBe('products');
    });
  });

  describe('exportSales', () => {
    it('should export sales successfully', async () => {
      const mockSales = [
        { id: 1, productId: 1, quantity: 5, total: 500 },
        { id: 2, productId: 2, quantity: 3, total: 600 },
      ];

      (mockDatabase.getAllSales as jest.Mock).mockResolvedValue(mockSales);

      const result = await exportService.exportSales();

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(2);
      expect(result.metadata.dataType).toBe('sales');
      expect(mockDatabase.getAllSales).toHaveBeenCalled();
    });

    it('should handle large sales dataset', async () => {
      const largeSalesData = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        productId: (i % 10) + 1,
        quantity: Math.floor(Math.random() * 10) + 1,
        total: Math.floor(Math.random() * 1000) + 100,
      }));

      (mockDatabase.getAllSales as jest.Mock).mockResolvedValue(largeSalesData);

      const result = await exportService.exportSales();

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(1000);
    });
  });

  describe('exportCustomers', () => {
    it('should export customers successfully', async () => {
      const mockCustomers = [
        { id: 1, name: 'Customer 1', phone: '123456789' },
        { id: 2, name: 'Customer 2', phone: '987654321' },
      ];

      (mockDatabase.getAllCustomers as jest.Mock).mockResolvedValue(
        mockCustomers
      );

      const result = await exportService.exportCustomers();

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(2);
      expect(result.metadata.dataType).toBe('customers');
      expect(mockDatabase.getAllCustomers).toHaveBeenCalled();
    });
  });

  describe('exportStockMovements', () => {
    it('should export stock movements successfully', async () => {
      const mockMovements = [
        { id: 1, productId: 1, type: 'in', quantity: 10 },
        { id: 2, productId: 2, type: 'out', quantity: 5 },
      ];

      (mockDatabase.getAllStockMovements as jest.Mock).mockResolvedValue(
        mockMovements
      );

      const result = await exportService.exportStockMovements();

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(2);
      expect(result.metadata.dataType).toBe('stock_movements');
      expect(mockDatabase.getAllStockMovements).toHaveBeenCalled();
    });
  });

  describe('progress tracking', () => {
    it('should call progress callback during export', async () => {
      const mockProducts = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Product ${i + 1}`,
        price: (i + 1) * 10,
      }));

      (mockDatabase.getAllProducts as jest.Mock).mockResolvedValue(
        mockProducts
      );

      const progressCallback = jest.fn();
      exportService.onProgress(progressCallback);

      await exportService.exportProducts();

      expect(progressCallback).toHaveBeenCalled();
      const lastCall =
        progressCallback.mock.calls[progressCallback.mock.calls.length - 1][0];
      expect(lastCall.percentage).toBe(100);
    });
  });

  describe('metadata generation', () => {
    it('should generate correct metadata', async () => {
      const mockProducts = [{ id: 1, name: 'Product 1', price: 100 }];
      (mockDatabase.getAllProducts as jest.Mock).mockResolvedValue(
        mockProducts
      );

      const result = await exportService.exportProducts();

      expect(result.metadata).toMatchObject({
        exportDate: expect.any(String),
        dataType: 'products',
        version: '2.0',
        recordCount: 1,
        fileSize: expect.any(Number),
      });
    });
  });
});
