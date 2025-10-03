import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from '@/context/LocalizationContext';

type FilterMode = 'day' | 'month' | 'range';

export interface DateFilter {
  mode: FilterMode;
  selectedDate: Date;
  selectedMonth: number;
  selectedYear: number;
  startDate: Date;
  endDate: Date;
}

interface DateFilterProps {
  dateFilter: DateFilter;
  onDateFilterChange: (filter: DateFilter) => void;
  containerStyle?: any;
}

export const DateFilterComponent: React.FC<DateFilterProps> = ({
  dateFilter,
  onDateFilterChange,
  containerStyle,
}) => {
  const { t } = useTranslation();
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>(
    'start'
  );

  const getFilterDisplayText = () => {
    const {
      mode,
      selectedDate,
      selectedMonth,
      selectedYear,
      startDate,
      endDate,
    } = dateFilter;

    switch (mode) {
      case 'day':
        return selectedDate.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
      case 'month':
        const monthNames = [
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December',
        ];
        return `${monthNames[selectedMonth]} ${selectedYear}`;
      case 'range':
        const start = startDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        const end = endDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        return `${start} - ${end}`;
      default:
        return '';
    }
  };

  const isCurrentWeek = () => {
    if (dateFilter.mode !== 'range') return false;

    const today = new Date();
    const weekStart = new Date(today);
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weekStart.setDate(today.getDate() - daysToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const filterStart = new Date(dateFilter.startDate);
    filterStart.setHours(0, 0, 0, 0);
    const filterEnd = new Date(dateFilter.endDate);
    filterEnd.setHours(0, 0, 0, 0);

    return (
      filterStart.getTime() === weekStart.getTime() &&
      filterEnd.getTime() === weekEnd.getTime()
    );
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(dateFilter.selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));

    onDateFilterChange({
      ...dateFilter,
      selectedDate: newDate,
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    let newMonth = dateFilter.selectedMonth;
    let newYear = dateFilter.selectedYear;

    if (direction === 'next') {
      newMonth += 1;
      if (newMonth > 11) {
        newMonth = 0;
        newYear += 1;
      }
    } else {
      newMonth -= 1;
      if (newMonth < 0) {
        newMonth = 11;
        newYear -= 1;
      }
    }

    onDateFilterChange({
      ...dateFilter,
      selectedMonth: newMonth,
      selectedYear: newYear,
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const currentStart = new Date(dateFilter.startDate);
    const currentEnd = new Date(dateFilter.endDate);

    const startDateOnly = new Date(
      currentStart.getFullYear(),
      currentStart.getMonth(),
      currentStart.getDate()
    );
    const endDateOnly = new Date(
      currentEnd.getFullYear(),
      currentEnd.getMonth(),
      currentEnd.getDate()
    );
    const rangeDays =
      Math.ceil(
        (endDateOnly.getTime() - startDateOnly.getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1;

    const daysToMove = direction === 'next' ? rangeDays : -rangeDays;

    const newStart = new Date(currentStart);
    newStart.setDate(currentStart.getDate() + daysToMove);
    newStart.setHours(0, 0, 0, 0);

    const newEnd = new Date(currentEnd);
    newEnd.setDate(currentEnd.getDate() + daysToMove);
    newEnd.setHours(23, 59, 59, 999);

    onDateFilterChange({
      ...dateFilter,
      startDate: newStart,
      endDate: newEnd,
    });
  };

  const handleQuickFilter = (mode: FilterMode, value?: any) => {
    const today = new Date();

    switch (mode) {
      case 'day':
        if (value === 'today') {
          onDateFilterChange({
            ...dateFilter,
            mode: 'day',
            selectedDate: today,
          });
        } else if (value === 'yesterday') {
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          onDateFilterChange({
            ...dateFilter,
            mode: 'day',
            selectedDate: yesterday,
          });
        }
        break;
      case 'month':
        if (value === 'current') {
          onDateFilterChange({
            ...dateFilter,
            mode: 'month',
            selectedMonth: today.getMonth(),
            selectedYear: today.getFullYear(),
          });
        } else if (value === 'previous') {
          const prevMonth = today.getMonth() - 1;
          const year =
            prevMonth < 0 ? today.getFullYear() - 1 : today.getFullYear();
          const month = prevMonth < 0 ? 11 : prevMonth;
          onDateFilterChange({
            ...dateFilter,
            mode: 'month',
            selectedMonth: month,
            selectedYear: year,
          });
        }
        break;
      case 'range':
        if (value === 'week') {
          const weekStart = new Date(today);
          const dayOfWeek = today.getDay();
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          weekStart.setDate(today.getDate() - daysToMonday);
          weekStart.setHours(0, 0, 0, 0);

          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          weekEnd.setHours(23, 59, 59, 999);

          onDateFilterChange({
            ...dateFilter,
            mode: 'range',
            startDate: weekStart,
            endDate: weekEnd,
          });
        } else if (value === 'last7days') {
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - 6);
          weekStart.setHours(0, 0, 0, 0);

          const weekEnd = new Date(today);
          weekEnd.setHours(23, 59, 59, 999);

          onDateFilterChange({
            ...dateFilter,
            mode: 'range',
            startDate: weekStart,
            endDate: weekEnd,
          });
        } else if (value === 'month') {
          const monthStart = new Date(today);
          monthStart.setDate(today.getDate() - 29);
          monthStart.setHours(0, 0, 0, 0);

          const monthEnd = new Date(today);
          monthEnd.setHours(23, 59, 59, 999);

          onDateFilterChange({
            ...dateFilter,
            mode: 'range',
            startDate: monthStart,
            endDate: monthEnd,
          });
        }
        break;
    }
    setShowFilterModal(false);
  };

  const getDaysInRange = () => {
    if (dateFilter.mode !== 'range') return 0;

    const startDateOnly = new Date(
      dateFilter.startDate.getFullYear(),
      dateFilter.startDate.getMonth(),
      dateFilter.startDate.getDate()
    );
    const endDateOnly = new Date(
      dateFilter.endDate.getFullYear(),
      dateFilter.endDate.getMonth(),
      dateFilter.endDate.getDate()
    );

    const diffTime = Math.abs(endDateOnly.getTime() - startDateOnly.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays + 1;
  };

  const handleNavigation = () => {
    switch (dateFilter.mode) {
      case 'day':
        return {
          prev: () => navigateDay('prev'),
          next: () => navigateDay('next'),
        };
      case 'month':
        return {
          prev: () => navigateMonth('prev'),
          next: () => navigateMonth('next'),
        };
      case 'range':
        return {
          prev: () => navigateWeek('prev'),
          next: () => navigateWeek('next'),
        };
      default:
        return { prev: () => {}, next: () => {} };
    }
  };

  const navigation = handleNavigation();

  return (
    <View style={[styles.compactPeriodSelector, containerStyle]}>
      {/* Period Row */}
      <View style={styles.periodRow}>
        <View style={styles.periodInfo}>
          <Text style={styles.periodLabel}>Period</Text>
          <View style={styles.periodValue}>
            <Text style={styles.periodValueText}>{getFilterDisplayText()}</Text>
            {dateFilter.mode === 'range' && (
              <View style={styles.periodStats}>
                <Text style={styles.periodStatsText}>
                  {getDaysInRange()} days
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.periodActions}>
          <TouchableOpacity
            style={styles.compactNavButton}
            onPress={navigation.prev}
          >
            <ChevronLeft size={16} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.compactFilterButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Calendar size={16} color="#059669" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.compactNavButton}
            onPress={navigation.next}
          >
            <ChevronRight size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Filters */}
      <View style={styles.compactQuickFilters}>
        <TouchableOpacity
          style={[
            styles.compactFilterChip,
            dateFilter.mode === 'day' &&
              dateFilter.selectedDate.toDateString() ===
                new Date().toDateString() &&
              styles.compactFilterChipActive,
          ]}
          onPress={() => handleQuickFilter('day', 'today')}
        >
          <Text
            style={[
              styles.compactFilterText,
              dateFilter.mode === 'day' &&
                dateFilter.selectedDate.toDateString() ===
                  new Date().toDateString() &&
                styles.compactFilterTextActive,
            ]}
          >
            Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.compactFilterChip,
            dateFilter.mode === 'month' &&
              dateFilter.selectedMonth === new Date().getMonth() &&
              dateFilter.selectedYear === new Date().getFullYear() &&
              styles.compactFilterChipActive,
          ]}
          onPress={() => handleQuickFilter('month', 'current')}
        >
          <Text
            style={[
              styles.compactFilterText,
              dateFilter.mode === 'month' &&
                dateFilter.selectedMonth === new Date().getMonth() &&
                dateFilter.selectedYear === new Date().getFullYear() &&
                styles.compactFilterTextActive,
            ]}
          >
            This Month
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.compactFilterChip,
            isCurrentWeek() && styles.compactFilterChipActive,
          ]}
          onPress={() => handleQuickFilter('range', 'week')}
        >
          <Text
            style={[
              styles.compactFilterText,
              isCurrentWeek() && styles.compactFilterTextActive,
            ]}
          >
            This Week
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Date Filter</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Day Section */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Day</Text>
              <Text style={styles.filterSectionDesc}>
                View analytics for a specific day
              </Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={styles.filterOption}
                  onPress={() => handleQuickFilter('day', 'today')}
                >
                  <Text style={styles.filterOptionText}>Today</Text>
                  <Text style={styles.filterOptionDate}>
                    {new Date().toLocaleDateString()}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.filterOption}
                  onPress={() => handleQuickFilter('day', 'yesterday')}
                >
                  <Text style={styles.filterOptionText}>Yesterday</Text>
                  <Text style={styles.filterOptionDate}>
                    {new Date(Date.now() - 86400000).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.filterOption}
                  onPress={() => {
                    setDatePickerMode('start');
                    setTempStartDate(dateFilter.selectedDate);
                    setShowDatePicker(true);
                  }}
                >
                  <Text style={styles.filterOptionText}>Custom Date</Text>
                  <Text style={styles.filterOptionDate}>Pick a date</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Month Section */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Month</Text>
              <Text style={styles.filterSectionDesc}>
                View analytics for an entire month
              </Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={styles.filterOption}
                  onPress={() => handleQuickFilter('month', 'current')}
                >
                  <Text style={styles.filterOptionText}>This Month</Text>
                  <Text style={styles.filterOptionDate}>
                    {new Date().toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.filterOption}
                  onPress={() => handleQuickFilter('month', 'previous')}
                >
                  <Text style={styles.filterOptionText}>Last Month</Text>
                  <Text style={styles.filterOptionDate}>
                    {new Date(
                      new Date().getFullYear(),
                      new Date().getMonth() - 1
                    ).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Month/Year Selector */}
              <View style={styles.monthYearSelector}>
                <Text style={styles.monthYearLabel}>Custom Month & Year</Text>
                <View style={styles.monthYearControls}>
                  <View style={styles.monthSelector}>
                    <Text style={styles.selectorLabel}>Month</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.monthScroll}
                    >
                      {[
                        'Jan',
                        'Feb',
                        'Mar',
                        'Apr',
                        'May',
                        'Jun',
                        'Jul',
                        'Aug',
                        'Sep',
                        'Oct',
                        'Nov',
                        'Dec',
                      ].map((month, index) => (
                        <TouchableOpacity
                          key={month}
                          style={[
                            styles.monthChip,
                            dateFilter.selectedMonth === index &&
                              styles.monthChipActive,
                          ]}
                          onPress={() => {
                            onDateFilterChange({
                              ...dateFilter,
                              mode: 'month',
                              selectedMonth: index,
                            });
                          }}
                        >
                          <Text
                            style={[
                              styles.monthChipText,
                              dateFilter.selectedMonth === index &&
                                styles.monthChipTextActive,
                            ]}
                          >
                            {month}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={styles.yearSelector}>
                    <Text style={styles.selectorLabel}>Year</Text>
                    <View style={styles.yearControls}>
                      <TouchableOpacity
                        style={styles.yearButton}
                        onPress={() => {
                          onDateFilterChange({
                            ...dateFilter,
                            selectedYear: dateFilter.selectedYear - 1,
                          });
                        }}
                      >
                        <ChevronLeft size={16} color="#6B7280" />
                      </TouchableOpacity>

                      <Text style={styles.yearText}>
                        {dateFilter.selectedYear}
                      </Text>

                      <TouchableOpacity
                        style={styles.yearButton}
                        onPress={() => {
                          onDateFilterChange({
                            ...dateFilter,
                            selectedYear: dateFilter.selectedYear + 1,
                          });
                        }}
                      >
                        <ChevronRight size={16} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Range Section */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Range</Text>
              <Text style={styles.filterSectionDesc}>
                View analytics for a custom date range
              </Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={styles.filterOption}
                  onPress={() => handleQuickFilter('range', 'week')}
                >
                  <Text style={styles.filterOptionText}>This Week</Text>
                  <Text style={styles.filterOptionDate}>Monday - Sunday</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.filterOption}
                  onPress={() => handleQuickFilter('range', 'last7days')}
                >
                  <Text style={styles.filterOptionText}>Last 7 Days</Text>
                  <Text style={styles.filterOptionDate}>Including today</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.filterOption}
                  onPress={() => handleQuickFilter('range', 'month')}
                >
                  <Text style={styles.filterOptionText}>Last 30 Days</Text>
                  <Text style={styles.filterOptionDate}>Including today</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.filterOption}
                  onPress={() => {
                    setDatePickerMode('start');
                    setTempStartDate(dateFilter.startDate);
                    setTempEndDate(dateFilter.endDate);
                    setShowDatePicker(true);
                  }}
                >
                  <Text style={styles.filterOptionText}>Custom Range</Text>
                  <Text style={styles.filterOptionDate}>
                    Pick start & end dates
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={datePickerMode === 'start' ? tempStartDate : tempEndDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            if (Platform.OS === 'android') {
              setShowDatePicker(false);
            }

            if (selectedDate) {
              if (dateFilter.mode === 'day') {
                onDateFilterChange({
                  ...dateFilter,
                  selectedDate,
                });
              } else if (dateFilter.mode === 'range') {
                if (datePickerMode === 'start') {
                  setTempStartDate(selectedDate);
                  setDatePickerMode('end');
                  if (Platform.OS === 'android') {
                    setShowDatePicker(true);
                  }
                } else {
                  const startDate = new Date(tempStartDate);
                  startDate.setHours(0, 0, 0, 0);
                  const endDate = new Date(selectedDate);
                  endDate.setHours(23, 59, 59, 999);

                  onDateFilterChange({
                    ...dateFilter,
                    mode: 'range',
                    startDate,
                    endDate,
                  });

                  if (Platform.OS === 'ios') {
                    setShowDatePicker(false);
                  }
                }
              }
            }

            if (Platform.OS === 'ios' && dateFilter.mode === 'day') {
              setShowDatePicker(false);
            }
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  compactPeriodSelector: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  periodInfo: {
    flex: 1,
  },
  periodLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 4,
  },
  periodValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodValueText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginRight: 6,
  },
  periodActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  compactFilterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  compactQuickFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  compactFilterChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  compactFilterChipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  compactFilterText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  compactFilterTextActive: {
    color: '#FFFFFF',
  },
  periodStats: {
    marginLeft: 'auto',
  },
  periodStatsText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  modalClose: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#059669',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  filterSection: {
    marginBottom: 32,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  filterSectionDesc: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 16,
  },
  filterOptions: {
    gap: 12,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  filterOptionDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  monthYearSelector: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  monthYearLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  monthYearControls: {
    gap: 20,
  },
  monthSelector: {
    gap: 8,
  },
  selectorLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  monthScroll: {
    flexDirection: 'row',
  },
  monthChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  monthChipActive: {
    backgroundColor: '#059669',
  },
  monthChipText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  monthChipTextActive: {
    color: '#FFFFFF',
  },
  yearSelector: {
    gap: 8,
  },
  yearControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  yearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    minWidth: 60,
    textAlign: 'center',
  },
});
