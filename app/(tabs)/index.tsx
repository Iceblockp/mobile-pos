import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useDatabase } from '@/context/DatabaseContext';
import {
  DollarSign,
  Package,
  TriangleAlert as AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  Eye,
} from 'lucide-react-native';
import { router } from 'expo-router';

export default function Dashboard() {
  const { db, isReady } = useDatabase();
  const [analytics, setAnalytics] = useState<any>(null);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    if (!db) return;

    try {
      const [analyticsData, lowStockProducts, allProducts] = await Promise.all([
        db.getSalesAnalytics(30),
        db.getLowStockProducts(),
        db.getProducts(),
      ]);

      setAnalytics(analyticsData);
      setLowStockCount(lowStockProducts.length);
      setTotalProducts(allProducts.length);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  useEffect(() => {
    if (isReady) {
      loadDashboardData();
    }
  }, [isReady, db]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatMMK = (amount: number) => {
    return (
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount) + ' MMK'
    );
  };

  if (!isReady) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>
            Welcome back! Here's your store overview
          </Text>
        </View>
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => router.push('/analytics')}
        >
          <Eye size={20} color="#059669" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metricsGrid}>
          <Card style={styles.metricCard}>
            <View style={styles.metricContent}>
              <View
                style={[styles.iconContainer, { backgroundColor: '#059669' }]}
              >
                <DollarSign size={24} color="#FFFFFF" />
              </View>
              <View style={styles.metricText}>
                <Text style={styles.metricValue}>
                  {formatMMK(analytics?.totalRevenue || 0)}
                </Text>
                <Text style={styles.metricLabel}>Total Revenue (30d)</Text>
                <View style={styles.metricTrend}>
                  <ArrowUpRight size={12} color="#059669" />
                  <Text style={styles.trendText}>+12.5%</Text>
                </View>
              </View>
            </View>
          </Card>

          <Card style={styles.metricCard}>
            <View style={styles.metricContent}>
              <View
                style={[styles.iconContainer, { backgroundColor: '#3B82F6' }]}
              >
                <Package size={24} color="#FFFFFF" />
              </View>
              <View style={styles.metricText}>
                <Text style={styles.metricValue}>
                  {analytics?.totalSales || 0}
                </Text>
                <Text style={styles.metricLabel}>Total Sales (30d)</Text>
                <View style={styles.metricTrend}>
                  <ArrowUpRight size={12} color="#059669" />
                  <Text style={styles.trendText}>+8.2%</Text>
                </View>
              </View>
            </View>
          </Card>

          <Card style={styles.metricCard}>
            <View style={styles.metricContent}>
              <View
                style={[styles.iconContainer, { backgroundColor: '#F59E0B' }]}
              >
                <TrendingUp size={24} color="#FFFFFF" />
              </View>
              <View style={styles.metricText}>
                <Text style={styles.metricValue}>
                  {formatMMK(analytics?.avgSaleValue || 0)}
                </Text>
                <Text style={styles.metricLabel}>Avg Sale Value</Text>
                <View style={styles.metricTrend}>
                  <ArrowUpRight size={12} color="#059669" />
                  <Text style={styles.trendText}>+5.1%</Text>
                </View>
              </View>
            </View>
          </Card>

          <Card style={styles.metricCard}>
            <View style={styles.metricContent}>
              <View
                style={[styles.iconContainer, { backgroundColor: '#EF4444' }]}
              >
                <AlertTriangle size={24} color="#FFFFFF" />
              </View>
              <View style={styles.metricText}>
                <Text style={styles.metricValue}>{lowStockCount}</Text>
                <Text style={styles.metricLabel}>Low Stock Items</Text>
                {lowStockCount > 0 && (
                  <TouchableOpacity
                    style={styles.actionLink}
                    onPress={() => router.push('/inventory')}
                  >
                    <Text style={styles.actionLinkText}>View Details</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Card>
        </View>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Products (30 days)</Text>
            <TouchableOpacity onPress={() => router.push('/analytics')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {analytics?.topProducts?.length > 0 ? (
            analytics.topProducts.map((product: any, index: number) => (
              <View key={index} style={styles.productRow}>
                <View style={styles.productRank}>
                  <Text style={styles.rankNumber}>{index + 1}</Text>
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productStats}>
                    Sold: {product.quantity} • Revenue:{' '}
                    {formatMMK(product.revenue)}
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
              <Text style={styles.noData}>No sales data available</Text>
              <Text style={styles.noDataSubtext}>
                Start making sales to see analytics
              </Text>
            </View>
          )}
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Store Overview</Text>
            <TouchableOpacity onPress={() => router.push('/inventory')}>
              <Text style={styles.viewAllText}>Manage</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.overviewRow}>
            <View style={styles.overviewIcon}>
              <Package size={16} color="#6B7280" />
            </View>
            <Text style={styles.overviewLabel}>Total Products</Text>
            <Text style={styles.overviewValue}>{totalProducts}</Text>
          </View>
          <View style={styles.overviewRow}>
            <View style={styles.overviewIcon}>
              <AlertTriangle size={16} color="#EF4444" />
            </View>
            <Text style={styles.overviewLabel}>Low Stock Items</Text>
            <Text
              style={[
                styles.overviewValue,
                lowStockCount > 0 && styles.warningText,
              ]}
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
    paddingTop: 24,
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
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
  metricsGrid: {
    marginBottom: 28,
  },
  metricCard: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  metricContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
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
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginTop: 4,
  },
  metricTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  trendText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#059669',
    marginLeft: 4,
  },
  actionLink: {
    marginTop: 6,
  },
  actionLinkText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
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
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
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
  rankNumber: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#6B7280',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  productStats: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginTop: 12,
  },
  noDataSubtext: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  overviewValue: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  warningText: {
    color: '#EF4444',
  },
  bottomPadding: {
    height: 20,
  },
});
