# Requirements Document

## Introduction

This specification outlines the addition of supplier management UI and the conversion of price-related properties from integer to decimal format to support both whole number pricing (Myanmar Kyat) and decimal pricing (other currencies). The enhancements will provide a complete supplier management interface and flexible pricing system that can handle various currency formats.

## Requirements

### Requirement 1: Supplier Management User Interface

**User Story:** As a store manager, I want a complete supplier management interface, so that I can add, edit, view, and manage all supplier information through the application UI.

#### Acceptance Criteria

1. WHEN accessing supplier management THEN I SHALL see a list of all suppliers with their basic information
2. WHEN adding a new supplier THEN I SHALL be able to enter name, contact person, phone, email (optional), and address
3. WHEN editing a supplier THEN I SHALL be able to modify all supplier fields
4. WHEN deleting a supplier THEN the system SHALL prevent deletion if products are associated with that supplier
5. WHEN viewing supplier details THEN I SHALL see associated products and recent stock movements
6. WHEN searching suppliers THEN I SHALL be able to find suppliers by name, contact person, or phone number

### Requirement 2: Supplier-Product Relationship Management

**User Story:** As an inventory manager, I want to easily manage which products are supplied by which suppliers, so that I can track product sources and manage supplier relationships effectively.

#### Acceptance Criteria

1. WHEN creating or editing a product THEN I SHALL be able to select a supplier from a dropdown list
2. WHEN viewing a supplier THEN I SHALL see all products they supply
3. WHEN viewing a product THEN I SHALL see which supplier provides it (if any)
4. WHEN processing stock movements THEN I SHALL be able to associate stock-in movements with suppliers
5. IF a supplier is deleted THEN associated products SHALL have their supplier_id set to NULL

### Requirement 3: Decimal Price Support

**User Story:** As a store owner operating in different markets, I want to use decimal prices for products, so that I can handle both whole number pricing (like Myanmar Kyat) and decimal pricing (like USD, EUR) accurately.

#### Acceptance Criteria

1. WHEN entering product prices THEN I SHALL be able to input decimal values (e.g., 3.50, 1000.25)
2. WHEN entering product costs THEN I SHALL be able to input decimal values for accurate profit calculations
3. WHEN processing sales THEN all price calculations SHALL maintain decimal precision
4. WHEN viewing reports THEN decimal prices SHALL be displayed with appropriate formatting
5. WHEN importing/exporting data THEN decimal prices SHALL be preserved accurately
6. WHEN calculating bulk pricing THEN decimal discounts SHALL be applied correctly

### Requirement 4: Database Migration for Decimal Pricing

**User Story:** As a system administrator, I want existing integer price data to be safely converted to decimal format, so that current data is preserved while enabling decimal price support.

#### Acceptance Criteria

1. WHEN upgrading the database THEN existing integer prices SHALL be converted to decimal format
2. WHEN migration occurs THEN all price-related fields SHALL support decimal values
3. WHEN migration fails THEN the system SHALL rollback to the previous state
4. WHEN displaying migrated prices THEN they SHALL appear correctly formatted
5. IF price data is corrupted during migration THEN the system SHALL provide recovery options

### Requirement 5: Price Formatting and Display

**User Story:** As a user, I want prices to be displayed consistently and appropriately formatted based on the currency type, so that pricing information is clear and professional.

#### Acceptance Criteria

1. WHEN displaying prices THEN the system SHALL format them with appropriate decimal places
2. WHEN showing Myanmar Kyat prices THEN they SHALL display without decimal places if they are whole numbers
3. WHEN showing other currency prices THEN they SHALL display with 2 decimal places
4. WHEN printing receipts THEN price formatting SHALL be consistent and professional
5. WHEN exporting data THEN price formatting SHALL be preserved in the export format

### Requirement 6: Supplier Analytics and Reporting

**User Story:** As a business owner, I want to analyze supplier performance and costs, so that I can make informed decisions about supplier relationships and inventory sourcing.

#### Acceptance Criteria

1. WHEN viewing supplier analytics THEN I SHALL see total purchase amounts and product counts
2. WHEN analyzing supplier performance THEN I SHALL see delivery frequency and stock movement patterns
3. WHEN comparing suppliers THEN I SHALL see cost analysis and product overlap
4. WHEN generating reports THEN supplier data SHALL be included in inventory and cost reports
5. WHEN tracking expenses THEN supplier-related costs SHALL be categorized and analyzed

