# Design Document

## Overview

This design implements payment method analytics, customizable payment methods, and inventory value display using a simple and direct approach. The solution leverages existing patterns in the codebase while maintaining backward compatibility and following the established architecture.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Analytics     │    │  Payment Modal   │    │  Product List   │
│   Dashboard     │    │                  │    │                 │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │Payment Bar  │ │    │ │Payment Method│ │    │ │Inventory    │ │
│ │Chart        │ │    │ │Selector      │ │    │ │Value Display│ │
│ └─────────────┘ │    │ └──────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Database      │    │   AsyncStorage   │    │   React Query   │
│   (Sales Data)  │    │ (Payment Methods)│    │   (Products)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Component Integration

The design integrates with existing components:

- **Analytics.tsx**: Add payment method bar chart
- **PaymentModal.tsx**: Enhance with customizable payment methods
- **ProductsManager.tsx**: Add inventory value display
- **useQueries.ts**: Add payment analytics query
- **Charts.tsx**: Utilize existing bar chart component

## Components and Interfaces

### 1. Payment Method Bar Chart Component

**Location**: `components/PaymentMethodChart.tsx`

```typescript
interface PaymentMethodData {
  payment_method: string;
  total_amount: number;
  transaction_count: number;
}

interface PaymentMethodChartProps {
  startDate: Date;
  endDate: Date;
}
```

**Integration**: Embedded within Analytics.tsx overview tab, positioned after Daily Expenses Chart.

### 2. Payment Method Service

**Location**: `services/paymentMethodService.ts`

```typescript
interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
}

class PaymentMethodService {
  private static readonly STORAGE_KEY = '@payment_methods';
  private static readonly DEFAULT_METHODS: PaymentMethod[] = [
    {
      id: 'cash',
      name: 'Cash',
      icon: 'Banknote',
      color: '#10B981',
      isDefault: true,
    },
  ];

  static async getPaymentMethods(): Promise<PaymentMethod[]>;
  static async addPaymentMethod(
    method: Omit<PaymentMethod, 'id'>
  ): Promise<void>;
  static async removePaymentMethod(methodId: string): Promise<void>;
  static async getDefaultPaymentMethod(): Promise<PaymentMethod>;
}
```

### 3. Enhanced Payment Modal

**Modifications to**: `components/PaymentModal.tsx`

- Replace hardcoded payment methods with dynamic loading from PaymentMethodService
- Add payment method management interface (add/remove custom methods)
- Maintain cash as default selection
- Add simple modal for adding new payment methods

### 4. Inventory Value Display Component

**Location**: `components/InventoryValueDisplay.tsx`

```typescript
interface InventoryValueProps {
  products: Product[];
  isFiltered: boolean;
  filterDescription?: string;
}

interface InventoryValue {
  totalValue: number;
  totalProducts: number;
  averageValue: number;
}
```

**Integration**: Embedded within ProductsManager.tsx, positioned above the products count display.

## Data Models

### 1. Payment Analytics Query

**Addition to**: `hooks/useQueries.ts`

