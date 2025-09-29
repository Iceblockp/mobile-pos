import { useState, useEffect, useRef, useCallback } from 'react';
import { useCurrencyFormatter } from '@/context/CurrencyContext';

// Custom debounce hook for price inputs
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Hook for components that need to manage price state
export const usePriceState = (initialValue: number = 0) => {
  const { formatPrice } = useCurrencyFormatter();
  const [numericValue, setNumericValue] = useState(initialValue);
  const [stringValue, setStringValue] = useState(() =>
    formatPrice(initialValue)
  );

  // Stable update function that doesn't cause re-renders
  const updateValue = useCallback((value: string, numeric: number) => {
    setStringValue(value);
    setNumericValue(numeric);
  }, []);

  // Stable numeric setter
  const setNumericValueDirectly = useCallback(
    (value: number) => {
      const formatted = formatPrice(value);
      setNumericValue(value);
      setStringValue(formatted);
    },
    [formatPrice]
  );

  // Initialize only when initialValue actually changes
  const prevInitialValue = useRef(initialValue);
  useEffect(() => {
    if (prevInitialValue.current !== initialValue) {
      prevInitialValue.current = initialValue;
      setNumericValueDirectly(initialValue);
    }
  }, [initialValue, setNumericValueDirectly]);

  return {
    numericValue,
    stringValue,
    updateValue,
    setNumericValue: setNumericValueDirectly,
  };
};

// Hook for detecting infinite loops in price inputs
export const usePriceInputPerformanceMonitor = (inputName: string) => {
  const lastValueRef = useRef<string>('');
  const changeCountRef = useRef(0);
  const lastChangeTimeRef = useRef(Date.now());

  const trackValueChange = useCallback(
    (newValue: string) => {
      const now = Date.now();

      // Only count as a change if value actually changed
      if (newValue !== lastValueRef.current) {
        lastValueRef.current = newValue;
        changeCountRef.current++;

        // Reset counter every second
        if (now - lastChangeTimeRef.current > 1000) {
          changeCountRef.current = 1;
          lastChangeTimeRef.current = now;
        }

        // Warn if too many changes per second
        if (changeCountRef.current > 20) {
          console.warn(
            `High frequency value changes detected in ${inputName}: ${changeCountRef.current} changes per second`
          );
        }
      }
    },
    [inputName]
  );

  return {
    trackValueChange,
    getChangeCount: () => changeCountRef.current,
  };
};
