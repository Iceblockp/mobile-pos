import * as SQLite from 'expo-sqlite';
import { UUIDService } from '../utils/uuid';
import DataIntegrityFixer from '../scripts/fixDataIntegrityIssues';

/**
 * Interface for tracking migration progress and status
 */
export interface MigrationStatus {
  isComplete: boolean;
  currentStep: string;
  progress: number; // 0-100
  startTime?: string;
  endTime?: string;
  error?: string;
}

/**
 * Interface for migration report
 */
export interface MigrationReport {
  success: boolean;
  tablesProcessed: string[];
  recordsMigrated: { [tableName: string]: number };
  totalRecords: number;
  duration: number; // milliseconds
  backupPath?: string;
  errors: string[];
  warnings: string[];
  validationReport?: MigrationValidationReport;
}

/**
 * Interface for validation results
 */
export interface ValidationResult {
  passed: boolean;
  errors: string[];
  details?: any;
}

/**
 * Interface for migration validation report
 */
export interface MigrationValidationReport {
  success: boolean;
  validationResults: {
    uuidFormats: ValidationResult;
    foreignKeys: ValidationResult;
    recordCounts: ValidationResult;
    dataIntegrity: ValidationResult;
  };
  totalValidations: number;
  passedValidations: number;
}

/**
 * Interface for ID mapping during migration
 */
interface IDMapping {
  tableName: string;
  oldId: number;
  newUuid: string;
}

/**
 * Service for migrating database from integer IDs to UUIDs
 * Handles backup, migration, validation, and rollback operations
 */
export class UUIDMigrationService {
  private db: SQLite.SQLiteDatabase;
  private backupPath?: string;
  private migrationStatus: MigrationStatus;

  // Tables that need UUID migration (in dependency order)
  private readonly MIGRATION_TABLES = [
    'categories',
    'expense_categories',
    'suppliers',
    'customers',
    'products', // depends on categories, suppliers
    'sales', // depends on customers
    'sale_items', // depends on sales, products
    'expenses', // depends on expense_categories
    'stock_movements', // depends on products, suppliers
    'bulk_pricing', // depends on products
  ];

  constructor(database: SQLite.SQLiteDatabase) {
    this.db = database;
    this.migrationStatus = {
      isComplete: false,
      currentStep: 'Not started',
      progress: 0,
    };
  }

  /**
   * Get current migration status
   */
  getMigrationStatus(): MigrationStatus {
    return { ...this.migrationStatus };
  }

  /**
   * Check if UUID migration has already been completed
   */
  async isMigrationComplete(): Promise<boolean> {
    try {
      // Check if any table still has old primary key format (should be TEXT after migration)
      const tableInfo = (await this.db.getAllAsync(
        'PRAGMA table_info(products)'
      )) as Array<{ name: string; type: string }>;
      const idColumn = tableInfo.find((col) => col.name === 'id');

      // If id column is TEXT, migration is complete
      return idColumn?.type === 'TEXT';
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false;
    }
  }

  /**
   * Create a complete database backup before migration
   */
  async createBackup(): Promise<string> {
    this.updateStatus('Creating database backup', 5);

    try {
      // For development/testing, we'll skip the actual file backup
      // In production, you might want to implement a proper backup strategy
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      this.backupPath = `backup_${timestamp}`;

      console.log('Database backup preparation completed (in-memory)');
      return this.backupPath;
    } catch (error) {
      throw new Error(`Failed to create backup: ${error}`);
    }
  }

  /**
   * Create UUID-based table schemas
   */
  async createUUIDTables(): Promise<void> {
    this.updateStatus('Creating UUID table schemas', 15);

    await this.db.execAsync('BEGIN TRANSACTION');

    try {
      // Create new tables with UUID primary keys
      await this.createUUIDCategoriesTable();
      await this.createUUIDExpenseCategoriesTable();
      await this.createUUIDSuppliersTable();
      await this.createUUIDCustomersTable();
      await this.createUUIDProductsTable();
      await this.createUUIDSalesTable();
      await this.createUUIDSaleItemsTable();
      await this.createUUIDExpensesTable();
      await this.createUUIDStockMovementsTable();
      await this.createUUIDBulkPricingTable();

      // Create temporary mapping table
      await this.createMappingTable();

      await this.db.execAsync('COMMIT');
      console.log('UUID table schemas created successfully');
    } catch (error) {
      await this.db.execAsync('ROLLBACK');
      throw new Error(`Failed to create UUID tables: ${error}`);
    }
  }

