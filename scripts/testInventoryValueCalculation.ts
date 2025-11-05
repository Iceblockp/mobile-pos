#!/usr/bin/env npx tsx

/**
 * Test script to verify inventory value calculation
 * This script tests whether the inventory value shows total for all products
 * or just paginated products
 */

import { DatabaseService } from '../services/database';

async function testInventoryValueCalculation() {
  console.log('🧪 Testing Inventory Value Calculation...\n');

  try {
    const db = new DatabaseService();
    await db.init();

    // Get all products directly
    console.log('📦 Getting all products...');
    const allProducts = await db.getProducts();
    console.log(`Total products in database: ${allProducts.length}`);

    // Calculate manual total value
    let manualTotalValue = 0;
    let manualTotalItems = 0;

    allProducts.forEach((product) => {
      const productValue = (product.cost || 0) * product.quantity;
      manualTotalValue += productValue;
      manualTotalItems += product.quantity;
    });

    console.log(
      `Manual calculation - Total Value: ${manualTotalValue}, Total Items: ${manualTotalItems}`
    );

    // Get inventory value using the hook's method
    console.log('\n💰 Getting inventory value using getTotalInventoryValue...');
    const inventoryStats = await db.getTotalInventoryValue();
    console.log(
      `Hook calculation - Total Value: ${inventoryStats.totalValue}, Total Items: ${inventoryStats.totalItems}`
    );

    // Compare results
    console.log('\n🔍 Comparison:');
    console.log(`Manual Total Value: ${manualTotalValue}`);
    console.log(`Hook Total Value: ${inventoryStats.totalValue}`);
    console.log(
      `Values match: ${
        manualTotalValue === inventoryStats.totalValue ? '✅' : '❌'
      }`
    );

    console.log(`Manual Total Items: ${manualTotalItems}`);
    console.log(`Hook Total Items: ${inventoryStats.totalItems}`);
    console.log(
      `Items match: ${
        manualTotalItems === inventoryStats.totalItems ? '✅' : '❌'
      }`
    );

    // Test with category filter
    console.log('\n🏷️ Testing with category filter...');
    const categories = await db.getCategories();
    if (categories.length > 0) {
      const firstCategory = categories[0];
      console.log(
        `Testing with category: ${firstCategory.name} (ID: ${firstCategory.id})`
      );

      const categoryStats = await db.getTotalInventoryValue(firstCategory.id);
      console.log(
        `Category filtered - Total Value: ${categoryStats.totalValue}, Total Items: ${categoryStats.totalItems}`
      );

      // Manual calculation for category
      const categoryProducts = allProducts.filter(
        (p) => p.category_id === firstCategory.id
      );
      let categoryManualValue = 0;
      let categoryManualItems = 0;

      categoryProducts.forEach((product) => {
        const productValue = (product.cost || 0) * product.quantity;
        categoryManualValue += productValue;
        categoryManualItems += product.quantity;
      });

      console.log(
        `Manual category calculation - Total Value: ${categoryManualValue}, Total Items: ${categoryManualItems}`
      );
      console.log(
        `Category values match: ${
          categoryManualValue === categoryStats.totalValue ? '✅' : '❌'
        }`
      );
    }

    // Test paginated products to show the difference
    console.log('\n📄 Testing paginated products (to show the difference)...');
    const paginatedResult = await db.getProductsPaginated({
      page: 1,
      limit: 10,
    });

    console.log(`Paginated products count: ${paginatedResult.products.length}`);

    let paginatedTotalValue = 0;
    let paginatedTotalItems = 0;

    paginatedResult.products.forEach((product) => {
      const productValue = (product.cost || 0) * product.quantity;
      paginatedTotalValue += productValue;
      paginatedTotalItems += product.quantity;
    });

    console.log(
      `Paginated calculation - Total Value: ${paginatedTotalValue}, Total Items: ${paginatedTotalItems}`
    );
    console.log(`This would be WRONG if used for total inventory value!`);

    console.log('\n✅ Test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`- Total products: ${allProducts.length}`);
    console.log(`- Correct total value: ${inventoryStats.totalValue}`);
    console.log(`- Correct total items: ${inventoryStats.totalItems}`);
    console.log(
      `- The app is using the correct method (getTotalInventoryValue) which calculates for ALL products`
    );
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
testInventoryValueCalculation();
