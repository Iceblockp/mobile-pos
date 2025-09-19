# Currency Management System

## Overview

The enhanced currency management system provides a unified, consistent, and user-friendly way to handle currency formatting, validation, and management across the entire application. It supports both predefined currencies and custom user-created currencies.

## Architecture

### Core Components

1. **CurrencyManager** - Core currency formatting and validation logic
2. **CurrencySettingsService** - Enhanced service for currency operations and shop settings integration
3. **CurrencyContext** - React context for centralized currency state management
4. **Currency Components** - Standardized UI components for currency input and display

### Data Flow

```
User Input → CurrencyContext → CurrencySettingsService → ShopSettingsStorage → AsyncStorage
                ↓
         Currency Components ← CurrencyManager (formatting/validation)
```

## Getting Started

### Basic Setup

1. **Wrap your app with the currency provider:**

```tsx
import { CurrencyProvider } from '@/context/CurrencyContext';
import { AppContextProvider } from '@/context/AppContextProvider';

function App() {
  return <AppContextProvider>{/* Your app components */}</AppContextProvider>;
}
```

2. **Use currency hooks in your components:**

```tsx
import { useCurrencyFormatter } from '@/context/CurrencyContext';

function MyComponent() {
  const { formatPrice, parsePrice, currentCurrency } = useCurrencyFormatter();

  return (
    <Text>{formatPrice(123.45)}</Text> // Displays: $123.45
  );
}
```

## Core Concepts

### Currency Settings

Each currency has the following properties:

```typescript
interface CurrencySettings {
  code: string; // 'USD', 'EUR', 'MMK', etc.
  symbol: string; // '$', '€', 'K', etc.
  name: string; // 'US Dollar', 'Euro', etc.
  decimals: number; // 0 for MMK, 2 for USD/EUR
  symbolPosition: 'before' | 'after'; // '$100' vs '100€'
  thousandSeparator: string; // ',' or '.'
  decimalSeparator: string; // '.' or ','

  // Enhanced fields for custom currencies
  isCustom?: boolean; // true for user-created currencies
  createdAt?: string; // ISO date string
  lastUsed?: string; // ISO date string
}
```

### Predefined Currencies

The system includes these predefined currencies:

- **MMK** (Myanmar Kyat) - Default currency
- **USD** (US Dollar)
- **EUR** (Euro)
- **GBP** (British Pound)
- **JPY** (Japanese Yen)
- **CNY** (Chinese Yuan)
- **THB** (Thai Baht)

## Usage Examples

### Using Currency Context

```tsx
import { useCurrencyContext } from '@/context/CurrencyContext';

function CurrencyExample() {
  const {
    currentCurrency,
    updateCurrency,
    formatPrice,
    parsePrice,
    validatePriceInput,
  } = useCurrencyContext();

  const handleCurrencyChange = async (newCurrency) => {
    try {
      await updateCurrency(newCurrency);
      console.log('Currency updated successfully');
    } catch (error) {
      console.error('Failed to update currency:', error);
    }
  };

  return (
    <View>
      <Text>Current: {currentCurrency?.name}</Text>
      <Text>Formatted: {formatPrice(1234.56)}</Text>
    </View>
  );
}
```

### Using Price Input Components

```tsx
import {
  PriceInput,
  SimplePriceInput,
  PriceDisplay,
} from '@/components/PriceInput';

function PriceExample() {
  const [price, setPrice] = useState('');
  const [numericValue, setNumericValue] = useState(0);

  return (
    <View>
      {/* Full-featured price input */}
      <PriceInput
        label="Product Price"
        value={price}
        onValueChange={(text, numeric) => {
          setPrice(text);
          setNumericValue(numeric);
        }}
        required
        showCurrencyHint
      />

      {/* Simple price input */}
      <SimplePriceInput
        value={price}
        onValueChange={(text, numeric) => {
          setPrice(text);
          setNumericValue(numeric);
        }}
        placeholder="Enter price"
      />

      {/* Price display */}
      <PriceDisplay
        amount={numericValue}
        style="detailed"
        showLabel
        label="Total Price"
      />
    </View>
  );
}
```

