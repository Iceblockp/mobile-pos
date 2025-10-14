// Debug actual export by adding logging to the export service
import { DataExportService } from '../services/dataExportService';
import { DatabaseService } from '../services/database';

async function debugActualExport() {
  console.log('🔍 Debugging Actual Export Process');

  try {
    const db = new DatabaseService();
    await db.initDatabase();

    console.log('\n📦 Testing individual database calls:');

    // Test getStockMovements directly
    console.log('Calling getStockMovements...');
    const stockMovements = await db.getStockMovements({}, 1, 10000);
    console.log(`getStockMovements returned: ${stockMovements.length} records`);
    if (stockMovements.length > 0) {
      console.log(
        'First stock movement:',
        JSON.stringify(stockMovements[0], null, 2)
      );
    }

    // Test getProducts and getBulkPricingForProduct
    console.log('\nCalling getProducts...');
    const products = await db.getProducts();
    console.log(`getProducts returned: ${products.length} records`);

    if (products.length > 0) {
      console.log('Testing getBulkPricingForProduct for first few products...');
      for (let i = 0; i < Math.min(3, products.length); i++) {
        const product = products[i];
        console.log(`\nTesting product: ${product.name} (ID: ${product.id})`);
        const bulkTiers = await db.getBulkPricingForProduct(product.id);
        console.log(`  Bulk pricing tiers: ${bulkTiers.length}`);
        if (bulkTiers.length > 0) {
          console.log('  First tier:', JSON.stringify(bulkTiers[0], null, 2));
        }
      }
    }

    console.log('\n🔄 Now testing the actual export service...');
    const exportService = new DataExportService(db);

    // Add progress tracking
    exportService.onProgress((progress) => {
      console.log(
        `Export progress: ${progress.stage} - ${progress.percentage.toFixed(
          1
        )}%`
      );
    });

    console.log('Starting export...');
    const result = await exportService.exportAllData();

    console.log('\n📊 Export Result:');
    console.log(`Success: ${result.success}`);
    console.log(`Record Count: ${result.recordCount}`);
    console.log(`Empty Export: ${result.emptyExport}`);
    if (result.error) {
      console.log(`Error: ${result.error}`);
    }

    // Check the actual file content if export was successful
    if (result.success && result.fileUri) {
      console.log('\n📄 Checking export file content...');
      const fs = require('fs');
      const path = require('path');

      // For Expo, the file might be in a different location
      console.log(`File URI: ${result.fileUri}`);

      try {
        // Try to read the file content
        const content = fs.readFileSync(
          result.fileUri.replace('file://', ''),
          'utf8'
        );
        const data = JSON.parse(content);

        console.log('Export file data counts:');
        console.log(
          `- stockMovements: ${data.data.stockMovements?.length || 0}`
        );
        console.log(`- bulkPricing: ${data.data.bulkPricing?.length || 0}`);

        if (data.data.stockMovements?.length > 0) {
          console.log(
            'First stock movement in export:',
            JSON.stringify(data.data.stockMovements[0], null, 2)
          );
        }

        if (data.data.bulkPricing?.length > 0) {
          console.log(
            'First bulk pricing in export:',
            JSON.stringify(data.data.bulkPricing[0], null, 2)
          );
        }
      } catch (fileError) {
        console.log('Could not read export file:', fileError.message);
      }
    }
  } catch (error) {
    console.error('Error during debug:', error);
  }
}

debugActualExport().catch(console.error);
