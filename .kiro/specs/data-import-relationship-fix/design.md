# Design Document

## Overview

This design addresses the critical issues in the data import system by implementing a unified conflict detection mechanism, fixing product relationship handling, and ensuring consistent behavior across all data types. The solution focuses on simplicity, reliability, and maintainability.

## Architecture

### Core Components

1. **Universal Conflict Detector**: Single method that handles conflict detection for all data types
2. **Relationship Resolver**: Handles category and supplier relationship resolution for products
3. **Record Processor**: Simplified record processing with consistent update/insert logic
4. **Validation Engine**: Streamlined validation with clear error reporting

### Data Flow

```
Import File → Validation → Conflict Detection → Relationship Resolution → Record Processing → Result
```

## Components and Interfaces

### 1. Universal Conflict Detection

```typescript
interface ConflictDetectionResult {
  hasConflict: boolean;
  existingRecord?: any;
  matchedBy: 'uuid' | 'name' | 'none';
  conflictType: 'duplicate' | 'none';
}

class UniversalConflictDetector {
  detectConflict(
    record: any,
    existingRecords: any[],
    dataType: string
  ): ConflictDetectionResult;
}
```

**Design Decisions:**

- Single method handles all data types using a strategy pattern
- UUID matching takes priority over name matching
- Clear indication of how the match was found
- Consistent behavior across all data types

### 2. Relationship Resolution

```typescript
interface RelationshipResolver {
  resolveCategoryId(
    categoryId?: string,
    categoryName?: string
  ): Promise<string | null>;
  resolveSupplierId(
    supplierId?: string,
    supplierName?: string
  ): Promise<string | null>;
}
```

**Design Decisions:**

- Prioritize UUID-based relationships over name-based
- Create missing categories/suppliers only when names are provided
- Return null for supplier when no valid reference exists
- Use default category when no category reference exists

### 3. Simplified Record Processing

```typescript
interface RecordProcessor {
  processRecord(
    dataType: string,
    record: any,
    conflictResolution: ConflictResolution
  ): Promise<ProcessResult>;
}

interface ProcessResult {
  action: 'inserted' | 'updated' | 'skipped';
  recordId: string;
  error?: string;
}
```

**Design Decisions:**

- Single method handles insert/update logic for all data types
- Clear action reporting for each record
- Consistent error handling and reporting

## Data Models

### Enhanced Import Record Structure

```typescript
interface ImportRecord {
  id?: string; // UUID for conflict detection
  name?: string; // Name for fallback matching
  [key: string]: any; // Other record-specific fields
}

interface ProductImportRecord extends ImportRecord {
  category_id?: string; // Primary category reference
  category?: string; // Fallback category name
  supplier_id?: string; // Primary supplier reference
  supplier?: string; // Fallback supplier name
}
```

### Conflict Detection Strategy

```typescript
interface ConflictStrategy {
  primaryMatch: (record: any, existing: any) => boolean; // UUID matching
  fallbackMatch: (record: any, existing: any) => boolean; // Name matching
  supportsNameMatch: boolean; // Whether fallback is supported
}
```

## Error Handling

### Validation Errors

- Missing required fields
- Invalid data types
- Malformed UUIDs
- Circular references

### Relationship Errors

- Invalid category/supplier references
- Missing relationship data
- Orphaned records

### Conflict Resolution Errors

- Ambiguous matches
- Update failures
- Permission issues

## Testing Strategy

### Unit Tests

1. **Universal Conflict Detection**

   - Test UUID matching for all data types
   - Test name fallback matching
   - Test edge cases (null values, invalid UUIDs)

2. **Relationship Resolution**

   - Test category ID resolution with valid/invalid UUIDs
   - Test supplier ID resolution with valid/invalid UUIDs
   - Test fallback to name-based matching
   - Test creation of missing categories/suppliers

3. **Record Processing**
   - Test insert operations for all data types
   - Test update operations with conflict resolution
   - Test skip operations
   - Test error handling

### Integration Tests

1. **End-to-End Import**

   - Import complete dataset with relationships
   - Verify relationship integrity after import
   - Test multiple import cycles (no duplication)

2. **Conflict Resolution**
   - Test update mode with existing data
   - Test skip mode with conflicts
   - Test mixed conflict scenarios

### Performance Tests

1. **Large Dataset Import**
   - Test with 1000+ records per data type
   - Measure import speed and memory usage
   - Verify relationship resolution performance

## Implementation Plan

### Phase 1: Universal Conflict Detection

- Implement single conflict detection method
- Replace existing conflict detection logic
- Add comprehensive test coverage

### Phase 2: Relationship Resolution

- Implement category/supplier resolution logic
- Fix product import relationship handling
- Add validation for relationship integrity

### Phase 3: Record Processing Simplification

- Consolidate insert/update logic
- Implement consistent error handling
- Streamline validation processes

### Phase 4: Testing and Validation

- Comprehensive test suite implementation
- Performance optimization
- Documentation updates

## Security Considerations

- Validate all input data before processing
- Sanitize relationship references
- Prevent SQL injection through parameterized queries
- Validate UUID format before database operations

## Performance Considerations

- Batch processing for large datasets
- Efficient conflict detection using indexed lookups
- Minimal database queries for relationship resolution
- Progress reporting for long-running imports
