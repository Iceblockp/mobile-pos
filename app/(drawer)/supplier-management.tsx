import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/Button';
import { MenuButton } from '@/components/MenuButton';
import { useDrawer } from '@/context/DrawerContext';
import { SupplierCard } from '@/components/SupplierCard';
import { SupplierFormModal } from '@/components/SupplierFormModal';
import { useSuppliers, useSupplierMutations } from '@/hooks/useQueries';
import { SupplierWithStats } from '@/services/database';
import { useDebounce } from '@/hooks/useDebounce';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { useTranslation } from '@/context/LocalizationContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SupplierManagement() {
  const { t } = useTranslation();
  const { openDrawer } = useDrawer();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] =
    useState<SupplierWithStats | null>(null);
  const [page, setPage] = useState(1);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const {
    data: suppliers = [],
    isLoading,
    error,
    refetch,
  } = useSuppliers(debouncedSearchQuery, page, 50);

  const { deleteSupplier } = useSupplierMutations();

  const handleAddSupplier = () => {
    setEditingSupplier(null);
    setShowAddModal(true);
  };

  const handleEditSupplier = (supplier: SupplierWithStats) => {
    setEditingSupplier(supplier);
    setShowAddModal(true);
  };

  const handleDeleteSupplier = (supplier: SupplierWithStats) => {
    Alert.alert(
      t('suppliers.deleteSupplier'),
      `${t('suppliers.areYouSure')} "${supplier.name}"? ${t(
        'common.actionCannotBeUndone',
      )}.`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSupplier.mutateAsync(supplier.id);
              Alert.alert(t('common.success'), t('suppliers.supplierDeleted'));
            } catch (error) {
              Alert.alert(
                t('common.error'),
                error instanceof Error
                  ? error.message
                  : t('suppliers.failedToSave'),
              );
            }
          },
        },
      ],
    );
  };

  const handleViewSupplier = (supplier: SupplierWithStats) => {
    router.push(`/supplier-detail?id=${supplier.id}`);
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setEditingSupplier(null);
  };

  const renderSupplierItem = ({ item }: { item: SupplierWithStats }) => (
    <SupplierCard
      supplier={item}
      onEdit={() => handleEditSupplier(item)}
      onDelete={() => handleDeleteSupplier(item)}
      onView={() => handleViewSupplier(item)}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="business-outline" size={64} color="#9CA3AF" />
      <Text style={styles.emptyStateTitle} weight="medium">
        {t('suppliers.noSuppliersFound')}
      </Text>
      <Text style={styles.emptyStateText}>
        {searchQuery
          ? t('suppliers.noSuppliersMatch')
          : t('suppliers.addFirstSupplier')}
      </Text>
      {!searchQuery && (
        <Button
          title={t('suppliers.addSupplier')}
          onPress={handleAddSupplier}
          style={styles.emptyStateButton}
        />
      )}
    </View>
  );

  const renderError = () => (
    <View style={styles.errorState}>
      <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
      <Text style={styles.errorTitle} weight="medium">
        {t('suppliers.errorLoadingSuppliers')}
      </Text>
      <Text style={styles.errorText}>
        {error instanceof Error
          ? error.message
          : t('suppliers.somethingWentWrong')}
      </Text>
      <Button
        title={t('suppliers.tryAgain')}
        onPress={() => refetch()}
        style={styles.retryButton}
      />
    </View>
  );

  if (isLoading && suppliers.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (error && suppliers.length === 0) {
    return (
      <SafeAreaView style={styles.container}>{renderError()}</SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <MenuButton onPress={openDrawer} />
        <Text style={styles.title} weight="medium">
          {t('suppliers.title')}
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddSupplier}>
          <Ionicons name="add" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#9CA3AF"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder={
            t('suppliers.searchPlaceholder') || 'Search suppliers...'
          }
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Suppliers List */}
      <FlatList
        data={suppliers}
        renderItem={renderSupplierItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        refreshing={isLoading}
        onRefresh={refetch}
        onEndReached={() => {
          // TODO: Implement pagination
        }}
        onEndReachedThreshold={0.1}
      />

      {/* Add/Edit Supplier Modal */}
      <SupplierFormModal
        visible={showAddModal}
        supplier={editingSupplier}
        onClose={handleModalClose}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    color: '#111827',
  },
  addButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    padding: 4,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    paddingHorizontal: 24,
  },
  errorState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
  },
});
