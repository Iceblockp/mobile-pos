# Design Document

## Overview

This design implements a simple date/time modification feature for the sales interface. The solution adds a small, clickable time display to the shopping cart area that allows users to optionally modify the sale creation timestamp. The implementation focuses on simplicity and minimal impact on the existing sales workflow.

## Architecture

### Component Structure

- **SaleDateTimeSelector**: A new reusable component for displaying and modifying sale timestamps
- **Modified Sales Interface**: Updated sales.tsx to include the date/time selector
- **Updated Database Service**: Modified addSale method to accept optional created_at parameter

### Data Flow

1. Sales interface initializes with current timestamp
2. User optionally modifies timestamp via date/time picker
3. When sale is processed, the selected timestamp is passed to the database
4. Database uses provided timestamp or defaults to current time

## Components and Interfaces

### SaleDateTimeSelector Component

```typescript
interface SaleDateTimeSelectorProps {
  selectedDateTime: Date;
  onDateTimeChange: (date: Date) => void;
  style?: ViewStyle;
}
```

**Features:**

- Displays current date/time in compact format
- Opens native date/time picker on tap
- Handles both date and time selection
- Supports localization through existing translation system

### Modified Sales Interface

**Changes to sales.tsx:**

- Add state for selected sale date/time
- Include SaleDateTimeSelector in cart area
- Pass selected timestamp to processSale function
- Reset timestamp to current time when cart is cleared

### Database Service Updates

**Modified addSale method signature:**

```typescript
async addSale(
  sale: Omit<Sale, 'id' | 'created_at'> & { created_at?: string },
  items: Omit<SaleItem, 'id' | 'sale_id'>[]
): Promise<string>
```

**Changes:**

- Accept optional created_at parameter in sale object
- Use provided timestamp or default to current time
- Ensure timestamp is properly formatted for SQLite storage

## Data Models

### Sale Interface Update

```typescript
// No changes needed to Sale interface - created_at already exists
export interface Sale {
  id: string;
  total: number;
  payment_method: string;
  note?: string;
  customer_id?: string;
  customer_name?: string;
  created_at: string; // Already exists
}
```

### Component State

```typescript
// New state in sales.tsx
const [saleDateTime, setSaleDateTime] = useState<Date>(new Date());
```

## Error Handling

### Date/Time Validation

- No validation needed - any date/time selection is acceptable
- Invalid dates handled by native date picker component
- Fallback to current time if timestamp conversion fails

### Database Error Handling

- Existing error handling in addSale method covers timestamp issues
- Transaction rollback ensures data consistency if timestamp insertion fails

## Testing Strategy

### Unit Tests

- Test SaleDateTimeSelector component rendering and interaction
- Test date/time formatting and conversion functions
- Test database addSale method with custom timestamps

### Integration Tests

- Test complete sales flow with modified timestamps
- Test sales flow with default timestamps (unchanged behavior)
- Test timestamp display and modification in sales interface

### User Acceptance Tests

- Verify time display appears correctly in sales interface
- Verify date/time picker opens and functions properly
- Verify sales are created with correct timestamps
- Verify normal sales workflow remains unchanged

## Implementation Notes

### Positioning

- Place SaleDateTimeSelector in the cart header area, near the total
- Use subtle styling to indicate it's interactive but not prominent
- Ensure it doesn't interfere with existing cart functionality

### Styling

- Small, compact display using existing design system colors
- Light gray text to indicate secondary importance
- Subtle tap indication (opacity change or similar)

### Localization

- Use existing translation system for date/time formatting
- Leverage React Native's built-in localization for date picker
- Support both English and Myanmar language formats

### Performance

- Minimal impact - only adds one small component and state variable
- Date/time picker is native component (no performance concerns)
- Database change is minimal (optional parameter handling)
