import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  Dimensions,
  ActivityIndicator,
  PixelRatio,
  Image,
  FlatList,
  RefreshControl,
  Animated,
} from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import OptimizedImage from '@/components/OptimizedImage';
import {
  useProducts,
  useCategories,
  useSaleMutations,
  useSaleItems,
  useProductSearchForSales,
  useProductsInfinite,
  useCategoriesWithCounts,
  useSalesSummary,
  useSalesSummaryByDateRange,
  useAllSalesForExport,
} from '@/hooks/useQueries';
import { useDebounce } from '@/hooks/useDebounce';
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
import { cacheDirectory } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/context/LocalizationContext';
import { CompleteSaleModal } from '@/components/CompleteSaleModal';
import { CashCalculatorModal } from '@/components/CashCalculatorModal';
import { EnhancedPrintManager } from '@/components/EnhancedPrintManager';
import { BulkPricingIndicator } from '@/components/BulkPricingIndicator';
import {
  calculateBulkPrice,
  calculateCartTotalWithBulkPricing,
} from '@/utils/bulkPricingUtils';
import { SaleDateTimeSelector } from '@/components/SaleDateTimeSelector';
import { convertISOToDBFormat } from '@/utils/dateUtils';
import { MyanmarTextInput as TextInput } from '@/components/MyanmarTextInput';
import { useMemoryCleanup, useRenderPerformance } from '@/utils/memoryManager';
import { useBarcodeActions } from '@/hooks/useBarcodeActions';
import { PrinterErrorBoundary } from '@/components/PrinterErrorBoundary';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PaymentMethodService,
  type PaymentMethod,
} from '@/services/paymentMethodService';
import { PaymentMethodSelector } from '@/components/PaymentMethodSelector';
import { MenuButton } from '@/components/MenuButton';
import { useDrawer } from '@/context/DrawerContext';
import { router } from 'expo-router';

interface CartItem {
  product: Product;
  quantity: number;
  discount: number; // Discount amount for this item
  subtotal: number; // (price * quantity) - discount
}

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 400;

/**
 * Sale page for drawer navigation
 *
 * Features:
 * - Complete sales interface with cart management
 * - Product selection with barcode scanning
 * - Payment processing with multiple payment methods
 * - Bulk pricing and discount support
 * - Includes MenuButton for sidebar navigation
 *
 * Requirements:
 * - 2.1: MenuButton appears in top-left corner
 *
 * Note: Sale history has been moved to a separate page (sale-history.tsx)
 */
