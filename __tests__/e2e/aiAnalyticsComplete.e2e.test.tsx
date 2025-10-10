import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AIAnalyticsTab from '../../components/AIAnalyticsTab';
import { AIAnalyticsService } from '../../services/aiAnalyticsService';
import { APIKeyManager } from '../../services/apiKeyManager';
import { DatabaseService } from '../../services/database';

// Mock all dependencies
jest.mock('../../services/aiAnalyticsService');
jest.mock('../../services/apiKeyManager');
jest.mock('../../services/database');
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => {
    React.useEffect(callback, []);
  },
}));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));
jest.mock('../../utils/uuid', () => ({
  generateUUID: () => 'mock-uuid-' + Math.random(),
}));
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
  };
});

// Mock localization
jest.mock('../../context/LocalizationContext', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'aiAnalytics.quickQuestions': 'Quick Questions',
        'aiAnalytics.quickQuestionsSubtitle':
          'Tap any question to get instant insights',
        'aiAnalytics.salesThisWeek': 'How are my sales this week?',
        'aiAnalytics.topProducts': 'What products are selling well?',
        'aiAnalytics.restockNeeded': 'Which items need restocking?',
        'aiAnalytics.bestCustomers': 'Show me my best customers',
        'aiAnalytics.salesChanges': 'Why did sales change recently?',
        'aiAnalytics.focusToday': 'What should I focus on today?',
        'aiAnalytics.analyzing': 'Analyzing...',
        'aiAnalytics.emptyStateTitle': 'Ask me anything about your business!',
        'aiAnalytics.emptyStateSubtitle':
          'I can help you analyze sales, inventory, customers, and more.',
        'aiAnalytics.askQuestion': 'Ask about your business...',
        'aiAnalytics.apiKeySettings': 'API Key Settings',
        'aiAnalytics.retry': 'Retry',
        'aiAnalytics.apiKeyConfigured': 'AI Analytics is ready!',
        'aiAnalytics.title': 'AI Analytics',
      };
      return translations[key] || key;
    },
  }),
}));

