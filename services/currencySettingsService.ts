import { currencyManager, CurrencySettings } from './currencyManager';
import { shopSettingsStorage } from './shopSettingsStorage';

export class CurrencySettingsService {
  private static instance: CurrencySettingsService;

  private constructor() {}

  public static getInstance(): CurrencySettingsService {
    if (!CurrencySettingsService.instance) {
      CurrencySettingsService.instance = new CurrencySettingsService();
    }
    return CurrencySettingsService.instance;
  }

  /**
   * Initialize currency settings from shop settings
   */
  async initialize(): Promise<void> {
    try {
      // First try to get currency from shop settings
      const shopSettings = await shopSettingsStorage.getShopSettings();

      if (shopSettings?.currency) {
        // Use currency from shop settings
        await currencyManager.setCurrency(shopSettings.currency);
      } else {
        // Initialize currency manager with default (MMK)
        await currencyManager.initialize();

        // Save the default currency to shop settings
        const currentCurrency = currencyManager.getCurrentCurrency();
        await this.saveCurrencyToShopSettings(currentCurrency);
      }
    } catch (error) {
      console.error('Failed to initialize currency settings:', error);
      // Fallback to currency manager's default initialization
      await currencyManager.initialize();
    }
  }

  /**
   * Update currency settings and sync with shop settings
   */
  async updateCurrency(currency: CurrencySettings): Promise<void> {
    try {
      // Update currency manager
      await currencyManager.setCurrency(currency);

      // Update shop settings
      await this.saveCurrencyToShopSettings(currency);
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
   * Save currency to shop settings
   */
  private async saveCurrencyToShopSettings(
    currency: CurrencySettings
  ): Promise<void> {
    try {
      await shopSettingsStorage.updateShopSettings({ currency });
    } catch (error) {
      console.error('Failed to save currency to shop settings:', error);
      // Don't throw error here as currency manager is already updated
    }
  }

  /**
   * Get predefined currencies for selection
   */
  getPredefinedCurrencies(): Record<string, CurrencySettings> {
    return currencyManager.constructor.getPredefinedCurrencies();
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
    const { CurrencyManager } = require('./currencyManager');
    const defaultCurrency = CurrencyManager.getCurrencyByCode('MMK');

    if (defaultCurrency) {
      await this.updateCurrency(defaultCurrency);
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
}

// Export singleton instance
export const currencySettingsService = CurrencySettingsService.getInstance();
