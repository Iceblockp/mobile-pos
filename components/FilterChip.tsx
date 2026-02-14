import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { X } from 'lucide-react-native';

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

export const FilterChip: React.FC<FilterChipProps> = ({ label, onRemove }) => {
  return (
    <View style={styles.chip}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        onPress={onRemove}
        style={styles.removeButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <X size={16} color="#6B7280" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 8,
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#374151',
  },
  removeButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
