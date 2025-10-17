import { ESCPOSConverter, ReceiptData } from '@/utils/escposConverter';
import { ShopSettings } from '@/services/shopSettingsStorage';

describe('ESCPOSConverter', () => {
  const mockReceiptData: ReceiptData = {
    saleId: 'TEST001',
    items: [
      {
        product: {
          id: '1',
          name: 'Test Product 1',
          price: 1000,
        },
        quantity: 2,
        discount: 0,
        subtotal: 2000,
      },
      {
        product: {
          id: '2',
          name: 'Test Product 2 with Long Name',
          price: 1500,
        },
        quantity: 1,
        discount: 100,
        subtotal: 1400,
      },
    ],
    total: 3400,
    paymentMethod: 'CASH',
    note: 'Test note',
    date: new Date('2025-01-15T10:30:00Z'),
  };

  const mockShopSettings: ShopSettings = {
    shopName: 'Test Shop',
    address: '123 Test Street',
    phone: '+95-9-123-456-789',
    receiptFooter: 'Thank you for your business!',
    thankYouMessage: 'Come again soon!',
    receiptTemplate: 'classic',
    lastUpdated: '2025-01-15T10:00:00Z',
  };

  describe('convertReceipt', () => {
    it('should generate ESC/POS commands with shop settings', () => {
      const result = ESCPOSConverter.convertReceipt(
        mockReceiptData,
        mockShopSettings
      );

      // Check for initialization command
      expect(result).toContain('\x1B@');

      // Check for shop name
      expect(result).toContain('Test Shop');

      // Check for receipt ID
      expect(result).toContain('TEST001');

      // Check for items
      expect(result).toContain('Test Product 1');
      expect(result).toContain('Test Product 2');

      // Check for total
      expect(result).toContain('3,400 MMK');

      // Check for payment method
      expect(result).toContain('CASH');

      // Check for note
      expect(result).toContain('Test note');

      // Check for footer messages
      expect(result).toContain('Thank you for your business!');
      expect(result).toContain('Come again soon!');

      // Check for paper cut command
      expect(result).toContain('\x1DV\x00');
    });

    it('should generate ESC/POS commands without shop settings', () => {
      const result = ESCPOSConverter.convertReceipt(mockReceiptData, null);

      // Check for default shop name
      expect(result).toContain('Mobile POS');

      // Should still contain receipt data
      expect(result).toContain('TEST001');
      expect(result).toContain('Test Product 1');
      expect(result).toContain('3,400 MMK');
    });

    it('should handle items with discounts', () => {
      const result = ESCPOSConverter.convertReceipt(
        mockReceiptData,
        mockShopSettings
      );

      // Check for discount line
      expect(result).toContain('Discount');
      expect(result).toContain('-100 MMK');
    });

    it('should format currency correctly', () => {
      const testData = {
        ...mockReceiptData,
        total: 12345,
      };

      const result = ESCPOSConverter.convertReceipt(testData, mockShopSettings);

      // Check for formatted currency
      expect(result).toContain('12,345 MMK');
    });

    it('should truncate long product names', () => {
      const testData = {
        ...mockReceiptData,
        items: [
          {
            product: {
              id: '1',
              name: 'This is a very long product name that should be truncated',
              price: 1000,
            },
            quantity: 1,
            discount: 0,
            subtotal: 1000,
          },
        ],
      };

      const result = ESCPOSConverter.convertReceipt(testData, mockShopSettings);

      // Should contain truncated name with ellipsis
      expect(result).toContain('...');
    });

    it('should handle receipt without note', () => {
      const testData = {
        ...mockReceiptData,
        note: undefined,
      };

      const result = ESCPOSConverter.convertReceipt(testData, mockShopSettings);

      // Should not contain note section
      expect(result).not.toContain('Note:');
    });

    it('should include proper text formatting commands', () => {
      const result = ESCPOSConverter.convertReceipt(
        mockReceiptData,
        mockShopSettings
      );

      // Check for bold commands
      expect(result).toContain('\x1BE\x01'); // Bold on
      expect(result).toContain('\x1BE\x00'); // Bold off

      // Check for alignment commands
      expect(result).toContain('\x1Ba\x01'); // Center align
      expect(result).toContain('\x1Ba\x00'); // Left align

      // Check for double height commands
      expect(result).toContain('\x1B!\x10'); // Double height on
      expect(result).toContain('\x1B!\x00'); // Double height off
    });
  });
});
