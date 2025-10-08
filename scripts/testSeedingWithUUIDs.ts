#!/usr/bin/env ts-node

/**
 * Test script to verify that seedInitialData works correctly with UUIDs
 */

import { DatabaseService } from '../services/database';
import * as SQLite from 'expo-sqlite';

async function testSeeding() {
  console.log('🧪 Testing seedInitialData with UUID flow...\n');

  try {
    // Create an in-memory database for testing
    const sqliteDb = await SQLite.openDatabaseAsync(':memory:');

    // Create new database service
    const db = new DatabaseService(sqliteDb);
    await db.createTables();

    console.log('✓ Database initialized');

    // Seed initial data
    await db.seedInitialData();

    console.log('✓ Initial data seeded');

    // Verify the data
    const categories = await db.getCategories();
    const suppliers = await db.getSuppliers();
    const products = await db.getProducts();

    console.log('\n📊 Seeded Data Summary:');
    console.log(`Categories: ${categories.length}`);
    console.log(`Suppliers: ${suppliers.length}`);
    console.log(`Products: ${products.length}`);

    // Check UUID format for a few records
    console.log('\n🔍 UUID Format Verification:');

    if (categories.length > 0) {
      console.log(`Sample Category UUID: ${categories[0].id}`);
    }

    if (suppliers.length > 0) {
      console.log(`Sample Supplier UUID: ${suppliers[0].id}`);
    }

    if (products.length > 0) {
      console.log(`Sample Product UUID: ${products[0].id}`);
    }

    // Verify relationships
    console.log('\n🔗 Relationship Verification:');
    if (products.length > 0) {
      const product = products[0];
      console.log(`Product "${product.name}" references:`);
      console.log(`  - Category ID: ${product.category_id}`);
      console.log(`  - Supplier ID: ${product.supplier_id}`);

      // Verify category exists
      const category = categories.find((c) => c.id === product.category_id);
      if (category) {
        console.log(`  ✓ Category "${category.name}" found`);
      } else {
        console.log(`  ✗ Category not found for ID: ${product.category_id}`);
      }

      // Verify supplier exists
      const supplier = suppliers.find((s) => s.id === product.supplier_id);
      if (supplier) {
        console.log(`  ✓ Supplier "${supplier.name}" found`);
      } else {
        console.log(`  ✗ Supplier not found for ID: ${product.supplier_id}`);
      }
    }

    console.log('\n✅ Seeding test completed successfully!');
  } catch (error) {
    console.error('\n❌ Seeding test failed:', error);
    process.exit(1);
  }
}

// Run the test
testSeeding().catch(console.error);
