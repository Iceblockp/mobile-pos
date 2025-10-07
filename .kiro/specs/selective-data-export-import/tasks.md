# Implementation Plan

- [x] 1. Enhance DataExportService with proper data filtering

  - Modify each export method to only fetch and include data relevant to the selected type
  - Add data filtering logic to ensure exports contain only the selected data type
  - Update progress reporting to reflect actual data being processed
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 3.1, 3.4_

- [x] 2. Fix individual export methods to be truly selective

  - Update exportSales() to only export sales and sale items data
  - Update exportProducts() to only export products, categories, suppliers, and bulk pricing
  - Update exportCustomers() to only export customer data
  - Update exportExpenses() to only export expenses and expense categories
  - Update exportStockMovements() to only export stock movements
  - Update exportBulkPricing() to only export bulk pricing data
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 3. Enhance DataImportService with data type validation

  - Add validation to check if import file contains the selected data type
  - Modify import methods to only process the selected data type from the file
  - Add clear error messages when selected data type is not available in import file
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.3_

- [x] 4. Update import methods to be truly selective

  - Modify importSales() to only process sales data from the import file
  - Modify importProducts() to only process products-related data from the import file
  - Modify importCustomers() to only process customer data from the import file
  - Modify importExpenses() to only process expenses data from the import file
  - Modify importStockMovements() to only process stock movements from the import file
  - Modify importBulkPricing() to only process bulk pricing data from the import file
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 5. Improve export result feedback and validation

  - Update export methods to return accurate record counts for the selected data type
  - Add handling for empty data type exports with proper user notification
  - Ensure export file structure is consistent with proper dataType field
  - _Requirements: 3.1, 3.4, 4.1, 4.2, 4.3_

- [x] 6. Improve import result feedback and validation

  - Update import methods to return accurate counts for only the processed data type
  - Add validation to ensure import file dataType matches selected import option
  - Provide clear feedback about what data types are available in import file
  - _Requirements: 3.2, 3.3, 4.4_

- [x] 7. Update UI components for better user feedback

  - Modify data-export.tsx to show more specific progress messages
  - Modify data-import.tsx to show better error messages for missing data types
  - Update success messages to reflect actual data processed
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 8. Add comprehensive error handling for edge cases

  - Handle cases where selected data type has no records during export
  - Handle cases where import file doesn't contain selected data type
  - Add validation for corrupted or malformed data in selected sections
  - _Requirements: 3.3, 3.4_

- [x] 9. Create unit tests for selective export functionality

  - Write tests to verify each export method only exports relevant data
  - Write tests to verify empty data type handling
  - Write tests to verify export file structure consistency
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 4.1, 4.2, 4.3_

- [x] 10. Create unit tests for selective import functionality
  - Write tests to verify each import method only processes relevant data
  - Write tests to verify data type validation works correctly
  - Write tests to verify error handling for missing data types
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.3, 4.4_
