import React from 'react';
import { View, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import {
  LineChart as GiftedLineChart,
  BarChart as GiftedBarChart,
} from 'react-native-gifted-charts';
import { PieChart as ChartKitPieChart } from 'react-native-chart-kit';
import PieChart from 'react-native-pie-chart';
import { formatCurrency, formatLargeNumber } from '@/utils/formatters';

const screenWidth = Dimensions.get('window').width;

// Chart config for react-native-chart-kit PieChart
const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
  style: {
    borderRadius: 16,
  },
};

interface LineChartProps {
  data: {
    labels: string[];
    datasets: Array<{
      data: number[];
      color?: (opacity: number) => string;
      strokeWidth?: number;
    }>;
  };
  title: string;
  yAxisSuffix?: string;
  formatYLabel?: (value: string) => string;
}

// Keep Gifted Charts for LineChart (better negative value support)
export function CustomLineChart({
  data,
  title,
  yAxisSuffix = '',
  formatYLabel,
}: LineChartProps) {
  // Transform data for Gifted Charts
  const giftedData = data.labels.map((label, index) => ({
    value: data.datasets[0].data[index],
    label: label,
    dataPointText: formatYLabel
      ? formatYLabel(data.datasets[0].data[index].toString())
      : data.datasets[0].data[index].toString(),
  }));

  // Calculate Y-axis range for better negative value handling
  const allValues = data.datasets[0].data;
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = maxValue - minValue;
  const padding = range * 0.1;

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <GiftedLineChart
          data={giftedData}
          width={Math.max(screenWidth - 64, data.labels.length * 60)}
          height={220}
          spacing={data.labels.length > 10 ? 40 : 60}
          initialSpacing={20}
          endSpacing={20}
          // Perfect negative value support
          mostNegativeValue={minValue - padding}
          yAxisOffset={minValue < 0 ? minValue - padding : 0}
          // Styling
          color="#2563eb"
          thickness={2}
          startFillColor="rgba(37, 99, 235, 0.3)"
          endFillColor="rgba(37, 99, 235, 0.1)"
          startOpacity={0.9}
          endOpacity={0.2}
          // Data points
          dataPointsHeight={6}
          dataPointsWidth={6}
          dataPointsColor="#2563eb"
          dataPointsRadius={3}
          // Labels
          showVerticalLines
          verticalLinesColor="rgba(226, 232, 240, 0.5)"
          xAxisColor="#e2e8f0"
          yAxisColor="#e2e8f0"
          xAxisLabelTextStyle={{
            color: '#64748b',
            fontSize: 10,
          }}
          yAxisTextStyle={{
            color: '#64748b',
            fontSize: 10,
          }}
          yAxisLabelWidth={60}
          // Y-axis formatting
          formatYLabel={(value) => {
            if (formatYLabel) return formatYLabel(value);
            const num = parseFloat(value);
            if (num === 0) return '0';

            const absNum = Math.abs(num);

            // Handle billions (1,000,000,000+)
            if (absNum >= 1000000000) {
              return `${(num / 1000000000).toFixed(1)}B`;
            }
            // Handle millions (1,000,000+)
            if (absNum >= 1000000) {
              return `${(num / 1000000).toFixed(1)}M`;
            }
            // Handle thousands (1,000+)
            if (absNum >= 1000) {
              return `${(num / 1000).toFixed(0)}K`;
            }
            // Handle smaller numbers
            if (absNum >= 100) {
              return num.toFixed(0);
            }
            if (absNum >= 1) {
              return num.toFixed(1);
            }
            return num.toFixed(2);
          }}
          // Animation
          animateOnDataChange
          animationDuration={1000}
          // Zero line for negative values
          showReferenceLine1
          referenceLine1Position={0}
          referenceLine1Config={{
            color: '#ef4444',
            dashWidth: 2,
            dashGap: 3,
            thickness: 1,
          }}
          // Curved line
          curved
          // Background
          backgroundColor="transparent"
        />
      </ScrollView>
    </View>
  );
}

interface BarChartProps {
  data: {
    labels: string[];
    datasets: Array<{
      data: number[];
    }>;
  };
  title: string;
  yAxisSuffix?: string;
  formatYLabel?: (value: string) => string;
  footer?: {
    label: string;
    value: string;
  };
}

