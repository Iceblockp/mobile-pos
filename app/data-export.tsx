import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Download,
  FileText,
  Package,
  DollarSign,
  Database,
  Share,
  CheckCircle,
} from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import { useToast } from '@/context/ToastContext';
import { useDatabase } from '@/context/DatabaseContext';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

interface ExportOption {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  backgroundColor: string;
  dataType: 'sales' | 'products' | 'expenses' | 'all';
}

export default function DataExport() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { db } = useDatabase();
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const exportOptions: ExportOption[] = [
    {
      id: 'sales',
      title: t('dataExport.salesData'),
      description: t('dataExport.salesDataDesc'),
      icon: DollarSign,
      color: '#10B981',
      backgroundColor: '#ECFDF5',
      dataType: 'sales',
    },
    {
      id: 'products',
      title: t('dataExport.productsInventory'),
      description: t('dataExport.productsInventoryDesc'),
      icon: Package,
      color: '#3B82F6',
      backgroundColor: '#EFF6FF',
      dataType: 'products',
    },
    {
      id: 'expenses',
      title: t('dataExport.expensesData'),
      description: t('dataExport.expensesDataDesc'),
      icon: FileText,
      color: '#EF4444',
      backgroundColor: '#FEF2F2',
      dataType: 'expenses',
    },
    {
      id: 'complete',
      title: t('dataExport.completeBackup'),
      description: t('dataExport.completeBackupDesc'),
      icon: Database,
      color: '#8B5CF6',
      backgroundColor: '#F5F3FF',
      dataType: 'all',
    },
  ];

  // Helper function to get all sales with items
  const getAllSalesWithItems = async () => {
    if (!db) throw new Error('Database not available');

    // Get sales from a very early date to get all records
    const startDate = new Date('2020-01-01');
    const endDate = new Date();
    const sales = await db.getSalesByDateRange(startDate, endDate, 10000); // Large limit to get all

    // Get sale items for each sale
    const salesWithItems = await Promise.all(
      sales.map(async (sale) => {
        if (!db) throw new Error('Database not available');
        const items = await db.getSaleItems(sale.id);
        return {
          ...sale,
          items,
        };
      })
    );

    return salesWithItems;
  };

  // Helper function to get all expenses
  const getAllExpenses = async () => {
    if (!db) throw new Error('Database not available');

    // Get expenses from a very early date to get all records
    const startDate = new Date('2020-01-01');
    const endDate = new Date();
    return await db.getExpensesByDateRange(startDate, endDate, 10000); // Large limit to get all
  };

  const handleExport = async (option: ExportOption) => {
    if (!db) {
      showToast('Database not ready', 'error');
      return;
    }

    setIsExporting(option.id);

    try {
      let data: any = {};
      let filename = '';
      const timestamp = new Date().toISOString().split('T')[0];

      switch (option.dataType) {
        case 'sales':
          // Fetch all sales data with items
          const salesWithItems = await getAllSalesWithItems();

          data = {
            sales: salesWithItems,
            exportDate: new Date().toISOString(),
            totalRecords: salesWithItems.length,
            totalRevenue: salesWithItems.reduce(
              (sum, sale) => sum + sale.total,
              0
            ),
            message: 'Sales data export with transaction details',
          };
          filename = `sales_export_${timestamp}.json`;
          break;

        case 'products':
          // Fetch products, categories, and suppliers
          const products = await db.getProducts();
          const categories = await db.getCategories();
          const suppliers = await db.getSuppliers();

          data = {
            products,
            categories,
            suppliers,
            exportDate: new Date().toISOString(),
            totalProducts: products.length,
            totalCategories: categories.length,
            totalSuppliers: suppliers.length,
            message: 'Complete products and inventory data export',
          };
          filename = `products_export_${timestamp}.json`;
          break;

        case 'expenses':
          // Fetch expenses and expense categories
          const expenses = await getAllExpenses();
          const expenseCategories = await db.getExpenseCategories();

          data = {
            expenses,
            expenseCategories,
            exportDate: new Date().toISOString(),
            totalExpenses: expenses.length,
            totalCategories: expenseCategories.length,
            totalAmount: expenses.reduce((sum, exp) => sum + exp.amount, 0),
            message: 'Complete expenses data export',
          };
          filename = `expenses_export_${timestamp}.json`;
          break;

        case 'all':
          // Fetch all data for complete backup
          const allSalesWithItems = await getAllSalesWithItems();
          const allProducts = await db.getProducts();
          const allCategories = await db.getCategories();
          const allSuppliers = await db.getSuppliers();
          const allExpenses = await getAllExpenses();
          const allExpenseCategories = await db.getExpenseCategories();

          data = {
            sales: allSalesWithItems,
            products: allProducts,
            categories: allCategories,
            suppliers: allSuppliers,
            expenses: allExpenses,
            expenseCategories: allExpenseCategories,
            exportDate: new Date().toISOString(),
            summary: {
              totalSales: allSalesWithItems.length,
              totalProducts: allProducts.length,
              totalCategories: allCategories.length,
              totalSuppliers: allSuppliers.length,
              totalExpenses: allExpenses.length,
              totalExpenseCategories: allExpenseCategories.length,
              totalRevenue: allSalesWithItems.reduce(
                (sum, sale) => sum + sale.total,
                0
              ),
              totalExpenseAmount: allExpenses.reduce(
                (sum, exp) => sum + exp.amount,
                0
              ),
            },
            message: 'Complete Mobile POS data backup',
          };
          filename = `complete_backup_${timestamp}.json`;
          break;
      }

      // Create the file
      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify(data, null, 2)
      );

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: `Export ${option.title}`,
        });
        showToast(
          `${option.title} ${t('dataExport.exportSuccess')}`,
          'success'
        );
      } else {
        showToast(t('dataExport.sharingNotAvailable'), 'error');
      }
    } catch (error) {
      console.error('Export error:', error);
      showToast(`${t('dataExport.exportFailed')} ${option.title}`, 'error');
    } finally {
      setIsExporting(null);
    }
  };

  const showExportInfo = () => {
    Alert.alert(
      t('dataExport.exportInfoTitle'),
      t('dataExport.exportInfoDesc'),
      [{ text: t('dataExport.gotIt'), style: 'default' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{t('dataExport.title')}</Text>
          <Text style={styles.subtitle}>{t('dataExport.subtitle')}</Text>
        </View>
        <TouchableOpacity style={styles.infoButton} onPress={showExportInfo}>
          <Text style={styles.infoButtonText}>?</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Export Options */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Download size={20} color="#6B7280" />
            <Text style={styles.sectionTitle}>
              {t('dataExport.exportOptions')}
            </Text>
          </View>
          <Text style={styles.sectionDescription}>
            {t('dataExport.chooseData')}
          </Text>
        </View>

        <View style={styles.exportList}>
          {exportOptions.map((option) => {
            const IconComponent = option.icon;
            const isCurrentlyExporting = isExporting === option.id;

            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.exportOption,
                  isCurrentlyExporting && styles.exportOptionDisabled,
                ]}
                onPress={() => handleExport(option)}
                disabled={isCurrentlyExporting || isExporting !== null}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: option.backgroundColor },
                  ]}
                >
                  <IconComponent size={24} color={option.color} />
                </View>
                <View style={styles.exportContent}>
                  <Text style={styles.exportTitle}>{option.title}</Text>
                  <Text style={styles.exportDescription}>
                    {option.description}
                  </Text>
                </View>
                <View style={styles.exportAction}>
                  {isCurrentlyExporting ? (
                    <View style={styles.loadingContainer}>
                      <Text style={styles.loadingText}>
                        {t('dataExport.exporting')}
                      </Text>
                    </View>
                  ) : (
                    <Share size={20} color="#9CA3AF" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Export Information */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>{t('dataExport.exportInfo')}</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoItem}>
              <CheckCircle size={16} color="#10B981" />
              <Text style={styles.infoText}>{t('dataExport.jsonFormat')}</Text>
            </View>
            <View style={styles.infoItem}>
              <CheckCircle size={16} color="#10B981" />
              <Text style={styles.infoText}>{t('dataExport.timestamped')}</Text>
            </View>
            <View style={styles.infoItem}>
              <CheckCircle size={16} color="#10B981" />
              <Text style={styles.infoText}>
                {t('dataExport.completeBackups')}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <CheckCircle size={16} color="#10B981" />
              <Text style={styles.infoText}>{t('dataExport.canReimport')}</Text>
            </View>
          </View>
        </View>

        {/* Data Security Notice */}
        <View style={styles.securitySection}>
          <Text style={styles.securityTitle}>
            {t('dataExport.dataSecurity')}
          </Text>
          <View style={styles.securityCard}>
            <Text style={styles.securityText}>
              {t('dataExport.securityWarning')}
            </Text>
            <Text style={styles.securityBullet}>
              {t('dataExport.storeSecure')}
            </Text>
            <Text style={styles.securityBullet}>
              {t('dataExport.useEncryption')}
            </Text>
            <Text style={styles.securityBullet}>
              {t('dataExport.avoidUnsecured')}
            </Text>
            <Text style={styles.securityBullet}>
              {t('dataExport.deleteOld')}
            </Text>
          </View>
        </View>
      </ScrollView>
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
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  infoButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    paddingBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
  exportList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  exportOptionDisabled: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  exportContent: {
    flex: 1,
  },
  exportTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  exportDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 18,
  },
  exportAction: {
    marginLeft: 12,
  },
  loadingContainer: {
    paddingHorizontal: 8,
  },
  loadingText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },
  securitySection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  securityTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  securityCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  securityText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#7F1D1D',
    lineHeight: 20,
    marginBottom: 12,
  },
  securityBullet: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#7F1D1D',
    lineHeight: 20,
    marginBottom: 4,
  },
});
