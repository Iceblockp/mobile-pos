import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useTranslation } from '@/context/LocalizationContext';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
import {
  useProductMutations,
  useBulkPricing,
  useBasicSuppliers,
  useInfiniteStockMovements,
} from '@/hooks/useQueries';
import { useToast } from '@/context/ToastContext';
import { useDatabase } from '@/context/DatabaseContext';
import { Product, Sale } from '@/services/database';
import {
  ArrowLeft,
  Package,
  TrendingDown,
  MoreVertical,
  Edit,
  Trash2,
  FileText,
  TrendingUp,
  Receipt,
} from 'lucide-react-native';

type TabType = 'info' | 'movement' | 'sales';

/**
 * Product Detail Page
 * Full-page view for product details with tabs and dropdown menu
 */
export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { formatPrice } = useCurrencyFormatter();
  const { showToast } = useToast();
  const { db, isReady } = useDatabase();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('info');

  const { data: bulkPricing = [] } = useBulkPricing(id || '');
  const { data: suppliers = [] } = useBasicSuppliers();
  const { deleteProduct } = useProductMutations();

  // Load product data
  useEffect(() => {
    if (!isReady || !db || !id) return;

    const loadProduct = async () => {
      try {
        setIsLoading(true);
        const products = await db.getProducts();
        const foundProduct = products.find((p) => p.id === id);
        setProduct(foundProduct || null);
      } catch (error) {
        console.error('Error loading product:', error);
        showToast(t('common.error'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [id, isReady, db]);

  const getSupplierName = (supplierId: string | undefined) => {
    if (!supplierId) return t('products.noSupplier');
    const supplier = suppliers.find((s) => s.id === supplierId);
    return supplier ? supplier.name : t('products.unknown');
  };

  const handleEdit = () => {
    setShowActionsMenu(false);
    router.push({
      pathname: '/(drawer)/product-form' as any,
      params: { id, mode: 'edit' },
    });
  };

  const handleDelete = async () => {
    if (!product) return;

    setShowActionsMenu(false);

    Alert.alert(
      t('products.deleteProduct'),
      `${t('products.areYouSure')} "${product.name}"?`,
      [
        { text: t('products.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct.mutateAsync(id || '');
              showToast(t('products.productDeleted'), 'success');
              router.back();
            } catch (error) {
              showToast(t('products.failedToSave'), 'error');
              console.error('Error deleting product:', error);
            }
          },
        },
      ],
    );
  };

  if (isLoading || !product) {
    return <LoadingSpinner />;
  }

  const profit = product.price - product.cost;
  const profitMargin = ((profit / product.price) * 100).toFixed(1);
  const isLowStock = product.quantity <= product.min_stock;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title} weight="bold">
          {t('products.productDetails')}
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
          style={[styles.tab, activeTab === 'movement' && styles.tabActive]}
          onPress={() => setActiveTab('movement')}
        >
          <TrendingUp
            size={18}
            color={activeTab === 'movement' ? '#059669' : '#6B7280'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'movement' && styles.tabTextActive,
            ]}
            weight={activeTab === 'movement' ? 'medium' : 'regular'}
          >
            Movement
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'sales' && styles.tabActive]}
          onPress={() => setActiveTab('sales')}
        >
          <Receipt
            size={18}
            color={activeTab === 'sales' ? '#059669' : '#6B7280'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'sales' && styles.tabTextActive,
            ]}
            weight={activeTab === 'sales' ? 'medium' : 'regular'}
          >
            Sales
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'info' ? (
        <InfoTab
          product={product}
          bulkPricing={bulkPricing}
          suppliers={suppliers}
          formatPrice={formatPrice}
          getSupplierName={getSupplierName}
          t={t}
        />
      ) : activeTab === 'movement' ? (
        <MovementTab productId={id!} />
      ) : (
        <SalesTab productId={id!} />
      )}
    </SafeAreaView>
  );
}

