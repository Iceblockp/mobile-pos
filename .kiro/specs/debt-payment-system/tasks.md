# Implementation Plan: Debt Payment System

## Overview

This implementation plan breaks down the debt payment system into discrete, manageable coding tasks. Each task builds incrementally on previous tasks, following the design document's minimal-change approach.

---

## Phase 1: Core Payment Method Setup

- [x] 1. Add "Debt" to default payment methods

  - Modify `services/paymentMethodService.ts` to include "Debt" in DEFAULT_METHODS array
  - Add debt payment method with id='debt', name='Debt', icon='FileText', color='#F59E0B'
  - Update removePaymentMethod to prevent removal of 'debt' (same as 'cash')
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Add debt-related localization strings
  - Add debt translations to `locales/en.ts` under new 'debt' section
  - Include: title, outstandingDebt, debtSales, customerRequiredForDebt, recordPayment, recordDebtPayment, selectPaymentMethod, paymentRecorded, owes, debtBalance, totalDebt, paidAmount, debtHistory, noDebtSales, customersWithDebt
  - Add corresponding Myanmar translations to `locales/my.ts`
  - _Requirements: All requirements for UI display_

---

## Phase 2: Payment Modal Customer Validation

- [ ] 3. Add customer validation for debt sales in PaymentModal

  - [x] 3.1 Update PaymentModalProps interface to include selectedCustomer prop

    - Add `selectedCustomer?: Customer | null` to PaymentModalProps in `components/PaymentModal.tsx`
    - _Requirements: 2.1, 2.3_

  - [x] 3.2 Implement debt payment validation logic

    - In handleConfirmSale function, check if selected payment method is 'debt'
    - If debt and no customer selected, show Alert with error message using t('debt.customerRequiredForDebt')
    - Return early to prevent sale completion
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Update Sales component to pass selectedCustomer to PaymentModal
    - Modify PaymentModal component usage in `app/(tabs)/sales.tsx`
    - Pass selectedCustomer prop to PaymentModal
    - _Requirements: 2.3_

---

## Phase 3: Database Debt Queries

- [ ] 4. Add debt calculation methods to DatabaseService

  - [x] 4.1 Implement getCustomerDebtBalance method

    - Add method to `services/database.ts`
    - Query: SELECT SUM(total) FROM sales WHERE customer_id = ? AND payment_method = 'Debt'
    - Return debt balance as number
    - _Requirements: 2.4, 7.1, 7.2, 7.3, 7.4_

  - [x] 4.2 Implement getCustomersWithDebt method

    - Add method to `services/database.ts`
    - Query with LEFT JOIN to calculate debt_balance and paid_amount per customer
    - Filter HAVING debt_balance > 0
    - Order by debt_balance DESC
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 4.3 Implement updateSalePaymentMethod method
    - Add method to `services/database.ts`
    - UPDATE sales SET payment_method = ? WHERE id = ?
    - Used for recording debt payments
    - _Requirements: 3.2, 3.3, 3.5_

---

## Phase 4: Sales History Enhancements

- [ ] 5. Add payment method filtering to Sales History

  - [x] 5.1 Add payment method filter state and UI

    - Add paymentMethodFilter state in `app/(tabs)/sales.tsx`
    - Add payment method filter dropdown/picker UI component
    - Include "All", "Cash", "Debt", and custom payment methods as options
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 5.2 Implement payment method filtering logic

    - Update filteredSales useMemo to filter by paymentMethodFilter
    - Filter sales where sale.payment_method matches selected filter
    - _Requirements: 6.2, 6.3_

  - [x] 5.3 Add "Record Payment" action for debt sales

    - Add conditional "Record Payment" button in sale detail modal
    - Show button only when selectedSale.payment_method === 'Debt'
    - Create handleRecordDebtPayment function
    - _Requirements: 3.1, 3.2_

  - [x] 5.4 Implement debt payment recording modal
    - Create payment method selector modal for recording debt payment
    - Show available payment methods (excluding "Debt")
    - On selection, call db.updateSalePaymentMethod with new payment method
    - Show success toast and refresh sales list
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

