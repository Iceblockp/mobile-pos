# Design Document: Debt Payment System

## Overview

This design implements debt payment functionality by extending the existing payment method system with minimal code changes. The approach leverages existing database tables, UI components, and patterns to add debt tracking and payment recording capabilities.

## Architecture

### High-Level Design Principles

1. **Extend, Don't Replace**: Add "Debt" to existing payment methods rather than creating new systems
2. **Reuse Existing Tables**: Use current `sales` and `customers` tables without schema changes
3. **Minimal UI Changes**: Add debt-specific UI elements only where necessary
4. **Simple State Management**: Track debt through existing customer and sales data

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Debt Payment System                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐      ┌──────────────────┐            │
│  │ Payment Method   │      │  Customer Debt   │            │
│  │    Service       │◄────►│    Tracking      │            │
│  └──────────────────┘      └──────────────────┘            │
│           │                          │                       │
│           ▼                          ▼                       │
│  ┌──────────────────┐      ┌──────────────────┐            │
│  │  Payment Modal   │      │  Sales History   │            │
│  │   (Extended)     │      │   (Extended)     │            │
│  └──────────────────┘      └──────────────────┘            │
│           │                          │                       │
│           └──────────┬───────────────┘                       │
│                      ▼                                       │
│           ┌──────────────────┐                              │
│           │  Database Layer  │                              │
│           │  (No Changes)    │                              │
│           └──────────────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Models

### Existing Tables (No Schema Changes Required)

#### Sales Table

```typescript
interface Sale {
  id: string;
  total: number;
  payment_method: string; // Will store "Debt" for debt sales
  note?: string;
  customer_id?: string; // Required for debt sales
  created_at: string;
}
```

#### Customers Table

```typescript
interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  total_spent: number; // Existing field - will track all sales
  visit_count: number;
  created_at: string;
  updated_at: string;
}
```

### New Computed Fields (No Database Changes)

```typescript
interface CustomerWithDebt extends Customer {
  debt_balance: number; // Computed: sum of sales where payment_method = 'Debt'
  paid_amount: number; // Computed: total_spent - debt_balance
}
```

## Component Design

### 1. Payment Method Service Extension

**File**: `services/paymentMethodService.ts`

**Changes**: Add "Debt" to default payment methods

```typescript
private static readonly DEFAULT_METHODS: PaymentMethod[] = [
  {
    id: 'cash',
    name: 'Cash',
    icon: 'Banknote',
    color: '#10B981',
    isDefault: true,
  },
  {
    id: 'debt',
    name: 'Debt',
    icon: 'FileText',  // Or 'Receipt' icon
    color: '#F59E0B',  // Amber/warning color
    isDefault: true,
  },
];
```

**Validation**: Prevent removal of both 'cash' and 'debt' default methods

```typescript
static async removePaymentMethod(methodId: string): Promise<void> {
  if (methodId === 'cash' || methodId === 'debt') {
    throw new Error('Cannot remove default payment methods');
  }
  // ... existing code
}
```

### 2. Payment Modal Enhancement

**File**: `components/PaymentModal.tsx`

**Changes**: Add customer validation for debt payments

```typescript
const handleConfirmSale = () => {
  const selectedMethod = paymentMethods.find(
    (method) => method.id === selectedPaymentMethod
  );

  // NEW: Validate customer for debt sales
  if (selectedMethod?.id === 'debt' && !selectedCustomer) {
    Alert.alert(t('common.error'), t('debt.customerRequiredForDebt'));
    return;
  }

  const methodName = selectedMethod ? selectedMethod.name : 'Cash';
  onConfirmSale(methodName, saleNote.trim(), shouldPrintReceipt);
};
```

**Props Update**: Add customer prop

```typescript
interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmSale: (
    paymentMethod: string,
    note: string,
    shouldPrint: boolean
  ) => void;
  total: number;
  loading: boolean;
  selectedCustomer?: Customer | null; // NEW
}
```

### 3. Database Service - Debt Queries

**File**: `services/database.ts`

**New Methods**: Add debt calculation queries (no schema changes)

