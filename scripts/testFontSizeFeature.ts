#!/usr/bin/env npx tsx

import { TemplateEngine, ReceiptData } from '../services/templateEngine';
import { ShopSettings } from '../services/shopSettingsStorage';

async function testFontSizeFeature() {
  console.log('🧪 Testing Font Size Feature...\n');

  const templateEngine = new TemplateEngine();

  // Simple test data
  const sampleData: ReceiptData = {
    saleId: 'TEST001',
    items: [
      {
        product: { id: '1', name: 'Coffee', price: 500 },
        quantity: 2,
        discount: 0,
        subtotal: 1000,
      },
    ],
    total: 1000,
    paymentMethod: 'CASH',
    note: 'Test receipt',
    date: new Date(),
  };

  const shopSettings: ShopSettings = {
    shopName: 'Test Cafe',
    address: '123 Main St',
    phone: '09-123-456',
    receiptFooter: 'Thank you!',
    thankYouMessage: 'Come again!',
  };

  console.log('Testing different font sizes:\n');

  const fontSizes: Array<'small' | 'medium' | 'large' | 'extra-large'> = [
    'small',
    'medium',
    'large',
    'extra-large',
  ];

  for (const fontSize of fontSizes) {
    console.log(`📏 ${fontSize.toUpperCase()} font size:`);

    try {
      const context = templateEngine.buildTemplateContext(
        shopSettings,
        sampleData,
        {},
        fontSize
      );

      const html = await templateEngine.renderReceipt('classic', context, true);

      // Extract key measurements
      const bodyFontMatch = html.match(/font-size:\s*(\d+)px/);
      const pageSizeMatch = html.match(/size:\s*[\d.]+in\s+([\d.]+)in/);

      if (bodyFontMatch) {
        const fontSize = parseInt(bodyFontMatch[1]);
        console.log(`  Font size: ${fontSize}px`);
      }

      if (pageSizeMatch) {
        const pageHeight = parseFloat(pageSizeMatch[1]);
        console.log(`  Page height: ${pageHeight}in`);
      }

      console.log(`  ✅ ${fontSize} template generated successfully\n`);
    } catch (error) {
      console.error(`  ❌ Error with ${fontSize}:`, error);
    }
  }

  console.log('✅ Font size feature test completed!');
}

// Run the test
testFontSizeFeature().catch(console.error);
