import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { PriceInput } from '@/components/PriceInput';
import { ProductMovementHistory } from '@/components/ProductMovementHistory';
import {
  PerformanceMonitor,
  usePerformanceMonitor,
  validatePerformance,
  InfiniteLoopTracker,
} from '@/utils/performanceMonitor';
import { CurrencyProvider } from '@/context/CurrencyContext';

// Mock providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <CurrencyProvider>{children}</CurrencyProvider>
);

// Test component with performance monitoring
const MonitoredPriceInput = ({ onValueChange, ...props }: any) => {
  const { renderCount } = usePerformanceMonitor('MonitoredPriceInput');

  return (
    <PriceInput
      {...props}
      onValueChange={(value, numeric) => {
        onValueChange?.(value, numeric);
      }}
    />
  );
};

describe('Price Input Performance Tests', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = PerformanceMonitor.getInstance();
    monitor.clearStats();
    InfiniteLoopTracker.clearErrors();
  });

  describe('Render Performance', () => {
    it('should not exceed maximum render count during normal usage', async () => {
      const onValueChange = jest.fn();

      const { getByDisplayValue } = render(
        <TestWrapper>
          <MonitoredPriceInput
            label="Test Price"
            value=""
            onValueChange={onValueChange}
          />
        </TestWrapper>
      );

      const input = getByDisplayValue('');

      // Simulate normal typing
      act(() => {
        fireEvent.changeText(input, '1');
        fireEvent.changeText(input, '12');
        fireEvent.changeText(input, '123');
        fireEvent.changeText(input, '123.45');
      });

      // Check render count is reasonable
      const isWithinLimits = validatePerformance.checkRenderCount(
        'MonitoredPriceInput',
        20
      );
      expect(isWithinLimits).toBe(true);
    });

    it('should maintain good render performance during rapid typing', async () => {
      const onValueChange = jest.fn();

      const { getByDisplayValue } = render(
        <TestWrapper>
          <MonitoredPriceInput
            label="Test Price"
            value=""
            onValueChange={onValueChange}
          />
        </TestWrapper>
      );

      const input = getByDisplayValue('');

      // Simulate rapid typing
      const startTime = performance.now();

      act(() => {
        for (let i = 0; i < 10; i++) {
          fireEvent.changeText(input, i.toString());
        }
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time (less than 100ms)
      expect(totalTime).toBeLessThan(100);

      // Check render performance
      const hasGoodPerformance = validatePerformance.checkRenderPerformance(
        'MonitoredPriceInput',
        50
      );
      expect(hasGoodPerformance).toBe(true);
    });

    it('should not cause infinite loops during prop changes', () => {
      const onValueChange = jest.fn();

      const { rerender } = render(
        <TestWrapper>
          <MonitoredPriceInput
            label="Test Price"
            value="100"
            onValueChange={onValueChange}
          />
        </TestWrapper>
      );

      // Rapidly change props
      for (let i = 0; i < 20; i++) {
        rerender(
          <TestWrapper>
            <MonitoredPriceInput
              label="Test Price"
              value={i.toString()}
              onValueChange={onValueChange}
            />
          </TestWrapper>
        );
      }

      // Should not exceed reasonable render count
      const stats = monitor.getRenderStats('MonitoredPriceInput');
      expect(stats.totalRenders).toBeLessThan(50);
    });
  });

  describe('Memory Performance', () => {
    it('should not cause memory leaks during extended usage', async () => {
      const onValueChange = jest.fn();

      const { getByDisplayValue, rerender } = render(
        <TestWrapper>
          <MonitoredPriceInput
            label="Test Price"
            value=""
            onValueChange={onValueChange}
          />
        </TestWrapper>
      );

      // Simulate extended usage
      for (let i = 0; i < 100; i++) {
        rerender(
          <TestWrapper>
            <MonitoredPriceInput
              label="Test Price"
              value={Math.random().toString()}
              onValueChange={onValueChange}
            />
          </TestWrapper>
        );
      }

      // Check memory stability
      const memoryStable = validatePerformance.checkMemoryStability();
      expect(memoryStable).toBe(true);
    });

    it('should handle multiple price inputs without memory issues', () => {
      const inputs = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        value: '',
        onValueChange: jest.fn(),
      }));

      const { rerender } = render(
        <TestWrapper>
          <div>
            {inputs.map((input) => (
              <MonitoredPriceInput
                key={input.id}
                label={`Price ${input.id}`}
                value={input.value}
                onValueChange={input.onValueChange}
              />
            ))}
          </div>
        </TestWrapper>
      );

      // Update all inputs multiple times
      for (let round = 0; round < 10; round++) {
        const updatedInputs = inputs.map((input) => ({
          ...input,
          value: (Math.random() * 1000).toFixed(2),
        }));

        rerender(
          <TestWrapper>
            <div>
              {updatedInputs.map((input) => (
                <MonitoredPriceInput
                  key={input.id}
                  label={`Price ${input.id}`}
                  value={input.value}
                  onValueChange={input.onValueChange}
                />
              ))}
            </div>
          </TestWrapper>
        );
      }

      // Memory should remain stable
      const memoryStats = monitor.getMemoryStats();
      expect(memoryStats.isIncreasing).toBe(false);
    });
  });

  describe('ProductMovementHistory Performance', () => {
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

    it('should render ProductMovementHistory without performance issues', () => {
      const startTime = performance.now();

      const { getByText } = render(
        <TestWrapper>
          <ProductMovementHistory product={mockProduct} />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render quickly (less than 50ms)
      expect(renderTime).toBeLessThan(50);
      expect(getByText('Stock Movement')).toBeTruthy();
    });

    it('should handle multiple ProductMovementHistory components efficiently', () => {
      const products = Array.from({ length: 5 }, (_, i) => ({
        ...mockProduct,
        id: i + 1,
        name: `Product ${i + 1}`,
      }));

      const startTime = performance.now();

      const { getAllByText } = render(
        <TestWrapper>
          <div>
            {products.map((product) => (
              <ProductMovementHistory key={product.id} product={product} />
            ))}
          </div>
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render all components quickly (less than 200ms)
      expect(renderTime).toBeLessThan(200);
      expect(getAllByText('Stock Movement')).toHaveLength(5);
    });

    it('should maintain performance during modal interactions', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ProductMovementHistory product={mockProduct} />
        </TestWrapper>
      );

      const historyButton = getByText('History');

      const startTime = performance.now();

      act(() => {
        fireEvent.press(historyButton);
      });

      const endTime = performance.now();
      const interactionTime = endTime - startTime;

      // Modal should open quickly (less than 20ms)
      expect(interactionTime).toBeLessThan(20);
    });
  });

  describe('Error Detection', () => {
    it('should detect and track infinite loop errors', () => {
      // Simulate an infinite loop error
      InfiniteLoopTracker.trackError(
        'TestComponent',
        'Maximum update depth exceeded',
        'Error stack trace...'
      );

      const errors = InfiniteLoopTracker.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].component).toBe('TestComponent');
      expect(errors[0].error).toBe('Maximum update depth exceeded');
    });

    it('should limit error storage to prevent memory issues', () => {
      // Add many errors
      for (let i = 0; i < 60; i++) {
        InfiniteLoopTracker.trackError(
          'TestComponent',
          `Error ${i}`,
          `Stack trace ${i}`
        );
      }

      const errors = InfiniteLoopTracker.getErrors();

      // Should only keep last 50 errors
      expect(errors).toHaveLength(50);
      expect(errors[0].error).toBe('Error 10'); // First 10 should be removed
    });

    it('should filter errors by component', () => {
      InfiniteLoopTracker.trackError('ComponentA', 'Error A1');
      InfiniteLoopTracker.trackError('ComponentB', 'Error B1');
      InfiniteLoopTracker.trackError('ComponentA', 'Error A2');

      const errorsA = InfiniteLoopTracker.getErrorsForComponent('ComponentA');
      const errorsB = InfiniteLoopTracker.getErrorsForComponent('ComponentB');

      expect(errorsA).toHaveLength(2);
      expect(errorsB).toHaveLength(1);
      expect(errorsA[0].error).toBe('Error A1');
      expect(errorsB[0].error).toBe('Error B1');
    });
  });

  describe('Performance Validation', () => {
    it('should run all performance checks successfully', () => {
      // Simulate some renders
      monitor.trackRender('TestComponent');
      monitor.trackRender('TestComponent');
      monitor.trackRender('TestComponent');

      const results = validatePerformance.runAllChecks('TestComponent');

      expect(results.renderCount).toBe(true);
      expect(results.memoryStability).toBe(true);
      expect(results.renderPerformance).toBe(true);
      expect(results.overall).toBe(true);
    });

    it('should fail validation for excessive renders', () => {
      // Simulate excessive renders
      for (let i = 0; i < 150; i++) {
        monitor.trackRender('ExcessiveComponent');
      }

      const renderCountCheck = validatePerformance.checkRenderCount(
        'ExcessiveComponent',
        100
      );
      expect(renderCountCheck).toBe(false);
    });
  });

  describe('Real-world Performance Scenarios', () => {
    it('should handle form with multiple price inputs efficiently', async () => {
      const formData = {
        price: '',
        cost: '',
        discount: '',
        tax: '',
      };

      const setFormData = jest.fn();

      const { getAllByDisplayValue } = render(
        <TestWrapper>
          <div>
            <PriceInput
              label="Price"
              value={formData.price}
              onValueChange={(value) =>
                setFormData({ ...formData, price: value })
              }
            />
            <PriceInput
              label="Cost"
              value={formData.cost}
              onValueChange={(value) =>
                setFormData({ ...formData, cost: value })
              }
            />
            <PriceInput
              label="Discount"
              value={formData.discount}
              onValueChange={(value) =>
                setFormData({ ...formData, discount: value })
              }
            />
            <PriceInput
              label="Tax"
              value={formData.tax}
              onValueChange={(value) =>
                setFormData({ ...formData, tax: value })
              }
            />
          </div>
        </TestWrapper>
      );

      const inputs = getAllByDisplayValue('');

      // Simulate user filling out form
      act(() => {
        fireEvent.changeText(inputs[0], '100.00');
        fireEvent.changeText(inputs[1], '75.50');
        fireEvent.changeText(inputs[2], '10.00');
        fireEvent.changeText(inputs[3], '8.25');
      });

      // Should handle multiple inputs without performance issues
      expect(setFormData).toHaveBeenCalled();
    });

    it('should maintain performance during validation errors', async () => {
      const onValueChange = jest.fn();

      const { getByDisplayValue } = render(
        <TestWrapper>
          <PriceInput
            label="Test Price"
            value=""
            onValueChange={onValueChange}
          />
        </TestWrapper>
      );

      const input = getByDisplayValue('');

      // Simulate typing invalid values
      act(() => {
        fireEvent.changeText(input, 'abc');
        fireEvent.changeText(input, '12.34.56');
        fireEvent.changeText(input, '---');
        fireEvent.changeText(input, '100.00'); // Valid value
      });

      // Should handle validation errors without performance degradation
      expect(onValueChange).toHaveBeenCalledTimes(4);
    });
  });
});