```typescript
// Get customer's total debt balance
async getCustomerDebtBalance(customerId: string): Promise<number> {
  const result = await this.db.getFirstAsync(
    `SELECT COALESCE(SUM(total), 0) as debt_balance
     FROM sales
     WHERE customer_id = ? AND payment_method = 'Debt'`,
    [customerId]
  ) as { debt_balance: number };

  return result.debt_balance;
}

// Get all customers with debt
async getCustomersWithDebt(): Promise<CustomerWithDebt[]> {
  const customers = await this.db.getAllAsync(
    `SELECT
      c.*,
      COALESCE(SUM(CASE WHEN s.payment_method = 'Debt' THEN s.total ELSE 0 END), 0) as debt_balance,
      COALESCE(SUM(CASE WHEN s.payment_method != 'Debt' THEN s.total ELSE 0 END), 0) as paid_amount
     FROM customers c
     LEFT JOIN sales s ON c.id = s.customer_id
     GROUP BY c.id
     HAVING debt_balance > 0
     ORDER BY debt_balance DESC`
  ) as CustomerWithDebt[];

  return customers;
}

// Update sale payment method (for debt payment recording)
async updateSalePaymentMethod(
  saleId: string,
  newPaymentMethod: string
): Promise<void> {
  await this.db.runAsync(
    'UPDATE sales SET payment_method = ? WHERE id = ?',
    [newPaymentMethod, saleId]
  );
}
```

### 4. Sales History Enhancement

**File**: `app/(tabs)/sales.tsx`

**Changes**:

1. Add payment method filter
2. Add "Record Payment" action for debt sales
3. Show debt indicator on sale items

```typescript
// NEW: Payment method filter state
const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('All');

// NEW: Filter sales by payment method
const filteredSales = useMemo(() => {
  let filtered = sales;

  if (paymentMethodFilter !== 'All') {
    filtered = filtered.filter(
      (sale) => sale.payment_method === paymentMethodFilter
    );
  }

  // ... existing filters
  return filtered;
}, [sales, paymentMethodFilter /* other deps */]);

// NEW: Record debt payment handler
const handleRecordDebtPayment = async (sale: Sale) => {
  // Show payment method selector modal
  // Update sale payment method
  // Refresh sales list
};
```

**UI Addition**: Payment method filter dropdown

```typescript
<View style={styles.filterRow}>
  {/* Existing filters */}

  {/* NEW: Payment method filter */}
  <TouchableOpacity
    style={styles.filterButton}
    onPress={() => setShowPaymentMethodFilter(true)}
  >
    <Text>{paymentMethodFilter}</Text>
  </TouchableOpacity>
</View>
```

**UI Addition**: Debt payment action in sale detail

```typescript
{
  selectedSale?.payment_method === 'Debt' && (
    <TouchableOpacity
      style={styles.recordPaymentButton}
      onPress={() => handleRecordDebtPayment(selectedSale)}
    >
      <Text>{t('debt.recordPayment')}</Text>
    </TouchableOpacity>
  );
}
```

### 5. Dashboard Debt Metrics

**File**: `app/(tabs)/dashboard.tsx`

**Changes**: Add debt metrics card

```typescript
// NEW: Fetch debt data
const { data: debtData } = useQuery({
  queryKey: ['debtMetrics', dateRange],
  queryFn: async () => {
    const debtSales = await db.getAllAsync(
      `SELECT COUNT(*) as count, SUM(total) as total
       FROM sales
       WHERE payment_method = 'Debt'
       AND created_at BETWEEN ? AND ?`,
      [startDate, endDate]
    );
    return debtSales[0];
  },
});

// NEW: Debt metrics card
<Card style={styles.metricCard}>
  <View style={styles.metricHeader}>
    <FileText size={20} color="#F59E0B" />
    <Text style={styles.metricTitle}>{t('debt.outstandingDebt')}</Text>
  </View>
  <Text style={styles.metricValue}>{formatPrice(debtData?.total || 0)}</Text>
  <Text style={styles.metricSubtitle}>
    {debtData?.count || 0} {t('debt.debtSales')}
  </Text>
</Card>;
```

### 6. Analytics Page Enhancement

**File**: `components/Analytics.tsx`

**Changes**: Include debt in payment method breakdown

The existing payment analytics query already groups by payment_method, so debt sales will automatically appear in the chart once "Debt" is used as a payment method. No code changes needed - just ensure the chart displays all payment methods including "Debt".

### 7. Customer Components Enhancement

**File**: `components/CustomerSelector.tsx`, `components/CustomerCard.tsx`

**Changes**: Show debt indicator

```typescript
// In CustomerCard
{
  customer.debt_balance > 0 && (
    <View style={styles.debtBadge}>
      <Text style={styles.debtText}>
        {t('debt.owes')}: {formatPrice(customer.debt_balance)}
      </Text>
    </View>
  );
}
```

## User Interface Flow

### Debt Sale Flow

