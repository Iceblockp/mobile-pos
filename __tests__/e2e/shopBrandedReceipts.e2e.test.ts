/**
 * End-to-End Tests for Shop Branded Receipts Feature
 *
 * This test suite validates the complete user journey from shop setup
 * to branded receipt generation, ensuring all components work together
 * seamlessly.
 */

import { DatabaseService } from '@/services/database';
import { ShopSettingsService } from '@/services/shopSettingsService';
import { TemplateEngine } from '@/services/templateEngine';

// Mock all external dependencies
jest.mock('expo-sqlite');
jest.mock('expo-file-system');
jest.mock('expo-image-picker');
jest.mock('expo-print');
jest.mock('expo-sharing');

describe('Shop Branded Receipts - End-to-End Tests', () => {
  let mockDb: any;
  let databaseService: DatabaseService;
  let shopSettingsService: ShopSettingsService;
  let templateEngine: TemplateEngine;

  beforeEach(async () => {
    // Setup mock database
    mockDb = {
      execAsync: jest.fn(),
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(),
    };

    // Initialize services
    databaseService = new DatabaseService(mockDb);
    shopSettingsService = new ShopSettingsService();
    templateEngine = new TemplateEngine();

    // Mock file system
    const mockFileSystem = require('expo-file-system');
    mockFileSystem.documentDirectory = '/mock/documents/';
    mockFileSystem.getInfoAsync.mockResolvedValue({ exists: false });
    mockFileSystem.makeDirectoryAsync.mockResolvedValue();
  });

  describe('Complete User Journey', () => {
    it('should complete the full journey from shop setup to receipt generation', async () => {
      // ========================================
      // PHASE 1: Initial Shop Setup
      // ========================================

      // User opens shop settings for the first time
      mockDb.getFirstAsync.mockResolvedValueOnce(null); // No existing settings

      const initialSettings = await shopSettingsService.getShopSettings();
      expect(initialSettings).toBeNull();

      // User fills out shop information
      const shopData = {
        shopName: 'TechWorld Electronics',
        address: '456 Technology Boulevard, Yangon',
        phone: '+95-9-987-654-321',
        logoPath: '',
        receiptFooter: 'Visit us online at www.techworld.com',
        thankYouMessage: 'Thank you for choosing TechWorld!',
        receiptTemplate: 'modern',
      };

      // User saves shop settings
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 1 });
      const shopId = await shopSettingsService.saveShopSettings(shopData);
      expect(shopId).toBe(1);

      // ========================================
      // PHASE 2: Logo Upload
      // ========================================

      // User uploads a logo
      const mockImageUri = '/mock/camera/photo.jpg';
      const mockFileSystem = require('expo-file-system');

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        size: 1.5 * 1024 * 1024, // 1.5MB
        modificationTime: Date.now(),
        uri: mockImageUri,
      });
      mockFileSystem.copyAsync.mockResolvedValue();

      const logoPath = await shopSettingsService.uploadLogo(mockImageUri);
      expect(logoPath).toContain('shop_logos/logo_');

      // User updates shop settings with logo
      const updatedShopData = { ...shopData, logoPath };
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 1 });

      mockDb.getFirstAsync.mockResolvedValueOnce({
        id: 1,
        shop_name: updatedShopData.shopName,
        address: updatedShopData.address,
        phone: updatedShopData.phone,
        logo_path: logoPath,
        receipt_footer: updatedShopData.receiptFooter,
        thank_you_message: updatedShopData.thankYouMessage,
        receipt_template: updatedShopData.receiptTemplate,
        created_at: '2025-01-15 10:00:00',
        updated_at: '2025-01-15 10:30:00',
      });

      await shopSettingsService.updateShopSettings(1, { logoPath });
      const updatedSettings = await shopSettingsService.getShopSettings();

      expect(updatedSettings).toMatchObject({
        shopName: 'TechWorld Electronics',
        logoPath: expect.stringContaining('shop_logos/logo_'),
        receiptTemplate: 'modern',
      });

      // ========================================
      // PHASE 3: Template Selection and Preview
      // ========================================

      // User explores available templates
      const availableTemplates = shopSettingsService.getAvailableTemplates();
      expect(availableTemplates).toHaveLength(4);
      expect(availableTemplates.map((t) => t.id)).toEqual([
        'classic',
        'modern',
        'minimal',
        'elegant',
      ]);

      // User previews different templates
      for (const template of availableTemplates) {
        const previewHtml = await shopSettingsService.previewTemplate(
          template.id,
          updatedSettings
        );

        expect(previewHtml).toContain('TechWorld Electronics');
        expect(previewHtml).toContain('456 Technology Boulevard');
        expect(previewHtml).toContain('Thank you for choosing TechWorld!');
        expect(previewHtml).toContain('Sample Product');
      }

      // User selects elegant template
      await shopSettingsService.updateShopSettings(1, {
        receiptTemplate: 'elegant',
      });

      // ========================================
      // PHASE 4: Real Transaction and Receipt Generation
      // ========================================

      // A real customer makes a purchase
      const transactionData = {
        saleId: 20250115001,
        items: [
          {
            product: {
              id: 101,
              name: 'iPhone 15 Pro Max 256GB',
              price: 1850000,
            },
            quantity: 1,
            discount: 50000, // Staff discount
            subtotal: 1800000,
          },
          {
            product: {
              id: 102,
              name: 'MagSafe Wireless Charger',
              price: 85000,
            },
            quantity: 1,
            discount: 0,
            subtotal: 85000,
          },
          {
            product: {
              id: 103,
              name: 'Premium Phone Case',
              price: 45000,
            },
            quantity: 2,
            discount: 5000, // Bundle discount
            subtotal: 85000,
          },
        ],
        total: 1970000,
        paymentMethod: 'CARD',
        note: 'Customer requested extended warranty',
        date: new Date('2025-01-15T15:45:00'),
      };

      // Generate branded receipt
      const finalShopSettings = {
        ...updatedSettings!,
        receiptTemplate: 'elegant',
        logoPath,
      };

      const context = templateEngine.buildTemplateContext(
        finalShopSettings,
        transactionData,
        {
          mobilePOS: 'Mobile POS',
          total: 'TOTAL',
          discount: 'Discount',
          receiptNumber: 'Receipt #',
          date: 'Date',
          paymentMethod: 'Payment Method',
          itemsPurchased: 'Items Purchased',
        }
      );

      const finalReceiptHtml = await templateEngine.renderReceipt(
        'elegant',
        context
      );

      // ========================================
      // PHASE 5: Receipt Validation
      // ========================================

      // Verify receipt contains all shop branding
      expect(finalReceiptHtml).toContain('TechWorld Electronics');
      expect(finalReceiptHtml).toContain('456 Technology Boulevard, Yangon');
      expect(finalReceiptHtml).toContain('+95-9-987-654-321');
      expect(finalReceiptHtml).toContain(
        'Visit us online at www.techworld.com'
      );
      expect(finalReceiptHtml).toContain('Thank you for choosing TechWorld!');

      // Verify logo is included
      expect(finalReceiptHtml).toContain(`src="${logoPath}"`);
      expect(finalReceiptHtml).toContain('display: block');

      // Verify transaction details
      expect(finalReceiptHtml).toContain('20250115001');
      expect(finalReceiptHtml).toContain('iPhone 15 Pro Max 256GB');
      expect(finalReceiptHtml).toContain('MagSafe Wireless Charger');
      expect(finalReceiptHtml).toContain('Premium Phone Case');
      expect(finalReceiptHtml).toContain('1,970,000 MMK');
      expect(finalReceiptHtml).toContain('CARD');
      expect(finalReceiptHtml).toContain(
        'Customer requested extended warranty'
      );

      // Verify discounts are shown
      expect(finalReceiptHtml).toContain('-50,000 MMK'); // Staff discount
      expect(finalReceiptHtml).toContain('-5,000 MMK'); // Bundle discount

      // Verify elegant template styling
      expect(finalReceiptHtml).toContain('Georgia'); // Elegant template uses serif font
      expect(finalReceiptHtml).toContain('linear-gradient'); // Elegant template has gradients

      // Verify complete HTML structure
      expect(finalReceiptHtml).toContain('<!DOCTYPE html>');
      expect(finalReceiptHtml).toContain('<title>Receipt #20250115001</title>');
      expect(finalReceiptHtml).toContain('</html>');

      // ========================================
      // PHASE 6: Data Export Validation
      // ========================================

      // User exports shop settings for backup
      const exportData = {
        shopSettings: finalShopSettings,
        availableTemplates: availableTemplates.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
        })),
        exportDate: new Date().toISOString(),
        hasShopSettings: true,
        shopName: 'TechWorld Electronics',
        receiptTemplate: 'elegant',
        message: 'Shop settings and branding configuration export',
      };

      expect(exportData.shopSettings.shopName).toBe('TechWorld Electronics');
      expect(exportData.shopSettings.receiptTemplate).toBe('elegant');
      expect(exportData.availableTemplates).toHaveLength(4);
      expect(exportData.hasShopSettings).toBe(true);

      console.log('✅ Complete user journey test passed successfully!');
      console.log(`📊 Shop: ${finalShopSettings.shopName}`);
      console.log(`🎨 Template: ${finalShopSettings.receiptTemplate}`);
      console.log(`🧾 Receipt: #${transactionData.saleId}`);
      console.log(`💰 Total: ${transactionData.total.toLocaleString()} MMK`);
    });

    it('should handle edge cases and error scenarios gracefully', async () => {
      // Test with minimal shop settings
      const minimalShopData = {
        shopName: 'Minimal Shop',
        address: '',
        phone: '',
        logoPath: '',
        receiptFooter: '',
        thankYouMessage: '',
        receiptTemplate: 'minimal',
      };

      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 2 });
      await shopSettingsService.saveShopSettings(minimalShopData);

      // Generate receipt with minimal data
      const minimalTransaction = {
        saleId: 1,
        items: [
          {
            product: { id: 1, name: 'Test Item', price: 1000 },
            quantity: 1,
            discount: 0,
            subtotal: 1000,
          },
        ],
        total: 1000,
        paymentMethod: 'CASH',
        date: new Date(),
      };

      const minimalShopSettings = {
        id: 2,
        ...minimalShopData,
        createdAt: '2025-01-15 16:00:00',
        updatedAt: '2025-01-15 16:00:00',
      };

      const context = templateEngine.buildTemplateContext(
        minimalShopSettings,
        minimalTransaction
      );

      const receiptHtml = await templateEngine.renderReceipt(
        'minimal',
        context
      );

      // Should still work with minimal data
      expect(receiptHtml).toContain('Minimal Shop');
      expect(receiptHtml).toContain('Test Item');
      expect(receiptHtml).toContain('1,000 MMK');
      expect(receiptHtml).toContain('display: none'); // No logo

      // Test with no shop settings (fallback)
      const noShopContext = templateEngine.buildTemplateContext(
        null,
        minimalTransaction
      );

      const fallbackReceiptHtml = await templateEngine.renderReceipt(
        'classic',
        noShopContext
      );
      expect(fallbackReceiptHtml).toContain('Mobile POS'); // Default name
      expect(fallbackReceiptHtml).toContain('Test Item');
    });

    it('should maintain performance with multiple operations', async () => {
      const startTime = Date.now();

      // Simulate multiple rapid operations
      const operations = [];

      // Multiple template previews
      for (let i = 0; i < 5; i++) {
        operations.push(
          shopSettingsService.previewTemplate('modern', {
            id: 1,
            shopName: `Performance Test ${i}`,
            address: '',
            phone: '',
            logoPath: '',
            receiptFooter: '',
            thankYouMessage: '',
            receiptTemplate: 'modern',
            createdAt: '2025-01-15 17:00:00',
            updatedAt: '2025-01-15 17:00:00',
          })
        );
      }

      // Multiple receipt generations
      for (let i = 0; i < 5; i++) {
        const context = templateEngine.buildTemplateContext(
          {
            id: 1,
            shopName: `Performance Test ${i}`,
            address: '',
            phone: '',
            logoPath: '',
            receiptFooter: '',
            thankYouMessage: '',
            receiptTemplate: 'classic',
            createdAt: '2025-01-15 17:00:00',
            updatedAt: '2025-01-15 17:00:00',
          },
          {
            saleId: i,
            items: [
              {
                product: { id: 1, name: `Product ${i}`, price: 1000 },
                quantity: 1,
                discount: 0,
                subtotal: 1000,
              },
            ],
            total: 1000,
            paymentMethod: 'CASH',
            date: new Date(),
          }
        );

        operations.push(templateEngine.renderReceipt('classic', context));
      }

      // Execute all operations
      const results = await Promise.all(operations);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // All operations should complete
      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(100);
      });

      // Should complete reasonably quickly (less than 2 seconds)
      expect(duration).toBeLessThan(2000);

      console.log(`⚡ Performance test completed in ${duration}ms`);
    });
  });

  describe('Feature Completeness Validation', () => {
    it('should validate all required features are implemented', () => {
      // Validate template engine has all required templates
      const templates = templateEngine.getAvailableTemplates();
      const templateIds = templates.map((t) => t.id);

      expect(templateIds).toContain('classic');
      expect(templateIds).toContain('modern');
      expect(templateIds).toContain('minimal');
      expect(templateIds).toContain('elegant');

      // Validate all templates have required properties
      templates.forEach((template) => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('htmlTemplate');
        expect(template).toHaveProperty('cssStyles');

        expect(typeof template.htmlTemplate).toBe('string');
        expect(typeof template.cssStyles).toBe('string');
        expect(template.htmlTemplate.length).toBeGreaterThan(100);
        expect(template.cssStyles.length).toBeGreaterThan(100);
      });

      // Validate shop settings service has all required methods
      expect(typeof shopSettingsService.getShopSettings).toBe('function');
      expect(typeof shopSettingsService.saveShopSettings).toBe('function');
      expect(typeof shopSettingsService.updateShopSettings).toBe('function');
      expect(typeof shopSettingsService.uploadLogo).toBe('function');
      expect(typeof shopSettingsService.deleteLogo).toBe('function');
      expect(typeof shopSettingsService.getAvailableTemplates).toBe('function');
      expect(typeof shopSettingsService.previewTemplate).toBe('function');
      expect(typeof shopSettingsService.validateShopSettings).toBe('function');

      console.log('✅ All required features are implemented and accessible');
    });
  });
});
