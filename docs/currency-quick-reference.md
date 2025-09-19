# Currency System Quick Reference

## Essential Imports

```tsx
// Context and hooks
import {
  useCurrencyContext,
  useCurrencyFormatter,
} from '@/context/CurrencyContext';
import { useCustomCurrencies } from '@/context/CurrencyContext';

// Components
import { CurrencySelector } from '@/components/CurrencySelector';
import {
  PriceInput,
  SimplePriceInput,
  PriceDisplay,
} from '@/components/PriceInput';
import { CustomCurrencyForm } from '@/components/CustomCurrencyForm';

// Utilities
import { createPriceInputProps, usePriceState } from '@/components/PriceInput';
```

## Common Patterns

### Basic Price Formatting

```tsx
function PriceComponent({ amount }) {
  const { formatPrice } = useCurrencyFormatter();
  return <Text>{formatPrice(amount)}</Text>;
}
```

### Price Input with Validation

```tsx
function PriceInputComponent() {
  const [price, setPrice] = useState('');
  const [numericValue, setNumericValue] = useState(0);

  return (
    <PriceInput
      label="Price"
      value={price}
      onValueChange={(text, numeric) => {
        setPrice(text);
        setNumericValue(numeric);
      }}
      required
    />
  );
}
```

### Currency Selection

```tsx
function CurrencySettings() {
  return (
    <CurrencySelector
      onCurrencyChange={(currency) => {
        console.log('Currency changed:', currency.name);
      }}
      allowCustomCreation={true}
    />
  );
}
```

### Custom Currency Management

```tsx
function CustomCurrencyManager() {
  const { saveCustomCurrency, customCurrencies } = useCustomCurrencies();

  const createCurrency = async () => {
    await saveCustomCurrency({
      code: 'XYZ',
      symbol: 'X',
      name: 'Custom Currency',
      decimals: 2,
      symbolPosition: 'before',
      thousandSeparator: ',',
      decimalSeparator: '.',
    });
  };

  return (
    <View>
      <Button title="Create Currency" onPress={createCurrency} />
      {customCurrencies.map((c) => (
        <Text key={c.code}>{c.name}</Text>
      ))}
    </View>
  );
}
```

## Component Props Quick Reference

### PriceInput

```tsx
<PriceInput
  label="Product Price" // Required: Label text
  value={priceString} // Required: Current value
  onValueChange={(text, num) => {}} // Required: Change handler
  required={true} // Optional: Show required indicator
  showCurrencyHint={true} // Optional: Show currency info
  showCurrencySymbol={true} // Optional: Show currency symbol
  disabled={false} // Optional: Disable input
  error="Invalid price" // Optional: Error message
  placeholder="0.00" // Optional: Placeholder text
/>
```

### CurrencySelector

```tsx
<CurrencySelector
  onCurrencyChange={(currency) => {}} // Optional: Change handler
  showCustomCurrencies={true} // Optional: Show custom currencies
  allowCustomCreation={true} // Optional: Allow creating custom
  compact={false} // Optional: Compact display
/>
```

### PriceDisplay

```tsx
<PriceDisplay
  amount={123.45} // Required: Amount to display
  showSymbol={true} // Optional: Show currency symbol
  showCode={false} // Optional: Show currency code
  style="default" // Optional: 'default' | 'compact' | 'detailed'
  showLabel={false} // Optional: Show label
  label="Price" // Optional: Label text
/>
```

## Hook Returns Quick Reference

### useCurrencyFormatter

```tsx
const {
  formatPrice, // (amount: number) => string
  parsePrice, // (priceString: string) => number
  validatePriceInput, // (input: string) => ValidationResult
  usesDecimals, // () => boolean
  currentCurrency, // CurrencySettings | null
} = useCurrencyFormatter();
```

### useCurrencyContext

```tsx
const {
  currentCurrency, // CurrencySettings | null
  customCurrencies, // CurrencySettings[]
  isLoading, // boolean
  error, // string | null
  isInitialized, // boolean
  updateCurrency, // (currency: CurrencySettings) => Promise<void>
  resetToDefault, // () => Promise<void>
  formatPrice, // (amount: number) => string
  parsePrice, // (priceString: string) => number
  validatePriceInput, // (input: string) => ValidationResult
  saveCustomCurrency, // (currency: CurrencySettings) => Promise<void>
  deleteCustomCurrency, // (code: string) => Promise<void>
} = useCurrencyContext();
```

### useCustomCurrencies

```tsx
const {
  customCurrencies, // CurrencySettings[]
  saveCustomCurrency, // (currency: CurrencySettings) => Promise<void>
  deleteCustomCurrency, // (code: string) => Promise<void>
  getAllAvailableCurrencies, // () => Promise<{predefined, custom}>
} = useCustomCurrencies();
```

## Currency Settings Structure

```typescript
interface CurrencySettings {
  code: string; // 'USD', 'EUR', etc.
  symbol: string; // '$', '€', etc.
  name: string; // 'US Dollar', etc.
  decimals: number; // 0-4 decimal places
  symbolPosition: 'before' | 'after'; // Symbol position
  thousandSeparator: string; // ',' or '.'
  decimalSeparator: string; // '.' or ','
  isCustom?: boolean; // Custom currency flag
  createdAt?: string; // Creation timestamp
  lastUsed?: string; // Last used timestamp
}
```

## Validation Result Structure

```typescript
interface ValidationResult {
  isValid: boolean;
  value?: number;
  error?: string;
}
```

## Common Currency Codes

| Code | Name          | Symbol | Decimals | Position |
| ---- | ------------- | ------ | -------- | -------- |
| MMK  | Myanmar Kyat  | K      | 0        | after    |
| USD  | US Dollar     | $      | 2        | before   |
| EUR  | Euro          | €      | 2        | after    |
| GBP  | British Pound | £      | 2        | before   |
| JPY  | Japanese Yen  | ¥      | 0        | before   |
| CNY  | Chinese Yuan  | ¥      | 2        | before   |
| THB  | Thai Baht     | ฿      | 2        | before   |

## Error Handling Patterns

```tsx
// Basic error handling
const { error } = useCurrencyContext();
if (error) {
  return <Text>Error: {error}</Text>;
}

// Validation error handling
const validation = validatePriceInput(input);
if (!validation.isValid) {
  return <Text>Error: {validation.error}</Text>;
}

// Async operation error handling
try {
  await updateCurrency(newCurrency);
} catch (error) {
  Alert.alert('Error', error.message);
}
```

## Performance Tips

```tsx
// Use memoization for expensive operations
const formattedPrices = useMemo(
  () => prices.map(formatPrice),
  [prices, formatPrice]
);

// Use optimized formatter for better performance
const { formatPrice } = useOptimizedCurrencyFormatter();

// Batch currency operations when possible
const updateMultiplePrices = useCallback(async (priceUpdates) => {
  // Process all updates together
}, []);
```

## Testing Helpers

```tsx
// Mock currency context for testing
const mockCurrencyContext = {
  currentCurrency: mockUSDCurrency,
  formatPrice: jest.fn((amount) => `$${amount.toFixed(2)}`),
  parsePrice: jest.fn((price) => parseFloat(price.replace('$', ''))),
  // ... other mocked methods
};

// Test wrapper
const TestWrapper = ({ children }) => (
  <CurrencyProvider>{children}</CurrencyProvider>
);
```
