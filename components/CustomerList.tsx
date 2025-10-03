import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Search, Plus, Users } from 'lucide-react-native';
import { CustomerCard } from '@/components/CustomerCard';
import { CustomerForm } from '@/components/CustomerForm';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useCustomers, useCustomerMutations } from '@/hooks/useQueries';
import { Customer } from '@/services/database';
import { useTranslation } from '@/context/LocalizationContext';
import { useToast } from '@/context/ToastContext';

interface CustomerListProps {
  onCustomerSelect?: (customer: Customer) => void;
  selectable?: boolean;
  showAddButton?: boolean;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  onCustomerSelect,
  selectable = false,
  showAddButton = true,
}) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { deleteCustomer } = useCustomerMutations();

  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [page, setPage] = useState(1);

  const {
    data: customers = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useCustomers(searchQuery, page, 50);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;

    const query = searchQuery.toLowerCase();
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        customer.phone?.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setShowForm(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    Alert.alert(
      t('customers.deleteCustomer'),
      t('customers.deleteConfirmation', { name: customer.name }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCustomer.mutateAsync(customer.id);
              showToast(t('customers.customerDeleted'), 'success');
            } catch (error) {
              console.error('Error deleting customer:', error);
              Alert.alert(t('common.error'), t('customers.failedToDelete'));
            }
          },
        },
      ]
    );
  };

  const handleCustomerPress = (customer: Customer) => {
    if (selectable && onCustomerSelect) {
      onCustomerSelect(customer);
    }
  };

  const renderCustomer = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      onPress={() => handleCustomerPress(item)}
      disabled={!selectable}
      activeOpacity={selectable ? 0.7 : 1}
    >
      <CustomerCard
        customer={item}
        onEdit={selectable ? undefined : handleEditCustomer}
        onDelete={selectable ? undefined : handleDeleteCustomer}
        showActions={!selectable}
      />
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Users size={48} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>
        {searchQuery
          ? t('customers.noCustomersFound')
          : t('customers.noCustomers')}
      </Text>
      <Text style={styles.emptyDescription}>
        {searchQuery
          ? t('customers.tryDifferentSearch')
          : t('customers.addFirstCustomer')}
      </Text>
      {!searchQuery && showAddButton && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={handleAddCustomer}
        >
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.emptyButtonText}>
            {t('customers.addCustomer')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading && !customers.length) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <View style={styles.errorState}>
        <Text style={styles.errorText}>{t('common.errorLoadingData')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search size={16} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('customers.searchPlaceholder')}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {showAddButton && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddCustomer}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.addButtonText}>{t('customers.add')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Customer List */}
      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomer}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          filteredCustomers.length === 0 && styles.emptyListContainer,
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Customer Form Modal */}
      <CustomerForm
        visible={showForm}
        onClose={() => setShowForm(false)}
        customer={editingCustomer}
        onSuccess={() => {
          refetch();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  listContainer: {
    padding: 16,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
