import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useRouter, useLocalSearchParams } from 'expo-router';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  useSupplier,
  useSupplierProducts,
  useSupplierAnalytics,
  useSupplierMutations,
  useInfiniteStockMovements,
} from '@/hooks/useQueries';
import { SupplierProduct } from '@/services/database';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { useTranslation } from '@/context/LocalizationContext';
import { Card } from '@/components/Card';
import {
  ArrowLeft,
  MoreVertical,
  Edit,
  Trash2,
  FileText,
  Package,
  TrendingUp,
  Phone,
  Mail,
  MapPin,
  User,
  TrendingDown,
} from 'lucide-react-native';

type TabType = 'info' | 'products' | 'movements';

export default function SupplierDetail() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const supplierId = id || '';
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const { formatPrice } = useCurrencyFormatter();

  const {
    data: supplier,
    isLoading: supplierLoading,
    error: supplierError,
  } = useSupplier(supplierId);

  const { deleteSupplier } = useSupplierMutations();

  const handleEdit = () => {
    setShowActionsMenu(false);
    router.push(`/supplier-form?id=${supplierId}` as any);
  };

  const handleDelete = () => {
    if (!supplier) return;

    setShowActionsMenu(false);

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
              router.back();
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
          <Package size={64} color="#EF4444" />
          <Text style={styles.errorTitle} weight="medium">
            {t('suppliers.supplierNotFound')}
          </Text>
          <Text style={styles.errorText}>
            {t('suppliers.supplierNotFoundMessage')}
          </Text>
          <TouchableOpacity
            style={styles.backButtonError}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText} weight="medium">
              {t('suppliers.goBack')}
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1} weight="bold">
          {supplier.name}
        </Text>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => setShowActionsMenu(!showActionsMenu)}
        >
          <MoreVertical size={24} color="#111827" />
        </TouchableOpacity>

        {/* Actions Dropdown Menu */}
        {showActionsMenu && (
          <View style={styles.actionsMenu}>
            <TouchableOpacity
              style={styles.actionsMenuItem}
              onPress={handleEdit}
            >
              <Edit size={18} color="#059669" />
              <Text style={styles.actionsMenuItemText}>{t('common.edit')}</Text>
            </TouchableOpacity>

            <View style={styles.actionsMenuDivider} />

            <TouchableOpacity
              style={styles.actionsMenuItem}
              onPress={handleDelete}
            >
              <Trash2 size={18} color="#EF4444" />
              <Text style={[styles.actionsMenuItemText, styles.deleteText]}>
                {t('common.delete')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'info' && styles.tabActive]}
          onPress={() => setActiveTab('info')}
        >
          <FileText
            size={18}
            color={activeTab === 'info' ? '#059669' : '#6B7280'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'info' && styles.tabTextActive,
            ]}
            weight={activeTab === 'info' ? 'medium' : 'regular'}
          >
            Info
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'products' && styles.tabActive]}
          onPress={() => setActiveTab('products')}
        >
          <Package
            size={18}
            color={activeTab === 'products' ? '#059669' : '#6B7280'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'products' && styles.tabTextActive,
            ]}
            weight={activeTab === 'products' ? 'medium' : 'regular'}
          >
            Products
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'movements' && styles.tabActive]}
          onPress={() => setActiveTab('movements')}
        >
          <TrendingUp
            size={18}
            color={activeTab === 'movements' ? '#059669' : '#6B7280'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'movements' && styles.tabTextActive,
            ]}
            weight={activeTab === 'movements' ? 'medium' : 'regular'}
          >
            Movements
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'info' ? (
        <InfoTab
          supplier={supplier}
          supplierId={supplierId}
          formatPrice={formatPrice}
          t={t}
        />
      ) : activeTab === 'products' ? (
        <ProductsTab supplierId={supplierId} />
      ) : (
        <MovementsTab supplierId={supplierId} />
      )}
    </SafeAreaView>
  );
}