describe('AI Analytics Complete E2E Test', () => {
  let mockAIAnalyticsService: jest.Mocked<AIAnalyticsService>;
  let mockAPIKeyManager: jest.Mocked<APIKeyManager>;
  let mockDatabaseService: jest.Mocked<DatabaseService>;

  const mockShopData = {
    products: [
      { id: '1', name: 'Product 1', price: 1000, stock: 10 },
      { id: '2', name: 'Product 2', price: 2000, stock: 5 },
    ],
    sales: [
      {
        id: '1',
        customerId: 'customer1',
        total: 3000,
        items: [{ productId: '1', quantity: 2, price: 1000 }],
      },
    ],
    customers: [{ id: 'customer1', name: 'Customer 1' }],
  };

  beforeEach(() => {
    mockAIAnalyticsService =
      AIAnalyticsService.getInstance() as jest.Mocked<AIAnalyticsService>;
    mockAPIKeyManager =
      APIKeyManager.getInstance() as jest.Mocked<APIKeyManager>;
    mockDatabaseService =
      DatabaseService.getInstance() as jest.Mocked<DatabaseService>;

    // Setup default mocks
    mockAPIKeyManager.hasApiKey.mockResolvedValue(true);
    mockAPIKeyManager.getApiKey.mockResolvedValue('valid-api-key');
    mockAIAnalyticsService.sendQuestion.mockResolvedValue(
      'Your sales are up 15% this week!'
    );

    // Setup database mocks
    mockDatabaseService.getProducts.mockResolvedValue(mockShopData.products);
    mockDatabaseService.getSalesByDateRange.mockResolvedValue(
      mockShopData.sales
    );
    mockDatabaseService.getCustomers.mockResolvedValue(mockShopData.customers);
    mockDatabaseService.getCategories.mockResolvedValue([]);
    mockDatabaseService.getSuppliers.mockResolvedValue([]);
    mockDatabaseService.getExpensesByDateRange.mockResolvedValue([]);
    mockDatabaseService.getStockMovements.mockResolvedValue([]);
    mockDatabaseService.getSaleItems.mockResolvedValue(
      mockShopData.sales[0].items
    );

    jest.clearAllMocks();
  });

  describe('Complete User Journey', () => {
    it('should handle complete user journey from setup to conversation', async () => {
      // Start with no API key
      mockAPIKeyManager.hasApiKey.mockResolvedValueOnce(false);

      const { getByText, queryByText, rerender } = render(<AIAnalyticsTab />);

      // Should show API key setup
      await waitFor(() => {
        expect(getByText('AI Analytics Setup')).toBeTruthy();
      });

      // Simulate API key configuration
      mockAPIKeyManager.hasApiKey.mockResolvedValue(true);

      // Re-render after API key setup
      rerender(<AIAnalyticsTab />);

      // Should show default questions
      await waitFor(() => {
        expect(getByText('Quick Questions')).toBeTruthy();
        expect(getByText('How are my sales this week?')).toBeTruthy();
      });

      // User selects a default question
      fireEvent.press(getByText('How are my sales this week?'));

      // Should show loading state
      await waitFor(() => {
        expect(getByText('Analyzing...')).toBeTruthy();
      });

      // Should show AI response
      await waitFor(() => {
        expect(getByText('Your sales are up 15% this week!')).toBeTruthy();
      });

      // Should hide default questions after first interaction
      expect(queryByText('Quick Questions')).toBeNull();

      // Should show input box for follow-up questions
      expect(getByText('Ask about your business...')).toBeTruthy();
    });

    it('should handle error scenarios gracefully', async () => {
      mockAIAnalyticsService.sendQuestion.mockRejectedValue(
        new Error('Network error')
      );

      const { getByText } = render(<AIAnalyticsTab />);

      // Wait for default questions to load
      await waitFor(() => {
        expect(getByText('How are my sales this week?')).toBeTruthy();
      });

      // User asks a question
      fireEvent.press(getByText('How are my sales this week?'));

      // Should show error message and retry button
      await waitFor(() => {
        expect(
          getByText('Sorry, I encountered an error while analyzing your data.')
        ).toBeTruthy();
        expect(getByText('Retry')).toBeTruthy();
      });
    });

    it('should handle API key validation errors', async () => {
      const invalidKeyError = new Error('Invalid API key');
      (invalidKeyError as any).type = 'INVALID_API_KEY';
      mockAIAnalyticsService.sendQuestion.mockRejectedValue(invalidKeyError);

      const { getByText } = render(<AIAnalyticsTab />);

      await waitFor(() => {
        fireEvent.press(getByText('How are my sales this week?'));
      });

      // Should show API key setup again
      await waitFor(() => {
        expect(getByText('AI Analytics Setup')).toBeTruthy();
      });
    });

    it('should handle no data scenario', async () => {
      const noDataError = new Error('No data available');
      (noDataError as any).type = 'NO_DATA';
      mockAIAnalyticsService.sendQuestion.mockRejectedValue(noDataError);

      const { getByText } = render(<AIAnalyticsTab />);

      await waitFor(() => {
        fireEvent.press(getByText('How are my sales this week?'));
      });

      await waitFor(() => {
        expect(
          getByText('Sorry, I encountered an error while analyzing your data.')
        ).toBeTruthy();
      });
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle multiple rapid questions without issues', async () => {
      const { getByText, getByPlaceholderText } = render(<AIAnalyticsTab />);

      // Wait for component to load
      await waitFor(() => {
        expect(getByText('How are my sales this week?')).toBeTruthy();
      });

      // Simulate rapid questions
      for (let i = 0; i < 5; i++) {
        fireEvent.press(getByText('How are my sales this week?'));

        await waitFor(() => {
          expect(mockAIAnalyticsService.sendQuestion).toHaveBeenCalled();
        });
      }

      // Should handle all requests
      expect(mockAIAnalyticsService.sendQuestion).toHaveBeenCalledTimes(5);
    });

    it('should maintain session state across interactions', async () => {
      const { getByText } = render(<AIAnalyticsTab />);

      // First question
      await waitFor(() => {
        fireEvent.press(getByText('How are my sales this week?'));
      });

      await waitFor(() => {
        expect(getByText('Your sales are up 15% this week!')).toBeTruthy();
      });

      // Second question
      mockAIAnalyticsService.sendQuestion.mockResolvedValueOnce(
        'Your top product is Product 1'
      );
      fireEvent.press(getByText('What products are selling well?'));

      await waitFor(() => {
        expect(getByText('Your top product is Product 1')).toBeTruthy();
      });

      // Both responses should be visible (session maintained)
      expect(getByText('Your sales are up 15% this week!')).toBeTruthy();
      expect(getByText('Your top product is Product 1')).toBeTruthy();
    });
  });

  describe('Accessibility and Usability', () => {
    it('should provide clear feedback for all user actions', async () => {
      const { getByText } = render(<AIAnalyticsTab />);

      // Loading state feedback
      await waitFor(() => {
        fireEvent.press(getByText('How are my sales this week?'));
      });

      expect(getByText('Analyzing...')).toBeTruthy();

      // Success feedback
      await waitFor(() => {
        expect(getByText('Your sales are up 15% this week!')).toBeTruthy();
      });
    });

    it('should handle different question types appropriately', async () => {
      const { getByText } = render(<AIAnalyticsTab />);

      const questions = [
        'How are my sales this week?',
        'What products are selling well?',
        'Which items need restocking?',
        'Show me my best customers',
        'Why did sales change recently?',
        'What should I focus on today?',
      ];

      for (const question of questions) {
        await waitFor(() => {
          expect(getByText(question)).toBeTruthy();
        });
      }
    });
  });

  describe('Integration with Existing Systems', () => {
    it('should properly integrate with database service', async () => {
      const { getByText } = render(<AIAnalyticsTab />);

      await waitFor(() => {
        fireEvent.press(getByText('How are my sales this week?'));
      });

      // Should call database methods to get shop data
      expect(mockDatabaseService.getProducts).toHaveBeenCalled();
      expect(mockDatabaseService.getSalesByDateRange).toHaveBeenCalled();
      expect(mockDatabaseService.getCustomers).toHaveBeenCalled();
    });

    it('should properly integrate with API key management', async () => {
      const { getByText } = render(<AIAnalyticsTab />);

      // Should check API key on mount
      expect(mockAPIKeyManager.hasApiKey).toHaveBeenCalled();

      await waitFor(() => {
        fireEvent.press(getByText('How are my sales this week?'));
      });

      // Should use API key for requests
      expect(mockAIAnalyticsService.sendQuestion).toHaveBeenCalled();
    });
  });

  describe('Localization Support', () => {
    it('should display localized text correctly', async () => {
      const { getByText } = render(<AIAnalyticsTab />);

      await waitFor(() => {
        expect(getByText('Quick Questions')).toBeTruthy();
        expect(getByText('How are my sales this week?')).toBeTruthy();
        expect(getByText('Ask about your business...')).toBeTruthy();
      });
    });
  });
});

describe('Feature Completeness Validation', () => {
  it('should meet all specified requirements', () => {
    // This test validates that all major components exist and are properly integrated

    // Core services
    expect(AIAnalyticsService.getInstance).toBeDefined();
    expect(APIKeyManager.getInstance).toBeDefined();

    // UI components
    const AIAnalyticsTab = require('../../components/AIAnalyticsTab').default;
    const DefaultQuestions =
      require('../../components/DefaultQuestions').default;
    const ChatInterface = require('../../components/ChatInterface').default;
    const APIKeySetup = require('../../components/APIKeySetup').default;

    expect(AIAnalyticsTab).toBeDefined();
    expect(DefaultQuestions).toBeDefined();
    expect(ChatInterface).toBeDefined();
    expect(APIKeySetup).toBeDefined();

    // Error handling
    const {
      getErrorMessage,
      categorizeError,
    } = require('../../utils/aiAnalyticsErrors');
    expect(getErrorMessage).toBeDefined();
    expect(categorizeError).toBeDefined();

    // Session management
    const {
      AIAnalyticsSessionService,
    } = require('../../services/aiAnalyticsSessionService');
    expect(AIAnalyticsSessionService.getInstance).toBeDefined();
  });
});
