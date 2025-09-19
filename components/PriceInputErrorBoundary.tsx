import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class PriceInputErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error for debugging
    console.error(
      'PriceInput Error Boundary caught an error:',
      error,
      errorInfo
    );

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <View style={styles.errorContainer}>
          <View style={styles.errorContent}>
            <AlertTriangle size={24} color="#EF4444" />
            <Text style={styles.errorTitle}>Price Input Error</Text>
            <Text style={styles.errorMessage}>
              Something went wrong with the price input. Please try again.
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={this.handleRetry}
            >
              <RefreshCw size={16} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    marginVertical: 8,
  },
  errorContent: {
    alignItems: 'center',
    gap: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EF4444',
    borderRadius: 6,
    gap: 6,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
});

// Higher-order component for wrapping price inputs with error boundary
export const withPriceInputErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WrappedComponent = (props: P) => (
    <PriceInputErrorBoundary>
      <Component {...props} />
    </PriceInputErrorBoundary>
  );

  WrappedComponent.displayName = `withPriceInputErrorBoundary(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
};
