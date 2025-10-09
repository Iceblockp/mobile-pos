import {
  currencyManager,
  CurrencySettings,
  CurrencyManager,
} from './currencyManager';
import { shopSettingsStorage } from './shopSettingsStorage';

export interface CurrencyMigrationResult {
  success: boolean;
  migratedData?: CurrencySettings;
  error?: string;
}

export class CurrencySettingsService {
  private static instance: CurrencySettingsService;
  private isInitialized: boolean = false;
  private readonly LEGACY_CURRENCY_KEY = 'shop_currency_settings';

  private constructor() {}

  public static getInstance(): CurrencySettingsService {
    if (!CurrencySettingsService.instance) {
      CurrencySettingsService.instance = new CurrencySettingsService();
    }
    return CurrencySettingsService.instance;
  }

  /**
   * Initialize currency settings from shop settings with migration support
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // First, attempt to migrate from legacy storage if needed
      const migrationResult = await this.migrateFromLegacyStorage();

      // Get currency from shop settings
      const shopSettings = await shopSettingsStorage.getShopSettings();

      if (shopSettings?.currency) {
        // Use currency from shop settings
        await this.setCurrencyInManager(shopSettings.currency);
      } else if (migrationResult.success && migrationResult.migratedData) {
        // Use migrated currency data
        await this.updateCurrency(migrationResult.migratedData);
      } else {
        // Initialize with default MMK currency
        const defaultCurrency = CurrencyManager.getCurrencyByCode('MMK');
        if (defaultCurrency) {
          await this.updateCurrency(defaultCurrency);
        } else {
          throw new Error('Default MMK currency not found');
        }
      }

      this.isInitialized = true;
      console.log('Currency settings initialized successfully');
    } catch (error) {
      console.error('Failed to initialize currency settings:', error);

      // Fallback to default currency
      try {
        const defaultCurrency = CurrencyManager.getCurrencyByCode('MMK');
        if (defaultCurrency) {
          await this.setCurrencyInManager(defaultCurrency);
          this.isInitialized = true;
        }
      } catch (fallbackError) {
        console.error(
          'Failed to initialize with fallback currency:',
          fallbackError
        );
        throw new Error('Failed to initialize currency system');
      }
    }
  }

  /**
   * Update currency settings and sync with shop settings
   */
  async updateCurrency(currency: CurrencySettings): Promise<void> {
    try {
      // Validate currency settings
      const validationErrors =
        currencyManager.validateCurrencySettings(currency);
      if (validationErrors.length > 0) {
        throw new Error(
          `Invalid currency settings: ${validationErrors.join(', ')}`
        );
      }

      // Update currency manager (without saving to legacy storage)
      await this.setCurrencyInManager(currency);

      // Update shop settings as the single source of truth
      await this.saveCurrencyToShopSettings(currency);

      console.log(`Currency updated to ${currency.name} (${currency.code})`);
    } catch (error) {
      console.error('Failed to update currency settings:', error);
      throw new Error('Failed to update currency settings');
    }
  }

  /**
   * Get current currency settings
   */
  getCurrentCurrency(): CurrencySettings {
    return currencyManager.getCurrentCurrency();
  }

  /**
   * Save currency to shop settings as the single source of truth
   */
  private async saveCurrencyToShopSettings(
    currency: CurrencySettings
  ): Promise<void> {
    try {
      await shopSettingsStorage.updateShopSettings({ currency });
    } catch (error) {
      console.error('Failed to save currency to shop settings:', error);
      throw new Error('Failed to update currency settings');
    }
  }

  /**
   * Set currency in manager without saving to legacy storage
   */
  private async setCurrencyInManager(
    currency: CurrencySettings
  ): Promise<void> {
    // Set currency directly in manager without triggering legacy storage save
    currencyManager['currentCurrency'] = currency;
  }

  /**
   * Get predefined currencies for selection
   */
  getPredefinedCurrencies(): Record<string, CurrencySettings> {
    return CurrencyManager.getPredefinedCurrencies();
  }

  /**
   * Format price using current currency
   */
  formatPrice(amount: number): string {
    return currencyManager.formatPrice(amount);
  }

  /**
   * Parse price string to number
   */
  parsePrice(priceString: string): number {
    return currencyManager.parsePrice(priceString);
  }

  /**
   * Validate price input
   */
  validatePriceInput(priceString: string): {
    isValid: boolean;
    value?: number;
    error?: string;
  } {
    return currencyManager.validatePriceInput(priceString);
  }

