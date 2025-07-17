import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import {
  Phone,
  Mail,
  Clock,
  BookOpen,
  Zap,
  Settings,
  AlertCircle,
  ShoppingCart,
  Package,
  BarChart3,
  Camera,
  Globe,
  ChevronRight,
} from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import { LanguageIconButton } from '@/components/LanguageIconButton';

export default function Help() {
  const { t } = useTranslation();

  const handlePhoneCall = () => {
    Linking.openURL('tel:+959425743536');
  };

  const handleEmailContact = () => {
    Linking.openURL('mailto:support@mobilepos.com');
  };

  const ContactCard = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Phone size={20} color="#2563EB" />
        <Text style={styles.cardTitle}>{t('help.contactInfo')}</Text>
      </View>

      <TouchableOpacity style={styles.contactItem} onPress={handlePhoneCall}>
        <View style={styles.contactIcon}>
          <Phone size={16} color="#059669" />
        </View>
        <View style={styles.contactDetails}>
          <Text style={styles.contactLabel}>{t('help.adminPhone')}</Text>
          <Text style={styles.contactValue}>+959425743536</Text>
        </View>
        <ChevronRight size={16} color="#9CA3AF" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.contactItem} onPress={handleEmailContact}>
        <View style={styles.contactIcon}>
          <Mail size={16} color="#059669" />
        </View>
        <View style={styles.contactDetails}>
          <Text style={styles.contactLabel}>{t('help.supportEmail')}</Text>
          <Text style={styles.contactValue}>support@mobilepos.com</Text>
        </View>
        <ChevronRight size={16} color="#9CA3AF" />
      </TouchableOpacity>

      <View style={styles.businessHours}>
        <View style={styles.contactIcon}>
          <Clock size={16} color="#6B7280" />
        </View>
        <View style={styles.contactDetails}>
          <Text style={styles.contactLabel}>{t('help.businessHours')}</Text>
          <Text style={styles.businessHourText}>
            {t('help.mondayToFriday')}
          </Text>
          <Text style={styles.businessHourText}>{t('help.saturday')}</Text>
          <Text style={styles.businessHourText}>{t('help.sunday')}</Text>
        </View>
      </View>
    </View>
  );

  const QuickStartGuide = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Zap size={20} color="#F59E0B" />
        <Text style={styles.cardTitle}>{t('help.quickStart')}</Text>
      </View>

      <Text style={styles.sectionSubtitle}>{t('help.quickStartTitle')}</Text>

      <View style={styles.stepContainer}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>1</Text>
        </View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>{t('help.step1Title')}</Text>
          <Text style={styles.stepDescription}>
            {t('help.step1Description')}
          </Text>
        </View>
      </View>

      <View style={styles.stepContainer}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>2</Text>
        </View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>{t('help.step2Title')}</Text>
          <Text style={styles.stepDescription}>
            {t('help.step2Description')}
          </Text>
        </View>
      </View>

      <View style={styles.stepContainer}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>3</Text>
        </View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>{t('help.step3Title')}</Text>
          <Text style={styles.stepDescription}>
            {t('help.step3Description')}
          </Text>
        </View>
      </View>

      <View style={styles.stepContainer}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>4</Text>
        </View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>{t('help.step4Title')}</Text>
          <Text style={styles.stepDescription}>
            {t('help.step4Description')}
          </Text>
        </View>
      </View>
    </View>
  );

  const FeaturesOverview = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Settings size={20} color="#8B5CF6" />
        <Text style={styles.cardTitle}>{t('help.features')}</Text>
      </View>

      <Text style={styles.sectionSubtitle}>{t('help.featuresTitle')}</Text>

      <View style={styles.featureItem}>
        <View style={[styles.featureIcon, { backgroundColor: '#EFF6FF' }]}>
          <BarChart3 size={16} color="#2563EB" />
        </View>
        <Text style={styles.featureText}>{t('help.dashboardFeature')}</Text>
      </View>

      <View style={styles.featureItem}>
        <View style={[styles.featureIcon, { backgroundColor: '#F0FDF4' }]}>
          <ShoppingCart size={16} color="#059669" />
        </View>
        <Text style={styles.featureText}>{t('help.salesFeature')}</Text>
      </View>

      <View style={styles.featureItem}>
        <View style={[styles.featureIcon, { backgroundColor: '#FEF3C7' }]}>
          <Package size={16} color="#F59E0B" />
        </View>
        <Text style={styles.featureText}>{t('help.inventoryFeature')}</Text>
      </View>

      <View style={styles.featureItem}>
        <View style={[styles.featureIcon, { backgroundColor: '#F3E8FF' }]}>
          <BarChart3 size={16} color="#8B5CF6" />
        </View>
        <Text style={styles.featureText}>{t('help.reportsFeature')}</Text>
      </View>

      <View style={styles.featureItem}>
        <View style={[styles.featureIcon, { backgroundColor: '#FEE2E2' }]}>
          <Camera size={16} color="#EF4444" />
        </View>
        <Text style={styles.featureText}>{t('help.barcodeFeature')}</Text>
      </View>

      <View style={styles.featureItem}>
        <View style={[styles.featureIcon, { backgroundColor: '#ECFDF5' }]}>
          <Globe size={16} color="#10B981" />
        </View>
        <Text style={styles.featureText}>{t('help.multiLanguageFeature')}</Text>
      </View>
    </View>
  );

  const HowToUse = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <BookOpen size={20} color="#059669" />
        <Text style={styles.cardTitle}>{t('help.userManual')}</Text>
      </View>

      {/* How to Make a Sale */}
      <View style={styles.howToSection}>
        <Text style={styles.howToTitle}>{t('help.howToSell')}</Text>
        <Text style={styles.howToStep}>{t('help.howToSellStep1')}</Text>
        <Text style={styles.howToStep}>{t('help.howToSellStep2')}</Text>
        <Text style={styles.howToStep}>{t('help.howToSellStep3')}</Text>
        <Text style={styles.howToStep}>{t('help.howToSellStep4')}</Text>
        <Text style={styles.howToStep}>{t('help.howToSellStep5')}</Text>
      </View>

      {/* How to Manage Inventory */}
      <View style={styles.howToSection}>
        <Text style={styles.howToTitle}>{t('help.howToManageInventory')}</Text>
        <Text style={styles.howToStep}>{t('help.howToInventoryStep1')}</Text>
        <Text style={styles.howToStep}>{t('help.howToInventoryStep2')}</Text>
        <Text style={styles.howToStep}>{t('help.howToInventoryStep3')}</Text>
        <Text style={styles.howToStep}>{t('help.howToInventoryStep4')}</Text>
        <Text style={styles.howToStep}>{t('help.howToInventoryStep5')}</Text>
      </View>

      {/* How to View Reports */}
      <View style={styles.howToSection}>
        <Text style={styles.howToTitle}>{t('help.howToViewReports')}</Text>
        <Text style={styles.howToStep}>{t('help.howToReportsStep1')}</Text>
        <Text style={styles.howToStep}>{t('help.howToReportsStep2')}</Text>
        <Text style={styles.howToStep}>{t('help.howToReportsStep3')}</Text>
        <Text style={styles.howToStep}>{t('help.howToReportsStep4')}</Text>
        <Text style={styles.howToStep}>{t('help.howToReportsStep5')}</Text>
      </View>
    </View>
  );

  const Troubleshooting = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <AlertCircle size={20} color="#EF4444" />
        <Text style={styles.cardTitle}>{t('help.troubleshooting')}</Text>
      </View>

      <Text style={styles.sectionSubtitle}>
        {t('help.troubleshootingTitle')}
      </Text>

      <View style={styles.troubleshootItem}>
        <Text style={styles.troubleshootTitle}>{t('help.licenseIssue')}</Text>
        <Text style={styles.troubleshootSolution}>
          {t('help.licenseIssueSolution')}
        </Text>
      </View>

      <View style={styles.troubleshootItem}>
        <Text style={styles.troubleshootTitle}>{t('help.barcodeIssue')}</Text>
        <Text style={styles.troubleshootSolution}>
          {t('help.barcodeIssueSolution')}
        </Text>
      </View>

      <View style={styles.troubleshootItem}>
        <Text style={styles.troubleshootTitle}>
          {t('help.dataBackupIssue')}
        </Text>
        <Text style={styles.troubleshootSolution}>
          {t('help.dataBackupSolution')}
        </Text>
      </View>

      <View style={styles.troubleshootItem}>
        <Text style={styles.troubleshootTitle}>
          {t('help.performanceIssue')}
        </Text>
        <Text style={styles.troubleshootSolution}>
          {t('help.performanceIssueSolution')}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{t('help.title')}</Text>
          <Text style={styles.subtitle}>{t('help.subtitle')}</Text>
        </View>
        <LanguageIconButton style={styles.languageSelector} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <ContactCard />
        <QuickStartGuide />
        <FeaturesOverview />
        <HowToUse />
        <Troubleshooting />

        <View style={styles.bottomPadding} />
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flex: 1,
  },
  languageSelector: {
    marginLeft: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 10,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },

  // Contact Card Styles
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  contactIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactDetails: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  contactValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 2,
  },
  businessHours: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  businessHourText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  // Quick Start Guide Styles
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  // Features Overview Styles
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },

  // How To Use Styles
  howToSection: {
    marginBottom: 20,
  },
  howToTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  howToStep: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 4,
    paddingLeft: 8,
  },

  // Troubleshooting Styles
  troubleshootItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  troubleshootTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 6,
  },
  troubleshootSolution: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  bottomPadding: {
    height: 20,
  },
});
