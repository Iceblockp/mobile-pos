/**
 * Debug script to check why Dashboard and Analytics Daily Sales Charts show different data
 */

import {
  getTimezoneAwareCurrentMonthRangeForDB,
  getCurrentMonthRangeForDB,
} from '../utils/dateUtils';

console.log('=== DAILY SALES CHART DEBUG ===\n');

// Check current month ranges
console.log('Regular current month range:');
const regularRange = getCurrentMonthRangeForDB();
console.log('From:', regularRange.start);
console.log('To:', regularRange.end);

console.log('\nTimezone-aware current month range (-6:30):');
const timezoneRange = getTimezoneAwareCurrentMonthRangeForDB(-390);
console.log('From:', timezoneRange.start);
console.log('To:', timezoneRange.end);

// Check what days should be included
const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

console.log('\nCalendar month days:');
console.log('Start of month:', startOfMonth.toISOString());
console.log('End of month:', endOfMonth.toISOString());

// Generate all days in the current month
const allDays: string[] = [];
const currentDate = new Date(startOfMonth);
while (currentDate <= endOfMonth) {
  allDays.push(currentDate.getDate().toString());
  currentDate.setDate(currentDate.getDate() + 1);
}

console.log('\nAll calendar days in month:', allDays.join(', '));

console.log('\n=== ISSUE ANALYSIS ===');
console.log('Dashboard uses: getDailySalesForCurrentMonth()');
console.log('- Query range: timezone-aware (Sept 30 17:30 to Oct 31 17:30)');
console.log('- Labels: calendar month days (1, 2, 3, ..., 31)');
console.log('- Data grouping: business day with timezone offset');
console.log('');
console.log('Analytics uses: useRevenueExpensesTrend() with date filter');
console.log(
  '- Query range: user-selected date range with timezone-aware conversion'
);
console.log('- Labels: based on selected date range');
console.log('- Data grouping: timezone-aware trend analysis');
console.log('');
console.log('POTENTIAL ISSUE:');
console.log(
  'The timezone-aware query might be including data from previous month'
);
console.log(
  "that gets mapped to days that don't exist in current month labels."
);

console.log('\n=== DEBUG COMPLETE ===');
