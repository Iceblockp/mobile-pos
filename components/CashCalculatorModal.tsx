import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { X } from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import { useCurrencyFormatter } from '@/context/CurrencyContext';

interface CashCalculatorModalProps {
  visible: boolean;
  subtotal: number;
  onContinue: (amountGiven: number, change: number) => void;
  onCancel: () => void;
  initialAmountGiven?: number; // For recalculation - preserve previous value
}

export const CashCalculatorModal: React.FC<CashCalculatorModalProps> = ({
  visible,
  subtotal,
  onContinue,
  onCancel,
  initialAmountGiven,
}) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrencyFormatter();
  const [amountGiven, setAmountGiven] = useState<string>('0');

  // Reset amount when modal opens, or use initial value if provided
  useEffect(() => {
    if (visible) {
      if (initialAmountGiven !== undefined && initialAmountGiven > 0) {
        setAmountGiven(initialAmountGiven.toString());
      } else {
        setAmountGiven('0');
      }
    }
  }, [visible, initialAmountGiven]);

  // Calculate change in real-time
  const change = useMemo(() => {
    const amount = parseFloat(amountGiven) || 0;
    return amount - subtotal;
  }, [amountGiven, subtotal]);

  // Handle EXACT button - sets amount equal to subtotal with validation
  const handleExact = () => {
    // Ensure subtotal is valid
    if (subtotal > 0 && isFinite(subtotal)) {
      setAmountGiven(subtotal.toString());
    }
  };

  // Handle numpad digit input with validation
  const handleDigit = (digit: string) => {
    // Prevent excessively large numbers (max 10 digits)
    if (amountGiven.length >= 10 && amountGiven !== '0') {
      return;
    }

    if (amountGiven === '0') {
      setAmountGiven(digit);
    } else {
      setAmountGiven(amountGiven + digit);
    }
  };

  // Handle clear button
  const handleClear = () => {
    setAmountGiven('0');
  };

  // Handle backspace button
  const handleBackspace = () => {
    if (amountGiven.length === 1) {
      setAmountGiven('0');
    } else {
      setAmountGiven(amountGiven.slice(0, -1));
    }
  };

  // Handle continue button with validation
  const handleContinue = () => {
    const amount = parseFloat(amountGiven) || 0;

    // Validate amount is a valid number
    if (!isFinite(amount) || amount < 0) {
      return;
    }

    onContinue(amount, change);
  };

  // Numpad layout - removed 00 and 000, replaced with Clear and Backspace
  const numpadButtons = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['CLEAR', '0', 'BACK'],
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
      accessible={true}
      accessibilityViewIsModal={true}
      accessibilityLabel={t('calculator.title')}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title} weight="medium">
              {t('calculator.title')}
            </Text>
            <TouchableOpacity
              onPress={onCancel}
              style={styles.closeButton}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t('common.close') || 'Close'}
              accessibilityHint="Closes the calculator and returns to sales page"
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Calculator Display Box - Amount Given */}
          <View
            style={styles.calculatorDisplay}
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel={`${t('calculator.amountGiven')}: ${formatPrice(parseFloat(amountGiven) || 0)}`}
          >
            <Text style={styles.calculatorDisplayText} weight="bold">
              {formatPrice(parseFloat(amountGiven) || 0)}
            </Text>
          </View>

          {/* Compact Info Display - Subtotal and Change */}
          <View style={styles.compactInfoDisplay}>
            {/* Subtotal */}
            <View style={styles.compactInfoRow}>
              <Text style={styles.compactLabel} weight="medium">
                {t('calculator.subtotal')}
              </Text>
              <Text style={styles.compactValue} weight="bold">
                {formatPrice(subtotal)}
              </Text>
            </View>

            {/* Change */}
            <View style={styles.compactInfoRow}>
              <Text style={styles.compactLabel} weight="medium">
                {t('calculator.change')}
              </Text>
              <Text
                style={[
                  styles.compactValue,
                  change >= 0 ? styles.changePositive : styles.changeNegative,
                ]}
                weight="bold"
                accessible={true}
                accessibilityLabel={`${t('calculator.change')}: ${formatPrice(change)}${change < 0 ? ', insufficient amount' : ''}`}
              >
                {formatPrice(change)}
              </Text>
            </View>

            {/* Warning for insufficient amount */}
          </View>

          {/* EXACT Button - Standalone */}
          <TouchableOpacity
            style={styles.exactButton}
            onPress={handleExact}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`${t('calculator.exact')} - Set amount to exact subtotal of ${formatPrice(subtotal)}`}
            accessibilityHint="Sets the amount given to match the subtotal exactly"
          >
            <Text style={styles.exactButtonText} weight="bold">
              {t('calculator.exact')}
            </Text>
          </TouchableOpacity>

          {/* Numeric Keypad */}
          <View style={styles.keypadSection}>
            {numpadButtons.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.keypadRow}>
                {row.map((button) => {
                  // Handle special buttons
                  if (button === 'CLEAR') {
                    return (
                      <TouchableOpacity
                        key={button}
                        style={[styles.keypadButton, styles.clearButton]}
                        onPress={handleClear}
                        activeOpacity={0.7}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={t('calculator.clear')}
                        accessibilityHint="Clears the amount given and resets to zero"
                      >
                        <Text style={styles.clearButtonText} weight="bold">
                          C
                        </Text>
                      </TouchableOpacity>
                    );
                  }

                  if (button === 'BACK') {
                    return (
                      <TouchableOpacity
                        key={button}
                        style={[styles.keypadButton, styles.backspaceButton]}
                        onPress={handleBackspace}
                        activeOpacity={0.7}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel="Backspace"
                        accessibilityHint="Removes the last digit from the amount"
                      >
                        <Text style={styles.backspaceButtonText} weight="bold">
                          ×
                        </Text>
                      </TouchableOpacity>
                    );
                  }

                  // Regular digit buttons
                  return (
                    <TouchableOpacity
                      key={button}
                      style={styles.keypadButton}
                      onPress={() => handleDigit(button)}
                      activeOpacity={0.7}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={`Digit ${button}`}
                      accessibilityHint={`Adds ${button} to the amount`}
                    >
                      <Text style={styles.keypadButtonText} weight="medium">
                        {button}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t('calculator.cancel')}
              accessibilityHint="Cancels the calculator and returns to sales page without saving"
            >
              <Text style={styles.cancelButtonText} weight="medium">
                {t('calculator.cancel')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`${t('calculator.continue')} - Amount given: ${formatPrice(parseFloat(amountGiven) || 0)}, Change: ${formatPrice(change)}`}
              accessibilityHint="Proceeds to complete the sale with the calculated change"
            >
              <Text style={styles.continueButtonText} weight="medium">
                {t('calculator.continue')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    color: '#111827',
  },
  closeButton: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calculatorDisplay: {
    backgroundColor: '#1F2937',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#374151',
    minHeight: 70,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  calculatorDisplayText: {
    fontSize: 32,
    color: '#10B981',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  compactInfoDisplay: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  compactInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  compactLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  compactValue: {
    fontSize: 14,
    color: '#111827',
  },
  changePositive: {
    color: '#047857',
  },
  changeNegative: {
    color: '#B91C1C',
  },
  warningContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    padding: 5,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  warningText: {
    fontSize: 10,
    color: '#B91C1C',
    textAlign: 'center',
  },
  exactButton: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 10,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  exactButtonText: {
    fontSize: 15,
    color: '#1D4ED8',
  },
  keypadSection: {
    marginBottom: 12,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 6,
  },
  keypadButton: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingVertical: 12,
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  keypadButtonText: {
    fontSize: 18,
    color: '#111827',
  },
  clearButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  clearButtonText: {
    fontSize: 22,
    color: '#B91C1C',
  },
  backspaceButton: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
  },
  backspaceButtonText: {
    fontSize: 26,
    color: '#EA580C',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    color: '#6B7280',
  },
  continueButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#059669',
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
  },
});
