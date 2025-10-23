import * as FileSystem from 'expo-file-system';
import { Directory } from 'expo-file-system';
import { documentDirectory } from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { TemplateEngine, ReceiptTemplate } from './templateEngine';
import {
  ShopSettingsStorage,
  ShopSettings,
  ShopSettingsInput,
  shopSettingsStorage,
} from './shopSettingsStorage';

export interface ValidationResult {
  isValid: boolean;
  errors: { [key: string]: string };
}

// Re-export types from shopSettingsStorage for convenience
export type { ShopSettings, ShopSettingsInput } from './shopSettingsStorage';

export class ShopSettingsService {
  private storage: ShopSettingsStorage;
  private logoDirectory: string;
  private templateEngine: TemplateEngine;

  constructor() {
    this.storage = shopSettingsStorage;
    this.logoDirectory = `${documentDirectory}shop_logos/`;
    this.templateEngine = new TemplateEngine();
  }

  // Initialize logo directory
  async initialize(): Promise<void> {
    try {
      const logoDir = new Directory(this.logoDirectory);
      if (!(await logoDir.exists)) {
        await logoDir.create();
      }
    } catch (error) {
      console.error('Failed to initialize logo directory:', error);
    }
  }

  // Get shop settings from AsyncStorage
  async getShopSettings(): Promise<ShopSettings | null> {
    try {
      return await this.storage.getShopSettings();
    } catch (error) {
      console.error('Failed to get shop settings from AsyncStorage:', error);
      return null;
    }
  }

  // Save new shop settings
  async saveShopSettings(settings: ShopSettingsInput): Promise<void> {
    const validation = this.validateShopSettings(settings);
    if (!validation.isValid) {
      throw new Error(
        `Validation failed: ${Object.values(validation.errors).join(', ')}`
      );
    }

    try {
      await this.storage.saveShopSettings(settings);
    } catch (error) {
      console.error('Failed to save shop settings:', error);
      throw new Error('Failed to save shop settings');
    }
  }

  // Update existing shop settings
  async updateShopSettings(updates: Partial<ShopSettingsInput>): Promise<void> {
    // Only validate fields that are being updated
    const fieldsToValidate: Partial<ShopSettingsInput> = {};
    if (updates.shopName !== undefined)
      fieldsToValidate.shopName = updates.shopName;
    if (updates.phone !== undefined) fieldsToValidate.phone = updates.phone;

    if (Object.keys(fieldsToValidate).length > 0) {
      const validation = this.validateShopSettings(fieldsToValidate, true);
      if (!validation.isValid) {
        throw new Error(
          `Validation failed: ${Object.values(validation.errors).join(', ')}`
        );
      }
    }

    try {
      await this.storage.updateShopSettings(updates);
    } catch (error) {
      console.error('Failed to update shop settings:', error);
      throw new Error('Failed to update shop settings');
    }
  }

  // Delete shop settings
  async deleteShopSettings(): Promise<void> {
    try {
      // Get current settings to delete logo file if exists
      const currentSettings = await this.storage.getShopSettings();
      if (currentSettings?.logoPath) {
        await this.deleteLogo(currentSettings.logoPath);
      }

      await this.storage.clearShopSettings();
    } catch (error) {
      console.error('Failed to delete shop settings:', error);
      throw new Error('Failed to delete shop settings');
    }
  }

  // Logo management
  async uploadLogo(imageUri: string): Promise<string> {
    try {
      // Validate image
      const validation = await this.validateImage(imageUri);
      if (!validation.isValid) {
        throw new Error(
          `Image validation failed: ${Object.values(validation.errors).join(
            ', '
          )}`
        );
      }

      // Ensure logo directory exists
      await this.initialize();

      // Generate unique filename
      const timestamp = Date.now();
      const extension = imageUri.split('.').pop() || 'jpg';
      const filename = `logo_${timestamp}.${extension}`;
      const destinationPath = `${this.logoDirectory}${filename}`;

      // Copy image to app directory
      const sourceFile = new FileSystem.File(imageUri);
      const destinationFile = new FileSystem.File(destinationPath);
      await sourceFile.copy(destinationFile);

      return destinationPath;
    } catch (error) {
      console.error('Failed to upload logo:', error);
      throw new Error('Failed to upload logo');
    }
  }

  async deleteLogo(logoPath?: string): Promise<void> {
    if (!logoPath) return;

    try {
      const logoFile = new FileSystem.File(logoPath);
      if (await logoFile.exists) {
        await logoFile.delete();
      }
    } catch (error) {
      console.error('Failed to delete logo:', error);
      // Don't throw error for logo deletion failures
    }
  }

