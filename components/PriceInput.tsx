import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePriceInput, useCurrencyFormatter } from '@/hooks/useCurrency';

interface PriceInputProps
  extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onValueChange?: (numericValue: number) => void;
  error?: string;
  required?: boolean;
  showCurrencyHint?: boolean;
}

export const PriceInput: React.FC<PriceInputProps> = ({
  label,
  value,
  onChangeText,
  onValueChange,
  error,
  required = false,
  showCurrencyHint = true,
  style,
  ...textInputProps
}) => {
  const { currency, usesDecimals } = useCurrencyFormatter();
  const {
    value: inputValue,
    error: validationError,
    numericValue,
    isValid,
    onChange,
  } = usePriceInput(value);

  // Use refs to track if we're in the middle of an update to prevent circular calls
  const isUpdatingRef = React.useRef(false);

  // Sync with parent component - only when input value actually changes
  React.useEffect(() => {
    if (isUpdatingRef.current) return;

    if (inputValue !== value) {
      isUpdatingRef.current = true;
      onChangeText(inputValue);
      isUpdatingRef.current = false;
    }
    if (onValueChange && numericValue !== undefined) {
      onValueChange(numericValue);
    }
  }, [inputValue, numericValue]);

  // Handle external value changes - only when external value changes and differs from input
  React.useEffect(() => {
    if (isUpdatingRef.current) return;

    if (value !== inputValue) {
      onChange(value);
    }
  }, [value]);

  const displayError = error || validationError;
  const placeholder = usesDecimals()
    ? `0${currency?.decimalSeparator || '.'}00`
    : '0';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      <View
        style={[
          styles.inputContainer,
          displayError && styles.inputContainerError,
        ]}
      >
        {currency?.symbolPosition === 'before' && (
          <Text style={styles.currencySymbol}>{currency.symbol}</Text>
        )}

        <TextInput
          style={[styles.input, style]}
          value={inputValue}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          keyboardType="decimal-pad"
          {...textInputProps}
        />

        {currency?.symbolPosition === 'after' && (
          <Text style={styles.currencySymbol}>{currency.symbol}</Text>
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

      {showCurrencyHint && currency && (
        <Text style={styles.currencyHint}>
          Currency: {currency.name} ({currency.symbol})
          {usesDecimals() && ` • ${currency.decimals} decimal places`}
        </Text>
      )}
    </View>
  );
};

// Simplified price input for basic use cases
export const SimplePriceInput: React.FC<{
  value: number;
  onValueChange: (value: number) => void;
  placeholder?: string;
  style?: any;
}> = ({ value, onValueChange, placeholder, style }) => {
  const { formatPrice, parsePrice } = useCurrencyFormatter();
  const [displayValue, setDisplayValue] = React.useState(formatPrice(value));

  React.useEffect(() => {
    setDisplayValue(formatPrice(value));
  }, [value, formatPrice]);

  const handleChange = (text: string) => {
    setDisplayValue(text);
    const numericValue = parsePrice(text);
    onValueChange(numericValue);
  };

  return (
    <TextInput
      style={[styles.simpleInput, style]}
      value={displayValue}
      onChangeText={handleChange}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      keyboardType="decimal-pad"
    />
  );
};

// Price display component for read-only values
export const PriceDisplay: React.FC<{
  value: number;
  style?: any;
  textStyle?: any;
  showLabel?: boolean;
  label?: string;
}> = ({ value, style, textStyle, showLabel = false, label = 'Price' }) => {
  const { formatPrice } = useCurrencyFormatter();

  return (
    <View style={[styles.displayContainer, style]}>
      {showLabel && <Text style={styles.displayLabel}>{label}</Text>}
      <Text style={[styles.displayValue, textStyle]}>{formatPrice(value)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
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
    fontWeight: '500',
    marginHorizontal: 4,
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
  simpleInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
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
    fontWeight: '600',
    color: '#111827',
  },
});
