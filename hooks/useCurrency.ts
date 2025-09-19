import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { currencySettingsService } from '@/services/currencySettingsService';
import { CurrencySettings, CurrencyManager } from '@/services/currencyManager';
import {
  useCurrencyContext,
  useCurrencyFormatter as useContextCurrencyFormatter,
} from '@/context/CurrencyContext';

// Query keys for currency-related queries (kept for backward compatibility)
export const currencyQueryKeys = {
  settings: ['currency', 'settings'] as const,
  predefined: ['currency', 'predefined'] as const,
  info: ['currency', 'info'] as const,
};

// Enhanced hook to get current currency settings (now uses context)
export const useCurrency = () => {
  const { currentCurrency, isLoading, error } = useCurrencyContext();

  return {
    data: currentCurrency,
    isLoading,
    error,
    isSuccess: !isLoading && !error && currentCurrency !== null,
    isError: !!error,
  };
};

// Enhanced hook to get predefined currencies
export const usePredefinedCurrencies = () => {
  const { getAllAvailableCurrencies } = useCurrencyContext();

  return useQuery({
    queryKey: currencyQueryKeys.predefined,
    queryFn: async () => {
      const currencies = await getAllAvailableCurrencies();
      return currencies.predefined;
    },
    staleTime: Infinity, // Predefined currencies never change
    gcTime: Infinity,
  });
};

// Enhanced hook to get currency info for display
export const useCurrencyInfo = () => {
  const { getCurrencyInfo, currentCurrency, isLoading } = useCurrencyContext();

  return {
    data: currentCurrency ? getCurrencyInfo() : null,
    isLoading,
    isSuccess: !isLoading && currentCurrency !== null,
  };
};

// Enhanced hook for currency mutations (now uses context)
export const useCurrencyMutations = () => {
  const queryClient = useQueryClient();
  const {
    updateCurrency: contextUpdateCurrency,
    resetToDefault: contextResetToDefault,
  } = useCurrencyContext();

  const updateCurrency = useMutation({
    mutationFn: (currency: CurrencySettings) => contextUpdateCurrency(currency),
    onSuccess: () => {
      // Invalidate all currency-related queries
      queryClient.invalidateQueries({ queryKey: ['currency'] });
      // Also invalidate any price-related queries that might be affected
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });

  const resetToDefault = useMutation({
    mutationFn: () => contextResetToDefault(),
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

// Enhanced hook for currency formatting utilities (now uses context)
export const useCurrencyFormatter = () => {
  // Use the context formatter but maintain backward compatibility
  return useContextCurrencyFormatter();
};

// Enhanced hook for price input validation with real-time feedback
export const usePriceInput = (initialValue: string = '') => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [numericValue, setNumericValue] = useState<number>(0);
  const { validatePriceInput, parsePrice, formatPrice } =
    useCurrencyFormatter();

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

  const setNumericValueDirectly = useCallback(
    (num: number) => {
      const formatted = formatPrice(num);
      setValue(formatted);
      setNumericValue(num);
      setError(null);
    },
    [formatPrice]
  );

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

// Enhanced context hook for currency initialization (now uses context)
export const useCurrencyInitialization = () => {
  const { isInitialized, error } = useCurrencyContext();

  return {
    isInitialized,
    initializationError: error,
  };
};

// Enhanced hook for currency selection with validation
export const useCurrencySelection = () => {
  const [selectedCurrency, setSelectedCurrency] =
    useState<CurrencySettings | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { getAllAvailableCurrencies } = useCurrencyContext();
  const { updateCurrency } = useCurrencyMutations();

  const selectPredefinedCurrency = useCallback(
    async (currencyCode: string) => {
      try {
        const currencies = await getAllAvailableCurrencies();
        if (currencies.predefined[currencyCode]) {
          const currency = currencies.predefined[currencyCode];
          setSelectedCurrency(currency);
          setValidationErrors([]);
          return currency;
        }
      } catch (error) {
        console.error('Failed to get predefined currencies:', error);
      }
      return null;
    },
    [getAllAvailableCurrencies]
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
// New enhanced hooks for better functionality

// Hook for managing custom currencies
export const useCustomCurrencyManagement = () => {
  const { customCurrencies, saveCustomCurrency, deleteCustomCurrency } =
    useCurrencyContext();
  const queryClient = useQueryClient();

  const createCustomCurrency = useMutation({
    mutationFn: (currency: CurrencySettings) => saveCustomCurrency(currency),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currency'] });
    },
  });

  const removeCustomCurrency = useMutation({
    mutationFn: (currencyCode: string) => deleteCustomCurrency(currencyCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currency'] });
    },
  });

  return {
    customCurrencies,
    createCustomCurrency,
    removeCustomCurrency,
    isCreating: createCustomCurrency.isPending,
    isRemoving: removeCustomCurrency.isPending,
  };
};

// Hook for currency performance optimization
export const useOptimizedCurrencyFormatter = () => {
  const { formatPrice, parsePrice, currentCurrency } = useCurrencyFormatter();

  // Memoized formatters for better performance
  const memoizedFormatPrice = useCallback(
    (amount: number) => formatPrice(amount),
    [currentCurrency?.code, currentCurrency?.symbol, currentCurrency?.decimals]
  );

  const memoizedParsePrice = useCallback(
    (priceString: string) => parsePrice(priceString),
    [
      currentCurrency?.code,
      currentCurrency?.decimalSeparator,
      currentCurrency?.thousandSeparator,
    ]
  );

  return {
    formatPrice: memoizedFormatPrice,
    parsePrice: memoizedParsePrice,
    currentCurrency,
  };
};

// Hook for currency analytics and reporting
export const useCurrencyAnalytics = () => {
  const { currentCurrency, customCurrencies } = useCurrencyContext();

  const getCurrencyStats = useCallback(() => {
    return {
      currentCurrency: currentCurrency?.name || 'None',
      totalCustomCurrencies: customCurrencies.length,
      usesDecimals: currentCurrency?.decimals
        ? currentCurrency.decimals > 0
        : false,
      symbolPosition: currentCurrency?.symbolPosition || 'before',
    };
  }, [currentCurrency, customCurrencies]);

  const getRecentlyUsedCustomCurrencies = useCallback(() => {
    return customCurrencies
      .filter((c) => c.lastUsed)
      .sort(
        (a, b) =>
          new Date(b.lastUsed!).getTime() - new Date(a.lastUsed!).getTime()
      )
      .slice(0, 5);
  }, [customCurrencies]);

  return {
    getCurrencyStats,
    getRecentlyUsedCustomCurrencies,
  };
};

// Hook for currency error handling
export const useCurrencyErrorHandler = () => {
  const { error } = useCurrencyContext();
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (error && error !== lastError) {
      setLastError(error);
      console.error('Currency system error:', error);
    }
  }, [error, lastError]);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  return {
    error: lastError,
    hasError: !!lastError,
    clearError,
  };
};
