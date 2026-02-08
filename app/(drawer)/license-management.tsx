import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ShieldCheck,
  Clock,
  Calendar,
  User,
  Key,
  DollarSign,
  RefreshCw,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react-native';
import { useLicense } from '@/hooks/useLicense';
import { useNativeGoogleSignIn } from '@/hooks/useNativeGoogleSignIn';
import { useTranslation } from '@/context/LocalizationContext';
import { MenuButton } from '@/components/MenuButton';
import { useDrawer } from '@/context/DrawerContext';
import { LicenseExtensionModal } from '@/components/LicenseExtensionModal';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LicenseManagement() {
  const router = useRouter();
  const { t } = useTranslation();
  const { openDrawer } = useDrawer();
  const {
    licenseStatus,
    loading,
    isLicenseValid,
    getExpiryDate,
    getRemainingDays,
  } = useLicense();

  const {
    signIn,
    loading: googleLoading,
    error: googleError,
  } = useNativeGoogleSignIn();

  const [extensionModalVisible, setExtensionModalVisible] = useState(false);

  const isValid = isLicenseValid();
  const remainingDays = getRemainingDays();
  const expiryDate = getExpiryDate();

  // Check if license is about to expire (within 30 days)
  const isAboutToExpire = remainingDays <= 30 && remainingDays > 0;

  const getLicenseStatusInfo = () => {
    if (!isValid) {
      return {
        status: t('license.licenseExpired'),
        color: '#EF4444',
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
      };
    }
    if (isAboutToExpire) {
      return {
        status: t('license.licenseExpiring'),
        color: '#F59E0B',
        backgroundColor: '#FFFBEB',
        borderColor: '#FED7AA',
      };
    }
    return {
      status: t('license.licenseActive'),
      color: '#10B981',
      backgroundColor: '#ECFDF5',
      borderColor: '#A7F3D0',
    };
  };

  const statusInfo = getLicenseStatusInfo();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" backgroundColor="#F8FAFC" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            {t('license.initializingLicense')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor="#F8FAFC" />

      {/* Header */}
      <View style={styles.header}>
        <MenuButton onPress={openDrawer} />
        <Text style={styles.title} weight="medium">
          {t('license.licenseManagement')}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* License Overview Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Info size={20} color="#3B82F6" />
            <Text style={styles.sectionTitle} weight="medium">
              {t('license.licenseOverview')}
            </Text>
          </View>

          {/* Current License Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              {isValid ? (
                <CheckCircle size={24} color={statusInfo.color} />
              ) : (
                <XCircle size={24} color={statusInfo.color} />
              )}
              <View style={styles.statusInfo}>
                <Text style={styles.statusTitle} weight="medium">
                  {statusInfo.status}
                </Text>
                {expiryDate && (
                  <Text style={styles.statusSubtitle}>
                    {t('license.licenseValidUntil')}: {expiryDate}
                  </Text>
                )}
              </View>
            </View>

            {isValid && remainingDays !== null && (
              <View style={styles.remainingDaysContainer}>
                <Clock size={16} color="#6B7280" />
                <Text style={styles.remainingDaysText}>
                  {remainingDays} {t('license.daysRemaining')}
                </Text>
              </View>
            )}

            {isAboutToExpire && (
              <View style={styles.warningBanner}>
                <AlertTriangle size={16} color="#F59E0B" />
                <Text style={styles.warningBannerText}>
                  {t('license.licenseExpiringSoon')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* License Management Actions */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <RefreshCw size={20} color="#10B981" />
            <Text style={styles.sectionTitle} weight="medium">
              {t('license.licenseActions')}
            </Text>
          </View>

          {/* Google Account Extension */}
          <View style={styles.actionCard}>
            <View style={styles.actionHeader}>
              <User size={20} color="#4285F4" />
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle} weight="medium">
                  {t('license.googleAccountExtension')}
                </Text>
                <Text style={styles.actionDescription}>
                  {t('license.extendLicenseWithGoogle')}
                </Text>
              </View>
            </View>

            {googleError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{googleError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.googleSignInButton,
                googleLoading && styles.disabledButton,
              ]}
              onPress={signIn}
              disabled={googleLoading}
            >
              <Image
                source={{
                  uri: 'https://developers.google.com/identity/images/g-logo.png',
                }}
                style={styles.googleIcon}
              />
              <Text style={styles.googleSignInText} weight="medium">
                {googleLoading
                  ? t('license.signingIn')
                  : t('license.extendWithGoogle')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Challenge Code Extension */}
          <View style={styles.actionCard}>
            <View style={styles.actionHeader}>
              <Key size={20} color="#8B5CF6" />
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle} weight="medium">
                  {t('license.challengeCodeExtension')}
                </Text>
                <Text style={styles.actionDescription}>
                  {t('license.extendLicenseDescription')}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.challengeButton}
              onPress={() => setExtensionModalVisible(true)}
            >
              <Key size={16} color="#FFFFFF" />
              <Text style={styles.challengeButtonText} weight="medium">
                {t('license.generateExtensionChallenge')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* View Pricing */}
          <View style={styles.actionCard}>
            <View style={styles.actionHeader}>
              <DollarSign size={20} color="#10B981" />
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle} weight="medium">
                  {t('license.viewPricingPlans')}
                </Text>
                <Text style={styles.actionDescription}>
                  {t('license.comparePlansAndPricing')}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.pricingButton}
              onPress={() => router.push('/pricing')}
            >
              <DollarSign size={16} color="#FFFFFF" />
              <Text style={styles.pricingButtonText} weight="medium">
                {t('license.viewPricing')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <ShieldCheck size={20} color="#6B7280" />
            <Text style={styles.sectionTitle} weight="medium">
              {t('license.support')}
            </Text>
          </View>

          <View style={styles.contactCard}>
            <Text style={styles.contactTitle} weight="medium">
              {t('license.needHelp')}
            </Text>
            <Text style={styles.contactDescription}>
              {t('license.contactForSupport')}
            </Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>
                {t('license.contactPhone')}:
              </Text>
              <Text style={styles.contactPhone} weight="bold">
                +959425743536
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* License Extension Modal */}
      <LicenseExtensionModal
        visible={extensionModalVisible}
        onClose={() => setExtensionModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 8,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusInfo: {
    marginLeft: 12,
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    color: '#111827',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  remainingDaysContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  remainingDaysText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  warningBannerText: {
    fontSize: 14,
    color: '#92400E',
    marginLeft: 8,
  },
  actionCard: {
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
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  actionInfo: {
    marginLeft: 12,
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  googleSignInButton: {
    backgroundColor: '#4285F4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  googleIcon: {
    width: 18,
    height: 18,
    marginRight: 12,
  },
  googleSignInText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  challengeButton: {
    backgroundColor: '#8B5CF6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  challengeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
  },
  pricingButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  pricingButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  contactTitle: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 8,
  },
  contactDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  contactInfo: {
    alignItems: 'center',
  },
  contactLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 16,
    color: '#2563EB',
    letterSpacing: 0.5,
  },
});
