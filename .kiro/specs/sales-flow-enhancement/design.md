# Design Document: Sales Flow Enhancement

## Overview

This design document outlines the technical implementation for enhancing the sales flow in the POS system. The enhancement moves payment method selection to the main sales page, introduces a calculator modal for cash payments, implements smart validation for debt payments, and refactors the payment completion flow for better user experience.

## Architecture

### Component Hierarchy

```
Sales Page
├── Payment Method Selector (NEW)
│   ├── Dropdown Button
│   ├── Payment Method Picker Modal
│   └── Management Icon
├── Customer Selector (EXISTING)
├── Cart Display (EXISTING)
└── Process Sale Button (EXISTING)

Process Sale Flow
├── Validation Layer (ENHANCED)
│   ├── Debt Payment Validator
│   └── Cart Validator
├── Calculator Modal (NEW - Cash only)
│   ├── Display Area
│   │   ├── Subtotal Display
│   │   ├── Amount Given Input
│   │   └── Change Display
│   ├── Quick Amount Buttons
│   │   ├── EXACT Button
│   │   └── Denomination Buttons
│   ├── Numeric Keypad
│   └── Action Buttons
└── Complete Sale Modal (REFACTORED)
    ├── Payment Method Display (read-only)
    ├── Total Amount Display
    ├── Calculator Icon (Cash only)
    ├── Note Input
    ├── Print Checkbox
    └── Action Buttons
```

## Components and Interfaces

### 1. PaymentMethodSelector Component

**Location:** `components/PaymentMethodSelector.tsx`

**Props Interface:**

```typescript
interface PaymentMethodSelectorProps {
  selectedPaymentMethod: PaymentMethod | null;
  onPaymentMethodSelect: (method: PaymentMethod) => void;
  disabled?: boolean;
  style?: ViewStyle;
}
```

**State:**

```typescript
interface PaymentMethodSelectorState {
  showPicker: boolean;
  showManagement: boolean;
  paymentMethods: PaymentMethod[];
  loading: boolean;
}
```

**Functionality:**

- Displays selected payment method with icon and color
- Opens picker modal on click
- Loads payment methods from PaymentMethodService
- Provides access to payment method management
- Similar UI pattern to CustomerSelector for consistency

### 2. CashCalculatorModal Component

**Location:** `components/CashCalculatorModal.tsx`

**Props Interface:**

```typescript
interface CashCalculatorModalProps {
  visible: boolean;
  subtotal: number;
  onContinue: (amountGiven: number, change: number) => void;
  onCancel: () => void;
}
```

**State:**

```typescript
interface CashCalculatorState {
  amountGiven: string; // String for input handling
  change: number;
  displayValue: string; // For numpad display
}
```

**Layout Structure:**

```
┌─────────────────────────────────┐
│  Cash Payment Calculator        │
├─────────────────────────────────┤
│  Subtotal:        50,000 MMK    │
│  Amount Given:    [100,000] MMK │
│  Change:          50,000 MMK    │
├─────────────────────────────────┤
│  [EXACT]  [1K]  [5K]  [10K]    │
│  [50K]    [100K]                │
├─────────────────────────────────┤
│  [7] [8] [9]     [Clear]        │
│  [4] [5] [6]     [⌫]            │
│  [1] [2] [3]                    │
│  [0] [00] [000]                 │
├─────────────────────────────────┤
│  [Cancel]      [Continue]       │
└─────────────────────────────────┘
```

**Key Features:**

- Real-time change calculation
- EXACT button sets amount = subtotal
- Quick buttons ADD to current amount (not replace)
- Numpad for precise input
- Clear and backspace functionality
- Visual feedback for negative change (warning color)
- Large, touch-friendly buttons (minimum 48x48 dp)

### 3. CompleteSaleModal Component (Refactored)

**Location:** `components/CompleteSaleModal.tsx` (renamed from PaymentModal)

**Props Interface:**

