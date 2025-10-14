import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  PixelRatio,
  Image,
  FlatList,
} from 'react-native';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  useProducts,
  useCategories,
  useSaleMutations,
  useSaleItems,
} from '@/hooks/useQueries';
import {
  useInfiniteSales,
  useInfiniteSalesByDateRange,
} from '@/hooks/useInfiniteQueries';
import { useDatabase } from '@/context/DatabaseContext';
import { Product, Category, Customer } from '@/services/database';
import { CustomerSelector } from '@/components/CustomerSelector';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
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
  Image as ImageIcon,
  Printer,
  List,
} from 'lucide-react-native';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/context/LocalizationContext';
import { PaymentModal } from '@/components/PaymentModal';
import { EnhancedPrintManager } from '@/components/EnhancedPrintManager';
import { BulkPricingIndicator } from '@/components/BulkPricingIndicator';
import {
  calculateBulkPrice,
  calculateCartTotalWithBulkPricing,
} from '@/utils/bulkPricingUtils';
import { SaleDateTimeSelector } from '@/components/SaleDateTimeSelector';
import { convertISOToDBFormat } from '@/utils/dateUtils';

interface CartItem {
  product: Product;
  quantity: number;
  discount: number; // Discount amount for this item
  subtotal: number; // (price * quantity) - discount
}

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 400;