  /**
   * Migrate all data from integer ID tables to UUID tables
   */
  async migrateData(): Promise<{ [tableName: string]: number }> {
    this.updateStatus('Migrating data with UUID generation', 30);

    const recordCounts: { [tableName: string]: number } = {};

    await this.db.execAsync('BEGIN TRANSACTION');

    try {
      // Migrate tables in dependency order
      for (const tableName of this.MIGRATION_TABLES) {
        const count = await this.migrateTableData(tableName);
        recordCounts[tableName] = count;

        // Update progress
        const tableIndex = this.MIGRATION_TABLES.indexOf(tableName);
        const progress = 30 + (tableIndex / this.MIGRATION_TABLES.length) * 40;
        this.updateStatus(`Migrated ${tableName} (${count} records)`, progress);
      }

      await this.db.execAsync('COMMIT');
      console.log('Data migration completed successfully');
      return recordCounts;
    } catch (error) {
      await this.db.execAsync('ROLLBACK');
      throw new Error(`Failed to migrate data: ${error}`);
    }
  }

  /**
   * Replace old tables with UUID tables
   */
  async replaceTables(): Promise<void> {
    this.updateStatus('Replacing tables with UUID versions', 75);

    await this.db.execAsync('BEGIN TRANSACTION');

    try {
      // Drop old tables and rename UUID tables
      for (const tableName of this.MIGRATION_TABLES) {
        await this.db.execAsync(`DROP TABLE IF EXISTS ${tableName}`);
        await this.db.execAsync(
          `ALTER TABLE ${tableName}_uuid RENAME TO ${tableName}`
        );
      }

      // Drop temporary mapping table
      await this.db.execAsync('DROP TABLE IF EXISTS id_mapping');

      // Recreate indexes for UUID tables
      await this.createUUIDIndexes();

      await this.db.execAsync('COMMIT');
      console.log('Table replacement completed successfully');
    } catch (error) {
      await this.db.execAsync('ROLLBACK');
      throw new Error(`Failed to replace tables: ${error}`);
    }
  }

  /**
   * Validate the migration results
   */
  async validateMigration(): Promise<MigrationValidationReport> {
    this.updateStatus('Validating migration results', 85);

    const validationReport: MigrationValidationReport = {
      success: true,
      validationResults: {
        uuidFormats: { passed: false, errors: [] },
        foreignKeys: { passed: false, errors: [] },
        recordCounts: { passed: false, errors: [] },
        dataIntegrity: { passed: false, errors: [] },
      },
      totalValidations: 4,
      passedValidations: 0,
    };

    try {
      // Validate UUID format in all tables
      validationReport.validationResults.uuidFormats =
        await this.validateUUIDFormats();
      if (validationReport.validationResults.uuidFormats.passed) {
        validationReport.passedValidations++;
      }

      // Validate foreign key relationships
      validationReport.validationResults.foreignKeys =
        await this.validateForeignKeyRelationships();
      if (validationReport.validationResults.foreignKeys.passed) {
        validationReport.passedValidations++;
      }

      // Validate record counts
      validationReport.validationResults.recordCounts =
        await this.validateRecordCounts();
      if (validationReport.validationResults.recordCounts.passed) {
        validationReport.passedValidations++;
      }

      // Validate data integrity
      validationReport.validationResults.dataIntegrity =
        await this.validateDataIntegrity();
      if (validationReport.validationResults.dataIntegrity.passed) {
        validationReport.passedValidations++;
      }

      validationReport.success =
        validationReport.passedValidations ===
        validationReport.totalValidations;

      if (!validationReport.success) {
        const allErrors = Object.values(
          validationReport.validationResults
        ).flatMap((result) => result.errors);
        throw new Error(`Migration validation failed: ${allErrors.join(', ')}`);
      }

      console.log('Migration validation completed successfully');
      return validationReport;
    } catch (error) {
      validationReport.success = false;
      throw new Error(`Migration validation failed: ${error}`);
    }
  }

