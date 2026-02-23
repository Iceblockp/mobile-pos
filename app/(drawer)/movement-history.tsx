import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { EnhancedMovementHistory } from '@/components/inventory/EnhancedMovementHistory';
import { MovementSummary } from '@/components/MovementSummary';
import { MenuButton } from '@/components/MenuButton';
import { FilterChip } from '@/components/FilterChip';
import {
  MovementFilterSheet,
  MovementFilters,
} from '@/components/MovementFilterSheet';
import { useDrawer } from '@/context/DrawerContext';
import { useTranslation } from '@/context/LocalizationContext';
import { useProducts } from '@/hooks/useQueries';
import { useBasicSuppliers } from '@/hooks/useQueries';
import { Filter } from 'lucide-react-native';

/**
 * Parse URL parameters into MovementFilters object
 */
function parseURLFilters(params: Record<string, any>): MovementFilters {
  return {
    type: (params.type as 'all' | 'stock_in' | 'stock_out') || 'all',
    productId: params.productId,
    supplierId: params.supplierId,
    startDate: params.startDate ? new Date(params.startDate) : undefined,
    endDate: params.endDate ? new Date(params.endDate) : undefined,
  };
}

/**
 * Convert MovementFilters to URL parameters
 */
function filtersToURLParams(filters: MovementFilters): Record<string, string> {
  const params: Record<string, string> = {};

  if (filters.type !== 'all') params.type = filters.type;
  if (filters.productId) params.productId = filters.productId;
  if (filters.supplierId) params.supplierId = filters.supplierId;
  if (filters.startDate)
    params.startDate = filters.startDate.toISOString().split('T')[0];
  if (filters.endDate)
    params.endDate = filters.endDate.toISOString().split('T')[0];

  return params;
}

/**
 * Movement History Page
 * Dedicated page for viewing stock movements (extracted from inventory tab)
 *
 * Features:
 * - Complete stock movement history
 * - Filter by type (stock in/out), product, supplier, date range
 * - URL-based filter state with filter chips
 * - Bottom sheet filter panel
 * - Movement summary statistics
 *
 * Requirements:
 * - 1.1, 1.2, 1.3, 1.4: URL-based filter state
 * - 2.1, 2.2, 2.3: Compact filter chips
 * - 4.2: Navigate to stock movements page from sidebar
 * - 4.5: Display all stock movements with filtering options
 */
export default function MovementHistory() {
  const { openDrawer } = useDrawer();
  const { t } = useTranslation();
  const router = useRouter();
  const urlParams = useLocalSearchParams();

  // Parse URL params to filters on mount
  const [filters, setFilters] = useState<MovementFilters>(() =>
    parseURLFilters(urlParams),
  );
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // Get products and suppliers for filter sheet
  const { data: products = [] } = useProducts();
  const { data: suppliers = [] } = useBasicSuppliers();

  // Update URL when filters change
  const handleApplyFilters = (newFilters: MovementFilters) => {
    setFilters(newFilters);
    router.setParams(filtersToURLParams(newFilters));
  };

  // Remove a specific filter
  const handleRemoveFilter = (filterKey: keyof MovementFilters) => {
    const newFilters = { ...filters };
    if (filterKey === 'type') {
      newFilters.type = 'all';
    } else {
      newFilters[filterKey] = undefined;
    }
    setFilters(newFilters);
    router.setParams(filtersToURLParams(newFilters));
  };

  // Generate filter chips
  const getFilterChips = () => {
    const chips: Array<{ key: keyof MovementFilters; label: string }> = [];

    if (filters.type !== 'all') {
      const typeLabel =
        filters.type === 'stock_in'
          ? t('stockMovement.stockIn')
          : t('stockMovement.stockOut');
      chips.push({ key: 'type', label: typeLabel });
    }

    if (filters.productId) {
      const product = products.find((p) => p.id === filters.productId);
      if (product) {
        chips.push({ key: 'productId', label: product.name });
      }
    }

    if (filters.supplierId) {
      const supplier = suppliers.find((s) => s.id === filters.supplierId);
      if (supplier) {
        chips.push({ key: 'supplierId', label: supplier.name });
      }
    }

    if (filters.startDate && filters.endDate) {
      const start = filters.startDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const end = filters.endDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      chips.push({ key: 'startDate', label: `${start} - ${end}` });
    }

    return chips;
  };

  const filterChips = getFilterChips();
  const hasActiveFilters = filterChips.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with menu button */}
      <View style={styles.header}>
        <MenuButton onPress={openDrawer} />
        <Text style={styles.title} weight="bold">
          {t('stockMovement.history')}
        </Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterSheet(true)}
        >
          <Filter size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>
      <View>
        {/* Filter Chips Row - only visible when filters are active */}
        {hasActiveFilters && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterChipsContainer}
            contentContainerStyle={styles.filterChipsContent}
          >
            {filterChips.map((chip) => (
              <FilterChip
                key={chip.key}
                label={chip.label}
                onRemove={() => handleRemoveFilter(chip.key)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Reuse existing EnhancedMovementHistory component with summary */}
      <View style={styles.content}>
        <EnhancedMovementHistory
          showProductName={true}
          showFilters={false}
          headerComponent={<MovementSummary />}
          externalFilters={filters}
        />
      </View>

      {/* Filter Sheet */}
      <MovementFilterSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        currentFilters={filters}
        onApplyFilters={handleApplyFilters}
        products={products}
        suppliers={suppliers}
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
  filterButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterChipsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
});
