import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Plus, Users, Filter } from 'lucide-react-native';
import { CustomerCard } from '@/components/CustomerCard';
import { CustomerForm } from '@/components/CustomerForm';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { MenuButton } from '@/components/MenuButton';
import { useDrawer } from '@/context/DrawerContext';
import { useCustomers, useCustomerMutations } from '@/hooks/useQueries';
import { Customer } from '@/services/database';
import { useTranslation } from '@/context/LocalizationContext';
import { useToast } from '@/context/ToastContext';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { MyanmarTextInput as TextInput } from '@/components/MyanmarTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';

type SortOption = 'name' | 'totalSpent' | 'visitCount' | 'recent';
type FilterOption = 'all' | 'active' | 'inactive';

export default function CustomerManagement() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { openDrawer } = useDrawer();
  const { deleteCustomer } = useCustomerMutations();

  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showFilters, setShowFilters] = useState(false);

  const {
    data: customers = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useCustomers(searchQuery, 1, 1000);

  const filteredAndSortedCustomers = useMemo(() => {
    let filtered = customers;

    // Apply filters
    if (filterBy === 'active') {
      filtered = customers.filter((customer) => customer.visit_count > 0);
    } else if (filterBy === 'inactive') {
      filtered = customers.filter((customer) => customer.visit_count === 0);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (customer) =>
          customer.name.toLowerCase().includes(query) ||
          customer.phone?.toLowerCase().includes(query) ||
          customer.email?.toLowerCase().includes(query),
      );
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'totalSpent':
          return b.total_spent - a.total_spent;
        case 'visitCount':
          return b.visit_count - a.visit_count;
        case 'recent':
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        default:
          return 0;
      }
    });
  }, [customers, searchQuery, sortBy, filterBy]);

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
      ],
    );
  };

  const renderCustomer = ({ item }: { item: Customer }) => (
    <CustomerCard
      customer={item}
      onEdit={handleEditCustomer}
      onDelete={handleDeleteCustomer}
      showActions={true}
      showNavigation={true}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Users size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle} weight="medium">
        {searchQuery || filterBy !== 'all'
          ? t('customers.noCustomersFound')
          : t('customers.noCustomers')}
      </Text>
      <Text style={styles.emptyDescription}>
        {searchQuery || filterBy !== 'all'
          ? t('customers.tryDifferentSearch')
          : t('customers.addFirstCustomer')}
      </Text>
      {!searchQuery && filterBy === 'all' && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={handleAddCustomer}
        >
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.emptyButtonText} weight="medium">
            {t('customers.addCustomer')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFilterOptions = () => {
    if (!showFilters) return null;

    return (
      <View style={styles.filterContainer}>
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle} weight="medium">
            Sort By
          </Text>
          <View style={styles.filterOptions}>
            {[
              { key: 'name', label: 'Name' },
              { key: 'totalSpent', label: 'Total Spent' },
              { key: 'visitCount', label: 'Visit Count' },
              { key: 'recent', label: 'Recently Added' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterOption,
                  sortBy === option.key && styles.filterOptionActive,
                ]}
                onPress={() => setSortBy(option.key as SortOption)}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    sortBy === option.key && styles.filterOptionTextActive,
                  ]}
                  weight="medium"
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterTitle} weight="medium">
            Filter By
          </Text>
          <View style={styles.filterOptions}>
            {[
              { key: 'all', label: 'All Customers' },
              { key: 'active', label: 'Active Customers' },
              { key: 'inactive', label: 'New Customers' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterOption,
                  filterBy === option.key && styles.filterOptionActive,
                ]}
                onPress={() => setFilterBy(option.key as FilterOption)}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    filterBy === option.key && styles.filterOptionTextActive,
                  ]}
                  weight="medium"
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  if (isLoading && !customers.length) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>{t('common.errorLoadingData')}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
          >
            <Text style={styles.retryButtonText} weight="medium">
              {t('common.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <MenuButton onPress={openDrawer} />
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} weight="bold">
              {t('more.customers')}
            </Text>
            <Text style={styles.headerSubtitle}>
              {filteredAndSortedCustomers.length} {t('customers.customers')}
            </Text>
          </View>
        </View>

        {/* Search and Filter Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={16} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('customers.searchPlaceholder')}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.filterButton,
              showFilters && styles.filterButtonActive,
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} color={showFilters ? '#FFFFFF' : '#6B7280'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddCustomer}
          >
            <Plus size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {renderFilterOptions()}
      </View>

      {/* Customer List */}
      <FlatList
        data={filteredAndSortedCustomers}
        renderItem={renderCustomer}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          filteredAndSortedCustomers.length === 0 && styles.emptyListContainer,
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  filterButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  filterButtonActive: {
    backgroundColor: '#059669',
  },
  addButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#059669',
  },
  filterContainer: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  filterOptionActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  filterOptionText: {
    fontSize: 12,
    color: '#6B7280',
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
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
    fontSize: 20,
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
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
    color: '#FFFFFF',
  },
});
