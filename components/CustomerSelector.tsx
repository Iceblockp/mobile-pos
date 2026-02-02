import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import {
  User,
  Search,
  Plus,
  X,
  ChevronDown,
  UserPlus,
  FileText,
} from 'lucide-react-native';
import { CustomerForm } from '@/components/CustomerForm';
import { useCustomers } from '@/hooks/useQueries';
import { Customer } from '@/services/database';
import { useTranslation } from '@/context/LocalizationContext';
import { useCurrencyFormatter } from '@/context/CurrencyContext';

interface CustomerSelectorProps {
  selectedCustomer?: Customer | null;
  onCustomerSelect: (customer: Customer | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  selectedCustomer,
  onCustomerSelect,
  placeholder,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrencyFormatter();

  const [showModal, setShowModal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: customers = [],
    isLoading,
    refetch,
  } = useCustomers(searchQuery, 1, 50);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers; // Show all customers when no search

    const query = searchQuery.toLowerCase();
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        customer.phone?.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  const handleOpenModal = () => {
    if (!disabled) {
      setSearchQuery('');
      setShowModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSearchQuery('');
  };

  const handleSelectCustomer = (customer: Customer) => {
    onCustomerSelect(customer);
    handleCloseModal();
  };

  const handleClearSelection = () => {
    onCustomerSelect(null);
  };

  const handleAddNewCustomer = () => {
    setShowModal(false);
    setShowAddForm(true);
  };

  const handleCustomerAdded = () => {
    refetch();
    setShowAddForm(false);
  };

  const renderCustomerItem = ({
    item,
  }: {
    item: Customer & { debt_balance?: number };
  }) => (
    <TouchableOpacity
      style={styles.customerItem}
      onPress={() => handleSelectCustomer(item)}
    >
      <View style={styles.customerInfo}>
        <View style={styles.customerNameRow}>
          <Text style={styles.customerName} weight="medium">
            {item.name}
          </Text>
          {item.debt_balance && item.debt_balance > 0 && (
            <View style={styles.debtIndicator}>
              <FileText size={12} color="#F59E0B" />
            </View>
          )}
        </View>
        {item.phone && <Text style={styles.customerContact}>{item.phone}</Text>}
        {item.email && <Text style={styles.customerContact}>{item.email}</Text>}
        {item.debt_balance && item.debt_balance > 0 && (
          <Text style={styles.debtAmount} weight="medium">
            {t('debt.owes')}: {formatPrice(item.debt_balance)}
          </Text>
        )}
      </View>
      <View style={styles.customerStats}>
        <Text style={styles.customerStat} weight="medium">
          {item.visit_count} {t('customers.visits')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <User size={32} color="#D1D5DB" />
      <Text style={styles.emptyText}>
        {searchQuery
          ? t('customers.noCustomersFound')
          : t('customers.noCustomers')}
      </Text>
    </View>
  );

  return (
    <>
      {/* Selector Button */}
      <TouchableOpacity
        style={[
          styles.selectorButton,
          selectedCustomer && styles.selectorButtonSelected,
          disabled && styles.selectorButtonDisabled,
        ]}
        onPress={handleOpenModal}
        disabled={disabled}
      >
        <View style={styles.selectorContent}>
          <User
            size={16}
            color={selectedCustomer ? '#059669' : '#6B7280'}
            style={styles.selectorIcon}
          />
          <View style={styles.selectorText}>
            {selectedCustomer ? (
              <>
                <Text style={styles.selectedCustomerName} weight="medium">
                  {selectedCustomer.name}
                </Text>
                {selectedCustomer.phone && (
                  <Text style={styles.selectedCustomerContact}>
                    {selectedCustomer.phone}
                  </Text>
                )}
              </>
            ) : (
              <Text style={styles.placeholderText}>
                {placeholder || t('customers.selectCustomer')}
              </Text>
            )}
          </View>
          {selectedCustomer ? (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearSelection}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={16} color="#6B7280" />
            </TouchableOpacity>
          ) : (
            <ChevronDown size={16} color="#6B7280" />
          )}
        </View>
      </TouchableOpacity>

      {/* Customer Selection Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} weight="medium">
                {t('customers.selectCustomer')}
              </Text>
              <TouchableOpacity
                onPress={handleCloseModal}
                style={styles.closeButton}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Search size={16} color="#6B7280" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('customers.searchPlaceholder')}
                placeholderTextColor="#9CA3AF"
                autoFocus={true}
              />
            </View>

            {/* Add New Customer Button */}
            <TouchableOpacity
              style={styles.addNewButton}
              onPress={handleAddNewCustomer}
            >
              <UserPlus size={16} color="#059669" />
              <Text style={styles.addNewButtonText} weight="medium">
                {t('customers.addNewCustomer')}
              </Text>
            </TouchableOpacity>

            {/* Customer List */}
            <View style={styles.customerListContainer}>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#059669" />
                  <Text style={styles.loadingText}>{t('common.loading')}</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredCustomers}
                  renderItem={renderCustomerItem}
                  refreshControl={
                    <RefreshControl
                      refreshing={isLoading}
                      onRefresh={refetch}
                    />
                  }
                  keyExtractor={(item) => item.id}
                  ListEmptyComponent={renderEmptyState}
                  showsVerticalScrollIndicator={true}
                  style={styles.customerList}
                  initialNumToRender={15}
                  maxToRenderPerBatch={10}
                  windowSize={10}
                  removeClippedSubviews={true}
                  getItemLayout={(data, index) => ({
                    length: 60,
                    offset: 60 * index,
                    index,
                  })}
                />
              )}
            </View>

            {/* Walk-in Customer Option */}
            <TouchableOpacity
              style={styles.walkInButton}
              onPress={() => {
                onCustomerSelect(null);
                handleCloseModal();
              }}
            >
              <Text style={styles.walkInButtonText} weight="medium">
                {t('customers.walkInCustomer')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Customer Form */}
      <CustomerForm
        visible={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSuccess={handleCustomerAdded}
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
  selectedCustomerName: {
    fontSize: 14,
    color: '#059669',
  },
  selectedCustomerContact: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  placeholderText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  clearButton: {
    padding: 4,
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
    maxHeight: '85%',
    minHeight: 500,
    flex: 1,
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
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 16,
  },
  addNewButtonText: {
    fontSize: 14,
    color: '#059669',
    marginLeft: 8,
  },
  customerListContainer: {
    flex: 1,
    minHeight: 300,
    maxHeight: 400,
  },
  customerList: {
    flex: 1,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    color: '#111827',
  },
  customerContact: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  customerStats: {
    alignItems: 'flex-end',
  },
  customerStat: {
    fontSize: 12,
    color: '#6B7280',
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
  walkInButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  walkInButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  debtIndicator: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  debtAmount: {
    fontSize: 11,
    color: '#D97706',
    marginTop: 2,
  },
});
