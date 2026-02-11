import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  useStockMovements,
  useProducts,
  useBasicSuppliers,
} from '@/hooks/useQueries';
import { StockMovement } from '@/services/database';
import { MyanmarText as Text } from '../MyanmarText';
import { MyanmarTextInput as TextInput } from '../MyanmarTextInput';
import {
  TrendingUp,
  TrendingDown,
  Package,
  Calendar,
  User,
  FileText,
  Search,
  Filter,
  X,
  ChevronDown,
} from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import DateTimePicker from '@react-native-community/datetimepicker';

interface EnhancedMovementHistoryProps {
  productId?: string;
  showProductName?: boolean;
  compact?: boolean;
  showFilters?: boolean;
  headerComponent?: React.ReactComponentElement<any, any>;
}

interface MovementFilters {
  type?: 'stock_in' | 'stock_out' | 'all';
  productId?: string;
  supplierId?: string;
  startDate?: Date;
  endDate?: Date;
  searchQuery?: string;
}

export const EnhancedMovementHistory: React.FC<EnhancedMovementHistoryProps> =
  React.memo(
    ({
      productId,
      showProductName = false,
      compact = false,
      showFilters = true,
      headerComponent,
    }) => {
      const { t } = useTranslation();
      const [page, setPage] = useState(1);
      const [showFilterModal, setShowFilterModal] = useState(false);
      const [showDatePicker, setShowDatePicker] = useState<
        'start' | 'end' | null
      >(null);
      const pageSize = compact ? 10 : 20;

      const [filters, setFilters] = useState<MovementFilters>({
        type: 'all',
        productId: productId,
        searchQuery: '',
      });

      // Get products and suppliers for filter dropdowns
      const { data: products = [] } = useProducts();
      const { data: suppliers = [] } = useBasicSuppliers();

      // Prepare filters for the query
      const queryFilters = useMemo(() => {
        const result: any = {};

        if (filters.type && filters.type !== 'all') {
          result.type = filters.type;
        }
        if (filters.productId) {
          result.productId = filters.productId;
        }
        if (filters.supplierId) {
          result.supplierId = filters.supplierId;
        }
        if (filters.startDate) {
          result.startDate = filters.startDate;
        }
        if (filters.endDate) {
          result.endDate = filters.endDate;
        }

        return result;
      }, [filters]);

      const {
        data: movements = [],
        isLoading,
        isRefetching,
        refetch,
      } = useStockMovements(queryFilters, page, pageSize);

      // Filter movements by search query on the client side
      const filteredMovements = useMemo(() => {
        if (!filters.searchQuery) return movements;

        const query = filters.searchQuery.toLowerCase();
        return movements.filter(
          (movement) =>
            movement.product_name?.toLowerCase().includes(query) ||
            movement.reason?.toLowerCase().includes(query) ||
            movement.reference_number?.toLowerCase().includes(query) ||
            movement.supplier_name?.toLowerCase().includes(query),
        );
      }, [movements, filters.searchQuery]);

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

      // Memoize callback functions to prevent unnecessary re-renders
      const handleDateChange = useCallback(
        (event: any, selectedDate?: Date) => {
          setShowDatePicker(null);
          if (selectedDate && showDatePicker) {
            setFilters((prev) => ({
              ...prev,
              [showDatePicker === 'start' ? 'startDate' : 'endDate']:
                selectedDate,
            }));
          }
        },
        [showDatePicker],
      );

      const clearFilters = useCallback(() => {
        setFilters({
          type: 'all',
          productId: productId,
          searchQuery: '',
        });
      }, [productId]);

      const handleSearchChange = useCallback((text: string) => {
        setFilters((prev) => ({ ...prev, searchQuery: text }));
      }, []);

      const clearSearch = useCallback(() => {
        setFilters((prev) => ({ ...prev, searchQuery: '' }));
      }, []);

      const openFilterModal = useCallback(() => {
        setShowFilterModal(true);
      }, []);

      const closeFilterModal = useCallback(() => {
        setShowFilterModal(false);
      }, []);

      const getActiveFiltersCount = () => {
        let count = 0;
        if (filters.type && filters.type !== 'all') count++;
        if (filters.productId && !productId) count++; // Don't count if it's a fixed product filter
        if (filters.supplierId) count++;
        if (filters.startDate) count++;
        if (filters.endDate) count++;
        if (filters.searchQuery) count++;
        return count;
      };

      // Memoize the render function to prevent unnecessary re-renders
      const renderMovementItem = useCallback(
        ({ item }: { item: StockMovement }) => (
          <Card
            //@ts-ignore
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
              <Text style={styles.movementDate}>
                {formatDate(item.created_at)}
              </Text>
            </View>

            <View style={styles.movementContent}>
              {showProductName && item.product_name && (
                <View style={styles.movementRow}>
                  <Package size={16} color="#6B7280" />
                  <Text style={styles.movementProductName}>
                    {item.product_name}
                  </Text>
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
                  <Text style={styles.movementSupplier}>
                    {item.supplier_name}
                  </Text>
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
                  <Text style={styles.movementCost}>
                    {formatMMK(item.unit_cost)}
                  </Text>
                </View>
              )}
            </View>
          </Card>
        ),
        [compact, showProductName, t],
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

      const renderFilterModal = () => (
        <Modal
          visible={showFilterModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={closeFilterModal}
        >
          <View style={styles.filterModal}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>
                {t('common.filter')} {t('stockMovement.history')}
              </Text>
              <TouchableOpacity
                onPress={closeFilterModal}
                style={styles.filterCloseButton}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterContent}>
              {/* Search */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>
                  {t('common.search')}
                </Text>
                <View style={styles.searchContainer}>
                  <Search size={20} color="#6B7280" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={t('stockMovement.searchPlaceholder')}
                    value={filters.searchQuery}
                    onChangeText={handleSearchChange}
                  />
                  {filters.searchQuery && (
                    <TouchableOpacity onPress={clearSearch}>
                      <X size={20} color="#6B7280" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Movement Type */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>
                  {t('stockMovement.type')}
                </Text>
                <View style={styles.filterOptions}>
                  {[
                    { value: 'all', label: t('common.all') },
                    { value: 'stock_in', label: t('stockMovement.stockIn') },
                    { value: 'stock_out', label: t('stockMovement.stockOut') },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterOption,
                        filters.type === option.value &&
                          styles.filterOptionActive,
                      ]}
                      onPress={() =>
                        setFilters((prev) => ({
                          ...prev,
                          type: option.value as any,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          filters.type === option.value &&
                            styles.filterOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Product Filter (only if not already filtered by product) */}
              {!productId && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>
                    {t('common.product')}
                  </Text>
                  <TouchableOpacity style={styles.dropdownButton}>
                    <Text style={styles.dropdownButtonText}>
                      {filters.productId
                        ? products.find((p) => p.id === filters.productId)
                            ?.name || t('common.all')
                        : t('common.all')}
                    </Text>
                    <ChevronDown size={20} color="#6B7280" />
                  </TouchableOpacity>
                  {/* Product selection would go here - simplified for now */}
                </View>
              )}

              {/* Supplier Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>
                  {t('stockMovement.supplier')}
                </Text>
                <TouchableOpacity style={styles.dropdownButton}>
                  <Text style={styles.dropdownButtonText}>
                    {filters.supplierId
                      ? suppliers.find((s) => s.id === filters.supplierId)
                          ?.name || t('common.all')
                      : t('common.all')}
                  </Text>
                  <ChevronDown size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Date Range */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>
                  {t('common.dateRange')}
                </Text>
                <View style={styles.dateRangeContainer}>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker('start')}
                  >
                    <Calendar size={16} color="#6B7280" />
                    <Text style={styles.dateButtonText}>
                      {filters.startDate
                        ? filters.startDate.toLocaleDateString()
                        : t('common.startDate')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker('end')}
                  >
                    <Calendar size={16} color="#6B7280" />
                    <Text style={styles.dateButtonText}>
                      {filters.endDate
                        ? filters.endDate.toLocaleDateString()
                        : t('common.endDate')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.filterActions}>
              <Button
                title={t('common.clear')}
                onPress={clearFilters}
                variant="secondary"
                style={styles.filterActionButton}
              />
              <Button
                title={t('common.apply')}
                onPress={closeFilterModal}
                style={styles.filterActionButton}
              />
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={
                showDatePicker === 'start'
                  ? filters.startDate || new Date()
                  : filters.endDate || new Date()
              }
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
        </Modal>
      );

      if (isLoading && !isRefetching) {
        return <LoadingSpinner />;
      }

      return (
        <View style={styles.container}>
          {showFilters && (
            <View style={styles.filtersHeader}>
              <View style={styles.searchContainer}>
                <Search size={20} color="#6B7280" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('stockMovement.searchPlaceholder')}
                  value={filters.searchQuery}
                  onChangeText={handleSearchChange}
                />
                {filters.searchQuery && (
                  <TouchableOpacity onPress={clearSearch}>
                    <X size={20} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.filterButton}
                onPress={openFilterModal}
              >
                <Filter size={20} color="#6B7280" />
                {getActiveFiltersCount() > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>
                      {getActiveFiltersCount()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          <FlatList
            data={filteredMovements}
            keyExtractor={(item) => item.id}
            renderItem={renderMovementItem}
            ListEmptyComponent={renderEmptyState}
            // ListHeaderComponent={headerComponent}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              filteredMovements.length === 0 ? styles.emptyContainer : undefined
            }
          />

          {renderFilterModal()}
        </View>
      );
    },
  );

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filtersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  filterButton: {
    position: 'relative',
    padding: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  movementItem: {
    marginBottom: 12,
    padding: 16,
  },
  movementItemCompact: {
    marginBottom: 8,
    padding: 12,
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
    gap: 8,
  },
  movementTypeText: {
    fontSize: 16,
  },
  movementDate: {
    fontSize: 14,
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
    color: '#6B7280',
  },
  movementQuantity: {
    fontSize: 16,
  },
  movementProductName: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  movementReason: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  movementSupplier: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  movementReference: {
    fontSize: 14,
    color: '#111827',
  },
  movementCost: {
    fontSize: 14,
    color: '#059669',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
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

  // Filter Modal Styles
  filterModal: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterTitle: {
    fontSize: 20,
    color: '#111827',
  },
  filterCloseButton: {
    padding: 4,
  },
  filterContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginVertical: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  filterOptionActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  dateRangeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  dateButtonText: {
    fontSize: 14,
    color: '#111827',
  },
  filterActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  filterActionButton: {
    flex: 1,
  },
});
