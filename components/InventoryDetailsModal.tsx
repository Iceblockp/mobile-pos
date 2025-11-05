import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import {
  X,
  Package,
  TrendingUp,
  AlertTriangle,
  BarChart3,
} from 'lucide-react-native';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
import { useTranslation } from '@/context/LocalizationContext';
import { useTotalInventoryValue, useCategories } from '@/hooks/useQueries';

interface InventoryDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  categoryFilter?: string;
}

export const InventoryDetailsModal: React.FC<InventoryDetailsModalProps> = ({
  visible,
  onClose,
  categoryFilter,
}) => {
  const { formatPrice } = useCurrencyFormatter();
  const { t } = useTranslation();

  const {
    data: inventoryStats,
    isLoading,
    error,
  } = useTotalInventoryValue(
    categoryFilter !== 'All' ? categoryFilter : undefined
  );

  const { data: categories } = useCategories();

  // Get category name from ID
  const getCategoryName = useMemo(() => {
    if (!categoryFilter || categoryFilter === 'All') {
      return null;
    }
    const category = categories?.find((cat) => cat.id === categoryFilter);
    return category?.name || categoryFilter; // Fallback to ID if name not found
  }, [categoryFilter, categories]);

  // Calculate low stock value from the stats
  const lowStockValue = useMemo(() => {
    // This is an approximation since we don't have exact low stock value from the query
    // We could add this to the database query if needed
    return inventoryStats
      ? (inventoryStats.totalValue * inventoryStats.lowStockCount) /
          inventoryStats.productCount
      : 0;
  }, [inventoryStats]);

  const lowStockPercentage =
    inventoryStats && inventoryStats.totalValue > 0
      ? (lowStockValue / inventoryStats.totalValue) * 100
      : 0;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <BarChart3 size={24} color="#059669" />
              <Text style={styles.title} weight="medium">
                {getCategoryName
                  ? t('inventory.categoryInventoryDetails', {
                      category: getCategoryName,
                    })
                  : t('inventory.inventoryDetails')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Main Inventory Value */}
            <View style={styles.mainCard}>
              <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                  <Package size={24} color="#059669" />
                </View>
                <View style={styles.headerContent}>
                  <Text style={styles.cardTitle} weight="medium">
                    {t('inventory.totalInventoryValue')}
                  </Text>
                  <Text style={styles.itemCount}>
                    {inventoryStats?.totalItems.toLocaleString()}{' '}
                    {t('inventory.items')}
                  </Text>
                </View>
              </View>
              <Text style={styles.mainValue} weight="bold">
                {formatPrice(inventoryStats?.totalValue || 0)}
              </Text>
            </View>

            {/* Low Stock Alert */}
            {inventoryStats && inventoryStats.lowStockCount > 0 && (
              <View style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <AlertTriangle size={20} color="#F59E0B" />
                  <Text style={styles.alertTitle} weight="medium">
                    {t('inventory.lowStockAlert')}
                  </Text>
                </View>
                <View style={styles.alertContent}>
                  <Text style={styles.alertValue} weight="medium">
                    {formatPrice(lowStockValue)}
                  </Text>
                  <Text style={styles.alertSubtext}>
                    {inventoryStats?.lowStockCount} {t('inventory.items')} (
                    {lowStockPercentage.toFixed(1)}%{' '}
                    {t('inventory.ofTotalValue')})
                  </Text>
                </View>
              </View>
            )}

            {/* Category Breakdown */}
            {inventoryStats && inventoryStats.categoryBreakdown.length > 0 && (
              <View style={styles.breakdownCard}>
                <View style={styles.breakdownHeader}>
                  <TrendingUp size={20} color="#3B82F6" />
                  <Text style={styles.breakdownTitle} weight="medium">
                    {t('inventory.categoryBreakdown')}
                  </Text>
                </View>
                <View style={styles.breakdownList}>
                  {inventoryStats.categoryBreakdown.map((category) => {
                    const percentage =
                      inventoryStats && inventoryStats.totalValue > 0
                        ? (category.value / inventoryStats.totalValue) * 100
                        : 0;

                    return (
                      <View
                        key={category.category}
                        style={styles.breakdownItem}
                      >
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
                            {category.count} {t('inventory.items')} •{' '}
                            {category.productCount} {t('inventory.products')}
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
                </View>
              </View>
            )}

            {/* Empty State */}
            {inventoryStats?.totalItems === 0 && (
              <View style={styles.emptyState}>
                <Package size={48} color="#D1D5DB" />
                <Text style={styles.emptyStateText}>
                  {getCategoryName
                    ? t('inventory.noProductsInCategory', {
                        category: getCategoryName,
                      })
                    : t('inventory.noProductsInInventory')}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '95%',
    maxHeight: '95%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 18,
    color: '#111827',
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  mainCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
    marginBottom: 16,
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
    marginBottom: 16,
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
    gap: 16,
  },
  breakdownItem: {
    paddingBottom: 16,
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
