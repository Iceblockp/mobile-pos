import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { DateFilterComponent } from '@/components/DateFilter';
import { useCustomAnalytics, useSalesByDateRange } from '@/hooks/useQueries';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
import DailySalesChart from '@/components/DailySalesChart';
import DailyExpensesChart from '@/components/DailyExpensesChart';
import { ReusablePieChart, CustomBarChart } from '@/components/Charts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
} from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import { usePaymentMethodAnalytics } from '@/hooks/useQueries';
import type { PaymentMethodAnalytics } from '@/services/database';
import { formatCurrency } from '@/utils/formatters';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MenuButton } from '@/components/MenuButton';
import { useDrawer } from '@/context/DrawerContext';

type FilterMode = 'day' | 'month' | 'year';

interface DateFilter {
  mode: FilterMode;
  selectedDate: Date;
  selectedMonth: number;
  selectedYear: number;
  startDate: Date;
  endDate: Date;
}

/**
 * Overview page for drawer navigation
 *
 * Features:
 * - Analytics overview with key metrics
 * - Daily sales and expenses charts
 * - Payment method analytics
 * - Top performing products
 * - Recent sales list
 * - Includes MenuButton for sidebar navigation
 *
 * Requirements:
 * - 2.1: MenuButton appears in top-left corner
 */
