import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PriceInput } from '@/components/PriceInput';
import {
  useProducts,
  useCategories,
  useBasicSuppliers,
  useProductMutations,
  useCategoryMutations,
  useBulkPricing,
} from '@/hooks/useQueries';
import { Product, Category, Supplier } from '@/services/database';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  FolderPlus,
  Settings,
  Scan,
  Camera,
  Image as ImageIcon,
  ArrowUpAZ,
  Calendar,
  ArrowDownAZ,
  MoreVertical,
  X,
  ChevronDown,
  Grid3X3,
  List,
  TrendingUp,
  TrendingDown,
} from 'lucide-react-native';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import TextScanner from '@/components/TextScanner';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/context/LocalizationContext';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

import { useOptimizedList } from '@/hooks/useOptimizedList';
import { BulkPricingTiers } from '@/components/BulkPricingTiers';
import { ProductMovementHistory } from '@/components/ProductMovementHistory';
import { QuickStockActions } from '@/components/QuickStockActions';
import { StockMovementForm } from '@/components/StockMovementForm';
import { ProductDetailModal } from '@/components/ProductDetailModal';

interface ProductsManagerProps {
  compact?: boolean;
}

export default function Products({}: ProductsManagerProps) {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { formatPrice } = useCurrencyFormatter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | number>(
    'All'
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showSearchScanner, setShowSearchScanner] = useState(false);
  const [showTextScanner, setShowTextScanner] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'updated_at' | 'none'>('none');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  // Add state for remembering last selected category and supplier
  const [lastSelectedCategoryId, setLastSelectedCategoryId] = useState<
    string | null
  >(null);
  const [showSupplierPicker, setShowSupplierPicker] = useState(false);
  const [showCategoryFormPicker, setShowCategoryFormPicker] = useState(false);

  // Add state for stock movement form
  const [showStockMovementForm, setShowStockMovementForm] = useState(false);
  const [selectedProductForMovement, setSelectedProductForMovement] =
    useState<Product | null>(null);
  const [movementType, setMovementType] = useState<'stock_in' | 'stock_out'>(
    'stock_in'
  );

  // Add state for product detail modal
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Use React Query for optimized data fetching
  const {
    data: products = [],
    isLoading: productsLoading,
    isRefetching: productsRefetching,
    refetch: refetchProducts,
  } = useProducts(true); // Include bulk pricing data

  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories();

  const { data: suppliers = [], isLoading: suppliersLoading } =
    useBasicSuppliers();

  const {
    addProduct,
    updateProduct,
    deleteProduct,
    updateProductWithBulkPricing,
  } = useProductMutations();
  const { addCategory, updateCategory, deleteCategory } =
    useCategoryMutations();

  const isLoading = productsLoading || categoriesLoading || suppliersLoading;
  const isRefreshing = productsRefetching;

  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    category_id: '',
    price: '',
    cost: '',
    quantity: '0', // Default to 0
    min_stock: '10', // Default to 10
    supplier_id: '',
    imageUrl: '',
  });

  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
  });

  const [bulkPricingTiers, setBulkPricingTiers] = useState<
    Array<{ min_quantity: number; bulk_price: number }>
  >([]);

  const onRefresh = () => {
    refetchProducts();
  };

  // Close menus when tapping outside
  const handleOutsidePress = () => {
    if (showActionsMenu) setShowActionsMenu(false);
    if (showSortOptions) setShowSortOptions(false);
  };

  // Removed formatMMK function - now using standardized currency formatting

  // Use optimized list hook for better performance with large datasets
  const {
    filteredData: filteredProducts,
    keyExtractor,
    getItemLayout,
  } = useOptimizedList({
    data: products,
    searchQuery,
    selectedCategory,
    sortBy,
    sortOrder,
  });

  // Function to toggle sort order or change sort field
  const handleSort = (field: 'name' | 'updated_at') => {
    // TEMPORARILY DISABLE NAME SORTING - too slow for large datasets
    if (field === 'name') {
      // Show toast or do nothing for name sorting
      showToast('Name sorting temporarily disabled for performance', 'info');
      return;
    }

    if (sortBy === field) {
      // Toggle sort order if clicking the same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Change sort field and reset to ascending order
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Get selected category name for display
  const getSelectedCategoryName = () => {
    if (selectedCategory === 'All') {
      return `${t('common.all')} (${products.length})`;
    }
    const category = categories.find((c) => c.id === selectedCategory);
    if (category) {
      const categoryCount = products.filter(
        (p) => p.category_id === category.id
      ).length;
      return `${category.name} (${categoryCount})`;
    }
    return t('common.all');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      barcode: '',
      category_id: lastSelectedCategoryId || '', // Use remembered category
      price: '',
      cost: '',
      quantity: '0', // Default to 0
      min_stock: '10', // Default to 10
      supplier_id: '',
      imageUrl: '',
    });
    setBulkPricingTiers([]);
    setEditingProduct(null);
    setShowAddForm(false);
  };

  const resetCategoryForm = () => {
    setCategoryFormData({
      name: '',
      description: '',
    });
    setEditingCategory(null);
    setShowCategoryModal(false);
  };

  const handleBarcodeScanned = (barcode: string) => {
    setFormData({ ...formData, barcode });
    setShowBarcodeScanner(false);
    showToast(t('messages.barcodeAdded', { barcode }), 'success');
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

  const handleTextScanned = (text: string) => {
    // Clean up the scanned text - remove extra whitespace, newlines, and special characters
    let cleanedText = text
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[^\w\s\-\.]/g, '') // Keep only letters, numbers, spaces, hyphens, and dots
      .substring(0, 100); // Limit length to 100 characters

    // Capitalize first letter of each word for better presentation
    cleanedText = cleanedText.replace(/\b\w/g, (l) => l.toUpperCase());

    setFormData({ ...formData, name: cleanedText });
    setShowTextScanner(false);
    showToast(`Product name scanned: ${cleanedText}`, 'success');
  };

  // Add image picker functions
  const pickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        t('products.permissionRequired'),
        t('products.galleryPermissionNeeded')
      );
      return;
    }

    // Launch image picker
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedAsset = result.assets[0];
      const fileName = selectedAsset.uri.split('/').pop();
      //@ts-ignore
      const newPath = FileSystem.documentDirectory + fileName;

      try {
        // Copy the image to app's document directory for persistence
        //@ts-ignore
        await FileSystem.copyAsync({
          from: selectedAsset.uri,
          to: newPath,
        });

        setFormData({ ...formData, imageUrl: newPath });
        showToast(t('products.imageSelected'), 'success');
      } catch (error) {
        console.error('Error saving image:', error);
        Alert.alert(t('common.error'), t('products.failedToSaveImage'));
      }
    }
  };

  const takePhoto = async () => {
    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        t('products.permissionRequired'),
        t('products.cameraPermissionNeeded')
      );
      return;
    }

    // Launch camera
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedAsset = result.assets[0];
      const fileName = selectedAsset.uri.split('/').pop();
      //@ts-ignore
      const newPath = FileSystem.documentDirectory + fileName;

      try {
        // Copy the image to app's document directory for persistence
        //@ts-ignore
        await FileSystem.copyAsync({
          from: selectedAsset.uri,
          to: newPath,
        });

        setFormData({ ...formData, imageUrl: newPath });
        showToast(t('products.photoTaken'), 'success');
      } catch (error) {
        console.error('Error saving image:', error);
        Alert.alert(t('common.error'), t('products.failedToSaveImage'));
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert(t('common.error'), t('products.nameRequired'));
      return;
    }

    if (!formData.category_id) {
      Alert.alert(t('common.error'), t('products.categoryRequired'));
      return;
    }

    if (!formData.price || parseInt(formData.price) <= 0) {
      Alert.alert(t('common.error'), t('products.priceRequired'));
      return;
    }

    if (!formData.cost || parseInt(formData.cost) <= 0) {
      Alert.alert(t('common.error'), t('products.costRequired'));
      return;
    }

    try {
      const price = parseInt(formData.price);
      const cost = parseInt(formData.cost);

      const productData = {
        name: formData.name,
        barcode: formData.barcode ? formData.barcode : undefined,
        category_id: formData.category_id,
        price: price,
        cost: cost,
        quantity: parseInt(formData.quantity) || 0,
        min_stock: parseInt(formData.min_stock) || 10,
        supplier_id: formData.supplier_id || undefined, // Optional supplier
        imageUrl: formData.imageUrl || undefined,
      };

      // Remember the selected category for next time
      setLastSelectedCategoryId(formData.category_id);

      if (editingProduct) {
        // Use bulk pricing mutation if there are tiers, otherwise use regular update
        if (bulkPricingTiers.length > 0) {
          await updateProductWithBulkPricing.mutateAsync({
            id: editingProduct.id,
            productData: productData,
            bulkPricingTiers: bulkPricingTiers,
          });
        } else {
          await updateProduct.mutateAsync({
            id: editingProduct.id,
            data: productData,
          });
        }
      } else {
        // For new products, create the product first, then add bulk pricing if needed
        const newProductId = await addProduct.mutateAsync(productData);

        if (bulkPricingTiers.length > 0 && newProductId) {
          await updateProductWithBulkPricing.mutateAsync({
            id: newProductId,
            productData: {},
            bulkPricingTiers: bulkPricingTiers,
          });
        }
      }

      resetForm();
      showToast(
        editingProduct
          ? t('products.productUpdated')
          : t('products.productAdded'),
        'success'
      );
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert(t('common.error'), t('products.failedToSave'));
    }
  };

  const handleCategorySubmit = async () => {
    if (!categoryFormData.name) {
      Alert.alert(t('common.error'), t('products.enterCategoryName'));
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({
          id: editingCategory.id,
          data: {
            name: categoryFormData.name,
            description: categoryFormData.description,
          },
        });
      } else {
        await addCategory.mutateAsync({
          ...categoryFormData,
          created_at: new Date().toISOString(),
        });
      }

      // Reset form but keep modal open
      setCategoryFormData({
        name: '',
        description: '',
      });
      setEditingCategory(null);

      showToast(
        editingCategory
          ? t('products.categoryUpdated')
          : t('products.categoryAdded'),
        'success'
      );
    } catch (error) {
      Alert.alert(t('common.error'), t('products.failedToSaveCategory'));
      console.error('Error saving category:', error);
    }
  };

  const handleEdit = (product: Product) => {
    setFormData({
      name: product.name,
      barcode: product.barcode || '',
      category_id: product.category_id,
      price: product.price.toString(),
      cost: product.cost.toString(),
      quantity: product.quantity.toString(),
      min_stock: product.min_stock?.toString() || '10',
      supplier_id: product.supplier_id || '', // Handle optional supplier
      imageUrl: product.imageUrl || '',
    });

    // Load existing bulk pricing if available
    if (product.bulk_pricing) {
      setBulkPricingTiers(
        product.bulk_pricing.map((bp) => ({
          min_quantity: bp.min_quantity,
          bulk_price: bp.bulk_price,
        }))
      );
    } else {
      setBulkPricingTiers([]);
    }

    setEditingProduct(product);
    setShowAddForm(true);
  };

  const handleEditCategory = (category: Category) => {
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
    });
    setEditingCategory(category);
    setShowCategoryModal(true);
  };

  const handleDelete = async (product: Product) => {
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
              await deleteProduct.mutateAsync(product.id);
              showToast(t('products.productDeleted'), 'success');
            } catch (error) {
              showToast(t('products.failedToSave'), 'error');
              console.error('Error deleting product:', error);
            }
          },
        },
      ]
    );
  };

  const handleDeleteCategory = async (category: Category) => {
    // First check if there are products using this category
    const productsInCategory = products.filter(
      (p) => p.category_id === category.id
    );

    if (productsInCategory.length > 0) {
      // Show alert for error - it will appear on top of modal and be clearly visible
      Alert.alert(
        t('categories.cannotDelete'),
        `${t('categories.cannotDelete')} "${category.name}" - ${
          productsInCategory.length
        } ${
          productsInCategory.length > 1
            ? t('categories.productsStillUse')
            : t('categories.productStillUses')
        }`,
        [{ text: t('common.close'), style: 'default' }]
      );
      return;
    }

    Alert.alert(
      t('categories.deleteCategory'),
      `${t('categories.areYouSure')} "${category.name}"?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory.mutateAsync(category.id);
              // Keep modal open after deletion
              showToast(t('categories.categoryDeleted'), 'success');
            } catch (error: any) {
              console.error('Error deleting category:', error);
              // Check if it's a foreign key constraint error
              if (
                error.message &&
                (error.message.includes('FOREIGN KEY constraint') ||
                  error.message.includes('foreign key constraint') ||
                  error.message.includes('constraint failed'))
              ) {
                Alert.alert(
                  t('categories.cannotDelete'),
                  `${t('categories.cannotDelete')} "${category.name}" - ${t(
                    'categories.productsStillUse'
                  )}`,
                  [{ text: t('common.close'), style: 'default' }]
                );
              } else {
                Alert.alert(
                  t('common.error'),
                  `${t('categories.failedToSave')} "${category.name}". ${t(
                    'common.error'
                  )}.`,
                  [{ text: t('common.close'), style: 'default' }]
                );
              }
            }
          },
        },
      ]
    );
  };

  // Add handler for quick stock movement
  // const handleQuickStockMovement = (
  //   product: Product,
  //   type: 'stock_in' | 'stock_out'
  // ) => {
  //   setSelectedProductForMovement(product);
  //   setMovementType(type);
  //   setShowStockMovementForm(true);
  // };

  const getSupplierName = (supplierId: string | undefined) => {
    if (!supplierId) return t('products.noSupplier');
    const supplier = suppliers.find((s) => s.id === supplierId);
    return supplier ? supplier.name : t('products.unknown');
  };

  // console.log('products ', products);
  if (isLoading && !isRefreshing) {
    return <LoadingSpinner />;
  }

  // Memoized callbacks for better performance
  // const handleEditCallback = useCallback((product: Product) => {
  //   handleEdit(product);
  // }, []);

  // const handleDeleteCallback = useCallback((product: Product) => {
  //   handleDelete(product);
  // }, []);

  // Simplified Product Card - only basic info
  const ProductCard = React.memo(
    ({ product }: { product: Product }) => {
      return (
        <TouchableOpacity
          onPress={() => {
            setSelectedProduct(product);
            setShowProductDetail(true);
          }}
          activeOpacity={0.7}
        >
          <Card style={styles.productCard}>
            <View style={styles.productHeader}>
              {product.imageUrl ? (
                <Image
                  source={{ uri: product.imageUrl }}
                  style={styles.productImage}
                  resizeMode="cover"
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
                  onPress={(e) => {
                    e.stopPropagation();
                    handleEdit(product);
                  }}
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
                    product.quantity <= product.min_stock &&
                      styles.lowStockText,
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
                  {formatPrice(product.price - product.cost)}
                </Text>
              </View>
            </View>

            {/* Indicators for additional features */}
            <View style={styles.productIndicators}>
              {product.bulk_pricing && product.bulk_pricing.length > 0 && (
                <View style={styles.indicator}>
                  <TrendingDown size={12} color="#059669" />
                  <Text style={styles.indicatorText}>Bulk</Text>
                </View>
              )}
              {product.quantity <= product.min_stock && (
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
      // Optimized comparison for basic fields only
      return (
        prevProps.product.id === nextProps.product.id &&
        prevProps.product.name === nextProps.product.name &&
        prevProps.product.price === nextProps.product.price &&
        prevProps.product.quantity === nextProps.product.quantity &&
        prevProps.product.category === nextProps.product.category
      );
    }
  );

  // Simplified Table Header Component
  const TableHeader = () => {
    return (
      <View style={styles.tableHeader}>
        <View style={[styles.tableHeaderCell, { width: 80 }]}>
          <Text style={styles.tableHeaderText}>{t('products.image')}</Text>
        </View>
        <View style={[styles.tableHeaderCell, { width: 150 }]}>
          <Text style={styles.tableHeaderText}>{t('products.name')}</Text>
        </View>
        <View style={[styles.tableHeaderCell, { width: 100 }]}>
          <Text style={styles.tableHeaderText}>{t('products.category')}</Text>
        </View>
        <View style={[styles.tableHeaderCell, { width: 100 }]}>
          <Text style={styles.tableHeaderText}>{t('products.price')}</Text>
        </View>
        <View style={[styles.tableHeaderCell, { width: 80 }]}>
          <Text style={styles.tableHeaderText}>{t('products.stock')}</Text>
        </View>
        <View style={[styles.tableHeaderCell, { width: 100 }]}>
          <Text style={styles.tableHeaderText}>{t('products.profit')}</Text>
        </View>
        <View style={[styles.tableHeaderCell, { width: 100 }]}>
          <Text style={styles.tableHeaderText}>{t('products.status')}</Text>
        </View>
        <View style={[styles.tableHeaderCell, { width: 80 }]}>
          <Text style={styles.tableHeaderText}>{t('products.actions')}</Text>
        </View>
      </View>
    );
  };

  // Simplified Table Row Component - only basic info
  const ProductTableRow = React.memo(({ product }: { product: Product }) => {
    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedProduct(product);
          setShowProductDetail(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.tableRow}>
          {/* Image */}
          <View style={[styles.tableCell, { width: 80 }]}>
            {product.imageUrl ? (
              <Image
                source={{ uri: product.imageUrl }}
                style={styles.tableProductImage}
                resizeMode="cover"
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
                handleEdit(product);
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
              data={filteredProducts}
              renderItem={({ item }) => <ProductTableRow product={item} />}
              keyExtractor={keyExtractor}
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
              getItemLayout={getItemLayout}
            />
          </View>
        </ScrollView>
      </View>
    );
  };

  const categoryModal = () => {
    return (
      <Modal
        visible={showCategoryFormPicker}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.categoryPickerContainer}>
            <View style={styles.categoryPickerHeader}>
              <Text style={styles.categoryPickerTitle}>
                {t('products.selectCategory')}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCategoryFormPicker(false)}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.categoryPickerList}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryFilterPickerItem,
                    formData.category_id === category.id &&
                      styles.categoryFilterPickerItemActive,
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, category_id: category.id });
                    setShowCategoryFormPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryPickerItemText,
                      formData.category_id === category.id &&
                        styles.categoryPickerItemTextActive,
                    ]}
                  >
                    {category.name}
                  </Text>
                  {formData.category_id === category.id && (
                    <View style={styles.selectedIndicator} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const supplierModal = () => {
    return (
      <Modal
        visible={showSupplierPicker}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.categoryPickerContainer}>
            <View style={styles.categoryPickerHeader}>
              <Text style={styles.categoryPickerTitle}>
                {t('products.selectSupplier')}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowSupplierPicker(false)}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.categoryPickerList}>
              {/* No Supplier Option */}
              <TouchableOpacity
                style={[
                  styles.categoryFilterPickerItem,
                  !formData.supplier_id &&
                    styles.categoryFilterPickerItemActive,
                ]}
                onPress={() => {
                  setFormData({ ...formData, supplier_id: '' });
                  setShowSupplierPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.categoryPickerItemText,
                    !formData.supplier_id &&
                      styles.categoryPickerItemTextActive,
                  ]}
                >
                  {t('products.noSupplier')}
                </Text>
                {!formData.supplier_id && (
                  <View style={styles.selectedIndicator} />
                )}
              </TouchableOpacity>

              {/* Supplier Options */}
              {suppliers.map((supplier) => (
                <TouchableOpacity
                  key={supplier.id}
                  style={[
                    styles.categoryFilterPickerItem,
                    formData.supplier_id === supplier.id &&
                      styles.categoryFilterPickerItemActive,
                  ]}
                  onPress={() => {
                    setFormData({
                      ...formData,
                      supplier_id: supplier.id,
                    });
                    setShowSupplierPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryPickerItemText,
                      formData.supplier_id === supplier.id &&
                        styles.categoryPickerItemTextActive,
                    ]}
                  >
                    {supplier.name}
                  </Text>
                  {formData.supplier_id === supplier.id && (
                    <View style={styles.selectedIndicator} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
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
          <TouchableOpacity
            style={styles.compactAddButton}
            onPress={() => setShowAddForm(true)}
          >
            <Plus size={16} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.compactMenuButton}
            onPress={() => setShowActionsMenu(!showActionsMenu)}
          >
            <MoreVertical size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Overlay for closing menus */}
        {(showActionsMenu || showSortOptions) && (
          <TouchableOpacity
            style={styles.menuOverlay}
            activeOpacity={1}
            onPress={handleOutsidePress}
          />
        )}

        {/* Actions Menu Dropdown */}
        {showActionsMenu && (
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
                setShowCategoryModal(true);
                setShowActionsMenu(false);
              }}
            >
              <View style={styles.actionMenuItemContent}>
                <Settings size={16} color="#6B7280" />
                <Text style={styles.actionMenuItemText}>
                  {t('products.categories')}
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

        {/* Sort Options - appears when sort is selected */}
        {showSortOptions && (
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
          </View>
        )}
      </>

      <View>
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
                      {t('common.all')} ({products.length})
                    </Text>
                    {selectedCategory === 'All' && (
                      <View style={styles.selectedIndicator} />
                    )}
                  </TouchableOpacity>

                  {/* Individual Categories */}
                  {categories.map((category) => {
                    const categoryCount = products.filter(
                      (p) => p.category_id === category.id
                    ).length;
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
                          {category.name} ({categoryCount})
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
          data={filteredProducts}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          renderItem={({ item }) => <ProductCard product={item} />}
          ListEmptyComponent={() => (
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
          )}
          contentContainerStyle={
            filteredProducts.length === 0
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

      {/* Product Form Modal */}
      <Modal
        visible={showAddForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingProduct
                ? t('products.editProduct')
                : t('products.addNewProduct')}
            </Text>
            <TouchableOpacity onPress={resetForm}>
              <Text style={styles.modalClose}>{t('products.cancel')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.formScrollView}
            contentContainerStyle={styles.formContent}
          >
            {/* Image Picker Section */}
            <View style={styles.imagePickerContainer}>
              {formData.imageUrl ? (
                <Image
                  source={{ uri: formData.imageUrl }}
                  style={styles.productFormImage}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <ImageIcon size={40} color="#9CA3AF" />
                  <Text style={styles.imagePlaceholderText}>
                    {t('products.noImage')}
                  </Text>
                </View>
              )}

              <View style={styles.imagePickerButtons}>
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={takePhoto}
                >
                  <Camera size={20} color="#FFFFFF" />
                  <Text style={styles.imagePickerButtonText}>
                    {t('products.camera')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={pickImage}
                >
                  <ImageIcon size={20} color="#FFFFFF" />
                  <Text style={styles.imagePickerButtonText}>
                    {t('products.gallery')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                {t('products.productName')} *
              </Text>
              <View style={styles.barcodeContainer}>
                <TextInput
                  style={[styles.input, styles.barcodeInput]}
                  placeholder={t('products.productNamePlaceholder')}
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  multiline={true}
                  numberOfLines={4}
                />
                <TouchableOpacity
                  style={styles.scanTextButton}
                  onPress={() => setShowTextScanner(true)}
                >
                  <Camera size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                {t('products.barcode')} ({t('products.optional')})
              </Text>
              <View style={styles.barcodeContainer}>
                <TextInput
                  style={[styles.input, styles.barcodeInput]}
                  placeholder={t('products.barcodePlaceholder')}
                  value={formData.barcode}
                  onChangeText={(text) =>
                    setFormData({ ...formData, barcode: text })
                  }
                />
                <TouchableOpacity
                  style={styles.scanBarcodeButton}
                  onPress={() => setShowBarcodeScanner(true)}
                >
                  <Scan size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>{t('common.category')} *</Text>
              <TouchableOpacity
                style={styles.categoryDropdown}
                onPress={() => setShowCategoryFormPicker(true)}
              >
                <Text style={styles.categoryDropdownText}>
                  {formData.category_id
                    ? categories.find((c) => c.id === formData.category_id)
                        ?.name || t('products.selectCategory')
                    : t('products.selectCategory')}
                </Text>
                <ChevronDown size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>
                {t('products.supplier')} ({t('products.optional')})
              </Text>
              <TouchableOpacity
                style={styles.categoryDropdown}
                onPress={() => setShowSupplierPicker(true)}
              >
                <Text style={styles.categoryDropdownText}>
                  {getSupplierName(formData.supplier_id)}
                </Text>
                <ChevronDown size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <PriceInput
              label={t('common.price')}
              value={formData.price}
              onValueChange={(text, numericValue) =>
                setFormData({ ...formData, price: text })
              }
              required
            />

            <PriceInput
              label={t('products.cost')}
              value={formData.cost}
              onValueChange={(text, numericValue) =>
                setFormData({ ...formData, cost: text })
              }
              required
            />

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('common.quantity')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('products.quantityPlaceholder')}
                value={formData.quantity}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    quantity: text.replace(/[^\d]/g, ''),
                  })
                }
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                {t('products.minStockLevel')}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t('products.minStockPlaceholder')}
                value={formData.min_stock}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    min_stock: text.replace(/[^\d]/g, ''),
                  })
                }
                keyboardType="numeric"
              />
            </View>

            {formData.price &&
              formData.cost &&
              parseInt(formData.price) > 0 &&
              parseInt(formData.cost) > 0 && (
                <View style={styles.profitPreview}>
                  <Text style={styles.profitLabel}>
                    {t('products.profitPreview')}:
                  </Text>
                  <Text style={styles.profitValue}>
                    {formatPrice(
                      parseInt(formData.price) - parseInt(formData.cost)
                    )}{' '}
                    {t('products.perUnit')}
                  </Text>
                  <Text style={styles.marginValue}>
                    {t('products.margin')}:{' '}
                    {(
                      ((parseInt(formData.price) - parseInt(formData.cost)) /
                        parseInt(formData.price)) *
                      100
                    ).toFixed(1)}
                    %
                  </Text>
                </View>
              )}

            {/* Bulk Pricing Configuration */}
            {formData.price && parseInt(formData.price) > 0 && (
              <BulkPricingTiers
                productPrice={parseInt(formData.price)}
                initialTiers={bulkPricingTiers}
                onTiersChange={setBulkPricingTiers}
              />
            )}

            <View style={styles.formButtons}>
              <Button
                title={t('common.cancel')}
                onPress={resetForm}
                variant="secondary"
                style={styles.formButton}
              />
              <Button
                title={editingProduct ? t('common.edit') : t('common.add')}
                onPress={handleSubmit}
                style={styles.formButton}
              />
            </View>
          </ScrollView>

          {/* Barcode Scanner inside the form modal */}
          {showBarcodeScanner && (
            <BarcodeScanner
              onBarcodeScanned={handleBarcodeScanned}
              onClose={() => setShowBarcodeScanner(false)}
            />
          )}

          {/* Text Scanner inside the form modal */}
          {showTextScanner && (
            <TextScanner
              visible={showTextScanner}
              onTextDetected={handleTextScanned}
              onClose={() => setShowTextScanner(false)}
            />
          )}
        </SafeAreaView>
        {categoryModal()}
        {supplierModal()}
      </Modal>

      {/* Category Management Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {t('products.manageCategories')}
            </Text>
            <TouchableOpacity onPress={resetCategoryForm}>
              <Text style={styles.modalClose}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>

          {/* Sticky Category Form - Not in ScrollView */}
          <View style={styles.stickyFormContainer}>
            <Card style={styles.categoryFormCard}>
              <Text style={styles.formTitle}>
                {editingCategory
                  ? t('products.editCategory')
                  : t('products.addNewCategory')}
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  {t('categories.categoryName')} *
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('products.categoryNamePlaceholder')}
                  value={categoryFormData.name}
                  onChangeText={(text) =>
                    setCategoryFormData({ ...categoryFormData, name: text })
                  }
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  {t('products.description')}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('products.description')}
                  value={categoryFormData.description}
                  onChangeText={(text) =>
                    setCategoryFormData({
                      ...categoryFormData,
                      description: text,
                    })
                  }
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formButtons}>
                <Button
                  title={t('common.cancel')}
                  onPress={resetCategoryForm}
                  variant="secondary"
                  style={styles.formButton}
                />
                <Button
                  title={editingCategory ? t('common.edit') : t('common.add')}
                  onPress={handleCategorySubmit}
                  style={styles.formButton}
                />
              </View>
            </Card>
          </View>

          {/* Scrollable Categories List */}
          <View style={styles.categoriesListContainer}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>
                {t('categories.existingCategories')}
              </Text>
            </View>
            <ScrollView
              style={styles.categoriesScrollView}
              contentContainerStyle={styles.categoriesContent}
              showsVerticalScrollIndicator={true}
            >
              {categories.map((category) => (
                <Card key={category.id} style={styles.categoryCard}>
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryName}>{category.name}</Text>
                      <Text style={styles.categoryDescription}>
                        {category.description}
                      </Text>
                    </View>
                    <View style={styles.categoryActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEditCategory(category)}
                      >
                        <Edit size={18} color="#6B7280" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteCategory(category)}
                      >
                        <Trash2 size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Product Detail Modal */}
      <ProductDetailModal
        visible={showProductDetail}
        product={selectedProduct}
        onClose={() => {
          setShowProductDetail(false);
          setSelectedProduct(null);
        }}
        onEdit={handleEdit}
        onDelete={handleDelete}
        getSupplierName={getSupplierName}
      />

      {/* Stock Movement Form Modal */}
      <StockMovementForm
        visible={showStockMovementForm}
        onClose={() => {
          setShowStockMovementForm(false);
          setSelectedProductForMovement(null);
        }}
        product={selectedProductForMovement || undefined}
        initialType={movementType}
      />
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
    fontWeight: '600',
    color: '#059669',
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
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  dataHint: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-Medium',
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
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  sortOptionTextActive: {
    color: '#059669',
    fontFamily: 'Inter-Medium',
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
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-Medium',
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
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  productCategory: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  productSupplier: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  productDetailValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
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
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  modalClose: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
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
    fontFamily: 'Inter-SemiBold',
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
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 6,
  },
  pickerLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
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
    fontFamily: 'Inter-Medium',
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
    fontFamily: 'Inter-Medium',
    color: '#166534',
  },
  profitValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#15803D',
    marginTop: 2,
  },
  marginValue: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-SemiBold',
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
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  categoryDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-Medium',
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
    fontFamily: 'Inter-SemiBold',
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
    fontFamily: 'Inter-Regular',
    color: '#374151',
  },
  categoryPickerItemTextActive: {
    color: '#059669',
    fontFamily: 'Inter-Medium',
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
    fontWeight: '600',
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
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-Medium',
    color: '#059669',
  },
  lowStockIndicator: {
    backgroundColor: '#FEF2F2',
  },
  lowStockIndicatorText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
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
    fontFamily: 'Inter-Medium',
    color: '#059669',
  },
  tableLowStockIndicator: {
    backgroundColor: '#FEF2F2',
  },
  tableLowStockIndicatorText: {
    fontSize: 8,
    fontFamily: 'Inter-Medium',
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
});
