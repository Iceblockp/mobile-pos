#!/usr/bin/env npx tsx

/**
 * Test script to verify that currency can be changed without requiring a shop name
 */

import { ShopSettingsService } from '../services/shopSettingsService';
import { shopSettingsStorage } from '../services/shopSettingsStorage';
import { CurrencyManager } from '../services/currencyManager';

async function testCurrencyChangeWithoutShopName() {
  console.log('🧪 Testing currency change without shop name...\n');

  try {
    // Clear any existing shop settings
    await shopSettingsStorage.clearShopSettings();
    console.log('✅ Cleared existing shop settings');

    // Initialize shop settings service
    const shopSettingsService = new ShopSettingsService();
    await shopSettingsService.initialize();
    console.log('✅ Shop settings service initialized');

    // Get USD currency for testing
    const usdCurrency = CurrencyManager.getCurrencyByCode('USD');
    if (!usdCurrency) {
      throw new Error('USD currency not found');
    }
    console.log('✅ USD currency retrieved:', usdCurrency.name);

    // Test 1: Update currency without any existing shop settings
    console.log('\n📝 Test 1: Update currency without existing shop settings');
    try {
      await shopSettingsService.updateShopSettings({
        currency: usdCurrency,
      });
      console.log('✅ Currency updated successfully without shop name');
    } catch (error) {
      console.error('❌ Failed to update currency without shop name:', error);
      throw error;
    }

    // Verify the currency was saved
    const settingsAfterCurrencyUpdate =
      await shopSettingsService.getShopSettings();
    if (settingsAfterCurrencyUpdate?.currency?.code === 'USD') {
      console.log('✅ Currency correctly saved to shop settings');
    } else {
      throw new Error('Currency was not saved correctly');
    }

    // Test 2: Update currency with existing partial settings
    console.log('\n📝 Test 2: Update currency with existing partial settings');
    const eurCurrency = CurrencyManager.getCurrencyByCode('EUR');
    if (!eurCurrency) {
      throw new Error('EUR currency not found');
    }

    try {
      await shopSettingsService.updateShopSettings({
        currency: eurCurrency,
        receiptTemplate: 'modern',
      });
      console.log('✅ Currency and template updated successfully');
    } catch (error) {
      console.error(
        '❌ Failed to update currency with partial settings:',
        error
      );
      throw error;
    }

    // Verify both updates were saved
    const settingsAfterSecondUpdate =
      await shopSettingsService.getShopSettings();
    if (
      settingsAfterSecondUpdate?.currency?.code === 'EUR' &&
      settingsAfterSecondUpdate?.receiptTemplate === 'modern'
    ) {
      console.log('✅ Currency and template correctly saved');
    } else {
      throw new Error('Currency or template was not saved correctly');
    }

    // Test 3: Try to update shop name (should still require validation)
    console.log('\n📝 Test 3: Update shop name (should require validation)');
    try {
      await shopSettingsService.updateShopSettings({
        shopName: '', // Empty shop name should fail
      });
      console.error('❌ Empty shop name should have failed validation');
      throw new Error('Validation should have failed for empty shop name');
    } catch (error) {
      if (error.message.includes('Validation failed')) {
        console.log('✅ Shop name validation correctly failed for empty name');
      } else {
        throw error;
      }
    }

    // Test 4: Update shop name with valid value
    console.log('\n📝 Test 4: Update shop name with valid value');
    try {
      await shopSettingsService.updateShopSettings({
        shopName: 'Test Shop',
      });
      console.log('✅ Valid shop name updated successfully');
    } catch (error) {
      console.error('❌ Failed to update valid shop name:', error);
      throw error;
    }

    // Final verification
    const finalSettings = await shopSettingsService.getShopSettings();
    console.log('\n📋 Final shop settings:');
    console.log('- Shop Name:', finalSettings?.shopName || 'Not set');
    console.log('- Currency:', finalSettings?.currency?.name || 'Not set');
    console.log(
      '- Receipt Template:',
      finalSettings?.receiptTemplate || 'Not set'
    );

    console.log(
      '\n🎉 All tests passed! Currency can be changed without requiring shop name.'
    );
  } catch (error) {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testCurrencyChangeWithoutShopName().catch(console.error);
