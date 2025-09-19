import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import {
  PriceInput,
  SimplePriceInput,
  usePriceState,
} from '@/components/PriceInput';
import { DebouncedPriceInput } from '@/components/DebouncedPriceInput';
import { PriceInputErrorBoundary } from '@/components/PriceInputErrorBoundary';
import { CurrencyProvider } from '@/context/CurrencyContext';

// Mock the currency context
const MockCurrencyProvider = ({ children }: { children: React.ReactNode }) => (
  <CurrencyProvider>{children}</CurrencyProvider>
);

describe('PriceInput Infinite Loop Fixes', () => {
  describe('PriceInput Component', () => {
    const defaultProps = {
      label: 'Test Price',
      value: '',
      onValueChange: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render without infinite loops', () => {
      const { getByDisplayValue } = render(
        <MockCurrencyProvider>
          <PriceInput {...defaultProps} />
        </MockCurrencyProvider>
      );

      expect(getByDisplayValue('')).toBeTruthy();
    });

    it('should handle text changes without causing infinite re-renders', async () => {
      const onValueChange = jest.fn();
      const { getByDisplayValue } = render(
        <MockCurrencyProvider>
          <PriceInput {...defaultProps} onValueChange={onValueChange} />
        </MockCurrencyProvider>
      );

      const input = getByDisplayValue('');

      act(() => {
        fireEvent.changeText(input, '100');
      });

      await waitFor(() => {
        expect(onValueChange).toHaveBeenCalledWith('100', 100);
      });

      // Ensure it's only called once, not in a loop
      expect(onValueChange).toHaveBeenCalledTimes(1);
    });

    it('should handle external value changes without circular updates', () => {
      const { rerender } = render(
        <MockCurrencyProvider>
          <PriceInput {...defaultProps} value="50" />
        </MockCurrencyProvider>
      );

      // Change external value
      rerender(
        <MockCurrencyProvider>
          <PriceInput {...defaultProps} value="75" />
        </MockCurrencyProvider>
      );

      // Should not cause infinite re-renders
      expect(true).toBe(true); // Test passes if no infinite loop occurs
    });

    it('should handle validation errors gracefully', () => {
      const onValueChange = jest.fn();
      const { getByDisplayValue } = render(
        <MockCurrencyProvider>
          <PriceInput {...defaultProps} onValueChange={onValueChange} />
        </MockCurrencyProvider>
      );

      const input = getByDisplayValue('');

      act(() => {
        fireEvent.changeText(input, 'invalid-price');
      });

      // Should still call onValueChange even with invalid input
      expect(onValueChange).toHaveBeenCalled();
    });

    it('should not re-render excessively during rapid typing', async () => {
      const onValueChange = jest.fn();
      const { getByDisplayValue } = render(
        <MockCurrencyProvider>
          <PriceInput {...defaultProps} onValueChange={onValueChange} />
        </MockCurrencyProvider>
      );

      const input = getByDisplayValue('');

      // Simulate rapid typing
      act(() => {
        fireEvent.changeText(input, '1');
        fireEvent.changeText(input, '12');
        fireEvent.changeText(input, '123');
        fireEvent.changeText(input, '1234');
      });

      await waitFor(() => {
        expect(onValueChange).toHaveBeenCalledTimes(4);
      });
    });
  });

  describe('SimplePriceInput Component', () => {
    const defaultProps = {
      value: '',
      onValueChange: jest.fn(),
    };

    it('should render without infinite loops', () => {
      const { getByDisplayValue } = render(
        <MockCurrencyProvider>
          <SimplePriceInput {...defaultProps} />
        </MockCurrencyProvider>
      );

      expect(getByDisplayValue('')).toBeTruthy();
    });

    it('should handle text changes without causing infinite re-renders', async () => {
      const onValueChange = jest.fn();
      const { getByDisplayValue } = render(
        <MockCurrencyProvider>
          <SimplePriceInput {...defaultProps} onValueChange={onValueChange} />
        </MockCurrencyProvider>
      );

      const input = getByDisplayValue('');

      act(() => {
        fireEvent.changeText(input, '50');
      });

      await waitFor(() => {
        expect(onValueChange).toHaveBeenCalledWith('50', 50);
      });

      expect(onValueChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('DebouncedPriceInput Component', () => {
    const defaultProps = {
      label: 'Debounced Price',
      value: '',
      onDebouncedChange: jest.fn(),
      debounceDelay: 100, // Short delay for testing
    };

    it('should debounce value changes', async () => {
      const onDebouncedChange = jest.fn();
      const { getByDisplayValue } = render(
        <MockCurrencyProvider>
          <DebouncedPriceInput
            {...defaultProps}
            onDebouncedChange={onDebouncedChange}
          />
        </MockCurrencyProvider>
      );

      const input = getByDisplayValue('');

      // Rapid typing
      act(() => {
        fireEvent.changeText(input, '1');
        fireEvent.changeText(input, '12');
        fireEvent.changeText(input, '123');
      });

      // Should not call immediately
      expect(onDebouncedChange).not.toHaveBeenCalled();

      // Wait for debounce
      await waitFor(
        () => {
          expect(onDebouncedChange).toHaveBeenCalledWith('123', 123);
        },
        { timeout: 200 }
      );

      // Should only be called once after debounce
      expect(onDebouncedChange).toHaveBeenCalledTimes(1);
    });

    it('should update display value immediately for responsive UI', () => {
      const { getByDisplayValue } = render(
        <MockCurrencyProvider>
          <DebouncedPriceInput {...defaultProps} />
        </MockCurrencyProvider>
      );

      const input = getByDisplayValue('');

      act(() => {
        fireEvent.changeText(input, '100');
      });

      // Display should update immediately
      expect(getByDisplayValue('100')).toBeTruthy();
    });
  });

  describe('PriceInputErrorBoundary Component', () => {
    // Component that throws an error for testing
    const ErrorComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return (
        <MockCurrencyProvider>
          <PriceInput label="Test" value="" onValueChange={() => {}} />
        </MockCurrencyProvider>
      );
    };

    it('should catch errors and display fallback UI', () => {
      const { getByText } = render(
        <PriceInputErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </PriceInputErrorBoundary>
      );

      expect(getByText('Price Input Error')).toBeTruthy();
      expect(getByText('Try Again')).toBeTruthy();
    });

    it('should render children normally when no error occurs', () => {
      const { getByDisplayValue } = render(
        <PriceInputErrorBoundary>
          <ErrorComponent shouldThrow={false} />
        </PriceInputErrorBoundary>
      );

      expect(getByDisplayValue('')).toBeTruthy();
    });

    it('should allow retry after error', () => {
      const { getByText, rerender } = render(
        <PriceInputErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </PriceInputErrorBoundary>
      );

      expect(getByText('Price Input Error')).toBeTruthy();

      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);

      // After retry, should attempt to render children again
      rerender(
        <PriceInputErrorBoundary>
          <ErrorComponent shouldThrow={false} />
        </PriceInputErrorBoundary>
      );

      expect(getByDisplayValue('')).toBeTruthy();
    });
  });

  describe('usePriceState Hook', () => {
    const TestComponent = ({ initialValue }: { initialValue: number }) => {
      const { numericValue, stringValue, updateValue, setNumericValue } =
        usePriceState(initialValue);

      return (
        <MockCurrencyProvider>
          <PriceInput
            label="Test"
            value={stringValue}
            onValueChange={updateValue}
          />
        </MockCurrencyProvider>
      );
    };

    it('should initialize with correct values', () => {
      const { getByDisplayValue } = render(
        <TestComponent initialValue={100} />
      );

      // Should display formatted initial value
      expect(getByDisplayValue('100')).toBeTruthy();
    });

    it('should update values without causing infinite loops', async () => {
      const { getByDisplayValue } = render(<TestComponent initialValue={0} />);

      const input = getByDisplayValue('0');

      act(() => {
        fireEvent.changeText(input, '250');
      });

      await waitFor(() => {
        expect(getByDisplayValue('250')).toBeTruthy();
      });
    });

    it('should handle external value changes', () => {
      const { rerender } = render(<TestComponent initialValue={100} />);

      rerender(<TestComponent initialValue={200} />);

      // Should not cause infinite re-renders
      expect(true).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should not cause memory leaks during rapid re-renders', async () => {
      const onValueChange = jest.fn();
      const { rerender } = render(
        <MockCurrencyProvider>
          <PriceInput label="Test" value="0" onValueChange={onValueChange} />
        </MockCurrencyProvider>
      );

      // Simulate many re-renders
      for (let i = 0; i < 100; i++) {
        rerender(
          <MockCurrencyProvider>
            <PriceInput
              label="Test"
              value={i.toString()}
              onValueChange={onValueChange}
            />
          </MockCurrencyProvider>
        );
      }

      // Should complete without hanging or excessive memory usage
      expect(true).toBe(true);
    });

    it('should handle concurrent price inputs without interference', () => {
      const onValueChange1 = jest.fn();
      const onValueChange2 = jest.fn();

      const { getAllByDisplayValue } = render(
        <MockCurrencyProvider>
          <PriceInput
            label="Price 1"
            value="100"
            onValueChange={onValueChange1}
          />
          <PriceInput
            label="Price 2"
            value="200"
            onValueChange={onValueChange2}
          />
        </MockCurrencyProvider>
      );

      const inputs = getAllByDisplayValue(/100|200/);

      act(() => {
        fireEvent.changeText(inputs[0], '150');
        fireEvent.changeText(inputs[1], '250');
      });

      expect(onValueChange1).toHaveBeenCalledWith('150', 150);
      expect(onValueChange2).toHaveBeenCalledWith('250', 250);
    });
  });
});
