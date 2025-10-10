import { AIGenerationConfig } from '../types/aiAnalytics';

export const AI_CONFIG = {
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 1000,
    topP: 0.8,
    topK: 40,
  } as AIGenerationConfig,
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

export const createAIConfig = (apiKey: string) => {
  return {
    apiKey,
    provider: 'gemini' as const,
    model: AI_CONFIG.model,
  };
};

export const REQUEST_TIMEOUT = 30000; // 30 seconds
export const MAX_RETRIES = 3;
export const RETRY_DELAY = 1000; // 1 second
