import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from '@/context/LocalizationContext';

type FilterMode = 'day' | 'month' | 'year';

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
  const [activeTab, setActiveTab] = useState<FilterMode>('day');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  const getFilterDisplayText = () => {
    const { mode, selectedDate, selectedMonth, selectedYear } = dateFilter;

    switch (mode) {
      case 'day':
        const isToday =
          selectedDate.toDateString() === new Date().toDateString();
        if (isToday) return 'Today';
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
        const isCurrentMonth =
          selectedMonth === new Date().getMonth() &&
          selectedYear === new Date().getFullYear();
        if (isCurrentMonth) return 'This Month';
        return `${monthNames[selectedMonth]} ${selectedYear}`;
      case 'year':
        const isCurrentYear = selectedYear === new Date().getFullYear();
        if (isCurrentYear) return 'This Year';
        return selectedYear.toString();
      default:
        return '';
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const { mode } = dateFilter;

    if (mode === 'day') {
      const newDate = new Date(dateFilter.selectedDate);
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
      onDateFilterChange({ ...dateFilter, selectedDate: newDate });
    } else if (mode === 'month') {
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
    } else if (mode === 'year') {
      const newYear = dateFilter.selectedYear + (direction === 'next' ? 1 : -1);
      onDateFilterChange({ ...dateFilter, selectedYear: newYear });
    }
  };

  const handleQuickFilter = (mode: FilterMode, value?: string) => {
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
      case 'year':
        if (value === 'current') {
          onDateFilterChange({
            ...dateFilter,
            mode: 'year',
            selectedYear: today.getFullYear(),
          });
        } else if (value === 'previous') {
          onDateFilterChange({
            ...dateFilter,
            mode: 'year',
            selectedYear: today.getFullYear() - 1,
          });
        }
        break;
    }
    setShowFilterModal(false);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.periodInfo}>
          <Text style={styles.periodLabel} weight="medium">
            Period
          </Text>
          <Text style={styles.periodValue} weight="medium">
            {getFilterDisplayText()}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateDate('prev')}
          >
            <ChevronLeft size={16} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Calendar size={16} color="#059669" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateDate('next')}
          >
            <ChevronRight size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Filters */}
      <View style={styles.quickFilters}>
        <TouchableOpacity
          style={[
            styles.quickFilterChip,
            dateFilter.mode === 'day' &&
              dateFilter.selectedDate.toDateString() ===
                new Date().toDateString() &&
              styles.quickFilterChipActive,
          ]}
          onPress={() => handleQuickFilter('day', 'today')}
        >
          <Text
            style={[
              styles.quickFilterText,
              dateFilter.mode === 'day' &&
                dateFilter.selectedDate.toDateString() ===
                  new Date().toDateString() &&
                styles.quickFilterTextActive,
            ]}
          >
            Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.quickFilterChip,
            dateFilter.mode === 'month' &&
              dateFilter.selectedMonth === new Date().getMonth() &&
              dateFilter.selectedYear === new Date().getFullYear() &&
              styles.quickFilterChipActive,
          ]}
          onPress={() => handleQuickFilter('month', 'current')}
        >
          <Text
            style={[
              styles.quickFilterText,
              dateFilter.mode === 'month' &&
                dateFilter.selectedMonth === new Date().getMonth() &&
                dateFilter.selectedYear === new Date().getFullYear() &&
                styles.quickFilterTextActive,
            ]}
          >
            This Month
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.quickFilterChip,
            dateFilter.mode === 'year' &&
              dateFilter.selectedYear === new Date().getFullYear() &&
              styles.quickFilterChipActive,
          ]}
          onPress={() => handleQuickFilter('year', 'current')}
        >
          <Text
            style={[
              styles.quickFilterText,
              dateFilter.mode === 'year' &&
                dateFilter.selectedYear === new Date().getFullYear() &&
                styles.quickFilterTextActive,
            ]}
          >
            This Year
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
            <Text style={styles.modalTitle} weight="medium">
              Select Period
            </Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Text style={styles.modalClose} weight="medium">
                Done
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            {(['day', 'month', 'year'] as FilterMode[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.activeTabText,
                  ]}
                  weight="medium"
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Day Tab */}
            {activeTab === 'day' && (
              <View style={styles.tabContent}>
                <View style={styles.quickOptions}>
                  <TouchableOpacity
                    style={styles.quickOption}
                    onPress={() => handleQuickFilter('day', 'today')}
                  >
                    <Text style={styles.quickOptionText} weight="medium">
                      Today
                    </Text>
                    <Text style={styles.quickOptionDate}>
                      {new Date().toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickOption}
                    onPress={() => handleQuickFilter('day', 'yesterday')}
                  >
                    <Text style={styles.quickOptionText} weight="medium">
                      Yesterday
                    </Text>
                    <Text style={styles.quickOptionDate}>
                      {new Date(Date.now() - 86400000).toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle} weight="medium">
                  Custom Date
                </Text>
                <TouchableOpacity
                  style={styles.customDateButton}
                  onPress={() => {
                    setTempDate(dateFilter.selectedDate);
                    setShowDatePicker(true);
                  }}
                >
                  <Calendar size={20} color="#059669" />
                  <Text style={styles.customDateText} weight="medium">
                    Pick a specific date
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Month Tab */}
            {activeTab === 'month' && (
              <View style={styles.tabContent}>
                <View style={styles.quickOptions}>
                  <TouchableOpacity
                    style={styles.quickOption}
                    onPress={() => handleQuickFilter('month', 'current')}
                  >
                    <Text style={styles.quickOptionText} weight="medium">
                      This Month
                    </Text>
                    <Text style={styles.quickOptionDate}>
                      {new Date().toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickOption}
                    onPress={() => handleQuickFilter('month', 'previous')}
                  >
                    <Text style={styles.quickOptionText} weight="medium">
                      Last Month
                    </Text>
                    <Text style={styles.quickOptionDate}>
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

                <Text style={styles.sectionTitle} weight="medium">
                  Custom Month & Year
                </Text>
                <View style={styles.monthYearPicker}>
                  <View style={styles.yearPicker}>
                    <Text style={styles.pickerLabel} weight="medium">
                      Year
                    </Text>
                    <View style={styles.yearControls}>
                      <TouchableOpacity
                        style={styles.yearButton}
                        onPress={() =>
                          onDateFilterChange({
                            ...dateFilter,
                            selectedYear: dateFilter.selectedYear - 1,
                          })
                        }
                      >
                        <ChevronLeft size={16} color="#6B7280" />
                      </TouchableOpacity>
                      <Text style={styles.yearText} weight="bold">
                        {dateFilter.selectedYear}
                      </Text>
                      <TouchableOpacity
                        style={styles.yearButton}
                        onPress={() =>
                          onDateFilterChange({
                            ...dateFilter,
                            selectedYear: dateFilter.selectedYear + 1,
                          })
                        }
                      >
                        <ChevronRight size={16} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.monthGrid}>
                    <Text style={styles.pickerLabel} weight="medium">
                      Month
                    </Text>
                    <View style={styles.monthButtons}>
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
                            styles.monthButton,
                            dateFilter.selectedMonth === index &&
                              styles.monthButtonActive,
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
                              styles.monthButtonText,
                              dateFilter.selectedMonth === index &&
                                styles.monthButtonTextActive,
                            ]}
                            weight="medium"
                          >
                            {month}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Year Tab */}
            {activeTab === 'year' && (
              <View style={styles.tabContent}>
                <View style={styles.quickOptions}>
                  <TouchableOpacity
                    style={styles.quickOption}
                    onPress={() => handleQuickFilter('year', 'current')}
                  >
                    <Text style={styles.quickOptionText} weight="medium">
                      This Year
                    </Text>
                    <Text style={styles.quickOptionDate}>
                      {new Date().getFullYear()}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickOption}
                    onPress={() => handleQuickFilter('year', 'previous')}
                  >
                    <Text style={styles.quickOptionText} weight="medium">
                      Last Year
                    </Text>
                    <Text style={styles.quickOptionDate}>
                      {new Date().getFullYear() - 1}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle} weight="medium">
                  Custom Year
                </Text>
                <View style={styles.yearSelector}>
                  <TouchableOpacity
                    style={styles.yearNavButton}
                    onPress={() =>
                      onDateFilterChange({
                        ...dateFilter,
                        selectedYear: dateFilter.selectedYear - 1,
                      })
                    }
                  >
                    <ChevronLeft size={20} color="#6B7280" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.yearDisplay}
                    onPress={() => {
                      onDateFilterChange({ ...dateFilter, mode: 'year' });
                      setShowFilterModal(false);
                    }}
                  >
                    <Text style={styles.yearDisplayText} weight="bold">
                      {dateFilter.selectedYear}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.yearNavButton}
                    onPress={() =>
                      onDateFilterChange({
                        ...dateFilter,
                        selectedYear: dateFilter.selectedYear + 1,
                      })
                    }
                  >
                    <ChevronRight size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.yearGrid}>
                  {Array.from({ length: 12 }, (_, i) => {
                    const year = dateFilter.selectedYear - 5 + i;
                    return (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.yearGridButton,
                          dateFilter.selectedYear === year &&
                            styles.yearGridButtonActive,
                        ]}
                        onPress={() => {
                          onDateFilterChange({
                            ...dateFilter,
                            mode: 'year',
                            selectedYear: year,
                          });
                        }}
                      >
                        <Text
                          style={[
                            styles.yearGridButtonText,
                            dateFilter.selectedYear === year &&
                              styles.yearGridButtonTextActive,
                          ]}
                          weight="medium"
                        >
                          {year}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
        {/* Date Picker for iOS */}
        {showDatePicker && Platform.OS === 'ios' && (
          <Modal
            visible={showDatePicker}
            animationType="slide"
            presentationStyle="pageSheet"
          >
            <View style={styles.datePickerModal}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerCancel} weight="medium">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle} weight="medium">
                  Select Date
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    onDateFilterChange({
                      ...dateFilter,
                      mode: 'day',
                      selectedDate: tempDate,
                    });
                    setShowDatePicker(false);
                    setShowFilterModal(false);
                  }}
                >
                  <Text style={styles.datePickerDone} weight="medium">
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerContent}>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) setTempDate(selectedDate);
                  }}
                />
              </View>
            </View>
          </Modal>
        )}
        {/* Date Picker for Android */}
        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                onDateFilterChange({
                  ...dateFilter,
                  mode: 'day',
                  selectedDate,
                });
                setShowFilterModal(false);
              }
            }}
          />
        )}
      </Modal>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
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
  headerRow: {
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
    color: '#6B7280',
    marginBottom: 4,
  },
  periodValue: {
    fontSize: 16,
    color: '#111827',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  quickFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  quickFilterChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickFilterChipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  quickFilterText: {
    fontSize: 12,
    color: '#6B7280',
  },
  quickFilterTextActive: {
    color: '#FFFFFF',
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
    color: '#111827',
  },
  modalClose: {
    fontSize: 16,
    color: '#059669',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#059669',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  tabContent: {
    gap: 24,
  },
  quickOptions: {
    gap: 12,
  },
  quickOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickOptionText: {
    fontSize: 16,
    color: '#111827',
  },
  quickOptionDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
  },
  customDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  customDateText: {
    fontSize: 16,
    color: '#111827',
  },
  monthYearPicker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 20,
  },
  yearPicker: {
    gap: 8,
  },
  pickerLabel: {
    fontSize: 14,
    color: '#374151',
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
    color: '#111827',
    minWidth: 60,
    textAlign: 'center',
  },
  monthGrid: {
    gap: 8,
  },
  monthButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  monthButtonActive: {
    backgroundColor: '#059669',
  },
  monthButtonText: {
    fontSize: 13,
    color: '#6B7280',
  },
  monthButtonTextActive: {
    color: '#FFFFFF',
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 20,
  },
  yearNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearDisplay: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  yearDisplayText: {
    fontSize: 24,
    color: '#059669',
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  yearGridButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 80,
    alignItems: 'center',
  },
  yearGridButtonActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  yearGridButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  yearGridButtonTextActive: {
    color: '#FFFFFF',
  },
  datePickerModal: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  datePickerTitle: {
    fontSize: 18,
    color: '#111827',
  },
  datePickerCancel: {
    fontSize: 16,
    color: '#6B7280',
  },
  datePickerDone: {
    fontSize: 16,
    color: '#059669',
  },
  datePickerContent: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
  },
});
