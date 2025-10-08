# Requirements Document

## Introduction

The current data import system has limited conflict resolution that only works for products and complete backup files, and uses name-based matching instead of UUID-based matching. This feature will implement a universal conflict resolution system that handles conflicts for all import types using UUID-based matching for more reliable and consistent conflict detection.

## Requirements

### Requirement 1

**User Story:** As a user importing any type of data, I want conflicts to be detected and resolved consistently, so that I can handle data conflicts regardless of the import type.

#### Acceptance Criteria

1. WHEN importing any data type (sales, products, customers, expenses, stockMovements, bulkPricing) THEN the system SHALL detect conflicts for that data type
2. WHEN conflicts are detected THEN the system SHALL show the conflict resolution modal
3. WHEN no conflicts are detected THEN the system SHALL proceed with import without showing the modal

### Requirement 2

**User Story:** As a user importing data, I want conflicts to be detected using UUID matching instead of name matching, so that I get more accurate and reliable conflict detection.

#### Acceptance Criteria

1. WHEN checking for duplicate records THEN the system SHALL compare UUIDs as the primary matching criteria
2. IF a record has a valid UUID AND an existing record has the same UUID THEN the system SHALL identify it as a duplicate conflict
3. IF a record does not have a UUID OR has an invalid UUID THEN the system SHALL fall back to name-based matching as secondary criteria
4. WHEN comparing UUIDs THEN the system SHALL use exact string matching

### Requirement 3

**User Story:** As a user resolving conflicts, I want to see clear information about what records are conflicting, so that I can make informed decisions about how to resolve them.

#### Acceptance Criteria

1. WHEN a conflict is detected THEN the system SHALL show the existing record's UUID and key identifying information
2. WHEN a conflict is detected THEN the system SHALL show the imported record's UUID and key identifying information
3. WHEN displaying conflict information THEN the system SHALL highlight the matching criteria (UUID or name)
4. WHEN a record has no UUID THEN the system SHALL clearly indicate this in the conflict display
5. WHEN there are more than 5 conflicts THEN the system SHALL show a "See More" button to view all conflicts
6. WHEN the "See More" button is clicked THEN the system SHALL display all conflicts in an expandable or scrollable view

### Requirement 4

**User Story:** As a user importing data, I want the conflict resolution to work with simple and clean code, so that the system is maintainable and reliable.

#### Acceptance Criteria

1. WHEN implementing conflict detection THEN the system SHALL use a unified approach for all data types
2. WHEN detecting conflicts THEN the system SHALL follow a simple two-step process: UUID matching first, then name matching
3. WHEN resolving conflicts THEN the system SHALL apply the same resolution logic regardless of data type
4. WHEN handling conflicts THEN the system SHALL avoid complex conditional logic based on import type

### Requirement 5

**User Story:** As a user importing mixed data types, I want conflict resolution to handle all record types in the import file, so that I don't have to import different types separately to get conflict resolution.

#### Acceptance Criteria

1. WHEN importing a file with multiple data types THEN the system SHALL check for conflicts across all data types in the file
2. WHEN conflicts exist in any data type THEN the system SHALL show all conflicts in the resolution modal
3. WHEN resolving conflicts THEN the system SHALL apply the resolution to all conflicting records regardless of their type
4. WHEN no conflicts exist in any data type THEN the system SHALL proceed with the import
