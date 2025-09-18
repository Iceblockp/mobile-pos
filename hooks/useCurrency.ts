import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { currencySettingsService } from '@/services/currencySettingsService';
import { CurrencySettings, CurrencyManager } from '@/services/currencyManager';

// Query keys for currency-related queries
export const currencyQueryKeys = {
  settings: ['currency', 'settings'] as const,
  predefined: ['currency', 'predefined'] as const,
  info: ['currency', 'info'] as const,
};

// Hook to get current currency settings
export const useCurrency = () => {
  return useQuery({
    queryKey: currencyQueryKeys.settings,
    queryFn: () => currencySettingsService.getCurrentCurrency(),
    staleTime: 30 * 60 * 1000, // 30 minutes - currency settings rarely change
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};

// Hook to get predefined currencies
export const usePredefinedCurrencies = () => {
  return useQuery({
    queryKey: currencyQueryKeys.predefined,
    queryFn: () => CurrencyManager.getPredefinedCurrencies(),
    staleTime: Infinity, // Predefined currencies never change
    gcTime: Infinity,
  });
};

// Hook to get currency info for display
export const useCurrencyInfo = () => {
  return useQuery({
    queryKey: currencyQueryKeys.info,
    queryFn: () => currencySettingsService.getCurrencyInfo(),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
};

// Hook for currency mutations
export const useCurrencyMutations = () => {
  const queryClient = useQueryClient();

  const updateCurrency = useMutation({
    mutationFn: (currency: CurrencySettings) =>
      currencySettingsService.updateCurrency(currency),
    onSuccess: () => {
      // Invalidate all currency-related queries
      queryClient.invalidateQueries({ queryKey: ['currency'] });
      // Also invalidate any price-related queries that might be affected
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });

  const resetToDefault = useMutation({
    mutationFn: () => currencySettingsService.resetToDefault(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currency'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });

  const importCurrencySettings = useMutation({
    mutationFn: (currencyJson: string) =>
      currencySettingsService.importCurrencySettings(currencyJson),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currency'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });

  return {
    updateCurrency,
    resetToDefault,
    importCurrencySettings,
  };
};

// Hook for currency formatting utilities
export const useCurrencyFormatter = () => {
  const { data: currency } = useCurrency();

  const formatPrice = useCallback(
    (amount: number): string => {
      return currencySettingsService.formatPrice(amount);
    },
    [currency]
  );

  const parsePrice = useCallback(
    (priceString: string): number => {
      return currencySettingsService.parsePrice(priceString);
    },
    [currency]
  );

  const validatePriceInput = useCallback(
    (priceString: string) => {
      return currencySettingsService.validatePriceInput(priceString);
    },
    [currency]
  );

  const formatDiscount = useCallback(
    (originalPrice: number, discountedPrice: number) => {
      return currencySettingsService.formatDiscount(
        originalPrice,
        discountedPrice
      );
    },
    [currency]
  );

  const formatPriceRange = useCallback(
    (minPrice: number, maxPrice: number): string => {
      return currencySettingsService.formatPriceRange(minPrice, maxPrice);
    },
    [currency]
  );

  const usesDecimals = useCallback((): boolean => {
    return currencySettingsService.usesDecimals();
  }, [currency]);

  return {
    formatPrice,
    parsePrice,
    validatePriceInput,
    formatDiscount,
    formatPriceRange,
    usesDecimals,
    currency,
  };
};

// Hook for price input validation with real-time feedback
export const usePriceInput = (initialValue: string = '') => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [numericValue, setNumericValue] = useState<number>(0);
  const { validatePriceInput, parsePrice } = useCurrencyFormatter();

  // Use ref to track the last processed initial value to prevent unnecessary effects
  const lastInitialValueRef = useRef(initialValue);

  const handleChange = useCallback(
    (newValue: string) => {
      setValue(newValue);

      if (!newValue.trim()) {
        setError(null);
        setNumericValue(0);
        return;
      }

      const validation = validatePriceInput(newValue);
      if (validation.isValid) {
        setError(null);
        setNumericValue(validation.value || 0);
      } else {
        setError(validation.error || 'Invalid price');
        setNumericValue(parsePrice(newValue)); // Try to parse anyway for partial values
      }
    },
    [validatePriceInput, parsePrice]
  );

  const reset = useCallback(() => {
    setValue(initialValue);
    setError(null);
    setNumericValue(parsePrice(initialValue));
  }, [initialValue, parsePrice]);

  const setNumericValueDirectly = useCallback((num: number) => {
    const { formatPrice } = currencySettingsService;
    const formatted = formatPrice(num);
    setValue(formatted);
    setNumericValue(num);
    setError(null);
  }, []);

  // Initialize numeric value - only when initialValue actually changes
  useEffect(() => {
    if (initialValue !== lastInitialValueRef.current) {
      lastInitialValueRef.current = initialValue;
      if (initialValue) {
        handleChange(initialValue);
      }
    }
  }, [initialValue, handleChange]);

  return {
    value,
    error,
    numericValue,
    isValid: !error && value.trim().length > 0,
    onChange: handleChange,
    reset,
    setNumericValue: setNumericValueDirectly,
  };
};

// Context hook for currency initialization
export const useCurrencyInitialization = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(
    null
  );

  useEffect(() => {
    const initializeCurrency = async () => {
      try {
        await currencySettingsService.initialize();
        setIsInitialized(true);
        setInitializationError(null);
      } catch (error) {
        console.error('Failed to initialize currency settings:', error);
        setInitializationError(
          error instanceof Error ? error.message : 'Unknown error'
        );
        setIsInitialized(false);
      }
    };

    initializeCurrency();
  }, []);

  return {
    isInitialized,
    initializationError,
  };
};

// Hook for currency selection with validation
export const useCurrencySelection = () => {
  const [selectedCurrency, setSelectedCurrency] =
    useState<CurrencySettings | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { data: predefinedCurrencies } = usePredefinedCurrencies();
  const { updateCurrency } = useCurrencyMutations();

  const selectPredefinedCurrency = useCallback(
    (currencyCode: string) => {
      if (predefinedCurrencies && predefinedCurrencies[currencyCode]) {
        const currency = predefinedCurrencies[currencyCode];
        setSelectedCurrency(currency);
        setValidationErrors([]);
        return currency;
      }
      return null;
    },
    [predefinedCurrencies]
  );

  const setCustomCurrency = useCallback((currency: CurrencySettings) => {
    const { CurrencyValidator } = require('@/services/currencyManager');
    const errors = CurrencyValidator.validateCurrencySettings(currency);

    setValidationErrors(errors);
    if (errors.length === 0) {
      setSelectedCurrency(currency);
    }

    return errors.length === 0;
  }, []);

  const applyCurrency = useCallback(async () => {
    if (selectedCurrency && validationErrors.length === 0) {
      try {
        await updateCurrency.mutateAsync(selectedCurrency);
        return true;
      } catch (error) {
        console.error('Failed to apply currency:', error);
        return false;
      }
    }
    return false;
  }, [selectedCurrency, validationErrors, updateCurrency]);

  const reset = useCallback(() => {
    setSelectedCurrency(null);
    setValidationErrors([]);
  }, []);

  return {
    selectedCurrency,
    validationErrors,
    isValid: selectedCurrency !== null && validationErrors.length === 0,
    selectPredefinedCurrency,
    setCustomCurrency,
    applyCurrency,
    reset,
    isApplying: updateCurrency.isPending,
  };
};

// Hook for currency comparison and conversion utilities
export const useCurrencyUtils = () => {
  const { formatPrice } = useCurrencyFormatter();

  const compareAmounts = useCallback(
    (amount1: number, amount2: number) => {
      return {
        amount1: formatPrice(amount1),
        amount2: formatPrice(amount2),
        difference: formatPrice(Math.abs(amount1 - amount2)),
        percentage: amount2 !== 0 ? ((amount1 - amount2) / amount2) * 100 : 0,
        isHigher: amount1 > amount2,
        isEqual: Math.abs(amount1 - amount2) < 0.01, // Consider amounts equal if difference is less than 1 cent
      };
    },
    [formatPrice]
  );

  const calculatePercentage = useCallback((part: number, total: number) => {
    if (total === 0) return 0;
    return (part / total) * 100;
  }, []);

  const formatPercentage = useCallback(
    (percentage: number, decimals: number = 1) => {
      return `${percentage.toFixed(decimals)}%`;
    },
    []
  );

  return {
    compareAmounts,
    calculatePercentage,
    formatPercentage,
  };
};
