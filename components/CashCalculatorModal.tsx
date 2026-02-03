import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { X, Delete } from 'lucide-react-native';
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

  // Quick amount buttons (denominations in MMK)
  const quickAmounts = [1000, 5000, 10000, 50000, 100000];

  // Handle EXACT button - sets amount equal to subtotal with validation
  const handleExact = () => {
    // Ensure subtotal is valid
    if (subtotal > 0 && isFinite(subtotal)) {
      setAmountGiven(subtotal.toString());
    }
  };

  // Handle quick amount buttons - ADD to current amount with validation
  const handleQuickAmount = (amount: number) => {
    const currentAmount = parseFloat(amountGiven) || 0;
    const newAmount = currentAmount + amount;

    // Prevent excessively large amounts (max 100 million)
    if (newAmount > 100000000) {
      return;
    }

    setAmountGiven(newAmount.toString());
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

  // Numpad layout
  const numpadButtons = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['0', '00', '000'],
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

          {/* Display Area */}
          <View
            style={styles.displayArea}
            accessible={true}
            accessibilityRole="summary"
            accessibilityLabel={`${t('calculator.subtotal')}: ${formatPrice(subtotal)}, ${t('calculator.amountGiven')}: ${formatPrice(parseFloat(amountGiven) || 0)}, ${t('calculator.change')}: ${formatPrice(change)}`}
          >
            {/* Subtotal */}
            <View style={styles.displayRow}>
              <Text style={styles.displayLabel} weight="medium">
                {t('calculator.subtotal')}
              </Text>
              <Text style={styles.displayValue} weight="bold">
                {formatPrice(subtotal)}
              </Text>
            </View>

            {/* Amount Given */}
            <View style={styles.displayRow}>
              <Text style={styles.displayLabel} weight="medium">
                {t('calculator.amountGiven')}
              </Text>
              <Text style={styles.displayValueLarge} weight="bold">
                {formatPrice(parseFloat(amountGiven) || 0)}
              </Text>
            </View>

            {/* Change */}
            <View style={styles.displayRow}>
              <Text style={styles.displayLabel} weight="medium">
                {t('calculator.change')}
              </Text>
              <Text
                style={[
                  styles.displayValueLarge,
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
            {change < 0 && (
              <View
                style={styles.warningContainer}
                accessible={true}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                <Text style={styles.warningText}>
                  {t('calculator.insufficientAmount')}
                </Text>
              </View>
            )}
          </View>

          {/* Quick Amount Buttons */}
          <View style={styles.quickButtonsSection}>
            {/* EXACT Button */}
            <TouchableOpacity
              style={[styles.quickButton, styles.exactButton]}
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

            {/* Denomination Buttons */}
            {quickAmounts.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={styles.quickButton}
                onPress={() => handleQuickAmount(amount)}
                activeOpacity={0.7}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Add ${formatPrice(amount)} to amount given`}
                accessibilityHint={`Adds ${amount >= 1000 ? `${amount / 1000}K` : amount} to the current amount`}
              >
                <Text style={styles.quickButtonText} weight="medium">
                  {amount >= 1000 ? `${amount / 1000}K` : amount}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Numeric Keypad */}
          <View style={styles.keypadSection}>
            {numpadButtons.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.keypadRow}>
                {row.map((button) => (
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
                ))}
              </View>
            ))}

            {/* Clear and Backspace Row */}
            <View style={styles.keypadRow}>
              <TouchableOpacity
                style={[styles.keypadButton, styles.clearButton]}
                onPress={handleClear}
                activeOpacity={0.7}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={t('calculator.clear')}
                accessibilityHint="Clears the amount given and resets to zero"
              >
                <Text style={styles.clearButtonText} weight="medium">
                  {t('calculator.clear')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.keypadButton, styles.backspaceButton]}
                onPress={handleBackspace}
                activeOpacity={0.7}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Backspace"
                accessibilityHint="Removes the last digit from the amount"
              >
                <Delete size={24} color="#374151" />
              </TouchableOpacity>
            </View>
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
    padding: 24,
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
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    color: '#111827',
  },
  closeButton: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayArea: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  displayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  displayLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  displayValue: {
    fontSize: 16,
    color: '#111827',
  },
  displayValueLarge: {
    fontSize: 20,
    color: '#111827',
  },
  changePositive: {
    color: '#047857', // Darker green for better contrast (WCAG AA compliant)
  },
  changeNegative: {
    color: '#B91C1C', // Darker red for better contrast (WCAG AA compliant)
  },
  warningContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  warningText: {
    fontSize: 12,
    color: '#B91C1C', // Darker red for better contrast
    textAlign: 'center',
  },
  quickButtonsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  quickButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 70,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  exactButton: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  quickButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  exactButtonText: {
    fontSize: 14,
    color: '#1D4ED8',
  },
  keypadSection: {
    marginBottom: 20,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  keypadButton: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingVertical: 16,
    minHeight: 56,
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
    fontSize: 16,
    color: '#B91C1C', // Darker red for better contrast
  },
  backspaceButton: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
  },
  continueButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#059669',
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
});
