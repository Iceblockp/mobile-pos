import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  SafeAreaView,
} from 'react-native';
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
import { SupplierProduct } from '@/services/database';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { useTranslation } from '@/context/LocalizationContext';

export default function SupplierDetail() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const supplierId = id || '';
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
      t('suppliers.deleteSupplier'),
      `${t('suppliers.areYouSure')} "${supplier.name}"? ${t(
        'common.actionCannotBeUndone'
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
              router.back();
            } catch (error) {
              Alert.alert(
                t('common.error'),
                error instanceof Error
                  ? error.message
                  : t('suppliers.failedToSave')
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
        <Text style={styles.productName} weight="medium">
          {item.product_name}
        </Text>
        <Text style={styles.productStock} weight="medium">
          {t('suppliers.stock')}: {item.current_stock}
        </Text>
      </View>
      <View style={styles.productStats}>
        <Text style={styles.productStat}>
          {t('suppliers.totalReceived')}: {item.total_received}
        </Text>
        {item.last_delivery_date && (
          <Text style={styles.productStat}>
            {t('suppliers.lastDelivery')}:{' '}
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
          <Text style={styles.errorTitle} weight="medium">
            {t('suppliers.supplierNotFound')}
          </Text>
          <Text style={styles.errorText}>
            {t('suppliers.supplierNotFoundMessage')}
          </Text>
          <Button
            title={t('suppliers.goBack')}
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
        <Text style={styles.title} numberOfLines={1} weight="medium">
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
          <Text style={styles.sectionTitle} weight="medium">
            {t('suppliers.contactInformation')}
          </Text>

          <View style={styles.infoRow}>
            <Ionicons name="person" size={20} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                {t('suppliers.contactPerson')}
              </Text>
              <Text style={styles.infoValue}>{supplier.contact_name}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call" size={20} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('suppliers.phone')}</Text>
              <Text style={styles.infoValue}>{supplier.phone}</Text>
            </View>
          </View>

          {supplier.email && (
            <View style={styles.infoRow}>
              <Ionicons name="mail" size={20} color="#6B7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{t('suppliers.email')}</Text>
                <Text style={styles.infoValue}>{supplier.email}</Text>
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('suppliers.address')}</Text>
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
              <Text style={styles.sectionTitle} weight="medium">
                {t('suppliers.analytics30Days')}
              </Text>

              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue} weight="medium">
                    {analytics.totalProducts}
                  </Text>
                  <Text style={styles.statLabel}>
                    {t('suppliers.supplierTotalProducts')}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue} weight="medium">
                    {formatPrice(analytics.totalPurchaseValue)}
                  </Text>
                  <Text style={styles.statLabel}>
                    {t('suppliers.purchaseValue')}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue} weight="medium">
                    {analytics.recentDeliveries.length}
                  </Text>
                  <Text style={styles.statLabel}>
                    {t('suppliers.recentDeliveriesCount')}
                  </Text>
                </View>
              </View>

              {analytics.topProducts.length > 0 && (
                <View style={styles.topProductsSection}>
                  <Text style={styles.subsectionTitle} weight="medium">
                    {t('suppliers.supplierTopProducts')}
                  </Text>
                  {analytics.topProducts.slice(0, 3).map((product, index) => (
                    <View
                      key={product.product_id}
                      style={styles.topProductItem}
                    >
                      <Text style={styles.topProductName}>
                        {product.product_name}
                      </Text>
                      <Text style={styles.topProductValue}>
                        {product.total_received} {t('suppliers.unitsReceived')}
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
          <Text style={styles.sectionTitle} weight="medium">
            {t('suppliers.productsCount')} ({products.length})
          </Text>

          {productsLoading ? (
            <View style={styles.loadingSection}>
              <LoadingSpinner size="small" />
            </View>
          ) : products.length > 0 ? (
            <FlatList
              data={products}
              renderItem={renderProductItem}
              keyExtractor={(item) => item.product_id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyProducts}>
              <Ionicons name="cube-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyProductsText}>
                {t('suppliers.noProductsAssociated')}
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
    color: '#111827',
    flex: 1,
  },
  productStock: {
    fontSize: 14,
    color: '#059669',
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
});
