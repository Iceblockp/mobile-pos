import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { ShopSettings } from '@/services/shopSettingsStorage';
import { ShopSettingsService } from '@/services/shopSettingsService';

interface ShopSettingsContextType {
  shopSettings: ShopSettings | null;
  shopSettingsService: ShopSettingsService | null;
  loading: boolean;
  error: string | null;
  refreshShopSettings: () => Promise<void>;
  updateShopSettings: (settings: Partial<ShopSettings>) => Promise<void>;
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

  // Refresh shop settings from database
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

  // Update shop settings and refresh local state
  const updateShopSettings = async (updates: Partial<ShopSettings>) => {
    if (!shopSettingsService) {
      throw new Error('Shop settings service not available');
    }

    try {
      setError(null);

      if (shopSettings) {
        // Update existing settings
        await shopSettingsService.updateShopSettings(updates);
      } else {
        // Create new settings
        const newSettings = {
          shopName: updates.shopName || '',
          address: updates.address,
          phone: updates.phone,
          logoPath: updates.logoPath,
          receiptFooter: updates.receiptFooter,
          thankYouMessage: updates.thankYouMessage,
          receiptTemplate: updates.receiptTemplate || 'classic',
        };
        await shopSettingsService.saveShopSettings(newSettings);
      }

      // Refresh settings from AsyncStorage
      await refreshShopSettings();
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

  // Auto-refresh settings periodically (every 30 seconds)
  useEffect(() => {
    if (!shopSettingsService) return;

    const interval = setInterval(() => {
      refreshShopSettings();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [shopSettingsService]);

  // Handle app state changes (refresh when app becomes active)
  useEffect(() => {
    if (!shopSettingsService) return;

    // Import AppState dynamically to avoid issues during testing
    let AppState: any;
    try {
      AppState = require('react-native').AppState;
    } catch (error) {
      // AppState not available (e.g., in tests), skip this functionality
      return;
    }

    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        refreshShopSettings();
      }
    };

    // Add app state listener
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    return () => {
      if (subscription?.remove) {
        subscription.remove();
      } else if (AppState.removeEventListener) {
        AppState.removeEventListener('change', handleAppStateChange);
      }
    };
  }, [shopSettingsService]);

  const contextValue: ShopSettingsContextType = {
    shopSettings,
    shopSettingsService,
    loading,
    error,
    refreshShopSettings,
    updateShopSettings,
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
    !loading && shopSettings !== null && shopSettings.shopName.trim().length > 0
  );
};
