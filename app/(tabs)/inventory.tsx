import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  TextInput,
  RefreshControl,
  Image,
  FlatList,
  Modal,
} from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  useProducts,
  useLowStockProducts,
  useProductMutations,
} from '@/hooks/useQueries';
import { Product, Supplier } from '@/services/database';
import {
  TriangleAlert as AlertTriangle,
  TrendingUp,
  TrendingDown,
  Package,
  RotateCcw,
  ChevronDown,
} from 'lucide-react-native';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/context/LocalizationContext';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';
import { useCurrencyFormatter } from '@/context/CurrencyContext';

// Import the ProductsManager component
import ProductsManager from '@/components/inventory/ProductsManager';
import { StockMovementForm } from '@/components/StockMovementForm';
import { EnhancedMovementHistory } from '@/components/inventory/EnhancedMovementHistory';
import { MovementSummary } from '@/components/MovementSummary';
import { QuickStockActions } from '@/components/QuickStockActions';
import { useDashboardAnalytics } from '@/hooks/useDashboard';

type InventoryTab = 'overview' | 'products' | 'movements';

interface TabOption {
  key: InventoryTab;
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
}

export default function Inventory() {
  const { showToast } = useToast();
  const { formatPrice } = useCurrencyFormatter();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<InventoryTab>('products');
  const [showTabPicker, setShowTabPicker] = useState(false);
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

  // Tab options configuration
  const tabOptions: TabOption[] = [
    {
      key: 'products',
      label: t('inventory.products'),
      icon: Package,
    },
    {
      key: 'movements',
      label: t('stockMovement.history'),
      icon: RotateCcw,
    },
    {
      key: 'overview',
      label: t('inventory.overview'),
      icon: TrendingUp,
    },
  ];

  // Get current tab info
  const currentTab = tabOptions.find((tab) => tab.key === activeTab);

  // Use React Query for optimized data fetching
  const {
    data: products = [],
    isLoading: productsLoading,
    isRefetching: productsRefetching,
    refetch: refetchProducts,
  } = useProducts();

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

  const isLoading = productsLoading || lowStockLoading;
  const isRefreshing = productsRefetching || lowStockRefetching;

  useEffect(() => {
    // console.log('Inventory loading states:', {
    //   productsLoading,
    //   lowStockLoading,
    //   productsRefetching,
    //   lowStockRefetching,
    //   isLoading,
    //   isRefreshing,
    // });
  }, [
    productsLoading,
    lowStockLoading,
    productsRefetching,
    lowStockRefetching,
  ]);

  const handleTabChange = (tabKey: InventoryTab) => {
    setActiveTab(tabKey);
    setShowTabPicker(false);
  };

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
                  <Text style={styles.summaryValue} weight="bold">
                    {products.length}
                  </Text>
                  <Text style={styles.summaryLabel} weight="medium">
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
                  <Text style={styles.summaryValue} weight="bold">
                    {lowStockProducts.length}
                  </Text>
                  <Text style={styles.summaryLabel} weight="medium">
                    {t('inventory.lowStock')}
                  </Text>
                </View>
              </View>
            </Card>
          </View>

          {lowStockProducts.length > 0 && (
            <Card>
              <Text style={styles.sectionTitle} weight="medium">
                {t('inventory.lowStockAlert')}
              </Text>

              <FlatList
                data={lowStockProducts}
                keyExtractor={(item) => item.id}
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
      {/* Dynamic Header with Tab Picker */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleSection}>
            <Text style={styles.title} weight="bold">
              {currentTab?.label || t('inventory.title')}
            </Text>
            {/* <Text style={styles.subtitle}>{t('inventory.subtitle')}</Text> */}
          </View>

          <TouchableOpacity
            style={styles.tabPickerButton}
            onPress={() => setShowTabPicker(true)}
          >
            {currentTab && <currentTab.icon size={20} color="#059669" />}
            <ChevronDown size={16} color="#6B7280" style={styles.chevronIcon} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Picker Modal */}
      <Modal
        visible={showTabPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTabPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTabPicker(false)}
        >
          <View style={styles.tabPickerModal}>
            <Text style={styles.tabPickerTitle} weight="medium">
              {t('inventory.selectView')}
            </Text>

            {tabOptions.map((tab) => {
              const IconComponent = tab.icon;
              const isSelected = activeTab === tab.key;

              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tabPickerOption,
                    isSelected && styles.tabPickerOptionSelected,
                  ]}
                  onPress={() => handleTabChange(tab.key)}
                >
                  <IconComponent
                    size={20}
                    color={isSelected ? '#059669' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.tabPickerOptionText,
                      isSelected && styles.tabPickerOptionTextSelected,
                    ]}
                  >
                    {tab.label}
                  </Text>
                  {isSelected && <View style={styles.selectedIndicator} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Content based on active tab */}
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
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 4,
  },
  tabPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginLeft: 16,
  },
  chevronIcon: {
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabPickerModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    margin: 32,
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  tabPickerTitle: {
    fontSize: 18,
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  tabPickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  tabPickerOptionSelected: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#059669',
  },
  tabPickerOptionText: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 12,
    flex: 1,
  },
  tabPickerOptionTextSelected: {
    color: '#059669',
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
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
    color: '#111827',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
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
    color: '#111827',
  },
  alertProductDetails: {
    fontSize: 14,
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
    color: '#111827',
  },
  productCategory: {
    fontSize: 14,
    color: '#6B7280',
  },
  productSupplier: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  productPrice: {
    fontSize: 12,
    color: '#10B981',
  },
  productStock: {
    alignItems: 'center',
  },
  stockQuantity: {
    fontSize: 20,
    color: '#111827',
  },
  stockStatus: {
    fontSize: 12,
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
    color: '#111827',
  },
  supplierContact: {
    fontSize: 14,
    color: '#6B7280',
  },
  supplierDetails: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  supplierAddress: {
    fontSize: 12,
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
    color: '#111827',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
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
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: 8,
  },
  scanButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginLeft: 12,
  },
});
