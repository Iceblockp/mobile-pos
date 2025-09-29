import React, { useState, useCallback, useEffect } from 'react';
import {
  PriceInput,
  SimplePriceInput,
  StandardPriceInputProps,
} from './PriceInput';
import { useDebounce } from '@/hooks/usePriceInputHooks';

// Custom hook for debounced price input
const useDebouncedPriceInput = (
  initialValue: string,
  onDebouncedChange: (value: string, numericValue: number) => void,
  delay: number = 300
) => {
  const [displayValue, setDisplayValue] = useState(initialValue);
  const debouncedValue = useDebounce(displayValue, delay);

  // Update display value immediately for responsive UI
  const handleImmediateChange = useCallback((value: string) => {
    setDisplayValue(value);
  }, []);

  // Call the debounced change handler when debounced value changes
  useEffect(() => {
    if (debouncedValue !== initialValue) {
      // Parse the numeric value when debounced
      const numericValue =
        parseFloat(debouncedValue.replace(/[^0-9.-]/g, '')) || 0;
      onDebouncedChange(debouncedValue, numericValue);
    }
  }, [debouncedValue, onDebouncedChange, initialValue]);

  // Update display value when external value changes
  useEffect(() => {
    if (initialValue !== displayValue) {
      setDisplayValue(initialValue);
    }
  }, [initialValue, displayValue]);

  return {
    displayValue,
    handleImmediateChange,
  };
};

interface DebouncedPriceInputProps
  extends Omit<StandardPriceInputProps, 'onValueChange'> {
  label: string;
  required?: boolean;
  showCurrencyHint?: boolean;
  onDebouncedChange: (value: string, numericValue: number) => void;
  debounceDelay?: number;
}

export const DebouncedPriceInput: React.FC<DebouncedPriceInputProps> = ({
  value,
  onDebouncedChange,
  debounceDelay = 300,
  ...props
}) => {
  const { displayValue, handleImmediateChange } = useDebouncedPriceInput(
    value,
    onDebouncedChange,
    debounceDelay
  );

  return (
    <PriceInput
      {...props}
      value={displayValue}
      onValueChange={handleImmediateChange}
    />
  );
};

interface DebouncedSimplePriceInputProps
  extends Omit<StandardPriceInputProps, 'onValueChange'> {
  onDebouncedChange: (value: string, numericValue: number) => void;
  debounceDelay?: number;
}

export const DebouncedSimplePriceInput: React.FC<
  DebouncedSimplePriceInputProps
> = ({ value, onDebouncedChange, debounceDelay = 300, ...props }) => {
  const { displayValue, handleImmediateChange } = useDebouncedPriceInput(
    value,
    onDebouncedChange,
    debounceDelay
  );

  return (
    <SimplePriceInput
      {...props}
      value={displayValue}
      onValueChange={handleImmediateChange}
    />
  );
};

// Export the hook for custom implementations
export { useDebouncedPriceInput };
