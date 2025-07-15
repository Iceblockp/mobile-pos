import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Shield, ShieldCheck, Calendar, RefreshCw } from 'lucide-react-native';
import { LICENSE_PACKAGES } from '@/utils/admin';

interface LicenseCardProps {
  isLicensed: boolean;
  expiryDate: string | null;
  onRegenerate: (validityMonths: number) => void;
  loading?: boolean;
  selectedDuration: string;
  onDurationChange: (duration: string) => void;
  onSelectDuration: () => void;
  isExpired: boolean;
}

export const LicenseCard = ({
  isLicensed,
  expiryDate,
  onRegenerate,
  loading,
  selectedDuration,
  onDurationChange,
  onSelectDuration,
  isExpired,
}: LicenseCardProps) => {
  const handleRegenerate = () => {
    const validityMonths =
      LICENSE_PACKAGES[selectedDuration]?.validityMonths || 1;
    onRegenerate(validityMonths);
  };

  // Only show regenerate button if not licensed or if licensed but expired
  const showRegenerateButton = !isLicensed || (isLicensed && isExpired);

  return (
    <View
      style={[
        styles.card,
        isLicensed ? styles.licensedCard : styles.unlicensedCard,
      ]}
    >
      <View style={styles.header}>
        {isLicensed ? (
          <ShieldCheck size={24} color="#10B981" />
        ) : (
          <Shield size={24} color="#F59E0B" />
        )}
        <Text
          style={[
            styles.status,
            isLicensed ? styles.licensedText : styles.unlicensedText,
          ]}
        >
          {isLicensed ? 'Licensed' : 'Unlicensed'}
        </Text>
      </View>

      <View style={styles.content}>
        {isLicensed ? (
          <View style={styles.infoRow}>
            <Calendar size={16} color="#6B7280" />
            <Text style={styles.infoText}>
              Expires: {expiryDate || 'Unknown'}
            </Text>
          </View>
        ) : (
          <Text style={styles.unlicensedInfo}>
            Your POS application requires license verification to access all
            features.
          </Text>
        )}
      </View>

      {showRegenerateButton && (
        <View style={styles.buttonRow}>
          {!isLicensed && (
            <TouchableOpacity
              style={styles.selectDurationButton}
              onPress={onSelectDuration}
            >
              <Text style={styles.selectDurationText}>Select Duration</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.regenerateButton, loading && styles.disabledButton]}
            onPress={handleRegenerate}
            disabled={loading}
          >
            <RefreshCw size={16} color="#FFFFFF" />
            <Text style={styles.regenerateText}>
              {loading ? 'Generating...' : 'Generate New Challenge'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  licensedCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  unlicensedCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  status: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  licensedText: {
    color: '#10B981',
  },
  unlicensedText: {
    color: '#F59E0B',
  },
  content: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
  },
  unlicensedInfo: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectDurationButton: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3B82F6',
    marginRight: 8,
  },
  selectDurationText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  regenerateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    padding: 10,
    borderRadius: 6,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  regenerateText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