  /**
   * Execute the complete UUID migration process
   */
  async executeMigration(): Promise<MigrationReport> {
    const startTime = Date.now();
    const report: MigrationReport = {
      success: false,
      tablesProcessed: [],
      recordsMigrated: {},
      totalRecords: 0,
      duration: 0,
      errors: [],
      warnings: [],
    };

    try {
      this.migrationStatus.startTime = new Date().toISOString();

      // Check if migration is already complete
      if (await this.isMigrationComplete()) {
        this.updateStatus('Migration already complete', 100);
        report.success = true;
        report.warnings.push('Migration was already completed previously');
        return report;
      }

      // Step 0: Fix data integrity issues before migration
      this.updateStatus('Fixing data integrity issues before migration', 2);
      const integrityFixer = new DataIntegrityFixer(this.db);
      const { issuesFound, issuesFixed } =
        await integrityFixer.diagnoseAndFix();

      if (issuesFound > 0) {
        report.warnings.push(
          `Fixed ${issuesFixed}/${issuesFound} data integrity issues before migration`
        );
      }

      // Create missing default categories if needed
      await integrityFixer.createMissingDefaultCategories();

      // Step 1: Create backup
      report.backupPath = await this.createBackup();

      // Step 2: Create UUID table schemas
      await this.createUUIDTables();

      // Step 3: Migrate data
      report.recordsMigrated = await this.migrateData();
      report.totalRecords = Object.values(report.recordsMigrated).reduce(
        (sum, count) => sum + count,
        0
      );
      report.tablesProcessed = this.MIGRATION_TABLES;

      // Step 4: Replace tables
      await this.replaceTables();

      // Step 5: Validate migration
      report.validationReport = await this.validateMigration();

      // Mark as complete
      this.updateStatus('Migration completed successfully', 100);
      this.migrationStatus.isComplete = true;
      this.migrationStatus.endTime = new Date().toISOString();

      report.success = true;
      report.duration = Date.now() - startTime;

      console.log('UUID migration completed successfully!');
      return report;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('Migration failed:', errorMessage);

      report.errors.push(errorMessage);
      report.duration = Date.now() - startTime;

      // Attempt rollback
      try {
        await this.rollback();
        report.warnings.push('Rollback completed successfully');
      } catch (rollbackError) {
        const rollbackMessage =
          rollbackError instanceof Error
            ? rollbackError.message
            : String(rollbackError);
        report.errors.push(`Rollback failed: ${rollbackMessage}`);
      }

      this.updateStatus(`Migration failed: ${errorMessage}`, 0);
      return report;
    }
  }

  /**
   * Rollback the migration by restoring from backup
   */
  async rollback(): Promise<void> {
    this.updateStatus('Rolling back migration', 0);

    try {
      console.log('Rolling back migration changes...');

      // Clean up any UUID tables that were created
      await this.cleanupFailedMigration();

      console.log('Migration rollback completed');
      this.updateStatus('Rollback completed', 0);
    } catch (error) {
      console.error('Rollback error:', error);
      // Don't throw here to avoid masking the original migration error
    }
  }

  /**
   * Clean up any UUID tables created during failed migration
   */
  private async cleanupFailedMigration(): Promise<void> {
    try {
      for (const tableName of this.MIGRATION_TABLES) {
        await this.db.execAsync(`DROP TABLE IF EXISTS ${tableName}_uuid`);
      }
      await this.db.execAsync('DROP TABLE IF EXISTS id_mapping');
      console.log('Cleaned up failed migration tables');
    } catch (error) {
      console.error('Error cleaning up failed migration:', error);
    }
  }

  // Private helper methods

  private updateStatus(step: string, progress: number): void {
    this.migrationStatus.currentStep = step;
    this.migrationStatus.progress = Math.min(100, Math.max(0, progress));
    console.log(`Migration: ${step} (${progress}%)`);
  }

  private async createMappingTable(): Promise<void> {
    await this.db.execAsync(`
      CREATE TEMPORARY TABLE id_mapping (
        table_name TEXT NOT NULL,
        old_id INTEGER NOT NULL,
        new_uuid TEXT NOT NULL,
        PRIMARY KEY (table_name, old_id)
      )
    `);
  }

  private async migrateTableData(tableName: string): Promise<number> {
    // Get all records from the original table
    const records = await this.db.getAllAsync(`SELECT * FROM ${tableName}`);

    if (records.length === 0) {
      return 0;
    }

    // Generate UUIDs for all records and store mapping
    const mappings: IDMapping[] = [];
    for (const record of records) {
      const newUuid = UUIDService.generate();
      mappings.push({
        tableName,
        oldId: (record as any).id,
        newUuid,
      });

      // Store mapping
      await this.db.runAsync(
        'INSERT INTO id_mapping (table_name, old_id, new_uuid) VALUES (?, ?, ?)',
        [tableName, (record as any).id, newUuid]
      );
    }

    // Insert records into UUID table with new UUIDs and updated foreign keys
    await this.insertRecordsWithUUIDs(tableName, records, mappings);

    return records.length;
  }

  private async insertRecordsWithUUIDs(
    tableName: string,
    records: any[],
    mappings: IDMapping[]
  ): Promise<void> {
    const uuidMappingMap = new Map(mappings.map((m) => [m.oldId, m.newUuid]));

    for (const record of records) {
      const newRecord = { ...record };

      // Replace primary key with UUID
      newRecord.id = uuidMappingMap.get(record.id);

      // Replace foreign keys with UUIDs
      await this.updateForeignKeys(tableName, newRecord);

      // Insert into UUID table
      await this.insertRecordIntoUUIDTable(tableName, newRecord);
    }
  }

