import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Printer,
} from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
import { Picker } from '@react-native-picker/picker';

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
      onClose();
    }
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
            <Text style={styles.title}>{t('paymentModal.title')}</Text>
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
            <Text style={styles.totalLabel}>
              {t('paymentModal.totalAmount')}
            </Text>
            <Text style={styles.totalAmount}>{formatPrice(total)}</Text>
          </View>

          {/* Payment Method Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('paymentModal.paymentMethod')}
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedPaymentMethod}
                onValueChange={(itemValue) =>
                  setSelectedPaymentMethod(itemValue)
                }
                style={styles.picker}
                enabled={!loading}
              >
                {paymentMethods.map((method) => (
                  <Picker.Item
                    key={method.value}
                    label={method.label}
                    value={method.value}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Sale Note */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
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
                {shouldPrintReceipt && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.checkboxContent}>
                <View style={styles.checkboxHeader}>
                  <Printer size={16} color="#6B7280" />
                  <Text style={styles.checkboxLabel}>
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
              <Text style={styles.cancelButtonText}>
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
                  <Text style={styles.confirmButtonText}>
                    {t('paymentModal.processing')}
                  </Text>
                </View>
              ) : (
                <Text style={styles.confirmButtonText}>
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
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  totalSection: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#059669',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  picker: {
    height: 50,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-Bold',
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
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginLeft: 6,
  },
  checkboxDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 16,
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
    fontFamily: 'Inter-SemiBold',
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
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