```typescript
interface CompleteSaleModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmSale: (note: string, shouldPrint: boolean) => void;
  total: number;
  paymentMethod: PaymentMethod; // Now passed in, not selected here
  selectedCustomer?: Customer | null;
  loading: boolean;
  onRecalculate?: () => void; // For cash payments only
}
```

**Changes from Current PaymentModal:**

- Remove payment method selector (now read-only display)
- Add calculator icon for cash payments
- Simplify layout since payment method is pre-selected
- Add onRecalculate callback for reopening calculator

### 4. Enhanced Sales Page

**Location:** `app/(tabs)/sales.tsx`

**New State Variables:**

```typescript
const [selectedPaymentMethod, setSelectedPaymentMethod] =
  useState<PaymentMethod | null>(null);
const [showCalculator, setShowCalculator] = useState(false);
const [calculatorData, setCalculatorData] = useState<{
  amountGiven: number;
  change: number;
} | null>(null);
```

**Modified Flow:**

```typescript
const handleProcessSale = () => {
  // 1. Validate cart
  if (cart.length === 0) {
    Alert.alert(t('common.error'), t('sales.cartIsEmpty'));
    return;
  }

  // 2. Validate customer for debt payments
  if (selectedPaymentMethod?.id === 'debt' && !selectedCustomer) {
    Alert.alert(t('common.error'), t('debt.customerRequiredForDebt'));
    // Briefly highlight customer selector
    highlightCustomerSelector();
    return;
  }

  // 3. Show calculator for cash payments
  if (selectedPaymentMethod?.id === 'cash') {
    setShowCalculator(true);
    return;
  }

  // 4. Show complete sale modal for non-cash payments
  setShowCompleteSaleModal(true);
};

const handleCalculatorContinue = (amountGiven: number, change: number) => {
  setCalculatorData({ amountGiven, change });
  setShowCalculator(false);
  setShowCompleteSaleModal(true);
};

const handleRecalculate = () => {
  setShowCompleteSaleModal(false);
  setShowCalculator(true);
};
```

## Data Models

### PaymentMethod Interface (Existing)

```typescript
interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  isActive: boolean;
}
```

### CalculatorData Interface (New)

