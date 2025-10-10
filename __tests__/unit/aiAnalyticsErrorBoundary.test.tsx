import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import AIAnalyticsErrorBoundary from '../../components/AIAnalyticsErrorBoundary';

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <Text>No error</Text>;
};

describe('AIAnalyticsErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  it('renders children when there is no error', () => {
    const { getByText } = render(
      <AIAnalyticsErrorBoundary>
        <ThrowError shouldThrow={false} />
      </AIAnalyticsErrorBoundary>
    );

    expect(getByText('No error')).toBeTruthy();
  });

  it('renders error UI when child component throws', () => {
    const { getByText } = render(
      <AIAnalyticsErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AIAnalyticsErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(
      getByText(/AI Analytics feature encountered an unexpected error/)
    ).toBeTruthy();
    expect(getByText('Try Again')).toBeTruthy();
  });

  it('shows troubleshooting tips', () => {
    const { getByText } = render(
      <AIAnalyticsErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AIAnalyticsErrorBoundary>
    );

    expect(getByText('Troubleshooting Tips:')).toBeTruthy();
    expect(getByText('• Check your internet connection')).toBeTruthy();
    expect(getByText('• Verify your API key is valid')).toBeTruthy();
    expect(getByText('• Try asking a simpler question')).toBeTruthy();
    expect(getByText('• Restart the app if the problem persists')).toBeTruthy();
  });

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn();

    render(
      <AIAnalyticsErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </AIAnalyticsErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));
  });

  it('resets error state when retry button is pressed', () => {
    const { getByText, queryByText, rerender } = render(
      <AIAnalyticsErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AIAnalyticsErrorBoundary>
    );

    // Should show error UI
    expect(getByText('Something went wrong')).toBeTruthy();

    // Press retry button
    const retryButton = getByText('Try Again');
    fireEvent.press(retryButton);

    // Re-render with no error
    rerender(
      <AIAnalyticsErrorBoundary>
        <ThrowError shouldThrow={false} />
      </AIAnalyticsErrorBoundary>
    );

    // Should show normal content
    expect(queryByText('Something went wrong')).toBeNull();
    expect(getByText('No error')).toBeTruthy();
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <Text>Custom error message</Text>;

    const { getByText } = render(
      <AIAnalyticsErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </AIAnalyticsErrorBoundary>
    );

    expect(getByText('Custom error message')).toBeTruthy();
  });

  it('shows debug information in development mode', () => {
    // Mock __DEV__ to be true
    const originalDev = (global as any).__DEV__;
    (global as any).__DEV__ = true;

    const { getByText } = render(
      <AIAnalyticsErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AIAnalyticsErrorBoundary>
    );

    expect(getByText('Debug Information:')).toBeTruthy();
    expect(getByText('Test error')).toBeTruthy();

    // Restore original __DEV__
    (global as any).__DEV__ = originalDev;
  });

  it('hides debug information in production mode', () => {
    // Mock __DEV__ to be false
    const originalDev = (global as any).__DEV__;
    (global as any).__DEV__ = false;

    const { queryByText } = render(
      <AIAnalyticsErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AIAnalyticsErrorBoundary>
    );

    expect(queryByText('Debug Information:')).toBeNull();
    expect(queryByText('Test error')).toBeNull();

    // Restore original __DEV__
    (global as any).__DEV__ = originalDev;
  });

  it('handles multiple error-recovery cycles', () => {
    const { getByText, queryByText, rerender } = render(
      <AIAnalyticsErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AIAnalyticsErrorBoundary>
    );

    // First error
    expect(getByText('Something went wrong')).toBeTruthy();
    fireEvent.press(getByText('Try Again'));

    // Recovery
    rerender(
      <AIAnalyticsErrorBoundary>
        <ThrowError shouldThrow={false} />
      </AIAnalyticsErrorBoundary>
    );
    expect(getByText('No error')).toBeTruthy();

    // Second error
    rerender(
      <AIAnalyticsErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AIAnalyticsErrorBoundary>
    );
    expect(getByText('Something went wrong')).toBeTruthy();

    // Second recovery
    fireEvent.press(getByText('Try Again'));
    rerender(
      <AIAnalyticsErrorBoundary>
        <ThrowError shouldThrow={false} />
      </AIAnalyticsErrorBoundary>
    );
    expect(getByText('No error')).toBeTruthy();
  });
});
