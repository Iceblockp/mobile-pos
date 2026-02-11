import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';

interface DateRangePickerProps {
  visible: boolean;
  onClose: () => void;
  onApply: (startDate: Date, endDate: Date) => void;
  initialStartDate?: Date;
  initialEndDate?: Date;
  maxDate?: Date;
  minDate?: Date;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  visible,
  onClose,
  onApply,
  initialStartDate,
  initialEndDate,
  maxDate = new Date(),
  minDate,
}) => {
  const today = new Date();
  const [startDate, setStartDate] = useState<Date | null>(
    initialStartDate || today,
  );
  const [endDate, setEndDate] = useState<Date | null>(initialEndDate || today);
  const [currentMonth, setCurrentMonth] = useState(initialStartDate || today);
  const [selectingStart, setSelectingStart] = useState(true);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const handleDatePress = (day: number) => {
    const selectedDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );

    if (selectingStart) {
      setStartDate(selectedDate);
      setEndDate(null);
      setSelectingStart(false);
    } else {
      if (startDate && selectedDate < startDate) {
        setStartDate(selectedDate);
        setEndDate(startDate);
      } else {
        setEndDate(selectedDate);
      }
    }
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  const handleApply = () => {
    if (startDate && endDate) {
      onApply(startDate, endDate);
      onClose();
    } else if (startDate) {
      onApply(startDate, startDate);
      onClose();
    }
  };

  const isDateInRange = (day: number) => {
    if (!startDate || !endDate) return false;
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    return date >= startDate && date <= endDate;
  };

  const isStartDate = (day: number) => {
    if (!startDate) return false;
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    return (
      date.getDate() === startDate.getDate() &&
      date.getMonth() === startDate.getMonth() &&
      date.getFullYear() === startDate.getFullYear()
    );
  };

  const isEndDate = (day: number) => {
    if (!endDate) return false;
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    return (
      date.getDate() === endDate.getDate() &&
      date.getMonth() === endDate.getMonth() &&
      date.getFullYear() === endDate.getFullYear()
    );
  };

  const formatDateDisplay = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
    const days = [];
    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isStart = isStartDate(day);
      const isEnd = isEndDate(day);
      const inRange = isDateInRange(day);

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.dayCell,
            inRange && styles.dayCellInRange,
            (isStart || isEnd) && styles.dayCellSelected,
          ]}
          onPress={() => handleDatePress(day)}
        >
          <Text
            style={[
              styles.dayText,
              (isStart || isEnd) && styles.dayTextSelected,
            ]}
          >
            {day}
          </Text>
        </TouchableOpacity>,
      );
    }

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.weekDaysRow}>
          {weekDays.map((day) => (
            <View key={day} style={styles.weekDayCell}>
              <Text style={styles.weekDayText}>{day}</Text>
            </View>
          ))}
        </View>
        <View style={styles.daysGrid}>{days}</View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title} weight="medium">
              Select Date Range
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.dateInputsRow}>
            <TouchableOpacity
              style={[
                styles.dateInput,
                selectingStart && styles.dateInputActive,
              ]}
              onPress={() => setSelectingStart(true)}
            >
              <Text style={styles.dateInputLabel}>Start Date</Text>
              <Text style={styles.dateInputValue}>
                {formatDateDisplay(startDate) || 'Select'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dateInput,
                !selectingStart && styles.dateInputActive,
              ]}
              onPress={() => setSelectingStart(false)}
            >
              <Text style={styles.dateInputLabel}>End Date</Text>
              <Text style={styles.dateInputValue}>
                {formatDateDisplay(endDate) || 'Select'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.monthNavigator}>
            <TouchableOpacity
              onPress={handlePreviousMonth}
              style={styles.navButton}
            >
              <ChevronLeft size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.monthYearText} weight="medium">
              {currentMonth.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </Text>
            <TouchableOpacity
              onPress={handleNextMonth}
              style={styles.navButton}
            >
              <ChevronRight size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          {renderCalendar()}

          {startDate && endDate && (
            <View style={styles.selectedRangeDisplay}>
              <Text style={styles.selectedRangeText}>
                {formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.applyButton,
              (!startDate || !endDate) && styles.applyButtonDisabled,
            ]}
            onPress={handleApply}
            disabled={!startDate}
          >
            <Text style={styles.applyButtonText} weight="medium">
              Apply
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  dateInputsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  dateInput: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  dateInputActive: {
    borderColor: '#EC4899',
    backgroundColor: '#FDF2F8',
  },
  dateInputLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  dateInputValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  monthNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navButton: {
    padding: 8,
  },
  monthYearText: {
    fontSize: 18,
    color: '#111827',
  },
  calendarContainer: {
    marginBottom: 20,
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCellInRange: {
    backgroundColor: '#FDF2F8',
  },
  dayCellSelected: {
    backgroundColor: '#EC4899',
    borderRadius: 50,
  },
  dayText: {
    fontSize: 16,
    color: '#111827',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  selectedRangeDisplay: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  selectedRangeText: {
    fontSize: 14,
    color: '#6B7280',
  },
  applyButton: {
    backgroundColor: '#EC4899',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  applyButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
});
