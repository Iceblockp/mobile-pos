import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  ActivityIndicator,
  PixelRatio,
  FlatList,
} from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  useSaleItems,
  useSaleMutations,
  useSalesSummary,
  useSalesSummaryByDateRange,
  useAllSalesForExport,
} from '@/hooks/useQueries';
import {
  useInfiniteSales,
  useInfiniteSalesByDateRange,
} from '@/hooks/useInfiniteQueries';
import { useDatabase } from '@/context/DatabaseContext';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
import {
  History,
  Calendar,
  Download,
  X,
  Eye,
  FileText,
  FileSpreadsheet,
  Trash2,
  ImageIcon,
  Printer,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import { cacheDirectory } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/context/LocalizationContext';
import { EnhancedPrintManager } from '@/components/EnhancedPrintManager';
import { MyanmarTextInput as TextInput } from '@/components/MyanmarTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PaymentMethodService,
  type PaymentMethod,
} from '@/services/paymentMethodService';
import { MenuButton } from '@/components/MenuButton';
import { useDrawer } from '@/context/DrawerContext';
/**
 * Sale History Page
 * Dedicated page for viewing past sales with filtering and search functionality
 *
 * Features:
 * - Date range filtering (today, month, custom date, all)
 * - Search by sale ID or payment method
 * - Payment method filtering
 * - Sale details view with items breakdown
 * - Export to Excel (sales list and sales items)
 * - Print receipts
 * - Delete sales
 * - Record debt payments
 *
 * Requirements:
 * - 3.1: Navigate to dedicated Sale History page from sidebar
 * - 3.2: Display all past sales with same functionality as modal
 * - 3.3: Support filtering by date range
 * - 3.4: Support searching sales by customer or product
 * - 3.5: Display sale details including date, customer, items, and total amount
 * - 3.6: Show detailed sale information on tap
 */
