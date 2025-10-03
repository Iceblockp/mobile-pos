import { useState, useMemo } from 'react';
import {
  DateFilter,
  DateRange,
  getDateRangeFromFilter,
} from '@/components/AnalyticsDateFilter';

export const useAnalyticsDateFilter = (
  initialMode: 'day' | 'month' | 'range' = 'day'
) => {
  // Initialize with today as default
  const initialDate = useMemo(() => new Date(), []);

  const [dateFilter, setDateFilter] = useState<DateFilter>(() => ({
    mode: initialMode,
    selectedDate: initialDate,
    selectedMonth: initialDate.getMonth(),
    selectedYear: initialDate.getFullYear(),
    startDate: initialDate,
    endDate: initialDate,
  }));

  // Calculate date range based on filter mode
  const dateRange: DateRange = useMemo(() => {
    return getDateRangeFromFilter(dateFilter);
  }, [dateFilter]);

  // Helper function to get days in period
  const getDaysInPeriod = () => {
    if (dateFilter.mode === 'day') return 1;

    let startDate, endDate;
    if (dateFilter.mode === 'month') {
      startDate = new Date(
        dateFilter.selectedYear,
        dateFilter.selectedMonth,
        1
      );
      endDate = new Date(
        dateFilter.selectedYear,
        dateFilter.selectedMonth + 1,
        0
      );
    } else {
      startDate = dateFilter.startDate;
      endDate = dateFilter.endDate;
    }

    // Calculate days by comparing just the date parts (ignore time)
    const startDateOnly = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate()
    );
    const endDateOnly = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate()
    );

    const diffTime = Math.abs(endDateOnly.getTime() - startDateOnly.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Add 1 to include both start and end dates
    return diffDays + 1;
  };

  return {
    dateFilter,
    setDateFilter,
    dateRange,
    getDaysInPeriod,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    limit: dateRange.limit,
  };
};
