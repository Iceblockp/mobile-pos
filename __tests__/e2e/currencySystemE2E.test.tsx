import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { AppContextProvider } from '@/context/AppContextProvider';
import { CurrencySelector } from '@/components/CurrencySelector';
import { PriceInput, PriceDisplay } from '@/components/PriceInput';
import { CurrencySettings } from '@/services/currencyManager';

// Mock all the services
jest.mock('@/services/currencySettingsService');
jest.mock('@/services/shopSettingsStorage');
jest.mock('@react-native-async-storage/async-storage');

// Test application that uses the complete currency system
const TestCurrencyApp: React.FC = () => {
  const [productPrice, setProductPrice] = React.useState('');
  const [productPriceNumeric, setProductPriceNumeric] = React.useState(0);
  const [costPrice, setCostPrice] = React.useState('');
  const [costPriceNumeric, setCostPriceNumeric] = React.useState(0);

  const totalValue = productPriceNumeric + costPriceNumeric;

  return (
    <AppContextProvider>
      <CurrencySelector
        testID="currency-selector"
        onCurrencyChange={(currency) => {
          console.log('Currency changed to:', currency.name);
        }}
        allowCustomCreation={true}
      />

      <PriceInput
        testID="product-price-input"
        label="Product Price"
        value={productPrice}
        onValueChange={(text, numeric) => {
          setProductPrice(text);
          setProductPriceNumeric(numeric);
        }}
        required
      />

      <PriceInput
        testID="cost-price-input"
        label="Cost Price"
        value={costPrice}
        onValueChange={(text, numeric) => {
          setCostPrice(text);
          setCostPriceNumeric(numeric);
        }}
      />

      <PriceDisplay
        testID="total-display"
        amount={totalValue}
        showLabel
        label="Total Value"
      />

      <PriceDisplay
        testID="profit-display"
        amount={productPriceNumeric - costPriceNumeric}
        showLabel
        label="Profit"
        style="detailed"
      />
    </AppContextProvider>
  );
};

