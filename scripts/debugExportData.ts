// Simple debug script to check export data
import * as SQLite from 'expo-sqlite';

async function debugExportData() {
  console.log('🔍 Debugging Export Data - Stock Movements and Bulk Pricing');

  try {
    // Open database directly
    const db = SQLite.openDatabaseSync('pos.db');

    // Check database tables directly
    console.log('\n🗃️ Direct Database Check:');

    // Check stock_movements table
    const stockMovementCount = db.getFirstSync(
      'SELECT COUNT(*) as count FROM stock_movements'
    ) as { count: number };
    console.log(
      `Direct count from stock_movements table: ${stockMovementCount.count}`
    );

    // Check bulk_pricing table
    const bulkPricingCount = db.getFirstSync(
      'SELECT COUNT(*) as count FROM bulk_pricing'
    ) as { count: number };
    console.log(
      `Direct count from bulk_pricing table: ${bulkPricingCount.count}`
    );

    // Show sample records
    if (stockMovementCount.count > 0) {
      const sampleStockMovement = db.getFirstSync(
        'SELECT * FROM stock_movements LIMIT 1'
      );
      console.log(
        'Sample stock movement from DB:',
        JSON.stringify(sampleStockMovement, null, 2)
      );

      // Get all stock movements
      const allStockMovements = db.getAllSync('SELECT * FROM stock_movements');
      console.log(
        `All stock movements (${allStockMovements.length}):`,
        allStockMovements
      );
    }

    if (bulkPricingCount.count > 0) {
      const sampleBulkPricing = db.getFirstSync(
        'SELECT * FROM bulk_pricing LIMIT 1'
      );
      console.log(
        'Sample bulk pricing from DB:',
        JSON.stringify(sampleBulkPricing, null, 2)
      );

      // Get all bulk pricing
      const allBulkPricing = db.getAllSync('SELECT * FROM bulk_pricing');
      console.log(
        `All bulk pricing (${allBulkPricing.length}):`,
        allBulkPricing
      );
    }

    // Check if tables exist
    const tables = db.getAllSync(
      "SELECT name FROM sqlite_master WHERE type='table' AND (name='stock_movements' OR name='bulk_pricing')"
    );
    console.log('Tables found:', tables);
  } catch (error) {
    console.error('Error during debug:', error);
  }
}

// Run the debug
debugExportData().catch(console.error);
