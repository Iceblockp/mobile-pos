// AI Analytics Types and Interfaces

export interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  error?: string;
}

export interface AIRequest {
  question: string;
  shopData: ShopDataExport;
  context?: string;
}

export interface ShopDataExport {
  products: any[];
  sales: any[];
  customers: any[];
  suppliers: any[];
  expenses: any[];
  stockMovements: any[];
  metadata: {
    exportDate: string;
    totalRecords: number;
  };
}

export interface AIConfig {
  apiKey: string;
  provider: 'gemini' | 'openai';
  endpoint: string;
  model: string;
}

export interface GeminiResponse {
  candidates: [
    {
      content: {
        parts: [
          {
            text: string;
          }
        ];
      };
    }
  ];
}

export type AIAnalyticsError =
  | 'NO_API_KEY'
  | 'INVALID_API_KEY'
  | 'NETWORK_ERROR'
  | 'NO_DATA'
  | 'TIMEOUT_ERROR'
  | 'UNKNOWN_ERROR';

export interface AIAnalyticsState {
  messages: ChatMessage[];
  isLoading: boolean;
  inputText: string;
  apiKeyConfigured: boolean;
  error?: AIAnalyticsError;
}

export const DEFAULT_QUESTIONS = [
  'How are my sales this week?',
  'What products are selling well?',
  'Which items need restocking?',
  'Show me my best customers',
  'Why did sales change recently?',
  'What should I focus on today?',
];

export const AI_ANALYTICS_STORAGE_KEYS = {
  API_KEY: 'ai_analytics_api_key',
  SESSION_HISTORY: 'ai_analytics_session_history',
} as const;
