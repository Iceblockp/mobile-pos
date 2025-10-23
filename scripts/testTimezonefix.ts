/**
 * Test script to verify timezone fix for sales queries
 * This script tests that date filtering works correctly with timezone offset
 */

import {
  formatTimestampForDatabase,
  getTodayRangeForDB,
  getCurrentMonthRangeForDB,
  getDateRangeForDB,
  getTimezoneAwareTodayRangeForDB,
  getTimezoneAwareDateRangeForDB,
  getTimezoneAwareCurrentMonthRangeForDB,
} from '../utils/dateUtils';

console.log('=== TIMEZONE FIX TEST ===\n');

// Test current time formatting
const now = new Date();
console.log('Current local time:', now.toString());
console.log('Current UTC time:', now.toISOString());
console.log('Database format (local):', formatTimestampForDatabase(now));
console.log();

// Simulate the timezone issue scenario
console.log('=== TIMEZONE ISSUE SIMULATION ===');
console.log('Your timezone: -6:30 (390 minutes behind UTC)');
console.log('Scenario: Sale created at 23:30 local time');

const saleTime = new Date();
saleTime.setHours(23, 30, 0, 0);

console.log('Sale time (local):', saleTime.toString());
console.log('Stored in DB as:', formatTimestampForDatabase(saleTime));
console.log();

// OLD WAY (BROKEN) - Regular today range
const oldQueryRange = getTodayRangeForDB();
console.log('OLD WAY - Regular today range:');
console.log('From:', oldQueryRange.start);
console.log('To:', oldQueryRange.end);

const saleTimestamp = formatTimestampForDatabase(saleTime);
const oldIncluded =
  saleTimestamp >= oldQueryRange.start && saleTimestamp <= oldQueryRange.end;
console.log('Would 23:30 sale be included?', oldIncluded ? 'YES ✅' : 'NO ❌');
console.log();

// NEW WAY (FIXED) - Timezone-aware today range
const newQueryRange = getTimezoneAwareTodayRangeForDB(-390); // -6:30 offset
console.log('NEW WAY - Timezone-aware today range (-6:30 offset):');
console.log('From:', newQueryRange.start);
console.log('To:', newQueryRange.end);

const newIncluded =
  saleTimestamp >= newQueryRange.start && saleTimestamp <= newQueryRange.end;
console.log('Would 23:30 sale be included?', newIncluded ? 'YES ✅' : 'NO ❌');
console.log();

// Test specific date query
console.log('=== SPECIFIC DATE QUERY TEST ===');
const testDate = new Date('2025-10-23'); // October 23, 2025
console.log('Querying for date:', testDate.toDateString());

const oldDateRange = getDateRangeForDB(testDate);
console.log('OLD WAY - Regular date range (includes all 23rd data):');
console.log('From:', oldDateRange.start);
console.log('To:', oldDateRange.end);

const newDateRange = getTimezoneAwareDateRangeForDB(testDate, -390);
console.log('NEW WAY - Timezone-aware date range (22nd 17:30 to 23rd 17:30):');
console.log('From:', newDateRange.start);
console.log('To:', newDateRange.end);
console.log();

// Test current month query
console.log('=== CURRENT MONTH QUERY TEST ===');
const oldMonthRange = getCurrentMonthRangeForDB();
console.log('OLD WAY - Regular month range:');
console.log('From:', oldMonthRange.start);
console.log('To:', oldMonthRange.end);

const newMonthRange = getTimezoneAwareCurrentMonthRangeForDB(-390);
console.log('NEW WAY - Timezone-aware month range:');
console.log('From:', newMonthRange.start);
console.log('To:', newMonthRange.end);

console.log('\n=== EXPLANATION ===');
console.log('With -6:30 timezone offset:');
console.log('- Sales created at 23:30 local time are stored as 23:30 in DB');
console.log(
  '- Your local "day" actually spans from 17:30 to 17:30 of the next calendar day'
);
console.log(
  '- When querying for "23rd" data, we query from 22nd 17:30 to 23rd 17:30'
);
console.log(
  '- This matches your business day cycle and excludes data after 17:30 on the 23rd'
);

console.log('\n=== TEST COMPLETE ===');
