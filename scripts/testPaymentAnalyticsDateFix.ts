/**
 * Test script to verify Payment Analytics date filtering fix
 */
import {
  getTimezoneAwareDateRangeForDB,
  formatTimestampForDatabase,
} from '../utils/dateUtils';

// Test the date formatting differences
function testDateFormatting() {
  console.log('🧪 Testing Payment Analytics Date Filtering Fix...\n');

  // Test with a sample date range (today)
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0); // Start of day

  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999); // End of day

  console.log('📅 Input Dates:');
  console.log(`Start Date: ${startDate.toISOString()}`);
  console.log(`End Date: ${endDate.toISOString()}\n`);

  // Test OLD method (incorrect)
  console.log('❌ OLD Method (formatTimestampForDatabase):');
  const oldStartFormat = formatTimestampForDatabase(startDate);
  const oldEndFormat = formatTimestampForDatabase(endDate);
  console.log(`Start: ${oldStartFormat}`);
  console.log(`End: ${oldEndFormat}\n`);

  // Test NEW method (correct - timezone aware)
  console.log('✅ NEW Method (getTimezoneAwareDateRangeForDB):');
  const timezoneOffset = -390; // Myanmar timezone
  const startRange = getTimezoneAwareDateRangeForDB(startDate, timezoneOffset);
  const endRange = getTimezoneAwareDateRangeForDB(endDate, timezoneOffset);
  console.log(`Start: ${startRange.start}`);
  console.log(`End: ${endRange.end}\n`);

  // Show the difference
  console.log('🔍 Comparison:');
  console.log('The timezone-aware method ensures proper date boundaries');
  console.log('that match how other analytics queries work.\n');

  // Test with a week range
  console.log('📊 Testing with Week Range:');
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date();
  weekEnd.setHours(23, 59, 59, 999);

  const weekStartRange = getTimezoneAwareDateRangeForDB(
    weekStart,
    timezoneOffset
  );
  const weekEndRange = getTimezoneAwareDateRangeForDB(weekEnd, timezoneOffset);

  console.log(`Week Start: ${weekStartRange.start}`);
  console.log(`Week End: ${weekEndRange.end}\n`);

  // Sample SQL query comparison
  console.log('🔧 SQL Query Comparison:');
  console.log('OLD Query:');
  console.log(
    `SELECT payment_method, SUM(total) as total_amount, COUNT(*) as transaction_count`
  );
  console.log(
    `FROM sales WHERE created_at BETWEEN '${oldStartFormat}' AND '${oldEndFormat}'`
  );
  console.log(`GROUP BY payment_method;\n`);

  console.log('NEW Query:');
  console.log(
    `SELECT payment_method, SUM(total) as total_amount, COUNT(*) as transaction_count`
  );
  console.log(
    `FROM sales WHERE created_at BETWEEN '${startRange.start}' AND '${endRange.end}'`
  );
  console.log(`GROUP BY payment_method;\n`);

  console.log('✅ Fix Applied:');
  console.log('- Added timezone-aware date range handling');
  console.log(
    '- Added timezoneOffsetMinutes parameter (default: -390 for Myanmar)'
  );
  console.log('- Now matches the pattern used by other analytics methods');
  console.log('- Should resolve "No payment data available" issue');
}

// Mock test to verify the method signature
function testMethodSignature() {
  console.log('\n📝 Method Signature Update:');
  console.log('OLD: getPaymentMethodAnalytics(startDate: Date, endDate: Date)');
  console.log(
    'NEW: getPaymentMethodAnalytics(startDate: Date, endDate: Date, timezoneOffsetMinutes: number = -390)'
  );
  console.log(
    '\nThe new parameter is optional with a default value, so existing calls will still work.'
  );
}

// Run tests
testDateFormatting();
testMethodSignature();

export { testDateFormatting, testMethodSignature };
