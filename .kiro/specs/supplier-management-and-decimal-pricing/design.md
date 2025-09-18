# Design Document

## Overview

This design document outlines the technical implementation for adding supplier management UI and converting the pricing system from integer to decimal format with currency support. The design maintains the existing clean architecture while adding comprehensive supplier management capabilities and flexible currency handling.

## Architecture

### Database Layer Changes

The existing SQLite database will be modified to support decimal pricing and enhanced with currency configuration storage. All price-related fields will be migrated from INTEGER to REAL (decimal) format.

### Currency Management System

A new currency configuration system will be added to shop settings, stored in AsyncStorage, with formatting utilities that handle different currency display requirements.

### Service Layer Updates

The `DatabaseService` class will be enhanced with supplier management methods and decimal price handling, while maintaining backward compatibility during migration.

## Components and Interfaces

### Database Schema Changes

#### Price Field Migration

All price-related fields will be converted from INTEGER to REAL:

```sql
-- Products table price fields
ALTER TABLE products ADD COLUMN price_decimal REAL;
ALTER TABLE products ADD COLUMN cost_decimal REAL;
UPDATE products SET price_decimal = price / 100.0, cost_decimal = cost / 100.0;
-- After verification, drop old columns and rename new ones

-- Sales table
ALTER TABLE sales ADD COLUMN total_decimal REAL;
UPDATE sales SET total_decimal = total / 100.0;

-- Sale items table
ALTER TABLE sale_items ADD COLUMN price_decimal REAL;
ALTER TABLE sale_items ADD COLUMN cost_decimal REAL;
ALTER TABLE sale_items ADD COLUMN discount_decimal REAL;
ALTER TABLE sale_items ADD COLUMN subtotal_decimal REAL;

-- Bulk pricing table
ALTER TABLE bulk_pricing ADD COLUMN bulk_price_decimal REAL;

-- Stock movements table
ALTER TABLE stock_movements ADD COLUMN unit_cost_decimal REAL;

-- Expenses table
ALTER TABLE expenses ADD COLUMN amount_decimal REAL;
```

#### Currency Configuration

Currency settings will be stored in AsyncStorage as part of shop settings:

```typescript
interface CurrencySettings {
  code: string; // 'MMK', 'USD', 'EUR', etc.
  symbol: string; // 'K', '$', '€', etc.
  name: string; // 'Myanmar Kyat', 'US Dollar', etc.
  decimals: number; // 0 for MMK, 2 for USD/EUR
  symbolPosition: 'before' | 'after'; // '$10.50' vs '10.50€'
  thousandSeparator: string; // ',' or '.'
  decimalSeparator: string; // '.' or ','
}
```

### TypeScript Interface Updates

```typescript
// Updated interfaces with decimal pricing
export interface Product {
  id: number;
  name: string;
  barcode?: string;
  category_id: number;
  category?: string;
  price: number; // Now decimal
  cost: number; // Now decimal
  quantity: number;
  min_stock: number;
  supplier_id?: number;
  supplier_name?: string;
  imageUrl?: string;
  bulk_pricing?: BulkPricing[];
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: number;
  total: number; // Now decimal
  payment_method: string;
  note?: string;
  customer_id?: number;
  customer_name?: string;
  created_at: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  quantity: number;
  price: number; // Now decimal
  cost: number; // Now decimal
  discount: number; // Now decimal
  subtotal: number; // Now decimal
}

export interface BulkPricing {
  id: number;
  product_id: number;
  min_quantity: number;
  bulk_price: number; // Now decimal
  created_at: string;
}

export interface Expense {
  id: number;
  category_id: number;
  amount: number; // Now decimal
  description: string;
  date: string;
  created_at: string;
  updated_at: string;
}

// New supplier management interfaces
export interface SupplierWithStats {
  id: number;
  name: string;
  contact_name: string;
  phone: string;
  email?: string;
  address: string;
  created_at: string;
  // Analytics fields
  total_products?: number;
  recent_deliveries?: number;
  total_purchase_value?: number;
}

export interface SupplierProduct {
  product_id: number;
  product_name: string;
  current_stock: number;
  last_delivery_date?: string;
  total_received: number;
}
```

