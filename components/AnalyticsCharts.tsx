import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LineChart, PieChart, StackedBarChart } from 'react-native-chart-kit';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  useRevenueExpensesTrend,
  useProfitMarginTrend,
} from '@/hooks/useQueries';
import { useTranslation } from '@/context/LocalizationContext';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Activity,
} from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 60; // Account for padding

type ChartType = 'revenue-expenses' | 'profit-margin' | 'expense-breakdown';

interface AnalyticsChartsProps {
  startDate: Date;
  endDate: Date;
  analytics: any;
}

export default function AnalyticsCharts({
  startDate,
  endDate,
  analytics,
}: AnalyticsChartsProps) {
  const { t } = useTranslation();
  const [activeChart, setActiveChart] = useState<ChartType>('revenue-expenses');

  const {
    data: revenueExpensesData = [],
    isLoading: revenueLoading,
    refetch: refetchRevenueExpenses,
  } = useRevenueExpensesTrend(startDate, endDate);

  const {
    data: profitMarginData = [],
    isLoading: profitLoading,
    refetch: refetchProfitMargin,
  } = useProfitMarginTrend(startDate, endDate);

  // Refetch chart data when analytics data changes
  React.useEffect(() => {
    if (analytics) {
      refetchRevenueExpenses();
      refetchProfitMargin();
    }
  }, [analytics, refetchRevenueExpenses, refetchProfitMargin]);

  const formatMMK = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toString();
  };

  const formatDate = (dateStr: string) => {
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (days <= 1) {
      // Hourly format - dateStr is like "2024-01-15 14:00:00"
      const [datePart, timePart] = dateStr.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour] = timePart.split(':').map(Number);

      // Create date in local timezone to avoid timezone offset issues
      const date = new Date(year, month - 1, day, hour);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (days <= 31) {
      // Daily format - dateStr is like "2024-01-15"
      const [year, month, day] = dateStr.split('-').map(Number);

      // Create date in local timezone to avoid timezone offset issues
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } else {
      // Weekly format - dateStr is like "2024-W03"
      if (dateStr.includes('W')) {
        const weekMatch = dateStr.match(/(\d{4})-W(\d+)/);
        if (weekMatch) {
          const [, year, week] = weekMatch;
          return `W${week}`;
        }
      }
      // Fallback for unexpected format
      return dateStr;
    }
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(5, 150, 105, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#059669',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#E5E7EB',
      strokeWidth: 1,
    },
    propsForLabels: {
      fontSize: 10,
    },
  };

  const chartTabs = [
    {
      id: 'revenue-expenses' as ChartType,
      title: t('analytics.revenueVsExpenses'),
      icon: BarChart3,
    },
    {
      id: 'profit-margin' as ChartType,
      title: t('analytics.profitMargin'),
      icon: TrendingUp,
    },
    {
      id: 'expense-breakdown' as ChartType,
      title: t('analytics.expenseBreakdown'),
      icon: PieChartIcon,
    },
  ];

  if (revenueLoading || profitLoading) {
    return (
      <Card>
        <LoadingSpinner />
      </Card>
    );
  }

  const renderRevenueExpensesChart = () => {
    if (!revenueExpensesData.length) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>{t('analytics.noChartData')}</Text>
        </View>
      );
    }

    // Prepare data for stacked bar chart
    const labels = revenueExpensesData.map((item) => formatDate(item.date));

    const stackedData = {
      labels: labels.slice(0, 7), // Limit to 7 data points for better visibility
      legend: [t('analytics.revenue'), t('analytics.expenses')],
      data: revenueExpensesData
        .slice(0, 7)
        .map((item) => [item.revenue, item.expenses]),
      barColors: ['#10B981', '#EF4444'],
    };

    return (
      <View style={styles.chartContainer}>
        <StackedBarChart
          data={stackedData}
          width={chartWidth}
          height={220}
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
          }}
          style={styles.chart}
          hideLegend={false}
        />

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendColor, { backgroundColor: '#10B981' }]}
            />
            <Text style={styles.legendText}>{t('analytics.revenue')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendColor, { backgroundColor: '#EF4444' }]}
            />
            <Text style={styles.legendText}>{t('analytics.expenses')}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderProfitMarginChart = () => {
    if (!profitMarginData.length) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>{t('analytics.noChartData')}</Text>
        </View>
      );
    }

    const chartData = {
      labels: profitMarginData.slice(0, 7).map((item) => formatDate(item.date)),
      datasets: [
        {
          data: profitMarginData.slice(0, 7).map((item) => item.profitMargin),
          color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };

    return (
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={chartWidth}
          height={250}
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: '#8B5CF6',
            },
          }}
          style={styles.chart}
          verticalLabelRotation={0}
          formatYLabel={(value) => `${parseFloat(value).toFixed(1)}%`}
        />
      </View>
    );
  };

  const renderExpenseBreakdownChart = () => {
    if (!analytics?.expensesByCategory?.length) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>{t('analytics.noExpenseData')}</Text>
        </View>
      );
    }

    const colors = [
      '#EF4444',
      '#F59E0B',
      '#10B981',
      '#3B82F6',
      '#8B5CF6',
      '#EC4899',
    ];

    const pieData = analytics.expensesByCategory.map(
      (item: any, index: number) => ({
        name: item.category_name,
        population: item.amount,
        color: colors[index % colors.length],
        legendFontColor: '#374151',
        legendFontSize: 12,
      })
    );

    return (
      <View style={styles.chartContainer}>
        <PieChart
          data={pieData}
          width={chartWidth}
          height={220}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.chart}
        />

        {/* Custom Legend with percentages */}
        <View style={styles.pieChartLegend}>
          {analytics.expensesByCategory.map((item: any, index: number) => (
            <View key={index} style={styles.legendItem}>
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: colors[index % colors.length] },
                ]}
              />
              <Text style={styles.legendText}>
                {item.category_name}: {formatMMK(item.amount)} MMK (
                {item.percentage.toFixed(1)}%)
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderChart = () => {
    switch (activeChart) {
      case 'revenue-expenses':
        return renderRevenueExpensesChart();
      case 'profit-margin':
        return renderProfitMarginChart();
      case 'expense-breakdown':
        return renderExpenseBreakdownChart();
      default:
        return renderRevenueExpensesChart();
    }
  };

  return (
    <Card>
      <View style={styles.header}>
        <Activity size={20} color="#059669" />
        <Text style={styles.title}>{t('analytics.performanceCharts')}</Text>
      </View>

      {/* Chart Type Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabContainer}
      >
        {chartTabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeChart === tab.id && styles.activeTab]}
              onPress={() => setActiveChart(tab.id)}
            >
              <IconComponent
                size={16}
                color={activeChart === tab.id ? '#FFFFFF' : '#6B7280'}
              />
              <Text
                style={[
                  styles.tabText,
                  activeChart === tab.id && styles.activeTabText,
                ]}
              >
                {tab.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Chart Content */}
      {renderChart()}
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
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  tabContainer: {
    marginBottom: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    minWidth: 120,
  },
  activeTab: {
    backgroundColor: '#059669',
  },
  tabText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  chartContainer: {
    alignItems: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    marginBottom: 20,
  },
  profitChart: {
    // Additional styles for profit margin chart if needed
  },
  noDataContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#374151',
  },
  pieChartLegend: {
    marginTop: 16,
    width: '100%',
  },
  profitSummary: {
    marginTop: 16,
    width: '100%',
  },
  profitSummaryItem: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  profitSummaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  profitSummaryRevenue: {
    fontSize: 11,
    color: '#6B7280',
  },
  profitSummaryProfit: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '500',
  },
});
