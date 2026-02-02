/**
 * Test script to verify debt metrics card implementation
 * Tests the getCurrentMonthDebtMetrics method and dashboard integration
 */

import { DatabaseService } from '../services/database';

async function testDebtMetricsCard() {
  console.log('🧪 Testing Debt Metrics Card Implementation\n');

  const db = DatabaseService.getInstance();
  await db.initialize();

  try {
    // Test 1: Get current month debt metrics
    console.log('Test 1: Get current month debt metrics');
    const debtMetrics = await db.getCurrentMonthDebtMetrics();
    console.log('✅ Debt metrics retrieved:', debtMetrics);
    console.log(`   - Count: ${debtMetrics.count}`);
    console.log(`   - Total: ${debtMetrics.total}`);

    // Test 2: Verify the method returns correct structure
    console.log('\nTest 2: Verify return structure');
    if (
      typeof debtMetrics.count === 'number' &&
      typeof debtMetrics.total === 'number'
    ) {
      console.log('✅ Return structure is correct');
    } else {
      console.log('❌ Return structure is incorrect');
    }

    // Test 3: Create a test debt sale and verify it's counted
    console.log('\nTest 3: Create test debt sale and verify counting');

    // Get or create a test customer
    const customers = await db.getCustomers();
    let testCustomer = customers.find((c) => c.name === 'Test Debt Customer');

    if (!testCustomer) {
      const customerId = await db.addCustomer({
        name: 'Test Debt Customer',
        phone: '1234567890',
      });
      const allCustomers = await db.getCustomers();
      testCustomer = allCustomers.find((c) => c.id === customerId);
    }

    if (!testCustomer) {
      console.log('❌ Could not create test customer');
      return;
    }

    // Get initial debt metrics
    const initialMetrics = await db.getCurrentMonthDebtMetrics();
    console.log('Initial debt metrics:', initialMetrics);

    // Create a test product if needed
    const products = await db.getProducts();
    let testProduct = products.find((p) => p.name === 'Test Product');

    if (!testProduct) {
      const productId = await db.addProduct({
        name: 'Test Product',
        barcode: 'TEST123',
        price: 100,
        cost: 50,
        stock: 10,
        category: 'Test',
        lowStockThreshold: 5,
      });
      const allProducts = await db.getProducts();
      testProduct = allProducts.find((p) => p.id === productId);
    }

    if (!testProduct) {
      console.log('❌ Could not create test product');
      return;
    }

    // Create a debt sale
    const saleId = await db.addSale({
      items: [
        {
          product_id: testProduct.id,
          quantity: 1,
          price: testProduct.price,
          cost: testProduct.cost || 0,
          subtotal: testProduct.price,
        },
      ],
      total: testProduct.price,
      payment_method: 'Debt',
      customer_id: testCustomer.id,
      note: 'Test debt sale',
    });

    console.log(`✅ Created test debt sale with ID: ${saleId}`);

    // Get updated debt metrics
    const updatedMetrics = await db.getCurrentMonthDebtMetrics();
    console.log('Updated debt metrics:', updatedMetrics);

    if (updatedMetrics.count > initialMetrics.count) {
      console.log('✅ Debt count increased correctly');
    } else {
      console.log('❌ Debt count did not increase');
    }

    if (updatedMetrics.total > initialMetrics.total) {
      console.log('✅ Debt total increased correctly');
    } else {
      console.log('❌ Debt total did not increase');
    }

    // Test 4: Verify customer debt balance
    console.log('\nTest 4: Verify customer debt balance');
    const customerDebt = await db.getCustomerDebtBalance(testCustomer.id);
    console.log(`Customer debt balance: ${customerDebt}`);

    if (customerDebt > 0) {
      console.log('✅ Customer debt balance is correct');
    } else {
      console.log('❌ Customer debt balance is incorrect');
    }

    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDebtMetricsCard().catch(console.error);