## Data Models

### Currency Management Model

```typescript
class CurrencyManager {
  private static instance: CurrencyManager;
  private currentCurrency: CurrencySettings;

  // Predefined currencies
  private static CURRENCIES: Record<string, CurrencySettings> = {
    MMK: {
      code: 'MMK',
      symbol: 'K',
      name: 'Myanmar Kyat',
      decimals: 0,
      symbolPosition: 'after',
      thousandSeparator: ',',
      decimalSeparator: '.',
    },
    USD: {
      code: 'USD',
      symbol: '$',
      name: 'US Dollar',
      decimals: 2,
      symbolPosition: 'before',
      thousandSeparator: ',',
      decimalSeparator: '.',
    },
    EUR: {
      code: 'EUR',
      symbol: '€',
      name: 'Euro',
      decimals: 2,
      symbolPosition: 'after',
      thousandSeparator: ',',
      decimalSeparator: '.',
    },
  };

  formatPrice(amount: number): string {
    const formatted = this.formatNumber(amount);
    return this.currentCurrency.symbolPosition === 'before'
      ? `${this.currentCurrency.symbol}${formatted}`
      : `${formatted} ${this.currentCurrency.symbol}`;
  }

  formatNumber(amount: number): string {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: this.currentCurrency.decimals,
      maximumFractionDigits: this.currentCurrency.decimals,
    });
  }

  parsePrice(priceString: string): number {
    // Remove currency symbols and parse to number
    const cleaned = priceString.replace(/[^\d.,]/g, '');
    return parseFloat(cleaned.replace(',', ''));
  }
}
```

### Supplier Management Model

```typescript
class SupplierService {
  async getSuppliers(searchQuery?: string): Promise<SupplierWithStats[]> {
    // Get suppliers with analytics data
  }

  async getSupplierProducts(supplierId: number): Promise<SupplierProduct[]> {
    // Get products supplied by specific supplier
  }

  async getSupplierAnalytics(supplierId: number): Promise<{
    totalProducts: number;
    totalPurchaseValue: number;
    recentDeliveries: StockMovement[];
    topProducts: SupplierProduct[];
  }> {
    // Comprehensive supplier analytics
  }

  async addSupplier(
    supplier: Omit<Supplier, 'id' | 'created_at'>
  ): Promise<number> {
    // Add new supplier with validation
  }

  async updateSupplier(id: number, supplier: Partial<Supplier>): Promise<void> {
    // Update supplier information
  }

  async deleteSupplier(id: number): Promise<void> {
    // Delete supplier with product relationship checks
  }
}
```

## Error Handling

### Database Migration Safety

```typescript
async migrateToDecimalPricing() {
  await this.db.execAsync('BEGIN TRANSACTION');

  try {
    // Step 1: Add new decimal columns
    await this.addDecimalPriceColumns();

    // Step 2: Migrate data (divide by 100 for existing integer prices)
    await this.migrateIntegerToDecimalPrices();

    // Step 3: Verify data integrity
    await this.verifyPriceMigration();

    // Step 4: Drop old columns and rename new ones
    await this.finalizeDecimalMigration();

    await this.db.execAsync('COMMIT');
    console.log('Decimal pricing migration completed successfully!');
  } catch (error) {
    await this.db.execAsync('ROLLBACK');
    console.error('Decimal pricing migration failed, rolling back:', error);
    throw error;
  }
}

async verifyPriceMigration(): Promise<void> {
  // Verify that all prices were migrated correctly
  const verificationQueries = [
    'SELECT COUNT(*) as count FROM products WHERE price_decimal IS NULL',
    'SELECT COUNT(*) as count FROM sales WHERE total_decimal IS NULL',
    // ... other verification queries
  ];

  for (const query of verificationQueries) {
    const result = await this.db.getFirstAsync(query) as { count: number };
    if (result.count > 0) {
      throw new Error(`Migration verification failed: ${query}`);
    }
  }
}
```