```typescript
export const usePaymentMethodAnalytics = (startDate: Date, endDate: Date) => {
  return useQuery({
    queryKey: ['paymentMethodAnalytics', startDate, endDate],
    queryFn: () =>
      databaseService.getPaymentMethodAnalytics(startDate, endDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

### 2. Database Query Method

**Addition to**: `services/database.ts`

```typescript
async getPaymentMethodAnalytics(startDate: Date, endDate: Date): Promise<PaymentMethodData[]> {
  const query = `
    SELECT
      payment_method,
      SUM(total) as total_amount,
      COUNT(*) as transaction_count
    FROM sales
    WHERE created_at BETWEEN ? AND ?
    GROUP BY payment_method
    ORDER BY total_amount DESC
  `;

  const result = await this.db.getAllAsync(query, [
    formatTimestampForDatabase(startDate),
    formatTimestampForDatabase(endDate)
  ]);

  return result as PaymentMethodData[];
}
```

### 3. AsyncStorage Data Structure

**Payment Methods Storage**:

```json
{
  "@payment_methods": [
    {
      "id": "cash",
      "name": "Cash",
      "icon": "Banknote",
      "color": "#10B981",
      "isDefault": true
    },
    {
      "id": "custom_1",
      "name": "Mobile Banking",
      "icon": "Smartphone",
      "color": "#8B5CF6",
      "isDefault": false
    }
  ]
}
```

## Error Handling

### 1. Payment Method Service Errors

- **Storage Failures**: Fallback to default cash method
- **Invalid Data**: Validate and sanitize payment method data
- **Migration**: Handle existing hardcoded payment methods gracefully

### 2. Analytics Query Errors

- **No Data**: Display "No payment data available" message
- **Database Errors**: Show error state with retry option
- **Date Range Issues**: Validate date ranges before querying

### 3. Inventory Calculation Errors

- **Invalid Product Data**: Skip products with invalid cost/quantity
- **Calculation Overflow**: Handle large inventory values appropriately
- **Performance**: Optimize for large product lists

## Testing Strategy

### 1. Unit Tests

**Payment Method Service Tests**:

- Test AsyncStorage operations (get, set, remove)
- Test default method initialization
- Test custom method validation
- Test error handling and fallbacks

**Analytics Query Tests**:

- Test database query with various date ranges
- Test empty result handling
- Test data transformation and formatting
- Test error scenarios

**Inventory Value Tests**:

- Test calculation accuracy with sample data
- Test filtering scenarios
- Test edge cases (zero products, invalid data)
- Test performance with large datasets

### 2. Integration Tests

**Payment Modal Integration**:

- Test payment method loading and display
- Test custom method addition/removal
- Test default selection behavior
- Test persistence across app restarts

**Analytics Dashboard Integration**:

- Test chart rendering with real data
- Test date filter integration
- Test responsive behavior
- Test error state handling

### 3. Component Tests

**Chart Component Tests**:

- Test bar chart rendering with payment data
- Test empty state display
- Test responsive design
- Test accessibility features

**Inventory Display Tests**:

- Test value calculation display
- Test filtering integration
- Test real-time updates
- Test formatting and localization

## Implementation Approach

### Phase 1: Payment Method Service

1. Create PaymentMethodService with AsyncStorage integration
2. Implement default cash method initialization
3. Add CRUD operations for custom payment methods
4. Add comprehensive error handling and validation

### Phase 2: Analytics Enhancement

1. Add payment method analytics database query
2. Create PaymentMethodChart component using existing Charts.tsx patterns
3. Integrate chart into Analytics.tsx overview tab
4. Add proper loading and error states

### Phase 3: Payment Modal Enhancement

1. Modify PaymentModal to use PaymentMethodService
2. Add custom payment method management interface
3. Ensure cash remains default selection
4. Test backward compatibility with existing sales

### Phase 4: Inventory Value Display

1. Create InventoryValueDisplay component
2. Implement real-time calculation logic
3. Integrate with ProductsManager filtering
4. Add proper formatting and localization

### Phase 5: Testing and Polish

1. Implement comprehensive test suite
2. Performance optimization for large datasets
3. Accessibility improvements
4. Documentation and code cleanup

## Performance Considerations

### 1. Database Queries

- Use indexed queries for payment method analytics
- Implement proper date range filtering
- Cache results using React Query

### 2. AsyncStorage Operations

- Minimize read/write operations
- Use batch operations where possible
- Implement proper error recovery

### 3. Inventory Calculations

- Use memoization for expensive calculations
- Implement virtual scrolling for large product lists
- Optimize re-renders with React.memo

### 4. Chart Rendering

- Use existing optimized chart components
- Implement proper data transformation
- Handle large datasets gracefully

## Security Considerations

### 1. Data Validation

- Validate all payment method inputs
- Sanitize user-provided payment method names
- Prevent injection attacks in custom method names

### 2. Storage Security

- Use secure AsyncStorage practices
- Validate data integrity on read operations
- Handle corrupted data gracefully

### 3. Database Security

- Use parameterized queries for analytics
- Validate date range inputs
- Prevent SQL injection in dynamic queries

## Backward Compatibility

### 1. Existing Sales Data

- Maintain compatibility with existing payment_method values
- Handle migration of hardcoded payment methods
- Preserve existing analytics functionality

### 2. API Compatibility

- Maintain existing PaymentModal interface
- Preserve existing analytics query structure
- Ensure existing components continue to work

### 3. Data Migration

- Gracefully handle users upgrading from hardcoded methods
- Preserve user preferences and settings
- Provide fallback mechanisms for data corruption
