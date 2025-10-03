# UUID Migration Design Document

## Overview

This design outlines a simple, clean migration from integer-based IDs to UUID-based identifiers across the entire database schema and application code. The migration will be performed in a single, atomic operation that preserves all existing data and maintains referential integrity.

## Architecture

### Migration Strategy

The migration will follow a **"Create New Tables → Copy Data → Replace Tables"** approach:

1. **Backup Phase**: Create complete database backup
2. **Schema Creation Phase**: Create new tables with UUID columns
3. **Data Migration Phase**: Generate UUIDs and copy all data with relationship mapping
4. **Table Replacement Phase**: Drop old tables and rename new tables
5. **Validation Phase**: Verify data integrity and UUID format compliance

### UUID Generation Strategy

- Use **UUID v4 (random)** for all new identifiers
- Generate UUIDs using React Native's built-in crypto functionality
- Maintain a temporary mapping table during migration to preserve relationships

## Components and Interfaces

### Database Schema Changes

#### Current Schema (Integer IDs)

```sql
-- Example current table structure
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  supplier_id INTEGER,
  -- other fields...
  FOREIGN KEY (category_id) REFERENCES categories (id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
);
```

#### New Schema (UUID IDs)

```sql
-- Example new table structure
CREATE TABLE products (
  id TEXT PRIMARY KEY, -- UUID as TEXT
  category_id TEXT NOT NULL,
  supplier_id TEXT,
  -- other fields...
  FOREIGN KEY (category_id) REFERENCES categories (id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
);
```

### TypeScript Interface Changes

#### Current Interfaces

```typescript
export interface Product {
  id: number;
  category_id: number;
  supplier_id?: number;
  // other fields...
}
```

#### New Interfaces

```typescript
export interface Product {
  id: string; // UUID
  category_id: string; // UUID
  supplier_id?: string; // UUID
  // other fields...
}
```

### Tables Requiring Migration

All tables with ID fields need migration:

1. **categories** - `id: number` → `id: string`
2. **suppliers** - `id: number` → `id: string`
3. **products** - `id: number` → `id: string`, `category_id: number` → `category_id: string`, `supplier_id: number` → `supplier_id: string`
4. **sales** - `id: number` → `id: string`, `customer_id: number` → `customer_id: string`
5. **sale_items** - `id: number` → `id: string`, `sale_id: number` → `sale_id: string`, `product_id: number` → `product_id: string`
6. **customers** - `id: number` → `id: string`
7. **expenses** - `id: number` → `id: string`, `category_id: number` → `category_id: string`
8. **expense_categories** - `id: number` → `id: string`
9. **stock_movements** - `id: number` → `id: string`, `product_id: number` → `product_id: string`, `supplier_id: number` → `supplier_id: string`
10. **bulk_pricing** - `id: number` → `id: string`, `product_id: number` → `product_id: string`

## Data Models

### Migration Mapping Table

During migration, a temporary mapping table will track old ID to new UUID relationships:

```sql
CREATE TEMPORARY TABLE id_mapping (
  table_name TEXT NOT NULL,
  old_id INTEGER NOT NULL,
  new_uuid TEXT NOT NULL,
  PRIMARY KEY (table_name, old_id)
);
```

### UUID Generation Utility

```typescript
import { randomUUID } from 'expo-crypto';

export class UUIDGenerator {
  static generate(): string {
    return randomUUID();
  }

  static isValid(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
```

## Error Handling

### Migration Error Scenarios

1. **UUID Generation Failure**: Retry with fallback UUID generation
2. **Foreign Key Constraint Violation**: Halt migration and rollback
3. **Data Corruption**: Restore from backup and report error
4. **Insufficient Storage**: Clean up temporary tables and report error

### Rollback Strategy

```typescript
class MigrationRollback {
  async rollback(): Promise<void> {
    // 1. Drop new UUID tables if they exist
    // 2. Restore original tables from backup
    // 3. Verify data integrity
    // 4. Clean up temporary files
  }
}
```

## Testing Strategy

### Pre-Migration Validation

- Verify database backup is complete and valid
- Check available storage space
- Validate all foreign key relationships

### Post-Migration Validation

- Verify all UUIDs are properly formatted
- Confirm record counts match pre-migration counts
- Test foreign key relationships
- Validate application functionality with sample operations

### Test Data Scenarios

- Empty database (new installation)
- Database with sample data
- Database with complex relationships
- Database with missing foreign key references

## Implementation Phases

### Phase 1: Database Migration Service

Create a new `UUIDMigrationService` class that handles:

- Database backup creation
- UUID table schema creation
- Data migration with UUID generation
- Foreign key relationship mapping
- Table replacement
- Validation and cleanup

### Phase 2: Interface Updates

Update all TypeScript interfaces in `services/database.ts`:

- Change all `id: number` to `id: string`
- Change all foreign key fields from `number` to `string`
- Update method signatures that accept ID parameters

### Phase 3: Application Code Updates

Update all application code that uses database IDs:

- Query hooks in `hooks/useQueries.ts`
- Components that handle ID parameters
- Services that process ID values
- Data export/import functionality

### Phase 4: Testing and Validation

- Run migration on test database
- Verify application functionality
- Test data export/import with UUIDs
- Validate performance with UUID queries

## Migration Execution Plan

### Step-by-Step Migration Process

1. **Backup Creation**

   ```typescript
   await createDatabaseBackup();
   ```

2. **UUID Table Creation**

   ```typescript
   await createUUIDTables();
   ```

3. **Data Migration**

   ```typescript
   const mapping = await generateUUIDMapping();
   await migrateDataWithUUIDs(mapping);
   ```

4. **Table Replacement**

   ```typescript
   await replaceTablesWithUUIDVersions();
   ```

5. **Validation**

   ```typescript
   await validateMigration();
   ```

6. **Cleanup**
   ```typescript
   await cleanupTemporaryTables();
   ```

## Performance Considerations

### Index Recreation

After migration, recreate all indexes for UUID columns:

```sql
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_supplier_id ON products(supplier_id);
CREATE INDEX idx_sales_customer_id ON sales(customer_id);
-- etc.
```

### Query Optimization

UUID queries will use string comparison instead of integer comparison:

- Maintain existing query patterns
- Ensure proper indexing on UUID columns
- No significant performance impact expected for typical app usage

## Security Considerations

### UUID Benefits

- Non-sequential IDs prevent enumeration attacks
- UUIDs are harder to guess than incremental integers
- Better for data privacy and security

### Migration Security

- Backup files should be stored securely
- Migration logs should not expose sensitive data
- Temporary mapping tables should be cleaned up completely

## Deployment Strategy

### Migration Timing

- Perform migration during app startup if needed
- Show loading screen during migration process
- Provide user feedback on migration progress

### Rollback Plan

- Keep database backup until migration is confirmed successful
- Provide manual rollback option in case of issues
- Log all migration steps for troubleshooting

## Success Criteria

### Migration Success Indicators

1. All tables successfully converted to UUID format
2. All record counts match pre-migration state
3. All foreign key relationships maintained
4. Application functions normally with UUID IDs
5. Data export/import works with UUID format
6. No data corruption or loss detected

### Validation Checklist

- [ ] Database backup created successfully
- [ ] All UUID fields properly formatted
- [ ] Record counts match pre-migration
- [ ] Foreign key relationships intact
- [ ] Application starts and functions normally
- [ ] Sample CRUD operations work correctly
- [ ] Data export produces valid UUID format
- [ ] Data import handles UUID format correctly
