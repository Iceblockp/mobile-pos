# Requirements Document

## Introduction

This specification defines enhancements to the sales flow in the POS system to improve cashier efficiency and user experience. The enhancements include moving payment method selection to the main sales page, adding a calculator modal for cash payments, implementing smart validation for debt payments, and refactoring the payment completion flow.

## Glossary

- **Sales_Page**: The main point-of-sale interface where products are added to cart
- **Payment_Method_Selector**: UI component for selecting payment method (Cash, KBZPay, WavePay, Debt, etc.)
- **Customer_Selector**: UI component for selecting or searching customers
- **Calculator_Modal**: Modal dialog with numpad for calculating cash payment and change
- **Complete_Sale_Modal**: Final confirmation modal before processing the sale
- **Cart**: Collection of products selected for purchase
- **Debt_Payment**: Payment method that creates a debt record for a customer
- **Change_Calculation**: Process of calculating money to return to customer (Amount Given - Subtotal)

## Requirements

### Requirement 1: Payment Method Selection on Sales Page

**User Story:** As a cashier, I want to select the payment method before completing the sale, so that I can prepare the appropriate payment process upfront.

#### Acceptance Criteria

1. THE Sales_Page SHALL display a Payment_Method_Selector beside the Customer_Selector
2. WHEN the Sales_Page loads, THE Payment_Method_Selector SHALL default to the system's default payment method
3. WHEN a user clicks the Payment_Method_Selector, THE system SHALL display all available payment methods with their icons and colors
4. WHEN a user selects a payment method, THE Payment_Method_Selector SHALL update to show the selected method
5. THE Payment_Method_Selector SHALL persist the selection until the sale is completed or cart is cleared

### Requirement 2: Customer Selection Validation for Debt Payments

**User Story:** As a system administrator, I want to enforce customer selection for debt payments, so that all debt transactions are properly tracked to specific customers.

#### Acceptance Criteria

1. WHEN a user selects "Debt" as the payment method, THE Customer_Selector SHALL become visually emphasized
2. WHEN a user clicks "Process Sale" with Debt payment method AND no customer selected, THE system SHALL display an error message
3. THE error message SHALL state "Please select a customer for debt payment"
4. WHEN a user selects "Debt" as payment method AND a customer is already selected, THE system SHALL allow proceeding to sale completion
5. WHEN a user selects any non-Debt payment method, THE Customer_Selector SHALL remain optional

### Requirement 3: Calculator Modal for Cash Payments

**User Story:** As a cashier, I want a calculator to help me quickly determine the change to give customers, so that I can process cash transactions accurately and efficiently.

#### Acceptance Criteria

1. WHEN a user clicks "Process Sale" with Cash payment method, THE system SHALL display the Calculator_Modal before the Complete_Sale_Modal
2. THE Calculator_Modal SHALL display the cart subtotal as a read-only field at the top
3. THE Calculator_Modal SHALL provide an "Amount Given" input field that accepts numeric input
4. THE Calculator_Modal SHALL automatically calculate and display "Change" as (Amount Given - Subtotal)
5. THE Calculator_Modal SHALL include an "EXACT" quick button that sets Amount Given equal to Subtotal
6. THE Calculator_Modal SHALL include quick amount buttons for common denominations (1000, 5000, 10000, 50000, 100000)
7. WHEN a user clicks a quick amount button, THE system SHALL ADD that amount to the current Amount Given value
8. THE Calculator_Modal SHALL include a numeric keypad with digits 0-9, backspace, and clear buttons
9. WHEN a user types on the numeric keypad, THE system SHALL update the Amount Given field
10. WHEN Amount Given is less than Subtotal, THE Change field SHALL display a negative value or warning
11. WHEN a user clicks "Continue" in Calculator_Modal, THE system SHALL proceed to Complete_Sale_Modal
12. WHEN a user clicks "Cancel" in Calculator_Modal, THE system SHALL return to the Sales_Page without processing the sale

### Requirement 4: Direct Flow for Non-Cash Payments

**User Story:** As a cashier, I want to skip the calculator for digital payments, so that I can complete non-cash transactions quickly.

#### Acceptance Criteria

1. WHEN a user clicks "Process Sale" with any non-Cash payment method, THE system SHALL skip the Calculator_Modal
2. WHEN a user clicks "Process Sale" with non-Cash payment method, THE system SHALL display the Complete_Sale_Modal directly
3. THE system SHALL apply this direct flow to all payment methods except Cash (including KBZPay, WavePay, Card, Debt, etc.)

### Requirement 5: Enhanced Complete Sale Modal

