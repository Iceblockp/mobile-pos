# Implementation Plan: Sales Flow Enhancement

## Overview

This implementation plan breaks down the sales flow enhancement into discrete, manageable tasks. The enhancement includes moving payment method selection to the main sales page, adding a calculator modal for cash payments, and refactoring the payment completion flow.

## Tasks

- [x] 1. Create PaymentMethodSelector Component
  - Create new component file `components/PaymentMethodSelector.tsx`
  - Implement dropdown UI similar to CustomerSelector for consistency
  - Add payment method picker modal with icons and colors
  - Include management icon that opens PaymentMethodManagement modal
  - Load payment methods from PaymentMethodService
  - Handle loading and error states
  - Add prop types and TypeScript interfaces
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3_

- [ ]\* 1.1 Write unit tests for PaymentMethodSelector
  - Test default payment method selection
  - Test picker modal open/close
  - Test payment method selection
  - Test management modal access
  - Test loading states
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Create CashCalculatorModal Component
  - Create new component file `components/CashCalculatorModal.tsx`
  - Implement display area (Subtotal, Amount Given, Change)
  - Create EXACT quick button that sets amount = subtotal
  - Create denomination quick buttons (1K, 5K, 10K, 50K, 100K)
  - Implement quick button logic to ADD to current amount
  - Create numeric keypad layout (0-9, 00, 000, Clear, Backspace)
  - Implement keypad input handling
  - Add real-time change calculation
  - Style change display (green for positive, red for negative)
  - Add Continue and Cancel action buttons
  - Ensure touch-friendly button sizes (minimum 48x48 dp)
  - Add responsive layout for various screen sizes
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

- [ ]\* 2.1 Write property test for change calculation
  - **Property 4: Change Calculation Accuracy**
  - **Validates: Requirements 3.4**

- [ ]\* 2.2 Write property test for quick button addition
  - **Property 5: Quick Amount Button Addition**
  - **Validates: Requirements 3.7**

- [ ]\* 2.3 Write property test for EXACT button
  - **Property 6: EXACT Button Behavior**
  - **Validates: Requirements 3.5**

- [ ]\* 2.4 Write unit tests for CashCalculatorModal
  - Test subtotal display
  - Test amount given input
  - Test change calculation display
  - Test EXACT button functionality
  - Test quick amount buttons
  - Test numpad digit input
  - Test clear button
  - Test backspace button
  - Test continue callback
  - Test cancel callback
  - Test negative change warning display
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [x] 3. Refactor PaymentModal to CompleteSaleModal
  - Rename `components/PaymentModal.tsx` to `components/CompleteSaleModal.tsx`
  - Remove payment method selector (now passed as prop)
  - Add read-only payment method display with icon and color
  - Add calculator icon beside total for cash payments
  - Implement onRecalculate callback prop
  - Update prop interface to accept paymentMethod instead of selecting it
  - Simplify layout since payment method is pre-selected
  - Update all imports and references
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

- [ ]\* 3.1 Write unit tests for CompleteSaleModal
  - Test payment method display as read-only
  - Test calculator icon visibility for cash payments
  - Test calculator icon hidden for non-cash payments
  - Test recalculate callback
  - Test note input
  - Test print checkbox
  - Test confirm sale callback
  - Test cancel callback
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 5.7, 5.8, 5.9_

- [x] 4. Update Sales Page with Payment Method Selection
  - Add PaymentMethodSelector to sales page beside CustomerSelector
  - Add state for selectedPaymentMethod
  - Load default payment method on mount
  - Persist payment method selection during session
  - Update cart card layout to accommodate payment method selector
  - Style payment method selector consistently with customer selector
  - _Requirements: 1.1, 1.2, 1.5_

- [ ]\* 4.1 Write property test for payment method persistence
  - **Property 1: Payment Method Selection Persistence**
  - **Validates: Requirements 1.5**

- [x] 5. Implement Debt Payment Validation
  - Add validation in handleProcessSale function
  - Check if payment method is Debt and customer is not selected
  - Display error alert with message "Please select a customer for debt payment"
  - Implement highlightCustomerSelector function with pulse animation
  - Call highlight function when validation fails
  - Prevent proceeding to next step if validation fails
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]\* 5.1 Write property test for debt payment validation
  - **Property 2: Debt Payment Customer Validation**
  - **Validates: Requirements 2.2, 2.3, 2.4**

- [ ]\* 5.2 Write unit tests for debt validation
  - Test validation passes with customer selected
  - Test validation fails without customer
  - Test error message display
  - Test customer selector highlight
  - Test validation skipped for non-debt payments
  - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [x] 6. Implement Calculator Flow for Cash Payments
  - Add state for showCalculator and calculatorData
  - Modify handleProcessSale to check payment method
  - Show calculator modal if payment method is Cash
  - Implement handleCalculatorContinue callback
  - Store calculator data (amount given, change) in state
  - Close calculator and open complete sale modal after continue
  - _Requirements: 3.1, 3.11, 4.1_

