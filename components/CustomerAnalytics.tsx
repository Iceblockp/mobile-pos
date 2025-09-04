import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  useCustomerPurchasePatterns,
  useCustomerLifetimeValue,
  useCustomerSegmentation,
  useCustomers,
} from '@/hooks/useQueries';
import { formatMMK } from '@/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/context/LocalizationContext';

const { width } = Dimensions.get('window');

interface CustomerAnalyticsProps {
  customerId?: number;
}

export const CustomerAnalytics: React.FC<CustomerAnalyticsProps> = ({
  customerId,
}) => {
  const { t } = useTranslation();
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerId || 0);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'patterns' | 'segments'
  >('overview');

  const { data: customers } = useCustomers();
  const { data: purchasePatterns } =
    useCustomerPurchasePatterns(selectedCustomerId);
  const { data: lifetimeValue } = useCustomerLifetimeValue(selectedCustomerId);
  const { data: segmentation } = useCustomerSegmentation();

  const selectedCustomer = customers?.find((c) => c.id === selectedCustomerId);

  const renderCustomerSelector = () => (
    <View style={styles.customerSelector}>
      <Text style={styles.selectorLabel}>{t('analytics.selectCustomer')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {customers?.slice(0, 10).map((customer) => (
          <TouchableOpacity
            key={customer.id}
            style={[
              styles.customerChip,
              selectedCustomerId === customer.id && styles.customerChipActive,
            ]}
            onPress={() => setSelectedCustomerId(customer.id)}
          >
            <Text
              style={[
                styles.customerChipText,
                selectedCustomerId === customer.id &&
                  styles.customerChipTextActive,
              ]}
            >
              {customer.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderTabBar = () => (
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
        style={[styles.tab, activeTab === 'patterns' && styles.activeTab]}
        onPress={() => setActiveTab('patterns')}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === 'patterns' && styles.activeTabText,
          ]}
        >
          {t('analytics.patterns')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'segments' && styles.activeTab]}
        onPress={() => setActiveTab('segments')}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === 'segments' && styles.activeTabText,
          ]}
        >
          {t('analytics.segments')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderOverviewTab = () => {
    if (!selectedCustomer || !lifetimeValue) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="analytics-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyStateText}>
            {t('analytics.selectCustomerToView')}
          </Text>
        </View>
      );
    }

    const getSegmentColor = (segment: string) => {
      switch (segment) {
        case 'high_value':
          return '#10B981';
        case 'medium_value':
          return '#F59E0B';
        case 'low_value':
          return '#EF4444';
        case 'new':
          return '#3B82F6';
        case 'at_risk':
          return '#DC2626';
        default:
          return '#6B7280';
      }
    };

    const getRiskLevel = (score: number) => {
      if (score < 30)
        return { level: t('analytics.lowRisk'), color: '#10B981' };
      if (score < 60)
        return { level: t('analytics.mediumRisk'), color: '#F59E0B' };
      return { level: t('analytics.highRisk'), color: '#EF4444' };
    };

    const riskInfo = getRiskLevel(lifetimeValue.riskScore);

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.customerHeader}>
          <Text style={styles.customerName}>{selectedCustomer.name}</Text>
          <View
            style={[
              styles.segmentBadge,
              {
                backgroundColor: getSegmentColor(lifetimeValue.customerSegment),
              },
            ]}
          >
            <Text style={styles.segmentBadgeText}>
              {t(`analytics.segment.${lifetimeValue.customerSegment}`)}
            </Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{t('analytics.currentLTV')}</Text>
            <Text style={styles.metricValue}>
              {formatMMK(lifetimeValue.currentLTV)}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>
              {t('analytics.predictedLTV')}
            </Text>
            <Text style={styles.metricValue}>
              {formatMMK(lifetimeValue.predictedLTV)}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{t('analytics.totalVisits')}</Text>
            <Text style={styles.metricValue}>
              {selectedCustomer.visit_count}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>
              {t('analytics.avgOrderValue')}
            </Text>
            <Text style={styles.metricValue}>
              {formatMMK(
                selectedCustomer.visit_count > 0
                  ? selectedCustomer.total_spent / selectedCustomer.visit_count
                  : 0
              )}
            </Text>
          </View>
        </View>

        <View style={styles.riskCard}>
          <View style={styles.riskHeader}>
            <Ionicons name="warning-outline" size={20} color={riskInfo.color} />
            <Text style={styles.riskTitle}>{t('analytics.churnRisk')}</Text>
          </View>
          <View style={styles.riskMeter}>
            <View style={styles.riskMeterBg}>
              <View
                style={[
                  styles.riskMeterFill,
                  {
                    width: `${lifetimeValue.riskScore}%`,
                    backgroundColor: riskInfo.color,
                  },
                ]}
              />
            </View>
            <Text style={[styles.riskLevel, { color: riskInfo.color }]}>
              {riskInfo.level} ({lifetimeValue.riskScore}%)
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderPatternsTab = () => {
    if (!purchasePatterns || !selectedCustomer) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="bar-chart-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyStateText}>
            {t('analytics.noPatternsData')}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent}>
        <Text style={styles.sectionTitle}>
          {t('analytics.monthlySpending')}
        </Text>
        <View style={styles.chartContainer}>
          {purchasePatterns.monthlySpending.map((item, index) => (
            <View key={index} style={styles.barItem}>
              <Text style={styles.barLabel}>{item.month}</Text>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      width: Math.max(
                        20,
                        (item.amount /
                          Math.max(
                            ...purchasePatterns.monthlySpending.map(
                              (m) => m.amount
                            )
                          )) *
                          200
                      ),
                    },
                  ]}
                />
                <Text style={styles.barValue}>{formatMMK(item.amount)}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t('analytics.topCategories')}</Text>
        <View style={styles.categoriesContainer}>
          {purchasePatterns.topCategories.map((category, index) => (
            <View key={index} style={styles.categoryItem}>
              <Text style={styles.categoryName}>{category.category}</Text>
              <Text style={styles.categoryAmount}>
                {formatMMK(category.amount)}
              </Text>
              <Text style={styles.categoryPercentage}>
                {category.percentage.toFixed(1)}%
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>
          {t('analytics.purchaseFrequency')}
        </Text>
        <View style={styles.frequencyContainer}>
          {purchasePatterns.purchaseFrequency.map((day, index) => (
            <View key={index} style={styles.frequencyItem}>
              <Text style={styles.dayName}>{day.dayOfWeek}</Text>
              <View style={styles.frequencyBar}>
                <View
                  style={[
                    styles.frequencyFill,
                    {
                      height: Math.max(
                        10,
                        (day.count /
                          Math.max(
                            ...purchasePatterns.purchaseFrequency.map(
                              (d) => d.count
                            )
                          )) *
                          40
                      ),
                    },
                  ]}
                />
              </View>
              <Text style={styles.frequencyCount}>{day.count}</Text>
            </View>
          ))}
        </View>

        <View style={styles.avgItemsCard}>
          <Text style={styles.avgItemsLabel}>
            {t('analytics.avgItemsPerOrder')}
          </Text>
          <Text style={styles.avgItemsValue}>
            {purchasePatterns.averageItemsPerOrder.toFixed(1)}
          </Text>
        </View>
      </ScrollView>
    );
  };

  const renderSegmentsTab = () => {
    if (!segmentation) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyStateText}>
            {t('analytics.noSegmentationData')}
          </Text>
        </View>
      );
    }

    const getSegmentColor = (segment: string) => {
      switch (segment) {
        case 'high_value':
          return '#10B981';
        case 'medium_value':
          return '#F59E0B';
        case 'low_value':
          return '#EF4444';
        case 'new':
          return '#3B82F6';
        case 'at_risk':
          return '#DC2626';
        default:
          return '#6B7280';
      }
    };

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.segmentationHeader}>
          <Text style={styles.totalCustomersText}>
            {t('analytics.totalCustomers')}: {segmentation.totalCustomers}
          </Text>
        </View>

        {segmentation.segments.map((segment, index) => (
          <View key={index} style={styles.segmentCard}>
            <View style={styles.segmentHeader}>
              <View
                style={[
                  styles.segmentIndicator,
                  { backgroundColor: getSegmentColor(segment.segment) },
                ]}
              />
              <Text style={styles.segmentName}>
                {t(`analytics.segment.${segment.segment}`)}
              </Text>
              <Text style={styles.segmentCount}>({segment.count})</Text>
            </View>
            <View style={styles.segmentMetrics}>
              <View style={styles.segmentMetric}>
                <Text style={styles.segmentMetricLabel}>
                  {t('analytics.totalValue')}
                </Text>
                <Text style={styles.segmentMetricValue}>
                  {formatMMK(segment.totalValue)}
                </Text>
              </View>
              <View style={styles.segmentMetric}>
                <Text style={styles.segmentMetricLabel}>
                  {t('analytics.avgOrderValue')}
                </Text>
                <Text style={styles.segmentMetricValue}>
                  {formatMMK(segment.averageOrderValue)}
                </Text>
              </View>
            </View>
            <View style={styles.segmentProgress}>
              <View
                style={[
                  styles.segmentProgressFill,
                  {
                    width: `${
                      (segment.count / segmentation.totalCustomers) * 100
                    }%`,
                    backgroundColor: getSegmentColor(segment.segment),
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {!customerId && renderCustomerSelector()}
      {renderTabBar()}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'patterns' && renderPatternsTab()}
      {activeTab === 'segments' && renderSegmentsTab()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  customerSelector: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectorLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  customerChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    marginRight: 8,
  },
  customerChipActive: {
    backgroundColor: '#3B82F6',
  },
  customerChipText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  customerChipTextActive: {
    color: '#FFFFFF',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#3B82F6',
  },
  tabContent: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  customerName: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  segmentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  segmentBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  metricCard: {
    width: (width - 44) / 2,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  riskCard: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  riskTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
    marginLeft: 8,
  },
  riskMeter: {
    marginTop: 8,
  },
  riskMeterBg: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  riskMeterFill: {
    height: '100%',
    borderRadius: 4,
  },
  riskLevel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    margin: 16,
    marginBottom: 12,
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  barItem: {
    marginBottom: 12,
  },
  barLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bar: {
    height: 20,
    backgroundColor: '#3B82F6',
    borderRadius: 4,
    marginRight: 8,
  },
  barValue: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  categoriesContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  categoryAmount: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#111827',
    marginRight: 8,
  },
  categoryPercentage: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  frequencyContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'space-around',
  },
  frequencyItem: {
    alignItems: 'center',
  },
  dayName: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 8,
  },
  frequencyBar: {
    width: 20,
    height: 50,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  frequencyFill: {
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  frequencyCount: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#111827',
    marginTop: 4,
  },
  avgItemsCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  avgItemsLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  avgItemsValue: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  segmentationHeader: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  totalCustomersText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  segmentCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  segmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  segmentIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  segmentName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
    flex: 1,
  },
  segmentCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  segmentMetrics: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  segmentMetric: {
    flex: 1,
  },
  segmentMetricLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  segmentMetricValue: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  segmentProgress: {
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    overflow: 'hidden',
  },
  segmentProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
