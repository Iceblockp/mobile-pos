# Design Document

## Overview

This design simplifies the current data export/import system by removing individual data type selections and focusing exclusively on "all data" operations. The system will provide a streamlined user experience with comprehensive data previews for exports and detailed conflict resolution for imports, while eliminating complex code paths and unused functionality.

## Architecture

### Current System Analysis

The existing system supports multiple data types:

- Individual types: `sales`, `products`, `expenses`, `shopSettings`, `customers`, `stockMovements`, `bulkPricing`
- Complete backup: `all`

The current architecture includes:

- `DataExportService` with methods for each data type
- `DataImportService` with corresponding import methods
- Complex UI with multiple export/import options
- Extensive validation and conflict detection logic

### Simplified Architecture

The new system will:

1. Remove all individual data type export/import options
2. Keep only "Export All Data" and "Import All Data" functionality
3. Simplify service methods by removing type-specific logic
4. Enhance preview and conflict resolution UX
5. Clean up unused code paths and tests

## Components and Interfaces

### 1. Simplified Export Service

```typescript
export class SimplifiedDataExportService {
  // Remove individual export methods, keep only:
  async exportAllData(): Promise<ExportResult>;

  // Enhanced preview functionality
  async generateExportPreview(): Promise<ExportPreview>;

  // Simplified progress tracking
  onProgress(callback: (progress: ExportProgress) => void): void;
}

export interface ExportPreview {
  totalRecords: number;
  dataCounts: {
    products: number;
    sales: number;
    customers: number;
    expenses: number;
    stockMovements: number;
    bulkPricing: number;
    shopSettings: number;
  };
  estimatedFileSize: string;
  exportDate: string;
}
```

### 2. Simplified Import Service

```typescript
export class SimplifiedDataImportService {
  // Remove individual import methods, keep only:
  async importAllData(
    fileUri: string,
    options: ImportOptions
  ): Promise<ImportResult>;

  // Enhanced conflict detection
  async detectAllConflicts(fileUri: string): Promise<ConflictSummary>;

  // Simplified validation
  async validateImportFile(fileUri: string): Promise<ValidationResult>;
}

export interface ConflictSummary {
  totalConflicts: number;
  conflictsByType: {
    [dataType: string]: DataConflict[];
  };
  hasConflicts: boolean;
}
```

### 3. Enhanced UI Components

#### Export Preview Modal

```typescript
interface ExportPreviewModalProps {
  visible: boolean;
  preview: ExportPreview;
  onConfirm: () => void;
  onCancel: () => void;
}
```

#### Import Conflict Resolution Modal

```typescript
interface ImportConflictModalProps {
  visible: boolean;
  conflicts: ConflictSummary;
  onResolve: (resolution: ConflictResolution) => void;
  onCancel: () => void;
}
```

## Data Models

### Export Data Structure (Unchanged)

```typescript
export interface ExportData {
  version: string;
  exportDate: string;
  dataType: 'all'; // Always 'all' now
  metadata: ExportMetadata;
  data: {
    products: any[];
    categories: any[];
    suppliers: any[];
    sales: any[];
    saleItems: any[];
    customers: any[];
    expenses: any[];
    expenseCategories: any[];
    stockMovements: any[];
    bulkPricing: any[];
    shopSettings: any;
  };
  relationships: RelationshipMappings;
  integrity: IntegrityData;
}
```

### Simplified Export Result

```typescript
export interface ExportResult {
  success: boolean;
  fileUri?: string;
  filename?: string;
  totalRecords: number;
  dataCounts: Record<string, number>;
  error?: string;
  metadata: ExportMetadata;
}
```

### Enhanced Import Result

```typescript
export interface ImportResult {
  success: boolean;
  totalImported: number;
  totalUpdated: number;
  totalSkipped: number;
  detailedCounts: {
    [dataType: string]: {
      imported: number;
      updated: number;
      skipped: number;
    };
  };
  conflicts: DataConflict[];
  errors: ImportError[];
  duration: number;
}
```

## Error Handling

### Export Error Handling

1. **Empty Data Handling**: Show clear message when no data exists
2. **File Generation Errors**: Provide specific error messages for file system issues
3. **Progress Tracking**: Ensure progress updates even during errors

### Import Error Handling

1. **File Validation**: Enhanced validation with specific error messages
2. **Conflict Resolution**: Clear presentation of all conflicts with resolution options
3. **Partial Import Recovery**: Handle partial imports gracefully

## Testing Strategy

### Unit Tests to Remove

- Individual data type export tests
- Individual data type import tests
- Selective export functionality tests
- Selective import functionality tests

### Unit Tests to Keep/Modify

- All data export tests (modify existing `exportCompleteBackup` tests)
- All data import tests (modify existing `importCompleteBackup` tests)
- Validation service tests
- Error handling tests
- Conflict detection tests

### New Tests to Add

```typescript
// Export preview tests
describe('ExportPreview', () => {
  test('should generate accurate data counts');
  test('should estimate file size correctly');
  test('should handle empty data gracefully');
});

// Enhanced conflict resolution tests
describe('ConflictResolution', () => {
  test('should detect all conflict types');
  test('should group conflicts by data type');
  test('should provide clear conflict descriptions');
});

// Simplified UI tests
describe('SimplifiedUI', () => {
  test('should show only export all option');
  test('should show only import all option');
  test('should display export preview correctly');
  test('should handle conflict resolution flow');
});
```

### Integration Tests

- End-to-end export all data flow
- End-to-end import all data flow with conflicts
- Export-import roundtrip testing
- Performance testing with large datasets

## Implementation Plan

### Phase 1: Service Layer Simplification

1. Create new simplified service classes
2. Implement "all data" export with enhanced preview
3. Implement "all data" import with enhanced conflict detection
4. Add comprehensive error handling

### Phase 2: UI Simplification

1. Remove individual data type options from export screen
2. Remove individual data type options from import screen
3. Add export preview modal
4. Enhance conflict resolution modal
5. Update progress indicators

### Phase 3: Code Cleanup

1. Remove unused individual export/import methods
2. Remove related test files
3. Clean up type definitions
4. Update documentation

### Phase 4: Testing and Validation

1. Run comprehensive test suite
2. Perform manual testing of all flows
3. Test with various data sizes
4. Validate error handling scenarios

## Migration Strategy

### Backward Compatibility

- Existing export files remain compatible
- Import functionality handles both old and new export formats
- No breaking changes to data structures

### Gradual Rollout

1. Deploy new services alongside existing ones
2. Update UI to use new services
3. Remove old services after validation
4. Clean up unused code

## Performance Considerations

### Export Performance

- Single database query for all data types
- Streaming file generation for large datasets
- Progress tracking with accurate estimates

### Import Performance

- Batch processing for large imports
- Efficient conflict detection algorithms
- Memory-optimized data processing

### UI Performance

- Lazy loading of conflict details
- Virtualized lists for large conflict sets
- Optimized preview generation
