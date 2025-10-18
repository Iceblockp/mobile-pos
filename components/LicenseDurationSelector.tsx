import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { Clock } from 'lucide-react-native';
import { LICENSE_PACKAGES } from '@/utils/admin';

interface LicenseDurationSelectorProps {
  selectedDuration: string;
  onDurationChange: (duration: string) => void;
}

export const LicenseDurationSelector = ({
  selectedDuration,
  onDurationChange,
}: LicenseDurationSelectorProps) => {
  const durations = Object.entries(LICENSE_PACKAGES);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Clock size={20} color="#3B82F6" />
        <Text style={styles.title} weight="medium">
          Select License Duration
        </Text>
      </View>

      <View style={styles.optionsContainer}>
        {durations.map(([key, config]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.option,
              selectedDuration === key && styles.selectedOption,
            ]}
            onPress={() => onDurationChange(key)}
          >
            <View style={styles.optionContent}>
              <Text
                style={[
                  styles.optionTitle,
                  selectedDuration === key && styles.selectedOptionText,
                ]}
                weight="medium"
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

      <Text style={styles.instruction}>
        Choose your desired license duration before generating the challenge
        code
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 8,
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
  instruction: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
