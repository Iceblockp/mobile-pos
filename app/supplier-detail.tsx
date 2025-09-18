import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/Button';
import { SupplierFormModal } from '@/components/SupplierFormModal';
import {
  useSupplier,
  useSupplierProducts,
  useSupplierAnalytics,
  useSupplierMutations,
} from '@/hooks/useQueries';
import { useCurrencyFormatter } from '@/hooks/useCurrency';
import { SupplierProduct } from '@/services/database';

export default function SupplierDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const supplierId = parseInt(id || '0', 10);
  const [showEditModal, setShowEditModal] = useState(false);
  const { formatPrice } = useCurrencyFormatter();

  const {
    data: supplier,
    isLoading: supplierLoading,
    error: supplierError,
  } = useSupplier(supplierId);

  const { data: products = [], isLoading: productsLoading } =
    useSupplierProducts(supplierId);

  const { data: analytics, isLoading: analyticsLoading } =
    useSupplierAnalytics(supplierId);

  const { deleteSupplier } = useSupplierMutations();

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleDelete = () => {
    if (!supplier) return;

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
              router.back();
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

  const renderProductItem = ({ item }: { item: SupplierProduct }) => (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        <Text style={styles.productName}>{item.product_name}</Text>
        <Text style={styles.productStock}>Stock: {item.current_stock}</Text>
      </View>
      <View style={styles.productStats}>
        <Text style={styles.productStat}>
          Total Received: {item.total_received}
        </Text>
        {item.last_delivery_date && (
          <Text style={styles.productStat}>
            Last Delivery:{' '}
            {new Date(item.last_delivery_date).toLocaleDateString()}
          </Text>
        )}
      </View>
    </View>
  );

  if (supplierLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (supplierError || !supplier) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Supplier Not Found</Text>
          <Text style={styles.errorText}>
            The supplier you're looking for doesn't exist or has been deleted.
          </Text>
          <Button
            title="Go Back"
            onPress={() => router.back()}
            style={styles.backButton}
          />
        </View>
      </SafeAreaView>
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
        <Text style={styles.title} numberOfLines={1}>
          {supplier.name}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
            <Ionicons name="pencil" size={20} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
            <Ionicons name="trash" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Supplier Info */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          <View style={styles.infoRow}>
            <Ionicons name="person" size={20} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Contact Person</Text>
              <Text style={styles.infoValue}>{supplier.contact_name}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call" size={20} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{supplier.phone}</Text>
            </View>
          </View>

          {supplier.email && (
            <View style={styles.infoRow}>
              <Ionicons name="mail" size={20} color="#6B7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{supplier.email}</Text>
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{supplier.address}</Text>
            </View>
          </View>
        </View>

        {/* Analytics */}
        {analyticsLoading ? (
          <View style={styles.loadingSection}>
            <LoadingSpinner size="small" />
          </View>
        ) : (
          analytics && (
            <View style={styles.analyticsCard}>
              <Text style={styles.sectionTitle}>Analytics (Last 30 Days)</Text>

              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {analytics.totalProducts}
                  </Text>
                  <Text style={styles.statLabel}>Total Products</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {formatPrice(analytics.totalPurchaseValue)}
                  </Text>
                  <Text style={styles.statLabel}>Purchase Value</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {analytics.recentDeliveries.length}
                  </Text>
                  <Text style={styles.statLabel}>Recent Deliveries</Text>
                </View>
              </View>

              {analytics.topProducts.length > 0 && (
                <View style={styles.topProductsSection}>
                  <Text style={styles.subsectionTitle}>Top Products</Text>
                  {analytics.topProducts.slice(0, 3).map((product, index) => (
                    <View
                      key={product.product_id}
                      style={styles.topProductItem}
                    >
                      <Text style={styles.topProductName}>
                        {product.product_name}
                      </Text>
                      <Text style={styles.topProductValue}>
                        {product.total_received} units received
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )
        )}

        {/* Products */}
        <View style={styles.productsCard}>
          <Text style={styles.sectionTitle}>Products ({products.length})</Text>

          {productsLoading ? (
            <View style={styles.loadingSection}>
              <LoadingSpinner size="small" />
            </View>
          ) : products.length > 0 ? (
            <FlatList
              data={products}
              renderItem={renderProductItem}
              keyExtractor={(item) => item.product_id.toString()}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyProducts}>
              <Ionicons name="cube-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyProductsText}>
                No products associated with this supplier
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <SupplierFormModal
        visible={showEditModal}
        supplier={supplier}
        onClose={() => setShowEditModal(false)}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 22,
  },
  analyticsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  topProductsSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  topProductItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  topProductName: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  topProductValue: {
    fontSize: 14,
    color: '#6B7280',
  },
  productsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  productStock: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  productStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productStat: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyProducts: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyProductsText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
  },
  loadingSection: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
});
