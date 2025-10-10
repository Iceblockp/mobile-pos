# Design Document

## Overview

The AI Analytics Modernization updates the existing AI analytics service to use the modern `@google/genai` library, replacing the current manual fetch-based implementation. This modernization maintains all existing functionality while providing cleaner, more maintainable code that follows current Google AI SDK best practices.

## Architecture

### Current vs. Modernized Architecture

**Current Implementation:**

```
AIAnalyticsService → Manual Fetch → Gemini REST API
     ↓
Custom Error Handling → Manual Response Parsing
```

**Modernized Implementation:**

```
AIAnalyticsService → @google/genai Library → Gemini API
     ↓
Library Error Handling → Native Response Objects
```

### Key Changes

1. **Dependency Addition:** Add `@google/genai` package
2. **Service Modernization:** Replace manual HTTP calls with library methods
3. **Error Handling:** Leverage library's built-in error management
4. **Configuration Simplification:** Remove manual endpoint management

## Components and Interfaces

### 1. Updated AIAnalyticsService

**Location:** `services/aiAnalyticsService.ts`

**Key Changes:**

```typescript
// Before (manual fetch)
const response = await fetch(`${DEFAULT_AI_CONFIG.endpoint}?key=${apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(requestBody),
  signal: controller.signal,
});

// After (@google/genai)
import { GoogleGenerativeAI } from '@google/genai';

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
const result = await model.generateContent(prompt);
```

**New Service Structure:**

```typescript
export class AIAnalyticsService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;

  private initializeAI(apiKey: string): void {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });
  }

  async sendQuestion(question: string): Promise<string> {
    // Simplified implementation using library
  }
}
```

### 2. Updated Configuration

**Location:** `utils/aiAnalyticsConfig.ts`

**Simplified Configuration:**

```typescript
// Remove deprecated endpoint configurations
export const AI_CONFIG = {
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 1000,
    topP: 0.8,
    topK: 40,
  },
};

// Remove manual endpoint management
// export const DEFAULT_AI_CONFIG: Omit<AIConfig, 'apiKey'> = {
//   provider: 'gemini',
//   endpoint: 'https://generativelanguage.googleapis.com/...',
//   model: 'gemini-pro',
// };
```

### 3. Updated Type Definitions

**Location:** `types/aiAnalytics.ts`

**Modernized Types:**

```typescript
// Remove manual response types
// export interface GeminiResponse {
//   candidates: [{ content: { parts: [{ text: string }] } }];
// }

// Add library-compatible types
export interface AIGenerationConfig {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}

export interface AIModelConfig {
  model: string;
  generationConfig?: AIGenerationConfig;
}
```

## Data Models

### Request/Response Flow

**Current Flow:**

```typescript
// Manual request construction
const requestBody = {
  contents: [{ parts: [{ text: prompt }] }],
  generationConfig: { ... }
};

// Manual response parsing
const data: GeminiResponse = await response.json();
const aiResponse = data.candidates[0].content.parts[0].text;
```

**Modernized Flow:**

```typescript
// Library handles request/response
const result = await model.generateContent(prompt);
const aiResponse = result.response.text();
```

### Error Handling Models

**Library Error Types:**

```typescript
// Use library's native error types instead of custom ones
import { GoogleGenerativeAIError } from '@google/genai';