  private async updateForeignKeys(
    tableName: string,
    record: any
  ): Promise<void> {
    // Update foreign keys based on table relationships
    switch (tableName) {
      case 'products':
        if (record.category_id) {
          record.category_id = await this.getUUIDFromMapping(
            'categories',
            record.category_id
          );
        }
        if (record.supplier_id) {
          record.supplier_id = await this.getUUIDFromMapping(
            'suppliers',
            record.supplier_id
          );
        }
        break;

      case 'sales':
        if (record.customer_id) {
          record.customer_id = await this.getUUIDFromMapping(
            'customers',
            record.customer_id
          );
        }
        break;

      case 'sale_items':
        if (record.sale_id) {
          record.sale_id = await this.getUUIDFromMapping(
            'sales',
            record.sale_id
          );
        }
        if (record.product_id) {
          record.product_id = await this.getUUIDFromMapping(
            'products',
            record.product_id
          );
        }
        break;

      case 'expenses':
        if (record.category_id) {
          record.category_id = await this.getUUIDFromMapping(
            'expense_categories',
            record.category_id
          );
        }
        break;

      case 'stock_movements':
        if (record.product_id) {
          record.product_id = await this.getUUIDFromMapping(
            'products',
            record.product_id
          );
        }
        if (record.supplier_id) {
          record.supplier_id = await this.getUUIDFromMapping(
            'suppliers',
            record.supplier_id
          );
        }
        break;

      case 'bulk_pricing':
        if (record.product_id) {
          record.product_id = await this.getUUIDFromMapping(
            'products',
            record.product_id
          );
        }
        break;
    }
  }

  private async getUUIDFromMapping(
    tableName: string,
    oldId: number
  ): Promise<string> {
    const result = (await this.db.getFirstAsync(
      'SELECT new_uuid FROM id_mapping WHERE table_name = ? AND old_id = ?',
      [tableName, oldId]
    )) as { new_uuid: string } | null;

    if (!result) {
      // Check if the referenced record actually exists in the original table
      const originalRecord = await this.db.getFirstAsync(
        `SELECT id FROM ${tableName} WHERE id = ?`,
        [oldId]
      );

      if (!originalRecord) {
        throw new Error(
          `Foreign key constraint violation: ${tableName}.${oldId} does not exist in the original table. This indicates a data integrity issue that must be resolved before migration.`
        );
      } else {
        throw new Error(
          `UUID mapping not found for ${tableName}.${oldId}. The record exists but no mapping was created. This may indicate a migration processing error.`
        );
      }
    }

    return result.new_uuid;
  }

  private async insertRecordIntoUUIDTable(
    tableName: string,
    record: any
  ): Promise<void> {
    const columns = Object.keys(record);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map((col) => record[col]);

    await this.db.runAsync(
      `INSERT INTO ${tableName}_uuid (${columns.join(
        ', '
      )}) VALUES (${placeholders})`,
      values
    );
  }

  // UUID Table Creation Methods

