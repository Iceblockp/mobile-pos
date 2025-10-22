import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PrinterErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PrinterErrorBoundary caught an error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error!}
            resetError={this.resetError}
          />
        );
      }

      return (
        <View style={styles.container}>
          <View style={styles.errorCard}>
            <AlertTriangle size={48} color="#EF4444" />
            <Text style={styles.errorTitle} weight="bold">
              Printer Service Error
            </Text>
            <Text style={styles.errorMessage}>
              {this.state.error?.message ||
                'An unexpected error occurred with the printer service.'}
            </Text>
            <Text style={styles.errorHint}>
              This might be due to Bluetooth permissions or device compatibility
              issues.
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={this.resetError}
            >
              <RefreshCw size={16} color="#FFFFFF" />
              <Text style={styles.retryButtonText} weight="medium">
                Try Again
              </Text>
            </TouchableOpacity>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: 400,
  },
  errorTitle: {
    fontSize: 20,
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 8,
  },
});
