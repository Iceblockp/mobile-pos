import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { Package, TrendingUp, AlertTriangle } from 'lucide-react-native';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
import { useTranslation } from '@/context/LocalizationContext';
import type { Product } from '@/services/database';

interface InventoryValueDisplayProps {
  products: Product[];
  categoryFilter?: string;
  showCategoryBreakdown?: boolean;
}

interface InventoryStats {
  totalValue: number;
  totalItems: number;
  lowStockValue: number;
  lowStockCount: number;
  categoryBreakdown?: Array<{
    category: string;
    value: number;
    count: number;
  }>;
}

export const InventoryValueDisplay: React.FC<InventoryValueDisplayProps> = ({
  products,
  categoryFilter,
  showCategoryBreakdown = false,
}) => {
  const { formatPrice } = useCurrencyFormatter();
  const { t } = useTranslation();

  const inventoryStats = useMemo((): InventoryStats => {
    // Filter products by category if specified
    const filteredProducts =
      categoryFilter && categoryFilter !== 'All'
        ? products.filter((product) => product.category === categoryFilter)
        : products;

    let totalValue = 0;
    let totalItems = 0;
    let lowStockValue = 0;
    let lowStockCount = 0;
    const categoryMap = new Map<string, { value: number; count: number }>();

    filteredProducts.forEach((product) => {
      const productValue = (product.cost || 0) * product.quantity;
      const isLowStock = product.quantity <= product.min_stock; // Use min_stock threshold

      totalValue += productValue;
      totalItems += product.quantity;

      if (isLowStock) {
        lowStockValue += productValue;
        lowStockCount += product.quantity;
      }

      // Category breakdown
      if (showCategoryBreakdown && product.category) {
        const existing = categoryMap.get(product.category) || {
          value: 0,
          count: 0,
        };
        categoryMap.set(product.category, {
          value: existing.value + productValue,
          count: existing.count + product.quantity,
        });
      }
    });

    const categoryBreakdown = showCategoryBreakdown
      ? Array.from(categoryMap.entries())
          .map(([category, stats]) => ({
            category,
            value: stats.value,
            count: stats.count,
          }))
          .sort((a, b) => b.value - a.value)
      : undefined;

    return {
      totalValue,
      totalItems,
      lowStockValue,
      lowStockCount,
      categoryBreakdown,
    };
  }, [products, categoryFilter, showCategoryBreakdown]);

  const lowStockPercentage =
    inventoryStats.totalValue > 0
      ? (inventoryStats.lowStockValue / inventoryStats.totalValue) * 100
      : 0;

  return (
    <View style={styles.container}>
      {/* Main Inventory Value */}
      <View style={styles.mainCard}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Package size={24} color="#059669" />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.cardTitle} weight="medium">
              {categoryFilter && categoryFilter !== 'All'
                ? t('inventory.categoryInventoryValue', {
                    category: categoryFilter,
                  })
                : t('inventory.totalInventoryValue')}
            </Text>
            <Text style={styles.itemCount}>
              {inventoryStats.totalItems.toLocaleString()}{' '}
              {t('inventory.items')}
            </Text>
          </View>
        </View>
        <Text style={styles.mainValue} weight="bold">
          {formatPrice(inventoryStats.totalValue)}
        </Text>
      </View>

      {/* Low Stock Alert */}
      {inventoryStats.lowStockCount > 0 && (
        <View style={styles.alertCard}>
          <View style={styles.alertHeader}>
            <AlertTriangle size={20} color="#F59E0B" />
            <Text style={styles.alertTitle} weight="medium">
              {t('inventory.lowStockAlert')}
            </Text>
          </View>
          <View style={styles.alertContent}>
            <Text style={styles.alertValue} weight="medium">
              {formatPrice(inventoryStats.lowStockValue)}
            </Text>
            <Text style={styles.alertSubtext}>
              {inventoryStats.lowStockCount} {t('inventory.items')} (
              {lowStockPercentage.toFixed(1)}% {t('inventory.ofTotalValue')})
            </Text>
          </View>
        </View>
      )}

      {/* Category Breakdown */}
      {showCategoryBreakdown &&
        inventoryStats.categoryBreakdown &&
        inventoryStats.categoryBreakdown.length > 0 && (
          <View style={styles.breakdownCard}>
            <View style={styles.breakdownHeader}>
              <TrendingUp size={20} color="#3B82F6" />
              <Text style={styles.breakdownTitle} weight="medium">
                {t('inventory.categoryBreakdown')}
              </Text>
            </View>
            <View style={styles.breakdownList}>
              {inventoryStats.categoryBreakdown
                .slice(0, 5)
                .map((category, index) => {
                  const percentage =
                    inventoryStats.totalValue > 0
                      ? (category.value / inventoryStats.totalValue) * 100
                      : 0;

                  return (
                    <View key={category.category} style={styles.breakdownItem}>
                      <View style={styles.breakdownItemHeader}>
                        <Text style={styles.categoryName} weight="medium">
                          {category.category}
                        </Text>
                        <Text style={styles.categoryPercentage}>
                          {percentage.toFixed(1)}%
                        </Text>
                      </View>
                      <View style={styles.breakdownItemDetails}>
                        <Text style={styles.categoryValue}>
                          {formatPrice(category.value)}
                        </Text>
                        <Text style={styles.categoryCount}>
                          {category.count} {t('inventory.items')}
                        </Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${Math.min(percentage, 100)}%` },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              {inventoryStats.categoryBreakdown.length > 5 && (
                <Text style={styles.moreCategories}>
                  {t('inventory.moreCategories', {
                    count: inventoryStats.categoryBreakdown.length - 5,
                  })}
                </Text>
              )}
            </View>
          </View>
        )}

      {/* Empty State */}
      {inventoryStats.totalItems === 0 && (
        <View style={styles.emptyState}>
          <Package size={48} color="#D1D5DB" />
          <Text style={styles.emptyStateText}>
            {categoryFilter && categoryFilter !== 'All'
              ? t('inventory.noProductsInCategory', {
                  category: categoryFilter,
                })
              : t('inventory.noProductsInInventory')}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 2,
  },
  itemCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  mainValue: {
    fontSize: 28,
    color: '#059669',
    textAlign: 'center',
  },
  alertCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 14,
    color: '#92400E',
    marginLeft: 8,
  },
  alertContent: {
    alignItems: 'center',
  },
  alertValue: {
    fontSize: 20,
    color: '#92400E',
    marginBottom: 4,
  },
  alertSubtext: {
    fontSize: 12,
    color: '#A16207',
    textAlign: 'center',
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  breakdownTitle: {
    fontSize: 16,
    color: '#111827',
    marginLeft: 8,
  },
  breakdownList: {
    gap: 12,
  },
  breakdownItem: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  breakdownItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 14,
    color: '#111827',
  },
  categoryPercentage: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },
  breakdownItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryValue: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '600',
  },
  categoryCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  moreCategories: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
  },
});