// Info Tab Component
function InfoTab({
  product,
  bulkPricing,
  suppliers,
  formatPrice,
  getSupplierName,
  t,
}: any) {
  if (!product) return null;

  const profit = product.price - product.cost;
  const profitMargin = ((profit / product.price) * 100).toFixed(1);
  const isLowStock = product.quantity <= product.min_stock;

  return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Product Image */}
      {product.imageUrl ? (
        <Image
          source={{ uri: product.imageUrl }}
          style={styles.productImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Package size={64} color="#D1D5DB" />
        </View>
      )}

      {/* Product Name & Category */}
      <View style={styles.section}>
        <Text style={styles.productName} weight="bold">
          {product.name}
        </Text>
        <Text style={styles.category}>{product.category}</Text>
        {product.barcode && (
          <Text style={styles.barcode}>
            {t('products.barcode')}: {product.barcode}
          </Text>
        )}
      </View>

      {/* Price & Stock Info */}
      <Card style={styles.card}>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>{t('products.price')}</Text>
            <Text style={styles.infoValue} weight="bold">
              {formatPrice(product.price)}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>{t('products.cost')}</Text>
            <Text style={styles.infoValue} weight="bold">
              {formatPrice(product.cost)}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>{t('products.profit')}</Text>
            <Text style={[styles.infoValue, styles.profitText]} weight="bold">
              {formatPrice(profit)}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>{t('products.margin')}</Text>
            <Text style={[styles.infoValue, styles.profitText]} weight="bold">
              {profitMargin}%
            </Text>
          </View>
        </View>
      </Card>

      {/* Stock Info */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle} weight="bold">
          {t('products.stockInformation')}
        </Text>
        <View style={styles.stockInfo}>
          <View style={styles.stockItem}>
            <Text style={styles.stockLabel}>{t('products.currentStock')}</Text>
            <Text
              style={[styles.stockValue, isLowStock && styles.lowStockText]}
              weight="bold"
            >
              {product.quantity}
            </Text>
          </View>
          <View style={styles.stockItem}>
            <Text style={styles.stockLabel}>{t('products.minStock')}</Text>
            <Text style={styles.stockValue} weight="bold">
              {product.min_stock}
            </Text>
          </View>
        </View>
        {isLowStock && (
          <View style={styles.lowStockBanner}>
            <Text style={styles.lowStockBannerText}>
              {t('inventory.lowStockAlert')}
            </Text>
          </View>
        )}
      </Card>

      {/* Supplier Info */}
      {product.supplier_id && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle} weight="bold">
            {t('products.supplier')}
          </Text>
          <Text style={styles.supplierName}>
            {getSupplierName(product.supplier_id)}
          </Text>
        </Card>
      )}

      {/* Bulk Pricing */}
      {bulkPricing.length > 0 && (
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <TrendingDown size={20} color="#059669" />
            <Text style={styles.cardTitle} weight="bold">
              {t('products.bulkPricing')}
            </Text>
          </View>
          {bulkPricing.map((tier: any, index: number) => {
            const discount = (
              (1 - tier.bulk_price / product.price) *
              100
            ).toFixed(0);
            return (
              <View key={index} style={styles.bulkTier}>
                <Text style={styles.bulkQuantity}>
                  {tier.min_quantity}+ {t('products.units')}
                </Text>
                <View style={styles.bulkPriceContainer}>
                  <Text style={styles.bulkPrice} weight="bold">
                    {formatPrice(tier.bulk_price)}
                  </Text>
                  <Text style={styles.bulkDiscount}>(-{discount}%)</Text>
                </View>
              </View>
            );
          })}
        </Card>
      )}
    </ScrollView>
  );
}

