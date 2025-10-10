import { AIAnalyticsService } from '../../services/aiAnalyticsService';
import { APIKeyManager } from '../../services/apiKeyManager';
import { dataExportService } from '../../services/dataExportService';
import { ShopDataExport } from '../../types/aiAnalytics';

// Mock dependencies
jest.mock('../../services/apiKeyManager');
jest.mock('../../services/dataExportService');

// Mock fetch
global.fetch = jest.fn();

describe('AIAnalyticsService', () => {
  let aiAnalyticsService: AIAnalyticsService;
  let mockApiKeyManager: jest.Mocked<APIKeyManager>;
  let mockDataExportService: jest.Mocked<typeof dataExportService>;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  const mockShopData: ShopDataExport = {
    products: [
      { id: '1', name: 'Product 1', stock: 10, minStock: 5 },
      { id: '2', name: 'Product 2', stock: 2, minStock: 5 },
    ],
    sales: [
      {
        id: '1',
        customerId: 'customer1',
        total: 100,
        items: [{ productId: '1', quantity: 2 }],
      },
    ],
    customers: [{ id: 'customer1', name: 'Customer 1' }],
    suppliers: [],
    expenses: [],
    stockMovements: [],
    metadata: {
      exportDate: '2023-01-01',
      totalRecords: 3,
    },
  };

  beforeEach(() => {
    aiAnalyticsService = AIAnalyticsService.getInstance();
    mockApiKeyManager =
      APIKeyManager.getInstance() as jest.Mocked<APIKeyManager>;
    mockDataExportService = dataExportService as jest.Mocked<
      typeof dataExportService
    >;
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;

    jest.clearAllMocks();
  });

  describe('sendQuestion', () => {
    beforeEach(() => {
      mockApiKeyManager.getApiKey.mockResolvedValue(
        'AIzaSyDummyKeyForTesting123456789012345'
      );
      mockDataExportService.exportAllData.mockResolvedValue(mockShopData);
    });

    it('should send question and return AI response', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Your sales are doing well this week!',
                },
              ],
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await aiAnalyticsService.sendQuestion(
        'How are my sales this week?'
      );

      expect(result).toBe('Your sales are doing well this week!');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should throw error when no API key is configured', async () => {
      mockApiKeyManager.getApiKey.mockResolvedValue(null);

      await expect(
        aiAnalyticsService.sendQuestion('Test question')
      ).rejects.toThrow('API key not configured');
    });

    it('should throw error when question is empty', async () => {
      await expect(aiAnalyticsService.sendQuestion('')).rejects.toThrow(
        'Question cannot be empty'
      );
    });

    it('should throw error when no data is available', async () => {
      mockDataExportService.exportAllData.mockResolvedValue({
        ...mockShopData,
        metadata: { ...mockShopData.metadata, totalRecords: 0 },
      });

      await expect(
        aiAnalyticsService.sendQuestion('Test question')
      ).rejects.toThrow('No shop data available for analysis');
    });

    it('should handle API errors correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      await expect(
        aiAnalyticsService.sendQuestion('Test question')
      ).rejects.toThrow('Invalid API key');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network request failed'));

      await expect(
        aiAnalyticsService.sendQuestion('Test question')
      ).rejects.toThrow('Request failed after 3 attempts');
    });

    it('should handle timeout errors', async () => {
      // Mock a request that never resolves to simulate timeout
      mockFetch.mockImplementation(() => new Promise(() => {}));

      await expect(
        aiAnalyticsService.sendQuestion('Test question')
      ).rejects.toThrow('Request timed out');
    }, 35000); // Increase timeout for this test
  });

  describe('formatDataForAI', () => {
    it('should format shop data correctly', () => {
      const formatted = aiAnalyticsService.formatDataForAI(mockShopData);
      const parsed = JSON.parse(formatted);

      expect(parsed).toHaveProperty('metadata');
      expect(parsed).toHaveProperty('summary');
      expect(parsed.summary.totalProducts).toBe(2);
      expect(parsed.summary.totalSales).toBe(1);
      expect(parsed.summary.totalCustomers).toBe(1);
    });

    it('should include top products', () => {
      const formatted = aiAnalyticsService.formatDataForAI(mockShopData);
      const parsed = JSON.parse(formatted);

      expect(parsed).toHaveProperty('topProducts');
      expect(parsed.topProducts).toHaveLength(1);
      expect(parsed.topProducts[0]).toMatchObject({
        productId: '1',
        productName: 'Product 1',
        totalSold: 2,
      });
    });

    it('should include low stock products', () => {
      const formatted = aiAnalyticsService.formatDataForAI(mockShopData);
      const parsed = JSON.parse(formatted);

      expect(parsed).toHaveProperty('lowStockProducts');
      expect(parsed.lowStockProducts).toHaveLength(1);
      expect(parsed.lowStockProducts[0]).toMatchObject({
        id: '2',
        name: 'Product 2',
        currentStock: 2,
        minStock: 5,
      });
    });

    it('should include customer summary', () => {
      const formatted = aiAnalyticsService.formatDataForAI(mockShopData);
      const parsed = JSON.parse(formatted);

      expect(parsed).toHaveProperty('customerSummary');
      expect(parsed.customerSummary.totalCustomers).toBe(1);
      expect(parsed.customerSummary.activeCustomers).toBe(1);
      expect(parsed.customerSummary.topCustomers).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      mockApiKeyManager.getApiKey.mockResolvedValue(
        'AIzaSyDummyKeyForTesting123456789012345'
      );
      mockDataExportService.exportAllData.mockResolvedValue(mockShopData);
    });

    it('should retry on network errors', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network request failed'))
        .mockRejectedValueOnce(new Error('Network request failed'))
        .mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              candidates: [
                {
                  content: { parts: [{ text: 'Success after retries' }] },
                },
              ],
            }),
        } as Response);

      const result = await aiAnalyticsService.sendQuestion('Test question');

      expect(result).toBe('Success after retries');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should not retry on invalid API key errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      await expect(
        aiAnalyticsService.sendQuestion('Test question')
      ).rejects.toThrow('Invalid API key');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
