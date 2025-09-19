import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { PriceInput } from '@/components/PriceInput';
import { ProductMovementHistory } from '@/components/ProductMovementHistory';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { DatabaseProvider } from '@/context/DatabaseContext';
import { LocalizationProvider } from '@/context/LocalizationContext';

// Mock all external dependencies
jest.mock('@/hooks/useQueries', () => ({
  useStockMovements: jest.fn(() => ({
    data: [
      {
        id: 1,
        type: 'stock_in',
        quantity: 10,
        product_name: 'Test Product',
        created_at: new Date().toISOString(),
        reason: 'Initial stock',
      },
    ],
    isLoading: false,
    isRefetching: false,
    refetch: jest.fn(),
  })),
  useProducts: jest.fn(() => ({
    data: [{ id: 1, name: 'Test Product', price: 100, cost: 50 }],
  })),
  useBasicSuppliers: jest.fn(() => ({
    data: [{ id: 1, name: 'Test Supplier' }],
  })),
}));

jest.mock('@/components/StockMovementForm', () => ({
  StockMovementForm: ({ visible, onClose, product, initialType }: any) =>
    visible ? (
      <div testID="stock-movement-form">
        <div testID="form-product">{product?.name}</div>
        <div testID="form-type">{initialType}</div>
        <button testID="close-form" onPress={onClose}>
          Close
        </button>
      </div>
    ) : null,
}));

// Complete test wrapper with all providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <LocalizationProvider>
    <DatabaseProvider>
      <CurrencyProvider>{children}</CurrencyProvider>
    </DatabaseProvider>
  </LocalizationProvider>
);

