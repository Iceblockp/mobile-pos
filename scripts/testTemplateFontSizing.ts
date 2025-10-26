#!/usr/bin/env npx tsx

import { TemplateEngine, ReceiptData } from '../services/templateEngine';
import { ShopSettings } from '../services/shopSettingsStorage';

async function testTemplateFontSizing() {
  console.log('🧪 Testing Template Font Sizing and Height Calculation...\n');

  const templateEngine = new TemplateEngine();

  // Sample data with multiple items to test height scaling
  const sampleData: ReceiptData = {
    saleId: '12345',
    items: [
      {
        product: { id: '1', name: 'Test Product 1', price: 1000 },
        quantity: 2,
        discount: 0,
        subtotal: 2000,
      },
      {
        product: { id: '2', name: 'Test Product 2', price: 1500 },
        quantity: 1,
        discount: 100,
        subtotal: 1400,
      },
      {
        product: { id: '3', name: 'Test Product 3', price: 800 },
        quantity: 3,
        discount: 0,
        subtotal: 2400,
      },
    ],
    total: 5800,
    paymentMethod: 'CASH',
    note: 'Test receipt',
    date: new Date(),
  };

  const shopSettings: ShopSettings = {
    shopName: 'Test Shop',
    address: '123 Test Street',
    phone: '09123456789',
    receiptFooter: 'Thank you!',
    thankYouMessage: 'Come again!',
  };

  const fontSizes: Array<'small' | 'medium' | 'large' | 'extra-large'> = [
    'small',
    'medium',
    'large',
    'extra-large',
  ];

  for (const fontSize of fontSizes) {
    console.log(`\n📏 Testing ${fontSize} font size...`);

    try {
      const context = templateEngine.buildTemplateContext(
        shopSettings,
        sampleData,
        {},
        fontSize
      );

      const html = await templateEngine.renderReceipt('classic', context, true);

      // Check if font sizes are scaled correctly
      const bodyFontMatch = html.match(/body\s*{[^}]*font-size:\s*(\d+)px/);
      const shopNameFontMatch = html.match(
        /\.shop-name\s*{[^}]*font-size:\s*(\d+)px/
      );
      const pageSizeMatch = html.match(
        /@page\s*{[^}]*size:\s*[\d.]+in\s+([\d.]+)in/
      );

      if (bodyFontMatch && shopNameFontMatch) {
        const bodySize = parseInt(bodyFontMatch[1]);
        const shopNameSize = parseInt(shopNameFontMatch[1]);

        console.log(`  ✅ Body font size: ${bodySize}px`);
        console.log(`  ✅ Shop name font size: ${shopNameSize}px`);

        // Verify scaling
        const expectedMultiplier =
          fontSize === 'small'
            ? 0.8
            : fontSize === 'medium'
            ? 1.0
            : fontSize === 'large'
            ? 1.3
            : 1.6;

        const expectedBodySize = Math.round(36 * expectedMultiplier);
        const expectedShopNameSize = Math.round(48 * expectedMultiplier);

        if (
          bodySize === expectedBodySize &&
          shopNameSize === expectedShopNameSize
        ) {
          console.log(`  ✅ Font scaling correct for ${fontSize}`);
        } else {
          console.log(`  ❌ Font scaling incorrect for ${fontSize}`);
          console.log(
            `     Expected body: ${expectedBodySize}px, got: ${bodySize}px`
          );
          console.log(
            `     Expected shop name: ${expectedShopNameSize}px, got: ${shopNameSize}px`
          );
        }
      } else {
        console.log(`  ❌ Could not find font sizes in generated CSS`);
      }

      // Check page height scaling
      if (pageSizeMatch) {
        const pageHeight = parseFloat(pageSizeMatch[1]);
        console.log(`  ✅ Page height: ${pageHeight}in`);

        // Calculate expected height
        const itemCount = sampleData.items.length;
        const expectedMultiplier =
          fontSize === 'small'
            ? 0.8
            : fontSize === 'medium'
            ? 1.0
            : fontSize === 'large'
            ? 1.3
            : 1.6;
        const expectedBaseHeight = 9 * expectedMultiplier;
        const expectedItemHeight = 1.5 * expectedMultiplier;
        const expectedTotalHeight =
          expectedBaseHeight + itemCount * expectedItemHeight;

        if (Math.abs(pageHeight - expectedTotalHeight) < 0.1) {
          console.log(`  ✅ Page height scaling correct for ${fontSize}`);
        } else {
          console.log(`  ❌ Page height scaling incorrect for ${fontSize}`);
          console.log(
            `     Expected: ${expectedTotalHeight.toFixed(
              1
            )}in, got: ${pageHeight}in`
          );
        }
      } else {
        console.log(`  ❌ Could not find page size in generated CSS`);
      }
    } catch (error) {
      console.error(`  ❌ Error testing ${fontSize}:`, error);
    }
  }

  console.log('\n✅ Font sizing and height calculation test completed!');
}

// Run the test
testTemplateFontSizing().catch(console.error);
