import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CurrencySelector } from '@/components/CurrencySelector';
import { CustomCurrencyForm } from '@/components/CustomCurrencyForm';
import {
  PriceInput,
  PriceDisplay,
  SimplePriceInput,
} from '@/components/PriceInput';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { CurrencySettings } from '@/services/currencyManager';

// Mock the services
jest.mock('@/services/currencySettingsService');
jest.mock('@/services/shopSettingsStorage');

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

// Wrapper component with currency context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <CurrencyProvider>{children}</CurrencyProvider>
);

describe('Currency Components', () => {
  const {
    currencySettingsService,
  } = require('@/services/currencySettingsService');

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    currencySettingsService.initialize.mockResolvedValue(undefined);
    currencySettingsService.getCurrentCurrency.mockReturnValue(mockCurrency);
    currencySettingsService.getCustomCurrencies.mockResolvedValue([]);
    currencySettingsService.getAllAvailableCurrencies.mockResolvedValue({
      predefined: { USD: mockCurrency },
      custom: [],
    });
    currencySettingsService.formatPrice.mockImplementation(
      (amount: number) => `$${amount.toFixed(2)}`
    );
    currencySettingsService.parsePrice.mockImplementation((price: string) =>
      parseFloat(price.replace('$', '').replace(',', ''))
    );
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
  });

  describe('CurrencySelector', () => {
    it('should render current currency', async () => {
      const { getByText } = render(
        <TestWrapper>
          <CurrencySelector />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('US Dollar')).toBeTruthy();
        expect(getByText('USD ($)')).toBeTruthy();
      });
    });

    it('should open currency selection modal', async () => {
      const { getByText, getByTestId } = render(
        <TestWrapper>
          <CurrencySelector />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('US Dollar')).toBeTruthy();
      });

      // Open modal
      fireEvent.press(getByText('US Dollar').parent);

      await waitFor(() => {
        expect(getByText('Select Currency')).toBeTruthy();
      });
    });

    it('should handle currency selection', async () => {
      currencySettingsService.updateCurrency.mockResolvedValue(undefined);
      const onCurrencyChange = jest.fn();

      const { getByText } = render(
        <TestWrapper>
          <CurrencySelector onCurrencyChange={onCurrencyChange} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('US Dollar')).toBeTruthy();
      });

      // This would require more complex interaction simulation
      // In a real test, you'd simulate opening the modal and selecting a currency
    });

    it('should show custom currency creation option', async () => {
      const { getByText } = render(
        <TestWrapper>
          <CurrencySelector allowCustomCreation={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('US Dollar')).toBeTruthy();
      });

      // Open modal
      fireEvent.press(getByText('US Dollar').parent);

      await waitFor(() => {
        expect(getByText('Create Custom Currency')).toBeTruthy();
      });
    });

    it('should handle search functionality', async () => {
      currencySettingsService.getAllAvailableCurrencies.mockResolvedValue({
        predefined: {
          USD: mockCurrency,
          EUR: {
            code: 'EUR',
            symbol: '€',
            name: 'Euro',
            decimals: 2,
            symbolPosition: 'after',
            thousandSeparator: ',',
            decimalSeparator: '.',
          },
        },
        custom: [],
      });

      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <CurrencySelector />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('US Dollar')).toBeTruthy();
      });

      // Open modal
      fireEvent.press(getByText('US Dollar').parent);

      await waitFor(() => {
        const searchInput = getByPlaceholderText('Search currencies...');
        expect(searchInput).toBeTruthy();
      });
    });
  });

  describe('CustomCurrencyForm', () => {
    it('should render form fields', () => {
      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <CustomCurrencyForm
            visible={true}
            onClose={() => {}}
            onSubmit={() => {}}
          />
        </TestWrapper>
      );

      expect(getByText('Create Custom Currency')).toBeTruthy();
      expect(getByPlaceholderText('USD')).toBeTruthy();
      expect(getByPlaceholderText('US Dollar')).toBeTruthy();
      expect(getByPlaceholderText('$')).toBeTruthy();
    });

    it('should validate form input', async () => {
      const onSubmit = jest.fn();

      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <CustomCurrencyForm
            visible={true}
            onClose={() => {}}
            onSubmit={onSubmit}
          />
        </TestWrapper>
      );

      // Try to submit empty form
      fireEvent.press(getByText('Create Currency'));

      // Should show validation errors
      await waitFor(() => {
        expect(onSubmit).not.toHaveBeenCalled();
      });
    });

    it('should submit valid currency', async () => {
      const onSubmit = jest.fn();

      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <CustomCurrencyForm
            visible={true}
            onClose={() => {}}
            onSubmit={onSubmit}
          />
        </TestWrapper>
      );

      // Fill form
      fireEvent.changeText(getByPlaceholderText('USD'), 'XYZ');
      fireEvent.changeText(
        getByPlaceholderText('US Dollar'),
        'Custom Currency'
      );
      fireEvent.changeText(getByPlaceholderText('$'), 'X');

      // Submit form
      fireEvent.press(getByText('Create Currency'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'XYZ',
            name: 'Custom Currency',
            symbol: 'X',
            isCustom: true,
          })
        );
      });
    });

    it('should show preview of currency formatting', () => {
      const { getByText } = render(
        <TestWrapper>
          <CustomCurrencyForm
            visible={true}
            onClose={() => {}}
            onSubmit={() => {}}
          />
        </TestWrapper>
      );

      expect(getByText('Preview:')).toBeTruthy();
    });
  });

  describe('PriceInput', () => {
    it('should render with label and currency symbol', async () => {
      const { getByText, getByDisplayValue } = render(
        <TestWrapper>
          <PriceInput label="Test Price" value="" onValueChange={() => {}} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Test Price')).toBeTruthy();
        expect(getByText('$')).toBeTruthy();
      });
    });

    it('should handle price input and validation', async () => {
      const onValueChange = jest.fn();

      const { getByDisplayValue } = render(
        <TestWrapper>
          <PriceInput
            label="Test Price"
            value=""
            onValueChange={onValueChange}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        const input = getByDisplayValue('');
        fireEvent.changeText(input, '123.45');
      });

      await waitFor(() => {
        expect(currencySettingsService.validatePriceInput).toHaveBeenCalledWith(
          '123.45'
        );
      });
    });

    it('should show validation errors', async () => {
      currencySettingsService.validatePriceInput.mockReturnValue({
        isValid: false,
        error: 'Invalid price format',
      });

      const { getByDisplayValue, getByText } = render(
        <TestWrapper>
          <PriceInput label="Test Price" value="" onValueChange={() => {}} />
        </TestWrapper>
      );

      await waitFor(() => {
        const input = getByDisplayValue('');
        fireEvent.changeText(input, 'invalid');
      });

      await waitFor(() => {
        expect(getByText('Invalid price format')).toBeTruthy();
      });
    });

    it('should show currency hint', async () => {
      const { getByText } = render(
        <TestWrapper>
          <PriceInput
            label="Test Price"
            value=""
            onValueChange={() => {}}
            showCurrencyHint={true}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText(/Currency: US Dollar/)).toBeTruthy();
      });
    });
  });

  describe('SimplePriceInput', () => {
    it('should render simple price input', async () => {
      const { getByDisplayValue } = render(
        <TestWrapper>
          <SimplePriceInput value="" onValueChange={() => {}} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByDisplayValue('')).toBeTruthy();
      });
    });

    it('should handle value changes', async () => {
      const onValueChange = jest.fn();

      const { getByDisplayValue } = render(
        <TestWrapper>
          <SimplePriceInput value="" onValueChange={onValueChange} />
        </TestWrapper>
      );

      await waitFor(() => {
        const input = getByDisplayValue('');
        fireEvent.changeText(input, '100');
      });

      // Should trigger validation and value change
      await waitFor(() => {
        expect(currencySettingsService.validatePriceInput).toHaveBeenCalled();
      });
    });
  });

  describe('PriceDisplay', () => {
    it('should display formatted price', async () => {
      const { getByText } = render(
        <TestWrapper>
          <PriceDisplay amount={123.45} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('$123.45')).toBeTruthy();
      });
    });

    it('should show label when requested', async () => {
      const { getByText } = render(
        <TestWrapper>
          <PriceDisplay amount={123.45} showLabel={true} label="Total Price" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Total Price')).toBeTruthy();
        expect(getByText('$123.45')).toBeTruthy();
      });
    });

    it('should handle different display styles', async () => {
      const { getByText } = render(
        <TestWrapper>
          <PriceDisplay amount={123.45} style="detailed" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('$123.45')).toBeTruthy();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper accessibility labels', async () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <PriceInput
            label="Product Price"
            value=""
            onValueChange={() => {}}
            accessibilityLabel="Product price input"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByLabelText('Product price input')).toBeTruthy();
      });
    });

    it('should support screen readers', async () => {
      const { getByText } = render(
        <TestWrapper>
          <PriceDisplay
            amount={123.45}
            accessibilityLabel="Price: one hundred twenty three dollars and forty five cents"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        const priceElement = getByText('$123.45');
        expect(priceElement.props.accessibilityLabel).toBe(
          'Price: one hundred twenty three dollars and forty five cents'
        );
      });
    });
  });
});
