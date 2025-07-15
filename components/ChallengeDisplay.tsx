import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Copy, Info } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

interface ChallengeDisplayProps {
  challenge: string;
}

export const ChallengeDisplay = ({ challenge }: ChallengeDisplayProps) => {
  const copyToClipboard = async () => {
    try {
      await Clipboard.setString(challenge);
      Alert.alert('Copied!', 'Challenge code copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.stepNumber}>Step 1</Text>
        <Text style={styles.title}>Copy Challenge Code</Text>
      </View>

      <View style={styles.challengeContainer}>
        <Text style={styles.challengeText}>{challenge}</Text>
        <TouchableOpacity style={styles.copyButton} onPress={copyToClipboard}>
          <Copy size={16} color="#FFFFFF" />
          <Text style={styles.copyText}>Copy</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.instruction}>
        Send this code to the vendor to receive your license key
      </Text>
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
