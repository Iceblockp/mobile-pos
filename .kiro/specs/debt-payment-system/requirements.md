# Requirements Document

## Introduction

This feature adds debt payment functionality to the POS system, allowing businesses to track sales made on credit and manage debt payments. The system will add "Debt" as a default payment method alongside "Cash", track outstanding debts per customer, enable debt payment recording, and display debt-related analytics across the dashboard and reports.

## Glossary

- **Debt_Payment_System**: The component responsible for managing debt sales and debt payment tracking
- **Payment_Modal**: The interface used during sale completion to select payment methods
- **Sales_Table**: The database table storing all sales transactions with payment method information
- **Customer_Table**: The database table storing customer information including debt balances
- **Dashboard**: The main analytics interface displaying key business metrics
- **Analytics_Page**: The detailed reporting interface with charts and payment method breakdowns
- **Sales_History**: The interface displaying past sales with filtering capabilities

## Requirements

### Requirement 1: Add Debt as Default Payment Method

**User Story:** As a shop owner, I want "Debt" to be available as a default payment method alongside "Cash", so that I can record sales made on credit.

#### Acceptance Criteria

1. WHEN the system initializes payment methods, THE Debt_Payment_System SHALL include "Debt" as a default payment method
2. WHEN the Payment_Modal displays payment options, THE Debt_Payment_System SHALL show both "Cash" and "Debt" as default options
3. WHEN a user creates a sale with "Debt" payment method, THE Sales_Table SHALL store the payment method as "Debt"
4. THE Debt_Payment_System SHALL NOT allow removal of the "Debt" default payment method

### Requirement 2: Customer Association for Debt Sales

**User Story:** As a shop owner, I want debt sales to require customer selection, so that I can track which customer owes money.

#### Acceptance Criteria

1. WHEN a user selects "Debt" as payment method, THE Payment_Modal SHALL require customer selection
2. IF no customer is selected for a debt sale, THEN THE Payment_Modal SHALL display a validation message
3. WHEN a debt sale is completed, THE Sales_Table SHALL store the associated customer_id
4. WHEN a debt sale is completed, THE Customer_Table SHALL update the customer's total debt balance

### Requirement 3: Debt Payment Recording

**User Story:** As a shop owner, I want to record when a customer pays their debt, so that I can update their outstanding balance and track payment history.

#### Acceptance Criteria

1. WHEN viewing a debt sale in sales history, THE Sales_History SHALL provide an option to record debt payment
2. WHEN recording a debt payment, THE Debt_Payment_System SHALL allow updating the payment method from "Debt" to the actual payment method used
3. WHEN a debt payment is recorded, THE Customer_Table SHALL decrease the customer's total debt balance
4. WHEN a debt payment is recorded, THE Sales_Table SHALL update the payment_method field to reflect the actual payment
5. THE Debt_Payment_System SHALL maintain the original sale record with updated payment information

### Requirement 4: Dashboard Debt Analytics

**User Story:** As a shop owner, I want to see debt-related metrics on my dashboard, so that I can monitor outstanding debts at a glance.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Dashboard SHALL display total outstanding debt amount
2. WHEN the Dashboard loads, THE Dashboard SHALL display the count of debt sales
3. WHEN calculating revenue metrics, THE Dashboard SHALL distinguish between paid sales and debt sales
4. THE Dashboard SHALL update debt metrics in real-time when debt sales or payments are recorded

### Requirement 5: Analytics Page Debt Reporting

**User Story:** As a shop owner, I want to see debt sales in my payment method analytics, so that I can understand my credit sales patterns.

#### Acceptance Criteria

1. WHEN the Analytics_Page displays payment method breakdown, THE Analytics_Page SHALL include "Debt" as a payment method category
2. WHEN filtering by date range, THE Analytics_Page SHALL include debt sales in the payment method chart
3. WHEN displaying payment method totals, THE Analytics_Page SHALL show the total amount of debt sales
4. THE Analytics_Page SHALL display the count of debt transactions alongside other payment methods

### Requirement 6: Sales History Filtering

**User Story:** As a shop owner, I want to filter sales by payment method including debt, so that I can quickly find all debt sales or paid sales.

#### Acceptance Criteria

1. WHEN the Sales_History displays filter options, THE Sales_History SHALL include payment method as a filter criterion
2. WHEN filtering by "Debt" payment method, THE Sales_History SHALL display only sales with debt payment method
3. WHEN searching sales, THE Sales_History SHALL allow searching by payment method including "Debt"
4. THE Sales_History SHALL display payment method prominently for each sale record

### Requirement 7: Customer Debt Balance Display

**User Story:** As a shop owner, I want to see each customer's outstanding debt balance, so that I know how much they owe.

#### Acceptance Criteria

1. WHEN viewing customer details, THE system SHALL display the customer's current debt balance
2. WHEN viewing customer list, THE system SHALL show debt balance for customers with outstanding debts
3. WHEN a customer selector is displayed, THE system SHALL indicate if a customer has outstanding debt
4. THE Customer_Table SHALL maintain an accurate debt balance field updated by debt sales and payments

### Requirement 8: Simple Implementation Approach

**User Story:** As a developer, I want to implement debt functionality with minimal code changes, so that the system remains maintainable and stable.

#### Acceptance Criteria

1. WHEN implementing debt payment method, THE Debt_Payment_System SHALL extend existing payment method service
2. WHEN storing debt information, THE Debt_Payment_System SHALL use existing database tables without adding new tables
3. WHEN updating payment methods, THE Debt_Payment_System SHALL modify the existing payment_method field in sales table
4. THE Debt_Payment_System SHALL reuse existing UI components and patterns where possible
5. THE Debt_Payment_System SHALL NOT introduce complex data structures or unnecessary abstractions
