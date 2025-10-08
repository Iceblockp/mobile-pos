import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  X,
  Database,
  Download,
  Calendar,
  HardDrive,
  Package,
  ShoppingCart,
  Users,
  Receipt,
  TrendingUp,
  DollarSign,
  Settings,
  Layers,
  BarChart3,
} from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import { ExportPreview } from '@/services/dataExportService';

interface ExportPreviewModalProps {
  visible: boolean;
  preview: ExportPreview | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ExportPreviewModal: React.FC<ExportPreviewModalProps> = ({
  visible,
  preview,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const { t } = useTranslation();

  // Data type configurations with icons and colors
  const dataTypeConfigs = {
    products: {
      icon: Package,
      color: '#3B82F6',
      backgroundColor: '#EFF6FF',
      label: t('navigation.products'),
    },
    sales: {
      icon: ShoppingCart,
      color: '#10B981',
      backgroundColor: '#ECFDF5',
      label: t('navigation.sales'),
    },
    customers: {
      icon: Users,
      color: '#8B5CF6',
      backgroundColor: '#F5F3FF',
      label: 'Customers',
    },
    expenses: {
      icon: Receipt,
      color: '#EF4444',
      backgroundColor: '#FEF2F2',
      label: t('navigation.expenses'),
    },
    stockMovements: {
      icon: TrendingUp,
      color: '#F59E0B',
      backgroundColor: '#FFFBEB',
      label: 'Stock Movements',
    },
    bulkPricing: {
      icon: DollarSign,
      color: '#06B6D4',
      backgroundColor: '#ECFEFF',
      label: 'Bulk Pricing',
    },
    categories: {
      icon: Layers,
      color: '#84CC16',
      backgroundColor: '#F7FEE7',
      label: 'Categories',
    },
    suppliers: {
      icon: BarChart3,
      color: '#F97316',
      backgroundColor: '#FFF7ED',
      label: 'Suppliers',
    },
    saleItems: {
      icon: Receipt,
      color: '#6366F1',
      backgroundColor: '#EEF2FF',
      label: 'Sale Items',
    },
    expenseCategories: {
      icon: Settings,
      color: '#64748B',
      backgroundColor: '#F8FAFC',
      label: 'Expense Categories',
    },
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return dateString;
    }
  };

  const renderDataTypeItem = (
    dataType: keyof typeof dataTypeConfigs,
    count: number
  ) => {
    const config = dataTypeConfigs[dataType];
    if (!config) return null;

    const IconComponent = config.icon;

    return (
      <View key={dataType} style={styles.dataTypeItem}>
        <View
          style={[
            styles.dataTypeIcon,
            { backgroundColor: config.backgroundColor },
          ]}
        >
          <IconComponent size={20} color={config.color} />
        </View>
        <View style={styles.dataTypeContent}>
          <Text style={styles.dataTypeLabel}>{config.label}</Text>
          <Text style={styles.dataTypeCount}>
            {count.toLocaleString()} {count === 1 ? 'record' : 'records'}
          </Text>
        </View>
      </View>
    );
  };

  if (!preview && !isLoading) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Database size={24} color="#3B82F6" />
              <Text style={styles.title}>Export Preview</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            // Loading state
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>
                Preparing export preview...
              </Text>
            </View>
          ) : preview ? (
            <>
              {/* Export Summary */}
              <View style={styles.summaryContainer}>
                <View style={styles.summaryItem}>
                  <Database size={20} color="#6B7280" />
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryLabel}>Total Records</Text>
                    <Text style={styles.summaryValue}>
                      {preview.totalRecords.toLocaleString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.summaryItem}>
                  <HardDrive size={20} color="#6B7280" />
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryLabel}>Estimated Size</Text>
                    <Text style={styles.summaryValue}>
                      {preview.estimatedFileSize}
                    </Text>
                  </View>
                </View>

                <View style={styles.summaryItem}>
                  <Calendar size={20} color="#6B7280" />
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryLabel}>Export Date</Text>
                    <Text style={styles.summaryValue}>
                      {formatDate(preview.exportDate)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Data Types List */}
              <View style={styles.dataTypesContainer}>
                <Text style={styles.dataTypesTitle}>Data to be exported:</Text>
                <ScrollView
                  style={styles.dataTypesList}
                  showsVerticalScrollIndicator={false}
                >
                  {Object.entries(preview.dataCounts).map(([dataType, count]) =>
                    renderDataTypeItem(
                      dataType as keyof typeof dataTypeConfigs,
                      count
                    )
                  )}
                </ScrollView>
              </View>

              {/* Empty Export Warning */}
              {preview.totalRecords === 0 && (
                <View style={styles.warningContainer}>
                  <Text style={styles.warningTitle}>⚠️ Empty Export</Text>
                  <Text style={styles.warningText}>
                    No data was found to export. An empty export file will be
                    created for consistency, but it will contain no business
                    data.
                  </Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onCancel}
                >
                  <Text style={styles.cancelButtonText}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={onConfirm}
                >
                  <Download size={20} color="#FFFFFF" />
                  <Text style={styles.confirmButtonText}>
                    {preview.totalRecords === 0
                      ? 'Create Empty Export'
                      : 'Start Export'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 20,
    maxWidth: '95%',
    maxHeight: '85%',
    width: 400,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  summaryContainer: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryContent: {
    marginLeft: 12,
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  dataTypesContainer: {
    padding: 20,
    paddingBottom: 16,
    flex: 1,
  },
  dataTypesTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  dataTypesList: {
    maxHeight: 200,
  },
  dataTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  dataTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dataTypeContent: {
    marginLeft: 12,
    flex: 1,
  },
  dataTypeLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  dataTypeCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  warningContainer: {
    margin: 20,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  warningTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#7F1D1D',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#7F1D1D',
    lineHeight: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});

export default ExportPreviewModal;
