import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import {
  CurrencyProvider,
  useCurrencyContext,
} from '@/context/CurrencyContext';
import { CurrencySettings } from '@/services/currencyManager';

// Mock the currency settings service
jest.mock('@/services/currencySettingsService', () => ({
  currencySettingsService: {
    initialize: jest.fn(),
    getCurrentCurrency: jest.fn(),
    updateCurrency: jest.fn(),
    resetToDefault: jest.fn(),
    syncWithShopSettings: jest.fn(),
    formatPrice: jest.fn(),
    parsePrice: jest.fn(),
    validatePriceInput: jest.fn(),
    saveCustomCurrency: jest.fn(),
    deleteCustomCurrency: jest.fn(),
    getCustomCurrencies: jest.fn(),
    getAllAvailableCurrencies: jest.fn(),
    updateCurrencyLastUsed: jest.fn(),
    usesDecimals: jest.fn(),
    getCurrencyInfo: jest.fn(),
  },
}));

const mockCurrency: CurrencySettings = {
  code: 'USD',
  symbol: '$',
  name: 'US Dollar',
  decimals: 2,
  symbolPosition: 'before',
  thousandSeparator: ',',
  decimalSeparator: '.',
};

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

// Test component to access context
const TestComponent: React.FC<{ onContextReady?: (context: any) => void }> = ({
  onContextReady,
}) => {
  const context = useCurrencyContext();

  React.useEffect(() => {
    if (onContextReady) {
      onContextReady(context);
    }
  }, [context, onContextReady]);

  return null;
};

