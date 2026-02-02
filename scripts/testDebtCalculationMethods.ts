/**
 * Test script for debt calculation methods in DatabaseService
 * Tests the three new methods: getCustomerDebtBalance, getCustomersWithDebt, updateSalePaymentMethod
 */

import * as SQLite from 'expo-sqlite';
import { DatabaseService } from '../services/database';
import { generateUUID } from '../utils/uuid';

async function testDebtCalculationMethods() {
  console.log('🧪 Testing Debt Calculation Methods...\n');

  // Open test database
  const db = await SQLite.openDatabaseAsync(':memory:');
  const dbService = new DatabaseService(db);

  try {
    // Initialize database
    console.log('📦 Setting up test database...');
    await dbService.createTables();

    // Create test category
    const categoryId = generateUUID();
    await db.runAsync('INSERT INTO categories (id, name) VALUES (?, ?)', [
      categoryId,
      'Test Category',
    ]);

    // Create test product
    const productId = generateUUID();
    await db.runAsync(
      'INSERT INTO products (id, name, category_id, price, cost, quantity, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [productId, 'Test Product', categoryId, 100, 50, 10, 5]
    );

    // Create test customers
    const customer1Id = generateUUID();
    const customer2Id = generateUUID();
    const customer3Id = generateUUID();

    await db.runAsync(
      'INSERT INTO customers (id, name, phone) VALUES (?, ?, ?)',
      [customer1Id, 'Customer With Debt', '123-456-7890']
    );
    await db.runAsync(
      'INSERT INTO customers (id, name, phone) VALUES (?, ?, ?)',
      [customer2Id, 'Customer No Debt', '098-765-4321']
    );
    await db.runAsync(
      'INSERT INTO customers (id, name, phone) VALUES (?, ?, ?)',
      [customer3Id, 'Customer Mixed', '555-555-5555']
    );

    console.log('✅ Test data created\n');

    // Test 1: Create debt sales
    console.log('📝 Test 1: Creating debt sales...');
    const debtSale1Id = generateUUID();
    const debtSale2Id = generateUUID();
    const cashSaleId = generateUUID();
    const mixedDebtSaleId = generateUUID();

    await db.runAsync(
      'INSERT INTO sales (id, total, payment_method, customer_id, created_at) VALUES (?, ?, ?, ?, ?)',
      [debtSale1Id, 500, 'Debt', customer1Id, new Date().toISOString()]
    );
    await db.runAsync(
      'INSERT INTO sales (id, total, payment_method, customer_id, created_at) VALUES (?, ?, ?, ?, ?)',
      [debtSale2Id, 300, 'Debt', customer1Id, new Date().toISOString()]
    );
    await db.runAsync(
      'INSERT INTO sales (id, total, payment_method, customer_id, created_at) VALUES (?, ?, ?, ?, ?)',
      [cashSaleId, 200, 'Cash', customer2Id, new Date().toISOString()]
    );
    await db.runAsync(
      'INSERT INTO sales (id, total, payment_method, customer_id, created_at) VALUES (?, ?, ?, ?, ?)',
      [mixedDebtSaleId, 150, 'Debt', customer3Id, new Date().toISOString()]
    );

    console.log('✅ Created 3 debt sales and 1 cash sale\n');

    // Test 2: getCustomerDebtBalance
    console.log('📝 Test 2: Testing getCustomerDebtBalance...');
    const debtBalance1 = await dbService.getCustomerDebtBalance(customer1Id);
    const debtBalance2 = await dbService.getCustomerDebtBalance(customer2Id);
    const debtBalance3 = await dbService.getCustomerDebtBalance(customer3Id);

    console.log(`Customer 1 debt balance: ${debtBalance1} (expected: 800)`);
    console.log(`Customer 2 debt balance: ${debtBalance2} (expected: 0)`);
    console.log(`Customer 3 debt balance: ${debtBalance3} (expected: 150)`);

    if (debtBalance1 === 800 && debtBalance2 === 0 && debtBalance3 === 150) {
      console.log('✅ getCustomerDebtBalance works correctly\n');
    } else {
      console.log('❌ getCustomerDebtBalance failed\n');
      return;
    }

    // Test 3: getCustomersWithDebt
    console.log('📝 Test 3: Testing getCustomersWithDebt...');
    const customersWithDebt = await dbService.getCustomersWithDebt();

    console.log(
      `Found ${customersWithDebt.length} customers with debt (expected: 2)`
    );
    customersWithDebt.forEach((customer) => {
      console.log(
        `  - ${customer.name}: Debt ${customer.debt_balance}, Paid ${customer.paid_amount}`
      );
    });

    if (customersWithDebt.length === 2) {
      const customer1 = customersWithDebt.find((c) => c.id === customer1Id);
      const customer3 = customersWithDebt.find((c) => c.id === customer3Id);

      if (
        customer1 &&
        customer1.debt_balance === 800 &&
        customer1.paid_amount === 0 &&
        customer3 &&
        customer3.debt_balance === 150 &&
        customer3.paid_amount === 0
      ) {
        console.log('✅ getCustomersWithDebt works correctly\n');
      } else {
        console.log('❌ getCustomersWithDebt returned incorrect data\n');
        return;
      }
    } else {
      console.log('❌ getCustomersWithDebt failed\n');
      return;
    }

    // Test 4: updateSalePaymentMethod
    console.log('📝 Test 4: Testing updateSalePaymentMethod...');
    await dbService.updateSalePaymentMethod(debtSale1Id, 'Cash');

    // Verify the update
    const updatedSale = (await db.getFirstAsync(
      'SELECT payment_method FROM sales WHERE id = ?',
      [debtSale1Id]
    )) as { payment_method: string };

    console.log(
      `Updated sale payment method: ${updatedSale.payment_method} (expected: Cash)`
    );

    if (updatedSale.payment_method === 'Cash') {
      console.log('✅ updateSalePaymentMethod works correctly\n');
    } else {
      console.log('❌ updateSalePaymentMethod failed\n');
      return;
    }

    // Test 5: Verify debt balance after payment
    console.log('📝 Test 5: Verifying debt balance after payment...');
    const newDebtBalance1 = await dbService.getCustomerDebtBalance(customer1Id);
    console.log(
      `Customer 1 new debt balance: ${newDebtBalance1} (expected: 300)`
    );

    if (newDebtBalance1 === 300) {
      console.log('✅ Debt balance correctly updated after payment\n');
    } else {
      console.log('❌ Debt balance not updated correctly\n');
      return;
    }

    // Test 6: Verify customers with debt after payment
    console.log('📝 Test 6: Verifying customers with debt after payment...');
    const customersWithDebtAfter = await dbService.getCustomersWithDebt();
    console.log(
      `Found ${customersWithDebtAfter.length} customers with debt (expected: 2)`
    );

    const customer1After = customersWithDebtAfter.find(
      (c) => c.id === customer1Id
    );
    if (customer1After) {
      console.log(
        `  - Customer 1: Debt ${customer1After.debt_balance}, Paid ${customer1After.paid_amount}`
      );
      if (
        customer1After.debt_balance === 300 &&
        customer1After.paid_amount === 500
      ) {
        console.log('✅ Customer debt and paid amounts correctly calculated\n');
      } else {
        console.log('❌ Customer debt and paid amounts incorrect\n');
        return;
      }
    }

    console.log('🎉 All debt calculation methods tests passed!');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await db.closeAsync();
  }
}

// Run tests
testDebtCalculationMethods();