describe('Price Input Infinite Loop Fix - E2E Tests', () => {
  const mockProduct = {
    id: 1,
    name: 'Test Product',
    price: 100,
    cost: 50,
    stock: 10,
    category: 'Electronics',
    barcode: '123456789',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear any console warnings/errors
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Product Creation Modal Scenario', () => {
    it('should allow typing in price inputs without infinite loop errors', async () => {
      const ProductForm = () => {
        const [formData, setFormData] = React.useState({
          name: '',
          price: '',
          cost: '',
        });

        return (
          <TestWrapper>
            <div testID="product-form">
              <input
                testID="product-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Product Name"
              />
              <PriceInput
                label="Price"
                value={formData.price}
                onValueChange={(value, numeric) =>
                  setFormData((prev) => ({ ...prev, price: value }))
                }
              />
              <PriceInput
                label="Cost"
                value={formData.cost}
                onValueChange={(value, numeric) =>
                  setFormData((prev) => ({ ...prev, cost: value }))
                }
              />
              <ProductMovementHistory product={mockProduct} compact={true} />
            </div>
          </TestWrapper>
        );
      };

      const { getByTestId, getByDisplayValue, getByText } = render(
        <ProductForm />
      );

      // Verify form renders without errors
      expect(getByTestId('product-form')).toBeTruthy();

      // Type in product name
      const nameInput = getByTestId('product-name');
      act(() => {
        fireEvent.changeText(nameInput, 'New Product');
      });

      // Type in price input - this should not cause infinite loops
      const priceInput = getByDisplayValue(''); // First empty input (price)
      act(() => {
        fireEvent.changeText(priceInput, '1');
        fireEvent.changeText(priceInput, '12');
        fireEvent.changeText(priceInput, '123');
        fireEvent.changeText(priceInput, '123.45');
      });

      // Type in cost input
      const inputs = getAllByDisplayValue('');
      const costInput = inputs[1]; // Second empty input (cost)
      act(() => {
        fireEvent.changeText(costInput, '75.50');
      });

      // Verify ProductMovementHistory is still functional
      const historyButton = getByText('History');
      act(() => {
        fireEvent.press(historyButton);
      });

      await waitFor(() => {
        expect(getByText(`History - ${mockProduct.name}`)).toBeTruthy();
      });

      // No infinite loop errors should have occurred
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('Maximum update depth exceeded')
      );
    });

    it('should handle rapid typing without performance issues', async () => {
      const onValueChange = jest.fn();

      const { getByDisplayValue } = render(
        <TestWrapper>
          <PriceInput label="Price" value="" onValueChange={onValueChange} />
        </TestWrapper>
      );

      const input = getByDisplayValue('');

      // Simulate very rapid typing
      const startTime = performance.now();

      act(() => {
        const rapidValues = [
          '1',
          '12',
          '123',
          '1234',
          '12345',
          '123456',
          '1234567',
          '12345678',
        ];
        rapidValues.forEach((value) => {
          fireEvent.changeText(input, value);
        });
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete quickly without hanging
      expect(totalTime).toBeLessThan(100);
      expect(onValueChange).toHaveBeenCalledTimes(8);

      // No performance warnings should be logged
      expect(console.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('infinite loop')
      );
    });
  });

  describe('Product Management Workflow', () => {
    it('should handle complete product management workflow without errors', async () => {
      const ProductManager = () => {
        const [products, setProducts] = React.useState([mockProduct]);
        const [selectedProduct, setSelectedProduct] =
          React.useState(mockProduct);
        const [editMode, setEditMode] = React.useState(false);

        return (
          <TestWrapper>
            <div testID="product-manager">
              {/* Product List */}
              <div testID="product-list">
                {products.map((product) => (
                  <div key={product.id} testID={`product-${product.id}`}>
                    <span>{product.name}</span>
                    <button
                      testID={`edit-${product.id}`}
                      onPress={() => {
                        setSelectedProduct(product);
                        setEditMode(true);
                      }}
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>

              {/* Product Editor */}
              {editMode && (
                <div testID="product-editor">
                  <PriceInput
                    label="Price"
                    value={selectedProduct.price.toString()}
                    onValueChange={(value, numeric) =>
                      setSelectedProduct((prev) => ({
                        ...prev,
                        price: numeric,
                      }))
                    }
                  />
                  <PriceInput
                    label="Cost"
                    value={selectedProduct.cost.toString()}
                    onValueChange={(value, numeric) =>
                      setSelectedProduct((prev) => ({ ...prev, cost: numeric }))
                    }
                  />
                  <button
                    testID="save-product"
                    onPress={() => {
                      setProducts((prev) =>
                        prev.map((p) =>
                          p.id === selectedProduct.id ? selectedProduct : p
                        )
                      );
                      setEditMode(false);
                    }}
                  >
                    Save
                  </button>
                </div>
              )}

              {/* Movement History */}
              <ProductMovementHistory product={selectedProduct} />
            </div>
          </TestWrapper>
        );
      };

      const { getByTestId, getByDisplayValue, getByText } = render(
        <ProductManager />
      );

      // Verify initial render
      expect(getByTestId('product-manager')).toBeTruthy();
      expect(getByTestId('product-1')).toBeTruthy();

      // Enter edit mode
      const editButton = getByTestId('edit-1');
      act(() => {
        fireEvent.press(editButton);
      });

      await waitFor(() => {
        expect(getByTestId('product-editor')).toBeTruthy();
      });

      // Edit price
      const priceInput = getByDisplayValue('100');
      act(() => {
        fireEvent.changeText(priceInput, '150.75');
      });

      // Edit cost
      const costInput = getByDisplayValue('50');
      act(() => {
        fireEvent.changeText(costInput, '85.25');
      });

      // Save changes
      const saveButton = getByTestId('save-product');
      act(() => {
        fireEvent.press(saveButton);
      });

      // Verify no errors occurred during the workflow
      expect(console.error).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should handle multiple product forms simultaneously', async () => {
      const MultiProductForm = () => {
        const [products, setProducts] = React.useState([
          { id: 1, name: 'Product 1', price: '', cost: '' },
          { id: 2, name: 'Product 2', price: '', cost: '' },
          { id: 3, name: 'Product 3', price: '', cost: '' },
        ]);

        const updateProduct = (id: number, field: string, value: string) => {
          setProducts((prev) =>
            prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
          );
        };

        return (
          <TestWrapper>
            <div testID="multi-product-form">
              {products.map((product) => (
                <div key={product.id} testID={`form-${product.id}`}>
                  <h3>{product.name}</h3>
                  <PriceInput
                    label="Price"
                    value={product.price}
                    onValueChange={(value) =>
                      updateProduct(product.id, 'price', value)
                    }
                  />
                  <PriceInput
                    label="Cost"
                    value={product.cost}
                    onValueChange={(value) =>
                      updateProduct(product.id, 'cost', value)
                    }
                  />
                </div>
              ))}
            </div>
          </TestWrapper>
        );
      };

      const { getByTestId, getAllByDisplayValue } = render(
        <MultiProductForm />
      );

      expect(getByTestId('multi-product-form')).toBeTruthy();

      // Get all empty inputs (6 total: 2 per product)
      const inputs = getAllByDisplayValue('');
      expect(inputs).toHaveLength(6);

      // Fill out all forms simultaneously
      act(() => {
        fireEvent.changeText(inputs[0], '100.00'); // Product 1 price
        fireEvent.changeText(inputs[1], '75.00'); // Product 1 cost
        fireEvent.changeText(inputs[2], '200.00'); // Product 2 price
        fireEvent.changeText(inputs[3], '150.00'); // Product 2 cost
        fireEvent.changeText(inputs[4], '300.00'); // Product 3 price
        fireEvent.changeText(inputs[5], '225.00'); // Product 3 cost
      });

      // Should handle multiple forms without interference or errors
      expect(console.error).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe('Stock Movement Integration', () => {
    it('should handle stock movements with price inputs without conflicts', async () => {
      const StockManagement = () => {
        const [showMovementForm, setShowMovementForm] = React.useState(false);
        const [unitCost, setUnitCost] = React.useState('');

        return (
          <TestWrapper>
            <div testID="stock-management">
              <ProductMovementHistory product={mockProduct} />

              {showMovementForm && (
                <div testID="movement-form">
                  <PriceInput
                    label="Unit Cost"
                    value={unitCost}
                    onValueChange={(value) => setUnitCost(value)}
                  />
                  <button
                    testID="submit-movement"
                    onPress={() => setShowMovementForm(false)}
                  >
                    Submit
                  </button>
                </div>
              )}

              <button
                testID="add-movement"
                onPress={() => setShowMovementForm(true)}
              >
                Add Movement
              </button>
            </div>
          </TestWrapper>
        );
      };

      const { getByTestId, getByText, getByDisplayValue } = render(
        <StockManagement />
      );

      // Open stock movement from ProductMovementHistory
      const addStockButton = getByText('Add Stock');
      act(() => {
        fireEvent.press(addStockButton);
      });

      await waitFor(() => {
        expect(getByTestId('stock-movement-form')).toBeTruthy();
      });

      // Also open custom movement form
      const addMovementButton = getByTestId('add-movement');
      act(() => {
        fireEvent.press(addMovementButton);
      });

      await waitFor(() => {
        expect(getByTestId('movement-form')).toBeTruthy();
      });

      // Type in unit cost
      const unitCostInput = getByDisplayValue('');
      act(() => {
        fireEvent.changeText(unitCostInput, '45.75');
      });

      // Submit movement
      const submitButton = getByTestId('submit-movement');
      act(() => {
        fireEvent.press(submitButton);
      });

      // Should handle multiple forms and price inputs without conflicts
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should recover gracefully from validation errors', async () => {
      const onValueChange = jest.fn();

      const { getByDisplayValue } = render(
        <TestWrapper>
          <PriceInput label="Price" value="" onValueChange={onValueChange} />
        </TestWrapper>
      );

      const input = getByDisplayValue('');

      // Type invalid values
      act(() => {
        fireEvent.changeText(input, 'invalid');
        fireEvent.changeText(input, '12.34.56');
        fireEvent.changeText(input, '---');
      });

      // Then type valid value
      act(() => {
        fireEvent.changeText(input, '123.45');
      });

      // Should recover and work normally
      expect(onValueChange).toHaveBeenCalledWith('123.45', 123.45);
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('Maximum update depth exceeded')
      );
    });

    it('should handle component unmounting and remounting', async () => {
      const TestComponent = ({ show }: { show: boolean }) => (
        <TestWrapper>
          {show && (
            <div>
              <PriceInput label="Price" value="100" onValueChange={() => {}} />
              <ProductMovementHistory product={mockProduct} />
            </div>
          )}
        </TestWrapper>
      );

      const { rerender } = render(<TestComponent show={true} />);

      // Unmount
      rerender(<TestComponent show={false} />);

      // Remount
      rerender(<TestComponent show={true} />);

      // Should handle mounting/unmounting without errors
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance with many price inputs', async () => {
      const ManyInputsForm = () => {
        const [values, setValues] = React.useState(
          Array.from({ length: 20 }, () => '')
        );

        const updateValue = (index: number, value: string) => {
          setValues((prev) => {
            const newValues = [...prev];
            newValues[index] = value;
            return newValues;
          });
        };

        return (
          <TestWrapper>
            <div testID="many-inputs">
              {values.map((value, index) => (
                <PriceInput
                  key={index}
                  label={`Price ${index + 1}`}
                  value={value}
                  onValueChange={(val) => updateValue(index, val)}
                />
              ))}
            </div>
          </TestWrapper>
        );
      };

      const startTime = performance.now();

      const { getByTestId, getAllByDisplayValue } = render(<ManyInputsForm />);

      const renderTime = performance.now() - startTime;

      // Should render quickly even with many inputs
      expect(renderTime).toBeLessThan(200);
      expect(getByTestId('many-inputs')).toBeTruthy();

      const inputs = getAllByDisplayValue('');
      expect(inputs).toHaveLength(20);

      // Update several inputs
      const updateStartTime = performance.now();

      act(() => {
        fireEvent.changeText(inputs[0], '100');
        fireEvent.changeText(inputs[5], '200');
        fireEvent.changeText(inputs[10], '300');
        fireEvent.changeText(inputs[15], '400');
      });

      const updateTime = performance.now() - updateStartTime;

      // Updates should be fast
      expect(updateTime).toBeLessThan(50);
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe('Real User Interaction Patterns', () => {
    it('should handle typical user behavior patterns', async () => {
      const ProductForm = () => {
        const [product, setProduct] = React.useState({
          name: '',
          price: '',
          cost: '',
          description: '',
        });

        return (
          <TestWrapper>
            <div testID="realistic-form">
              <input
                testID="name-input"
                value={product.name}
                onChange={(e) =>
                  setProduct((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Product Name"
              />

              <PriceInput
                label="Selling Price"
                value={product.price}
                onValueChange={(value) =>
                  setProduct((prev) => ({ ...prev, price: value }))
                }
              />

              <PriceInput
                label="Cost Price"
                value={product.cost}
                onValueChange={(value) =>
                  setProduct((prev) => ({ ...prev, cost: value }))
                }
              />

              <textarea
                testID="description-input"
                value={product.description}
                onChange={(e) =>
                  setProduct((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Description"
              />

              <ProductMovementHistory product={mockProduct} compact={true} />
            </div>
          </TestWrapper>
        );
      };

      const { getByTestId, getByDisplayValue } = render(<ProductForm />);

      // Simulate realistic user behavior: typing, pausing, correcting, etc.
      const nameInput = getByTestId('name-input');
      const priceInput = getByDisplayValue(''); // First empty input
      const inputs = getAllByDisplayValue('');
      const costInput = inputs[1]; // Second empty input

      // User types product name
      act(() => {
        fireEvent.changeText(nameInput, 'Wireless Headphones');
      });

      // User starts typing price, makes mistake, corrects it
      act(() => {
        fireEvent.changeText(priceInput, '15');
        fireEvent.changeText(priceInput, '150');
        fireEvent.changeText(priceInput, '1500'); // Too much
        fireEvent.changeText(priceInput, '150'); // Corrects
        fireEvent.changeText(priceInput, '150.00'); // Adds decimals
      });

      // User switches to cost field
      act(() => {
        fireEvent.changeText(costInput, '75');
        fireEvent.changeText(costInput, '75.50');
      });

      // User goes back to price to adjust
      act(() => {
        fireEvent.changeText(priceInput, '149.99');
      });

      // Should handle realistic interaction patterns without issues
      expect(console.error).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
    });
  });
});
