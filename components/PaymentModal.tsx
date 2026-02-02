import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import {
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Printer,
  Check,
  ChevronDown,
  Plus,
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

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmSale: (
    paymentMethod: string,
    note: string,
    shouldPrint: boolean
  ) => void;
  total: number;
  loading: boolean;
  selectedCustomer?: Customer | null;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  visible,
  onClose,
  onConfirmSale,
  total,
  loading,
  selectedCustomer,
}) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrencyFormatter();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>('cash');
  const [saleNote, setSaleNote] = useState('');
  const [shouldPrintReceipt, setShouldPrintReceipt] = useState(false);
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);
  const [showManagementModal, setShowManagementModal] = useState(false);
  const [loadingMethods, setLoadingMethods] = useState(true);

  // Load payment methods on component mount
  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoadingMethods(true);
      const methods = await PaymentMethodService.getPaymentMethods();
      setPaymentMethods(methods);

      // Set default payment method to cash if available
      const defaultMethod = methods.find((method) => method.isDefault);
      if (defaultMethod) {
        setSelectedPaymentMethod(defaultMethod.id);
      } else if (methods.length > 0) {
        setSelectedPaymentMethod(methods[0].id);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    } finally {
      setLoadingMethods(false);
    }
  };

  // Icon mapping for payment methods
  const getPaymentMethodIcon = (iconName: string) => {
    const iconMap: { [key: string]: React.ComponentType<any> } = {
      Banknote: Banknote,
      CreditCard: CreditCard,
      Smartphone: Smartphone,
    };
    return iconMap[iconName] || CreditCard;
  };

  // Removed formatMMK function - now using standardized currency formatting

  const handleConfirmSale = () => {
    const selectedMethod = paymentMethods.find(
      (method) => method.id === selectedPaymentMethod
    );

    // Validate customer for debt sales
    if (selectedMethod?.id === 'debt' && !selectedCustomer) {
      Alert.alert(t('common.error'), t('debt.customerRequiredForDebt'));
      return;
    }

    const methodName = selectedMethod ? selectedMethod.name : 'Cash';
    onConfirmSale(methodName, saleNote.trim(), shouldPrintReceipt);
  };

  const handleClose = () => {
    if (!loading) {
      setSaleNote('');
      setShouldPrintReceipt(false);
      // Reset to default payment method
      const defaultMethod = paymentMethods.find((method) => method.isDefault);
      if (defaultMethod) {
        setSelectedPaymentMethod(defaultMethod.id);
      }
      setShowPaymentPicker(false);
      setShowManagementModal(false);
      onClose();
    }
  };

  const getSelectedPaymentMethod = () => {
    return paymentMethods.find((method) => method.id === selectedPaymentMethod);
  };

  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedPaymentMethod(methodId);
    setShowPaymentPicker(false);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
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
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Total Amount */}
          <View style={styles.totalSection}>
            <Text style={styles.totalLabel} weight="medium">
              {t('paymentModal.totalAmount')}
            </Text>
            <Text style={styles.totalAmount} weight="bold">
              {formatPrice(total)}
            </Text>
          </View>

          {/* Payment Method Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle} weight="medium">
                {t('paymentModal.paymentMethod')}
              </Text>
              <TouchableOpacity
                style={styles.manageButton}
                onPress={() => setShowManagementModal(true)}
                disabled={loading}
              >
                <Settings size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {loadingMethods ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#6B7280" />
                <Text style={styles.loadingText}>
                  Loading payment methods...
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.paymentMethodDropdown}
                onPress={() => setShowPaymentPicker(true)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <View style={styles.paymentMethodDropdownContent}>
                  {(() => {
                    const selectedMethod = getSelectedPaymentMethod();
                    const IconComponent = selectedMethod
                      ? getPaymentMethodIcon(selectedMethod.icon)
                      : Banknote;
                    return (
                      <>
                        <View
                          style={[
                            styles.paymentMethodIconContainer,
                            {
                              backgroundColor: `${
                                selectedMethod?.color || '#10B981'
                              }15`,
                            },
                          ]}
                        >
                          <IconComponent
                            size={20}
                            color={selectedMethod?.color || '#10B981'}
                          />
                        </View>
                        <Text
                          style={styles.paymentMethodDropdownText}
                          weight="medium"
                        >
                          {selectedMethod?.name || 'Cash'}
                        </Text>
                      </>
                    );
                  })()}
                </View>
                <ChevronDown size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* Payment Method Picker Modal */}
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
                    const IconComponent = getPaymentMethodIcon(method.icon);
                    const isSelected = selectedPaymentMethod === method.id;

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
                            <IconComponent size={20} color={method.color} />
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

          {/* Payment Method Management Modal */}
          <PaymentMethodManagement
            visible={showManagementModal}
            onClose={() => setShowManagementModal(false)}
            onMethodsUpdated={loadPaymentMethods}
          />

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
            />
          </View>

          {/* Print Receipt Option */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setShouldPrintReceipt(!shouldPrintReceipt)}
              disabled={loading}
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
            >
              {loading ? (
                <View style={styles.loadingContainer}>
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
    marginBottom: 5,
  },
  title: {
    fontSize: 20,
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 5,
    padding: 5,
    marginBottom: 5,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 20,
    color: '#059669',
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
  paymentMethodIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentMethodLabel: {
    fontSize: 16,
    color: '#374151',
  },
  paymentMethodLabelSelected: {
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
  },
  checkbox: {
    width: 20,
    height: 20,
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
  },
  confirmButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  // loadingContainer: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  // },
});
