# Implementation Plan

- [x] 1. Implement Universal Conflict Detection System

  - Create single conflict detection method that works for all data types
  - Replace existing scattered conflict detection logic with unified approach
  - Use UUID matching as primary method and name matching as fallback
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 2. Fix Product Relationship Resolution

  - Implement proper category_id and supplier_id handling in product imports
  - Add fallback logic to resolve relationships by name when UUID is invalid
  - Ensure products maintain their category and supplier relationships during import
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 3. Fix Supplier Duplication Issue

  - Update supplier conflict detection to properly match by UUID and name
  - Ensure existing suppliers are updated instead of creating duplicates
  - Implement proper conflict resolution for supplier records
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 4. Simplify Record Processing Logic

  - Consolidate insert/update logic into single method for all data types
  - Implement consistent error handling and validation across all record types
  - Clean up code structure for better maintainability
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5. Add Comprehensive Test Coverage

  - Write unit tests for universal conflict detection
  - Write integration tests for relationship resolution
  - Write end-to-end tests for complete import scenarios
  - Test multiple import cycles to ensure no duplication occurs
  - _Requirements: All requirements validation_

- [x] 6. Update Import UI and Error Handling
  - Ensure conflict resolution modal uses new unified conflict detection
  - Update error messages to be more descriptive and actionable
  - Verify import progress reporting works correctly with new logic
  - _Requirements: 4.3, 4.4_
