import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { currencySettingsService } from '@/services/currencySettingsService';
import { CurrencyManager } from '@/services/currencyManager';
import { TemplateEngine } from '@/services/templateEngine';
import { ESCPOSConverter } from '@/utils/escposConverter';

describe('Receipt Decimal Formatting', () => {
  beforeEach(async () => {
    // Set up Chinese Yuan currency (uses 2 decimal places)
    const cnySettings = CurrencyManager.getCurrencyByCode('CNY');
    if (cnySettings) {
      await currencySettingsService.updateCurrency(cnySettings);
    }
  });

  afterEach(async () => {
    // Reset to default MMK currency
    await currencySettingsService.resetToDefault();
  });

  const sampleReceiptData = {
    saleId: 'TEST-001',
    items: [
      {
        product: {
          id: '1',
          name: 'Test Product with Decimals',
          price: 25.99,
        },
        quantity: 2,
        discount: 1.5,
        subtotal: 50.48, // (25.99 * 2) - 1.50
      },
    ],
    total: 50.48,
    paymentMethod: 'CASH',
    note: 'Test receipt with decimal values',
    date: new Date('2024-01-15T10:30:00Z'),
  };

  it('should format decimal values correctly in template engine', async () => {
    const templateEngine = new TemplateEngine();
    const context = templateEngine.buildTemplateContext(
      null, // No shop settings
      sampleReceiptData
    );

    // Test the formatter directly
    const formattedPrice = context.formatters.formatMMK(25.99);
    const formattedTotal = context.formatters.formatMMK(50.48);
    const formattedDiscount = context.formatters.formatMMK(1.5);

    // Should include decimal places for CNY currency
    expect(formattedPrice).toContain('25.99');
    expect(formattedTotal).toContain('50.48');
    expect(formattedDiscount).toContain('1.50');

    // Should include CNY symbol
    expect(formattedPrice).toContain('¥');
    expect(formattedTotal).toContain('¥');
    expect(formattedDiscount).toContain('¥');
  });

  it('should render receipt template with decimal values', async () => {
    const templateEngine = new TemplateEngine();
    const context = templateEngine.buildTemplateContext(
      null,
      sampleReceiptData
    );

    const renderedHtml = await templateEngine.renderReceipt('classic', context);

    // Check that decimal values appear in the rendered HTML
    expect(renderedHtml).toContain('25.99');
    expect(renderedHtml).toContain('50.48');
    expect(renderedHtml).toContain('1.50');
  });

  it('should format decimal values correctly in thermal printer output', () => {
    const escposOutput = ESCPOSConverter.convertReceipt(
      sampleReceiptData,
      null
    );

    // Check that decimal values appear in the ESC/POS output
    expect(escposOutput).toContain('25.99');
    expect(escposOutput).toContain('50.48');
    expect(escposOutput).toContain('1.50');
  });

  it('should handle Myanmar Kyat currency (no decimals) correctly', async () => {
    // Switch to MMK currency
    const mmkSettings = CurrencyManager.getCurrencyByCode('MMK');
    if (mmkSettings) {
      await currencySettingsService.updateCurrency(mmkSettings);
    }

    const templateEngine = new TemplateEngine();
    const context = templateEngine.buildTemplateContext(
      null,
      sampleReceiptData
    );

    // Test the formatter with MMK
    const formattedPrice = context.formatters.formatMMK(25.99);
    const formattedTotal = context.formatters.formatMMK(50.48);

    // Should round to whole numbers for MMK
    expect(formattedPrice).toContain('26'); // Rounded from 25.99
    expect(formattedTotal).toContain('50'); // Rounded from 50.48

    // Should include MMK symbol
    expect(formattedPrice).toContain('Ks');
    expect(formattedTotal).toContain('Ks');
  });

  it('should handle USD currency (2 decimal places) correctly', async () => {
    // Switch to USD currency
    const usdSettings = CurrencyManager.getCurrencyByCode('USD');
    if (usdSettings) {
      await currencySettingsService.updateCurrency(usdSettings);
    }

    const templateEngine = new TemplateEngine();
    const context = templateEngine.buildTemplateContext(
      null,
      sampleReceiptData
    );

    // Test the formatter with USD
    const formattedPrice = context.formatters.formatMMK(25.99);
    const formattedTotal = context.formatters.formatMMK(50.48);

    // Should preserve decimal places for USD
    expect(formattedPrice).toContain('25.99');
    expect(formattedTotal).toContain('50.48');

    // Should include USD symbol
    expect(formattedPrice).toContain('$');
    expect(formattedTotal).toContain('$');
  });
});
