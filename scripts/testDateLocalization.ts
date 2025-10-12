/**
 * Test script to verify date localization functionality
 */

import {
  formatSaleDateTime,
  getLocalizedMonths,
  getLocalizedDays,
} from '../utils/dateFormatters';

// Test dates
const testDates = [
  new Date('2025-10-12T09:15:00'), // Morning
  new Date('2025-10-12T12:00:00'), // Noon
  new Date('2025-10-12T14:30:00'), // Afternoon
  new Date('2025-10-12T23:45:00'), // Night
  new Date('2025-01-01T00:00:00'), // New Year midnight
];

console.log('=== Date Localization Test ===\n');

testDates.forEach((date, index) => {
  console.log(`Test Date ${index + 1}: ${date.toISOString()}`);
  console.log(`English: ${formatSaleDateTime(date, 'en')}`);
  console.log(`Myanmar: ${formatSaleDateTime(date, 'my')}`);
  console.log('---');
});

console.log('\n=== Month Names ===');
console.log('English months:', getLocalizedMonths('en').join(', '));
console.log('Myanmar months:', getLocalizedMonths('my').join(', '));

console.log('\n=== Day Names ===');
console.log('English days:', getLocalizedDays('en').join(', '));
console.log('Myanmar days:', getLocalizedDays('my').join(', '));

console.log('\n✅ Date localization test completed successfully!');
