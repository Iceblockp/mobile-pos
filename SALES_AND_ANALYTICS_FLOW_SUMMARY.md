# Sales Page & Analytics Flow - Project Summary

## Overview

This document provides a comprehensive understanding of the sales page flow and analytics system in your React Native/Expo application.

---

## 1. SALES PAGE FLOW (`app/(tabs)/sales.tsx`)

### A. Main Components & State Management

#### Cart Management

- **Cart State**: Array of `CartItem` objects containing:
  - `product`: Product details
  - `quantity`: Number of items
  - `discount`: Manual discount amount
  - `subtotal`: Final price after discounts

#### Key Features

1. **Product Selection**
   - Modal dialog with search functionality
   - Category filtering with product counts
   - Infinite scroll for product list
   - Real-time stock status display
   - Bulk pricing indicators

2. **Barcode Scanning**
   - Integrated barcode scanner
   - Continuous scanning mode option
   - Auto-add products to cart
   - Fallback to search if product not found

3. **Cart Operations**
   - Add/remove products
   - Quantity adjustment with stock validation
   - Manual discount per item
   - Bulk pricing calculation
   - Real-time total calculation

### B. Payment Flow

#### Step 1: Pre-Payment Setup

- **Customer Selection** (optional, required for debt payments)
  - CustomerSelector component
  - Animated highlighting for debt validation
- **Payment Method Selection**
  - PaymentMethodSelector component
  - Default payment method loaded on mount
  - Supports: Cash, Card, Mobile Payment, Debt, Custom methods
  - Managed via PaymentMethodService

- **Date/Time Selection** (optional)
  - SaleDateTimeSelector component
  - Allows backdating sales
  - Defaults to current time

#### Step 2: Payment Processing

**For CASH Payments:**

1. Click "Process Sale" → Opens `CashCalculatorModal`
2. Calculator features:
   - Numeric keypad
   - Quick amount buttons (1K, 5K, 10K, 50K, 100K)
   - EXACT button (sets amount to subtotal)
   - Real-time change calculation
   - Validation for insufficient amount
3. Click "Continue" → Opens `CompleteSaleModal` with calculator data
4. Option to "Recalculate" returns to calculator

**For NON-CASH Payments:**

1. Click "Process Sale" → Opens `CompleteSaleModal` directly
2. No calculator needed

#### Step 3: Complete Sale Modal

- Displays selected payment method (read-only when pre-selected)
- Shows total amount
- Optional sale note input
- Print receipt checkbox
- Recalculate button (cash only)
- Confirm/Cancel actions

#### Step 4: Sale Processing

```typescript
processSale(paymentMethod, note, shouldPrint);
```

- Creates sale record with:
  - Total (after all discounts)
  - Payment method
  - Customer ID (if selected)
  - Sale note
  - Custom timestamp (if set)
- Creates sale items with:
  - Product ID, quantity
  - Bulk unit price
  - Original price
  - Bulk discount amount
  - Manual discount amount
  - Cost price
  - Final subtotal
- Updates product inventory
- Optionally prints receipt
- Clears cart and resets state

### C. Discount System

#### Two-Layer Discount Model:

1. **Bulk Pricing Discounts** (automatic)
   - Configured per product
   - Applied based on quantity thresholds
   - Calculated via `calculateCartTotalWithBulkPricing()`

2. **Manual Discounts** (per item)
   - User-entered discount amount
   - Applied after bulk pricing
   - Validated against bulk price (not original price)

#### Calculation Flow:

```
Original Price × Quantity = Original Total
Original Total - Bulk Discount = Bulk Price
Bulk Price - Manual Discount = Final Subtotal
```

### D. Sales History

#### Features:

- **Filtering**:
  - Date filters: All, Today, This Month, Select Month, Custom Date
  - Payment method filter
  - Search by Sale ID
- **Display**:
  - Infinite scroll list
  - Sale summary (count + total)
  - Sale details modal
- **Export Options**:
  1. **Sales List**: Summary of all sales
  2. **Sales Items Data**: Detailed item-level data
  - Both export to Excel (.xlsx)
  - Includes summary statistics
  - Descriptive filenames with date ranges

- **Sale Detail View**:
  - Full sale information
  - Item breakdown
  - Print receipt option
  - Export as image
  - Delete sale option
  - Record debt payment (for debt sales)

---

## 2. ANALYTICS SYSTEM

### A. Analytics Page (`components/Analytics.tsx`)

#### Tab Structure:

1. **Overview Tab** (default)
2. **Customers Tab**
3. **AI Analytics Tab**

#### Overview Tab Components:

##### 1. Date Filter

- Modes: Day, Month, Year
- Custom date selection
- Period statistics display

##### 2. Key Metrics (6 Cards)

- **Total Sale Value**: Total revenue
- **Total Expenses**: Sum of all expenses
- **Total Balance**: Revenue - Expenses
- **Total Sale Profit**: Gross profit from sales
- **Net Profit**: Sale profit - Expenses
- **Total Sale Count**: Number of sales

##### 3. Charts

- **Daily Sales Chart**: Sales trend over time
- **Daily Expenses Chart**: Expense trend over time
- **Payment Methods Analytics**: Bar chart by payment method
- **Expense Breakdown**: Pie chart by category

##### 4. Top Performing Products

- Ranked list showing:
  - Product name
  - Units sold
  - Revenue
  - Profit
  - Profit margin %

##### 5. Recent Sales

- Last 10 sales
- Sale ID, date, payment method, amount

### B. Chart Components (`components/Charts.tsx`)