### Currency Validation

```typescript
class CurrencyValidator {
  static validateCurrencySettings(settings: CurrencySettings): string[] {
    const errors: string[] = [];

    if (!settings.code || settings.code.length !== 3) {
      errors.push('Currency code must be 3 characters');
    }

    if (!settings.symbol) {
      errors.push('Currency symbol is required');
    }

    if (settings.decimals < 0 || settings.decimals > 4) {
      errors.push('Decimal places must be between 0 and 4');
    }

    return errors;
  }

  static validatePriceInput(
    priceString: string,
    currency: CurrencySettings
  ): {
    isValid: boolean;
    value?: number;
    error?: string;
  } {
    try {
      const cleaned = priceString.replace(/[^\d.,]/g, '');
      const value = parseFloat(cleaned.replace(',', ''));

      if (isNaN(value) || value < 0) {
        return { isValid: false, error: 'Invalid price format' };
      }

      // Check decimal places
      const decimalPlaces = (cleaned.split('.')[1] || '').length;
      if (decimalPlaces > currency.decimals) {
        return {
          isValid: false,
          error: `Maximum ${currency.decimals} decimal places allowed`,
        };
      }

      return { isValid: true, value };
    } catch (error) {
      return { isValid: false, error: 'Invalid price format' };
    }
  }
}
```

## Testing Strategy

### Migration Testing

```typescript
describe('Decimal Pricing Migration', () => {
  test('should migrate integer prices to decimal correctly', async () => {
    // Test price migration accuracy
    const originalPrice = 150000; // 1500.00 in decimal
    const expectedDecimal = 1500.0;

    // Verify migration result
    expect(migratedPrice).toBe(expectedDecimal);
  });

  test('should handle migration rollback on failure', async () => {
    // Test rollback mechanism
  });

  test('should preserve data integrity during migration', async () => {
    // Test that no data is lost
  });
});
```

### Currency Formatting Testing

```typescript
describe('Currency Formatting', () => {
  test('should format MMK without decimals', () => {
    const currency = CurrencyManager.getCurrency('MMK');
    expect(currency.formatPrice(1500)).toBe('1,500 K');
  });

  test('should format USD with 2 decimals', () => {
    const currency = CurrencyManager.getCurrency('USD');
    expect(currency.formatPrice(15.5)).toBe('$15.50');
  });

  test('should parse price strings correctly', () => {
    expect(CurrencyManager.parsePrice('$15.50')).toBe(15.5);
    expect(CurrencyManager.parsePrice('1,500 K')).toBe(1500);
  });
});
```

### Supplier Management Testing

```typescript
describe('Supplier Management', () => {
  test('should prevent deletion of suppliers with products', async () => {
    // Test constraint enforcement
  });

  test('should update product relationships when supplier changes', async () => {
    // Test relationship management
  });

  test('should calculate supplier analytics correctly', async () => {
    // Test analytics calculations
  });
});
```

## UI Integration Strategy

### Shop Settings Enhancement

```typescript
// Add currency configuration to shop settings
interface ShopSettings {
  // ... existing settings
  currency: CurrencySettings;
}

// Currency selector component
const CurrencySelector = () => {
  const [selectedCurrency, setSelectedCurrency] = useState<string>('MMK');
  const [customCurrency, setCustomCurrency] = useState<CurrencySettings | null>(
    null
  );

  return (
    <View>
      <Text>Shop Currency</Text>
      <Picker
        selectedValue={selectedCurrency}
        onValueChange={setSelectedCurrency}
      >
        <Picker.Item label="Myanmar Kyat (MMK)" value="MMK" />
        <Picker.Item label="US Dollar (USD)" value="USD" />
        <Picker.Item label="Euro (EUR)" value="EUR" />
        <Picker.Item label="Custom..." value="custom" />
      </Picker>

      {selectedCurrency === 'custom' && (
        <CustomCurrencyForm onSave={setCustomCurrency} />
      )}
    </View>
  );
};
```

### Supplier Management UI Components

#### Supplier List Page

