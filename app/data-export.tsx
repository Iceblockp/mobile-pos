import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  FileText,
  Share,
  CheckCircle,
  HelpCircle,
} from 'lucide-react-native';
import DataManagementGuide from '@/components/DataManagementGuide';
import { ExportPreviewModal } from '@/components/ExportPreviewModal';
import { useTranslation } from '@/context/LocalizationContext';
import { useToast } from '@/context/ToastContext';
import { useDatabase } from '@/context/DatabaseContext';
import {
  DataExportService,
  ExportProgress,
  ExportPreview,
} from '@/services/dataExportService';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ExportOption {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  backgroundColor: string;
  dataType: 'all';
}

export default function DataExport() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { db } = useDatabase();
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(
    null
  );
  const [exportService, setExportService] = useState<DataExportService | null>(
    null
  );
  const [showGuide, setShowGuide] = useState(false);
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [exportPreview, setExportPreview] = useState<ExportPreview | null>(
    null
  );
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [pendingExportOption, setPendingExportOption] =
    useState<ExportOption | null>(null);

  // Get user-friendly display name for data types
  const getDataTypeDisplayName = (dataType: string): string => {
    const displayNames: Record<string, string> = {
      all: 'Export All Data',
    };

    return displayNames[dataType] || dataType;
  };

  // Initialize export service when database is ready
  React.useEffect(() => {
    if (db) {
      const service = new DataExportService(db);
      service.onProgress((progress) => {
        setExportProgress(progress);
      });
      setExportService(service);
    }
  }, [db]);

  const exportOptions: ExportOption[] = [
    {
      id: 'exportAll',
      title: t('dataExport.exportAllData'),
      description: t('dataExport.exportAllDataDesc'),
      icon: FileText,
      color: '#8B5CF6',
      backgroundColor: '#F5F3FF',
      dataType: 'all',
    },
  ];

  const handleExport = async (option: ExportOption) => {
    if (!exportService) {
      showToast('Export service not ready', 'error');
      return;
    }

    // Generate preview first
    setIsGeneratingPreview(true);
    setPendingExportOption(option);

    try {
      const preview = await exportService.generateExportPreview();
      setExportPreview(preview);
      setShowExportPreview(true);
    } catch (error) {
      console.error('Error generating export preview:', error);
      showToast('Failed to generate export preview', 'error');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleConfirmExport = async () => {
    if (!exportService || !pendingExportOption) {
      return;
    }

    setShowExportPreview(false);
    setIsExporting(pendingExportOption.id);
    // Initialize progress to show the modal
    setExportProgress({
      stage: 'Starting export...',
      current: 0,
      total: 4,
      percentage: 0,
    });

    try {
      console.log('Starting export process...');
      const result = await exportService.exportAllData();
      console.log('Export completed:', result);

      if (result.success && result.fileUri) {
        // Generate enhanced user-friendly feedback message
        const dataTypeName = getDataTypeDisplayName(
          pendingExportOption.dataType
        );
        let feedbackMessage: string;

        if (result.emptyExport) {
          feedbackMessage = `${dataTypeName} completed, but no data was found. An empty export file has been created for consistency.`;
        } else {
          const recordText = result.recordCount === 1 ? 'record' : 'records';
          feedbackMessage = `${dataTypeName} completed successfully! ${result.recordCount} ${recordText} exported.`;
        }

        // Handle empty exports with special messaging
        if (result.emptyExport) {
          showToast(feedbackMessage, 'info');
          // Still try to share the empty file for consistency
          try {
            await exportService.shareExportFile(
              result.fileUri,
              `Empty Export - ${pendingExportOption.title}`
            );
          } catch (shareError) {
            console.error('Sharing empty export failed:', shareError);
            // If sharing fails, mention file location
            const errorMessage =
              shareError instanceof Error
                ? shareError.message
                : 'Unknown sharing error';
            showToast(
              `Empty export file saved: ${result.filename}. Sharing failed: ${errorMessage}`,
              'info'
            );
          }
        } else {
          // Share the file for non-empty exports
          console.log('Attempting to share file:', result.fileUri);
          try {
            await exportService.shareExportFile(
              result.fileUri,
              `Export ${pendingExportOption.title}`
            );
            console.log('File sharing completed successfully');
            showToast(feedbackMessage, 'success');
          } catch (shareError) {
            console.error('Sharing failed:', shareError);
            // If sharing fails, still show success but mention file location
            const errorMessage =
              shareError instanceof Error
                ? shareError.message
                : 'Unknown sharing error';
            const fileLocationMessage = `${feedbackMessage} File saved: ${result.filename}. Sharing failed: ${errorMessage}`;
            showToast(fileLocationMessage, 'success');
          }
        }
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      showToast(
        `${t('dataExport.exportFailed')} ${pendingExportOption.title}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'error'
      );
    } finally {
      setIsExporting(null);
      setExportProgress(null);
      setPendingExportOption(null);
      setExportPreview(null);
    }
  };

  const handleCancelExport = () => {
    setShowExportPreview(false);
    setPendingExportOption(null);
    setExportPreview(null);
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
          <Text style={styles.title} weight="medium">
            {t('dataExport.title')}
          </Text>
          <Text style={styles.subtitle}>{t('dataExport.subtitle')}</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => setShowGuide(true)}
          >
            <HelpCircle size={16} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.infoButton} onPress={showExportInfo}>
            <Text style={styles.infoButtonText} weight="medium">
              ?
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Export Options */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText size={20} color="#6B7280" />
            <Text style={styles.sectionTitle} weight="medium">
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
                disabled={
                  isCurrentlyExporting ||
                  isExporting !== null ||
                  isGeneratingPreview
                }
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
                  <Text style={styles.exportTitle} weight="medium">
                    {option.title}
                  </Text>
                  <Text style={styles.exportDescription}>
                    {option.description}
                  </Text>
                </View>
                <View style={styles.exportAction}>
                  {isCurrentlyExporting ? (
                    <View style={styles.loadingContainer}>
                      <Text style={styles.loadingText} weight="medium">
                        {t('dataExport.exporting')}
                      </Text>
                    </View>
                  ) : isGeneratingPreview ? (
                    <View style={styles.loadingContainer}>
                      <Text style={styles.loadingText} weight="medium">
                        Preparing...
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
          <Text style={styles.infoTitle} weight="medium">
            {t('dataExport.exportInfo')}
          </Text>
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
          <Text style={styles.securityTitle} weight="medium">
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

      {/* Export Progress Modal */}
      {exportProgress && (
        <Modal visible={true} animationType="fade" transparent={true}>
          <View style={styles.progressModalOverlay}>
            <View style={styles.progressModalContainer}>
              <Text style={styles.progressModalTitle} weight="medium">
                {t('dataExport.exporting')}
              </Text>

              <Text style={styles.progressModalStage} weight="medium">
                {exportProgress.stage}
              </Text>

              {/* Show more specific progress information */}
              {exportProgress.percentage > 0 && (
                <Text style={styles.progressModalPercentage} weight="medium">
                  {Math.round(exportProgress.percentage)}% complete
                </Text>
              )}

              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${exportProgress.percentage}%`,
                      },
                    ]}
                  />
                </View>
              </View>

              <Text style={styles.progressModalText} weight="medium">
                {exportProgress.current} / {exportProgress.total}{' '}
                {t('dataExport.itemsProcessed')}
              </Text>

              <Text style={styles.progressModalSubtext}>
                {t('dataExport.pleaseWait')}
              </Text>
            </View>
          </View>
        </Modal>
      )}

      {/* Export Preview Modal */}
      <ExportPreviewModal
        visible={showExportPreview}
        preview={exportPreview}
        onConfirm={handleConfirmExport}
        onCancel={handleCancelExport}
        isLoading={isGeneratingPreview}
      />

      {/* Data Management Guide */}
      <DataManagementGuide
        visible={showGuide}
        onClose={() => setShowGuide(false)}
        initialTab="export"
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
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
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
    color: '#111827',
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
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
    color: '#111827',
    marginBottom: 4,
  },
  exportDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  exportAction: {
    marginLeft: 12,
  },
  loadingContainer: {
    paddingHorizontal: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
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
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
  securitySection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  securityTitle: {
    fontSize: 16,
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
    color: '#7F1D1D',
    marginBottom: 12,
  },
  securityBullet: {
    fontSize: 14,
    color: '#7F1D1D',
    marginBottom: 4,
  },
  progressModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    margin: 20,
    minWidth: 280,
    alignItems: 'center',
  },
  progressModalTitle: {
    fontSize: 18,
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressModalStage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: 12,
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressModalText: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  progressModalSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  progressModalPercentage: {
    fontSize: 12,
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 8,
  },
});
