import { currencySettingsService } from '@/services/currencySettingsService';
import { CurrencySettings, CurrencyManager } from '@/services/currencyManager';
import { shopSettingsStorage } from '@/services/shopSettingsStorage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

// Mock shop settings storage
jest.mock('@/services/shopSettingsStorage', () => ({
  shopSettingsStorage: {
    getShopSettings: jest.fn(),
    updateShopSettings: jest.fn(),
  },
}));

describe('Enhanced Currency Settings Service', () => {
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

  describe('initialization', () => {
    it('should initialize with currency from shop settings', async () => {
      (shopSettingsStorage.getShopSettings as jest.Mock).mockResolvedValue({
        currency: mockCurrency,
      });

      await currencySettingsService.initialize();

      expect(shopSettingsStorage.getShopSettings).toHaveBeenCalled();
      expect(currencySettingsService.getCurrentCurrency()).toEqual(
        mockCurrency
      );
    });

    it('should initialize with default MMK when no shop settings', async () => {
      (shopSettingsStorage.getShopSettings as jest.Mock).mockResolvedValue(
        null
      );

      await currencySettingsService.initialize();

      const currentCurrency = currencySettingsService.getCurrentCurrency();
      expect(currentCurrency.code).toBe('MMK');
    });

    it('should handle initialization errors gracefully', async () => {
      (shopSettingsStorage.getShopSettings as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      await expect(currencySettingsService.initialize()).resolves.not.toThrow();

      const currentCurrency = currencySettingsService.getCurrentCurrency();
      expect(currentCurrency.code).toBe('MMK');
    });
  });

  describe('currency updates', () => {
    it('should update currency and sync with shop settings', async () => {
      (shopSettingsStorage.updateShopSettings as jest.Mock).mockResolvedValue(
        undefined
      );

      await currencySettingsService.updateCurrency(mockCurrency);

      expect(shopSettingsStorage.updateShopSettings).toHaveBeenCalledWith({
        currency: mockCurrency,
      });
      expect(currencySettingsService.getCurrentCurrency()).toEqual(
        mockCurrency
      );
    });

    it('should validate currency before updating', async () => {
      const invalidCurrency: CurrencySettings = {
        code: 'INVALID',
        symbol: '',
        name: '',
        decimals: -1,
        symbolPosition: 'before',
        thousandSeparator: ',',
        decimalSeparator: '.',
      };

      await expect(
        currencySettingsService.updateCurrency(invalidCurrency)
      ).rejects.toThrow('Invalid currency settings');
    });

    it('should handle shop settings update failures', async () => {
      (shopSettingsStorage.updateShopSettings as jest.Mock).mockRejectedValue(
        new Error('Update failed')
      );

      await expect(
        currencySettingsService.updateCurrency(mockCurrency)
      ).rejects.toThrow('Failed to update currency settings');
    });
  });

  describe('custom currency management', () => {
    const customCurrency: CurrencySettings = {
      code: 'XYZ',
      symbol: 'X',
      name: 'Custom Currency',
      decimals: 3,
      symbolPosition: 'after',
      thousandSeparator: '.',
      decimalSeparator: ',',
      isCustom: true,
    };

    it('should save custom currency', async () => {
      (shopSettingsStorage.getShopSettings as jest.Mock).mockResolvedValue({
        customCurrencies: [],
      });
      (shopSettingsStorage.updateShopSettings as jest.Mock).mockResolvedValue(
        undefined
      );

      await currencySettingsService.saveCustomCurrency(customCurrency);

      expect(shopSettingsStorage.updateShopSettings).toHaveBeenCalledWith({
        customCurrencies: expect.arrayContaining([
          expect.objectContaining({
            ...customCurrency,
            isCustom: true,
            createdAt: expect.any(String),
            lastUsed: expect.any(String),
          }),
        ]),
      });
    });

    it('should get custom currencies', async () => {
      (shopSettingsStorage.getShopSettings as jest.Mock).mockResolvedValue({
        customCurrencies: [customCurrency],
      });

      const result = await currencySettingsService.getCustomCurrencies();

      expect(result).toEqual([customCurrency]);
    });

    it('should delete custom currency', async () => {
      (shopSettingsStorage.getShopSettings as jest.Mock).mockResolvedValue({
        customCurrencies: [customCurrency],
      });
      (shopSettingsStorage.updateShopSettings as jest.Mock).mockResolvedValue(
        undefined
      );

      await currencySettingsService.deleteCustomCurrency('XYZ');

      expect(shopSettingsStorage.updateShopSettings).toHaveBeenCalledWith({
        customCurrencies: [],
      });
    });

    it('should handle deleting non-existent custom currency', async () => {
      (shopSettingsStorage.getShopSettings as jest.Mock).mockResolvedValue({
        customCurrencies: [],
      });

      await expect(
        currencySettingsService.deleteCustomCurrency('NONEXISTENT')
      ).rejects.toThrow('Custom currency NONEXISTENT not found');
    });
  });

  describe('migration', () => {
    it('should migrate from legacy storage', async () => {
      const AsyncStorage =
        require('@react-native-async-storage/async-storage').default;
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockCurrency));
      (shopSettingsStorage.getShopSettings as jest.Mock).mockResolvedValue(
        null
      );
      (shopSettingsStorage.updateShopSettings as jest.Mock).mockResolvedValue(
        undefined
      );

      const result = await currencySettingsService.migrateFromLegacyStorage();

      expect(result.success).toBe(true);
      expect(result.migratedData).toEqual(mockCurrency);
      expect(shopSettingsStorage.updateShopSettings).toHaveBeenCalledWith({
        currency: mockCurrency,
      });
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });

    it('should skip migration when shop settings already has currency', async () => {
      const AsyncStorage =
        require('@react-native-async-storage/async-storage').default;
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockCurrency));
      (shopSettingsStorage.getShopSettings as jest.Mock).mockResolvedValue({
        currency: mockCurrency,
      });

      const result = await currencySettingsService.migrateFromLegacyStorage();

      expect(result.success).toBe(true);
      expect(shopSettingsStorage.updateShopSettings).not.toHaveBeenCalled();
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });

    it('should handle invalid legacy data', async () => {
      const AsyncStorage =
        require('@react-native-async-storage/async-storage').default;
      AsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({
          code: 'INVALID',
          symbol: '',
          name: '',
          decimals: -1,
          symbolPosition: 'invalid',
          thousandSeparator: '',
          decimalSeparator: '',
        })
      );

      const result = await currencySettingsService.migrateFromLegacyStorage();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid legacy currency data');
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should validate valid currency settings', () => {
      const result = currencySettingsService.validateCurrency(mockCurrency);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate invalid currency settings', () => {
      const invalidCurrency: CurrencySettings = {
        code: '',
        symbol: '',
        name: '',
        decimals: -1,
        symbolPosition: 'before',
        thousandSeparator: '',
        decimalSeparator: '',
      };

      const result = currencySettingsService.validateCurrency(invalidCurrency);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('formatting utilities', () => {
    beforeEach(async () => {
      await currencySettingsService.updateCurrency(mockCurrency);
    });

    it('should format prices correctly', () => {
      const formatted = currencySettingsService.formatPrice(1234.56);
      expect(formatted).toBe('$1,234.56');
    });

    it('should parse prices correctly', () => {
      const parsed = currencySettingsService.parsePrice('$1,234.56');
      expect(parsed).toBe(1234.56);
    });

    it('should validate price input', () => {
      const result = currencySettingsService.validatePriceInput('$1,234.56');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(1234.56);
    });

    it('should detect decimal usage', () => {
      expect(currencySettingsService.usesDecimals()).toBe(true);
    });

    it('should format price ranges', () => {
      const formatted = currencySettingsService.formatPriceRange(100, 200);
      expect(formatted).toBe('$100.00 - $200.00');
    });
  });

  describe('system status', () => {
    it('should return system status', () => {
      const status = currencySettingsService.getSystemStatus();

      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('currentCurrency');
      expect(status).toHaveProperty('shopSettingsHasCurrency');
    });

    it('should track initialization state', () => {
      expect(currencySettingsService.isSystemInitialized()).toBe(false);
    });
  });
});
