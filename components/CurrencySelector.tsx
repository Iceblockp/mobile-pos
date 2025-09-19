import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { CustomCurrencyForm } from '@/components/CustomCurrencyForm';
import {
  useCurrencyContext,
  useCustomCurrencies,
} from '@/context/CurrencyContext';
import { CurrencySettings } from '@/services/currencyManager';

interface CurrencySelectorProps {
  onCurrencyChange?: (currency: CurrencySettings) => void;
  showCustomCurrencies?: boolean;
  allowCustomCreation?: boolean;
  compact?: boolean;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  onCurrencyChange,
  showCustomCurrencies = true,
  allowCustomCreation = true,
  compact = false,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    'predefined' | 'custom'
  >('predefined');
  const [availableCurrencies, setAvailableCurrencies] = useState<{
    predefined: Record<string, CurrencySettings>;
    custom: CurrencySettings[];
  }>({ predefined: {}, custom: [] });

  const {
    currentCurrency,
    isLoading,
    updateCurrency,
    getAllAvailableCurrencies,
  } = useCurrencyContext();

  const { customCurrencies, saveCustomCurrency, deleteCustomCurrency } =
    useCustomCurrencies();

  // Load available currencies when modal opens
  const loadAvailableCurrencies = useCallback(async () => {
    try {
      const currencies = await getAllAvailableCurrencies();
      setAvailableCurrencies(currencies);
    } catch (error) {
      console.error('Failed to load available currencies:', error);
    }
  }, [getAllAvailableCurrencies]);

  const handleCurrencySelect = async (currency: CurrencySettings) => {
    try {
      await updateCurrency(currency);
      onCurrencyChange?.(currency);
      setShowModal(false);
      setSearchQuery('');
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
    try {
      await saveCustomCurrency(currency);
      await loadAvailableCurrencies(); // Refresh the list
      await handleCurrencySelect(currency);
      setShowCustomForm(false);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'Failed to save custom currency'
      );
    }
  };

  const handleDeleteCustomCurrency = async (currencyCode: string) => {
    Alert.alert(
      'Delete Currency',
      `Are you sure you want to delete the custom currency ${currencyCode}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCustomCurrency(currencyCode);
              await loadAvailableCurrencies(); // Refresh the list
              Alert.alert('Success', 'Custom currency deleted');
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error
                  ? error.message
                  : 'Failed to delete currency'
              );
            }
          },
        },
      ]
    );
  };

  const handleModalOpen = () => {
    setShowModal(true);
    loadAvailableCurrencies();
  };

  // Filter currencies based on search query
  const filteredPredefinedCurrencies = useMemo(() => {
    if (!searchQuery) return Object.entries(availableCurrencies.predefined);

    return Object.entries(availableCurrencies.predefined).filter(
      ([code, currency]) =>
        currency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        currency.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        currency.symbol.includes(searchQuery)
    );
  }, [availableCurrencies.predefined, searchQuery]);

  const filteredCustomCurrencies = useMemo(() => {
    if (!searchQuery) return availableCurrencies.custom;

    return availableCurrencies.custom.filter(
      (currency) =>
        currency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        currency.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        currency.symbol.includes(searchQuery)
    );
  }, [availableCurrencies.custom, searchQuery]);

  const renderPredefinedCurrencyItem = ({
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
        disabled={isLoading}
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

  const renderCustomCurrencyItem = ({ item }: { item: CurrencySettings }) => {
    const isSelected = currentCurrency?.code === item.code;

    return (
      <TouchableOpacity
        style={[styles.currencyItem, isSelected && styles.selectedCurrency]}
        onPress={() => handleCurrencySelect(item)}
        disabled={isLoading}
      >
        <View style={styles.currencyInfo}>
          <View style={styles.customCurrencyHeader}>
            <Text style={styles.currencyName}>{item.name}</Text>
            <View style={styles.customBadge}>
              <Text style={styles.customBadgeText}>Custom</Text>
            </View>
          </View>
          <Text style={styles.currencyCode}>
            {item.code} ({item.symbol})
          </Text>
          <Text style={styles.currencyExample}>
            Example: {item.symbol}1,234{item.decimals > 0 ? '.56' : ''}
          </Text>
          {item.lastUsed && (
            <Text style={styles.lastUsed}>
              Last used: {new Date(item.lastUsed).toLocaleDateString()}
            </Text>
          )}
        </View>
        <View style={styles.currencyActions}>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          )}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteCustomCurrency(item.code)}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading && !currentCurrency) {
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
        style={[styles.selector, compact && styles.compactSelector]}
        onPress={handleModalOpen}
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

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
              color="#6B7280"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search currencies..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Tabs */}
          {showCustomCurrencies && (
            <View style={styles.categoryTabs}>
              <TouchableOpacity
                style={[
                  styles.categoryTab,
                  selectedCategory === 'predefined' && styles.activeTab,
                ]}
                onPress={() => setSelectedCategory('predefined')}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    selectedCategory === 'predefined' && styles.activeTabText,
                  ]}
                >
                  Predefined ({filteredPredefinedCurrencies.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.categoryTab,
                  selectedCategory === 'custom' && styles.activeTab,
                ]}
                onPress={() => setSelectedCategory('custom')}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    selectedCategory === 'custom' && styles.activeTabText,
                  ]}
                >
                  Custom ({filteredCustomCurrencies.length})
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Currency List */}
          <ScrollView
            style={styles.currencyList}
            showsVerticalScrollIndicator={false}
          >
            {selectedCategory === 'predefined' ? (
              filteredPredefinedCurrencies.length > 0 ? (
                filteredPredefinedCurrencies.map(([code, currency]) => (
                  <View key={code}>
                    {renderPredefinedCurrencyItem({ item: [code, currency] })}
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="search" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyStateText}>No currencies found</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Try adjusting your search terms
                  </Text>
                </View>
              )
            ) : filteredCustomCurrencies.length > 0 ? (
              filteredCustomCurrencies.map((currency) => (
                <View key={currency.code}>
                  {renderCustomCurrencyItem({ item: currency })}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="add-circle-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>No custom currencies</Text>
                <Text style={styles.emptyStateSubtext}>
                  Create your first custom currency below
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          {allowCustomCreation && (
            <View style={styles.modalFooter}>
              <Button
                title="Create Custom Currency"
                onPress={handleCustomCurrency}
                variant="outline"
                style={styles.customButton}
                icon="add"
              />
            </View>
          )}
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
  compactSelector: {
    paddingVertical: 8,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 4,
  },
  clearButton: {
    marginLeft: 8,
  },
  categoryTabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryTabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#111827',
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
  customCurrencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  customBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  customBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  lastUsed: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  currencyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  customButton: {
    width: '100%',
  },
});
