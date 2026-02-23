import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  ActivityIndicator,
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useSaleMutations, useAllSalesForExport } from '@/hooks/useQueries';
import {
  useInfiniteSales,
  useInfiniteSalesByDateRange,
} from '@/hooks/useInfiniteQueries';
import { useDatabase } from '@/context/DatabaseContext';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
import { useRouter } from 'expo-router';
import {
  History,
  Calendar,
  Download,
  X,
  Eye,
  FileText,
  FileSpreadsheet,
  MoreVertical,
  LayoutGrid,
  List,
} from 'lucide-react-native';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import { cacheDirectory } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/context/LocalizationContext';
import { MyanmarTextInput as TextInput } from '@/components/MyanmarTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MenuButton } from '@/components/MenuButton';
import { useDrawer } from '@/context/DrawerContext';
import { DateRangePicker } from '@/components/DateRangePicker';
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
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const today = new Date();
  const [customStartDate, setCustomStartDate] = useState(today);
  const [customEndDate, setCustomEndDate] = useState(today);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [allSaleItems, setAllSaleItems] = useState<any[]>([]);
  const [loadingAllItems, setLoadingAllItems] = useState(false);
  const { formatPrice } = useCurrencyFormatter();

  // View mode and dropdown menu state
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  // Payment method filter state
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('All');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  // Load payment methods on mount
  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const methods = await (
          await import('@/services/paymentMethodService')
        ).PaymentMethodService.getPaymentMethods();
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
    customStart: Date,
    customEnd: Date,
  ) => {
    const formatDateForFilename = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    const filename = `${baseFilename}_${formatDateForFilename(customStart)}_to_${formatDateForFilename(customEnd)}.xlsx`;
    return filename;
  };

  const calculateDateRange = (
    customStart: Date,
    customEnd: Date,
  ): [Date, Date] => {
    const startDate = new Date(customStart);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(customEnd);
    endDate.setHours(23, 59, 59, 999);

    return [startDate, endDate];
  };

  const [startDate, endDate] = calculateDateRange(
    customStartDate,
    customEndDate,
  );

  const {
    data: salesPages,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: salesLoading,
  } = useInfiniteSalesByDateRange(startDate, endDate);

  const sales = salesPages?.pages.flatMap((page) => page.data) || [];

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      // Search by voucher ID (full, date prefix, sequential number, or partial match), payment method, customer name, or note
      const matchesFullVoucher = sale.voucher_id === searchQuery;
      const matchesDatePrefix = sale.voucher_id.startsWith(searchQuery);
      const matchesSequential = sale.voucher_id.endsWith(
        `-${searchQuery.padStart(3, '0')}`,
      );
      const matchesPartial = sale.voucher_id.includes(searchQuery);

      const matchesPaymentMethod = sale.payment_method
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCustomer =
        sale.customer_name &&
        sale.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesNote =
        sale.note &&
        sale.note.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSearch =
        !searchQuery ||
        matchesFullVoucher ||
        matchesDatePrefix ||
        matchesSequential ||
        matchesPartial ||
        matchesPaymentMethod ||
        matchesCustomer ||
        matchesNote;

      const matchesPaymentMethodFilter =
        paymentMethodFilter === 'All' ||
        sale.payment_method === paymentMethodFilter;

      return matchesSearch && matchesPaymentMethodFilter;
    });
  }, [sales, searchQuery, paymentMethodFilter]);

  // Calculate summary from filtered sales
  const salesSummary = useMemo(() => {
    return {
      count: filteredSales.length,
      total: filteredSales.reduce((sum, sale) => sum + sale.total, 0),
    };
  }, [filteredSales]);

  const { data: allSalesForExport, refetch: refetchAllSales } =
    useAllSalesForExport(searchQuery, undefined, startDate, endDate, -390);

  const { deleteSale } = useSaleMutations();
  const { db } = useDatabase();

  const loadMore = () => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  };

  const handleSalePress = (sale: any) => {
    router.push({
      pathname: '/(drawer)/sale-detail',
      params: { sale: JSON.stringify(sale) },
    });
  };

  useEffect(() => {
    setAllSaleItems([]);
  }, [searchQuery, customStartDate, customEndDate]);

  const handleDateRangeApply = (start: Date, end: Date) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
  };

  const formatDateRangeDisplay = () => {
    const isSameDay =
      customStartDate.getDate() === customEndDate.getDate() &&
      customStartDate.getMonth() === customEndDate.getMonth() &&
      customStartDate.getFullYear() === customEndDate.getFullYear();

    if (isSameDay) {
      return customStartDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }

    return `${customStartDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })} - ${customEndDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
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
          voucher_id: sale.voucher_id,
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
          'Sale ID': sale.voucher_id,
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
          customStartDate,
          customEndDate,
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
          'Sale ID': item.voucher_id,
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
          customStartDate,
          customEndDate,
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
    <TouchableWithoutFeedback onPress={() => setShowOptionsMenu(false)}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header with MenuButton */}
        <View style={styles.header}>
          <MenuButton onPress={openDrawer} />
          <Text style={styles.title} weight="bold">
            {t('sales.salesHistory')}
          </Text>
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => setShowOptionsMenu(!showOptionsMenu)}
          >
            <MoreVertical size={20} color="#111827" />
          </TouchableOpacity>

          {/* Options Dropdown Menu */}
          {showOptionsMenu && (
            <View style={styles.optionsMenu}>
              <TouchableOpacity
                style={styles.optionsMenuItem}
                onPress={() => {
                  setShowOptionsMenu(false);
                  showExportOptions();
                }}
                disabled={
                  exporting || !salesSummary || salesSummary.count === 0
                }
              >
                <Download size={18} color="#059669" />
                <Text style={styles.optionsMenuItemText}>
                  {t('sales.exportData')}
                </Text>
              </TouchableOpacity>

              <View style={styles.optionsMenuDivider} />

              <TouchableOpacity
                style={styles.optionsMenuItem}
                onPress={() => {
                  setViewMode(viewMode === 'card' ? 'table' : 'card');
                  setShowOptionsMenu(false);
                }}
              >
                {viewMode === 'card' ? (
                  <List size={18} color="#059669" />
                ) : (
                  <LayoutGrid size={18} color="#059669" />
                )}
                <Text style={styles.optionsMenuItemText}>
                  {viewMode === 'card'
                    ? t('sales.tableView')
                    : t('sales.cardView')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
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

          {/* Date Range Picker Button */}
          <TouchableOpacity
            style={styles.dateRangePickerButton}
            onPress={() => setShowDateRangePicker(true)}
          >
            <Calendar size={20} color="#059669" />
            <Text style={styles.dateRangePickerButtonText}>
              {formatDateRangeDisplay()}
            </Text>
          </TouchableOpacity>

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

          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>
              {salesSummary?.count || 0} {t('sales.salesTotal')}{' '}
              {formatPrice(salesSummary?.total || 0)}
            </Text>
          </View>
        </View>

        {/* Sales List */}
        {viewMode === 'card' ? (
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
                  {searchQuery
                    ? t('sales.tryAdjustingFilters')
                    : t('sales.noSalesMadeYet')}
                </Text>
              </View>
            )}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            renderItem={({ item: sale }) => {
              const isDebt = sale.payment_method.toLowerCase() === 'debt';
              const cardStyle = isDebt
                ? { ...styles.saleCard, ...styles.saleCardDebt }
                : styles.saleCard;
              return (
                <TouchableOpacity onPress={() => handleSalePress(sale)}>
                  <Card style={cardStyle}>
                    <View style={styles.saleHeader}>
                      <View style={styles.saleInfo}>
                        <Text style={styles.saleId}>
                          {t('sales.saleNumber')} {sale.voucher_id}
                        </Text>
                        <Text style={styles.saleDate}>
                          {formatDate(sale.created_at)}
                        </Text>
                        <Text
                          style={[
                            styles.salePayment,
                            isDebt && styles.salePaymentDebt,
                          ]}
                        >
                          {t('sales.payment')}{' '}
                          {sale.payment_method.toUpperCase()}
                        </Text>
                        {sale.note && (
                          <Text style={styles.saleNote} numberOfLines={1}>
                            {t('sales.saleNote')}: {sale.note}
                          </Text>
                        )}
                      </View>
                      <View style={styles.saleAmountContainer}>
                        <Text
                          style={[
                            styles.saleTotal,
                            isDebt && styles.saleTotalDebt,
                          ]}
                        >
                          {formatPrice(sale.total)}
                        </Text>
                        <Eye size={16} color={isDebt ? '#DC2626' : '#6B7280'} />
                      </View>
                    </View>
                    {isDebt && (
                      <View style={styles.debtIndicator}>
                        <Text style={styles.debtIndicatorText}>
                          {t('debt.unpaid')}
                        </Text>
                      </View>
                    )}
                  </Card>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <View style={[styles.tableHeaderCell, { width: 250 }]}>
                  <Text style={styles.tableHeaderText} weight="medium">
                    {t('sales.saleId')}
                  </Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: 250 }]}>
                  <Text style={styles.tableHeaderText} weight="medium">
                    {t('sales.date')}
                  </Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: 200 }]}>
                  <Text style={styles.tableHeaderText} weight="medium">
                    {t('sales.paymentMethod')}
                  </Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: 200 }]}>
                  <Text style={styles.tableHeaderText} weight="medium">
                    {t('sales.totalAmount')}
                  </Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: 200 }]}>
                  <Text style={styles.tableHeaderText} weight="medium">
                    {t('sales.saleNote')}
                  </Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: 80 }]}>
                  <Text style={styles.tableHeaderText} weight="medium">
                    {t('common.actions')}
                  </Text>
                </View>
              </View>

              {/* Table Rows */}
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
                      {searchQuery
                        ? t('sales.tryAdjustingFilters')
                        : t('sales.noSalesMadeYet')}
                    </Text>
                  </View>
                )}
                renderItem={({ item: sale }) => {
                  const isDebt = sale.payment_method.toLowerCase() === 'debt';
                  return (
                    <TouchableOpacity
                      onPress={() => handleSalePress(sale)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[styles.tableRow, isDebt && styles.tableRowDebt]}
                      >
                        {/* Sale ID */}
                        <View style={[styles.tableCell, { width: 250 }]}>
                          <Text style={styles.tableCellText}>
                            #{sale.voucher_id}
                          </Text>
                        </View>

                        {/* Date */}
                        <View style={[styles.tableCell, { width: 250 }]}>
                          <Text style={styles.tableCellText} numberOfLines={2}>
                            {formatDate(sale.created_at)}
                          </Text>
                        </View>

                        {/* Payment Method */}
                        <View style={[styles.tableCell, { width: 200 }]}>
                          <Text
                            style={[
                              styles.tableCellText,
                              isDebt && styles.tableCellTextDebt,
                            ]}
                          >
                            {sale.payment_method.toUpperCase()}
                          </Text>
                        </View>

                        {/* Total Amount */}
                        <View style={[styles.tableCell, { width: 200 }]}>
                          <Text
                            style={[
                              styles.tableCellText,
                              styles.tableCellAmount,
                              isDebt && styles.tableCellTextDebt,
                            ]}
                          >
                            {formatPrice(sale.total)}
                          </Text>
                        </View>

                        {/* Note */}
                        <View style={[styles.tableCell, { width: 200 }]}>
                          <Text style={styles.tableCellText} numberOfLines={2}>
                            {sale.note || '-'}
                          </Text>
                        </View>

                        {/* Actions */}
                        <View style={[styles.tableCell, { width: 80 }]}>
                          <TouchableOpacity
                            onPress={() => handleSalePress(sale)}
                            style={styles.tableActionButton}
                          >
                            <Eye size={16} color="#059669" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            </View>
          </ScrollView>
        )}

        {/* Date Range Picker */}
        <DateRangePicker
          visible={showDateRangePicker}
          onClose={() => setShowDateRangePicker(false)}
          onApply={handleDateRangeApply}
          initialStartDate={customStartDate}
          initialEndDate={customEndDate}
          maxDate={new Date()}
        />

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
      </SafeAreaView>
    </TouchableWithoutFeedback>
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
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsMenu: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  optionsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionsMenuItemText: {
    fontSize: 15,
    color: '#111827',
  },
  optionsMenuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
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
  dateRangePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#059669',
  },
  dateRangePickerButtonText: {
    flex: 1,
    fontSize: 15,
    color: '#059669',
    fontWeight: '600',
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
  saleCardDebt: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
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
  salePaymentDebt: {
    color: '#DC2626',
    fontWeight: '600',
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
  saleTotalDebt: {
    color: '#DC2626',
  },
  debtIndicator: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
    alignItems: 'center',
  },
  debtIndicatorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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

  // Table View Styles
  tableContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableHeaderCell: {
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  tableHeaderText: {
    fontSize: 13,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  tableRowDebt: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  tableCell: {
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  tableCellText: {
    fontSize: 14,
    color: '#111827',
  },
  tableCellTextDebt: {
    color: '#DC2626',
    fontWeight: '600',
  },
  tableCellAmount: {
    fontWeight: '600',
  },
  tableActionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
