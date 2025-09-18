import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { CurrencySettings } from '@/services/currencyManager';

interface CustomCurrencyFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (currency: CurrencySettings) => void;
}

export const CustomCurrencyForm: React.FC<CustomCurrencyFormProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Currency code is required';
    } else if (formData.code.trim().length !== 3) {
      newErrors.code = 'Currency code must be exactly 3 characters';
    } else if (!/^[A-Z]{3}$/.test(formData.code.trim())) {
      newErrors.code = 'Currency code must be 3 uppercase letters';
    }

    if (!formData.symbol.trim()) {
      newErrors.symbol = 'Currency symbol is required';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Currency name is required';
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
      newErrors.decimalSeparator =
        'Thousand and decimal separators must be different';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const currency: CurrencySettings = {
      code: formData.code.trim().toUpperCase(),
      symbol: formData.symbol.trim(),
      name: formData.name.trim(),
      decimals: formData.decimals,
      symbolPosition: formData.symbolPosition,
      thousandSeparator: formData.thousandSeparator,
      decimalSeparator: formData.decimalSeparator,
    };

    onSubmit(currency);
    handleReset();
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
    const amount = 1234.56;
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
    }
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, errors[field] && styles.inputError]}
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
      <Text style={styles.inputLabel}>{label}</Text>
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
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title}>Custom Currency</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Form */}
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {renderInput('code', 'Currency Code', 'USD', {
            maxLength: 3,
            autoCapitalize: 'characters',
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
            <Text style={styles.previewText}>{getPreviewText()}</Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            title="Cancel"
            onPress={handleClose}
            variant="outline"
            style={styles.cancelButton}
          />
          <Button
            title="Create Currency"
            onPress={handleSubmit}
            style={styles.submitButton}
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
    fontWeight: '600',
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
    fontWeight: '500',
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
    fontWeight: '500',
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
    fontWeight: '600',
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
