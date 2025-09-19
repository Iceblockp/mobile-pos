import React, { useState, useCallback, useEffect } from 'react';
import {
  PriceInput,
  SimplePriceInput,
  StandardPriceInputProps,
} from './PriceInput';

// Custom hook for debounced price input
const useDebouncedPriceInput = (
  initialValue: string,
  onDebouncedChange: (value: string, numericValue: number) => void,
  delay: number = 300
) => {
  const [displayValue, setDisplayValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  // Update display value immediately for responsive UI
  const handleImmediateChange = useCallback(
    (value: string, numericValue: number) => {
      setDisplayValue(value);
    },
    []
  );

  // Debounce the actual value change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (displayValue !== debouncedValue) {
        setDebouncedValue(displayValue);
        // Parse the numeric value when debounced
        const numericValue =
          parseFloat(displayValue.replace(/[^0-9.-]/g, '')) || 0;
        onDebouncedChange(displayValue, numericValue);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [displayValue, debouncedValue, onDebouncedChange, delay]);

  // Update display value when external value changes
  useEffect(() => {
    if (initialValue !== displayValue) {
      setDisplayValue(initialValue);
      setDebouncedValue(initialValue);
    }
  }, [initialValue]);

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
