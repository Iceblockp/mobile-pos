import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { MenuButton } from '@/components/MenuButton';
import { StockMovementForm } from '@/components/StockMovementForm';
import { useDrawer } from '@/context/DrawerContext';
import { useTranslation } from '@/context/LocalizationContext';
import { useProducts, useLowStockProducts } from '@/hooks/useQueries';
import { Product } from '@/services/database';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Package,
} from 'lucide-react-native';

/**
 * Low Stock Page
 * Dedicated page for viewing products below minimum stock levels
 *
 * Features:
 * - Display products below minimum stock
 * - Quick action buttons for stock in/out
 * - Summary statistics
 * - Refresh functionality
 *
 * Requirements:
 * - 4.3: Navigate to low stock overview page from sidebar
 * - 4.6: Display products below minimum stock levels with quick action buttons
 */
export default function LowStock() {
  const { openDrawer } = useDrawer();
  const { t } = useTranslation();

  const [showStockMovementForm, setShowStockMovementForm] = useState(false);
  const [selectedProductForMovement, setSelectedProductForMovement] =
    useState<Product | null>(null);
  const [movementType, setMovementType] = useState<'stock_in' | 'stock_out'>(
    'stock_in',
  );

  // Fetch products and low stock products
  const {
    data: products = [],
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = useProducts();

  const {
    data: lowStockProducts = [],
    isLoading: lowStockLoading,
    isRefetching: lowStockRefetching,
    refetch: refetchLowStock,
  } = useLowStockProducts();

  const isLoading = productsLoading || lowStockLoading;
  const isRefreshing = lowStockRefetching;

  const onRefresh = () => {
    refetchProducts();
    refetchLowStock();
  };

  const handleQuickStockMovement = (
    product: Product,
    type: 'stock_in' | 'stock_out',
  ) => {
    setSelectedProductForMovement(product);
    setMovementType(type);
    setShowStockMovementForm(true);
  };

  if (isLoading && !isRefreshing) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with menu button */}
      <View style={styles.header}>
        <MenuButton onPress={openDrawer} />
        <Text style={styles.title} weight="bold">
          {t('inventory.lowStock')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Summary Cards */}
        <View style={styles.summaryCards}>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryContent}>
              <View
                style={[styles.summaryIcon, { backgroundColor: '#3B82F6' }]}
              >
                <Package size={24} color="#FFFFFF" />
              </View>
              <View style={styles.summaryText}>
                <Text style={styles.summaryValue} weight="bold">
                  {products.length}
                </Text>
                <Text style={styles.summaryLabel} weight="medium">
                  {t('inventory.totalProducts')}
                </Text>
              </View>
            </View>
          </Card>

          <Card style={styles.summaryCard}>
            <View style={styles.summaryContent}>
              <View
                style={[styles.summaryIcon, { backgroundColor: '#EF4444' }]}
              >
                <AlertTriangle size={24} color="#FFFFFF" />
              </View>
              <View style={styles.summaryText}>
                <Text style={styles.summaryValue} weight="bold">
                  {lowStockProducts.length}
                </Text>
                <Text style={styles.summaryLabel} weight="medium">
                  {t('inventory.lowStock')}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Low Stock Products List */}
        {lowStockProducts.length > 0 ? (
          <Card>
            <Text style={styles.sectionTitle} weight="medium">
              {t('inventory.lowStockAlert')}
            </Text>

            <FlatList
              data={lowStockProducts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.alertItem}>
                  {item.imageUrl && (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.alertProductImage}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.alertInfo}>
                    <Text style={styles.alertProductName}>{item.name}</Text>
                    <Text style={styles.alertProductDetails}>
                      {t('inventory.stock')}: {item.quantity} |{' '}
                      {t('inventory.min')}: {item.min_stock}
                    </Text>
                  </View>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.adjustButton, styles.stockInButton]}
                      onPress={() => handleQuickStockMovement(item, 'stock_in')}
                    >
                      <TrendingUp size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.adjustButton, styles.stockOutButton]}
                      onPress={() =>
                        handleQuickStockMovement(item, 'stock_out')
                      }
                    >
                      <TrendingDown size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={onRefresh}
                />
              }
              ListFooterComponent={() => <View style={{ height: 300 }} />}
              // Performance optimizations
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={5}
              removeClippedSubviews={true}
              updateCellsBatchingPeriod={50}
              getItemLayout={(_, index) => ({
                length: 80, // Approximate height of alert item
                offset: 80 * index,
                index,
              })}
            />
          </Card>
        ) : (
          <Card style={styles.emptyState}>
            <Package size={48} color="#9CA3AF" />
            <Text style={styles.emptyStateText} weight="medium">
              {t('inventory.noLowStock')}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {t('inventory.allProductsStocked')}
            </Text>
          </Card>
        )}
      </View>

      {/* Stock Movement Form Modal */}
      <StockMovementForm
        visible={showStockMovementForm}
        onClose={() => {
          setShowStockMovementForm(false);
          setSelectedProductForMovement(null);
        }}
        product={selectedProductForMovement || undefined}
        initialType={movementType}
      />
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  title: {
    fontSize: 24,
    color: '#111827',
    flex: 1,
  },
  headerSpacer: {
    width: 44, // Match MenuButton width for centering
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    flex: 0.48,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  summaryText: {
    flex: 1,
  },
  summaryValue: {
    fontSize: 22,
    color: '#111827',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#111827',
    marginBottom: 16,
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  alertProductImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#F9FAFB',
  },
  alertInfo: {
    flex: 1,
  },
  alertProductName: {
    fontSize: 16,
    color: '#111827',
  },
  alertProductDetails: {
    fontSize: 14,
    color: '#F59E0B',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  adjustButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
  },
  stockInButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
  },
  stockOutButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
});
