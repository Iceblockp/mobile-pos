#!/usr/bin/env npx tsx

import { TemplateEngine, ReceiptData } from '../services/templateEngine';
import { ShopSettings } from '../services/shopSettingsStorage';

async function testPreviewAccuracy() {
  console.log('🧪 Testing Preview vs Actual Template Accuracy...\n');

  const templateEngine = new TemplateEngine();

  const sampleData: ReceiptData = {
    saleId: 'PREVIEW001',
    items: [
      {
        product: { id: '1', name: 'Coffee', price: 500 },
        quantity: 2,
        discount: 0,
        subtotal: 1000,
      },
      {
        product: { id: '2', name: 'Sandwich', price: 800 },
        quantity: 1,
        discount: 50,
        subtotal: 750,
      },
    ],
    total: 1750,
    paymentMethod: 'CASH',
    note: 'Test preview accuracy',
    date: new Date(),
  };

  const shopSettings: ShopSettings = {
    shopName: 'Preview Test Cafe',
    address: '123 Preview Street',
    phone: '09-123-456',
    receiptFooter: 'Thank you!',
    thankYouMessage: 'Come again!',
  };

  const templates = ['classic', 'modern', 'minimal'];
  const fontSizes: Array<'small' | 'medium' | 'large' | 'extra-large'> = [
    'small',
    'medium',
    'large',
    'extra-large',
  ];

  for (const templateId of templates) {
    console.log(`📋 Testing ${templateId.toUpperCase()} template:`);

    for (const fontSize of fontSizes) {
      console.log(`  📏 Font size: ${fontSize}`);

      try {
        const context = templateEngine.buildTemplateContext(
          shopSettings,
          sampleData,
          {},
          fontSize
        );

        // Generate preview version
        const previewHtml = await templateEngine.renderReceipt(
          templateId,
          context,
          true
        );

        // Generate actual version
        const actualHtml = await templateEngine.renderReceipt(
          templateId,
          context,
          false
        );

        // Compare key elements
        const previewShopNameMatch = previewHtml.match(
          /\.shop-name[^}]*font-size:\s*(\d+)px/
        );
        const actualShopNameMatch = actualHtml.match(
          /\.shop-name[^}]*font-size:\s*(\d+)px/
        );

        const previewItemMatch = previewHtml.match(
          /\.item-name[^}]*font-size:\s*(\d+)px/
        );
        const actualItemMatch = actualHtml.match(
          /\.item-name[^}]*font-size:\s*(\d+)px/
        );

        if (
          previewShopNameMatch &&
          actualShopNameMatch &&
          previewItemMatch &&
          actualItemMatch
        ) {
          const previewShopSize = parseInt(previewShopNameMatch[1]);
          const actualShopSize = parseInt(actualShopNameMatch[1]);
          const previewItemSize = parseInt(previewItemMatch[1]);
          const actualItemSize = parseInt(actualItemMatch[1]);

          console.log(
            `    Shop name: Preview ${previewShopSize}px vs Actual ${actualShopSize}px`
          );
          console.log(
            `    Item name: Preview ${previewItemSize}px vs Actual ${actualItemSize}px`
          );

          // Check if preview maintains the same font ratios as actual
          const previewRatio = previewShopSize / previewItemSize;
          const actualRatio = actualShopSize / actualItemSize;
          const ratioMatch = Math.abs(previewRatio - actualRatio) < 0.1;

          console.log(
            `    Ratio match: ${
              ratioMatch ? '✅' : '❌'
            } (${previewRatio.toFixed(2)} vs ${actualRatio.toFixed(2)})`
          );
        }

        // Check for CSS variables in preview
        const hasCSSVariables = previewHtml.includes('--shop-name-size:');
        console.log(`    CSS variables: ${hasCSSVariables ? '✅' : '❌'}`);

        // Check for responsive CSS in preview
        const hasResponsiveCSS = previewHtml.includes('@media screen');
        console.log(`    Responsive CSS: ${hasResponsiveCSS ? '✅' : '❌'}`);
      } catch (error) {
        console.error(`    ❌ Error testing ${fontSize}:`, error);
      }
    }
    console.log('');
  }

  console.log('✅ Preview accuracy test completed!');
}

// Run the test
testPreviewAccuracy().catch(console.error);
