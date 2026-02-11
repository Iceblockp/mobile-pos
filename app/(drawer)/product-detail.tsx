import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StockMovementForm } from '@/components/StockMovementForm';
import { useTranslation } from '@/context/LocalizationContext';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
import {
  useProductMutations,
  useBulkPricing,
  useBasicSuppliers,
} from '@/hooks/useQueries';
import { useToast } from '@/context/ToastContext';
import { useDatabase } from '@/context/DatabaseContext';
import { Product } from '@/services/database';
import {
  ArrowLeft,
  Package,
  TrendingDown,
  Plus,
  Minus,
  History,
} from 'lucide-react-native';
import { ProductMovementHistory } from '@/components/ProductMovementHistory';

/**
 * Product Detail Page
 * Full-page view for product details with edit and delete actions
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
  const [showStockMovementForm, setShowStockMovementForm] = useState(false);
  const [movementType, setMovementType] = useState<'stock_in' | 'stock_out'>(
    'stock_in',
  );

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
    router.push({
      pathname: '/(drawer)/product-form' as any,
      params: { id, mode: 'edit' },
    });
  };

  const handleDelete = async () => {
    if (!product) return;

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

  const handleStockIn = () => {
    setMovementType('stock_in');
    setShowStockMovementForm(true);
  };

  const handleStockOut = () => {
    setMovementType('stock_out');
    setShowStockMovementForm(true);
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
        <View style={styles.headerSpacer} />
      </View>

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
              <Text style={styles.stockLabel}>
                {t('products.currentStock')}
              </Text>
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

          <ProductMovementHistory product={product} compact={true} />
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
            {bulkPricing.map((tier, index) => {
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

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            title={t('common.edit')}
            onPress={handleEdit}
            style={styles.actionButton}
          />
          <Button
            title={t('common.delete')}
            onPress={handleDelete}
            variant="secondary"
            style={styles.deleteButton}
          />
        </View>
      </ScrollView>

      {/* Stock Movement Form Modal */}
      <StockMovementForm
        visible={showStockMovementForm}
        onClose={() => {
          setShowStockMovementForm(false);
          // Reload product data after stock movement
          if (isReady && db && id) {
            db.getProducts().then((products) => {
              const foundProduct = products.find((p) => p.id === id);
              if (foundProduct) setProduct(foundProduct);
            });
          }
        }}
        product={product || undefined}
        initialType={movementType}
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
});
