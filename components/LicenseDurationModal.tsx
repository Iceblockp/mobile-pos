import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Clock, X } from 'lucide-react-native';
import { LICENSE_PACKAGES } from '@/utils/admin';

interface LicenseDurationModalProps {
  visible: boolean;
  selectedDuration: string;
  onDurationChange: (duration: string) => void;
  onClose: () => void;
}

export const LicenseDurationModal = ({
  visible,
  selectedDuration,
  onDurationChange,
  onClose,
}: LicenseDurationModalProps) => {
  const durations = Object.entries(LICENSE_PACKAGES);

  const handleSelect = (key: string) => {
    onDurationChange(key);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <Clock size={20} color="#3B82F6" />
              <Text style={styles.title}>Select License Duration</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsContainer}>
            {durations.map(([key, config]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.option,
                  selectedDuration === key && styles.selectedOption,
                ]}
                onPress={() => handleSelect(key)}
              >
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionTitle,
                      selectedDuration === key && styles.selectedOptionText,
                    ]}
                  >
                    {config.description}
                  </Text>
                  <Text
                    style={[
                      styles.optionSubtitle,
                      selectedDuration === key && styles.selectedOptionSubtext,
                    ]}
                  >
                    {config.validityMonths} month
                    {config.validityMonths !== 1 ? 's' : ''}
                  </Text>
                </View>
                {selectedDuration === key && (
                  <View style={styles.selectedIndicator} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  optionsContainer: {
    marginBottom: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedOption: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  selectedOptionText: {
    color: '#2563EB',
  },
  selectedOptionSubtext: {
    color: '#3B82F6',
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
});
