import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useDatabase } from '@/context/DatabaseContext';
import { Product, Supplier } from '@/services/database';
import {
  TriangleAlert as AlertTriangle,
  TrendingUp,
  Package,
  List,
} from 'lucide-react-native';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/context/LocalizationContext';

// Import the ProductsManager component
import ProductsManager from '@/components/ProductsManager';

type InventoryTab = 'overview' | 'products';

export default function Inventory() {
  const { db, isReady, refreshTrigger } = useDatabase();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<InventoryTab>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('');
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!db) return;

    try {
      setLoading(true);
      const [productsData, suppliersData, lowStockData] = await Promise.all([
        db.getProducts(),
        db.getSuppliers(),
        db.getLowStockProducts(),
      ]);

      setProducts(productsData);
      setSuppliers(suppliersData);
      setLowStockProducts(lowStockData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isReady) {
      loadData();
    }
  }, [isReady, db, refreshTrigger]); // Add refreshTrigger as a dependency

  const formatMMK = (amount: number) => {
    return (
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount) + ' MMK'
    );
  };

  const getSupplierName = (supplierId: number) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    return supplier ? supplier.name : t('inventory.unknown');
  };

  const handleStockAdjustment = (product: Product) => {
    setSelectedProduct(product);
    setAdjustmentQuantity('');
    setShowAdjustment(true);
  };

  const processAdjustment = async (type: 'add' | 'remove') => {
    if (!db || !selectedProduct) return;

    const quantity = parseInt(adjustmentQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert(t('common.error'), t('inventory.enterValidQuantity'));
      return;
    }

    try {
      const newQuantity =
        type === 'add'
          ? selectedProduct.quantity + quantity
          : Math.max(0, selectedProduct.quantity - quantity);

      await db.updateProduct(selectedProduct.id, { quantity: newQuantity });
      await loadData();
      setShowAdjustment(false);
      setSelectedProduct(null);
      setAdjustmentQuantity('');

      // Alert.alert(
      //   'Success',
      //   `Stock ${type === 'add' ? 'added' : 'removed'} successfully`
      // );
      showToast(
        type === 'add'
          ? t('inventory.stockAddedSuccessfully')
          : t('inventory.stockRemovedSuccessfully'),
        'success'
      );
    } catch (error) {
      Alert.alert(t('common.error'), t('inventory.failedToUpdate'));
      console.error('Error updating stock:', error);
    }
  };

  const getStockStatus = (product: Product) => {
    if (product.quantity <= 0)
      return { text: t('inventory.outOfStock'), color: '#EF4444' };
    if (product.quantity <= product.min_stock)
      return { text: t('inventory.lowStock'), color: '#F59E0B' };
    return { text: t('inventory.inStock'), color: '#10B981' };
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewContent();
      case 'products':
        return <ProductsManager />;
      default:
        return renderOverviewContent();
    }
  };

  const renderOverviewContent = () => {
    return (
      <>
        <ScrollView style={styles.content}>
          <View style={styles.summaryCards}>
            <Card style={styles.summaryCard}>
              <View style={styles.summaryContent}>
                <View
                  style={[styles.summaryIcon, { backgroundColor: '#3B82F6' }]}
                >
                  <Package size={24} color="#FFFFFF" />
                </View>
                <View style={styles.summaryText}>
                  <Text style={styles.summaryValue}>{products.length}</Text>
                  <Text style={styles.summaryLabel}>
                    {t('inventory.totalProducts')}
                  </Text>
                </View>
              </View>
            </Card>

            <Card style={styles.summaryCard}>
              <View style={styles.summaryContent}>
                <View
                  style={[styles.summaryIcon, { backgroundColor: '#EF4444' }]}
                >
                  <AlertTriangle size={24} color="#FFFFFF" />
                </View>
                <View style={styles.summaryText}>
                  <Text style={styles.summaryValue}>
                    {lowStockProducts.length}
                  </Text>
                  <Text style={styles.summaryLabel}>
                    {t('inventory.lowStock')}
                  </Text>
                </View>
              </View>
            </Card>
          </View>

          {lowStockProducts.length > 0 && (
            <Card>
              <Text style={styles.sectionTitle}>
                {t('inventory.lowStockAlert')}
              </Text>
              {lowStockProducts.map((product) => (
                <View key={product.id} style={styles.alertItem}>
                  <View style={styles.alertInfo}>
                    <Text style={styles.alertProductName}>{product.name}</Text>
                    <Text style={styles.alertProductDetails}>
                      {t('inventory.stock')}: {product.quantity} |{' '}
                      {t('inventory.min')}: {product.min_stock}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.adjustButton}
                    onPress={() => handleStockAdjustment(product)}
                  >
                    <Text style={styles.adjustButtonText}>
                      {t('inventory.adjust')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </Card>
          )}

          <Card>
            <Text style={styles.sectionTitle}>
              {t('inventory.allProducts')}
            </Text>
            {products.map((product) => {
              const status = getStockStatus(product);
              return (
                <View key={product.id} style={styles.productItem}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productCategory}>
                      {product.category}
                    </Text>
                    <Text style={styles.productSupplier}>
                      {t('inventory.supplier')}:{' '}
                      {getSupplierName(product.supplier_id)}
                    </Text>
                    <Text style={styles.productPrice}>
                      {t('inventory.price')}: {formatMMK(product.price)}
                    </Text>
                  </View>

                  <View style={styles.productStock}>
                    <Text style={styles.stockQuantity}>{product.quantity}</Text>
                    <Text style={[styles.stockStatus, { color: status.color }]}>
                      {status.text}
                    </Text>
                    <TouchableOpacity
                      style={styles.adjustButton}
                      onPress={() => handleStockAdjustment(product)}
                    >
                      <Text style={styles.adjustButtonText}>
                        {t('inventory.adjust')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </Card>
        </ScrollView>

        {showAdjustment && selectedProduct && (
          <View style={styles.modal}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {t('inventory.adjustStock')}
              </Text>
              <Text style={styles.modalSubtitle}>
                {selectedProduct.name} - {t('inventory.currentStock')}:{' '}
                {selectedProduct.quantity}
              </Text>

              <TextInput
                style={styles.modalInput}
                placeholder={t('inventory.enterQuantity')}
                value={adjustmentQuantity}
                onChangeText={setAdjustmentQuantity}
                keyboardType="numeric"
              />

              <View style={styles.modalButtons}>
                <Button
                  title={t('inventory.cancel')}
                  size="small"
                  onPress={() => setShowAdjustment(false)}
                  variant="secondary"
                  style={styles.modalButton}
                />
                <Button
                  title={t('inventory.remove')}
                  size="small"
                  onPress={() => processAdjustment('remove')}
                  variant="danger"
                  style={styles.modalButton}
                />
                <Button
                  title={t('inventory.add')}
                  size="small"
                  onPress={() => processAdjustment('add')}
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        )}
      </>
    );
  };

  if (!isReady || loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('inventory.title')}</Text>
        <Text style={styles.subtitle}>{t('inventory.subtitle')}</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <TrendingUp
            size={20}
            color={activeTab === 'overview' ? '#059669' : '#6B7280'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'overview' && styles.activeTabText,
            ]}
          >
            {t('inventory.overview')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'products' && styles.activeTab]}
          onPress={() => setActiveTab('products')}
        >
          <List
            size={20}
            color={activeTab === 'products' ? '#059669' : '#6B7280'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'products' && styles.activeTabText,
            ]}
          >
            {t('inventory.products')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'products' ? (
        // For products tab, render full screen without additional container
        <ProductsManager compact={true} />
      ) : (
        <View style={styles.tabContent}>{renderTabContent()}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#059669',
    fontFamily: 'Inter-SemiBold',
  },
  tabContent: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  summaryCard: {
    flex: 0.48,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  summaryText: {
    flex: 1,
  },
  summaryValue: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  alertInfo: {
    flex: 1,
  },
  alertProductName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  alertProductDetails: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#F59E0B',
  },
  adjustButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  adjustButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  productCategory: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  productSupplier: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  productPrice: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#10B981',
  },
  productStock: {
    alignItems: 'center',
  },
  stockQuantity: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  stockStatus: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    marginTop: 2,
    marginBottom: 8,
  },
  supplierItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  supplierContact: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  supplierDetails: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  supplierAddress: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    margin: 32,
    width: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 0.3,
  },
});
