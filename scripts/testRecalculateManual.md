# Manual Testing Guide: Recalculate Functionality

## Overview

This guide provides step-by-step instructions to manually test the recalculate functionality for cash payments in the sales flow.

## Prerequisites

- The app should be running
- You should have products in inventory
- You should be on the Sales page

## Test Case 1: Recalculate from Complete Sale Modal (Cash Payment)

### Steps:

1. **Add products to cart**
   - Click "Add Product" button
   - Select one or more products
   - Verify products appear in cart with correct prices

2. **Select Cash payment method**
   - Ensure "Cash" is selected in the Payment Method Selector
   - If not, click the selector and choose "Cash"

3. **Process Sale**
   - Click "Process Sale" button
   - **Expected:** Calculator modal should appear

4. **Enter amount in calculator**
   - Enter an amount (e.g., 100,000)
   - **Expected:** Change should be calculated automatically
   - Click "Continue"
   - **Expected:** Calculator closes, Complete Sale Modal opens

5. **Verify calculator icon is visible**
   - In the Complete Sale Modal, look at the Total Amount section
   - **Expected:** A calculator icon should be visible next to the total amount

6. **Click calculator icon to recalculate**
   - Click the calculator icon
   - **Expected:**
     - Complete Sale Modal closes
     - Calculator modal reopens
     - Previous amount (100,000) should still be displayed
     - Change should be recalculated based on the previous amount

7. **Modify amount**
   - Change the amount to a different value (e.g., 150,000)
   - **Expected:** Change updates in real-time
   - Click "Continue"
   - **Expected:**
     - Calculator closes
     - Complete Sale Modal reopens
     - Total amount is still displayed correctly

8. **Complete the sale**
   - Click "Confirm Sale"
   - **Expected:** Sale is processed successfully

## Test Case 2: Calculator Icon Not Shown for Non-Cash Payments

### Steps:

1. **Add products to cart**
   - Add one or more products to cart

2. **Select non-cash payment method**
   - Click Payment Method Selector
   - Select "KBZPay", "WavePay", "Card", or any non-cash method

3. **Process Sale**
   - Click "Process Sale" button
   - **Expected:**
     - Calculator modal should NOT appear
     - Complete Sale Modal opens directly

4. **Verify no calculator icon**
   - In the Complete Sale Modal, look at the Total Amount section
   - **Expected:** Calculator icon should NOT be visible

5. **Complete or cancel the sale**
   - Either complete the sale or cancel to return to sales page

## Test Case 3: Cancel During Recalculation

### Steps:

1. **Add products to cart and select Cash**
   - Add products and ensure Cash is selected

2. **Process Sale and enter amount**
   - Click "Process Sale"
   - Enter amount in calculator
   - Click "Continue"

3. **Open recalculate**
   - In Complete Sale Modal, click calculator icon
   - **Expected:** Calculator reopens with previous amount

4. **Cancel recalculation**
   - Click "Cancel" in calculator modal
   - **Expected:**
     - Calculator closes
     - Returns to sales page (not Complete Sale Modal)
     - Cart and payment method remain unchanged

## Test Case 4: Multiple Recalculations

### Steps:

1. **Add products to cart and select Cash**
   - Add products and ensure Cash is selected

2. **Process Sale**
   - Click "Process Sale"
   - Enter amount (e.g., 50,000)
   - Click "Continue"

3. **First recalculation**
   - Click calculator icon
   - Change amount to 100,000
   - Click "Continue"

4. **Second recalculation**
   - Click calculator icon again
   - **Expected:** Amount should be 100,000 (from previous recalculation)
   - Change amount to 150,000
   - Click "Continue"

5. **Third recalculation**
   - Click calculator icon again
   - **Expected:** Amount should be 150,000
   - Click "Continue" without changing

6. **Complete sale**
   - Click "Confirm Sale"
   - **Expected:** Sale completes successfully

## Expected Behavior Summary

### ✓ Correct Behavior:

- Calculator icon appears ONLY for cash payments in Complete Sale Modal
- Clicking calculator icon closes Complete Sale Modal and reopens Calculator
- Calculator reopens with the previously entered amount
- Change is recalculated based on the preserved amount
- User can modify the amount and continue back to Complete Sale Modal
- Multiple recalculations preserve the most recent amount
- Canceling calculator returns to sales page (not Complete Sale Modal)

### ✗ Incorrect Behavior:

- Calculator icon appears for non-cash payments
- Calculator resets to 0 when reopened
- Complete Sale Modal doesn't close when calculator icon is clicked
- Calculator doesn't reopen after clicking calculator icon
- Previous amount is not preserved

## Requirements Validated

This test validates the following requirements:

- **Requirement 5.3:** Calculator icon is displayed beside total for cash payments
- **Requirement 5.4:** Clicking calculator icon reopens the Calculator Modal
- **Requirement 5.5:** Complete Sale Modal remains open after returning from recalculation

## Notes

- The recalculate functionality is only available for cash payments
- The calculator preserves the last entered amount across recalculations
- The Complete Sale Modal does not automatically reopen after canceling recalculation