  /**
   * Check if current currency uses decimals
   */
  usesDecimals(): boolean {
    return currencyManager.usesDecimals();
  }

  /**
   * Get currency info for display
   */
  getCurrencyInfo(): {
    code: string;
    name: string;
    symbol: string;
    example: string;
  } {
    return currencyManager.getCurrencyInfo();
  }

  /**
   * Format discount information
   */
  formatDiscount(
    originalPrice: number,
    discountedPrice: number
  ): {
    original: string;
    discounted: string;
    savings: string;
    percentage: string;
  } {
    return currencyManager.formatDiscount(originalPrice, discountedPrice);
  }

  /**
   * Format price range
   */
  formatPriceRange(minPrice: number, maxPrice: number): string {
    return currencyManager.formatPriceRange(minPrice, maxPrice);
  }

  /**
   * Reset currency to default (MMK)
   */
  async resetToDefault(): Promise<void> {
    const defaultCurrency = CurrencyManager.getCurrencyByCode('MMK');

    if (defaultCurrency) {
      await this.updateCurrency(defaultCurrency);
    } else {
      throw new Error('Default MMK currency not found');
    }
  }

  /**
   * Export currency settings for backup
   */
  exportCurrencySettings(): string {
    const currency = this.getCurrentCurrency();
    return JSON.stringify(currency, null, 2);
  }

  /**
   * Import currency settings from backup
   */
  async importCurrencySettings(currencyJson: string): Promise<void> {
    try {
      const currency = JSON.parse(currencyJson) as CurrencySettings;
      await this.updateCurrency(currency);
    } catch (error) {
      console.error('Failed to import currency settings:', error);
      throw new Error('Invalid currency settings format');
    }
  }

