import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { X, Calendar } from 'lucide-react-native';
import { DateRangePicker } from '@/components/DateRangePicker';

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
  // Local filter state - only applied when user presses Apply
  const [localFilters, setLocalFilters] =
    useState<MovementFilters>(currentFilters);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Reset local filters when modal opens
  useEffect(() => {
    if (visible) {
      setLocalFilters(currentFilters);
      setProductSearchQuery('');
    }
  }, [visible, currentFilters]);

  // Filter products based on search query
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(productSearchQuery.toLowerCase()),
  );

  const handleClearAll = () => {
    setLocalFilters({
      type: 'all',
      productId: undefined,
      supplierId: undefined,
      startDate: undefined,
      endDate: undefined,
    });
    setProductSearchQuery('');
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
      return 'Select Date Range';
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
                Filter Movement History
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* Product Search Section */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel} weight="medium">
                  Product
                </Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search products..."
                  value={productSearchQuery}
                  onChangeText={setProductSearchQuery}
                  placeholderTextColor="#9CA3AF"
                />
                <ScrollView style={styles.productList} nestedScrollEnabled>
                  <TouchableOpacity
                    style={[
                      styles.productItem,
                      !localFilters.productId && styles.productItemSelected,
                    ]}
                    onPress={() =>
                      setLocalFilters({ ...localFilters, productId: undefined })
                    }
                  >
                    <Text
                      style={[
                        styles.productItemText,
                        !localFilters.productId &&
                          styles.productItemTextSelected,
                      ]}
                    >
                      All Products
                    </Text>
                  </TouchableOpacity>
                  {filteredProducts.map((product) => (
                    <TouchableOpacity
                      key={product.id}
                      style={[
                        styles.productItem,
                        localFilters.productId === product.id &&
                          styles.productItemSelected,
                      ]}
                      onPress={() =>
                        setLocalFilters({
                          ...localFilters,
                          productId: product.id,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.productItemText,
                          localFilters.productId === product.id &&
                            styles.productItemTextSelected,
                        ]}
                      >
                        {product.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Movement Type Section */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel} weight="medium">
                  Movement Type
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
                      All
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
                      Stock In
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
                      Stock Out
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Supplier Section */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel} weight="medium">
                  Supplier
                </Text>
                <ScrollView style={styles.supplierList} nestedScrollEnabled>
                  <TouchableOpacity
                    style={[
                      styles.supplierItem,
                      !localFilters.supplierId && styles.supplierItemSelected,
                    ]}
                    onPress={() =>
                      setLocalFilters({
                        ...localFilters,
                        supplierId: undefined,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.supplierItemText,
                        !localFilters.supplierId &&
                          styles.supplierItemTextSelected,
                      ]}
                    >
                      All Suppliers
                    </Text>
                  </TouchableOpacity>
                  {suppliers.map((supplier) => (
                    <TouchableOpacity
                      key={supplier.id}
                      style={[
                        styles.supplierItem,
                        localFilters.supplierId === supplier.id &&
                          styles.supplierItemSelected,
                      ]}
                      onPress={() =>
                        setLocalFilters({
                          ...localFilters,
                          supplierId: supplier.id,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.supplierItemText,
                          localFilters.supplierId === supplier.id &&
                            styles.supplierItemTextSelected,
                        ]}
                      >
                        {supplier.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Date Range Section */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel} weight="medium">
                  Date Range
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
                  Clear All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleApply}
              >
                <Text style={styles.applyButtonText} weight="medium">
                  Apply
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
  searchInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
  },
  productList: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  productItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  productItemSelected: {
    backgroundColor: '#FDF2F8',
  },
  productItemText: {
    fontSize: 14,
    color: '#374151',
  },
  productItemTextSelected: {
    color: '#EC4899',
    fontWeight: '600',
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
  supplierList: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  supplierItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  supplierItemSelected: {
    backgroundColor: '#FDF2F8',
  },
  supplierItemText: {
    fontSize: 14,
    color: '#374151',
  },
  supplierItemTextSelected: {
    color: '#EC4899',
    fontWeight: '600',
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
