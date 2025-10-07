import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { DataExportService } from '../../services/dataExportService';
import { DatabaseService } from '../../services/database';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('../../services/database');
vi.mock('expo-file-system', () => ({
  documentDirectory: 'file://mock-directory/',
  writeAsStringAsync: vi.fn().mockResolvedValue(undefined),
  getInfoAsync: vi.fn().mockResolvedValue({ size: 1024 }),
}));
vi.mock('expo-sharing', () => ({
  shareAsync: vi.fn().mockResolvedValue(undefined),
}));

// Mock crypto for checksum generation
vi.mock('expo-crypto', () => ({
  digestStringAsync: vi.fn().mockResolvedValue('mock-checksum'),
}));

describe('DataExportService - Selective Export Functionality', () => {
  let exportService: DataExportService;
  let mockDatabase: any;

  // Mock data for testing
  const mockProducts = [
    { id: 'uuid-1', name: 'Product 1', price: 100, cost: 50, quantity: 10 },
    { id: 'uuid-2', name: 'Product 2', price: 200, cost: 100, quantity: 5 },
  ];

  const mockCategories = [
    { id: 'uuid-1', name: 'Category 1' },
    { id: 'uuid-2', name: 'Category 2' },
  ];

  const mockSuppliers = [
    { id: 'uuid-1', name: 'Supplier 1', contact: 'supplier1@test.com' },
    { id: 'uuid-2', name: 'Supplier 2', contact: 'supplier2@test.com' },
  ];

  const mockSales = [
    { id: 'uuid-1', total: 500, payment_method: 'cash', date: '2024-01-01' },
    { id: 'uuid-2', total: 300, payment_method: 'card', date: '2024-01-02' },
  ];

  const mockSaleItems = [
    {
      id: 'uuid-1',
      sale_id: 'uuid-1',
      product_id: 'uuid-1',
      quantity: 2,
      price: 100,
    },
    {
      id: 'uuid-2',
      sale_id: 'uuid-2',
      product_id: 'uuid-2',
      quantity: 1,
      price: 200,
    },
  ];

  const mockCustomers = [
    { id: 'uuid-1', name: 'Customer 1', phone: '123456789' },
    { id: 'uuid-2', name: 'Customer 2', phone: '987654321' },
  ];

  const mockExpenses = [
    {
      id: 'uuid-1',
      amount: 100,
      description: 'Office supplies',
      date: '2024-01-01',
    },
    { id: 'uuid-2', amount: 200, description: 'Utilities', date: '2024-01-02' },
  ];

  const mockExpenseCategories = [
    { id: 'uuid-1', name: 'Office' },
    { id: 'uuid-2', name: 'Utilities' },
  ];

  const mockStockMovements = [
    {
      id: 'uuid-1',
      product_id: 'uuid-1',
      movement_type: 'in',
      quantity: 10,
      date: '2024-01-01',
    },
    {
      id: 'uuid-2',
      product_id: 'uuid-2',
      movement_type: 'out',
      quantity: 3,
      date: '2024-01-02',
    },
  ];

  beforeEach(() => {
    // Create mock database with all required methods
    mockDatabase = {
      getProducts: vi.fn(),
      getCategories: vi.fn(),
      getSuppliers: vi.fn(),
      getSalesByDateRange: vi.fn(),
      getSaleItems: vi.fn(),
      getCustomers: vi.fn(),
      getCustomerPurchaseHistory: vi.fn(),
      getCustomerStatistics: vi.fn(),
      getExpensesByDateRange: vi.fn(),
      getExpenseCategories: vi.fn(),
      getStockMovements: vi.fn(),
      getBulkPricingForProduct: vi.fn(),
    } as any;

    exportService = new DataExportService(mockDatabase);
    vi.clearAllMocks();
  });

  describe('Products Export - Selective Data Filtering', () => {
    beforeEach(() => {
      mockDatabase.getProducts.mockResolvedValue(mockProducts);
      mockDatabase.getCategories.mockResolvedValue(mockCategories);
      mockDatabase.getSuppliers.mockResolvedValue(mockSuppliers);
      mockDatabase.getBulkPricingForProduct.mockResolvedValue([]);
    });

    it('should export only products-related data (Requirement 1.2)', async () => {
      const result = await exportService.exportProducts();

      expect(result.success).toBe(true);
      expect(result.actualDataType).toBe('products');
      expect(mockDatabase.getProducts).toHaveBeenCalled();
      expect(mockDatabase.getCategories).toHaveBeenCalled();
      expect(mockDatabase.getSuppliers).toHaveBeenCalled();

      // Should NOT call sales, customers, or expenses methods
      expect(mockDatabase.getSalesByDateRange).not.toHaveBeenCalled();
      expect(mockDatabase.getCustomers).not.toHaveBeenCalled();
      expect(mockDatabase.getExpensesByDateRange).not.toHaveBeenCalled();
    });

    it('should calculate correct record count for products export', async () => {
      const result = await exportService.exportProducts();

      // Products (2) + Categories (2) + Suppliers (2) + BulkPricing (0) = 6
      expect(result.recordCount).toBe(6);
      expect(result.metadata.actualRecordCount).toBe(6);
    });

    it('should maintain consistent file structure for products export (Requirement 4.1)', async () => {
      const result = await exportService.exportProducts();

      expect(result.success).toBe(true);
      expect(result.metadata.dataType).toBe('products');
      expect(result.metadata.version).toBe('2.0');
      expect(result.metadata.exportDate).toBeDefined();
      expect(result.filename).toMatch(
        /products_export_\d{4}-\d{2}-\d{2}\.json/
      );
    });

    it('should handle empty products data (Requirement 3.4)', async () => {
      mockDatabase.getProducts.mockResolvedValue([]);
      mockDatabase.getCategories.mockResolvedValue([]);
      mockDatabase.getSuppliers.mockResolvedValue([]);

      const result = await exportService.exportProducts();

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(0);
      expect(result.emptyExport).toBe(true);
      expect(result.metadata.emptyExport).toBe(true);
    });
  });

  describe('Sales Export - Selective Data Filtering', () => {
    beforeEach(() => {
      mockDatabase.getSalesByDateRange.mockResolvedValue(mockSales);
      mockDatabase.getSaleItems.mockImplementation((saleId) => {
        return Promise.resolve(
          mockSaleItems.filter((item) => item.sale_id === saleId)
        );
      });
    });

    it('should export only sales-related data (Requirement 1.1)', async () => {
      const result = await exportService.exportSales();

      expect(result.success).toBe(true);
      expect(result.actualDataType).toBe('sales');
      expect(mockDatabase.getSalesByDateRange).toHaveBeenCalled();
      expect(mockDatabase.getSaleItems).toHaveBeenCalled();

      // Should NOT call products, customers, or expenses methods
      expect(mockDatabase.getProducts).not.toHaveBeenCalled();
      expect(mockDatabase.getCustomers).not.toHaveBeenCalled();
      expect(mockDatabase.getExpensesByDateRange).not.toHaveBeenCalled();
    });

    it('should calculate correct record count for sales export', async () => {
      const result = await exportService.exportSales();

      // Sales (2) + SaleItems (2) = 4
      expect(result.recordCount).toBe(4);
      expect(result.metadata.actualRecordCount).toBe(4);
    });

    it('should maintain consistent file structure for sales export (Requirement 4.2)', async () => {
      const result = await exportService.exportSales();

      expect(result.success).toBe(true);
      expect(result.metadata.dataType).toBe('sales');
      expect(result.metadata.version).toBe('2.0');
      expect(result.filename).toMatch(/sales_export_\d{4}-\d{2}-\d{2}\.json/);
    });

    it('should handle empty sales data (Requirement 3.4)', async () => {
      mockDatabase.getSalesByDateRange.mockResolvedValue([]);

      const result = await exportService.exportSales();

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(0);
      expect(result.emptyExport).toBe(true);
    });
  });

  describe('Customers Export - Selective Data Filtering', () => {
    beforeEach(() => {
      mockDatabase.getCustomers.mockResolvedValue(mockCustomers);
      mockDatabase.getCustomerPurchaseHistory.mockResolvedValue([]);
      mockDatabase.getCustomerStatistics.mockResolvedValue({
        totalSpent: 0,
        visitCount: 0,
        averageOrderValue: 0,
        lastVisit: null,
      });
    });

    it('should export only customer-related data (Requirement 1.3)', async () => {
      const result = await exportService.exportCustomers();

      expect(result.success).toBe(true);
      expect(result.actualDataType).toBe('customers');
      expect(mockDatabase.getCustomers).toHaveBeenCalled();

      // Should NOT call products, sales, or expenses methods
      expect(mockDatabase.getProducts).not.toHaveBeenCalled();
      expect(mockDatabase.getSalesByDateRange).not.toHaveBeenCalled();
      expect(mockDatabase.getExpensesByDateRange).not.toHaveBeenCalled();
    });

    it('should calculate correct record count for customers export', async () => {
      const result = await exportService.exportCustomers();

      expect(result.recordCount).toBe(2);
      expect(result.metadata.actualRecordCount).toBe(2);
    });

    it('should maintain consistent file structure for customers export (Requirement 4.3)', async () => {
      const result = await exportService.exportCustomers();

      expect(result.success).toBe(true);
      expect(result.metadata.dataType).toBe('customers');
      expect(result.metadata.version).toBe('2.0');
      expect(result.filename).toMatch(
        /customers_export_\d{4}-\d{2}-\d{2}\.json/
      );
    });

    it('should handle empty customers data', async () => {
      mockDatabase.getCustomers.mockResolvedValue([]);

      const result = await exportService.exportCustomers();

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(0);
      expect(result.emptyExport).toBe(true);
    });
  });

  describe('Stock Movements Export - Selective Data Filtering', () => {
    beforeEach(() => {
      mockDatabase.getStockMovements.mockResolvedValue(mockStockMovements);
    });

    it('should export only stock movements data (Requirement 1.5)', async () => {
      const result = await exportService.exportStockMovements();

      expect(result.success).toBe(true);
      expect(result.actualDataType).toBe('stock_movements');
      expect(mockDatabase.getStockMovements).toHaveBeenCalled();

      // Should NOT call other data methods
      expect(mockDatabase.getProducts).not.toHaveBeenCalled();
      expect(mockDatabase.getSalesByDateRange).not.toHaveBeenCalled();
      expect(mockDatabase.getCustomers).not.toHaveBeenCalled();
      expect(mockDatabase.getExpensesByDateRange).not.toHaveBeenCalled();
    });

    it('should calculate correct record count for stock movements export', async () => {
      const result = await exportService.exportStockMovements();

      expect(result.recordCount).toBe(2);
    });

    it('should handle empty stock movements data', async () => {
      mockDatabase.getStockMovements.mockResolvedValue([]);

      const result = await exportService.exportStockMovements();

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(0);
      expect(result.emptyExport).toBe(true);
    });
  });

  describe('Bulk Pricing Export - Selective Data Filtering', () => {
    beforeEach(() => {
      mockDatabase.getProducts.mockResolvedValue(mockProducts);
      mockDatabase.getBulkPricingForProduct.mockResolvedValue([]);
    });

    it('should export only bulk pricing data (Requirement 1.6)', async () => {
      const result = await exportService.exportBulkPricing();

      expect(result.success).toBe(true);
      expect(result.actualDataType).toBe('bulk_pricing');
      expect(mockDatabase.getProducts).toHaveBeenCalled();
      expect(mockDatabase.getBulkPricingForProduct).toHaveBeenCalled();

      // Should NOT call sales, customers, or expenses methods
      expect(mockDatabase.getSalesByDateRange).not.toHaveBeenCalled();
      expect(mockDatabase.getCustomers).not.toHaveBeenCalled();
      expect(mockDatabase.getExpensesByDateRange).not.toHaveBeenCalled();
    });

    it('should handle empty bulk pricing data', async () => {
      mockDatabase.getBulkPricingForProduct.mockResolvedValue([]);

      const result = await exportService.exportBulkPricing();

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(0);
      expect(result.emptyExport).toBe(true);
    });
  });

  describe('Export File Structure Consistency', () => {
    it('should maintain consistent metadata structure across all export types (Requirement 4.1)', async () => {
      mockDatabase.getProducts.mockResolvedValue(mockProducts);
      mockDatabase.getCategories.mockResolvedValue(mockCategories);
      mockDatabase.getSuppliers.mockResolvedValue(mockSuppliers);
      mockDatabase.getBulkPricingForProduct.mockResolvedValue([]);

      const result = await exportService.exportProducts();

      expect(result.metadata).toMatchObject({
        exportDate: expect.any(String),
        dataType: 'products',
        version: '2.0',
        recordCount: expect.any(Number),
        fileSize: expect.any(Number),
        actualRecordCount: expect.any(Number),
      });
    });

    it('should set dataType field accurately for each export type (Requirement 4.2)', async () => {
      const testCases = [
        {
          method: 'exportProducts',
          expectedType: 'products',
          mockSetup: () => {
            mockDatabase.getProducts.mockResolvedValue(mockProducts);
            mockDatabase.getCategories.mockResolvedValue(mockCategories);
            mockDatabase.getSuppliers.mockResolvedValue(mockSuppliers);
            mockDatabase.getBulkPricingForProduct.mockResolvedValue([]);
          },
        },
        {
          method: 'exportSales',
          expectedType: 'sales',
          mockSetup: () => {
            mockDatabase.getSalesByDateRange.mockResolvedValue(mockSales);
            mockDatabase.getSaleItems.mockResolvedValue(mockSaleItems);
          },
        },
        {
          method: 'exportCustomers',
          expectedType: 'customers',
          mockSetup: () => {
            mockDatabase.getCustomers.mockResolvedValue(mockCustomers);
            mockDatabase.getCustomerPurchaseHistory.mockResolvedValue([]);
            mockDatabase.getCustomerStatistics.mockResolvedValue({
              totalSpent: 0,
              visitCount: 0,
              averageOrderValue: 0,
              lastVisit: null,
            });
          },
        },
      ];

      for (const testCase of testCases) {
        testCase.mockSetup();
        const result = await (exportService as any)[testCase.method]();
        expect(result.actualDataType).toBe(testCase.expectedType);
        expect(result.metadata.dataType).toBe(testCase.expectedType);
        vi.clearAllMocks();
      }
    });

    it('should populate only relevant data sections based on export type (Requirement 4.3)', async () => {
      // This test would require access to the actual export data structure
      // Since we're testing the service interface, we verify through the record counts
      mockDatabase.getProducts.mockResolvedValue(mockProducts);
      mockDatabase.getCategories.mockResolvedValue([]);
      mockDatabase.getSuppliers.mockResolvedValue([]);
      mockDatabase.getBulkPricingForProduct.mockResolvedValue([]);

      const result = await exportService.exportProducts();

      // For products export, only products-related data should contribute to count
      expect(result.recordCount).toBe(2); // Only products, no categories/suppliers
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling for Export Operations', () => {
    it('should handle database errors gracefully', async () => {
      const error = new Error('Database connection failed');
      mockDatabase.getProducts.mockRejectedValue(error);

      const result = await exportService.exportProducts();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
      expect(result.recordCount).toBe(0);
    });

    it('should provide user-friendly feedback messages', async () => {
      mockDatabase.getProducts.mockResolvedValue(mockProducts);
      mockDatabase.getCategories.mockResolvedValue(mockCategories);
      mockDatabase.getSuppliers.mockResolvedValue(mockSuppliers);
      mockDatabase.getBulkPricingForProduct.mockResolvedValue([]);

      const result = await exportService.exportProducts();
      const feedbackMessage =
        exportService.generateExportFeedbackMessage(result);

      expect(feedbackMessage).toContain('Products & Inventory');
      expect(feedbackMessage).toContain('export completed successfully');
      expect(feedbackMessage).toContain('records exported');
    });

    it('should handle empty export feedback correctly', async () => {
      mockDatabase.getProducts.mockResolvedValue([]);
      mockDatabase.getCategories.mockResolvedValue([]);
      mockDatabase.getSuppliers.mockResolvedValue([]);
      mockDatabase.getBulkPricingForProduct.mockResolvedValue([]);

      const result = await exportService.exportProducts();
      const feedbackMessage =
        exportService.generateExportFeedbackMessage(result);

      expect(feedbackMessage).toContain('no data was found');
      expect(feedbackMessage).toContain('empty export file');
    });
  });

  describe('Progress Reporting for Selective Exports', () => {
    it('should report progress with data type context (Requirement 3.1)', async () => {
      mockDatabase.getProducts.mockResolvedValue(mockProducts);
      mockDatabase.getCategories.mockResolvedValue(mockCategories);
      mockDatabase.getSuppliers.mockResolvedValue(mockSuppliers);
      mockDatabase.getBulkPricingForProduct.mockResolvedValue([]);

      const progressCallback = vi.fn();
      exportService.onProgress(progressCallback);

      await exportService.exportProducts();

      expect(progressCallback).toHaveBeenCalled();

      // Check that progress messages include data type context
      const progressCalls = progressCallback.mock.calls;
      const hasDataTypeContext = progressCalls.some((call) =>
        call[0].stage.includes('products')
      );
      expect(hasDataTypeContext).toBe(true);
    });

    it('should report accurate progress percentages', async () => {
      mockDatabase.getProducts.mockResolvedValue(mockProducts);
      mockDatabase.getCategories.mockResolvedValue(mockCategories);
      mockDatabase.getSuppliers.mockResolvedValue(mockSuppliers);
      mockDatabase.getBulkPricingForProduct.mockResolvedValue([]);

      const progressCallback = vi.fn();
      exportService.onProgress(progressCallback);

      await exportService.exportProducts();

      const progressCalls = progressCallback.mock.calls;
      const finalProgress = progressCalls[progressCalls.length - 1][0];

      expect(finalProgress.percentage).toBeGreaterThanOrEqual(0);
      expect(finalProgress.percentage).toBeLessThanOrEqual(100);
    });
  });
});
