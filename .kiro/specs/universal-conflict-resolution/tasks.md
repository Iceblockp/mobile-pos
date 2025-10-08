# Implementation Plan

- [x] 1. Update DataConflict interface to include recordType and matchedBy fields

  - Modify the DataConflict interface in dataImportService.ts to add recordType and matchedBy fields
  - Update all existing conflict creation code to populate these new fields
  - _Requirements: 2.1, 2.2, 3.3_

- [x] 2. Implement UUID-based conflict detection method

  - Create compareByUUID method that checks for valid UUIDs and performs exact matching
  - Use isValidUUID utility function for UUID validation
  - Return boolean indicating if UUIDs match
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 3. Implement enhanced name-based fallback detection method

  - Create compareByName method that handles record type specific name matching
  - Implement record type mapping for different matching criteria (name, phone, barcode)
  - Ensure backward compatibility with existing name matching logic
  - _Requirements: 2.3, 4.2_

- [x] 4. Create universal conflict detection method

  - Implement detectRecordConflict method that tries UUID matching first, then name matching
  - Add recordType parameter to identify the type of record being checked
  - Set matchedBy field based on which matching method succeeded
  - _Requirements: 2.1, 2.2, 2.3, 4.2_

- [x] 5. Update detectConflicts method to handle all data types

  - Modify detectConflicts to check all data types in import file (sales, expenses, stockMovements, bulkPricing)
  - Remove data type restrictions that only checked products and customers
  - Use the new universal conflict detection method for all record types
  - _Requirements: 1.1, 4.1, 5.1_

- [x] 6. Enhance ConflictResolutionModal to show UUID information

  - Update conflict display to show UUID for both existing and imported records
  - Add visual indicator for matching criteria (UUID vs name)
  - Show "No UUID" message when records don't have UUIDs
  - _Requirements: 3.1, 3.2, 3.4_

- [x] 7. Implement "See More" functionality in ConflictResolutionModal

  - Add showAllConflicts state to control conflict list display
  - Implement "See More" button that appears when conflicts > 5
  - Create expandable conflict list that shows all conflicts when expanded
  - _Requirements: 3.5, 3.6_

- [x] 8. Update import methods to use universal conflict detection

  - Remove data type specific conflict handling from importSales, importExpenses, importStockMovements, importBulkPricing
  - Ensure all import methods use the enhanced detectConflicts method
  - Maintain consistent conflict resolution flow across all import types
  - _Requirements: 1.1, 1.2, 4.3, 5.2_

- [x] 9. Write unit tests for UUID-based conflict detection

  - Test compareByUUID method with valid matching UUIDs
  - Test compareByUUID method with invalid/missing UUIDs
  - Test fallback to name-based matching when UUID matching fails
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 10. Write unit tests for universal conflict detection

  - Test detectRecordConflict method with different record types
  - Test conflict detection with mixed UUID and name matching scenarios
  - Test that recordType and matchedBy fields are correctly set
  - _Requirements: 4.1, 4.2_

- [ ] 11. Write integration tests for enhanced conflict resolution modal

  - Test "See More" button functionality with large conflict lists
  - Test conflict display with UUID information
  - Test modal behavior with different conflict types and matching criteria
  - _Requirements: 3.5, 3.6, 3.1, 3.2_

- [ ] 12. Write end-to-end tests for universal conflict handling
  - Test complete import flow with conflicts for all data types
  - Test conflict resolution choices applied to all conflicting records
  - Test import completion after resolving conflicts from multiple data types
  - _Requirements: 1.1, 1.2, 5.3, 5.4_
