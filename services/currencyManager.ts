import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CurrencySettings {
  code: string; // 'MMK', 'USD', 'EUR', etc.
  symbol: string; // 'K', '$', '€', etc.
  name: string; // 'Myanmar Kyat', 'US Dollar', etc.
  decimals: number; // 0 for MMK, 2 for USD/EUR
  symbolPosition: 'before' | 'after'; // '$10.50' vs '10.50€'
  thousandSeparator: string; // ',' or '.'
  decimalSeparator: string; // '.' or ','

  // Enhanced fields for custom currency support
  isCustom?: boolean; // true if this is a user-created currency
  createdAt?: string; // ISO date string when currency was created
  lastUsed?: string; // ISO date string when currency was last used
}

export class CurrencyManager {
  private static instance: CurrencyManager;
  private currentCurrency: CurrencySettings;
  private readonly CURRENCY_STORAGE_KEY = 'shop_currency_settings';

  // Predefined currencies
  private static readonly CURRENCIES: Record<string, CurrencySettings> = {
    MMK: {
      code: 'MMK',
      symbol: 'Ks',
      name: 'Myanmar Kyat',
      decimals: 0,
      symbolPosition: 'after',
      thousandSeparator: ',',
      decimalSeparator: '.',
    },
    USD: {
      code: 'USD',
      symbol: '$',
      name: 'US Dollar',
      decimals: 2,
      symbolPosition: 'before',
      thousandSeparator: ',',
      decimalSeparator: '.',
    },
    EUR: {
      code: 'EUR',
      symbol: '€',
      name: 'Euro',
      decimals: 2,
      symbolPosition: 'after',
      thousandSeparator: ',',
      decimalSeparator: '.',
    },
    GBP: {
      code: 'GBP',
      symbol: '£',
      name: 'British Pound',
      decimals: 2,
      symbolPosition: 'before',
      thousandSeparator: ',',
      decimalSeparator: '.',
    },
    JPY: {
      code: 'JPY',
      symbol: '¥',
      name: 'Japanese Yen',
      decimals: 0,
      symbolPosition: 'before',
      thousandSeparator: ',',
      decimalSeparator: '.',
    },
    CNY: {
      code: 'CNY',
      symbol: '¥',
      name: 'Chinese Yuan',
      decimals: 2,
      symbolPosition: 'before',
      thousandSeparator: ',',
      decimalSeparator: '.',
    },
    THB: {
      code: 'THB',
      symbol: '฿',
      name: 'Thai Baht',
      decimals: 2,
      symbolPosition: 'before',
      thousandSeparator: ',',
      decimalSeparator: '.',
    },
  };

  private constructor() {
    // Default to Myanmar Kyat
    this.currentCurrency = CurrencyManager.CURRENCIES.MMK;
  }

  public static getInstance(): CurrencyManager {
    if (!CurrencyManager.instance) {
      CurrencyManager.instance = new CurrencyManager();
    }
    return CurrencyManager.instance;
  }

  public static getPredefinedCurrencies(): Record<string, CurrencySettings> {
    return { ...CurrencyManager.CURRENCIES };
  }

  public static getCurrencyByCode(code: string): CurrencySettings | null {
    return CurrencyManager.CURRENCIES[code] || null;
  }

  async initialize(): Promise<void> {
    // Note: Initialization is now handled by CurrencySettingsService
    // This method is kept for backward compatibility but doesn't load from AsyncStorage
    // The currency will be set by CurrencySettingsService after loading from shop settings
    console.log('CurrencyManager initialized with default MMK currency');
  }

  async setCurrency(currency: CurrencySettings): Promise<void> {
    const validationErrors = this.validateCurrencySettings(currency);
    if (validationErrors.length > 0) {
      throw new Error(
        `Invalid currency settings: ${validationErrors.join(', ')}`
      );
    }

    this.currentCurrency = currency;

    // Note: Storage is now handled by CurrencySettingsService through shop settings
    // This method only updates the in-memory currency for backward compatibility
  }

  getCurrentCurrency(): CurrencySettings {
    return { ...this.currentCurrency };
  }

  formatPrice(amount: number): string {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return this.formatPriceWithSymbol(0);
    }