### Using Currency Selector

```tsx
import { CurrencySelector } from '@/components/CurrencySelector';

function SettingsScreen() {
  return (
    <View>
      <CurrencySelector
        onCurrencyChange={(currency) => {
          console.log('Selected currency:', currency.name);
        }}
        showCustomCurrencies={true}
        allowCustomCreation={true}
      />
    </View>
  );
}
```

### Creating Custom Currencies

```tsx
import { useCustomCurrencies } from '@/context/CurrencyContext';

function CustomCurrencyExample() {
  const { saveCustomCurrency, deleteCustomCurrency, customCurrencies } =
    useCustomCurrencies();

  const createCustomCurrency = async () => {
    const customCurrency = {
      code: 'XYZ',
      symbol: 'X',
      name: 'My Custom Currency',
      decimals: 3,
      symbolPosition: 'after',
      thousandSeparator: '.',
      decimalSeparator: ',',
    };

    try {
      await saveCustomCurrency(customCurrency);
      console.log('Custom currency created');
    } catch (error) {
      console.error('Failed to create custom currency:', error);
    }
  };

  return (
    <View>
      <Button title="Create Custom Currency" onPress={createCustomCurrency} />

      {customCurrencies.map((currency) => (
        <View key={currency.code}>
          <Text>
            {currency.name} ({currency.code})
          </Text>
          <Button
            title="Delete"
            onPress={() => deleteCustomCurrency(currency.code)}
          />
        </View>
      ))}
    </View>
  );
}
```

## Advanced Usage

### Custom Hooks

```tsx
import { useCurrencyFormatter, usePriceState } from '@/components/PriceInput';

function AdvancedPriceComponent() {
  const { formatPrice, parsePrice, usesDecimals } = useCurrencyFormatter();
  const { numericValue, stringValue, updateValue, setNumericValue } =
    usePriceState(100);

  const handlePriceChange = (text, numeric) => {
    updateValue(text, numeric);

    // Custom logic here
    if (numeric > 1000) {
      console.log('High value item');
    }
  };

  return (
    <View>
      <Text>Uses decimals: {usesDecimals() ? 'Yes' : 'No'}</Text>
      <Text>Current value: {stringValue}</Text>
      <Text>Numeric value: {numericValue}</Text>
    </View>
  );
}
```

### Performance Optimization

```tsx
import { useOptimizedCurrencyFormatter } from '@/hooks/useCurrency';

function OptimizedComponent({ prices }) {
  const { formatPrice } = useOptimizedCurrencyFormatter();

  // This will be memoized for better performance
  const formattedPrices = useMemo(
    () => prices.map((price) => formatPrice(price)),
    [prices, formatPrice]
  );

  return (
    <FlatList
      data={formattedPrices}
      renderItem={({ item }) => <Text>{item}</Text>}
    />
  );
}
```

### Error Handling

```tsx
import { useCurrencyErrorHandler } from '@/hooks/useCurrency';

function ErrorHandlingExample() {
  const { error, hasError, clearError } = useCurrencyErrorHandler();

  if (hasError) {
    return (
      <View>
        <Text>Currency Error: {error}</Text>
        <Button title="Clear Error" onPress={clearError} />
      </View>
    );
  }

  return <YourNormalComponent />;
}
```

## API Reference

### CurrencyContext

#### Properties

- `currentCurrency: CurrencySettings | null` - Currently active currency
- `customCurrencies: CurrencySettings[]` - User-created custom currencies
- `isLoading: boolean` - Loading state
- `error: string | null` - Current error message
- `isInitialized: boolean` - Initialization status

#### Methods

- `updateCurrency(currency: CurrencySettings): Promise<void>` - Update active currency
- `resetToDefault(): Promise<void>` - Reset to default MMK currency
- `refreshCurrencies(): Promise<void>` - Refresh currency data
- `formatPrice(amount: number): string` - Format number as price
- `parsePrice(priceString: string): number` - Parse price string to number
- `validatePriceInput(input: string): ValidationResult` - Validate price input
- `saveCustomCurrency(currency: CurrencySettings): Promise<void>` - Save custom currency
- `deleteCustomCurrency(code: string): Promise<void>` - Delete custom currency

