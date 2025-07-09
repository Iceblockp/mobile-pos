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
} from 'lucide-react-native';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { useToast } from '@/context/ToastContext';

export default function Products() {
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

  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    category: '',
    price: '',
    cost: '',
    quantity: '',
    min_stock: '',
    supplier_id: '',
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

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode.includes(searchQuery);
    const matchesCategory =
      selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const resetForm = () => {
    setFormData({
      name: '',
      barcode: '',
      category: '',
      price: '',
      cost: '',
      quantity: '',
      min_stock: '',
      supplier_id: '',
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
        barcode: formData.barcode,
        category: formData.category,
        price: price,
        cost: cost,
        quantity: parseInt(formData.quantity) || 0,
        min_stock: parseInt(formData.min_stock) || 10,
        supplier_id: parseInt(formData.supplier_id) || 1,
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
      barcode: product.barcode,
      category: product.category,
      price: product.price.toString(),
      cost: product.cost.toString(),
      quantity: product.quantity.toString(),
      min_stock: product.min_stock.toString(),
      supplier_id: product.supplier_id.toString(),
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
              Alert.alert(
                'Error',
                error.message || 'Failed to delete category'
              );
              console.error('Error deleting category:', error);
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Products</Text>
        <View style={styles.headerActions}>
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
              All
            </Text>
          </TouchableOpacity>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                selectedCategory === category.name && styles.categoryChipActive,
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
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.productsList}>
        {filteredProducts.map((product) => (
          <Card key={product.id} style={styles.productCard}>
            <View style={styles.productHeader}>
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
            <TextInput
              style={styles.input}
              placeholder="Product Name *"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />

            <View style={styles.barcodeContainer}>
              <TextInput
                style={[styles.input, styles.barcodeInput]}
                placeholder="Barcode"
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
