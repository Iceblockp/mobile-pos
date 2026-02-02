/**
 * Validation script for Debt Payment Method implementation
 * Tests that debt has been added to default payment methods
 */

import { PaymentMethodService } from '../services/paymentMethodService';

async function validateDebtPaymentMethod() {
  console.log('🔍 Validating Debt Payment Method Implementation...\n');

  let allTestsPassed = true;

  try {
    // Test 1: Reset to defaults to ensure clean state
    console.log('Test 1: Resetting to default payment methods...');
    await PaymentMethodService.resetToDefaults();
    console.log('✅ Reset successful\n');

    // Test 2: Verify debt exists in default methods
    console.log('Test 2: Checking if debt exists in payment methods...');
    const methods = await PaymentMethodService.getPaymentMethods();
    const debtMethod = methods.find((m) => m.id === 'debt');

    if (!debtMethod) {
      console.error('❌ FAILED: Debt payment method not found');
      allTestsPassed = false;
    } else {
      console.log('✅ Debt payment method found');
      console.log(`   - ID: ${debtMethod.id}`);
      console.log(`   - Name: ${debtMethod.name}`);
      console.log(`   - Icon: ${debtMethod.icon}`);
      console.log(`   - Color: ${debtMethod.color}`);
      console.log(`   - Is Default: ${debtMethod.isDefault}\n`);

      // Verify properties
      if (debtMethod.id !== 'debt') {
        console.error('❌ FAILED: Debt method ID is incorrect');
        allTestsPassed = false;
      }
      if (debtMethod.name !== 'Debt') {
        console.error('❌ FAILED: Debt method name is incorrect');
        allTestsPassed = false;
      }
      if (debtMethod.icon !== 'FileText') {
        console.error('❌ FAILED: Debt method icon is incorrect');
        allTestsPassed = false;
      }
      if (debtMethod.color !== '#F59E0B') {
        console.error('❌ FAILED: Debt method color is incorrect');
        allTestsPassed = false;
      }
      if (!debtMethod.isDefault) {
        console.error('❌ FAILED: Debt method should be marked as default');
        allTestsPassed = false;
      }
    }

    // Test 3: Verify cash still exists
    console.log('Test 3: Verifying cash payment method still exists...');
    const cashMethod = methods.find((m) => m.id === 'cash');
    if (!cashMethod) {
      console.error('❌ FAILED: Cash payment method not found');
      allTestsPassed = false;
    } else {
      console.log('✅ Cash payment method exists\n');
    }

    // Test 4: Verify both default methods exist
    console.log('Test 4: Verifying both default methods exist...');
    if (methods.length >= 2) {
      console.log(`✅ Found ${methods.length} payment methods\n`);
    } else {
      console.error('❌ FAILED: Expected at least 2 default payment methods');
      allTestsPassed = false;
    }

    // Test 5: Try to remove debt method (should fail)
    console.log('Test 5: Testing that debt method cannot be removed...');
    try {
      await PaymentMethodService.removePaymentMethod('debt');
      console.error('❌ FAILED: Debt method was removed (should be protected)');
      allTestsPassed = false;
    } catch (error) {
      console.log('✅ Debt method is protected from removal\n');
    }

    // Test 6: Try to remove cash method (should fail)
    console.log('Test 6: Testing that cash method cannot be removed...');
    try {
      await PaymentMethodService.removePaymentMethod('cash');
      console.error('❌ FAILED: Cash method was removed (should be protected)');
      allTestsPassed = false;
    } catch (error) {
      console.log('✅ Cash method is protected from removal\n');
    }

    // Test 7: Add custom method and verify defaults remain
    console.log('Test 7: Adding custom payment method...');
    await PaymentMethodService.addPaymentMethod({
      name: 'Credit Card',
      icon: 'CreditCard',
      color: '#3B82F6',
      isDefault: false,
    });

    const methodsAfterAdd = await PaymentMethodService.getPaymentMethods();
    const stillHasDebt = methodsAfterAdd.some((m) => m.id === 'debt');
    const stillHasCash = methodsAfterAdd.some((m) => m.id === 'cash');

    if (stillHasDebt && stillHasCash) {
      console.log('✅ Default methods remain after adding custom method\n');
    } else {
      console.error(
        '❌ FAILED: Default methods missing after adding custom method'
      );
      allTestsPassed = false;
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    if (allTestsPassed) {
      console.log('✅ ALL TESTS PASSED');
      console.log('Debt payment method successfully implemented!');
    } else {
      console.log('❌ SOME TESTS FAILED');
      console.log('Please review the implementation.');
    }
    console.log('='.repeat(50));
  } catch (error) {
    console.error('❌ Validation failed with error:', error);
    allTestsPassed = false;
  }

  return allTestsPassed;
}

// Run validation
validateDebtPaymentMethod()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