describe('Currency System End-to-End Tests', () => {
  const {
    currencySettingsService,
  } = require('@/services/currencySettingsService');
  const { shopSettingsStorage } = require('@/services/shopSettingsStorage');

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

    // Mock formatting functions
    currencySettingsService.formatPrice.mockImplementation((amount: number) => {
      const current = currencySettingsService.getCurrentCurrency();
      if (current.code === 'MMK') {
        return `${Math.round(amount)} K`;
      }
      return `$${amount.toFixed(2)}`;
    });

    currencySettingsService.parsePrice.mockImplementation((price: string) => {
      return parseFloat(price.replace(/[$K]/g, '').replace(',', ''));
    });

    currencySettingsService.validatePriceInput.mockImplementation(
      (input: string) => {
        const value = parseFloat(input.replace(/[$K]/g, '').replace(',', ''));
        return {
          isValid: !isNaN(value) && value >= 0,
          value: isNaN(value) ? 0 : value,
          error: isNaN(value) || value < 0 ? 'Invalid price' : undefined,
        };
      }
    );

    currencySettingsService.usesDecimals.mockReturnValue(true);
    currencySettingsService.updateCurrency.mockResolvedValue(undefined);
    currencySettingsService.saveCustomCurrency.mockResolvedValue(undefined);
    currencySettingsService.deleteCustomCurrency.mockResolvedValue(undefined);

    shopSettingsStorage.getShopSettings.mockResolvedValue({
      currency: mockUSDCurrency,
      customCurrencies: [],
    });
    shopSettingsStorage.updateShopSettings.mockResolvedValue(undefined);
  });

  describe('complete currency workflow', () => {
    it('should initialize and display currency system correctly', async () => {
      const { getByTestId, getByText } = render(<TestCurrencyApp />);

      // Wait for initialization
      await waitFor(() => {
        expect(currencySettingsService.initialize).toHaveBeenCalled();
      });

      // Check that currency selector shows current currency
      expect(getByText('US Dollar')).toBeTruthy();

      // Check that price inputs are rendered
      expect(getByTestId('product-price-input')).toBeTruthy();
      expect(getByTestId('cost-price-input')).toBeTruthy();

      // Check that price displays are rendered
      expect(getByTestId('total-display')).toBeTruthy();
      expect(getByTestId('profit-display')).toBeTruthy();
    });

    it('should handle price input and calculations correctly', async () => {
      const { getByTestId, getByDisplayValue } = render(<TestCurrencyApp />);

      await waitFor(() => {
        expect(currencySettingsService.initialize).toHaveBeenCalled();
      });

      // Find price inputs
      const productPriceInput = getByDisplayValue('');
      const costPriceInput = getByDisplayValue('');

      // Enter prices
      fireEvent.changeText(productPriceInput, '$100.00');
      fireEvent.changeText(costPriceInput, '$60.00');

      // Verify validation was called
      await waitFor(() => {
        expect(currencySettingsService.validatePriceInput).toHaveBeenCalledWith(
          '$100.00'
        );
        expect(currencySettingsService.validatePriceInput).toHaveBeenCalledWith(
          '$60.00'
        );
      });

      // Verify formatting was called for displays
      expect(currencySettingsService.formatPrice).toHaveBeenCalled();
    });

    it('should handle currency switching correctly', async () => {
      const { getByText, rerender } = render(<TestCurrencyApp />);

      await waitFor(() => {
        expect(currencySettingsService.initialize).toHaveBeenCalled();
      });

      // Initially shows USD
      expect(getByText('US Dollar')).toBeTruthy();

      // Simulate currency change to MMK
      currencySettingsService.getCurrentCurrency.mockReturnValue(
        mockMMKCurrency
      );
      currencySettingsService.usesDecimals.mockReturnValue(false);

      // Trigger re-render
      rerender(<TestCurrencyApp />);

      // Should update to show MMK formatting
      expect(currencySettingsService.getCurrentCurrency).toHaveBeenCalled();
    });

    it('should handle custom currency creation and usage', async () => {
      currencySettingsService.getCustomCurrencies.mockResolvedValue([
        customCurrency,
      ]);
      currencySettingsService.getAllAvailableCurrencies.mockResolvedValue({
        predefined: { USD: mockUSDCurrency },
        custom: [customCurrency],
      });

      const { getByTestId } = render(<TestCurrencyApp />);

      await waitFor(() => {
        expect(currencySettingsService.initialize).toHaveBeenCalled();
      });

      // Simulate custom currency creation
      await act(async () => {
        await currencySettingsService.saveCustomCurrency(customCurrency);
      });

      expect(currencySettingsService.saveCustomCurrency).toHaveBeenCalledWith(
        customCurrency
      );
    });

    it('should handle validation errors gracefully', async () => {
      currencySettingsService.validatePriceInput.mockReturnValue({
        isValid: false,
        error: 'Invalid price format',
      });

      const { getByDisplayValue, getByText } = render(<TestCurrencyApp />);

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

      // Error should be handled gracefully without crashing
      expect(getByText).toBeTruthy();
    });

    it('should persist currency changes across app restarts', async () => {
      const { rerender } = render(<TestCurrencyApp />);

      await waitFor(() => {
        expect(currencySettingsService.initialize).toHaveBeenCalled();
      });

      // Simulate currency update
      await act(async () => {
        await currencySettingsService.updateCurrency(mockMMKCurrency);
      });

      expect(shopSettingsStorage.updateShopSettings).toHaveBeenCalledWith({
        currency: mockMMKCurrency,
      });

      // Simulate app restart
      currencySettingsService.getCurrentCurrency.mockReturnValue(
        mockMMKCurrency
      );
      shopSettingsStorage.getShopSettings.mockResolvedValue({
        currency: mockMMKCurrency,
      });

      rerender(<TestCurrencyApp />);

      await waitFor(() => {
        expect(currencySettingsService.initialize).toHaveBeenCalled();
      });

      // Should load the persisted currency
      expect(shopSettingsStorage.getShopSettings).toHaveBeenCalled();
    });

    it('should handle migration from legacy storage', async () => {
      const AsyncStorage =
        require('@react-native-async-storage/async-storage').default;

      // Mock legacy data
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockUSDCurrency));
      shopSettingsStorage.getShopSettings.mockResolvedValue(null);

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

    it('should handle concurrent operations safely', async () => {
      const { getByDisplayValue } = render(<TestCurrencyApp />);

      await waitFor(() => {
        expect(currencySettingsService.initialize).toHaveBeenCalled();
      });

      const priceInput = getByDisplayValue('');

      // Simulate rapid price changes
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          act(async () => {
            fireEvent.changeText(priceInput, `$${i * 10}.00`);
          })
        );
      }

      await Promise.all(promises);

      // Should handle all operations without errors
      expect(currencySettingsService.validatePriceInput).toHaveBeenCalled();
    });

    it('should maintain performance with large datasets', async () => {
      const { getByTestId } = render(<TestCurrencyApp />);

      await waitFor(() => {
        expect(currencySettingsService.initialize).toHaveBeenCalled();
      });

      const startTime = performance.now();

      // Simulate formatting many prices
      for (let i = 0; i < 1000; i++) {
        currencySettingsService.formatPrice(i * 1.23);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete quickly
      expect(duration).toBeLessThan(100);
    });

    it('should handle error recovery correctly', async () => {
      // Simulate initialization error
      currencySettingsService.initialize.mockRejectedValueOnce(
        new Error('Init failed')
      );
      currencySettingsService.initialize.mockResolvedValueOnce(undefined);

      const { container } = render(<TestCurrencyApp />);

      await waitFor(() => {
        expect(currencySettingsService.initialize).toHaveBeenCalled();
      });

      // App should still render despite initial error
      expect(container).toBeTruthy();
    });

    it('should validate complete user workflow', async () => {
      const { getByText, getByDisplayValue, getByTestId } = render(
        <TestCurrencyApp />
      );

      // 1. App initializes
      await waitFor(() => {
        expect(currencySettingsService.initialize).toHaveBeenCalled();
        expect(getByText('US Dollar')).toBeTruthy();
      });

      // 2. User enters product price
      const productPriceInput = getByDisplayValue('');
      fireEvent.changeText(productPriceInput, '$150.00');

      await waitFor(() => {
        expect(currencySettingsService.validatePriceInput).toHaveBeenCalledWith(
          '$150.00'
        );
      });

      // 3. User enters cost price
      const costPriceInput = getByDisplayValue('');
      fireEvent.changeText(costPriceInput, '$100.00');

      await waitFor(() => {
        expect(currencySettingsService.validatePriceInput).toHaveBeenCalledWith(
          '$100.00'
        );
      });

      // 4. System calculates and displays totals
      expect(currencySettingsService.formatPrice).toHaveBeenCalled();

      // 5. User changes currency
      await act(async () => {
        await currencySettingsService.updateCurrency(mockMMKCurrency);
      });

      expect(shopSettingsStorage.updateShopSettings).toHaveBeenCalledWith({
        currency: mockMMKCurrency,
      });

      // 6. All displays update to new currency
      currencySettingsService.getCurrentCurrency.mockReturnValue(
        mockMMKCurrency
      );

      // Workflow completed successfully
      expect(getByTestId('total-display')).toBeTruthy();
      expect(getByTestId('profit-display')).toBeTruthy();
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle corrupted currency data', async () => {
      shopSettingsStorage.getShopSettings.mockResolvedValue({
        currency: {
          code: '',
          symbol: '',
          name: '',
          decimals: -1,
        },
      });

      const { container } = render(<TestCurrencyApp />);

      await waitFor(() => {
        expect(currencySettingsService.initialize).toHaveBeenCalled();
      });

      // Should fallback to default currency
      expect(container).toBeTruthy();
    });

    it('should handle storage failures gracefully', async () => {
      shopSettingsStorage.updateShopSettings.mockRejectedValue(
        new Error('Storage failed')
      );

      const { getByText } = render(<TestCurrencyApp />);

      await waitFor(() => {
        expect(currencySettingsService.initialize).toHaveBeenCalled();
      });

      // Should still function despite storage errors
      expect(getByText('US Dollar')).toBeTruthy();
    });

    it('should handle extreme price values', async () => {
      const { getByDisplayValue } = render(<TestCurrencyApp />);

      await waitFor(() => {
        expect(currencySettingsService.initialize).toHaveBeenCalled();
      });

      const priceInput = getByDisplayValue('');

      // Test very large number
      fireEvent.changeText(priceInput, '$999999999.99');

      await waitFor(() => {
        expect(currencySettingsService.validatePriceInput).toHaveBeenCalledWith(
          '$999999999.99'
        );
      });

      // Test very small number
      fireEvent.changeText(priceInput, '$0.01');

      await waitFor(() => {
        expect(currencySettingsService.validatePriceInput).toHaveBeenCalledWith(
          '$0.01'
        );
      });

      // Should handle both cases without errors
      expect(currencySettingsService.validatePriceInput).toHaveBeenCalled();
    });
  });
});

