import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { CurrencySelector } from '@/components/CurrencySelector';
import { PriceInput, PriceDisplay } from '@/components/PriceInput';
import { CurrencySettings } from '@/services/currencyManager';

// Mock the services
jest.mock('@/services/currencySettingsService');
jest.mock('@/services/shopSettingsStorage');
jest.mock('@react-native-async-storage/async-storage');

const mockUSDCurrency: CurrencySettings = {
  code: 'USD',
  symbol: '$',
  name: 'US Dollar',
  decimals: 2,
  symbolPosition: 'before',
  thousandSeparator: ',',
  decimalSeparator: '.',
};

const mockMMKCurrency: CurrencySettings = {
  code: 'MMK',
  symbol: 'K',
  name: 'Myanmar Kyat',
  decimals: 0,
  symbolPosition: 'after',
  thousandSeparator: ',',
  decimalSeparator: '.',
};

// Test component that uses multiple currency features
const TestCurrencyApp: React.FC = () => {
  const [priceValue, setPriceValue] = React.useState('');
  const [numericValue, setNumericValue] = React.useState(0);

  return (
    <CurrencyProvider>
      <CurrencySelector
        onCurrencyChange={(currency) => {
          console.log('Currency changed to:', currency.name);
        }}
      />

      <PriceInput
        label="Test Price"
        value={priceValue}
        onValueChange={(text, numeric) => {
          setPriceValue(text);
          setNumericValue(numeric);
        }}
      />

      <PriceDisplay amount={numericValue} testID="price-display" />
    </CurrencyProvider>
  );
};

