import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useDashboardAnalytics } from '@/hooks/useDashboard';
import { CustomBarChart } from '@/components/Charts';
import {
  DollarSign,
  Package,
  TriangleAlert as AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  Eye,
  Wallet,
  PiggyBank,
  CreditCard,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTranslation } from '@/context/LocalizationContext';
import { LanguageIconButton } from '@/components/LanguageIconButton';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
import { MyanmarText as Text } from '@/components/MyanmarText';

export default function Dashboard() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrencyFormatter();

  // Use React Query for optimized data fetching
  const {
    data: dashboardData,
    isLoading,
    isRefetching,
    refetch,
  } = useDashboardAnalytics();

  const onRefresh = () => {
    refetch();
  };

  // Extract data from React Query result
  const analytics = dashboardData?.analytics;
  const lowStockCount = dashboardData?.lowStockCount || 0;
  const totalProducts = dashboardData?.totalProducts || 0;
  const dailySalesChart = dashboardData?.dailySalesChart;
  const dailyExpensesChart = dashboardData?.dailyExpensesChart;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title} weight="bold">
            {t('dashboard.title')}
          </Text>
          <Text style={styles.subtitle}>{t('dashboard.subtitle')}</Text>
        </View>
        <View style={styles.headerRight}>
          <LanguageIconButton style={styles.languageSelector} />
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => router.push('/reports')}
          >
            <Eye size={20} color="#059669" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metricsGrid}>
          {/* Total Sale Value */}
          <Card style={styles.metricCard}>
            <View style={styles.metricContent}>
              <View
                style={[styles.iconContainer, { backgroundColor: '#059669' }]}
              >
                <DollarSign size={18} color="#FFFFFF" />
              </View>
              <View style={styles.metricText}>
                <Text style={styles.metricValue} weight="bold">
                  {formatPrice(analytics?.totalRevenue || 0)}
                </Text>
                <Text style={styles.metricLabel} weight="medium">
                  {t('dashboard.totalRevenue')}
                </Text>
              </View>
            </View>
          </Card>

          {/* Total Expenses */}
          <Card style={styles.metricCard}>
            <View style={styles.metricContent}>
              <View
                style={[styles.iconContainer, { backgroundColor: '#EF4444' }]}
              >
                <CreditCard size={18} color="#FFFFFF" />
              </View>
              <View style={styles.metricText}>
                <Text style={styles.metricValue} weight="bold">
                  {formatPrice(analytics?.totalExpenses || 0)}
                </Text>
                <Text style={styles.metricLabel} weight="medium">
                  {t('dashboard.totalExpenses')}
                </Text>
              </View>
            </View>
          </Card>

          {/* Total Balance */}
          <Card style={styles.metricCard}>
            <View style={styles.metricContent}>
              <View
                style={[styles.iconContainer, { backgroundColor: '#3B82F6' }]}
              >
                <Wallet size={18} color="#FFFFFF" />
              </View>
              <View style={styles.metricText}>
                <Text
                  style={[
                    styles.metricValue,
                    (analytics?.totalBalance || 0) < 0 && styles.negativeValue,
                  ]}
                  weight="bold"
                >
                  {formatPrice(analytics?.totalBalance || 0)}
                </Text>
                <Text style={styles.metricLabel} weight="medium">
                  {t('dashboard.totalBalance')}
                </Text>
              </View>
            </View>
          </Card>

          {/* Total Sale Profit */}
          <Card style={styles.metricCard}>
            <View style={styles.metricContent}>
              <View
                style={[styles.iconContainer, { backgroundColor: '#10B981' }]}
              >
                <TrendingUp size={18} color="#FFFFFF" />
              </View>
              <View style={styles.metricText}>
                <Text style={styles.metricValue} weight="bold">
                  {formatPrice(analytics?.totalProfit || 0)}
                </Text>
                <Text style={styles.metricLabel} weight="medium">
                  {t('dashboard.totalProfit')}
                </Text>
              </View>
            </View>
          </Card>

          {/* Net Profit */}
          <Card style={styles.metricCard}>
            <View style={styles.metricContent}>
              <View
                style={[styles.iconContainer, { backgroundColor: '#8B5CF6' }]}
              >
                <PiggyBank size={18} color="#FFFFFF" />
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
                  {t('dashboard.netProfit')}
                </Text>
              </View>
            </View>
          </Card>

          {/* Low Stock Items */}
          <Card style={styles.metricCard}>
            <View style={styles.metricContent}>
              <View
                style={[styles.iconContainer, { backgroundColor: '#F59E0B' }]}
              >
                <AlertTriangle size={18} color="#FFFFFF" />
              </View>
              <View style={styles.metricText}>
                <Text style={styles.metricValue} weight="bold">
                  {lowStockCount}
                </Text>
                <Text style={styles.metricLabel} weight="medium">
                  {t('dashboard.lowStockItems')}
                </Text>
                {lowStockCount > 0 && (
                  <TouchableOpacity
                    style={styles.actionLink}
                    onPress={() => router.push('/inventory')}
                  >
                    <Text style={styles.actionLinkText} weight="medium">
                      {t('dashboard.viewDetails')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Card>
        </View>

        {/* Daily Sales Chart */}
        {dailySalesChart && (
          <CustomBarChart
            data={{
              labels: dailySalesChart.labels,
              datasets: [{ data: dailySalesChart.data }],
            }}
            title={`${t(
              'dashboard.dailySales'
            )} - ${new Date().toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}`}
            formatYLabel={(value) => formatPrice(parseFloat(value))}
            footer={{
              label: t('dashboard.totalSales'),
              value: formatPrice(
                dailySalesChart.data.reduce((sum, val) => sum + val, 0)
              ),
            }}
          />
        )}

        {/* Daily Expenses Chart */}
        {dailyExpensesChart && (
          <CustomBarChart
            data={{
              labels: dailyExpensesChart.labels,
              datasets: [{ data: dailyExpensesChart.data }],
            }}
            title={`${t(
              'dashboard.dailyExpenses'
            )} - ${new Date().toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}`}
            formatYLabel={(value) => formatPrice(parseFloat(value))}
            footer={{
              label: t('dashboard.totalExpenses'),
              value: formatPrice(
                dailyExpensesChart.data.reduce((sum, val) => sum + val, 0)
              ),
            }}
          />
        )}

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} weight="medium">
              {t('dashboard.topProducts')} ({t('dashboard.thisMonth')})
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/reports')}>
              <Text style={styles.viewAllText} weight="medium">
                {t('dashboard.viewAll')}
              </Text>
            </TouchableOpacity>
          </View>
          {analytics?.topProducts && analytics.topProducts.length > 0 ? (
            analytics.topProducts.map((product: any, index: number) => (
              <View key={index} style={styles.productRow}>
                <View style={styles.productRank}>
                  <Text style={styles.rankNumber} weight="bold">
                    {index + 1}
                  </Text>
                </View>
                {product.imageUrl && (
                  <Image
                    source={{ uri: product.imageUrl }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.productInfo}>
                  <Text style={styles.productName} weight="medium">
                    {product.name}
                  </Text>
                  <Text style={styles.productStats}>
                    {t('dashboard.sold')}: {product.quantity} •{' '}
                    {t('dashboard.revenue')}: {formatPrice(product.revenue)}
                  </Text>
                </View>
                <View style={styles.productTrend}>
                  <ArrowUpRight size={16} color="#059669" />
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Package size={32} color="#9CA3AF" />
              <Text style={styles.noData} weight="medium">
                {t('dashboard.noSalesData')}
              </Text>
              <Text style={styles.noDataSubtext}>
                {t('dashboard.startMakingSales')}
              </Text>
            </View>
          )}
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} weight="medium">
              {t('dashboard.storeOverview')}
            </Text>
            <TouchableOpacity onPress={() => router.push('/inventory')}>
              <Text style={styles.viewAllText} weight="medium">
                {t('dashboard.manage')}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.overviewRow}>
            <View style={styles.overviewIcon}>
              <Package size={16} color="#6B7280" />
            </View>
            <Text style={styles.overviewLabel} weight="medium">
              {t('dashboard.totalProducts')}
            </Text>
            <Text style={styles.overviewValue} weight="medium">
              {totalProducts}
            </Text>
          </View>
          <View style={styles.overviewRow}>
            <View style={styles.overviewIcon}>
              <AlertTriangle size={16} color="#EF4444" />
            </View>
            <Text style={styles.overviewLabel} weight="medium">
              {t('dashboard.lowStockItems')}
            </Text>
            <Text
              style={[
                styles.overviewValue,
                lowStockCount > 0 && styles.warningText,
              ]}
              weight="medium"
            >
              {lowStockCount}
            </Text>
          </View>
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
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageSelector: {
    marginRight: 8,
  },
  viewAllButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 20,
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
  iconContainer: {
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
  metricTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  trendText: {
    fontSize: 12,
    color: '#059669',
    marginLeft: 4,
  },
  actionLink: {
    marginTop: 4,
  },
  actionLinkText: {
    fontSize: 9,
    color: '#EF4444',
    textAlign: 'center',
  },
  sectionCard: {
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    color: '#111827',
  },
  viewAllText: {
    fontSize: 14,
    color: '#059669',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  productRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#F9FAFB',
  },
  rankNumber: {
    fontSize: 12,
    color: '#6B7280',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    color: '#111827',
  },
  productStats: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  productTrend: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noData: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 12,
  },
  noDataSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  overviewIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  overviewLabel: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },
  overviewValue: {
    fontSize: 15,
    color: '#111827',
  },
  warningText: {
    color: '#EF4444',
  },
  negativeValue: {
    color: '#EF4444',
  },
  bottomPadding: {
    height: 20,
  },
});