- [ ]\* 6.1 Write property test for calculator display
  - **Property 3: Calculator Display for Cash Only**
  - **Validates: Requirements 3.1, 4.1, 4.2**

- [x] 7. Implement Direct Flow for Non-Cash Payments
  - Modify handleProcessSale to skip calculator for non-cash
  - Show complete sale modal directly for non-cash payments
  - Ensure calculator is not shown for KBZPay, WavePay, Card, Debt, etc.
  - _Requirements: 4.1, 4.2, 4.3_

- [ ]\* 7.1 Write property test for non-cash direct flow
  - **Property 10: Non-Cash Direct Flow**
  - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 8. Implement Recalculate Functionality
  - Add handleRecalculate function in sales page
  - Close complete sale modal when recalculate is triggered
  - Reopen calculator modal with previous values
  - Pass onRecalculate callback to CompleteSaleModal
  - Only show calculator icon for cash payments
  - _Requirements: 5.3, 5.4, 5.5_

- [ ]\* 8.1 Write property test for calculator icon visibility
  - **Property 9: Calculator Icon Visibility**
  - **Validates: Requirements 5.3**

- [x] 9. Implement State Reset After Sale Completion
  - Clear cart after successful sale
  - Clear selected customer after successful sale
  - Reset payment method to default after successful sale
  - Reset sale date/time selector if open
  - Ensure all state is properly cleaned up
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ]\* 9.1 Write property test for state reset
  - **Property 7: State Reset After Sale Completion**
  - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

- [x] 10. Implement State Persistence on Cancel
  - Ensure cart remains unchanged when calculator is cancelled
  - Ensure payment method remains unchanged when cancelled
  - Ensure customer remains unchanged when cancelled
  - Test cancel at each step of the flow
  - _Requirements: 7.5, 7.6, 7.7_

- [ ]\* 10.1 Write property test for state persistence on cancel
  - **Property 8: State Persistence on Cancel**
  - **Validates: Requirements 7.5, 7.6, 7.7**

- [x] 11. Add Localization Support
  - Add translation keys for calculator modal
  - Add translation keys for payment method selector
  - Add translation keys for error messages
  - Update English translations in `locales/en.ts`
  - Update Myanmar translations in `locales/my.ts`
  - Ensure currency formatting respects user settings
  - Test all text displays in both languages
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 12. Implement Error Handling and Validation
  - Add empty cart validation
  - Add insufficient amount warning in calculator
  - Handle payment method loading errors
  - Add input validation for calculator
  - Display clear error messages via toast or alert
  - Implement graceful fallbacks for errors
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [ ]\* 12.1 Write unit tests for error handling
  - Test empty cart error
  - Test missing customer for debt error
  - Test insufficient amount warning
  - Test payment method loading error
  - Test calculator input validation
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Add Accessibility Improvements
  - Ensure all buttons meet minimum touch target size (44x44 points)
  - Add accessibility labels to all interactive elements
  - Ensure sufficient color contrast for change display
  - Test with screen readers if possible
  - Add keyboard support for calculator where applicable
  - Implement proper focus management for modals
  - _Requirements: 9.6, 9.7_

- [ ] 15. Optimize Performance
  - Memoize calculator numpad buttons
  - Cache payment methods to avoid repeated loads
  - Use native driver for modal animations
  - Debounce calculator input if needed
  - Test performance on various devices
  - _Requirements: 8.7_

- [ ]\* 15.1 Write integration test for complete cash sale flow
  - Test full flow from cart to sale completion
  - Verify calculator appears for cash
  - Verify state reset after completion
  - _Requirements: 3.1, 3.11, 7.1, 7.2, 7.3_

- [ ]\* 15.2 Write integration test for complete debt sale flow
  - Test full flow with debt payment
  - Verify customer validation
  - Verify no calculator shown
  - Verify debt record creation
  - _Requirements: 2.2, 2.3, 2.4, 4.1, 4.2_

- [ ]\* 15.3 Write integration test for calculator recalculation
  - Test recalculate flow from complete sale modal
  - Verify calculator reopens with previous values
  - Verify updated values in complete sale modal
  - _Requirements: 5.3, 5.4, 5.5_

- [ ] 16. Final Testing and Refinement
  - Perform end-to-end testing of all flows
  - Test with various payment methods
  - Test error recovery scenarios
  - Verify localization in both languages
  - Test on different screen sizes
  - Gather user feedback and refine
  - _Requirements: All_

- [ ] 17. Documentation and Cleanup
  - Update component documentation
  - Add inline code comments where needed
  - Update user guide if applicable
  - Remove any debug code or console logs
  - Ensure code follows project style guidelines

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- Checkpoints ensure incremental validation
