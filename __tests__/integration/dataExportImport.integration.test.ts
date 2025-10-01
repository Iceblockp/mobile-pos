import { DataExportService } from '../../services/dataExportService';
import { DataImportService } from '../../services/dataImportService';
import { DatabaseService } from '../../services/database';
import * as FileSystem from 'expo-file-system';

// Mock file system operations
jest.mock('expo-file-system');
jest.mock('expo-sharing');

const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;

describe('Data Export/Import Integration Tests', () => {
  let database: DatabaseService;
  let exportService: DataExportService;
  let importService: DataImportService;

  beforeEach(async () => {
    // Initialize in-memory database for testing
    database = new DatabaseService();
    await database.initDatabase();

    exportService = new DataExportService(database);
    importService = new DataImportService(database);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await database.closeDatabase();
  });

  describe('Products Export/Import Workflow', () => {
    it('should export and import products successfully', async () => {
      // Setup: Add test products to database
      const testProducts = [
        { name: 'Product 1', price: 100, stock: 10, category: 'Electronics' },
        { name: 'Product 2', price: 200, stock: 20, category: 'Clothing' },
        { name: 'Product 3', price: 300, stock: 30, category: 'Books' },
      ];

      for (const product of testProducts) {
        await database.addProduct(product);
      }

      // Step 1: Export products
      const exportResult = await exportService.exportProducts();

      expect(exportResult.success).toBe(true);
      expect(exportResult.recordCount).toBe(3);
      expect(exportResult.fileUri).toBeDefined();

      // Step 2: Clear database
      await database.clearAllProducts();
      const emptyProducts = await database.getAllProducts();
      expect(emptyProducts).toHaveLength(0);

      // Step 3: Mock file reading for import
      const exportedData = {
        metadata: {
          dataType: 'products',
          version: '2.0',
          recordCount: 3,
          exportDate: new Date().toISOString(),
        },
        data: testProducts,
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(exportedData)
      );

      // Step 4: Import products
      const importOptions = {
        batchSize: 10,
        conflictResolution: 'skip' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const importResult = await importService.importProducts(
        'mock-file-uri',
        importOptions
      );

      expect(importResult.success).toBe(true);
      expect(importResult.imported).toBe(3);
      expect(importResult.skipped).toBe(0);
      expect(importResult.errors).toHaveLength(0);

      // Step 5: Verify imported data
      const importedProducts = await database.getAllProducts();
      expect(importedProducts).toHaveLength(3);

      for (let i = 0; i < testProducts.length; i++) {
        expect(importedProducts[i].name).toBe(testProducts[i].name);
        expect(importedProducts[i].price).toBe(testProducts[i].price);
        expect(importedProducts[i].stock).toBe(testProducts[i].stock);
      }
    });

    it('should handle duplicate products during import', async () => {
      // Setup: Add initial products
      const initialProducts = [
        { name: 'Existing Product 1', price: 100, stock: 10 },
        { name: 'Existing Product 2', price: 200, stock: 20 },
      ];

      for (const product of initialProducts) {
        await database.addProduct(product);
      }

      // Import data with duplicates and new products
      const importData = {
        metadata: {
          dataType: 'products',
          version: '2.0',
          recordCount: 3,
        },
        data: [
          { name: 'Existing Product 1', price: 150, stock: 15 }, // Duplicate
          { name: 'New Product', price: 300, stock: 30 }, // New
          { name: 'Existing Product 2', price: 250, stock: 25 }, // Duplicate
        ],
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(importData)
      );

      // Test skip resolution
      const skipOptions = {
        batchSize: 10,
        conflictResolution: 'skip' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const skipResult = await importService.importProducts(
        'mock-file-uri',
        skipOptions
      );

      expect(skipResult.success).toBe(true);
      expect(skipResult.imported).toBe(1); // Only new product
      expect(skipResult.skipped).toBe(2); // Two duplicates

      // Test update resolution
      const updateOptions = {
        batchSize: 10,
        conflictResolution: 'update' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const updateResult = await importService.importProducts(
        'mock-file-uri',
        updateOptions
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.updated).toBe(2); // Two existing products updated
      expect(updateResult.imported).toBe(1); // One new product
    });
  });

  describe('Sales Export/Import Workflow', () => {
    it('should export and import sales with product references', async () => {
      // Setup: Add products and customers first
      const product1 = await database.addProduct({
        name: 'Product 1',
        price: 100,
        stock: 10,
      });
      const product2 = await database.addProduct({
        name: 'Product 2',
        price: 200,
        stock: 20,
      });
      const customer1 = await database.addCustomer({
        name: 'Customer 1',
        phone: '123456789',
      });
      const customer2 = await database.addCustomer({
        name: 'Customer 2',
        phone: '987654321',
      });

      // Add test sales
      const testSales = [
        {
          productId: product1.id,
          customerId: customer1.id,
          quantity: 2,
          total: 200,
        },
        {
          productId: product2.id,
          customerId: customer2.id,
          quantity: 1,
          total: 200,
        },
      ];

      for (const sale of testSales) {
        await database.addSale(sale);
      }

      // Export sales
      const exportResult = await exportService.exportSales();

      expect(exportResult.success).toBe(true);
      expect(exportResult.recordCount).toBe(2);

      // Clear sales
      await database.clearAllSales();

      // Mock import data
      const exportedData = {
        metadata: {
          dataType: 'sales',
          version: '2.0',
          recordCount: 2,
        },
        data: testSales,
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(exportedData)
      );

      // Import sales
      const importOptions = {
        batchSize: 10,
        conflictResolution: 'skip' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const importResult = await importService.importSales(
        'mock-file-uri',
        importOptions
      );

      expect(importResult.success).toBe(true);
      expect(importResult.imported).toBe(2);

      // Verify imported sales
      const importedSales = await database.getAllSales();
      expect(importedSales).toHaveLength(2);
    });
  });

  describe('Customers Export/Import Workflow', () => {
    it('should export and import customers successfully', async () => {
      // Setup: Add test customers
      const testCustomers = [
        { name: 'John Doe', phone: '123456789', email: 'john@example.com' },
        { name: 'Jane Smith', phone: '987654321', email: 'jane@example.com' },
      ];

      for (const customer of testCustomers) {
        await database.addCustomer(customer);
      }

      // Export customers
      const exportResult = await exportService.exportCustomers();

      expect(exportResult.success).toBe(true);
      expect(exportResult.recordCount).toBe(2);

      // Clear customers
      await database.clearAllCustomers();

      // Mock import data
      const exportedData = {
        metadata: {
          dataType: 'customers',
          version: '2.0',
          recordCount: 2,
        },
        data: testCustomers,
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(exportedData)
      );

      // Import customers
      const importOptions = {
        batchSize: 10,
        conflictResolution: 'skip' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const importResult = await importService.importCustomers(
        'mock-file-uri',
        importOptions
      );

      expect(importResult.success).toBe(true);
      expect(importResult.imported).toBe(2);

      // Verify imported customers
      const importedCustomers = await database.getAllCustomers();
      expect(importedCustomers).toHaveLength(2);
      expect(importedCustomers[0].name).toBe(testCustomers[0].name);
      expect(importedCustomers[1].name).toBe(testCustomers[1].name);
    });
  });

  describe('Stock Movements Export/Import Workflow', () => {
    it('should export and import stock movements successfully', async () => {
      // Setup: Add products first
      const product1 = await database.addProduct({
        name: 'Product 1',
        price: 100,
        stock: 10,
      });
      const product2 = await database.addProduct({
        name: 'Product 2',
        price: 200,
        stock: 20,
      });

      // Add test stock movements
      const testMovements = [
        { productId: product1.id, type: 'in', quantity: 5, reason: 'Purchase' },
        { productId: product2.id, type: 'out', quantity: 3, reason: 'Sale' },
      ];

      for (const movement of testMovements) {
        await database.addStockMovement(movement);
      }

      // Export stock movements
      const exportResult = await exportService.exportStockMovements();

      expect(exportResult.success).toBe(true);
      expect(exportResult.recordCount).toBe(2);

      // Clear stock movements
      await database.clearAllStockMovements();

      // Mock import data
      const exportedData = {
        metadata: {
          dataType: 'stock_movements',
          version: '2.0',
          recordCount: 2,
        },
        data: testMovements,
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(exportedData)
      );

      // Import stock movements
      const importOptions = {
        batchSize: 10,
        conflictResolution: 'skip' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const importResult = await importService.importStockMovements(
        'mock-file-uri',
        importOptions
      );

      expect(importResult.success).toBe(true);
      expect(importResult.imported).toBe(2);

      // Verify imported stock movements
      const importedMovements = await database.getAllStockMovements();
      expect(importedMovements).toHaveLength(2);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle corrupted export files', async () => {
      mockFileSystem.readAsStringAsync.mockResolvedValue(
        'invalid json content'
      );

      const importOptions = {
        batchSize: 10,
        conflictResolution: 'skip' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const importResult = await importService.importProducts(
        'mock-file-uri',
        importOptions
      );

      expect(importResult.success).toBe(false);
      expect(importResult.errors).toHaveLength(1);
      expect(importResult.errors[0].code).toBe('IMPORT_FAILED');
    });

    it('should handle missing reference validation', async () => {
      // Import sales without corresponding products/customers
      const invalidSalesData = {
        metadata: {
          dataType: 'sales',
          version: '2.0',
          recordCount: 1,
        },
        data: [
          { productId: 999, customerId: 999, quantity: 1, total: 100 }, // Non-existent IDs
        ],
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(invalidSalesData)
      );

      const importOptions = {
        batchSize: 10,
        conflictResolution: 'skip' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const importResult = await importService.importSales(
        'mock-file-uri',
        importOptions
      );

      expect(importResult.success).toBe(true);
      expect(importResult.skipped).toBe(1); // Should skip invalid references
      expect(importResult.errors).toHaveLength(1);
    });

    it('should handle large dataset processing', async () => {
      // Create large dataset
      const largeProductData = {
        metadata: {
          dataType: 'products',
          version: '2.0',
          recordCount: 1000,
        },
        data: Array.from({ length: 1000 }, (_, i) => ({
          name: `Product ${i + 1}`,
          price: (i + 1) * 10,
          stock: i + 1,
        })),
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(largeProductData)
      );

      const importOptions = {
        batchSize: 50, // Process in smaller batches
        conflictResolution: 'skip' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      const progressUpdates: any[] = [];
      importService.onProgress((progress) => {
        progressUpdates.push(progress);
      });

      const importResult = await importService.importProducts(
        'mock-file-uri',
        importOptions
      );

      expect(importResult.success).toBe(true);
      expect(importResult.imported).toBe(1000);
      expect(progressUpdates.length).toBeGreaterThan(1); // Should have multiple progress updates

      // Verify final progress
      const finalProgress = progressUpdates[progressUpdates.length - 1];
      expect(finalProgress.percentage).toBe(100);
    });
  });

  describe('Batch Processing', () => {
    it('should process imports in configurable batches', async () => {
      const testData = {
        metadata: {
          dataType: 'products',
          version: '2.0',
          recordCount: 100,
        },
        data: Array.from({ length: 100 }, (_, i) => ({
          name: `Product ${i + 1}`,
          price: (i + 1) * 10,
          stock: i + 1,
        })),
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(testData)
      );

      const batchSizes = [10, 25, 50];

      for (const batchSize of batchSizes) {
        // Clear database
        await database.clearAllProducts();

        const importOptions = {
          batchSize,
          conflictResolution: 'skip' as const,
          validateReferences: true,
          createMissingReferences: false,
        };

        const importResult = await importService.importProducts(
          'mock-file-uri',
          importOptions
        );

        expect(importResult.success).toBe(true);
        expect(importResult.imported).toBe(100);

        // Verify all products were imported
        const products = await database.getAllProducts();
        expect(products).toHaveLength(100);
      }
    });
  });

  describe('Progress Tracking', () => {
    it('should track progress accurately during export/import', async () => {
      // Setup test data
      const testProducts = Array.from({ length: 50 }, (_, i) => ({
        name: `Product ${i + 1}`,
        price: (i + 1) * 10,
        stock: i + 1,
      }));

      for (const product of testProducts) {
        await database.addProduct(product);
      }

      // Test export progress
      const exportProgressUpdates: any[] = [];
      exportService.onProgress((progress) => {
        exportProgressUpdates.push(progress);
      });

      await exportService.exportProducts();

      expect(exportProgressUpdates.length).toBeGreaterThan(0);
      expect(
        exportProgressUpdates[exportProgressUpdates.length - 1].percentage
      ).toBe(100);

      // Test import progress
      const importData = {
        metadata: { dataType: 'products', version: '2.0', recordCount: 50 },
        data: testProducts,
      };

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(importData)
      );

      const importProgressUpdates: any[] = [];
      importService.onProgress((progress) => {
        importProgressUpdates.push(progress);
      });

      const importOptions = {
        batchSize: 10,
        conflictResolution: 'update' as const,
        validateReferences: true,
        createMissingReferences: false,
      };

      await importService.importProducts('mock-file-uri', importOptions);

      expect(importProgressUpdates.length).toBeGreaterThan(0);
      expect(
        importProgressUpdates[importProgressUpdates.length - 1].percentage
      ).toBe(100);
    });
  });
});