export default function SaleHistory() {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { openDrawer } = useDrawer();
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

  // Payment method filter state
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('All');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  // Debt payment recording state
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Load payment methods on mount
  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const methods = await PaymentMethodService.getPaymentMethods();
        setPaymentMethods(methods);
      } catch (error) {
        console.error('Error loading payment methods:', error);
      }
    };
    loadPaymentMethods();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const localOffset = new Date().getTimezoneOffset();
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

  const generateFilename = (
    baseFilename: string,
    dateFilter: string,
    selectedDate: Date,
  ) => {
    const now = new Date();
    const formatDateForFilename = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    let filename = baseFilename;

    switch (dateFilter) {
      case 'today':
        filename += `_${formatDateForFilename(now)}`;
        break;
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        filename += `_${formatDateForFilename(monthStart)}_to_${formatDateForFilename(monthEnd)}`;
        break;
      case 'selectedMonth':
        const selectedMonthStart = new Date(selectedYear, selectedMonth, 1);
        const selectedMonthEnd = new Date(selectedYear, selectedMonth + 1, 0);
        filename += `_${formatDateForFilename(selectedMonthStart)}_to_${formatDateForFilename(selectedMonthEnd)}`;
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
    selectedDate: Date,
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
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'selectedMonth':
        startDate.setFullYear(selectedYear, selectedMonth, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setFullYear(selectedYear, selectedMonth + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        const customDate = new Date(selectedDate);
        customDate.setHours(0, 0, 0, 0);
        startDate.setTime(customDate.getTime());
        endDate.setTime(customDate.getTime());
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate.setFullYear(startDate.getFullYear() - 10);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
    }

    return [startDate, endDate];
  };

  const [startDate, endDate] = calculateDateRange(dateFilter, selectedDate);

  const {
    data: salesPages,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: salesLoading,
  } = dateFilter === 'all'
    ? useInfiniteSales()
    : useInfiniteSalesByDateRange(startDate, endDate);

  const sales = salesPages?.pages.flatMap((page) => page.data) || [];

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      // Search by sale ID, payment method, customer name, or note
      const matchesSearch =
        !searchQuery ||
        sale.id.toString().includes(searchQuery) ||
        sale.payment_method.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sale.customer_name &&
          sale.customer_name
            .toLowerCase()
            .includes(searchQuery.toLowerCase())) ||
        (sale.note &&
          sale.note.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPaymentMethod =
        paymentMethodFilter === 'All' ||
        sale.payment_method === paymentMethodFilter;

      return matchesSearch && matchesPaymentMethod;
    });
  }, [sales, searchQuery, paymentMethodFilter]);

  const { data: salesSummary } =
    dateFilter === 'all'
      ? useSalesSummary(searchQuery)
      : useSalesSummaryByDateRange(
          startDate,
          endDate,
          searchQuery,
          undefined,
          -390,
        );

  const { data: allSalesForExport, refetch: refetchAllSales } =
    useAllSalesForExport(
      searchQuery,
      undefined,
      dateFilter === 'all' ? undefined : startDate,
      dateFilter === 'all' ? undefined : endDate,
      -390,
    );

  const { data: saleItems = [], isLoading: saleItemsLoading } = useSaleItems(
    selectedSale?.id || 0,
  );

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

  const loadAllSaleItems = async () => {
    if (filteredSales.length === 0 || !db) return [];

    setLoadingAllItems(true);
    try {
      const allItems: any[] = [];

      for (const sale of filteredSales) {
        const items = await db.getSaleItems(sale.id);
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

  const showExportOptions = async () => {
    if (!salesSummary || salesSummary.count === 0) {
      Alert.alert('No Data', 'No sales data to export');
      return;
    }

    setShowExportModal(true);
  };

  const prepareReceiptData = () => {
    if (!selectedSale || !saleItems) return null;

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

  const handlePrintReceipt = () => {
    const printData = prepareReceiptData();
    if (printData) {
      setReceiptData(printData);
      setShowPrintManager(true);
    }
  };

  const captureSaleDetail = async () => {
    if (!saleDetailRef.current || !selectedSale) return;

    try {
      setCapturing(true);
      const pixelRatio = PixelRatio.get();

      const uri = await captureRef(saleDetailRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        height: 1920 / pixelRatio,
        width: 1080 / pixelRatio,
      });

      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Sale #${selectedSale.id} Details`,
          UTI: 'public.png',
        });
        showToast('Sale detail exported as image', 'success');
      } else {
        Alert.alert(
          'Sharing not available',
          'Sharing is not available on this device',
        );
      }
    } catch (error) {
      console.error('Error capturing sale detail:', error);
      Alert.alert(t('common.error'), t('sales.failedToExportSaleDetail'));
    } finally {
      setCapturing(false);
    }
  };

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
      ],
    );
  };

  const handleRecordDebtPayment = () => {
    if (!selectedSale) return;
    setShowRecordPaymentModal(true);
  };

  const handlePaymentMethodSelection = async (paymentMethodName: string) => {
    if (!selectedSale || !db) return;

    try {
      setRecordingPayment(true);

      await db.updateSalePaymentMethod(selectedSale.id, paymentMethodName);
      const updatedSale = await db.getSaleById(selectedSale.id);

      if (updatedSale) {
        setSelectedSale(updatedSale);
      }

      showToast(t('debt.paymentRecorded'), 'success');
      setShowRecordPaymentModal(false);
      refetch();
    } catch (error) {
      console.error('Error recording debt payment:', error);
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setRecordingPayment(false);
    }
  };

  // Simplified export functions - full implementation can be added later
  const exportSalesList = async () => {
    try {
      setExporting(true);
      const { data: allSales } = await refetchAllSales();
      if (!allSales || allSales.length === 0) {
        Alert.alert('No Data', 'No sales data to export');
        setExporting(false);
        setShowExportModal(false);
        return;
      }

      let items = allSaleItems;
      if (items.length === 0) {
        items = await loadAllSaleItems();
      }

      if (Platform.OS !== 'web') {
        const excelData = allSales.map((sale) => ({
          'Sale ID': sale.id,
          Date: formatDate(sale.created_at),
          'Payment Method': sale.payment_method.toUpperCase(),
          'Total Amount': sale.total,
          Note: sale.note || '',
        }));

        const totalSales = salesSummary?.count || 0;
        const totalRevenue = salesSummary?.total || 0;
        const totalCost = items.reduce(
          (sum, item) => sum + (item.cost || 0) * item.quantity,
          0,
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

        const ws = XLSX.utils.json_to_sheet(excelData);
        ws['!cols'] = [
          { wch: 10 },
          { wch: 18 },
          { wch: 15 },
          { wch: 15 },
          { wch: 18 },
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sales List');

        const filename = generateFilename(
          'sales_list',
          dateFilter,
          selectedDate,
        );
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

        const filePath = `${cacheDirectory}${filename}`;
        const exportFile = new FileSystem.File(filePath);
        await exportFile.write(wbout, { encoding: 'base64' });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filePath);
        } else {
          Alert.alert(
            'Sharing not available',
            'Sharing is not available on this device',
          );
        }
      }

      Alert.alert('Success', 'Sales data exported successfully!');
    } catch (error) {
      console.error('Error exporting sales list:', error);
      Alert.alert('Error', 'Failed to export sales data');
    } finally {
      setExporting(false);
      setShowExportModal(false);
    }
  };

  const exportSalesItemsData = async () => {
    try {
      setExporting(true);
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

      if (Platform.OS !== 'web') {
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

        const ws = XLSX.utils.json_to_sheet(excelData);
        ws['!cols'] = [
          { wch: 10 },
          { wch: 20 },
          { wch: 25 },
          { wch: 10 },
          { wch: 12 },
          { wch: 12 },
          { wch: 12 },
          { wch: 12 },
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sales Items');

        const filename = generateFilename(
          'sales_items',
          dateFilter,
          selectedDate,
        );
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

        const filePath = `${cacheDirectory}${filename}`;
        const exportFile = new FileSystem.File(filePath);
        await exportFile.write(wbout, { encoding: 'base64' });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filePath);
        } else {
          Alert.alert(
            'Sharing not available',
            'Sharing is not available on this device',
          );
        }
      }

      Alert.alert('Success', 'Sales items data exported successfully!');
    } catch (error) {
      console.error('Error exporting sales items data:', error);
      Alert.alert('Error', 'Failed to export sales items data');
    } finally {
      setExporting(false);
      setShowExportModal(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with MenuButton */}
      <View style={styles.header}>
        <MenuButton onPress={openDrawer} />
        <Text style={styles.title} weight="bold">
          {t('sales.salesHistory')}
        </Text>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={showExportOptions}
          disabled={exporting || !salesSummary || salesSummary.count === 0}
        >
          <Download size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Filters Container */}
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

        {/* Payment Method Filter */}
        <View style={styles.paymentMethodFilterContainer}>
          <Text style={styles.paymentMethodFilterLabel} weight="medium">
            {t('sales.paymentMethod')}:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.paymentMethodFilters}
          >
            <TouchableOpacity
              style={[
                styles.paymentMethodFilterChip,
                paymentMethodFilter === 'All' &&
                  styles.paymentMethodFilterChipActive,
              ]}
              onPress={() => setPaymentMethodFilter('All')}
            >
              <Text
                style={[
                  styles.paymentMethodFilterText,
                  paymentMethodFilter === 'All' &&
                    styles.paymentMethodFilterTextActive,
                ]}
              >
                {t('sales.all')}
              </Text>
            </TouchableOpacity>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethodFilterChip,
                  paymentMethodFilter === method.name &&
                    styles.paymentMethodFilterChipActive,
                ]}
                onPress={() => setPaymentMethodFilter(method.name)}
              >
                <Text
                  style={[
                    styles.paymentMethodFilterText,
                    paymentMethodFilter === method.name &&
                      styles.paymentMethodFilterTextActive,
                  ]}
                >
                  {method.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

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
                  },
                )}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>
            {salesSummary?.count || 0} {t('sales.salesTotal')}{' '}
            {formatPrice(salesSummary?.total || 0)}
          </Text>
        </View>
      </View>

      {/* Sales List */}
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
            <Text style={styles.emptyStateText}>{t('sales.noSalesFound')}</Text>
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

      {/* Export Options Modal - Simplified version */}
      <Modal
        visible={showExportModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.exportModalOverlay}>
          <View style={styles.exportModalContainer}>
            <View style={styles.exportModalHeader}>
              <Text style={styles.exportModalTitle} weight="bold">
                {t('sales.exportOptions')}
              </Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
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
                  <Text style={styles.exportOptionTitle} weight="bold">
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
                  <Text style={styles.exportOptionTitle} weight="bold">
                    {t('sales.salesItemsData')}
                  </Text>
                  <Text style={styles.exportOptionDescription}>
                    {t('sales.salesItemsDataDescription')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {(exporting || loadingAllItems) && (
              <View style={styles.exportingIndicator}>
                <ActivityIndicator size="small" color="#059669" />
                <Text style={styles.exportingText}>
                  {loadingAllItems
                    ? t('sales.loadingSalesItemsData')
                    : t('sales.preparingExport')}
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

      {/* Month/Year Picker Modal - Simplified */}
      <Modal
        visible={showMonthYearPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMonthYearPicker(false)}
      >
        <View style={styles.monthPickerOverlay}>
          <View style={styles.monthPickerContainer}>
            <View style={styles.monthPickerHeader}>
              <Text style={styles.monthPickerTitle}>
                {t('sales.selectMonthYear')}
              </Text>
              <TouchableOpacity onPress={() => setShowMonthYearPicker(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.monthSelectorContainer}>
              <Text style={styles.yearSelectorLabel}>{t('sales.year')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.yearSelector}
              >
                {Array.from(
                  { length: 5 },
                  (_, i) => new Date().getFullYear() - i,
                ).map((year) => (
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
                        selectedYear === year && styles.yearOptionTextActive,
                      ]}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.monthSelectorLabel}>{t('sales.month')}</Text>
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
                        selectedMonth === month && styles.monthOptionTextActive,
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
                      isCustomerVoucher && styles.voucherToggleButtonTextActive,
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

                  <TouchableOpacity
                    style={styles.exportImageButton}
                    onPress={
                      isCustomerVoucher ? handlePrintReceipt : captureSaleDetail
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

                {selectedSale?.payment_method === 'Debt' && (
                  <TouchableOpacity
                    style={styles.recordPaymentButton}
                    onPress={handleRecordDebtPayment}
                  >
                    <FileText size={16} color="#FFFFFF" />
                    <Text style={styles.recordPaymentButtonText}>
                      {t('debt.recordPayment')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

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
                              0,
                            ),
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
                                (sum, item) => sum + item.cost * item.quantity,
                                0,
                              ),
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
                        {!isCustomerVoucher && (
                          <Text style={styles.saleItemProfit}>
                            {t('sales.profit')}{' '}
                            {formatPrice(
                              item.subtotal - item.cost * item.quantity,
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

        {/* Record Debt Payment Modal */}
        <Modal
          visible={showRecordPaymentModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowRecordPaymentModal(false)}
        >
          <View style={styles.recordPaymentModalOverlay}>
            <View style={styles.recordPaymentModalContainer}>
              <View style={styles.recordPaymentModalHeader}>
                <Text style={styles.recordPaymentModalTitle} weight="bold">
                  {t('debt.recordDebtPayment')}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowRecordPaymentModal(false)}
                  disabled={recordingPayment}
                >
                  <X size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <Text style={styles.recordPaymentModalDescription}>
                {t('sales.selectPaymentMethod')}
              </Text>

              <View style={styles.paymentMethodOptionsContainer}>
                {paymentMethods
                  .filter((method) => method.id !== 'debt')
                  .map((method) => (
                    <TouchableOpacity
                      key={method.id}
                      style={styles.paymentMethodOption}
                      onPress={() => handlePaymentMethodSelection(method.name)}
                      disabled={recordingPayment}
                    >
                      <View
                        style={[
                          styles.paymentMethodOptionIcon,
                          { backgroundColor: method.color + '20' },
                        ]}
                      >
                        <Text style={styles.paymentMethodOptionIconText}>
                          {method.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text
                        style={styles.paymentMethodOptionText}
                        weight="medium"
                      >
                        {method.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>

              {recordingPayment && (
                <View style={styles.recordingPaymentIndicator}>
                  <ActivityIndicator size="small" color="#F59E0B" />
                  <Text style={styles.recordingPaymentText}>
                    {t('sales.recordingPayment')}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.recordPaymentModalCancelButton}
                onPress={() => setShowRecordPaymentModal(false)}
                disabled={recordingPayment}
              >
                <Text style={styles.recordPaymentModalCancelText}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    color: '#111827',
    flex: 1,
    marginLeft: 12,
  },
  exportButton: {
    backgroundColor: '#10B981',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  clearButton: {
    padding: 8,
  },
  dateFilters: {
    flexDirection: 'row',
  },
  dateFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  dateFilterChipActive: {
    backgroundColor: '#059669',
  },
  dateFilterText: {
    fontSize: 14,
    color: '#6B7280',
  },
  dateFilterTextActive: {
    color: '#FFFFFF',
  },
  paymentMethodFilterContainer: {
    gap: 8,
  },
  paymentMethodFilterLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  paymentMethodFilters: {
    flexDirection: 'row',
  },
  paymentMethodFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  paymentMethodFilterChipActive: {
    backgroundColor: '#059669',
  },
  paymentMethodFilterText: {
    fontSize: 14,
    color: '#6B7280',
  },
  paymentMethodFilterTextActive: {
    color: '#FFFFFF',
  },
  customDateContainer: {
    marginTop: 8,
  },
  customDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  customDateText: {
    fontSize: 14,
    color: '#111827',
  },
  summaryContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  summaryText: {
    fontSize: 16,
    color: '#111827',
  },
  saleCard: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saleInfo: {
    flex: 1,
    gap: 4,
  },
  saleId: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  saleDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  salePayment: {
    fontSize: 14,
    color: '#059669',
  },
  saleNote: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  saleAmountContainer: {
    alignItems: 'flex-end',
    gap: 8,
  },
  saleTotal: {
    fontSize: 18,
    color: '#111827',
    fontWeight: 'bold',
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#6B7280',
    marginTop: 16,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
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
  },
  exportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exportModalTitle: {
    fontSize: 20,
    color: '#111827',
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

  monthPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  monthPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
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
    color: '#111827',
    fontWeight: '600',
  },
  monthSelectorContainer: {
    marginBottom: 24,
  },
  yearSelectorLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  yearSelector: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  yearOption: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  yearOptionActive: {
    backgroundColor: '#059669',
  },
  yearOptionText: {
    fontSize: 16,
    color: '#6B7280',
  },
  yearOptionTextActive: {
    color: '#FFFFFF',
  },
  monthSelectorLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthOption: {
    width: '22%',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  monthOptionActive: {
    backgroundColor: '#059669',
  },
  monthOptionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  monthOptionTextActive: {
    color: '#FFFFFF',
  },
  monthPickerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  monthPickerCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  monthPickerCancelText: {
    fontSize: 16,
    color: '#6B7280',
  },
  monthPickerConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  monthPickerConfirmText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
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
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    color: '#111827',
    fontWeight: '600',
  },
  modalClose: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '600',
  },
  saleDetailContent: {
    flex: 1,
    padding: 16,
  },
  saleDetailActions: {
    gap: 12,
    marginBottom: 16,
  },
  voucherToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#059669',
  },
  voucherToggleButtonActive: {
    backgroundColor: '#059669',
  },
  voucherToggleButtonText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  voucherToggleButtonTextActive: {
    color: '#FFFFFF',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteSaleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#EF4444',
  },
  deleteSaleButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  exportImageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#0284C7',
  },
  exportImageButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  recordPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F59E0B',
  },
  recordPaymentButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  captureContainer: {
    backgroundColor: '#FFFFFF',
  },
  saleDetailCard: {
    marginBottom: 16,
  },
  saleDetailTitle: {
    fontSize: 18,
    color: '#111827',
    fontWeight: '600',
    marginBottom: 16,
  },
  saleDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  saleDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  saleDetailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  saleDetailTotal: {
    fontSize: 18,
    color: '#059669',
    fontWeight: 'bold',
  },
  saleDetailProfit: {
    color: '#10B981',
    fontWeight: 'bold',
  },
  saleItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  saleItemInfo: {
    flex: 1,
    gap: 4,
  },
  saleItemName: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  saleItemDetails: {
    fontSize: 14,
    color: '#6B7280',
  },
  saleItemDiscount: {
    color: '#EF4444',
  },
  saleItemPricing: {
    alignItems: 'flex-end',
    gap: 4,
  },
  saleItemSubtotal: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  saleItemProfit: {
    fontSize: 12,
    color: '#10B981',
  },
  saleItemsTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  saleItemsTotalLabel: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  saleItemsTotalValue: {
    fontSize: 18,
    color: '#059669',
    fontWeight: 'bold',
  },
  recordPaymentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  recordPaymentModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  recordPaymentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recordPaymentModalTitle: {
    fontSize: 18,
    color: '#111827',
  },
  recordPaymentModalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  paymentMethodOptionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paymentMethodOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethodOptionIconText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  paymentMethodOptionText: {
    fontSize: 16,
    color: '#111827',
  },
  recordingPaymentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  recordingPaymentText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#F59E0B',
  },
  recordPaymentModalCancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  recordPaymentModalCancelText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
});
