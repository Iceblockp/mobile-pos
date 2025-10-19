import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { View, StyleSheet, TextInput, TextInputProps } from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { Ionicons } from '@expo/vector-icons';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
import { PriceInputErrorBoundary } from './PriceInputErrorBoundary';

// Standardized interface for all price input components
interface StandardPriceInputProps
  extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: string;
  onValueChange: (value: string, numericValue: number) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  showCurrencySymbol?: boolean;
  autoFormat?: boolean;
}

interface PriceInputProps extends StandardPriceInputProps {
  label: string;
  required?: boolean;
  showCurrencyHint?: boolean;
  isSmall?: boolean;
}

// Custom hook for price input with validation - Fixed to prevent infinite loops
const useStandardPriceInput = (externalValue: string = '') => {
  const [error, setError] = useState<string | null>(null);
  const { validatePriceInput, parsePrice } = useCurrencyFormatter();

  // Use ref to track if we're updating internally to prevent circular calls
  const isInternalUpdateRef = useRef(false);

  // Memoize validation to prevent unnecessary recalculations
  const validationResult = useMemo(() => {
    if (!externalValue.trim()) {
      return { isValid: true, error: null, numericValue: 0 };
    }

    const validation = validatePriceInput(externalValue);
    return {
      isValid: validation.isValid,
      error: validation.error || null,
      numericValue: validation.value || parsePrice(externalValue),
    };
  }, [externalValue, validatePriceInput, parsePrice]);

  // Update error state when validation changes
  useEffect(() => {
    setError(validationResult.error);
  }, [validationResult.error]);

  const handleChange = useCallback((newValue: string) => {
    // Don't process if this is an internal update
    if (isInternalUpdateRef.current) {
      return;
    }

    // This will be handled by the parent component
    return newValue;
  }, []);

  return {
    value: externalValue,
    error,
    numericValue: validationResult.numericValue,
    isValid: validationResult.isValid && externalValue.trim().length > 0,
    onChange: handleChange,
  };
};

export const PriceInput: React.FC<PriceInputProps> = ({
  label,
  value,
  onValueChange,
  error,
  isSmall = false,
  required = false,
  showCurrencyHint = true,
  showCurrencySymbol = true,
  autoFormat = true,
  disabled = false,
  style,
  ...textInputProps
}) => {
  const { currentCurrency, usesDecimals, validatePriceInput, parsePrice } =
    useCurrencyFormatter();

  // Use the simplified hook that doesn't cause circular dependencies
  const { error: validationError, isValid } = useStandardPriceInput(value);

  // Stable callback for handling text changes with error handling
  const handleTextChange = useCallback(
    (newValue: string) => {
      try {
        // Directly call parent callback without internal state management
        const validation = validatePriceInput(newValue);
        const numeric = validation.isValid
          ? validation.value || 0
          : parsePrice(newValue);
        onValueChange(newValue, numeric);
      } catch (error) {
        console.error('Error in price input change handler:', error);
        // Fallback: just pass the string value with 0 as numeric
        onValueChange(newValue, 0);
      }
    },
    [onValueChange, validatePriceInput, parsePrice]
  );

  const displayError = error || validationError;
  const placeholder = usesDecimals()
    ? `0${currentCurrency?.decimalSeparator || '.'}00`
    : '0';

  return (
    <PriceInputErrorBoundary>
      <View style={styles.container}>
        <Text
          style={[
            styles.label,
            { fontSize: isSmall ? 12 : 16, marginBottom: isSmall ? 4 : 8 },
          ]}
          weight="medium"
        >
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>

        <View
          style={[
            isSmall ? styles.smallInputContainer : styles.inputContainer,
            displayError && styles.inputContainerError,
          ]}
        >
          {showCurrencySymbol &&
            currentCurrency?.symbolPosition === 'before' && (
              <Text style={styles.currencySymbol} weight="medium">
                {currentCurrency.symbol}
              </Text>
            )}

          <TextInput
            style={[isSmall ? styles.smallInput : styles.input, style]}
            value={value}
            onChangeText={handleTextChange}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
            editable={!disabled}
            {...textInputProps}
          />

          {showCurrencySymbol &&
            currentCurrency?.symbolPosition === 'after' && (
              <Text style={styles.currencySymbol} weight="medium">
                {currentCurrency.symbol}
              </Text>
            )}

          {isValid && (
            <Ionicons
              name="checkmark-circle"
              size={20}
              color="#10B981"
              style={styles.validIcon}
            />
          )}
        </View>

        {displayError && <Text style={styles.errorText}>{displayError}</Text>}

        {showCurrencyHint && currentCurrency && (
          <Text style={styles.currencyHint}>
            Currency: {currentCurrency.name} ({currentCurrency.symbol})
            {usesDecimals() && ` • ${currentCurrency.decimals} decimal places`}
          </Text>
        )}
      </View>
    </PriceInputErrorBoundary>
  );
};

