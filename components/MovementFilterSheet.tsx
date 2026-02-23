import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { X, Calendar, ChevronRight } from 'lucide-react-native';
import { SearchablePickerModal } from '@/components/SearchablePickerModal';
import { DateRangePicker } from '@/components/DateRangePicker';
import { useTranslation } from '@/context/LocalizationContext';

export interface MovementFilters {
  type: 'all' | 'stock_in' | 'stock_out';
  productId?: string;
  supplierId?: string;
  startDate?: Date;
  endDate?: Date;
}

interface Product {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface MovementFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  currentFilters: MovementFilters;
  onApplyFilters: (filters: MovementFilters) => void;
  products: Product[];
  suppliers: Supplier[];
}

export const MovementFilterSheet: React.FC<MovementFilterSheetProps> = ({
  visible,
  onClose,
  currentFilters,
  onApplyFilters,
  products,
  suppliers,
}) => {
  const { t } = useTranslation();

  // Local filter state - only applied when user presses Apply
  const [localFilters, setLocalFilters] =
    useState<MovementFilters>(currentFilters);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showSupplierPicker, setShowSupplierPicker] = useState(false);

  // Reset local filters when modal opens
  useEffect(() => {
    if (visible) {
      setLocalFilters(currentFilters);
    }
  }, [visible, currentFilters]);

  const handleClearAll = () => {
    setLocalFilters({
      type: 'all',
      productId: undefined,
      supplierId: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleDateRangeApply = (startDate: Date, endDate: Date) => {
    setLocalFilters({
      ...localFilters,
      startDate,
      endDate,
    });
  };

  const formatDateRange = () => {
    if (!localFilters.startDate || !localFilters.endDate) {
      return t('stockMovement.selectDateRange');
    }
    const start = localFilters.startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const end = localFilters.endDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${start} - ${end}`;
  };

  const getSelectedProductName = () => {
    if (!localFilters.productId) return null;
    const product = products.find((p) => p.id === localFilters.productId);
    return product?.name;
  };

  const getSelectedSupplierName = () => {
    if (!localFilters.supplierId) return null;
    const supplier = suppliers.find((s) => s.id === localFilters.supplierId);
    return supplier?.name;
  };

  return (
    <>
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
              <Text style={styles.title} weight="medium">
                {t('stockMovement.filterTitle')}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* Product Picker Button */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel} weight="medium">
                  {t('products.product')}
                </Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowProductPicker(true)}
                >
                  <Text style={styles.pickerButtonText}>
                    {getSelectedProductName() || t('stockMovement.allProducts')}
                  </Text>
                  <ChevronRight size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Movement Type Section */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel} weight="medium">
                  {t('stockMovement.movementType')}
                </Text>
                <View style={styles.typeToggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.typeToggle,
                      localFilters.type === 'all' && styles.typeToggleActive,
                    ]}
                    onPress={() =>
                      setLocalFilters({ ...localFilters, type: 'all' })
                    }
                  >
                    <Text
                      style={[
                        styles.typeToggleText,
                        localFilters.type === 'all' &&
                          styles.typeToggleTextActive,
                      ]}
                      weight="medium"
                    >
                      {t('common.all')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeToggle,
                      localFilters.type === 'stock_in' &&
                        styles.typeToggleActive,
                    ]}
                    onPress={() =>
                      setLocalFilters({ ...localFilters, type: 'stock_in' })
                    }
                  >
                    <Text
                      style={[
                        styles.typeToggleText,
                        localFilters.type === 'stock_in' &&
                          styles.typeToggleTextActive,
                      ]}
                      weight="medium"
                    >
                      {t('stockMovement.stockIn')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeToggle,
                      localFilters.type === 'stock_out' &&
                        styles.typeToggleActive,
                    ]}
                    onPress={() =>
                      setLocalFilters({ ...localFilters, type: 'stock_out' })
                    }
                  >
                    <Text
                      style={[
                        styles.typeToggleText,
                        localFilters.type === 'stock_out' &&
                          styles.typeToggleTextActive,
                      ]}
                      weight="medium"
                    >
                      {t('stockMovement.stockOut')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Supplier Picker Button */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel} weight="medium">
                  {t('stockMovement.supplier')}
                </Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowSupplierPicker(true)}
                >
                  <Text style={styles.pickerButtonText}>
                    {getSelectedSupplierName() ||
                      t('stockMovement.allSuppliers')}
                  </Text>
                  <ChevronRight size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Date Range Section */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel} weight="medium">
                  {t('stockMovement.dateRange')}
                </Text>
                <TouchableOpacity
                  style={styles.dateRangeButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Calendar size={20} color="#6B7280" />
                  <Text style={styles.dateRangeButtonText}>
                    {formatDateRange()}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearAll}
              >
                <Text style={styles.clearButtonText} weight="medium">
                  {t('stockMovement.clearAll')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleApply}
              >
                <Text style={styles.applyButtonText} weight="medium">
                  {t('stockMovement.apply')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Range Picker Modal */}
      <DateRangePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onApply={handleDateRangeApply}
        initialStartDate={localFilters.startDate}
        initialEndDate={localFilters.endDate}
      />

      {/* Product Picker Modal */}
      <SearchablePickerModal
        visible={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        title={t('stockMovement.selectProduct')}
        items={products}
        selectedId={localFilters.productId}
        onSelect={(id) => setLocalFilters({ ...localFilters, productId: id })}
        placeholder={t('stockMovement.searchProducts')}
        allOptionLabel={t('stockMovement.allProducts')}
      />

      {/* Supplier Picker Modal */}
      <SearchablePickerModal
        visible={showSupplierPicker}
        onClose={() => setShowSupplierPicker(false)}
        title={t('stockMovement.selectSupplier')}
        items={suppliers}
        selectedId={localFilters.supplierId}
        onSelect={(id) => setLocalFilters({ ...localFilters, supplierId: id })}
        placeholder={t('stockMovement.searchSuppliers')}
        allOptionLabel={t('stockMovement.allSuppliers')}
      />
    </>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  typeToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeToggle: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  typeToggleActive: {
    borderColor: '#EC4899',
    backgroundColor: '#FDF2F8',
  },
  typeToggleText: {
    fontSize: 14,
    color: '#6B7280',
  },
  typeToggleTextActive: {
    color: '#EC4899',
  },
  dateRangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  dateRangeButtonText: {
    fontSize: 16,
    color: '#374151',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  clearButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    color: '#6B7280',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#EC4899',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
});
