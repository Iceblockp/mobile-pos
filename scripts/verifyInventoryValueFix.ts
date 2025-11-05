#!/usr/bin/env npx tsx

/**
 * Verify that the inventory value fix is working correctly
 */

import { DatabaseService } from '../services/database';

async function verifyFix() {
  console.log('🔍 Verifying Inventory Value Fix...\n');

  try {
    const db = new DatabaseService();
    await db.init();

    // Test 1: Get total with undefined (should include all products)
    console.log(
      '📊 Test 1: No filter (undefined) - should include ALL products'
    );
    const allProductsStats = await db.getTotalInventoryValue(undefined);
    console.log(`  Total Value: ${allProductsStats.totalValue}`);
    console.log(`  Total Items: ${allProductsStats.totalItems}`);
    console.log(`  Product Count: ${allProductsStats.productCount}`);

    // Test 2: Get total with 'All' (should be same as undefined after our fix)
    console.log('\n📊 Test 2: "All" filter - should be same as undefined');
    const allFilterStats = await db.getTotalInventoryValue('All');
    console.log(`  Total Value: ${allFilterStats.totalValue}`);
    console.log(`  Total Items: ${allFilterStats.totalItems}`);
    console.log(`  Product Count: ${allFilterStats.productCount}`);

    // Test 3: Verify they match
    console.log('\n🔍 Verification:');
    const valuesMatch =
      allProductsStats.totalValue === allFilterStats.totalValue;
    const itemsMatch =
      allProductsStats.totalItems === allFilterStats.totalItems;
    const countsMatch =
      allProductsStats.productCount === allFilterStats.productCount;

    console.log(`  Values match: ${valuesMatch ? '✅' : '❌'}`);
    console.log(`  Items match: ${itemsMatch ? '✅' : '❌'}`);
    console.log(`  Counts match: ${countsMatch ? '✅' : '❌'}`);

    if (valuesMatch && itemsMatch && countsMatch) {
      console.log('\n✅ SUCCESS: The fix is working correctly!');
      console.log(
        '   - "All" filter now correctly shows total inventory for ALL products'
      );
      console.log('   - No more pagination-based calculation errors');
    } else {
      console.log('\n❌ ISSUE: The fix is not working as expected');
    }

    // Test 4: Verify the query processes all products
    console.log('\n📦 Test 4: Manual verification');
    const allProducts = await db.getProducts();
    console.log(`  Products in database: ${allProducts.length}`);
    console.log(
      `  Products counted by query: ${allProductsStats.productCount}`
    );
    console.log(
      `  Counts match: ${
        allProducts.length === allProductsStats.productCount ? '✅' : '❌'
      }`
    );

    // Calculate manual total for verification
    let manualTotal = 0;
    let manualItems = 0;
    allProducts.forEach((product) => {
      manualTotal += (product.cost || 0) * product.quantity;
      manualItems += product.quantity;
    });

    console.log(`  Manual total value: ${manualTotal}`);
    console.log(`  Query total value: ${allProductsStats.totalValue}`);
    console.log(`  Manual total items: ${manualItems}`);
    console.log(`  Query total items: ${allProductsStats.totalItems}`);
    console.log(
      `  Manual calculation matches: ${
        manualTotal === allProductsStats.totalValue &&
        manualItems === allProductsStats.totalItems
          ? '✅'
          : '❌'
      }`
    );
  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

verifyFix();
