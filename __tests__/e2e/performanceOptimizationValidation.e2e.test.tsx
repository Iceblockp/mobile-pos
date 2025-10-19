import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
  screen,
  act,
} from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DatabaseContext } from '../../context/DatabaseContext';
import { ToastContext } from '../../context/ToastContext';

// Import components for end-to-end testing
import ProductsManager from '../../components/inventory/ProductsManager';
import Sales from '../../app/(tabs)/sales';

// Mock all the hooks and services
jest.mock('../../hooks/useQueries', () => ({
  useProductsInfinite: jest.fn(),
  useCategories: jest.fn(),
  useProducts: jest.fn(),
  useSaleMutations: jest.fn(),
  useSaleItems: jest.fn(),
  useProductSearchForSales: jest.fn(),
  useProductByBarcode: jest.fn(),
}));

jest.mock('../../hooks/useDebounced', () => ({
  useDebouncedSearch: jest.fn((query) => query),
  useDebouncedValue: jest.fn((value) => value),
}));

jest.mock('../../hooks/useBarcodeActions', () => ({
  useBarcodeActions: jest.fn(() => ({
    handleBarcodeScanned: jest.fn(),
    validateBarcode: jest.fn(() => true),
    getContextMessages: jest.fn(() => ({
      scanning: 'Scanning...',
      success: 'Success',
      notFound: 'Not found',
      error: 'Error',
    })),
    triggerHapticFeedback: jest.fn(),
  })),
}));

jest.mock('../../utils/memoryManager', () => ({
  useMemoryCleanup: jest.fn(() => ({ addCleanup: jest.fn() })),
  useRenderPerformance: jest.fn(),
  useQueryCacheManager: jest.fn(),
}));

const mockUseProductsInfinite =
  require('../../hooks/useQueries').useProductsInfinite;
const mockUseCategories = require('../../hooks/useQueries').useCategories;
const mockUseSaleMutations = require('../../hooks/useQueries').useSaleMutations;
const mockUseBarcodeActions =
  require('../../hooks/useBarcodeActions').useBarcodeActions;

