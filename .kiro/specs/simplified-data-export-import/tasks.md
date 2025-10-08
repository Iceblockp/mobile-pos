# Implementation Plan

- [x] 1. Remove unused individual data type functionality

  - Remove individual export methods from DataExportService (exportProducts, exportSales, exportCustomers, etc.)
  - Remove individual import methods from DataImportService (importProducts, importSales, importCustomers, etc.)
  - Clean up type definitions to remove individual data type options
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 2. Simplify export service for "all data" only

  - Modify DataExportService to keep only exportCompleteBackup method
  - Rename exportCompleteBackup to exportAllData for clarity
  - Remove complex data type filtering logic that's no longer needed
  - Simplify progress tracking to focus on overall export progress
  - _Requirements: 1.1, 1.2, 5.4_

- [x] 3. Implement enhanced export preview functionality

  - Create generateExportPreview method in DataExportService
  - Implement data counting logic for all data types (products, sales, customers, etc.)
  - Add file size estimation based on data counts
  - Create ExportPreview interface with detailed count information
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 4. Simplify import service for "all data" only

  - Modify DataImportService to keep only importCompleteBackup method
  - Rename importCompleteBackup to importAllData for clarity
  - Remove individual data type validation logic
  - Simplify import options to focus on conflict resolution only
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 5. Enhance conflict detection and resolution

  - Modify detectConflicts method to return conflicts grouped by data type
  - Create ConflictSummary interface for better conflict organization
  - Implement enhanced conflict display with data type grouping
  - Add conflict statistics (total conflicts, conflicts per data type)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6. Update export UI to show only "Export All Data" option

  - Remove individual export options from app/data-export.tsx
  - Keep only the "Complete Backup" option and rename it to "Export All Data"
  - Update export option handling to use simplified service
  - Remove unused export option configurations
  - _Requirements: 1.1, 1.2, 6.1, 6.2_

- [x] 7. Implement export preview modal component

  - Create ExportPreviewModal component to show data counts before export
  - Display count for each data type (products, sales, customers, etc.)
  - Show estimated file size and export date
  - Add confirm/cancel actions for export process
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.3_

- [x] 8. Update import UI to show only "Import All Data" option

  - Remove individual import options from app/data-import.tsx
  - Keep only the "Complete Restore" option and rename it to "Import All Data"
  - Update import option handling to use simplified service
  - Remove unused import option configurations
  - _Requirements: 3.1, 3.2, 6.1, 6.2_

- [ ] 9. Enhance conflict resolution modal component

  - Update ConflictResolutionModal to display conflicts grouped by data type
  - Show conflict statistics (total conflicts, conflicts per type)
  - Implement side-by-side comparison of existing vs import data
  - Add clear action buttons for "Keep Existing", "Use Import Data", "Skip"
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.3, 6.4_

- [ ] 10. Remove unused test files and update existing tests

  - Delete test files for individual export functionality (**tests**/unit/selectiveExportFunctionality.test.ts)
  - Delete test files for individual import functionality (**tests**/unit/selectiveImportFunctionality.test.ts)
  - Update remaining export/import tests to focus on "all data" functionality
  - Remove UI improvement tests that are no longer relevant (**tests**/unit/uiImprovements.test.ts)
  - _Requirements: 5.2, 5.3_

- [ ] 11. Create comprehensive tests for simplified functionality

  - Write unit tests for enhanced export preview functionality
  - Write unit tests for enhanced conflict detection and resolution
  - Write integration tests for complete export-import flow
  - Write UI tests for simplified export/import screens
  - _Requirements: 5.4_

- [ ] 12. Update service method signatures and interfaces

  - Update ExportResult interface to include detailed data counts
  - Update ImportResult interface to include detailed processing counts
  - Modify progress tracking interfaces to be more specific
  - Clean up unused interface definitions
  - _Requirements: 5.1, 5.4_

- [ ] 13. Implement enhanced error handling and user feedback

  - Add specific error messages for empty data scenarios
  - Implement clear success messages with detailed counts
  - Add progress indicators with better user feedback
  - Handle edge cases gracefully (corrupted files, network issues)
  - _Requirements: 6.4, 6.5_

- [ ] 14. Clean up unused code and dependencies

  - Remove unused imports and type definitions
  - Clean up complex data type switching logic
  - Remove unused utility functions related to selective operations
  - Optimize remaining code for better performance
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 15. Update localization strings
  - Remove translation keys for individual data type options
  - Add new translation keys for "Export All Data" and "Import All Data"
  - Update existing translation keys to reflect simplified functionality
  - Add translation keys for enhanced preview and conflict resolution
  - _Requirements: 6.1, 6.2, 6.3_
