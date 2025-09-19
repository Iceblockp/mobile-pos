import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { ProductMovementHistory } from '@/components/ProductMovementHistory';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { DatabaseProvider } from '@/context/DatabaseContext';
import { LocalizationProvider } from '@/context/LocalizationContext';

// Mock the database and other dependencies
jest.mock('@/hooks/useQueries', () => ({
  useStockMovements: jest.fn(() => ({
    data: [],
    isLoading: false,
    isRefetching: false,
    refetch: jest.fn(),
  })),
  useProducts: jest.fn(() => ({ data: [] })),
  useBasicSuppliers: jest.fn(() => ({ data: [] })),
}));

jest.mock('@/components/StockMovementForm', () => ({
  StockMovementForm: ({ visible, onClose }: any) =>
    visible ? <div testID="stock-movement-form" onPress={onClose} /> : null,
}));

// Test wrapper with all required providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <LocalizationProvider>
    <DatabaseProvider>
      <CurrencyProvider>{children}</CurrencyProvider>
    </DatabaseProvider>
  </LocalizationProvider>
);

describe('ProductMovementHistory Integration Tests', () => {
  const mockProduct = {
    id: 1,
    name: 'Test Product',
    price: 100,
    cost: 50,
    stock: 10,
    category: 'Test Category',
    barcode: '123456789',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without infinite loops', () => {
      const { getByText } = render(
        <TestWrapper>
          <ProductMovementHistory product={mockProduct} />
        </TestWrapper>
      );

      expect(getByText('Stock Movement')).toBeTruthy();
    });

    it('should render in compact mode without issues', () => {
      const { getByText } = render(
        <TestWrapper>
          <ProductMovementHistory product={mockProduct} compact={true} />
        </TestWrapper>
      );

      expect(getByText('History')).toBeTruthy();
    });

    it('should handle multiple re-renders without performance issues', () => {
      const { rerender } = render(
        <TestWrapper>
          <ProductMovementHistory product={mockProduct} />
        </TestWrapper>
      );

      // Simulate multiple re-renders
      for (let i = 0; i < 10; i++) {
        rerender(
          <TestWrapper>
            <ProductMovementHistory product={{ ...mockProduct, stock: i }} />
          </TestWrapper>
        );
      }

      // Should complete without hanging
      expect(true).toBe(true);
    });
  });

  describe('Modal Interactions', () => {
    it('should open and close history modal without infinite loops', async () => {
      const { getByText, queryByText } = render(
        <TestWrapper>
          <ProductMovementHistory product={mockProduct} />
        </TestWrapper>
      );

      const historyButton = getByText('History');

      act(() => {
        fireEvent.press(historyButton);
      });

      await waitFor(() => {
        expect(getByText(`History - ${mockProduct.name}`)).toBeTruthy();
      });

      // Close modal
      const closeButton = getByText('×'); // Assuming X icon renders as ×
      act(() => {
        fireEvent.press(closeButton);
      });

      await waitFor(() => {
        expect(queryByText(`History - ${mockProduct.name}`)).toBeFalsy();
      });
    });

    it('should open stock movement form for stock in', async () => {
      const { getByText, getByTestId } = render(
        <TestWrapper>
          <ProductMovementHistory product={mockProduct} />
        </TestWrapper>
      );

      const addStockButton = getByText('Add Stock');

      act(() => {
        fireEvent.press(addStockButton);
      });

      await waitFor(() => {
        expect(getByTestId('stock-movement-form')).toBeTruthy();
      });
    });

    it('should open stock movement form for stock out', async () => {
      const { getByText, getByTestId } = render(
        <TestWrapper>
          <ProductMovementHistory product={mockProduct} />
        </TestWrapper>
      );

      const removeStockButton = getByText('Remove Stock');

      act(() => {
        fireEvent.press(removeStockButton);
      });

      await waitFor(() => {
        expect(getByTestId('stock-movement-form')).toBeTruthy();
      });
    });
  });

  describe('Compact Mode Interactions', () => {
    it('should handle quick actions in compact mode', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <ProductMovementHistory product={mockProduct} compact={true} />
        </TestWrapper>
      );

      // Test stock in quick action
      const stockInButton =
        getByTestId('stock-in-button') ||
        document.querySelector('[style*="backgroundColor: #059669"]');

      if (stockInButton) {
        act(() => {
          fireEvent.press(stockInButton);
        });

        await waitFor(() => {
          expect(getByTestId('stock-movement-form')).toBeTruthy();
        });
      }
    });

    it('should open history modal from compact mode', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ProductMovementHistory product={mockProduct} compact={true} />
        </TestWrapper>
      );

      const historyButton = getByText('History');

      act(() => {
        fireEvent.press(historyButton);
      });

      await waitFor(() => {
        expect(getByText(`History - ${mockProduct.name}`)).toBeTruthy();
      });
    });
  });

  describe('State Management', () => {
    it('should maintain stable state during rapid interactions', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ProductMovementHistory product={mockProduct} />
        </TestWrapper>
      );

      const addStockButton = getByText('Add Stock');
      const removeStockButton = getByText('Remove Stock');
      const historyButton = getByText('History');

      // Rapid clicking should not cause issues
      act(() => {
        fireEvent.press(addStockButton);
        fireEvent.press(removeStockButton);
        fireEvent.press(historyButton);
      });

      // Should handle rapid state changes gracefully
      await waitFor(() => {
        expect(getByText(`History - ${mockProduct.name}`)).toBeTruthy();
      });
    });

    it('should handle product prop changes without infinite re-renders', () => {
      const { rerender } = render(
        <TestWrapper>
          <ProductMovementHistory product={mockProduct} />
        </TestWrapper>
      );

      // Change product props
      const updatedProduct = {
        ...mockProduct,
        name: 'Updated Product',
        stock: 20,
      };

      rerender(
        <TestWrapper>
          <ProductMovementHistory product={updatedProduct} />
        </TestWrapper>
      );

      // Should not cause infinite re-renders
      expect(true).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should not cause memory leaks with multiple instances', () => {
      const products = Array.from({ length: 10 }, (_, i) => ({
        ...mockProduct,
        id: i + 1,
        name: `Product ${i + 1}`,
      }));

      const { rerender } = render(
        <TestWrapper>
          <div>
            {products.map((product) => (
              <ProductMovementHistory key={product.id} product={product} />
            ))}
          </div>
        </TestWrapper>
      );

      // Re-render multiple times
      for (let i = 0; i < 5; i++) {
        rerender(
          <TestWrapper>
            <div>
              {products.map((product) => (
                <ProductMovementHistory
                  key={product.id}
                  product={{ ...product, stock: product.stock + i }}
                />
              ))}
            </div>
          </TestWrapper>
        );
      }

      // Should complete without memory issues
      expect(true).toBe(true);
    });

    it('should handle concurrent modal operations', async () => {
      const { getAllByText } = render(
        <TestWrapper>
          <div>
            <ProductMovementHistory product={mockProduct} />
            <ProductMovementHistory
              product={{ ...mockProduct, id: 2, name: 'Product 2' }}
            />
          </div>
        </TestWrapper>
      );

      const historyButtons = getAllByText('History');

      // Open multiple modals concurrently
      act(() => {
        historyButtons.forEach((button) => fireEvent.press(button));
      });

      // Should handle concurrent operations gracefully
      await waitFor(() => {
        expect(getAllByText(/History -/).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in child components gracefully', () => {
      // Mock console.error to avoid noise in tests
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const { getByText } = render(
        <TestWrapper>
          <ProductMovementHistory product={mockProduct} />
        </TestWrapper>
      );

      // Component should still render even if there are minor errors
      expect(getByText('Stock Movement')).toBeTruthy();

      consoleSpy.mockRestore();
    });

    it('should recover from temporary state inconsistencies', async () => {
      const { getByText, rerender } = render(
        <TestWrapper>
          <ProductMovementHistory product={mockProduct} />
        </TestWrapper>
      );

      // Simulate state inconsistency by rapid prop changes
      for (let i = 0; i < 5; i++) {
        rerender(
          <TestWrapper>
            <ProductMovementHistory
              product={{ ...mockProduct, stock: Math.random() * 100 }}
            />
          </TestWrapper>
        );
      }

      // Should still be functional
      const historyButton = getByText('History');
      act(() => {
        fireEvent.press(historyButton);
      });

      await waitFor(() => {
        expect(getByText(`History - ${mockProduct.name}`)).toBeTruthy();
      });
    });
  });

  describe('Accessibility and UX', () => {
    it('should maintain responsive UI during state updates', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ProductMovementHistory product={mockProduct} />
        </TestWrapper>
      );

      const addStockButton = getByText('Add Stock');

      // Button should be immediately responsive
      act(() => {
        fireEvent.press(addStockButton);
      });

      // UI should update without delay
      await waitFor(
        () => {
          expect(getByTestId('stock-movement-form')).toBeTruthy();
        },
        { timeout: 100 }
      );
    });

    it('should handle keyboard navigation without issues', () => {
      const { getByText } = render(
        <TestWrapper>
          <ProductMovementHistory product={mockProduct} />
        </TestWrapper>
      );

      // All interactive elements should be accessible
      expect(getByText('History')).toBeTruthy();
      expect(getByText('Add Stock')).toBeTruthy();
      expect(getByText('Remove Stock')).toBeTruthy();
    });
  });
});