### Requirement 7: Integration with Existing Features

**User Story:** As a user, I want the new supplier management and decimal pricing features to work seamlessly with existing functionality, so that my workflow remains smooth and efficient.

#### Acceptance Criteria

1. WHEN using bulk pricing THEN decimal prices SHALL work correctly with quantity discounts
2. WHEN processing stock movements THEN supplier selection SHALL integrate smoothly
3. WHEN generating analytics THEN decimal prices SHALL be calculated accurately in all reports
4. WHEN using customer management THEN decimal pricing SHALL work with customer purchase history
5. WHEN importing/exporting data THEN both supplier data and decimal prices SHALL be handled correctly

### Requirement 8: User Interface Design Consistency

**User Story:** As a user, I want the supplier management interface to follow the same design patterns as the rest of the application, so that the experience is consistent and intuitive.

#### Acceptance Criteria

1. WHEN accessing supplier management THEN the interface SHALL follow existing design patterns
2. WHEN adding or editing suppliers THEN forms SHALL use the same styling as other forms
3. WHEN viewing supplier lists THEN they SHALL match the design of product and customer lists
4. WHEN navigating supplier features THEN the navigation SHALL be intuitive and consistent
5. WHEN displaying supplier information THEN it SHALL integrate well with existing inventory views

### Requirement 9: Performance and Scalability

**User Story:** As a store owner with many suppliers and products, I want the supplier management system to perform well even with large amounts of data, so that daily operations remain efficient.

#### Acceptance Criteria

1. WHEN loading supplier lists THEN performance SHALL remain fast with hundreds of suppliers
2. WHEN searching suppliers THEN results SHALL appear quickly and be relevant
3. WHEN calculating decimal prices THEN performance SHALL not impact sales processing speed
4. WHEN generating supplier reports THEN large datasets SHALL be handled efficiently
5. WHEN displaying supplier-product relationships THEN loading SHALL be optimized

### Requirement 10: Currency Management System

**User Story:** As a store owner, I want to configure my shop's currency in the settings and have it used consistently throughout the application, so that all pricing displays and calculations use the correct currency format.

#### Acceptance Criteria

1. WHEN accessing shop settings THEN I SHALL be able to select and configure the shop's currency
2. WHEN setting currency THEN I SHALL be able to choose from common currencies (MMK, USD, EUR, etc.) or enter a custom currency
3. WHEN currency is configured THEN all price displays throughout the app SHALL use the selected currency symbol/code
4. WHEN changing currency THEN existing prices SHALL remain in their numeric values but display with new currency formatting
5. WHEN printing receipts THEN the configured currency SHALL be used in all price formatting
6. WHEN exporting data THEN currency information SHALL be included in the export metadata

### Requirement 11: Currency-Aware Price Formatting

**User Story:** As a user, I want prices to be formatted according to the configured currency settings, so that pricing information is displayed appropriately for my local market.

#### Acceptance Criteria

1. WHEN displaying Myanmar Kyat (MMK) THEN prices SHALL show without decimal places for whole numbers (e.g., "1,500 MMK")
2. WHEN displaying USD/EUR THEN prices SHALL show with 2 decimal places (e.g., "$15.50", "€12.75")
3. WHEN displaying large numbers THEN thousand separators SHALL be used appropriately (e.g., "1,500.00")
4. WHEN showing currency symbols THEN they SHALL be positioned correctly based on currency conventions
5. WHEN currency is not set THEN the system SHALL use a default format with generic currency display

### Requirement 12: Data Validation and Error Handling

**User Story:** As a user, I want proper validation and clear error messages when managing suppliers and entering decimal prices, so that I can avoid data entry mistakes and understand any issues.

#### Acceptance Criteria

1. WHEN entering supplier information THEN required fields SHALL be validated
2. WHEN entering decimal prices THEN invalid formats SHALL be rejected with clear messages
3. WHEN deleting suppliers THEN the system SHALL warn about associated products
4. WHEN price calculations fail THEN error messages SHALL be helpful and actionable
5. WHEN data conflicts occur THEN resolution options SHALL be clearly presented
6. WHEN currency settings are invalid THEN appropriate validation messages SHALL be shown
