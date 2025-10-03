import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useStockMovements } from '@/hooks/useQueries';
import { StockMovement } from '@/services/database';
import {
  TrendingUp,
  TrendingDown,
  Package,
  Calendar,
  User,
  FileText,
} from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';

interface MovementHistoryProps {
  productId?: string;
  filters?: {
    type?: 'stock_in' | 'stock_out';
    startDate?: Date;
    endDate?: Date;
    supplierId?: string;
  };
  showProductName?: boolean;
  compact?: boolean;
}

export const MovementHistory: React.FC<MovementHistoryProps> = ({
  productId,
  filters,
  showProductName = false,
  compact = false,
}) => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const pageSize = compact ? 10 : 20;

  const combinedFilters = {
    ...filters,
    ...(productId && { productId }),
  };

  const {
    data: movements = [],
    isLoading,
    isRefetching,
    refetch,
  } = useStockMovements(combinedFilters, page, pageSize);

  // For now, we'll handle pagination manually
  const hasNextPage = movements.length === pageSize;
  const isFetchingNextPage = false;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMMK = (amount: number) => {
    return new Intl.NumberFormat('en-US').format(amount) + ' MMK';
  };

  const getMovementIcon = (type: 'stock_in' | 'stock_out') => {
    return type === 'stock_in' ? (
      <TrendingUp size={20} color="#059669" />
    ) : (
      <TrendingDown size={20} color="#EF4444" />
    );
  };

  const getMovementColor = (type: 'stock_in' | 'stock_out') => {
    return type === 'stock_in' ? '#059669' : '#EF4444';
  };

  const renderMovementItem = ({ item }: { item: StockMovement }) => (
    <Card
      style={
        compact
          ? [styles.movementItem, styles.movementItemCompact]
          : styles.movementItem
      }
    >
      <View style={styles.movementHeader}>
        <View style={styles.movementType}>
          {getMovementIcon(item.type)}
          <Text
            style={[
              styles.movementTypeText,
              { color: getMovementColor(item.type) },
            ]}
          >
            {item.type === 'stock_in'
              ? t('stockMovement.stockIn')
              : t('stockMovement.stockOut')}
          </Text>
        </View>
        <Text style={styles.movementDate}>{formatDate(item.created_at)}</Text>
      </View>

      <View style={styles.movementContent}>
        {showProductName && item.product_name && (
          <View style={styles.movementRow}>
            <Package size={16} color="#6B7280" />
            <Text style={styles.movementProductName}>{item.product_name}</Text>
          </View>
        )}

        <View style={styles.movementRow}>
          <Text style={styles.movementLabel}>
            {t('stockMovement.quantity')}:
          </Text>
          <Text
            style={[
              styles.movementQuantity,
              { color: getMovementColor(item.type) },
            ]}
          >
            {item.type === 'stock_in' ? '+' : '-'}
            {item.quantity}
          </Text>
        </View>

        {item.reason && (
          <View style={styles.movementRow}>
            <FileText size={16} color="#6B7280" />
            <Text style={styles.movementReason}>{item.reason}</Text>
          </View>
        )}

        {item.supplier_name && (
          <View style={styles.movementRow}>
            <User size={16} color="#6B7280" />
            <Text style={styles.movementSupplier}>{item.supplier_name}</Text>
          </View>
        )}

        {item.reference_number && (
          <View style={styles.movementRow}>
            <Text style={styles.movementLabel}>
              {t('stockMovement.reference')}:
            </Text>
            <Text style={styles.movementReference}>
              {item.reference_number}
            </Text>
          </View>
        )}

        {item.unit_cost && (
          <View style={styles.movementRow}>
            <Text style={styles.movementLabel}>
              {t('stockMovement.unitCost')}:
            </Text>
            <Text style={styles.movementCost}>{formatMMK(item.unit_cost)}</Text>
          </View>
        )}
      </View>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Package size={48} color="#9CA3AF" />
      <Text style={styles.emptyStateText}>
        {t('stockMovement.noMovements')}
      </Text>
      <Text style={styles.emptyStateSubtext}>
        {productId
          ? t('stockMovement.noMovementsForProduct')
          : t('stockMovement.noMovementsYet')}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!hasNextPage) return null;

    return (
      <View style={styles.footer}>
        {isFetchingNextPage ? (
          <LoadingSpinner />
        ) : (
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={() => setPage(page + 1)}
          >
            <Text style={styles.loadMoreText}>{t('common.loadMore')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (isLoading && !isRefetching) {
    return <LoadingSpinner />;
  }

  return (
    <View
      style={
        compact ? [styles.container, styles.containerCompact] : styles.container
      }
    >
      {!compact && (
        <View style={styles.header}>
          <Calendar size={20} color="#059669" />
          <Text style={styles.title}>{t('stockMovement.history')}</Text>
        </View>
      )}

      <FlatList
        data={movements}
        keyExtractor={(item) => item.id}
        renderItem={renderMovementItem}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          movements.length === 0
            ? [styles.listContent, styles.listContentEmpty]
            : styles.listContent
        }
        // Performance optimizations
        initialNumToRender={compact ? 5 : 10}
        maxToRenderPerBatch={compact ? 5 : 10}
        windowSize={5}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
        getItemLayout={(_, index) => ({
          length: compact ? 120 : 140,
          offset: (compact ? 120 : 140) * index,
          index,
        })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerCompact: {
    maxHeight: 400,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginLeft: 12,
  },
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  movementItem: {
    marginBottom: 12,
    padding: 16,
  },
  movementItemCompact: {
    padding: 12,
    marginBottom: 8,
  },
  movementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  movementType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  movementTypeText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  movementDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  movementContent: {
    gap: 8,
  },
  movementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  movementLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  movementQuantity: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  movementProductName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    flex: 1,
  },
  movementReason: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    flex: 1,
  },
  movementSupplier: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#059669',
    flex: 1,
  },
  movementReference: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  movementCost: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#059669',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  loadMoreText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#059669',
  },
});