// Info Tab Component
function InfoTab({ supplier, supplierId, formatPrice, t }: any) {
  const { data: analytics, isLoading: analyticsLoading } =
    useSupplierAnalytics(supplierId);

  return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Supplier Info */}
      <Card style={styles.infoCard}>
        <Text style={styles.sectionTitle} weight="bold">
          {t('suppliers.contactInformation')}
        </Text>

        <View style={styles.infoRow}>
          <User size={20} color="#6B7280" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>{t('suppliers.contactPerson')}</Text>
            <Text style={styles.infoValue}>{supplier.contact_name}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Phone size={20} color="#6B7280" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>{t('suppliers.phone')}</Text>
            <Text style={styles.infoValue}>{supplier.phone}</Text>
          </View>
        </View>

        {supplier.email && (
          <View style={styles.infoRow}>
            <Mail size={20} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('suppliers.email')}</Text>
              <Text style={styles.infoValue}>{supplier.email}</Text>
            </View>
          </View>
        )}

        <View style={styles.infoRow}>
          <MapPin size={20} color="#6B7280" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>{t('suppliers.address')}</Text>
            <Text style={styles.infoValue}>{supplier.address}</Text>
          </View>
        </View>
      </Card>

      {/* Analytics */}
      {analyticsLoading ? (
        <View style={styles.loadingSection}>
          <LoadingSpinner />
        </View>
      ) : (
        analytics && (
          <Card style={styles.analyticsCard}>
            <Text style={styles.sectionTitle} weight="bold">
              {t('suppliers.analytics30Days')}
            </Text>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue} weight="bold">
                  {analytics.totalProducts}
                </Text>
                <Text style={styles.statLabel}>
                  {t('suppliers.supplierTotalProducts')}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue} weight="bold">
                  {formatPrice(analytics.totalPurchaseValue)}
                </Text>
                <Text style={styles.statLabel}>
                  {t('suppliers.purchaseValue')}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue} weight="bold">
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
                {analytics.topProducts
                  .slice(0, 3)
                  .map((product: any, index: number) => (
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
          </Card>
        )
      )}
    </ScrollView>
  );
}

// Products Tab Component
function ProductsTab({ supplierId }: { supplierId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: products = [], isLoading: productsLoading } =
    useSupplierProducts(supplierId);

  const renderProductItem = ({ item }: { item: SupplierProduct }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() =>
        router.push(`/(drawer)/product-detail?id=${item.product_id}` as any)
      }
    >
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
    </TouchableOpacity>
  );

  if (productsLoading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.tabContent}>
      {products.length > 0 ? (
        <FlatList
          data={products}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.product_id}
          contentContainerStyle={styles.productsList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyProducts}>
          <Package size={64} color="#D1D5DB" />
          <Text style={styles.emptyProductsTitle} weight="medium">
            No Products
          </Text>
          <Text style={styles.emptyProductsText}>
            {t('suppliers.noProductsAssociated')}
          </Text>
        </View>
      )}
    </View>
  );
}

