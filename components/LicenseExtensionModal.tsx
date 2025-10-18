import React, { useState } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { X, ShieldCheck } from 'lucide-react-native';
import { useLicense } from '@/hooks/useLicense';
import { useTranslation } from '@/context/LocalizationContext';
import { LICENSE_PACKAGES } from '@/utils/admin';
import { ChallengeDisplay } from '@/components/ChallengeDisplay';
import { ResponseInput } from '@/components/ResponseInput';

interface LicenseExtensionModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LicenseExtensionModal: React.FC<LicenseExtensionModalProps> = ({
  visible,
  onClose,
}) => {
  const { t } = useTranslation();
  const {
    licenseStatus,
    loading,
    verifying,
    extendLicense,
    generateExtensionChallenge,
    getExpiryDate,
  } = useLicense();

  const [selectedDuration, setSelectedDuration] = useState('trial');
  const [step, setStep] = useState<'select' | 'challenge' | 'success'>(
    'select'
  );

  const handleGenerateChallenge = async () => {
    const validityMonths =
      LICENSE_PACKAGES[selectedDuration]?.validityMonths || 1;
    await generateExtensionChallenge(validityMonths);
    setStep('challenge');
  };

  const handleExtendLicense = async (
    responseCode: string
  ): Promise<boolean> => {
    const validityMonths =
      LICENSE_PACKAGES[selectedDuration]?.validityMonths || 1;
    const success = await extendLicense(validityMonths, responseCode);

    if (success) {
      setStep('success');
      Alert.alert(
        t('common.success'),
        t('license.licenseExtendedSuccessfully'),
        [
          {
            text: t('common.done'),
            onPress: () => {
              setStep('select');
              onClose();
            },
          },
        ]
      );
    } else {
      Alert.alert(t('common.error'), t('license.licenseExtensionFailed'));
    }

    return success;
  };

  const handleClose = () => {
    setStep('select');
    onClose();
  };

  const calculateNewExpiryDate = () => {
    if (!licenseStatus?.expiryDate) return null;

    const currentExpiryString = licenseStatus.expiryDate;
    const year = parseInt(currentExpiryString.substring(0, 4));
    const month = parseInt(currentExpiryString.substring(4, 6));
    const day = parseInt(currentExpiryString.substring(6, 8));

    let currentExpiry: Date;
    if (currentExpiryString.length === 14) {
      const hour = parseInt(currentExpiryString.substring(8, 10));
      const minute = parseInt(currentExpiryString.substring(10, 12));
      const second = parseInt(currentExpiryString.substring(12, 14));
      currentExpiry = new Date(year, month - 1, day, hour, minute, second);
    } else {
      currentExpiry = new Date(year, month - 1, day);
    }

    const extensionMonths =
      LICENSE_PACKAGES[selectedDuration]?.validityMonths || 1;
    const newExpiry = new Date(currentExpiry);
    newExpiry.setMonth(newExpiry.getMonth() + extensionMonths);

    return newExpiry.toLocaleDateString();
  };

  const renderDurationSelection = () => (
    <ScrollView style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title} weight="bold">
          {t('license.licenseExtension')}
        </Text>
        <Text style={styles.subtitle}>
          {t('license.selectExtensionDuration')}
        </Text>
      </View>

      <View style={styles.durationList}>
        {Object.entries(LICENSE_PACKAGES).map(([key, pkg]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.durationOption,
              selectedDuration === key && styles.selectedDuration,
            ]}
            onPress={() => setSelectedDuration(key)}
          >
            <View style={styles.durationInfo}>
              <Text style={styles.durationTitle} weight="medium">
                {pkg.description}
              </Text>
              <Text style={styles.durationMonths}>
                {pkg.validityMonths}{' '}
                {pkg.validityMonths === 1
                  ? t('license.month')
                  : t('license.months')}
              </Text>
            </View>
            <View
              style={[
                styles.radioButton,
                selectedDuration === key && styles.radioButtonSelected,
              ]}
            >
              {selectedDuration === key && (
                <View style={styles.radioButtonInner} />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.extensionInfo}>
        <Text style={styles.extensionInfoTitle} weight="medium">
          {t('license.extensionWillBeAdded')}
        </Text>
        <View style={styles.dateInfo}>
          <Text style={styles.dateLabel}>
            {t('license.licenseValidUntil')}: {getExpiryDate()}
          </Text>
          <Text style={styles.dateLabel}>
            {t('license.newExpiryDate')}: {calculateNewExpiryDate()}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.generateButton}
        onPress={handleGenerateChallenge}
        disabled={loading}
      >
        <ShieldCheck size={20} color="#FFFFFF" />
        <Text style={styles.generateButtonText} weight="medium">
          {loading
            ? t('license.generating')
            : t('license.generateExtensionChallenge')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderChallengeStep = () => (
    <ScrollView style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title} weight="bold">
          {t('license.licenseExtension')}
        </Text>
        <Text style={styles.subtitle}>
          {LICENSE_PACKAGES[selectedDuration]?.description}
        </Text>
      </View>

      {licenseStatus?.challenge && (
        <View style={styles.challengeSection}>
          <ChallengeDisplay challenge={licenseStatus.challenge.fullChallenge} />
          <ResponseInput onVerify={handleExtendLicense} verifying={verifying} />
        </View>
      )}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setStep('select')}
      >
        <Text style={styles.backButtonText} weight="medium">
          {t('common.back')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.modalHeader}>
          <View style={styles.placeholder} />
          <Text style={styles.modalTitle} weight="medium">
            {t('license.licenseExtension')}
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        {step === 'select' && renderDurationSelection()}
        {step === 'challenge' && renderChallengeStep()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  placeholder: {
    width: 24,
  },
  modalTitle: {
    fontSize: 18,
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  durationList: {
    marginBottom: 24,
  },
  durationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  selectedDuration: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  durationInfo: {
    flex: 1,
  },
  durationTitle: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
  },
  durationMonths: {
    fontSize: 14,
    color: '#6B7280',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#2563EB',
  },
  radioButtonInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  extensionInfo: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  extensionInfoTitle: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
  },
  dateInfo: {
    gap: 8,
  },
  dateLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  generateButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  challengeSection: {
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#6B7280',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});