    const formatted = this.formatNumber(amount);
    return this.formatPriceWithSymbol(formatted);
  }

  formatNumber(amount: number): string {
    if (typeof amount !== 'number' || isNaN(amount)) {
      amount = 0;
    }

    // Handle negative numbers
    const isNegative = amount < 0;
    const absoluteAmount = Math.abs(amount);

    // Format the number based on currency settings
    let formatted: string;

    if (this.currentCurrency.decimals === 0) {
      // No decimal places (like MMK, JPY)
      formatted = Math.round(absoluteAmount).toLocaleString('en-US', {
        useGrouping: true,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    } else {
      // With decimal places (like USD, EUR)
      formatted = absoluteAmount.toLocaleString('en-US', {
        useGrouping: true,
        minimumFractionDigits: this.currentCurrency.decimals,
        maximumFractionDigits: this.currentCurrency.decimals,
      });
    }

    // Apply custom thousand separator if different from default
    if (this.currentCurrency.thousandSeparator !== ',') {
      formatted = formatted.replace(
        /,/g,
        this.currentCurrency.thousandSeparator
      );
    }

    // Apply custom decimal separator if different from default
    if (this.currentCurrency.decimalSeparator !== '.') {
      formatted = formatted.replace(
        /\./g,
        this.currentCurrency.decimalSeparator
      );
    }

    return isNegative ? `-${formatted}` : formatted;
  }

  private formatPriceWithSymbol(formattedNumber: string | number): string {
    const numberStr =
      typeof formattedNumber === 'number'
        ? this.formatNumber(formattedNumber)
        : formattedNumber;

    if (this.currentCurrency.symbolPosition === 'before') {
      return `${this.currentCurrency.symbol}${numberStr}`;
    } else {
      return `${numberStr} ${this.currentCurrency.symbol}`;
    }
  }

  parsePrice(priceString: string): number {
    if (!priceString || typeof priceString !== 'string') {
      return 0;
    }

    // Remove currency symbols and extra spaces
    let cleaned = priceString.trim();
    cleaned = cleaned.replace(
      new RegExp(`\\${this.currentCurrency.symbol}`, 'g'),
      ''
    );
    cleaned = cleaned.trim();

    // Replace custom separators with standard ones for parsing
    if (this.currentCurrency.thousandSeparator !== ',') {
      cleaned = cleaned.replace(
        new RegExp(`\\${this.currentCurrency.thousandSeparator}`, 'g'),
        ','
      );
    }
    if (this.currentCurrency.decimalSeparator !== '.') {
      cleaned = cleaned.replace(
        new RegExp(`\\${this.currentCurrency.decimalSeparator}`, 'g'),
        '.'
      );
    }

    // Remove thousand separators for parsing
    cleaned = cleaned.replace(/,/g, '');

    // Parse the number
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  validateCurrencySettings(settings: CurrencySettings): string[] {
    const errors: string[] = [];

    if (!settings.code || settings.code.length !== 3) {
      errors.push('Currency code must be exactly 3 characters');
    }

    if (!settings.symbol || settings.symbol.trim().length === 0) {
      errors.push('Currency symbol is required');
    }

    if (!settings.name || settings.name.trim().length === 0) {
      errors.push('Currency name is required');
    }

    if (
      typeof settings.decimals !== 'number' ||
      settings.decimals < 0 ||
      settings.decimals > 4
    ) {
      errors.push('Decimal places must be between 0 and 4');
    }

    if (!['before', 'after'].includes(settings.symbolPosition)) {
      errors.push('Symbol position must be either "before" or "after"');
    }

    if (!settings.thousandSeparator) {
      errors.push('Thousand separator is required');
    }

    if (!settings.decimalSeparator) {
      errors.push('Decimal separator is required');
    }

    if (settings.thousandSeparator === settings.decimalSeparator) {
      errors.push('Thousand separator and decimal separator must be different');
    }

    return errors;
  }

  validatePriceInput(priceString: string): {
    isValid: boolean;
    value?: number;
    error?: string;
  } {
    if (!priceString || typeof priceString !== 'string') {
      return { isValid: false, error: 'Price is required' };
    }

    try {
      const value = this.parsePrice(priceString);

      if (value < 0) {
        return { isValid: false, error: 'Price cannot be negative' };
      }

      // Check decimal places in the original string
      const cleanedInput = priceString
        .replace(new RegExp(`\\${this.currentCurrency.symbol}`, 'g'), '')
        .trim();
      const decimalPart = cleanedInput.split(
        this.currentCurrency.decimalSeparator
      )[1];

      if (decimalPart && decimalPart.length > this.currentCurrency.decimals) {
        return {
          isValid: false,
          error: `Maximum ${this.currentCurrency.decimals} decimal places allowed for ${this.currentCurrency.name}`,
        };
      }

      return { isValid: true, value };
    } catch (error) {
      return { isValid: false, error: 'Invalid price format' };
    }
  }

  // Utility methods for common operations
  formatPriceRange(minPrice: number, maxPrice: number): string {
    return `${this.formatPrice(minPrice)} - ${this.formatPrice(maxPrice)}`;
  }

  formatDiscount(
    originalPrice: number,
    discountedPrice: number
  ): {
    original: string;
    discounted: string;
    savings: string;
    percentage: string;
  } {
    const savings = originalPrice - discountedPrice;
    const percentage = originalPrice > 0 ? (savings / originalPrice) * 100 : 0;

    return {
      original: this.formatPrice(originalPrice),
      discounted: this.formatPrice(discountedPrice),
      savings: this.formatPrice(savings),
      percentage: `${Math.round(percentage)}%`,
    };
  }

  // Helper method to check if current currency uses decimals
  usesDecimals(): boolean {
    return this.currentCurrency.decimals > 0;
  }

  // Helper method to get currency info for display
  getCurrencyInfo(): {
    code: string;
    name: string;
    symbol: string;
    example: string;
  } {
    return {
      code: this.currentCurrency.code,
      name: this.currentCurrency.name,
      symbol: this.currentCurrency.symbol,
      example: this.formatPrice(1234.56),
    };
  }
}

// Export singleton instance
export const currencyManager = CurrencyManager.getInstance();

// Export validation utilities
export class CurrencyValidator {
  static validateCurrencySettings(settings: CurrencySettings): string[] {
    return CurrencyManager.getInstance().validateCurrencySettings(settings);
  }

  static validatePriceInput(priceString: string): {
    isValid: boolean;
    value?: number;
    error?: string;
  } {
    return CurrencyManager.getInstance().validatePriceInput(priceString);
  }
}
