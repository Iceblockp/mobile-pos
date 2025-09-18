# Design Document

## Overview

This design addresses two critical issues affecting the inventory system's performance and user experience:

1. Missing translation key causing console spam and potential performance degradation
2. Infinite rendering in PriceInput component causing UI freezing and poor user experience

## Architecture

### Translation System Fix

- **Component**: Localization files (`locales/en.ts`, `locales/my.ts`)
- **Approach**: Add missing `optional` key to common translations section
- **Impact**: Minimal - single key addition to existing translation objects

### PriceInput Component Fix

- **Component**: `components/PriceInput.tsx` and `hooks/useCurrency.ts`
- **Approach**: Break circular dependency in useEffect hooks and optimize re-render triggers
- **Impact**: Moderate - requires careful refactoring of effect dependencies

## Components and Interfaces

### 1. Translation Files Update

**File**: `locales/en.ts`

```typescript
common: {
  // ... existing keys
  optional: 'Optional',
  // ... rest of keys
}
```

**File**: `locales/my.ts`

```typescript
common: {
  // ... existing keys
  optional: 'ရွေးချယ်ခွင့်ရှိသော',
  // ... rest of keys
}
```

### 2. PriceInput Component Refactoring

**Current Issues:**

- Two useEffect hooks create circular dependency
- `inputValue !== value` comparison triggers unnecessary re-renders
- `onChange` function reference changes on every render

**Proposed Solution:**

```typescript
// Remove circular useEffect dependencies
// Use useCallback for stable function references
// Implement proper value synchronization logic
```

### 3. usePriceInput Hook Optimization

**Current Issues:**

- `handleChange` callback recreated on every render due to dependencies
- Effect dependencies include functions that change frequently

**Proposed Solution:**

- Memoize callback functions properly
- Reduce effect dependencies to primitive values only
- Use refs for stable references where needed

## Data Models

No data model changes required - this is purely a UI/performance fix.

## Error Handling

### Translation Fallback

- If translation key is still missing, component should gracefully fall back to English text
- No console warnings should be generated for missing optional keys

### PriceInput Error States

- Maintain existing validation error handling
- Ensure error states don't trigger additional re-renders
- Preserve user input during validation cycles

## Testing Strategy

### Unit Tests

1. **Translation Tests**

   - Verify `common.optional` key exists in both language files
   - Test StockMovementForm renders without console warnings
   - Validate proper translation display in both languages

2. **PriceInput Component Tests**
   - Test component renders without infinite loops
   - Verify typing in input field works smoothly
   - Test external value changes sync properly
   - Validate error states don't cause re-render issues

### Integration Tests

1. **Inventory Page Tests**
   - Test product create modal opens without performance issues
   - Verify price input fields work correctly in product forms
   - Test language switching doesn't break optional field labels

### Performance Tests

1. **Render Count Monitoring**
   - Measure render counts before and after fixes
   - Ensure PriceInput renders only when necessary
   - Verify no console warnings appear during normal usage

## Implementation Approach

### Phase 1: Translation Fix (Low Risk)

1. Add missing `optional` key to both translation files
2. Test StockMovementForm displays correctly
3. Verify no console warnings appear

### Phase 2: PriceInput Optimization (Medium Risk)

1. Analyze current useEffect dependencies
2. Refactor to remove circular dependencies
3. Implement stable callback references
4. Test thoroughly to ensure no regression in functionality

### Phase 3: Validation and Testing

1. Run comprehensive tests on inventory functionality
2. Verify product creation/editing works correctly
3. Test performance improvements
4. Validate translation display in both languages
