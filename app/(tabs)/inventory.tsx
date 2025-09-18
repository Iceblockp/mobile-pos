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
  RefreshControl,
  Image,
  FlatList,
} from 'react-native';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  useProducts,
  useBasicSuppliers,
  useLowStockProducts,
  useProductMutations,
} from '@/hooks/useQueries';
import { Product, Supplier } from '@/services/database';
import {
  TriangleAlert as AlertTriangle,
  TrendingUp,
  TrendingDown,
  Package,
  List,
  Search,
  Scan,
  RotateCcw,
} from 'lucide-react-native';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/context/LocalizationContext';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';

// Import the ProductsManager component
import ProductsManager from '@/components/ProductsManager';
import { StockMovementForm } from '@/components/StockMovementForm';
import { EnhancedMovementHistory } from '@/components/EnhancedMovementHistory';
import { MovementSummary } from '@/components/MovementSummary';
import { QuickStockActions } from '@/components/QuickStockActions';

type InventoryTab = 'overview' | 'products' | 'movements';

export default function Inventory() {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<InventoryTab>('overview');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('');
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showStockMovementForm, setShowStockMovementForm] = useState(false);
  const [selectedProductForMovement, setSelectedProductForMovement] =
    useState<Product | null>(null);
  const [movementType, setMovementType] = useState<'stock_in' | 'stock_out'>(
    'stock_in'
  );

  // Use React Query for optimized data fetching
  const {
    data: products = [],
    isLoading: productsLoading,
    isRefetching: productsRefetching,
    refetch: refetchProducts,
  } = useProducts();

  const { data: suppliers = [], isLoading: suppliersLoading } =
    useBasicSuppliers();

  const {
    data: lowStockProducts = [],
    isLoading: lowStockLoading,
    isRefetching: lowStockRefetching,
    refetch: refetchLowStock,
  } = useLowStockProducts();

  const { updateProduct } = useProductMutations();

  // Performance monitoring
  const { deferHeavyOperation } = usePerformanceOptimization(
    products.length,
    'InventoryPage'
  );

  const onRefresh = () => {
    refetchProducts();
    refetchLowStock();
  };

  const isLoading = productsLoading || suppliersLoading || lowStockLoading;
  const isRefreshing = productsRefetching || lowStockRefetching;

  const formatMMK = (amount: number) => {
    return (
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount) + ' MMK'
    );
  };

  // const getSupplierName = (supplierId: number) => {
  //   const supplier = suppliers.find((s) => s.id === supplierId);
  //   return supplier ? supplier.name : t('inventory.unknown');
  // };

  const handleBarcodeScanned = async (barcode: string) => {
    try {
      const product = products.find((p) => p.barcode === barcode);
      if (product) {
        setSearchQuery(product.name);
        setShowScanner(false);
        showToast(`Found: ${product.name}`, 'success');
      } else {
        Alert.alert('Product Not Found', 'No product found with this barcode');
      }
    } catch (error) {
      console.error('Error finding product:', error);
      Alert.alert('Error', 'Failed to find product');
    }
  };

  const handleStockAdjustment = (product: Product) => {
    setSelectedProduct(product);
    setAdjustmentQuantity('');
    setShowAdjustment(true);
  };

  const handleQuickStockMovement = (
    product: Product,
    type: 'stock_in' | 'stock_out'
  ) => {
    setSelectedProductForMovement(product);
    setMovementType(type);
    setShowStockMovementForm(true);
  };

  const processAdjustment = async (type: 'add' | 'remove') => {
    if (!selectedProduct) return;

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

      await updateProduct.mutateAsync({
        id: selectedProduct.id,
        data: { quantity: newQuantity },
      });

      setShowAdjustment(false);
      setSelectedProduct(null);
      setAdjustmentQuantity('');

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

  // const getStockStatus = (product: Product) => {
  //   if (product.quantity <= 0)
  //     return { text: t('inventory.outOfStock'), color: '#EF4444' };
  //   if (product.quantity <= product.min_stock)
  //     return { text: t('inventory.lowStock'), color: '#F59E0B' };
  //   return { text: t('inventory.inStock'), color: '#10B981' };
  // };

  // Filter products based on search query
  // const filteredProducts = products.filter((product) => {
  //   const matchesSearch =
  //     product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
  //     product.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
  //     product.category?.toLowerCase().includes(searchQuery.toLowerCase());
  //   return matchesSearch;
  // });

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewContent();
      case 'products':
        return <ProductsManager compact={true} />;
      case 'movements':
        return renderMovementsContent();
      default:
        return renderOverviewContent();
    }
  };

  const renderMovementsContent = () => {
    return (
      <View style={styles.content}>
        <EnhancedMovementHistory
          showProductName={true}
          showFilters={true}
          headerComponent={<MovementSummary />}
        />
      </View>
    );
  };

  const renderOverviewContent = () => {
    return (
      <>
        <View style={styles.content}>
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

              <FlatList
                data={lowStockProducts}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={styles.alertItem}>
                    {item.imageUrl && (
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.alertProductImage}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.alertInfo}>
                      <Text style={styles.alertProductName}>{item.name}</Text>
                      <Text style={styles.alertProductDetails}>
                        {t('inventory.stock')}: {item.quantity} |{' '}
                        {t('inventory.min')}: {item.min_stock}
                      </Text>
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.adjustButton, styles.stockInButton]}
                        onPress={() =>
                          handleQuickStockMovement(item, 'stock_in')
                        }
                      >
                        <TrendingUp size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.adjustButton, styles.stockOutButton]}
                        onPress={() =>
                          handleQuickStockMovement(item, 'stock_out')
                        }
                      >
                        <TrendingDown size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.adjustButton}
                        onPress={() => handleStockAdjustment(item)}
                      >
                        <Text style={styles.adjustButtonText}>
                          {t('inventory.adjust')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                ListFooterComponent={() => (
                  <View style={{ height: 300 }}></View>
                )}
                // Performance optimizations
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={5}
                removeClippedSubviews={true}
                updateCellsBatchingPeriod={50}
                getItemLayout={(_, index) => ({
                  length: 80, // Approximate height of alert item
                  offset: 80 * index,
                  index,
                })}
              />
            </Card>
          )}

          {/* <Card>
            <View style={styles.searchHeader}>
              <Text style={styles.sectionTitle}>
                {t('inventory.allProducts')}
              </Text>
              <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                  <Search size={20} color="#6B7280" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search products, barcode, category..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#9CA3AF"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearchQuery('')}
                      style={styles.clearButton}
                    >
                      <Text style={styles.clearButtonText}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.scanButton}
                  onPress={() => setShowScanner(true)}
                >
                  <Scan size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
            {filteredProducts.length > 0 ? (
              
              <FlatList
                data={filteredProducts}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false} // Since inside ScrollView
                renderItem={({ item }) => {
                  const status = getStockStatus(item);
                  return (
                    <View style={styles.productItem}>
                      {item.imageUrl && (
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={styles.productImage}
                          resizeMode="cover"
                        />
                      )}
                      <View style={styles.productInfo}>
                        <Text style={styles.productName}>{item.name}</Text>
                        <Text style={styles.productCategory}>
                          {item.category}
                        </Text>
                        <Text style={styles.productPrice}>
                          {t('inventory.price')}: {formatMMK(item.price)}
                        </Text>
                      </View>

                      <View style={styles.productStock}>
                        <Text style={styles.stockQuantity}>
                          {item.quantity}
                        </Text>
                        <Text
                          style={[styles.stockStatus, { color: status.color }]}
                        >
                          {status.text}
                        </Text>
                        <TouchableOpacity
                          style={styles.adjustButton}
                          onPress={() => handleStockAdjustment(item)}
                        >
                          <Text style={styles.adjustButtonText}>
                            {t('inventory.adjust')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              />
            ) : (
              <View style={styles.emptyState}>
                <Package size={32} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>No products found</Text>
                <Text style={styles.emptyStateSubtext}>
                  {searchQuery
                    ? 'Try adjusting your search terms'
                    : 'No products available'}
                </Text>
              </View>
            )}
          </Card> */}
        </View>

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

        {showScanner && (
          <BarcodeScanner
            onBarcodeScanned={handleBarcodeScanned}
            onClose={() => setShowScanner(false)}
          />
        )}
      </>
    );
  };

  if (isLoading && !isRefreshing) {
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

        <TouchableOpacity
          style={[styles.tab, activeTab === 'movements' && styles.activeTab]}
          onPress={() => setActiveTab('movements')}
        >
          <RotateCcw
            size={20}
            color={activeTab === 'movements' ? '#059669' : '#6B7280'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'movements' && styles.activeTabText,
            ]}
          >
            {t('stockMovement.history')}
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={{
          display: activeTab == 'products' ? 'contents' : 'none',
        }}
      >
        <ProductsManager compact={true} />
      </View>
      <View
        style={[
          styles.tabContent,
          {
            display: activeTab == 'overview' ? 'contents' : 'none',
          },
        ]}
      >
        {renderOverviewContent()}
      </View>
      <View
        style={[
          styles.tabContent,
          {
            display: activeTab == 'movements' ? 'contents' : 'none',
          },
        ]}
      >
        {renderMovementsContent()}
      </View>

      <StockMovementForm
        visible={showStockMovementForm}
        onClose={() => {
          setShowStockMovementForm(false);
          setSelectedProductForMovement(null);
        }}
        product={selectedProductForMovement || undefined}
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
    marginBottom: 0,
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
  alertProductImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#F9FAFB',
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
  actionButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  adjustButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
  },
  stockInButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
  },
  stockOutButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
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
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#F9FAFB',
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
  searchHeader: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 20,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  scanButton: {
    backgroundColor: '#059669',
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
});