// Movement Tab Component
function MovementTab({ productId }: { productId: string }) {
  const router = useRouter();
  const { formatPrice } = useCurrencyFormatter();
  const { t } = useTranslation();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteStockMovements({ productId }, 20);

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

  const handleSupplierPress = (supplierId: string) => {
    router.push(`/(drawer)/supplier-detail?id=${supplierId}` as any);
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

        {item.supplier_name && item.supplier_id && (
          <View style={styles.movementRow}>
            <Text style={styles.movementLabel}>
              {t('stockMovement.supplier')}:
            </Text>
            <TouchableOpacity
              onPress={() => handleSupplierPress(item.supplier_id)}
            >
              <Text style={styles.movementSupplierLink} weight="medium">
                {item.supplier_name}
              </Text>
            </TouchableOpacity>
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
    <View style={styles.emptySales}>
      <Package size={64} color="#D1D5DB" />
      <Text style={styles.emptySalesTitle} weight="medium">
        No Movements Yet
      </Text>
      <Text style={styles.emptySalesText}>
        No stock movements recorded for this product.
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
          styles.salesList,
          movements.length === 0 && styles.salesListEmpty,
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

// Sales Tab Component
function SalesTab({ productId }: { productId: string }) {
  const router = useRouter();
  const { formatPrice } = useCurrencyFormatter();
  const { t } = useTranslation();
  const { db, isReady } = useDatabase();

  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const pageSize = 20;

  // Load sales containing this product
  useEffect(() => {
    if (!isReady || !db || !productId) return;

    const loadSales = async () => {
      try {
        setIsLoading(true);
        const result = await db.getSalesByProduct(productId, 1, pageSize);
        setSales(result);
        setHasMore(result.length === pageSize);
        setPage(1);
      } catch (error) {
        console.error('Error loading product sales:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSales();
  }, [productId, isReady, db]);

  const loadMore = async () => {
    if (!hasMore || isLoadingMore || !db) return;

    try {
      setIsLoadingMore(true);
      const nextPage = page + 1;
      const result = await db.getSalesByProduct(productId, nextPage, pageSize);
      setSales((prev) => [...prev, ...result]);
      setHasMore(result.length === pageSize);
      setPage(nextPage);
    } catch (error) {
      console.error('Error loading more sales:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderSaleItem = ({ item }: { item: Sale }) => (
    <TouchableOpacity
      style={styles.saleCard}
      onPress={() =>
        router.push({
          pathname: '/(drawer)/sale-detail',
          params: { sale: JSON.stringify(item) },
        })
      }
    >
      <View style={styles.saleCardHeader}>
        <View style={styles.saleCardLeft}>
          <Text style={styles.saleVoucher} weight="medium">
            {item.voucher_id}
          </Text>
          <Text style={styles.saleDate}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={styles.saleCardRight}>
          <Text style={styles.saleTotal} weight="bold">
            {formatPrice(item.total)}
          </Text>
          <View style={styles.paymentBadge}>
            <Text style={styles.paymentBadgeText}>{item.payment_method}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <LoadingSpinner />
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptySales}>
      <Receipt size={64} color="#D1D5DB" />
      <Text style={styles.emptySalesTitle} weight="medium">
        No Sales Yet
      </Text>
      <Text style={styles.emptySalesText}>
        This product hasn't been sold yet.
      </Text>
    </View>
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.tabContent}>
      <FlatList
        data={sales}
        renderItem={renderSaleItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.salesList,
          sales.length === 0 && styles.salesListEmpty,
        ]}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={loadMore}
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
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    color: '#111827',
    flex: 1,
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
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  productImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#F3F4F6',
  },
  imagePlaceholder: {
    width: '100%',
    height: 300,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  productName: {
    fontSize: 24,
    color: '#111827',
    marginBottom: 8,
  },
  category: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  barcode: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  card: {
    margin: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    flex: 1,
    minWidth: '45%',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    color: '#111827',
  },
  profitText: {
    color: '#059669',
  },
  stockInfo: {
    flexDirection: 'row',
    gap: 16,
  },
  stockItem: {
    flex: 1,
  },
  stockLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  stockValue: {
    fontSize: 20,
    color: '#111827',
  },
  lowStockText: {
    color: '#EF4444',
  },
  lowStockBanner: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  lowStockBannerText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  supplierName: {
    fontSize: 16,
    color: '#111827',
  },
  bulkTier: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  bulkQuantity: {
    fontSize: 14,
    color: '#6B7280',
  },
  bulkPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulkPrice: {
    fontSize: 16,
    color: '#111827',
  },
  bulkDiscount: {
    fontSize: 12,
    color: '#DC2626',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  actionButton: {
    flex: 1,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    borderColor: '#FEE2E2',
  },
  stockMovementButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  stockInButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  stockOutButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  stockButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  viewHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  viewHistoryText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  saleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  saleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saleCardLeft: {
    flex: 1,
  },
  saleVoucher: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
  },
  saleDate: {
    fontSize: 13,
    color: '#6B7280',
  },
  saleCardRight: {
    alignItems: 'flex-end',
  },
  saleTotal: {
    fontSize: 18,
    color: '#059669',
    marginBottom: 4,
  },
  paymentBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  paymentBadgeText: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptySales: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptySalesTitle: {
    fontSize: 20,
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySalesText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  salesList: {
    paddingVertical: 16,
  },
  salesListEmpty: {
    flex: 1,
    justifyContent: 'center',
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
  movementSupplier: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  movementSupplierLink: {
    fontSize: 14,
    color: '#059669',
    textDecorationLine: 'underline',
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
});
