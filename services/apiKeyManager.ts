import AsyncStorage from '@react-native-async-storage/async-storage';
import { AI_ANALYTICS_STORAGE_KEYS } from '../types/aiAnalytics';
import { validateApiKeyFormat } from '../utils/aiAnalyticsConfig';
import { createAIAnalyticsError } from '../utils/aiAnalyticsErrors';

export class APIKeyManager {
  private static instance: APIKeyManager;

  public static getInstance(): APIKeyManager {
    if (!APIKeyManager.instance) {
      APIKeyManager.instance = new APIKeyManager();
    }
    return APIKeyManager.instance;
  }

  /**
   * Retrieves the stored API key
   */
  async getApiKey(): Promise<string | null> {
    try {
      const apiKey = await AsyncStorage.getItem(
        AI_ANALYTICS_STORAGE_KEYS.API_KEY
      );
      return apiKey;
    } catch (error) {
      console.error('Error retrieving API key:', error);
      return null;
    }
  }

  /**
   * Stores the API key securely
   */
  async setApiKey(key: string): Promise<void> {
    if (!key || typeof key !== 'string') {
      throw createAIAnalyticsError(
        'INVALID_API_KEY',
        'API key must be a non-empty string'
      );
    }

    try {
      await AsyncStorage.setItem(AI_ANALYTICS_STORAGE_KEYS.API_KEY, key.trim());
    } catch (error) {
      console.error('Error storing API key:', error);
      throw createAIAnalyticsError('UNKNOWN_ERROR', 'Failed to store API key');
    }
  }

  /**
   * Validates the API key format
   */
  async validateKey(key: string): Promise<boolean> {
    if (!key) {
      return false;
    }

    // Format validation
    const isValidFormat = validateApiKeyFormat(key, 'gemini');
    if (!isValidFormat) {
      return false;
    }

    // Test API key with a simple request
    try {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' +
          key,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: 'Hello',
                  },
                ],
              },
            ],
          }),
        }
      );

      // If we get a 200 or even a 400 (bad request), the key is valid
      // 401/403 would indicate invalid key
      return response.status !== 401 && response.status !== 403;
    } catch (error) {
      console.error('Error validating API key:', error);
      return false;
    }
  }

  /**
   * Removes the stored API key
   */
  async clearApiKey(): Promise<void> {
    try {
      await AsyncStorage.removeItem(AI_ANALYTICS_STORAGE_KEYS.API_KEY);
    } catch (error) {
      console.error('Error clearing API key:', error);
      throw createAIAnalyticsError('UNKNOWN_ERROR', 'Failed to clear API key');
    }
  }

  /**
   * Checks if an API key is configured
   */
  async hasApiKey(): Promise<boolean> {
    const apiKey = await this.getApiKey();
    return apiKey !== null && apiKey.length > 0;
  }

  /**
   * Gets a masked version of the API key for display purposes
   */
  async getMaskedApiKey(): Promise<string | null> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      return null;
    }

    if (apiKey.length <= 8) {
      return '****';
    }

    const start = apiKey.substring(0, 4);
    const end = apiKey.substring(apiKey.length - 4);
    return `${start}****${end}`;
  }
}
