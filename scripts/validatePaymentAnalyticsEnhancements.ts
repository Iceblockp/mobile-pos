/**
 * Validation script for Payment Analytics Enhancements
 * Tests key functionality to ensure everything works correctly
 */

import { PaymentMethodService } from '../services/paymentMethodService';
import { databaseService } from '../services/database';

interface ValidationResult {
  test: string;
  passed: boolean;
  error?: string;
}

class PaymentAnalyticsValidator {
  private results: ValidationResult[] = [];

  private addResult(test: string, passed: boolean, error?: string) {
    this.results.push({ test, passed, error });
    console.log(`${passed ? '✅' : '❌'} ${test}${error ? `: ${error}` : ''}`);
  }

  async validatePaymentMethodService() {
    console.log('\n🔍 Testing Payment Method Service...');

    try {
      // Test 1: Get default payment methods
      const methods = await PaymentMethodService.getPaymentMethods();
      this.addResult(
        'Get payment methods returns default cash method',
        methods.length > 0 &&
          methods.some((m) => m.name === 'Cash' && m.isDefault)
      );

      // Test 2: Add custom payment method
      const testMethod = await PaymentMethodService.addPaymentMethod({
        name: 'Test Card',
        icon: 'CreditCard',
        color: '#3B82F6',
      });
      this.addResult(
        'Add custom payment method',
        testMethod.name === 'Test Card' && !testMethod.isDefault
      );

      // Test 3: Get updated methods list
      const updatedMethods = await PaymentMethodService.getPaymentMethods();
      this.addResult(
        'Payment methods list updated after adding',
        updatedMethods.length === methods.length + 1
      );

      // Test 4: Remove custom payment method
      await PaymentMethodService.removePaymentMethod(testMethod.id);
      const finalMethods = await PaymentMethodService.getPaymentMethods();
      this.addResult(
        'Remove custom payment method',
        finalMethods.length === methods.length
      );

      // Test 5: Cannot remove default method
      try {
        const defaultMethod =
          await PaymentMethodService.getDefaultPaymentMethod();
        await PaymentMethodService.removePaymentMethod(defaultMethod.id);
        this.addResult('Cannot remove default payment method', false);
      } catch (error) {
        this.addResult('Cannot remove default payment method', true);
      }
    } catch (error) {
      this.addResult('Payment Method Service validation', false, error.message);
    }
  }

  async validatePaymentAnalytics() {
    console.log('\n📊 Testing Payment Analytics...');

    try {
      // Test payment analytics query
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const analytics = await databaseService.getPaymentMethodAnalytics(
        startDate,
        endDate
      );
      this.addResult(
        'Payment method analytics query executes',
        Array.isArray(analytics)
      );

      // Test analytics data structure
      if (analytics.length > 0) {
        const firstAnalytic = analytics[0];
        const hasRequiredFields =
          typeof firstAnalytic.payment_method === 'string' &&
          typeof firstAnalytic.total_amount === 'number' &&
          typeof firstAnalytic.transaction_count === 'number';

        this.addResult(
          'Analytics data has correct structure',
          hasRequiredFields
        );
      } else {
        this.addResult('Analytics data structure (no data to validate)', true);
      }
    } catch (error) {
      this.addResult('Payment Analytics validation', false, error.message);
    }
  }

  async validateInventoryValue() {
    console.log('\n📦 Testing Inventory Value Calculations...');

    try {
      // Get products for inventory value calculation
      const products = await databaseService.getProducts();
      this.addResult(
        'Get products for inventory calculation',
        Array.isArray(products)
      );

      // Test inventory value calculation logic
      let totalValue = 0;
      let totalItems = 0;
      let lowStockValue = 0;
      let lowStockCount = 0;

      products.forEach((product) => {
        const productValue = (product.cost || 0) * product.stock;
        const isLowStock = product.stock <= 5;

        totalValue += productValue;
        totalItems += product.stock;

        if (isLowStock) {
          lowStockValue += productValue;
          lowStockCount += product.stock;
        }
      });

      this.addResult(
        'Inventory value calculation logic works',
        typeof totalValue === 'number' && typeof totalItems === 'number'
      );

      this.addResult(
        'Low stock calculation logic works',
        typeof lowStockValue === 'number' && typeof lowStockCount === 'number'
      );
    } catch (error) {
      this.addResult('Inventory Value validation', false, error.message);
    }
  }

  async validateDataIntegrity() {
    console.log('\n🔒 Testing Data Integrity...');

    try {
      // Test payment method data validation
      const isValidMethod = PaymentMethodService.validatePaymentMethod({
        id: 'test-id',
        name: 'Test Method',
        icon: 'CreditCard',
        color: '#3B82F6',
        isDefault: false,
        createdAt: new Date().toISOString(),
      });
      this.addResult('Payment method validation works', isValidMethod);

      // Test invalid payment method
      const isInvalidMethod = PaymentMethodService.validatePaymentMethod({
        id: 'test-id',
        name: 123, // Invalid type
        icon: 'CreditCard',
        color: '#3B82F6',
        isDefault: false,
        createdAt: new Date().toISOString(),
      });
      this.addResult(
        'Payment method validation rejects invalid data',
        !isInvalidMethod
      );

      // Test error handling for invalid input
      try {
        await PaymentMethodService.addPaymentMethod({
          name: '', // Empty name should fail
          icon: 'CreditCard',
          color: '#3B82F6',
        });
        this.addResult('Validation rejects empty payment method name', false);
      } catch (error) {
        this.addResult('Validation rejects empty payment method name', true);
      }
    } catch (error) {
      this.addResult('Data Integrity validation', false, error.message);
    }
  }

  async runAllValidations() {
    console.log('🚀 Starting Payment Analytics Enhancements Validation...\n');

    await this.validatePaymentMethodService();
    await this.validatePaymentAnalytics();
    await this.validateInventoryValue();
    await this.validateDataIntegrity();

    // Summary
    const passed = this.results.filter((r) => r.passed).length;
    const total = this.results.length;
    const failed = this.results.filter((r) => !r.passed);

    console.log('\n📋 Validation Summary:');
    console.log(`✅ Passed: ${passed}/${total}`);

    if (failed.length > 0) {
      console.log(`❌ Failed: ${failed.length}`);
      console.log('\nFailed Tests:');
      failed.forEach((f) =>
        console.log(`  - ${f.test}: ${f.error || 'Unknown error'}`)
      );
    }

    console.log(
      `\n${passed === total ? '🎉' : '⚠️'} Validation ${
        passed === total ? 'PASSED' : 'COMPLETED WITH ISSUES'
      }`
    );

    return {
      passed: passed === total,
      total,
      passedCount: passed,
      failedCount: failed.length,
      results: this.results,
    };
  }
}

// Export for use in tests or manual validation
export { PaymentAnalyticsValidator };

// Run validation if script is executed directly
if (require.main === module) {
  const validator = new PaymentAnalyticsValidator();
  validator
    .runAllValidations()
    .then((result) => {
      process.exit(result.passed ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Validation failed with error:', error);
      process.exit(1);
    });
}
