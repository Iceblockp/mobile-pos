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
  Upload,
  FileText,
  Package,
  DollarSign,
  Database,
  CheckCircle,
  Store,
  Users,
  TrendingUp,
  Tag,
  AlertTriangle,
} from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import { useToast } from '@/context/ToastContext';
import { useDatabase } from '@/context/DatabaseContext';
import { useShopSettings } from '@/context/ShopSettingsContext';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

interface ImportOption {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  backgroundColor: string;
  dataType:
    | 'sales'
    | 'products'
    | 'expenses'
    | 'shopSettings'
    | 'customers'
    | 'stockMovements'
    | 'bulkPricing'
    | 'all';
}

interface ImportProgress {
  isImporting: boolean;
  current: number;
  total: number;
  stage: string;
}

export default function DataImport() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { db } = useDatabase();
  const { shopSettingsService } = useShopSettings();
  const [isImporting, setIsImporting] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    isImporting: false,
    current: 0,
    total: 0,
    stage: '',
  });

  const importOptions: ImportOption[] = [
    {
      id: 'customers',
      title: t('dataImport.customersData'),
      description: t('dataImport.customersDataDesc'),
      icon: Users,
      color: '#F59E0B',
      backgroundColor: '#FFFBEB',
      dataType: 'customers',
    },
    {
      id: 'bulkPricing',
      title: t('dataImport.bulkPricing'),
      description: t('dataImport.bulkPricingDesc'),
      icon: Tag,
      color: '#8B5CF6',
      backgroundColor: '#F5F3FF',
      dataType: 'bulkPricing',
    },
    {
      id: 'stockMovements',
      title: t('dataImport.stockMovements'),
      description: t('dataImport.stockMovementsDesc'),
      icon: TrendingUp,
      color: '#06B6D4',
      backgroundColor: '#ECFEFF',
      dataType: 'stockMovements',
    },
    {
      id: 'complete',
      title: t('dataImport.completeRestore'),
      description: t('dataImport.completeRestoreDesc'),
      icon: Database,
      color: '#8B5CF6',
      backgroundColor: '#F5F3FF',
      dataType: 'all',
    },
  ];

  const handleImport = async (option: ImportOption) => {
    if (!db) {
      showToast('Database not ready', 'error');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const fileContent = await FileSystem.readAsStringAsync(
        result.assets[0].uri
      );
      const importData = JSON.parse(fileContent);

      // Validate import data structure based on type
      if (!validateImportData(importData, option.dataType)) {
        showToast(t('dataImport.invalidFormat'), 'error');
        return;
      }

      // Show confirmation dialog
      const itemCount = getImportItemCount(importData, option.dataType);
      Alert.alert(
        t('dataImport.confirmImport'),
        `${t('dataImport.aboutToImport')} ${itemCount} ${t(
          'dataImport.items'
        )}. ${t('dataImport.existingDataWarning')}`,
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('dataImport.import'),
            onPress: async () => {
              await performImport(importData, option);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Import error:', error);
      showToast(t('dataImport.importFailed'), 'error');
    }
  };

  const validateImportData = (data: any, dataType: string): boolean => {
    switch (dataType) {
      case 'customers':
        return data.customers && Array.isArray(data.customers);
      case 'bulkPricing':
        return data.bulkPricing && Array.isArray(data.bulkPricing);
      case 'stockMovements':
        return data.stockMovements && Array.isArray(data.stockMovements);
      case 'all':
        return (
          data.customers ||
          data.bulkPricing ||
          data.stockMovements ||
          data.sales ||
          data.products
        );
      default:
        return false;
    }
  };

  const getImportItemCount = (data: any, dataType: string): number => {
    switch (dataType) {
      case 'customers':
        return data.customers?.length || 0;
      case 'bulkPricing':
        return (
          data.bulkPricing?.reduce(
            (sum: number, item: any) => sum + (item.bulkTiers?.length || 0),
            0
          ) || 0
        );
      case 'stockMovements':
        return data.stockMovements?.length || 0;
      case 'all':
        return (
          (data.customers?.length || 0) +
          (data.stockMovements?.length || 0) +
          (data.bulkPricing?.reduce(
            (sum: number, item: any) => sum + (item.bulkTiers?.length || 0),
            0
          ) || 0) +
          (data.sales?.length || 0) +
          (data.products?.length || 0)
        );
      default:
        return 0;
    }
  };

  const performImport = async (importData: any, option: ImportOption) => {
    setIsImporting(option.id);

    try {
      const totalItems = getImportItemCount(importData, option.dataType);
      setImportProgress({
        isImporting: true,
        current: 0,
        total: totalItems,
        stage: t('dataImport.preparingImport'),
      });

      let importedCount = 0;
      let skippedCount = 0;

      switch (option.dataType) {
        case 'customers':
          const customerResults = await importCustomers(importData.customers);
          importedCount += customerResults.imported;
          skippedCount += customerResults.skipped;
          break;

        case 'bulkPricing':
          const bulkResults = await importBulkPricing(importData.bulkPricing);
          importedCount += bulkResults.imported;
          skippedCount += bulkResults.skipped;
          break;

        case 'stockMovements':
          const movementResults = await importStockMovements(
            importData.stockMovements
          );
          importedCount += movementResults.imported;
          skippedCount += movementResults.skipped;
          break;

        case 'all':
          // Import in order: customers, bulk pricing, stock movements
          if (importData.customers) {
            setImportProgress((prev) => ({
              ...prev,
              stage: t('dataImport.importingCustomers'),
            }));
            const customerResults = await importCustomers(importData.customers);
            importedCount += customerResults.imported;
            skippedCount += customerResults.skipped;
          }

          if (importData.bulkPricing) {
            setImportProgress((prev) => ({
              ...prev,
              stage: t('dataImport.importingBulkPricing'),
            }));
            const bulkResults = await importBulkPricing(importData.bulkPricing);
            importedCount += bulkResults.imported;
            skippedCount += bulkResults.skipped;
          }

          if (importData.stockMovements) {
            setImportProgress((prev) => ({
              ...prev,
              stage: t('dataImport.importingStockMovements'),
            }));
            const movementResults = await importStockMovements(
              importData.stockMovements
            );
            importedCount += movementResults.imported;
            skippedCount += movementResults.skipped;
          }
          break;
      }

      setImportProgress({
        isImporting: false,
        current: 0,
        total: 0,
        stage: '',
      });

      showToast(
        `${t('dataImport.importComplete')} ${importedCount} ${t(
          'dataImport.imported'
        )}, ${skippedCount} ${t('dataImport.skipped')}`,
        'success'
      );
    } catch (error) {
      console.error('Import error:', error);
      showToast(t('dataImport.importFailed'), 'error');
    } finally {
      setIsImporting(null);
      setImportProgress({
        isImporting: false,
        current: 0,
        total: 0,
        stage: '',
      });
    }
  };

  const importCustomers = async (
    customers: any[]
  ): Promise<{ imported: number; skipped: number }> => {
    if (!db) throw new Error('Database not available');

    let imported = 0;
    let skipped = 0;
    const BATCH_SIZE = 10;

    for (let i = 0; i < customers.length; i += BATCH_SIZE) {
      const batch = customers.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (customer: any) => {
        try {
          // Check if customer already exists by name or phone
          const existingCustomers = await db.getCustomers();
          const existingCustomer = existingCustomers.find(
            (c) =>
              c.name === customer.name ||
              (customer.phone && c.phone === customer.phone)
          );

          if (existingCustomer) {
            // Update existing customer
            await db.updateCustomer(existingCustomer.id, {
              name: customer.name,
              phone: customer.phone || '',
              email: customer.email || '',
              address: customer.address || '',
            });
          } else {
            // Add new customer
            await db.addCustomer({
              name: customer.name,
              phone: customer.phone || '',
              email: customer.email || '',
              address: customer.address || '',
            });
          }
          return { success: true };
        } catch (error) {
          console.error('Customer import error:', error);
          return { success: false };
        }
      });

      const results = await Promise.all(batchPromises);
      imported += results.filter((r) => r.success).length;
      skipped += results.filter((r) => !r.success).length;

      setImportProgress((prev) => ({
        ...prev,
        current: Math.min(i + BATCH_SIZE, customers.length),
      }));
    }

    return { imported, skipped };
  };

  const importBulkPricing = async (
    bulkPricingData: any[]
  ): Promise<{ imported: number; skipped: number }> => {
    if (!db) throw new Error('Database not available');

    let imported = 0;
    let skipped = 0;

    // Get all products to match by name
    const products = await db.getProducts();

    for (const item of bulkPricingData) {
      try {
        const product = products.find((p) => p.name === item.productName);
        if (!product) {
          skipped += item.bulkTiers?.length || 0;
          continue;
        }

        // Clear existing bulk pricing for this product
        const existingTiers = await db.getBulkPricingForProduct(product.id);
        for (const tier of existingTiers) {
          await db.deleteBulkPricing(tier.id);
        }

        // Add new bulk pricing tiers
        for (const tier of item.bulkTiers || []) {
          try {
            await db.addBulkPricing({
              product_id: product.id,
              min_quantity: tier.min_quantity,
              bulk_price: tier.bulk_price,
            });
            imported++;
          } catch (error) {
            console.error('Bulk pricing tier import error:', error);
            skipped++;
          }
        }
      } catch (error) {
        console.error('Bulk pricing import error:', error);
        skipped += item.bulkTiers?.length || 0;
      }
    }

    return { imported, skipped };
  };

  const importStockMovements = async (
    movements: any[]
  ): Promise<{ imported: number; skipped: number }> => {
    if (!db) throw new Error('Database not available');

    let imported = 0;
    let skipped = 0;
    const BATCH_SIZE = 20;

    // Get all products to match by name
    const products = await db.getProducts();

    for (let i = 0; i < movements.length; i += BATCH_SIZE) {
      const batch = movements.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (movement: any) => {
        try {
          const product = products.find(
            (p) => p.name === movement.product_name
          );
          if (!product) {
            return { success: false };
          }

          await db.addStockMovement({
            product_id: product.id,
            type: movement.type,
            quantity: movement.quantity,
            reason: movement.reason || '',
            supplier_id: movement.supplier_id || null,
            reference_number: movement.reference_number || '',
            unit_cost: movement.unit_cost || null,
            created_at: movement.created_at || new Date().toISOString(),
          });

          return { success: true };
        } catch (error) {
          console.error('Stock movement import error:', error);
          return { success: false };
        }
      });

      const results = await Promise.all(batchPromises);
      imported += results.filter((r) => r.success).length;
      skipped += results.filter((r) => !r.success).length;

      setImportProgress((prev) => ({
        ...prev,
        current: Math.min(i + BATCH_SIZE, movements.length),
      }));
    }

    return { imported, skipped };
  };

  const showImportInfo = () => {
    Alert.alert(
      t('dataImport.importInfoTitle'),
      t('dataImport.importInfoDesc'),
      [{ text: t('dataImport.gotIt'), style: 'default' }]
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
          <Text style={styles.title}>{t('dataImport.title')}</Text>
          <Text style={styles.subtitle}>{t('dataImport.subtitle')}</Text>
        </View>
        <TouchableOpacity style={styles.infoButton} onPress={showImportInfo}>
          <Text style={styles.infoButtonText}>?</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Import Progress */}
        {importProgress.isImporting && (
          <View style={styles.progressSection}>
            <View style={styles.progressCard}>
              <Text style={styles.progressTitle}>{importProgress.stage}</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${
                        (importProgress.current / importProgress.total) * 100
                      }%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {importProgress.current} / {importProgress.total}{' '}
                {t('dataImport.items')}
              </Text>
            </View>
          </View>
        )}

        {/* Import Options */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Upload size={20} color="#6B7280" />
            <Text style={styles.sectionTitle}>
              {t('dataImport.importOptions')}
            </Text>
          </View>
          <Text style={styles.sectionDescription}>
            {t('dataImport.chooseData')}
          </Text>
        </View>

        <View style={styles.importList}>
          {importOptions.map((option) => {
            const IconComponent = option.icon;
            const isCurrentlyImporting = isImporting === option.id;

            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.importOption,
                  isCurrentlyImporting && styles.importOptionDisabled,
                ]}
                onPress={() => handleImport(option)}
                disabled={isCurrentlyImporting || isImporting !== null}
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
                <View style={styles.importContent}>
                  <Text style={styles.importTitle}>{option.title}</Text>
                  <Text style={styles.importDescription}>
                    {option.description}
                  </Text>
                </View>
                <View style={styles.importAction}>
                  {isCurrentlyImporting ? (
                    <View style={styles.loadingContainer}>
                      <Text style={styles.loadingText}>
                        {t('dataImport.importing')}
                      </Text>
                    </View>
                  ) : (
                    <Upload size={20} color="#9CA3AF" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Import Information */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>{t('dataImport.importInfo')}</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoItem}>
              <CheckCircle size={16} color="#10B981" />
              <Text style={styles.infoText}>{t('dataImport.jsonFormat')}</Text>
            </View>
            <View style={styles.infoItem}>
              <CheckCircle size={16} color="#10B981" />
              <Text style={styles.infoText}>
                {t('dataImport.validationChecks')}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <CheckCircle size={16} color="#10B981" />
              <Text style={styles.infoText}>
                {t('dataImport.conflictResolution')}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <CheckCircle size={16} color="#10B981" />
              <Text style={styles.infoText}>
                {t('dataImport.batchProcessing')}
              </Text>
            </View>
          </View>
        </View>

        {/* Data Security Notice */}
        <View style={styles.securitySection}>
          <Text style={styles.securityTitle}>
            {t('dataImport.dataSecurity')}
          </Text>
          <View style={styles.securityCard}>
            <Text style={styles.securityText}>
              {t('dataImport.securityWarning')}
            </Text>
            <Text style={styles.securityBullet}>
              {t('dataImport.backupFirst')}
            </Text>
            <Text style={styles.securityBullet}>
              {t('dataImport.verifySource')}
            </Text>
            <Text style={styles.securityBullet}>
              {t('dataImport.testSmallBatch')}
            </Text>
            <Text style={styles.securityBullet}>
              {t('dataImport.reviewResults')}
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
  progressSection: {
    padding: 20,
    paddingBottom: 0,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  progressTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
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
  importList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  importOption: {
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
  importOptionDisabled: {
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
  importContent: {
    flex: 1,
  },
  importTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  importDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 18,
  },
  importAction: {
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