```typescript
const SupplierManagement = () => {
  const { data: suppliers, isLoading } = useSuppliers();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          placeholder="Search suppliers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
        <Button title="Add Supplier" onPress={() => setShowAddModal(true)} />
      </View>

      <FlatList
        data={suppliers}
        renderItem={({ item }) => (
          <SupplierCard
            supplier={item}
            onEdit={() => {
              /* edit logic */
            }}
            onDelete={() => {
              /* delete logic */
            }}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
      />

      <SupplierFormModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddSupplier}
      />
    </View>
  );
};
```

#### Supplier Card Component

```typescript
const SupplierCard = ({ supplier, onEdit, onDelete }) => {
  const currencyManager = useCurrencyManager();

  return (
    <Card style={styles.supplierCard}>
      <View style={styles.supplierHeader}>
        <Text style={styles.supplierName}>{supplier.name}</Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={onEdit}>
            <Icon name="edit" size={20} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete}>
            <Icon name="delete" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <Text>Contact: {supplier.contact_name}</Text>
      <Text>Phone: {supplier.phone}</Text>
      {supplier.email && <Text>Email: {supplier.email}</Text>}

      <View style={styles.stats}>
        <Text>Products: {supplier.total_products || 0}</Text>
        <Text>
          Total Value:{' '}
          {currencyManager.formatPrice(supplier.total_purchase_value || 0)}
        </Text>
      </View>
    </Card>
  );
};
```

### Price Input Components

```typescript
const PriceInput = ({
  label,
  value,
  onChangeText,
  currency,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  currency: CurrencySettings;
}) => {
  const [error, setError] = useState<string | null>(null);

  const handlePriceChange = (text: string) => {
    const validation = CurrencyValidator.validatePriceInput(text, currency);

    if (!validation.isValid) {
      setError(validation.error || 'Invalid price');
    } else {
      setError(null);
    }

    onChangeText(text);
  };

  return (
    <View>
      <Text>{label}</Text>
      <TextInput
        value={value}
        onChangeText={handlePriceChange}
        keyboardType="decimal-pad"
        placeholder={`0${currency.decimals > 0 ? '.00' : ''}`}
        style={[styles.priceInput, error && styles.errorInput]}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
      <Text style={styles.currencyHint}>
        Currency: {currency.name} ({currency.symbol})
      </Text>
    </View>
  );
};
```

### Navigation Integration

The supplier management will be integrated into the existing navigation structure:

```typescript
// Add to More tab or create new Suppliers section
const MoreScreen = () => {
  return (
    <ScrollView>
      {/* ... existing items */}

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('SupplierManagement')}
      >
        <Icon name="truck" size={24} />
        <Text>Manage Suppliers</Text>
      </TouchableOpacity>

      {/* ... other items */}
    </ScrollView>
  );
};
```

## Performance Considerations

### Database Optimization

```sql
-- Indexes for supplier queries
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON suppliers(phone);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);

-- Indexes for decimal price queries (if not already existing)
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_sales_total ON sales(total);
```

### Memory Management

- **Lazy Loading**: Supplier analytics loaded only when viewing supplier details
- **Pagination**: Supplier lists paginated for large datasets
- **Caching**: Currency formatting results cached for repeated use
- **Debounced Search**: Supplier search debounced to reduce query frequency

### Migration Performance

```typescript
// Batch processing for large datasets during migration
async migratePricesInBatches(tableName: string, batchSize: number = 1000) {
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const batch = await this.db.getAllAsync(
      `SELECT id, price FROM ${tableName} LIMIT ? OFFSET ?`,
      [batchSize, offset]
    );

    if (batch.length === 0) {
      hasMore = false;
      break;
    }

    // Process batch
    for (const row of batch) {
      await this.db.runAsync(
        `UPDATE ${tableName} SET price_decimal = ? WHERE id = ?`,
        [row.price / 100.0, row.id]
      );
    }

    offset += batchSize;
  }
}
```

This design provides a comprehensive solution for supplier management and decimal pricing while maintaining the existing architecture and performance characteristics of the application.
