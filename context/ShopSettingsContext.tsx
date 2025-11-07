import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { ShopSettings } from '@/services/shopSettingsStorage';
import { ShopSettingsService } from '@/services/shopSettingsService';
import { CurrencySettings } from '@/services/currencyManager';

interface ShopSettingsContextType {
  shopSettings: ShopSettings | null;
  shopSettingsService: ShopSettingsService | null;
  loading: boolean;
  error: string | null;
  refreshShopSettings: () => Promise<void>;
  updateShopSettings: (settings: Partial<ShopSettings>) => Promise<void>;

  // Currency-specific methods for integration
  updateCurrencyInShopSettings: (currency: CurrencySettings) => Promise<void>;
  updateCustomCurrenciesInShopSettings: (
    customCurrencies: CurrencySettings[]
  ) => Promise<void>;
}

const ShopSettingsContext = createContext<ShopSettingsContextType | undefined>(
  undefined
);

interface ShopSettingsProviderProps {
  children: ReactNode;
}

export const ShopSettingsProvider: React.FC<ShopSettingsProviderProps> = ({
  children,
}) => {
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
  const [shopSettingsService, setShopSettingsService] =
    useState<ShopSettingsService | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize shop settings service and load settings
  const initializeShopSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize service (no database dependency)
      const service = new ShopSettingsService();
      await service.initialize();

      setShopSettingsService(service);

      // Load existing shop settings (AsyncStorage is more reliable)
      const settings = await service.getShopSettings();
      setShopSettings(settings);

      console.log(
        'Shop settings initialized:',
        settings ? 'Found existing settings' : 'No settings found'
      );
    } catch (err) {
      console.error('Failed to initialize shop settings:', err);
      setError('Failed to load shop settings. Using default settings.');

      // Continue with null settings to allow app to function
      setShopSettings(null);
    } finally {
      setLoading(false);
    }
  };

  // Refresh shop settings from AsyncStorage
  const refreshShopSettings = async () => {
    if (!shopSettingsService) {
      console.warn('Shop settings service not available');
      return;
    }

    try {
      setError(null);
      const settings = await shopSettingsService.getShopSettings();
      console.log('setting', settings);
      setShopSettings(settings);
      console.log('Shop settings refreshed');
    } catch (err) {
      console.error('Failed to refresh shop settings:', err);
      setError('Failed to refresh shop settings');
    }
  };

  // Update shop settings and update local state directly (no refresh needed)
  const updateShopSettings = async (updates: Partial<ShopSettings>) => {
    if (!shopSettingsService) {
      throw new Error('Shop settings service not available');
    }

    try {
      setError(null);

      let updatedSettings: ShopSettings;

      if (shopSettings) {
        // Update existing settings
        await shopSettingsService.updateShopSettings(updates);
        // Update local state directly - no need to refresh from AsyncStorage
        updatedSettings = {
          ...shopSettings,
          ...updates,
          lastUpdated: new Date().toISOString(),
        };
      } else {
        // Check if this is a non-essential update (like currency) that doesn't require full shop setup
        const nonEssentialFields = [
          'currency',
          'customCurrencies',
          'receiptTemplate',
          'receiptFontSize',
        ];
        const updateKeys = Object.keys(updates);
        const isNonEssentialUpdate =
          updateKeys.length > 0 &&
          updateKeys.every((key) => nonEssentialFields.includes(key));

        if (isNonEssentialUpdate) {
          // For non-essential updates, just update the storage without requiring shop name
          await shopSettingsService.updateShopSettings(updates);
          // Create minimal settings object
          updatedSettings = {
            ...updates,
            lastUpdated: new Date().toISOString(),
          } as ShopSettings;
        } else {
          // Create new settings with required fields
          const newSettings = {
            shopName: updates.shopName || '',
            address: updates.address,
            phone: updates.phone,
            logoPath: updates.logoPath,
            receiptFooter: updates.receiptFooter,
            thankYouMessage: updates.thankYouMessage,
            receiptTemplate: updates.receiptTemplate || 'classic',
            receiptFontSize: updates.receiptFontSize || 'medium',
            currency: updates.currency,
            customCurrencies: updates.customCurrencies || [],
          };
          await shopSettingsService.saveShopSettings(newSettings);
          // Set the new settings directly
          updatedSettings = {
            ...newSettings,
            lastUpdated: new Date().toISOString(),
          };
        }
      }

      // Update local state directly instead of refreshing
      setShopSettings(updatedSettings);
      console.log('Shop settings updated successfully');
    } catch (err) {
      console.error('Failed to update shop settings:', err);
      setError('Failed to update shop settings');
      throw err; // Re-throw so UI can handle the error
    }
  };

  // Initialize on mount
  useEffect(() => {
    initializeShopSettings();
  }, []);

  // Removed periodic refresh - AsyncStorage doesn't change externally

  // Removed app state refresh - AsyncStorage is local and doesn't need external sync

  // Currency-specific update methods for integration
  const updateCurrencyInShopSettings = async (currency: CurrencySettings) => {
    await updateShopSettings({ currency });
  };

  const updateCustomCurrenciesInShopSettings = async (
    customCurrencies: CurrencySettings[]
  ) => {
    await updateShopSettings({ customCurrencies });
  };

  const contextValue: ShopSettingsContextType = {
    shopSettings,
    shopSettingsService,
    loading,
    error,
    refreshShopSettings,
    updateShopSettings,
    updateCurrencyInShopSettings,
    updateCustomCurrenciesInShopSettings,
  };

  return (
    <ShopSettingsContext.Provider value={contextValue}>
      {children}
    </ShopSettingsContext.Provider>
  );
};

// Hook to use shop settings context
export const useShopSettings = (): ShopSettingsContextType => {
  const context = useContext(ShopSettingsContext);
  if (context === undefined) {
    throw new Error(
      'useShopSettings must be used within a ShopSettingsProvider'
    );
  }
  return context;
};

// Hook to get shop settings only (for components that just need to read settings)
export const useShopSettingsData = (): ShopSettings | null => {
  const { shopSettings } = useShopSettings();
  return shopSettings;
};

// Hook to check if shop is configured
export const useIsShopConfigured = (): boolean => {
  const { shopSettings, loading } = useShopSettings();
  return (
    !loading &&
    shopSettings !== null &&
    shopSettings.shopName !== undefined &&
    shopSettings.shopName.trim().length > 0
  );
};
