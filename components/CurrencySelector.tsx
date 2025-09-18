import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { CustomCurrencyForm } from '@/components/CustomCurrencyForm';
import {
  useCurrency,
  usePredefinedCurrencies,
  useCurrencyMutations,
} from '@/hooks/useCurrency';
import { CurrencySettings } from '@/services/currencyManager';

interface CurrencySelectorProps {
  onCurrencyChange?: (currency: CurrencySettings) => void;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  onCurrencyChange,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);

  const { data: currentCurrency, isLoading: currentLoading } = useCurrency();
  const { data: predefinedCurrencies, isLoading: predefinedLoading } =
    usePredefinedCurrencies();
  const { updateCurrency } = useCurrencyMutations();

  const handleCurrencySelect = async (currency: CurrencySettings) => {
    try {
      await updateCurrency.mutateAsync(currency);
      onCurrencyChange?.(currency);
      setShowModal(false);
      Alert.alert('Success', `Currency changed to ${currency.name}`);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to update currency'
      );
    }
  };

  const handleCustomCurrency = () => {
    setShowCustomForm(true);
  };

  const handleCustomCurrencySubmit = async (currency: CurrencySettings) => {
    await handleCurrencySelect(currency);
    setShowCustomForm(false);
  };

  const renderCurrencyItem = ({
    item,
  }: {
    item: [string, CurrencySettings];
  }) => {
    const [code, currency] = item;
    const isSelected = currentCurrency?.code === currency.code;

    return (
      <TouchableOpacity
        style={[styles.currencyItem, isSelected && styles.selectedCurrency]}
        onPress={() => handleCurrencySelect(currency)}
        disabled={updateCurrency.isPending}
      >
        <View style={styles.currencyInfo}>
          <Text style={styles.currencyName}>{currency.name}</Text>
          <Text style={styles.currencyCode}>
            {currency.code} ({currency.symbol})
          </Text>
          <Text style={styles.currencyExample}>
            Example: {currency.symbol}1,234{currency.decimals > 0 ? '.56' : ''}
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
        )}
      </TouchableOpacity>
    );
  };

  if (currentLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="small" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Shop Currency</Text>

      <TouchableOpacity
        style={styles.selector}
        onPress={() => setShowModal(true)}
      >
        <View style={styles.currentCurrency}>
          <Text style={styles.currentCurrencyName}>
            {currentCurrency?.name || 'Select Currency'}
          </Text>
          <Text style={styles.currentCurrencyCode}>
            {currentCurrency?.code} ({currentCurrency?.symbol})
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color="#6B7280" />
      </TouchableOpacity>

      {currentCurrency && (
        <View style={styles.preview}>
          <Text style={styles.previewLabel}>Preview:</Text>
          <Text style={styles.previewExample}>
            {currentCurrency.symbol}1,234
            {currentCurrency.decimals > 0 ? '.56' : ''}
          </Text>
        </View>
      )}

      {/* Currency Selection Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowModal(false)}
            >
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Currency</Text>
            <View style={styles.placeholder} />
          </View>

          {predefinedLoading ? (
            <View style={styles.modalLoading}>
              <LoadingSpinner />
            </View>
          ) : (
            <FlatList
              data={
                predefinedCurrencies ? Object.entries(predefinedCurrencies) : []
              }
              renderItem={renderCurrencyItem}
              keyExtractor={([code]) => code}
              style={styles.currencyList}
              showsVerticalScrollIndicator={false}
            />
          )}

          <View style={styles.modalFooter}>
            <Button
              title="Custom Currency"
              onPress={handleCustomCurrency}
              variant="outline"
              style={styles.customButton}
            />
          </View>
        </View>
      </Modal>

      {/* Custom Currency Form Modal */}
      <CustomCurrencyForm
        visible={showCustomForm}
        onClose={() => setShowCustomForm(false)}
        onSubmit={handleCustomCurrencySubmit}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  currentCurrency: {
    flex: 1,
  },
  currentCurrencyName: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  currentCurrencyCode: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  previewLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  previewExample: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedCurrency: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  currencyInfo: {
    flex: 1,
  },
  currencyName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  currencyCode: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  currencyExample: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  customButton: {
    width: '100%',
  },
});