**User Story:** As a cashier, I want to review all sale details and optionally recalculate change before final confirmation, so that I can ensure accuracy before completing the transaction.

#### Acceptance Criteria

1. THE Complete_Sale_Modal SHALL display the selected payment method as read-only with its icon and color
2. THE Complete_Sale_Modal SHALL display the total amount prominently
3. WHEN the payment method is Cash, THE Complete_Sale_Modal SHALL display a calculator icon beside the total amount
4. WHEN a user clicks the calculator icon, THE system SHALL reopen the Calculator_Modal
5. WHEN a user returns from the recalculated Calculator_Modal, THE Complete_Sale_Modal SHALL remain open
6. THE Complete_Sale_Modal SHALL include a note input field for sale notes
7. THE Complete_Sale_Modal SHALL include a checkbox for printing receipt
8. WHEN a user clicks "Confirm Sale" in Complete_Sale_Modal, THE system SHALL process the sale transaction
9. WHEN a user clicks "Cancel" in Complete_Sale_Modal, THE system SHALL return to the Sales_Page without processing the sale

### Requirement 6: Payment Method Management Access

**User Story:** As a shop manager, I want to access payment method management from the sales page, so that I can quickly add or modify payment methods without leaving the sales interface.

#### Acceptance Criteria

1. THE Payment_Method_Selector SHALL include a settings/management icon
2. WHEN a user clicks the management icon, THE system SHALL open the Payment_Method_Management modal
3. WHEN payment methods are updated in the management modal, THE Payment_Method_Selector SHALL refresh to show the updated list
4. THE management icon SHALL be accessible to users with appropriate permissions

### Requirement 7: State Persistence and Cart Clearing

**User Story:** As a cashier, I want the system to properly reset after completing a sale, so that I can start the next transaction with a clean state.

#### Acceptance Criteria

1. WHEN a sale is successfully completed, THE system SHALL clear the cart
2. WHEN a sale is successfully completed, THE system SHALL clear the selected customer
3. WHEN a sale is successfully completed, THE system SHALL reset the payment method to the default
4. WHEN a sale is successfully completed, THE system SHALL reset the sale date/time selector if it was open
5. WHEN a user cancels at any point in the flow, THE cart SHALL remain unchanged
6. WHEN a user cancels at any point in the flow, THE selected payment method SHALL remain unchanged
7. WHEN a user cancels at any point in the flow, THE selected customer SHALL remain unchanged

### Requirement 8: Calculator Modal UI Design

**User Story:** As a cashier, I want an intuitive calculator interface, so that I can quickly input amounts and calculate change without confusion.

#### Acceptance Criteria

1. THE Calculator_Modal SHALL use a clean, uncluttered layout with clear visual hierarchy
2. THE numeric keypad buttons SHALL be large enough for easy touch interaction (minimum 48x48 dp)
3. THE display area SHALL show all three values (Subtotal, Amount Given, Change) with clear labels
4. THE Change value SHALL be displayed in a prominent color (green if positive, red if negative)
5. THE "EXACT" button SHALL be visually distinct from denomination buttons
6. THE quick amount buttons SHALL display formatted currency values
7. THE Calculator_Modal SHALL be responsive and work on various screen sizes
8. THE Calculator_Modal SHALL support both touch and keyboard input where applicable

### Requirement 9: Accessibility and Error Handling

**User Story:** As a user with accessibility needs, I want clear feedback and error messages, so that I can successfully complete sales transactions.

#### Acceptance Criteria

1. WHEN validation fails, THE system SHALL display clear, actionable error messages
2. THE error messages SHALL be displayed in a toast notification or alert dialog
3. WHEN a customer is required but not selected, THE Customer_Selector SHALL be briefly highlighted
4. THE Calculator_Modal SHALL prevent non-numeric input in the Amount Given field
5. WHEN Amount Given is less than Subtotal, THE system SHALL display a warning but allow proceeding
6. ALL interactive elements SHALL have appropriate touch target sizes (minimum 44x44 points)
7. THE system SHALL provide visual feedback for all button presses and interactions

### Requirement 10: Localization Support

**User Story:** As a user in Myanmar, I want the calculator and payment flow to support my language, so that I can use the system in my preferred language.

#### Acceptance Criteria

1. THE Calculator_Modal SHALL display all labels and buttons in the user's selected language
2. THE error messages SHALL be displayed in the user's selected language
3. THE currency formatting SHALL respect the user's currency settings
4. THE quick amount buttons SHALL display amounts in the user's configured currency format
5. THE system SHALL support both English and Myanmar language throughout the enhanced flow
