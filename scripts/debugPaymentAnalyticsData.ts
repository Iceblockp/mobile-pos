/**
 * Debug script to test payment analytics data directly
 */
import { databaseService } from '../services/database';
import { getTimezoneAwareDateRangeForDB } from '../utils/dateUtils';

async function debugPaymentAnalyticsData() {
  console.log('🔍 Debugging Payment Analytics Data...\n');

  try {
    // Test 1: Check if there are any sales in the database
    console.log('1. Checking for sales data...');
    const allSalesQuery = 'SELECT COUNT(*) as count FROM sales';
    const salesCount = await databaseService.db.getFirstAsync(allSalesQuery);
    console.log(`Total sales in database: ${salesCount?.count || 0}\n`);

    if (!salesCount?.count || salesCount.count === 0) {
      console.log(
        '❌ No sales found in database. This explains why payment analytics is empty.\n'
      );
      return;
    }

    // Test 2: Check sales with payment methods
    console.log('2. Checking sales with payment methods...');
    const salesWithPaymentQuery = `
      SELECT payment_method, COUNT(*) as count, SUM(total) as total_amount
      FROM sales 
      GROUP BY payment_method
    `;
    const salesByPayment = await databaseService.db.getAllAsync(
      salesWithPaymentQuery
    );
    console.log('Sales by payment method (all time):');
    salesByPayment.forEach((row: any) => {
      console.log(
        `  ${row.payment_method}: ${row.count} sales, ${row.total_amount} total`
      );
    });
    console.log('');

    // Test 3: Check date ranges
    console.log('3. Testing date range filtering...');
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    console.log(
      `Date range: ${weekAgo.toISOString()} to ${today.toISOString()}`
    );

    // Test with old method (formatTimestampForDatabase)
    console.log('\n3a. Testing with old date formatting:');
    const oldQuery = `
      SELECT payment_method, COUNT(*) as count, SUM(total) as total_amount
      FROM sales 
      WHERE created_at BETWEEN ? AND ?
      GROUP BY payment_method
    `;

    // Simulate old formatting (this might be the issue)
    const oldStartFormat = weekAgo.toISOString();
    const oldEndFormat = today.toISOString();

    const oldResults = await databaseService.db.getAllAsync(oldQuery, [
      oldStartFormat,
      oldEndFormat,
    ]);
    console.log(
      `Old method results: ${oldResults.length} payment methods found`
    );
    oldResults.forEach((row: any) => {
      console.log(
        `  ${row.payment_method}: ${row.count} sales, ${row.total_amount} total`
      );
    });

    // Test with new method (timezone-aware)
    console.log('\n3b. Testing with new timezone-aware formatting:');
    const timezoneOffset = -390; // Myanmar timezone
    const startRange = getTimezoneAwareDateRangeForDB(weekAgo, timezoneOffset);
    const endRange = getTimezoneAwareDateRangeForDB(today, timezoneOffset);

    console.log(`Timezone-aware range: ${startRange.start} to ${endRange.end}`);

    const newResults = await databaseService.db.getAllAsync(oldQuery, [
      startRange.start,
      endRange.end,
    ]);
    console.log(
      `New method results: ${newResults.length} payment methods found`
    );
    newResults.forEach((row: any) => {
      console.log(
        `  ${row.payment_method}: ${row.count} sales, ${row.total_amount} total`
      );
    });

    // Test 4: Test the actual getPaymentMethodAnalytics method
    console.log('\n4. Testing getPaymentMethodAnalytics method directly...');
    const analyticsResults = await databaseService.getPaymentMethodAnalytics(
      weekAgo,
      today
    );
    console.log(
      `Analytics method results: ${analyticsResults.length} payment methods found`
    );
    analyticsResults.forEach((item) => {
      console.log(
        `  ${item.payment_method}: ${item.transaction_count} transactions, ${item.total_amount} total`
      );
    });

    // Test 5: Check recent sales timestamps
    console.log('\n5. Checking recent sales timestamps...');
    const recentSalesQuery = `
      SELECT id, payment_method, total, created_at
      FROM sales 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    const recentSales = await databaseService.db.getAllAsync(recentSalesQuery);
    console.log('Recent sales:');
    recentSales.forEach((sale: any) => {
      console.log(
        `  ${sale.created_at}: ${sale.payment_method} - ${sale.total}`
      );
    });

    console.log('\n✅ Debug complete!');
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Export for testing
export { debugPaymentAnalyticsData };

// Run if executed directly
if (require.main === module) {
  debugPaymentAnalyticsData().catch(console.error);
}