  // Validation methods
  validateShopSettings(
    settings: Partial<ShopSettingsInput>,
    isPartialUpdate = false
  ): ValidationResult {
    const errors: { [key: string]: string } = {};

    // Shop name validation (required for complete shop setup, but not for initialization)
    if (settings.shopName !== undefined) {
      if (!settings.shopName || settings.shopName.trim().length === 0) {
        // Only require shop name if this is not a partial update for initialization
        if (!isPartialUpdate) {
          errors.shopName = 'Shop name is required';
        }
      } else if (settings.shopName.trim().length > 100) {
        errors.shopName = 'Shop name must be less than 100 characters';
      }
    }

    // Phone validation (optional but must be valid format if provided)
    if (
      settings.phone !== undefined &&
      settings.phone !== null &&
      settings.phone.trim().length > 0
    ) {
      const phoneRegex = /^[\+]?[0-9\-\s\(\)]{7,20}$/;
      if (!phoneRegex.test(settings.phone.trim())) {
        errors.phone = 'Please enter a valid phone number';
      }
    }

    // Address validation (optional but length check if provided)
    if (
      settings.address !== undefined &&
      settings.address !== null &&
      settings.address.length > 200
    ) {
      errors.address = 'Address must be less than 200 characters';
    }

    // Receipt footer validation (optional but length check if provided)
    if (
      settings.receiptFooter !== undefined &&
      settings.receiptFooter !== null &&
      settings.receiptFooter.length > 200
    ) {
      errors.receiptFooter = 'Receipt footer must be less than 200 characters';
    }

    // Thank you message validation (optional but length check if provided)
    if (
      settings.thankYouMessage !== undefined &&
      settings.thankYouMessage !== null &&
      settings.thankYouMessage.length > 200
    ) {
      errors.thankYouMessage =
        'Thank you message must be less than 200 characters';
    }

    // Receipt template validation (required)
    if (!isPartialUpdate || settings.receiptTemplate !== undefined) {
      const validTemplates = ['classic', 'modern', 'minimal', 'elegant'];
      if (
        !settings.receiptTemplate ||
        !validTemplates.includes(settings.receiptTemplate)
      ) {
        errors.receiptTemplate = 'Please select a valid receipt template';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  private async validateImage(imageUri: string): Promise<ValidationResult> {
    const errors: { [key: string]: string } = {};

    try {
      // Check if file exists
      const imageFile = new FileSystem.File(imageUri);
      if (!(await imageFile.exists)) {
        errors.image = 'Image file does not exist';
        return { isValid: false, errors };
      }

      // Check file size (max 2MB)
      const maxSize = 2 * 1024 * 1024; // 2MB in bytes
      const size = await imageFile.size;
      if (size && size > maxSize) {
        errors.image = 'Image file is too large (max 2MB)';
      }

      // Check file extension
      const validExtensions = ['jpg', 'jpeg', 'png', 'gif'];
      const extension = imageUri.split('.').pop()?.toLowerCase();
      if (!extension || !validExtensions.includes(extension)) {
        errors.image = 'Image must be JPG, PNG, or GIF format';
      }
    } catch (error) {
      errors.image = 'Failed to validate image file';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  // Helper method to pick image from gallery
  async pickImageFromGallery(): Promise<string | null> {
    try {
      // Request permission
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        throw new Error('Permission to access media library is required');
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for logo
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }

      return null;
    } catch (error) {
      console.error('Failed to pick image:', error);
      throw new Error('Failed to select image');
    }
  }

  // Helper method to take photo with camera
  async takePhotoWithCamera(): Promise<string | null> {
    try {
      // Request permission
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        throw new Error('Permission to access camera is required');
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for logo
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }

      return null;
    } catch (error) {
      console.error('Failed to take photo:', error);
      throw new Error('Failed to take photo');
    }
  }

  // Template management methods
  getAvailableTemplates(): ReceiptTemplate[] {
    return this.templateEngine.getAvailableTemplates();
  }

  getTemplate(templateId: string): ReceiptTemplate | null {
    return this.templateEngine.getTemplate(templateId);
  }

  async previewTemplate(
    templateId: string,
    shopSettings?: ShopSettings
  ): Promise<string> {
    try {
      let settings: ShopSettings | null | undefined = shopSettings;

      if (!settings) {
        try {
          settings = await this.getShopSettings();
        } catch (error) {
          console.warn(
            'Failed to get shop settings for preview, using defaults:',
            error
          );
          settings = null; // Will use default settings in template engine
        }
      }

      return await this.templateEngine.previewTemplate(
        templateId,
        settings,
        true
      );
    } catch (error) {
      console.error('Failed to preview template:', error);

      // Try with default settings as last resort
      try {
        console.warn('Attempting template preview with default settings');
        return await this.templateEngine.previewTemplate(
          templateId,
          null,
          true
        );
      } catch (fallbackError) {
        console.error(
          'Failed to generate template preview with defaults:',
          fallbackError
        );
        throw new Error('Failed to generate template preview');
      }
    }
  }
}
