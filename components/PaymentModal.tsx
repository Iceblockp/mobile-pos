import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  ScrollView,
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
} from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import { useCurrencyFormatter } from '@/context/CurrencyContext';

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
}

type PaymentMethod = 'cash' | 'card' | 'mobile';

// Payment methods will be localized inside the component

export const PaymentModal: React.FC<PaymentModalProps> = ({
  visible,
  onClose,
  onConfirmSale,
  total,
  loading,
}) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrencyFormatter();
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>('cash');
  const [saleNote, setSaleNote] = useState('');
  const [shouldPrintReceipt, setShouldPrintReceipt] = useState(false);
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);

  const paymentMethods = [
    {
      value: 'cash',
      label: t('paymentModal.cash'),
      icon: Banknote,
      color: '#10B981',
    },
    {
      value: 'card',
      label: t('paymentModal.card'),
      icon: CreditCard,
      color: '#3B82F6',
    },
    {
      value: 'mobile',
      label: t('paymentModal.mobilePayment'),
      icon: Smartphone,
      color: '#8B5CF6',
    },
  ];

  // Removed formatMMK function - now using standardized currency formatting

  const handleConfirmSale = () => {
    onConfirmSale(selectedPaymentMethod, saleNote.trim(), shouldPrintReceipt);
  };

  const handleClose = () => {
    if (!loading) {
      setSaleNote('');
      setShouldPrintReceipt(false);
      setSelectedPaymentMethod('cash');
      setShowPaymentPicker(false);
      onClose();
    }
  };

  const getSelectedPaymentMethod = () => {
    return paymentMethods.find(
      (method) => method.value === selectedPaymentMethod
    );
  };

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
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
            <Text style={styles.sectionTitle} weight="medium">
              {t('paymentModal.paymentMethod')}
            </Text>
            <TouchableOpacity
              style={styles.paymentMethodDropdown}
              onPress={() => setShowPaymentPicker(true)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <View style={styles.paymentMethodDropdownContent}>
                {(() => {
                  const selectedMethod = getSelectedPaymentMethod();
                  const IconComponent = selectedMethod?.icon || Banknote;
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
                        {selectedMethod?.label || t('paymentModal.cash')}
                      </Text>
                    </>
                  );
                })()}
              </View>
              <ChevronDown size={20} color="#6B7280" />
            </TouchableOpacity>
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
                    const IconComponent = method.icon;
                    const isSelected = selectedPaymentMethod === method.value;

                    return (
                      <TouchableOpacity
                        key={method.value}
                        style={[
                          styles.pickerOption,
                          isSelected && styles.pickerOptionSelected,
                        ]}
                        onPress={() =>
                          handlePaymentMethodSelect(
                            method.value as PaymentMethod
                          )
                        }
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
                            {method.label}
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
