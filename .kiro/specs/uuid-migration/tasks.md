# UUID Migration Implementation Plan

## Task Overview

Convert all database table IDs from integers to UUIDs while preserving existing data and maintaining referential integrity. This implementation will be done in discrete, manageable steps that build incrementally.

## Implementation Tasks

- [x] 1. Create UUID utility service

  - Create UUID generation and validation utilities
  - Add crypto dependency for UUID generation
  - Write unit tests for UUID utilities
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. Create database migration service

  - Implement UUIDMigrationService class with backup functionality
  - Add methods for creating UUID table schemas
  - Implement data migration with UUID mapping
  - Add validation and rollback capabilities
  - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2_

- [x] 3. Update database interfaces and types

  - Modify all database interfaces to use string IDs instead of number IDs
  - Update Product, Sale, Customer, Supplier, and all other interfaces
  - Change all foreign key fields from number to string types
  - _Requirements: 4.1, 4.2, 6.1, 6.2_

- [x] 4. Update database service methods

  - Modify all CRUD methods to handle string UUID parameters
  - Update all query methods to work with UUID-based lookups
  - Ensure all foreign key operations use string UUIDs
  - Update method signatures and implementations
  - _Requirements: 4.3, 4.4, 6.1_

- [x] 5. Update query hooks and React Query integration

  - Modify all query key factories to use string IDs
  - Update all hook functions that accept ID parameters
  - Update all mutation functions to handle string IDs
  - Fix query invalidation logic for UUID-based keys
  - _Requirements: 6.2, 6.3_

- [x] 6. Update components that handle IDs

  - Update MovementHistory component to handle string productId and supplierId
  - Update SupplierFormModal, StockAnalytics, and other components with ID parameters
  - Update CustomerAnalytics, ExpensesManager, and BulkPricingTiers components
  - Ensure all ID prop types are changed from number to string
  - _Requirements: 6.2, 6.3_

- [x] 7. Update services that process IDs

  - Update templateEngine service to handle string saleId and product.id
  - Update dataImportService ID mapping and creation methods
  - Update dataExportService to export UUID format correctly
  - Ensure all ID handling uses string type
  - _Requirements: 6.2, 8.1, 8.2_

- [x] 8. Update data export/import functionality

  - Modify export service to handle UUID format in exported data
  - Update import service to validate and process UUID format
  - Ensure referential integrity is maintained with UUID foreign keys
  - Update export/import interfaces to use string IDs
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 9. Implement migration execution

  - Add migration trigger to database initialization
  - Implement migration progress tracking
  - Add user feedback during migration process
  - Ensure migration runs only once and tracks completion status
  - _Requirements: 5.3, 5.4_

- [x] 10. Add migration validation and testing

  - Implement post-migration data validation
  - Add UUID format validation for all ID fields
  - Verify foreign key relationships are maintained
  - Create basic migration tests
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 11. Update application pages and navigation

  - Update any app pages that pass ID parameters in navigation
  - Ensure all ID-based routing uses string UUIDs
  - Update any hardcoded ID references in app code
  - _Requirements: 6.3_

- [ ] 12. Final integration and cleanup
  - Run complete migration on test database
  - Verify all application functionality works with UUIDs
  - Clean up any temporary migration code
  - Update any remaining number ID references to string UUIDs
  - _Requirements: 1.5, 4.5, 6.4_
