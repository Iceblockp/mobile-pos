import {
  AIAnalyticsException,
  createAIAnalyticsError,
  getErrorMessage,
  categorizeError,
  isNetworkError,
  isTimeoutError,
} from '../../utils/aiAnalyticsErrors';
import { AIAnalyticsService } from '../../services/aiAnalyticsService';
import { APIKeyManager } from '../../services/apiKeyManager';
import { DatabaseService } from '../../services/database';

// Mock dependencies
jest.mock('../../services/apiKeyManager');
jest.mock('../../services/database');

// Mock fetch
global.fetch = jest.fn();

describe('AI Analytics Error Handling', () => {
  let aiAnalyticsService: AIAnalyticsService;
  let mockAPIKeyManager: jest.Mocked<APIKeyManager>;
  let mockDatabaseService: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    aiAnalyticsService = AIAnalyticsService.getInstance();
    mockAPIKeyManager =
      APIKeyManager.getInstance() as jest.Mocked<APIKeyManager>;
    mockDatabaseService =
      DatabaseService.getInstance() as jest.Mocked<DatabaseService>;

    jest.clearAllMocks();
  });

  describe('AIAnalyticsException', () => {
    it('should create exception with correct properties', () => {
      const originalError = new Error('Original error');
      const exception = new AIAnalyticsException(
        'NETWORK_ERROR',
        'Network failed',
        originalError
      );

      expect(exception.type).toBe('NETWORK_ERROR');
      expect(exception.message).toBe('Network failed');
      expect(exception.originalError).toBe(originalError);
      expect(exception.name).toBe('AIAnalyticsException');
    });
  });

  describe('createAIAnalyticsError', () => {
    it('should create error with correct properties', () => {
      const error = createAIAnalyticsError('INVALID_API_KEY', 'Key is invalid');

      expect(error).toBeInstanceOf(AIAnalyticsException);
      expect(error.type).toBe('INVALID_API_KEY');
      expect(error.message).toBe('Key is invalid');
    });

    it('should include original error when provided', () => {
      const originalError = new Error('Original');
      const error = createAIAnalyticsError(
        'UNKNOWN_ERROR',
        'Something went wrong',
        originalError
      );

      expect(error.originalError).toBe(originalError);
    });
  });

  describe('getErrorMessage', () => {
    it('should return correct messages for each error type', () => {
      expect(getErrorMessage('NO_API_KEY')).toContain(
        'configure your AI API key'
      );
      expect(getErrorMessage('INVALID_API_KEY')).toContain('invalid');
      expect(getErrorMessage('NETWORK_ERROR')).toContain('internet connection');
      expect(getErrorMessage('NO_DATA')).toContain('No data available');
      expect(getErrorMessage('TIMEOUT_ERROR')).toContain('timed out');
      expect(getErrorMessage('UNKNOWN_ERROR')).toContain('unexpected error');
    });
  });

  describe('isNetworkError', () => {
    it('should identify network errors correctly', () => {
      expect(isNetworkError({ code: 'NETWORK_REQUEST_FAILED' })).toBe(true);
      expect(isNetworkError({ message: 'Network request failed' })).toBe(true);
      expect(isNetworkError({ message: 'fetch failed' })).toBe(true);
      expect(isNetworkError({ message: 'Something else' })).toBe(false);
      expect(isNetworkError({})).toBe(false);
    });
  });

  describe('isTimeoutError', () => {
    it('should identify timeout errors correctly', () => {
      expect(isTimeoutError({ code: 'TIMEOUT' })).toBe(true);
      expect(isTimeoutError({ message: 'timeout occurred' })).toBe(true);
      expect(isTimeoutError({ message: 'Request timed out' })).toBe(true);
      expect(isTimeoutError({ message: 'Something else' })).toBe(false);
      expect(isTimeoutError({})).toBe(false);
    });
  });

  describe('categorizeError', () => {
    it('should categorize network errors', () => {
      expect(categorizeError({ code: 'NETWORK_REQUEST_FAILED' })).toBe(
        'NETWORK_ERROR'
      );
      expect(categorizeError({ message: 'Network request failed' })).toBe(
        'NETWORK_ERROR'
      );
    });

    it('should categorize timeout errors', () => {
      expect(categorizeError({ code: 'TIMEOUT' })).toBe('TIMEOUT_ERROR');
      expect(categorizeError({ message: 'Request timed out' })).toBe(
        'TIMEOUT_ERROR'
      );
    });

    it('should categorize API key errors', () => {
      expect(categorizeError({ status: 401 })).toBe('INVALID_API_KEY');
      expect(categorizeError({ message: 'API key invalid' })).toBe(
        'INVALID_API_KEY'
      );
    });

    it('should default to unknown error', () => {
      expect(categorizeError({ message: 'Random error' })).toBe(
        'UNKNOWN_ERROR'
      );
      expect(categorizeError({})).toBe('UNKNOWN_ERROR');
    });
  });

  describe('AIAnalyticsService Error Handling', () => {
    beforeEach(() => {
      // Setup basic mocks
      mockDatabaseService.getProducts.mockResolvedValue([]);
      mockDatabaseService.getCategories.mockResolvedValue([]);
      mockDatabaseService.getSuppliers.mockResolvedValue([]);
      mockDatabaseService.getCustomers.mockResolvedValue([]);
      mockDatabaseService.getSalesByDateRange.mockResolvedValue([]);
      mockDatabaseService.getExpensesByDateRange.mockResolvedValue([]);
      mockDatabaseService.getStockMovements.mockResolvedValue([]);
    });

    it('should handle missing API key', async () => {
      mockAPIKeyManager.getApiKey.mockResolvedValue(null);

      await expect(
        aiAnalyticsService.sendQuestion('Test question')
      ).rejects.toThrow('API key not configured');
    });

    it('should handle empty question', async () => {
      mockAPIKeyManager.getApiKey.mockResolvedValue('valid-key');

      await expect(aiAnalyticsService.sendQuestion('')).rejects.toThrow(
        'Question cannot be empty'
      );

      await expect(aiAnalyticsService.sendQuestion('   ')).rejects.toThrow(
        'Question cannot be empty'
      );
    });

    it('should handle no data scenario', async () => {
      mockAPIKeyManager.getApiKey.mockResolvedValue('valid-key');

      // Mock empty database
      mockDatabaseService.getProducts.mockResolvedValue([]);
      mockDatabaseService.getSalesByDateRange.mockResolvedValue([]);
      mockDatabaseService.getCustomers.mockResolvedValue([]);

      await expect(
        aiAnalyticsService.sendQuestion('Test question')
      ).rejects.toThrow('No shop data available for analysis');
    });

    it('should handle database errors', async () => {
      mockAPIKeyManager.getApiKey.mockResolvedValue('valid-key');
      mockDatabaseService.getProducts.mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        aiAnalyticsService.sendQuestion('Test question')
      ).rejects.toThrow('Failed to retrieve shop data');
    });

    it('should handle network errors with retry', async () => {
      mockAPIKeyManager.getApiKey.mockResolvedValue('valid-key');

      // Mock some data to pass the no-data check
      mockDatabaseService.getProducts.mockResolvedValue([
        { id: '1', name: 'Product' },
      ]);
      mockDatabaseService.getSalesByDateRange.mockResolvedValue([
        { id: '1', total: 100 },
      ]);
      mockDatabaseService.getSaleItems.mockResolvedValue([]);

      // Mock network failure
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValue(new Error('Network request failed'));

      await expect(
        aiAnalyticsService.sendQuestion('Test question')
      ).rejects.toThrow('Request failed after 3 attempts');

      // Should have retried 3 times
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle API authentication errors without retry', async () => {
      mockAPIKeyManager.getApiKey.mockResolvedValue('invalid-key');

      // Mock some data
      mockDatabaseService.getProducts.mockResolvedValue([
        { id: '1', name: 'Product' },
      ]);
      mockDatabaseService.getSalesByDateRange.mockResolvedValue([
        { id: '1', total: 100 },
      ]);
      mockDatabaseService.getSaleItems.mockResolvedValue([]);

      // Mock 401 response
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      await expect(
        aiAnalyticsService.sendQuestion('Test question')
      ).rejects.toThrow('Invalid API key');

      // Should not retry for auth errors
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle timeout errors', async () => {
      mockAPIKeyManager.getApiKey.mockResolvedValue('valid-key');

      // Mock some data
      mockDatabaseService.getProducts.mockResolvedValue([
        { id: '1', name: 'Product' },
      ]);
      mockDatabaseService.getSalesByDateRange.mockResolvedValue([
        { id: '1', total: 100 },
      ]);
      mockDatabaseService.getSaleItems.mockResolvedValue([]);

      // Mock timeout by never resolving
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      await expect(
        aiAnalyticsService.sendQuestion('Test question')
      ).rejects.toThrow('Request timed out');
    }, 35000); // Increase timeout for this test

    it('should handle malformed API responses', async () => {
      mockAPIKeyManager.getApiKey.mockResolvedValue('valid-key');

      // Mock some data
      mockDatabaseService.getProducts.mockResolvedValue([
        { id: '1', name: 'Product' },
      ]);
      mockDatabaseService.getSalesByDateRange.mockResolvedValue([
        { id: '1', total: 100 },
      ]);
      mockDatabaseService.getSaleItems.mockResolvedValue([]);

      // Mock malformed response
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ candidates: [] }), // Empty candidates
      } as Response);

      await expect(
        aiAnalyticsService.sendQuestion('Test question')
      ).rejects.toThrow('No response from AI service');
    });

    it('should handle empty AI responses', async () => {
      mockAPIKeyManager.getApiKey.mockResolvedValue('valid-key');

      // Mock some data
      mockDatabaseService.getProducts.mockResolvedValue([
        { id: '1', name: 'Product' },
      ]);
      mockDatabaseService.getSalesByDateRange.mockResolvedValue([
        { id: '1', total: 100 },
      ]);
      mockDatabaseService.getSaleItems.mockResolvedValue([]);

      // Mock empty response
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [{ text: '' }], // Empty text
                },
              },
            ],
          }),
      } as Response);

      await expect(
        aiAnalyticsService.sendQuestion('Test question')
      ).rejects.toThrow('Empty response from AI service');
    });

    it('should handle successful API response', async () => {
      mockAPIKeyManager.getApiKey.mockResolvedValue('valid-key');

      // Mock some data
      mockDatabaseService.getProducts.mockResolvedValue([
        { id: '1', name: 'Product' },
      ]);
      mockDatabaseService.getSalesByDateRange.mockResolvedValue([
        { id: '1', total: 100 },
      ]);
      mockDatabaseService.getSaleItems.mockResolvedValue([]);

      // Mock successful response
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [{ text: 'Your sales are doing well!' }],
                },
              },
            ],
          }),
      } as Response);

      const result = await aiAnalyticsService.sendQuestion('How are my sales?');
      expect(result).toBe('Your sales are doing well!');
    });
  });

  describe('Error Recovery', () => {
    it('should provide retry mechanism for network errors', () => {
      const networkError = { code: 'NETWORK_REQUEST_FAILED' };
      const errorType = categorizeError(networkError);

      expect(errorType).toBe('NETWORK_ERROR');
      // Network errors should be retryable
      expect(['NETWORK_ERROR', 'TIMEOUT_ERROR', 'UNKNOWN_ERROR']).toContain(
        errorType
      );
    });

    it('should not retry for authentication errors', () => {
      const authError = { status: 401 };
      const errorType = categorizeError(authError);

      expect(errorType).toBe('INVALID_API_KEY');
      // Auth errors should not be retryable
      expect(['NO_API_KEY', 'INVALID_API_KEY', 'NO_DATA']).toContain(errorType);
    });
  });
});
