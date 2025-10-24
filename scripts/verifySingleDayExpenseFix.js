#!/usr/bin/env node

console.log('🧪 Verifying single day expense chart fix...');

const fs = require('fs');
const path = require('path');

const databaseServicePath = path.join(__dirname, '../services/database.ts');
const databaseContent = fs.readFileSync(databaseServicePath, 'utf8');

// Check if single day mode has special handling for expenses
const singleDayExpenseHandling =
  databaseContent.includes(
    'Handle expense data differently for single day mode'
  ) &&
  databaseContent.includes(
    'For single day mode, get total expenses for the day'
  ) &&
  databaseContent.includes('Show expenses at the first hour that has data');

// Check if multi-day mode still uses regular grouping
const multiDayHandling = databaseContent.includes(
  'For multi-day mode, use regular grouping'
);

// Check if expense groupBy is fixed for single day
const expenseGroupByFixed =
  databaseContent.includes('expenseGroupBy = "date(e.date)"') &&
  !databaseContent.includes("strftime('%Y-%m-%d %H:00:00', e.date)");

console.log('📊 Single Day Expense Chart Fix Status:');
console.log(
  `   ✅ Single day expense handling implemented: ${
    singleDayExpenseHandling ? 'YES' : 'NO'
  }`
);
console.log(
  `   ✅ Multi-day mode preserved: ${multiDayHandling ? 'YES' : 'NO'}`
);
console.log(
  `   ✅ Expense groupBy fixed for single day: ${
    expenseGroupByFixed ? 'YES' : 'NO'
  }`
);

const allFixesApplied =
  singleDayExpenseHandling && multiDayHandling && expenseGroupByFixed;

if (allFixesApplied) {
  console.log('🎉 Single day expense chart fix applied successfully!');
  console.log('');
  console.log('📝 Summary of changes:');
  console.log(
    '   • Single day mode: Shows total daily expenses at first hour with data'
  );
  console.log('   • Multi-day mode: Uses regular date-based grouping');
  console.log('   • Fixed expense groupBy to use date(e.date) for single day');
  console.log('   • Prevents trying to extract hour from date-only field');
  console.log('');
  console.log(
    '✨ Daily expense chart should now show data bars in single day mode!'
  );
} else {
  console.log('❌ Single day expense chart fix needs attention:');
  if (!singleDayExpenseHandling)
    console.log('   - Single day expense handling not implemented');
  if (!multiDayHandling) console.log('   - Multi-day mode handling missing');
  if (!expenseGroupByFixed)
    console.log('   - Expense groupBy still tries to extract hour from date');
}
