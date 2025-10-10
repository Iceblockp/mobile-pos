import { AIConfig } from '../types/aiAnalytics';

export const DEFAULT_AI_CONFIG: Omit<AIConfig, 'apiKey'> = {
  provider: 'gemini',
  endpoint:
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
  model: 'gemini-pro',
};

export const validateApiKeyFormat = (
  apiKey: string,
  provider: 'gemini' | 'openai' = 'gemini'
): boolean => {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  switch (provider) {
    case 'gemini':
      // Gemini API keys typically start with 'AIza' and are 39 characters long
      return apiKey.startsWith('AIza') && apiKey.length === 39;
    case 'openai':
      // OpenAI API keys typically start with 'sk-' and are longer
      return apiKey.startsWith('sk-') && apiKey.length > 20;
    default:
      return false;
  }
};

export const createAIConfig = (apiKey: string): AIConfig => {
  return {
    ...DEFAULT_AI_CONFIG,
    apiKey,
  };
};

export const REQUEST_TIMEOUT = 30000; // 30 seconds
export const MAX_RETRIES = 3;
export const RETRY_DELAY = 1000; // 1 second
