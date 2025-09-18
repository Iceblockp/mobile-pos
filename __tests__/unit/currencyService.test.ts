import {
  CurrencyManager,
  CurrencyValidator,
  CurrencySettings,
} from '@/services/currencyService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('CurrencyService', () => {
  let currencyManager: CurrencyManager;

  beforeEach(() => {
    // Reset AsyncStorage mocks
    jest.clearAllMocks();

    // Get fresh instance for each test
    currencyManager = CurrencyManager.getInstance();
  });

  describe('CurrencyManager', () => {
    describe('Singleton Pattern', () => {
      test('should return the same instance', () => {
        const instance1 = CurrencyManager.getInstance();
        const instance2 = CurrencyManager.getInstance();
        expect(instance1).toBe(instance2);
      });
    });

    describe('Predefined Currencies', () => {
      test('should have predefined currencies', () => {
        const currencies = CurrencyManager.getPredefinedCurrencies();
        expect(currencies).toHaveProperty('MMK');
        expect(currencies).toHaveProperty('USD');
        expect(currencies).toHaveProperty('EUR');
        expect(currencies).toHaveProperty('GBP');
        expect(currencies).toHaveProperty('JPY');
        expect(currencies).toHaveProperty('CNY');
        expect(currencies).toHaveProperty('THB');
      });

      test('should get specific currency by code', () => {
        const usd = CurrencyManager.getCurrency('USD');
        expect(usd).toBeTruthy();
        expect(usd?.code).toBe('USD');
        expect(usd?.symbol).toBe('$');
        expect(usd?.decimals).toBe(2);
        expect(usd?.symbolPosition).toBe('before');
      });

      test('should return null for non-existent currency', () => {
        const invalid = CurrencyManager.getCurrency('INVALID');
        expect(invalid).toBeNull();
      });

      test('should have correct MMK configuration', () => {
        const mmk = CurrencyManager.getCurrency('MMK');
        expect(mmk).toEqual({
          code: 'MMK',
          symbol: 'K',
          name: 'Myanmar Kyat',
          decimals: 0,
          symbolPosition: 'after',
          thousandSeparator: ',',
          decimalSeparator: '.',
        });
      });
    });

    describe('Currency Settings Management', () => {
      test('should load currency settings from storage', async () => {
        const mockSettings: CurrencySettings = {
          code: 'USD',
          symbol: '$',
          name: 'US Dollar',
          decimals: 2,
          symbolPosition: 'before',
          thousandSeparator: ',',
          decimalSeparator: '.',
        };

        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
          JSON.stringify(mockSettings)
        );

        await currencyManager.loadCurrencySettings();
        const current = currencyManager.getCurrentCurrency();
        expect(current).toEqual(mockSettings);
      });

      test('should use default currency when storage is empty', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

        await currencyManager.loadCurrencySettings();
        const current = currencyManager.getCurrentCurrency();
        expect(current.code).toBe('MMK'); // Default currency
      });

      test('should handle storage errors gracefully', async () => {
        (AsyncStorage.getItem as jest.Mock).mockRejectedValue(
          new Error('Storage error')
        );

        await currencyManager.loadCurrencySettings();
        const current = currencyManager.getCurrentCurrency();
        expect(current.code).toBe('MMK'); // Should fallback to default
      });

      test('should save currency settings to storage', async () => {
        const newSettings: CurrencySettings = {
          code: 'EUR',
          symbol: '€',
          name: 'Euro',
          decimals: 2,
          symbolPosition: 'after',
          thousandSeparator: ',',
          decimalSeparator: '.',
        };

        await currencyManager.saveCurrencySettings(newSettings);

        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'shop_currency_settings',
          JSON.stringify(newSettings)
        );

        const current = currencyManager.getCurrentCurrency();
        expect(current).toEqual(newSettings);
      });

      test('should validate currency settings before saving', async () => {
        const invalidSettings: CurrencySettings = {
          code: '', // Invalid: empty code
          symbol: '$',
          name: 'Invalid Currency',
          decimals: 2,
          symbolPosition: 'before',
          thousandSeparator: ',',
          decimalSeparator: '.',
        };

        await expect(
          currencyManager.saveCurrencySettings(invalidSettings)
        ).rejects.toThrow('Invalid currency settings');
      });
    });

    describe('Price Formatting', () => {
      test('should format prices with USD settings', async () => {
        const usdSettings = CurrencyManager.getCurrency('USD')!;
        await currencyManager.saveCurrencySettings(usdSettings);

        expect(currencyManager.formatPrice(1234.56)).toBe('$1,234.56');
        expect(currencyManager.formatPrice(0)).toBe('$0.00');
        expect(currencyManager.formatPrice(1000000)).toBe('$1,000,000.00');
      });

      test('should format prices with MMK settings', async () => {
        const mmkSettings = CurrencyManager.getCurrency('MMK')!;
        await currencyManager.saveCurrencySettings(mmkSettings);

        expect(currencyManager.formatPrice(1234.56)).toBe('1,235 K'); // Rounded to 0 decimals
        expect(currencyManager.formatPrice(0)).toBe('0 K');
        expect(currencyManager.formatPrice(1000000)).toBe('1,000,000 K');
      });

      test('should format prices with EUR settings', async () => {
        const eurSettings = CurrencyManager.getCurrency('EUR')!;
        await currencyManager.saveCurrencySettings(eurSettings);

        expect(currencyManager.formatPrice(1234.56)).toBe('1,234.56 €');
        expect(currencyManager.formatPrice(0)).toBe('0.00 €');
      });

      test('should handle invalid numbers', () => {
        expect(currencyManager.formatPrice(NaN)).toBe('0 K'); // Default MMK format
        expect(currencyManager.formatPrice(Infinity)).toBe('0 K');
        expect(currencyManager.formatPrice(-Infinity)).toBe('0 K');
      });

      test('should format numbers without currency symbol', async () => {
        const usdSettings = CurrencyManager.getCurrency('USD')!;
        await currencyManager.saveCurrencySettings(usdSettings);

        expect(currencyManager.formatNumber(1234.56)).toBe('1,234.56');
        expect(currencyManager.formatNumber(1000)).toBe('1,000.00');
      });

      test('should handle different thousand separators', async () => {
        const customSettings: CurrencySettings = {
          code: 'CUSTOM',
          symbol: 'C',
          name: 'Custom Currency',
          decimals: 2,
          symbolPosition: 'before',
          thousandSeparator: '.',
          decimalSeparator: ',',
        };

        await currencyManager.saveCurrencySettings(customSettings);
        expect(currencyManager.formatNumber(1234.56)).toBe('1.234,56');
      });
    });

    describe('Price Parsing', () => {
      test('should parse USD formatted prices', async () => {
        const usdSettings = CurrencyManager.getCurrency('USD')!;
        await currencyManager.saveCurrencySettings(usdSettings);

        expect(currencyManager.parsePrice('$1,234.56')).toBe(1234.56);
        expect(currencyManager.parsePrice('$0.00')).toBe(0);
        expect(currencyManager.parsePrice('$1,000,000.99')).toBe(1000000.99);
      });

      test('should parse MMK formatted prices', async () => {
        const mmkSettings = CurrencyManager.getCurrency('MMK')!;
        await currencyManager.saveCurrencySettings(mmkSettings);

        expect(currencyManager.parsePrice('1,234 K')).toBe(1234);
        expect(currencyManager.parsePrice('0 K')).toBe(0);
        expect(currencyManager.parsePrice('1,000,000 K')).toBe(1000000);
      });

      test('should parse prices without currency symbols', async () => {
        const usdSettings = CurrencyManager.getCurrency('USD')!;
        await currencyManager.saveCurrencySettings(usdSettings);

        expect(currencyManager.parsePrice('1,234.56')).toBe(1234.56);
        expect(currencyManager.parsePrice('1234.56')).toBe(1234.56);
        expect(currencyManager.parsePrice('1234')).toBe(1234);
      });

      test('should handle invalid price strings', () => {
        expect(currencyManager.parsePrice('')).toBe(0);
        expect(currencyManager.parsePrice('invalid')).toBe(0);
        expect(currencyManager.parsePrice('abc123')).toBe(0);
      });

      test('should handle custom separators', async () => {
        const customSettings: CurrencySettings = {
          code: 'CUSTOM',
          symbol: 'C',
          name: 'Custom Currency',
          decimals: 2,
          symbolPosition: 'before',
          thousandSeparator: '.',
          decimalSeparator: ',',
        };

        await currencyManager.saveCurrencySettings(customSettings);
        expect(currencyManager.parsePrice('C1.234,56')).toBe(1234.56);
      });
    });

    describe('Utility Methods', () => {
      test('should convert integer to decimal', () => {
        expect(currencyManager.convertIntegerToDecimal(1250)).toBe(12.5);
        expect(currencyManager.convertIntegerToDecimal(0)).toBe(0);
        expect(currencyManager.convertIntegerToDecimal(100)).toBe(1.0);
      });

      test('should convert decimal to integer', () => {
        expect(currencyManager.convertDecimalToInteger(12.5)).toBe(1250);
        expect(currencyManager.convertDecimalToInteger(0)).toBe(0);
        expect(currencyManager.convertDecimalToInteger(1.0)).toBe(100);
        expect(currencyManager.convertDecimalToInteger(12.555)).toBe(1256); // Rounded
      });
    });
  });

  describe('CurrencyValidator', () => {
    describe('Currency Settings Validation', () => {
      test('should validate correct currency settings', () => {
        const validSettings: CurrencySettings = {
          code: 'USD',
          symbol: '$',
          name: 'US Dollar',
          decimals: 2,
          symbolPosition: 'before',
          thousandSeparator: ',',
          decimalSeparator: '.',
        };

        const errors =
          CurrencyValidator.validateCurrencySettings(validSettings);
        expect(errors).toHaveLength(0);
      });

      test('should validate currency code', () => {
        const invalidCode: CurrencySettings = {
          code: '', // Invalid: empty
          symbol: '$',
          name: 'US Dollar',
          decimals: 2,
          symbolPosition: 'before',
          thousandSeparator: ',',
          decimalSeparator: '.',
        };

        const errors = CurrencyValidator.validateCurrencySettings(invalidCode);
        expect(errors).toContain('Currency code must be 2-5 characters');
      });

      test('should validate currency symbol', () => {
        const invalidSymbol: CurrencySettings = {
          code: 'USD',
          symbol: '', // Invalid: empty
          name: 'US Dollar',
          decimals: 2,
          symbolPosition: 'before',
          thousandSeparator: ',',
          decimalSeparator: '.',
        };

        const errors =
          CurrencyValidator.validateCurrencySettings(invalidSymbol);
        expect(errors).toContain('Currency symbol is required');
      });

      test('should validate decimal places', () => {
        const invalidDecimals: CurrencySettings = {
          code: 'USD',
          symbol: '$',
          name: 'US Dollar',
          decimals: -1, // Invalid: negative
          symbolPosition: 'before',
          thousandSeparator: ',',
          decimalSeparator: '.',
        };

        const errors =
          CurrencyValidator.validateCurrencySettings(invalidDecimals);
        expect(errors).toContain('Decimal places must be between 0 and 4');
      });

      test('should validate symbol position', () => {
        const invalidPosition: CurrencySettings = {
          code: 'USD',
          symbol: '$',
          name: 'US Dollar',
          decimals: 2,
          symbolPosition: 'middle' as any, // Invalid position
          thousandSeparator: ',',
          decimalSeparator: '.',
        };

        const errors =
          CurrencyValidator.validateCurrencySettings(invalidPosition);
        expect(errors).toContain('Symbol position must be "before" or "after"');
      });

      test('should validate separators are different', () => {
        const sameSeparators: CurrencySettings = {
          code: 'USD',
          symbol: '$',
          name: 'US Dollar',
          decimals: 2,
          symbolPosition: 'before',
          thousandSeparator: ',',
          decimalSeparator: ',', // Same as thousand separator
        };

        const errors =
          CurrencyValidator.validateCurrencySettings(sameSeparators);
        expect(errors).toContain(
          'Thousand separator and decimal separator must be different'
        );
      });
    });

    describe('Price Input Validation', () => {
      test('should validate correct price input', () => {
        const usdSettings = CurrencyManager.getCurrency('USD')!;
        const result = CurrencyValidator.validatePriceInput(
          '123.45',
          usdSettings
        );

        expect(result.isValid).toBe(true);
        expect(result.value).toBe(123.45);
        expect(result.error).toBeUndefined();
      });

      test('should reject empty price input', () => {
        const usdSettings = CurrencyManager.getCurrency('USD')!;
        const result = CurrencyValidator.validatePriceInput('', usdSettings);

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Price is required');
      });

      test('should reject invalid price format', () => {
        const usdSettings = CurrencyManager.getCurrency('USD')!;
        const result = CurrencyValidator.validatePriceInput('abc', usdSettings);

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid price format');
      });

      test('should reject negative prices', () => {
        const usdSettings = CurrencyManager.getCurrency('USD')!;
        const result = CurrencyValidator.validatePriceInput(
          '-123.45',
          usdSettings
        );

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid price format');
      });

      test('should reject prices that are too large', () => {
        const usdSettings = CurrencyManager.getCurrency('USD')!;
        const result = CurrencyValidator.validatePriceInput(
          '9999999999',
          usdSettings
        );

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Price is too large');
      });

      test('should validate decimal places based on currency', () => {
        const usdSettings = CurrencyManager.getCurrency('USD')!; // 2 decimals
        const result = CurrencyValidator.validatePriceInput(
          '123.456',
          usdSettings
        );

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Maximum 2 decimal places allowed');
      });

      test('should allow correct decimal places for MMK', () => {
        const mmkSettings = CurrencyManager.getCurrency('MMK')!; // 0 decimals
        const result = CurrencyValidator.validatePriceInput('123', mmkSettings);

        expect(result.isValid).toBe(true);
        expect(result.value).toBe(123);
      });
    });

    describe('Price Input Formatting', () => {
      test('should format price for input with USD', () => {
        const usdSettings = CurrencyManager.getCurrency('USD')!;
        const formatted = CurrencyValidator.formatPriceForInput(
          123.45,
          usdSettings
        );
        expect(formatted).toBe('123.45');
      });

      test('should format price for input with MMK', () => {
        const mmkSettings = CurrencyManager.getCurrency('MMK')!;
        const formatted = CurrencyValidator.formatPriceForInput(
          123.45,
          mmkSettings
        );
        expect(formatted).toBe('123'); // 0 decimal places
      });

      test('should handle invalid numbers', () => {
        const usdSettings = CurrencyManager.getCurrency('USD')!;
        expect(CurrencyValidator.formatPriceForInput(NaN, usdSettings)).toBe(
          ''
        );
        expect(
          CurrencyValidator.formatPriceForInput(Infinity, usdSettings)
        ).toBe('');
      });
    });
  });

  describe('Integration Tests', () => {
    test('should maintain consistency between formatting and parsing', async () => {
      const currencies = ['USD', 'EUR', 'MMK', 'JPY'];

      for (const currencyCode of currencies) {
        const settings = CurrencyManager.getCurrency(currencyCode)!;
        await currencyManager.saveCurrencySettings(settings);

        const testValues = [0, 1, 123.45, 1000, 1234567.89];

        for (const value of testValues) {
          const formatted = currencyManager.formatPrice(value);
          const parsed = currencyManager.parsePrice(formatted);

          // For currencies with 0 decimals, expect rounding
          if (settings.decimals === 0) {
            expect(parsed).toBe(Math.round(value));
          } else {
            expect(parsed).toBeCloseTo(value, settings.decimals);
          }
        }
      }
    });

    test('should handle currency switching correctly', async () => {
      // Start with USD
      const usdSettings = CurrencyManager.getCurrency('USD')!;
      await currencyManager.saveCurrencySettings(usdSettings);

      const usdFormatted = currencyManager.formatPrice(123.45);
      expect(usdFormatted).toBe('$123.45');

      // Switch to EUR
      const eurSettings = CurrencyManager.getCurrency('EUR')!;
      await currencyManager.saveCurrencySettings(eurSettings);

      const eurFormatted = currencyManager.formatPrice(123.45);
      expect(eurFormatted).toBe('123.45 €');

      // Switch to MMK
      const mmkSettings = CurrencyManager.getCurrency('MMK')!;
      await currencyManager.saveCurrencySettings(mmkSettings);

      const mmkFormatted = currencyManager.formatPrice(123.45);
      expect(mmkFormatted).toBe('123 K');
    });
  });
});
