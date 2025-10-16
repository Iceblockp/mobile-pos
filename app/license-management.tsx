import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldCheck, ArrowLeft, Clock, Calendar } from 'lucide-react-native';
import { useLicense } from '@/hooks/useLicense';
import { useTranslation } from '@/context/LocalizationContext';
import { LicenseExtensionModal } from '@/components/LicenseExtensionModal';
import { MyanmarText as Text } from '@/components/MyanmarText';

export default function LicenseManagement() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    licenseStatus,
    loading,
    isLicenseValid,
    getExpiryDate,
    getRemainingDays,
  } = useLicense();

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
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
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
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title} weight="medium">
          {t('license.licenseManagement')}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current License Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <ShieldCheck size={24} color={statusInfo.color} />
            <Text style={styles.statusTitle} weight="medium">
              {t('license.currentLicenseStatus')}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusInfo.backgroundColor,
                borderColor: statusInfo.borderColor,
              },
            ]}
          >
            <Text
              style={[styles.statusText, { color: statusInfo.color }]}
              weight="medium"
            >
              {statusInfo.status}
            </Text>
          </View>

          {expiryDate && (
            <View style={styles.statusDetails}>
              <View style={styles.statusRow}>
                <Calendar size={16} color="#6B7280" />
                <Text style={styles.statusLabel}>
                  {t('license.licenseValidUntil')}:
                </Text>
                <Text style={styles.statusValue} weight="medium">
                  {expiryDate}
                </Text>
              </View>

              {isValid && (
                <View style={styles.statusRow}>
                  <Clock size={16} color="#6B7280" />
                  <Text style={styles.statusLabel}>
                    {remainingDays} {t('license.daysRemaining')}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* License Extension Section */}
        <View style={styles.extensionCard}>
          <View style={styles.extensionHeader}>
            <Text style={styles.extensionTitle} weight="medium">
              {t('license.extendLicense')}
            </Text>
            <Text style={styles.extensionDescription}>
              {t('license.extendLicenseDescription')}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.extendButton}
            onPress={() => setExtensionModalVisible(true)}
          >
            <ShieldCheck size={20} color="#FFFFFF" />
            <Text style={styles.extendButtonText} weight="medium">
              {t('license.extendLicense')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Warning for expiring license */}
        {isAboutToExpire && (
          <View style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <ShieldCheck size={20} color="#F59E0B" />
              <Text style={styles.warningTitle} weight="medium">
                {t('license.licenseExpiringSoon')}
              </Text>
            </View>
            <Text style={styles.warningMessage}>
              {t('license.licenseWillExpire')} {remainingDays}{' '}
              {t('analytics.days')}. {t('license.regenerateChallenge')}
            </Text>
          </View>
        )}

        {/* Contact Information */}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle} weight="medium">
            {t('license.contactPhone')}
          </Text>
          <Text style={styles.contactPhone} weight="bold">
            +959425743536
          </Text>
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
  backButton: {
    padding: 8,
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
    padding: 20,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 18,
    color: '#111827',
    marginLeft: 10,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
  },
  statusDetails: {
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusValue: {
    fontSize: 14,
    color: '#111827',
  },
  extensionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  extensionHeader: {
    marginBottom: 16,
  },
  extensionTitle: {
    fontSize: 18,
    color: '#111827',
    marginBottom: 8,
  },
  extensionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  extendButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  extendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  warningCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 16,
    color: '#92400E',
    marginLeft: 8,
  },
  warningMessage: {
    fontSize: 14,
    color: '#A16207',
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactTitle: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
  },
  contactPhone: {
    fontSize: 18,
    color: '#2563EB',
    letterSpacing: 0.5,
  },
});
