# Requirements Document

## Introduction

The data import system has critical issues with relationship handling and conflict detection that prevent proper data integrity during import operations. Products lose their category and supplier relationships, suppliers get duplicated instead of being updated, and conflict detection is inconsistent across different data types.

## Requirements

### Requirement 1: Fix Product Relationship Import

**User Story:** As a user importing product data, I want products to maintain their category and supplier relationships so that my inventory organization is preserved.

#### Acceptance Criteria

1. WHEN importing products with category_id THEN the system SHALL preserve the category relationship using the UUID
2. WHEN importing products with supplier_id THEN the system SHALL preserve the supplier relationship using the UUID
3. WHEN category_id is invalid or missing AND category name is provided THEN the system SHALL find existing category by name or create new one
4. WHEN supplier_id is invalid or missing AND supplier name is provided THEN the system SHALL find existing supplier by name or create new one
5. WHEN both category_id and category name are missing THEN the system SHALL assign a default category
6. WHEN both supplier_id and supplier name are missing THEN the system SHALL leave supplier_id as null

### Requirement 2: Fix Supplier Duplication Issue

**User Story:** As a user importing supplier data multiple times, I want existing suppliers to be updated instead of creating duplicates so that my supplier list remains clean.

#### Acceptance Criteria

1. WHEN importing a supplier with existing UUID THEN the system SHALL update the existing supplier record
2. WHEN importing a supplier with existing name but no UUID THEN the system SHALL update the existing supplier record
3. WHEN conflict resolution is set to 'update' THEN the system SHALL overwrite existing supplier data
4. WHEN conflict resolution is set to 'skip' THEN the system SHALL skip duplicate suppliers
5. WHEN importing suppliers multiple times THEN the system SHALL NOT create duplicate records

### Requirement 3: Standardize Conflict Detection

**User Story:** As a user importing data, I want consistent conflict detection across all data types so that the import behavior is predictable and reliable.

#### Acceptance Criteria

1. WHEN detecting conflicts THEN the system SHALL use UUID matching as the primary method for all data types
2. WHEN UUID matching fails THEN the system SHALL use name-based matching as fallback for appropriate data types
3. WHEN checking for conflicts THEN the system SHALL use the same logic for all modal data types
4. WHEN multiple records match THEN the system SHALL use the first match found
5. WHEN no conflicts are found THEN the system SHALL proceed with import as new record

### Requirement 4: Simplify and Clean Code

**User Story:** As a developer maintaining the import system, I want clean and simple code so that the system is easier to understand and maintain.

#### Acceptance Criteria

1. WHEN implementing conflict detection THEN the system SHALL use a single universal method for all data types
2. WHEN processing relationships THEN the system SHALL use clear and consistent logic
3. WHEN handling errors THEN the system SHALL provide meaningful error messages
4. WHEN validating data THEN the system SHALL use simple and readable validation functions
5. WHEN updating records THEN the system SHALL use consistent update patterns across all data types
