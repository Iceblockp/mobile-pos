import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/Button';
import { SupplierCard } from '@/components/SupplierCard';
import { SupplierFormModal } from '@/components/SupplierFormModal';
import { useSuppliers, useSupplierMutations } from '@/hooks/useQueries';
import { SupplierWithStats } from '@/services/database';
import { useDebounce } from '@/hooks/useDebounce';

export default function SupplierManagement() {
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
      'Delete Supplier',
      `Are you sure you want to delete "${supplier.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSupplier.mutateAsync(supplier.id);
              Alert.alert('Success', 'Supplier deleted successfully');
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error
                  ? error.message
                  : 'Failed to delete supplier'
              );
            }
          },
        },
      ]
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
      <Text style={styles.emptyStateTitle}>No Suppliers Found</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery
          ? 'No suppliers match your search criteria'
          : 'Add your first supplier to get started'}
      </Text>
      {!searchQuery && (
        <Button
          title="Add Supplier"
          onPress={handleAddSupplier}
          style={styles.emptyStateButton}
        />
      )}
    </View>
  );

  const renderError = () => (
    <View style={styles.errorState}>
      <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
      <Text style={styles.errorTitle}>Error Loading Suppliers</Text>
      <Text style={styles.errorText}>
        {error instanceof Error ? error.message : 'Something went wrong'}
      </Text>
      <Button
        title="Try Again"
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>Suppliers</Text>
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
          placeholder="Search suppliers..."
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
        keyExtractor={(item) => item.id.toString()}
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
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
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
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
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
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
  },
});
