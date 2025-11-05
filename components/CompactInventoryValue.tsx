import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { Package, TrendingUp } from 'lucide-react-native';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
import { useTranslation } from '@/context/LocalizationContext';
import { useTotalInventoryValue } from '@/hooks/useQueries';

interface CompactInventoryValueProps {
  categoryFilter?: string;
  onShowDetails?: () => void;
}

export const CompactInventoryValue: React.FC<CompactInventoryValueProps> = ({
  categoryFilter,
  onShowDetails,
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

  if (
    isLoading ||
    error ||
    !inventoryStats ||
    inventoryStats.productCount === 0
  ) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onShowDetails}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {/* Left side - Icon and basic info */}
        <View style={styles.leftSection}>
          <View style={styles.iconContainer}>
            <Package size={16} color="#059669" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.valueText} weight="medium">
              {formatPrice(inventoryStats.totalValue)}
            </Text>
            <Text style={styles.itemsText}>
              {inventoryStats.totalItems.toLocaleString()}{' '}
              {t('inventory.items')}
            </Text>
          </View>
        </View>

        {/* Right side - Indicators */}
        <View style={styles.rightSection}>
          {inventoryStats.lowStockCount > 0 && (
            <View style={styles.lowStockIndicator}>
              <Text style={styles.lowStockText}>
                {inventoryStats.lowStockCount} {t('inventory.lowStock')}
              </Text>
            </View>
          )}
          <TrendingUp size={14} color="#6B7280" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 4,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  valueText: {
    fontSize: 16,
    color: '#059669',
    marginBottom: 2,
  },
  itemsText: {
    fontSize: 12,
    color: '#6B7280',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lowStockIndicator: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lowStockText: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: '500',
  },
});
