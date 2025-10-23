/**
 * Test script to verify timezone-aware queries work correctly
 */

import {
  getTimezoneAwareDateRangeForDB,
  formatTimestampForDatabase,
} from '../utils/dateUtils';

console.log('=== TIMEZONE QUERY TEST ===\n');

// Test the scenario you described
console.log('Testing sales data that should be in different business days:');

// Sales created at 20:54 on Oct 23 (after 17:30 boundary)
const sale1Time = new Date('2025-10-23T20:54:27');
const sale1Timestamp = formatTimestampForDatabase(sale1Time);
console.log('Sale 1 timestamp:', sale1Timestamp);

// Sales created at 20:41 on Oct 23 (after 17:30 boundary)
const sale2Time = new Date('2025-10-23T20:41:41');
const sale2Timestamp = formatTimestampForDatabase(sale2Time);
console.log('Sale 2 timestamp:', sale2Timestamp);

console.log('\n--- Query for Oct 23 business day ---');
const oct23Range = getTimezoneAwareDateRangeForDB(new Date('2025-10-23'), -390);
console.log('Oct 23 business day range:');
console.log('From:', oct23Range.start);
console.log('To:', oct23Range.end);

// Check if sales would be included in Oct 23 query
const sale1InOct23 =
  sale1Timestamp >= oct23Range.start && sale1Timestamp <= oct23Range.end;
const sale2InOct23 =
  sale2Timestamp >= oct23Range.start && sale2Timestamp <= oct23Range.end;

console.log(
  'Sale 1 (20:54) in Oct 23 query?',
  sale1InOct23 ? 'YES ❌ (WRONG)' : 'NO ✅ (CORRECT)'
);
console.log(
  'Sale 2 (20:41) in Oct 23 query?',
  sale2InOct23 ? 'YES ❌ (WRONG)' : 'NO ✅ (CORRECT)'
);

console.log('\n--- Query for Oct 24 business day ---');
const oct24Range = getTimezoneAwareDateRangeForDB(new Date('2025-10-24'), -390);
console.log('Oct 24 business day range:');
console.log('From:', oct24Range.start);
console.log('To:', oct24Range.end);

// Check if sales would be included in Oct 24 query
const sale1InOct24 =
  sale1Timestamp >= oct24Range.start && sale1Timestamp <= oct24Range.end;
const sale2InOct24 =
  sale2Timestamp >= oct24Range.start && sale2Timestamp <= oct24Range.end;

console.log(
  'Sale 1 (20:54) in Oct 24 query?',
  sale1InOct24 ? 'YES ✅ (CORRECT)' : 'NO ❌ (WRONG)'
);
console.log(
  'Sale 2 (20:41) in Oct 24 query?',
  sale2InOct24 ? 'YES ✅ (CORRECT)' : 'NO ❌ (WRONG)'
);

console.log('\n=== SUMMARY ===');
console.log(
  'Sales created after 17:30 on Oct 23 should appear in Oct 24 business day queries.'
);
console.log(
  'This matches your business logic where the day boundary is at 17:30.'
);

console.log('\n=== MONTHLY QUERY TEST ===');
// Test current month range
const {
  getTimezoneAwareCurrentMonthRangeForDB,
  getTimezoneAwareCurrentYearRangeForDB,
  getTimezoneAwareMonthRangeForDB,
} = require('../utils/dateUtils');

const monthRange = getTimezoneAwareCurrentMonthRangeForDB(-390);
console.log('Current month range with timezone offset:');
console.log('From:', monthRange.start);
console.log('To:', monthRange.end);

// Test specific month (October 2025)
const oct2025Range = getTimezoneAwareMonthRangeForDB(2025, 9, -390); // Month 9 = October
console.log('\nOctober 2025 range with timezone offset:');
console.log('From:', oct2025Range.start, '(Should be Sept 30 17:30)');
console.log('To:', oct2025Range.end, '(Should be Oct 31 17:30)');

console.log('\n=== YEARLY QUERY TEST ===');
const yearRange = getTimezoneAwareCurrentYearRangeForDB(-390);
console.log('Current year range with timezone offset:');
console.log('From:', yearRange.start, '(Should be Dec 31 prev year 17:30)');
console.log('To:', yearRange.end, '(Should be Dec 31 current year 17:30)');

const monthRange = getTimezoneAwareCurrentMonthRangeForDB(-390);
console.log('Current month range with timezone offset:');
console.log('From:', monthRange.start);
console.log('To:', monthRange.end);

// For October 2025, this should show:
// From: 2025-09-30 17:30:00 (Sept 30 at 17:30)
// To: 2025-10-31 17:30:00 (Oct 31 at 17:30)

console.log('\n=== TEST COMPLETE ===');
