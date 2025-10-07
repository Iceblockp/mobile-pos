# Design Document

## Overview

The selective data export/import feature will modify the existing `DataExportService` and `DataImportService` to properly handle data type filtering. The current implementation has the logic for different data types but doesn't properly filter the data being processed. This design focuses on clean, simple modifications to ensure each export/import operation only handles the selected data type.

## Architecture

The solution will maintain the existing service architecture but add proper data filtering logic:

```
UI Layer (data-export.tsx, data-import.tsx)
    ↓
Service Layer (DataExportService, DataImportService)
    ↓ (with enhanced filtering)
Database Layer (DatabaseService)
```

## Components and Interfaces

### 1. Enhanced Export Data Structure

The export data structure will be modified to only include relevant sections based on the selected data type:

```typescript
interface SelectiveExportData extends ExportData {
  // Only populate relevant data sections based on dataType
  data: {
    products?: any[]; // Only for 'products' and 'all'
    categories?: any[]; // Only for 'products' and 'all'
    suppliers?: any[]; // Only for 'products' and 'all'
    sales?: any[]; // Only for 'sales' and 'all'
    saleItems?: any[]; // Only for 'sales' and 'all'
    customers?: any[]; // Only for 'customers' and 'all'
    expenses?: any[]; // Only for 'expenses' and 'all'
    expenseCategories?: any[]; // Only for 'expenses' and 'all'
    stockMovements?: any[]; // Only for 'stockMovements' and 'all'
    bulkPricing?: any[]; // Only for 'bulkPricing' and 'all'
  };
}
```

### 2. Data Type Filtering Logic

Each export method will be enhanced with proper filtering:

```typescript
class DataExportService {
  private filterDataByType(allData: any, dataType: string): any {
    const filteredData: any = {};

    switch (dataType) {
      case 'products':
        filteredData.products = allData.products;
        filteredData.categories = allData.categories;
        filteredData.suppliers = allData.suppliers;
        filteredData.bulkPricing = allData.bulkPricing;
        break;
      case 'sales':
        filteredData.sales = allData.sales;
        filteredData.saleItems = allData.saleItems;
        break;
      case 'customers':
        filteredData.customers = allData.customers;
        break;
      case 'expenses':
        filteredData.expenses = allData.expenses;
        filteredData.expenseCategories = allData.expenseCategories;
        break;
      case 'stockMovements':
        filteredData.stockMovements = allData.stockMovements;
        break;
      case 'bulkPricing':
        filteredData.bulkPricing = allData.bulkPricing;
        break;
      case 'all':
        return allData; // Return everything for complete backup
      default:
        throw new Error(`Unsupported data type: ${dataType}`);
    }

    return filteredData;
  }
}
```

### 3. Import Data Validation

The import service will validate that the selected import type matches available data:

```typescript
class DataImportService {
  private validateDataTypeAvailability(
    importData: any,
    selectedType: string
  ): boolean {
    const dataTypeMap = {
      sales: ['sales'],
      products: ['products'],
      customers: ['customers'],
      expenses: ['expenses'],
      stockMovements: ['stockMovements'],
      bulkPricing: ['bulkPricing'],
      all: [
        'products',
        'sales',
        'customers',
        'expenses',
        'stockMovements',
        'bulkPricing',
      ],
    };

    const requiredFields = dataTypeMap[selectedType] || [];
    return requiredFields.some(
      (field) =>
        importData.data[field] &&
        Array.isArray(importData.data[field]) &&
        importData.data[field].length > 0
    );
  }
}
```

## Data Models

### Export Result Enhancement

```typescript
interface EnhancedExportResult extends ExportResult {
  dataType: string; // The specific data type that was exported
  actualRecordCount: number; // Actual records in the selected data type
  emptyExport: boolean; // True if no records were found for the data type
}
```

### Import Result Enhancement

```typescript
interface EnhancedImportResult extends ImportResult {
  dataType: string; // The specific data type that was imported
  availableDataTypes: string[]; // Data types available in the import file
  processedDataTypes: string[]; // Data types actually processed
}
```

## Error Handling

### Export Error Scenarios

1. **Empty Data Type**: When selected data type has no records

   - Create empty export file with proper structure
   - Show user notification about empty export

2. **Invalid Data Type**: When an unsupported data type is selected
   - Return error with clear message
   - Prevent file creation

### Import Error Scenarios

1. **Missing Data Type**: When import file doesn't contain selected data type

   - Show clear error message listing available data types
   - Prevent import operation

2. **Corrupted Data**: When selected data type exists but is malformed
   - Show validation errors
   - Allow user to try different data type

## Testing Strategy

### Unit Tests

1. **Export Filtering Tests**

   - Test each data type exports only relevant data
   - Test complete backup exports all data
   - Test empty data type handling

2. **Import Filtering Tests**
   - Test each data type imports only relevant data
   - Test data type validation
   - Test missing data type handling

### Integration Tests

1. **End-to-End Export/Import Tests**

   - Export specific data type, then import it back
   - Verify data integrity and completeness
   - Test with various data combinations

2. **UI Integration Tests**
   - Test user selection flows
   - Test progress reporting accuracy
   - Test error message display

### Performance Tests

1. **Large Dataset Tests**
   - Test export/import with large datasets
   - Verify memory usage stays reasonable
   - Test progress reporting accuracy

## Implementation Approach

### Phase 1: Export Service Enhancement

1. Modify existing export methods to filter data properly
2. Update progress reporting to reflect actual data being processed
3. Enhance error handling for empty data types

### Phase 2: Import Service Enhancement

1. Add data type validation before import
2. Modify import methods to process only selected data type
3. Update conflict detection to work with filtered data

### Phase 3: UI Updates

1. Update progress messages to be more specific
2. Enhance error messages with actionable information
3. Add data type validation feedback

### Phase 4: Testing and Validation

1. Comprehensive testing of all data type combinations
2. Performance testing with large datasets
3. User acceptance testing for workflow improvements
