import { currencySettingsService } from '@/services/currencySettingsService';
import { CurrencyManager, CurrencySettings } from '@/services/currencyManager';

// Mock AsyncStorage and shop settings
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@/services/shopSettingsStorage');

describe('Currency Performance Tests', () => {
  const mockCurrency: CurrencySettings = {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimals: 2,
    symbolPosition: 'before',
    thousandSeparator: ',',
    decimalSeparator: '.',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatting performance', () => {
    it('should format large numbers of prices efficiently', async () => {
      await currencySettingsService.updateCurrency(mockCurrency);

      const startTime = performance.now();
      const testPrices = Array.from({ length: 10000 }, (_, i) => i * 1.23);

      for (const price of testPrices) {
        currencySettingsService.formatPrice(price);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should format 10,000 prices in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should parse large numbers of price strings efficiently', async () => {
      await currencySettingsService.updateCurrency(mockCurrency);

      const startTime = performance.now();
      const testPriceStrings = Array.from(
        { length: 10000 },
        (_, i) => `$${(i * 1.23).toFixed(2)}`
      );

      for (const priceString of testPriceStrings) {
        currencySettingsService.parsePrice(priceString);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should parse 10,000 price strings in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should validate large numbers of price inputs efficiently', async () => {
      await currencySettingsService.updateCurrency(mockCurrency);

      const startTime = performance.now();
      const testInputs = Array.from(
        { length: 1000 },
        (_, i) => `$${(i * 1.23).toFixed(2)}`
      );

      for (const input of testInputs) {
        currencySettingsService.validatePriceInput(input);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should validate 1,000 inputs in less than 50ms
      expect(duration).toBeLessThan(50);
    });
  });

  describe('memory usage', () => {
    it('should not leak memory during repeated operations', async () => {
      await currencySettingsService.updateCurrency(mockCurrency);

      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let i = 0; i < 10000; i++) {
        const price = i * 1.23;
        const formatted = currencySettingsService.formatPrice(price);
        const parsed = currencySettingsService.parsePrice(formatted);
        currencySettingsService.validatePriceInput(formatted);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should handle rapid currency switches without memory leaks', async () => {
      const currencies = [
        mockCurrency,
        {
          code: 'EUR',
          symbol: '€',
          name: 'Euro',
          decimals: 2,
          symbolPosition: 'after',
          thousandSeparator: ',',
          decimalSeparator: '.',
        },
        {
          code: 'MMK',
          symbol: 'K',
          name: 'Myanmar Kyat',
          decimals: 0,
          symbolPosition: 'after',
          thousandSeparator: ',',
          decimalSeparator: '.',
        },
      ];

      const initialMemory = process.memoryUsage().heapUsed;

      // Rapidly switch currencies
      for (let i = 0; i < 1000; i++) {
        const currency = currencies[i % currencies.length];
        await currencySettingsService.updateCurrency(currency);

        // Perform some operations with each currency
        currencySettingsService.formatPrice(123.45);
        currencySettingsService.parsePrice('123.45');
      }

      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent formatting operations', async () => {
      await currencySettingsService.updateCurrency(mockCurrency);

      const startTime = performance.now();

      // Create multiple concurrent formatting operations
      const promises = Array.from({ length: 100 }, (_, i) =>
        Promise.resolve().then(() => {
          const results = [];
          for (let j = 0; j < 100; j++) {
            results.push(currencySettingsService.formatPrice(i * j * 1.23));
          }
          return results;
        })
      );

      const results = await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete all concurrent operations quickly
      expect(duration).toBeLessThan(200);
      expect(results).toHaveLength(100);
      expect(results[0]).toHaveLength(100);
    });

    it('should handle concurrent currency updates safely', async () => {
      const currencies = [
        mockCurrency,
        {
          code: 'EUR',
          symbol: '€',
          name: 'Euro',
          decimals: 2,
          symbolPosition: 'after',
          thousandSeparator: ',',
          decimalSeparator: '.',
        },
      ];

      // Attempt concurrent currency updates
      const promises = Array.from({ length: 10 }, (_, i) =>
        currencySettingsService.updateCurrency(
          currencies[i % currencies.length]
        )
      );

      // Should not throw errors
      await expect(Promise.all(promises)).resolves.not.toThrow();

      // Final currency should be one of the test currencies
      const finalCurrency = currencySettingsService.getCurrentCurrency();
      expect(currencies.some((c) => c.code === finalCurrency.code)).toBe(true);
    });
  });

  describe('edge case performance', () => {
    it('should handle very large numbers efficiently', async () => {
      await currencySettingsService.updateCurrency(mockCurrency);

      const startTime = performance.now();
      const largeNumbers = [
        Number.MAX_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER / 2,
        1e15,
        1e12,
        1e9,
      ];

      for (const number of largeNumbers) {
        const formatted = currencySettingsService.formatPrice(number);
        const parsed = currencySettingsService.parsePrice(formatted);
        expect(Math.abs(parsed - number)).toBeLessThan(0.01);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle large numbers quickly
      expect(duration).toBeLessThan(10);
    });

    it('should handle very small numbers efficiently', async () => {
      await currencySettingsService.updateCurrency(mockCurrency);

      const startTime = performance.now();
      const smallNumbers = [0.01, 0.001, 0.0001, 1e-10, Number.MIN_VALUE];

      for (const number of smallNumbers) {
        const formatted = currencySettingsService.formatPrice(number);
        const parsed = currencySettingsService.parsePrice(formatted);
        // Allow for some precision loss with very small numbers
        expect(Math.abs(parsed - number)).toBeLessThan(0.01);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle small numbers quickly
      expect(duration).toBeLessThan(10);
    });

    it('should handle complex currency configurations efficiently', async () => {
      const complexCurrency: CurrencySettings = {
        code: 'XYZ',
        symbol: '¤',
        name: 'Complex Currency with Very Long Name That Tests Performance',
        decimals: 4,
        symbolPosition: 'after',
        thousandSeparator: '.',
        decimalSeparator: ',',
      };

      await currencySettingsService.updateCurrency(complexCurrency);

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        const price = i * 1.2345;
        const formatted = currencySettingsService.formatPrice(price);
        const parsed = currencySettingsService.parsePrice(formatted);
        currencySettingsService.validatePriceInput(formatted);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle complex currency efficiently
      expect(duration).toBeLessThan(100);
    });
  });

  describe('caching performance', () => {
    it('should benefit from repeated formatting of same values', async () => {
      await currencySettingsService.updateCurrency(mockCurrency);

      const testValue = 1234.56;

      // First run - no cache
      const startTime1 = performance.now();
      for (let i = 0; i < 1000; i++) {
        currencySettingsService.formatPrice(testValue);
      }
      const duration1 = performance.now() - startTime1;

      // Second run - should be faster due to potential caching
      const startTime2 = performance.now();
      for (let i = 0; i < 1000; i++) {
        currencySettingsService.formatPrice(testValue);
      }
      const duration2 = performance.now() - startTime2;

      // Second run should be at least as fast as first run
      expect(duration2).toBeLessThanOrEqual(duration1 * 1.1); // Allow 10% variance
    });
  });

  describe('initialization performance', () => {
    it('should initialize quickly', async () => {
      const startTime = performance.now();

      await currencySettingsService.initialize();

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Initialization should be fast
      expect(duration).toBeLessThan(100);
    });

    it('should handle multiple initializations efficiently', async () => {
      const startTime = performance.now();

      // Multiple initializations should be handled efficiently
      const promises = Array.from({ length: 10 }, () =>
        currencySettingsService.initialize()
      );

      await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle multiple initializations without significant overhead
      expect(duration).toBeLessThan(200);
    });
  });
});