export default function Sales() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { formatPrice } = useCurrencyFormatter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPrintManager, setShowPrintManager] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [saleDateTime, setSaleDateTime] = useState<Date>(new Date());
  const [showDateTimeSelector, setShowDateTimeSelector] = useState(false);

  // Use React Query for optimized data fetching
  const {
    data: products = [],
    isLoading: productsLoading,
    error: productsError,
  } = useProducts(true); // Include bulk pricing data

  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories();

  const { addSale } = useSaleMutations();

  useEffect(() => {
    // Calculate total considering both bulk pricing and manual discounts
    const cartTotals = getCartTotals();
    setTotal(cartTotals.bulkTotal);
  }, [cart]);

  // Helper function to get bulk price per unit for an item
  const getBulkPricePerUnit = (item: CartItem) => {
    const cartForBulkPricing = [
      {
        ...item.product,
        quantity: item.quantity,
      },
    ];
    const bulkPricingResult =
      calculateCartTotalWithBulkPricing(cartForBulkPricing);
    const bulkTotalPrice = bulkPricingResult.bulkTotal;
    return bulkTotalPrice / item.quantity;
  };

  const getCartTotals = () => {
    // Calculate totals with separate bulk and manual discounts
    let originalTotal = 0;
    let finalTotal = 0;
    let totalBulkSavings = 0;
    let totalManualSavings = 0;

    // Calculate bulk pricing first
    const cartForBulkPricing = cart.map((item) => ({
      ...item.product,
      quantity: item.quantity,
    }));
    const bulkPricingTotals =
      calculateCartTotalWithBulkPricing(cartForBulkPricing);

    // Create item breakdown with separate discounts
    const itemBreakdown = cart.map((item) => {
      const itemOriginal = item.product.price * item.quantity;

      // Find bulk pricing for this item
      const bulkItem = bulkPricingTotals.itemBreakdown.find(
        (breakdown) => breakdown.item.id === item.product.id
      );

      // Step 1: Calculate bulk discount
      const afterBulkPrice = bulkItem
        ? bulkItem.pricing.bulkPrice
        : itemOriginal;
      const bulkSavings = itemOriginal - afterBulkPrice;

      // Step 2: Manual discount is already applied in item.subtotal
      // item.subtotal = afterBulkPrice - item.discount
      const finalItemPrice = item.subtotal;
      const manualSavings = item.discount;

      const totalItemSavings = bulkSavings + manualSavings;

      originalTotal += itemOriginal;
      finalTotal += finalItemPrice;
      totalBulkSavings += bulkSavings;
      totalManualSavings += manualSavings;

      return {
        item: { ...item.product, quantity: item.quantity },
        pricing: {
          originalPrice: itemOriginal,
          bulkPrice: finalItemPrice,
          bulkSavings: bulkSavings,
          manualSavings: manualSavings,
          totalSavings: totalItemSavings,
          discountPercentage:
            totalItemSavings > 0 ? (totalItemSavings / itemOriginal) * 100 : 0,
          discountType: 'stacked', // Both bulk and manual
        },
      };
    });

    return {
      originalTotal,
      bulkTotal: finalTotal,
      totalSavings: totalBulkSavings + totalManualSavings,
      bulkSavings: totalBulkSavings,
      manualSavings: totalManualSavings,
      itemBreakdown,
    };
  };

  // Removed formatMMK function - now using standardized currency formatting

  const handleBarcodeScanned = async (barcode: string) => {
    try {
      const product = products.find((p) => p.barcode === barcode);
      if (product) {
        addToCart(product);
        setShowScanner(false);
        showToast(t('messages.addedToCart', { name: product.name }), 'success');
      } else {
        Alert.alert(
          t('sales.productNotFound'),
          t('sales.noProductFoundWithBarcode')
        );
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('sales.failedToFindProduct'));
      console.error('Error finding product by barcode:', error);
    }
  };

  const addToCart = (product: Product) => {
    if (product.quantity <= 0) {
      Alert.alert(t('common.error'), t('sales.outOfStock'));
      return;
    }

    const existingItem = cart.find((item) => item.product.id === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.quantity) {
        Alert.alert(t('common.error'), t('sales.notEnoughStock'));
        return;
      }

      const newQuantity = existingItem.quantity + 1;

      // Calculate bulk price for new quantity
      const cartForBulkPricing = [
        {
          ...product,
          quantity: newQuantity,
        },
      ];
      const bulkPricingResult =
        calculateCartTotalWithBulkPricing(cartForBulkPricing);
      const bulkTotalPrice = bulkPricingResult.bulkTotal;

      setCart(
        cart.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: newQuantity,
                subtotal: bulkTotalPrice - item.discount, // bulk_total - manual_discount
              }
            : item
        )
      );
    } else {
      // For new items, start with bulk price for quantity 1
      const cartForBulkPricing = [
        {
          ...product,
          quantity: 1,
        },
      ];
      const bulkPricingResult =
        calculateCartTotalWithBulkPricing(cartForBulkPricing);
      const bulkTotalPrice = bulkPricingResult.bulkTotal;

      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          discount: 0, // Default discount is 0
          subtotal: bulkTotalPrice, // Start with bulk price
        },
      ]);
    }

    setShowProductDialog(false);
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    const item = cart.find((item) => item.product.id === productId);
    if (!item) return;

    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQuantity > item.product.quantity) {
      Alert.alert(t('common.error'), t('sales.notEnoughStock'));
      return;
    }

    // Calculate bulk price for new quantity
    const cartForBulkPricing = [
      {
        ...item.product,
        quantity: newQuantity,
      },
    ];
    const bulkPricingResult =
      calculateCartTotalWithBulkPricing(cartForBulkPricing);
    const bulkTotalPrice = bulkPricingResult.bulkTotal;

    setCart(
      cart.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              quantity: newQuantity,
              subtotal: bulkTotalPrice - item.discount, // bulk_total - manual_discount
            }
          : item
      )
    );
  };

  const updateDiscount = (productId: string, newDiscount: number) => {
    const item = cart.find((item) => item.product.id === productId);
    if (!item) return;

    // Calculate bulk price for this item first
    const cartForBulkPricing = [
      {
        ...item.product,
        quantity: item.quantity,
      },
    ];
    const bulkPricingResult =
      calculateCartTotalWithBulkPricing(cartForBulkPricing);
    const bulkPrice = bulkPricingResult.bulkTotal;

    // Validate discount doesn't exceed bulk price (not original price)
    if (newDiscount > bulkPrice) {
      Alert.alert(t('common.error'), t('sales.discountTooHigh'));
      return;
    }

    if (newDiscount < 0) {
      Alert.alert(t('common.error'), t('sales.discountCannotBeNegative'));
      return;
    }

    setCart(
      cart.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              discount: newDiscount,
              // Note: subtotal will be recalculated in getCartTotals with stacked discounts
              subtotal: bulkPrice - newDiscount, // Apply manual discount to bulk price
            }
          : item
      )
    );
  };

  console.log(
    'saleda',
    saleDateTime,
    saleDateTime.toISOString(),
    convertISOToDBFormat(saleDateTime.toISOString())
  );

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    // Don't reset timestamp here - let it be handled by the component logic
  };

  const processSale = async (
    paymentMethod: string,
    note: string,
    shouldPrint: boolean
  ) => {
    if (cart.length === 0) return;

    try {
      setLoading(true);

      const cartTotals = getCartTotals();

      const saleData = {
        total: cartTotals.bulkTotal, // This is the final discounted total
        payment_method: paymentMethod,
        note: note || undefined,
        customer_id: selectedCustomer?.id || undefined,
        created_at: convertISOToDBFormat(
          showDateTimeSelector
            ? saleDateTime.toISOString()
            : new Date().toISOString()
        ), // Use current time unless datetime selector is open
      };

      const saleItems = cart.map((item) => {
        const itemPricing = cartTotals.itemBreakdown.find(
          (breakdown) => breakdown.item?.id === item.product.id
        );

        // Calculate bulk pricing for this item
        const cartForBulkPricing = [
          {
            ...item.product,
            quantity: item.quantity,
          },
        ];
        const bulkPricingResult =
          calculateCartTotalWithBulkPricing(cartForBulkPricing);
        const bulkSubtotal = bulkPricingResult.bulkTotal;
        const bulkUnitPrice = bulkSubtotal / item.quantity;

        // Final subtotal after manual discount
        const finalSubtotal = bulkSubtotal - item.discount;

        return {
          product_id: item.product.id,
          quantity: item.quantity,
          price: bulkUnitPrice, // Bulk unit price (not final price after manual discount)
          original_price: item.product.price,
          bulk_discount: itemPricing ? itemPricing.pricing.bulkSavings : 0, // Bulk discount amount
          cost: item.product.cost,
          discount: item.discount, // Manual discount amount
          subtotal: finalSubtotal, // Final subtotal after all discounts
        };
      });

      const result = await addSale.mutateAsync({ saleData, saleItems });

      showToast(t('sales.saleCompleted'), 'success');

      // Handle receipt printing if requested
      if (shouldPrint && result) {
        const printData = {
          saleId: result,
          items: cart,
          total,
          paymentMethod,
          note,
          date: new Date(),
        };

        setReceiptData(printData);
        setShowPrintManager(true);
      }

      clearCart();
      setShowPaymentModal(false);
      // Reset datetime state for next sale
      setSaleDateTime(new Date());
      setShowDateTimeSelector(false);
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error'));
      console.error('Error processing sale:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = () => {
    if (cart.length === 0) {
      Alert.alert(t('common.error'), t('sales.cartIsEmpty'));
      return;
    }

    setShowPaymentModal(true);
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode?.includes(searchQuery);

      const matchesCategory =
        selectedCategory === 'All' || product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  if (productsLoading || categoriesLoading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('sales.title')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => setShowHistory(true)}
          >
            <List size={20} color="#6B7280" />
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
              <Text style={styles.cartTitle}>{t('sales.shoppingCart')}</Text>
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cart.length}</Text>
              </View>
            </View>
            <View style={styles.cartHeaderRight}>
              <Text style={styles.cartTotal}>{formatPrice(total)}</Text>
            </View>
          </View>

          {/* Customer Selection */}
          <View style={styles.customerSection}>
            <Text style={styles.customerLabel}>{t('sales.customer')}</Text>
            <CustomerSelector
              selectedCustomer={selectedCustomer}
              onCustomerSelect={setSelectedCustomer}
              placeholder={t('sales.selectCustomerOptional')}
            />
          </View>

          {/* Bulk Pricing Summary */}
          {cart.length > 0 &&
            (() => {
              const cartTotals = getCartTotals();
              return cartTotals.totalSavings > 0 ? (
                <View style={styles.bulkPricingSummary}>
                  <View style={styles.savingsRow}>
                    <Text style={styles.savingsLabel}>
                      {t('sales.subtotal')}
                    </Text>
                    <Text style={styles.originalTotal}>
                      {formatPrice(cartTotals.originalTotal)}
                    </Text>
                  </View>
                  {cartTotals.bulkSavings > 0 && (
                    <View style={styles.savingsRow}>
                      <Text style={styles.savingsLabel}>
                        {t('bulkPricing.bulkDiscount')}
                      </Text>
                      <Text style={styles.savingsAmount}>
                        -{formatPrice(cartTotals.bulkSavings)}
                      </Text>
                    </View>
                  )}
                  {cartTotals.manualSavings > 0 && (
                    <View style={styles.savingsRow}>
                      <Text style={styles.savingsLabel}>
                        {t('sales.manualDiscount')}
                      </Text>
                      <Text style={styles.savingsAmount}>
                        -{formatPrice(cartTotals.manualSavings)}
                      </Text>
                    </View>
                  )}
                </View>
              ) : null;
            })()}

          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <ShoppingCart size={isSmallScreen ? 32 : 48} color="#9CA3AF" />
              <Text style={styles.emptyCartText}>{t('sales.cartEmpty')}</Text>
              <Text style={styles.emptyCartSubtext}>
                {t('sales.addProducts')}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.cartItems}
              showsVerticalScrollIndicator={false}
            >
              {cart.map((item) => (
                <View key={item.product.id} style={styles.cartItem}>
                  {/* Product Image and Info Section */}
                  <View style={styles.cartItemHeader}>
                    {item.product.imageUrl && (
                      <Image
                        source={{ uri: item.product.imageUrl }}
                        style={styles.cartItemImage}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.cartItemInfo}>
                      <Text style={styles.cartItemName} numberOfLines={2}>
                        {item.product.name}
                      </Text>
                      <Text style={styles.cartItemPrice}>
                        {formatPrice(getBulkPricePerUnit(item))}{' '}
                        {t('sales.each')}
                      </Text>
                      {item.discount > 0 && (
                        <Text style={styles.cartItemDiscount}>
                          {t('sales.discount')}: -{formatPrice(item.discount)}
                        </Text>
                      )}
                      <BulkPricingIndicator
                        product={item.product}
                        quantity={item.quantity}
                        onQuantityChange={(newQuantity) =>
                          updateQuantity(item.product.id, newQuantity)
                        }
                        compact={true}
                      />
                    </View>
                    <View style={styles.cartItemSubtotalContainer}>
                      <Text style={styles.cartItemSubtotal}>
                        {formatPrice(
                          getBulkPricePerUnit(item) * item.quantity -
                            item.discount
                        )}
                      </Text>
                    </View>
                  </View>

                  {/* Controls Section */}
                  <View style={styles.cartItemControls}>
                    <View style={styles.cartItemActions}>
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() =>
                            updateQuantity(item.product.id, item.quantity - 1)
                          }
                        >
                          <Minus size={16} color="#6B7280" />
                        </TouchableOpacity>

                        <Text style={styles.quantity}>{item.quantity}</Text>

                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() =>
                            updateQuantity(item.product.id, item.quantity + 1)
                          }
                        >
                          <Plus size={16} color="#6B7280" />
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeFromCart(item.product.id)}
                      >
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    {/* Discount Input Section */}
                    <View style={styles.cartItemDiscountSection}>
                      <Text style={styles.discountLabel}>
                        {t('sales.discount')}:
                      </Text>
                      <TextInput
                        style={styles.discountInput}
                        value={item.discount.toString()}
                        onChangeText={(text) => {
                          const discount = parseInt(text) || 0;
                          updateDiscount(item.product.id, discount);
                        }}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                      <Text style={styles.discountUnit}>
                        {formatPrice(0).replace('0', '').trim()}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.cartActions}>
            <Button
              title={t('sales.addProduct')}
              onPress={() => setShowProductDialog(true)}
              variant="secondary"
              style={styles.cartActionButton}
            />
            <Button
              title={t('sales.processSale')}
              onPress={handlePayment}
              disabled={cart.length === 0 || loading}
              style={styles.cartActionButton}
            />
          </View>
        </Card>
        <View style={styles.dateTimeSelectorContainer}>
          <TouchableOpacity
            style={styles.calendarIconButton}
            onPress={() => setShowDateTimeSelector(!showDateTimeSelector)}
            activeOpacity={0.7}
          >
            <Calendar
              size={20}
              color={showDateTimeSelector ? '#059669' : '#6B7280'}
            />
          </TouchableOpacity>

          {showDateTimeSelector && (
            <SaleDateTimeSelector
              selectedDateTime={saleDateTime}
              onDateTimeChange={setSaleDateTime}
              style={styles.saleDateTimeSelector}
            />
          )}
        </View>
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
            <Text style={styles.dialogTitle}>{t('sales.addProducts')}</Text>
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
                placeholder={t('sales.searchProducts')}
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
            </View>

            {/* Enhanced Category Filter */}
            <View style={styles.categoryFilterContainer}>
              <View style={styles.categoryFilterHeader}>
                <Filter size={16} color="#6B7280" />
                <Text style={styles.categoryFilterTitle}>
                  {t('sales.filterByCategory')}
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

            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.id}
              style={styles.dialogProductsList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item: product }) => (
                <TouchableOpacity
                  style={[
                    styles.dialogProductItem,
                    product.quantity <= 0 && styles.dialogProductItemDisabled,
                  ]}
                  onPress={() => addToCart(product)}
                  disabled={product.quantity <= 0}
                >
                  {product.imageUrl && (
                    <Image
                      source={{ uri: product.imageUrl }}
                      style={styles.dialogProductImage}
                      resizeMode="cover"
                    />
                  )}
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
                      {t('sales.stock')}: {product.quantity}
                      {product.quantity <= product.min_stock &&
                        product.quantity > 0 &&
                        ` ${t('sales.low')}`}
                      {product.quantity <= 0 && ` ${t('sales.out')}`}
                    </Text>
                    <BulkPricingIndicator
                      product={product}
                      quantity={1}
                      compact={true}
                      showUpsell={false}
                    />
                  </View>
                  <View style={styles.dialogProductPriceContainer}>
                    <Text
                      style={[
                        styles.dialogProductPrice,
                        product.quantity <= 0 &&
                          styles.dialogProductPriceDisabled,
                      ]}
                    >
                      {formatPrice(product.price)}
                    </Text>
                    {product.quantity > 0 && (
                      <View style={styles.addToCartIndicator}>
                        <Plus size={16} color="#10B981" />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyProductsState}>
                  <Text style={styles.emptyProductsText}>
                    {t('sales.noProductsFound')}
                  </Text>
                  <Text style={styles.emptyProductsSubtext}>
                    {searchQuery || selectedCategory !== 'All'
                      ? t('sales.adjustSearch')
                      : t('sales.noProductsAvailable')}
                  </Text>
                </View>
              }
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
            />
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

      <PaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirmSale={processSale}
        total={total}
        loading={loading}
      />

      {receiptData && (
        <EnhancedPrintManager
          visible={showPrintManager}
          onClose={() => {
            setShowPrintManager(false);
            setReceiptData(null);
          }}
          receiptData={receiptData}
        />
      )}
    </SafeAreaView>
  );
}