// Movements Tab Component
function MovementsTab({ supplierId }: { supplierId: string }) {
  const { formatPrice } = useCurrencyFormatter();
  const { t } = useTranslation();
  const router = useRouter();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteStockMovements({ supplierId }, 20);

  const movements = data?.pages.flat() || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMovementIcon = (type: 'stock_in' | 'stock_out') => {
    return type === 'stock_in' ? (
      <TrendingUp size={20} color="#059669" />
    ) : (
      <TrendingDown size={20} color="#EF4444" />
    );
  };

  const getMovementColor = (type: 'stock_in' | 'stock_out') => {
    return type === 'stock_in' ? '#059669' : '#EF4444';
  };

  const handleProductPress = (productId: string) => {
    router.push(`/(drawer)/product-detail?id=${productId}` as any);
  };

  const renderMovementItem = ({ item }: { item: any }) => (
    <Card style={styles.movementCard}>
      <View style={styles.movementHeader}>
        <View style={styles.movementType}>
          {getMovementIcon(item.type)}
          <Text
            style={[
              styles.movementTypeText,
              { color: getMovementColor(item.type) },
            ]}
            weight="medium"
          >
            {item.type === 'stock_in'
              ? t('stockMovement.stockIn')
              : t('stockMovement.stockOut')}
          </Text>
        </View>
        <Text style={styles.movementDate}>{formatDate(item.created_at)}</Text>
      </View>

      <View style={styles.movementContent}>
        {item.product_name && item.product_id && (
          <View style={styles.movementRow}>
            <Text style={styles.movementLabel}>{t('common.product')}:</Text>
            <TouchableOpacity
              onPress={() => handleProductPress(item.product_id)}
            >
              <Text style={styles.movementProductLink} weight="medium">
                {item.product_name}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.movementRow}>
          <Text style={styles.movementLabel}>
            {t('stockMovement.quantity')}:
          </Text>
          <Text
            style={[
              styles.movementQuantity,
              { color: getMovementColor(item.type) },
            ]}
            weight="bold"
          >
            {item.type === 'stock_in' ? '+' : '-'}
            {item.quantity}
          </Text>
        </View>

        {item.reason && (
          <View style={styles.movementRow}>
            <Text style={styles.movementLabel}>
              {t('stockMovement.reason')}:
            </Text>
            <Text style={styles.movementReason}>{item.reason}</Text>
          </View>
        )}

        {item.reference_number && (
          <View style={styles.movementRow}>
            <Text style={styles.movementLabel}>
              {t('stockMovement.reference')}:
            </Text>
            <Text style={styles.movementReference}>
              {item.reference_number}
            </Text>
          </View>
        )}

        {item.unit_cost && (
          <View style={styles.movementRow}>
            <Text style={styles.movementLabel}>
              {t('stockMovement.unitCost')}:
            </Text>
            <Text style={styles.movementCost}>
              {formatPrice(item.unit_cost)}
            </Text>
          </View>
        )}
      </View>
    </Card>
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.loadingMore}>
        <LoadingSpinner />
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyProducts}>
      <TrendingUp size={64} color="#D1D5DB" />
      <Text style={styles.emptyProductsTitle} weight="medium">
        No Movements Yet
      </Text>
      <Text style={styles.emptyProductsText}>
        No stock movements recorded for this supplier.
      </Text>
    </View>
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.tabContent}>
      <FlatList
        data={movements}
        renderItem={renderMovementItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.productsList,
          movements.length === 0 && styles.productsListEmpty,
        ]}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 20,
    color: '#111827',
    textAlign: 'center',
  },
  moreButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsMenu: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  actionsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionsMenuItemText: {
    fontSize: 15,
    color: '#111827',
  },
  deleteText: {
    color: '#EF4444',
  },
  actionsMenuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#059669',
  },
  tabText: {
    fontSize: 15,
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#059669',
  },
  tabContent: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    marginBottom: 16,
    padding: 16,
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
    marginBottom: 16,
    padding: 16,
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
  productsList: {
    padding: 16,
  },
  productsListEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    paddingVertical: 48,
  },
  emptyProductsTitle: {
    fontSize: 20,
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyProductsText: {
    fontSize: 14,
    color: '#6B7280',
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
  backButtonError: {
    backgroundColor: '#059669',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  movementCard: {
    marginBottom: 12,
    marginHorizontal: 16,
    padding: 16,
  },
  movementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  movementType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  movementTypeText: {
    fontSize: 16,
  },
  movementDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  movementContent: {
    gap: 8,
  },
  movementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  movementLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  movementQuantity: {
    fontSize: 16,
    fontWeight: '600',
  },
  movementReason: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  movementReference: {
    fontSize: 14,
    color: '#111827',
  },
  movementCost: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  movementProductLink: {
    fontSize: 14,
    color: '#059669',
    textDecorationLine: 'underline',
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