// Simplified error categorization
const categorizeLibraryError = (error: unknown): AIAnalyticsError => {
  if (error instanceof GoogleGenerativeAIError) {
    // Handle library-specific errors
    return mapLibraryErrorToAppError(error);
  }
  return 'UNKNOWN_ERROR';
};
```

## Implementation Strategy

### Phase 1: Dependency and Basic Setup

1. **Add Package Dependency**

   ```bash
   npm install @google/genai
   ```

2. **Update Package.json**
   ```json
   {
     "dependencies": {
       "@google/genai": "^0.21.0"
     }
   }
   ```

### Phase 2: Service Modernization

1. **Replace Manual HTTP Calls**

   - Remove fetch-based implementation
   - Add GoogleGenerativeAI initialization
   - Implement library-based request handling

2. **Simplify Request Formatting**

   - Remove manual JSON construction
   - Use library's native prompt handling
   - Leverage built-in generation config

3. **Update Response Processing**
   - Remove manual JSON parsing
   - Use library's response objects
   - Simplify text extraction

### Phase 3: Error Handling Update

1. **Library Error Integration**

   - Map library errors to existing error types
   - Maintain existing error messages for users
   - Leverage library's built-in retry mechanisms

2. **Timeout Handling**
   - Use library's timeout options if available
   - Implement compatible timeout logic
   - Maintain existing timeout behavior

### Phase 4: Configuration Cleanup

1. **Remove Deprecated Config**

   - Remove manual endpoint URLs
   - Simplify configuration objects
   - Update validation logic

2. **Maintain Backward Compatibility**
   - Keep existing AsyncStorage keys
   - Preserve API key validation
   - Maintain user-facing behavior

## Error Handling

### Library Error Mapping

```typescript
const mapLibraryErrorToAppError = (
  error: GoogleGenerativeAIError
): AIAnalyticsError => {
  switch (error.message) {
    case 'API_KEY_INVALID':
      return 'INVALID_API_KEY';
    case 'QUOTA_EXCEEDED':
      return 'NETWORK_ERROR'; // Map to existing error type
    case 'MODEL_NOT_FOUND':
      return 'UNKNOWN_ERROR';
    default:
      return 'UNKNOWN_ERROR';
  }
};
```

### Retry Logic Integration

```typescript
// Leverage library's built-in mechanisms where possible
const generateWithRetry = async (
  prompt: string,
  retries = 3
): Promise<string> => {
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    if (retries > 0 && isRetryableError(error)) {
      await delay(RETRY_DELAY);
      return generateWithRetry(prompt, retries - 1);
    }
    throw error;
  }
};
```

## Testing Strategy

### Unit Tests Updates

1. **Mock Library Dependencies**

   ```typescript
   jest.mock('@google/genai', () => ({
     GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
       getGenerativeModel: jest.fn().mockReturnValue({
         generateContent: jest.fn(),
       }),
     })),
   }));
   ```

2. **Test Library Integration**
   - Verify proper library initialization
   - Test request/response handling
   - Validate error mapping

### Integration Tests

1. **Service Integration**

   - Test with mocked library responses
   - Verify data flow compatibility
   - Validate existing component integration

2. **Error Scenario Testing**
   - Test library error handling
   - Verify error message consistency
   - Validate retry behavior

### E2E Tests

1. **User Workflow Validation**

   - Complete question/answer flow
   - API key configuration
   - Error recovery scenarios

2. **Performance Testing**
   - Response time comparison
   - Memory usage validation
   - Library overhead assessment

## Migration Plan

### Step 1: Preparation

- Install `@google/genai` dependency
- Update type definitions
- Prepare test mocks

### Step 2: Service Update

- Replace AIAnalyticsService implementation
- Update error handling
- Maintain existing interfaces

### Step 3: Configuration Cleanup

- Remove deprecated config options
- Simplify configuration objects
- Update validation logic

### Step 4: Testing and Validation

- Run comprehensive test suite
- Validate user workflows
- Performance testing

### Step 5: Deployment

- Deploy modernized implementation
- Monitor for issues
- Rollback plan if needed

## Performance Considerations

### Library Overhead

- **Bundle Size:** Monitor impact of adding `@google/genai`
- **Memory Usage:** Library may have different memory patterns
- **Initialization:** Library initialization overhead

### Optimization Opportunities

- **Request Efficiency:** Library may provide better request optimization
- **Error Handling:** More efficient error processing
- **Response Parsing:** Native parsing may be faster

### Monitoring Points

- **Response Times:** Compare before/after performance
- **Error Rates:** Monitor error frequency changes
- **Memory Usage:** Track memory consumption patterns

## Security Considerations

### API Key Handling

- **Library Security:** Leverage library's built-in security features
- **Storage:** Maintain existing secure AsyncStorage approach
- **Transmission:** Library handles secure transmission

### Data Privacy

- **Request Data:** Same data privacy as current implementation
- **Library Logging:** Ensure library doesn't log sensitive data
- **Error Information:** Verify error messages don't leak sensitive data

## Backward Compatibility

### User Experience

- **Identical UI:** No changes to user interface
- **Same Functionality:** All features work identically
- **Error Messages:** Maintain existing error message text

### Data Compatibility

- **Storage Format:** No changes to AsyncStorage structure
- **Message Format:** Same chat message structure
- **Export Format:** Identical data export format

### API Compatibility

- **Internal APIs:** Maintain existing service interfaces
- **Component Integration:** No changes to component contracts
- **Hook Compatibility:** Existing hooks continue to work

## Future Extensibility

### Library Updates

- **Version Management:** Plan for library version updates
- **Feature Adoption:** Leverage new library features as they become available
- **Deprecation Handling:** Handle library deprecations gracefully

### Model Support

- **New Models:** Easy addition of new Gemini models
- **Configuration:** Flexible model configuration
- **Feature Flags:** Support for experimental features

### Provider Extensibility

- **Multi-Provider:** Foundation for supporting other AI providers
- **Abstraction Layer:** Service abstraction for provider switching
- **Configuration:** Provider-agnostic configuration structure
