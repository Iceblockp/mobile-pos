import { AIAnalyticsError } from '../types/aiAnalytics';

export class AIAnalyticsException extends Error {
  constructor(
    public type: AIAnalyticsError,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AIAnalyticsException';
  }
}

export const createAIAnalyticsError = (
  type: AIAnalyticsError,
  message: string,
  originalError?: Error
): AIAnalyticsException => {
  return new AIAnalyticsException(type, message, originalError);
};

export const getErrorMessage = (error: AIAnalyticsError): string => {
  switch (error) {
    case 'NO_API_KEY':
      return 'Please configure your AI API key to use analytics features.';
    case 'INVALID_API_KEY':
      return 'The provided API key is invalid. Please check and update your key.';
    case 'NETWORK_ERROR':
      return 'Unable to connect to AI service. Please check your internet connection.';
    case 'NO_DATA':
      return 'No data available for analysis. Please add some transactions first.';
    case 'TIMEOUT_ERROR':
      return 'Request timed out. Please try again.';
    case 'UNKNOWN_ERROR':
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

export const isNetworkError = (error: any): boolean => {
  return (
    error?.code === 'NETWORK_REQUEST_FAILED' ||
    error?.message?.includes('Network request failed') ||
    error?.message?.includes('fetch')
  );
};

export const isTimeoutError = (error: any): boolean => {
  return (
    error?.code === 'TIMEOUT' ||
    error?.message?.includes('timeout') ||
    error?.message?.includes('Request timed out')
  );
};

export const categorizeError = (error: any): AIAnalyticsError => {
  if (isNetworkError(error)) {
    return 'NETWORK_ERROR';
  }

  if (isTimeoutError(error)) {
    return 'TIMEOUT_ERROR';
  }

  if (error?.status === 401 || error?.message?.includes('API key')) {
    return 'INVALID_API_KEY';
  }

  return 'UNKNOWN_ERROR';
};
