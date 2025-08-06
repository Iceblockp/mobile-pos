import { DatabaseService, ShopSettings } from '../database';
import * as SQLite from 'expo-sqlite';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

describe('ShopSettings Database Operations', () => {
  let mockDb: any;
  let databaseService: DatabaseService;

  beforeEach(() => {
    mockDb = {
      execAsync: jest.fn(),
      runAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(),
    };
    databaseService = new DatabaseService(mockDb);
  });

  describe('getShopSettings', () => {
    it('should return null when no shop settings exist', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await databaseService.getShopSettings();

      expect(result).toBeNull();
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM shop_settings ORDER BY id DESC LIMIT 1'
      );
    });

    it('should return shop settings when they exist', async () => {
      const mockDbResult = {
        id: 1,
        shop_name: 'Test Shop',
        address: '123 Test St',
        phone: '+95-9-123-456-789',
        logo_path: '/path/to/logo.png',
        receipt_footer: 'Thank you!',
        thank_you_message: 'Come again!',
        receipt_template: 'classic',
        created_at: '2025-01-01 00:00:00',
        updated_at: '2025-01-01 00:00:00',
      };

      mockDb.getFirstAsync.mockResolvedValue(mockDbResult);

      const result = await databaseService.getShopSettings();

      expect(result).toEqual({
        id: 1,
        shopName: 'Test Shop',
        address: '123 Test St',
        phone: '+95-9-123-456-789',
        logoPath: '/path/to/logo.png',
        receiptFooter: 'Thank you!',
        thankYouMessage: 'Come again!',
        receiptTemplate: 'classic',
        createdAt: '2025-01-01 00:00:00',
        updatedAt: '2025-01-01 00:00:00',
      });
    });
  });

  describe('saveShopSettings', () => {
    it('should save shop settings correctly', async () => {
      const mockInsertResult = { lastInsertRowId: 1 };
      mockDb.runAsync.mockResolvedValue(mockInsertResult);

      const shopSettings = {
        shopName: 'New Shop',
        address: '456 New St',
        phone: '+95-9-987-654-321',
        logoPath: null,
        receiptFooter: 'Thanks for visiting!',
        thankYouMessage: 'See you soon!',
        receiptTemplate: 'modern',
      };

      const result = await databaseService.saveShopSettings(shopSettings);

      expect(result).toBe(1);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'INSERT INTO shop_settings (shop_name, address, phone, logo_path, receipt_footer, thank_you_message, receipt_template) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          'New Shop',
          '456 New St',
          '+95-9-987-654-321',
          null,
          'Thanks for visiting!',
          'See you soon!',
          'modern',
        ]
      );
    });
  });

  describe('updateShopSettings', () => {
    it('should update only provided fields', async () => {
      const updates = {
        shopName: 'Updated Shop',
        receiptTemplate: 'elegant',
      };

      await databaseService.updateShopSettings(1, updates);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'UPDATE shop_settings SET shop_name = ?, receipt_template = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['Updated Shop', 'elegant', 1]
      );
    });

    it('should not update when no fields provided', async () => {
      await databaseService.updateShopSettings(1, {});

      expect(mockDb.runAsync).not.toHaveBeenCalled();
    });
  });

  describe('deleteShopSettings', () => {
    it('should delete shop settings by id', async () => {
      await databaseService.deleteShopSettings(1);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM shop_settings WHERE id = ?',
        [1]
      );
    });
  });
});
