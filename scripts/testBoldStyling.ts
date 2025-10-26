#!/usr/bin/env npx tsx

import { TemplateEngine, ReceiptData } from '../services/templateEngine';
import { ShopSettings } from '../services/shopSettingsStorage';

async function testBoldStyling() {
  console.log('🧪 Testing Bold Styling for Item Details...\n');

  const templateEngine = new TemplateEngine();

  // Sample data with items that have discounts to test all styling
  const sampleData: ReceiptData = {
    saleId: 'BOLD001',
    items: [
      {
        product: { id: '1', name: 'Coffee', price: 500 },
        quantity: 2,
        discount: 50,
        subtotal: 950,
      },
      {
        product: { id: '2', name: 'Sandwich', price: 800 },
        quantity: 1,
        discount: 0,
        subtotal: 800,
      },
    ],
    total: 1750,
    paymentMethod: 'CASH',
    note: 'Test bold styling',
    date: new Date(),
  };

  const shopSettings: ShopSettings = {
    shopName: 'Bold Test Cafe',
    address: '123 Bold Street',
    phone: '09-123-456',
    receiptFooter: 'Thank you!',
    thankYouMessage: 'Come again!',
  };

  const templates = ['classic', 'modern', 'minimal'];

  for (const templateId of templates) {
    console.log(`📋 Testing ${templateId.toUpperCase()} template:`);

    try {
      const context = templateEngine.buildTemplateContext(
        shopSettings,
        sampleData,
        {},
        'medium'
      );

      const html = await templateEngine.renderReceipt(
        templateId,
        context,
        true
      );

      // Check for bold styling in item details
      const itemDetailsBold =
        html.includes('.item-details {') && html.includes('font-weight: 700');
      const itemDiscountBold =
        html.includes('.item-details.discount {') &&
        html.includes('font-weight: 700');
      const infoLineBold =
        html.includes('.info-line {') && html.includes('font-weight: 600');

      console.log(`  ✅ Item details bold: ${itemDetailsBold ? 'YES' : 'NO'}`);
      console.log(
        `  ✅ Discount details bold: ${itemDiscountBold ? 'YES' : 'NO'}`
      );
      console.log(`  ✅ Info line bold: ${infoLineBold ? 'YES' : 'NO'}`);

      // Check for specific font weights
      const fontWeight700Count = (html.match(/font-weight: 700/g) || []).length;
      const fontWeight800Count = (html.match(/font-weight: 800/g) || []).length;
      const fontWeight900Count = (html.match(/font-weight: 900/g) || []).length;

      console.log(`  📊 Font weight 700 occurrences: ${fontWeight700Count}`);
      console.log(`  📊 Font weight 800 occurrences: ${fontWeight800Count}`);
      console.log(`  📊 Font weight 900 occurrences: ${fontWeight900Count}`);

      if (itemDetailsBold && itemDiscountBold) {
        console.log(`  ✅ ${templateId} template has proper bold styling\n`);
      } else {
        console.log(`  ❌ ${templateId} template missing bold styling\n`);
      }
    } catch (error) {
      console.error(`  ❌ Error testing ${templateId}:`, error);
    }
  }

  console.log('✅ Bold styling test completed!');
}

// Run the test
testBoldStyling().catch(console.error);
