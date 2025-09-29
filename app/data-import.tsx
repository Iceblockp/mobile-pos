import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
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
import {
  DataImportService,
  ImportProgress,
  ImportOptions,
  DataConflict,
} from '@/services/dataImportService';
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

export default function DataImport() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { db } = useDatabase();
  const [isImporting, setIsImporting] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(
    null
  );
  const [importService, setImportService] = useState<DataImportService | null>(
    null
  );
  const [conflicts, setConflicts] = useState<DataConflict[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);

  // Initialize import service when database is ready
  React.useEffect(() => {
    if (db) {
      const service = new DataImportService(db);
      service.onProgress((progress) => {
        setImportProgress(progress);
      });
      setImportService(service);
    }
  }, [db]);

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
    if (!importService) {
      showToast('Import service not ready', 'error');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      // Validate the file first
      const validation = await importService.validateImportFile(
        result.assets[0].uri
      );
      if (!validation.isValid) {
        const errorMessages = validation.errors
          .map((e) => e.message)
          .join('\n');
        Alert.alert(t('dataImport.invalidFormat'), errorMessages);
        return;
      }

      // Preview the import data
      const preview = await importService.previewImportData(
        result.assets[0].uri
      );

      // Check for conflicts
      if (preview.conflicts.length > 0) {
        setConflicts(preview.conflicts);
        setShowConflictModal(true);
        return;
      }

      // Show confirmation dialog
      const totalItems = Object.values(preview.recordCounts).reduce(
        (sum, count) => sum + count,
        0
      );
      Alert.alert(
        t('dataImport.confirmImport'),
        `${t('dataImport.aboutToImport')} ${totalItems} ${t(
          'dataImport.items'
        )}. ${t('dataImport.existingDataWarning')}`,
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('dataImport.import'),
            onPress: async () => {
              await performImport(result.assets[0].uri, option);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Import error:', error);
      showToast(t('dataImport.importFailed'), 'error');
    }
  };

  const performImport = async (fileUri: string, option: ImportOption) => {
    if (!importService) {
      showToast('Import service not ready', 'error');
      return;
    }

    setIsImporting(option.id);
    setImportProgress(null);

    try {
      const importOptions: ImportOptions = {
        batchSize: 25,
        conflictResolution: 'update', // Default to update existing records
        validateReferences: true,
        createMissingReferences: true,
      };

      let result;

      switch (option.dataType) {
        case 'customers':
          result = await importService.importCustomers(fileUri, importOptions);
          break;
        case 'bulkPricing':
          result = await importService.importBulkPricing(
            fileUri,
            importOptions
          );
          break;
        case 'stockMovements':
          result = await importService.importStockMovements(
            fileUri,
            importOptions
          );
          break;
        case 'all':
          result = await importService.importCompleteBackup(
            fileUri,
            importOptions
          );
          break;
        default:
          throw new Error(`Unsupported import type: ${option.dataType}`);
      }

      if (result.success) {
        showToast(
          `${t('dataImport.importComplete')} ${result.imported} ${t(
            'dataImport.imported'
          )}, ${result.updated} ${t('dataImport.updated')}, ${
            result.skipped
          } ${t('dataImport.skipped')}`,
          'success'
        );

        // Show detailed results if there were errors
        if (result.errors.length > 0) {
          Alert.alert(
            t('dataImport.importCompleteWithErrors'),
            `${result.errors.length} ${t('dataImport.errorsOccurred')}. ${t(
              'dataImport.checkLogs'
            )}`,
            [{ text: t('common.ok'), style: 'default' }]
          );
        }
      } else {
        throw new Error('Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      showToast(
        `${t('dataImport.importFailed')}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'error'
      );
    } finally {
      setIsImporting(null);
      setImportProgress(null);
    }
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
        {importProgress && (
          <View style={styles.progressSection}>
            <View style={styles.progressCard}>
              <Text style={styles.progressTitle}>{importProgress.stage}</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${importProgress.percentage}%`,
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

      {/* Conflict Resolution Modal */}
      {showConflictModal && (
        <Modal visible={true} animationType="slide" transparent={true}>
          <View style={styles.conflictModalOverlay}>
            <View style={styles.conflictModalContainer}>
              <Text style={styles.conflictModalTitle}>
                {t('dataImport.conflictsDetected')}
              </Text>

              <Text style={styles.conflictModalSubtitle}>
                {conflicts.length} {t('dataImport.conflictsFound')}
              </Text>

              <ScrollView style={styles.conflictsList}>
                {conflicts.slice(0, 5).map((conflict, index) => (
                  <View key={index} style={styles.conflictItem}>
                    <Text style={styles.conflictMessage}>
                      {conflict.message}
                    </Text>
                    <Text style={styles.conflictType}>{conflict.type}</Text>
                  </View>
                ))}
                {conflicts.length > 5 && (
                  <Text style={styles.moreConflictsText}>
                    {t('dataImport.andMoreConflicts', {
                      count: conflicts.length - 5,
                    })}
                  </Text>
                )}
              </ScrollView>

              <View style={styles.conflictActions}>
                <TouchableOpacity
                  style={[styles.conflictButton, styles.updateButton]}
                  onPress={() => {
                    setShowConflictModal(false);
                    // Handle update existing records
                    showToast(t('dataImport.willUpdateExisting'), 'info');
                  }}
                >
                  <Text style={styles.updateButtonText}>
                    {t('dataImport.updateExisting')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.conflictButton, styles.skipButton]}
                  onPress={() => {
                    setShowConflictModal(false);
                    // Handle skip conflicts
                    showToast(t('dataImport.willSkipConflicts'), 'info');
                  }}
                >
                  <Text style={styles.skipButtonText}>
                    {t('dataImport.skipConflicts')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.conflictButton, styles.cancelButton]}
                  onPress={() => {
                    setShowConflictModal(false);
                    setConflicts([]);
                  }}
                >
                  <Text style={styles.cancelButtonText}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
  conflictModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  conflictModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    margin: 20,
    maxWidth: '90%',
    maxHeight: '80%',
  },
  conflictModalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  conflictModalSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  conflictsList: {
    maxHeight: 200,
    marginBottom: 20,
  },
  conflictItem: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  conflictMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#7F1D1D',
    marginBottom: 4,
  },
  conflictType: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#991B1B',
    textTransform: 'capitalize',
  },
  moreConflictsText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  conflictActions: {
    gap: 12,
  },
  conflictButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateButton: {
    backgroundColor: '#3B82F6',
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  skipButton: {
    backgroundColor: '#F59E0B',
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});
