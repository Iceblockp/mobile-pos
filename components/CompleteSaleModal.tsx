import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import {
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Printer,
  Calculator,
  ChevronDown,
  Check,
  Settings,
} from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
import {
  PaymentMethodService,
  type PaymentMethod,
} from '@/services/paymentMethodService';
import { PaymentMethodManagement } from '@/components/PaymentMethodManagement';
import { type Customer } from '@/services/database';

interface CompleteSaleModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmSale: (
    paymentMethod: string,
    note: string,
    shouldPrint: boolean,
  ) => void;
  total: number;
  paymentMethod?: PaymentMethod; // Optional - if not provided, will show selector (backward compatibility)
  selectedCustomer?: Customer | null;
  loading: boolean;
  onRecalculate?: () => void; // For cash payments only
}

export const CompleteSaleModal: React.FC<CompleteSaleModalProps> = ({
  visible,
  onClose,
  onConfirmSale,
  total,
  paymentMethod: providedPaymentMethod,
  selectedCustomer,
  loading,
  onRecalculate,
}) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrencyFormatter();
  const [saleNote, setSaleNote] = useState('');
  const [shouldPrintReceipt, setShouldPrintReceipt] = useState(false);

  // Backward compatibility: handle payment method selection if not provided
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] =
    useState<string>('cash');
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);
  const [showManagementModal, setShowManagementModal] = useState(false);
  const [loadingMethods, setLoadingMethods] = useState(!providedPaymentMethod);

  // Load payment methods only if payment method is not provided (backward compatibility)
  useEffect(() => {
    if (!providedPaymentMethod) {
      loadPaymentMethods();
    }
  }, [providedPaymentMethod]);

  const loadPaymentMethods = async () => {
    try {
      setLoadingMethods(true);
      const methods = await PaymentMethodService.getPaymentMethods();
      setPaymentMethods(methods);

      // Set default payment method to cash if available
      const defaultMethod = methods.find((method) => method.isDefault);
      if (defaultMethod) {
        setSelectedPaymentMethodId(defaultMethod.id);
      } else if (methods.length > 0) {
        setSelectedPaymentMethodId(methods[0].id);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);

      // Graceful fallback: provide default cash payment method
      const fallbackMethod: PaymentMethod = {
        id: 'cash',
        name: 'Cash',
        icon: 'Banknote',
        color: '#10B981',
        isDefault: true,
      };
      setPaymentMethods([fallbackMethod]);
      setSelectedPaymentMethodId('cash');

      // Show error alert
      Alert.alert(
        t('common.error'),
        t('sales.errorLoadingPaymentMethods') ||
          'Failed to load payment methods. Using default cash payment.',
      );
    } finally {
      setLoadingMethods(false);
    }
  };

  // Get the current payment method (either provided or selected)
  const currentPaymentMethod = providedPaymentMethod
    ? providedPaymentMethod
    : paymentMethods.find((method) => method.id === selectedPaymentMethodId);

  // Icon mapping for payment methods
  const getPaymentMethodIcon = (iconName: string) => {
    const iconMap: { [key: string]: React.ComponentType<any> } = {
      Banknote: Banknote,
      CreditCard: CreditCard,
      Smartphone: Smartphone,
    };
    return iconMap[iconName] || CreditCard;
  };

  const handleConfirmSale = () => {
    if (!currentPaymentMethod) return;

    // Validate customer for debt sales
    if (currentPaymentMethod.id === 'debt' && !selectedCustomer) {
      Alert.alert(t('common.error'), t('debt.customerRequiredForDebt'));
      return;
    }

    // Always use the old API signature: onConfirmSale(paymentMethod, note, shouldPrint)
    onConfirmSale(
      currentPaymentMethod.name,
      saleNote.trim(),
      shouldPrintReceipt,
    );
  };

  const handleClose = () => {
    if (!loading) {
      setSaleNote('');
      setShouldPrintReceipt(false);
      if (!providedPaymentMethod) {
        // Reset to default payment method
        const defaultMethod = paymentMethods.find((method) => method.isDefault);
        if (defaultMethod) {
          setSelectedPaymentMethodId(defaultMethod.id);
        }
        setShowPaymentPicker(false);
        setShowManagementModal(false);
      }
      onClose();
    }
  };

  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedPaymentMethodId(methodId);
    setShowPaymentPicker(false);
  };

  if (!currentPaymentMethod) {
    return null; // Don't render if no payment method available
  }

  const isCashPayment = currentPaymentMethod.id === 'cash';
  const IconComponent = getPaymentMethodIcon(currentPaymentMethod.icon);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
      accessible={true}
      accessibilityViewIsModal={true}
      accessibilityLabel={t('paymentModal.title')}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title} weight="medium">
              {t('paymentModal.title')}
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              disabled={loading}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t('common.close') || 'Close'}
              accessibilityHint="Closes the complete sale modal"
              accessibilityState={{ disabled: loading }}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Payment Method Display (Read-only when provided, selector when not) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle} weight="medium">
                {t('paymentModal.paymentMethod')}
              </Text>
              {!providedPaymentMethod && (
                <TouchableOpacity
                  style={styles.manageButton}
                  onPress={() => setShowManagementModal(true)}
                  disabled={loading}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Manage payment methods"
                  accessibilityHint="Opens payment method management"
                  accessibilityState={{ disabled: loading }}
                >
                  <Settings size={16} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>

            {loadingMethods ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#6B7280" />
                <Text style={styles.loadingText}>
                  Loading payment methods...
                </Text>
              </View>
            ) : providedPaymentMethod ? (
              // Read-only display when payment method is provided
              <View
                style={styles.paymentMethodDisplay}
                accessible={true}
                accessibilityRole="text"
                accessibilityLabel={`Payment method: ${currentPaymentMethod.name}`}
              >
                <View style={styles.paymentMethodContent}>
                  <View
                    style={[
                      styles.paymentMethodIconContainer,
                      { backgroundColor: `${currentPaymentMethod.color}15` },
                    ]}
                  >
                    <IconComponent
                      size={20}
                      color={currentPaymentMethod.color}
                    />
                  </View>
                  <Text style={styles.paymentMethodText} weight="medium">
                    {currentPaymentMethod.name}
                  </Text>
                </View>
              </View>
            ) : (
              // Selector when payment method is not provided (backward compatibility)
              <TouchableOpacity
                style={styles.paymentMethodDropdown}
                onPress={() => setShowPaymentPicker(true)}
                disabled={loading}
                activeOpacity={0.7}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Payment method: ${currentPaymentMethod.name}`}
                accessibilityHint="Opens payment method picker"
                accessibilityState={{ disabled: loading }}
              >
                <View style={styles.paymentMethodDropdownContent}>
                  <View
                    style={[
                      styles.paymentMethodIconContainer,
                      { backgroundColor: `${currentPaymentMethod.color}15` },
                    ]}
                  >
                    <IconComponent
                      size={20}
                      color={currentPaymentMethod.color}
                    />
                  </View>
                  <Text
                    style={styles.paymentMethodDropdownText}
                    weight="medium"
                  >
                    {currentPaymentMethod.name}
                  </Text>
                </View>
                <ChevronDown size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* Payment Method Picker Modal (only when not provided) */}
          {!providedPaymentMethod && (
            <Modal
              visible={showPaymentPicker}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowPaymentPicker(false)}
            >
              <TouchableOpacity
                style={styles.pickerOverlay}
                activeOpacity={1}
                onPress={() => setShowPaymentPicker(false)}
              >
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerHeader}>
                    <Text style={styles.pickerTitle} weight="medium">
                      {t('paymentModal.selectPaymentMethod')}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowPaymentPicker(false)}
                      style={styles.pickerCloseButton}
                    >
                      <X size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.pickerOptions}>
                    {paymentMethods.map((method) => {
                      const MethodIconComponent = getPaymentMethodIcon(
                        method.icon,
                      );
                      const isSelected = selectedPaymentMethodId === method.id;

                      return (
                        <TouchableOpacity
                          key={method.id}
                          style={[
                            styles.pickerOption,
                            isSelected && styles.pickerOptionSelected,
                          ]}
                          onPress={() => handlePaymentMethodSelect(method.id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.pickerOptionContent}>
                            <View
                              style={[
                                styles.paymentMethodIconContainer,
                                { backgroundColor: `${method.color}15` },
                              ]}
                            >
                              <MethodIconComponent
                                size={20}
                                color={method.color}
                              />
                            </View>
                            <Text
                              style={[
                                styles.pickerOptionText,
                                isSelected && styles.pickerOptionTextSelected,
                              ]}
                              weight={isSelected ? 'medium' : 'regular'}
                            >
                              {method.name}
                            </Text>
                          </View>
                          {isSelected && (
                            <View style={styles.selectedIndicator}>
                              <Check size={16} color="#059669" />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </TouchableOpacity>
            </Modal>
          )}

          {/* Payment Method Management Modal (only when not provided) */}
          {!providedPaymentMethod && (
            <PaymentMethodManagement
              visible={showManagementModal}
              onClose={() => setShowManagementModal(false)}
              onMethodsUpdated={loadPaymentMethods}
            />
          )}

          {/* Total Amount with Calculator Icon */}
          <View
            style={styles.totalSection}
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel={`Total amount: ${formatPrice(total)}`}
          >
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel} weight="medium">
                {t('paymentModal.totalAmount')}
              </Text>
              {isCashPayment && onRecalculate && (
                <TouchableOpacity
                  style={styles.calculatorButton}
                  onPress={onRecalculate}
                  disabled={loading}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Recalculate cash payment"
                  accessibilityHint="Opens calculator to recalculate amount given and change"
                  accessibilityState={{ disabled: loading }}
                >
                  <Calculator size={20} color="#059669" />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.totalAmount} weight="bold">
              {formatPrice(total)}
            </Text>
          </View>

          {/* Sale Note */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle} weight="medium">
              {t('paymentModal.saleNote')}
            </Text>
            <TextInput
              style={styles.noteInput}
              value={saleNote}
              onChangeText={setSaleNote}
              placeholder={t('paymentModal.saleNotePlaceholder')}
              multiline
              numberOfLines={3}
              maxLength={200}
              editable={!loading}
              accessible={true}
              accessibilityLabel="Sale note"
              accessibilityHint="Optional note for this sale"
            />
          </View>

          {/* Print Receipt Option */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setShouldPrintReceipt(!shouldPrintReceipt)}
              disabled={loading}
              accessible={true}
              accessibilityRole="checkbox"
              accessibilityLabel={t('paymentModal.printReceipt')}
              accessibilityHint={t('paymentModal.printReceiptDesc')}
              accessibilityState={{
                checked: shouldPrintReceipt,
                disabled: loading,
              }}
            >
              <View
                style={[
                  styles.checkbox,
                  shouldPrintReceipt && styles.checkboxChecked,
                ]}
              >
                {shouldPrintReceipt && (
                  <Text style={styles.checkmark} weight="bold">
                    ✓
                  </Text>
                )}
              </View>
              <View style={styles.checkboxContent}>
                <View style={styles.checkboxHeader}>
                  <Printer size={16} color="#6B7280" />
                  <Text style={styles.checkboxLabel} weight="medium">
                    {t('paymentModal.printReceipt')}
                  </Text>
                </View>
                <Text style={styles.checkboxDescription}>
                  {t('paymentModal.printReceiptDesc')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t('paymentModal.cancel')}
              accessibilityHint="Cancels the sale and returns to sales page"
              accessibilityState={{ disabled: loading }}
            >
              <Text style={styles.cancelButtonText} weight="medium">
                {t('paymentModal.cancel')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                loading && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirmSale}
              disabled={loading}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={
                loading
                  ? t('paymentModal.processing')
                  : t('paymentModal.makeSale')
              }
              accessibilityHint={`Completes the sale for ${formatPrice(total)} using ${currentPaymentMethod.name}`}
              accessibilityState={{ disabled: loading, busy: loading }}
            >
              {loading ? (
                <View style={styles.buttonLoadingContainer}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.confirmButtonText} weight="medium">
                    {t('paymentModal.processing')}
                  </Text>
                </View>
              ) : (
                <Text style={styles.confirmButtonText} weight="medium">
                  {t('paymentModal.makeSale')}
                </Text>
              )}
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  manageButton: {
    padding: 4,
    borderRadius: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  paymentMethodDisplay: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentMethodText: {
    fontSize: 16,
    color: '#374151',
  },
  paymentMethodDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  paymentMethodDropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodDropdownText: {
    fontSize: 16,
    color: '#374151',
  },
  // Picker Modal Styles
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
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
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerTitle: {
    fontSize: 18,
    color: '#111827',
  },
  pickerCloseButton: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerOptions: {
    padding: 8,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginVertical: 4,
    minHeight: 56, // Ensure minimum touch target size
  },
  pickerOptionSelected: {
    backgroundColor: '#F0FDF4',
  },
  pickerOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  pickerOptionTextSelected: {
    color: '#059669',
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#059669',
  },
  totalSection: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  calculatorButton: {
    padding: 4,
    borderRadius: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalAmount: {
    fontSize: 24,
    color: '#059669',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 56, // Ensure minimum touch target size
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  checkboxContent: {
    flex: 1,
  },
  checkboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#111827',
    marginLeft: 6,
  },
  checkboxDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    flex: 0.45,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    minHeight: 48, // Ensure minimum touch target size
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
  },
  confirmButton: {
    flex: 0.45,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#059669',
    alignItems: 'center',
    minHeight: 48, // Ensure minimum touch target size
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  buttonLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
