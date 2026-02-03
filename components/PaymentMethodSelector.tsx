import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  ViewStyle,
} from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import {
  ChevronDown,
  X,
  Settings,
  CreditCard,
  Banknote,
  Smartphone,
  FileText,
} from 'lucide-react-native';
import {
  PaymentMethodService,
  type PaymentMethod,
} from '@/services/paymentMethodService';
import { PaymentMethodManagement } from '@/components/PaymentMethodManagement';
import { useTranslation } from '@/context/LocalizationContext';

interface PaymentMethodSelectorProps {
  selectedPaymentMethod: PaymentMethod | null;
  onPaymentMethodSelect: (method: PaymentMethod) => void;
  disabled?: boolean;
  style?: ViewStyle;
}

// Icon mapping for payment methods
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Banknote: Banknote,
  CreditCard: CreditCard,
  Smartphone: Smartphone,
  FileText: FileText,
};

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedPaymentMethod,
  onPaymentMethodSelect,
  disabled = false,
  style,
}) => {
  const { t } = useTranslation();

  const [showPicker, setShowPicker] = useState(false);
  const [showManagement, setShowManagement] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const methods = await PaymentMethodService.getPaymentMethods();
      setPaymentMethods(methods);
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

      // Show error but don't block user
      Alert.alert(
        t('common.error'),
        t('sales.errorLoadingPaymentMethods') ||
          'Failed to load payment methods. Using default cash payment.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPicker = () => {
    if (!disabled) {
      setShowPicker(true);
    }
  };

  const handleClosePicker = () => {
    setShowPicker(false);
  };

  const handleSelectMethod = (method: PaymentMethod) => {
    onPaymentMethodSelect(method);
    handleClosePicker();
  };

  const handleOpenManagement = () => {
    setShowPicker(false);
    setShowManagement(true);
  };

  const handleCloseManagement = () => {
    setShowManagement(false);
  };

  const handleMethodsUpdated = () => {
    loadPaymentMethods();
  };

  const getIconComponent = (iconName: string) => {
    return ICON_MAP[iconName] || CreditCard;
  };

  const renderPaymentMethodItem = ({ item }: { item: PaymentMethod }) => {
    const IconComponent = getIconComponent(item.icon);

    return (
      <TouchableOpacity
        style={styles.methodItem}
        onPress={() => handleSelectMethod(item)}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}${item.isDefault ? ' - Default' : ''}`}
        accessibilityHint={`Selects ${item.name} as payment method`}
      >
        <View style={styles.methodInfo}>
          <View
            style={[styles.methodIcon, { backgroundColor: `${item.color}15` }]}
          >
            <IconComponent size={20} color={item.color} />
          </View>
          <View style={styles.methodDetails}>
            <Text style={styles.methodName} weight="medium">
              {item.name}
            </Text>
            {item.isDefault && (
              <Text style={styles.defaultLabel}>
                {t('sales.default') || 'Default'}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <CreditCard size={32} color="#D1D5DB" />
      <Text style={styles.emptyText}>
        {t('sales.noPaymentMethods') || 'No payment methods available'}
      </Text>
    </View>
  );

  const SelectedIcon = selectedPaymentMethod
    ? getIconComponent(selectedPaymentMethod.icon)
    : CreditCard;

  return (
    <>
      {/* Selector Button */}
      <TouchableOpacity
        style={[
          styles.selectorButton,
          selectedPaymentMethod && styles.selectorButtonSelected,
          disabled && styles.selectorButtonDisabled,
          style,
        ]}
        onPress={handleOpenPicker}
        disabled={disabled}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={
          selectedPaymentMethod
            ? `Payment method: ${selectedPaymentMethod.name}`
            : t('sales.selectPaymentMethod') || 'Select Payment Method'
        }
        accessibilityHint="Opens payment method picker"
        accessibilityState={{ disabled }}
      >
        <View style={styles.selectorContent}>
          <SelectedIcon
            size={16}
            color={selectedPaymentMethod?.color || '#6B7280'}
            style={styles.selectorIcon}
          />
          <View style={styles.selectorText}>
            {selectedPaymentMethod ? (
              <Text style={styles.selectedMethodName} weight="medium">
                {selectedPaymentMethod.name}
              </Text>
            ) : (
              <Text style={styles.placeholderText}>
                {t('sales.selectPaymentMethod') || 'Select Payment Method'}
              </Text>
            )}
          </View>
          <ChevronDown size={16} color="#6B7280" />
        </View>
      </TouchableOpacity>

      {/* Payment Method Picker Modal */}
      <Modal
        visible={showPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClosePicker}
        accessible={true}
        accessibilityViewIsModal={true}
        accessibilityLabel={
          t('sales.selectPaymentMethod') || 'Select Payment Method'
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} weight="medium">
                {t('sales.selectPaymentMethod') || 'Select Payment Method'}
              </Text>
              <TouchableOpacity
                onPress={handleClosePicker}
                style={styles.closeButton}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={t('common.close') || 'Close'}
                accessibilityHint="Closes the payment method picker"
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Management Button */}
            <TouchableOpacity
              style={styles.managementButton}
              onPress={handleOpenManagement}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={
                t('sales.managePaymentMethods') || 'Manage Payment Methods'
              }
              accessibilityHint="Opens payment method management screen"
            >
              <Settings size={16} color="#059669" />
              <Text style={styles.managementButtonText} weight="medium">
                {t('sales.managePaymentMethods') || 'Manage Payment Methods'}
              </Text>
            </TouchableOpacity>

            {/* Payment Methods List */}
            <View style={styles.methodListContainer}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#059669" />
                  <Text style={styles.loadingText}>
                    {t('common.loading') || 'Loading...'}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={paymentMethods}
                  renderItem={renderPaymentMethodItem}
                  keyExtractor={(item) => item.id}
                  ListEmptyComponent={renderEmptyState}
                  showsVerticalScrollIndicator={true}
                  style={styles.methodList}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Method Management Modal */}
      <PaymentMethodManagement
        visible={showManagement}
        onClose={handleCloseManagement}
        onMethodsUpdated={handleMethodsUpdated}
      />
    </>
  );
};

const styles = StyleSheet.create({
  selectorButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44, // Ensure minimum touch target size
  },
  selectorButtonSelected: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  selectorButtonDisabled: {
    opacity: 0.6,
    backgroundColor: '#F9FAFB',
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorIcon: {
    marginRight: 8,
  },
  selectorText: {
    flex: 1,
  },
  selectedMethodName: {
    fontSize: 14,
    color: '#059669',
  },
  placeholderText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
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
  managementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 16,
    minHeight: 44, // Ensure minimum touch target size
  },
  managementButtonText: {
    fontSize: 14,
    color: '#059669',
    marginLeft: 8,
  },
  methodListContainer: {
    flex: 1,
    minHeight: 200,
  },
  methodList: {
    flex: 1,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    minHeight: 56, // Ensure minimum touch target size
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodDetails: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    color: '#111827',
  },
  defaultLabel: {
    fontSize: 12,
    color: '#059669',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
});
