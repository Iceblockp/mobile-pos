import {
  TemplateEngine,
  ReceiptData,
  TemplateContext,
} from '../templateEngine';
import { ShopSettings } from '../shopSettingsStorage';

// Mock FileSystem
jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  EncodingType: {
    Base64: 'base64',
  },
}));

describe('TemplateEngine', () => {
  let templateEngine: TemplateEngine;
  let mockShopSettings: ShopSettings;
  let mockReceiptData: ReceiptData;
  let mockFileSystem: any;

  beforeEach(() => {
    templateEngine = new TemplateEngine();

    // Setup FileSystem mocks
    mockFileSystem = require('expo-file-system');
    mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true });
    mockFileSystem.readAsStringAsync.mockResolvedValue('base64ImageData');

    mockShopSettings = {
      id: 1,
      shopName: 'Test Shop',
      address: '123 Test Street',
      phone: '+95-9-123-456-789',
      logoPath: '/path/to/logo.png',
      receiptFooter: 'Thank you for your business!',
      thankYouMessage: 'Come again soon!',
      receiptTemplate: 'classic',
      createdAt: '2025-01-01 00:00:00',
      updatedAt: '2025-01-01 00:00:00',
    };

    mockReceiptData = {
      saleId: 12345,
      items: [
        {
          product: { id: 1, name: 'Test Product 1', price: 2500 },
          quantity: 2,
          discount: 0,
          subtotal: 5000,
        },
        {
          product: { id: 2, name: 'Test Product 2', price: 1500 },
          quantity: 1,
          discount: 200,
          subtotal: 1300,
        },
      ],
      total: 6300,
      paymentMethod: 'CASH',
      note: 'Test transaction',
      date: new Date('2025-01-15T10:30:00'),
    };
  });

  describe('initialization', () => {
    it('should initialize with default templates', () => {
      const templates = templateEngine.getAvailableTemplates();

      expect(templates).toHaveLength(4);
      expect(templates.map((t) => t.id)).toEqual([
        'classic',
        'modern',
        'minimal',
        'elegant',
      ]);
    });

    it('should have all required template properties', () => {
      const templates = templateEngine.getAvailableTemplates();

      templates.forEach((template) => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('htmlTemplate');
        expect(template).toHaveProperty('cssStyles');
        expect(typeof template.htmlTemplate).toBe('string');
        expect(typeof template.cssStyles).toBe('string');
        expect(template.htmlTemplate.length).toBeGreaterThan(0);
        expect(template.cssStyles.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getTemplate', () => {
    it('should return template by id', () => {
      const template = templateEngine.getTemplate('classic');

      expect(template).toBeTruthy();
      expect(template?.id).toBe('classic');
      expect(template?.name).toBe('Classic');
    });

    it('should return null for non-existent template', () => {
      const template = templateEngine.getTemplate('non-existent');

      expect(template).toBeNull();
    });
  });

  describe('buildTemplateContext', () => {
    it('should build context with shop settings', () => {
      const context = templateEngine.buildTemplateContext(
        mockShopSettings,
        mockReceiptData,
        { test: 'translation' }
      );

      expect(context.shopSettings).toBe(mockShopSettings);
      expect(context.receiptData).toBe(mockReceiptData);
      expect(context.translations).toEqual({ test: 'translation' });
      expect(context.formatters).toHaveProperty('formatMMK');
      expect(context.formatters).toHaveProperty('formatDate');
    });

    it('should build context without shop settings', () => {
      const context = templateEngine.buildTemplateContext(
        null,
        mockReceiptData
      );

      expect(context.shopSettings).toBeNull();
      expect(context.receiptData).toBe(mockReceiptData);
      expect(context.formatters).toHaveProperty('formatMMK');
      expect(context.formatters).toHaveProperty('formatDate');
    });
  });

  describe('formatters', () => {
    let context: TemplateContext;

    beforeEach(() => {
      context = templateEngine.buildTemplateContext(
        mockShopSettings,
        mockReceiptData
      );
    });

    it('should format MMK currency correctly', () => {
      expect(context.formatters.formatMMK(1000)).toBe('1,000 MMK');
      expect(context.formatters.formatMMK(1234567)).toBe('1,234,567 MMK');
      expect(context.formatters.formatMMK(0)).toBe('0 MMK');
    });

    it('should format date correctly', () => {
      const testDate = new Date('2025-01-15T10:30:00');
      const formatted = context.formatters.formatDate(testDate);

      expect(formatted).toMatch(/Jan 15, 2025/);
      expect(formatted).toMatch(/10:30/);
    });
  });

  describe('renderReceipt', () => {
    it('should render receipt with shop settings', async () => {
      const context = templateEngine.buildTemplateContext(
        mockShopSettings,
        mockReceiptData
      );
      const html = await templateEngine.renderReceipt('classic', context);

      expect(html).toContain('Test Shop');
      expect(html).toContain('123 Test Street');
      expect(html).toContain('+95-9-123-456-789');
      expect(html).toContain('Thank you for your business!');
      expect(html).toContain('Come again soon!');
      expect(html).toContain('12345');
      expect(html).toContain('6,300 MMK');
      expect(html).toContain('Test Product 1');
      expect(html).toContain('Test Product 2');
      expect(html).toContain('CASH');
    });

    it('should render receipt without shop settings', async () => {
      const context = templateEngine.buildTemplateContext(
        null,
        mockReceiptData
      );
      const html = await templateEngine.renderReceipt('classic', context);

      expect(html).toContain('Mobile POS');
      expect(html).toContain('Thank you for your business!');
      expect(html).toContain('12345');
      expect(html).toContain('6,300 MMK');
      expect(html).toContain('display: none'); // Logo should be hidden
    });

    it('should handle items with discounts', async () => {
      const context = templateEngine.buildTemplateContext(
        mockShopSettings,
        mockReceiptData
      );
      const html = await templateEngine.renderReceipt('classic', context);

      expect(html).toContain('Discount');
      expect(html).toContain('-200 MMK');
    });

    it('should throw error for non-existent template', async () => {
      const context = templateEngine.buildTemplateContext(
        mockShopSettings,
        mockReceiptData
      );

      await expect(
        templateEngine.renderReceipt('non-existent', context)
      ).rejects.toThrow('Template not found: non-existent');
    });

    it('should include CSS styles in rendered HTML', async () => {
      const context = templateEngine.buildTemplateContext(
        mockShopSettings,
        mockReceiptData
      );
      const html = await templateEngine.renderReceipt('classic', context);

      expect(html).toContain('<style>');
      expect(html).toContain('font-family');
      expect(html).toContain('.receipt');
      expect(html).toContain('</style>');
    });

    it('should render complete HTML document', async () => {
      const context = templateEngine.buildTemplateContext(
        mockShopSettings,
        mockReceiptData
      );
      const html = await templateEngine.renderReceipt('classic', context);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
      expect(html).toContain('</html>');
      expect(html).toContain('<title>Receipt #12345</title>');
    });
  });

  describe('previewTemplate', () => {
    it('should generate preview with sample data', async () => {
      const html = await templateEngine.previewTemplate(
        'classic',
        mockShopSettings
      );

      expect(html).toContain('Test Shop');
      expect(html).toContain('Sample Product 1');
      expect(html).toContain('Sample Product 2');
      expect(html).toContain('6,300 MMK');
      expect(html).toContain('CASH');
    });

    it('should generate preview without shop settings', async () => {
      const html = await templateEngine.previewTemplate('classic', null);

      expect(html).toContain('Mobile POS');
      expect(html).toContain('Sample Product 1');
      expect(html).toContain('Sample Product 2');
    });

    it('should work with all template types', async () => {
      const templates = ['classic', 'modern', 'minimal', 'elegant'];

      for (const templateId of templates) {
        const html = await templateEngine.previewTemplate(
          templateId,
          mockShopSettings
        );
        expect(html).toContain('Test Shop');
        expect(html).toContain('Sample Product');
        expect(html.length).toBeGreaterThan(1000); // Should be substantial HTML
      }
    });
  });

  describe('template content validation', () => {
    it('should have all required placeholders in templates', () => {
      const templates = templateEngine.getAvailableTemplates();
      const requiredPlaceholders = [
        '{{shopName}}',
        '{{address}}',
        '{{phone}}',
        '{{logoSrc}}',
        '{{showLogo}}',
        '{{saleId}}',
        '{{date}}',
        '{{paymentMethod}}',
        '{{total}}',
        '{{items}}',
        '{{receiptFooter}}',
        '{{thankYouMessage}}',
      ];

      templates.forEach((template) => {
        requiredPlaceholders.forEach((placeholder) => {
          expect(template.htmlTemplate).toContain(placeholder);
        });
      });
    });

    it('should have valid CSS in all templates', () => {
      const templates = templateEngine.getAvailableTemplates();

      templates.forEach((template) => {
        expect(template.cssStyles).toContain('body');
        expect(template.cssStyles).toContain('.receipt');
        expect(template.cssStyles).toContain('font-family');
        // Should not contain obvious syntax errors
        expect(template.cssStyles).not.toContain('{{');
        expect(template.cssStyles).not.toContain('}}');
      });
    });
  });

  describe('logo handling', () => {
    it('should convert logo to base64 for PDF compatibility', async () => {
      const context = templateEngine.buildTemplateContext(
        mockShopSettings,
        mockReceiptData
      );
      const html = await templateEngine.renderReceipt('classic', context);

      expect(mockFileSystem.getInfoAsync).toHaveBeenCalledWith(
        '/path/to/logo.png'
      );
      expect(mockFileSystem.readAsStringAsync).toHaveBeenCalledWith(
        '/path/to/logo.png',
        { encoding: 'base64' }
      );
      expect(html).toContain('data:image/png;base64,base64ImageData');
      expect(html).toContain('display: block');
    });

    it('should handle missing logo file gracefully', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: false });

      const context = templateEngine.buildTemplateContext(
        mockShopSettings,
        mockReceiptData
      );
      const html = await templateEngine.renderReceipt('classic', context);

      expect(html).toContain('display: none');
      expect(html).not.toContain('data:image');
    });

    it('should handle logo conversion errors gracefully', async () => {
      mockFileSystem.readAsStringAsync.mockRejectedValue(
        new Error('Read failed')
      );

      const context = templateEngine.buildTemplateContext(
        mockShopSettings,
        mockReceiptData
      );
      const html = await templateEngine.renderReceipt('classic', context);

      expect(html).toContain('display: none');
      expect(html).not.toContain('data:image');
    });
  });

  describe('error handling', () => {
    it('should handle missing shop settings gracefully', async () => {
      const context = templateEngine.buildTemplateContext(
        null,
        mockReceiptData
      );
      const html = await templateEngine.renderReceipt('classic', context);

      expect(html).toBeTruthy();
      expect(html).toContain('Mobile POS');
    });

    it('should handle empty items array', async () => {
      const emptyReceiptData = { ...mockReceiptData, items: [] };
      const context = templateEngine.buildTemplateContext(
        mockShopSettings,
        emptyReceiptData
      );
      const html = await templateEngine.renderReceipt('classic', context);

      expect(html).toBeTruthy();
      expect(html).toContain('Test Shop');
    });

    it('should handle missing optional fields', async () => {
      const minimalShopSettings = {
        ...mockShopSettings,
        address: '',
        phone: '',
        logoPath: '',
        receiptFooter: '',
        thankYouMessage: '',
      };

      const context = templateEngine.buildTemplateContext(
        minimalShopSettings,
        mockReceiptData
      );
      const html = await templateEngine.renderReceipt('classic', context);

      expect(html).toBeTruthy();
      expect(html).toContain('Test Shop');
      expect(html).toContain('display: none'); // Logo should be hidden
    });
  });
});