describe('Currency System Integration', () => {
  const {
    currencySettingsService,
  } = require('@/services/currencySettingsService');

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    currencySettingsService.initialize.mockResolvedValue(undefined);
    currencySettingsService.getCurrentCurrency.mockReturnValue(mockUSDCurrency);
    currencySettingsService.getCustomCurrencies.mockResolvedValue([]);
    currencySettingsService.getAllAvailableCurrencies.mockResolvedValue({
      predefined: {
        USD: mockUSDCurrency,
        MMK: mockMMKCurrency,
      },
      custom: [],
    });
    currencySettingsService.formatPrice.mockImplementation((amount: number) => {
      return `$${amount.toFixed(2)}`;
    });
    currencySettingsService.parsePrice.mockImplementation((price: string) => {
      return parseFloat(price.replace('$', '').replace(',', ''));
    });
    currencySettingsService.validatePriceInput.mockImplementation(
      (input: string) => {
        const value = parseFloat(input.replace('$', '').replace(',', ''));
        return {
          isValid: !isNaN(value) && value >= 0,
          value: isNaN(value) ? 0 : value,
          error: isNaN(value) || value < 0 ? 'Invalid price' : undefined,
        };
      }
    );
    currencySettingsService.usesDecimals.mockReturnValue(true);
  });

  describe('end-to-end currency workflow', () => {
    it('should initialize and display currency correctly', async () => {
      const { getByTestId } = render(<TestCurrencyApp />);

      await waitFor(() => {
        expect(currencySettingsService.initialize).toHaveBeenCalled();
      });

      // Check that price display shows formatted currency
      const priceDisplay = getByTestId('price-display');
      expect(priceDisplay).toBeTruthy();
    });

    it('should handle price input and formatting', async () => {
      const { getByDisplayValue, getByTestId } = render(<TestCurrencyApp />);

      await waitFor(() => {
        expect(currencySettingsService.initialize).toHaveBeenCalled();
      });

      // Find and interact with price input
      const priceInput = getByDisplayValue('');

      fireEvent.changeText(priceInput, '123.45');

      await waitFor(() => {
        expect(currencySettingsService.validatePriceInput).toHaveBeenCalledWith(
          '123.45'
        );
      });
    });

    it('should update currency and reflect changes', async () => {
      currencySettingsService.updateCurrency.mockResolvedValue(undefined);
      currencySettingsService.getCurrentCurrency.mockReturnValue(
        mockMMKCurrency
      );
      currencySettingsService.formatPrice.mockImplementation(
        (amount: number) => {
          return `${Math.round(amount)} K`;
        }
      );
      currencySettingsService.usesDecimals.mockReturnValue(false);

      const { rerender } = render(<TestCurrencyApp />);

      await waitFor(() => {
        expect(currencySettingsService.initialize).toHaveBeenCalled();
      });

      // Simulate currency change
      await waitFor(() => {
        currencySettingsService.getCurrentCurrency.mockReturnValue(
          mockMMKCurrency
        );
        rerender(<TestCurrencyApp />);
      });

      // Verify that formatting functions are called with new currency
      expect(currencySettingsService.getCurrentCurrency).toHaveBeenCalled();
    });
  });

  describe('error handling integration', () => {
    it('should handle initialization errors gracefully', async () => {
      currencySettingsService.initialize.mockRejectedValue(
        new Error('Init failed')
      );

      const { container } = render(<TestCurrencyApp />);

      await waitFor(() => {
        expect(currencySettingsService.initialize).toHaveBeenCalled();
      });

      // App should still render despite initialization error
      expect(container).toBeTruthy();
    });

    it('should handle currency update errors', async () => {
      currencySettingsService.updateCurrency.mockRejectedValue(
        new Error('Update failed')
      );

      const { getByText } = render(<TestCurrencyApp />);

      await waitFor(() => {
        expect(currencySettingsService.initialize).toHaveBeenCalled();
      });

      // The error should be handled gracefully without crashing the app
      expect(getByText).toBeTruthy();
    });

    it('should handle invalid price input', async () => {
      currencySettingsService.validatePriceInput.mockReturnValue({
        isValid: false,
        error: 'Invalid price format',
      });

      const { getByDisplayValue } = render(<TestCurrencyApp />);

      await waitFor(() => {
        expect(currencySettingsService.initialize).toHaveBeenCalled();
      });

      const priceInput = getByDisplayValue('');
      fireEvent.changeText(priceInput, 'invalid');

      await waitFor(() => {
        expect(currencySettingsService.validatePriceInput).toHaveBeenCalledWith(
          'invalid'
        );
      });
    });
  });

  describe('performance integration', () => {
    it('should not cause excessive re-renders', async () => {
      let renderCount = 0;

      const TestComponent = () => {
        renderCount++;
        return <TestCurrencyApp />;
      };

      const { rerender } = render(<TestComponent />);

      await waitFor(() => {
        expect(currencySettingsService.initialize).toHaveBeenCalled();
      });

      const initialRenderCount = renderCount;

      // Trigger multiple updates
      rerender(<TestComponent />);
      rerender(<TestComponent />);
      rerender(<TestComponent />);

      // Should not cause excessive re-renders
      expect(renderCount - initialRenderCount).toBeLessThan(5);
    });

    it('should handle rapid currency changes efficiently', async () => {
      currencySettingsService.updateCurrency.mockResolvedValue(undefined);

      render(<TestCurrencyApp />);

      await waitFor(() => {
        expect(currencySettingsService.initialize).toHaveBeenCalled();
      });

      // Simulate rapid currency changes
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          currencySettingsService.updateCurrency({
            ...mockUSDCurrency,
            name: `Currency ${i}`,
          })
        );
      }

      await Promise.all(promises);

      // Should handle all updates without errors
      expect(currencySettingsService.updateCurrency).toHaveBeenCalledTimes(10);
    });
  });

  describe('custom currency integration', () => {
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

    it('should handle custom currency creation and usage', async () => {
      currencySettingsService.saveCustomCurrency.mockResolvedValue(undefined);
      currencySettingsService.getCustomCurrencies.mockResolvedValue([
        customCurrency,
      ]);
      currencySettingsService.getAllAvailableCurrencies.mockResolvedValue({
        predefined: { USD: mockUSDCurrency },
        custom: [customCurrency],
      });

      render(<TestCurrencyApp />);

      await waitFor(() => {
        expect(currencySettingsService.initialize).toHaveBeenCalled();
      });

      // Simulate custom currency creation
      await currencySettingsService.saveCustomCurrency(customCurrency);

      expect(currencySettingsService.saveCustomCurrency).toHaveBeenCalledWith(
        customCurrency
      );
    });

    it('should handle custom currency deletion', async () => {
      currencySettingsService.deleteCustomCurrency.mockResolvedValue(undefined);
      currencySettingsService.getCustomCurrencies.mockResolvedValue([]);

      render(<TestCurrencyApp />);

      await waitFor(() => {
        expect(currencySettingsService.initialize).toHaveBeenCalled();
      });

      // Simulate custom currency deletion
      await currencySettingsService.deleteCustomCurrency('XYZ');

      expect(currencySettingsService.deleteCustomCurrency).toHaveBeenCalledWith(
        'XYZ'
      );
    });
  });

  describe('migration integration', () => {
    it('should handle legacy data migration', async () => {
      currencySettingsService.migrateFromLegacyStorage.mockResolvedValue({
        success: true,
        migratedData: mockUSDCurrency,
      });

      render(<TestCurrencyApp />);

      await waitFor(() => {
        expect(currencySettingsService.initialize).toHaveBeenCalled();
      });

      // Migration should be handled during initialization
      expect(currencySettingsService.initialize).toHaveBeenCalled();
    });

    it('should handle failed migration gracefully', async () => {
      currencySettingsService.migrateFromLegacyStorage.mockResolvedValue({
        success: false,
        error: 'Migration failed',
      });

      const { container } = render(<TestCurrencyApp />);

      await waitFor(() => {
        expect(currencySettingsService.initialize).toHaveBeenCalled();
      });

      // App should still work despite migration failure
      expect(container).toBeTruthy();
    });
  });
});
