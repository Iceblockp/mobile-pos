// Test the fixed export functionality
import { DataExportService } from '../services/dataExportService';
import { DatabaseService } from '../services/database';

async function testFixedExport() {
  console.log('🔧 Testing Fixed Export Functionality');

  try {
    const db = new DatabaseService();
    await db.initDatabase();

    console.log('\n📊 Checking current data in database:');

    // Check stock movements
    const stockMovements = await db.getStockMovements({}, 1, 10000);
    console.log(`Stock movements in DB: ${stockMovements.length}`);

    // Check bulk pricing
    const products = await db.getProducts();
    let totalBulkPricingTiers = 0;

    for (const product of products.slice(0, 5)) {
      // Check first 5 products
      const bulkTiers = await db.getBulkPricingForProduct(product.id);
      if (bulkTiers.length > 0) {
        console.log(
          `Product "${product.name}" has ${bulkTiers.length} bulk pricing tiers`
        );
        totalBulkPricingTiers += bulkTiers.length;
      }
    }

    console.log(`Total bulk pricing tiers found: ${totalBulkPricingTiers}`);

    console.log('\n🔄 Testing export preview:');
    const exportService = new DataExportService(db);
    const preview = await exportService.generateExportPreview();

    console.log('Export preview data counts:');
    console.log(`- stockMovements: ${preview.dataCounts.stockMovements}`);
    console.log(`- bulkPricing: ${preview.dataCounts.bulkPricing}`);
    console.log(`- Total records: ${preview.totalRecords}`);

    if (
      preview.dataCounts.stockMovements > 0 ||
      preview.dataCounts.bulkPricing > 0
    ) {
      console.log('\n✅ Data found! The fix should work.');
      console.log(
        'You can now try exporting data and it should include stockMovements and bulkPricing.'
      );
    } else {
      console.log(
        '\n❌ No data found. Please check if you actually have data in these tables.'
      );
    }
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testFixedExport().catch(console.error);
