import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
  screen,
} from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import DataExportScreen from '../../app/data-export';
import DataImportScreen from '../../app/data-import';
import { DatabaseService } from '../../services/database';

// Mock dependencies
jest.mock('expo-file-system');
jest.mock('expo-sharing');
jest.mock('expo-document-picker');

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

const MockedNavigationContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => <NavigationContainer>{children}</NavigationContainer>;

describe('Data Export/Import E2E Tests', () => {
  let database: DatabaseService;

  beforeEach(async () => {
    database = new DatabaseService();
    await database.initDatabase();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await database.closeDatabase();
  });

  describe('Data Export Screen', () => {
    it('should render export options correctly', () => {
      render(
        <MockedNavigationContainer>
          <DataExportScreen
            navigation={mockNavigation as any}
            route={{} as any}
          />
        </MockedNavigationContainer>
      );

      expect(screen.getByText('Export Products')).toBeTruthy();
      expect(screen.getByText('Export Sales')).toBeTruthy();
      expect(screen.getByText('Export Customers')).toBeTruthy();
      expect(screen.getByText('Export Stock Movements')).toBeTruthy();
    });

    it('should handle product export flow', async () => {
      // Setup test data
      await database.addProduct({
        name: 'Test Product',
        price: 100,
        stock: 10,
      });

      render(
        <MockedNavigationContainer>
          <DataExportScreen
            navigation={mockNavigation as any}
            route={{} as any}
          />
        </MockedNavigationContainer>
      );

      // Trigger product export
      const exportButton = screen.getByText('Export Products');
      fireEvent.press(exportButton);

      // Wait for export to complete
      await waitFor(() => {
        expect(screen.getByText(/Export completed successfully/)).toBeTruthy();
      });
    });

    it('should show progress during export', async () => {
      // Setup larger dataset
      for (let i = 0; i < 50; i++) {
        await database.addProduct({
          name: `Product ${i + 1}`,
          price: (i + 1) * 10,
          stock: i + 1,
        });
      }

      render(
        <MockedNavigationContainer>
          <DataExportScreen
            navigation={mockNavigation as any}
            route={{} as any}
          />
        </MockedNavigationContainer>
      );

      const exportButton = screen.getByText('Export Products');
      fireEvent.press(exportButton);

      // Should show progress modal
      await waitFor(() => {
        expect(screen.getByText(/Exporting/)).toBeTruthy();
      });

      // Wait for completion
      await waitFor(
        () => {
          expect(
            screen.getByText(/Export completed successfully/)
          ).toBeTruthy();
        },
        { timeout: 5000 }
      );
    });

    it('should handle export errors gracefully', async () => {
      // Mock file system error
      const mockFileSystem = require('expo-file-system');
      mockFileSystem.writeAsStringAsync.mockRejectedValue(
        new Error('Storage full')
      );

      render(
        <MockedNavigationContainer>
          <DataExportScreen
            navigation={mockNavigation as any}
            route={{} as any}
          />
        </MockedNavigationContainer>
      );

      const exportButton = screen.getByText('Export Products');
      fireEvent.press(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/Export failed/)).toBeTruthy();
      });
    });
  });

  describe('Data Import Screen', () => {
    it('should render import options correctly', () => {
      render(
        <MockedNavigationContainer>
          <DataImportScreen
            navigation={mockNavigation as any}
            route={{} as any}
          />
        </MockedNavigationContainer>
      );

      expect(screen.getByText('Import Products')).toBeTruthy();
      expect(screen.getByText('Import Sales')).toBeTruthy();
      expect(screen.getByText('Import Customers')).toBeTruthy();
      expect(screen.getByText('Import Stock Movements')).toBeTruthy();
    });

    it('should handle file selection for import', async () => {
      const mockDocumentPicker = require('expo-document-picker');
      mockDocumentPicker.getDocumentAsync.mockResolvedValue({
        type: 'success',
        uri: 'file://test-import.json',
        name: 'test-import.json',
      });

      render(
        <MockedNavigationContainer>
          <DataImportScreen
            navigation={mockNavigation as any}
            route={{} as any}
          />
        </MockedNavigationContainer>
      );

      const importButton = screen.getByText('Import Products');
      fireEvent.press(importButton);

      await waitFor(() => {
        expect(mockDocumentPicker.getDocumentAsync).toHaveBeenCalled();
      });
    });

    it('should handle successful import flow', async () => {
      // Mock file picker
      const mockDocumentPicker = require('expo-document-picker');
      mockDocumentPicker.getDocumentAsync.mockResolvedValue({
        type: 'success',
        uri: 'file://test-import.json',
        name: 'test-import.json',
      });

      // Mock file content
      const mockFileSystem = require('expo-file-system');
      const testData = {
        metadata: {
          dataType: 'products',
          version: '2.0',
          recordCount: 2,
        },
        data: [
          { name: 'Imported Product 1', price: 100, stock: 10 },
          { name: 'Imported Product 2', price: 200, stock: 20 },
        ],
      };
      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(testData)
      );

      render(
        <MockedNavigationContainer>
          <DataImportScreen
            navigation={mockNavigation as any}
            route={{} as any}
          />
        </MockedNavigationContainer>
      );

      const importButton = screen.getByText('Import Products');
      fireEvent.press(importButton);

      // Wait for import to complete
      await waitFor(() => {
        expect(screen.getByText(/Import completed successfully/)).toBeTruthy();
      });

      // Verify data was imported
      const products = await database.getAllProducts();
      expect(products).toHaveLength(2);
      expect(products[0].name).toBe('Imported Product 1');
    });

    it('should show progress during import', async () => {
      const mockDocumentPicker = require('expo-document-picker');
      mockDocumentPicker.getDocumentAsync.mockResolvedValue({
        type: 'success',
        uri: 'file://large-import.json',
        name: 'large-import.json',
      });

      const mockFileSystem = require('expo-file-system');
      const largeData = {
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
        JSON.stringify(largeData)
      );

      render(
        <MockedNavigationContainer>
          <DataImportScreen
            navigation={mockNavigation as any}
            route={{} as any}
          />
        </MockedNavigationContainer>
      );

      const importButton = screen.getByText('Import Products');
      fireEvent.press(importButton);

      // Should show progress modal
      await waitFor(() => {
        expect(screen.getByText(/Importing/)).toBeTruthy();
      });

      // Wait for completion
      await waitFor(
        () => {
          expect(
            screen.getByText(/Import completed successfully/)
          ).toBeTruthy();
        },
        { timeout: 10000 }
      );
    });

    it('should handle conflict resolution', async () => {
      // Setup existing product
      await database.addProduct({
        name: 'Existing Product',
        price: 100,
        stock: 10,
      });

      const mockDocumentPicker = require('expo-document-picker');
      mockDocumentPicker.getDocumentAsync.mockResolvedValue({
        type: 'success',
        uri: 'file://conflict-import.json',
        name: 'conflict-import.json',
      });

      const mockFileSystem = require('expo-file-system');
      const conflictData = {
        metadata: {
          dataType: 'products',
          version: '2.0',
          recordCount: 1,
        },
        data: [
          { name: 'Existing Product', price: 150, stock: 15 }, // Conflict
        ],
      };
      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(conflictData)
      );

      render(
        <MockedNavigationContainer>
          <DataImportScreen
            navigation={mockNavigation as any}
            route={{} as any}
          />
        </MockedNavigationContainer>
      );

      const importButton = screen.getByText('Import Products');
      fireEvent.press(importButton);

      // Should show conflict resolution options
      await waitFor(() => {
        expect(screen.getByText(/Conflict detected/)).toBeTruthy();
      });

      // Select update option
      const updateButton = screen.getByText('Update Existing');
      fireEvent.press(updateButton);

      // Confirm resolution
      const confirmButton = screen.getByText('Apply Resolution');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Import completed successfully/)).toBeTruthy();
      });

      // Verify product was updated
      const products = await database.getAllProducts();
      expect(products).toHaveLength(1);
      expect(products[0].price).toBe(150); // Updated price
    });

    it('should handle import validation errors', async () => {
      const mockDocumentPicker = require('expo-document-picker');
      mockDocumentPicker.getDocumentAsync.mockResolvedValue({
        type: 'success',
        uri: 'file://invalid-import.json',
        name: 'invalid-import.json',
      });

      const mockFileSystem = require('expo-file-system');
      const invalidData = {
        metadata: {
          dataType: 'products',
          version: '2.0',
          recordCount: 2,
        },
        data: [
          { name: 'Valid Product', price: 100, stock: 10 },
          { price: 200, stock: 20 }, // Missing name
        ],
      };
      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(invalidData)
      );

      render(
        <MockedNavigationContainer>
          <DataImportScreen
            navigation={mockNavigation as any}
            route={{} as any}
          />
        </MockedNavigationContainer>
      );

      const importButton = screen.getByText('Import Products');
      fireEvent.press(importButton);

      await waitFor(() => {
        expect(screen.getByText(/Import completed with errors/)).toBeTruthy();
      });

      // Should show error details
      expect(screen.getByText(/1 error occurred/)).toBeTruthy();

      // Verify only valid product was imported
      const products = await database.getAllProducts();
      expect(products).toHaveLength(1);
      expect(products[0].name).toBe('Valid Product');
    });

    it('should handle file format errors', async () => {
      const mockDocumentPicker = require('expo-document-picker');
      mockDocumentPicker.getDocumentAsync.mockResolvedValue({
        type: 'success',
        uri: 'file://invalid-format.json',
        name: 'invalid-format.json',
      });

      const mockFileSystem = require('expo-file-system');
      mockFileSystem.readAsStringAsync.mockResolvedValue(
        'invalid json content'
      );

      render(
        <MockedNavigationContainer>
          <DataImportScreen
            navigation={mockNavigation as any}
            route={{} as any}
          />
        </MockedNavigationContainer>
      );

      const importButton = screen.getByText('Import Products');
      fireEvent.press(importButton);

      await waitFor(() => {
        expect(screen.getByText(/Import failed/)).toBeTruthy();
      });

      expect(screen.getByText(/Invalid file format/)).toBeTruthy();
    });
  });

  describe('Export/Import Round Trip', () => {
    it('should maintain data integrity in export/import cycle', async () => {
      // Setup original data
      const originalProducts = [
        { name: 'Product A', price: 99.99, stock: 5, category: 'Electronics' },
        { name: 'Product B', price: 149.5, stock: 10, category: 'Clothing' },
        { name: 'Product C', price: 29.99, stock: 25, category: 'Books' },
      ];

      for (const product of originalProducts) {
        await database.addProduct(product);
      }

      // Export data
      const exportScreen = render(
        <MockedNavigationContainer>
          <DataExportScreen
            navigation={mockNavigation as any}
            route={{} as any}
          />
        </MockedNavigationContainer>
      );

      const exportButton = exportScreen.getByText('Export Products');
      fireEvent.press(exportButton);

      await waitFor(() => {
        expect(
          exportScreen.getByText(/Export completed successfully/)
        ).toBeTruthy();
      });

      // Clear database
      await database.clearAllProducts();
      const emptyProducts = await database.getAllProducts();
      expect(emptyProducts).toHaveLength(0);

      // Mock the exported file for import
      const mockDocumentPicker = require('expo-document-picker');
      mockDocumentPicker.getDocumentAsync.mockResolvedValue({
        type: 'success',
        uri: 'file://exported-products.json',
        name: 'exported-products.json',
      });

      const mockFileSystem = require('expo-file-system');
      const exportedData = {
        metadata: {
          dataType: 'products',
          version: '2.0',
          recordCount: 3,
        },
        data: originalProducts,
      };
      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(exportedData)
      );

      // Import data back
      const importScreen = render(
        <MockedNavigationContainer>
          <DataImportScreen
            navigation={mockNavigation as any}
            route={{} as any}
          />
        </MockedNavigationContainer>
      );

      const importButton = importScreen.getByText('Import Products');
      fireEvent.press(importButton);

      await waitFor(() => {
        expect(
          importScreen.getByText(/Import completed successfully/)
        ).toBeTruthy();
      });

      // Verify data integrity
      const importedProducts = await database.getAllProducts();
      expect(importedProducts).toHaveLength(3);

      for (let i = 0; i < originalProducts.length; i++) {
        expect(importedProducts[i].name).toBe(originalProducts[i].name);
        expect(importedProducts[i].price).toBe(originalProducts[i].price);
        expect(importedProducts[i].stock).toBe(originalProducts[i].stock);
        expect(importedProducts[i].category).toBe(originalProducts[i].category);
      }
    });
  });

  describe('Performance Tests', () => {
    it('should handle large dataset export efficiently', async () => {
      // Create large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        name: `Product ${i + 1}`,
        price: Math.random() * 1000,
        stock: Math.floor(Math.random() * 100),
        category: `Category ${(i % 10) + 1}`,
      }));

      for (const product of largeDataset) {
        await database.addProduct(product);
      }

      const startTime = Date.now();

      render(
        <MockedNavigationContainer>
          <DataExportScreen
            navigation={mockNavigation as any}
            route={{} as any}
          />
        </MockedNavigationContainer>
      );

      const exportButton = screen.getByText('Export Products');
      fireEvent.press(exportButton);

      await waitFor(
        () => {
          expect(
            screen.getByText(/Export completed successfully/)
          ).toBeTruthy();
        },
        { timeout: 15000 }
      );

      const exportTime = Date.now() - startTime;

      // Should complete within reasonable time (15 seconds)
      expect(exportTime).toBeLessThan(15000);
    });

    it('should handle large dataset import efficiently', async () => {
      const mockDocumentPicker = require('expo-document-picker');
      mockDocumentPicker.getDocumentAsync.mockResolvedValue({
        type: 'success',
        uri: 'file://large-dataset.json',
        name: 'large-dataset.json',
      });

      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        name: `Product ${i + 1}`,
        price: Math.random() * 1000,
        stock: Math.floor(Math.random() * 100),
      }));

      const mockFileSystem = require('expo-file-system');
      const largeData = {
        metadata: {
          dataType: 'products',
          version: '2.0',
          recordCount: 1000,
        },
        data: largeDataset,
      };
      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(largeData)
      );

      const startTime = Date.now();

      render(
        <MockedNavigationContainer>
          <DataImportScreen
            navigation={mockNavigation as any}
            route={{} as any}
          />
        </MockedNavigationContainer>
      );

      const importButton = screen.getByText('Import Products');
      fireEvent.press(importButton);

      await waitFor(
        () => {
          expect(
            screen.getByText(/Import completed successfully/)
          ).toBeTruthy();
        },
        { timeout: 20000 }
      );

      const importTime = Date.now() - startTime;

      // Should complete within reasonable time (20 seconds)
      expect(importTime).toBeLessThan(20000);

      // Verify all data was imported
      const products = await database.getAllProducts();
      expect(products).toHaveLength(1000);
    });
  });
});
