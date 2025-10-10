import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage, AI_ANALYTICS_STORAGE_KEYS } from '../types/aiAnalytics';

export class AIAnalyticsSessionService {
  private static instance: AIAnalyticsSessionService;
  private sessionMessages: ChatMessage[] = [];
  private maxSessionMessages = 50; // Limit to prevent memory issues

  public static getInstance(): AIAnalyticsSessionService {
    if (!AIAnalyticsSessionService.instance) {
      AIAnalyticsSessionService.instance = new AIAnalyticsSessionService();
    }
    return AIAnalyticsSessionService.instance;
  }

  /**
   * Adds a message to the current session
   */
  addMessage(message: ChatMessage): void {
    this.sessionMessages.push(message);

    // Keep only the most recent messages to prevent memory issues
    if (this.sessionMessages.length > this.maxSessionMessages) {
      this.sessionMessages = this.sessionMessages.slice(
        -this.maxSessionMessages
      );
    }
  }

  /**
   * Updates an existing message in the session
   */
  updateMessage(messageId: string, updates: Partial<ChatMessage>): void {
    const index = this.sessionMessages.findIndex((msg) => msg.id === messageId);
    if (index !== -1) {
      this.sessionMessages[index] = {
        ...this.sessionMessages[index],
        ...updates,
      };
    }
  }

  /**
   * Gets all messages from the current session
   */
  getSessionMessages(): ChatMessage[] {
    return [...this.sessionMessages];
  }

  /**
   * Clears the current session
   */
  clearSession(): void {
    this.sessionMessages = [];
  }

  /**
   * Gets the number of messages in the current session
   */
  getSessionMessageCount(): number {
    return this.sessionMessages.length;
  }

  /**
   * Removes a specific message from the session
   */
  removeMessage(messageId: string): void {
    this.sessionMessages = this.sessionMessages.filter(
      (msg) => msg.id !== messageId
    );
  }

  /**
   * Gets recent user questions for context
   */
  getRecentUserQuestions(limit: number = 5): string[] {
    return this.sessionMessages
      .filter((msg) => msg.type === 'user')
      .slice(-limit)
      .map((msg) => msg.content);
  }

  /**
   * Saves current session to persistent storage (optional)
   */
  async saveSessionToPersistentStorage(): Promise<void> {
    try {
      const sessionData = {
        messages: this.sessionMessages,
        timestamp: new Date().toISOString(),
      };

      await AsyncStorage.setItem(
        AI_ANALYTICS_STORAGE_KEYS.SESSION_HISTORY,
        JSON.stringify(sessionData)
      );
    } catch (error) {
      console.error('Error saving session to storage:', error);
      // Don't throw - session persistence is optional
    }
  }

  /**
   * Loads session from persistent storage (optional)
   */
  async loadSessionFromPersistentStorage(): Promise<void> {
    try {
      const sessionDataString = await AsyncStorage.getItem(
        AI_ANALYTICS_STORAGE_KEYS.SESSION_HISTORY
      );

      if (sessionDataString) {
        const sessionData = JSON.parse(sessionDataString);

        // Only load if session is recent (within last 24 hours)
        const sessionTimestamp = new Date(sessionData.timestamp);
        const now = new Date();
        const hoursDiff =
          (now.getTime() - sessionTimestamp.getTime()) / (1000 * 60 * 60);

        if (hoursDiff < 24 && sessionData.messages) {
          this.sessionMessages = sessionData.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
        }
      }
    } catch (error) {
      console.error('Error loading session from storage:', error);
      // Don't throw - session persistence is optional
    }
  }

  /**
   * Clears persistent session storage
   */
  async clearPersistentSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(AI_ANALYTICS_STORAGE_KEYS.SESSION_HISTORY);
    } catch (error) {
      console.error('Error clearing persistent session:', error);
    }
  }

  /**
   * Gets session statistics
   */
  getSessionStats(): {
    totalMessages: number;
    userMessages: number;
    aiMessages: number;
    systemMessages: number;
    sessionDuration: number; // in minutes
  } {
    const userMessages = this.sessionMessages.filter(
      (msg) => msg.type === 'user'
    ).length;
    const aiMessages = this.sessionMessages.filter(
      (msg) => msg.type === 'ai'
    ).length;
    const systemMessages = this.sessionMessages.filter(
      (msg) => msg.type === 'system'
    ).length;

    let sessionDuration = 0;
    if (this.sessionMessages.length > 0) {
      const firstMessage = this.sessionMessages[0];
      const lastMessage = this.sessionMessages[this.sessionMessages.length - 1];
      sessionDuration =
        (lastMessage.timestamp.getTime() - firstMessage.timestamp.getTime()) /
        (1000 * 60);
    }

    return {
      totalMessages: this.sessionMessages.length,
      userMessages,
      aiMessages,
      systemMessages,
      sessionDuration: Math.round(sessionDuration),
    };
  }

  /**
   * Exports session data for debugging or analysis
   */
  exportSessionData(): {
    messages: ChatMessage[];
    stats: ReturnType<typeof this.getSessionStats>;
    exportTimestamp: string;
  } {
    return {
      messages: this.getSessionMessages(),
      stats: this.getSessionStats(),
      exportTimestamp: new Date().toISOString(),
    };
  }
}
