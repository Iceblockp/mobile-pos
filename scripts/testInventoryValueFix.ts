#!/usr/bin/env npx tsx

/**
 * Test script to verify the inventory value fix
 * This tests that 'All' category filter is correctly converted to undefined
 */

import { DatabaseService } from '../services/database';

async function testInventoryValueFix() {
  console.log('🧪 Testing Inventory Value Fix...\n');

  try {
    const db = new DatabaseService();
    await db.init();

    // Test 1: Get inventory value with no filter (undefined)
    console.log('📊 Test 1: No filter (undefined)');
    const noFilterStats = await db.getTotalInventoryValue(undefined);
    console.log(`Total Value: ${noFilterStats.totalValue}`);
    console.log(`Total Items: ${noFilterStats.totalItems}`);
    console.log(`Product Count: ${noFilterStats.productCount}`);

    // Test 2: Get inventory value with 'All' filter (should be same as undefined)
    console.log('\n📊 Test 2: "All" filter (should be same as undefined)');
    const allFilterStats = await db.getTotalInventoryValue('All');
    console.log(`Total Value: ${allFilterStats.totalValue}`);
    console.log(`Total Items: ${allFilterStats.totalItems}`);
    console.log(`Product Count: ${allFilterStats.productCount}`);

    // Test 3: Compare results
    console.log('\n🔍 Comparison:');
    const valuesMatch = noFilterStats.totalValue === allFilterStats.totalValue;
    const itemsMatch = noFilterStats.totalItems === allFilterStats.totalItems;
    const countsMatch =
      noFilterStats.productCount === allFilterStats.productCount;

    console.log(`Total Values match: ${valuesMatch ? '✅' : '❌'}`);
    console.log(`Total Items match: ${itemsMatch ? '✅' : '❌'}`);
    console.log(`Product Counts match: ${countsMatch ? '✅' : '❌'}`);

    if (valuesMatch && itemsMatch && countsMatch) {
      console.log(
        '\n✅ SUCCESS: The database method correctly handles "All" filter!'
      );
    } else {
      console.log(
        '\n❌ ISSUE: The database method does not handle "All" filter correctly!'
      );
    }

    // Test 4: Test with a specific category
    const categories = await db.getCategories();
    if (categories.length > 0) {
      const firstCategory = categories[0];
      console.log(
        `\n📊 Test 4: Specific category filter (${firstCategory.name})`
      );
      const categoryStats = await db.getTotalInventoryValue(firstCategory.id);
      console.log(`Total Value: ${categoryStats.totalValue}`);
      console.log(`Total Items: ${categoryStats.totalItems}`);
      console.log(`Product Count: ${categoryStats.productCount}`);

      // This should be different from the "All" results
      const isDifferent =
        categoryStats.totalValue !== noFilterStats.totalValue ||
        categoryStats.totalItems !== noFilterStats.totalItems ||
        categoryStats.productCount !== noFilterStats.productCount;

      console.log(
        `Category filter gives different results: ${isDifferent ? '✅' : '❌'}`
      );
    }

    console.log('\n📋 Summary:');
    console.log('The fix ensures that:');
    console.log(
      '1. When categoryFilter is "All", it gets converted to undefined'
    );
    console.log('2. undefined filter returns total inventory for ALL products');
    console.log('3. Specific category filters return filtered results');
    console.log(
      '\nThis should fix the issue where "All" category was not showing total inventory value.'
    );
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
testInventoryValueFix();
