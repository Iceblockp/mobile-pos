import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Modal, Text, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ChatMessage, AIAnalyticsState } from '../types/aiAnalytics';
import { AIAnalyticsService } from '../services/aiAnalyticsService';
import { APIKeyManager } from '../services/apiKeyManager';
import { AIAnalyticsSessionService } from '../services/aiAnalyticsSessionService';
import { getErrorMessage, categorizeError } from '../utils/aiAnalyticsErrors';
import ChatInterface from './ChatInterface';
import DefaultQuestions from './DefaultQuestions';
import AIAnalyticsErrorBoundary from './AIAnalyticsErrorBoundary';
import { generateUUID } from '../utils/uuid';
import { useTranslation } from '../context/LocalizationContext';
import APIKeySetup from './APIKeySetup';

const AIAnalyticsTab: React.FC = () => {
  const { t } = useTranslation();
  const [state, setState] = useState<AIAnalyticsState>({
    messages: [],
    isLoading: false,
    inputText: '',
    apiKeyConfigured: false,
  });

  const [showApiKeySetup, setShowApiKeySetup] = useState(false);
  const [showDefaultQuestions, setShowDefaultQuestions] = useState(true);

  const aiAnalyticsService = AIAnalyticsService.getInstance();
  const apiKeyManager = APIKeyManager.getInstance();
  const sessionService = AIAnalyticsSessionService.getInstance();

  // Check API key configuration and load session on component mount and focus
  useFocusEffect(
    useCallback(() => {
      checkApiKeyConfiguration();
      loadSession();
    }, [])
  );

  const checkApiKeyConfiguration = async () => {
    try {
      const hasApiKey = await apiKeyManager.hasApiKey();
      setState((prev) => ({ ...prev, apiKeyConfigured: hasApiKey }));

      if (!hasApiKey) {
        setShowApiKeySetup(true);
      }
    } catch (error) {
      console.error('Error checking API key configuration:', error);
    }
  };

  const loadSession = async () => {
    try {
      await sessionService.loadSessionFromPersistentStorage();
      const sessionMessages = sessionService.getSessionMessages();

      if (sessionMessages.length > 0) {
        setState((prev) => ({
          ...prev,
          messages: sessionMessages,
        }));
        setShowDefaultQuestions(false);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const saveSession = async () => {
    try {
      await sessionService.saveSessionToPersistentStorage();
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || state.isLoading) {
      return;
    }

    // Check API key before sending
    if (!state.apiKeyConfigured) {
      setShowApiKeySetup(true);
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: generateUUID(),
      type: 'user',
      content: message.trim(),
      timestamp: new Date(),
    };

    // Add loading AI message
    const loadingMessage: ChatMessage = {
      id: generateUUID(),
      type: 'ai',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    // Add messages to session
    sessionService.addMessage(userMessage);
    sessionService.addMessage(loadingMessage);

    setState((prev) => ({
      ...prev,
      messages: sessionService.getSessionMessages(),
      isLoading: true,
      inputText: '',
      error: undefined,
    }));

    setShowDefaultQuestions(false);

    try {
      const response = await aiAnalyticsService.sendQuestion(message.trim());

      // Replace loading message with actual response
      sessionService.updateMessage(loadingMessage.id, {
        content: response,
        isLoading: false,
      });

      setState((prev) => ({
        ...prev,
        messages: sessionService.getSessionMessages(),
        isLoading: false,
      }));

      // Save session after successful response
      await saveSession();
    } catch (error: any) {
      console.error('Error sending message:', error);

      const errorType = error.type || categorizeError(error);
      const errorMessage = error.message || getErrorMessage(errorType);

      // Handle specific error types
      if (errorType === 'NO_API_KEY') {
        sessionService.removeMessage(loadingMessage.id);
        setState((prev) => ({
          ...prev,
          messages: sessionService.getSessionMessages(),
          isLoading: false,
          apiKeyConfigured: false,
        }));
        setShowApiKeySetup(true);
        return;
      }

      // Replace loading message with error message
      sessionService.updateMessage(loadingMessage.id, {
        content: 'Sorry, I encountered an error while analyzing your data.',
        isLoading: false,
        error: errorMessage,
      });

      setState((prev) => ({
        ...prev,
        messages: sessionService.getSessionMessages(),
        isLoading: false,
        error: errorType,
      }));
    }
  };

  const handleQuestionSelect = (question: string) => {
    handleSendMessage(question);
  };

  const handleInputChange = (text: string) => {
    setState((prev) => ({ ...prev, inputText: text }));
  };

  const handleApiKeyConfigured = async () => {
    setShowApiKeySetup(false);
    await checkApiKeyConfiguration();

    // Add welcome message when API key is configured
    if (state.messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: generateUUID(),
        type: 'system',
        content: t('aiAnalytics.apiKeyConfigured'),
        timestamp: new Date(),
      };

      setState((prev) => ({
        ...prev,
        messages: [welcomeMessage],
      }));
    }
  };

  const handleRetry = () => {
    if (state.error === 'NO_API_KEY') {
      setShowApiKeySetup(true);
    } else {
      // Retry the last user message
      const lastUserMessage = state.messages
        .filter((msg) => msg.type === 'user')
        .pop();

      if (lastUserMessage) {
        handleSendMessage(lastUserMessage.content);
      }
    }
  };

  const showApiKeySettings = () => {
    console.log('API Key Settings button pressed');
    setShowApiKeySetup(true);
  };

  // Show API Key Setup modal when requested
  if (showApiKeySetup) {
    return (
      <Modal
        visible={showApiKeySetup}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <APIKeySetup
          onComplete={handleApiKeyConfigured}
          onCancel={() => setShowApiKeySetup(false)}
        />
      </Modal>
    );
  }

  return (
    <AIAnalyticsErrorBoundary>
      <View style={styles.container}>
        {showDefaultQuestions && state.messages.length === 0 ? (
          <View style={styles.defaultQuestionsContainer}>
            <DefaultQuestions
              onQuestionSelect={handleQuestionSelect}
              isLoading={state.isLoading}
            />

            <View style={styles.apiKeyInfo}>
              <TouchableOpacity
                style={styles.apiKeyButton}
                onPress={showApiKeySettings}
                activeOpacity={0.7}
                testID="api-key-settings-button"
              >
                <Text style={styles.apiKeyButtonText}>
                  {t('aiAnalytics.apiKeySettings')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.chatContainer}>
            <View style={styles.chatHeader}>
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={showApiKeySettings}
                activeOpacity={0.7}
                testID="chat-settings-button"
              >
                <Text style={styles.settingsButtonText}>⚙️</Text>
              </TouchableOpacity>
            </View>
            <ChatInterface
              messages={state.messages}
              isLoading={state.isLoading}
              onSendMessage={handleSendMessage}
              inputText={state.inputText}
              onInputChange={handleInputChange}
            />
          </View>
        )}

        {state.error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{getErrorMessage(state.error)}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>
                {t('aiAnalytics.retry')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </AIAnalyticsErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  defaultQuestionsContainer: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  settingsButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  settingsButtonText: {
    fontSize: 16,
  },
  apiKeyInfo: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  apiKeyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  apiKeyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#F44336',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AIAnalyticsTab;
