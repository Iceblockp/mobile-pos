# Design Document

## Overview

The AI Chat Analytics feature provides a conversational interface for business insights by integrating with external AI APIs (primarily Gemini) and the existing POS system data. The feature is implemented as a third tab in the Reports section, offering both predefined questions and custom input capabilities.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Chat UI       │    │  Analytics       │    │   AI API        │
│   Component     │◄──►│  Service         │◄──►│   (Gemini)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Data Export     │
                       │  Service         │
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  SQLite          │
                       │  Database        │
                       └──────────────────┘
```

### Component Structure

```
app/(tabs)/reports.tsx
├── ReportsTabView
    ├── OverviewTab (existing)
    ├── CustomerTab (existing)
    └── AIAnalyticsTab (new)
        ├── ChatInterface
        ├── DefaultQuestions
        ├── MessageList
        ├── InputBox
        └── APIKeySettings
```

## Components and Interfaces

### 1. AIAnalyticsTab Component

**Purpose:** Main container for the AI analytics interface
**Location:** `components/AIAnalyticsTab.tsx`

**Props:**

```typescript
interface AIAnalyticsTabProps {
  // No props needed - uses context for data
}
```

**State:**

```typescript
interface AIAnalyticsState {
  messages: ChatMessage[];
  isLoading: boolean;
  inputText: string;
  apiKeyConfigured: boolean;
}
```

### 2. ChatInterface Component

**Purpose:** Manages the chat conversation flow
**Location:** `components/ChatInterface.tsx`

**Key Features:**

- Message history display
- Loading states
- Error handling
- Scroll management

### 3. DefaultQuestions Component

**Purpose:** Displays predefined question buttons
**Location:** `components/DefaultQuestions.tsx`

**Default Questions:**

```typescript
const DEFAULT_QUESTIONS = [
  'How are my sales this week?',
  'What products are selling well?',
  'Which items need restocking?',
  'Show me my best customers',
  'Why did sales change recently?',
  'What should I focus on today?',
];
```

### 4. AIAnalyticsService

**Purpose:** Handles AI API communication and data preparation
**Location:** `services/aiAnalyticsService.ts`

**Key Methods:**

```typescript
interface AIAnalyticsService {
  sendQuestion(question: string): Promise<string>;
  validateApiKey(apiKey: string): Promise<boolean>;
  formatDataForAI(shopData: any): string;
}
```

### 5. APIKeyManager

**Purpose:** Manages API key storage and validation
**Location:** `services/apiKeyManager.ts`

**Key Methods:**

```typescript
interface APIKeyManager {
  getApiKey(): Promise<string | null>;
  setApiKey(key: string): Promise<void>;
  validateKey(key: string): Promise<boolean>;
  clearApiKey(): Promise<void>;
}
```

## Data Models

### ChatMessage Interface

```typescript
interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  error?: string;
}
```

### AIRequest Interface

```typescript
interface AIRequest {
  question: string;
  shopData: ShopDataExport;
  context?: string;
}

interface ShopDataExport {
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  suppliers: Supplier[];
  expenses: Expense[];
  stockMovements: StockMovement[];
  metadata: {
    exportDate: string;
    totalRecords: number;
  };
}
```

### API Configuration

```typescript
interface AIConfig {
  apiKey: string;
  provider: 'gemini' | 'openai'; // Future extensibility
  endpoint: string;
  model: string;
}
```

## Integration Points

### 1. Reports Tab Integration

**File:** `app/(tabs)/reports.tsx`

```typescript
// Add third tab to existing tab view
const tabs = [
  { key: 'overview', title: 'Overview' },
  { key: 'customer', title: 'Customer' },
  { key: 'ai-analytics', title: 'AI Analytics' },
];
```

### 2. Data Export Integration

**Service:** Reuse existing `dataExportService.ts`

```typescript
// Leverage existing export functionality
const shopData = await dataExportService.exportAllData();
const formattedData = aiAnalyticsService.formatDataForAI(shopData);
```

### 3. AsyncStorage Integration

**Keys:**

- `ai_analytics_api_key` - Encrypted API key storage
- `ai_analytics_session_history` - Optional session persistence

## AI API Integration

### Gemini API Integration

**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent`

**Request Format:**

