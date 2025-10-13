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
  useTranslation();
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
    // Only for Android - show date picker first
    setShowDatePicker(true);
  };

  console.log('datetime', selectedDateTime);

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
      {/* Android: Button to trigger date/time picker */}
      {Platform.OS === 'android' && (
        <TouchableOpacity
          style={styles.dateTimeButton}
          onPress={handleDateTimePress}
          activeOpacity={0.7}
        >
          <Text style={styles.dateTimeText}>
            {formatDateTime(selectedDateTime)}
          </Text>
        </TouchableOpacity>
      )}

      {/* iOS: Always show datetime picker directly */}
      {Platform.OS === 'ios' && (
        <DateTimePicker
          value={tempDate}
          mode="datetime"
          display="compact"
          onChange={handleIOSDateTimeChange}
          maximumDate={new Date()}
        />
      )}

      {/* Android: Separate date and time pickers */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()} // Prevent future dates
        />
      )}

      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker
          value={tempDate}
          mode="time"
          display="default"
          onChange={handleTimeChange}
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
