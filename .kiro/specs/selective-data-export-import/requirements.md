# Requirements Document

## Introduction

This feature addresses the current issue where the export and import functionality doesn't properly handle selective data types. Currently, when users select a specific data type (like "Sales Data" or "Products"), the system still processes all data instead of only the selected type. This feature will modify the export and import services to properly filter and handle only the selected data type.

## Requirements

### Requirement 1

**User Story:** As a user, I want to export only the specific data type I select, so that I get a focused export file containing only the data I need.

#### Acceptance Criteria

1. WHEN I select "Sales Data" export THEN the system SHALL export only sales and related sale items data
2. WHEN I select "Products" export THEN the system SHALL export only products, categories, suppliers, and bulk pricing data
3. WHEN I select "Customers" export THEN the system SHALL export only customer data and their statistics
4. WHEN I select "Expenses" export THEN the system SHALL export only expenses and expense categories data
5. WHEN I select "Stock Movements" export THEN the system SHALL export only stock movement data
6. WHEN I select "Bulk Pricing" export THEN the system SHALL export only bulk pricing data for products
7. WHEN I select "Complete Backup" export THEN the system SHALL export all data types as it currently does

### Requirement 2

**User Story:** As a user, I want to import only the specific data type from my import file, so that I can selectively restore or add data without affecting other data types.

#### Acceptance Criteria

1. WHEN I select "Sales Data" import THEN the system SHALL import only sales data from the file and ignore other data types
2. WHEN I select "Products" import THEN the system SHALL import only products, categories, suppliers, and bulk pricing from the file
3. WHEN I select "Customers" import THEN the system SHALL import only customer data from the file
4. WHEN I select "Expenses" import THEN the system SHALL import only expenses and expense categories from the file
5. WHEN I select "Stock Movements" import THEN the system SHALL import only stock movements from the file
6. WHEN I select "Bulk Pricing" import THEN the system SHALL import only bulk pricing data from the file
7. WHEN I select "Complete Restore" import THEN the system SHALL import all available data types from the file

### Requirement 3

**User Story:** As a user, I want clear feedback about what data was actually exported or imported, so that I can verify the operation completed as expected.

#### Acceptance Criteria

1. WHEN an export completes THEN the system SHALL show the exact count of records exported for the selected data type
2. WHEN an import completes THEN the system SHALL show the exact count of records imported, updated, and skipped for the selected data type
3. WHEN importing a file that doesn't contain the selected data type THEN the system SHALL show a clear error message
4. WHEN exporting a data type with no records THEN the system SHALL create an empty export file and notify the user

### Requirement 4

**User Story:** As a user, I want the export file structure to be consistent regardless of data type selection, so that I can easily understand and work with the exported data.

#### Acceptance Criteria

1. WHEN exporting any data type THEN the file SHALL maintain the same JSON structure with metadata and data sections
2. WHEN exporting a specific data type THEN the dataType field SHALL accurately reflect the selected type
3. WHEN exporting a specific data type THEN only the relevant data sections SHALL be populated in the export file
4. WHEN importing THEN the system SHALL validate that the file contains the expected data type before processing
