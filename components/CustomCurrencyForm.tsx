import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { CurrencySettings } from '@/services/currencyManager';
import { useCurrencyContext } from '@/context/CurrencyContext';

interface CustomCurrencyFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (currency: CurrencySettings) => void;
  editingCurrency?: CurrencySettings; // For editing existing custom currencies
}

export const CustomCurrencyForm: React.FC<CustomCurrencyFormProps> = ({
  visible,
  onClose,
  onSubmit,
  editingCurrency,
}) => {
  const {} = useCurrencyContext();

  const [formData, setFormData] = useState<CurrencySettings>({
    code: '',
    symbol: '',
    name: '',
    decimals: 2,
    symbolPosition: 'before',
    thousandSeparator: ',',
    decimalSeparator: '.',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load editing currency data when modal opens
  useEffect(() => {
    if (visible && editingCurrency) {
      setFormData({
        code: editingCurrency.code,
        symbol: editingCurrency.symbol,
        name: editingCurrency.name,
        decimals: editingCurrency.decimals,
        symbolPosition: editingCurrency.symbolPosition,
        thousandSeparator: editingCurrency.thousandSeparator,
        decimalSeparator: editingCurrency.decimalSeparator,
      });
    } else if (visible && !editingCurrency) {
      // Reset form for new currency
      handleReset();
    }
  }, [visible, editingCurrency]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic validation
    if (!formData.code.trim()) {
      newErrors.code = 'Currency code is required';
    } else if (formData.code.trim().length !== 3) {
      newErrors.code = 'Currency code must be 3 characters';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Currency name is required';
    }

    if (!formData.symbol.trim()) {
      newErrors.symbol = 'Currency symbol is required';
    }

    if (formData.decimals < 0 || formData.decimals > 4) {
      newErrors.decimals = 'Decimal places must be between 0 and 4';
    }

    if (!formData.thousandSeparator) {
      newErrors.thousandSeparator = 'Thousand separator is required';
    }

    if (!formData.decimalSeparator) {
      newErrors.decimalSeparator = 'Decimal separator is required';
    }

    if (formData.thousandSeparator === formData.decimalSeparator) {
      newErrors.general = 'Thousand and decimal separators must be different';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const currency: CurrencySettings = {
        code: formData.code.trim().toUpperCase(),
        symbol: formData.symbol.trim(),
        name: formData.name.trim(),
        decimals: formData.decimals,
        symbolPosition: formData.symbolPosition,
        thousandSeparator: formData.thousandSeparator,
        decimalSeparator: formData.decimalSeparator,
        isCustom: true,
        createdAt: editingCurrency?.createdAt || new Date().toISOString(),
        lastUsed: editingCurrency?.lastUsed,
      };

      onSubmit(currency);
      handleReset();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to save currency'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      code: '',
      symbol: '',
      name: '',
      decimals: 2,
      symbolPosition: 'before',
      thousandSeparator: ',',
      decimalSeparator: '.',
    });
    setErrors({});
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleInputChange = (
    field: keyof CurrencySettings,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const getPreviewText = (): string => {
    const formattedAmount =
      formData.decimals === 0 ? '1,234' : `1,234${formData.decimalSeparator}56`;

    const withSeparator = formattedAmount.replace(
      ',',
      formData.thousandSeparator
    );

    return formData.symbolPosition === 'before'
      ? `${formData.symbol}${withSeparator}`
      : `${withSeparator} ${formData.symbol}`;
  };

  const renderInput = (
    field: keyof CurrencySettings,
    label: string,
    placeholder: string,
    options?: {
      keyboardType?: 'default' | 'numeric';
      maxLength?: number;
      autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
      editable?: boolean;
    }
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel} weight="medium">
        {label}
      </Text>
      <TextInput
        style={[
          styles.input,
          errors[field] && styles.inputError,
          options?.editable === false && styles.disabledInput,
        ]}
        value={String(formData[field])}
        onChangeText={(value) => {
          const processedValue =
            options?.keyboardType === 'numeric' ? parseInt(value) || 0 : value;
          handleInputChange(field, processedValue);
        }}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={options?.keyboardType || 'default'}
        maxLength={options?.maxLength}
        autoCapitalize={options?.autoCapitalize || 'none'}
        editable={options?.editable !== false && !isSubmitting}
      />
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  const renderPicker = (
    field: keyof CurrencySettings,
    label: string,
    options: { label: string; value: string }[]
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel} weight="medium">
        {label}
      </Text>
      <View style={styles.pickerContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.pickerOption,
              formData[field] === option.value && styles.pickerOptionSelected,
            ]}
            onPress={() => handleInputChange(field, option.value)}
          >
            <Text
              style={[
                styles.pickerOptionText,
                formData[field] === option.value &&
                  styles.pickerOptionTextSelected,
              ]}
              weight={formData[field] === option.value ? 'medium' : undefined}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            disabled={isSubmitting}
          >
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title} weight="medium">
            {editingCurrency ? 'Edit Currency' : 'Create Custom Currency'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Form */}
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {errors.general && (
            <View style={styles.generalError}>
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          )}

          {renderInput('code', 'Currency Code', 'USD', {
            maxLength: 3,
            autoCapitalize: 'characters',
            editable: !editingCurrency, // Don't allow editing code for existing currencies
          })}

          {renderInput('name', 'Currency Name', 'US Dollar')}

          {renderInput('symbol', 'Currency Symbol', '$', { maxLength: 3 })}

          {renderInput('decimals', 'Decimal Places', '2', {
            keyboardType: 'numeric',
          })}

          {renderPicker('symbolPosition', 'Symbol Position', [
            { label: 'Before ($100)', value: 'before' },
            { label: 'After (100$)', value: 'after' },
          ])}

          {renderInput('thousandSeparator', 'Thousand Separator', ',', {
            maxLength: 1,
          })}

          {renderInput('decimalSeparator', 'Decimal Separator', '.', {
            maxLength: 1,
          })}

          {/* Preview */}
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Preview:</Text>
            <Text style={styles.previewText} weight="medium">
              {getPreviewText()}
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            title="Cancel"
            onPress={handleClose}
            variant="secondary"
            style={styles.cancelButton}
            disabled={isSubmitting}
          />
          <Button
            title={editingCurrency ? 'Update Currency' : 'Create Currency'}
            onPress={handleSubmit}
            style={styles.submitButton}
            disabled={isSubmitting}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  form: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  disabledInput: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  generalError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 4,
  },
  pickerContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerOption: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  pickerOptionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  pickerOptionTextSelected: {
    color: '#3B82F6',
  },
  previewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 20,
    color: '#111827',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});