#### Available Chart Types:

1. **CustomLineChart** (Gifted Charts)
   - Supports negative values
   - Curved lines
   - Data point labels
   - Auto-formatted Y-axis (K, M, B)

2. **CustomBarChart** (Gifted Charts)
   - Solid colors (no gradients)
   - Top value labels
   - Supports negative values
   - Optional footer with totals

3. **ReusablePieChart** (react-native-pie-chart)
   - Percentage labels on slices
   - Color-coded legend
   - Amount and percentage display
   - Optional quantity display

### C. Payment Method Analytics

#### Data Structure:

```typescript
interface PaymentMethodAnalytics {
  payment_method: string;
  total_amount: number;
  transaction_count: number;
}
```

#### Query:

- `usePaymentMethodAnalytics(startDate, endDate)`
- Groups sales by payment method
- Calculates totals and counts
- Filters by date range

#### Display:

- Bar chart showing amount per payment method
- Footer with total revenue
- Empty state for no data

---

## 3. KEY SERVICES & UTILITIES

### A. Payment Method Service (`services/paymentMethodService.ts`)

```typescript
class PaymentMethodService {
  getPaymentMethods(): Promise<PaymentMethod[]>;
  getDefaultPaymentMethod(): Promise<PaymentMethod>;
  addPaymentMethod(method): Promise<void>;
  updatePaymentMethod(id, method): Promise<void>;
  deletePaymentMethod(id): Promise<void>;
  setDefaultPaymentMethod(id): Promise<void>;
}
```

### B. Currency Formatting

- `useCurrencyFormatter()` hook
- `formatPrice(amount)` function
- Centralized currency display
- Supports custom currency symbols

### C. Date Utilities (`utils/dateUtils.ts`)

- `convertISOToDBFormat()`: Converts ISO to database format
- Timezone handling
- Date range calculations

### D. Bulk Pricing Utilities (`utils/bulkPricingUtils.ts`)

- `calculateBulkPrice()`: Single product calculation
- `calculateCartTotalWithBulkPricing()`: Cart-wide calculation
- Returns breakdown with savings

---

## 4. DATABASE QUERIES (React Query)

### Sales Queries:

- `useSaleMutations()`: Add/delete sales
- `useInfiniteSales()`: Paginated all sales
- `useInfiniteSalesByDateRange()`: Paginated filtered sales
- `useSalesSummary()`: Aggregate statistics
- `useSaleItems(saleId)`: Items for specific sale
- `useAllSalesForExport()`: All sales for export

### Analytics Queries:

- `useCustomAnalytics(startDate, endDate)`: Key metrics
- `usePaymentMethodAnalytics(startDate, endDate)`: Payment breakdown
- `useRevenueExpensesTrend()`: Trend data
- `useProfitMarginTrend()`: Profit trend

### Product Queries:

- `useProductsInfinite()`: Paginated products with search/filter
- `useCategoriesWithCounts()`: Categories with product counts

---

## 5. MODAL COMPONENTS

### A. CompleteSaleModal

- Payment method display/selection
- Total amount with recalculate option
- Sale note input
- Print receipt checkbox
- Confirm/cancel actions
- Loading states
- Accessibility support

### B. CashCalculatorModal

- Numeric keypad
- Quick amount buttons
- EXACT button
- Real-time change calculation
- Warning for insufficient amount
- Continue/cancel actions

### C. PaymentMethodSelector

- Dropdown picker
- Payment method list
- Management button
- Default indicator
- Loading states

### D. PaymentMethodManagement

- Add/edit/delete payment methods
- Set default
- Icon and color selection
- Validation

---

## 6. STATE MANAGEMENT FLOW

### Sale Creation Flow:

```
1. User adds products to cart
   ↓
2. Cart calculates bulk pricing + manual discounts
   ↓
3. User selects customer (optional)
   ↓
4. User selects payment method
   ↓
5. User sets custom date/time (optional)
   ↓
6. User clicks "Process Sale"
   ↓
7a. If CASH: Calculator → Complete Sale Modal
7b. If NON-CASH: Complete Sale Modal directly
   ↓
8. User confirms sale
   ↓
9. Sale processed, inventory updated
   ↓
10. Optional: Print receipt
   ↓
11. Cart cleared, state reset
```

### Analytics Data Flow:

```
1. User selects date range
   ↓
2. React Query fetches:
   - Sales data
   - Expense data
   - Payment analytics
   ↓
3. Components calculate:
   - Key metrics
   - Chart data
   - Top products
   ↓
4. UI renders with formatted data
   ↓
5. User can export to Excel
```

---

## 7. LOCALIZATION

All user-facing text uses the translation system:

```typescript
const { t } = useTranslation();
t('sales.title');
t('analytics.totalRevenue');
```

Supported languages: English (en), Myanmar (my)

---

## 8. PERFORMANCE OPTIMIZATIONS

- Infinite scroll for large lists
- React Query caching
- Debounced search
- Memoized calculations
- Optimized image loading
- Memory cleanup hooks
- Render performance monitoring

---

## 9. ERROR HANDLING

- Graceful fallbacks for payment methods
- Stock validation
- Discount validation
- Network error handling
- User-friendly error messages
- Toast notifications

---

## 10. ACCESSIBILITY

- Proper accessibility labels
- Minimum touch target sizes (44x44)
- Screen reader support
- Keyboard navigation
- High contrast colors (WCAG AA)
- Descriptive hints

---

This summary provides a complete overview of your sales and analytics system. You can now tell me which specific parts you'd like to modify!
