import {
  StyleSheet,
  View,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { useLicense } from '@/hooks/useLicense';
import { ChallengeDisplay } from '@/components/ChallengeDisplay';
import { ResponseInput } from '@/components/ResponseInput';
import { LicenseDurationModal } from '@/components/LicenseDurationModal';
import { SplashScreen } from '@/components/SplashScreen';
import { RegenerateWarningModal } from '@/components/RegenerateWarningModal';
import { isLicenseExpired } from '@/utils/crypto';
import { ShieldCheck, ArrowRight } from 'lucide-react-native';
import { LICENSE_PACKAGES } from '@/utils/admin';
import { router } from 'expo-router';
import { LanguageIconButton } from '@/components/LanguageIconButton';
import { useTranslation } from '@/context/LocalizationContext';
import { MigrationProgress } from '@/components/MigrationProgress';
import { useMigration } from '@/context/MigrationContext';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNativeGoogleSignIn } from '@/hooks/useNativeGoogleSignIn';

const Index = () => {
  const {
    licenseStatus,
    loading,
    verifying,
    verifyLicense,
    regenerateChallenge,
    isLicenseValid,
    getExpiryDate,
  } = useLicense();
  const { t } = useTranslation();
  const { isMigrationInProgress } = useMigration();
  useEffect(() => {
    if (__DEV__) {
      // Add global error handler for development
      const originalConsoleError = console.error;
      console.error = (...args) => {
        originalConsoleError(...args);
        // Don't crash in development for certain errors
        if (args[0]?.toString().includes('EXC_BAD_INSTRUCTION')) {
          console.warn('Caught potential crash in development mode');
        }
      };
    }
  }, []);

  const [selectedDuration, setSelectedDuration] = useState('trial');
  const [modalVisible, setModalVisible] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingValidityMonths, setPendingValidityMonths] = useState(30);

  const { signIn } = useNativeGoogleSignIn();

  // Function to handle regenerate challenge with warning
  const handleRegenerateChallenge = (validityMonths: number) => {
    setPendingValidityMonths(validityMonths);
    setShowWarningModal(true);
  };

  // Function to proceed with regeneration
  const handleProceedRegeneration = () => {
    regenerateChallenge(pendingValidityMonths);
  };

  // Handle splash screen animation finish
  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  // Show splash screen first
  if (showSplash) {
    return <SplashScreen onAnimationFinish={handleSplashFinish} />;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="dark" backgroundColor="#F8FAFC" />
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>
          {t('license.initializingLicense')}
        </Text>
      </View>
    );
  }

  const isValid = isLicenseValid();
  const isExpired = licenseStatus?.expiryDate
    ? isLicenseExpired(licenseStatus.expiryDate)
    : true;

  // Check if license is about to expire (within 10 days)
  const isAboutToExpire = () => {
    if (!licenseStatus?.expiryDate) return false;

    const expiryDate = new Date(
      `${licenseStatus.expiryDate.slice(0, 4)}-${licenseStatus.expiryDate.slice(
        4,
        6
      )}-${licenseStatus.expiryDate.slice(6, 8)}`
    );
    const currentDate = new Date();
    const timeDifference = expiryDate.getTime() - currentDate.getTime();
    const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));

    return daysDifference <= 30 && daysDifference > 0;
  };

  if (!isValid) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" backgroundColor="#F8FAFC" />
        <View style={styles.verificationHeader}>
          <Image
            source={require('@/assets/images/pos.png')}
            style={styles.logo}
            resizeMode="cover"
          />
          <View style={styles.headerTextContainer}>
            <Text style={styles.title} weight="bold">
              {t('license.title')}
            </Text>
            <Text style={styles.subtitle}>
              {t('license.verificationRequired')}
            </Text>
          </View>
          <LanguageIconButton />
        </View>

        <ScrollView style={styles.contentContainer}>
          <View style={styles.verificationCard}>
            <View style={styles.verificationCardHeader}>
              <ShieldCheck size={24} color="#3B82F6" />
              <Text style={styles.verificationCardTitle} weight="medium">
                {t('license.verifyLicense')}
              </Text>
            </View>

            <Text style={styles.verificationCardText}>
              {t('license.accessAllFeatures')}
            </Text>

            <TouchableOpacity
              style={styles.durationButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.durationButtonText}>
                {t('license.selectLicenseDuration')}:{' '}
                {LICENSE_PACKAGES[selectedDuration]?.description}
              </Text>
            </TouchableOpacity>

            {licenseStatus?.challenge && (
              <View style={styles.verificationSteps}>
                <ChallengeDisplay
                  challenge={licenseStatus.challenge.fullChallenge}
                />
                <ResponseInput onVerify={verifyLicense} verifying={verifying} />
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.regenerateButton,
                loading && styles.disabledButton,
              ]}
              onPress={() =>
                regenerateChallenge(
                  LICENSE_PACKAGES[selectedDuration]?.validityMonths || 1
                )
              }
              disabled={loading}
            >
              <Text style={styles.regenerateButtonText} weight="medium">
                {loading
                  ? t('license.generating')
                  : t('license.generateNewChallenge')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Contact Phone Section */}
          <View style={styles.contactSection}>
            <Text style={styles.contactLabel}>
              {t('license.contactPhone')}:
            </Text>
            <Text style={styles.contactPhone} weight="bold">
              +959425743536
            </Text>
          </View>
        </ScrollView>

        <LicenseDurationModal
          visible={modalVisible}
          selectedDuration={selectedDuration}
          onDurationChange={setSelectedDuration}
          onClose={() => setModalVisible(false)}
        />
      </SafeAreaView>
    );
  }

  // If license is valid, show the simplified welcome page
  return (
    <SafeAreaView style={styles.welcomeContainer}>
      <StatusBar style="dark" backgroundColor="#2563EB" />
      <View style={styles.welcomeHeader}>
        <Image
          source={require('@/assets/images/pos.png')}
          style={styles.welcomeLogo}
          resizeMode="contain"
        />
        <View style={styles.welcomeHeaderText}>
          <Text style={styles.welcomeTitle} weight="bold">
            {t('license.title')}
          </Text>
          <Text style={styles.welcomeSubtitle}>
            {t('license.licenseValidUntil')} {getExpiryDate()}
          </Text>
        </View>
        <LanguageIconButton style={styles.welcomeLanguageButton} />
      </View>
      <ScrollView style={{ flex: 1 }}>
        <View style={styles.welcomeContent}>
          {/* License Expiration Warning */}
          <TouchableOpacity onPress={signIn}>
            <Text>google</Text>
          </TouchableOpacity>
          {isAboutToExpire() && (
            <View style={styles.expirationWarning}>
              <View style={styles.warningHeader}>
                <ShieldCheck size={20} color="#F59E0B" />
                <Text style={styles.warningTitle} weight="medium">
                  {t('license.licenseExpiringSoon')}
                </Text>
              </View>
              <Text style={styles.warningMessage}>
                {t('license.licenseWillExpire')}{' '}
                {Math.ceil(
                  (new Date(
                    licenseStatus?.expiryDate
                      ? `${licenseStatus.expiryDate.slice(
                          0,
                          4
                        )}-${licenseStatus.expiryDate.slice(
                          4,
                          6
                        )}-${licenseStatus.expiryDate.slice(6, 8)}`
                      : ''
                  ).getTime() -
                    new Date().getTime()) /
                    (1000 * 3600 * 24)
                )}{' '}
                {t('analytics.days')}. {t('license.regenerateChallenge')}
              </Text>
              <TouchableOpacity
                style={styles.regenerateChallengeButton}
                onPress={() => handleRegenerateChallenge(30)}
              >
                <ShieldCheck size={16} color="#FFFFFF" />
                <Text
                  style={styles.regenerateChallengeButtonText}
                  weight="medium"
                >
                  {t('license.regenerateChallengeButton')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.welcomeCard}>
            <Image
              source={require('@/assets/images/pos.png')}
              style={styles.welcomeImage}
              resizeMode="contain"
            />
            <Text style={styles.welcomeGreeting} weight="bold">
              {t('license.welcome')}
            </Text>
            <Text style={styles.welcomeMessage}>
              {t('license.systemReady')}
            </Text>

            <TouchableOpacity
              onPress={() => router.push('/(tabs)/dashboard')}
              style={styles.getStartedButton}
            >
              <Text style={styles.getStartedButtonText} weight="medium">
                {t('license.getStarted')}
              </Text>
              <ArrowRight size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {isExpired && (
            <TouchableOpacity
              style={styles.renewButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.renewButtonText} weight="medium">
                {t('license.renewLicense')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Contact Phone Section */}
          <View style={styles.contactSection}>
            <Text style={styles.contactLabel}>
              {t('license.contactPhone')}:
            </Text>
            <Text style={styles.contactPhone} weight="bold">
              +959425743536
            </Text>
          </View>
        </View>

        <LicenseDurationModal
          visible={modalVisible}
          selectedDuration={selectedDuration}
          onDurationChange={setSelectedDuration}
          onClose={() => setModalVisible(false)}
        />

        <RegenerateWarningModal
          visible={showWarningModal}
          onClose={() => setShowWarningModal(false)}
          onProceed={handleProceedRegeneration}
        />

        <MigrationProgress visible={isMigrationInProgress} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  logo: {
    width: 50,
    height: 50,
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  verificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  verificationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  verificationCardTitle: {
    fontSize: 18,
    color: '#1F2937',
    marginLeft: 10,
  },
  verificationCardText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 20,
  },
  durationButton: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 20,
  },
  durationButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  verificationSteps: {
    marginBottom: 20,
  },
  regenerateButton: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  regenerateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },

  // Welcome screen styles (when license is valid)
  welcomeContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2563EB',
  },
  welcomeLogo: {
    width: 40,
    height: 40,
    marginRight: 12,
    // tintColor: '#FFFFFF',
  },
  welcomeHeaderText: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  welcomeSubtitle: {
    fontSize: 12,
    color: '#DBEAFE',
  },
  welcomeLanguageButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  welcomeContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeImage: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  welcomeGreeting: {
    fontSize: 24,
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
  },
  getStartedButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
  },
  getStartedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginRight: 8,
  },
  renewButton: {
    marginTop: 20,
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  renewButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },

  // Expiration Warning Styles
  expirationWarning: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    marginBottom: 16,
  },
  regenerateChallengeButton: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  regenerateChallengeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 6,
  },

  // Contact Section Styles
  contactSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  contactPhone: {
    fontSize: 16,
    color: '#2563EB',
    letterSpacing: 0.5,
  },
});
