# Design Document

## Overview

This design document outlines the technical implementation for enhancing the POS system database with customer management, stock movement tracking, bulk pricing features, and improved supplier/product relationships. The design maintains the existing clean architecture while seamlessly integrating new capabilities.

## Architecture

### Database Layer Enhancement

The existing SQLite database will be extended with new tables and modified existing tables while maintaining backward compatibility through careful migrations.

### Service Layer Updates

The `DatabaseService` class will be enhanced with new methods for customer management, stock movements, and bulk pricing operations.

### UI Layer Integration

New features will be integrated into existing components and pages following the current design patterns, avoiding UI complexity.

## Components and Interfaces

### Database Schema Changes

#### New Tables

**customers**

```sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  total_spent INTEGER DEFAULT 0,
  visit_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**stock_movements**

```sql
CREATE TABLE stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('stock_in', 'stock_out')),
  quantity INTEGER NOT NULL,
  reason TEXT,
  supplier_id INTEGER, -- Optional: some stock_in may not be from suppliers
  reference_number TEXT,
  unit_cost INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products (id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
);
```

**bulk_pricing**

```sql
CREATE TABLE bulk_pricing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  min_quantity INTEGER NOT NULL,
  bulk_price INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products (id)
);
```

#### Modified Tables

**suppliers** - Make email optional (already implemented, verify migration)

```sql
-- Email field should allow NULL values
ALTER TABLE suppliers MODIFY COLUMN email TEXT;
```

**products** - Make supplier_id optional (already implemented, verify migration)

```sql
-- supplier_id field should allow NULL values
ALTER TABLE products MODIFY COLUMN supplier_id INTEGER;
```

**sales** - Add optional customer relationship

```sql
ALTER TABLE sales ADD COLUMN customer_id INTEGER;
ALTER TABLE sales ADD FOREIGN KEY (customer_id) REFERENCES customers (id);
```

### TypeScript Interfaces

```typescript
export interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  total_spent: number;
  visit_count: number;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: number;
  product_id: number;
  product_name?: string; // For joined queries
  type: 'stock_in' | 'stock_out';
  quantity: number;
  reason?: string;
  supplier_id?: number;
  supplier_name?: string; // For joined queries
  reference_number?: string;
  unit_cost?: number;
  created_at: string;
}

export interface BulkPricing {
  id: number;
  product_id: number;
  min_quantity: number;
  bulk_price: number;
  created_at: string;
}

