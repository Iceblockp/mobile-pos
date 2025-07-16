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
} from 'react-native';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useDatabase } from '@/context/DatabaseContext';
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
import { useToast } from '@/context/ToastContext';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

interface ProductsManagerProps {
  compact?: boolean;
}

export default function Products({ compact = false }: ProductsManagerProps) {
  const { db, isReady, refreshTrigger, triggerRefresh } = useDatabase();
  const [products, setProducts] = useState<Product[]>([]);
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showSearchScanner, setShowSearchScanner] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'updated_at'>('name'); // Add sorting state
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // Add sort order state
  const [showSortOptions, setShowSortOptions] = useState(false); // Add state for sort dropdown

  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    category: '',
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

  const loadData = async () => {
    if (!db) return;

    try {
      setLoading(true);
      const [productsData, categoriesData, suppliersData] = await Promise.all([
        db.getProducts(),
        db.getCategories(),
        db.getSuppliers(),
      ]);

      setProducts(productsData);
      setCategories(categoriesData);
      setSuppliers(suppliersData);
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

  const filteredProducts = [...products]
    .filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode?.includes(searchQuery);
      const matchesCategory =
        selectedCategory === 'All' || product.category === selectedCategory;
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
      category: '',
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
    showToast(`Barcode ${barcode} added to product`, 'success');
  };

  const handleSearchBarcodeScanned = async (barcode: string) => {
    setSearchQuery(barcode);
    setShowSearchScanner(false);

    // Find and highlight the product if it exists
    const foundProduct = products.find((p) => p.barcode === barcode);
    if (foundProduct) {
      showToast(`Found: ${foundProduct.name}`, 'success');
    } else {
      showToast('No product found with this barcode', 'error');
    }
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
        'Permission Required',
        'Sorry, we need camera roll permissions to make this work!'
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
        showToast('Image selected successfully', 'success');
      } catch (error) {
        console.error('Error saving image:', error);
        showToast('Failed to save image', 'error');
      }
    }
  };

  const takePhoto = async () => {
    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need camera permissions to make this work!'
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
        showToast('Photo taken successfully', 'success');
      } catch (error) {
        console.error('Error saving image:', error);
        showToast('Failed to save image', 'error');
      }
    }
  };

  const handleSubmit = async () => {
    if (!db) return;

    if (
      !formData.name ||
      !formData.category ||
      !formData.price ||
      !formData.cost
    ) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Validate that price and cost are integers
    const price = parseInt(formData.price);
    const cost = parseInt(formData.cost);

    if (isNaN(price) || isNaN(cost) || price <= 0 || cost <= 0) {
      Alert.alert('Error', 'Price and cost must be valid positive numbers');
      return;
    }

    if (price <= cost) {
      Alert.alert(
        'Warning',
        'Price should be higher than cost for profitability'
      );
      return;
    }

    try {
      const productData = {
        name: formData.name,
        barcode: formData.barcode ? formData.barcode : undefined, // Convert empty string to null
        category: formData.category,
        price: price,
        cost: cost,
        quantity: parseInt(formData.quantity) || 0,
        min_stock: parseInt(formData.min_stock) || 10,
        supplier_id: parseInt(formData.supplier_id) || 1,
        imageUrl: formData.imageUrl || undefined,
      };

      if (editingProduct) {
        await db.updateProduct(editingProduct.id, productData);
      } else {
        await db.addProduct(productData);
      }

      await loadData();
      resetForm();
      // Alert.alert(
      //   'Success',
      //   editingProduct
      //     ? 'Product updated successfully'
      //     : 'Product added successfully'
      // );
      showToast(
        editingProduct
          ? 'Product updated successfully'
          : 'Product added successfully',
        'success'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save product');
      console.error('Error saving product:', error);
    }
  };

  const handleCategorySubmit = async () => {
    if (!db) return;

    if (!categoryFormData.name) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      if (editingCategory) {
        await db.updateCategory(editingCategory.id, categoryFormData);
      } else {
        await db.addCategory(categoryFormData);
      }

      await loadData();
      resetCategoryForm();
      showToast(
        editingCategory
          ? 'Category updated successfully'
          : 'Category added successfully',
        'success'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save category');
      console.error('Error saving category:', error);
    }
  };

  const handleEdit = (product: Product) => {
    setFormData({
      name: product.name,
      barcode: product.barcode || '',
      category: product.category,
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
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await db?.deleteProduct(product.id);
              await loadData();
              // Add this line to trigger refresh for other components
              triggerRefresh();
              showToast('Product deleted successfully', 'success');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete product');
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
      (p) => p.category === category.name
    );

    if (productsInCategory.length > 0) {
      showToast(
        `Cannot delete "${category.name}" - ${
          productsInCategory.length
        } product${productsInCategory.length > 1 ? 's' : ''} still use${
          productsInCategory.length === 1 ? 's' : ''
        } this category`,
        'error'
      );
      return;
    }

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await db?.deleteCategory(category.id);
              await loadData();
              showToast('Category deleted successfully', 'success');
            } catch (error: any) {
              console.error('Error deleting category:', error);
              // Check if it's a foreign key constraint error
              if (
                error.message &&
                error.message.includes('FOREIGN KEY constraint')
              ) {
                showToast(
                  `Cannot delete "${category.name}" - products are still using this category`,
                  'error'
                );
              } else {
                showToast(
                  `Failed to delete category "${category.name}". Please try again.`,
                  'error'
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
    return supplier ? supplier.name : 'Unknown';
  };

  if (!isReady || loading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={compact ? styles.compactContainer : styles.container}>
      {!compact && (
        <SafeAreaView>
          <View style={styles.header}>
            <Text style={styles.title}>Products</Text>
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
                placeholder="Search products..."
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
                placeholder="Search products or scan barcode..."
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
                  All ({products.length})
                </Text>
              </TouchableOpacity>
              {categories.map((category) => {
                const categoryCount = products.filter(
                  (p) => p.category === category.name
                ).length;
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryChip,
                      selectedCategory === category.name &&
                        styles.categoryChipActive,
                    ]}
                    onPress={() => setSelectedCategory(category.name)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selectedCategory === category.name &&
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
                All ({products.length})
              </Text>
            </TouchableOpacity>
            {categories.map((category) => {
              const categoryCount = products.filter(
                (p) => p.category === category.name
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

      <ScrollView style={styles.productsList}>
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
                <Text style={styles.productSupplier}>
                  Supplier: {getSupplierName(product.supplier_id)}
                </Text>
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
                <Text style={styles.productDetailLabel}>Price</Text>
                <Text style={styles.productDetailValue}>
                  {formatMMK(product.price)}
                </Text>
              </View>
              <View style={styles.productDetailItem}>
                <Text style={styles.productDetailLabel}>Stock</Text>
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
                <Text style={styles.productDetailLabel}>Profit</Text>
                <Text style={[styles.productDetailValue, styles.profitText]}>
                  {formatMMK(product.price - product.cost)}
                </Text>
              </View>
            </View>

            {product.barcode && (
              <View style={styles.barcodeDisplay}>
                <Text style={styles.barcodeLabel}>
                  Barcode: {product.barcode}
                </Text>
              </View>
            )}
          </Card>
        ))}

        {filteredProducts.length === 0 && (
          <View style={styles.emptyState}>
            <Package size={48} color="#9CA3AF" />
            <Text style={styles.emptyStateText}>No products found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery
                ? 'Try adjusting your search or scan a barcode'
                : 'Add your first product to get started'}
            </Text>
          </View>
        )}
      </ScrollView>

      {showBarcodeScanner && (
        <BarcodeScanner
          onBarcodeScanned={handleBarcodeScanned}
          onClose={() => setShowBarcodeScanner(false)}
        />
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
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </Text>
            <TouchableOpacity onPress={resetForm}>
              <Text style={styles.modalClose}>Cancel</Text>
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
                  <Text style={styles.imagePlaceholderText}>No image</Text>
                </View>
              )}

              <View style={styles.imagePickerButtons}>
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={takePhoto}
                >
                  <Camera size={20} color="#FFFFFF" />
                  <Text style={styles.imagePickerButtonText}>Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={pickImage}
                >
                  <ImageIcon size={20} color="#FFFFFF" />
                  <Text style={styles.imagePickerButtonText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Product Name *"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />

            <View style={styles.barcodeContainer}>
              <TextInput
                style={[styles.input, styles.barcodeInput]}
                placeholder="Barcode (Optional)"
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

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Category *</Text>
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
                      formData.category === category.name &&
                        styles.categoryPickerItemActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, category: category.name })
                    }
                  >
                    <Text
                      style={[
                        styles.categoryPickerText,
                        formData.category === category.name &&
                          styles.categoryPickerTextActive,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Price (MMK) * - Enter whole numbers only"
              value={formData.price}
              onChangeText={(text) =>
                setFormData({ ...formData, price: validatePricing(text) })
              }
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              placeholder="Cost (MMK) * - Enter whole numbers only"
              value={formData.cost}
              onChangeText={(text) =>
                setFormData({ ...formData, cost: validatePricing(text) })
              }
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              placeholder="Quantity"
              value={formData.quantity}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  quantity: text.replace(/[^\d]/g, ''),
                })
              }
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              placeholder="Min Stock Level"
              value={formData.min_stock}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  min_stock: text.replace(/[^\d]/g, ''),
                })
              }
              keyboardType="numeric"
            />

            {formData.price &&
              formData.cost &&
              parseInt(formData.price) > 0 &&
              parseInt(formData.cost) > 0 && (
                <View style={styles.profitPreview}>
                  <Text style={styles.profitLabel}>Profit Preview:</Text>
                  <Text style={styles.profitValue}>
                    {formatMMK(
                      parseInt(formData.price) - parseInt(formData.cost)
                    )}{' '}
                    per unit
                  </Text>
                  <Text style={styles.marginValue}>
                    Margin:{' '}
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
                title="Cancel"
                onPress={resetForm}
                variant="secondary"
                style={styles.formButton}
              />
              <Button
                title={editingProduct ? 'Update' : 'Add'}
                onPress={handleSubmit}
                style={styles.formButton}
              />
            </View>
          </ScrollView>
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
            <Text style={styles.modalTitle}>Manage Categories</Text>
            <TouchableOpacity onPress={resetCategoryForm}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.formScrollView}
            contentContainerStyle={styles.formContent}
          >
            <Card style={styles.categoryFormCard}>
              <Text style={styles.formTitle}>
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Category Name *"
                value={categoryFormData.name}
                onChangeText={(text) =>
                  setCategoryFormData({ ...categoryFormData, name: text })
                }
              />

              <View style={{ height: 12 }}></View>
              <TextInput
                style={styles.input}
                placeholder="Description"
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

              <View style={styles.formButtons}>
                <Button
                  title="Cancel"
                  onPress={resetCategoryForm}
                  variant="secondary"
                  style={styles.formButton}
                />
                <Button
                  title={editingCategory ? 'Update' : 'Add'}
                  onPress={handleCategorySubmit}
                  style={styles.formButton}
                />
              </View>
            </Card>

            <Text style={styles.sectionTitle}>Existing Categories</Text>
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
  pickerContainer: {
    marginBottom: 12,
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
