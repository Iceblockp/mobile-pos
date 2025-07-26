import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  useProducts,
  useCategories,
  useSuppliers,
  useProductMutations,
  useCategoryMutations,
} from '@/hooks/useQueries';
import { Product, Category, Supplier } from '@/services/database';
import {
  Plus,
  Search,
  CreditCard as Edit,
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
} from 'lucide-react-native';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import TextScanner from '@/components/TextScanner';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/context/LocalizationContext';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

interface ProductsManagerProps {
  compact?: boolean;
}

export default function Products({ compact = false }: ProductsManagerProps) {
  const { showToast } = useToast();
  const { t } = useTranslation();
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
  const [sortBy, setSortBy] = useState<'name' | 'updated_at'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showSortOptions, setShowSortOptions] = useState(false);

  // Use React Query for optimized data fetching
  const {
    data: products = [],
    isLoading: productsLoading,
    isRefetching: productsRefetching,
    refetch: refetchProducts,
  } = useProducts();

  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories();

  const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers();

  const { addProduct, updateProduct, deleteProduct } = useProductMutations();
  const { addCategory, updateCategory, deleteCategory } =
    useCategoryMutations();

  const isLoading = productsLoading || categoriesLoading || suppliersLoading;
  const isRefreshing = productsRefetching;

  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    category_id: 0,
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

  const onRefresh = () => {
    refetchProducts();
  };

  const formatMMK = (amount: number) => {
    return (
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount) + ' MMK'
    );
  };

  const filteredProducts = [...products]
    .filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode?.includes(searchQuery);
      const matchesCategory =
        selectedCategory === 'All' ||
        (typeof selectedCategory === 'string'
          ? product.category === selectedCategory
          : product.category_id === selectedCategory);
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else {
        // sort by updated_at
        return sortOrder === 'asc'
          ? new Date(a.updated_at || 0).getTime() -
              new Date(b.updated_at || 0).getTime()
          : new Date(b.updated_at || 0).getTime() -
              new Date(a.updated_at || 0).getTime();
      }
    });

  // Function to toggle sort order or change sort field
  const handleSort = (field: 'name' | 'updated_at') => {
    if (sortBy === field) {
      // Toggle sort order if clicking the same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Change sort field and reset to ascending order
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      barcode: '',
      category_id: 0,
      price: '',
      cost: '',
      quantity: '0', // Default to 0
      min_stock: '10', // Default to 10
      supplier_id: '',
      imageUrl: '',
    });
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

  const validatePricing = (value: string) => {
    // Remove any non-digit characters and ensure it's an integer
    const cleanValue = value.replace(/[^\d]/g, '');
    return cleanValue;
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
        await FileSystem.copyAsync({
          from: selectedAsset.uri,
          to: newPath,
        });

        setFormData({ ...formData, imageUrl: newPath });
        showToast(t('products.imageSelected'), 'success');
      } catch (error) {
        console.error('Error saving image:', error);
        showToast(t('products.failedToSaveImage'), 'error');
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
        await FileSystem.copyAsync({
          from: selectedAsset.uri,
          to: newPath,
        });

        setFormData({ ...formData, imageUrl: newPath });
        showToast(t('products.photoTaken'), 'success');
      } catch (error) {
        console.error('Error saving image:', error);
        showToast(t('products.failedToSaveImage'), 'error');
      }
    }
  };

  const handleSubmit = async () => {
    if (
      !formData.name ||
      !formData.category_id ||
      formData.category_id === 0 ||
      !formData.price ||
      !formData.cost
    ) {
      Alert.alert(t('common.error'), t('products.fillRequiredFields'));
      return;
    }

    // Validate that price and cost are integers
    const price = parseInt(formData.price);
    const cost = parseInt(formData.cost);

    if (isNaN(price) || isNaN(cost) || price <= 0 || cost <= 0) {
      Alert.alert(t('common.error'), t('products.validPositiveNumbers'));
      return;
    }

    if (price <= cost) {
      Alert.alert(t('products.warning'), t('products.priceShouldBeHigher'));
      return;
    }

    try {
      const productData = {
        name: formData.name,
        barcode: formData.barcode ? formData.barcode : undefined,
        category_id: formData.category_id,
        price: price,
        cost: cost,
        quantity: parseInt(formData.quantity) || 0,
        min_stock: parseInt(formData.min_stock) || 10,
        supplier_id: parseInt(formData.supplier_id) || 1,
        imageUrl: formData.imageUrl || undefined,
      };

      if (editingProduct) {
        await updateProduct.mutateAsync({
          id: editingProduct.id,
          data: productData,
        });
      } else {
        await addProduct.mutateAsync(productData);
      }

      resetForm();
      showToast(
        editingProduct
          ? t('products.productUpdated')
          : t('products.productAdded'),
        'success'
      );
    } catch (error) {
      Alert.alert(t('common.error'), t('products.failedToSave'));
      console.error('Error saving product:', error);
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
      min_stock: product.min_stock.toString(),
      supplier_id: product.supplier_id.toString(),
      imageUrl: product.imageUrl || '',
    });
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
              Alert.alert(t('common.error'), t('products.failedToSave'));
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

  const getSupplierName = (supplierId: number) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    return supplier ? supplier.name : t('products.unknown');
  };

  if (isLoading && !isRefreshing) {
    return <LoadingSpinner />;
  }

  return (
    <View style={compact ? styles.compactContainer : styles.container}>
      {!compact && (
        <SafeAreaView>
          <View style={styles.header}>
            <Text style={styles.title}>{t('products.title')}</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.sortDropdown, { backgroundColor: '#6B7280' }]}
                onPress={() => setShowSortOptions(!showSortOptions)}
              >
                <Text style={styles.sortDropdownText}>
                  {sortBy === 'name' ? (
                    sortOrder === 'asc' ? (
                      <ArrowUpAZ size={20} color="#FFFFFF" />
                    ) : (
                      <ArrowDownAZ size={20} color="#FFFFFF" />
                    )
                  ) : (
                    <Calendar size={20} color="#FFFFFF" />
                  )}{' '}
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.categoryButton}
                onPress={() => setShowCategoryModal(true)}
              >
                <Settings size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddForm(true)}
              >
                <Plus size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      )}

      {/* Compact mode: Combine search and actions in one row */}
      {compact ? (
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
              <TouchableOpacity
                style={styles.compactScanButton}
                onPress={() => setShowSearchScanner(true)}
              >
                <Scan size={16} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[
                styles.compactSortDropdown,
                { backgroundColor: '#6B7280' },
              ]}
              onPress={() => setShowSortOptions(!showSortOptions)}
            >
              <Text style={styles.sortDropdownText}>
                {sortBy === 'name' ? (
                  sortOrder === 'asc' ? (
                    <ArrowUpAZ size={16} color="#FFFFFF" />
                  ) : (
                    <ArrowDownAZ size={16} color="#FFFFFF" />
                  )
                ) : (
                  <Calendar size={16} color="#FFFFFF" />
                )}{' '}
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={() => setShowCategoryModal(true)}
            >
              <Settings size={16} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.compactAddButton}
              onPress={() => setShowAddForm(true)}
            >
              <Plus size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {showSortOptions && (
            <View style={styles.sortOptionsContainer}>
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
                  Name (A to Z)
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
                  Name (Z to A)
                </Text>
              </TouchableOpacity>

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
      ) : (
        <>
          {/* Sort options dropdown - only visible when showSortOptions is true */}
          {showSortOptions && (
            <View style={styles.sortOptionsContainer}>
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
                  Name (A to Z)
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
                  Name (Z to A)
                </Text>
              </TouchableOpacity>

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

          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Search size={20} color="#6B7280" />
              <TextInput
                style={styles.searchInput}
                placeholder={t('products.searchProducts')}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <TouchableOpacity
                style={styles.searchScanButton}
                onPress={() => setShowSearchScanner(true)}
              >
                <Scan size={20} color="#3B82F6" />
              </TouchableOpacity>
            </View>
          </View>

          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
            >
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  selectedCategory === 'All' && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory('All')}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === 'All' && styles.categoryChipTextActive,
                  ]}
                >
                  {t('common.all')} ({products.length})
                </Text>
              </TouchableOpacity>
              {categories.map((category) => {
                const categoryCount = products.filter(
                  (p) => p.category_id === category.id
                ).length;
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryChip,
                      selectedCategory === category.id &&
                        styles.categoryChipActive,
                    ]}
                    onPress={() => setSelectedCategory(category.id)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selectedCategory === category.id &&
                          styles.categoryChipTextActive,
                      ]}
                    >
                      {category.name} ({categoryCount})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </>
      )}
      <View>
        {/* Compact category filter - horizontal chips below search */}
        {compact && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.compactCategoryScroll}
          >
            <TouchableOpacity
              style={[
                styles.compactCategoryChip,
                selectedCategory === 'All' && styles.compactCategoryChipActive,
              ]}
              onPress={() => setSelectedCategory('All')}
            >
              <Text
                style={[
                  styles.compactCategoryChipText,
                  selectedCategory === 'All' &&
                    styles.compactCategoryChipTextActive,
                ]}
              >
                {t('common.all')} ({products.length})
              </Text>
            </TouchableOpacity>
            {categories.map((category) => {
              const categoryCount = products.filter(
                (p) => p.category_id === category.id
              ).length;
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.compactCategoryChip,
                    selectedCategory === category.name &&
                      styles.compactCategoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory(category.name)}
                >
                  <Text
                    style={[
                      styles.compactCategoryChipText,
                      selectedCategory === category.name &&
                        styles.compactCategoryChipTextActive,
                    ]}
                  >
                    {category.name} ({categoryCount})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      <ScrollView
        style={styles.productsList}
        refreshControl={
          <RefreshControl
            refreshing={productsRefetching}
            onRefresh={onRefresh}
          />
        }
      >
        {filteredProducts.map((product) => (
          <Card key={product.id} style={styles.productCard}>
            <View style={styles.productHeader}>
              {product.imageUrl && (
                <Image
                  source={{ uri: product.imageUrl }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productCategory}>{product.category}</Text>
                {/* <Text style={styles.productSupplier}>
                  {t('products.supplier')}:{' '}
                  {getSupplierName(product.supplier_id)}
                </Text> */}
              </View>
              <View style={styles.productActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEdit(product)}
                >
                  <Edit size={18} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(product)}
                >
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.productDetails}>
              <View style={styles.productDetailItem}>
                <Text style={styles.productDetailLabel}>
                  {t('products.price')}
                </Text>
                <Text style={styles.productDetailValue}>
                  {formatMMK(product.price)}
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
                  {formatMMK(product.price - product.cost)}
                </Text>
              </View>
            </View>

            {product.barcode && (
              <View style={styles.barcodeDisplay}>
                <Text style={styles.barcodeLabel}>
                  {t('products.barcodeLabel')} {product.barcode}
                </Text>
              </View>
            )}
          </Card>
        ))}

        {filteredProducts.length === 0 && (
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
      </ScrollView>

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
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryPicker}
              >
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryPickerItem,
                      formData.category_id === category.id &&
                        styles.categoryPickerItemActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, category_id: category.id })
                    }
                  >
                    <Text
                      style={[
                        styles.categoryPickerText,
                        formData.category_id === category.id &&
                          styles.categoryPickerTextActive,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('common.price')} *</Text>
              <TextInput
                style={styles.input}
                placeholder={t('products.pricePlaceholder')}
                value={formData.price}
                onChangeText={(text) =>
                  setFormData({ ...formData, price: validatePricing(text) })
                }
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('products.cost')} *</Text>
              <TextInput
                style={styles.input}
                placeholder={t('products.costPlaceholder')}
                value={formData.cost}
                onChangeText={(text) =>
                  setFormData({ ...formData, cost: validatePricing(text) })
                }
                keyboardType="numeric"
              />
            </View>

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
                    {formatMMK(
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
            <Text style={styles.sectionTitle}>
              {t('categories.existingCategories')}
            </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
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
  },
  compactSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
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
  compactCategoryScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  compactCategoryChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  compactCategoryChipActive: {
    backgroundColor: '#059669',
  },
  compactCategoryChipText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  compactCategoryChipTextActive: {
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#111827',
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
  compactSortDropdown: {
    padding: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
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
    paddingHorizontal: 20,
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
    fontSize: 14,
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
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
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
    fontSize: 16,
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
    padding: 16,
  },
  categoriesListContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  categoriesScrollView: {
    flex: 1,
  },
  categoriesContent: {
    padding: 16,
    paddingBottom: 100, // Extra padding for safe scrolling
  },
  formScrollView: {
    flex: 1,
  },
  formContent: {
    padding: 16,
    paddingBottom: 100, // Extra padding for safe scrolling
  },
  formTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    marginBottom: 12,
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
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
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
    marginTop: 16,
  },
  formButton: {
    flex: 0.48,
  },
  categoryFormCard: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
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
});
