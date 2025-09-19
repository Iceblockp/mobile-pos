#!/usr/bin/env ts-node

/**
 * Currency System Validation Script
 *
 * This script validates that the enhanced currency management system
 * is properly integrated and functioning correctly.
 */

import { currencySettingsService } from '../services/currencySettingsService';
import { CurrencyManager, CurrencySettings } from '../services/currencyManager';
import { shopSettingsStorage } from '../services/shopSettingsStorage';

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: any;
}

class CurrencySystemValidator {
  private results: ValidationResult[] = [];

  async validate(): Promise<void> {
    console.log('🔍 Starting Currency System Validation...\n');

    await this.validateCurrencyManager();
    await this.validateCurrencyService();
    await this.validateShopSettingsIntegration();
    await this.validateCustomCurrencies();
    await this.validateMigration();
    await this.validatePerformance();

    this.printResults();
  }

  private async validateCurrencyManager(): Promise<void> {
    console.log('📊 Validating Currency Manager...');

    try {
      // Test predefined currencies
      const predefinedCurrencies = CurrencyManager.getPredefinedCurrencies();
      this.addResult({
        passed: Object.keys(predefinedCurrencies).length >= 7,
        message: 'Predefined currencies available',
        details: `Found ${Object.keys(predefinedCurrencies).length} currencies`,
      });

      // Test MMK currency (default)
      const mmkCurrency = CurrencyManager.getCurrencyByCode('MMK');
      this.addResult({
        passed: mmkCurrency !== null && mmkCurrency.code === 'MMK',
        message: 'MMK default currency available',
        details: mmkCurrency,
      });

      // Test currency validation
      const validCurrency: CurrencySettings = {
        code: 'USD',
        symbol: '$',
        name: 'US Dollar',
        decimals: 2,
        symbolPosition: 'before',
        thousandSeparator: ',',
        decimalSeparator: '.',
      };

      const manager = CurrencyManager.getInstance();
      const validationErrors = manager.validateCurrencySettings(validCurrency);
      this.addResult({
        passed: validationErrors.length === 0,
        message: 'Currency validation working',
        details: validationErrors,
      });

      // Test formatting
      await manager.setCurrency(validCurrency);
      const formatted = manager.formatPrice(1234.56);
      this.addResult({
        passed: formatted === '$1,234.56',
        message: 'Price formatting working',
        details: `Expected: $1,234.56, Got: ${formatted}`,
      });

      // Test parsing
      const parsed = manager.parsePrice('$1,234.56');
      this.addResult({
        passed: Math.abs(parsed - 1234.56) < 0.01,
        message: 'Price parsing working',
        details: `Expected: 1234.56, Got: ${parsed}`,
      });
    } catch (error) {
      this.addResult({
        passed: false,
        message: 'Currency Manager validation failed',
        details: error.message,
      });
    }
  }

  private async validateCurrencyService(): Promise<void> {
    console.log('⚙️ Validating Currency Settings Service...');

    try {
      // Test initialization
      await currencySettingsService.initialize();
      this.addResult({
        passed: currencySettingsService.isSystemInitialized(),
        message: 'Currency service initialization',
        details: 'Service initialized successfully',
      });

      // Test current currency
      const currentCurrency = currencySettingsService.getCurrentCurrency();
      this.addResult({
        passed: currentCurrency !== null && currentCurrency.code !== undefined,
        message: 'Current currency retrieval',
        details: currentCurrency,
      });

      // Test currency update
      const testCurrency: CurrencySettings = {
        code: 'EUR',
        symbol: '€',
        name: 'Euro',
        decimals: 2,
        symbolPosition: 'after',
        thousandSeparator: ',',
        decimalSeparator: '.',
      };

      await currencySettingsService.updateCurrency(testCurrency);
      const updatedCurrency = currencySettingsService.getCurrentCurrency();
      this.addResult({
        passed: updatedCurrency.code === 'EUR',
        message: 'Currency update functionality',
        details: `Updated to: ${updatedCurrency.name}`,
      });

      // Test formatting utilities
      const formattedPrice = currencySettingsService.formatPrice(999.99);
      this.addResult({
        passed: formattedPrice.includes('999') && formattedPrice.includes('€'),
        message: 'Service price formatting',
        details: `Formatted: ${formattedPrice}`,
      });

      // Test validation
      const validation = currencySettingsService.validatePriceInput('€999.99');
      this.addResult({
        passed: validation.isValid === true,
        message: 'Service price validation',
        details: validation,
      });
    } catch (error) {
      this.addResult({
        passed: false,
        message: 'Currency Settings Service validation failed',
        details: error.message,
      });
    }
  }

