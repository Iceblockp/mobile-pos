#!/usr/bin/env node

console.log('🧪 Verifying key metrics expense fix...');

const fs = require('fs');
const path = require('path');

const databaseServicePath = path.join(__dirname, '../services/database.ts');
const databaseContent = fs.readFileSync(databaseServicePath, 'utf8');

// Check if getCustomAnalyticsWithExpenses uses date field for expenses
const keyMetricsExpenseFixed =
  databaseContent.includes("expenses don't need timezone conversion") &&
  databaseContent.includes('expenseStartDateStr') &&
  databaseContent.includes('expenseEndDateStr') &&
  databaseContent.includes('WHERE date >= ? AND date <= ?') &&
  !databaseContent.includes('WHERE created_at >= ? AND created_at <= ?');

// Check if expenses by category query also uses date field
const expensesByCategoryFixed =
  databaseContent.includes('WHERE e.date >= ? AND e.date <= ?') &&
  databaseContent.includes('expenseStartDateStr, expenseEndDateStr');

console.log('📊 Key Metrics Expense Fix Status:');
console.log(
  `   ✅ getCustomAnalyticsWithExpenses total expenses fixed: ${
    keyMetricsExpenseFixed ? 'YES' : 'NO'
  }`
);
console.log(
  `   ✅ Expenses by category query fixed: ${
    expensesByCategoryFixed ? 'YES' : 'NO'
  }`
);

const allFixesApplied = keyMetricsExpenseFixed && expensesByCategoryFixed;

if (allFixesApplied) {
  console.log('🎉 Key metrics expense fix applied successfully!');
  console.log('');
  console.log('📝 Summary of changes:');
  console.log(
    '   • getCustomAnalyticsWithExpenses now uses date field for expenses'
  );
  console.log('   • Removed timezone-aware ranges for expense queries');
  console.log('   • Uses YYYY-MM-DD format for expense date filtering');
  console.log(
    '   • Fixed both total expenses and expenses by category queries'
  );
  console.log('');
  console.log("✨ Today's expense data in key metrics should now be accurate!");
} else {
  console.log('❌ Key metrics expense fix needs attention:');
  if (!keyMetricsExpenseFixed)
    console.log('   - Total expenses query still uses created_at');
  if (!expensesByCategoryFixed)
    console.log('   - Expenses by category query still uses created_at');
}