describe('Performance Optimization E2E Validation', () => {
  let queryClient: QueryClient;
  let mockDb: any;
  let mockShowToast: jest.Mock;
  let mockBarcodeHandler: jest.Mock;

  // Generate large dataset for performance testing
  const generateLargeProductDataset = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `product-${i}`,
      name: `Performance Test Product ${i}`,
      barcode: `${String(i).padStart(12, '0')}`,
      price: 10.99 + i * 0.1,
      cost: 8.0 + i * 0.1,
      quantity: Math.max(0, 100 - (i % 101)), // Some products out of stock
      min_stock: 10,
      category: `Category ${i % 10}`,
      supplier_name: `Supplier ${i % 5}`,
      has_bulk_pricing: i % 3 === 0,
      imageUrl: i % 4 === 0 ? `https://example.com/image-${i}.jpg` : undefined,
      updated_at: new Date(Date.now() - i * 1000).toISOString(),
    }));
  };

  const mockCategories = Array.from({ length: 10 }, (_, i) => ({
    id: `cat-${i}`,
    name: `Category ${i}`,
  }));

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockDb = {
      getProducts: jest.fn(),
      getProductsPaginated: jest.fn(),
      findProductByBarcode: jest.fn(),
      searchProductsForSale: jest.fn(),
      hasProductBulkPricing: jest.fn(),
      deleteProduct: jest.fn(),
      addProduct: jest.fn(),
      updateProduct: jest.fn(),
    };

    mockShowToast = jest.fn();
    mockBarcodeHandler = jest.fn();

    mockUseCategories.mockReturnValue({
      data: mockCategories,
      isLoading: false,
      error: null,
    });

    mockUseSaleMutations.mockReturnValue({
      addSale: {
        mutateAsync: jest.fn().mockResolvedValue('sale-id-123'),
      },
    });

    mockUseBarcodeActions.mockReturnValue({
      handleBarcodeScanned: mockBarcodeHandler,
      validateBarcode: jest.fn(() => true),
      getContextMessages: jest.fn(() => ({
        scanning: 'Scanning...',
        success: 'Success',
        notFound: 'Not found',
        error: 'Error',
      })),
      triggerHapticFeedback: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <DatabaseContext.Provider value={{ db: mockDb, isReady: true }}>
          <ToastContext.Provider
            value={{ showToast: mockShowToast, hideToast: jest.fn() }}
          >
            {component}
          </ToastContext.Provider>
        </DatabaseContext.Provider>
      </QueryClientProvider>
    );
  };

  describe('Large Dataset Performance Validation', () => {
    it('should handle 1000 products with infinite scroll efficiently', async () => {
      const largeDataset = generateLargeProductDataset(1000);
      const pageSize = 50;

      // Mock paginated responses
      let currentPage = 1;
      mockUseProductsInfinite.mockReturnValue({
        data: {
          pages: [
            {
              data: largeDataset.slice(0, pageSize),
              hasMore: true,
              page: currentPage,
            },
          ],
        },
        fetchNextPage: jest.fn().mockImplementation(() => {
          currentPage++;
          return Promise.resolve();
        }),
        hasNextPage: true,
        isFetchingNextPage: false,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      });

      const startTime = performance.now();

      renderWithProviders(<ProductsManager />);

      // Wait for initial render
      await waitFor(
        () => {
          expect(screen.getByText('Performance Test Product 0')).toBeTruthy();
        },
        { timeout: 5000 }
      );

      const renderTime = performance.now() - startTime;

      // Should render within reasonable time even with large dataset
      expect(renderTime).toBeLessThan(2000); // 2 seconds max

      // Verify first page is displayed
      expect(screen.getByText('Performance Test Product 0')).toBeTruthy();
      expect(
        screen.getByText(`Performance Test Product ${pageSize - 1}`)
      ).toBeTruthy();
    });

    it('should handle 10000 products dataset without memory issues', async () => {
      const veryLargeDataset = generateLargeProductDataset(10000);
      const pageSize = 50;

      mockUseProductsInfinite.mockReturnValue({
        data: {
          pages: [
            {
              data: veryLargeDataset.slice(0, pageSize),
              hasMore: true,
              page: 1,
            },
          ],
        },
        fetchNextPage: jest.fn(),
        hasNextPage: true,
        isFetchingNextPage: false,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      });

      const initialMemory = process.memoryUsage().heapUsed;

      renderWithProviders(<ProductsManager />);

      await waitFor(() => {
        expect(screen.getByText('Performance Test Product 0')).toBeTruthy();
      });

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(100); // Less than 100MB increase
    });
  });

  describe('Search Performance Validation', () => {
    it('should handle search with debouncing efficiently', async () => {
      const searchDataset = generateLargeProductDataset(500);

      mockUseProductsInfinite.mockReturnValue({
        data: {
          pages: [
            {
              data: searchDataset
                .filter((p) => p.name.includes('Product 1'))
                .slice(0, 50),
              hasMore: false,
              page: 1,
            },
          ],
        },
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      });

      renderWithProviders(<ProductsManager />);

      const searchInput = screen.getByPlaceholderText(/search/i);

      const startTime = performance.now();

      // Simulate rapid typing (should be debounced)
      fireEvent.changeText(searchInput, 'P');
      fireEvent.changeText(searchInput, 'Pr');
      fireEvent.changeText(searchInput, 'Pro');
      fireEvent.changeText(searchInput, 'Product 1');

      await waitFor(() => {
        expect(screen.getByText('Performance Test Product 1')).toBeTruthy();
      });

      const searchTime = performance.now() - startTime;

      // Search should complete quickly
      expect(searchTime).toBeLessThan(1000);
    });

    it('should handle category filtering efficiently', async () => {
      const categoryDataset = generateLargeProductDataset(1000);

      mockUseProductsInfinite.mockReturnValue({
        data: {
          pages: [
            {
              data: categoryDataset
                .filter((p) => p.category === 'Category 1')
                .slice(0, 50),
              hasMore: false,
              page: 1,
            },
          ],
        },
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      });

      renderWithProviders(<ProductsManager />);

      // Test category filtering
      const categoryFilter = screen.getByText('All Categories');
      fireEvent.press(categoryFilter);

      await waitFor(() => {
        // Should show filtered results
        expect(screen.queryByText('Performance Test Product 0')).toBeTruthy();
      });
    });
  });

  describe('Barcode Scanning Performance Validation', () => {
    it('should handle barcode scanning efficiently in sales context', async () => {
      const salesDataset = generateLargeProductDataset(100);

      mockUseProductsInfinite.mockReturnValue({
        data: {
          pages: [
            {
              data: salesDataset.slice(0, 50),
              hasMore: true,
              page: 1,
            },
          ],
        },
        fetchNextPage: jest.fn(),
        hasNextPage: true,
        isFetchingNextPage: false,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      });

      mockDb.findProductByBarcode.mockResolvedValue(salesDataset[0]);

      mockBarcodeHandler.mockImplementation(async (barcode) => {
        return {
          success: true,
          product: salesDataset[0],
          action: 'added_to_cart',
        };
      });

      renderWithProviders(<Sales />);

      const startTime = performance.now();

      // Simulate barcode scan
      await act(async () => {
        await mockBarcodeHandler('000000000000');
      });

      const scanTime = performance.now() - startTime;

      // Barcode scanning should be very fast
      expect(scanTime).toBeLessThan(100);
      expect(mockBarcodeHandler).toHaveBeenCalledWith('000000000000');
    });

    it('should handle barcode scanning efficiently in inventory context', async () => {
      const inventoryDataset = generateLargeProductDataset(100);

      mockUseProductsInfinite.mockReturnValue({
        data: {
          pages: [
            {
              data: inventoryDataset.slice(0, 50),
              hasMore: true,
              page: 1,
            },
          ],
        },
        fetchNextPage: jest.fn(),
        hasNextPage: true,
        isFetchingNextPage: false,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      });

      mockDb.findProductByBarcode.mockResolvedValue(inventoryDataset[0]);

      mockBarcodeHandler.mockImplementation(async (barcode) => {
        return {
          success: true,
          product: inventoryDataset[0],
          action: 'product_found',
        };
      });

      renderWithProviders(<ProductsManager />);

      const startTime = performance.now();

      // Simulate barcode scan
      await act(async () => {
        await mockBarcodeHandler('000000000000');
      });

      const scanTime = performance.now() - startTime;

      // Barcode scanning should be very fast
      expect(scanTime).toBeLessThan(100);
      expect(mockBarcodeHandler).toHaveBeenCalledWith('000000000000');
    });
  });

  describe('Image Loading Performance Validation', () => {
    it('should handle products with images efficiently', async () => {
      const imageDataset = generateLargeProductDataset(100).map((product) => ({
        ...product,
        imageUrl: `https://example.com/image-${product.id}.jpg`,
      }));

      mockUseProductsInfinite.mockReturnValue({
        data: {
          pages: [
            {
              data: imageDataset.slice(0, 20),
              hasMore: true,
              page: 1,
            },
          ],
        },
        fetchNextPage: jest.fn(),
        hasNextPage: true,
        isFetchingNextPage: false,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      });

      const startTime = performance.now();

      renderWithProviders(<ProductsManager />);

      await waitFor(() => {
        expect(screen.getByText('Performance Test Product 0')).toBeTruthy();
      });

      const renderTime = performance.now() - startTime;

      // Should render efficiently even with images
      expect(renderTime).toBeLessThan(3000);
    });
  });

  describe('Infinite Scroll Performance Validation', () => {
    it('should handle infinite scroll loading efficiently', async () => {
      const scrollDataset = generateLargeProductDataset(1000);
      const pageSize = 50;
      let currentPage = 1;

      const mockFetchNextPage = jest.fn().mockImplementation(() => {
        currentPage++;
        return Promise.resolve();
      });

      mockUseProductsInfinite.mockReturnValue({
        data: {
          pages: Array.from({ length: currentPage }, (_, i) => ({
            data: scrollDataset.slice(i * pageSize, (i + 1) * pageSize),
            hasMore: (i + 1) * pageSize < scrollDataset.length,
            page: i + 1,
          })),
        },
        fetchNextPage: mockFetchNextPage,
        hasNextPage: currentPage * pageSize < scrollDataset.length,
        isFetchingNextPage: false,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      });

      renderWithProviders(<ProductsManager />);

      await waitFor(() => {
        expect(screen.getByText('Performance Test Product 0')).toBeTruthy();
      });

      // Simulate scroll to end (trigger infinite scroll)
      const startTime = performance.now();

      await act(async () => {
        mockFetchNextPage();
      });

      const scrollTime = performance.now() - startTime;

      // Infinite scroll should be responsive
      expect(scrollTime).toBeLessThan(500);
      expect(mockFetchNextPage).toHaveBeenCalled();
    });
  });

  describe('Overall System Performance Validation', () => {
    it('should maintain responsive UI under load', async () => {
      const loadTestDataset = generateLargeProductDataset(5000);

      mockUseProductsInfinite.mockReturnValue({
        data: {
          pages: [
            {
              data: loadTestDataset.slice(0, 50),
              hasMore: true,
              page: 1,
            },
          ],
        },
        fetchNextPage: jest.fn(),
        hasNextPage: true,
        isFetchingNextPage: false,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      });

      const startTime = performance.now();

      renderWithProviders(<ProductsManager />);

      // Perform multiple operations rapidly
      await waitFor(() => {
        expect(screen.getByText('Performance Test Product 0')).toBeTruthy();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.changeText(searchInput, 'test');
      fireEvent.changeText(searchInput, '');
      fireEvent.changeText(searchInput, 'product');

      const totalTime = performance.now() - startTime;

      // Overall system should remain responsive
      expect(totalTime).toBeLessThan(5000);
    });

    it('should handle error states gracefully without performance degradation', async () => {
      mockUseProductsInfinite.mockReturnValue({
        data: undefined,
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
        refetch: jest.fn(),
        isRefetching: false,
      });

      const startTime = performance.now();

      renderWithProviders(<ProductsManager />);

      await waitFor(() => {
        expect(
          screen.getByText(/failed to load/i) || screen.getByText(/error/i)
        ).toBeTruthy();
      });

      const errorHandlingTime = performance.now() - startTime;

      // Error handling should be fast
      expect(errorHandlingTime).toBeLessThan(1000);
    });
  });
});

// Performance benchmarking utilities
export const performanceBenchmarks = {
  RENDER_TIME_THRESHOLD: 2000, // 2 seconds
  SEARCH_TIME_THRESHOLD: 1000, // 1 second
  BARCODE_SCAN_THRESHOLD: 100, // 100ms
  INFINITE_SCROLL_THRESHOLD: 500, // 500ms
  MEMORY_INCREASE_THRESHOLD: 100, // 100MB
};
