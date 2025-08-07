import { ShopSettings } from '@/services/shopSettingsStorage';
import { ShopSettingsService } from '@/services/shopSettingsService';
import { TemplateEngine } from '@/services/templateEngine';
import * as SQLite from 'expo-sqlite';
import { DatabaseService } from '@/services/database';
import { DatabaseService } from '@/services/database';
import { DatabaseService } from '@/services/database';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

// Mock file system operations
jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

// Mock image picker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

describe('Shop Branded Receipts Integration Tests', () => {
  let mockDb: any;
  let databaseService: DatabaseService;
  let shopSettingsService: ShopSettingsService;
  let templateEngine: TemplateEngine;

  beforeEach(async () => {
    // Mock database
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

    // Mock file system for logo directory
    const mockFileSystem = require('expo-file-system');
    mockFileSystem.getInfoAsync.mockResolvedValue({ exists: false });
    mockFileSystem.makeDirectoryAsync.mockResolvedValue();
  });

  describe('Complete Shop Setup Workflow', () => {
    it('should complete full shop setup from creation to receipt generation', async () => {
      // Step 1: Create new shop settings
      const shopData = {
        shopName: 'Test Electronics Store',
        address: '123 Main Street, Downtown',
        phone: '+95-9-123-456-789',
        logoPath: '',
        receiptFooter: 'Thank you for your business!',
        thankYouMessage: 'Come again soon!',
        receiptTemplate: 'modern',
      };

      // Mock database responses for creation
      mockDb.getFirstAsync.mockResolvedValueOnce(null); // No existing settings
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 1 });

      // Save shop settings
      const shopId = await shopSettingsService.saveShopSettings(shopData);
      expect(shopId).toBe(1);

      // Step 2: Verify settings were saved
      const savedShopSettings: ShopSettings = {
        id: 1,
        shopName: shopData.shopName,
        address: shopData.address,
        phone: shopData.phone,
        logoPath: shopData.logoPath,
        receiptFooter: shopData.receiptFooter,
        thankYouMessage: shopData.thankYouMessage,
        receiptTemplate: shopData.receiptTemplate,
        createdAt: '2025-01-15 10:00:00',
        updatedAt: '2025-01-15 10:00:00',
      };

      mockDb.getFirstAsync.mockResolvedValueOnce({
        id: 1,
        shop_name: shopData.shopName,
        address: shopData.address,
        phone: shopData.phone,
        logo_path: shopData.logoPath,
        receipt_footer: shopData.receiptFooter,
        thank_you_message: shopData.thankYouMessage,
        receipt_template: shopData.receiptTemplate,
        created_at: '2025-01-15 10:00:00',
        updated_at: '2025-01-15 10:00:00',
      });

      const retrievedSettings = await shopSettingsService.getShopSettings();
      expect(retrievedSettings).toEqual(savedShopSettings);

      // Step 3: Generate receipt with shop branding
      const receiptData = {
        saleId: 12345,
        items: [
          {
            product: { id: 1, name: 'Smartphone', price: 150000 },
            quantity: 1,
            discount: 5000,
            subtotal: 145000,
          },
          {
            product: { id: 2, name: 'Phone Case', price: 15000 },
            quantity: 2,
            discount: 0,
            subtotal: 30000,
          },
        ],
        total: 175000,
        paymentMethod: 'CASH',
        note: 'Customer requested gift wrapping',
        date: new Date('2025-01-15T14:30:00'),
      };

      const context = templateEngine.buildTemplateContext(
        savedShopSettings,
        receiptData,
        {
          mobilePOS: 'Mobile POS',
          total: 'TOTAL',
          discount: 'Discount',
        }
      );

      const receiptHtml = await templateEngine.renderReceipt('modern', context);

      // Verify receipt contains shop information
      expect(receiptHtml).toContain('Test Electronics Store');
      expect(receiptHtml).toContain('123 Main Street, Downtown');
      expect(receiptHtml).toContain('+95-9-123-456-789');
      expect(receiptHtml).toContain('Thank you for your business!');
      expect(receiptHtml).toContain('Come again soon!');
      expect(receiptHtml).toContain('12345');
      expect(receiptHtml).toContain('175,000 MMK');
      expect(receiptHtml).toContain('Smartphone');
      expect(receiptHtml).toContain('Phone Case');
    });

    it('should handle logo upload and display in receipts', async () => {
      // Step 1: Mock logo upload
      const mockImageUri = '/mock/selected-image.jpg';
      const mockLogoPath = '/mock/documents/shop_logos/logo_1642234567890.jpg';

      const mockFileSystem = require('expo-file-system');
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        size: 1024 * 1024, // 1MB
        modificationTime: Date.now(),
        uri: mockImageUri,
      });
      mockFileSystem.copyAsync.mockResolvedValue();

      const logoPath = await shopSettingsService.uploadLogo(mockImageUri);
      expect(logoPath).toContain('shop_logos/logo_');

      // Step 2: Create shop settings with logo
      const shopData = {
        shopName: 'Logo Test Shop',
        address: '456 Logo Street',
        phone: '+95-9-987-654-321',
        logoPath: logoPath,
        receiptFooter: 'Visit our website!',
        thankYouMessage: 'Thank you!',
        receiptTemplate: 'classic',
      };

      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 2 });
      await shopSettingsService.saveShopSettings(shopData);

      // Step 3: Generate receipt with logo
      const shopSettings: ShopSettings = {
        id: 2,
        ...shopData,
        createdAt: '2025-01-15 11:00:00',
        updatedAt: '2025-01-15 11:00:00',
      };

      const receiptData = {
        saleId: 67890,
        items: [
          {
            product: { id: 3, name: 'Test Product', price: 25000 },
            quantity: 1,
            discount: 0,
            subtotal: 25000,
          },
        ],
        total: 25000,
        paymentMethod: 'CARD',
        date: new Date(),
      };

      const context = templateEngine.buildTemplateContext(
        shopSettings,
        receiptData
      );
      const receiptHtml = await templateEngine.renderReceipt(
        'classic',
        context
      );

      // Verify logo is included in receipt
      expect(receiptHtml).toContain(`src="${logoPath}"`);
      expect(receiptHtml).toContain('display: block'); // Logo should be visible
      expect(receiptHtml).toContain('Logo Test Shop');
    });

    it('should handle template switching and receipt output changes', async () => {
      // Step 1: Create shop settings
      const shopSettings: ShopSettings = {
        id: 3,
        shopName: 'Template Test Shop',
        address: '789 Template Ave',
        phone: '+95-9-555-123-456',
        logoPath: '',
        receiptFooter: 'Template testing',
        thankYouMessage: 'Thanks for testing!',
        receiptTemplate: 'minimal',
        createdAt: '2025-01-15 12:00:00',
        updatedAt: '2025-01-15 12:00:00',
      };

      const receiptData = {
        saleId: 11111,
        items: [
          {
            product: { id: 4, name: 'Template Product', price: 50000 },
            quantity: 1,
            discount: 0,
            subtotal: 50000,
          },
        ],
        total: 50000,
        paymentMethod: 'CASH',
        date: new Date(),
      };

      // Step 2: Generate receipts with different templates
      const templates = ['classic', 'modern', 'minimal', 'elegant'];
      const receiptOutputs: { [key: string]: string } = {};

      for (const templateId of templates) {
        const context = templateEngine.buildTemplateContext(
          shopSettings,
          receiptData
        );
        const html = await templateEngine.renderReceipt(templateId, context);
        receiptOutputs[templateId] = html;

        // Verify all templates contain shop information
        expect(html).toContain('Template Test Shop');
        expect(html).toContain('789 Template Ave');
        expect(html).toContain('Template testing');
        expect(html).toContain('50,000 MMK');
      }

      // Step 3: Verify templates produce different outputs
      const classicHtml = receiptOutputs.classic;
      const modernHtml = receiptOutputs.modern;
      const minimalHtml = receiptOutputs.minimal;
      const elegantHtml = receiptOutputs.elegant;

      // Templates should have different styling
      expect(classicHtml).toContain('Courier New');
      expect(modernHtml).toContain('sans-serif');
      expect(minimalHtml).toContain('Helvetica');
      expect(elegantHtml).toContain('Georgia');

      // All should contain the same data but with different presentation
      [classicHtml, modernHtml, minimalHtml, elegantHtml].forEach((html) => {
        expect(html).toContain('Template Test Shop');
        expect(html).toContain('11111');
        expect(html).toContain('Template Product');
      });
    });

    it('should persist settings across app restarts', async () => {
      // Step 1: Create and save settings
      const originalSettings = {
        shopName: 'Persistence Test Shop',
        address: '321 Persistence Blvd',
        phone: '+95-9-111-222-333',
        logoPath: '/mock/logo.png',
        receiptFooter: 'Persistent footer',
        thankYouMessage: 'Persistent message',
        receiptTemplate: 'elegant',
      };

      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 4 });
      await shopSettingsService.saveShopSettings(originalSettings);

      // Step 2: Simulate app restart by creating new service instance
      const newDatabaseService = new DatabaseService(mockDb);
      const newShopSettingsService = new ShopSettingsService(
        newDatabaseService
      );

      // Mock database response for loading
      mockDb.getFirstAsync.mockResolvedValueOnce({
        id: 4,
        shop_name: originalSettings.shopName,
        address: originalSettings.address,
        phone: originalSettings.phone,
        logo_path: originalSettings.logoPath,
        receipt_footer: originalSettings.receiptFooter,
        thank_you_message: originalSettings.thankYouMessage,
        receipt_template: originalSettings.receiptTemplate,
        created_at: '2025-01-15 13:00:00',
        updated_at: '2025-01-15 13:00:00',
      });

      // Step 3: Load settings with new service instance
      const loadedSettings = await newShopSettingsService.getShopSettings();

      expect(loadedSettings).toEqual({
        id: 4,
        shopName: originalSettings.shopName,
        address: originalSettings.address,
        phone: originalSettings.phone,
        logoPath: originalSettings.logoPath,
        receiptFooter: originalSettings.receiptFooter,
        thankYouMessage: originalSettings.thankYouMessage,
        receiptTemplate: originalSettings.receiptTemplate,
        createdAt: '2025-01-15 13:00:00',
        updatedAt: '2025-01-15 13:00:00',
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing shop settings gracefully', async () => {
      // Mock no shop settings found
      mockDb.getFirstAsync.mockResolvedValue(null);

      const settings = await shopSettingsService.getShopSettings();
      expect(settings).toBeNull();

      // Should still generate receipt with default values
      const receiptData = {
        saleId: 99999,
        items: [
          {
            product: { id: 5, name: 'Default Product', price: 10000 },
            quantity: 1,
            discount: 0,
            subtotal: 10000,
          },
        ],
        total: 10000,
        paymentMethod: 'CASH',
        date: new Date(),
      };

      const context = templateEngine.buildTemplateContext(null, receiptData);
      const receiptHtml = await templateEngine.renderReceipt(
        'classic',
        context
      );

      expect(receiptHtml).toContain('Mobile POS'); // Default shop name
      expect(receiptHtml).toContain('10,000 MMK');
      expect(receiptHtml).toContain('Default Product');
      expect(receiptHtml).toContain('display: none'); // Logo should be hidden
    });

    it('should handle template loading failures with fallback', async () => {
      const shopSettings: ShopSettings = {
        id: 5,
        shopName: 'Fallback Test Shop',
        address: '',
        phone: '',
        logoPath: '',
        receiptFooter: '',
        thankYouMessage: '',
        receiptTemplate: 'non-existent-template',
        createdAt: '2025-01-15 14:00:00',
        updatedAt: '2025-01-15 14:00:00',
      };

      const receiptData = {
        saleId: 88888,
        items: [],
        total: 0,
        paymentMethod: 'CASH',
        date: new Date(),
      };

      // Should throw error for non-existent template
      const context = templateEngine.buildTemplateContext(
        shopSettings,
        receiptData
      );
      await expect(
        templateEngine.renderReceipt('non-existent-template', context)
      ).rejects.toThrow('Template not found: non-existent-template');

      // But should work with valid template
      const validHtml = await templateEngine.renderReceipt('classic', context);
      expect(validHtml).toContain('Fallback Test Shop');
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockDb.runAsync.mockRejectedValue(
        new Error('Database connection failed')
      );

      const shopData = {
        shopName: 'Error Test Shop',
        address: '',
        phone: '',
        logoPath: '',
        receiptFooter: '',
        thankYouMessage: '',
        receiptTemplate: 'classic',
      };

      // Should propagate database errors
      await expect(
        shopSettingsService.saveShopSettings(shopData)
      ).rejects.toThrow('Failed to save shop settings');
    });
  });

  describe('Performance and Caching', () => {
    it('should cache template compilation for better performance', async () => {
      const shopSettings: ShopSettings = {
        id: 6,
        shopName: 'Performance Test Shop',
        address: '',
        phone: '',
        logoPath: '',
        receiptFooter: '',
        thankYouMessage: '',
        receiptTemplate: 'modern',
        createdAt: '2025-01-15 15:00:00',
        updatedAt: '2025-01-15 15:00:00',
      };

      const receiptData = {
        saleId: 77777,
        items: [
          {
            product: { id: 6, name: 'Performance Product', price: 30000 },
            quantity: 1,
            discount: 0,
            subtotal: 30000,
          },
        ],
        total: 30000,
        paymentMethod: 'CASH',
        date: new Date(),
      };

      // Generate multiple receipts with same template
      const startTime = Date.now();

      for (let i = 0; i < 10; i++) {
        const context = templateEngine.buildTemplateContext(
          shopSettings,
          receiptData
        );
        const html = await templateEngine.renderReceipt('modern', context);
        expect(html).toContain('Performance Test Shop');
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete reasonably quickly (less than 1 second for 10 receipts)
      expect(duration).toBeLessThan(1000);
    });
  });
});