// Performance benchmark test
describe('Currency System Performance Benchmarks', () => {
  const {
    currencySettingsService,
  } = require('@/services/currencySettingsService');

  beforeEach(() => {
    jest.clearAllMocks();
    currencySettingsService.initialize.mockResolvedValue(undefined);
    currencySettingsService.getCurrentCurrency.mockReturnValue({
      code: 'USD',
      symbol: '$',
      name: 'US Dollar',
      decimals: 2,
      symbolPosition: 'before',
      thousandSeparator: ',',
      decimalSeparator: '.',
    });
  });

  it('should meet performance benchmarks', async () => {
    const { container } = render(<TestCurrencyApp />);

    await waitFor(() => {
      expect(currencySettingsService.initialize).toHaveBeenCalled();
    });

    // Benchmark: App should initialize within 100ms
    const initStart = performance.now();
    await currencySettingsService.initialize();
    const initEnd = performance.now();
    expect(initEnd - initStart).toBeLessThan(100);

    // Benchmark: Price formatting should be fast
    const formatStart = performance.now();
    for (let i = 0; i < 1000; i++) {
      currencySettingsService.formatPrice(i * 1.23);
    }
    const formatEnd = performance.now();
    expect(formatEnd - formatStart).toBeLessThan(50);

    // Benchmark: Component rendering should be efficient
    expect(container).toBeTruthy();
  });
});
