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
import { StockAnalytics } from './StockAnalytics';
import { BulkPricingAnalytics } from './BulkPricingAnalytics';
import { CustomerAnalytics } from './CustomerAnalytics';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useCustomAnalytics, useSalesByDateRange } from '@/hooks/useQueries';
import AnalyticsCharts from '@/components/AnalyticsCharts';
import { Sale } from '@/services/database';
import {
  ChartBar as BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  Target,
  TrendingDown,
  Users,
  Package,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from '@/context/LocalizationContext';

type FilterMode = 'day' | 'month' | 'range';

interface DateFilter {
  mode: FilterMode;
  selectedDate: Date;
  selectedMonth: number;
  selectedYear: number;
  startDate: Date;
  endDate: Date;
}

export default function Analytics() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'customers' | 'stock' | 'pricing'
  >('overview');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

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

  const onRefresh = () => {
    refetchAnalytics();
    refetchSales();
  };

  const isLoading = analyticsLoading || salesLoading;
  const isRefreshing = analyticsRefetching || salesRefetching;

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
      case 'range':
        const start = dateFilter.startDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        const end = dateFilter.endDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        return `${start} - ${end}`;
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

  const handleQuickFilter = (mode: FilterMode, value?: any) => {
    const today = new Date();

    switch (mode) {
      case 'day':
        if (value === 'today') {
          setDateFilter({
            ...dateFilter,
            mode: 'day',
            selectedDate: today,
          });
        } else if (value === 'yesterday') {
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          setDateFilter({
            ...dateFilter,
            mode: 'day',
            selectedDate: yesterday,
          });
        }
        break;
      case 'month':
        if (value === 'current') {
          setDateFilter({
            ...dateFilter,
            mode: 'month',
            selectedMonth: today.getMonth(),
            selectedYear: today.getFullYear(),
          });
        } else if (value === 'previous') {
          const prevMonth = today.getMonth() - 1;
          const year =
            prevMonth < 0 ? today.getFullYear() - 1 : today.getFullYear();
          const month = prevMonth < 0 ? 11 : prevMonth;
          setDateFilter({
            ...dateFilter,
            mode: 'month',
            selectedMonth: month,
            selectedYear: year,
          });
        }
        break;
      case 'range':
        if (value === 'week') {
          // Calculate proper "This Week" (Monday to Sunday)
          const weekStart = new Date(today);
          const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days to Monday
          weekStart.setDate(today.getDate() - daysToMonday);
          weekStart.setHours(0, 0, 0, 0);

          // Calculate the end of the week (Sunday)
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6); // Monday + 6 days = Sunday
          weekEnd.setHours(23, 59, 59, 999);

          setDateFilter({
            ...dateFilter,
            mode: 'range',
            startDate: weekStart,
            endDate: weekEnd,
          });
        } else if (value === 'last7days') {
          // Keep the last 7 days functionality as a separate option
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - 6);
          weekStart.setHours(0, 0, 0, 0);

          const weekEnd = new Date(today);
          weekEnd.setHours(23, 59, 59, 999);

          setDateFilter({
            ...dateFilter,
            mode: 'range',
            startDate: weekStart,
            endDate: weekEnd,
          });
        } else if (value === 'month') {
          const monthStart = new Date(today);
          monthStart.setDate(today.getDate() - 29);
          monthStart.setHours(0, 0, 0, 0);

          const monthEnd = new Date(today);
          monthEnd.setHours(23, 59, 59, 999);

          setDateFilter({
            ...dateFilter,
            mode: 'range',
            startDate: monthStart,
            endDate: monthEnd,
          });
        }
        break;
    }
    setShowFilterModal(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth =
      direction === 'next'
        ? dateFilter.selectedMonth + 1
        : dateFilter.selectedMonth - 1;
    let newYear = dateFilter.selectedYear;
    let adjustedMonth = newMonth;

    if (newMonth > 11) {
      adjustedMonth = 0;
      newYear += 1;
    } else if (newMonth < 0) {
      adjustedMonth = 11;
      newYear -= 1;
    }

    setDateFilter({
      ...dateFilter,
      selectedMonth: adjustedMonth,
      selectedYear: newYear,
    });
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(dateFilter.selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));

    setDateFilter({
      ...dateFilter,
      selectedDate: newDate,
    });
  };

  // Helper function to check if current filter represents "this week"
  const isCurrentWeek = () => {
    if (dateFilter.mode !== 'range') return false;

    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - daysToMonday);
    currentWeekStart.setHours(0, 0, 0, 0);

    // Calculate the end of the week (Sunday) - same logic as handleQuickFilter
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6); // Monday + 6 days = Sunday
    currentWeekEnd.setHours(23, 59, 59, 999);

    // Check if the filter dates match the current week
    const filterStart = new Date(dateFilter.startDate);
    filterStart.setHours(0, 0, 0, 0);

    const filterEnd = new Date(dateFilter.endDate);
    filterEnd.setHours(23, 59, 59, 999);

    return (
      filterStart.getTime() === currentWeekStart.getTime() &&
      filterEnd.getTime() === currentWeekEnd.getTime()
    );
  };

  // Navigation function for week/range mode
  const navigateWeek = (direction: 'prev' | 'next') => {
    const currentStart = new Date(dateFilter.startDate);
    const currentEnd = new Date(dateFilter.endDate);

    // Calculate the number of days in the current range (using date-only comparison)
    const startDateOnly = new Date(
      currentStart.getFullYear(),
      currentStart.getMonth(),
      currentStart.getDate()
    );
    const endDateOnly = new Date(
      currentEnd.getFullYear(),
      currentEnd.getMonth(),
      currentEnd.getDate()
    );
    const rangeDays =
      Math.ceil(
        (endDateOnly.getTime() - startDateOnly.getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1;

    // Move the entire range by exactly the same number of days
    const daysToMove = direction === 'next' ? rangeDays : -rangeDays;

    const newStart = new Date(currentStart);
    newStart.setDate(currentStart.getDate() + daysToMove);
    newStart.setHours(0, 0, 0, 0);

    const newEnd = new Date(currentEnd);
    newEnd.setDate(currentEnd.getDate() + daysToMove);
    newEnd.setHours(23, 59, 59, 999);

    setDateFilter({
      ...dateFilter,
      startDate: newStart,
      endDate: newEnd,
    });
  };

  if (isLoading && !isRefreshing) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('analytics.title')}</Text>
        <Text style={styles.subtitle}>{t('analytics.subtitle')}</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'overview' && styles.activeTabText,
            ]}
          >
            {t('analytics.overview')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'customers' && styles.activeTab]}
          onPress={() => setActiveTab('customers')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'customers' && styles.activeTabText,
            ]}
          >
            {t('analytics.customers')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stock' && styles.activeTab]}
          onPress={() => setActiveTab('stock')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'stock' && styles.activeTabText,
            ]}
          >
            {t('analytics.stock')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pricing' && styles.activeTab]}
          onPress={() => setActiveTab('pricing')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'pricing' && styles.activeTabText,
            ]}
          >
            {t('analytics.pricing')}
          </Text>
        </TouchableOpacity>
      </View>

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
          {/* Enhanced Period Selector */}
          <Card style={styles.periodCard}>
            <View style={styles.periodHeader}>
              <Text style={styles.sectionTitle}>
                {t('analytics.analysisPeriod')}
              </Text>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setShowFilterModal(true)}
              >
                <Calendar size={16} color="#059669" />
                <Text style={styles.filterButtonText}>
                  {t('common.filter')}
                </Text>
                <ChevronDown size={16} color="#059669" />
              </TouchableOpacity>
            </View>

            {/* Current Filter Display */}
            <View style={styles.currentFilterContainer}>
              <View style={styles.currentFilterDisplay}>
                <Text style={styles.currentFilterLabel}>
                  {t('analytics.currentPeriod')}:
                </Text>
                <Text style={styles.currentFilterValue}>
                  {getFilterDisplayText()}
                </Text>
              </View>

              {/* Navigation Controls */}
              <View style={styles.navigationControls}>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => {
                    if (dateFilter.mode === 'day') {
                      navigateDay('prev');
                    } else if (dateFilter.mode === 'month') {
                      navigateMonth('prev');
                    } else if (dateFilter.mode === 'range') {
                      navigateWeek('prev');
                    }
                  }}
                >
                  <ChevronLeft size={20} color="#6B7280" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => {
                    if (dateFilter.mode === 'day') {
                      navigateDay('next');
                    } else if (dateFilter.mode === 'month') {
                      navigateMonth('next');
                    } else if (dateFilter.mode === 'range') {
                      navigateWeek('next');
                    }
                  }}
                >
                  <ChevronRight size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Filter Chips */}
            <View style={styles.quickFilters}>
              <TouchableOpacity
                style={[
                  styles.quickFilterChip,
                  dateFilter.mode === 'day' &&
                    dateFilter.selectedDate.toDateString() ===
                      new Date().toDateString() &&
                    styles.quickFilterChipActive,
                ]}
                onPress={() => handleQuickFilter('day', 'today')}
              >
                <Text
                  style={[
                    styles.quickFilterText,
                    dateFilter.mode === 'day' &&
                      dateFilter.selectedDate.toDateString() ===
                        new Date().toDateString() &&
                      styles.quickFilterTextActive,
                  ]}
                >
                  {t('common.today')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.quickFilterChip,
                  dateFilter.mode === 'month' &&
                    dateFilter.selectedMonth === new Date().getMonth() &&
                    styles.quickFilterChipActive,
                ]}
                onPress={() => handleQuickFilter('month', 'current')}
              >
                <Text
                  style={[
                    styles.quickFilterText,
                    dateFilter.mode === 'month' &&
                      dateFilter.selectedMonth === new Date().getMonth() &&
                      styles.quickFilterTextActive,
                  ]}
                >
                  {t('common.thisMonth')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.quickFilterChip,
                  isCurrentWeek() && styles.quickFilterChipActive,
                ]}
                onPress={() => handleQuickFilter('range', 'week')}
              >
                <Text
                  style={[
                    styles.quickFilterText,
                    isCurrentWeek() && styles.quickFilterTextActive,
                  ]}
                >
                  {t('common.thisWeek')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.periodSummary}>
              <Text style={styles.periodSummaryText}>
                {getDaysInPeriod()}{' '}
                {getDaysInPeriod() === 1
                  ? t('analytics.day')
                  : t('analytics.days')}{' '}
                • {analytics?.totalSales || 0} {t('analytics.sales')}
              </Text>
            </View>
          </Card>

          {/* Key Metrics */}
          <View style={styles.metricsGrid}>
            <Card style={styles.metricCard}>
              <View style={styles.metricContent}>
                <View
                  style={[styles.metricIcon, { backgroundColor: '#10B981' }]}
                >
                  <DollarSign size={24} color="#FFFFFF" />
                </View>
                <View style={styles.metricText}>
                  <Text style={styles.metricValue}>
                    {formatMMK(analytics?.totalRevenue || 0)}
                  </Text>
                  <Text style={styles.metricLabel}>
                    {t('analytics.totalRevenue')}
                  </Text>
                </View>
              </View>
            </Card>

            <Card style={styles.metricCard}>
              <View style={styles.metricContent}>
                <View
                  style={[styles.metricIcon, { backgroundColor: '#F59E0B' }]}
                >
                  <Target size={24} color="#FFFFFF" />
                </View>
                <View style={styles.metricText}>
                  <Text style={styles.metricValue}>
                    {formatMMK(analytics?.totalProfit || 0)}
                  </Text>
                  <Text style={styles.metricLabel}>
                    {t('analytics.totalProfit')}
                  </Text>
                  <Text style={styles.metricSubtext}>
                    {t('analytics.profitMargin')}:{' '}
                    {analytics?.profitMargin?.toFixed(1) || 0}%
                  </Text>
                </View>
              </View>
            </Card>

            <Card style={styles.metricCard}>
              <View style={styles.metricContent}>
                <View
                  style={[styles.metricIcon, { backgroundColor: '#3B82F6' }]}
                >
                  <BarChart3 size={24} color="#FFFFFF" />
                </View>
                <View style={styles.metricText}>
                  <Text style={styles.metricValue}>
                    {analytics?.totalSales || 0}
                  </Text>
                  <Text style={styles.metricLabel}>
                    {t('analytics.totalSales')}
                  </Text>
                  <Text style={styles.metricSubtext}>
                    {t('analytics.avg')}:{' '}
                    {((analytics?.totalSales || 0) / getDaysInPeriod()).toFixed(
                      1
                    )}
                    /{t('analytics.day')}
                  </Text>
                </View>
              </View>
            </Card>

            <Card style={styles.metricCard}>
              <View style={styles.metricContent}>
                <View
                  style={[styles.metricIcon, { backgroundColor: '#8B5CF6' }]}
                >
                  <Users size={24} color="#FFFFFF" />
                </View>
                <View style={styles.metricText}>
                  <Text style={styles.metricValue}>
                    {formatMMK(analytics?.avgSaleValue || 0)}
                  </Text>
                  <Text style={styles.metricLabel}>
                    {t('analytics.avgSaleValue')}
                  </Text>
                  <Text style={styles.metricSubtext}>
                    {t('analytics.perTransaction')}
                  </Text>
                </View>
              </View>
            </Card>
          </View>

          {/* Business Insights */}
          <Card>
            <Text style={styles.sectionTitle}>
              {t('analytics.businessInsights')}
            </Text>

            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>
                {t('analytics.dailyAverageRevenue')}
              </Text>
              <Text style={styles.insightValue}>
                {formatMMK((analytics?.totalRevenue || 0) / getDaysInPeriod())}
              </Text>
            </View>

            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>
                {t('analytics.dailyAverageProfit')}
              </Text>
              <Text style={styles.insightValue}>
                {formatMMK((analytics?.totalProfit || 0) / getDaysInPeriod())}
              </Text>
            </View>

            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>
                {t('analytics.costOfGoodsSold')}
              </Text>
              <Text style={styles.insightValue}>
                {formatMMK(analytics?.totalCost || 0)}
              </Text>
            </View>

            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>
                {t('analytics.profitMargin')}
              </Text>
              <Text
                style={[
                  styles.insightValue,
                  {
                    color:
                      (analytics?.profitMargin || 0) > 20
                        ? '#10B981'
                        : '#F59E0B',
                  },
                ]}
              >
                {analytics?.profitMargin?.toFixed(1) || 0}%
              </Text>
            </View>

            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>
                {t('analytics.itemsSold')}
              </Text>
              <Text style={styles.insightValue}>
                {analytics?.totalItemsSold || 0} {t('analytics.units')}
              </Text>
            </View>
          </Card>

          {/* Expense Summary */}
          <Card>
            <Text style={styles.sectionTitle}>
              {t('analytics.expenseSummary')}
            </Text>

            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>
                {t('analytics.totalExpenses')}
              </Text>
              <Text style={styles.insightValue}>
                {formatMMK(analytics?.totalExpenses || 0)}
              </Text>
            </View>

            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>
                {t('analytics.netProfit')}
              </Text>
              <Text
                style={[
                  styles.insightValue,
                  {
                    color:
                      (analytics?.netProfit || 0) > 0 ? '#10B981' : '#EF4444',
                  },
                ]}
              >
                {formatMMK(analytics?.netProfit || 0)}
              </Text>
            </View>

            {analytics?.expensesByCategory &&
            analytics.expensesByCategory.length > 0 ? (
              <>
                <Text style={styles.subSectionTitle}>
                  {t('analytics.expensesByCategory')}
                </Text>
                {analytics.expensesByCategory.map(
                  (category: any, index: number) => (
                    <View key={index} style={styles.insightItem}>
                      <Text style={styles.insightLabel}>
                        {category.category_name}
                      </Text>
                      <View style={styles.expenseValueContainer}>
                        <Text style={styles.insightValue}>
                          {formatMMK(category.amount)}
                        </Text>
                        <Text style={styles.expensePercentage}>
                          {category.percentage.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  )
                )}
              </>
            ) : (
              <Text style={styles.noDataText}>
                {t('analytics.noExpenseData')}
              </Text>
            )}
          </Card>

          {/* Analytics Charts */}
          <AnalyticsCharts
            startDate={startDate}
            endDate={endDate}
            analytics={analytics}
          />

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
                      {t('analytics.profit')}: {formatMMK(product.profit)}
                    </Text>
                    <Text style={styles.productMargin}>
                      {t('analytics.profitMargin')}:{' '}
                      {product.margin?.toFixed(1) || 0}%
                    </Text>
                  </View>
                  <View style={styles.productRevenue}>
                    <Text style={styles.revenueAmount}>
                      {formatMMK(product.revenue)}
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
                  <Text style={styles.saleAmount}>{formatMMK(sale.total)}</Text>
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

      {/* Stock Tab */}
      {activeTab === 'stock' && <StockAnalytics />}

      {/* Pricing Tab */}
      {activeTab === 'pricing' && <BulkPricingAnalytics />}

      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {t('common.selectDate')} {t('common.filter')}
            </Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Text style={styles.modalClose}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Day Filter Section */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>
                {t('common.today')} {t('common.filter')}
              </Text>
              <Text style={styles.filterSectionDesc}>
                {t('analytics.viewDataForDay')}
              </Text>

              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={styles.filterOption}
                  onPress={() => handleQuickFilter('day', 'today')}
                >
                  <Text style={styles.filterOptionText}>
                    {t('common.today')}
                  </Text>
                  <Text style={styles.filterOptionDate}>
                    {new Date().toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.filterOption}
                  onPress={() => handleQuickFilter('day', 'yesterday')}
                >
                  <Text style={styles.filterOptionText}>
                    {t('analytics.yesterday')}
                  </Text>
                  <Text style={styles.filterOptionDate}>
                    {new Date(Date.now() - 86400000).toLocaleDateString(
                      'en-US',
                      { month: 'short', day: 'numeric', year: 'numeric' }
                    )}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.filterOption}
                  onPress={() => {
                    setShowFilterModal(false); // Close filter modal first
                    setTimeout(() => {
                      // Add a small delay before showing date picker
                      setDateFilter({ ...dateFilter, mode: 'day' });
                      setShowDatePicker(true);
                    }, 300);
                  }}
                >
                  <Text style={styles.filterOptionText}>
                    {t('analytics.selectCustomDate')}
                  </Text>
                  <Calendar size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Month Filter Section */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>
                {t('analytics.monthFilter')}
              </Text>
              <Text style={styles.filterSectionDesc}>
                {t('analytics.viewDataForMonths')}
              </Text>

              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={styles.filterOption}
                  onPress={() => handleQuickFilter('month', 'current')}
                >
                  <Text style={styles.filterOptionText}>
                    {t('analytics.thisMonth')}
                  </Text>
                  <Text style={styles.filterOptionDate}>
                    {new Date().toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.filterOption}
                  onPress={() => handleQuickFilter('month', 'previous')}
                >
                  <Text style={styles.filterOptionText}>
                    {t('analytics.lastMonth')}
                  </Text>
                  <Text style={styles.filterOptionDate}>
                    {new Date(
                      new Date().setMonth(new Date().getMonth() - 1)
                    ).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Month/Year Selector */}
              <View style={styles.monthYearSelector}>
                <Text style={styles.monthYearLabel}>
                  {t('analytics.selectMonthYear')}
                </Text>
                <View style={styles.monthYearControls}>
                  <View style={styles.monthSelector}>
                    <Text style={styles.selectorLabel}>
                      {t('analytics.month')}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.monthScroll}
                    >
                      {Array.from({ length: 12 }, (_, i) => {
                        const monthNames = [
                          t('analytics.jan'),
                          t('analytics.feb'),
                          t('analytics.mar'),
                          t('analytics.apr'),
                          t('analytics.may'),
                          t('analytics.jun'),
                          t('analytics.jul'),
                          t('analytics.aug'),
                          t('analytics.sep'),
                          t('analytics.oct'),
                          t('analytics.nov'),
                          t('analytics.dec'),
                        ];
                        return (
                          <TouchableOpacity
                            key={i}
                            style={[
                              styles.monthChip,
                              dateFilter.selectedMonth === i &&
                                styles.monthChipActive,
                            ]}
                            onPress={(e) => {
                              e.stopPropagation(); // Prevent event bubbling
                              setDateFilter({
                                ...dateFilter,
                                mode: 'month',
                                selectedMonth: i,
                              });
                              setShowFilterModal(false);
                            }}
                          >
                            <Text
                              style={[
                                styles.monthChipText,
                                dateFilter.selectedMonth === i &&
                                  styles.monthChipTextActive,
                              ]}
                            >
                              {monthNames[i]}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View style={styles.yearSelector}>
                    <Text style={styles.selectorLabel}>
                      {t('analytics.year')}
                    </Text>
                    <View style={styles.yearControls}>
                      <TouchableOpacity
                        style={styles.yearButton}
                        onPress={(e) => {
                          e.stopPropagation(); // Prevent event bubbling
                          setDateFilter({
                            ...dateFilter,
                            selectedYear: dateFilter.selectedYear - 1,
                          });
                        }}
                      >
                        <ChevronLeft size={16} color="#6B7280" />
                      </TouchableOpacity>
                      <Text style={styles.yearText}>
                        {dateFilter.selectedYear}
                      </Text>
                      <TouchableOpacity
                        style={styles.yearButton}
                        onPress={(e) => {
                          e.stopPropagation(); // Prevent event bubbling
                          setDateFilter({
                            ...dateFilter,
                            selectedYear: dateFilter.selectedYear + 1,
                          });
                        }}
                      >
                        <ChevronRight size={16} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Range Filter Section */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>
                {t('analytics.dateRangeFilter')}
              </Text>
              <Text style={styles.filterSectionDesc}>
                {t('analytics.viewDataForRanges')}
              </Text>

              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={styles.filterOption}
                  onPress={() => handleQuickFilter('range', 'week')}
                >
                  <Text style={styles.filterOptionText}>
                    {t('analytics.thisWeek')}
                  </Text>
                  <Text style={styles.filterOptionDate}>
                    {t('analytics.mondayToToday')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.filterOption}
                  onPress={() => handleQuickFilter('range', 'last7days')}
                >
                  <Text style={styles.filterOptionText}>
                    {t('analytics.last7Days')}
                  </Text>
                  <Text style={styles.filterOptionDate}>
                    {t('analytics.rolling7DayPeriod')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.filterOption}
                  onPress={() => handleQuickFilter('range', 'month')}
                >
                  <Text style={styles.filterOptionText}>
                    {t('analytics.last30Days')}
                  </Text>
                  <Text style={styles.filterOptionDate}>
                    {t('analytics.rolling30DayPeriod')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={dateFilter.selectedDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (selectedDate) {
              setDateFilter({
                ...dateFilter,
                selectedDate: selectedDate,
              });
              setShowFilterModal(false);
            }
          }}
          maximumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
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
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 6,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  periodCard: {
    marginBottom: 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  periodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  filterButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#059669',
    marginHorizontal: 6,
  },
  currentFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  currentFilterDisplay: {
    flex: 1,
  },
  currentFilterLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginBottom: 4,
  },
  currentFilterValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
  },
  navigationControls: {
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  quickFilterChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickFilterChipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  quickFilterText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  quickFilterTextActive: {
    color: '#FFFFFF',
  },
  periodSummary: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  periodSummaryText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    textAlign: 'center',
  },
  metricsGrid: {
    marginBottom: 24,
  },
  metricCard: {
    marginBottom: 16,
  },
  metricContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  metricText: {
    flex: 1,
  },
  metricValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  metricLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginTop: 2,
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  modalClose: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#059669',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  filterSection: {
    marginBottom: 32,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  filterSectionDesc: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 16,
  },
  filterOptions: {
    gap: 12,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  filterOptionDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  monthYearSelector: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  monthYearLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  monthYearControls: {
    gap: 20,
  },
  monthSelector: {
    gap: 8,
  },
  selectorLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  monthScroll: {
    flexDirection: 'row',
  },
  monthChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  monthChipActive: {
    backgroundColor: '#059669',
  },
  monthChipText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  monthChipTextActive: {
    color: '#FFFFFF',
  },
  yearSelector: {
    gap: 8,
  },
  yearControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  yearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    minWidth: 60,
    textAlign: 'center',
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#059669',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#059669',
    fontFamily: 'Inter-SemiBold',
  },
});