### PriceInput Component

#### Props

```typescript
interface PriceInputProps {
  label: string;
  value: string;
  onValueChange: (value: string, numericValue: number) => void;
  required?: boolean;
  showCurrencyHint?: boolean;
  showCurrencySymbol?: boolean;
  autoFormat?: boolean;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}
```

### CurrencySelector Component

#### Props

```typescript
interface CurrencySelectorProps {
  onCurrencyChange?: (currency: CurrencySettings) => void;
  showCustomCurrencies?: boolean;
  allowCustomCreation?: boolean;
  compact?: boolean;
}
```

## Migration Guide

### From Old Currency System

If you're migrating from the old currency system:

1. **Update imports:**

   ```tsx
   // Old
   import { useCurrencyFormatter } from '@/hooks/useCurrency';

   // New
   import { useCurrencyFormatter } from '@/context/CurrencyContext';
   ```

2. **Update PriceInput usage:**

   ```tsx
   // Old
   <PriceInput
     value={price}
     onChangeText={setPrice}
   />

   // New
   <PriceInput
     value={price}
     onValueChange={(text, numeric) => {
       setPrice(text);
       setNumericValue(numeric);
     }}
   />
   ```

3. **Wrap your app with the new provider:**

   ```tsx
   import { AppContextProvider } from '@/context/AppContextProvider';

   function App() {
     return <AppContextProvider>{/* Your app */}</AppContextProvider>;
   }
   ```

### Data Migration

The system automatically migrates data from the old currency storage to the new shop settings-based storage. No manual intervention is required.

## Troubleshooting

### Common Issues

1. **Currency not updating in components**

   - Ensure components are wrapped with `CurrencyProvider`
   - Check that you're using the correct hooks from `@/context/CurrencyContext`

2. **Price formatting not working**

   - Verify that the currency system is initialized
   - Check for any error messages in the currency context

3. **Custom currencies not saving**
   - Ensure the currency data is valid
   - Check AsyncStorage permissions
   - Verify shop settings are properly configured

### Debug Information

```tsx
import { useCurrencyContext } from '@/context/CurrencyContext';

function DebugInfo() {
  const { currentCurrency, isInitialized, error } = useCurrencyContext();

  return (
    <View>
      <Text>Initialized: {isInitialized ? 'Yes' : 'No'}</Text>
      <Text>Current Currency: {currentCurrency?.name || 'None'}</Text>
      <Text>Error: {error || 'None'}</Text>
    </View>
  );
}
```

## Best Practices

1. **Always use the currency context hooks** instead of directly accessing services
2. **Validate price inputs** before processing
3. **Handle errors gracefully** with proper user feedback
4. **Use memoization** for performance-critical formatting operations
5. **Test with different currencies** to ensure compatibility
6. **Provide clear error messages** for validation failures

## Testing

### Unit Testing

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { CurrencyProvider } from '@/context/CurrencyContext';

const TestWrapper = ({ children }) => (
  <CurrencyProvider>{children}</CurrencyProvider>
);

test('should format price correctly', async () => {
  const { getByText } = render(
    <TestWrapper>
      <YourComponent />
    </TestWrapper>
  );

  // Your test assertions
});
```

### Integration Testing

```tsx
import { currencySettingsService } from '@/services/currencySettingsService';

test('should handle currency updates', async () => {
  const mockCurrency = {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimals: 2,
    symbolPosition: 'before',
    thousandSeparator: ',',
    decimalSeparator: '.',
  };

  await currencySettingsService.updateCurrency(mockCurrency);

  expect(currencySettingsService.getCurrentCurrency()).toEqual(mockCurrency);
});
```

## Contributing

When contributing to the currency system:

1. **Follow the established patterns** for hooks and components
2. **Add comprehensive tests** for new features
3. **Update documentation** for any API changes
4. **Consider performance implications** of changes
5. **Test with multiple currencies** including edge cases

## Support

For issues or questions about the currency system:

1. Check the troubleshooting section above
2. Review the test files for usage examples
3. Check the component implementations for detailed behavior
4. Create an issue with detailed reproduction steps
