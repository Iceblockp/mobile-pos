#!/usr/bin/env npx tsx

/**
 * Debug script to verify inventory value calculation
 * This will help us understand if the issue is with the calculation or display
 */

import { DatabaseService } from '../services/database';

async function debugInventoryValue() {
  console.log('🔍 Debugging Inventory Value Calculation...\n');

  try {
    // Initialize database
    const db = new DatabaseService();
    await db.init();

    // Get all products
    console.log('📦 Getting all products...');
    const allProducts = await db.getProducts();
    console.log(`Total products in database: ${allProducts.length}`);

    // Manual calculation
    let manualTotalValue = 0;
    let manualTotalItems = 0;
    let manualProductCount = 0;
    let manualLowStockCount = 0;

    console.log('\n📊 Manual calculation:');
    allProducts.forEach((product, index) => {
      const productValue = (product.cost || 0) * product.quantity;
      manualTotalValue += productValue;
      manualTotalItems += product.quantity;
      manualProductCount++;

      if (product.quantity <= product.min_stock) {
        manualLowStockCount++;
      }

      // Show first few products for debugging
      if (index < 5) {
        console.log(`  Product ${index + 1}: ${product.name}`);
        console.log(`    Cost: ${product.cost}, Quantity: ${product.quantity}`);
        console.log(
          `    Value: ${productValue}, Min Stock: ${product.min_stock}`
        );
        console.log(
          `    Low Stock: ${
            product.quantity <= product.min_stock ? 'Yes' : 'No'
          }`
        );
      }
    });

    console.log(`\nManual totals:`);
    console.log(`  Total Value: ${manualTotalValue}`);
    console.log(`  Total Items: ${manualTotalItems}`);
    console.log(`  Product Count: ${manualProductCount}`);
    console.log(`  Low Stock Count: ${manualLowStockCount}`);

    // Database method calculation
    console.log('\n💾 Database method calculation:');
    const inventoryStats = await db.getTotalInventoryValue();
    console.log(`Database totals:`);
    console.log(`  Total Value: ${inventoryStats.totalValue}`);
    console.log(`  Total Items: ${inventoryStats.totalItems}`);
    console.log(`  Product Count: ${inventoryStats.productCount}`);
    console.log(`  Low Stock Count: ${inventoryStats.lowStockCount}`);

    // Compare results
    console.log('\n🔍 Comparison:');
    console.log(
      `Total Value matches: ${
        manualTotalValue === inventoryStats.totalValue ? '✅' : '❌'
      }`
    );
    console.log(
      `Total Items matches: ${
        manualTotalItems === inventoryStats.totalItems ? '✅' : '❌'
      }`
    );
    console.log(
      `Product Count matches: ${
        manualProductCount === inventoryStats.productCount ? '✅' : '❌'
      }`
    );
    console.log(
      `Low Stock Count matches: ${
        manualLowStockCount === inventoryStats.lowStockCount ? '✅' : '❌'
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

      // Manual calculation for category
      const categoryProducts = allProducts.filter(
        (p) => p.category_id === firstCategory.id
      );
      let categoryManualValue = 0;
      let categoryManualItems = 0;
      let categoryManualLowStock = 0;

      categoryProducts.forEach((product) => {
        const productValue = (product.cost || 0) * product.quantity;
        categoryManualValue += productValue;
        categoryManualItems += product.quantity;
        if (product.quantity <= product.min_stock) {
          categoryManualLowStock++;
        }
      });

      console.log(`Manual category calculation:`);
      console.log(`  Products in category: ${categoryProducts.length}`);
      console.log(`  Total Value: ${categoryManualValue}`);
      console.log(`  Total Items: ${categoryManualItems}`);
      console.log(`  Low Stock Count: ${categoryManualLowStock}`);

      // Database calculation for category
      const categoryStats = await db.getTotalInventoryValue(firstCategory.id);
      console.log(`Database category calculation:`);
      console.log(`  Product Count: ${categoryStats.productCount}`);
      console.log(`  Total Value: ${categoryStats.totalValue}`);
      console.log(`  Total Items: ${categoryStats.totalItems}`);
      console.log(`  Low Stock Count: ${categoryStats.lowStockCount}`);

      console.log(
        `Category values match: ${
          categoryManualValue === categoryStats.totalValue ? '✅' : '❌'
        }`
      );
      console.log(
        `Category items match: ${
          categoryManualItems === categoryStats.totalItems ? '✅' : '❌'
        }`
      );
    }

    // Test pagination to show the difference
    console.log('\n📄 Testing pagination (this should be different):');
    const paginatedResult = await db.getProductsPaginated({
      page: 1,
      limit: 100,
    });

    console.log(
      `Paginated products: ${paginatedResult.products.length} of ${
        paginatedResult.total || 'unknown'
      }`
    );

    let paginatedValue = 0;
    let paginatedItems = 0;

    paginatedResult.products.forEach((product) => {
      const productValue = (product.cost || 0) * product.quantity;
      paginatedValue += productValue;
      paginatedItems += product.quantity;
    });

    console.log(`Paginated calculation (WRONG for total inventory):`);
    console.log(`  Total Value: ${paginatedValue}`);
    console.log(`  Total Items: ${paginatedItems}`);

    console.log('\n📋 Summary:');
    if (
      manualTotalValue === inventoryStats.totalValue &&
      manualTotalItems === inventoryStats.totalItems
    ) {
      console.log('✅ The database method is working correctly!');
      console.log(
        '✅ The inventory value calculation includes ALL products, not just paginated ones.'
      );
      console.log('📱 If the UI shows incorrect values, the issue might be:');
      console.log('   1. Caching issue in React Query');
      console.log('   2. Category filter being applied incorrectly');
      console.log('   3. UI displaying wrong data source');
    } else {
      console.log('❌ There is an issue with the database calculation method!');
    }
  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

// Run the debug
debugInventoryValue();
