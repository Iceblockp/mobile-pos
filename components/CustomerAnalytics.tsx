import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useCustomers, useCustomerAnalytics } from '@/hooks/useQueries';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
import { useTranslation } from '@/context/LocalizationContext';
import { Users, Trophy, TrendingUp } from 'lucide-react-native';
import { DateFilter, DateFilterComponent } from './DateFilter';

interface CustomerAnalyticsProps {
  customerId?: string;
}

export const CustomerAnalytics: React.FC<CustomerAnalyticsProps> = ({
  customerId,
}) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrencyFormatter();

  // Date filter state - now managed by DateFilterComponent
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    mode: 'day',
    selectedDate: new Date(),
    selectedMonth: new Date().getMonth(),
    selectedYear: new Date().getFullYear(),
    startDate: new Date(),
    endDate: new Date(),
  });

  // Calculate start and end dates based on filter
  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    let start: Date, end: Date;

    switch (dateFilter.mode) {
      case 'day':
        start = new Date(dateFilter.selectedDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(dateFilter.selectedDate);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        start = new Date(dateFilter.selectedYear, dateFilter.selectedMonth, 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(
          dateFilter.selectedYear,
          dateFilter.selectedMonth + 1,
          0
        );
        end.setHours(23, 59, 59, 999);
        break;
      case 'range':
        start = new Date(dateFilter.startDate);
        end = new Date(dateFilter.endDate);
        break;
      default:
        start = today;
        end = today;
    }

    return { startDate: start, endDate: end };
  }, [
    dateFilter.mode,
    dateFilter.selectedDate,
    dateFilter.selectedMonth,
    dateFilter.selectedYear,
    dateFilter.startDate,
    dateFilter.endDate,
  ]);

  // Use customer analytics hook with date filtering
  const {
    data: customerAnalytics,
    isLoading,
    isRefetching,
    refetch,
  } = useCustomerAnalytics(startDate, endDate);

  const onRefresh = () => {
    refetch();
  };

  if (isLoading && !isRefetching) {
    return (
      <View style={styles.loadingContainer}>
        <Users size={48} color="#9CA3AF" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ padding: 10 }}>
        {/* Date Filter Component */}
        <DateFilterComponent
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
        />
      </View>
      {/* Customer List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            colors={['#059669']}
            tintColor={'#059669'}
          />
        }
      >
        {/* Summary Stats */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Users size={20} color="#3B82F6" />
              <Text style={styles.summaryLabel}>
                {t('analytics.totalCustomers')}
              </Text>
              <Text style={styles.summaryValue}>
                {customerAnalytics?.totalCustomers || 0}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <TrendingUp size={20} color="#10B981" />
              <Text style={styles.summaryLabel}>
                {t('analytics.totalRevenue')}
              </Text>
              <Text style={styles.summaryValue}>
                {formatPrice(customerAnalytics?.totalRevenue || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Top Customers List */}
        <View style={styles.customerListCard}>
          <Text style={styles.sectionTitle}>{t('analytics.topCustomers')}</Text>

          {customerAnalytics?.topCustomers &&
          customerAnalytics.topCustomers.length > 0 ? (
            customerAnalytics.topCustomers.map(
              (customer: any, index: number) => (
                <View key={customer.id || index} style={styles.customerItem}>
                  <View style={styles.customerRank}>
                    <View
                      style={[
                        styles.rankBadge,
                        { backgroundColor: index < 3 ? '#10B981' : '#6B7280' },
                      ]}
                    >
                      {index < 3 ? (
                        <Trophy size={16} color="#FFFFFF" />
                      ) : (
                        <Text style={styles.rankText}>{index + 1}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{customer.name}</Text>
                    <Text style={styles.customerStats}>
                      {customer.total_orders || 0} {t('analytics.orders')} •{' '}
                      {customer.visit_count || 0} {t('analytics.visits')}
                    </Text>
                    <Text style={styles.customerAvg}>
                      {t('analytics.avgOrder')}:{' '}
                      {formatPrice(customer.avg_order_value || 0)}
                    </Text>
                  </View>

                  <View style={styles.customerAmount}>
                    <Text style={styles.totalSpent}>
                      {formatPrice(customer.total_spent || 0)}
                    </Text>
                    <Text style={styles.spentLabel}>
                      {t('analytics.totalSpent')}
                    </Text>
                  </View>
                </View>
              )
            )
          ) : (
            <View style={styles.emptyState}>
              <Users size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>
                {t('analytics.noCustomerData')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 16,
  },

  content: {
    flex: 1,
    padding: 10,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    textAlign: 'center',
  },
  customerListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  customerRank: {
    marginRight: 12,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  customerStats: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  customerAvg: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#059669',
  },
  customerAmount: {
    alignItems: 'flex-end',
  },
  totalSpent: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  spentLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
  },
});