// Keep Gifted Charts for BarChart (no gradient to avoid errors)
export function CustomBarChart({
  data,
  title,
  yAxisSuffix = '',
  formatYLabel,
  footer,
}: BarChartProps) {
  // Transform data for Gifted Charts
  const giftedData = data.labels.map((label, index) => ({
    value: data.datasets[0].data[index],
    label: label,
    frontColor: '#2563eb', // Solid color instead of gradient
    spacing: 2,
  }));

  console.log('bardata is', giftedData);

  const allValues = data.datasets[0].data;
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = maxValue - minValue;
  const padding = range * 0.1;

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <GiftedBarChart
          data={giftedData}
          width={Math.max(screenWidth - 64, data.labels.length * 80)}
          height={220}
          spacing={data.labels.length > 8 ? 20 : 30}
          initialSpacing={20}
          endSpacing={20}
          // Negative value support
          mostNegativeValue={minValue < 0 ? minValue - padding : undefined}
          yAxisOffset={minValue < 0 ? minValue - padding : 0}
          // Styling - NO GRADIENT
          frontColor="#2563eb"
          maxValue={maxValue + padding}
          // CORRECT: Show values as top labels
          showValuesAsTopLabel={true}
          topLabelTextStyle={{
            color: '#1e293b',
            fontSize: 7,
            fontWeight: '600',
          }}
          // Labels
          showVerticalLines
          verticalLinesColor="rgba(226, 232, 240, 0.5)"
          xAxisColor="#e2e8f0"
          yAxisColor="#e2e8f0"
          xAxisLabelTextStyle={{
            color: '#64748b',
            fontSize: 8,
            fontFamily: 'NotoSansMyanmar-Regular',
            textAlign: 'center',
          }}
          xAxisTextNumberOfLines={4}
          yAxisTextStyle={{
            color: '#64748b',
            fontSize: 10,
          }}
          yAxisLabelWidth={
            formatYLabel ? maxValue.toLocaleString().length * 10 + 20 : 60
          }
          // Y-axis formatting
          formatYLabel={(value) => {
            if (formatYLabel) return formatYLabel(value);
            const num = parseFloat(value);
            if (num === 0) return '0';

            const absNum = Math.abs(num);

            // Handle billions (1,000,000,000+)
            if (absNum >= 1000000000) {
              return `${(num / 1000000000).toFixed(1)}B`;
            }
            // Handle millions (1,000,000+)
            if (absNum >= 1000000) {
              return `${(num / 1000000).toFixed(1)}M`;
            }
            // Handle thousands (1,000+)
            if (absNum >= 1000) {
              return `${(num / 1000).toFixed(0)}K`;
            }
            // Handle smaller numbers
            if (absNum >= 100) {
              return num.toFixed(0);
            }
            if (absNum >= 1) {
              return num.toFixed(1);
            }
            return num.toFixed(2);
          }}
          // Zero line for negative values
          showReferenceLine1
          referenceLine1Position={0}
          referenceLine1Config={{
            color: '#ef4444',
            dashWidth: 2,
            dashGap: 3,
            thickness: 1,
          }}
        />
      </ScrollView>

      {/* Optional Footer */}
      {footer && (
        <View style={styles.chartFooter}>
          <Text style={styles.chartFooterLabel}>{footer.label}:</Text>
          <Text style={styles.chartFooterValue}>{footer.value}</Text>
        </View>
      )}
    </View>
  );
}

interface PieChartProps {
  data: Array<{
    name: string;
    population: number;
    color: string;
    legendFontColor: string;
    legendFontSize: number;
  }>;
  title: string;
}

// REVERTED: Back to original react-native-chart-kit PieChart
export function CustomPieChart({ data, title }: PieChartProps) {
  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <ChartKitPieChart
        data={data}
        width={screenWidth - 32}
        height={280}
        chartConfig={chartConfig}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        center={[10, 20]}
        absolute
        hasLegend={true}
        style={styles.chart}
      />
    </View>
  );
}

// UPDATED: Simplified Pie Chart using native label feature
interface ReusablePieChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
    quantity?: number; // Optional bottle count
  }>;
  title: string;
  size?: number;
  showPercentage?: boolean;
  showLegend?: boolean;
}

export function ReusablePieChart({
  data,
  title,
  size = 200,
  showPercentage = true,
  showLegend = true,
}: ReusablePieChartProps) {
  // Calculate total for percentages
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Calculate percentages for each item
  const dataWithPercentages = data.map((item) => ({
    ...item,
    percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0',
  }));

  // UPDATED: Use native label feature instead of custom overlay
  const series = dataWithPercentages.map((item) => ({
    value: item.value,
    color: item.color,
    // Add percentage label directly to each slice
    ...(showPercentage && {
      label: {
        text: `${item.percentage}%`,
        fontSize: 12,
        fontWeight: 'bold',
        color: '#ffffff', // White text for better visibility
        outline: '#000000', // Black outline for better contrast
      },
    }),
  }));

  if (data.length === 0 || total === 0) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No data available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>

      <View style={styles.pieChartWrapper}>
        <PieChart widthAndHeight={size} series={series} />
      </View>

      {/* Enhanced Legend with Columns */}
      {showLegend && (
        <View style={styles.legendContainer}>
          {dataWithPercentages.map((item, index) => (
            <View key={item.name} style={styles.legendItem}>
              <View
                style={[styles.legendColor, { backgroundColor: item.color }]}
              />
              <View style={styles.legendContent}>
                <Text style={styles.legendName}>{item.name}</Text>
                <Text style={styles.legendAmount}>
                  {formatCurrency(item.value)}
                </Text>
                {item.quantity !== undefined && (
                  <Text style={styles.legendQuantity}>
                    {formatLargeNumber(item.quantity)} bottles
                  </Text>
                )}
                <Text style={styles.legendPercentage}>{item.percentage}%</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// Keep existing MetricCard component unchanged
export function MetricCard({
  title,
  value,
  subtitle,
  color = '#2563eb',
  icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <View style={styles.metricHeader}>
        {icon && <View style={styles.metricIcon}>{icon}</View>}
        <View style={styles.metricContent}>
          <Text style={styles.metricTitle}>{title}</Text>
          <Text style={[styles.metricValue, { color }]}>{value}</Text>
          {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  chartFooterLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  chartFooterValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
  },
  legendQuantity: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
    marginRight: 8,
    minWidth: 70,
    textAlign: 'right',
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 320,
  },
  chartTitle: {
    fontSize: 18,
    // fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  // Simplified styles for ReusablePieChart
  pieChartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  // UPDATED: Enhanced legend styles with columns
  legendContainer: {
    flexDirection: 'column',
    marginTop: 16,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  legendContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendName: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
    flex: 1,
  },
  legendAmount: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginRight: 12,
    minWidth: 80,
    textAlign: 'right',
  },
  legendPercentage: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'right',
  },
  emptyState: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  metricCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIcon: {
    marginRight: 12,
  },
  metricContent: {
    flex: 1,
  },
  metricTitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 2,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