---

## Phase 5: Dashboard Debt Metrics

- [ ] 6. Add debt metrics card to Dashboard

  - [x] 6.1 Create debt metrics query hook

    - Add useQuery hook in `app/(tabs)/dashboard.tsx` for debt data
    - Query: SELECT COUNT(\*) as count, SUM(total) as total FROM sales WHERE payment_method = 'Debt' AND created_at BETWEEN ? AND ?
    - Use existing date range state
    - _Requirements: 4.1, 4.2, 4.4_

  - [x] 6.2 Add debt metrics card UI
    - Add new Card component displaying debt metrics
    - Show FileText icon with amber color (#F59E0B)
    - Display total outstanding debt amount
    - Display count of debt sales
    - Use formatPrice for currency formatting
    - _Requirements: 4.1, 4.2, 4.3_

---

## Phase 6: Customer Debt Display

- [ ] 7. Add debt balance indicators to customer components

  - [x] 7.1 Update CustomerCard to show debt balance

    - Modify `components/CustomerCard.tsx`
    - Add debt_balance calculation or prop
    - Display debt badge when debt_balance > 0
    - Show "Owes: {amount}" with amber/warning styling
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 7.2 Update CustomerSelector to indicate debt

    - Modify `components/CustomerSelector.tsx`
    - Show debt indicator icon or badge for customers with debt
    - Display debt amount in customer selection list
    - _Requirements: 7.3_

  - [x] 7.3 Add debt balance to customer detail page
    - Update `app/customer-detail.tsx`
    - Fetch customer debt balance using db.getCustomerDebtBalance
    - Display debt balance prominently in customer details
    - Show debt sales list filtered by customer
    - _Requirements: 7.1, 7.2, 7.4_

---

## Phase 7: Analytics Integration

- [ ] 8. Verify debt appears in payment analytics
  - Test that existing payment method analytics automatically include "Debt"
  - Verify payment method breakdown chart displays debt sales
  - Confirm payment method totals include debt transactions
  - No code changes needed - existing analytics queries group by payment_method
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

---

## Phase 8: Testing and Validation

- [ ] 9. Create validation script for debt payment system

  - [ ] 9.1 Create test script to validate debt functionality

    - Create `scripts/validateDebtPaymentSystem.ts`
    - Test debt payment method exists in default methods
    - Test customer validation for debt sales
    - Test debt balance calculations
    - Test payment method updates
    - _Requirements: All requirements_

  - [ ] 9.2 Test complete debt sale flow

    - Create sale with debt payment method and customer
    - Verify sale is recorded with payment_method = 'Debt'
    - Verify customer debt balance increases
    - Verify debt appears in dashboard metrics
    - _Requirements: 1.1, 2.1, 2.3, 2.4, 4.1, 4.2_

  - [ ] 9.3 Test debt payment recording flow
    - Find debt sale in sales history
    - Record payment with different payment method
    - Verify payment_method is updated in database
    - Verify customer debt balance decreases
    - Verify sale no longer appears in debt filter
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

---

## Phase 9: Final Integration and Polish

- [ ] 10. Final integration and testing

  - [ ] 10.1 Test all debt features end-to-end

    - Complete debt sale flow with customer
    - Filter sales by debt payment method
    - Record debt payment
    - Verify dashboard metrics update
    - Verify analytics include debt data
    - _Requirements: All requirements_

  - [ ] 10.2 Verify backward compatibility

    - Test existing sales data remains intact
    - Test custom payment methods still work
    - Test cash sales flow unchanged
    - Verify no breaking changes to existing features
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 10.3 Code cleanup and documentation
    - Remove any console.log statements
    - Add code comments for debt-specific logic
    - Update any relevant documentation
    - Verify TypeScript types are correct
    - _Requirements: 8.4, 8.5_

---

## Notes

- **No database migrations required** - uses existing tables and columns
- **Minimal code changes** - extends existing services and components
- **Backward compatible** - all existing functionality preserved
- **Simple implementation** - no complex state management or new tables
- Each task should be completed and tested before moving to the next
- Focus on one task at a time for clean, incremental progress
