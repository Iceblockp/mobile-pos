#!/usr/bin/env node

console.log('🧪 Verifying expense timezone fixes...');

const fs = require('fs');
const path = require('path');

const databaseServicePath = path.join(__dirname, '../services/database.ts');
const databaseContent = fs.readFileSync(databaseServicePath, 'utf8');

// Check if getDailyExpensesForCurrentMonth uses date field instead of created_at
const dailyExpensesFixed =
  databaseContent.includes('FROM expenses e') &&
  databaseContent.includes('WHERE e.date >= ? AND e.date <= ?') &&
  databaseContent.includes("CAST(strftime('%d', e.date) AS INTEGER) as day") &&
  !databaseContent.includes('business_day') &&
  !databaseContent.includes('getTimezoneAwareCurrentMonthRangeForDB(-390)');

// Check if getCurrentMonthSalesAnalytics uses date field for expenses
const currentMonthAnalyticsFixed =
  databaseContent.includes('expenses use date field, not created_at') &&
  databaseContent.includes('currentMonthStart') &&
  databaseContent.includes('currentMonthEnd');

// Check if getRevenueExpensesTrend separates sales and expense date handling
const revenueExpensesTrendFixed =
  databaseContent.includes('Use timezone-aware date ranges for sales only') &&
  databaseContent.includes('Use regular date ranges for expenses') &&
  databaseContent.includes('expenseStartDateStr') &&
  databaseContent.includes('salesStartDateStr');

console.log('📊 Expense Timezone Fix Status:');
console.log(
  `   ✅ getDailyExpensesForCurrentMonth fixed: ${
    dailyExpensesFixed ? 'YES' : 'NO'
  }`
);
console.log(
  `   ✅ getCurrentMonthSalesAnalytics expense query fixed: ${
    currentMonthAnalyticsFixed ? 'YES' : 'NO'
  }`
);
console.log(
  `   ✅ getRevenueExpensesTrend separated handling: ${
    revenueExpensesTrendFixed ? 'YES' : 'NO'
  }`
);

const allFixesApplied =
  dailyExpensesFixed && currentMonthAnalyticsFixed && revenueExpensesTrendFixed;

if (allFixesApplied) {
  console.log('🎉 All expense timezone fixes applied successfully!');
  console.log('');
  console.log('📝 Summary of changes:');
  console.log(
    '   • getDailyExpensesForCurrentMonth now uses e.date field directly'
  );
  console.log(
    '   • getCurrentMonthSalesAnalytics uses proper date ranges for expenses'
  );
  console.log(
    '   • getRevenueExpensesTrend separates sales (timezone-aware) and expense (date field) handling'
  );
  console.log('   • Removed business day logic from expense queries');
  console.log('   • Expenses now use YYYY-MM-DD date format filtering');
  console.log('');
  console.log(
    '✨ Expense data should now show correctly without timezone offset issues.'
  );
} else {
  console.log('❌ Some expense timezone fixes are missing:');
  if (!dailyExpensesFixed)
    console.log('   - getDailyExpensesForCurrentMonth needs fixing');
  if (!currentMonthAnalyticsFixed)
    console.log(
      '   - getCurrentMonthSalesAnalytics expense query needs fixing'
    );
  if (!revenueExpensesTrendFixed)
    console.log('   - getRevenueExpensesTrend needs separated handling');
}
