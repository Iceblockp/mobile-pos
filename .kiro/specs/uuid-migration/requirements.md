# UUID Migration Requirements Document

## Introduction

This feature involves a simple, clean migration of all database table primary keys from integer-based auto-increment IDs to UUID-based identifiers while preserving all existing data and maintaining referential integrity.

The migration will be straightforward: convert all `id: number` fields to `id: string` (UUID format) across the database schema, interfaces, and application code without adding any complex features.

## Requirements

### Requirement 1: Data Preservation

**User Story:** As a business owner, I want all my existing data (products, sales, customers, etc.) to be preserved during the ID migration, so that I don't lose any historical information.

#### Acceptance Criteria

1. WHEN the UUID migration is executed THEN the system SHALL preserve all existing records in all tables
2. WHEN the migration completes THEN the system SHALL maintain all foreign key relationships between tables
3. WHEN the migration completes THEN the system SHALL preserve all data integrity constraints
4. IF the migration fails at any point THEN the system SHALL rollback all changes and restore the original state
5. WHEN the migration completes THEN the system SHALL verify data count matches pre-migration counts for all tables

### Requirement 2: UUID Generation and Assignment

**User Story:** As a developer, I want each existing record to receive a unique UUID identifier, so that all records have proper UUID-based primary keys.

#### Acceptance Criteria

1. WHEN the migration runs THEN the system SHALL generate a unique UUID for each existing record
2. WHEN generating UUIDs THEN the system SHALL use UUID v4 (random) format for better uniqueness
3. WHEN assigning UUIDs THEN the system SHALL ensure no duplicate UUIDs are generated
4. WHEN the migration completes THEN the system SHALL update all foreign key references to use the new UUIDs
5. WHEN creating new records after migration THEN the system SHALL automatically generate UUID primary keys

### Requirement 3: Foreign Key Relationship Migration

**User Story:** As a system administrator, I want all table relationships to be maintained after the UUID migration, so that data integrity is preserved.

#### Acceptance Criteria

1. WHEN migrating foreign keys THEN the system SHALL create a mapping table for old ID to new UUID relationships
2. WHEN updating foreign key references THEN the system SHALL use the mapping table to maintain relationships
3. WHEN the migration completes THEN the system SHALL verify all foreign key constraints are valid
4. WHEN the migration completes THEN the system SHALL remove temporary mapping tables
5. IF any foreign key relationship cannot be resolved THEN the system SHALL log the error and halt migration

### Requirement 4: Schema Updates

**User Story:** As a developer, I want the database schema to be updated to use UUID types for all primary and foreign keys, so that the system uses UUIDs consistently.

#### Acceptance Criteria

1. WHEN updating table schemas THEN the system SHALL change all primary key columns from INTEGER to TEXT (UUID format)
2. WHEN updating table schemas THEN the system SHALL change all foreign key columns from INTEGER to TEXT (UUID format)
3. WHEN updating schemas THEN the system SHALL maintain all existing indexes and constraints where applicable
4. WHEN the migration completes THEN the system SHALL validate that all UUID columns follow proper UUID format
5. WHEN the migration completes THEN the system SHALL update any application code that references ID fields

### Requirement 5: Migration Safety and Rollback

**User Story:** As a business owner, I want the migration to be safe with rollback capabilities, so that if something goes wrong, my system can be restored to its previous state.

#### Acceptance Criteria

1. WHEN starting the migration THEN the system SHALL create a complete backup of the database
2. WHEN the migration encounters an error THEN the system SHALL automatically rollback all changes
3. WHEN the migration is successful THEN the system SHALL provide verification that all data is intact
4. WHEN the migration completes THEN the system SHALL provide a detailed migration report
5. IF manual rollback is needed THEN the system SHALL provide clear rollback procedures

### Requirement 6: Application Compatibility

**User Story:** As an end user, I want the application to continue working normally after the UUID migration, so that my daily operations are not disrupted.

#### Acceptance Criteria

1. WHEN the migration completes THEN the system SHALL update all database service methods to handle UUID types
2. WHEN the migration completes THEN the system SHALL update all TypeScript interfaces to use string types for IDs
3. WHEN the migration completes THEN the system SHALL ensure all API endpoints continue to function correctly
4. WHEN the migration completes THEN the system SHALL maintain backward compatibility for any external integrations
5. WHEN the migration completes THEN the system SHALL update all test files to work with UUID-based IDs

#### Components and Services Requiring Updates:

**Database Service (`services/database.ts`):**

- All interfaces: Product, Sale, SaleItem, Supplier, Category, ExpenseCategory, Expense, Customer, StockMovement, BulkPricing, SupplierWithStats, SupplierProduct
- All CRUD methods that accept ID parameters
- All query methods that use ID-based lookups
- All foreign key relationship methods

**Query Hooks (`hooks/useQueries.ts`):**

- All query key factories that use numeric IDs
- All hook functions that accept ID parameters
- All mutation functions that handle ID operations
- Query invalidation logic that references IDs

**Components:**

- `components/MovementHistory.tsx` - productId, supplierId parameters
- `components/SupplierFormModal.tsx` - supplier ID handling
- `components/StockAnalytics.tsx` - productId parameter
- `components/EnhancedPrintManager.tsx` - product.id, saleId handling
- `components/MovementSummary.tsx` - productId parameter
- `components/CustomerAnalytics.tsx` - customerId parameter
- `components/StockMovementForm.tsx` - supplierId handling
- `components/ExpensesManager.tsx` - ID parameters for delete operations
- `components/BulkPricingTiers.tsx` - tier ID handling
- `components/inventory/ProductsManager.tsx` - product ID operations

**Services:**

- `services/templateEngine.ts` - saleId, product.id in receipt data
- `services/dataImportService.ts` - ID mapping and creation methods
- `services/dataExportService.ts` - ID handling in export data structures

**Context:**

- `context/DatabaseContext.tsx` - Database service integration

**App Pages:**

- All pages that use database queries with ID parameters
- Navigation that passes ID parameters between screens

### Requirement 7: Performance Considerations

**User Story:** As a system administrator, I want the UUID migration to maintain acceptable database performance, so that the application remains responsive.

#### Acceptance Criteria

1. WHEN using UUIDs THEN the system SHALL maintain query performance through proper indexing
2. WHEN the migration completes THEN the system SHALL recreate all necessary indexes for UUID columns
3. WHEN the migration completes THEN the system SHALL ensure database queries work correctly with UUID-based lookups

### Requirement 8: Data Export/Import Compatibility

**User Story:** As a business owner, I want my data export and import functionality to work with UUIDs, so that I can continue to backup and restore my data.

#### Acceptance Criteria

1. WHEN exporting data after migration THEN the system SHALL export UUID values correctly
2. WHEN importing data after migration THEN the system SHALL handle UUID format validation
3. WHEN importing data after migration THEN the system SHALL maintain referential integrity with UUID foreign keys
4. WHEN the migration completes THEN the system SHALL update export/import services to handle UUID format
5. WHEN the migration completes THEN the system SHALL provide migration utilities for external data sources

### Requirement 9: Testing and Validation

**User Story:** As a developer, I want basic testing to ensure the UUID migration works correctly, so that I can be confident in the migration's success.

#### Acceptance Criteria

1. WHEN the migration runs THEN the system SHALL perform basic validation of all migrated data
2. WHEN the migration completes THEN the system SHALL verify that all UUID fields are properly formatted
3. WHEN the migration completes THEN the system SHALL confirm that all foreign key relationships are maintained
