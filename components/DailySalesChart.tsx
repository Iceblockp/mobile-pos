import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { CustomBarChart } from '@/components/Charts';
import { useRevenueExpensesTrend } from '@/hooks/useQueries';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
import { useTranslation } from '@/context/LocalizationContext';
import { BarChart3 } from 'lucide-react-native';

interface DailySalesChartProps {
  startDate: Date;
  endDate: Date;
}

export default function DailySalesChart({
  startDate,
  endDate,
}: DailySalesChartProps) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrencyFormatter();

  const {
    data: revenueData = [],
    isLoading,
    isRefetching,
  } = useRevenueExpensesTrend(startDate, endDate);

  const formatDate = (dateStr: string) => {
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (days <= 1) {
      // Hourly format - dateStr is like "2024-01-15 14:00:00"
      if (dateStr.includes(' ')) {
        const [datePart, timePart] = dateStr.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour] = timePart.split(':').map(Number);
        const date = new Date(year, month - 1, day, hour);
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });
      } else {
        // Fallback for simple hour format
        return dateStr;
      }
    } else if (days <= 31) {
      // Daily format - dateStr is like "2024-01-15"
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } else {
      // Weekly format
      if (dateStr.includes('W')) {
        const weekMatch = dateStr.match(/(\d{4})-W(\d+)/);
        if (weekMatch) {
          const [, , week] = weekMatch;
          return `W${week}`;
        }
      }
      return dateStr;
    }
  };

  const formatMMK = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toString();
  };

  if (isLoading && !isRefetching) {
    return (
      <Card>
        <LoadingSpinner />
      </Card>
    );
  }

  if (!revenueData.length) {
    return (
      <Card>
        <View style={styles.header}>
          <BarChart3 size={20} color="#059669" />
          <Text style={styles.title}>{t('analytics.dailySales')}</Text>
        </View>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>
            {t('analytics.noSalesForPeriod')}
          </Text>
        </View>
      </Card>
    );
  }

  // Generate complete time series based on date range
  const generateCompleteTimeSeries = () => {
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const completeLabels: string[] = [];
    const completeData: number[] = [];

    // Create a map of existing data for quick lookup
    const dataMap = new Map<string, { revenue: number; salesCount: number }>(
      revenueData.map((item) => [
        item.date,
        { revenue: item.revenue, salesCount: item.salesCount },
      ])
    );

    if (days <= 1) {
      // Hourly intervals for single day
      for (let hour = 0; hour < 24; hour++) {
        const hourDate = new Date(startDate);
        hourDate.setHours(hour, 0, 0, 0);
        const hourKey = `${hourDate.getFullYear()}-${String(
          hourDate.getMonth() + 1
        ).padStart(2, '0')}-${String(hourDate.getDate()).padStart(
          2,
          '0'
        )} ${String(hour).padStart(2, '0')}:00:00`;

        completeLabels.push(formatDate(hourKey));
        completeData.push(dataMap.get(hourKey)?.revenue || 0);
      }
    } else {
      // Daily intervals for week/month view
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateKey = `${currentDate.getFullYear()}-${String(
          currentDate.getMonth() + 1
        ).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

        completeLabels.push(formatDate(dateKey));
        completeData.push(dataMap.get(dateKey)?.revenue || 0);

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return { labels: completeLabels, data: completeData };
  };

  const { labels, data } = generateCompleteTimeSeries();

  // Prepare data for CustomBarChart
  const barChartData = {
    labels,
    datasets: [{ data }],
  };

  // Footer data for summary (use original data for totals)
  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const totalSales = revenueData.reduce(
    (sum, item) => sum + item.salesCount,
    0
  );
  const averageDaily =
    revenueData.length > 0 ? totalRevenue / revenueData.length : 0;

  return (
    <Card>
      <View style={styles.header}>
        <BarChart3 size={20} color="#059669" />
        <Text style={styles.title}>{t('analytics.dailySales')}</Text>
      </View>

      <CustomBarChart
        data={barChartData}
        title=""
        formatYLabel={formatMMK}
        footer={{
          label: `${totalSales} ${t('analytics.totalSales')} • ${t(
            'analytics.averageDaily'
          )}`,
          value: `${formatPrice(totalRevenue)} • ${formatPrice(averageDaily)}`,
        }}
      />
    </Card>
  );
}
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginLeft: 8,
  },
  noDataContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
});
