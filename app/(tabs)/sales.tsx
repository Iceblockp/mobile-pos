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
  Modal,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useDatabase } from '@/context/DatabaseContext';
import { Product, Category } from '@/services/database';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Scan,
  History,
  Calendar,
  Filter,
  Download,
  X,
  Eye,
  FileText,
  FileSpreadsheet,
  Share as ShareIcon,
} from 'lucide-react-native';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 400;

export default function Sales() {
  const { db, isReady } = useDatabase();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false); // Add this line
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!db) return;

    try {
      const [productsData, categoriesData] = await Promise.all([
        db.getProducts(),
        db.getCategories(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useEffect(() => {
    if (isReady) {
      loadData();
    }
  }, [isReady, db]);

  useEffect(() => {
    const newTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    setTotal(newTotal);
  }, [cart]);

  const formatMMK = (amount: number) => {
    return (
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount) + ' MMK'
    );
  };

  const handleBarcodeScanned = async (barcode: string) => {
    if (!db) return;

    try {
      const product = await db.getProductByBarcode(barcode);
      if (product) {
        addToCart(product);
        setShowScanner(false);
        Alert.alert('Success', `Added ${product.name} to cart`);
      } else {
        Alert.alert('Product Not Found', 'No product found with this barcode');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to find product');
      console.error('Error finding product by barcode:', error);
    }
  };

  const addToCart = (product: Product) => {
    if (product.quantity <= 0) {
      Alert.alert('Error', 'This product is out of stock');
      return;
    }

    const existingItem = cart.find((item) => item.product.id === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.quantity) {
        Alert.alert('Error', 'Not enough stock available');
        return;
      }

      setCart(
        cart.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * product.price,
              }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          subtotal: product.price,
        },
      ]);
    }

    setShowProductDialog(false);
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    const item = cart.find((item) => item.product.id === productId);
    if (!item) return;

    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQuantity > item.product.quantity) {
      Alert.alert('Error', 'Not enough stock available');
      return;
    }

    setCart(
      cart.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              quantity: newQuantity,
              subtotal: newQuantity * item.product.price,
            }
          : item
      )
    );
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const processSale = async (paymentMethod: string) => {
    if (!db || cart.length === 0) return;

    try {
      setLoading(true);

      const saleData = {
        total,
        payment_method: paymentMethod,
      };

      const saleItems = cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
        cost: item.product.cost, // Add this line to store the cost at time of sale
        subtotal: item.subtotal,
      }));

      await db.addSale(saleData, saleItems);

      Alert.alert('Success', 'Sale completed successfully!');
      clearCart();
      await loadData(); // Refresh products to update stock
    } catch (error) {
      Alert.alert('Error', 'Failed to process sale');
      console.error('Error processing sale:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = () => {
    if (cart.length === 0) {
      Alert.alert('Error', 'Cart is empty');
      return;
    }

    setShowPaymentModal(true);
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode.includes(searchQuery);
    const matchesCategory =
      selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderPaymentMethodModal = () => {
    return (
      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.paymentModalOverlay}>
          <View style={styles.paymentModalContainer}>
            <View style={styles.paymentModalHeader}>
              <Text style={styles.paymentModalTitle}>Payment Method</Text>
              <TouchableOpacity
                onPress={() => setShowPaymentModal(false)}
                style={styles.paymentModalCloseButton}
              >
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.paymentModalDescription}>
              Select a payment method to complete the sale:
            </Text>

            <View style={styles.paymentOptionsContainer}>
              <TouchableOpacity
                style={styles.paymentOption}
                onPress={() => {
                  setShowPaymentModal(false);
                  processSale('cash');
                }}
                disabled={loading}
              >
                <View
                  style={[
                    styles.paymentOptionIcon,
                    { backgroundColor: '#ECFDF5' },
                  ]}
                >
                  <Text style={{ fontSize: 24 }}>💵</Text>
                </View>
                <View style={styles.paymentOptionContent}>
                  <Text style={styles.paymentOptionTitle}>Cash</Text>
                  <Text style={styles.paymentOptionDescription}>
                    Complete sale with cash payment
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.paymentOption}
                onPress={() => {
                  setShowPaymentModal(false);
                  processSale('card');
                }}
                disabled={loading}
              >
                <View
                  style={[
                    styles.paymentOptionIcon,
                    { backgroundColor: '#EFF6FF' },
                  ]}
                >
                  <Text style={{ fontSize: 24 }}>💳</Text>
                </View>
                <View style={styles.paymentOptionContent}>
                  <Text style={styles.paymentOptionTitle}>Card</Text>
                  <Text style={styles.paymentOptionDescription}>
                    Complete sale with credit/debit card
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.paymentOption}
                onPress={() => {
                  setShowPaymentModal(false);
                  processSale('mobile');
                }}
                disabled={loading}
              >
                <View
                  style={[
                    styles.paymentOptionIcon,
                    { backgroundColor: '#F0F9FF' },
                  ]}
                >
                  <Text style={{ fontSize: 24 }}>📱</Text>
                </View>
                <View style={styles.paymentOptionContent}>
                  <Text style={styles.paymentOptionTitle}>Mobile Payment</Text>
                  <Text style={styles.paymentOptionDescription}>
                    Complete sale with mobile payment apps
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {loading && (
              <View style={styles.processingIndicator}>
                <ActivityIndicator size="small" color="#059669" />
                <Text style={styles.processingText}>Processing sale...</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.paymentModalCancelButton}
              onPress={() => setShowPaymentModal(false)}
              disabled={loading}
            >
              <Text style={styles.paymentModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  if (!isReady) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sales</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => setShowHistory(true)}
          >
            <History size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => setShowScanner(true)}
          >
            <Scan size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {/* Enhanced Shopping Cart */}
        <Card style={styles.cartCard}>
          <View style={styles.cartHeader}>
            <View style={styles.cartTitleContainer}>
              <ShoppingCart size={20} color="#059669" />
              <Text style={styles.cartTitle}>Shopping Cart</Text>
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cart.length}</Text>
              </View>
            </View>
            <Text style={styles.cartTotal}>{formatMMK(total)}</Text>
          </View>

          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <ShoppingCart size={isSmallScreen ? 32 : 48} color="#9CA3AF" />
              <Text style={styles.emptyCartText}>Cart is empty</Text>
              <Text style={styles.emptyCartSubtext}>
                Add products to start a sale
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.cartItems}
              showsVerticalScrollIndicator={false}
            >
              {cart.map((item) => (
                <View key={item.product.id} style={styles.cartItem}>
                  <View style={styles.cartItemInfo}>
                    <Text
                      style={styles.cartItemName}
                      numberOfLines={isSmallScreen ? 1 : 2}
                    >
                      {item.product.name}
                    </Text>
                    <Text style={styles.cartItemPrice}>
                      {formatMMK(item.product.price)} each
                    </Text>
                  </View>

                  <View style={styles.cartItemActions}>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() =>
                          updateQuantity(item.product.id, item.quantity - 1)
                        }
                      >
                        <Minus size={isSmallScreen ? 12 : 16} color="#6B7280" />
                      </TouchableOpacity>

                      <Text style={styles.quantity}>{item.quantity}</Text>

                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() =>
                          updateQuantity(item.product.id, item.quantity + 1)
                        }
                      >
                        <Plus size={isSmallScreen ? 12 : 16} color="#6B7280" />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeFromCart(item.product.id)}
                    >
                      <Trash2 size={isSmallScreen ? 14 : 16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.cartItemSubtotalContainer}>
                    <Text style={styles.cartItemSubtotal}>
                      {formatMMK(item.subtotal)}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.cartActions}>
            <Button
              title="Add Product"
              onPress={() => setShowProductDialog(true)}
              variant="secondary"
              style={styles.cartActionButton}
            />
            <Button
              title="Process Sale"
              onPress={handlePayment}
              disabled={cart.length === 0 || loading}
              style={styles.cartActionButton}
            />
          </View>
        </Card>
      </View>

      {/* Enhanced Product Selection Dialog */}
      <Modal
        visible={showProductDialog}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProductDialog(false)}
      >
        <SafeAreaView style={styles.dialogContainer}>
          <View style={styles.dialogHeader}>
            <Text style={styles.dialogTitle}>Add Products</Text>
            <TouchableOpacity
              style={styles.dialogCloseButton}
              onPress={() => setShowProductDialog(false)}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.dialogContent}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search products..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Enhanced Category Filter */}
            <View style={styles.categoryFilterContainer}>
              <View style={styles.categoryFilterHeader}>
                <Filter size={16} color="#6B7280" />
                <Text style={styles.categoryFilterTitle}>
                  Filter by Category
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryFilter}
              >
                <TouchableOpacity
                  style={[
                    styles.categoryFilterChip,
                    selectedCategory === 'All' &&
                      styles.categoryFilterChipActive,
                  ]}
                  onPress={() => setSelectedCategory('All')}
                >
                  <Text
                    style={[
                      styles.categoryFilterText,
                      selectedCategory === 'All' &&
                        styles.categoryFilterTextActive,
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
                        styles.categoryFilterChip,
                        selectedCategory === category.name &&
                          styles.categoryFilterChipActive,
                      ]}
                      onPress={() => setSelectedCategory(category.name)}
                    >
                      <Text
                        style={[
                          styles.categoryFilterText,
                          selectedCategory === category.name &&
                            styles.categoryFilterTextActive,
                        ]}
                      >
                        {category.name} ({categoryCount})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Products List */}
            <ScrollView
              style={styles.dialogProductsList}
              showsVerticalScrollIndicator={false}
            >
              {filteredProducts.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={[
                    styles.dialogProductItem,
                    product.quantity <= 0 && styles.dialogProductItemDisabled,
                  ]}
                  onPress={() => addToCart(product)}
                  disabled={product.quantity <= 0}
                >
                  <View style={styles.dialogProductInfo}>
                    <Text
                      style={[
                        styles.dialogProductName,
                        product.quantity <= 0 &&
                          styles.dialogProductNameDisabled,
                      ]}
                    >
                      {product.name}
                    </Text>
                    <Text style={styles.dialogProductCategory}>
                      {product.category}
                    </Text>
                    <Text
                      style={[
                        styles.dialogProductStock,
                        product.quantity <= 0
                          ? styles.outOfStock
                          : product.quantity <= product.min_stock
                          ? styles.lowStock
                          : styles.inStock,
                      ]}
                    >
                      Stock: {product.quantity}
                      {product.quantity <= product.min_stock &&
                        product.quantity > 0 &&
                        ' (Low)'}
                      {product.quantity <= 0 && ' (Out)'}
                    </Text>
                  </View>
                  <View style={styles.dialogProductPriceContainer}>
                    <Text
                      style={[
                        styles.dialogProductPrice,
                        product.quantity <= 0 &&
                          styles.dialogProductPriceDisabled,
                      ]}
                    >
                      {formatMMK(product.price)}
                    </Text>
                    {product.quantity > 0 && (
                      <View style={styles.addToCartIndicator}>
                        <Plus size={16} color="#10B981" />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              {filteredProducts.length === 0 && (
                <View style={styles.emptyProductsState}>
                  <Text style={styles.emptyProductsText}>
                    No products found
                  </Text>
                  <Text style={styles.emptyProductsSubtext}>
                    {searchQuery || selectedCategory !== 'All'
                      ? 'Try adjusting your search or category filter'
                      : 'No products available'}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {showScanner && (
        <BarcodeScanner
          onBarcodeScanned={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showHistory && <SalesHistory onClose={() => setShowHistory(false)} />}

      {renderPaymentMethodModal()}
    </SafeAreaView>
  );
}

// Enhanced Sales History Component with Sale Details and Mobile Export
const SalesHistory: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { db } = useDatabase();
  const [sales, setSales] = useState<any[]>([]);
  const [filteredSales, setFilteredSales] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [showSaleDetail, setShowSaleDetail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [allSaleItems, setAllSaleItems] = useState<any[]>([]);
  const [loadingAllItems, setLoadingAllItems] = useState(false);

  const formatMMK = (amount: number) => {
    return (
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount) + ' MMK'
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateOnly = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const loadSales = async () => {
    if (!db) return;

    try {
      setLoading(true);
      const salesData = await db.getSales(500);
      setSales(salesData);
      setFilteredSales(salesData);
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSaleItems = async (saleId: number) => {
    if (!db) return;

    try {
      const items = await db.getSaleItems(saleId);
      setSaleItems(items);
    } catch (error) {
      console.error('Error loading sale items:', error);
    }
  };

  const handleSalePress = async (sale: any) => {
    setSelectedSale(sale);
    await loadSaleItems(sale.id);
    setShowSaleDetail(true);
  };

  useEffect(() => {
    loadSales();
  }, [db]);

  useEffect(() => {
    let filtered = sales;

    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter((sale) => {
            const saleDate = new Date(sale.created_at);
            saleDate.setHours(0, 0, 0, 0);
            return saleDate.getTime() === filterDate.getTime();
          });
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(
            (sale) => new Date(sale.created_at) >= filterDate
          );
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(
            (sale) => new Date(sale.created_at) >= filterDate
          );
          break;
        case 'custom':
          const customDate = new Date(selectedDate);
          customDate.setHours(0, 0, 0, 0);
          const nextDay = new Date(customDate);
          nextDay.setDate(customDate.getDate() + 1);

          filtered = filtered.filter((sale) => {
            const saleDate = new Date(sale.created_at);
            return saleDate >= customDate && saleDate < nextDay;
          });
          break;
      }
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (sale) =>
          sale.id.toString().includes(searchQuery) ||
          sale.payment_method.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredSales(filtered);
  }, [sales, dateFilter, searchQuery, selectedDate]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setSelectedDate(selectedDate);
      setDateFilter('custom');
    }
  };

  // New function to load all sale items for the filtered sales
  const loadAllSaleItems = async () => {
    if (!db || filteredSales.length === 0) return [];

    setLoadingAllItems(true);
    try {
      const allItems: any[] = [];

      for (const sale of filteredSales) {
        const items = await db.getSaleItems(sale.id);
        // Add sale information to each item
        const itemsWithSaleInfo = items.map((item) => ({
          ...item,
          sale_date: sale.created_at,
          payment_method: sale.payment_method,
          sale_id: sale.id,
        }));
        allItems.push(...itemsWithSaleInfo);
      }

      setAllSaleItems(allItems);
      return allItems;
    } catch (error) {
      console.error('Error loading all sale items:', error);
      Alert.alert('Error', 'Failed to load sale items data');
      return [];
    } finally {
      setLoadingAllItems(false);
    }
  };

  // Show export options modal
  const showExportOptions = async () => {
    if (filteredSales.length === 0) {
      Alert.alert('No Data', 'No sales data to export');
      return;
    }

    setShowExportModal(true);
  };

  // Export sales list data (original functionality)
  const exportSalesList = async () => {
    try {
      setExporting(true);

      // For mobile platforms
      if (Platform.OS !== 'web') {
        // Prepare data for Excel export
        const excelData = filteredSales.map((sale) => ({
          'Sale ID': sale.id,
          Date: formatDate(sale.created_at),
          'Payment Method': sale.payment_method.toUpperCase(),
          'Total Amount': sale.total,
        }));

        // Add summary data
        const totalRevenue = filteredSales.reduce(
          (sum, sale) => sum + sale.total,
          0
        );
        const totalSales = filteredSales.length;
        const avgSale = totalSales > 0 ? totalRevenue / totalSales : 0;

        excelData.push({
          'Sale ID': '',
          Date: '',
          'Payment Method': '',
          'Total Amount': '',
        });
        excelData.push({
          'Sale ID': 'SUMMARY',
          Date: '',
          'Payment Method': '',
          'Total Amount': '',
        });
        excelData.push({
          'Sale ID': 'Total Sales',
          Date: totalSales.toString(),
          'Payment Method': '',
          'Total Amount': '',
        });
        excelData.push({
          'Sale ID': 'Total Revenue',
          Date: '',
          'Payment Method': '',
          'Total Amount': totalRevenue,
        });
        excelData.push({
          'Sale ID': 'Average Sale',
          Date: '',
          'Payment Method': '',
          'Total Amount': avgSale,
        });

        // Create worksheet and workbook
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sales List');

        // Generate filename
        let filename = 'sales_list';
        if (dateFilter === 'custom') {
          filename += `_${selectedDate.toISOString().split('T')[0]}`;
        } else if (dateFilter !== 'all') {
          filename += `_${dateFilter}`;
        }
        filename += '.xlsx';

        // Convert to binary string
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

        // Save file to device's cache directory
        const filePath = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(filePath, wbout, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Share the file
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filePath);
        } else {
          Alert.alert(
            'Sharing not available',
            'Sharing is not available on this device'
          );
        }
        return;
      }

      // Web export functionality (unchanged)
      const excelData = filteredSales.map((sale) => ({
        'Sale ID': sale.id,
        Date: formatDate(sale.created_at),
        'Total Amount': sale.total,
        'Total Amount (MMK)': formatMMK(sale.total),
        'Payment Method': sale.payment_method.toUpperCase(),
        Day: formatDateOnly(sale.created_at),
      }));

      // ... existing web export code ...
      const totalRevenue = filteredSales.reduce(
        (sum, sale) => sum + sale.total,
        0
      );
      const totalSales = filteredSales.length;
      const avgSale = totalSales > 0 ? totalRevenue / totalSales : 0;

      excelData.push({});
      excelData.push({
        'Sale ID': 'SUMMARY',
        Date: '',
        'Total Amount': '',
        'Total Amount (MMK)': '',
        'Payment Method': '',
        Day: '',
      });
      excelData.push({
        'Sale ID': 'Total Sales',
        Date: totalSales.toString(),
        'Total Amount': '',
        'Total Amount (MMK)': '',
        'Payment Method': '',
        Day: '',
      });
      excelData.push({
        'Sale ID': 'Total Revenue',
        Date: formatMMK(totalRevenue),
        'Total Amount': totalRevenue,
        'Total Amount (MMK)': '',
        'Payment Method': '',
        Day: '',
      });
      excelData.push({
        'Sale ID': 'Average Sale',
        Date: formatMMK(avgSale),
        'Total Amount': avgSale,
        'Total Amount (MMK)': '',
        'Payment Method': '',
        Day: '',
      });

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sales History');

      let filename = 'sales_history';
      if (dateFilter === 'custom') {
        filename += `_${selectedDate.toISOString().split('T')[0]}`;
      } else if (dateFilter !== 'all') {
        filename += `_${dateFilter}`;
      }
      filename += '.xlsx';

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      Alert.alert('Success', 'Sales data exported successfully!');
    } catch (error) {
      console.error('Error exporting sales list:', error);
      Alert.alert('Error', 'Failed to export sales data');
    } finally {
      setExporting(false);
      setShowExportModal(false);
    }
  };

  // Export sales items data (new functionality)
  const exportSalesItemsData = async () => {
    try {
      setExporting(true);

      // Load all sale items if not already loaded
      let items = allSaleItems;
      if (items.length === 0) {
        items = await loadAllSaleItems();
      }

      if (items.length === 0) {
        Alert.alert('No Data', 'No sales items data to export');
        setExporting(false);
        setShowExportModal(false);
        return;
      }

      // For mobile platforms
      if (Platform.OS !== 'web') {
        // Prepare data for Excel export
        const excelData = items.map((item) => ({
          'Sale ID': item.sale_id,
          Date: formatDate(item.sale_date),
          Product: item.product_name,
          Quantity: item.quantity,
          'Sale Price': item.price,
          'Cost Price': item.cost || 0, // Assuming cost is available or default to 0
          Subtotal: item.subtotal,
          Profit: item.subtotal - (item.cost || 0) * item.quantity,
        }));

        // Add summary data
        const totalQuantity = items.reduce(
          (sum, item) => sum + item.quantity,
          0
        );
        const totalSales = items.reduce((sum, item) => sum + item.subtotal, 0);
        const totalCost = items.reduce(
          (sum, item) => sum + (item.cost || 0) * item.quantity,
          0
        );
        const totalProfit = totalSales - totalCost;

        excelData.push({});
        excelData.push({
          'Sale ID': 'SUMMARY',
          Date: '',
          Product: '',
          Quantity: '',
          'Sale Price': '',
          'Cost Price': '',
          Subtotal: '',
          Profit: '',
        });
        excelData.push({
          'Sale ID': 'Total Items',
          Date: '',
          Product: '',
          Quantity: totalQuantity,
          'Sale Price': '',
          'Cost Price': '',
          Subtotal: '',
          Profit: '',
        });
        excelData.push({
          'Sale ID': 'Total Sales',
          Date: '',
          Product: '',
          Quantity: '',
          'Sale Price': '',
          'Cost Price': '',
          Subtotal: totalSales,
          Profit: '',
        });
        excelData.push({
          'Sale ID': 'Total Cost',
          Date: '',
          Product: '',
          Quantity: '',
          'Sale Price': '',
          'Cost Price': '',
          Subtotal: '',
          Profit: totalCost,
        });
        excelData.push({
          'Sale ID': 'Total Profit',
          Date: '',
          Product: '',
          Quantity: '',
          'Sale Price': '',
          'Cost Price': '',
          Subtotal: '',
          Profit: totalProfit,
        });

        // Create worksheet and workbook
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sales Items');

        // Generate filename
        let filename = 'sales_items';
        if (dateFilter === 'custom') {
          filename += `_${selectedDate.toISOString().split('T')[0]}`;
        } else if (dateFilter !== 'all') {
          filename += `_${dateFilter}`;
        }
        filename += '.xlsx';

        // Convert to binary string
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

        // Save file to device's cache directory
        const filePath = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(filePath, wbout, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Share the file
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filePath);
        } else {
          Alert.alert(
            'Sharing not available',
            'Sharing is not available on this device'
          );
        }
        return;
      }

      // Web export functionality
      const excelData = items.map((item) => ({
        'Sale ID': item.sale_id,
        Date: formatDate(item.sale_date),
        Product: item.product_name,
        Quantity: item.quantity,
        'Sale Price': item.price,
        'Sale Price (MMK)': formatMMK(item.price),
        'Cost Price': item.cost || 0,
        'Cost Price (MMK)': formatMMK(item.cost || 0),
        Subtotal: item.subtotal,
        'Subtotal (MMK)': formatMMK(item.subtotal),
        Profit: item.subtotal - (item.cost || 0) * item.quantity,
        'Profit (MMK)': formatMMK(
          item.subtotal - (item.cost || 0) * item.quantity
        ),
      }));

      // Add summary data
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      const totalSales = items.reduce((sum, item) => sum + item.subtotal, 0);
      const totalCost = items.reduce(
        (sum, item) => sum + (item.cost || 0) * item.quantity,
        0
      );
      const totalProfit = totalSales - totalCost;

      excelData.push({});
      excelData.push({
        'Sale ID': 'SUMMARY',
        Date: '',
        Product: '',
        Quantity: '',
        'Sale Price': '',
        'Sale Price (MMK)': '',
        'Cost Price': '',
        'Cost Price (MMK)': '',
        Subtotal: '',
        'Subtotal (MMK)': '',
        Profit: '',
        'Profit (MMK)': '',
      });
      excelData.push({
        'Sale ID': 'Total Items',
        Date: '',
        Product: '',
        Quantity: totalQuantity,
        'Sale Price': '',
        'Sale Price (MMK)': '',
        'Cost Price': '',
        'Cost Price (MMK)': '',
        Subtotal: '',
        'Subtotal (MMK)': '',
        Profit: '',
        'Profit (MMK)': '',
      });
      excelData.push({
        'Sale ID': 'Total Sales',
        Date: '',
        Product: '',
        Quantity: '',
        'Sale Price': '',
        'Sale Price (MMK)': '',
        'Cost Price': '',
        'Cost Price (MMK)': '',
        Subtotal: totalSales,
        'Subtotal (MMK)': formatMMK(totalSales),
        Profit: '',
        'Profit (MMK)': '',
      });
      excelData.push({
        'Sale ID': 'Total Cost',
        Date: '',
        Product: '',
        Quantity: '',
        'Sale Price': '',
        'Sale Price (MMK)': '',
        'Cost Price': '',
        'Cost Price (MMK)': '',
        Subtotal: '',
        'Subtotal (MMK)': '',
        Profit: totalCost,
        'Profit (MMK)': formatMMK(totalCost),
      });
      excelData.push({
        'Sale ID': 'Total Profit',
        Date: '',
        Product: '',
        Quantity: '',
        'Sale Price': '',
        'Sale Price (MMK)': '',
        'Cost Price': '',
        'Cost Price (MMK)': '',
        Subtotal: '',
        'Subtotal (MMK)': '',
        Profit: totalProfit,
        'Profit (MMK)': formatMMK(totalProfit),
      });

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sales Items');

      let filename = 'sales_items';
      if (dateFilter === 'custom') {
        filename += `_${selectedDate.toISOString().split('T')[0]}`;
      } else if (dateFilter !== 'all') {
        filename += `_${dateFilter}`;
      }
      filename += '.xlsx';

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      Alert.alert('Success', 'Sales items data exported successfully!');
    } catch (error) {
      console.error('Error exporting sales items data:', error);
      Alert.alert('Error', 'Failed to export sales items data');
    } finally {
      setExporting(false);
      setShowExportModal(false);
    }
  };

  // Replace the original exportToExcel function with showExportOptions
  const exportToExcel = showExportOptions;

  return (
    <Modal visible={true} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Sales History</Text>
          <View style={styles.modalHeaderActions}>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={exportToExcel}
              disabled={exporting || filteredSales.length === 0}
            >
              <Download size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Export Options Modal */}
        <Modal
          visible={showExportModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowExportModal(false)}
        >
          <View style={styles.exportModalOverlay}>
            <View style={styles.exportModalContainer}>
              <View style={styles.exportModalHeader}>
                <Text style={styles.exportModalTitle}>Export Options</Text>
                <TouchableOpacity
                  onPress={() => setShowExportModal(false)}
                  style={styles.exportModalCloseButton}
                >
                  <X size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <Text style={styles.exportModalDescription}>
                Choose what data you want to export:
              </Text>

              <View style={styles.exportOptionsContainer}>
                <TouchableOpacity
                  style={styles.exportOption}
                  onPress={exportSalesList}
                  disabled={exporting}
                >
                  <View style={styles.exportOptionIcon}>
                    <FileText size={24} color="#059669" />
                  </View>
                  <View style={styles.exportOptionContent}>
                    <Text style={styles.exportOptionTitle}>Sales List</Text>
                    <Text style={styles.exportOptionDescription}>
                      Export summary of sales with date, payment method, and
                      total amount
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.exportOption}
                  onPress={exportSalesItemsData}
                  disabled={exporting}
                >
                  <View style={styles.exportOptionIcon}>
                    <FileSpreadsheet size={24} color="#0284C7" />
                  </View>
                  <View style={styles.exportOptionContent}>
                    <Text style={styles.exportOptionTitle}>
                      Sales Items Data
                    </Text>
                    <Text style={styles.exportOptionDescription}>
                      Export detailed list of individual sale items with product
                      name, quantity, price, and profit
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {exporting && (
                <View style={styles.exportingIndicator}>
                  <ActivityIndicator size="small" color="#059669" />
                  <Text style={styles.exportingText}>Preparing export...</Text>
                </View>
              )}

              {loadingAllItems && (
                <View style={styles.exportingIndicator}>
                  <ActivityIndicator size="small" color="#059669" />
                  <Text style={styles.exportingText}>
                    Loading sales items data...
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.exportModalCancelButton}
                onPress={() => setShowExportModal(false)}
                disabled={exporting || loadingAllItems}
              >
                <Text style={styles.exportModalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <View style={styles.filtersContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by sale ID or payment method..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dateFilters}
          >
            {[
              { key: 'all', label: 'All' },
              { key: 'today', label: 'Today' },
              { key: 'week', label: 'This Week' },
              { key: 'month', label: 'This Month' },
              { key: 'custom', label: 'Select Date' },
            ].map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.dateFilterChip,
                  dateFilter === filter.key && styles.dateFilterChipActive,
                ]}
                onPress={() => {
                  if (filter.key === 'custom') {
                    setShowDatePicker(true);
                  } else {
                    setDateFilter(filter.key);
                  }
                }}
              >
                <Text
                  style={[
                    styles.dateFilterText,
                    dateFilter === filter.key && styles.dateFilterTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {dateFilter === 'custom' && (
            <View style={styles.customDateContainer}>
              <TouchableOpacity
                style={styles.customDateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Calendar size={16} color="#6B7280" />
                <Text style={styles.customDateText}>
                  {selectedDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>
              {filteredSales.length} sales • Total:{' '}
              {formatMMK(
                filteredSales.reduce((sum, sale) => sum + sale.total, 0)
              )}
            </Text>
          </View>
        </View>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <ScrollView style={styles.salesList}>
            {filteredSales.map((sale) => (
              <TouchableOpacity
                key={sale.id}
                onPress={() => handleSalePress(sale)}
              >
                <Card style={styles.saleCard}>
                  <View style={styles.saleHeader}>
                    <View style={styles.saleInfo}>
                      <Text style={styles.saleId}>Sale #{sale.id}</Text>
                      <Text style={styles.saleDate}>
                        {formatDate(sale.created_at)}
                      </Text>
                      <Text style={styles.salePayment}>
                        Payment: {sale.payment_method.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.saleAmountContainer}>
                      <Text style={styles.saleTotal}>
                        {formatMMK(sale.total)}
                      </Text>
                      <Eye size={16} color="#6B7280" />
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}

            {filteredSales.length === 0 && (
              <View style={styles.emptyState}>
                <History size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>No sales found</Text>
                <Text style={styles.emptyStateSubtext}>
                  {searchQuery || dateFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'No sales have been made yet'}
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Sale Detail Modal */}
        <Modal
          visible={showSaleDetail}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowSaleDetail(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sale Details</Text>
              <TouchableOpacity onPress={() => setShowSaleDetail(false)}>
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
            </View>

            {selectedSale && (
              <ScrollView style={styles.saleDetailContent}>
                <Card style={styles.saleDetailCard}>
                  <Text style={styles.saleDetailTitle}>Sale Information</Text>
                  <View style={styles.saleDetailRow}>
                    <Text style={styles.saleDetailLabel}>Sale ID:</Text>
                    <Text style={styles.saleDetailValue}>
                      #{selectedSale.id}
                    </Text>
                  </View>
                  <View style={styles.saleDetailRow}>
                    <Text style={styles.saleDetailLabel}>Date:</Text>
                    <Text style={styles.saleDetailValue}>
                      {formatDate(selectedSale.created_at)}
                    </Text>
                  </View>
                  <View style={styles.saleDetailRow}>
                    <Text style={styles.saleDetailLabel}>Payment Method:</Text>
                    <Text style={styles.saleDetailValue}>
                      {selectedSale.payment_method.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.saleDetailRow}>
                    <Text style={styles.saleDetailLabel}>Total Amount:</Text>
                    <Text
                      style={[styles.saleDetailValue, styles.saleDetailTotal]}
                    >
                      {formatMMK(selectedSale.total)}
                    </Text>
                  </View>
                </Card>

                <Card style={styles.saleDetailCard}>
                  <Text style={styles.saleDetailTitle}>Items Purchased</Text>
                  {saleItems.map((item, index) => (
                    <View key={index} style={styles.saleItemRow}>
                      <View style={styles.saleItemInfo}>
                        <Text style={styles.saleItemName}>
                          {item.product_name}
                        </Text>
                        <Text style={styles.saleItemDetails}>
                          {item.quantity} × {formatMMK(item.price)}
                        </Text>
                      </View>
                      <Text style={styles.saleItemSubtotal}>
                        {formatMMK(item.subtotal)}
                      </Text>
                    </View>
                  ))}

                  <View style={styles.saleItemsTotal}>
                    <Text style={styles.saleItemsTotalLabel}>
                      Total Items: {saleItems.length}
                    </Text>
                    <Text style={styles.saleItemsTotalValue}>
                      {formatMMK(selectedSale.total)}
                    </Text>
                  </View>
                </Card>
              </ScrollView>
            )}
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  paymentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  paymentModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  paymentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  paymentModalCloseButton: {
    padding: 4,
  },
  paymentModalDescription: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 20,
  },
  paymentOptionsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  paymentOption: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paymentOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  paymentOptionContent: {
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  paymentOptionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  processingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  processingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#059669',
  },
  paymentModalCancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  paymentModalCancelText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  exportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  exportModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  exportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exportModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  exportModalCloseButton: {
    padding: 4,
  },
  exportModalDescription: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 20,
  },
  exportOptionsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  exportOption: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  exportOptionIcon: {
    marginRight: 16,
    justifyContent: 'center',
  },
  exportOptionContent: {
    flex: 1,
  },
  exportOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  exportOptionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  exportingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  exportingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#059669',
  },
  exportModalCancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  exportModalCancelText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  historyButton: {
    backgroundColor: '#F3F4F6',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scanButton: {
    backgroundColor: '#059669',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  cartCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: isSmallScreen ? 16 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cartTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cartTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginLeft: 8,
  },
  cartBadge: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  cartBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  cartTotal: {
    fontSize: isSmallScreen ? 18 : 22,
    fontFamily: 'Inter-Bold',
    color: '#059669',
  },
  emptyCart: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isSmallScreen ? 32 : 48,
  },
  emptyCartText: {
    fontSize: isSmallScreen ? 16 : 18,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyCartSubtext: {
    fontSize: isSmallScreen ? 12 : 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 8,
  },
  cartItems: {
    flex: 1,
    maxHeight: isSmallScreen ? 200 : 300,
  },
  cartItem: {
    flexDirection: isSmallScreen ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isSmallScreen ? 'stretch' : 'center',
    paddingVertical: isSmallScreen ? 8 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cartItemInfo: {
    flex: 1,
    marginBottom: isSmallScreen ? 8 : 0,
  },
  cartItemName: {
    fontSize: isSmallScreen ? 14 : 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  cartItemPrice: {
    fontSize: isSmallScreen ? 12 : 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: isSmallScreen ? 'space-between' : 'flex-end',
    marginBottom: isSmallScreen ? 8 : 0,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: isSmallScreen ? 28 : 32,
    height: isSmallScreen ? 28 : 32,
    borderRadius: isSmallScreen ? 14 : 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantity: {
    fontSize: isSmallScreen ? 14 : 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginHorizontal: isSmallScreen ? 8 : 12,
    minWidth: isSmallScreen ? 20 : 30,
    textAlign: 'center',
  },
  removeButton: {
    padding: isSmallScreen ? 6 : 8,
    marginLeft: isSmallScreen ? 8 : 12,
  },
  cartItemSubtotalContainer: {
    alignItems: isSmallScreen ? 'flex-end' : 'center',
  },
  cartItemSubtotal: {
    fontSize: isSmallScreen ? 14 : 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  cartActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  cartActionButton: {
    flex: 1,
  },
  dialogContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dialogTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  dialogCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogContent: {
    flex: 1,
    padding: 20,
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  categoryFilterContainer: {
    marginBottom: 20,
  },
  categoryFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryFilterTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginLeft: 6,
  },
  categoryFilter: {
    flexDirection: 'row',
  },
  categoryFilterChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryFilterChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  categoryFilterText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  categoryFilterTextActive: {
    color: '#FFFFFF',
  },
  dialogProductsList: {
    flex: 1,
  },
  dialogProductItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dialogProductItemDisabled: {
    opacity: 0.5,
    backgroundColor: '#F9FAFB',
  },
  dialogProductInfo: {
    flex: 1,
  },
  dialogProductName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  dialogProductNameDisabled: {
    color: '#9CA3AF',
  },
  dialogProductCategory: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  dialogProductStock: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  inStock: {
    color: '#10B981',
  },
  lowStock: {
    color: '#F59E0B',
  },
  outOfStock: {
    color: '#EF4444',
    fontFamily: 'Inter-SemiBold',
  },
  dialogProductPriceContainer: {
    alignItems: 'flex-end',
  },
  dialogProductPrice: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  dialogProductPriceDisabled: {
    color: '#9CA3AF',
  },
  addToCartIndicator: {
    marginTop: 4,
    padding: 4,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
  },
  emptyProductsState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyProductsText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  emptyProductsSubtext: {
    fontSize: 14,
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
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exportButton: {
    backgroundColor: '#10B981',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  filtersContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dateFilters: {
    flexDirection: 'row',
    marginTop: 12,
  },
  dateFilterChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  dateFilterChipActive: {
    backgroundColor: '#10B981',
  },
  dateFilterText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  dateFilterTextActive: {
    color: '#FFFFFF',
  },
  customDateContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  customDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  customDateText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginLeft: 8,
  },
  summaryContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  summaryText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    textAlign: 'center',
  },
  salesList: {
    flex: 1,
    padding: 16,
  },
  saleCard: {
    marginBottom: 12,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saleInfo: {
    flex: 1,
  },
  saleId: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  saleDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  salePayment: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 2,
  },
  saleAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saleTotal: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  saleDetailContent: {
    flex: 1,
    padding: 16,
  },
  saleDetailCard: {
    marginBottom: 16,
  },
  saleDetailTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  saleDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  saleDetailLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  saleDetailValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  saleDetailTotal: {
    color: '#10B981',
    fontSize: 18,
  },
  saleItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  saleItemInfo: {
    flex: 1,
  },
  saleItemName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  saleItemDetails: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  saleItemSubtotal: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  saleItemsTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  saleItemsTotalLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  saleItemsTotalValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
});
