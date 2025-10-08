# Design Document

## Overview

This design implements a universal conflict resolution system that replaces the current limited conflict detection with a comprehensive UUID-based approach. The system will detect conflicts for all data types during import and provide a consistent user experience for resolving them.

## Architecture

### Current System Issues

- Conflict detection only works for products and complete backup imports
- Uses name-based matching which is unreliable
- Limited to specific import types
- Inconsistent conflict resolution across different data types

### New System Design

- Universal conflict detection for all data types
- UUID-based primary matching with name-based fallback
- Consistent conflict resolution modal for all import types
- Simplified, maintainable code structure

## Components and Interfaces

### 1. Enhanced Conflict Detection Service

```typescript
interface UniversalConflictDetector {
  detectConflicts(importData: any, dataType: string): Promise<DataConflict[]>;
  detectRecordConflict(
    record: any,
    existingRecords: any[],
    recordType: string
  ): DataConflict | null;
  compareByUUID(record: any, existing: any): boolean;
  compareByName(record: any, existing: any, recordType: string): boolean;
}
```

### 2. Enhanced Conflict Resolution Modal

```typescript
interface EnhancedConflictResolutionModal {
  conflicts: DataConflict[];
  showAllConflicts: boolean;
  onToggleShowAll: () => void;
  onResolve: (resolution: ConflictResolution) => void;
  onCancel: () => void;
}
```

### 3. Updated Data Conflict Interface

```typescript
interface DataConflict {
  type: 'duplicate' | 'reference_missing' | 'validation_failed';
  record: any;
  existingRecord?: any;
  field?: string;
  message: string;
  index: number;
  recordType: string; // New field to identify the data type
  matchedBy: 'uuid' | 'name' | 'other'; // New field to show matching criteria
}
```

## Data Models

### Conflict Detection Flow

1. **Primary UUID Matching**

   - Check if both records have valid UUIDs
   - Compare UUIDs using exact string matching
   - If match found, create conflict with `matchedBy: 'uuid'`

2. **Fallback Name Matching**

   - If UUID matching fails or UUIDs are missing/invalid
   - Use existing name-based matching logic per record type
   - If match found, create conflict with `matchedBy: 'name'`

3. **Record Type Specific Logic**
   ```typescript
   const conflictDetectionMap = {
     products: (record, existing) =>
       record.id === existing.id ||
       record.name === existing.name ||
       (record.barcode && record.barcode === existing.barcode),
     customers: (record, existing) =>
       record.id === existing.id ||
       record.name === existing.name ||
       (record.phone && record.phone === existing.phone),
     sales: (record, existing) => record.id === existing.id,
     expenses: (record, existing) => record.id === existing.id,
     stockMovements: (record, existing) => record.id === existing.id,
     bulkPricing: (record, existing) => record.id === existing.id,
   };
   ```

### Enhanced Conflict Display

```typescript
interface ConflictDisplayData {
  conflictPairs: DataConflict[];
  visibleConflicts: DataConflict[];
  showingAll: boolean;
  totalCount: number;
  previewCount: number; // Default 5
}
```

## Error Handling

### UUID Validation

- Use existing `isValidUUID` utility function
- Handle cases where UUIDs are malformed or missing
- Graceful fallback to name-based matching

### Conflict Detection Errors

- Wrap conflict detection in try-catch blocks
- Log errors but continue with remaining records
- Add validation errors to conflict list for user visibility

### Modal Display Errors

- Handle cases where conflict data is corrupted
- Provide fallback display for malformed conflict records
- Ensure modal can always be dismissed

## Testing Strategy

### Unit Tests

1. **UUID Matching Tests**

   - Test exact UUID matches
   - Test invalid UUID handling
   - Test missing UUID fallback

2. **Name Matching Tests**

   - Test existing name matching logic
   - Test record type specific matching
   - Test edge cases (empty names, special characters)

3. **Conflict Detection Tests**
   - Test each data type individually
   - Test mixed data type imports
   - Test large datasets with many conflicts

### Integration Tests

1. **End-to-End Import Flow**

   - Test complete import with conflicts
   - Test conflict resolution choices
   - Test import completion after resolution

2. **Modal Interaction Tests**
   - Test "See More" functionality
   - Test conflict resolution selection
   - Test modal cancellation

### Performance Tests

1. **Large Dataset Handling**
   - Test conflict detection with 1000+ records
   - Test modal rendering with many conflicts
   - Test memory usage during conflict detection

## Implementation Details

### Phase 1: Enhanced Conflict Detection

1. Update `detectConflicts` method to handle all data types
2. Implement UUID-based matching as primary method
3. Maintain name-based matching as fallback
4. Add `recordType` and `matchedBy` fields to conflicts

### Phase 2: Universal Import Integration

1. Update all import methods to use enhanced conflict detection
2. Remove data type specific conflict handling
3. Ensure consistent conflict resolution flow

### Phase 3: Enhanced Modal UI

1. Add "See More" button functionality
2. Implement expandable conflict list
3. Update conflict display to show UUID information
4. Add matching criteria indicators

### Phase 4: Testing and Validation

1. Comprehensive testing of all data types
2. Performance testing with large datasets
3. User experience validation
4. Edge case handling verification

## Migration Strategy

### Backward Compatibility

- Maintain existing conflict resolution interface
- Ensure existing import files continue to work
- Preserve current conflict resolution options

### Gradual Rollout

1. Implement enhanced detection without changing UI
2. Add new modal features as optional
3. Enable universal detection for all import types
4. Remove old type-specific logic

### Data Integrity

- Ensure UUID-based matching doesn't break existing workflows
- Validate that name-based fallback works correctly
- Test with real user data before full deployment
