import React, { Component, ReactNode } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MyanmarText as Text } from './MyanmarText';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class AIAnalyticsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error(
      'AI Analytics Error Boundary caught an error:',
      error,
      errorInfo
    );

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="warning" size={48} color="#FF6B6B" />
            </View>

            <Text style={styles.title} weight="medium">
              Something went wrong
            </Text>

            <Text style={styles.message}>
              The AI Analytics feature encountered an unexpected error. This
              might be due to a temporary issue with the AI service or your
              internet connection.
            </Text>

            {this.state.error && __DEV__ && (
              <View style={styles.debugContainer}>
                <Text style={styles.debugTitle} weight="medium">
                  Debug Information:
                </Text>
                <Text style={styles.debugText}>{this.state.error.message}</Text>
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={this.handleRetry}
              >
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.retryButtonText} weight="medium">
                  Try Again
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.helpContainer}>
              <Text style={styles.helpTitle} weight="medium">
                Troubleshooting Tips:
              </Text>
              <Text style={styles.helpItem}>
                • Check your internet connection
              </Text>
              <Text style={styles.helpItem}>
                • Verify your API key is valid
              </Text>
              <Text style={styles.helpItem}>
                • Try asking a simpler question
              </Text>
              <Text style={styles.helpItem}>
                • Restart the app if the problem persists
              </Text>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  debugContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    width: '100%',
  },
  debugTitle: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 8,
  },
  helpContainer: {
    width: '100%',
  },
  helpTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  helpItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
});

export default AIAnalyticsErrorBoundary;