  /**
   * Migrate currency data from legacy AsyncStorage to shop settings
   */
  async migrateFromLegacyStorage(): Promise<CurrencyMigrationResult> {
    try {
      // Check if there's legacy currency data
      const AsyncStorage =
        require('@react-native-async-storage/async-storage').default;
      const legacyCurrencyData = await AsyncStorage.getItem(
        this.LEGACY_CURRENCY_KEY
      );

      if (!legacyCurrencyData) {
        return { success: true }; // No legacy data to migrate
      }

      const legacyCurrency = JSON.parse(legacyCurrencyData) as CurrencySettings;

      // Validate the legacy currency data
      const validationErrors =
        currencyManager.validateCurrencySettings(legacyCurrency);
      if (validationErrors.length > 0) {
        console.warn('Legacy currency data is invalid:', validationErrors);
        // Clean up invalid legacy data
        await AsyncStorage.removeItem(this.LEGACY_CURRENCY_KEY);
        return { success: false, error: 'Invalid legacy currency data' };
      }

      // Check if shop settings already has currency (avoid overwriting)
      const shopSettings = await shopSettingsStorage.getShopSettings();
      if (shopSettings?.currency) {
        // Shop settings already has currency, clean up legacy data
        await AsyncStorage.removeItem(this.LEGACY_CURRENCY_KEY);
        return { success: true }; // Migration not needed
      }

      // Migrate the currency to shop settings
      await shopSettingsStorage.updateShopSettings({
        currency: legacyCurrency,
      });

      // Clean up legacy storage
      await AsyncStorage.removeItem(this.LEGACY_CURRENCY_KEY);

      console.log('Successfully migrated currency from legacy storage');
      return { success: true, migratedData: legacyCurrency };
    } catch (error) {
      console.error('Failed to migrate currency from legacy storage:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sync currency settings with shop settings (ensure consistency)
   */
  async syncWithShopSettings(): Promise<void> {
    try {
      const shopSettings = await shopSettingsStorage.getShopSettings();

      if (shopSettings?.currency) {
        const currentCurrency = this.getCurrentCurrency();

        // Check if currencies are different
        if (
          JSON.stringify(currentCurrency) !==
          JSON.stringify(shopSettings.currency)
        ) {
          await this.setCurrencyInManager(shopSettings.currency);
          console.log('Currency synced with shop settings');
        }
      } else {
        // Shop settings doesn't have currency, save current currency
        const currentCurrency = this.getCurrentCurrency();
        await this.saveCurrencyToShopSettings(currentCurrency);
        console.log('Current currency saved to shop settings');
      }
    } catch (error) {
      console.error('Failed to sync currency with shop settings:', error);
      throw new Error('Failed to sync currency settings');
    }
  }

  /**
   * Validate currency settings
   */
  validateCurrency(currency: CurrencySettings): {
    isValid: boolean;
    errors: string[];
  } {
    const errors = currencyManager.validateCurrencySettings(currency);
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if currency system is initialized
   */
  isSystemInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get currency system status for debugging
   */
  getSystemStatus(): {
    initialized: boolean;
    currentCurrency: CurrencySettings;
    shopSettingsHasCurrency: boolean;
  } {
    return {
      initialized: this.isInitialized,
      currentCurrency: this.getCurrentCurrency(),
      shopSettingsHasCurrency: false, // Will be updated by async call
    };
  }

  /**
   * Save a custom currency
   */
  async saveCustomCurrency(currency: CurrencySettings): Promise<void> {
    try {
      // Validate the custom currency
      const validation = this.validateCurrency(currency);
      if (!validation.isValid) {
        throw new Error(
          `Invalid custom currency: ${validation.errors.join(', ')}`
        );
      }

      // Mark as custom currency
      const customCurrency: CurrencySettings = {
        ...currency,
        isCustom: true,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
      };

      // Get current shop settings
      const shopSettings = await shopSettingsStorage.getShopSettings();
      const customCurrencies = shopSettings?.customCurrencies || [];

      // Check if currency with same code already exists
      const existingIndex = customCurrencies.findIndex(
        (c) => c.code === customCurrency.code
      );

      if (existingIndex >= 0) {
        // Update existing custom currency
        customCurrencies[existingIndex] = customCurrency;
      } else {
        // Add new custom currency
        customCurrencies.push(customCurrency);
      }

      // Update shop settings
      await shopSettingsStorage.updateShopSettings({ customCurrencies });

      console.log(
        `Custom currency ${customCurrency.name} (${customCurrency.code}) saved`
      );
    } catch (error) {
      console.error('Failed to save custom currency:', error);
      throw new Error('Failed to save custom currency');
    }
  }

  /**
   * Get all custom currencies
   */
  async getCustomCurrencies(): Promise<CurrencySettings[]> {
    try {
      const shopSettings = await shopSettingsStorage.getShopSettings();
      return shopSettings?.customCurrencies || [];
    } catch (error) {
      console.error('Failed to get custom currencies:', error);
      return [];
    }
  }

  /**
   * Delete a custom currency
   */
  async deleteCustomCurrency(currencyCode: string): Promise<void> {
    try {
      const shopSettings = await shopSettingsStorage.getShopSettings();
      const customCurrencies = shopSettings?.customCurrencies || [];

      // Filter out the currency to delete
      const updatedCurrencies = customCurrencies.filter(
        (c) => c.code !== currencyCode
      );

      if (updatedCurrencies.length === customCurrencies.length) {
        throw new Error(`Custom currency ${currencyCode} not found`);
      }

      // Update shop settings
      await shopSettingsStorage.updateShopSettings({
        customCurrencies: updatedCurrencies,
      });

      console.log(`Custom currency ${currencyCode} deleted`);
    } catch (error) {
      console.error('Failed to delete custom currency:', error);
      throw new Error('Failed to delete custom currency');
    }
  }

  /**
   * Get all available currencies (predefined + custom)
   */
  async getAllAvailableCurrencies(): Promise<{
    predefined: Record<string, CurrencySettings>;
    custom: CurrencySettings[];
  }> {
    try {
      const predefined = this.getPredefinedCurrencies();
      const custom = await this.getCustomCurrencies();

      return { predefined, custom };
    } catch (error) {
      console.error('Failed to get all available currencies:', error);
      return {
        predefined: this.getPredefinedCurrencies(),
        custom: [],
      };
    }
  }

  /**
   * Update last used timestamp for a currency
   */
  async updateCurrencyLastUsed(currencyCode: string): Promise<void> {
    try {
      const shopSettings = await shopSettingsStorage.getShopSettings();
      const customCurrencies = shopSettings?.customCurrencies || [];

      const currencyIndex = customCurrencies.findIndex(
        (c) => c.code === currencyCode
      );
      if (currencyIndex >= 0) {
        customCurrencies[currencyIndex].lastUsed = new Date().toISOString();
        await shopSettingsStorage.updateShopSettings({ customCurrencies });
      }
    } catch (error) {
      console.error('Failed to update currency last used timestamp:', error);
      // Don't throw error as this is not critical
    }
  }
}

// Export singleton instance
export const currencySettingsService = CurrencySettingsService.getInstance();
