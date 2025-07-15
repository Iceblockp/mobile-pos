import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import React, { useState } from 'react';
import { useLicense } from '@/hooks/useLicense';
import { LicenseCard } from '@/components/LicenseCard';
import { ChallengeDisplay } from '@/components/ChallengeDisplay';
import { ResponseInput } from '@/components/ResponseInput';
import { LicenseDurationModal } from '@/components/LicenseDurationModal';
import { isLicenseExpired } from '@/utils/crypto';
import { ShieldCheck, ArrowRight } from 'lucide-react-native';
import { LICENSE_PACKAGES } from '@/utils/admin';
import { router } from 'expo-router';

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

  console.log('Index component - loading:', loading);
  console.log('Index component - licenseStatus:', licenseStatus);

  const [selectedDuration, setSelectedDuration] = useState('trial');
  const [modalVisible, setModalVisible] = useState(false);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Initializing license system...</Text>
      </View>
    );
  }

  const isValid = isLicenseValid();
  const isExpired = licenseStatus?.expiryDate
    ? isLicenseExpired(licenseStatus.expiryDate)
    : true;

  if (!isValid) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <View style={styles.verificationHeader}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Mobile POS</Text>
            <Text style={styles.subtitle}>License Verification Required</Text>
          </View>
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.verificationCard}>
            <View style={styles.verificationCardHeader}>
              <ShieldCheck size={24} color="#3B82F6" />
              <Text style={styles.verificationCardTitle}>
                Verify Your License
              </Text>
            </View>

            <Text style={styles.verificationCardText}>
              To access all features of Mobile POS, please verify your license
              using the steps below.
            </Text>

            <TouchableOpacity
              style={styles.durationButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.durationButtonText}>
                Select License Duration:{' '}
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
              <Text style={styles.regenerateButtonText}>
                {loading ? 'Generating...' : 'Generate New Challenge'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

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
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      <View style={styles.welcomeHeader}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.welcomeLogo}
          resizeMode="contain"
        />
        <View>
          <Text style={styles.welcomeTitle}>Mobile POS</Text>
          <Text style={styles.welcomeSubtitle}>
            License valid until {getExpiryDate()}
          </Text>
        </View>
      </View>

      <View style={styles.welcomeContent}>
        <View style={styles.welcomeCard}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.welcomeImage}
            resizeMode="contain"
          />
          <Text style={styles.welcomeGreeting}>Welcome to Mobile POS!</Text>
          <Text style={styles.welcomeMessage}>
            Your point-of-sale system is ready to use. Get started with your
            business operations.
          </Text>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/dashboard')}
            style={styles.getStartedButton}
          >
            <Text style={styles.getStartedButtonText}>Get Started</Text>
            <ArrowRight size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {isExpired && (
          <TouchableOpacity
            style={styles.renewButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.renewButtonText}>Renew License</Text>
          </TouchableOpacity>
        )}
      </View>

      <LicenseDurationModal
        visible={modalVisible}
        selectedDuration={selectedDuration}
        onDurationChange={setSelectedDuration}
        onClose={() => setModalVisible(false)}
      />
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
    fontWeight: '700',
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
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 10,
  },
  verificationCardText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
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
    fontWeight: '600',
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
    tintColor: '#FFFFFF',
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  welcomeSubtitle: {
    fontSize: 12,
    color: '#DBEAFE',
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
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
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
    fontWeight: '600',
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
    fontWeight: '600',
  },
});