```typescript
interface CalculatorData {
  amountGiven: number;
  change: number;
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Payment Method Selection Persistence

_For any_ sales session, when a payment method is selected, that selection should persist until the sale is completed or explicitly changed by the user.
**Validates: Requirements 1.5**

### Property 2: Debt Payment Customer Validation

_For any_ sale attempt with Debt payment method, the system should prevent proceeding if no customer is selected.
**Validates: Requirements 2.2, 2.3, 2.4**

### Property 3: Calculator Display for Cash Only

_For any_ sale with Cash payment method, the calculator modal should be displayed before the complete sale modal.
**Validates: Requirements 3.1, 4.1, 4.2**

### Property 4: Change Calculation Accuracy

_For any_ amount given and subtotal, the calculated change should equal (amount given - subtotal).
**Validates: Requirements 3.4**

### Property 5: Quick Amount Button Addition

_For any_ quick amount button click, the amount given should increase by the button's value (not replace the current value).
**Validates: Requirements 3.7**

### Property 6: EXACT Button Behavior

_For any_ subtotal value, clicking the EXACT button should set amount given equal to the subtotal.
**Validates: Requirements 3.5**

### Property 7: State Reset After Sale Completion

_For any_ successfully completed sale, the cart, customer selection, and payment method should all be reset to their default states.
**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

### Property 8: State Persistence on Cancel

_For any_ cancelled operation (calculator or complete sale modal), the cart, customer, and payment method selections should remain unchanged.
**Validates: Requirements 7.5, 7.6, 7.7**

### Property 9: Calculator Icon Visibility

_For any_ complete sale modal with Cash payment method, a calculator icon should be visible beside the total amount.
**Validates: Requirements 5.3**

### Property 10: Non-Cash Direct Flow

_For any_ non-Cash payment method, clicking "Process Sale" should skip the calculator and show the complete sale modal directly.
**Validates: Requirements 4.1, 4.2, 4.3**

## Error Handling

### Validation Errors

1. **Empty Cart Error**
   - Trigger: User clicks "Process Sale" with empty cart
   - Response: Show alert with message "Cart is empty"
   - Recovery: User adds products to cart

2. **Missing Customer for Debt Error**
   - Trigger: User clicks "Process Sale" with Debt payment and no customer
   - Response: Show alert with message "Please select a customer for debt payment"
   - Visual Feedback: Briefly highlight customer selector (pulse animation)
   - Recovery: User selects a customer

3. **Insufficient Amount Given Warning**
   - Trigger: Amount given < subtotal in calculator
   - Response: Display change in red/warning color
   - Behavior: Allow proceeding (cashier may have reason)
   - Recovery: User adjusts amount or proceeds anyway

### Component Errors

1. **Payment Method Loading Error**
   - Trigger: Failed to load payment methods from service
   - Response: Show error toast, use fallback default methods
   - Recovery: Retry loading or use cached methods

2. **Calculator Input Error**
   - Trigger: Invalid numeric input
   - Response: Ignore invalid characters, show only valid numbers
   - Recovery: Automatic - only valid input accepted

## Testing Strategy

### Unit Tests

**PaymentMethodSelector Tests:**

- Renders with default payment method
- Opens picker modal on click
- Selects payment method correctly
- Opens management modal
- Handles loading states

**CashCalculatorModal Tests:**

- Displays subtotal correctly
- Calculates change accurately
- EXACT button sets amount = subtotal
- Quick buttons add to current amount
- Numpad updates amount given
- Clear button resets input
- Backspace removes last digit
- Continue button calls callback with correct values
- Cancel button closes modal without changes

**CompleteSaleModal Tests:**

- Displays payment method as read-only
- Shows calculator icon for cash payments only
- Hides calculator icon for non-cash payments
- Recalculate button reopens calculator
- Confirm button processes sale
- Cancel button closes without processing

**Sales Page Flow Tests:**

- Validates empty cart
- Validates debt payment without customer
- Shows calculator for cash payments
- Skips calculator for non-cash payments
- Resets state after successful sale
- Preserves state on cancel

### Property-Based Tests

**Property Test 1: Change Calculation**

```typescript
// For any subtotal and amount given, change = amountGiven - subtotal
test('change calculation is always accurate', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 1000000 }), // subtotal
      fc.integer({ min: 0, max: 2000000 }), // amountGiven
      (subtotal, amountGiven) => {
        const change = calculateChange(amountGiven, subtotal);
        expect(change).toBe(amountGiven - subtotal);
      },
    ),
    { numRuns: 100 },
  );
});
```

**Property Test 2: Quick Button Addition**

```typescript
// For any current amount and button value, result = current + button
test('quick buttons always add to current amount', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 1000000 }), // currentAmount
      fc.constantFrom(1000, 5000, 10000, 50000, 100000), // buttonValue
      (currentAmount, buttonValue) => {
        const result = addQuickAmount(currentAmount, buttonValue);
        expect(result).toBe(currentAmount + buttonValue);
      },
    ),
    { numRuns: 100 },
  );
});
```

**Property Test 3: State Reset After Sale**

```typescript
// For any sale completion, state should reset to defaults
test('state resets after successful sale', () => {
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          /* cart item */
        }),
      ), // cart
      fc.record({
        /* customer */
      }), // customer
      fc.record({
        /* payment method */
      }), // paymentMethod
      (cart, customer, paymentMethod) => {
        const initialState = { cart, customer, paymentMethod };
        const finalState = completeSaleAndReset(initialState);

        expect(finalState.cart).toEqual([]);
        expect(finalState.customer).toBeNull();
        expect(finalState.paymentMethod).toEqual(getDefaultPaymentMethod());
      },
    ),
    { numRuns: 100 },
  );
});
```

### Integration Tests

1. **Complete Cash Sale Flow**
   - Add products to cart
   - Select cash payment method
   - Select customer (optional)
   - Click "Process Sale"
   - Verify calculator modal appears
   - Enter amount given
   - Click continue
   - Verify complete sale modal appears
   - Add note and select print
   - Confirm sale
   - Verify sale is processed
   - Verify state is reset

2. **Complete Debt Sale Flow**
   - Add products to cart
   - Select debt payment method
   - Attempt to process without customer
   - Verify error message
   - Select customer
   - Click "Process Sale"
   - Verify complete sale modal appears (no calculator)
   - Confirm sale
   - Verify debt record is created

3. **Calculator Recalculation Flow**
   - Process cash sale through calculator
   - In complete sale modal, click calculator icon
   - Verify calculator reopens with previous values
   - Modify amount
   - Continue
   - Verify complete sale modal shows updated values

### E2E Tests

1. **Multi-Payment Method Workflow**
   - Complete sales with different payment methods
   - Verify correct flow for each (calculator vs direct)
   - Verify all sales are recorded correctly

2. **Error Recovery Workflow**
   - Trigger validation errors
   - Verify error messages
   - Recover and complete sale successfully

## Implementation Notes

### Calculator Numpad Implementation

Use a grid layout for the numpad:

```typescript
const numpadButtons = [
  ['7', '8', '9', 'Clear'],
  ['4', '5', '6', 'Backspace'],
  ['1', '2', '3', ''],
  ['0', '00', '000', ''],
];
```

### Quick Amount Buttons

Configurable amounts based on currency:

```typescript
const quickAmounts = [1000, 5000, 10000, 50000, 100000];
// Could be made configurable per shop
```

### Payment Method Icon Mapping

Reuse existing icon mapping from PaymentMethodService:

```typescript
const iconMap = {
  Banknote: Banknote,
  CreditCard: CreditCard,
  Smartphone: Smartphone,
  // ... etc
};
```

### Highlighting Customer Selector

Use a brief pulse animation:

```typescript
const highlightCustomerSelector = () => {
  Animated.sequence([
    Animated.timing(opacity, { toValue: 0.5, duration: 200 }),
    Animated.timing(opacity, { toValue: 1, duration: 200 }),
    Animated.timing(opacity, { toValue: 0.5, duration: 200 }),
    Animated.timing(opacity, { toValue: 1, duration: 200 }),
  ]).start();
};
```

### Localization Keys

New translation keys needed:

```typescript
{
  'calculator.title': 'Cash Payment Calculator',
  'calculator.subtotal': 'Subtotal',
  'calculator.amountGiven': 'Amount Given',
  'calculator.change': 'Change',
  'calculator.exact': 'EXACT',
  'calculator.clear': 'Clear',
  'calculator.continue': 'Continue',
  'calculator.insufficientAmount': 'Amount is less than subtotal',
  'sales.selectPaymentMethod': 'Select Payment Method',
  'sales.paymentMethod': 'Payment Method',
  'sales.recalculate': 'Recalculate',
}
```

## Performance Considerations

1. **Payment Method Loading**: Cache payment methods to avoid repeated API calls
2. **Calculator Rendering**: Use React.memo for numpad buttons to prevent unnecessary re-renders
3. **State Updates**: Debounce calculator input updates if needed for performance
4. **Modal Animations**: Use native driver for smooth animations

## Accessibility

1. **Touch Targets**: All buttons minimum 44x44 points (iOS) / 48x48 dp (Android)
2. **Color Contrast**: Ensure sufficient contrast for change display (especially negative values)
3. **Screen Readers**: Add accessibility labels to all interactive elements
4. **Keyboard Support**: Support hardware keyboard input in calculator where applicable
5. **Focus Management**: Proper focus handling when modals open/close

## Migration Strategy

1. **Phase 1**: Create new components (PaymentMethodSelector, CashCalculatorModal)
2. **Phase 2**: Refactor PaymentModal to CompleteSaleModal
3. **Phase 3**: Update Sales page to use new flow
4. **Phase 4**: Add validation and error handling
5. **Phase 5**: Testing and refinement
6. **Phase 6**: Localization and accessibility improvements

## Backward Compatibility

- Existing sales data structure remains unchanged
- Payment method service API remains unchanged
- Customer selector component remains unchanged
- Only UI flow changes, no database schema changes required
