import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIAnalyticsSessionService } from '../../services/aiAnalyticsSessionService';
import {
  ChatMessage,
  AI_ANALYTICS_STORAGE_KEYS,
} from '../../types/aiAnalytics';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('AIAnalyticsSessionService', () => {
  let sessionService: AIAnalyticsSessionService;
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

  const mockMessage: ChatMessage = {
    id: 'msg-1',
    type: 'user',
    content: 'Test message',
    timestamp: new Date('2023-01-01T10:00:00Z'),
  };

  const mockAIMessage: ChatMessage = {
    id: 'msg-2',
    type: 'ai',
    content: 'AI response',
    timestamp: new Date('2023-01-01T10:01:00Z'),
  };

  beforeEach(() => {
    sessionService = AIAnalyticsSessionService.getInstance();
    sessionService.clearSession(); // Clear any existing session
    jest.clearAllMocks();
  });

  describe('addMessage', () => {
    it('should add message to session', () => {
      sessionService.addMessage(mockMessage);

      const messages = sessionService.getSessionMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(mockMessage);
    });

    it('should maintain message order', () => {
      sessionService.addMessage(mockMessage);
      sessionService.addMessage(mockAIMessage);

      const messages = sessionService.getSessionMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual(mockMessage);
      expect(messages[1]).toEqual(mockAIMessage);
    });

    it('should limit session messages to prevent memory issues', () => {
      // Add more than the limit (50 messages)
      for (let i = 0; i < 60; i++) {
        sessionService.addMessage({
          ...mockMessage,
          id: `msg-${i}`,
          content: `Message ${i}`,
        });
      }

      const messages = sessionService.getSessionMessages();
      expect(messages).toHaveLength(50);
      expect(messages[0].content).toBe('Message 10'); // Should keep the last 50
      expect(messages[49].content).toBe('Message 59');
    });
  });

  describe('updateMessage', () => {
    beforeEach(() => {
      sessionService.addMessage(mockMessage);
    });

    it('should update existing message', () => {
      sessionService.updateMessage('msg-1', {
        content: 'Updated content',
        isLoading: false,
      });

      const messages = sessionService.getSessionMessages();
      expect(messages[0].content).toBe('Updated content');
      expect(messages[0].isLoading).toBe(false);
    });

    it('should not update non-existent message', () => {
      sessionService.updateMessage('non-existent', {
        content: 'Updated content',
      });

      const messages = sessionService.getSessionMessages();
      expect(messages[0].content).toBe('Test message'); // Should remain unchanged
    });
  });

  describe('removeMessage', () => {
    beforeEach(() => {
      sessionService.addMessage(mockMessage);
      sessionService.addMessage(mockAIMessage);
    });

    it('should remove message by id', () => {
      sessionService.removeMessage('msg-1');

      const messages = sessionService.getSessionMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe('msg-2');
    });

    it('should handle removal of non-existent message', () => {
      sessionService.removeMessage('non-existent');

      const messages = sessionService.getSessionMessages();
      expect(messages).toHaveLength(2); // Should remain unchanged
    });
  });

  describe('clearSession', () => {
    it('should clear all messages', () => {
      sessionService.addMessage(mockMessage);
      sessionService.addMessage(mockAIMessage);

      sessionService.clearSession();

      const messages = sessionService.getSessionMessages();
      expect(messages).toHaveLength(0);
    });
  });

  describe('getRecentUserQuestions', () => {
    beforeEach(() => {
      sessionService.addMessage({ ...mockMessage, content: 'Question 1' });
      sessionService.addMessage({ ...mockAIMessage, content: 'Answer 1' });
      sessionService.addMessage({
        ...mockMessage,
        id: 'msg-3',
        content: 'Question 2',
      });
      sessionService.addMessage({
        ...mockAIMessage,
        id: 'msg-4',
        content: 'Answer 2',
      });
    });

    it('should return recent user questions only', () => {
      const questions = sessionService.getRecentUserQuestions();

      expect(questions).toEqual(['Question 1', 'Question 2']);
    });

    it('should limit number of questions returned', () => {
      // Add more questions
      for (let i = 3; i <= 10; i++) {
        sessionService.addMessage({
          ...mockMessage,
          id: `msg-${i}`,
          content: `Question ${i}`,
        });
      }

      const questions = sessionService.getRecentUserQuestions(3);
      expect(questions).toHaveLength(3);
      expect(questions).toEqual(['Question 8', 'Question 9', 'Question 10']);
    });
  });

  describe('getSessionStats', () => {
    beforeEach(() => {
      sessionService.addMessage(mockMessage);
      sessionService.addMessage(mockAIMessage);
      sessionService.addMessage({
        id: 'msg-3',
        type: 'system',
        content: 'System message',
        timestamp: new Date('2023-01-01T10:02:00Z'),
      });
    });

    it('should return correct session statistics', () => {
      const stats = sessionService.getSessionStats();

      expect(stats.totalMessages).toBe(3);
      expect(stats.userMessages).toBe(1);
      expect(stats.aiMessages).toBe(1);
      expect(stats.systemMessages).toBe(1);
      expect(stats.sessionDuration).toBe(2); // 2 minutes
    });

    it('should return zero duration for single message', () => {
      sessionService.clearSession();
      sessionService.addMessage(mockMessage);

      const stats = sessionService.getSessionStats();
      expect(stats.sessionDuration).toBe(0);
    });
  });

  describe('persistent storage', () => {
    describe('saveSessionToPersistentStorage', () => {
      it('should save session to AsyncStorage', async () => {
        sessionService.addMessage(mockMessage);
        mockAsyncStorage.setItem.mockResolvedValue();

        await sessionService.saveSessionToPersistentStorage();

        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          AI_ANALYTICS_STORAGE_KEYS.SESSION_HISTORY,
          expect.stringContaining('"messages"')
        );
      });

      it('should handle storage errors gracefully', async () => {
        sessionService.addMessage(mockMessage);
        mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

        // Should not throw
        await expect(
          sessionService.saveSessionToPersistentStorage()
        ).resolves.toBeUndefined();
      });
    });

    describe('loadSessionFromPersistentStorage', () => {
      it('should load recent session from storage', async () => {
        const sessionData = {
          messages: [mockMessage],
          timestamp: new Date().toISOString(), // Recent timestamp
        };

        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(sessionData));

        await sessionService.loadSessionFromPersistentStorage();

        const messages = sessionService.getSessionMessages();
        expect(messages).toHaveLength(1);
        expect(messages[0].content).toBe('Test message');
      });

      it('should ignore old sessions (>24 hours)', async () => {
        const oldTimestamp = new Date();
        oldTimestamp.setHours(oldTimestamp.getHours() - 25); // 25 hours ago

        const sessionData = {
          messages: [mockMessage],
          timestamp: oldTimestamp.toISOString(),
        };

        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(sessionData));

        await sessionService.loadSessionFromPersistentStorage();

        const messages = sessionService.getSessionMessages();
        expect(messages).toHaveLength(0); // Should not load old session
      });

      it('should handle missing storage data', async () => {
        mockAsyncStorage.getItem.mockResolvedValue(null);

        await sessionService.loadSessionFromPersistentStorage();

        const messages = sessionService.getSessionMessages();
        expect(messages).toHaveLength(0);
      });

      it('should handle corrupted storage data', async () => {
        mockAsyncStorage.getItem.mockResolvedValue('invalid json');

        // Should not throw
        await expect(
          sessionService.loadSessionFromPersistentStorage()
        ).resolves.toBeUndefined();
      });
    });

    describe('clearPersistentSession', () => {
      it('should clear persistent session storage', async () => {
        mockAsyncStorage.removeItem.mockResolvedValue();

        await sessionService.clearPersistentSession();

        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
          AI_ANALYTICS_STORAGE_KEYS.SESSION_HISTORY
        );
      });

      it('should handle storage errors gracefully', async () => {
        mockAsyncStorage.removeItem.mockRejectedValue(
          new Error('Storage error')
        );

        // Should not throw
        await expect(
          sessionService.clearPersistentSession()
        ).resolves.toBeUndefined();
      });
    });
  });

  describe('exportSessionData', () => {
    beforeEach(() => {
      sessionService.addMessage(mockMessage);
      sessionService.addMessage(mockAIMessage);
    });

    it('should export complete session data', () => {
      const exportData = sessionService.exportSessionData();

      expect(exportData).toHaveProperty('messages');
      expect(exportData).toHaveProperty('stats');
      expect(exportData).toHaveProperty('exportTimestamp');
      expect(exportData.messages).toHaveLength(2);
      expect(exportData.stats.totalMessages).toBe(2);
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = AIAnalyticsSessionService.getInstance();
      const instance2 = AIAnalyticsSessionService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});
