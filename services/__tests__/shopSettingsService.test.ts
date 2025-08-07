import { ShopSettingsService, ShopSettingsInput } from '../shopSettingsService';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

// Mock dependencies
jest.mock('expo-file-system');
jest.mock('expo-image-picker');
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;
const mockImagePicker = ImagePicker as jest.Mocked<typeof ImagePicker>;

describe('ShopSettingsService', () => {
  let shopSettingsService: ShopSettingsService;
  let mockAsyncStorage: any;

  beforeEach(() => {
    // Mock AsyncStorage
    mockAsyncStorage = require('@react-native-async-storage/async-storage');
    mockAsyncStorage.getItem.mockClear();
    mockAsyncStorage.setItem.mockClear();
    mockAsyncStorage.removeItem.mockClear();

    shopSettingsService = new ShopSettingsService();

    // Mock FileSystem
    mockFileSystem.documentDirectory = '/mock/documents/';
    mockFileSystem.getInfoAsync = jest.fn();
    mockFileSystem.makeDirectoryAsync = jest.fn();
    mockFileSystem.copyAsync = jest.fn();
    mockFileSystem.deleteAsync = jest.fn();

    // Mock ImagePicker
    mockImagePicker.requestMediaLibraryPermissionsAsync = jest.fn();
    mockImagePicker.requestCameraPermissionsAsync = jest.fn();
    mockImagePicker.launchImageLibraryAsync = jest.fn();
    mockImagePicker.launchCameraAsync = jest.fn();
  });

  describe('initialization', () => {
    it('should initialize logo directory', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: false } as any);
      mockFileSystem.makeDirectoryAsync.mockResolvedValue();

      await shopSettingsService.initialize();

      expect(mockFileSystem.getInfoAsync).toHaveBeenCalled();
      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalled();
    });
  });

  describe('getShopSettings', () => {
    it('should return null when no settings exist', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await shopSettingsService.getShopSettings();

      expect(result).toBeNull();
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('@shop_settings');
    });

    it('should return parsed settings when they exist', async () => {
      const mockSettings = {
        shopName: 'Test Shop',
        address: '123 Test St',
        phone: '+95-9-123-456-789',
        logoPath: '/path/to/logo.png',
        receiptFooter: 'Thank you!',
        thankYouMessage: 'Come again!',
        receiptTemplate: 'classic',
        lastUpdated: '2025-01-01T00:00:00.000Z',
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockSettings));

      const result = await shopSettingsService.getShopSettings();

      expect(result).toEqual(mockSettings);
    });

    it('should return null and clear corrupted data', async () => {
      const corruptedSettings = {
        shopName: '', // Invalid empty shop name
        receiptTemplate: 'classic',
      };

      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify(corruptedSettings)
      );
      mockAsyncStorage.removeItem.mockResolvedValue();

      const result = await shopSettingsService.getShopSettings();

      expect(result).toBeNull();
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        '@shop_settings'
      );
    });
  });

  describe('saveShopSettings', () => {
    it('should save valid settings to AsyncStorage', async () => {
      const settings: ShopSettingsInput = {
        shopName: 'Test Shop',
        address: '123 Test St',
        phone: '+95-9-123-456-789',
        receiptTemplate: 'classic',
      };

      mockAsyncStorage.setItem.mockResolvedValue();

      await shopSettingsService.saveShopSettings(settings);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@shop_settings',
        expect.stringContaining('"shopName":"Test Shop"')
      );
    });

    it('should throw error for invalid settings', async () => {
      const invalidSettings: ShopSettingsInput = {
        shopName: '', // Invalid empty name
        receiptTemplate: 'classic',
      };

      await expect(
        shopSettingsService.saveShopSettings(invalidSettings)
      ).rejects.toThrow('Validation failed: Shop name is required');

      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('updateShopSettings', () => {
    it('should update existing settings', async () => {
      const existingSettings = {
        shopName: 'Old Shop',
        receiptTemplate: 'classic',
        lastUpdated: '2025-01-01T00:00:00.000Z',
      };

      const updates = {
        shopName: 'New Shop',
        address: '456 New St',
      };

      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify(existingSettings)
      );
      mockAsyncStorage.setItem.mockResolvedValue();

      await shopSettingsService.updateShopSettings(updates);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@shop_settings',
        expect.stringContaining('"shopName":"New Shop"')
      );
    });

    it('should throw error for invalid updates', async () => {
      const updates = {
        shopName: '', // Invalid empty name
      };

      await expect(
        shopSettingsService.updateShopSettings(updates)
      ).rejects.toThrow('Validation failed: Shop name is required');

      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('deleteShopSettings', () => {
    it('should clear settings and delete logo', async () => {
      const settingsWithLogo = {
        shopName: 'Test Shop',
        logoPath: '/path/to/logo.png',
        receiptTemplate: 'classic',
        lastUpdated: '2025-01-01T00:00:00.000Z',
      };

      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify(settingsWithLogo)
      );
      mockAsyncStorage.removeItem.mockResolvedValue();
      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true } as any);
      mockFileSystem.deleteAsync.mockResolvedValue();

      await shopSettingsService.deleteShopSettings();

      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(
        '/path/to/logo.png'
      );
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        '@shop_settings'
      );
    });
  });

  describe('logo management', () => {
    it('should upload logo successfully', async () => {
      const mockImageUri = 'file:///path/to/image.jpg';
      const mockDestinationPath =
        '/mock/documents/shop_logos/logo_123456789.jpg';

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 1024 * 1024, // 1MB
      } as any);
      mockFileSystem.makeDirectoryAsync.mockResolvedValue();
      mockFileSystem.copyAsync.mockResolvedValue();

      // Mock Date.now() for consistent filename
      const mockNow = 123456789;
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      const result = await shopSettingsService.uploadLogo(mockImageUri);

      expect(result).toContain('logo_123456789.jpg');
      expect(mockFileSystem.copyAsync).toHaveBeenCalledWith({
        from: mockImageUri,
        to: expect.stringContaining('logo_123456789.jpg'),
      });

      // Restore Date.now()
      jest.restoreAllMocks();
    });

    it('should reject oversized images', async () => {
      const mockImageUri = 'file:///path/to/large-image.jpg';

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 3 * 1024 * 1024, // 3MB (over 2MB limit)
      } as any);

      await expect(
        shopSettingsService.uploadLogo(mockImageUri)
      ).rejects.toThrow('Image file is too large (max 2MB)');
    });
  });

  describe('validation', () => {
    it('should validate shop settings correctly', () => {
      const validSettings = {
        shopName: 'Valid Shop',
        phone: '+95-9-123-456-789',
        receiptTemplate: 'classic',
      };

      const result = shopSettingsService.validateShopSettings(validSettings);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should reject invalid settings', () => {
      const invalidSettings = {
        shopName: '', // Empty name
        phone: 'invalid-phone', // Invalid phone format
        receiptTemplate: 'invalid-template', // Invalid template
      };

      const result = shopSettingsService.validateShopSettings(invalidSettings);

      expect(result.isValid).toBe(false);
      expect(result.errors.shopName).toContain('required');
      expect(result.errors.phone).toContain('valid phone number');
      expect(result.errors.receiptTemplate).toContain('valid receipt template');
    });
  });

  describe('template management', () => {
    it('should return available templates', () => {
      const templates = shopSettingsService.getAvailableTemplates();

      expect(templates).toHaveLength(4);
      expect(templates.map((t) => t.id)).toEqual([
        'classic',
        'modern',
        'minimal',
        'elegant',
      ]);
    });

    it('should generate template preview', async () => {
      const mockSettings = {
        shopName: 'Test Shop',
        receiptTemplate: 'classic',
        lastUpdated: '2025-01-01T00:00:00.000Z',
      };

      const html = await shopSettingsService.previewTemplate(
        'classic',
        mockSettings
      );

      expect(html).toContain('Test Shop');
      expect(html).toContain('Sample Product');
    });
  });
});