  private async validateShopSettingsIntegration(): Promise<void> {
    console.log('🏪 Validating Shop Settings Integration...');

    try {
      // Test currency in shop settings
      const shopSettings = await shopSettingsStorage.getShopSettings();
      this.addResult({
        passed: shopSettings === null || shopSettings.currency !== undefined,
        message: 'Currency in shop settings',
        details:
          shopSettings?.currency ||
          'No shop settings found (expected for new installation)',
      });

      // Test currency update in shop settings
      const testCurrency: CurrencySettings = {
        code: 'USD',
        symbol: '$',
        name: 'US Dollar',
        decimals: 2,
        symbolPosition: 'before',
        thousandSeparator: ',',
        decimalSeparator: '.',
      };

      await currencySettingsService.updateCurrency(testCurrency);

      // Verify it was saved to shop settings
      const updatedShopSettings = await shopSettingsStorage.getShopSettings();
      this.addResult({
        passed: updatedShopSettings?.currency?.code === 'USD',
        message: 'Currency sync with shop settings',
        details: updatedShopSettings?.currency,
      });
    } catch (error) {
      this.addResult({
        passed: false,
        message: 'Shop Settings Integration validation failed',
        details: error.message,
      });
    }
  }

  private async validateCustomCurrencies(): Promise<void> {
    console.log('🎨 Validating Custom Currencies...');

    try {
      // Test custom currency creation
      const customCurrency: CurrencySettings = {
        code: 'XYZ',
        symbol: 'X',
        name: 'Test Custom Currency',
        decimals: 3,
        symbolPosition: 'after',
        thousandSeparator: '.',
        decimalSeparator: ',',
        isCustom: true,
      };

      await currencySettingsService.saveCustomCurrency(customCurrency);
      this.addResult({
        passed: true,
        message: 'Custom currency creation',
        details: 'Custom currency saved successfully',
      });

      // Test custom currency retrieval
      const customCurrencies =
        await currencySettingsService.getCustomCurrencies();
      this.addResult({
        passed: customCurrencies.some((c) => c.code === 'XYZ'),
        message: 'Custom currency retrieval',
        details: `Found ${customCurrencies.length} custom currencies`,
      });

      // Test custom currency usage
      await currencySettingsService.updateCurrency(customCurrency);
      const formattedWithCustom = currencySettingsService.formatPrice(1234.567);
      this.addResult({
        passed:
          formattedWithCustom.includes('X') &&
          formattedWithCustom.includes('1.234'),
        message: 'Custom currency formatting',
        details: `Formatted: ${formattedWithCustom}`,
      });

      // Test custom currency deletion
      await currencySettingsService.deleteCustomCurrency('XYZ');
      const remainingCustomCurrencies =
        await currencySettingsService.getCustomCurrencies();
      this.addResult({
        passed: !remainingCustomCurrencies.some((c) => c.code === 'XYZ'),
        message: 'Custom currency deletion',
        details: `Remaining custom currencies: ${remainingCustomCurrencies.length}`,
      });
    } catch (error) {
      this.addResult({
        passed: false,
        message: 'Custom Currencies validation failed',
        details: error.message,
      });
    }
  }

  private async validateMigration(): Promise<void> {
    console.log('🔄 Validating Migration System...');

    try {
      // Test migration functionality
      const migrationResult =
        await currencySettingsService.migrateFromLegacyStorage();
      this.addResult({
        passed: migrationResult.success !== undefined,
        message: 'Migration system functional',
        details: migrationResult,
      });

      // Test sync functionality
      await currencySettingsService.syncWithShopSettings();
      this.addResult({
        passed: true,
        message: 'Shop settings sync functional',
        details: 'Sync completed without errors',
      });
    } catch (error) {
      this.addResult({
        passed: false,
        message: 'Migration validation failed',
        details: error.message,
      });
    }
  }