// Enhanced existing interfaces
export interface Sale {
  id: number;
  total: number;
  payment_method: string;
  note?: string;
  customer_id?: number; // New optional field
  customer_name?: string; // For joined queries
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  barcode?: string;
  category_id: number;
  category?: string;
  price: number;
  cost: number;
  quantity: number;
  min_stock: number;
  supplier_id?: number; // Make optional
  supplier_name?: string;
  imageUrl?: string;
  bulk_pricing?: BulkPricing[]; // For joined queries
  created_at: string;
  updated_at: string;
}
```

## Data Models

### Customer Management Model

- **CRUD Operations**: Full create, read, update, delete functionality
- **Purchase History**: Link to sales records for customer analytics
- **Search & Filter**: By name, phone, email with fuzzy matching
- **Statistics**: Total spent, visit count, average order value

### Stock Movement Model

- **Movement Types**:
  - `stock_in`: Receiving from suppliers, manual additions, transfers, returns
  - `stock_out`: Expired products, damaged goods, manual removals, transfers
- **Tracking**: Product, quantity, reason, optional supplier (for supplier deliveries), reference numbers
- **History**: Paginated list with filtering by product, date range, type, supplier
- **Integration**: Links to products table, optional links to suppliers table

### Bulk Pricing Model

- **Tier System**: Multiple pricing tiers per product based on quantity
- **Automatic Application**: System calculates best price during sales
- **Management**: Easy setup and modification through product forms
- **Display**: Clear presentation in product lists and sales interface

## Error Handling

### Database Migration Safety

```typescript
async migrateToEnhancedFeatures() {
  await this.db.execAsync('BEGIN TRANSACTION');

  try {
    // Create new tables
    await this.createCustomersTable();
    await this.createStockMovementsTable();
    await this.createBulkPricingTable();

    // Modify existing tables
    await this.addCustomerIdToSales();

    // Create indexes for performance
    await this.createEnhancedIndexes();

    await this.db.execAsync('COMMIT');
  } catch (error) {
    await this.db.execAsync('ROLLBACK');
    throw error;
  }
}
```

### Validation Rules

- **Customer Data**: Name required, phone/email format validation
- **Stock Movements**: Positive quantities, valid movement types, required reasons for stock_out
- **Bulk Pricing**: Minimum quantity > 0, bulk price < regular price, no overlapping tiers
- **Optional Relationships**: Graceful handling of NULL supplier_id and customer_id

### Error Recovery

- **Migration Failures**: Automatic rollback to previous state
- **Data Integrity**: Foreign key constraints with proper NULL handling
- **User Feedback**: Clear error messages for validation failures

## Testing Strategy

### Database Testing

```typescript
describe('Enhanced Database Features', () => {
  test('Customer CRUD operations', async () => {
    // Test customer creation, updates, deletion
  });

  test('Stock movement tracking', async () => {
    // Test stock_in and stock_out operations
  });

  test('Bulk pricing calculations', async () => {
    // Test automatic price tier selection
  });

  test('Optional relationships', async () => {
    // Test products without suppliers, sales without customers
  });
});
```

### Integration Testing

- **Sales Flow**: Customer selection, bulk pricing application, stock updates
- **Inventory Management**: Stock movements, low stock alerts, supplier relationships
- **Data Migration**: Existing data preservation, new feature availability
- **Performance**: Large dataset handling, query optimization

### UI Testing

- **Customer Management**: Search, add, edit, view purchase history
- **Stock Movement Interface**: Add movements, view history, filter by type
- **Bulk Pricing Setup**: Configure tiers, preview pricing, validate rules
- **Sales Integration**: Customer selection, automatic bulk discounts

## Performance Considerations

### Database Indexes

```sql
-- Customer search optimization
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_phone ON customers(phone);

-- Stock movement queries
CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX idx_stock_movements_type ON stock_movements(type);

-- Bulk pricing lookups
CREATE INDEX idx_bulk_pricing_product_id ON bulk_pricing(product_id);
CREATE INDEX idx_bulk_pricing_min_quantity ON bulk_pricing(min_quantity);

-- Enhanced sales queries
CREATE INDEX idx_sales_customer_id ON sales(customer_id);
```

### Query Optimization

- **Pagination**: All list views use limit/offset for large datasets
- **Lazy Loading**: Bulk pricing loaded only when needed
- **Caching**: Customer and stock movement data cached in React Query
- **Batch Operations**: Multiple stock movements processed in transactions

### Memory Management

- **Component Optimization**: Memoized components for product lists
- **Data Fetching**: Incremental loading for stock movement history
- **State Management**: Efficient React Query cache invalidation

## UI Integration Strategy

### Existing Component Enhancement

#### Sales Page (`app/(tabs)/sales.tsx`)

- **Customer Selection**: Optional dropdown/search in cart header
- **Bulk Pricing Display**: Show tier pricing in product selection dialog
- **Price Calculation**: Automatic bulk discount application in cart items

#### Inventory Page (`app/(tabs)/inventory.tsx`)

- **Stock Movement Tab**: New tab alongside overview/products
- **Quick Actions**: Stock in/out buttons in product cards
- **Movement History**: Expandable section in product details

#### Products Manager (`components/ProductsManager.tsx`)

- **Bulk Pricing Section**: Collapsible section in product form
- **Supplier Optional**: Clear indication when no supplier selected
- **Stock Movement Link**: Quick access to product movement history

### New Components (Minimal)

#### Customer Management

- **CustomerSelector**: Reusable component for sales customer selection
- **CustomerForm**: Simple form for add/edit customer (modal)
- **CustomerList**: Integrated into existing list patterns

#### Stock Movement Interface

- **StockMovementForm**: Quick add stock in/out (modal)
- **MovementHistory**: List component following existing patterns
- **MovementSummary**: Stats cards matching current design

### Navigation Integration

- **No New Top-Level Routes**: Features integrated into existing tabs
- **Modal-Based Forms**: Consistent with current add/edit patterns
- **Contextual Access**: Features accessible from relevant existing screens

This design maintains the clean, simple architecture while adding powerful new capabilities that enhance the POS system's functionality without overwhelming the user interface.
