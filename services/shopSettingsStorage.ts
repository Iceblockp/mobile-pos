import AsyncStorage from '@react-native-async-storage/async-storage';
import { CurrencySettings } from './currencyManager';

// Enhanced ShopSettings interface with currency management
export interface ShopSettings {
  shopName?: string; // Optional during initialization, required for full shop setup
  address?: string;
  phone?: string;
  logoPath?: string;
  receiptFooter?: string;
  thankYouMessage?: string;
  receiptTemplate?: string;
  receiptFontSize?: 'small' | 'medium' | 'large' | 'extra-large'; // Font size for receipts
  currency?: CurrencySettings;
  customCurrencies?: CurrencySettings[]; // User-created custom currencies
  lastUpdated?: string;
}

export interface ShopSettingsInput {
  shopName?: string; // Optional during initialization
  address?: string;
  phone?: string;
  logoPath?: string;
  receiptFooter?: string;
  thankYouMessage?: string;
  receiptTemplate?: string;
  receiptFontSize?: 'small' | 'medium' | 'large' | 'extra-large'; // Font size for receipts
  currency?: CurrencySettings;
  customCurrencies?: CurrencySettings[];
}

const SHOP_SETTINGS_KEY = '@shop_settings';

export class ShopSettingsStorage {
  // Get shop settings from AsyncStorage
  async getShopSettings(): Promise<ShopSettings | null> {
    try {
      const settingsJson = await AsyncStorage.getItem(SHOP_SETTINGS_KEY);
      if (!settingsJson) {
        return null;
      }

      const settings = JSON.parse(settingsJson) as Partial<ShopSettings>;

      // If shopName exists, validate it. If not, this might be partial settings from initialization
      if (
        settings.shopName !== undefined &&
        (!settings.shopName || settings.shopName.trim().length === 0)
      ) {
        console.warn('Invalid shop settings found, removing corrupted data');
        await this.clearShopSettings();
        return null;
      }

      // Return settings even if shopName is missing (for partial settings during initialization)
      return settings as ShopSettings;
    } catch (error) {
      console.error('Failed to get shop settings from AsyncStorage:', error);
      return null;
    }
  }

  // Save shop settings to AsyncStorage
  async saveShopSettings(settings: ShopSettingsInput): Promise<void> {
    try {
      // Validate required fields only if shopName is provided
      if (
        settings.shopName !== undefined &&
        (!settings.shopName || settings.shopName.trim().length === 0)
      ) {
        throw new Error('Shop name is required');
      }

      const shopSettings: ShopSettings = {
        shopName: settings.shopName?.trim(),
        address: settings.address?.trim() || undefined,
        phone: settings.phone?.trim() || undefined,
        logoPath: settings.logoPath || undefined,
        receiptFooter: settings.receiptFooter?.trim() || undefined,
        thankYouMessage: settings.thankYouMessage?.trim() || undefined,
        receiptTemplate: settings.receiptTemplate || 'classic',
        receiptFontSize: settings.receiptFontSize || 'medium',
        currency: settings.currency || undefined,
        customCurrencies: settings.customCurrencies || [],
        lastUpdated: new Date().toISOString(),
      };

      await AsyncStorage.setItem(
        SHOP_SETTINGS_KEY,
        JSON.stringify(shopSettings)
      );
      console.log('Shop settings saved successfully to AsyncStorage');
    } catch (error) {
      console.error('Failed to save shop settings to AsyncStorage:', error);
      throw new Error('Failed to save shop settings');
    }
  }

  // Update shop settings (merge with existing)
  async updateShopSettings(updates: Partial<ShopSettingsInput>): Promise<void> {
    try {
      const currentSettings = await this.getShopSettings();

      // If no current settings exist and we're only updating non-essential fields
      // (like currency), create minimal settings without shop name validation
      if (!currentSettings && this.isNonEssentialUpdate(updates)) {
        await this.savePartialSettings(updates);
        return;
      }

      const updatedSettings: ShopSettingsInput = {
        shopName: updates.shopName?.trim() || currentSettings?.shopName || '',
        address:
          updates.address !== undefined
            ? updates.address?.trim()
            : currentSettings?.address,
        phone:
          updates.phone !== undefined
            ? updates.phone?.trim()
            : currentSettings?.phone,
        logoPath:
          updates.logoPath !== undefined
            ? updates.logoPath
            : currentSettings?.logoPath,
        receiptFooter:
          updates.receiptFooter !== undefined
            ? updates.receiptFooter?.trim()
            : currentSettings?.receiptFooter,
        thankYouMessage:
          updates.thankYouMessage !== undefined
            ? updates.thankYouMessage?.trim()
            : currentSettings?.thankYouMessage,
        receiptTemplate:
          updates.receiptTemplate ||
          currentSettings?.receiptTemplate ||
          'classic',
        receiptFontSize:
          updates.receiptFontSize ||
          currentSettings?.receiptFontSize ||
          'medium',
        currency:
          updates.currency !== undefined
            ? updates.currency
            : currentSettings?.currency,
        customCurrencies:
          updates.customCurrencies !== undefined
            ? updates.customCurrencies
            : currentSettings?.customCurrencies || [],
      };

      await this.saveShopSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to update shop settings:', error);
      throw new Error('Failed to update shop settings');
    }
  }

  // Check if the update only contains non-essential fields that don't require shop name
  private isNonEssentialUpdate(updates: Partial<ShopSettingsInput>): boolean {
    const nonEssentialFields = [
      'currency',
      'customCurrencies',
      'receiptTemplate',
      'receiptFontSize',
    ];
    const updateKeys = Object.keys(updates);

    // Return true if all update keys are non-essential fields
    return (
      updateKeys.length > 0 &&
      updateKeys.every((key) => nonEssentialFields.includes(key))
    );
  }