// Standardized simple price input component
export const SimplePriceInput: React.FC<StandardPriceInputProps> = ({
  value,
  onValueChange,
  placeholder,
  disabled = false,
  error,
  showCurrencySymbol = true,
  autoFormat = true,
  style,
  ...textInputProps
}) => {
  const { validatePriceInput, parsePrice, currentCurrency } =
    useCurrencyFormatter();

  // Use the simplified hook that doesn't cause circular dependencies
  const { error: validationError, isValid } = useStandardPriceInput(value);

  // Stable callback for handling text changes
  const handleTextChange = useCallback(
    (newValue: string) => {
      // Directly call parent callback without internal state management
      const validation = validatePriceInput(newValue);
      const numeric = validation.isValid
        ? validation.value || 0
        : parsePrice(newValue);
      onValueChange(newValue, numeric);
    },
    [onValueChange, validatePriceInput, parsePrice]
  );

  const displayError = error || validationError;

  return (
    <View style={styles.simpleContainer}>
      <View
        style={[
          styles.simpleInputContainer,
          displayError && styles.inputContainerError,
          disabled && styles.disabledContainer,
        ]}
      >
        {showCurrencySymbol && currentCurrency?.symbolPosition === 'before' && (
          <Text style={styles.currencySymbol} weight="medium">
            {currentCurrency.symbol}
          </Text>
        )}

        <TextInput
          style={[styles.simpleInput, style]}
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          keyboardType="decimal-pad"
          editable={!disabled}
          {...textInputProps}
        />

        {showCurrencySymbol && currentCurrency?.symbolPosition === 'after' && (
          <Text style={styles.currencySymbol} weight="medium">
            {currentCurrency.symbol}
          </Text>
        )}

        {isValid && (
          <Ionicons
            name="checkmark-circle"
            size={16}
            color="#10B981"
            style={styles.validIcon}
          />
        )}
      </View>

      {displayError && <Text style={styles.errorText}>{displayError}</Text>}
    </View>
  );
};

// Standardized price display component for read-only values
interface PriceDisplayProps {
  amount: number;
  showSymbol?: boolean;
  showCode?: boolean;
  style?: 'default' | 'compact' | 'detailed';
  color?: string;
  textStyle?: any;
  containerStyle?: any;
  showLabel?: boolean;
  label?: string;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  amount,
  showSymbol = true,
  showCode = false,
  style = 'default',
  color,
  textStyle,
  containerStyle,
  showLabel = false,
  label = 'Price',
}) => {
  const { formatPrice, currentCurrency } = useCurrencyFormatter();

  const getDisplayText = () => {
    const formattedPrice = formatPrice(amount);

    if (style === 'compact') {
      return showSymbol
        ? formattedPrice
        : formattedPrice.replace(currentCurrency?.symbol || '', '').trim();
    }

    if (style === 'detailed' && currentCurrency) {
      const basePrice = showSymbol
        ? formattedPrice
        : formattedPrice.replace(currentCurrency.symbol, '').trim();
      return showCode ? `${basePrice} ${currentCurrency.code}` : basePrice;
    }

    return formattedPrice;
  };

  const getTextStyle = () => {
    const baseStyle: any[] = [styles.displayValue];

    if (style === 'compact') {
      baseStyle.push(styles.compactText);
    } else if (style === 'detailed') {
      baseStyle.push(styles.detailedText);
    }

    if (color) {
      baseStyle.push({ color });
    }

    if (textStyle) {
      baseStyle.push(textStyle);
    }

    return baseStyle;
  };

  return (
    <View style={[styles.displayContainer, containerStyle]}>
      {showLabel && (
        <Text style={styles.displayLabel} weight="medium">
          {label}
        </Text>
      )}
      <Text style={getTextStyle()}>{getDisplayText()}</Text>
    </View>
  );
};

// Price range display component
interface PriceRangeDisplayProps {
  minAmount: number;
  maxAmount: number;
  separator?: string;
  textStyle?: any;
  containerStyle?: any;
}

export const PriceRangeDisplay: React.FC<PriceRangeDisplayProps> = ({
  minAmount,
  maxAmount,
  separator = ' - ',
  textStyle,
  containerStyle,
}) => {
  const { formatPrice } = useCurrencyFormatter();

  return (
    <View style={[styles.displayContainer, containerStyle]}>
      <Text style={[styles.displayValue, textStyle]}>
        {formatPrice(minAmount)}
        {separator}
        {formatPrice(maxAmount)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: '#374151',
  },
  required: {
    color: '#EF4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  inputContainerError: {
    borderColor: '#EF4444',
  },
  currencySymbol: {
    fontSize: 16,
    color: '#6B7280',
    marginHorizontal: 4,
  },
  smallInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  smallInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 0,
  },
  tierInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 0,
  },
  validIcon: {
    marginLeft: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 4,
  },
  currencyHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  simpleContainer: {
    marginBottom: 8,
  },
  simpleInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  disabledContainer: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  simpleInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 0,
  },
  displayContainer: {
    flexDirection: 'column',
  },
  displayLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  displayValue: {
    fontSize: 16,
    color: '#111827',
  },
  compactText: {
    fontSize: 14,
  },
  detailedText: {
    fontSize: 18,
  },
});

// Export the standardized interface for other components to use
export type {
  StandardPriceInputProps,
  PriceDisplayProps,
  PriceRangeDisplayProps,
};

// Utility function to create consistent price input props
export const createPriceInputProps = (
  value: string,
  onValueChange: (value: string, numericValue: number) => void,
  options?: {
    placeholder?: string;
    disabled?: boolean;
    error?: string;
    showCurrencySymbol?: boolean;
    autoFormat?: boolean;
  }
): StandardPriceInputProps => ({
  value,
  onValueChange,
  placeholder: options?.placeholder,
  disabled: options?.disabled || false,
  error: options?.error,
  showCurrencySymbol: options?.showCurrencySymbol !== false,
  autoFormat: options?.autoFormat !== false,
});

// Note: useDebounce and usePriceState hooks are available in separate files:
// - useDebounce is available in components/DebouncedPriceInput.tsx
// - usePriceState can be created as a separate hook file if needed
