import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ViewStyle,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, Clock } from 'lucide-react-native';
import { useTranslation, useLocalization } from '@/context/LocalizationContext';
import { formatSaleDateTime } from '@/utils/dateFormatters';

interface SaleDateTimeSelectorProps {
  selectedDateTime: Date;
  onDateTimeChange: (date: Date) => void;
  style?: ViewStyle;
}

export const SaleDateTimeSelector: React.FC<SaleDateTimeSelectorProps> = ({
  selectedDateTime,
  onDateTimeChange,
  style,
}) => {
  const { t } = useTranslation();
  const { language } = useLocalization();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(selectedDateTime);

  // Update temp date when selectedDateTime changes
  useEffect(() => {
    setTempDate(selectedDateTime);
  }, [selectedDateTime]);

  const formatDateTime = (date: Date): string => {
    return formatSaleDateTime(date, language);
  };

  const handleDateTimePress = () => {
    if (Platform.OS === 'ios') {
      // On iOS, show date picker first
      setShowDatePicker(true);
    } else {
      // On Android, show date picker first
      setShowDatePicker(true);
    }
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      const newDate = new Date(selectedDate);
      // Preserve the time from the current selection
      newDate.setHours(tempDate.getHours());
      newDate.setMinutes(tempDate.getMinutes());
      setTempDate(newDate);

      if (Platform.OS === 'android') {
        // On Android, show time picker after date selection
        setShowTimePicker(true);
      } else {
        // On iOS, update immediately
        onDateTimeChange(newDate);
      }
    }
  };

  const handleTimeChange = (_event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (selectedTime) {
      const newDate = new Date(tempDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setTempDate(newDate);
      onDateTimeChange(newDate);
    }
  };

  const handleIOSDateTimeChange = (_event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempDate(selectedDate);
      onDateTimeChange(selectedDate);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.dateTimeButton}
        onPress={handleDateTimePress}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Calendar size={14} color="#6B7280" />
          <Clock size={14} color="#6B7280" />
        </View>
        <Text style={styles.dateTimeText}>
          {formatDateTime(selectedDateTime)}
        </Text>
      </TouchableOpacity>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'compact' : 'default'}
          onChange={
            Platform.OS === 'ios' ? handleIOSDateTimeChange : handleDateChange
          }
          maximumDate={new Date()} // Prevent future dates
        />
      )}

      {/* Time Picker (Android only - iOS uses datetime mode) */}
      {showTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={tempDate}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}

      {/* iOS uses a single datetime picker */}
      {Platform.OS === 'ios' && showDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="datetime"
          display="compact"
          onChange={handleIOSDateTimeChange}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
    gap: 2,
  },
  dateTimeText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
});
