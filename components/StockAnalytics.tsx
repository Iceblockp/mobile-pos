import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import {
  useStockMovementTrends,
  useStockTurnoverRates,
  useLowStockPrediction,
  useStockMovementReport,
} from '@/hooks/useQueries';
import { formatCurrency } from '@/utils/formatters';
import { useCurrencyFormatter } from '@/hooks/useCurrency';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { useTranslation } from '@/context/LocalizationContext';

const { width } = Dimensions.get('window');

interface StockAnalyticsProps {
  productId?: number;
}

export const StockAnalytics: React.FC<StockAnalyticsProps> = ({
  productId,
}) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrencyFormatter();
  const [activeTab, setActiveTab] = useState<
    'trends' | 'turnover' | 'predictions' | 'reports'
  >('trends');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();

    switch (dateRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();
  const { data: trends } = useStockMovementTrends(startDate, endDate);
  const { data: turnoverRates } = useStockTurnoverRates();
  const { data: lowStockPrediction } = useLowStockPrediction();
  const { data: movementReport } = useStockMovementReport(
    startDate,
    endDate,
    productId
  );

  const renderDateRangeSelector = () => (
    <View style={styles.dateRangeSelector}>
      {(['7d', '30d', '90d'] as const).map((range) => (
        <TouchableOpacity
          key={range}
          style={[
            styles.dateRangeButton,
            dateRange === range && styles.dateRangeButtonActive,
          ]}
          onPress={() => setDateRange(range)}
        >
          <Text
            style={[
              styles.dateRangeButtonText,
              dateRange === range && styles.dateRangeButtonTextActive,
            ]}
          >
            {range === '7d'
              ? t('analytics.last7Days')
              : range === '30d'
              ? t('analytics.last30Days')
              : t('analytics.last90Days')}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'trends' && styles.activeTab]}
        onPress={() => setActiveTab('trends')}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === 'trends' && styles.activeTabText,
          ]}
        >
          {t('analytics.trends')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'turnover' && styles.activeTab]}
        onPress={() => setActiveTab('turnover')}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === 'turnover' && styles.activeTabText,
          ]}
        >
          {t('analytics.turnover')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'predictions' && styles.activeTab]}
        onPress={() => setActiveTab('predictions')}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === 'predictions' && styles.activeTabText,
          ]}
        >
          {t('analytics.predictions')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
        onPress={() => setActiveTab('reports')}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === 'reports' && styles.activeTabText,
          ]}
        >
          {t('analytics.reports')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderTrendsTab = () => {
    if (!trends) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="trending-up-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyStateText}>
            {t('analytics.noTrendsData')}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent}>
        <Text style={styles.sectionTitle}>{t('analytics.dailyMovements')}</Text>
        <View style={styles.chartContainer}>
          {trends.dailyMovements.slice(0, 7).map((item, index) => (
            <View key={index} style={styles.movementItem}>
              <Text style={styles.movementDate}>{item.date}</Text>
              <View style={styles.movementBars}>
                <View style={styles.movementBar}>
                  <Text style={styles.movementLabel}>
                    {t('analytics.stockIn')}
                  </Text>
                  <View
                    style={[
                      styles.bar,
                      styles.stockInBar,
                      { width: Math.max(20, item.stockIn * 2) },
                    ]}
                  />
                  <Text style={styles.movementValue}>{item.stockIn}</Text>
                </View>
                <View style={styles.movementBar}>
                  <Text style={styles.movementLabel}>
                    {t('analytics.stockOut')}
                  </Text>
                  <View
                    style={[
                      styles.bar,
                      styles.stockOutBar,
                      { width: Math.max(20, item.stockOut * 2) },
                    ]}
                  />
                  <Text style={styles.movementValue}>{item.stockOut}</Text>
                </View>
              </View>
              <Text
                style={[
                  styles.netChange,
                  { color: item.netChange >= 0 ? '#10B981' : '#EF4444' },
                ]}
              >
                {item.netChange >= 0 ? '+' : ''}
                {item.netChange}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>
          {t('analytics.topMovingProducts')}
        </Text>
        <View style={styles.productsContainer}>
          {trends.topMovingProducts.map((product, index) => (
            <View key={index} style={styles.productItem}>
              <View style={styles.productRank}>
                <Text style={styles.rankNumber}>{index + 1}</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.productName}</Text>
                <Text style={styles.productMovement}>
                  {t('analytics.totalMovement')}: {product.totalMovement}
                </Text>
              </View>
              <Text
                style={[
                  styles.productNetChange,
                  { color: product.netChange >= 0 ? '#10B981' : '#EF4444' },
                ]}
              >
                {product.netChange >= 0 ? '+' : ''}
                {product.netChange}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderTurnoverTab = () => {
    if (!turnoverRates) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="refresh-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyStateText}>
            {t('analytics.noTurnoverData')}
          </Text>
        </View>
      );
    }

    const getTurnoverColor = (rate: number) => {
      if (rate > 2) return '#10B981'; // High turnover - good
      if (rate > 1) return '#F59E0B'; // Medium turnover
      return '#EF4444'; // Low turnover - needs attention
    };

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.overallTurnoverCard}>
          <Text style={styles.overallTurnoverLabel}>
            {t('analytics.overallTurnover')}
          </Text>
          <Text style={styles.overallTurnoverValue}>
            {turnoverRates.overallTurnover.toFixed(2)}x
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          {t('analytics.categoryTurnover')}
        </Text>
        <View style={styles.categoryContainer}>
          {turnoverRates.categoryTurnover.map((category, index) => (
            <View key={index} style={styles.categoryTurnoverItem}>
              <Text style={styles.categoryTurnoverName}>
                {category.categoryName}
              </Text>
              <View style={styles.categoryTurnoverMetrics}>
                <Text
                  style={[
                    styles.categoryTurnoverRate,
                    { color: getTurnoverColor(category.avgTurnoverRate) },
                  ]}
                >
                  {category.avgTurnoverRate.toFixed(2)}x
                </Text>
                <Text style={styles.categoryTurnoverValue}>
                  {formatPrice(category.totalValue)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>
          {t('analytics.productTurnover')}
        </Text>
        <View style={styles.productTurnoverContainer}>
          {turnoverRates.productTurnover.slice(0, 10).map((product, index) => (
            <View key={index} style={styles.productTurnoverItem}>
              <View style={styles.productTurnoverInfo}>
                <Text style={styles.productTurnoverName}>
                  {product.productName}
                </Text>
                <Text style={styles.productTurnoverCategory}>
                  {product.category}
                </Text>
              </View>
              <View style={styles.productTurnoverMetrics}>
                <Text
                  style={[
                    styles.productTurnoverRate,
                    { color: getTurnoverColor(product.turnoverRate) },
                  ]}
                >
                  {product.turnoverRate.toFixed(2)}x
                </Text>
                <Text style={styles.productDaysOfStock}>
                  {product.daysOfStock < 999
                    ? `${Math.round(product.daysOfStock)}d`
                    : '∞'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderPredictionsTab = () => {
    if (!lowStockPrediction) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="warning-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyStateText}>
            {t('analytics.noPredictionData')}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent}>
        {lowStockPrediction.criticalItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              <Ionicons name="alert-circle" size={20} color="#EF4444" />{' '}
              {t('analytics.criticalItems')} (
              {lowStockPrediction.criticalItems.length})
            </Text>
            <View style={styles.predictionContainer}>
              {lowStockPrediction.criticalItems.map((item, index) => (
                <View
                  key={index}
                  style={[styles.predictionItem, styles.criticalItem]}
                >
                  <View style={styles.predictionHeader}>
                    <Text style={styles.predictionProductName}>
                      {item.productName}
                    </Text>
                    <Text style={styles.predictionCategory}>
                      {item.category}
                    </Text>
                  </View>
                  <View style={styles.predictionMetrics}>
                    <View style={styles.predictionMetric}>
                      <Text style={styles.predictionMetricLabel}>
                        {t('analytics.currentStock')}
                      </Text>
                      <Text style={styles.predictionMetricValue}>
                        {item.currentStock}
                      </Text>
                    </View>
                    <View style={styles.predictionMetric}>
                      <Text style={styles.predictionMetricLabel}>
                        {t('analytics.minStock')}
                      </Text>
                      <Text style={styles.predictionMetricValue}>
                        {item.minStock}
                      </Text>
                    </View>
                    <View style={styles.predictionMetric}>
                      <Text style={styles.predictionMetricLabel}>
                        {t('analytics.daysLeft')}
                      </Text>
                      <Text
                        style={[
                          styles.predictionMetricValue,
                          { color: '#EF4444' },
                        ]}
                      >
                        {item.predictedDaysUntilEmpty < 999
                          ? Math.round(item.predictedDaysUntilEmpty)
                          : '∞'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {lowStockPrediction.warningItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              <Ionicons name="warning" size={20} color="#F59E0B" />{' '}
              {t('analytics.warningItems')} (
              {lowStockPrediction.warningItems.length})
            </Text>
            <View style={styles.predictionContainer}>
              {lowStockPrediction.warningItems.map((item, index) => (
                <View
                  key={index}
                  style={[styles.predictionItem, styles.warningItem]}
                >
                  <View style={styles.predictionHeader}>
                    <Text style={styles.predictionProductName}>
                      {item.productName}
                    </Text>
                    <Text style={styles.predictionCategory}>
                      {item.category}
                    </Text>
                  </View>
                  <View style={styles.predictionMetrics}>
                    <View style={styles.predictionMetric}>
                      <Text style={styles.predictionMetricLabel}>
                        {t('analytics.currentStock')}
                      </Text>
                      <Text style={styles.predictionMetricValue}>
                        {item.currentStock}
                      </Text>
                    </View>
                    <View style={styles.predictionMetric}>
                      <Text style={styles.predictionMetricLabel}>
                        {t('analytics.daysLeft')}
                      </Text>
                      <Text
                        style={[
                          styles.predictionMetricValue,
                          { color: '#F59E0B' },
                        ]}
                      >
                        {item.predictedDaysUntilEmpty < 999
                          ? Math.round(item.predictedDaysUntilEmpty)
                          : '∞'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {lowStockPrediction.criticalItems.length === 0 &&
          lowStockPrediction.warningItems.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons
                name="checkmark-circle-outline"
                size={48}
                color="#10B981"
              />
              <Text style={[styles.emptyStateText, { color: '#10B981' }]}>
                {t('analytics.allStockLevelsGood')}
              </Text>
            </View>
          )}
      </ScrollView>
    );
  };

  const renderReportsTab = () => {
    if (!movementReport) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyStateText}>
            {t('analytics.noReportData')}
          </Text>
        </View>
      );
    }

    const exportReport = async () => {
      try {
        const reportData = {
          summary: movementReport.summary,
          movements: movementReport.movements,
          productSummary: movementReport.productSummary,
          dateRange: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
        };

        const csvContent = generateCSVReport(reportData);

        // In a real app, you would save this to a file and share it
        Alert.alert(
          t('analytics.exportReport'),
          t('analytics.reportGenerated'),
          [{ text: t('common.ok') }]
        );
      } catch (error) {
        Alert.alert(t('common.error'), t('analytics.exportFailed'));
      }
    };

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.reportHeader}>
          <Text style={styles.reportTitle}>
            {t('analytics.stockMovementReport')}
          </Text>
          <TouchableOpacity style={styles.exportButton} onPress={exportReport}>
            <Ionicons name="download-outline" size={16} color="#FFFFFF" />
            <Text style={styles.exportButtonText}>{t('analytics.export')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.reportSummary}>
          <Text style={styles.reportSummaryTitle}>
            {t('analytics.summary')}
          </Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>
                {t('analytics.totalStockIn')}
              </Text>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                +{movementReport.summary.totalStockIn}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>
                {t('analytics.totalStockOut')}
              </Text>
              <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                -{movementReport.summary.totalStockOut}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>
                {t('analytics.netChange')}
              </Text>
              <Text
                style={[
                  styles.summaryValue,
                  {
                    color:
                      movementReport.summary.netChange >= 0
                        ? '#10B981'
                        : '#EF4444',
                  },
                ]}
              >
                {movementReport.summary.netChange >= 0 ? '+' : ''}
                {movementReport.summary.netChange}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>
                {t('analytics.totalTransactions')}
              </Text>
              <Text style={styles.summaryValue}>
                {movementReport.summary.totalTransactions}
              </Text>
            </View>
          </View>
        </View>

        {movementReport.productSummary && (
          <View style={styles.productSummaryCard}>
            <Text style={styles.productSummaryTitle}>
              {movementReport.productSummary.productName}
            </Text>
            <View style={styles.productSummaryGrid}>
              <View style={styles.productSummaryItem}>
                <Text style={styles.productSummaryLabel}>
                  {t('analytics.openingStock')}
                </Text>
                <Text style={styles.productSummaryValue}>
                  {movementReport.productSummary.openingStock}
                </Text>
              </View>
              <View style={styles.productSummaryItem}>
                <Text style={styles.productSummaryLabel}>
                  {t('analytics.closingStock')}
                </Text>
                <Text style={styles.productSummaryValue}>
                  {movementReport.productSummary.closingStock}
                </Text>
              </View>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>
          {t('analytics.recentMovements')}
        </Text>
        <View style={styles.movementsContainer}>
          {movementReport.movements.slice(0, 20).map((movement, index) => (
            <View key={index} style={styles.movementReportItem}>
              <View style={styles.movementReportHeader}>
                <Text style={styles.movementReportProduct}>
                  {movement.productName}
                </Text>
                <Text style={styles.movementReportDate}>
                  {new Date(movement.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.movementReportDetails}>
                <View
                  style={[
                    styles.movementTypeIndicator,
                    {
                      backgroundColor:
                        movement.type === 'stock_in' ? '#10B981' : '#EF4444',
                    },
                  ]}
                />
                <Text style={styles.movementReportType}>
                  {t(`analytics.${movement.type}`)}
                </Text>
                <Text style={styles.movementReportQuantity}>
                  {movement.type === 'stock_in' ? '+' : '-'}
                  {movement.quantity}
                </Text>
              </View>
              <Text style={styles.movementReportReason}>{movement.reason}</Text>
              {movement.supplierName && (
                <Text style={styles.movementReportSupplier}>
                  {t('analytics.supplier')}: {movement.supplierName}
                </Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const generateCSVReport = (data: any) => {
    // Simple CSV generation - in a real app, you'd use a proper CSV library
    let csv = 'Stock Movement Report\n\n';
    csv += `Date Range: ${data.dateRange}\n\n`;
    csv += 'Summary\n';
    csv += `Total Stock In,${data.summary.totalStockIn}\n`;
    csv += `Total Stock Out,${data.summary.totalStockOut}\n`;
    csv += `Net Change,${data.summary.netChange}\n`;
    csv += `Total Transactions,${data.summary.totalTransactions}\n\n`;

    csv += 'Movements\n';
    csv += 'Product,Type,Quantity,Reason,Supplier,Date\n';
    data.movements.forEach((movement: any) => {
      csv += `${movement.productName},${movement.type},${movement.quantity},${
        movement.reason
      },${movement.supplierName || ''},${movement.createdAt}\n`;
    });

    return csv;
  };

  return (
    <View style={styles.container}>
      {renderDateRangeSelector()}
      {renderTabBar()}
      {activeTab === 'trends' && renderTrendsTab()}
      {activeTab === 'turnover' && renderTurnoverTab()}
      {activeTab === 'predictions' && renderPredictionsTab()}
      {activeTab === 'reports' && renderReportsTab()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  dateRangeSelector: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dateRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  dateRangeButtonActive: {
    backgroundColor: '#3B82F6',
  },
  dateRangeButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  dateRangeButtonTextActive: {
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
    fontSize: 12,
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  movementItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  movementDate: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#111827',
    marginBottom: 8,
  },
  movementBars: {
    marginBottom: 8,
  },
  movementBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  movementLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    width: 60,
  },
  bar: {
    height: 16,
    borderRadius: 4,
    marginRight: 8,
  },
  stockInBar: {
    backgroundColor: '#10B981',
  },
  stockOutBar: {
    backgroundColor: '#EF4444',
  },
  movementValue: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  netChange: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'right',
  },
  productsContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  productRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  productMovement: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  productNetChange: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  overallTurnoverCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  overallTurnoverLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  overallTurnoverValue: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  categoryContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryTurnoverItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryTurnoverName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#111827',
    flex: 1,
  },
  categoryTurnoverMetrics: {
    alignItems: 'flex-end',
  },
  categoryTurnoverRate: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  categoryTurnoverValue: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  productTurnoverContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productTurnoverItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  productTurnoverInfo: {
    flex: 1,
  },
  productTurnoverName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  productTurnoverCategory: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  productTurnoverMetrics: {
    alignItems: 'flex-end',
  },
  productTurnoverRate: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  productDaysOfStock: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  predictionContainer: {
    margin: 16,
    marginTop: 0,
  },
  predictionItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  criticalItem: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  warningItem: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
  },
  predictionHeader: {
    marginBottom: 12,
  },
  predictionProductName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  predictionCategory: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  predictionMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  predictionMetric: {
    alignItems: 'center',
  },
  predictionMetricLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  predictionMetricValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  reportTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  exportButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  reportSummary: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reportSummaryTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    width: (width - 76) / 2,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  productSummaryCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productSummaryTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  productSummaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productSummaryItem: {
    alignItems: 'center',
  },
  productSummaryLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  productSummaryValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  movementsContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  movementReportItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  movementReportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  movementReportProduct: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  movementReportDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  movementReportDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  movementTypeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  movementReportType: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#111827',
    flex: 1,
  },
  movementReportQuantity: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  movementReportReason: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  movementReportSupplier: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
});