```
1. User adds products to cart
2. User clicks "Process Sale"
3. Payment Modal opens
4. User selects "Debt" payment method
   ├─ If no customer selected → Show error "Customer required for debt sales"
   └─ If customer selected → Continue
5. User confirms sale
6. Sale recorded with payment_method = "Debt"
7. Customer's debt balance increases (computed on query)
```

### Debt Payment Recording Flow

```
1. User opens Sales History
2. User filters by "Debt" payment method (optional)
3. User selects a debt sale
4. User clicks "Record Payment" button
5. Payment method selector modal opens
6. User selects actual payment method (Cash, Card, etc.)
7. Sale's payment_method updated from "Debt" to selected method
8. Customer's debt balance decreases (computed on query)
9. Sales list refreshes
```

## Localization

**File**: `locales/en.ts`

**New Translations**:

```typescript
debt: {
  title: 'Debt Management',
  outstandingDebt: 'Outstanding Debt',
  debtSales: 'Debt Sales',
  customerRequiredForDebt: 'Please select a customer for debt sales',
  recordPayment: 'Record Payment',
  recordDebtPayment: 'Record Debt Payment',
  selectPaymentMethod: 'Select payment method used',
  paymentRecorded: 'Debt payment recorded successfully',
  owes: 'Owes',
  debtBalance: 'Debt Balance',
  totalDebt: 'Total Debt',
  paidAmount: 'Paid Amount',
  debtHistory: 'Debt History',
  noDebtSales: 'No debt sales found',
  customersWithDebt: 'Customers with Debt',
},
```

## Implementation Strategy

### Phase 1: Core Debt Functionality

1. Add "Debt" to default payment methods
2. Add customer validation in PaymentModal
3. Add debt calculation queries to DatabaseService

### Phase 2: UI Enhancements

1. Add payment method filter to Sales History
2. Add "Record Payment" action for debt sales
3. Add debt indicator to customer components

### Phase 3: Analytics Integration

1. Add debt metrics to Dashboard
2. Verify debt appears in Analytics payment breakdown
3. Add debt balance display to customer details

## Testing Considerations

### Unit Tests

- PaymentMethodService: Verify "Debt" is in default methods
- PaymentMethodService: Verify debt cannot be removed
- DatabaseService: Test debt balance calculations
- DatabaseService: Test payment method updates

### Integration Tests

- Complete debt sale flow with customer
- Record debt payment flow
- Customer debt balance updates correctly
- Dashboard debt metrics display correctly

### Edge Cases

- Attempting debt sale without customer
- Updating payment method for non-debt sale
- Customer with multiple debt sales
- Customer with mixed debt and paid sales

## Migration Strategy

**No database migration required** - this feature uses existing tables and columns.

### Backward Compatibility

1. **Existing Sales**: All existing sales remain unchanged
2. **Existing Customers**: Customer data structure unchanged
3. **Existing Payment Methods**: Custom payment methods continue to work
4. **Analytics**: Existing analytics queries work with new "Debt" payment method

### Data Integrity

- Debt sales MUST have customer_id (enforced in UI, not database)
- Payment method updates only allowed for debt sales (business logic)
- Debt balance is always computed, never stored (prevents inconsistency)

## Performance Considerations

### Query Optimization

1. **Debt Balance Calculation**: Uses indexed `customer_id` and `payment_method` fields
2. **Payment Method Filter**: Uses existing `payment_method` index
3. **Dashboard Metrics**: Simple aggregation query with date range index

### Caching Strategy

- Customer debt balances computed on-demand (no caching needed for accuracy)
- Dashboard metrics use existing query caching from React Query
- Sales list uses existing infinite scroll pagination

## Security Considerations

1. **Customer Privacy**: Debt information only visible to shop owner
2. **Payment Updates**: Only debt sales can have payment method updated
3. **Validation**: Customer requirement enforced in UI and business logic
4. **Audit Trail**: Original sale record preserved, only payment_method updated

## Future Enhancements (Out of Scope)

- Partial debt payments
- Debt payment reminders
- Debt aging reports
- Interest calculations
- Payment plans
- SMS/Email notifications for debt
- Debt payment history log (separate table)

## Summary

This design implements debt payment functionality with **minimal code changes**:

- ✅ No database schema changes
- ✅ Extends existing PaymentMethodService
- ✅ Reuses existing UI components
- ✅ Simple computed debt balances
- ✅ Leverages existing analytics infrastructure
- ✅ Maintains backward compatibility
- ✅ Clean, maintainable code

The implementation focuses on simplicity and reusability, avoiding complex abstractions while providing complete debt management functionality.
