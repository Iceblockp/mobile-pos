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
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const exportOptions: ExportOption[] = [
    {
      id: 'sales',
      title: 'Sales Data',
      description:
        'Export all sales transactions, payment methods, and customer receipts',
      icon: DollarSign,
      color: '#10B981',
      backgroundColor: '#ECFDF5',
      dataType: 'sales',
    },
    {
      id: 'products',
      title: 'Products & Inventory',
      description:
        'Export product catalog, stock levels, categories, and pricing',
      icon: Package,
      color: '#3B82F6',
      backgroundColor: '#EFF6FF',
      dataType: 'products',
    },
    {
      id: 'expenses',
      title: 'Expenses Data',
      description: 'Export business expenses, categories, and expense tracking',
      icon: FileText,
      color: '#EF4444',
      backgroundColor: '#FEF2F2',
      dataType: 'expenses',
    },
    {
      id: 'complete',
      title: 'Complete Backup',
      description:
        'Export all data including sales, products, expenses, and settings',
      icon: Database,
      color: '#8B5CF6',
      backgroundColor: '#F5F3FF',
      dataType: 'all',
    },
  ];

  const handleExport = async (option: ExportOption) => {
    setIsExporting(option.id);

    try {
      let data: any = {};
      let filename = '';

      switch (option.dataType) {
        case 'sales':
          // In a real implementation, you'd fetch sales data
          data = { sales: [], message: 'Sales data export' };
          filename = `sales_export_${
            new Date().toISOString().split('T')[0]
          }.json`;
          break;
        case 'products':
          data = {
            products: [],
            categories: [],
            message: 'Products data export',
          };
          filename = `products_export_${
            new Date().toISOString().split('T')[0]
          }.json`;
          break;
        case 'expenses':
          data = {
            expenses: [],
            categories: [],
            message: 'Expenses data export',
          };
          filename = `expenses_export_${
            new Date().toISOString().split('T')[0]
          }.json`;
          break;
        case 'all':
          data = {
            sales: [],
            products: [],
            expenses: [],
            categories: [],
            settings: {},
            exportDate: new Date().toISOString(),
            message: 'Complete data backup',
          };
          filename = `complete_backup_${
            new Date().toISOString().split('T')[0]
          }.json`;
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
        showToast(`${option.title} exported successfully!`, 'success');
      } else {
        showToast('Sharing not available on this device', 'error');
      }
    } catch (error) {
      console.error('Export error:', error);
      showToast(`Failed to export ${option.title}`, 'error');
    } finally {
      setIsExporting(null);
    }
  };

  const showExportInfo = () => {
    Alert.alert(
      'Export Information',
      'Exported data will be saved as JSON files that can be:\n\n• Shared via email, messaging apps, or cloud storage\n• Imported back into the app\n• Used for backup purposes\n• Analyzed in external tools\n\nAll sensitive data is included, so handle exports securely.',
      [{ text: 'Got it', style: 'default' }]
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
          <Text style={styles.title}>{t('more.dataExport')}</Text>
          <Text style={styles.subtitle}>{t('more.dataExportSubtitle')}</Text>
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
            <Text style={styles.sectionTitle}>Export Options</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Choose what data you want to export from your POS system
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
                      <Text style={styles.loadingText}>Exporting...</Text>
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
          <Text style={styles.infoTitle}>Export Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoItem}>
              <CheckCircle size={16} color="#10B981" />
              <Text style={styles.infoText}>
                Data is exported in JSON format for easy import/backup
              </Text>
            </View>
            <View style={styles.infoItem}>
              <CheckCircle size={16} color="#10B981" />
              <Text style={styles.infoText}>
                Files include timestamps and can be shared securely
              </Text>
            </View>
            <View style={styles.infoItem}>
              <CheckCircle size={16} color="#10B981" />
              <Text style={styles.infoText}>
                Complete backups include all settings and configurations
              </Text>
            </View>
            <View style={styles.infoItem}>
              <CheckCircle size={16} color="#10B981" />
              <Text style={styles.infoText}>
                Exported data can be re-imported to restore information
              </Text>
            </View>
          </View>
        </View>

        {/* Data Security Notice */}
        <View style={styles.securitySection}>
          <Text style={styles.securityTitle}>🔒 Data Security</Text>
          <View style={styles.securityCard}>
            <Text style={styles.securityText}>
              Exported files contain sensitive business data including sales
              figures, product information, and expense details. Please:
            </Text>
            <Text style={styles.securityBullet}>
              • Store exports in secure locations
            </Text>
            <Text style={styles.securityBullet}>
              • Use encrypted storage when possible
            </Text>
            <Text style={styles.securityBullet}>
              • Avoid sharing via unsecured channels
            </Text>
            <Text style={styles.securityBullet}>
              • Delete old exports regularly
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