describe('CurrencyContext', () => {
  const {
    currencySettingsService,
  } = require('@/services/currencySettingsService');

  beforeEach(() => {
    jest.clearAllMocks();
    currencySettingsService.initialize.mockResolvedValue(undefined);
    currencySettingsService.getCurrentCurrency.mockReturnValue(mockCurrency);
    currencySettingsService.getCustomCurrencies.mockResolvedValue([]);
  });

  describe('initialization', () => {
    it('should initialize currency context successfully', async () => {
      let contextValue: any;

      render(
        <CurrencyProvider>
          <TestComponent onContextReady={(ctx) => (contextValue = ctx)} />
        </CurrencyProvider>
      );

      await waitFor(() => {
        expect(contextValue?.isInitialized).toBe(true);
        expect(contextValue?.currentCurrency).toEqual(mockCurrency);
        expect(contextValue?.isLoading).toBe(false);
        expect(contextValue?.error).toBeNull();
      });

      expect(currencySettingsService.initialize).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      currencySettingsService.initialize.mockRejectedValue(
        new Error('Init failed')
      );

      let contextValue: any;

      render(
        <CurrencyProvider>
          <TestComponent onContextReady={(ctx) => (contextValue = ctx)} />
        </CurrencyProvider>
      );

      await waitFor(() => {
        expect(contextValue?.isInitialized).toBe(false);
        expect(contextValue?.error).toBe('Init failed');
        expect(contextValue?.isLoading).toBe(false);
      });
    });
  });

  describe('currency operations', () => {
    it('should update currency successfully', async () => {
      currencySettingsService.updateCurrency.mockResolvedValue(undefined);

      let contextValue: any;

      render(
        <CurrencyProvider>
          <TestComponent onContextReady={(ctx) => (contextValue = ctx)} />
        </CurrencyProvider>
      );

      await waitFor(() => {
        expect(contextValue?.isInitialized).toBe(true);
      });

      await act(async () => {
        await contextValue.updateCurrency(customCurrency);
      });

      expect(currencySettingsService.updateCurrency).toHaveBeenCalledWith(
        customCurrency
      );
    });

    it('should reset to default currency', async () => {
      currencySettingsService.resetToDefault.mockResolvedValue(undefined);

      let contextValue: any;

      render(
        <CurrencyProvider>
          <TestComponent onContextReady={(ctx) => (contextValue = ctx)} />
        </CurrencyProvider>
      );

      await waitFor(() => {
        expect(contextValue?.isInitialized).toBe(true);
      });

      await act(async () => {
        await contextValue.resetToDefault();
      });

      expect(currencySettingsService.resetToDefault).toHaveBeenCalled();
    });

    it('should refresh currencies', async () => {
      currencySettingsService.syncWithShopSettings.mockResolvedValue(undefined);
      currencySettingsService.getCustomCurrencies.mockResolvedValue([
        customCurrency,
      ]);

      let contextValue: any;

      render(
        <CurrencyProvider>
          <TestComponent onContextReady={(ctx) => (contextValue = ctx)} />
        </CurrencyProvider>
      );

      await waitFor(() => {
        expect(contextValue?.isInitialized).toBe(true);
      });

      await act(async () => {
        await contextValue.refreshCurrencies();
      });

      expect(currencySettingsService.syncWithShopSettings).toHaveBeenCalled();
      expect(currencySettingsService.getCustomCurrencies).toHaveBeenCalled();
    });
  });

  describe('formatting utilities', () => {
    it('should provide formatting functions', async () => {
      currencySettingsService.formatPrice.mockReturnValue('$123.45');
      currencySettingsService.parsePrice.mockReturnValue(123.45);
      currencySettingsService.validatePriceInput.mockReturnValue({
        isValid: true,
        value: 123.45,
      });

      let contextValue: any;

      render(
        <CurrencyProvider>
          <TestComponent onContextReady={(ctx) => (contextValue = ctx)} />
        </CurrencyProvider>
      );

      await waitFor(() => {
        expect(contextValue?.isInitialized).toBe(true);
      });

      expect(contextValue.formatPrice(123.45)).toBe('$123.45');
      expect(contextValue.parsePrice('$123.45')).toBe(123.45);
      expect(contextValue.validatePriceInput('$123.45')).toEqual({
        isValid: true,
        value: 123.45,
      });
    });
  });

  describe('custom currency management', () => {
    it('should save custom currency', async () => {
      currencySettingsService.saveCustomCurrency.mockResolvedValue(undefined);
      currencySettingsService.getCustomCurrencies.mockResolvedValue([
        customCurrency,
      ]);

      let contextValue: any;

      render(
        <CurrencyProvider>
          <TestComponent onContextReady={(ctx) => (contextValue = ctx)} />
        </CurrencyProvider>
      );

      await waitFor(() => {
        expect(contextValue?.isInitialized).toBe(true);
      });

      await act(async () => {
        await contextValue.saveCustomCurrency(customCurrency);
      });

      expect(currencySettingsService.saveCustomCurrency).toHaveBeenCalledWith(
        customCurrency
      );
    });

    it('should delete custom currency', async () => {
      currencySettingsService.deleteCustomCurrency.mockResolvedValue(undefined);
      currencySettingsService.getCustomCurrencies.mockResolvedValue([]);

      let contextValue: any;

      render(
        <CurrencyProvider>
          <TestComponent onContextReady={(ctx) => (contextValue = ctx)} />
        </CurrencyProvider>
      );

      await waitFor(() => {
        expect(contextValue?.isInitialized).toBe(true);
      });

      await act(async () => {
        await contextValue.deleteCustomCurrency('XYZ');
      });

      expect(currencySettingsService.deleteCustomCurrency).toHaveBeenCalledWith(
        'XYZ'
      );
    });

    it('should get all available currencies', async () => {
      const availableCurrencies = {
        predefined: { USD: mockCurrency },
        custom: [customCurrency],
      };
      currencySettingsService.getAllAvailableCurrencies.mockResolvedValue(
        availableCurrencies
      );

      let contextValue: any;

      render(
        <CurrencyProvider>
          <TestComponent onContextReady={(ctx) => (contextValue = ctx)} />
        </CurrencyProvider>
      );

      await waitFor(() => {
        expect(contextValue?.isInitialized).toBe(true);
      });

      const result = await contextValue.getAllAvailableCurrencies();
      expect(result).toEqual(availableCurrencies);
    });
  });

  describe('utility functions', () => {
    it('should provide utility functions', async () => {
      currencySettingsService.usesDecimals.mockReturnValue(true);
      currencySettingsService.getCurrencyInfo.mockReturnValue({
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        example: '$1,234.56',
      });

      let contextValue: any;

      render(
        <CurrencyProvider>
          <TestComponent onContextReady={(ctx) => (contextValue = ctx)} />
        </CurrencyProvider>
      );

      await waitFor(() => {
        expect(contextValue?.isInitialized).toBe(true);
      });

      expect(contextValue.usesDecimals()).toBe(true);
      expect(contextValue.getCurrencyInfo()).toEqual({
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        example: '$1,234.56',
      });
    });
  });

  describe('error handling', () => {
    it('should handle currency update errors', async () => {
      currencySettingsService.updateCurrency.mockRejectedValue(
        new Error('Update failed')
      );

      let contextValue: any;

      render(
        <CurrencyProvider>
          <TestComponent onContextReady={(ctx) => (contextValue = ctx)} />
        </CurrencyProvider>
      );

      await waitFor(() => {
        expect(contextValue?.isInitialized).toBe(true);
      });

      await expect(contextValue.updateCurrency(customCurrency)).rejects.toThrow(
        'Update failed'
      );
    });

    it('should handle custom currency save errors', async () => {
      currencySettingsService.saveCustomCurrency.mockRejectedValue(
        new Error('Save failed')
      );

      let contextValue: any;

      render(
        <CurrencyProvider>
          <TestComponent onContextReady={(ctx) => (contextValue = ctx)} />
        </CurrencyProvider>
      );

      await waitFor(() => {
        expect(contextValue?.isInitialized).toBe(true);
      });

      await expect(
        contextValue.saveCustomCurrency(customCurrency)
      ).rejects.toThrow('Save failed');
    });
  });
});
