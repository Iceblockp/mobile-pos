// Simple debug script to test currency context imports
console.log('Testing currency context imports...');

try {
  console.log('1. Testing currencyManager import...');
  const { currencyManager } = require('./services/currencyManager');
  console.log('✅ currencyManager imported successfully');

  console.log('2. Testing currencySettingsService import...');
  const {
    currencySettingsService,
  } = require('./services/currencySettingsService');
  console.log('✅ currencySettingsService imported successfully');

  console.log('3. Testing shopSettingsStorage import...');
  const { shopSettingsStorage } = require('./services/shopSettingsStorage');
  console.log('✅ shopSettingsStorage imported successfully');

  console.log('4. Testing CurrencyContext import...');
  const {
    CurrencyProvider,
    useCurrencyContext,
  } = require('./context/CurrencyContext');
  console.log('✅ CurrencyContext imported successfully');

  console.log('All imports successful!');
} catch (error) {
  console.error('❌ Import failed:', error);
}