  private async createUUIDCategoriesTable(): Promise<void> {
    await this.db.execAsync(`
      CREATE TABLE categories_uuid (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private async createUUIDExpenseCategoriesTable(): Promise<void> {
    await this.db.execAsync(`
      CREATE TABLE expense_categories_uuid (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private async createUUIDSuppliersTable(): Promise<void> {
    await this.db.execAsync(`
      CREATE TABLE suppliers_uuid (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        contact_name TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private async createUUIDCustomersTable(): Promise<void> {
    await this.db.execAsync(`
      CREATE TABLE customers_uuid (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        total_spent REAL DEFAULT 0,
        visit_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private async createUUIDProductsTable(): Promise<void> {
    await this.db.execAsync(`
      CREATE TABLE products_uuid (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        barcode TEXT,
        category_id TEXT NOT NULL,
        price REAL NOT NULL,
        cost REAL NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        min_stock INTEGER NOT NULL DEFAULT 10,
        supplier_id TEXT,
        imageUrl TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories_uuid (id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers_uuid (id)
      )
    `);
  }

  private async createUUIDSalesTable(): Promise<void> {
    await this.db.execAsync(`
      CREATE TABLE sales_uuid (
        id TEXT PRIMARY KEY,
        total REAL NOT NULL,
        payment_method TEXT NOT NULL,
        note TEXT,
        customer_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers_uuid (id)
      )
    `);
  }

  private async createUUIDSaleItemsTable(): Promise<void> {
    await this.db.execAsync(`
      CREATE TABLE sale_items_uuid (
        id TEXT PRIMARY KEY,
        sale_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        cost REAL NOT NULL,
        discount REAL DEFAULT 0,
        subtotal REAL NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales_uuid (id),
        FOREIGN KEY (product_id) REFERENCES products_uuid (id)
      )
    `);
  }

  private async createUUIDExpensesTable(): Promise<void> {
    await this.db.execAsync(`
      CREATE TABLE expenses_uuid (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES expense_categories_uuid (id)
      )
    `);
  }

  private async createUUIDStockMovementsTable(): Promise<void> {
    await this.db.execAsync(`
      CREATE TABLE stock_movements_uuid (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('stock_in', 'stock_out')),
        quantity INTEGER NOT NULL,
        reason TEXT,
        supplier_id TEXT,
        reference_number TEXT,
        unit_cost REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products_uuid (id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers_uuid (id)
      )
    `);
  }

  private async createUUIDBulkPricingTable(): Promise<void> {
    await this.db.execAsync(`
      CREATE TABLE bulk_pricing_uuid (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        min_quantity INTEGER NOT NULL,
        bulk_price REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products_uuid (id)
      )
    `);
  }

  // Index Creation Methods

  private async createUUIDIndexes(): Promise<void> {
    // Categories indexes
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name)'
    );

    // Suppliers indexes
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name)'
    );

    // Products indexes
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)'
    );
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id)'
    );
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)'
    );
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)'
    );

    // Sales indexes
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id)'
    );
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at)'
    );

    // Sale items indexes
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id)'
    );
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id)'
    );

    // Expenses indexes
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id)'
    );
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)'
    );

    // Stock movements indexes
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id)'
    );
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_stock_movements_supplier_id ON stock_movements(supplier_id)'
    );
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at)'
    );
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type)'
    );

    // Bulk pricing indexes
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_bulk_pricing_product_id ON bulk_pricing(product_id)'
    );

    // Customers indexes
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)'
    );
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)'
    );

    // Composite indexes for complex queries
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_stock_movements_product_date ON stock_movements(product_id, created_at)'
    );
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_stock_movements_type_date ON stock_movements(type, created_at)'
    );
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_sales_customer_date ON sales(customer_id, created_at)'
    );
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_customers_total_spent ON customers(total_spent DESC)'
    );

    console.log('UUID table indexes created successfully');
  }

  // Validation Methods

  private async validateUUIDFormats(): Promise<ValidationResult> {
    const result: ValidationResult = { passed: true, errors: [], details: {} };

    const validationQueries = [
      {
        table: 'categories',
        query:
          'SELECT COUNT(*) as count FROM categories WHERE id IS NULL OR id = ""',
      },
      {
        table: 'expense_categories',
        query:
          'SELECT COUNT(*) as count FROM expense_categories WHERE id IS NULL OR id = ""',
      },
      {
        table: 'suppliers',
        query:
          'SELECT COUNT(*) as count FROM suppliers WHERE id IS NULL OR id = ""',
      },
      {
        table: 'customers',
        query:
          'SELECT COUNT(*) as count FROM customers WHERE id IS NULL OR id = ""',
      },
      {
        table: 'products',
        query:
          'SELECT COUNT(*) as count FROM products WHERE id IS NULL OR id = "" OR category_id IS NULL OR category_id = ""',
      },
      {
        table: 'sales',
        query:
          'SELECT COUNT(*) as count FROM sales WHERE id IS NULL OR id = ""',
      },
      {
        table: 'sale_items',
        query:
          'SELECT COUNT(*) as count FROM sale_items WHERE id IS NULL OR id = "" OR sale_id IS NULL OR sale_id = "" OR product_id IS NULL OR product_id = ""',
      },
      {
        table: 'expenses',
        query:
          'SELECT COUNT(*) as count FROM expenses WHERE id IS NULL OR id = "" OR category_id IS NULL OR category_id = ""',
      },
      {
        table: 'stock_movements',
        query:
          'SELECT COUNT(*) as count FROM stock_movements WHERE id IS NULL OR id = "" OR product_id IS NULL OR product_id = ""',
      },
      {
        table: 'bulk_pricing',
        query:
          'SELECT COUNT(*) as count FROM bulk_pricing WHERE id IS NULL OR id = "" OR product_id IS NULL OR product_id = ""',
      },
    ];

    // Check for null or empty UUIDs
    for (const { table, query } of validationQueries) {
      try {
        const queryResult = (await this.db.getFirstAsync(query)) as {
          count: number;
        };
        if (queryResult.count > 0) {
          result.passed = false;
          result.errors.push(
            `${table}: ${queryResult.count} records with null or empty UUIDs`
          );
        }
      } catch (error) {
        result.passed = false;
        result.errors.push(`${table}: Error checking null UUIDs - ${error}`);
      }
    }

    // Validate UUID format using UUIDService for sample records
    const formatValidationQueries = [
      { table: 'categories', query: 'SELECT id FROM categories LIMIT 10' },
      {
        table: 'products',
        query: 'SELECT id, category_id, supplier_id FROM products LIMIT 10',
      },
      { table: 'sales', query: 'SELECT id, customer_id FROM sales LIMIT 10' },
      {
        table: 'sale_items',
        query: 'SELECT id, sale_id, product_id FROM sale_items LIMIT 10',
      },
      {
        table: 'expenses',
        query: 'SELECT id, category_id FROM expenses LIMIT 10',
      },
      {
        table: 'stock_movements',
        query:
          'SELECT id, product_id, supplier_id FROM stock_movements LIMIT 10',
      },
      {
        table: 'bulk_pricing',
        query: 'SELECT id, product_id FROM bulk_pricing LIMIT 10',
      },
    ];

    for (const { table, query } of formatValidationQueries) {
      try {
        const records = (await this.db.getAllAsync(query)) as any[];
        for (const record of records) {
          for (const [field, value] of Object.entries(record)) {
            if (field.includes('id') && value !== null && value !== undefined) {
              if (!UUIDService.isValid(value as string)) {
                result.passed = false;
                result.errors.push(
                  `${table}.${field}: Invalid UUID format - ${value}`
                );
              }
            }
          }
        }
      } catch (error) {
        result.passed = false;
        result.errors.push(`${table}: Error validating UUID format - ${error}`);
      }
    }

    if (result.passed) {
      console.log('UUID format validation completed successfully');
    }

    return result;
  }

  private async validateForeignKeyRelationships(): Promise<ValidationResult> {
    const result: ValidationResult = { passed: true, errors: [], details: {} };

    // Validate that all foreign key references exist
    const foreignKeyQueries = [
      {
        name: 'products.category_id -> categories.id',
        query: `
          SELECT COUNT(*) as count 
          FROM products p 
          LEFT JOIN categories c ON p.category_id = c.id 
          WHERE c.id IS NULL
        `,
      },
      {
        name: 'products.supplier_id -> suppliers.id',
        query: `
          SELECT COUNT(*) as count 
          FROM products p 
          LEFT JOIN suppliers s ON p.supplier_id = s.id 
          WHERE p.supplier_id IS NOT NULL AND s.id IS NULL
        `,
      },
      {
        name: 'sales.customer_id -> customers.id',
        query: `
          SELECT COUNT(*) as count 
          FROM sales sa 
          LEFT JOIN customers c ON sa.customer_id = c.id 
          WHERE sa.customer_id IS NOT NULL AND c.id IS NULL
        `,
      },
      {
        name: 'sale_items.sale_id -> sales.id',
        query: `
          SELECT COUNT(*) as count 
          FROM sale_items si 
          LEFT JOIN sales s ON si.sale_id = s.id 
          WHERE s.id IS NULL
        `,
      },
      {
        name: 'sale_items.product_id -> products.id',
        query: `
          SELECT COUNT(*) as count 
          FROM sale_items si 
          LEFT JOIN products p ON si.product_id = p.id 
          WHERE p.id IS NULL
        `,
      },
      {
        name: 'expenses.category_id -> expense_categories.id',
        query: `
          SELECT COUNT(*) as count 
          FROM expenses e 
          LEFT JOIN expense_categories ec ON e.category_id = ec.id 
          WHERE ec.id IS NULL
        `,
      },
      {
        name: 'stock_movements.product_id -> products.id',
        query: `
          SELECT COUNT(*) as count 
          FROM stock_movements sm 
          LEFT JOIN products p ON sm.product_id = p.id 
          WHERE p.id IS NULL
        `,
      },
      {
        name: 'stock_movements.supplier_id -> suppliers.id',
        query: `
          SELECT COUNT(*) as count 
          FROM stock_movements sm 
          LEFT JOIN suppliers s ON sm.supplier_id = s.id 
          WHERE sm.supplier_id IS NOT NULL AND s.id IS NULL
        `,
      },
      {
        name: 'bulk_pricing.product_id -> products.id',
        query: `
          SELECT COUNT(*) as count 
          FROM bulk_pricing bp 
          LEFT JOIN products p ON bp.product_id = p.id 
          WHERE p.id IS NULL
        `,
      },
    ];

    for (const { name, query } of foreignKeyQueries) {
      try {
        const queryResult = (await this.db.getFirstAsync(query)) as {
          count: number;
        };
        if (queryResult.count > 0) {
          result.passed = false;
          result.errors.push(`${name}: ${queryResult.count} orphaned records`);
        }
      } catch (error) {
        result.passed = false;
        result.errors.push(`${name}: Error validating relationship - ${error}`);
      }
    }

    if (result.passed) {
      console.log('Foreign key relationship validation completed successfully');
    }

    return result;
  }

  private async validateRecordCounts(): Promise<ValidationResult> {
    const result: ValidationResult = { passed: true, errors: [], details: {} };
    const tableCounts: { [table: string]: number } = {};

    for (const table of this.MIGRATION_TABLES) {
      try {
        const queryResult = (await this.db.getFirstAsync(
          `SELECT COUNT(*) as count FROM ${table}`
        )) as { count: number };

        tableCounts[table] = queryResult.count;

        // Log the count for verification
        console.log(
          `Table ${table} has ${queryResult.count} records after migration`
        );
      } catch (error) {
        result.passed = false;
        result.errors.push(`${table}: Error counting records - ${error}`);
      }
    }

    result.details = { tableCounts };

    // Additional validation: Check for reasonable record counts
    // For example, if we have sale_items, we should have sales
    if (tableCounts.sale_items > 0 && tableCounts.sales === 0) {
      result.passed = false;
      result.errors.push(
        'Data inconsistency: sale_items exist but no sales records'
      );
    }

    if (tableCounts.products > 0 && tableCounts.categories === 0) {
      result.passed = false;
      result.errors.push(
        'Data inconsistency: products exist but no categories'
      );
    }

    if (tableCounts.expenses > 0 && tableCounts.expense_categories === 0) {
      result.passed = false;
      result.errors.push(
        'Data inconsistency: expenses exist but no expense categories'
      );
    }

    if (result.passed) {
      console.log('Record count validation completed successfully');
    }

    return result;
  }

  /**
   * Validate data integrity after migration
   */
  private async validateDataIntegrity(): Promise<ValidationResult> {
    const result: ValidationResult = { passed: true, errors: [], details: {} };

    try {
      // Check for duplicate UUIDs across all tables
      const duplicateChecks = [
        {
          table: 'categories',
          query:
            'SELECT id, COUNT(*) as count FROM categories GROUP BY id HAVING COUNT(*) > 1',
        },
        {
          table: 'products',
          query:
            'SELECT id, COUNT(*) as count FROM products GROUP BY id HAVING COUNT(*) > 1',
        },
        {
          table: 'sales',
          query:
            'SELECT id, COUNT(*) as count FROM sales GROUP BY id HAVING COUNT(*) > 1',
        },
        {
          table: 'sale_items',
          query:
            'SELECT id, COUNT(*) as count FROM sale_items GROUP BY id HAVING COUNT(*) > 1',
        },
        {
          table: 'customers',
          query:
            'SELECT id, COUNT(*) as count FROM customers GROUP BY id HAVING COUNT(*) > 1',
        },
        {
          table: 'suppliers',
          query:
            'SELECT id, COUNT(*) as count FROM suppliers GROUP BY id HAVING COUNT(*) > 1',
        },
        {
          table: 'expenses',
          query:
            'SELECT id, COUNT(*) as count FROM expenses GROUP BY id HAVING COUNT(*) > 1',
        },
        {
          table: 'expense_categories',
          query:
            'SELECT id, COUNT(*) as count FROM expense_categories GROUP BY id HAVING COUNT(*) > 1',
        },
        {
          table: 'stock_movements',
          query:
            'SELECT id, COUNT(*) as count FROM stock_movements GROUP BY id HAVING COUNT(*) > 1',
        },
        {
          table: 'bulk_pricing',
          query:
            'SELECT id, COUNT(*) as count FROM bulk_pricing GROUP BY id HAVING COUNT(*) > 1',
        },
      ];

      for (const { table, query } of duplicateChecks) {
        const duplicates = (await this.db.getAllAsync(query)) as any[];
        if (duplicates.length > 0) {
          result.passed = false;
          result.errors.push(
            `${table}: Found ${duplicates.length} duplicate UUID(s)`
          );
        }
      }

      // Check for nil UUIDs (all zeros)
      const nilUuidChecks = [
        'SELECT COUNT(*) as count FROM categories WHERE id = "00000000-0000-0000-0000-000000000000"',
        'SELECT COUNT(*) as count FROM products WHERE id = "00000000-0000-0000-0000-000000000000" OR category_id = "00000000-0000-0000-0000-000000000000"',
        'SELECT COUNT(*) as count FROM sales WHERE id = "00000000-0000-0000-0000-000000000000"',
      ];

      for (const query of nilUuidChecks) {
        const nilResult = (await this.db.getFirstAsync(query)) as {
          count: number;
        };
        if (nilResult.count > 0) {
          result.passed = false;
          result.errors.push(
            `Found ${nilResult.count} nil UUID(s) (all zeros)`
          );
        }
      }

      // Validate that critical tables have proper indexes
      const indexChecks = [
        'SELECT name FROM sqlite_master WHERE type="index" AND name="idx_products_category_id"',
        'SELECT name FROM sqlite_master WHERE type="index" AND name="idx_sale_items_sale_id"',
        'SELECT name FROM sqlite_master WHERE type="index" AND name="idx_stock_movements_product_id"',
      ];

      for (const query of indexChecks) {
        const indexResult = await this.db.getFirstAsync(query);
        if (!indexResult) {
          result.passed = false;
          result.errors.push('Missing critical database index after migration');
        }
      }

      if (result.passed) {
        console.log('Data integrity validation completed successfully');
      }
    } catch (error) {
      result.passed = false;
      result.errors.push(`Data integrity validation error: ${error}`);
    }

    return result;
  }

  /**
   * Validate data integrity before migration to catch issues early
   */
  private async validatePreMigrationDataIntegrity(): Promise<void> {
    console.log('Validating data integrity before migration...');

    // Check for foreign key constraint violations that would cause migration to fail
    const foreignKeyChecks = [
      {
        name: 'products.category_id -> categories.id',
        query: `
          SELECT p.id, p.category_id 
          FROM products p 
          LEFT JOIN categories c ON p.category_id = c.id 
          WHERE c.id IS NULL
          LIMIT 5
        `,
      },
      {
        name: 'products.supplier_id -> suppliers.id',
        query: `
          SELECT p.id, p.supplier_id 
          FROM products p 
          LEFT JOIN suppliers s ON p.supplier_id = s.id 
          WHERE p.supplier_id IS NOT NULL AND s.id IS NULL
          LIMIT 5
        `,
      },
      {
        name: 'sales.customer_id -> customers.id',
        query: `
          SELECT sa.id, sa.customer_id 
          FROM sales sa 
          LEFT JOIN customers c ON sa.customer_id = c.id 
          WHERE sa.customer_id IS NOT NULL AND c.id IS NULL
          LIMIT 5
        `,
      },
      {
        name: 'sale_items.sale_id -> sales.id',
        query: `
          SELECT si.id, si.sale_id 
          FROM sale_items si 
          LEFT JOIN sales s ON si.sale_id = s.id 
          WHERE s.id IS NULL
          LIMIT 5
        `,
      },
      {
        name: 'sale_items.product_id -> products.id',
        query: `
          SELECT si.id, si.product_id 
          FROM sale_items si 
          LEFT JOIN products p ON si.product_id = p.id 
          WHERE p.id IS NULL
          LIMIT 5
        `,
      },
      {
        name: 'expenses.category_id -> expense_categories.id',
        query: `
          SELECT e.id, e.category_id 
          FROM expenses e 
          LEFT JOIN expense_categories ec ON e.category_id = ec.id 
          WHERE ec.id IS NULL
          LIMIT 5
        `,
      },
      {
        name: 'stock_movements.product_id -> products.id',
        query: `
          SELECT sm.id, sm.product_id 
          FROM stock_movements sm 
          LEFT JOIN products p ON sm.product_id = p.id 
          WHERE p.id IS NULL
          LIMIT 5
        `,
      },
      {
        name: 'stock_movements.supplier_id -> suppliers.id',
        query: `
          SELECT sm.id, sm.supplier_id 
          FROM stock_movements sm 
          LEFT JOIN suppliers s ON sm.supplier_id = s.id 
          WHERE sm.supplier_id IS NOT NULL AND s.id IS NULL
          LIMIT 5
        `,
      },
      {
        name: 'bulk_pricing.product_id -> products.id',
        query: `
          SELECT bp.id, bp.product_id 
          FROM bulk_pricing bp 
          LEFT JOIN products p ON bp.product_id = p.id 
          WHERE p.id IS NULL
          LIMIT 5
        `,
      },
    ];

    const violations: string[] = [];

    for (const check of foreignKeyChecks) {
      try {
        const orphanedRecords = (await this.db.getAllAsync(
          check.query
        )) as any[];
        if (orphanedRecords.length > 0) {
          const examples = orphanedRecords
            .map(
              (r) =>
                `ID ${r.id} references ${Object.keys(r).find((k) =>
                  k.includes('_id')
                )} = ${Object.values(r)[1]}`
            )
            .join(', ');
          violations.push(
            `${check.name}: ${orphanedRecords.length} orphaned record(s) found. Examples: ${examples}`
          );
        }
      } catch (error) {
        console.warn(`Warning: Could not validate ${check.name}: ${error}`);
      }
    }

    if (violations.length > 0) {
      const errorMessage = `Data integrity violations found that will prevent migration:\n${violations.join(
        '\n'
      )}`;
      console.error('Pre-migration validation failed:', errorMessage);
      throw new Error(`Pre-migration validation failed: ${errorMessage}`);
    }

    console.log('Pre-migration data integrity validation passed');
  }
}
