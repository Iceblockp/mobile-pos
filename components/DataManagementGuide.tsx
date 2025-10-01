import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import {
  HelpCircle,
  X,
  Download,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
} from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';

interface DataManagementGuideProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: 'export' | 'import';
}

export default function DataManagementGuide({
  visible,
  onClose,
  initialTab = 'export',
}: DataManagementGuideProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'export' | 'import'>(initialTab);

  const renderExportGuide = () => (
    <ScrollView style={styles.guideContent}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Download size={20} color="#3B82F6" />
          <Text style={styles.sectionTitle}>{t('guide.exportOverview')}</Text>
        </View>
        <Text style={styles.sectionText}>{t('guide.exportDescription')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.stepTitle}>{t('guide.exportSteps')}</Text>

        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepText}>{t('guide.exportStep1')}</Text>
          </View>
        </View>

        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepText}>{t('guide.exportStep2')}</Text>
          </View>
        </View>

        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepText}>{t('guide.exportStep3')}</Text>
          </View>
        </View>

        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>4</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepText}>{t('guide.exportStep4')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.tipBox}>
          <CheckCircle size={16} color="#10B981" />
          <Text style={styles.tipTitle}>{t('guide.exportTips')}</Text>
        </View>
        <Text style={styles.tipText}>{t('guide.exportTip1')}</Text>
        <Text style={styles.tipText}>{t('guide.exportTip2')}</Text>
        <Text style={styles.tipText}>{t('guide.exportTip3')}</Text>
      </View>
    </ScrollView>
  );

  const renderImportGuide = () => (
    <ScrollView style={styles.guideContent}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Upload size={20} color="#3B82F6" />
          <Text style={styles.sectionTitle}>{t('guide.importOverview')}</Text>
        </View>
        <Text style={styles.sectionText}>{t('guide.importDescription')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.stepTitle}>{t('guide.importSteps')}</Text>

        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepText}>{t('guide.importStep1')}</Text>
          </View>
        </View>

        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepText}>{t('guide.importStep2')}</Text>
          </View>
        </View>

        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepText}>{t('guide.importStep3')}</Text>
          </View>
        </View>

        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>4</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepText}>{t('guide.importStep4')}</Text>
          </View>
        </View>

        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>5</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepText}>{t('guide.importStep5')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.warningBox}>
          <AlertTriangle size={16} color="#EF4444" />
          <Text style={styles.warningTitle}>{t('guide.importWarnings')}</Text>
        </View>
        <Text style={styles.warningText}>{t('guide.importWarning1')}</Text>
        <Text style={styles.warningText}>{t('guide.importWarning2')}</Text>
        <Text style={styles.warningText}>{t('guide.importWarning3')}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.tipBox}>
          <CheckCircle size={16} color="#10B981" />
          <Text style={styles.tipTitle}>{t('guide.importTips')}</Text>
        </View>
        <Text style={styles.tipText}>{t('guide.importTip1')}</Text>
        <Text style={styles.tipText}>{t('guide.importTip2')}</Text>
        <Text style={styles.tipText}>{t('guide.importTip3')}</Text>
      </View>
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('guide.dataManagementGuide')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'export' && styles.activeTab]}
              onPress={() => setActiveTab('export')}
            >
              <Download
                size={16}
                color={activeTab === 'export' ? '#FFFFFF' : '#6B7280'}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'export' && styles.activeTabText,
                ]}
              >
                {t('guide.exportTab')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'import' && styles.activeTab]}
              onPress={() => setActiveTab('import')}
            >
              <Upload
                size={16}
                color={activeTab === 'import' ? '#FFFFFF' : '#6B7280'}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'import' && styles.activeTabText,
                ]}
              >
                {t('guide.importTab')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          {activeTab === 'export' ? renderExportGuide() : renderImportGuide()}

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.getStartedButton} onPress={onClose}>
              <Text style={styles.getStartedText}>{t('guide.getStarted')}</Text>
              <ArrowRight size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 20,
    maxHeight: '90%',
    width: '90%',
    maxWidth: 500,
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
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    margin: 20,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  guideContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  sectionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
  stepTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 20,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  tipTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#065F46',
  },
  tipText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#047857',
    marginBottom: 4,
    paddingLeft: 8,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#7F1D1D',
  },
  warningText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#B91C1C',
    marginBottom: 4,
    paddingLeft: 8,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  getStartedButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  getStartedText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
