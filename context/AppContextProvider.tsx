import React, { ReactNode } from 'react';
import { ShopSettingsProvider } from './ShopSettingsContext';
import { CurrencyProvider, CurrencyErrorBoundary } from './CurrencyContext';

interface AppContextProviderProps {
  children: ReactNode;
}

/**
 * Combined provider that wraps all app-level contexts
 * Ensures proper initialization order and error handling
 */
export const AppContextProvider: React.FC<AppContextProviderProps> = ({
  children,
}) => {
  return (
    <CurrencyErrorBoundary>
      <ShopSettingsProvider>
        <CurrencyProvider>{children}</CurrencyProvider>
      </ShopSettingsProvider>
    </CurrencyErrorBoundary>
  );
};

// Re-export context hooks for convenience
export {
  useShopSettings,
  useShopSettingsData,
  useIsShopConfigured,
} from './ShopSettingsContext';
export {
  useCurrencyContext,
  useCurrencyFormatter,
  useCurrencyActions,
  useCustomCurrencies,
} from './CurrencyContext';
