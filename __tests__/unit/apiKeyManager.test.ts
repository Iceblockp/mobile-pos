import AsyncStorage from '@react-native-async-storage/async-storage';
import { APIKeyManager } from '../../services/apiKeyManager';
import { AI_ANALYTICS_STORAGE_KEYS } from '../../types/aiAnalytics';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock fetch for API validation
global.fetch = jest.fn();

describe('APIKeyManager', () => {
  let apiKeyManager: APIKeyManager;
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    apiKeyManager = APIKeyManager.getInstance();
    jest.clearAllMocks();
  });

  describe('getApiKey', () => {
    it('should return stored API key', async () => {
      const testKey = 'AIzaSyDummyKeyForTesting123456789012345';
      mockAsyncStorage.getItem.mockResolvedValue(testKey);

      const result = await apiKeyManager.getApiKey();

      expect(result).toBe(testKey);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(
        AI_ANALYTICS_STORAGE_KEYS.API_KEY
      );
    });

    it('should return null when no key is stored', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await apiKeyManager.getApiKey();

      expect(result).toBeNull();
    });

    it('should return null when AsyncStorage throws error', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await apiKeyManager.getApiKey();

      expect(result).toBeNull();
    });
  });

  describe('setApiKey', () => {
    it('should store valid API key', async () => {
      const testKey = 'AIzaSyDummyKeyForTesting123456789012345';
      mockAsyncStorage.setItem.mockResolvedValue();

      await apiKeyManager.setApiKey(testKey);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        AI_ANALYTICS_STORAGE_KEYS.API_KEY,
        testKey
      );
    });

    it('should trim whitespace from API key', async () => {
      const testKey = '  AIzaSyDummyKeyForTesting123456789012345  ';
      const trimmedKey = 'AIzaSyDummyKeyForTesting123456789012345';
      mockAsyncStorage.setItem.mockResolvedValue();

      await apiKeyManager.setApiKey(testKey);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        AI_ANALYTICS_STORAGE_KEYS.API_KEY,
        trimmedKey
      );
    });

    it('should throw error for empty API key', async () => {
      await expect(apiKeyManager.setApiKey('')).rejects.toThrow();
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should throw error for null API key', async () => {
      await expect(apiKeyManager.setApiKey(null as any)).rejects.toThrow();
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('validateKey', () => {
    it('should return false for invalid format', async () => {
      const invalidKey = 'invalid-key';

      const result = await apiKeyManager.validateKey(invalidKey);

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return true for valid API key', async () => {
      const validKey = 'AIzaSyDummyKeyForTesting123456789012345';
      mockFetch.mockResolvedValue({
        status: 200,
      } as Response);

      const result = await apiKeyManager.validateKey(validKey);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should return false for unauthorized API key', async () => {
      const validKey = 'AIzaSyDummyKeyForTesting123456789012345';
      mockFetch.mockResolvedValue({
        status: 401,
      } as Response);

      const result = await apiKeyManager.validateKey(validKey);

      expect(result).toBe(false);
    });

    it('should return false when network request fails', async () => {
      const validKey = 'AIzaSyDummyKeyForTesting123456789012345';
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await apiKeyManager.validateKey(validKey);

      expect(result).toBe(false);
    });
  });

  describe('clearApiKey', () => {
    it('should remove stored API key', async () => {
      mockAsyncStorage.removeItem.mockResolvedValue();

      await apiKeyManager.clearApiKey();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        AI_ANALYTICS_STORAGE_KEYS.API_KEY
      );
    });

    it('should throw error when removal fails', async () => {
      mockAsyncStorage.removeItem.mockRejectedValue(new Error('Storage error'));

      await expect(apiKeyManager.clearApiKey()).rejects.toThrow();
    });
  });

  describe('hasApiKey', () => {
    it('should return true when API key exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(
        'AIzaSyDummyKeyForTesting123456789012345'
      );

      const result = await apiKeyManager.hasApiKey();

      expect(result).toBe(true);
    });

    it('should return false when no API key exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await apiKeyManager.hasApiKey();

      expect(result).toBe(false);
    });

    it('should return false when API key is empty string', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('');

      const result = await apiKeyManager.hasApiKey();

      expect(result).toBe(false);
    });
  });

  describe('getMaskedApiKey', () => {
    it('should return masked version of long API key', async () => {
      const testKey = 'AIzaSyDummyKeyForTesting123456789012345';
      mockAsyncStorage.getItem.mockResolvedValue(testKey);

      const result = await apiKeyManager.getMaskedApiKey();

      expect(result).toBe('AIza****2345');
    });

    it('should return **** for short API key', async () => {
      const shortKey = 'short';
      mockAsyncStorage.getItem.mockResolvedValue(shortKey);

      const result = await apiKeyManager.getMaskedApiKey();

      expect(result).toBe('****');
    });

    it('should return null when no API key exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await apiKeyManager.getMaskedApiKey();

      expect(result).toBeNull();
    });
  });
});
