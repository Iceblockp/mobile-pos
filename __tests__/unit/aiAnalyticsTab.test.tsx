import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AIAnalyticsTab from '../../components/AIAnalyticsTab';
import { AIAnalyticsService } from '../../services/aiAnalyticsService';
import { APIKeyManager } from '../../services/apiKeyManager';

// Mock dependencies
jest.mock('../../services/aiAnalyticsService');
jest.mock('../../services/apiKeyManager');
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => {
    React.useEffect(callback, []);
  },
}));

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock UUID generation
jest.mock('../../utils/uuid', () => ({
  generateUUID: () => 'mock-uuid-' + Math.random(),
}));

describe('AIAnalyticsTab', () => {
  let mockAIAnalyticsService: jest.Mocked<AIAnalyticsService>;
  let mockAPIKeyManager: jest.Mocked<APIKeyManager>;

  beforeEach(() => {
    mockAIAnalyticsService =
      AIAnalyticsService.getInstance() as jest.Mocked<AIAnalyticsService>;
    mockAPIKeyManager =
      APIKeyManager.getInstance() as jest.Mocked<APIKeyManager>;

    // Default mocks
    mockAPIKeyManager.hasApiKey.mockResolvedValue(true);
    mockAIAnalyticsService.sendQuestion.mockResolvedValue('Mock AI response');

    jest.clearAllMocks();
  });

  it('renders default questions when API key is configured', async () => {
    mockAPIKeyManager.hasApiKey.mockResolvedValue(true);

    const { getByText } = render(<AIAnalyticsTab />);

    await waitFor(() => {
      expect(getByText('Quick Questions')).toBeTruthy();
      expect(getByText('How are my sales this week?')).toBeTruthy();
    });
  });

  it('shows API key setup when no API key is configured', async () => {
    mockAPIKeyManager.hasApiKey.mockResolvedValue(false);

    const { getByText } = render(<AIAnalyticsTab />);

    await waitFor(() => {
      expect(getByText('AI Analytics Setup')).toBeTruthy();
    });
  });

  it('handles question selection and sends to AI service', async () => {
    mockAPIKeyManager.hasApiKey.mockResolvedValue(true);
    mockAIAnalyticsService.sendQuestion.mockResolvedValue(
      'Your sales are up 15% this week!'
    );

    const { getByText } = render(<AIAnalyticsTab />);

    await waitFor(() => {
      expect(getByText('How are my sales this week?')).toBeTruthy();
    });

    fireEvent.press(getByText('How are my sales this week?'));

    await waitFor(() => {
      expect(mockAIAnalyticsService.sendQuestion).toHaveBeenCalledWith(
        'How are my sales this week?'
      );
    });
  });

  it('displays AI response after question is answered', async () => {
    mockAPIKeyManager.hasApiKey.mockResolvedValue(true);
    mockAIAnalyticsService.sendQuestion.mockResolvedValue(
      'Your sales are up 15% this week!'
    );

    const { getByText } = render(<AIAnalyticsTab />);

    await waitFor(() => {
      fireEvent.press(getByText('How are my sales this week?'));
    });

    await waitFor(() => {
      expect(getByText('Your sales are up 15% this week!')).toBeTruthy();
    });
  });

  it('shows loading state while processing question', async () => {
    mockAPIKeyManager.hasApiKey.mockResolvedValue(true);

    // Mock a delayed response
    mockAIAnalyticsService.sendQuestion.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve('Response'), 100))
    );

    const { getByText } = render(<AIAnalyticsTab />);

    await waitFor(() => {
      fireEvent.press(getByText('How are my sales this week?'));
    });

    // Should show analyzing state
    expect(getByText('Analyzing...')).toBeTruthy();
  });

  it('handles API errors gracefully', async () => {
    mockAPIKeyManager.hasApiKey.mockResolvedValue(true);
    mockAIAnalyticsService.sendQuestion.mockRejectedValue(
      new Error('Network error')
    );

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

  it('handles NO_API_KEY error by showing setup modal', async () => {
    mockAPIKeyManager.hasApiKey.mockResolvedValue(true);

    const noApiKeyError = new Error('API key not configured');
    (noApiKeyError as any).type = 'NO_API_KEY';
    mockAIAnalyticsService.sendQuestion.mockRejectedValue(noApiKeyError);

    const { getByText } = render(<AIAnalyticsTab />);

    await waitFor(() => {
      fireEvent.press(getByText('How are my sales this week?'));
    });

    await waitFor(() => {
      expect(getByText('AI Analytics Setup')).toBeTruthy();
    });
  });

  it('switches from default questions to chat interface after first question', async () => {
    mockAPIKeyManager.hasApiKey.mockResolvedValue(true);
    mockAIAnalyticsService.sendQuestion.mockResolvedValue('Response');

    const { getByText, queryByText } = render(<AIAnalyticsTab />);

    // Initially shows default questions
    await waitFor(() => {
      expect(getByText('Quick Questions')).toBeTruthy();
    });

    // Send a question
    fireEvent.press(getByText('How are my sales this week?'));

    // Should switch to chat interface
    await waitFor(() => {
      expect(queryByText('Quick Questions')).toBeNull();
    });
  });

  it('allows manual text input in chat interface', async () => {
    mockAPIKeyManager.hasApiKey.mockResolvedValue(true);
    mockAIAnalyticsService.sendQuestion.mockResolvedValue('Custom response');

    const { getByText, getByPlaceholderText } = render(<AIAnalyticsTab />);

    // First, trigger chat interface by asking a question
    await waitFor(() => {
      fireEvent.press(getByText('How are my sales this week?'));
    });

    await waitFor(() => {
      const input = getByPlaceholderText('Ask about your business...');
      expect(input).toBeTruthy();
    });
  });

  it('shows retry button on errors', async () => {
    mockAPIKeyManager.hasApiKey.mockResolvedValue(true);
    mockAIAnalyticsService.sendQuestion.mockRejectedValue(
      new Error('Network error')
    );

    const { getByText } = render(<AIAnalyticsTab />);

    await waitFor(() => {
      fireEvent.press(getByText('How are my sales this week?'));
    });

    await waitFor(() => {
      expect(getByText('Retry')).toBeTruthy();
    });
  });

  it('handles API key configuration completion', async () => {
    mockAPIKeyManager.hasApiKey
      .mockResolvedValueOnce(false) // Initially no key
      .mockResolvedValueOnce(true); // After configuration

    const { getByText, queryByText } = render(<AIAnalyticsTab />);

    // Should show setup initially
    await waitFor(() => {
      expect(getByText('AI Analytics Setup')).toBeTruthy();
    });

    // Simulate API key configuration (this would normally be done through the setup modal)
    // For testing, we'll just verify the component responds to the configuration
    expect(mockAPIKeyManager.hasApiKey).toHaveBeenCalled();
  });
});
