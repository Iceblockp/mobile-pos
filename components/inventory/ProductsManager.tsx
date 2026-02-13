import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import OptimizedImage from '../OptimizedImage';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { MyanmarTextInput as TextInput } from '../MyanmarTextInput';
import {
  useProductsInfinite,
  useCategoriesWithCounts,
} from '@/hooks/useQueries';
import { useDebounce } from '@/hooks/useDebounce';
import { Product } from '@/services/database';
import { MyanmarText as Text } from '../MyanmarText';

import {
  Plus,
  Search,
  Edit,
  Package,
  Scan,
  ArrowUpAZ,
  Calendar,
  ArrowDownAZ,
  MoreVertical,
  X,
  ChevronDown,
  Grid3X3,
  List,
  TrendingDown,
} from 'lucide-react-native';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/context/LocalizationContext';
import { useCurrencyFormatter } from '@/context/CurrencyContext';

import { StockMovementForm } from '@/components/StockMovementForm';
import { CompactInventoryValue } from '@/components/CompactInventoryValue';
import { InventoryDetailsModal } from '@/components/InventoryDetailsModal';

interface ProductsManagerProps {
  compact?: boolean;
  sortBy?: 'name' | 'updated_at' | 'none';
  sortOrder?: 'asc' | 'desc';
  viewMode?: 'card' | 'table';
}