```typescript
{
  contents: [{
    parts: [{
      text: `
        Question: ${userQuestion}

        Shop Data Context:
        ${JSON.stringify(shopData, null, 2)}

        Please analyze this Myanmar shop's data and provide insights in simple, actionable language. Focus on practical recommendations.
      `
    }]
  }],
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 1000
  }
}
```

**Response Handling:**

```typescript
interface GeminiResponse {
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
```

## Error Handling

### Error Types and Responses

1. **No API Key Configured**

   - Show setup modal
   - Guide user through API key configuration

2. **Invalid API Key**

   - Clear error message
   - Option to reconfigure key

3. **Network/API Errors**

   - Retry mechanism
   - Offline mode message
   - Timeout handling (30 seconds)

4. **No Data Available**

   - Inform user about empty database
   - Suggest adding some transactions first

5. **AI Response Errors**
   - Fallback to generic error message
   - Option to retry question

### Error Recovery

```typescript
const handleError = (error: AIAnalyticsError) => {
  switch (error.type) {
    case 'NO_API_KEY':
      showApiKeySetup();
      break;
    case 'INVALID_API_KEY':
      showApiKeyError();
      break;
    case 'NETWORK_ERROR':
      showRetryOption();
      break;
    case 'NO_DATA':
      showDataRequiredMessage();
      break;
    default:
      showGenericError();
  }
};
```

## Testing Strategy

### Unit Tests

1. **AIAnalyticsService Tests**

   - API request formatting
   - Response parsing
   - Error handling

2. **APIKeyManager Tests**

   - Key storage/retrieval
   - Validation logic
   - AsyncStorage integration

3. **Component Tests**
   - Message rendering
   - User interactions
   - State management

### Integration Tests

1. **Data Export Integration**

   - Verify data format compatibility
   - Test with various data scenarios

2. **API Integration**
   - Mock API responses
   - Test error scenarios
   - Validate request format

### E2E Tests

1. **Complete User Flow**

   - API key setup
   - Ask question
   - Receive response
   - View history

2. **Error Scenarios**
   - No internet connection
   - Invalid API key
   - Empty database

## Security Considerations

### API Key Security

1. **Storage:** Use AsyncStorage with encryption
2. **Transmission:** HTTPS only
3. **Validation:** Client-side key format validation
4. **Access:** No logging of API keys

### Data Privacy

1. **Local Processing:** All data aggregation happens locally
2. **Minimal Data:** Only send necessary business data
3. **No PII:** Avoid sending customer personal information
4. **User Control:** Clear indication of what data is sent

### Network Security

1. **HTTPS Enforcement:** All API calls use HTTPS
2. **Request Validation:** Validate all outgoing requests
3. **Response Sanitization:** Clean AI responses before display
4. **Timeout Protection:** Prevent hanging requests

## Performance Considerations

### Data Optimization

1. **Lazy Loading:** Load chat history on demand
2. **Data Compression:** Compress large data exports before sending
3. **Caching:** Cache recent AI responses (optional)
4. **Debouncing:** Prevent rapid-fire API calls

### UI Performance

1. **Virtual Scrolling:** For long chat histories
2. **Loading States:** Clear feedback during API calls
3. **Error Boundaries:** Prevent crashes from AI response parsing
4. **Memory Management:** Clean up old messages periodically

### API Efficiency

1. **Request Batching:** Not applicable for conversational interface
2. **Rate Limiting:** Implement client-side rate limiting
3. **Retry Logic:** Exponential backoff for failed requests
4. **Timeout Handling:** 30-second timeout for API calls

## Localization Support

### Multi-language Support

1. **UI Text:** Support English and Myanmar languages
2. **AI Responses:** Request responses in user's preferred language
3. **Default Questions:** Localized question templates
4. **Error Messages:** Localized error handling

### Implementation

```typescript
// Add to localization files
const aiAnalyticsTranslations = {
  en: {
    'ai.title': 'AI Analytics',
    'ai.askQuestion': 'Ask about your business...',
    'ai.defaultQuestions.sales': 'How are my sales this week?',
    // ... more translations
  },
  my: {
    'ai.title': 'AI ခွဲခြမ်းစိတ်ဖြာမှု',
    'ai.askQuestion': 'သင့်လုပ်ငန်းအကြောင်း မေးပါ...',
    // ... Myanmar translations
  },
};
```
