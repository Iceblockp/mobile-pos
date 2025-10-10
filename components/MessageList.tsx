import React from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { ChatMessage } from '../types/aiAnalytics';
import { useTranslation } from '../context/LocalizationContext';

interface MessageListProps {
  messages: ChatMessage[];
  scrollViewRef: React.RefObject<ScrollView>;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  scrollViewRef,
}) => {
  const { t } = useTranslation();
  const renderMessage = (message: ChatMessage) => {
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';

    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.aiMessageContainer,
          isSystem && styles.systemMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.aiBubble,
            isSystem && styles.systemBubble,
          ]}
        >
          {message.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#666" />
              <Text style={styles.loadingText}>
                {t('aiAnalytics.analyzing')}
              </Text>
            </View>
          ) : (
            <>
              <Text
                style={[
                  styles.messageText,
                  isUser ? styles.userText : styles.aiText,
                  isSystem && styles.systemText,
                ]}
              >
                {message.content}
              </Text>
              {message.error && (
                <Text style={styles.errorText}>{message.error}</Text>
              )}
            </>
          )}
        </View>
        <Text style={styles.timestamp}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };

  if (messages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('aiAnalytics.emptyStateTitle')}</Text>
        <Text style={styles.emptySubtext}>
          {t('aiAnalytics.emptyStateSubtitle')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {messages.map(renderMessage)}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  aiMessageContainer: {
    alignItems: 'flex-start',
  },
  systemMessageContainer: {
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 4,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  systemBubble: {
    backgroundColor: '#F0F0F0',
    maxWidth: '90%',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#333333',
  },
  systemText: {
    color: '#666666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginHorizontal: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default MessageList;