export default function Products({
  sortBy: externalSortBy,
  sortOrder: externalSortOrder,
  viewMode: externalViewMode,
}: ProductsManagerProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { formatPrice } = useCurrencyFormatter();

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showSearchScanner, setShowSearchScanner] = useState(false);

  // Use external props if provided, otherwise use internal state
  const [internalSortBy, setInternalSortBy] = useState<
    'name' | 'updated_at' | 'none'
  >('none');
  const [internalSortOrder, setInternalSortOrder] = useState<'asc' | 'desc'>(
    'asc',
  );
  const [internalViewMode, setInternalViewMode] = useState<'card' | 'table'>(
    'card',
  );

  const sortBy = externalSortBy !== undefined ? externalSortBy : internalSortBy;
  const sortOrder =
    externalSortOrder !== undefined ? externalSortOrder : internalSortOrder;
  const viewMode =
    externalViewMode !== undefined ? externalViewMode : internalViewMode;

  const setSortBy = externalSortBy !== undefined ? () => {} : setInternalSortBy;
  const setSortOrder =
    externalSortOrder !== undefined ? () => {} : setInternalSortOrder;
  const setViewMode =
    externalViewMode !== undefined ? () => {} : setInternalViewMode;

  const [showSortOptions, setShowSortOptions] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Add state for stock movement form
  const [showStockMovementForm, setShowStockMovementForm] = useState(false);
  const [selectedProductForMovement, setSelectedProductForMovement] =
    useState<Product | null>(null);

  // Add state for inventory details modal
  const [showInventoryDetails, setShowInventoryDetails] = useState(false);

  // Use infinite scroll for products
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: productsLoading,
    refetch: refetchProducts,
    isRefetching: productsRefetching,
  } = useProductsInfinite(
    debouncedSearchQuery || undefined,
    selectedCategory !== 'All' ? selectedCategory : undefined,
    sortBy,
    sortOrder,
  );

  // Flatten all pages into a single array
  const products = useMemo(() => {
    return data?.pages.flatMap((page: any) => page.data) ?? [];
  }, [data]);

  const { data: categoriesWithCounts = [], refetch: refreshCategoryWithCount } =
    useCategoriesWithCounts();

  const isRefreshing = productsRefetching;

  const onRefresh = () => {
    refetchProducts();
    refreshCategoryWithCount();
  };

  // Close menus when tapping outside
  const handleOutsidePress = () => {
    if (showActionsMenu) setShowActionsMenu(false);
    if (showSortOptions) setShowSortOptions(false);
  };

  const handleSearchBarcodeScanned = async (barcode: string) => {
    setSearchQuery(barcode);
    setShowSearchScanner(false);

    // Find and highlight the product if it exists
    const foundProduct = products.find((p) => p.barcode === barcode);
    if (foundProduct) {
      showToast(t('messages.found', { name: foundProduct.name }), 'success');
    } else {
      showToast(t('messages.noProductWithBarcode'), 'error');
    }
  };

  // Simple key extractor for FlatList
  const keyExtractor = useCallback((item: Product) => item.id, []);

  // Get selected category name for display
  const getSelectedCategoryName = () => {
    if (selectedCategory === 'All') {
      const totalProducts = categoriesWithCounts.reduce(
        (sum: number, cat: any) => sum + (cat.product_count || 0),
        0,
      );
      return `${t('common.all')} (${products.length}/${totalProducts})`;
    }
    const category = categoriesWithCounts.find(
      (c: any) => c.id === selectedCategory,
    );
    if (category) {
      return `${category.name} (${products.length}/${
        category.product_count || 0
      })`;
    }
    return t('common.all');
  };

  const handleAddNew = () => {
    router.push('/(drawer)/product-form?mode=create' as any);
  };

  // Optimized Product Card with memoization
  const ProductCard = React.memo(
    ({ product }: { product: Product }) => {
      // Memoized calculations for better performance
      const profit = useMemo(
        () => product.price - product.cost,
        [product.price, product.cost],
      );
      const isLowStock = useMemo(
        () => product.quantity <= product.min_stock,
        [product.quantity, product.min_stock],
      );
      const hasBulkPricing = useMemo(
        () =>
          Boolean(product.has_bulk_pricing) ||
          (product.bulk_pricing && product.bulk_pricing.length > 0),
        [product.has_bulk_pricing, product.bulk_pricing],
      );

      // Stable callbacks
      const handlePress = useCallback(() => {
        router.push(`/(drawer)/product-detail?id=${product.id}` as any);
      }, [product.id]);

      const handleEditPress = useCallback(
        (e: any) => {
          e.stopPropagation();
          router.push(
            `/(drawer)/product-form?mode=edit&id=${product.id}` as any,
          );
        },
        [product.id],
      );

      return (
        <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
          <Card style={styles.productCard}>
            <View style={styles.productHeader}>
              {product.imageUrl ? (
                <Image
                  // <OptimizedImage
                  source={{ uri: product.imageUrl }}
                  style={styles.productImage}
                  resizeMode="cover"
                  // lazy={true}
                  // priority="normal"
                />
              ) : (
                <View style={styles.productImagePlaceholder}>
                  <Package size={24} color="#414449ff" />
                </View>
              )}

              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={styles.productCategory}>{product.category}</Text>
                {product.barcode && (
                  <Text style={styles.productBarcode} numberOfLines={1}>
                    {product.barcode}
                  </Text>
                )}
              </View>

              <View style={styles.productQuickActions}>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={handleEditPress}
                >
                  <Edit size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.productDetails}>
              <View style={styles.productDetailItem}>
                <Text style={styles.productDetailLabel}>
                  {t('products.price')}
                </Text>
                <Text style={styles.productDetailValue}>
                  {formatPrice(product.price)}
                </Text>
              </View>
              <View style={styles.productDetailItem}>
                <Text style={styles.productDetailLabel}>
                  {t('products.stock')}
                </Text>
                <Text
                  style={[
                    styles.productDetailValue,
                    isLowStock && styles.lowStockText,
                  ]}
                >
                  {product.quantity}
                </Text>
              </View>
              <View style={styles.productDetailItem}>
                <Text style={styles.productDetailLabel}>
                  {t('products.profit')}
                </Text>
                <Text style={[styles.productDetailValue, styles.profitText]}>
                  {formatPrice(profit)}
                </Text>
              </View>
            </View>

            {/* Simplified indicators for better performance */}
            <View style={styles.productIndicators}>
              {hasBulkPricing && (
                <View style={styles.indicator}>
                  <TrendingDown size={12} color="#059669" />
                  <Text style={styles.indicatorText}>Bulk</Text>
                </View>
              )}
              {isLowStock && (
                <View style={[styles.indicator, styles.lowStockIndicator]}>
                  <Text style={styles.lowStockIndicatorText}>Low Stock</Text>
                </View>
              )}
            </View>
          </Card>
        </TouchableOpacity>
      );
    },
    (prevProps, nextProps) => {
      // Enhanced comparison for better memoization
      const prev = prevProps.product;
      const next = nextProps.product;

      return (
        prev.id === next.id &&
        prev.name === next.name &&
        prev.price === next.price &&
        prev.cost === next.cost &&
        prev.quantity === next.quantity &&
        prev.min_stock === next.min_stock &&
        prev.category === next.category &&
        prev.barcode === next.barcode &&
        prev.imageUrl === next.imageUrl &&
        prev.has_bulk_pricing === next.has_bulk_pricing &&
        prev.updated_at === next.updated_at
      );
    },
  );

  // Simplified Table Header Component
  const TableHeader = () => {
    return (
      <View style={styles.tableHeader}>
        <View style={[styles.tableHeaderCell, { width: 80 }]}>
          <Text style={styles.tableHeaderText} weight="medium">
            {t('products.image')}
          </Text>
        </View>
        <View style={[styles.tableHeaderCell, { width: 150 }]}>
          <Text style={styles.tableHeaderText} weight="medium">
            {t('products.name')}
          </Text>
        </View>
        <View style={[styles.tableHeaderCell, { width: 100 }]}>
          <Text style={styles.tableHeaderText} weight="medium">
            {t('products.category')}
          </Text>
        </View>
        <View style={[styles.tableHeaderCell, { width: 100 }]}>
          <Text style={styles.tableHeaderText} weight="medium">
            {t('products.price')}
          </Text>
        </View>
        <View style={[styles.tableHeaderCell, { width: 80 }]}>
          <Text style={styles.tableHeaderText} weight="medium">
            {t('products.stock')}
          </Text>
        </View>
        <View style={[styles.tableHeaderCell, { width: 100 }]}>
          <Text style={styles.tableHeaderText} weight="medium">
            {t('products.profit')}
          </Text>
        </View>
        <View style={[styles.tableHeaderCell, { width: 100 }]}>
          <Text style={styles.tableHeaderText} weight="medium">
            {t('products.status')}
          </Text>
        </View>
        <View style={[styles.tableHeaderCell, { width: 80 }]}>
          <Text style={styles.tableHeaderText} weight="medium">
            {t('products.actions')}
          </Text>
        </View>
      </View>
    );
  };

  // Simplified Table Row Component - only basic info
  const ProductTableRow = React.memo(({ product }: { product: Product }) => {
    return (
      <TouchableOpacity
        onPress={() => {
          router.push(`/(drawer)/product-detail?id=${product.id}` as any);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.tableRow}>
          {/* Image */}
          <View style={[styles.tableCell, { width: 80 }]}>
            {product.imageUrl ? (
              <OptimizedImage
                source={{ uri: product.imageUrl }}
                style={styles.tableProductImage}
                resizeMode="cover"
                lazy={true}
                priority="low"
              />
            ) : (
              <View style={styles.tableProductImagePlaceholder}>
                <Package size={16} color="#9CA3AF" />
              </View>
            )}
          </View>

          {/* Name */}
          <View style={[styles.tableCell, { width: 150 }]}>
            <Text style={styles.tableCellText} numberOfLines={2}>
              {product.name}
            </Text>
          </View>

          {/* Category */}
          <View style={[styles.tableCell, { width: 100 }]}>
            <Text style={styles.tableCellText} numberOfLines={1}>
              {product.category || '-'}
            </Text>
          </View>

          {/* Price */}
          <View style={[styles.tableCell, { width: 100 }]}>
            <Text style={styles.tableCellText}>
              {formatPrice(product.price)}
            </Text>
          </View>

          {/* Stock */}
          <View style={[styles.tableCell, { width: 80 }]}>
            <Text
              style={[
                styles.tableCellText,
                product.quantity <= product.min_stock && styles.lowStockText,
              ]}
            >
              {product.quantity}
            </Text>
          </View>

          {/* Profit */}
          <View style={[styles.tableCell, { width: 100 }]}>
            <Text style={[styles.tableCellText, styles.profitText]}>
              {formatPrice(product.price - product.cost)}
            </Text>
          </View>

          {/* Indicators */}
          <View style={[styles.tableCell, { width: 100 }]}>
            <View style={styles.tableIndicators}>
              {product.bulk_pricing && product.bulk_pricing.length > 0 && (
                <View style={styles.tableIndicator}>
                  <TrendingDown size={10} color="#059669" />
                  <Text style={styles.tableIndicatorText}>Bulk</Text>
                </View>
              )}
              {product.quantity <= product.min_stock && (
                <View
                  style={[styles.tableIndicator, styles.tableLowStockIndicator]}
                >
                  <Text style={styles.tableLowStockIndicatorText}>Low</Text>
                </View>
              )}
            </View>
          </View>

          {/* Quick Actions */}
          <View style={[styles.tableCell, { width: 80 }]}>
            <TouchableOpacity
              style={styles.tableQuickAction}
              onPress={(e) => {
                e.stopPropagation();
                router.push(
                  `/(drawer)/product-form?mode=edit&id=${product.id}` as any,
                );
              }}
            >
              <Edit size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  });

  // Render table view using FlatList with horizontal scrolling
  const renderTableView = () => {
    return (
      <View style={styles.tableContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View style={styles.tableContent}>
            <TableHeader />
            <FlatList
              data={products}
              renderItem={({ item }) => <ProductTableRow product={item} />}
              keyExtractor={keyExtractor}
              onEndReached={() => {
                if (hasNextPage && !isFetchingNextPage) {
                  fetchNextPage();
                }
              }}
              onEndReachedThreshold={0.5}
              ListFooterComponent={() => {
                if (!isFetchingNextPage) return null;
                return (
                  <View style={styles.loadingFooter}>
                    <LoadingSpinner />
                    <Text style={styles.loadingText}>
                      Loading more products...
                    </Text>
                  </View>
                );
              }}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={onRefresh}
                />
              }
              showsVerticalScrollIndicator={true}
              removeClippedSubviews={true}
              maxToRenderPerBatch={25}
              windowSize={15}
              initialNumToRender={25}
            />
          </View>
        </ScrollView>
      </View>
    );
  };

  const categoryModal = () => {
    return null; // Removed - no longer needed
  };

  const supplierModal = () => {
    return null; // Removed - no longer needed
  };

  return (
    <View style={styles.compactContainer}>
      <>
        <View style={styles.compactSearchContainer}>
          <View style={styles.compactSearchBox}>
            <Search size={16} color="#6B7280" />
            <TextInput
              style={styles.compactSearchInput}
              placeholder={t('products.searchProducts')}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSearchQuery('')}
              >
                <X size={16} color="#6B7280" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.compactScanButton}
              onPress={() => setShowSearchScanner(true)}
            >
              <Scan size={16} color="#3B82F6" />
            </TouchableOpacity>
          </View>

          {/* Only show menu button if not controlled externally */}
          {externalSortBy === undefined && externalViewMode === undefined && (
            <TouchableOpacity
              style={styles.compactMenuButton}
              onPress={() => setShowActionsMenu(!showActionsMenu)}
            >
              <MoreVertical size={16} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>

        {/* Overlay for closing menus - only if not controlled externally */}
        {externalSortBy === undefined &&
          externalViewMode === undefined &&
          (showActionsMenu || showSortOptions) && (
            <TouchableOpacity
              style={styles.menuOverlay}
              activeOpacity={1}
              onPress={handleOutsidePress}
            />
          )}

        {/* Actions Menu Dropdown - only if not controlled externally */}
        {externalSortBy === undefined &&
          externalViewMode === undefined &&
          showActionsMenu && (
            <View style={styles.actionsMenuContainer}>
              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={() => {
                  setShowSortOptions(!showSortOptions);
                  setShowActionsMenu(false);
                }}
              >
                <View style={styles.actionMenuItemContent}>
                  {sortBy === 'name' ? (
                    sortOrder === 'asc' ? (
                      <ArrowUpAZ size={16} color="#6B7280" />
                    ) : (
                      <ArrowDownAZ size={16} color="#6B7280" />
                    )
                  ) : (
                    <Calendar size={16} color="#6B7280" />
                  )}
                  <Text style={styles.actionMenuItemText}>
                    {t('products.sort')} {sortOrder === 'asc' ? '↑' : '↓'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={() => {
                  setViewMode(viewMode === 'card' ? 'table' : 'card');
                  setShowActionsMenu(false);
                }}
              >
                <View style={styles.actionMenuItemContent}>
                  {viewMode === 'card' ? (
                    <List size={16} color="#6B7280" />
                  ) : (
                    <Grid3X3 size={16} color="#6B7280" />
                  )}
                  <Text style={styles.actionMenuItemText}>
                    {viewMode === 'card'
                      ? t('products.tableView')
                      : t('products.cardView')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

        {/* Sort Options - appears when sort is selected - only if not controlled externally */}
        {externalSortBy === undefined &&
          externalViewMode === undefined &&
          showSortOptions && (
            <View style={styles.sortOptionsContainer}>
              <TouchableOpacity
                style={[
                  styles.sortOption,
                  sortBy === 'updated_at' &&
                    sortOrder === 'desc' &&
                    styles.sortOptionActive,
                ]}
                onPress={() => {
                  setSortBy('updated_at');
                  setSortOrder('desc');
                  setShowSortOptions(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortBy === 'updated_at' &&
                      sortOrder === 'desc' &&
                      styles.sortOptionTextActive,
                  ]}
                >
                  Newest First
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sortOption,
                  sortBy === 'updated_at' &&
                    sortOrder === 'asc' &&
                    styles.sortOptionActive,
                ]}
                onPress={() => {
                  setSortBy('updated_at');
                  setSortOrder('asc');
                  setShowSortOptions(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortBy === 'updated_at' &&
                      sortOrder === 'asc' &&
                      styles.sortOptionTextActive,
                  ]}
                >
                  Oldest First
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sortOption,
                  sortBy === 'name' &&
                    sortOrder === 'asc' &&
                    styles.sortOptionActive,
                ]}
                onPress={() => {
                  setSortBy('name');
                  setSortOrder('asc');
                  setShowSortOptions(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortBy === 'name' &&
                      sortOrder === 'asc' &&
                      styles.sortOptionTextActive,
                  ]}
                >
                  Name A-Z
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sortOption,
                  sortBy === 'name' &&
                    sortOrder === 'desc' &&
                    styles.sortOptionActive,
                ]}
                onPress={() => {
                  setSortBy('name');
                  setSortOrder('desc');
                  setShowSortOptions(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortBy === 'name' &&
                      sortOrder === 'desc' &&
                      styles.sortOptionTextActive,
                  ]}
                >
                  Name Z-A
                </Text>
              </TouchableOpacity>
            </View>
          )}
      </>

      <View>
        <View style={{ paddingLeft: 8, paddingRight: 8 }}>
          {/* Compact Inventory Value Display */}
          <CompactInventoryValue
            categoryFilter={selectedCategory}
            onShowDetails={() => setShowInventoryDetails(true)}
          />
        </View>

        {/* Products Count Display */}
        {/* <View style={styles.productsCountContainer}>
          <Text style={styles.productsCountText}>
            {productsLoading
              ? 'Loading products...'
              : selectedCategory === 'All'
              ? `Showing ${products.length} of ${categoriesWithCounts.reduce(
                  (sum: number, cat: any) => sum + (cat.product_count || 0),
                  0
                )} products`
              : (() => {
                  const category = categoriesWithCounts.find(
                    (c: any) => c.id === selectedCategory
                  );
                  return `Showing ${products.length} of ${
                    category?.product_count || 0
                  } products in ${category?.name || 'category'}`;
                })()}
          </Text>
          {!productsLoading && hasNextPage && (
            <Text style={styles.loadMoreHint}>Scroll down to load more</Text>
          )}
        </View> */}

        <View style={styles.compactCategoryContainer}>
          <TouchableOpacity
            style={styles.compactCategoryDropdown}
            onPress={() => setShowCategoryPicker(true)}
          >
            <Text style={styles.compactCategoryDropdownText}>
              {getSelectedCategoryName()}
            </Text>
            <ChevronDown size={18} color="#6B7280" />
          </TouchableOpacity>

          <Modal
            visible={showCategoryPicker}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowCategoryPicker(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowCategoryPicker(false)}
            >
              <View style={styles.categoryPickerContainer}>
                <View style={styles.categoryPickerHeader}>
                  <Text style={styles.categoryPickerTitle}>
                    {t('products.selectCategory')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowCategoryPicker(false)}
                    style={styles.closeButton}
                  >
                    <X size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.categoryPickerList}>
                  {/* All Categories Option */}
                  <TouchableOpacity
                    style={[
                      styles.categoryFilterPickerItem,
                      selectedCategory === 'All' &&
                        styles.categoryFilterPickerItemActive,
                    ]}
                    onPress={() => {
                      setSelectedCategory('All');
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryPickerItemText,
                        selectedCategory === 'All' &&
                          styles.categoryPickerItemTextActive,
                      ]}
                    >
                      {t('common.all')} (
                      {categoriesWithCounts.reduce(
                        (sum: number, cat: any) =>
                          sum + (cat.product_count || 0),
                        0,
                      )}
                      )
                    </Text>
                    {selectedCategory === 'All' && (
                      <View style={styles.selectedIndicator} />
                    )}
                  </TouchableOpacity>

                  {/* Individual Categories */}
                  {categoriesWithCounts.map((category: any) => {
                    const isSelected = selectedCategory === category.id;

                    return (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.categoryFilterPickerItem,
                          isSelected && styles.categoryFilterPickerItemActive,
                        ]}
                        onPress={() => {
                          setSelectedCategory(category.id);
                          setShowCategoryPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.categoryPickerItemText,
                            isSelected && styles.categoryPickerItemTextActive,
                          ]}
                        >
                          {category.name} ({category.product_count || 0})
                        </Text>
                        {isSelected && (
                          <View style={styles.selectedIndicator} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>
        </View>
      </View>

      {viewMode === 'card' ? (
        <FlatList
          data={products}
          keyExtractor={keyExtractor}
          renderItem={({ item }) => <ProductCard product={item} />}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            productsRefetching && products.length > 0 ? (
              <View style={styles.refetchingIndicator}>
                <LoadingSpinner />
                <Text style={styles.refetchingText}>Updating products...</Text>
              </View>
            ) : null
          }
          ListFooterComponent={() => {
            if (!isFetchingNextPage) return null;
            return (
              <View style={styles.loadingFooter}>
                <LoadingSpinner />
                <Text style={styles.loadingText}>Loading more products...</Text>
              </View>
            );
          }}
          ListEmptyComponent={() =>
            productsLoading ? (
              <View style={styles.loadingProductsState}>
                <LoadingSpinner />
                <Text style={styles.loadingProductsText}>
                  Loading products...
                </Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Package size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>
                  {t('products.noProductsFound')}
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  {searchQuery
                    ? t('products.tryAdjustingSearch')
                    : t('products.addFirstProductToStart')}
                </Text>
              </View>
            )
          }
          contentContainerStyle={
            products.length === 0
              ? styles.productsListEmptyContent
              : styles.productsListContent
          }
          refreshControl={
            <RefreshControl
              refreshing={productsRefetching}
              onRefresh={onRefresh}
            />
          }
          // Performance optimizations for large lists
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={15}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={50}
          disableVirtualization={false}
          showsVerticalScrollIndicator={true}
          style={styles.productsList}
        />
      ) : (
        renderTableView()
      )}

      {showSearchScanner && (
        <BarcodeScanner
          onBarcodeScanned={handleSearchBarcodeScanned}
          onClose={() => setShowSearchScanner(false)}
        />
      )}

      {/* Stock Movement Form Modal */}
      <StockMovementForm
        visible={showStockMovementForm}
        onClose={() => {
          setShowStockMovementForm(false);
          setSelectedProductForMovement(null);
        }}
        product={selectedProductForMovement || undefined}
        initialType="stock_in"
      />

      {/* Inventory Details Modal */}
      <InventoryDetailsModal
        visible={showInventoryDetails}
        onClose={() => setShowInventoryDetails(false)}
        categoryFilter={selectedCategory}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddNew}
        activeOpacity={0.8}
      >
        <Plus size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  tableBulkPricingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  tableBulkPricingText: {
    fontSize: 9,
    color: '#059669',
    marginLeft: 2,
    fontWeight: '500',
  },
  tableBulkPricingContainer: {
    alignItems: 'center',
  },
  tableBulkPricingTier: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
    alignItems: 'center',
    minWidth: 80,
  },
  tableBulkPricingQuantity: {
    fontSize: 9,
    color: '#059669',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tableBulkPricingPrice: {
    fontSize: 8,
    fontWeight: '500',
    color: '#111827',
  },
  tableBulkPricingDiscount: {
    fontSize: 7,
    color: '#DC2626',
  },
  tableBulkPricingMore: {
    fontSize: 8,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },

  imagePickerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },

  productFormImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
    marginBottom: 10,
  },

  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  imagePlaceholderText: {
    color: '#9CA3AF',
    marginTop: 8,
    fontSize: 14,
  },

  imagePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },

  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },

  imagePickerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  compactContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  compactHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  compactAddButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  compactMenuButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  actionsMenuContainer: {
    position: 'absolute',
    top: 50, // Position below the search container
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 2,
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    // zIndex: 1000,
  },
  actionMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  actionMenuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionMenuItemText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginLeft: 12,
  },
  actionMenuItemLast: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  compactSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  compactSearchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  compactSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    marginLeft: 8,
  },
  compactScanButton: {
    padding: 4,
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: -4,
    marginRight: 4,
  },
  compactCategoryContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  compactCategoryDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  compactCategoryDropdownText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    color: '#111827',
  },
  dataHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  sortDropdown: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  sortDropdownText: {
    fontSize: 14,
    alignItems: 'center',
    color: '#fff',
  },
  sortOptionsContainer: {
    position: 'absolute',
    top: 80,
    right: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: 180,
  },
  sortOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  sortOptionActive: {
    backgroundColor: '#F3F4F6',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  sortOptionTextActive: {
    color: '#059669',
  },
  categoryButton: {
    backgroundColor: '#6B7280',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#10B981',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  searchInput: {
    flex: 1,
    marginLeft: 16,
    fontSize: 15,
    color: '#111827',
  },
  searchScanButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  categoryChip: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#6B7280',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  productsList: {
    flex: 1,
    paddingHorizontal: 10,
  },
  productsListContent: {
    paddingBottom: 10,
  },
  productCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    color: '#111827',
  },
  productCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  productSupplier: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  productActions: {
    flexDirection: 'row',
  },
  // actionButton: {
  //   padding: 8,
  //   marginLeft: 4,
  // },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  productDetailItem: {
    alignItems: 'center',
  },
  productDetailLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  productDetailValue: {
    fontSize: 14,
    color: '#111827',
    marginTop: 2,
  },
  lowStockText: {
    color: '#EF4444',
  },
  profitText: {
    color: '#10B981',
  },
  barcodeDisplay: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  barcodeLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  bulkPricingDisplay: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  stockMovementSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 20,
    color: '#6B7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  productsListEmptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 20,
    color: '#111827',
  },
  modalClose: {
    fontSize: 16,
    color: '#10B981',
  },
  stickyFormContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 12,
  },
  categoriesListContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  categoriesScrollView: {
    flex: 1,
  },
  categoriesContent: {
    padding: 12,
    paddingBottom: 80, // Extra padding for safe scrolling
  },
  formScrollView: {
    flex: 1,
  },
  formContent: {
    padding: 16,
    paddingBottom: 100, // Extra padding for safe scrolling
  },
  formTitle: {
    fontSize: 18,
    color: '#111827',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    marginBottom: 8,
  },
  barcodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  barcodeInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 12,
  },
  scanBarcodeButton: {
    backgroundColor: '#3B82F6',
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanTextButton: {
    backgroundColor: '#10B981',
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
  },
  pickerLabel: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
  },
  categoryPicker: {
    flexDirection: 'row',
  },
  categoryPickerItem: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  categoryPickerItemActive: {
    backgroundColor: '#10B981',
  },
  categoryPickerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  categoryPickerTextActive: {
    color: '#FFFFFF',
  },
  profitPreview: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  profitLabel: {
    fontSize: 14,
    color: '#166534',
  },
  profitValue: {
    fontSize: 16,
    color: '#15803D',
    marginTop: 2,
  },
  marginValue: {
    fontSize: 12,
    color: '#16A34A',
    marginTop: 2,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  formButton: {
    flex: 0.48,
  },
  categoryFormCard: {
    marginBottom: 0,
  },
  sectionTitleContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  sectionTitle: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 0,
  },
  categoryCard: {
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    color: '#111827',
  },
  categoryDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  categoryActions: {
    flexDirection: 'row',
  },
  categoryDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryDropdownText: {
    fontSize: 15,
    color: '#111827',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  categoryPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  categoryPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryPickerTitle: {
    fontSize: 18,
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  categoryPickerList: {
    maxHeight: 400,
  },
  categoryFilterPickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  categoryFilterPickerItemActive: {
    backgroundColor: '#F0FDF4',
  },
  categoryPickerItemText: {
    fontSize: 16,
    color: '#374151',
  },
  categoryPickerItemTextActive: {
    color: '#059669',
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  // Table styles
  tableContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  tableContent: {
    minWidth: 710, // Reduced width for simplified table
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
  },
  tableHeaderCell: {
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  tableHeaderText: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 8,
    minHeight: 60,
  },
  tableCell: {
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableCellText: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
  },
  tableProductImage: {
    width: 32,
    height: 32,
    borderRadius: 4,
  },
  tableProductImagePlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Add new styles for stock action buttons
  stockActionButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  stockActionButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockInButton: {
    backgroundColor: '#10B981',
  },
  stockOutButton: {
    backgroundColor: '#EF4444',
  },
  tableActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tableActionButton: {
    padding: 4,
  },
  // New styles for simplified components
  productImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productBarcode: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  productQuickActions: {
    alignItems: 'center',
  },
  quickActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productIndicators: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  indicatorText: {
    fontSize: 10,
    color: '#059669',
  },
  lowStockIndicator: {
    backgroundColor: '#FEF2F2',
  },
  lowStockIndicatorText: {
    fontSize: 10,
    color: '#DC2626',
  },
  // Table indicator styles
  tableIndicators: {
    alignItems: 'center',
    gap: 2,
  },
  tableIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    gap: 1,
  },
  tableIndicatorText: {
    fontSize: 8,
    color: '#059669',
  },
  tableLowStockIndicator: {
    backgroundColor: '#FEF2F2',
  },
  tableLowStockIndicatorText: {
    fontSize: 8,
    color: '#DC2626',
  },
  tableQuickAction: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingFooter: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  productsCountContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  productsCountText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
  loadMoreHint: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  loadingProductsState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingProductsText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  refetchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#F0F9FF',
    marginBottom: 8,
    borderRadius: 8,
  },
  refetchingText: {
    fontSize: 12,
    color: '#2196F3',
    marginLeft: 8,
  },
});
