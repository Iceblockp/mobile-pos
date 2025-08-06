import { ShopSettingsService, ShopSettingsInput } from '../shopSettingsService';
import { DatabaseService } from '../database';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

// Mock dependencies
jest.mock('expo-file-system');
jest.mock('expo-image-picker');

const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;
const mockImagePicker = ImagePicker as jest.Mocked<typeof ImagePicker>;

describe('ShopSettingsService', () => {
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let shopSettingsService: ShopSettingsService;

  beforeEach(() => {
    mockDatabaseService = {
      getShopSettings: jest.fn(),
      saveShopSettings: jest.fn(),
      updateShopSettings: jest.fn(),
      deleteShopSettings: jest.fn(),
    } as any;

    shopSettingsService = new ShopSettingsService(mockDatabaseService);

    // Mock FileSystem
    mockFileSystem.documentDirectory = '/mock/documents/';
    mockFileSystem.getInfoAsync = jest.fn();
    mockFileSystem.makeDirectoryAsync = jest.fn();
    mockFileSystem.copyAsync = jest.fn();
    mockFileSystem.deleteAsync = jest.fn();
  });

  describe('validateShopSettings', () => {
    it('should validate required shop name', () => {
      const settings: ShopSettingsInput = {
        shopName: '',
        receiptTemplate: 'classic',
      };

      const result = shopSettingsService.validateShopSettings(settings);

      expect(result.isValid).toBe(false);
      expect(result.errors.shopName).toBe('Shop name is required');
    });

    it('should validate shop name length', () => {
      const settings: ShopSettingsInput = {
        shopName: 'a'.repeat(101),
        receiptTemplate: 'classic',
      };

      const result = shopSettingsService.validateShopSettings(settings);

      expect(result.isValid).toBe(false);
      expect(result.errors.shopName).toBe(
        'Shop name must be less than 100 characters'
      );
    });

    it('should validate phone number format', () => {
      const settings: ShopSettingsInput = {
        shopName: 'Test Shop',
        phone: 'invalid-phone',
        receiptTemplate: 'classic',
      };

      const result = shopSettingsService.validateShopSettings(settings);

      expect(result.isValid).toBe(false);
      expect(result.errors.phone).toBe('Please enter a valid phone number');
    });

    it('should accept valid phone numbers', () => {
      const validPhones = [
        '+95-9-123-456-789',
        '09123456789',
        '+1 (555) 123-4567',
        '555-123-4567',
      ];

      validPhones.forEach((phone) => {
        const settings: ShopSettingsInput = {
          shopName: 'Test Shop',
          phone,
          receiptTemplate: 'classic',
        };

        const result = shopSettingsService.validateShopSettings(settings);
        expect(result.errors.phone).toBeUndefined();
      });
    });

    it('should validate receipt template', () => {
      const settings: ShopSettingsInput = {
        shopName: 'Test Shop',
        receiptTemplate: 'invalid-template',
      };

      const result = shopSettingsService.validateShopSettings(settings);

      expect(result.isValid).toBe(false);
      expect(result.errors.receiptTemplate).toBe(
        'Please select a valid receipt template'
      );
    });

    it('should validate field lengths', () => {
      const settings: ShopSettingsInput = {
        shopName: 'Test Shop',
        address: 'a'.repeat(201),
        receiptFooter: 'b'.repeat(201),
        thankYouMessage: 'c'.repeat(201),
        receiptTemplate: 'classic',
      };

      const result = shopSettingsService.validateShopSettings(settings);

      expect(result.isValid).toBe(false);
      expect(result.errors.address).toBe(
        'Address must be less than 200 characters'
      );
      expect(result.errors.receiptFooter).toBe(
        'Receipt footer must be less than 200 characters'
      );
      expect(result.errors.thankYouMessage).toBe(
        'Thank you message must be less than 200 characters'
      );
    });

    it('should pass validation with valid settings', () => {
      const settings: ShopSettingsInput = {
        shopName: 'Test Shop',
        address: '123 Test Street',
        phone: '+95-9-123-456-789',
        receiptFooter: 'Thank you for your business!',
        thankYouMessage: 'Come again soon!',
        receiptTemplate: 'classic',
      };

      const result = shopSettingsService.validateShopSettings(settings);

      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should handle partial updates correctly', () => {
      const updates = {
        phone: '+95-9-987-654-321',
      };

      const result = shopSettingsService.validateShopSettings(updates, true);

      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });
  });

  describe('saveShopSettings', () => {
    it('should save valid shop settings', async () => {
      const settings: ShopSettingsInput = {
        shopName: 'Test Shop',
        receiptTemplate: 'classic',
      };

      mockDatabaseService.saveShopSettings.mockResolvedValue(1);

      const result = await shopSettingsService.saveShopSettings(settings);

      expect(result).toBe(1);
      expect(mockDatabaseService.saveShopSettings).toHaveBeenCalledWith(
        settings
      );
    });

    it('should throw error for invalid settings', async () => {
      const settings: ShopSettingsInput = {
        shopName: '',
        receiptTemplate: 'classic',
      };

      await expect(
        shopSettingsService.saveShopSettings(settings)
      ).rejects.toThrow('Validation failed: Shop name is required');

      expect(mockDatabaseService.saveShopSettings).not.toHaveBeenCalled();
    });
  });

  describe('updateShopSettings', () => {
    it('should update valid settings', async () => {
      const updates = {
        shopName: 'Updated Shop',
        phone: '+95-9-987-654-321',
      };

      mockDatabaseService.updateShopSettings.mockResolvedValue();

      await shopSettingsService.updateShopSettings(1, updates);

      expect(mockDatabaseService.updateShopSettings).toHaveBeenCalledWith(
        1,
        updates
      );
    });

    it('should throw error for invalid updates', async () => {
      const updates = {
        shopName: '',
      };

      await expect(
        shopSettingsService.updateShopSettings(1, updates)
      ).rejects.toThrow('Validation failed: Shop name is required');

      expect(mockDatabaseService.updateShopSettings).not.toHaveBeenCalled();
    });
  });

  describe('uploadLogo', () => {
    beforeEach(() => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        size: 1024 * 1024, // 1MB
        modificationTime: Date.now(),
        uri: '/mock/image.jpg',
      });
    });

    it('should upload valid logo', async () => {
      const imageUri = '/mock/image.jpg';
      mockFileSystem.copyAsync.mockResolvedValue();

      const result = await shopSettingsService.uploadLogo(imageUri);

      expect(result).toMatch(/\/shop_logos\/logo_\d+\.jpg$/);
      expect(mockFileSystem.copyAsync).toHaveBeenCalled();
    });

    it('should reject oversized images', async () => {
      const imageUri = '/mock/large-image.jpg';
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        size: 3 * 1024 * 1024, // 3MB
        modificationTime: Date.now(),
        uri: imageUri,
      });

      await expect(shopSettingsService.uploadLogo(imageUri)).rejects.toThrow(
        'Image validation failed: Image file is too large (max 2MB)'
      );
    });

    it('should reject invalid file formats', async () => {
      const imageUri = '/mock/document.pdf';

      await expect(shopSettingsService.uploadLogo(imageUri)).rejects.toThrow(
        'Image validation failed: Image must be JPG, PNG, or GIF format'
      );
    });
  });

  describe('pickImageFromGallery', () => {
    it('should return image URI when user selects image', async () => {
      const mockImageUri = '/mock/selected-image.jpg';

      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        granted: true,
        status: 'granted',
        expires: 'never',
        canAskAgain: true,
      });

      mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: mockImageUri, width: 100, height: 100 }],
      });

      const result = await shopSettingsService.pickImageFromGallery();

      expect(result).toBe(mockImageUri);
    });

    it('should return null when user cancels', async () => {
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        granted: true,
        status: 'granted',
        expires: 'never',
        canAskAgain: true,
      });

      mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: true,
        assets: [],
      });

      const result = await shopSettingsService.pickImageFromGallery();

      expect(result).toBeNull();
    });

    it('should throw error when permission denied', async () => {
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        granted: false,
        status: 'denied',
        expires: 'never',
        canAskAgain: true,
      });

      await expect(shopSettingsService.pickImageFromGallery()).rejects.toThrow(
        'Permission to access media library is required'
      );
    });
  });
});
