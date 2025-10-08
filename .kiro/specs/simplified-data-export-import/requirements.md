# Requirements Document

## Introduction

This feature simplifies the current data export/import system by removing individual data type selections and focusing on "all data" operations only. The goal is to create a cleaner, simpler user experience with better preview capabilities for exports and comprehensive conflict resolution for imports, while removing unused complex code paths.

## Requirements

### Requirement 1

**User Story:** As a user, I want to export all my data in one operation, so that I don't have to deal with complex individual data type selections.

#### Acceptance Criteria

1. WHEN the user accesses data export THEN the system SHALL only provide an "Export All Data" option
2. WHEN the user initiates export THEN the system SHALL remove all individual data type options (sales, products, expenses, shopSettings, customers, stockMovements, bulkPricing)
3. WHEN export is triggered THEN the system SHALL show a clear preview with count of each data type before export
4. WHEN export preview is displayed THEN the system SHALL show counts for: sales, products, expenses, shop settings, customers, stock movements, and bulk pricing data

### Requirement 2

**User Story:** As a user, I want to see exactly what data will be exported before confirming, so that I can make informed decisions about my data export.

#### Acceptance Criteria

1. WHEN export is initiated THEN the system SHALL display a preview modal with data counts
2. WHEN preview is shown THEN the system SHALL display each data type with its respective count (e.g., "Products: 150", "Sales: 1,200")
3. WHEN preview is displayed THEN the system SHALL show total file size estimate
4. WHEN user confirms export THEN the system SHALL proceed with the export operation
5. WHEN user cancels preview THEN the system SHALL return to the export screen without performing export

### Requirement 3

**User Story:** As a user, I want to import all data in one operation, so that I can restore my complete dataset without complex selections.

#### Acceptance Criteria

1. WHEN the user accesses data import THEN the system SHALL only provide an "Import All Data" option
2. WHEN import file is selected THEN the system SHALL remove all individual data type import options
3. WHEN import is initiated THEN the system SHALL validate the complete import file structure
4. WHEN import validation passes THEN the system SHALL proceed to conflict detection

### Requirement 4

**User Story:** As a user, I want to see all data conflicts clearly during import, so that I can resolve them appropriately before completing the import.

#### Acceptance Criteria

1. WHEN import data conflicts with existing data THEN the system SHALL display all conflicts in a clear, organized manner
2. WHEN conflicts are detected THEN the system SHALL show conflicts grouped by data type (products, sales, customers, etc.)
3. WHEN conflicts are displayed THEN the system SHALL show existing data vs import data side by side for each conflict
4. WHEN conflicts are shown THEN the system SHALL provide options to "Keep Existing", "Use Import Data", or "Skip" for each conflict
5. WHEN user resolves all conflicts THEN the system SHALL enable the "Complete Import" button
6. WHEN no conflicts exist THEN the system SHALL proceed directly to import completion

### Requirement 5

**User Story:** As a developer, I want the codebase to be clean and simple, so that maintenance and future development is easier.

#### Acceptance Criteria

1. WHEN refactoring is complete THEN the system SHALL remove all unused individual data type export/import code paths
2. WHEN cleanup is done THEN the system SHALL remove related test files for unused functionality
3. WHEN simplification is complete THEN the system SHALL have no duplicate or unused code related to selective data operations
4. WHEN code is cleaned THEN the system SHALL maintain only "all data" export/import functionality
5. WHEN refactoring is finished THEN the system SHALL have simplified service methods without complex type switching logic

### Requirement 6

**User Story:** As a user, I want the export/import process to have good UX design, so that the operations are intuitive and visually appealing.

#### Acceptance Criteria

1. WHEN using export/import features THEN the system SHALL provide clear, modern UI components
2. WHEN displaying data previews THEN the system SHALL use well-organized, readable layouts
3. WHEN showing conflicts THEN the system SHALL use intuitive visual indicators (colors, icons) to distinguish conflict types
4. WHEN operations are in progress THEN the system SHALL show appropriate loading states and progress indicators
5. WHEN operations complete THEN the system SHALL provide clear success/failure feedback to the user
