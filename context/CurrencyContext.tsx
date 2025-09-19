import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { CurrencySettings } from '@/services/currencyManager';
import { currencySettingsService } from '@/services/currencySettingsService';

interface CurrencyContextType {
  // Current state
  currentCurrency: CurrencySettings | null;
  customCurrencies: CurrencySettings[];
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

  // Actions
  updateCurrency: (currency: CurrencySettings) => Promise<void>;
  resetToDefault: () => Promise<void>;
  refreshCurrencies: () => Promise<void>;

  // Formatting utilities
  formatPrice: (amount: number) => string;
  parsePrice: (priceString: string) => number;
  validatePriceInput: (input: string) => {
    isValid: boolean;
    value?: number;
    error?: string;
  };

  // Custom currencies
  saveCustomCurrency: (currency: CurrencySettings) => Promise<void>;
  deleteCustomCurrency: (code: string) => Promise<void>;
  getAllAvailableCurrencies: () => Promise<{
    predefined: Record<string, CurrencySettings>;
    custom: CurrencySettings[];
  }>;

  // Utility functions
  usesDecimals: () => boolean;
  getCurrencyInfo: () => {
    code: string;
    name: string;
    symbol: string;
    example: string;
  };
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined
);

interface CurrencyProviderProps {
  children: ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({
  children,
}) => {
  const [currentCurrency, setCurrentCurrency] =
    useState<CurrencySettings | null>(null);
  const [customCurrencies, setCustomCurrencies] = useState<CurrencySettings[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize currency system
  const initializeCurrency = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Initialize the currency service
      await currencySettingsService.initialize();

      // Get current currency
      const currency = currencySettingsService.getCurrentCurrency();
      setCurrentCurrency(currency);

      // Get custom currencies
      const customCurrs = await currencySettingsService.getCustomCurrencies();
      setCustomCurrencies(customCurrs);

      setIsInitialized(true);
      console.log('Currency context initialized successfully');
    } catch (err) {
      console.error('Failed to initialize currency context:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to initialize currency'
      );
      setIsInitialized(false);

      // Set a default currency to prevent crashes
      try {
        const defaultCurrency = {
          code: 'MMK',
          symbol: 'K',
          name: 'Myanmar Kyat',
          decimals: 0,
          symbolPosition: 'after' as const,
          thousandSeparator: ',',
          decimalSeparator: '.',
        };
        setCurrentCurrency(defaultCurrency);
      } catch (fallbackError) {
        console.error('Failed to set fallback currency:', fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update currency
  const updateCurrency = useCallback(async (currency: CurrencySettings) => {
    try {
      setError(null);
      await currencySettingsService.updateCurrency(currency);
      setCurrentCurrency(currency);

      // Update last used timestamp if it's a custom currency
      if (currency.isCustom) {
        await currencySettingsService.updateCurrencyLastUsed(currency.code);
        // Refresh custom currencies to update the timestamp
        const updatedCustomCurrencies =
          await currencySettingsService.getCustomCurrencies();
        setCustomCurrencies(updatedCustomCurrencies);
      }

      console.log(`Currency updated to ${currency.name} (${currency.code})`);
    } catch (err) {
      console.error('Failed to update currency:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to update currency'
      );
      throw err;
    }
  }, []);

  // Reset to default currency
  const resetToDefault = useCallback(async () => {
    try {
      setError(null);
      await currencySettingsService.resetToDefault();
      const currency = currencySettingsService.getCurrentCurrency();
      setCurrentCurrency(currency);
      console.log('Currency reset to default');
    } catch (err) {
      console.error('Failed to reset currency:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset currency');
      throw err;
    }
  }, []);

  // Refresh currencies from storage
  const refreshCurrencies = useCallback(async () => {
    try {
      setError(null);

      // Sync with shop settings
      await currencySettingsService.syncWithShopSettings();

      // Get updated currency
      const currency = currencySettingsService.getCurrentCurrency();
      setCurrentCurrency(currency);

      // Get updated custom currencies
      const customCurrs = await currencySettingsService.getCustomCurrencies();
      setCustomCurrencies(customCurrs);

      console.log('Currencies refreshed');
    } catch (err) {
      console.error('Failed to refresh currencies:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to refresh currencies'
      );
    }
  }, []);

  // Formatting utilities
  const formatPrice = useCallback(
    (amount: number): string => {
      try {
        return currencySettingsService.formatPrice(amount);
      } catch (error) {
        console.warn('Failed to format price, using fallback:', error);
        // Fallback formatting
        if (currentCurrency) {
          if (currentCurrency.decimals === 0) {
            return `${Math.round(amount)} ${currentCurrency.symbol}`;
          } else {
            return `${currentCurrency.symbol}${amount.toFixed(
              currentCurrency.decimals
            )}`;
          }
        }
        return `${amount.toFixed(2)}`;
      }
    },
    [currentCurrency]
  );

  const parsePrice = useCallback(
    (priceString: string): number => {
      try {
        return currencySettingsService.parsePrice(priceString);
      } catch (error) {
        console.warn('Failed to parse price, using fallback:', error);
        // Fallback parsing - just extract numbers
        const cleaned = priceString.replace(/[^\d.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
    },
    [currentCurrency]
  );

  const validatePriceInput = useCallback(
    (input: string) => {
      try {
        return currencySettingsService.validatePriceInput(input);
      } catch (error) {
        console.warn('Failed to validate price input, using fallback:', error);
        // Fallback validation
        const cleaned = input.replace(/[^\d.-]/g, '');
        const parsed = parseFloat(cleaned);
        const isValid = !isNaN(parsed) && parsed >= 0;
        return {
          isValid,
          value: isValid ? parsed : 0,
          error: isValid ? undefined : 'Invalid price format',
        };
      }
    },
    [currentCurrency]
  );

  // Custom currency management
  const saveCustomCurrency = useCallback(async (currency: CurrencySettings) => {
    try {
      setError(null);
      await currencySettingsService.saveCustomCurrency(currency);

      // Refresh custom currencies
      const updatedCustomCurrencies =
        await currencySettingsService.getCustomCurrencies();
      setCustomCurrencies(updatedCustomCurrencies);

      console.log(`Custom currency ${currency.name} saved`);
    } catch (err) {
      console.error('Failed to save custom currency:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to save custom currency'
      );
      throw err;
    }
  }, []);

  const deleteCustomCurrency = useCallback(async (code: string) => {
    try {
      setError(null);
      await currencySettingsService.deleteCustomCurrency(code);

      // Refresh custom currencies
      const updatedCustomCurrencies =
        await currencySettingsService.getCustomCurrencies();
      setCustomCurrencies(updatedCustomCurrencies);

      console.log(`Custom currency ${code} deleted`);
    } catch (err) {
      console.error('Failed to delete custom currency:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to delete custom currency'
      );
      throw err;
    }
  }, []);

  const getAllAvailableCurrencies = useCallback(async () => {
    return await currencySettingsService.getAllAvailableCurrencies();
  }, []);

  // Utility functions
  const usesDecimals = useCallback((): boolean => {
    return currencySettingsService.usesDecimals();
  }, [currentCurrency]);

  const getCurrencyInfo = useCallback(() => {
    return currencySettingsService.getCurrencyInfo();
  }, [currentCurrency]);

  // Initialize on mount
  useEffect(() => {
    initializeCurrency();
  }, [initializeCurrency]);

  const contextValue: CurrencyContextType = {
    // State
    currentCurrency,
    customCurrencies,
    isLoading,
    error,
    isInitialized,

    // Actions
    updateCurrency,
    resetToDefault,
    refreshCurrencies,

    // Formatting utilities
    formatPrice,
    parsePrice,
    validatePriceInput,

    // Custom currencies
    saveCustomCurrency,
    deleteCustomCurrency,
    getAllAvailableCurrencies,

    // Utility functions
    usesDecimals,
    getCurrencyInfo,
  };

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
};

// Hook to use currency context
export const useCurrencyContext = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error(
      'useCurrencyContext must be used within a CurrencyProvider'
    );
  }
  return context;
};

// Error boundary for currency context
interface CurrencyErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class CurrencyErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  CurrencyErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): CurrencyErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: error.stack || 'No error info available',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Currency Error Boundary caught an error:', error, errorInfo);

    this.setState({
      hasError: true,
      error,
      errorInfo: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <h2>Currency System Error</h2>
          <p>Something went wrong with the currency system.</p>
          <details style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>
            <summary>Error Details</summary>
            <p>
              <strong>Error:</strong> {this.state.error?.message}
            </p>
            <p>
              <strong>Stack:</strong> {this.state.errorInfo}
            </p>
          </details>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              window.location.reload();
            }}
            style={{
              marginTop: 10,
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Convenience hooks for specific currency operations
export const useCurrencyFormatter = () => {
  const {
    formatPrice,
    parsePrice,
    validatePriceInput,
    usesDecimals,
    currentCurrency,
  } = useCurrencyContext();
  return {
    formatPrice,
    parsePrice,
    validatePriceInput,
    usesDecimals,
    currentCurrency,
  };
};

export const useCurrencyActions = () => {
  const { updateCurrency, resetToDefault, refreshCurrencies } =
    useCurrencyContext();
  return { updateCurrency, resetToDefault, refreshCurrencies };
};

export const useCustomCurrencies = () => {
  const {
    customCurrencies,
    saveCustomCurrency,
    deleteCustomCurrency,
    getAllAvailableCurrencies,
  } = useCurrencyContext();
  return {
    customCurrencies,
    saveCustomCurrency,
    deleteCustomCurrency,
    getAllAvailableCurrencies,
  };
};