export default function Sale() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { formatPrice } = useCurrencyFormatter();
  const { db } = useDatabase();
  const { openDrawer } = useDrawer();

  // Memory management
  const { addCleanup } = useMemoryCleanup();
  useRenderPerformance('Sales');

  // Unified barcode handling
  const { handleBarcodeScanned: handleBarcodeAction } = useBarcodeActions({
    context: 'sales',
    onProductFound: async (product) => {
      await addToCart(product);
      // Only close scanner if continuous scanning is disabled
      if (!continuousScanning) {
        setShowScanner(false);
      }
    },
    onProductNotFound: (barcode) => {
      setSearchQuery(barcode);
      setShowProductDialog(true);
      // Close scanner when product not found to show search dialog
      setShowScanner(false);
    },
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [continuousScanning, setContinuousScanning] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPrintManager, setShowPrintManager] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [saleDateTime, setSaleDateTime] = useState<Date>(new Date());
  const [showDateTimeSelector, setShowDateTimeSelector] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorData, setCalculatorData] = useState<{
    amountGiven: number;
    change: number;
  } | null>(null);

  // Ref and animation for customer selector highlighting
  const customerSelectorOpacity = useRef(new Animated.Value(1)).current;

  // Debounced search for performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Use infinite scroll for products
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: productsLoading,
    isFetching: productsIsFetching,
    isRefetching: productsIsRefetching,
    isError: productsError,
    refetch,
  } = useProductsInfinite(
    debouncedSearchQuery || undefined,
    selectedCategory !== 'All' ? selectedCategory : undefined,
  );

  // Flatten all pages into a single array
  const products = useMemo(() => {
    return data?.pages.flatMap((page: any) => page.data) ?? [];
  }, [data]);

  const { data: categories = [], isLoading: categoriesLoading } =
    useCategoriesWithCounts();

  const { addSale } = useSaleMutations();

  // Load default payment method on mount
  useEffect(() => {
    const loadDefaultPaymentMethod = async () => {
      try {
        const defaultMethod =
          await PaymentMethodService.getDefaultPaymentMethod();
        setSelectedPaymentMethod(defaultMethod);
      } catch (error) {
        console.error('Error loading default payment method:', error);

        // Graceful fallback: provide default cash payment method
        const fallbackMethod: PaymentMethod = {
          id: 'cash',
          name: 'Cash',
          icon: 'Banknote',
          color: '#10B981',
          isDefault: true,
        };
        setSelectedPaymentMethod(fallbackMethod);

        // Show toast notification instead of blocking alert
        showToast(
          t('sales.errorLoadingPaymentMethods') ||
            'Using default cash payment method',
          'error',
        );
      }
    };
    loadDefaultPaymentMethod();
  }, []);

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

  // Helper function to check if a product is in the cart
  const isProductInCart = (productId: string) => {
    return cart.some((item) => item.product.id === productId);
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
        (breakdown) => breakdown.item.id === item.product.id,
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
    setLoading(true);
    try {
      await handleBarcodeAction(barcode);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (product: Product) => {
    if (product.quantity <= 0) {
      Alert.alert(t('common.error'), t('sales.outOfStock'));
      return;
    }

    // Load bulk pricing data for this product if not already loaded
    let productWithBulkPricing = product;
    if (!product.bulk_pricing && db) {
      try {
        const bulkPricingData = await db.getBulkPricingForProduct(product.id);
        productWithBulkPricing = {
          ...product,
          bulk_pricing: bulkPricingData,
        };
      } catch (error) {
        console.error('Error loading bulk pricing:', error);
        // Continue with original product if bulk pricing fails to load
      }
    }

    const existingItem = cart.find((item) => item.product.id === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.quantity) {
        Alert.alert(t('common.error'), t('sales.notEnoughStock'));
        return;
      }

      const newQuantity = existingItem.quantity + 1;

      // Update the existing item's product with bulk pricing data
      const updatedProduct = {
        ...existingItem.product,
        bulk_pricing: productWithBulkPricing.bulk_pricing,
      };

      // Calculate bulk price for new quantity
      const cartForBulkPricing = [
        {
          ...updatedProduct,
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
                product: updatedProduct, // Update product with bulk pricing data
                quantity: newQuantity,
                subtotal: bulkTotalPrice - item.discount, // bulk_total - manual_discount
              }
            : item,
        ),
      );
    } else {
      // For new items, start with bulk price for quantity 1
      const cartForBulkPricing = [
        {
          ...productWithBulkPricing,
          quantity: 1,
        },
      ];
      const bulkPricingResult =
        calculateCartTotalWithBulkPricing(cartForBulkPricing);
      const bulkTotalPrice = bulkPricingResult.bulkTotal;

      setCart([
        ...cart,
        {
          product: productWithBulkPricing, // Use product with bulk pricing data
          quantity: 1,
          discount: 0, // Default discount is 0
          subtotal: bulkTotalPrice, // Start with bulk price
        },
      ]);
    }

    // Don't close the dialog anymore - let user continue adding products
  };

  const updateQuantity = async (productId: string, newQuantity: number) => {
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

    // Ensure bulk pricing data is loaded
    let productWithBulkPricing = item.product;
    if (!item.product.bulk_pricing && db) {
      try {
        const bulkPricingData = await db.getBulkPricingForProduct(productId);
        productWithBulkPricing = {
          ...item.product,
          bulk_pricing: bulkPricingData,
        };
      } catch (error) {
        console.error('Error loading bulk pricing:', error);
      }
    }

    // Calculate bulk price for new quantity
    const cartForBulkPricing = [
      {
        ...productWithBulkPricing,
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
              product: productWithBulkPricing, // Update product with bulk pricing data
              quantity: newQuantity,
              subtotal: bulkTotalPrice - item.discount, // bulk_total - manual_discount
            }
          : item,
      ),
    );
  };

  const updateDiscount = async (productId: string, newDiscount: number) => {
    const item = cart.find((item) => item.product.id === productId);
    if (!item) return;

    // Ensure bulk pricing data is loaded
    let productWithBulkPricing = item.product;
    if (!item.product.bulk_pricing && db) {
      try {
        const bulkPricingData = await db.getBulkPricingForProduct(productId);
        productWithBulkPricing = {
          ...item.product,
          bulk_pricing: bulkPricingData,
        };
      } catch (error) {
        console.error('Error loading bulk pricing:', error);
      }
    }

    // Calculate bulk price for this item first
    const cartForBulkPricing = [
      {
        ...productWithBulkPricing,
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
              product: productWithBulkPricing, // Update product with bulk pricing data
              discount: newDiscount,
              // Note: subtotal will be recalculated in getCartTotals with stacked discounts
              subtotal: bulkPrice - newDiscount, // Apply manual discount to bulk price
            }
          : item,
      ),
    );
  };

  console.log(
    'saleda',
    saleDateTime,
    saleDateTime.toISOString(),
    convertISOToDBFormat(saleDateTime.toISOString()),
  );

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const highlightCustomerSelector = () => {
    // Pulse animation to draw attention to customer selector
    Animated.sequence([
      Animated.timing(customerSelectorOpacity, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(customerSelectorOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(customerSelectorOpacity, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(customerSelectorOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const clearCart = async () => {
    setCart([]);
    setSelectedCustomer(null);
    // Reset payment method to default
    try {
      const defaultMethod =
        await PaymentMethodService.getDefaultPaymentMethod();
      setSelectedPaymentMethod(defaultMethod);
    } catch (error) {
      console.error('Error resetting payment method:', error);

      // Graceful fallback: use cash as default
      const fallbackMethod: PaymentMethod = {
        id: 'cash',
        name: 'Cash',
        icon: 'Banknote',
        color: '#10B981',
        isDefault: true,
      };
      setSelectedPaymentMethod(fallbackMethod);
    }
    // Don't reset timestamp here - let it be handled by the component logic
  };

  const processSale = async (
    paymentMethod: string,
    note: string,
    shouldPrint: boolean,
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
            : new Date().toISOString(),
        ), // Use current time unless datetime selector is open
      };

      const saleItems = cart.map((item) => {
        const itemPricing = cartTotals.itemBreakdown.find(
          (breakdown) => breakdown.item?.id === item.product.id,
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
          voucherId: result.voucherId,
          items: cart,
          total,
          paymentMethod,
          note,
          date: new Date(),
        };

        setReceiptData(printData);
        setShowPrintManager(true);
      }

      // Clear all state after successful sale (Requirements 7.1, 7.2, 7.3, 7.4)
      clearCart();
      setShowPaymentModal(false);
      // Reset calculator data
      setCalculatorData(null);
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

    // Validate customer selection for debt payments
    if (selectedPaymentMethod?.name === 'Debt' && !selectedCustomer) {
      Alert.alert(t('common.error'), t('debt.customerRequiredForDebt'));
      highlightCustomerSelector();
      return;
    }

    // Show calculator for cash payments
    if (selectedPaymentMethod?.id === 'cash') {
      setShowCalculator(true);
      return;
    }

    // Show complete sale modal directly for non-cash payments
    setShowPaymentModal(true);
  };

  const handleCalculatorContinue = (amountGiven: number, change: number) => {
    // Store calculator data
    setCalculatorData({ amountGiven, change });
    // Close calculator
    setShowCalculator(false);
    // Open complete sale modal
    setShowPaymentModal(true);
  };

  const handleRecalculate = () => {
    // Close complete sale modal
    setShowPaymentModal(false);
    // Reopen calculator modal with previous values
    setShowCalculator(true);
  };

  // Products are now filtered server-side through the infinite query

  if (categoriesLoading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MenuButton onPress={openDrawer} />
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.title} weight="bold">
            {t('sales.title')}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => router.push('/(drawer)/sale-history')}
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
              <Text style={styles.cartTitle} weight="medium">
                {t('sales.shoppingCart')}
              </Text>
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText} weight="bold">
                  {cart.length}
                </Text>
              </View>
            </View>
            <View style={styles.cartHeaderRight}>
              <Text style={styles.cartTotal} weight="bold">
                {formatPrice(total)}
              </Text>
            </View>
          </View>

          {/* Customer and Payment Method Selection */}
          <View style={styles.customerSection}>
            <Animated.View
              style={[
                styles.customerSelectorWrapper,
                { opacity: customerSelectorOpacity },
              ]}
            >
              <CustomerSelector
                selectedCustomer={selectedCustomer}
                onCustomerSelect={setSelectedCustomer}
                placeholder={t('sales.selectCustomerOptional')}
              />
            </Animated.View>
            <View style={styles.paymentMethodSelectorContainer}>
              <PaymentMethodSelector
                selectedPaymentMethod={selectedPaymentMethod}
                onPaymentMethodSelect={setSelectedPaymentMethod}
              />
            </View>
          </View>

          {/* Compact Bulk Pricing Summary */}
          {cart.length > 0 &&
            (() => {
              const cartTotals = getCartTotals();
              return cartTotals.totalSavings > 0 ? (
                <View style={styles.bulkPricingSummaryCompact}>
                  <View style={styles.savingsRowCompact}>
                    <Text style={styles.savingsLabelCompact} weight="medium">
                      {t('sales.subtotal')}
                    </Text>
                    <Text style={styles.originalTotalCompact} weight="medium">
                      {formatPrice(cartTotals.originalTotal)}
                    </Text>
                  </View>
                  {cartTotals.bulkSavings > 0 && (
                    <View style={styles.savingsRowCompact}>
                      <Text style={styles.savingsLabelCompact} weight="medium">
                        {t('bulkPricing.bulkDiscount')}
                      </Text>
                      <Text style={styles.savingsAmountCompact} weight="medium">
                        -{formatPrice(cartTotals.bulkSavings)}
                      </Text>
                    </View>
                  )}
                  {cartTotals.manualSavings > 0 && (
                    <View style={styles.savingsRowCompact}>
                      <Text style={styles.savingsLabelCompact} weight="medium">
                        {t('sales.manualDiscount')}
                      </Text>
                      <Text style={styles.savingsAmountCompact} weight="medium">
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
              <Text style={styles.emptyCartText} weight="medium">
                {t('sales.cartEmpty')}
              </Text>
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
                      <Text
                        style={styles.cartItemName}
                        numberOfLines={2}
                        weight="medium"
                      >
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
                      <Text style={styles.cartItemSubtotal} weight="bold">
                        {formatPrice(
                          getBulkPricePerUnit(item) * item.quantity -
                            item.discount,
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

                        <Text style={styles.quantity} weight="medium">
                          {item.quantity}
                        </Text>

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
                      <Text style={styles.discountLabel} weight="medium">
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
                      <Text style={styles.discountUnit} weight="medium">
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
            <Text style={styles.dialogTitle} weight="medium">
              {t('sales.addProducts')}
            </Text>
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
                <Text style={styles.categoryFilterTitle} weight="medium">
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
                    All (
                    {categories.reduce(
                      (sum: number, cat: any) => sum + (cat.product_count || 0),
                      0,
                    )}
                    )
                  </Text>
                </TouchableOpacity>
                {categories.map((category: any) => {
                  return (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryFilterChip,
                        selectedCategory === category.id &&
                          styles.categoryFilterChipActive,
                      ]}
                      onPress={() => setSelectedCategory(category.id)}
                    >
                      <Text
                        style={[
                          styles.categoryFilterText,
                          selectedCategory === category.id &&
                            styles.categoryFilterTextActive,
                        ]}
                      >
                        {category.name} ({category.product_count || 0})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <FlatList
              data={products}
              keyExtractor={(item) => item.id}
              style={styles.dialogProductsList}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isFetchingNextPage}
                  onRefresh={refetch}
                />
              }
              ListHeaderComponent={
                productsIsRefetching && products.length > 0 ? (
                  <View style={styles.refetchingIndicator}>
                    <ActivityIndicator size="small" color="#2196F3" />
                    <Text style={styles.refetchingText}>
                      Updating products...
                    </Text>
                  </View>
                ) : null
              }
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
                    <ActivityIndicator size="small" color="#2196F3" />
                    <Text style={styles.loadingText}>
                      Loading more products...
                    </Text>
                  </View>
                );
              }}
              renderItem={({ item: product }) => (
                <TouchableOpacity
                  style={[
                    styles.dialogProductItem,
                    product.quantity <= 0 && styles.dialogProductItemDisabled,
                    isProductInCart(product.id) &&
                      styles.dialogProductItemAdded,
                  ]}
                  onPress={() => addToCart(product)}
                  disabled={product.quantity <= 0}
                >
                  {product.imageUrl && (
                    <Image
                      // <OptimizedImage
                      source={{ uri: product.imageUrl }}
                      style={[
                        styles.dialogProductImage,
                        { alignSelf: 'flex-start' },
                      ]}
                      resizeMode="cover"
                      // lazy={true}
                      // priority="normal"
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
                    {product.quantity > 0 && !isProductInCart(product.id) && (
                      <View style={styles.addToCartIndicator}>
                        <Plus size={16} color="#10B981" />
                      </View>
                    )}
                    {isProductInCart(product.id) && (
                      <View style={styles.addedToCartIndicator}>
                        <Text style={styles.addedToCartText}>✓</Text>
                        <Text style={styles.addedToCartLabel}>
                          {t('sales.addedToCart')}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                productsLoading ||
                (productsIsRefetching && products.length === 0) ? (
                  <View style={styles.loadingProductsState}>
                    <LoadingSpinner />
                    <Text style={styles.loadingProductsText}>
                      {productsIsRefetching
                        ? 'Filtering products...'
                        : 'Loading products...'}
                    </Text>
                  </View>
                ) : (
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
                )
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
          continuousScanning={continuousScanning}
          onContinuousScanningChange={setContinuousScanning}
        />
      )}

      <CashCalculatorModal
        visible={showCalculator}
        subtotal={total}
        onContinue={handleCalculatorContinue}
        onCancel={() => setShowCalculator(false)}
        initialAmountGiven={calculatorData?.amountGiven}
      />

      <CompleteSaleModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirmSale={processSale}
        total={total}
        paymentMethod={selectedPaymentMethod || undefined}
        loading={loading}
        selectedCustomer={selectedCustomer}
        onRecalculate={
          selectedPaymentMethod?.id === 'cash' ? handleRecalculate : undefined
        }
      />

      {receiptData && (
        <PrinterErrorBoundary>
          <EnhancedPrintManager
            visible={showPrintManager}
            onClose={() => {
              setShowPrintManager(false);
              setReceiptData(null);
            }}
            receiptData={receiptData}
          />
        </PrinterErrorBoundary>
      )}
    </SafeAreaView>
  );
}

// Enhanced Sales History Component with Sale Details and Mobile Export

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    width: 44,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
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
    padding: 2,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  saleDateTimeSelector: {
    flex: 1,
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
  },
  customerSelectorWrapper: {
    flex: 2,
  },
  paymentMethodSelectorContainer: {
    flex: 1,
  },
  customerLabel: {
    fontSize: 14,
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
  bulkPricingSummaryCompact: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  savingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  savingsRowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  savingsLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  savingsLabelCompact: {
    fontSize: 12,
    color: '#6B7280',
  },
  originalTotal: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  originalTotalCompact: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  savingsAmount: {
    fontSize: 14,
    color: '#DC2626',
  },
  savingsAmountCompact: {
    fontSize: 12,
    color: '#DC2626',
  },
  cartTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cartTitle: {
    fontSize: isSmallScreen ? 16 : 18,
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
    color: '#FFFFFF',
  },
  cartTotal: {
    fontSize: isSmallScreen ? 18 : 22,
    color: '#059669',
  },
  emptyCart: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isSmallScreen ? 32 : 48,
  },
  emptyCartText: {
    fontSize: isSmallScreen ? 16 : 18,
    color: '#6B7280',
    marginTop: 16,
  },
  emptyCartSubtext: {
    fontSize: isSmallScreen ? 12 : 14,
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
    color: '#111827',
    marginBottom: 2,
  },
  cartItemPrice: {
    fontSize: 14,
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
    color: '#059669',
  },
  cartItemDiscount: {
    fontSize: 12,
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
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
    minWidth: 60,
  },
  discountUnit: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
  },
  cartActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
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
    color: '#6B7280',
  },
  categoryFilterTextActive: {
    color: '#FFFFFF',
  },
  dialogProductsList: {
    flex: 1,
  },
  loadingFooter: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
    fontSize: 14,
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
    color: '#111827',
  },
  dialogProductNameDisabled: {
    color: '#9CA3AF',
  },
  dialogProductCategory: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  dialogProductStock: {
    fontSize: 12,
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
  },
  dialogProductPriceContainer: {
    alignItems: 'flex-end',
  },
  dialogProductPrice: {
    fontSize: 16,
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
  dialogProductItemAdded: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
    borderWidth: 2,
  },
  addedToCartIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    padding: 8,
    backgroundColor: '#10B981',
    borderRadius: 12,
    minWidth: 60,
  },
  addedToCartText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  addedToCartLabel: {
    fontSize: 10,
    color: '#FFFFFF',
    marginTop: 2,
    textAlign: 'center',
  },
  emptyProductsState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyProductsText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyProductsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
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
