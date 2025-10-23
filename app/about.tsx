import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Info,
  Heart,
  Code,
  Shield,
  Mail,
  ExternalLink,
} from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function About() {
  const router = useRouter();
  const { t } = useTranslation();

  const openLink = (url: string) => {
    Linking.openURL(url);
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
            {t('about.title')}
          </Text>
          <Text style={styles.subtitle}>{t('about.subtitle')}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Info */}
        <View style={styles.section}>
          <View style={styles.appLogoContainer}>
            <View style={styles.appLogo}>
              <Text style={styles.appLogoText} weight="bold">
                POS
              </Text>
            </View>
            <Text style={styles.appName} weight="bold">
              {t('about.appName')}
            </Text>
            <Text style={styles.appVersion} weight="medium">
              {t('about.version')}
            </Text>
            <Text style={styles.appDescription}>
              {t('more.appDescription')}
            </Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} weight="medium">
            {t('about.keyFeatures')}
          </Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet} weight="bold">
                •
              </Text>
              <Text style={styles.featureText}>{t('about.completeSales')}</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet} weight="bold">
                •
              </Text>
              <Text style={styles.featureText}>
                {t('about.inventoryTracking')}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet} weight="bold">
                •
              </Text>
              <Text style={styles.featureText}>
                {t('about.businessAnalytics')}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet} weight="bold">
                •
              </Text>
              <Text style={styles.featureText}>
                {t('about.expenseTracking')}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet} weight="bold">
                •
              </Text>
              <Text style={styles.featureText}>
                {t('about.barcodeSupport')}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet} weight="bold">
                •
              </Text>
              <Text style={styles.featureText}>{t('about.multiLanguage')}</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet} weight="bold">
                •
              </Text>
              <Text style={styles.featureText}>{t('about.dataExportCap')}</Text>
            </View>
          </View>
        </View>

        {/* Technical Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} weight="medium">
            {t('about.technicalInfo')}
          </Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Code size={16} color="#6B7280" />
              <Text style={styles.infoLabel} weight="medium">
                {t('about.builtWith')}
              </Text>
              <Text style={styles.infoValue}>{t('about.reactNativeExpo')}</Text>
            </View>
            <View style={styles.infoRow}>
              <Shield size={16} color="#6B7280" />
              <Text style={styles.infoLabel} weight="medium">
                {t('about.dataStorage')}
              </Text>
              <Text style={styles.infoValue}>{t('about.localSqlite')}</Text>
            </View>
            <View style={styles.infoRow}>
              <Heart size={16} color="#6B7280" />
              <Text style={styles.infoLabel} weight="medium">
                {t('about.license')}
              </Text>
              <Text style={styles.infoValue}>
                {t('about.commercialLicense')}
              </Text>
            </View>
          </View>
        </View>

        {/* Contact & Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} weight="medium">
            Contact & Support
          </Text>
          <View style={styles.contactCard}>
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => openLink('mailto:support@mobilepos.com')}
            >
              <Mail size={20} color="#3B82F6" />
              <Text style={styles.contactText} weight="medium">
                phonyo126@gmail.com
              </Text>
              <ExternalLink size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} weight="medium">
            Legal
          </Text>
          <View style={styles.legalCard}>
            <Text style={styles.legalText}>
              © 2025 Mobile POS. All rights reserved.
            </Text>
            <Text style={styles.legalText}>
              This software is licensed for commercial use. Unauthorized
              distribution or modification is prohibited.
            </Text>
            <Text style={styles.legalText}>
              All data is stored locally on your device. We do not collect or
              transmit any personal or business data.
            </Text>
          </View>
        </View>

        {/* Credits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} weight="medium">
            Credits
          </Text>
          <View style={styles.creditsCard}>
            <Text style={styles.creditsText}>
              Built with ❤️ for small businesses
            </Text>
            <Text style={styles.creditsText}>
              Icons by Lucide • Fonts by Google Fonts
            </Text>
            <Text style={styles.creditsText}>
              Special thanks to the React Native and Expo communities
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
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  appLogoContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  appLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appLogoText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  appName: {
    fontSize: 24,
    color: '#111827',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
  },
  appDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#111827',
    marginBottom: 12,
  },
  featuresList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  featureBullet: {
    fontSize: 16,
    color: '#3B82F6',
    marginRight: 8,
    marginTop: 2,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  contactText: {
    fontSize: 14,
    color: '#3B82F6',
    marginLeft: 12,
    flex: 1,
  },
  legalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  legalText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  creditsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  creditsText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    textAlign: 'center',
  },
});
