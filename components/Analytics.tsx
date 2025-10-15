import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Platform,
  RefreshControl,
} from 'react-native';
import { CustomerAnalytics } from './CustomerAnalytics';
import AIAnalyticsTab from './AIAnalyticsTab';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { DateFilterComponent } from '@/components/DateFilter';
import { useCustomAnalytics, useSalesByDateRange } from '@/hooks/useQueries';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
import DailySalesChart from '@/components/DailySalesChart';
import DailyExpensesChart from '@/components/DailyExpensesChart';
import { ReusablePieChart } from '@/components/Charts';
import { Sale } from '@/services/database';
import {
  ChartBar as BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  Target,
  TrendingDown,
  Users,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from '@/context/LocalizationContext';

type FilterMode = 'day' | 'month' | 'year';
type AnalyticsTab = 'overview' | 'customers' | 'ai-analytics';

interface DateFilter {
  mode: FilterMode;
  selectedDate: Date;
  selectedMonth: number;
  selectedYear: number;
  startDate: Date;
  endDate: Date;
}

interface TabOption {
  key: AnalyticsTab;
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
}

export default function Analytics() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [showTabPicker, setShowTabPicker] = useState(false);

  // Tab options configuration
  const tabOptions: TabOption[] = [
    {
      key: 'overview',
      label: t('analytics.overview'),
      icon: BarChart3,
    },
    {
      key: 'customers',
      label: t('analytics.customers'),
      icon: Users,
    },
    {
      key: 'ai-analytics',
      label: t('reports.aiAnalytics'),
      icon: Target, // Using Target icon for AI Analytics
    },
  ];

  // Get current tab info
  const currentTab = tabOptions.find((tab) => tab.key === activeTab);

  // Initialize with today as default
  const today = new Date();
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    mode: 'day',
    selectedDate: today,
    selectedMonth: today.getMonth(),
    selectedYear: today.getFullYear(),
    startDate: today,
    endDate: today,
  });

  // Calculate date range based on filter mode
  const getDateRange = () => {
    if (dateFilter.mode === 'day') {
      const startOfDay = new Date(dateFilter.selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateFilter.selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      return { startDate: startOfDay, endDate: endOfDay, limit: 50 };
    } else if (dateFilter.mode === 'month') {
      const startOfMonth = new Date(
        dateFilter.selectedYear,
        dateFilter.selectedMonth,
        1
      );
      const endOfMonth = new Date(
        dateFilter.selectedYear,
        dateFilter.selectedMonth + 1,
        0,
        23,
        59,
        59,
        999
      );
      return { startDate: startOfMonth, endDate: endOfMonth, limit: 100 };
    } else if (dateFilter.mode === 'year') {
      const startOfYear = new Date(dateFilter.selectedYear, 0, 1);
      startOfYear.setHours(0, 0, 0, 0);
      const endOfYear = new Date(dateFilter.selectedYear, 11, 31);
      endOfYear.setHours(23, 59, 59, 999);
      return { startDate: startOfYear, endDate: endOfYear, limit: 500 };
    } else {
      // Fallback for any other mode
      return {
        startDate: dateFilter.startDate,
        endDate: dateFilter.endDate,
        limit: 100,
      };
    }
  };

  const { startDate, endDate, limit } = getDateRange();

  // Use React Query for optimized data fetching
  const {
    data: analytics,
    isLoading: analyticsLoading,
    isRefetching: analyticsRefetching,
    refetch: refetchAnalytics,
  } = useCustomAnalytics(startDate, endDate);

  const {
    data: recentSales = [],
    isLoading: salesLoading,
    isRefetching: salesRefetching,
    refetch: refetchSales,
  } = useSalesByDateRange(startDate, endDate, limit);

  const onRefresh = () => {
    refetchAnalytics();
    refetchSales();
  };

  const isLoading = analyticsLoading || salesLoading;
  const isRefreshing = analyticsRefetching || salesRefetching;

  const { formatPrice } = useCurrencyFormatter();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);

    // Adjust for timezone offset to display local time correctly
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() - userTimezoneOffset);

    return adjustedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFilterDisplayText = () => {
    switch (dateFilter.mode) {
      case 'day':
        const isToday =
          dateFilter.selectedDate.toDateString() === new Date().toDateString();
        if (isToday) {
          return t('common.today');
        }
        return dateFilter.selectedDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      case 'month':
        const monthNames = [
          t('analytics.january'),
          t('analytics.february'),
          t('analytics.march'),
          t('analytics.april'),
          t('analytics.may'),
          t('analytics.june'),
          t('analytics.july'),
          t('analytics.august'),
          t('analytics.september'),
          t('analytics.october'),
          t('analytics.november'),
          t('analytics.december'),
        ];
        return `${monthNames[dateFilter.selectedMonth]} ${
          dateFilter.selectedYear
        }`;
      case 'year':
        const isCurrentYear =
          dateFilter.selectedYear === new Date().getFullYear();
        if (isCurrentYear) {
          return 'This Year';
        }
        return dateFilter.selectedYear.toString();
      default:
        return t('analytics.selectPeriod');
    }
  };

  const getDaysInPeriod = () => {
    if (dateFilter.mode === 'day') return 1;

    let startDate, endDate;
    if (dateFilter.mode === 'month') {
      startDate = new Date(
        dateFilter.selectedYear,
        dateFilter.selectedMonth,
        1
      );
      endDate = new Date(
        dateFilter.selectedYear,
        dateFilter.selectedMonth + 1,
        0
      );
    } else if (dateFilter.mode === 'year') {
      startDate = new Date(dateFilter.selectedYear, 0, 1);
      endDate = new Date(dateFilter.selectedYear, 11, 31);
    } else {
      startDate = dateFilter.startDate;
      endDate = dateFilter.endDate;
    }

    // Calculate days by comparing just the date parts (ignore time)
    const startDateOnly = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate()
    );
    const endDateOnly = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate()
    );

    const diffTime = Math.abs(endDateOnly.getTime() - startDateOnly.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Add 1 to include both start and end dates
    return diffDays + 1;
  };

  const getGrowthIndicator = (current: number, previous: number) => {
    if (previous === 0) return { percentage: 0, isPositive: true };
    const percentage = ((current - previous) / previous) * 100;
    return { percentage: Math.abs(percentage), isPositive: percentage >= 0 };
  };

  const handleTabChange = (tabKey: AnalyticsTab) => {
    setActiveTab(tabKey);
    setShowTabPicker(false);
  };

  if (isLoading && !isRefreshing) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Dynamic Header with Tab Picker */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>
              {currentTab?.label || t('analytics.title')}
            </Text>
            <Text style={styles.subtitle}>{t('analytics.subtitle')}</Text>
          </View>

          <TouchableOpacity
            style={styles.tabPickerButton}
            onPress={() => setShowTabPicker(true)}
          >
            {currentTab && <currentTab.icon size={20} color="#059669" />}
            <ChevronDown size={16} color="#6B7280" style={styles.chevronIcon} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Picker Modal */}
      <Modal
        visible={showTabPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTabPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTabPicker(false)}
        >
          <View style={styles.tabPickerModal}>
            <Text style={styles.tabPickerTitle}>
              {t('analytics.selectView')}
            </Text>

            {tabOptions.map((tab) => {
              const IconComponent = tab.icon;
              const isSelected = activeTab === tab.key;

              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tabPickerOption,
                    isSelected && styles.tabPickerOptionSelected,
                  ]}
                  onPress={() => handleTabChange(tab.key)}
                >
                  <IconComponent
                    size={20}
                    color={isSelected ? '#059669' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.tabPickerOptionText,
                      isSelected && styles.tabPickerOptionTextSelected,
                    ]}
                  >
                    {tab.label}
                  </Text>
                  {isSelected && <View style={styles.selectedIndicator} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#059669']}
              tintColor={'#059669'}
            />
          }
        >
          {/* Date Filter Component */}
          <DateFilterComponent
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            containerStyle={styles.dateFilterContainer}
          />

          {/* Period Statistics */}
          <View style={styles.periodStats}>
            <Text style={styles.periodStatsText}>
              {dateFilter.mode === 'year'
                ? `12 months • ${analytics?.totalSales || 0} sales`
                : `${getDaysInPeriod()} ${
                    getDaysInPeriod() === 1
                      ? t('analytics.day')
                      : t('analytics.days')
                  } • ${analytics?.totalSales || 0} sales`}
            </Text>
          </View>

          {/* Key Metrics */}
          <View style={styles.metricsGrid}>
            {/* Total Sale Value */}
            <Card style={styles.metricCard}>
              <View style={styles.metricContent}>
                <View
                  style={[styles.metricIcon, { backgroundColor: '#059669' }]}
                >
                  <DollarSign size={18} color="#FFFFFF" />
                </View>
                <View style={styles.metricText}>
                  <Text style={styles.metricValue}>
                    {formatPrice(analytics?.totalRevenue || 0)}
                  </Text>
                  <Text style={styles.metricLabel}>Total Sale Value</Text>
                </View>
              </View>
            </Card>

            {/* Total Expenses */}
            <Card style={styles.metricCard}>
              <View style={styles.metricContent}>
                <View
                  style={[styles.metricIcon, { backgroundColor: '#EF4444' }]}
                >
                  <TrendingDown size={18} color="#FFFFFF" />
                </View>
                <View style={styles.metricText}>
                  <Text style={styles.metricValue}>
                    {formatPrice(analytics?.totalExpenses || 0)}
                  </Text>
                  <Text style={styles.metricLabel}>
                    {t('analytics.totalExpenses')}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Total Balance */}
            <Card style={styles.metricCard}>
              <View style={styles.metricContent}>
                <View
                  style={[styles.metricIcon, { backgroundColor: '#3B82F6' }]}
                >
                  <Target size={18} color="#FFFFFF" />
                </View>
                <View style={styles.metricText}>
                  <Text
                    style={[
                      styles.metricValue,
                      (analytics?.netProfit || 0) < 0 && styles.negativeValue,
                    ]}
                  >
                    {formatPrice(analytics?.netProfit || 0)}
                  </Text>
                  <Text style={styles.metricLabel}>Total Balance</Text>
                </View>
              </View>
            </Card>

            {/* Total Sale Profit */}
            <Card style={styles.metricCard}>
              <View style={styles.metricContent}>
                <View
                  style={[styles.metricIcon, { backgroundColor: '#10B981' }]}
                >
                  <TrendingUp size={18} color="#FFFFFF" />
                </View>
                <View style={styles.metricText}>
                  <Text style={styles.metricValue}>
                    {formatPrice(analytics?.totalProfit || 0)}
                  </Text>
                  <Text style={styles.metricLabel}>Total Sale Profit</Text>
                </View>
              </View>
            </Card>

            {/* Net Profit */}
            <Card style={styles.metricCard}>
              <View style={styles.metricContent}>
                <View
                  style={[styles.metricIcon, { backgroundColor: '#8B5CF6' }]}
                >
                  <Target size={18} color="#FFFFFF" />
                </View>
                <View style={styles.metricText}>
                  <Text
                    style={[
                      styles.metricValue,
                      (analytics?.netProfit || 0) < 0 && styles.negativeValue,
                    ]}
                  >
                    {formatPrice(analytics?.netProfit || 0)}
                  </Text>
                  <Text style={styles.metricLabel}>
                    {t('analytics.netProfit')}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Total Sale Count */}
            <Card style={styles.metricCard}>
              <View style={styles.metricContent}>
                <View
                  style={[styles.metricIcon, { backgroundColor: '#F59E0B' }]}
                >
                  <BarChart3 size={18} color="#FFFFFF" />
                </View>
                <View style={styles.metricText}>
                  <Text style={styles.metricValue}>
                    {analytics?.totalSales || 0}
                  </Text>
                  <Text style={styles.metricLabel}>Total Sale Count</Text>
                </View>
              </View>
            </Card>
          </View>

          {/* Daily Sales Chart */}
          <DailySalesChart startDate={startDate} endDate={endDate} />

          {/* Daily Expenses Chart */}
          <DailyExpensesChart startDate={startDate} endDate={endDate} />

          {/* Expense Breakdown Pie Chart */}
          {analytics?.expensesByCategory &&
          analytics.expensesByCategory.length > 0 ? (
            <ReusablePieChart
              title={t('analytics.expenseBreakdown')}
              data={analytics.expensesByCategory.map(
                (category: any, index: number) => ({
                  name: category.category_name,
                  value: category.amount,
                  color: [
                    '#EF4444',
                    '#F59E0B',
                    '#10B981',
                    '#3B82F6',
                    '#8B5CF6',
                    '#EC4899',
                    '#6B7280',
                    '#059669',
                  ][index % 8],
                })
              )}
              size={200}
              showPercentage={true}
              showLegend={true}
            />
          ) : (
            <Card>
              <Text style={styles.sectionTitle}>
                {t('analytics.expenseBreakdown')}
              </Text>
              <Text style={styles.noData}>{t('analytics.noExpenseData')}</Text>
            </Card>
          )}

          {/* Top Performing Products */}
          <Card>
            <Text style={styles.sectionTitle}>
              {t('analytics.topPerformingProducts')}
            </Text>
            {analytics?.topProducts && analytics?.topProducts.length > 0 ? (
              analytics?.topProducts.map((product: any, index: number) => (
                <View key={index} style={styles.productRank}>
                  <View style={styles.rankNumber}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productStats}>
                      {product.quantity} {t('analytics.units')} •{' '}
                      {t('analytics.profit')}: {formatPrice(product.profit)}
                    </Text>
                    <Text style={styles.productMargin}>
                      {t('analytics.profitMargin')}:{' '}
                      {product.margin?.toFixed(1) || 0}%
                    </Text>
                  </View>
                  <View style={styles.productRevenue}>
                    <Text style={styles.revenueAmount}>
                      {formatPrice(product.revenue)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noData}>
                {t('analytics.noSalesForPeriod')}
              </Text>
            )}
          </Card>

          {/* Recent Sales */}
          <Card>
            <Text style={styles.sectionTitle}>
              {t('analytics.recentSales')}
            </Text>
            {recentSales.length > 0 ? (
              recentSales.slice(0, 10).map((sale) => (
                <View key={sale.id} style={styles.saleItem}>
                  <View style={styles.saleInfo}>
                    <Text style={styles.saleId}>
                      {t('analytics.saleId')}
                      {sale.id}
                    </Text>
                    <Text style={styles.saleDate}>
                      {formatDate(sale.created_at)}
                    </Text>
                    <Text style={styles.salePayment}>
                      {t('analytics.payment')}:{' '}
                      {sale.payment_method.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.saleAmount}>
                    {formatPrice(sale.total)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.noData}>
                {t('analytics.noSalesForPeriod')}
              </Text>
            )}
          </Card>
        </ScrollView>
      )}

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <CustomerAnalytics customerId={undefined} />
      )}

      {/* AI Analytics Tab */}
      {activeTab === 'ai-analytics' && <AIAnalyticsTab />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
  tabPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginLeft: 16,
  },
  chevronIcon: {
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabPickerModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    margin: 32,
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  tabPickerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  tabPickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  tabPickerOptionSelected: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#059669',
  },
  tabPickerOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginLeft: 12,
    flex: 1,
  },
  tabPickerOptionTextSelected: {
    color: '#059669',
    fontFamily: 'Inter-SemiBold',
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  content: {
    flex: 1,
    padding: 10,
  },
  dateFilterContainer: {
    marginBottom: 20,
  },
  periodStats: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  periodStatsText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    width: '32%',
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 85,
  },
  metricContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricText: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    textAlign: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 12,
  },
  negativeValue: {
    color: '#EF4444',
  },
  metricSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  growthIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  growthText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 4,
  },
  insightItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  insightLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
  },
  insightValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  productRank: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rankNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  productStats: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  productMargin: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#10B981',
  },
  productRevenue: {
    alignItems: 'flex-end',
  },
  revenueAmount: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  saleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  saleInfo: {
    flex: 1,
  },
  saleId: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  saleDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  salePayment: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  saleAmount: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  noData: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 24,
  },

  subSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  expenseValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expensePercentage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginLeft: 8,
  },
  noDataText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
});