// Enhanced Sales History Component with Sale Details and Mobile Export
const SalesHistory: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [showSaleDetail, setShowSaleDetail] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [allSaleItems, setAllSaleItems] = useState<any[]>([]);
  const [loadingAllItems, setLoadingAllItems] = useState(false);
  const saleDetailRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [isCustomerVoucher, setIsCustomerVoucher] = useState(true);
  const [showPrintManager, setShowPrintManager] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const { formatPrice } = useCurrencyFormatter();

  // Removed second formatMMK function - now using standardized currency formatting

  const formatDate = (dateString: string) => {
    // Create a date object from the UTC timestamp
    const date = new Date(dateString);

    // Get the local timezone offset in minutes
    const localOffset = new Date().getTimezoneOffset();

    // Create a new date adjusted for the local timezone
    // Note: getTimezoneOffset() returns minutes, so we multiply by 60000 to convert to milliseconds
    const localDate = new Date(date.getTime() - localOffset * 60000);

    return localDate.toLocaleDateString('en-US', {
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

  // Helper function to generate descriptive filename with date range
  const generateFilename = (
    baseFilename: string,
    dateFilter: string,
    selectedDate: Date
  ) => {
    const now = new Date();
    const formatDateForFilename = (date: Date) => {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    };

    let filename = baseFilename;

    switch (dateFilter) {
      case 'today':
        filename += `_${formatDateForFilename(now)}`;
        break;
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        filename += `_${formatDateForFilename(
          monthStart
        )}_to_${formatDateForFilename(monthEnd)}`;
        break;
      case 'selectedMonth':
        const selectedMonthStart = new Date(selectedYear, selectedMonth, 1);
        const selectedMonthEnd = new Date(selectedYear, selectedMonth + 1, 0);
        filename += `_${formatDateForFilename(
          selectedMonthStart
        )}_to_${formatDateForFilename(selectedMonthEnd)}`;
        break;
      case 'custom':
        filename += `_${formatDateForFilename(selectedDate)}`;
        break;
      case 'all':
        filename += `_all_time_${formatDateForFilename(now)}`;
        break;
      default:
        filename += `_${formatDateForFilename(now)}`;
    }

    return filename + '.xlsx';
  };

  const calculateDateRange = (
    dateFilterType: string,
    selectedDate: Date
  ): [Date, Date] => {
    const now = new Date();
    const startDate = new Date();
    const endDate = new Date();

    switch (dateFilterType) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        // Current month from 1st to last day
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(now.getMonth() + 1, 0); // Last day of current month
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'selectedMonth':
        // Selected month and year
        startDate.setFullYear(selectedYear, selectedMonth, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setFullYear(selectedYear, selectedMonth + 1, 0); // Last day of selected month
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        const customDate = new Date(selectedDate);
        customDate.setHours(0, 0, 0, 0);
        startDate.setTime(customDate.getTime());
        endDate.setTime(customDate.getTime());
        endDate.setHours(23, 59, 59, 999);
        break;
      default: // 'all'
        // For 'all', set a very old start date and current date as end date
        startDate.setFullYear(startDate.getFullYear() - 10); // 10 years ago
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
    }

    return [startDate, endDate];
  };

  // Calculate date range for React Query
  const [startDate, endDate] = calculateDateRange(dateFilter, selectedDate);

  // Use React Query for sales data
  const {
    data: salesPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: salesLoading,
  } = dateFilter === 'all'
    ? useInfiniteSales()
    : useInfiniteSalesByDateRange(startDate, endDate);
  console.log('sale', salesPages);

  // Flatten the paginated data
  const sales = salesPages?.pages.flatMap((page) => page.data) || [];

  // Filter sales based on search query
  const filteredSales = sales.filter((sale) => {
    if (!searchQuery) return true;
    return (
      sale.id.includes(searchQuery) ||
      sale.payment_method.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Use React Query for sale items
  const { data: saleItems = [], isLoading: saleItemsLoading } = useSaleItems(
    selectedSale?.id || 0
  );

  // Use mutations and database context
  const { deleteSale } = useSaleMutations();
  const { db } = useDatabase();

  const loadMore = () => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  };

  const handleSalePress = (sale: any) => {
    setSelectedSale(sale);
    setShowSaleDetail(true);
  };

  // Reset allSaleItems when filters change
  useEffect(() => {
    setAllSaleItems([]);
  }, [dateFilter, searchQuery, selectedDate, selectedMonth, selectedYear]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setSelectedDate(selectedDate);
      setDateFilter('custom');
    }
  };

  // New function to load all sale items for the filtered sales
  const loadAllSaleItems = async () => {
    if (filteredSales.length === 0 || !db) return [];

    setLoadingAllItems(true);
    try {
      const allItems: any[] = [];

      for (const sale of filteredSales) {
        // Use the database directly for bulk operations during export
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

  // Function to prepare receipt data for printing
  const prepareReceiptData = () => {
    if (!selectedSale || !saleItems) return null;

    // Convert sale items to the format expected by EnhancedPrintManager
    const formattedItems = saleItems.map((item) => ({
      product: {
        id: item.product_id,
        name: item.product_name || 'Unknown Product',
        price: item.price,
      },
      quantity: item.quantity,
      discount: item.discount || 0,
      subtotal: item.subtotal,
    }));

    return {
      saleId: selectedSale.id,
      items: formattedItems,
      total: selectedSale.total,
      paymentMethod: selectedSale.payment_method,
      note: selectedSale.note || '',
      date: new Date(selectedSale.created_at),
    };
  };

  // Function to handle print receipt button
  const handlePrintReceipt = () => {
    const printData = prepareReceiptData();
    if (printData) {
      setReceiptData(printData);
      setShowPrintManager(true);
    }
  };

  // Add this function to capture and save the sale detail as an image
  const captureSaleDetail = async () => {
    if (!saleDetailRef.current || !selectedSale) return;

    try {
      setCapturing(true);

      // Calculate pixel ratio for high-quality image
      const pixelRatio = PixelRatio.get();

      // Capture the view
      const uri = await captureRef(saleDetailRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        height: 1920 / pixelRatio,
        width: 1080 / pixelRatio,
      });

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable) {
        // Share the image
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Sale #${selectedSale.id} Details`,
          UTI: 'public.png',
        });
        showToast('Sale detail exported as image', 'success');
      } else {
        Alert.alert(
          'Sharing not available',
          'Sharing is not available on this device'
        );
      }
    } catch (error) {
      console.error('Error capturing sale detail:', error);
      Alert.alert(t('common.error'), t('sales.failedToExportSaleDetail'));
    } finally {
      setCapturing(false);
    }
  };

  // Handle deleting a sale
  const handleDeleteSale = async () => {
    if (!selectedSale) return;

    Alert.alert(
      t('sales.deleteSale'),
      t('sales.deleteSaleConfirm', { saleId: selectedSale.id }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSale.mutateAsync(selectedSale.id);
              setShowSaleDetail(false);
              showToast(t('sales.saleDeletedSuccessfully'), 'success');
            } catch (error) {
              console.error('Error deleting sale:', error);
              Alert.alert(t('common.error'), t('sales.failedToDeleteSale'));
            }
          },
        },
      ]
    );
  };

  // Export sales list data (original functionality)
  const exportSalesList = async () => {
    try {
      setExporting(true);

      // Load all sale items if not already loaded to calculate cost and profit
      let items = allSaleItems;
      if (items.length === 0) {
        items = await loadAllSaleItems();
      }

      // For mobile platforms
      if (Platform.OS !== 'web') {
        // Prepare data for Excel export
        const excelData = filteredSales.map((sale) => ({
          'Sale ID': sale.id,
          Date: formatDate(sale.created_at),
          'Payment Method': sale.payment_method.toUpperCase(),
          'Total Amount': sale.total,
          Note: sale.note || '',
        }));

        // Calculate summary data using the same method as exportSalesItemsData
        const totalSales = filteredSales.length;
        const totalRevenue = items.reduce(
          (sum, item) => sum + item.subtotal,
          0
        );
        const totalCost = items.reduce(
          (sum, item) => sum + (item.cost || 0) * item.quantity,
          0
        );
        const totalProfit = totalRevenue - totalCost;

        excelData.push({
          'Sale ID': '',
          Date: '',
          'Payment Method': '',
          'Total Amount': 0,
          Note: '',
        });
        excelData.push({
          'Sale ID': '',
          Date: 'SUMMARY',
          'Payment Method': '',
          'Total Amount': 0,
          Note: '',
        });
        excelData.push({
          'Sale ID': '',
          Date: 'Total Sales',
          'Payment Method': totalSales.toString(),
          'Total Amount': 0,
          Note: '',
        });
        excelData.push({
          'Sale ID': '',
          Date: 'Total Revenue',
          'Payment Method': '',
          'Total Amount': totalRevenue,
          Note: '',
        });
        excelData.push({
          'Sale ID': '',
          Date: 'Total Cost',
          'Payment Method': '',
          'Total Amount': totalCost,
          Note: '',
        });
        excelData.push({
          'Sale ID': '',
          Date: 'Total Profit',
          'Payment Method': '',
          'Total Amount': totalProfit,
          Note: '',
        });

        // Create worksheet and workbook
        const ws = XLSX.utils.json_to_sheet(excelData);

        // Set column widths for better readability
        ws['!cols'] = [
          { wch: 10 }, // Sale ID
          { wch: 18 }, // Date
          { wch: 15 }, // Payment Method
          { wch: 15 }, // Total Amount
          { wch: 18 }, // Total Amount (MMK)
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sales List');

        // Generate descriptive filename with date range
        const filename = generateFilename(
          'sales_list',
          dateFilter,
          selectedDate
        );

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
      const excelData = filteredSales.map((sale) => ({
        'Sale ID': sale.id,
        Date: formatDate(sale.created_at),
        'Total Amount': sale.total,
        'Total Amount (MMK)': formatPrice(sale.total),
        'Payment Method': sale.payment_method.toUpperCase(),
        Note: sale.note || '',
        Day: formatDateOnly(sale.created_at),
      }));

      // Calculate summary data using the same method as exportSalesItemsData
      const totalSales = filteredSales.length;
      const totalRevenue = items.reduce((sum, item) => sum + item.subtotal, 0);
      const totalCost = items.reduce(
        (sum, item) => sum + (item.cost || 0) * item.quantity,
        0
      );
      const totalProfit = totalRevenue - totalCost;

      excelData.push({
        'Sale ID': '',
        Date: '',
        'Total Amount': 0,
        'Total Amount (MMK)': '',
        'Payment Method': '',
        Note: '',
        Day: '',
      });
      excelData.push({
        'Sale ID': '',
        Date: 'SUMMARY',
        'Total Amount': 0,
        'Total Amount (MMK)': '',
        'Payment Method': '',
        Note: '',
        Day: '',
      });
      excelData.push({
        'Sale ID': '',
        Date: 'Total Sales',
        'Total Amount': 0,
        'Total Amount (MMK)': '',
        'Payment Method': totalSales.toString(),
        Note: '',
        Day: '',
      });
      excelData.push({
        'Sale ID': '',
        Date: 'Total Revenue',
        'Total Amount': totalRevenue,
        'Total Amount (MMK)': formatPrice(totalRevenue),
        'Payment Method': '',
        Note: '',
        Day: '',
      });
      excelData.push({
        'Sale ID': '',
        Date: 'Total Cost',
        'Total Amount': totalCost,
        'Total Amount (MMK)': formatPrice(totalCost),
        'Payment Method': '',
        Note: '',
        Day: '',
      });
      excelData.push({
        'Sale ID': '',
        Date: 'Total Profit',
        'Total Amount': totalProfit,
        'Total Amount (MMK)': formatPrice(totalProfit),
        'Payment Method': '',
        Note: '',
        Day: '',
      });

      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths for better readability
      ws['!cols'] = [
        { wch: 10 }, // Sale ID
        { wch: 18 }, // Date
        { wch: 15 }, // Payment Method
        { wch: 15 }, // Total Amount
        { wch: 18 }, // Total Amount (MMK)
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sales History');

      const filename = generateFilename(
        'sales_history',
        dateFilter,
        selectedDate
      );

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
          'Cost Price': item.cost || 0,
          Discount: item.discount || 0,
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
        excelData.push({
          'Sale ID': '',
          Date: '',
          Product: '',
          Quantity: 0,
          'Sale Price': 0,
          'Cost Price': 0,
          Discount: 0,
          Subtotal: 0,
          Profit: 0,
        });
        excelData.push({
          'Sale ID': '',
          Date: '',
          Product: 'SUMMARY',
          Quantity: 0,
          'Sale Price': 0,
          'Cost Price': 0,
          Discount: 0,
          Subtotal: 0,
          Profit: 0,
        });
        excelData.push({
          'Sale ID': '',
          Date: '',
          Product: 'Total Items',
          Quantity: totalQuantity,
          'Sale Price': 0,
          'Cost Price': 0,
          Discount: 0,
          Subtotal: 0,
          Profit: 0,
        });
        excelData.push({
          'Sale ID': '',
          Date: '',
          Product: 'Total Sales',
          Quantity: 0,
          'Sale Price': 0,
          'Cost Price': 0,
          Discount: 0,
          Subtotal: totalSales,
          Profit: 0,
        });
        excelData.push({
          'Sale ID': '',
          Date: '',
          Product: 'Total Cost',
          Quantity: 0,
          'Sale Price': 0,
          'Cost Price': 0,
          Discount: 0,
          Subtotal: 0,
          Profit: totalCost,
        });
        excelData.push({
          'Sale ID': '',
          Date: '',
          Product: 'Total Profit',
          Quantity: 0,
          'Sale Price': 0,
          'Cost Price': 0,
          Discount: 0,
          Subtotal: 0,
          Profit: totalProfit,
        });

        // Create worksheet and workbook
        const ws = XLSX.utils.json_to_sheet(excelData);

        // Set column widths to prevent overflow
        ws['!cols'] = [
          { wch: 10 }, // Sale ID
          { wch: 20 }, // Date
          { wch: 25 }, // Product (wider for product names)
          { wch: 10 }, // Quantity
          { wch: 12 }, // Sale Price
          { wch: 12 }, // Cost Price
          { wch: 12 }, // Profit
          { wch: 12 }, // Subtotal
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sales Items');

        // Generate descriptive filename with date range
        const filename = generateFilename(
          'sales_items',
          dateFilter,
          selectedDate
        );

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
        'Sale Price (MMK)': formatPrice(item.price),
        'Cost Price': item.cost || 0,
        'Cost Price (MMK)': formatPrice(item.cost || 0),
        Discount: item.discount || 0,
        'Discount (MMK)': formatPrice(item.discount || 0),
        Subtotal: item.subtotal,
        'Subtotal (MMK)': formatPrice(item.subtotal),
        Profit: item.subtotal - (item.cost || 0) * item.quantity,
        'Profit (MMK)': formatPrice(
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

      excelData.push({
        'Sale ID': '',
        Date: '',
        Product: '',
        Quantity: 0,
        'Sale Price': 0,
        'Sale Price (MMK)': '',
        'Cost Price': 0,
        'Cost Price (MMK)': '',
        Discount: 0,
        'Discount (MMK)': '',
        Subtotal: 0,
        'Subtotal (MMK)': '',
        Profit: 0,
        'Profit (MMK)': '',
      });
      excelData.push({
        'Sale ID': '',
        Date: '',
        Product: 'SUMMARY',
        Quantity: 0,
        'Sale Price': 0,
        'Sale Price (MMK)': '',
        'Cost Price': 0,
        'Cost Price (MMK)': '',
        Discount: 0,
        'Discount (MMK)': '',
        Subtotal: 0,
        'Subtotal (MMK)': '',
        Profit: 0,
        'Profit (MMK)': '',
      });
      excelData.push({
        'Sale ID': '',
        Date: '',
        Product: 'Total Items',
        Quantity: totalQuantity,
        'Sale Price': 0,
        'Sale Price (MMK)': '',
        'Cost Price': 0,
        'Cost Price (MMK)': '',
        Discount: 0,
        'Discount (MMK)': '',
        Subtotal: 0,
        'Subtotal (MMK)': '',
        Profit: 0,
        'Profit (MMK)': '',
      });
      excelData.push({
        'Sale ID': '',
        Date: '',
        Product: 'Total Sales',
        Quantity: 0,
        'Sale Price': 0,
        'Sale Price (MMK)': '',
        'Cost Price': 0,
        'Cost Price (MMK)': '',
        Discount: 0,
        'Discount (MMK)': '',
        Subtotal: totalSales,
        'Subtotal (MMK)': formatPrice(totalSales),
        Profit: 0,
        'Profit (MMK)': '',
      });
      excelData.push({
        'Sale ID': '',
        Date: '',
        Product: 'Total Cost',
        Quantity: 0,
        'Sale Price': 0,
        'Sale Price (MMK)': '',
        'Cost Price': 0,
        'Cost Price (MMK)': '',
        Discount: 0,
        'Discount (MMK)': '',
        Subtotal: 0,
        'Subtotal (MMK)': '',
        Profit: totalCost,
        'Profit (MMK)': formatPrice(totalCost),
      });
      excelData.push({
        'Sale ID': '',
        Date: '',
        Product: 'Total Profit',
        Quantity: 0,
        'Sale Price': 0,
        'Sale Price (MMK)': '',
        'Cost Price': 0,
        'Cost Price (MMK)': '',
        Discount: 0,
        'Discount (MMK)': '',
        Subtotal: 0,
        'Subtotal (MMK)': '',
        Profit: totalProfit,
        'Profit (MMK)': formatPrice(totalProfit),
      });

      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths to prevent overflow
      ws['!cols'] = [
        { wch: 10 }, // Sale ID
        { wch: 20 }, // Date
        { wch: 25 }, // Product (wider for product names)
        { wch: 10 }, // Quantity
        { wch: 12 }, // Sale Price
        { wch: 15 }, // Sale Price (MMK)
        { wch: 12 }, // Cost Price
        { wch: 15 }, // Cost Price (MMK)
        { wch: 12 }, // Subtotal
        { wch: 15 }, // Subtotal (MMK)
        { wch: 12 }, // Profit
        { wch: 15 }, // Profit (MMK)
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sales Items');

      const filename = generateFilename(
        'sales_items',
        dateFilter,
        selectedDate
      );

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
          <Text style={styles.modalTitle}>{t('sales.salesHistory')}</Text>
          <View style={styles.modalHeaderActions}>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={exportToExcel}
              disabled={exporting || filteredSales.length === 0}
            >
              <Download size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>{t('sales.done')}</Text>
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
                <Text style={styles.exportModalTitle}>
                  {t('sales.exportOptions')}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowExportModal(false)}
                  style={styles.exportModalCloseButton}
                >
                  <X size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <Text style={styles.exportModalDescription}>
                {t('sales.chooseDataToExport')}
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
                    <Text style={styles.exportOptionTitle}>
                      {t('sales.salesList')}
                    </Text>
                    <Text style={styles.exportOptionDescription}>
                      {t('sales.salesListDescription')}
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
                      {t('sales.salesItemsData')}
                    </Text>
                    <Text style={styles.exportOptionDescription}>
                      {t('sales.salesItemsDataDescription')}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {exporting && (
                <View style={styles.exportingIndicator}>
                  <ActivityIndicator size="small" color="#059669" />
                  <Text style={styles.exportingText}>
                    {t('sales.preparingExport')}
                  </Text>
                </View>
              )}

              {loadingAllItems && (
                <View style={styles.exportingIndicator}>
                  <ActivityIndicator size="small" color="#059669" />
                  <Text style={styles.exportingText}>
                    {t('sales.loadingSalesItemsData')}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.exportModalCancelButton}
                onPress={() => setShowExportModal(false)}
                disabled={exporting || loadingAllItems}
              >
                <Text style={styles.exportModalCancelText}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <View style={styles.filtersContainer}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder={t('sales.searchBySaleId')}
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
          </View>
          {/* <TextInput
            style={styles.searchInput}
            placeholder={t('sales.searchBySaleId')}
            value={searchQuery}
            onChangeText={setSearchQuery}
          /> */}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dateFilters}
          >
            {[
              { key: 'all', label: t('sales.all') },
              { key: 'today', label: t('sales.today') },
              { key: 'month', label: t('sales.thisMonth') },
              { key: 'selectedMonth', label: t('sales.selectMonth') },
              { key: 'custom', label: t('sales.selectDate') },
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
                  } else if (filter.key === 'selectedMonth') {
                    setShowMonthYearPicker(true);
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

          {dateFilter === 'selectedMonth' && (
            <View style={styles.customDateContainer}>
              <TouchableOpacity
                style={styles.customDateButton}
                onPress={() => setShowMonthYearPicker(true)}
              >
                <Calendar size={16} color="#6B7280" />
                <Text style={styles.customDateText}>
                  {new Date(selectedYear, selectedMonth).toLocaleDateString(
                    'en-US',
                    {
                      month: 'long',
                      year: 'numeric',
                    }
                  )}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>
              {filteredSales.length} {t('sales.salesTotal')}{' '}
              {formatPrice(
                filteredSales.reduce((sum, sale) => sum + sale.total, 0)
              )}
            </Text>
          </View>
        </View>

        <FlatList
          data={filteredSales}
          keyExtractor={(item) => item.id}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#059669" />
                <Text style={styles.loadingMoreText}>
                  {t('common.loadingMore')}
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <History size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>
                {t('sales.noSalesFound')}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery || dateFilter !== 'all'
                  ? t('sales.tryAdjustingFilters')
                  : t('sales.noSalesMadeYet')}
              </Text>
            </View>
          )}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          renderItem={({ item: sale }) => (
            <TouchableOpacity onPress={() => handleSalePress(sale)}>
              <Card style={styles.saleCard}>
                <View style={styles.saleHeader}>
                  <View style={styles.saleInfo}>
                    <Text style={styles.saleId}>
                      {t('sales.saleNumber')} {sale.id}
                    </Text>
                    <Text style={styles.saleDate}>
                      {formatDate(sale.created_at)}
                    </Text>
                    <Text style={styles.salePayment}>
                      {t('sales.payment')} {sale.payment_method.toUpperCase()}
                    </Text>
                    {sale.note && (
                      <Text style={styles.saleNote} numberOfLines={1}>
                        {t('sales.saleNote')}: {sale.note}
                      </Text>
                    )}
                  </View>
                  <View style={styles.saleAmountContainer}>
                    <Text style={styles.saleTotal}>
                      {formatPrice(sale.total)}
                    </Text>
                    <Eye size={16} color="#6B7280" />
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
        />

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

        {/* Month/Year Picker Modal */}
        <Modal
          visible={showMonthYearPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowMonthYearPicker(false)}
        >
          <View style={[styles.monthPickerOverlay]}>
            <View style={styles.monthPickerContainer}>
              <View style={styles.monthPickerHeader}>
                <Text style={styles.monthPickerTitle}>
                  {t('sales.selectMonthYear')}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowMonthYearPicker(false)}
                  style={styles.monthPickerCloseButton}
                >
                  <X size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Year Selector */}

              {/* Month Selector */}
              <View style={styles.monthSelectorContainer}>
                <Text style={styles.yearSelectorLabel}>{t('sales.year')}</Text>
                <View style={{ height: 40 }}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={[styles.yearSelector]}
                  >
                    {Array.from(
                      { length: 5 },
                      (_, i) => new Date().getFullYear() - i
                    ).map((year, index) => (
                      <View key={index}>
                        <TouchableOpacity
                          key={year}
                          style={[
                            styles.yearOption,
                            selectedYear === year && styles.yearOptionActive,
                          ]}
                          onPress={() => setSelectedYear(year)}
                        >
                          <Text
                            style={[
                              styles.yearOptionText,
                              selectedYear === year &&
                                styles.yearOptionTextActive,
                            ]}
                          >
                            {year}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>

                <Text style={[styles.monthSelectorLabel]}>
                  {t('sales.month')}
                </Text>
                <View style={styles.monthGrid}>
                  {Array.from({ length: 12 }, (_, i) => i).map((month) => (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.monthOption,
                        selectedMonth === month && styles.monthOptionActive,
                      ]}
                      onPress={() => setSelectedMonth(month)}
                    >
                      <Text
                        style={[
                          styles.monthOptionText,
                          selectedMonth === month &&
                            styles.monthOptionTextActive,
                        ]}
                      >
                        {new Date(2024, month).toLocaleDateString('en-US', {
                          month: 'short',
                        })}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.monthPickerActions}>
                <TouchableOpacity
                  style={styles.monthPickerCancelButton}
                  onPress={() => setShowMonthYearPicker(false)}
                >
                  <Text style={styles.monthPickerCancelText}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.monthPickerConfirmButton}
                  onPress={() => {
                    setDateFilter('selectedMonth');
                    setShowMonthYearPicker(false);
                  }}
                >
                  <Text style={styles.monthPickerConfirmText}>
                    {t('common.confirm')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Sale Detail Modal */}
        <Modal
          visible={showSaleDetail}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowSaleDetail(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('sales.saleDetails')}</Text>
              <TouchableOpacity onPress={() => setShowSaleDetail(false)}>
                <Text style={styles.modalClose}>{t('sales.close')}</Text>
              </TouchableOpacity>
            </View>

            {selectedSale && (
              <ScrollView style={styles.saleDetailContent}>
                <View style={styles.saleDetailActions}>
                  {/* Toggle between Internal View and Customer Voucher */}
                  <TouchableOpacity
                    style={[
                      styles.voucherToggleButton,
                      isCustomerVoucher && styles.voucherToggleButtonActive,
                    ]}
                    onPress={() => setIsCustomerVoucher(!isCustomerVoucher)}
                  >
                    <FileText
                      size={16}
                      color={isCustomerVoucher ? '#FFFFFF' : '#059669'}
                    />
                    <Text
                      style={[
                        styles.voucherToggleButtonText,
                        isCustomerVoucher &&
                          styles.voucherToggleButtonTextActive,
                      ]}
                    >
                      {isCustomerVoucher
                        ? t('sales.customerReceipt')
                        : t('sales.internalView')}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={styles.deleteSaleButton}
                      onPress={handleDeleteSale}
                    >
                      <Trash2 size={16} color="#FFFFFF" />
                      <Text style={styles.deleteSaleButtonText}>
                        {t('sales.deleteSale')}
                      </Text>
                    </TouchableOpacity>

                    {/* Print Receipt / Export as Image button */}
                    <TouchableOpacity
                      style={styles.exportImageButton}
                      onPress={
                        isCustomerVoucher
                          ? handlePrintReceipt
                          : captureSaleDetail
                      }
                      disabled={capturing}
                    >
                      {isCustomerVoucher ? (
                        <Printer size={16} color="#FFFFFF" />
                      ) : (
                        <ImageIcon size={16} color="#FFFFFF" />
                      )}
                      <Text style={styles.exportImageButtonText}>
                        {capturing
                          ? t('sales.exporting')
                          : isCustomerVoucher
                          ? t('sales.printCustomerReceipt')
                          : t('sales.exportAsImage')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Wrap the content to be captured in a View with ref */}
                <View
                  ref={saleDetailRef}
                  collapsable={false}
                  style={styles.captureContainer}
                >
                  <Card style={styles.saleDetailCard}>
                    <Text style={styles.saleDetailTitle}>
                      {t('sales.saleInformation')}
                    </Text>
                    <View style={styles.saleDetailRow}>
                      <Text style={styles.saleDetailLabel}>
                        {t('sales.saleId')}
                      </Text>
                      <Text style={styles.saleDetailValue}>
                        #{selectedSale.id}
                      </Text>
                    </View>
                    <View style={styles.saleDetailRow}>
                      <Text style={styles.saleDetailLabel}>
                        {t('sales.date')}
                      </Text>
                      <Text style={styles.saleDetailValue}>
                        {formatDate(selectedSale.created_at)}
                      </Text>
                    </View>
                    <View style={styles.saleDetailRow}>
                      <Text style={styles.saleDetailLabel}>
                        {t('sales.paymentMethod')}
                      </Text>
                      <Text style={styles.saleDetailValue}>
                        {selectedSale.payment_method.toUpperCase()}
                      </Text>
                    </View>
                    {selectedSale.note && (
                      <View style={styles.saleDetailRow}>
                        <Text style={styles.saleDetailLabel}>
                          {t('sales.saleNote')}
                        </Text>
                        <Text style={styles.saleDetailValue}>
                          {selectedSale.note}
                        </Text>
                      </View>
                    )}
                    <View style={styles.saleDetailRow}>
                      <Text style={styles.saleDetailLabel}>
                        {t('sales.totalAmount')}
                      </Text>
                      <Text
                        style={[styles.saleDetailValue, styles.saleDetailTotal]}
                      >
                        {formatPrice(selectedSale.total)}
                      </Text>
                    </View>

                    {/* Add Total Cost and Profit Information - Only show in internal view */}
                    {!isCustomerVoucher && (
                      <>
                        <View style={styles.saleDetailRow}>
                          <Text style={styles.saleDetailLabel}>
                            {t('sales.totalCost')}
                          </Text>
                          <Text style={styles.saleDetailValue}>
                            {formatPrice(
                              saleItems.reduce(
                                (sum, item) => sum + item.cost * item.quantity,
                                0
                              )
                            )}
                          </Text>
                        </View>
                        <View style={styles.saleDetailRow}>
                          <Text style={styles.saleDetailLabel}>
                            {t('sales.totalProfit')}
                          </Text>
                          <Text
                            style={[
                              styles.saleDetailValue,
                              styles.saleDetailProfit,
                            ]}
                          >
                            {formatPrice(
                              selectedSale.total -
                                saleItems.reduce(
                                  (sum, item) =>
                                    sum + item.cost * item.quantity,
                                  0
                                )
                            )}
                          </Text>
                        </View>
                      </>
                    )}
                  </Card>

                  <Card style={styles.saleDetailCard}>
                    <Text style={styles.saleDetailTitle}>
                      {t('sales.itemsPurchased')}
                    </Text>
                    {saleItems.map((item, index) => (
                      <View key={index} style={styles.saleItemRow}>
                        <View style={styles.saleItemInfo}>
                          <Text style={styles.saleItemName}>
                            {item.product_name}
                          </Text>
                          <Text style={styles.saleItemDetails}>
                            {item.quantity} × {formatPrice(item.price)}
                            {item.discount > 0 && (
                              <Text style={styles.saleItemDiscount}>
                                {' '}
                                - {formatPrice(item.discount)}{' '}
                                {t('sales.discount')}
                              </Text>
                            )}
                          </Text>
                        </View>
                        <View style={styles.saleItemPricing}>
                          <Text style={styles.saleItemSubtotal}>
                            {formatPrice(item.subtotal)}
                          </Text>
                          {/* Only show profit in internal view */}
                          {!isCustomerVoucher && (
                            <Text style={styles.saleItemProfit}>
                              {t('sales.profit')}{' '}
                              {formatPrice(
                                item.subtotal - item.cost * item.quantity
                              )}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}

                    <View style={styles.saleItemsTotal}>
                      <Text style={styles.saleItemsTotalLabel}>
                        {t('sales.totalItems')} {saleItems.length}
                      </Text>
                      <Text style={styles.saleItemsTotalValue}>
                        {formatPrice(selectedSale.total)}
                      </Text>
                    </View>
                  </Card>
                </View>
              </ScrollView>
            )}
            {/* Enhanced Print Manager for Sale Detail */}
            {receiptData && (
              <EnhancedPrintManager
                visible={showPrintManager}
                onClose={() => {
                  setShowPrintManager(false);
                  setReceiptData(null);
                }}
                receiptData={receiptData}
              />
            )}
          </SafeAreaView>
        </Modal>

        {/* Enhanced Print Manager for Sale Detail */}
        {/* {receiptData && (
          <EnhancedPrintManager
            visible={showPrintManager}
            onClose={() => {
              setShowPrintManager(false);
              setReceiptData(null);
            }}
            receiptData={receiptData}
          />
        )} */}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
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
    padding: 10,
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
    marginBottom: 16,
  },
  cartHeaderRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  dateTimeSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  calendarIconButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  saleDateTimeSelector: {
    flex: 1,
  },
  customerSection: {
    marginBottom: 20,
  },
  customerLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  bulkPricingSummary: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  savingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  savingsLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  originalTotal: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  savingsAmount: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#DC2626',
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
    maxHeight: isSmallScreen ? 400 : 500,
  },
  cartItem: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  cartItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cartItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#F9FAFB',
  },
  cartItemInfo: {
    flex: 1,
    paddingRight: 8,
  },
  cartItemName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
    marginBottom: 2,
  },
  cartItemPrice: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  cartItemControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantity: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginHorizontal: 12,
    minWidth: 30,
    textAlign: 'center',
  },
  removeButton: {
    padding: 8,
    marginLeft: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
  cartItemSubtotalContainer: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  cartItemSubtotal: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#059669',
  },
  cartItemDiscount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#EF4444',
    marginTop: 2,
  },
  cartItemDiscountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  discountLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginRight: 6,
  },
  discountInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
    minWidth: 60,
  },
  discountUnit: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginLeft: 6,
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
    position: 'relative',
    marginBottom: 12,
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -8 }],
    padding: 4,
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
  dialogProductImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 12,
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
  saleNote: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
    fontStyle: 'italic',
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
  saleDetailProfit: {
    color: '#10B981',
    // fontSize: 18,
    fontFamily: 'Inter-Bold',
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
  saleItemDiscount: {
    color: '#EF4444',
    fontWeight: '500',
  },
  saleItemSubtotal: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  saleItemPricing: {
    alignItems: 'flex-end',
  },
  saleItemProfit: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#10B981',
    marginTop: 2,
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
  saleDetailActions: {
    marginBottom: 12,
    paddingHorizontal: 4,
    gap: 12,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  deleteSaleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteSaleButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    marginLeft: 6,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  exportImageButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  exportImageButtonText: {
    color: '#FFFFFF',
    marginLeft: 6,
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  voucherToggleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  voucherToggleButtonActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  voucherToggleButtonText: {
    color: '#059669',
    marginLeft: 6,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  voucherToggleButtonTextActive: {
    color: '#FFFFFF',
  },
  captureContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
  },
  deleteButton: {
    marginRight: 15,
    padding: 8,
  },
  // Month/Year Picker Styles
  monthPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  monthPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    margin: 20,
    minWidth: 320,
    maxWidth: 400,
  },
  monthPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthPickerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  monthPickerCloseButton: {
    padding: 4,
  },
  yearSelectorContainer: {
    marginBottom: 20,
  },
  yearSelectorLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  yearSelector: {
    flexDirection: 'row',
  },
  yearOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  yearOptionActive: {
    backgroundColor: '#10B981',
  },
  yearOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  yearOptionTextActive: {
    color: '#FFFFFF',
  },
  monthSelectorContainer: {
    marginBottom: 20,
  },
  monthSelectorLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monthOption: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    marginBottom: 8,
  },
  monthOptionActive: {
    backgroundColor: '#10B981',
  },
  monthOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  monthOptionTextActive: {
    color: '#FFFFFF',
  },
  monthPickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  monthPickerCancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  monthPickerCancelText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  monthPickerConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  monthPickerConfirmText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
});