export default function Overview() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrencyFormatter();
  const { openDrawer } = useDrawer();

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
        1,
      );
      const endOfMonth = new Date(
        dateFilter.selectedYear,
        dateFilter.selectedMonth + 1,
        0,
        23,
        59,
        59,
        999,
      );
      return { startDate: startOfMonth, endDate: endOfMonth, limit: 100 };
    } else if (dateFilter.mode === 'year') {
      const startOfYear = new Date(dateFilter.selectedYear, 0, 1);
      startOfYear.setHours(0, 0, 0, 0);
      const endOfYear = new Date(dateFilter.selectedYear, 11, 31);
      endOfYear.setHours(23, 59, 59, 999);
      return { startDate: startOfYear, endDate: endOfYear, limit: 500 };
    } else {
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

  // Payment Method Analytics
  const {
    data: paymentAnalyticsData,
    isLoading: paymentAnalyticsLoading,
    error: paymentAnalyticsError,
    refetch: refetchPaymentAnalytics,
  } = usePaymentMethodAnalytics(startDate, endDate);

  const onRefresh = () => {
    refetchAnalytics();
    refetchSales();
    refetchPaymentAnalytics();
  };

  const isLoading = analyticsLoading || salesLoading || paymentAnalyticsLoading;
  const isRefreshing = analyticsRefetching || salesRefetching;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() - userTimezoneOffset);

    return adjustedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDaysInPeriod = () => {
    if (dateFilter.mode === 'day') return 1;

    let startDate, endDate;
    if (dateFilter.mode === 'month') {
      startDate = new Date(
        dateFilter.selectedYear,
        dateFilter.selectedMonth,
        1,
      );
      endDate = new Date(
        dateFilter.selectedYear,
        dateFilter.selectedMonth + 1,
        0,
      );
    } else if (dateFilter.mode === 'year') {
      startDate = new Date(dateFilter.selectedYear, 0, 1);
      endDate = new Date(dateFilter.selectedYear, 11, 31);
    } else {
      startDate = dateFilter.startDate;
      endDate = dateFilter.endDate;
    }

    const startDateOnly = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
    );
    const endDateOnly = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate(),
    );

    const diffTime = Math.abs(endDateOnly.getTime() - startDateOnly.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays + 1;
  };

  if (isLoading && !isRefreshing) {
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
            {t('analytics.overview')}
          </Text>
          <Text style={styles.subtitle}>{t('analytics.subtitle')}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

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
          <Text style={styles.periodStatsText} weight="medium">
            {dateFilter.mode === 'year'
              ? `12 ${t('analytics.months')} • ${
                  analytics?.totalSales || 0
                } ${t('analytics.sales')}`
              : `${getDaysInPeriod()} ${
                  getDaysInPeriod() === 1
                    ? t('analytics.day')
                    : t('analytics.days')
                } • ${analytics?.totalSales || 0} ${t('analytics.sales')}`}
          </Text>
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          {/* Total Sale Value */}
          <Card style={styles.metricCard}>
            <View style={styles.metricContent}>
              <View style={[styles.metricIcon, { backgroundColor: '#059669' }]}>
                <DollarSign size={18} color="#FFFFFF" />
              </View>
              <View style={styles.metricText}>
                <Text style={styles.metricValue} weight="bold">
                  {formatPrice(analytics?.totalRevenue || 0)}
                </Text>
                <Text style={styles.metricLabel} weight="medium">
                  {t('analytics.totalSaleValue')}
                </Text>
              </View>
            </View>
          </Card>

          {/* Total Expenses */}
          <Card style={styles.metricCard}>
            <View style={styles.metricContent}>
              <View style={[styles.metricIcon, { backgroundColor: '#EF4444' }]}>
                <TrendingDown size={18} color="#FFFFFF" />
              </View>
              <View style={styles.metricText}>
                <Text style={styles.metricValue} weight="bold">
                  {formatPrice(analytics?.totalExpenses || 0)}
                </Text>
                <Text style={styles.metricLabel} weight="medium">
                  {t('analytics.totalExpenses')}
                </Text>
              </View>
            </View>
          </Card>

          {/* Total Balance */}
          <Card style={styles.metricCard}>
            <View style={styles.metricContent}>
              <View style={[styles.metricIcon, { backgroundColor: '#3B82F6' }]}>
                <Target size={18} color="#FFFFFF" />
              </View>
              <View style={styles.metricText}>
                <Text
                  style={[
                    styles.metricValue,
                    (analytics?.netProfit || 0) < 0 && styles.negativeValue,
                  ]}
                  weight="bold"
                >
                  {formatPrice(
                    (analytics?.totalRevenue || 0) -
                      (analytics?.totalExpenses || 0),
                  )}
                </Text>
                <Text style={styles.metricLabel} weight="medium">
                  {t('analytics.totalBalance')}
                </Text>
              </View>
            </View>
          </Card>

          {/* Total Sale Profit */}
          <Card style={styles.metricCard}>
            <View style={styles.metricContent}>
              <View style={[styles.metricIcon, { backgroundColor: '#10B981' }]}>
                <TrendingUp size={18} color="#FFFFFF" />
              </View>
              <View style={styles.metricText}>
                <Text style={styles.metricValue} weight="bold">
                  {formatPrice(analytics?.totalProfit || 0)}
                </Text>
                <Text style={styles.metricLabel} weight="medium">
                  {t('analytics.totalSaleProfit')}
                </Text>
              </View>
            </View>
          </Card>

          {/* Net Profit */}
          <Card style={styles.metricCard}>
            <View style={styles.metricContent}>
              <View style={[styles.metricIcon, { backgroundColor: '#8B5CF6' }]}>
                <Target size={18} color="#FFFFFF" />
              </View>
              <View style={styles.metricText}>
                <Text
                  style={[
                    styles.metricValue,
                    (analytics?.netProfit || 0) < 0 && styles.negativeValue,
                  ]}
                  weight="bold"
                >
                  {formatPrice(analytics?.netProfit || 0)}
                </Text>
                <Text style={styles.metricLabel} weight="medium">
                  {t('analytics.netProfit')}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Daily Sales Chart */}
        <DailySalesChart startDate={startDate} endDate={endDate} />

        {/* Daily Expenses Chart */}
        <DailyExpensesChart startDate={startDate} endDate={endDate} />

        {/* Payment Method Analytics Chart */}
        {paymentAnalyticsData && paymentAnalyticsData.length > 0 ? (
          <CustomBarChart
            data={{
              labels: paymentAnalyticsData.map(
                (item: PaymentMethodAnalytics) => item.payment_method,
              ),
              datasets: [
                {
                  data: paymentAnalyticsData.map(
                    (item: PaymentMethodAnalytics) => item.total_amount,
                  ),
                },
              ],
            }}
            title={t('analytics.paymentMethodsAnalytics')}
            formatYLabel={(value) => formatCurrency(parseFloat(value))}
            footer={{
              label: t('analytics.totalRevenue'),
              value: formatCurrency(
                paymentAnalyticsData.reduce(
                  (sum: number, item: PaymentMethodAnalytics) =>
                    sum + item.total_amount,
                  0,
                ),
              ),
            }}
          />
        ) : null}

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
              }),
            )}
            size={200}
            showPercentage={true}
            showLegend={true}
          />
        ) : null}

        {/* Top Performing Products */}
        <Card>
          <Text style={styles.sectionTitle} weight="medium">
            {t('analytics.topPerformingProducts')}
          </Text>
          {analytics?.topProducts && analytics?.topProducts.length > 0 ? (
            analytics?.topProducts.map((product: any, index: number) => (
              <View key={index} style={styles.productRank}>
                <View style={styles.rankNumber}>
                  <Text style={styles.rankText} weight="bold">
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} weight="medium">
                    {product.name}
                  </Text>
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
                  <Text style={styles.revenueAmount} weight="medium">
                    {formatPrice(product.revenue)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noData}>{t('analytics.noSalesForPeriod')}</Text>
          )}
        </Card>

        {/* Recent Sales */}
        <Card>
          <Text style={styles.sectionTitle} weight="medium">
            {t('analytics.recentSales')}
          </Text>
          {recentSales.length > 0 ? (
            recentSales.slice(0, 10).map((sale) => (
              <View key={sale.id} style={styles.saleItem}>
                <View style={styles.saleInfo}>
                  <Text style={styles.saleId} weight="medium">
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
                <Text style={styles.saleAmount} weight="medium">
                  {formatPrice(sale.total)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noData}>{t('analytics.noSalesForPeriod')}</Text>
          )}
        </Card>

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  headerRight: {
    width: 44,
  },
  title: {
    fontSize: 28,
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 4,
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
  },
  sectionTitle: {
    fontSize: 18,
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
    color: '#111827',
    textAlign: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  negativeValue: {
    color: '#EF4444',
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
    color: '#FFFFFF',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    color: '#111827',
  },
  productStats: {
    fontSize: 14,
    color: '#6B7280',
  },
  productMargin: {
    fontSize: 12,
    color: '#10B981',
  },
  productRevenue: {
    alignItems: 'flex-end',
  },
  revenueAmount: {
    fontSize: 16,
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
    color: '#111827',
  },
  saleDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  salePayment: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  saleAmount: {
    fontSize: 16,
    color: '#111827',
  },
  noData: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 24,
  },
  bottomPadding: {
    height: 20,
  },
});
