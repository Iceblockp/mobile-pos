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
  FolderOpen,
  Database,
  CheckCircle,
  HelpCircle,
  FileSearch,
} from 'lucide-react-native';
import DataManagementGuide from '@/components/DataManagementGuide';
import { useTranslation } from '@/context/LocalizationContext';
import { useToast } from '@/context/ToastContext';
import { useDatabase } from '@/context/DatabaseContext';
import {
  DataImportService,
  ImportProgress,
  ImportOptions,
  DataConflict,
  ConflictResolution,
  ConflictSummary,
} from '@/services/dataImportService';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { ConflictResolutionModal } from '@/components/ConflictResolutionModal';

interface ImportOption {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  backgroundColor: string;
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
  const [conflictSummary, setConflictSummary] = useState<
    ConflictSummary | undefined
  >(undefined);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    fileUri: string;
    option: ImportOption;
  } | null>(null);

  // Get user-friendly display name for data types
  const getDataTypeDisplayName = (): string => {
    // Simplified data import only supports 'all' data type
    return 'Import All Data';
  };

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

  // Simplified data import - only support importing all data at once
  const importOptions: ImportOption[] = [
    {
      id: 'all-data',
      title: t('dataImport.importAllData'),
      description: t('dataImport.importAllDataDesc'),
      icon: FolderOpen,
      color: '#8B5CF6',
      backgroundColor: '#F5F3FF',
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

      // Check if the file contains the selected data type
      const fileContent = await FileSystem.readAsStringAsync(
        result.assets[0].uri
      );
      const importData = JSON.parse(fileContent);
      const dataTypeValidation =
        importService.validateDataTypeAvailability(importData);

      if (!dataTypeValidation.isValid) {
        const availableTypesText =
          dataTypeValidation.availableTypes.length > 0
            ? `Available data types in this file:\n${dataTypeValidation.availableTypes
                .map(
                  (type) =>
                    `• ${type} (${
                      dataTypeValidation.detailedCounts?.[type] || 0
                    } records)`
                )
                .join('\n')}`
            : 'This file does not contain any valid data.';

        Alert.alert(
          'Data Type Not Available',
          `${dataTypeValidation.message}\n\n${availableTypesText}`,
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      // Preview the import data
      const preview = await importService.previewImportData(
        result.assets[0].uri
      );

      // Check for conflicts
      if (preview.conflicts.length > 0) {
        setConflicts(preview.conflicts);
        setConflictSummary(preview.conflictSummary);
        setPendingImport({ fileUri: result.assets[0].uri, option });
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
      let errorMessage = t('dataImport.importFailed');

      // Provide more specific and actionable error messages
      if (error instanceof Error) {
        if (
          error.message.includes('No') &&
          error.message.includes('data found')
        ) {
          errorMessage = `Import failed: The selected file does not contain ${getDataTypeDisplayName().toLowerCase()} data. Please select a valid export file.`;
        } else if (
          error.message.includes('Invalid') ||
          error.message.includes('format')
        ) {
          errorMessage =
            'Import failed: Invalid file format. Please select a valid JSON backup file exported from this application.';
        } else if (
          error.message.includes('relationship') ||
          error.message.includes('category') ||
          error.message.includes('supplier')
        ) {
          errorMessage = `Import failed: Data relationship error. ${error.message}. Please check your data integrity.`;
        } else if (error.message.includes('validation')) {
          errorMessage = `Import failed: Data validation error. ${error.message}. Please verify your data format.`;
        } else if (error.message.includes('conflict')) {
          errorMessage = `Import failed: Data conflict detected. ${error.message}. Please resolve conflicts and try again.`;
        } else {
          errorMessage = `Import failed: ${error.message}. Please check your file and try again.`;
        }
      }

      showToast(errorMessage, 'error');
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
        // validateReferences: true,
        // createMissingReferences: true,
      };

      // For simplified data import, we always import all data
      const result = await importService.importAllData(fileUri, importOptions);

      if (result.success) {
        // Generate enhanced success message with data type information
        const dataTypeName = getDataTypeDisplayName();
        let successMessage = `${dataTypeName} import completed successfully!`;

        // Add detailed counts if available
        if (
          result.actualProcessedCounts &&
          Object.keys(result.actualProcessedCounts).length > 0
        ) {
          const processedDetails = Object.entries(result.actualProcessedCounts)
            .map(([type, counts]) => {
              const total = counts.imported + counts.updated + counts.skipped;
              if (total > 0) {
                return `${type}: ${counts.imported} imported, ${counts.updated} updated, ${counts.skipped} skipped`;
              }
              return null;
            })
            .filter(Boolean)
            .join('\n');

          if (processedDetails) {
            successMessage += `\n\nDetails:\n${processedDetails}`;
          }
        } else {
          // Fallback to basic counts
          successMessage += ` ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped.`;
        }

        showToast(successMessage, 'success');

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
      let errorMessage = t('dataImport.importFailed');

      // Provide more specific error messages based on the error type
      if (error instanceof Error) {
        if (
          error.message.includes('MISSING_DATA_TYPE') ||
          error.message.includes('not available')
        ) {
          const dataTypeName = getDataTypeDisplayName();
          errorMessage = `Import failed: The selected file does not contain ${dataTypeName.toLowerCase()} data. Please select a file that contains the data type you want to import.`;
        } else if (
          error.message.includes('Invalid') ||
          error.message.includes('format')
        ) {
          errorMessage =
            'Import failed: Invalid file format. Please select a valid JSON backup file.';
        } else if (error.message.includes('validation')) {
          errorMessage = `Import failed: Data validation error. ${error.message}`;
        } else {
          errorMessage = `Import failed: ${error.message}`;
        }
      }

      showToast(errorMessage, 'error');
    } finally {
      setIsImporting(null);
      setImportProgress(null);
    }
  };

  const handleConflictResolution = async (resolution: ConflictResolution) => {
    // Handle the conflict resolution based on user choice
    console.log('Conflict resolution:', resolution);

    // Clear conflicts after resolution
    setConflicts([]);
    setConflictSummary(undefined);

    // Continue with the import using the resolved conflicts
    if (pendingImport) {
      const actionMessage =
        resolution.action === 'update'
          ? t('dataImport.willUpdateExisting')
          : t('dataImport.willSkipConflicts');

      showToast(actionMessage, 'info');

      // Continue with the import process
      await performImportWithResolution(
        pendingImport.fileUri,
        pendingImport.option,
        resolution
      );

      // Clear pending import
      setPendingImport(null);
    }
  };

  const performImportWithResolution = async (
    fileUri: string,
    option: ImportOption,
    resolution: ConflictResolution
  ) => {
    if (!importService) {
      showToast('Import service not ready', 'error');
      return;
    }

    setIsImporting(option.id);
    setImportProgress(null);

    try {
      const importOptions: ImportOptions = {
        batchSize: 25,
        conflictResolution: resolution.action === 'update' ? 'update' : 'skip',
        // validateReferences: true,
        // createMissingReferences: true,
      };

      // For simplified data import, we always import all data
      const result = await importService.importAllData(fileUri, importOptions);

      if (result.success) {
        // Generate enhanced success message with data type information
        const dataTypeName = getDataTypeDisplayName();
        let successMessage = `${dataTypeName} import completed successfully!`;

        // Add detailed counts if available
        if (
          result.actualProcessedCounts &&
          Object.keys(result.actualProcessedCounts).length > 0
        ) {
          const processedDetails = Object.entries(result.actualProcessedCounts)
            .map(([type, counts]) => {
              const total = counts.imported + counts.updated + counts.skipped;
              if (total > 0) {
                return `${type}: ${counts.imported} imported, ${counts.updated} updated, ${counts.skipped} skipped`;
              }
              return null;
            })
            .filter(Boolean)
            .join('\n');

          if (processedDetails) {
            successMessage += `\n\nDetails:\n${processedDetails}`;
          }
        } else {
          // Fallback to basic counts
          successMessage += ` ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped.`;
        }

        showToast(successMessage, 'success');

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
      let errorMessage = t('dataImport.importFailed');

      // Provide more specific error messages based on the error type
      if (error instanceof Error) {
        if (
          error.message.includes('MISSING_DATA_TYPE') ||
          error.message.includes('not available')
        ) {
          const dataTypeName = getDataTypeDisplayName();
          errorMessage = `Import failed: The selected file does not contain ${dataTypeName.toLowerCase()} data. Please select a file that contains the data type you want to import.`;
        } else if (
          error.message.includes('Invalid') ||
          error.message.includes('format')
        ) {
          errorMessage =
            'Import failed: Invalid file format. Please select a valid JSON backup file.';
        } else if (error.message.includes('validation')) {
          errorMessage = `Import failed: Data validation error. ${error.message}`;
        } else {
          errorMessage = `Import failed: ${error.message}`;
        }
      }

      showToast(errorMessage, 'error');
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
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => setShowGuide(true)}
          >
            <HelpCircle size={16} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.infoButton} onPress={showImportInfo}>
            <Text style={styles.infoButtonText}>?</Text>
          </TouchableOpacity>
        </View>
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
              {/* Show percentage for better feedback */}
              {importProgress.percentage > 0 && (
                <Text style={styles.progressPercentage}>
                  {Math.round(importProgress.percentage)}% complete
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Import Options */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FolderOpen size={20} color="#6B7280" />
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
                    <FileSearch size={20} color="#9CA3AF" />
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
      <ConflictResolutionModal
        visible={showConflictModal}
        conflicts={conflicts}
        conflictSummary={conflictSummary}
        onResolve={(resolution: ConflictResolution) => {
          setShowConflictModal(false);
          handleConflictResolution(resolution);
        }}
        onCancel={() => {
          setShowConflictModal(false);
          setConflicts([]);
          setConflictSummary(undefined);
          setPendingImport(null);
        }}
      />

      {/* Data Management Guide */}
      <DataManagementGuide
        visible={showGuide}
        onClose={() => setShowGuide(false)}
        initialTab="import"
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
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
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
  progressPercentage: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#3B82F6',
    textAlign: 'center',
    marginTop: 4,
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
