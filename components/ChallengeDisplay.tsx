import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { Copy, Info } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from '@/context/LocalizationContext';

interface ChallengeDisplayProps {
  challenge: string;
}

export const ChallengeDisplay = ({ challenge }: ChallengeDisplayProps) => {
  const { t } = useTranslation();

  const copyToClipboard = async () => {
    try {
      await Clipboard.setString(challenge);
      Alert.alert(t('license.copied'), t('license.challengeCodeCopied'));
    } catch (error) {
      Alert.alert(t('common.error'), t('license.failedToCopy'));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.stepNumber}>{t('license.step1')}</Text>
        <Text style={styles.title}>{t('license.copyChallengeCode')}</Text>
      </View>

      <View style={styles.challengeContainer}>
        <Text style={styles.challengeText}>{challenge}</Text>
        <TouchableOpacity style={styles.copyButton} onPress={copyToClipboard}>
          <Copy size={16} color="#FFFFFF" />
          <Text style={styles.copyText}>{t('license.copy')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.instruction}>{t('license.sendCodeToVendor')}</Text>
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
    color: '#3B82F6',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  challengeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  challengeText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#374151',
    fontWeight: '500',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  copyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  instruction: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});