  private async validatePerformance(): Promise<void> {
    console.log('⚡ Validating Performance...');

    try {
      // Test formatting performance
      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        currencySettingsService.formatPrice(i * 1.23);
      }
      const formatTime = Date.now() - startTime;

      this.addResult({
        passed: formatTime < 100,
        message: 'Price formatting performance',
        details: `1000 operations in ${formatTime}ms`,
      });

      // Test parsing performance
      const parseStartTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        currencySettingsService.parsePrice(`$${(i * 1.23).toFixed(2)}`);
      }
      const parseTime = Date.now() - parseStartTime;

      this.addResult({
        passed: parseTime < 100,
        message: 'Price parsing performance',
        details: `1000 operations in ${parseTime}ms`,
      });

      // Test validation performance
      const validationStartTime = Date.now();
      for (let i = 0; i < 100; i++) {
        currencySettingsService.validatePriceInput(`$${(i * 1.23).toFixed(2)}`);
      }
      const validationTime = Date.now() - validationStartTime;

      this.addResult({
        passed: validationTime < 50,
        message: 'Price validation performance',
        details: `100 operations in ${validationTime}ms`,
      });
    } catch (error) {
      this.addResult({
        passed: false,
        message: 'Performance validation failed',
        details: error.message,
      });
    }
  }

  private addResult(result: ValidationResult): void {
    this.results.push(result);
    const status = result.passed ? '✅' : '❌';
    console.log(`  ${status} ${result.message}`);
    if (result.details && !result.passed) {
      console.log(`     Details: ${JSON.stringify(result.details, null, 2)}`);
    }
  }

  private printResults(): void {
    const passed = this.results.filter((r) => r.passed).length;
    const total = this.results.length;
    const percentage = Math.round((passed / total) * 100);

    console.log('\n📋 Validation Summary:');
    console.log(`   Passed: ${passed}/${total} (${percentage}%)`);

    if (passed === total) {
      console.log('🎉 All validations passed! Currency system is ready.');
    } else {
      console.log(
        '⚠️  Some validations failed. Please review the issues above.'
      );

      const failed = this.results.filter((r) => !r.passed);
      console.log('\n❌ Failed validations:');
      failed.forEach((result) => {
        console.log(`   - ${result.message}`);
        if (result.details) {
          console.log(`     ${JSON.stringify(result.details, null, 2)}`);
        }
      });
    }

    console.log('\n🔧 System Status:');
    console.log(
      `   - Currency Manager: ${
        this.results.find((r) => r.message.includes('Currency Manager'))?.passed
          ? 'OK'
          : 'FAILED'
      }`
    );
    console.log(
      `   - Currency Service: ${
        this.results.find((r) =>
          r.message.includes('Currency Settings Service')
        )?.passed
          ? 'OK'
          : 'FAILED'
      }`
    );
    console.log(
      `   - Shop Integration: ${
        this.results.find((r) =>
          r.message.includes('Shop Settings Integration')
        )?.passed
          ? 'OK'
          : 'FAILED'
      }`
    );
    console.log(
      `   - Custom Currencies: ${
        this.results.find((r) => r.message.includes('Custom Currencies'))
          ?.passed
          ? 'OK'
          : 'FAILED'
      }`
    );
    console.log(
      `   - Migration System: ${
        this.results.find((r) => r.message.includes('Migration'))?.passed
          ? 'OK'
          : 'FAILED'
      }`
    );
    console.log(
      `   - Performance: ${
        this.results.find((r) => r.message.includes('Performance'))?.passed
          ? 'OK'
          : 'FAILED'
      }`
    );
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const validator = new CurrencySystemValidator();
  validator.validate().catch((error) => {
    console.error('❌ Validation script failed:', error);
    process.exit(1);
  });
}

export { CurrencySystemValidator };
