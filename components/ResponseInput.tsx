import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Key, Check } from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';

interface ResponseInputProps {
  onVerify: (response: string) => Promise<boolean>;
  verifying: boolean;
}

export const ResponseInput = ({ onVerify, verifying }: ResponseInputProps) => {
  const { t } = useTranslation();
  const [response, setResponse] = useState('');

  const handleVerify = async () => {
    if (!response.trim()) {
      Alert.alert(t('common.error'), t('license.enterResponseCodeError'));
      return;
    }

    const isValid = await onVerify(response.trim());

    if (isValid) {
      Alert.alert(t('common.success'), t('license.licenseVerifiedSuccess'));
      setResponse('');
    } else {
      Alert.alert(t('license.invalidCode'), t('license.invalidCodeMessage'));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.stepNumber}>{t('license.step2')}</Text>
        <Text style={styles.title}>{t('license.enterResponseCode')}</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder={t('license.enterResponsePlaceholder')}
        value={response}
        onChangeText={setResponse}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={16}
      />

      <TouchableOpacity
        style={[styles.verifyButton, verifying && styles.verifyButtonDisabled]}
        onPress={handleVerify}
        disabled={verifying}
      >
        <Check size={16} color="#FFFFFF" />
        <Text style={styles.verifyButtonText}>
          {verifying ? t('license.verifying') : t('license.verifyLicense')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    marginBottom: 12,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'monospace',
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
  },
  verifyButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
