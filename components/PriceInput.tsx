import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCurrencyFormatter } from '@/context/CurrencyContext';

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
}

// Custom hook for price input with validation
const useStandardPriceInput = (initialValue: string = '') => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [numericValue, setNumericValue] = useState<number>(0);
  const { validatePriceInput, parsePrice, formatPrice } =
    useCurrencyFormatter();

  const lastInitialValueRef = useRef(initialValue);

  const handleChange = useCallback(
    (newValue: string) => {
      setValue(newValue);

      if (!newValue.trim()) {
        setError(null);
        setNumericValue(0);
        return;
      }

      const validation = validatePriceInput(newValue);
      if (validation.isValid) {
        setError(null);
        setNumericValue(validation.value || 0);
      } else {
        setError(validation.error || 'Invalid price');
        setNumericValue(parsePrice(newValue)); // Try to parse anyway for partial values
      }
    },
    [validatePriceInput, parsePrice]
  );

  const reset = useCallback(() => {
    setValue(initialValue);
    setError(null);
    setNumericValue(parsePrice(initialValue));
  }, [initialValue, parsePrice]);

  const setNumericValueDirectly = useCallback(
    (num: number) => {
      const formatted = formatPrice(num);
      setValue(formatted);
      setNumericValue(num);
      setError(null);
    },
    [formatPrice]
  );

  // Initialize numeric value - only when initialValue actually changes
  useEffect(() => {
    if (initialValue !== lastInitialValueRef.current) {
      lastInitialValueRef.current = initialValue;
      if (initialValue) {
        handleChange(initialValue);
      }
    }
  }, [initialValue, handleChange]);

  return {
    value,
    error,
    numericValue,
    isValid: !error && value.trim().length > 0,
    onChange: handleChange,
    reset,
    setNumericValue: setNumericValueDirectly,
  };
};

export const PriceInput: React.FC<PriceInputProps> = ({
  label,
  value,
  onValueChange,
  error,
  required = false,
  showCurrencyHint = true,
  showCurrencySymbol = true,
  autoFormat = true,
  disabled = false,
  style,
  ...textInputProps
}) => {
  const { currentCurrency, usesDecimals } = useCurrencyFormatter();
  const {
    value: inputValue,
    error: validationError,
    numericValue,
    isValid,
    onChange,
  } = useStandardPriceInput(value);

  // Use refs to track if we're in the middle of an update to prevent circular calls
  const isUpdatingRef = useRef(false);

  // Sync with parent component - only when input value actually changes
  useEffect(() => {
    if (isUpdatingRef.current) return;

    if (inputValue !== value) {
      isUpdatingRef.current = true;
      onValueChange(inputValue, numericValue);
      isUpdatingRef.current = false;
    }
  }, [inputValue, numericValue, onValueChange]);

  // Handle external value changes - only when external value changes and differs from input
  useEffect(() => {
    if (isUpdatingRef.current) return;

    if (value !== inputValue) {
      onChange(value);
    }
  }, [value, inputValue, onChange]);

  const displayError = error || validationError;
  const placeholder = usesDecimals()
    ? `0${currentCurrency?.decimalSeparator || '.'}00`
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
        {showCurrencySymbol && currentCurrency?.symbolPosition === 'before' && (
          <Text style={styles.currencySymbol}>{currentCurrency.symbol}</Text>
        )}

        <TextInput
          style={[styles.input, style]}
          value={inputValue}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          keyboardType="decimal-pad"
          editable={!disabled}
          {...textInputProps}
        />

        {showCurrencySymbol && currentCurrency?.symbolPosition === 'after' && (
          <Text style={styles.currencySymbol}>{currentCurrency.symbol}</Text>
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
  const { formatPrice, parsePrice, currentCurrency } = useCurrencyFormatter();
  const {
    value: inputValue,
    error: validationError,
    numericValue,
    isValid,
    onChange,
  } = useStandardPriceInput(value);

  const isUpdatingRef = useRef(false);

  // Sync with parent component
  useEffect(() => {
    if (isUpdatingRef.current) return;

    if (inputValue !== value) {
      isUpdatingRef.current = true;
      onValueChange(inputValue, numericValue);
      isUpdatingRef.current = false;
    }
  }, [inputValue, numericValue, onValueChange]);

  // Handle external value changes
  useEffect(() => {
    if (isUpdatingRef.current) return;

    if (value !== inputValue) {
      onChange(value);
    }
  }, [value, inputValue, onChange]);

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
          <Text style={styles.currencySymbol}>{currentCurrency.symbol}</Text>
        )}

        <TextInput
          style={[styles.simpleInput, style]}
          value={inputValue}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          keyboardType="decimal-pad"
          editable={!disabled}
          {...textInputProps}
        />

        {showCurrencySymbol && currentCurrency?.symbolPosition === 'after' && (
          <Text style={styles.currencySymbol}>{currentCurrency.symbol}</Text>
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
    const baseStyle = [styles.displayValue];

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
      {showLabel && <Text style={styles.displayLabel}>{label}</Text>}
      <Text style={getTextStyle()}>{getDisplayText()}</Text>
    </View>
  );
};

// Price range display component
interface PriceRangeDisplayProps {
  minAmount: number;
  maxAmount: number;
  separator?: string;
  style?: 'default' | 'compact' | 'detailed';
  textStyle?: any;
  containerStyle?: any;
}

export const PriceRangeDisplay: React.FC<PriceRangeDisplayProps> = ({
  minAmount,
  maxAmount,
  separator = ' - ',
  style = 'default',
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
    fontWeight: '600',
    color: '#111827',
  },
  compactText: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailedText: {
    fontSize: 18,
    fontWeight: '700',
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

// Hook for components that need to manage price state
export const usePriceState = (initialValue: number = 0) => {
  const { formatPrice } = useCurrencyFormatter();
  const [numericValue, setNumericValue] = useState(initialValue);
  const [stringValue, setStringValue] = useState(formatPrice(initialValue));

  const updateValue = useCallback((value: string, numeric: number) => {
    setStringValue(value);
    setNumericValue(numeric);
  }, []);

  const setNumericValueDirectly = useCallback(
    (value: number) => {
      setNumericValue(value);
      setStringValue(formatPrice(value));
    },
    [formatPrice]
  );

  return {
    numericValue,
    stringValue,
    updateValue,
    setNumericValue: setNumericValueDirectly,
  };
};