  // Save partial settings without shop name validation (for initialization)
  private async savePartialSettings(
    updates: Partial<ShopSettingsInput>
  ): Promise<void> {
    try {
      const partialSettings: Partial<ShopSettings> = {
        currency: updates.currency,
        customCurrencies: updates.customCurrencies || [],
        receiptTemplate: updates.receiptTemplate || 'classic',
        receiptFontSize: updates.receiptFontSize || 'medium',
        lastUpdated: new Date().toISOString(),
      };

      // Only save the fields that are provided
      const settingsToSave: any = {};
      Object.keys(partialSettings).forEach((key) => {
        if (
          partialSettings[key as keyof typeof partialSettings] !== undefined
        ) {
          settingsToSave[key] =
            partialSettings[key as keyof typeof partialSettings];
        }
      });

      await AsyncStorage.setItem(
        SHOP_SETTINGS_KEY,
        JSON.stringify(settingsToSave)
      );
      console.log('Partial shop settings saved successfully to AsyncStorage');
    } catch (error) {
      console.error(
        'Failed to save partial shop settings to AsyncStorage:',
        error
      );
      throw new Error('Failed to save partial shop settings');
    }
  }

  // Clear shop settings
  async clearShopSettings(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SHOP_SETTINGS_KEY);
      console.log('Shop settings cleared from AsyncStorage');
    } catch (error) {
      console.error('Failed to clear shop settings:', error);
      throw new Error('Failed to clear shop settings');
    }
  }

  // Check if shop settings exist
  async hasShopSettings(): Promise<boolean> {
    try {
      const settings = await this.getShopSettings();
      return settings !== null;
    } catch (error) {
      console.error('Failed to check shop settings existence:', error);
      return false;
    }
  }

  // Get default shop settings
  getDefaultShopSettings(): ShopSettings {
    return {
      shopName: 'Mobile POS',
      address: undefined,
      phone: undefined,
      logoPath: undefined,
      receiptFooter: 'Thank you for your business!',
      thankYouMessage: 'Come again soon!',
      receiptTemplate: 'classic',
      receiptFontSize: 'medium',
      currency: undefined, // Will use default MMK from CurrencyManager
      customCurrencies: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  // Validate shop settings input
  validateShopSettings(settings: Partial<ShopSettingsInput>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Shop name validation
    if (settings.shopName !== undefined) {
      if (!settings.shopName || settings.shopName.trim().length === 0) {
        errors.push('Shop name is required');
      } else if (settings.shopName.trim().length > 100) {
        errors.push('Shop name must be less than 100 characters');
      }
    }

    // Phone validation
    if (
      settings.phone !== undefined &&
      settings.phone !== null &&
      settings.phone.trim().length > 0
    ) {
      const phoneRegex = /^[\+]?[0-9\-\s\(\)]{7,20}$/;
      if (!phoneRegex.test(settings.phone.trim())) {
        errors.push('Please enter a valid phone number');
      }
    }

    // Address validation
    if (
      settings.address !== undefined &&
      settings.address !== null &&
      settings.address.length > 200
    ) {
      errors.push('Address must be less than 200 characters');
    }

    // Receipt footer validation
    if (
      settings.receiptFooter !== undefined &&
      settings.receiptFooter !== null &&
      settings.receiptFooter.length > 200
    ) {
      errors.push('Receipt footer must be less than 200 characters');
    }

    // Thank you message validation
    if (
      settings.thankYouMessage !== undefined &&
      settings.thankYouMessage !== null &&
      settings.thankYouMessage.length > 200
    ) {
      errors.push('Thank you message must be less than 200 characters');
    }

    // Receipt template validation
    if (settings.receiptTemplate !== undefined) {
      const validTemplates = ['classic', 'modern', 'minimal', 'elegant'];
      if (!validTemplates.includes(settings.receiptTemplate)) {
        errors.push('Please select a valid receipt template');
      }
    }

    // Receipt font size validation
    if (settings.receiptFontSize !== undefined) {
      const validFontSizes = ['small', 'medium', 'large', 'extra-large'];
      if (!validFontSizes.includes(settings.receiptFontSize)) {
        errors.push('Please select a valid font size');
      }
    }

    // Currency validation
    if (settings.currency !== undefined) {
      const { CurrencyValidator } = require('./currencyManager');
      const currencyErrors = CurrencyValidator.validateCurrencySettings(
        settings.currency
      );
      errors.push(...currencyErrors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Export shop settings for backup
  async exportShopSettings(): Promise<string> {
    try {
      const settings = await this.getShopSettings();
      if (!settings) {
        throw new Error('No shop settings to export');
      }

      return JSON.stringify(settings, null, 2);
    } catch (error) {
      console.error('Failed to export shop settings:', error);
      throw new Error('Failed to export shop settings');
    }
  }

  // Import shop settings from backup
  async importShopSettings(settingsJson: string): Promise<void> {
    try {
      const settings = JSON.parse(settingsJson) as ShopSettings;

      // Validate imported settings
      const validation = this.validateShopSettings(settings);
      if (!validation.isValid) {
        throw new Error(`Invalid settings: ${validation.errors.join(', ')}`);
      }

      await this.saveShopSettings(settings);
      console.log('Shop settings imported successfully');
    } catch (error) {
      console.error('Failed to import shop settings:', error);
      throw new Error('Failed to import shop settings');
    }
  }
}

// Create singleton instance
export const shopSettingsStorage = new ShopSettingsStorage();
