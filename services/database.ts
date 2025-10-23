import * as SQLite from 'expo-sqlite';
import {
  DatabaseOptimizer,
  PerformanceMonitor,
} from '../utils/databaseOptimization';
import { generateUUID } from '../utils/uuid';
import { UUIDMigrationService, MigrationReport } from './uuidMigrationService';
import { MigrationStatusService } from './migrationStatusService';
import {
  formatTimestampForDatabase,
  getStartOfDayForDB,
  getEndOfDayForDB,
  getStartOfMonthForDB,
  getEndOfMonthForDB,
  getTimezoneAwareDateRangeForDB,
  getTimezoneAwareTodayRangeForDB,
  getTimezoneAwareCurrentMonthRangeForDB,
  getTimezoneAwareCurrentYearRangeForDB,
  getTimezoneAwareMonthRangeForDB,
} from '@/utils/dateUtils';

export interface Product {
  id: string;
  name: string;
  barcode?: string; // Make barcode optional
  category_id: string; // Changed from category string to category_id string
  category?: string; // Optional category name for joined queries
  price: number;
  cost: number;
  quantity: number;
  min_stock: number;
  supplier_id?: string; // Make supplier_id optional
  supplier_name?: string; // For joined queries
  imageUrl?: string; // Optional image URL property
  bulk_pricing?: BulkPricing[]; // For joined queries
  has_bulk_pricing?: boolean; // Simple boolean flag for performance
  created_at: string;
  updated_at: string;
}

// Pagination interfaces
export interface PaginatedResult<T> {
  data: T[];
  hasMore: boolean;
  total?: number;
  page: number;
}

export interface ProductSearchParams {
  searchQuery?: string;
  categoryId?: string;
  page: number;
  limit: number;
}

export interface Sale {
  id: string;
  total: number;
  payment_method: string;
  note?: string; // Optional note field
  customer_id?: string; // Optional customer relationship
  customer_name?: string; // For joined queries
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  price: number;
  cost: number;
  discount: number; // Discount amount
  subtotal: number; // (price * quantity) - discount
}

export interface Supplier {
  id: string;
  name: string;
  contact_name: string;
  phone: string;
  email?: string; // Make email optional
  address: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Expense {
  id: string;
  category_id: string;
  amount: number;
  description: string;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
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
  id: string;
  product_id: string;
  product_name?: string; // For joined queries
  type: 'stock_in' | 'stock_out';
  quantity: number;
  reason?: string;
  supplier_id?: string; // Optional: some stock_in may not be from suppliers
  supplier_name?: string; // For joined queries
  reference_number?: string;
  unit_cost?: number;
  created_at: string;
}

export interface BulkPricing {
  id: string;
  product_id: string;
  min_quantity: number;
  bulk_price: number;
  created_at: string;
}

// Enhanced supplier management interfaces
export interface SupplierWithStats {
  id: string;
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
  product_id: string;
  product_name: string;
  current_stock: number;
  last_delivery_date?: string;
  total_received: number;
}

// ShopSettings moved to shopSettingsStorage.ts (using AsyncStorage instead of SQLite)

export class DatabaseService {
  private db: SQLite.SQLiteDatabase;
  private bulkPricingCache = new Map<string, BulkPricing[]>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(database: SQLite.SQLiteDatabase) {
    this.db = database;
  }

  async createTables() {
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        contact_name TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        barcode TEXT, /* Removed UNIQUE constraint */
        category_id TEXT NOT NULL,
        price REAL NOT NULL,
        cost REAL NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        min_stock INTEGER NOT NULL DEFAULT 10,
        supplier_id TEXT,
        imageUrl TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
      );

      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        total REAL NOT NULL,
        payment_method TEXT NOT NULL,
        note TEXT,
        customer_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id)
      );

      CREATE TABLE IF NOT EXISTS sale_items (
        id TEXT PRIMARY KEY,
        sale_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        cost REAL NOT NULL,
        discount REAL DEFAULT 0,
        subtotal REAL NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
      );

      CREATE TABLE IF NOT EXISTS expense_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES expense_categories (id)
      );

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        total_spent REAL DEFAULT 0,
        visit_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS stock_movements (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('stock_in', 'stock_out')),
        quantity INTEGER NOT NULL,
        reason TEXT,
        supplier_id TEXT,
        reference_number TEXT,
        unit_cost REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products (id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
      );

      CREATE TABLE IF NOT EXISTS bulk_pricing (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        min_quantity INTEGER NOT NULL,
        bulk_price REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products (id)
      );

      -- shop_settings table removed (now using AsyncStorage)
      
      CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
      CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
      CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
      CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_supplier_id ON stock_movements(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_bulk_pricing_product_id ON bulk_pricing(product_id);
      
      -- Performance indexes for product search and pagination
      CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
      CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
      CREATE INDEX IF NOT EXISTS idx_products_category_updated ON products(category_id, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_products_updated_name ON products(updated_at DESC, name ASC);
      CREATE INDEX IF NOT EXISTS idx_bulk_pricing_product_exists ON bulk_pricing(product_id);
    `);

    // Add description column to categories if it doesn't exist
    await this.migrateDatabase();
  }

  async migrateDatabase() {
    try {
      // Check if description column exists in categories table
      const tableInfo = await this.db.getAllAsync(
        'PRAGMA table_info(categories)'
      );
      const hasDescriptionColumn = tableInfo.some(
        (column: any) => column.name === 'description'
      );

      if (!hasDescriptionColumn) {
        await this.db.execAsync(
          'ALTER TABLE categories ADD COLUMN description TEXT'
        );
        console.log('Added description column to categories table');
      }

      // Check if cost column exists in sale_items table
      const saleItemsInfo = await this.db.getAllAsync(
        'PRAGMA table_info(sale_items)'
      );
      const hasCostColumn = saleItemsInfo.some(
        (column: any) => column.name === 'cost'
      );

      if (!hasCostColumn) {
        await this.db.execAsync(
          'ALTER TABLE sale_items ADD COLUMN cost INTEGER DEFAULT 0'
        );
        console.log('Added cost column to sale_items table');
      }

      // Check if imageUrl column exists in products table
      const productsInfo = await this.db.getAllAsync(
        'PRAGMA table_info(products)'
      );
      const hasImageUrlColumn = productsInfo.some(
        (column: any) => column.name === 'imageUrl'
      );

      if (!hasImageUrlColumn) {
        await this.db.execAsync(
          'ALTER TABLE products ADD COLUMN imageUrl TEXT'
        );
        console.log('Added imageUrl column to products table');
      }

      // CRITICAL MIGRATION: Convert category TEXT to category_id INTEGER
      const productTableInfo = await this.db.getAllAsync(
        'PRAGMA table_info(products)'
      );
      const hasCategoryIdColumn = productTableInfo.some(
        (column: any) => column.name === 'category_id'
      );

      if (!hasCategoryIdColumn) {
        console.log('Starting category relationship migration...');

        // Step 1: Add category_id column
        await this.db.execAsync(
          'ALTER TABLE products ADD COLUMN category_id INTEGER'
        );

        // Step 2: Update category_id based on existing category names
        const categories = await this.db.getAllAsync(
          'SELECT id, name FROM categories'
        );

        for (const category of categories as { id: string; name: string }[]) {
          await this.db.runAsync(
            'UPDATE products SET category_id = ? WHERE category = ?',
            [category.id, category.name]
          );
        }

        // Step 3: Set default category for products without valid category
        const defaultCategory = (await this.db.getFirstAsync(
          'SELECT id FROM categories LIMIT 1'
        )) as { id: string } | null;

        if (defaultCategory) {
          await this.db.runAsync(
            'UPDATE products SET category_id = ? WHERE category_id IS NULL',
            [defaultCategory.id]
          );
        }

        // Step 4: Create new products table with proper foreign key
        await this.db.execAsync(`
          CREATE TABLE products_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            barcode TEXT,
            category_id INTEGER NOT NULL,
            price INTEGER NOT NULL,
            cost INTEGER NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 0,
            min_stock INTEGER NOT NULL DEFAULT 10,
            supplier_id INTEGER,
            imageUrl TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories (id),
            FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
          );
        `);

        // Step 5: Copy data to new table
        await this.db.execAsync(`
          INSERT INTO products_new (id, name, barcode, category_id, price, cost, quantity, min_stock, supplier_id, imageUrl, created_at, updated_at)
          SELECT id, name, barcode, category_id, price, cost, quantity, min_stock, supplier_id, imageUrl, created_at, updated_at
          FROM products
          WHERE category_id IS NOT NULL;
        `);

        // Step 6: Drop old table and rename new table
        await this.db.execAsync('DROP TABLE products');
        await this.db.execAsync('ALTER TABLE products_new RENAME TO products');

        console.log('Category relationship migration completed successfully!');
      }

      // Migration: Add note column to sales table
      const salesTableInfo = await this.db.getAllAsync(
        'PRAGMA table_info(sales)'
      );
      const hasNoteColumn = salesTableInfo.some(
        (column: any) => column.name === 'note'
      );

      if (!hasNoteColumn) {
        await this.db.execAsync('ALTER TABLE sales ADD COLUMN note TEXT');
        console.log('Added note column to sales table');
      }

      // Migration: Add discount column to sale_items table
      const saleItemsTableInfo = await this.db.getAllAsync(
        'PRAGMA table_info(sale_items)'
      );
      const hasDiscountColumn = saleItemsTableInfo.some(
        (column: any) => column.name === 'discount'
      );

      if (!hasDiscountColumn) {
        await this.db.execAsync(
          'ALTER TABLE sale_items ADD COLUMN discount INTEGER DEFAULT 0'
        );
        console.log('Added discount column to sale_items table');

        // Update existing records to have 0 discount
        await this.db.execAsync(
          'UPDATE sale_items SET discount = 0 WHERE discount IS NULL'
        );
        console.log('Updated existing sale_items with default discount value');
      }

      // Enhanced features migration
      await this.migrateToEnhancedFeatures();

      // Decimal pricing migration
      await this.migrateToDecimalPricing();

      // shop_settings table migration removed (now using AsyncStorage)
    } catch (error) {
      console.log('Migration completed or column already exists:', error);
    }
  }

  async migrateToEnhancedFeatures() {
    await this.db.execAsync('BEGIN TRANSACTION');

    try {
      // Create customers table
      await this.createCustomersTable();

      // Create stock_movements table
      await this.createStockMovementsTable();

      // Create bulk_pricing table
      await this.createBulkPricingTable();

      // Add customer_id to sales table
      await this.addCustomerIdToSales();

      // Create indexes for performance
      await this.createEnhancedIndexes();

      await this.db.execAsync('COMMIT');
      console.log('Enhanced features migration completed successfully!');
    } catch (error) {
      await this.db.execAsync('ROLLBACK');
      console.error('Enhanced features migration failed, rolling back:', error);
      throw error;
    }
  }

  async createCustomersTable() {
    // Check if customers table already exists
    const tableExists = await this.db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='customers'"
    );

    if (!tableExists) {
      await this.db.execAsync(`
        CREATE TABLE customers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          address TEXT,
          total_spent REAL DEFAULT 0,
          visit_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Created customers table');
    }
  }

  async createStockMovementsTable() {
    // Check if stock_movements table already exists
    const tableExists = await this.db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='stock_movements'"
    );

    if (!tableExists) {
      await this.db.execAsync(`
        CREATE TABLE stock_movements (
          id TEXT PRIMARY KEY,
          product_id TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('stock_in', 'stock_out')),
          quantity INTEGER NOT NULL,
          reason TEXT,
          supplier_id TEXT,
          reference_number TEXT,
          unit_cost REAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products (id),
          FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
        );
      `);
      console.log('Created stock_movements table');
    }
  }

  async createBulkPricingTable() {
    // Check if bulk_pricing table already exists
    const tableExists = await this.db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='bulk_pricing'"
    );

    if (!tableExists) {
      await this.db.execAsync(`
        CREATE TABLE bulk_pricing (
          id TEXT PRIMARY KEY,
          product_id TEXT NOT NULL,
          min_quantity INTEGER NOT NULL,
          bulk_price REAL NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products (id)
        );
      `);
      console.log('Created bulk_pricing table');
    }
  }

  async addCustomerIdToSales() {
    // Check if customer_id column exists in sales table
    const salesTableInfo = await this.db.getAllAsync(
      'PRAGMA table_info(sales)'
    );
    const hasCustomerIdColumn = salesTableInfo.some(
      (column: any) => column.name === 'customer_id'
    );

    if (!hasCustomerIdColumn) {
      await this.db.execAsync(
        'ALTER TABLE sales ADD COLUMN customer_id INTEGER'
      );
      console.log('Added customer_id column to sales table');
    }
  }

  async createEnhancedIndexes() {
    // Customer search optimization
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)'
    );
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)'
    );

    // Stock movement queries
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id)'
    );
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at)'
    );
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type)'
    );

    // Bulk pricing lookups
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_bulk_pricing_product_id ON bulk_pricing(product_id)'
    );
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_bulk_pricing_min_quantity ON bulk_pricing(min_quantity)'
    );

    // Enhanced sales queries
    await this.db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id)'
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

    console.log('Created enhanced feature indexes');
  }

  async migrateToDecimalPricing() {
    await this.db.execAsync('BEGIN TRANSACTION');

    try {
      // Check if decimal pricing migration has already been done
      const productsInfo = await this.db.getAllAsync(
        'PRAGMA table_info(products)'
      );
      const hasDecimalPrice = productsInfo.some(
        (column: any) => column.name === 'price' && column.type === 'REAL'
      );

      if (!hasDecimalPrice) {
        console.log('Starting decimal pricing migration...');

        // Step 1: Add new decimal columns
        await this.addDecimalPriceColumns();

        // Step 2: Migrate data from integer to decimal (divide by 100 for existing integer prices)
        await this.migrateIntegerToDecimalPrices();

        // Step 3: Verify data integrity
        await this.verifyPriceMigration();

        // Step 4: Drop old columns and rename new ones
        await this.finalizeDecimalMigration();

        console.log('Decimal pricing migration completed successfully!');
      }

      await this.db.execAsync('COMMIT');
    } catch (error) {
      await this.db.execAsync('ROLLBACK');
      console.error('Decimal pricing migration failed, rolling back:', error);
      throw error;
    }
  }

  async addDecimalPriceColumns() {
    // Add decimal columns to products table
    await this.db.execAsync(
      'ALTER TABLE products ADD COLUMN price_decimal REAL'
    );
    await this.db.execAsync(
      'ALTER TABLE products ADD COLUMN cost_decimal REAL'
    );

    // Add decimal columns to sales table
    await this.db.execAsync('ALTER TABLE sales ADD COLUMN total_decimal REAL');

    // Add decimal columns to sale_items table
    await this.db.execAsync(
      'ALTER TABLE sale_items ADD COLUMN price_decimal REAL'
    );
    await this.db.execAsync(
      'ALTER TABLE sale_items ADD COLUMN cost_decimal REAL'
    );
    await this.db.execAsync(
      'ALTER TABLE sale_items ADD COLUMN discount_decimal REAL'
    );
    await this.db.execAsync(
      'ALTER TABLE sale_items ADD COLUMN subtotal_decimal REAL'
    );

    // Add decimal columns to bulk_pricing table
    await this.db.execAsync(
      'ALTER TABLE bulk_pricing ADD COLUMN bulk_price_decimal REAL'
    );

    // Add decimal columns to stock_movements table
    await this.db.execAsync(
      'ALTER TABLE stock_movements ADD COLUMN unit_cost_decimal REAL'
    );

    // Add decimal columns to expenses table
    await this.db.execAsync(
      'ALTER TABLE expenses ADD COLUMN amount_decimal REAL'
    );

    // Add decimal columns to customers table (total_spent)
    await this.db.execAsync(
      'ALTER TABLE customers ADD COLUMN total_spent_decimal REAL'
    );

    console.log('Added decimal price columns');
  }

  async migrateIntegerToDecimalPrices() {
    // Migrate products table (assuming prices were stored as cents/smallest unit)
    await this.db.execAsync(
      'UPDATE products SET price_decimal = CAST(price AS REAL), cost_decimal = CAST(cost AS REAL)'
    );

    // Migrate sales table
    await this.db.execAsync(
      'UPDATE sales SET total_decimal = CAST(total AS REAL)'
    );

    // Migrate sale_items table
    await this.db.execAsync(`
      UPDATE sale_items SET 
        price_decimal = CAST(price AS REAL),
        cost_decimal = CAST(cost AS REAL),
        discount_decimal = CAST(discount AS REAL),
        subtotal_decimal = CAST(subtotal AS REAL)
    `);

    // Migrate bulk_pricing table
    await this.db.execAsync(
      'UPDATE bulk_pricing SET bulk_price_decimal = CAST(bulk_price AS REAL)'
    );

    // Migrate stock_movements table
    await this.db.execAsync(
      'UPDATE stock_movements SET unit_cost_decimal = CAST(unit_cost AS REAL) WHERE unit_cost IS NOT NULL'
    );

    // Migrate expenses table
    await this.db.execAsync(
      'UPDATE expenses SET amount_decimal = CAST(amount AS REAL)'
    );

    // Migrate customers table
    await this.db.execAsync(
      'UPDATE customers SET total_spent_decimal = CAST(total_spent AS REAL)'
    );

    console.log('Migrated integer prices to decimal format');
  }

  async verifyPriceMigration(): Promise<void> {
    // Verify that all prices were migrated correctly
    const verificationQueries = [
      {
        query:
          'SELECT COUNT(*) as count FROM products WHERE price_decimal IS NULL',
        table: 'products',
      },
      {
        query:
          'SELECT COUNT(*) as count FROM sales WHERE total_decimal IS NULL',
        table: 'sales',
      },
      {
        query:
          'SELECT COUNT(*) as count FROM sale_items WHERE price_decimal IS NULL OR cost_decimal IS NULL OR discount_decimal IS NULL OR subtotal_decimal IS NULL',
        table: 'sale_items',
      },
      {
        query:
          'SELECT COUNT(*) as count FROM bulk_pricing WHERE bulk_price_decimal IS NULL',
        table: 'bulk_pricing',
      },
      {
        query:
          'SELECT COUNT(*) as count FROM expenses WHERE amount_decimal IS NULL',
        table: 'expenses',
      },
      {
        query:
          'SELECT COUNT(*) as count FROM customers WHERE total_spent_decimal IS NULL',
        table: 'customers',
      },
    ];

    for (const { query, table } of verificationQueries) {
      const result = (await this.db.getFirstAsync(query)) as { count: number };
      if (result.count > 0) {
        throw new Error(
          `Migration verification failed for ${table}: ${result.count} records with NULL decimal values`
        );
      }
    }

    console.log('Price migration verification completed successfully');
  }

  async finalizeDecimalMigration() {
    // Create new tables with REAL price columns
    await this.db.execAsync(`
      CREATE TABLE products_decimal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        barcode TEXT,
        category_id INTEGER NOT NULL,
        price REAL NOT NULL,
        cost REAL NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        min_stock INTEGER NOT NULL DEFAULT 10,
        supplier_id INTEGER,
        imageUrl TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
      );
    `);

    await this.db.execAsync(`
      CREATE TABLE sales_decimal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total REAL NOT NULL,
        payment_method TEXT NOT NULL,
        note TEXT,
        customer_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id)
      );
    `);

    await this.db.execAsync(`
      CREATE TABLE sale_items_decimal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        cost REAL NOT NULL,
        discount REAL DEFAULT 0,
        subtotal REAL NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
      );
    `);

    await this.db.execAsync(`
      CREATE TABLE bulk_pricing_decimal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        min_quantity INTEGER NOT NULL,
        bulk_price REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products (id)
      );
    `);

    await this.db.execAsync(`
      CREATE TABLE stock_movements_decimal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('stock_in', 'stock_out')),
        quantity INTEGER NOT NULL,
        reason TEXT,
        supplier_id INTEGER,
        reference_number TEXT,
        unit_cost REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products (id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
      );
    `);

    await this.db.execAsync(`
      CREATE TABLE expenses_decimal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES expense_categories (id)
      );
    `);

    await this.db.execAsync(`
      CREATE TABLE customers_decimal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        total_spent REAL DEFAULT 0,
        visit_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Copy data to new tables
    await this.db.execAsync(`
      INSERT INTO products_decimal (id, name, barcode, category_id, price, cost, quantity, min_stock, supplier_id, imageUrl, created_at, updated_at)
      SELECT id, name, barcode, category_id, price_decimal, cost_decimal, quantity, min_stock, supplier_id, imageUrl, created_at, updated_at
      FROM products;
    `);

    await this.db.execAsync(`
      INSERT INTO sales_decimal (id, total, payment_method, note, customer_id, created_at)
      SELECT id, total_decimal, payment_method, note, customer_id, created_at
      FROM sales;
    `);

    await this.db.execAsync(`
      INSERT INTO sale_items_decimal (id, sale_id, product_id, quantity, price, cost, discount, subtotal)
      SELECT id, sale_id, product_id, quantity, price_decimal, cost_decimal, discount_decimal, subtotal_decimal
      FROM sale_items;
    `);

    await this.db.execAsync(`
      INSERT INTO bulk_pricing_decimal (id, product_id, min_quantity, bulk_price, created_at)
      SELECT id, product_id, min_quantity, bulk_price_decimal, created_at
      FROM bulk_pricing;
    `);

    await this.db.execAsync(`
      INSERT INTO stock_movements_decimal (id, product_id, type, quantity, reason, supplier_id, reference_number, unit_cost, created_at)
      SELECT id, product_id, type, quantity, reason, supplier_id, reference_number, unit_cost_decimal, created_at
      FROM stock_movements;
    `);

    await this.db.execAsync(`
      INSERT INTO expenses_decimal (id, category_id, amount, description, date, created_at, updated_at)
      SELECT id, category_id, amount_decimal, description, date, created_at, updated_at
      FROM expenses;
    `);

    await this.db.execAsync(`
      INSERT INTO customers_decimal (id, name, phone, email, address, total_spent, visit_count, created_at, updated_at)
      SELECT id, name, phone, email, address, total_spent_decimal, visit_count, created_at, updated_at
      FROM customers;
    `);

    // Drop old tables and rename new ones
    await this.db.execAsync('DROP TABLE products');
    await this.db.execAsync('ALTER TABLE products_decimal RENAME TO products');

    await this.db.execAsync('DROP TABLE sales');
    await this.db.execAsync('ALTER TABLE sales_decimal RENAME TO sales');

    await this.db.execAsync('DROP TABLE sale_items');
    await this.db.execAsync(
      'ALTER TABLE sale_items_decimal RENAME TO sale_items'
    );

    await this.db.execAsync('DROP TABLE bulk_pricing');
    await this.db.execAsync(
      'ALTER TABLE bulk_pricing_decimal RENAME TO bulk_pricing'
    );

    await this.db.execAsync('DROP TABLE stock_movements');
    await this.db.execAsync(
      'ALTER TABLE stock_movements_decimal RENAME TO stock_movements'
    );

    await this.db.execAsync('DROP TABLE expenses');
    await this.db.execAsync('ALTER TABLE expenses_decimal RENAME TO expenses');

    await this.db.execAsync('DROP TABLE customers');
    await this.db.execAsync(
      'ALTER TABLE customers_decimal RENAME TO customers'
    );

    // Recreate indexes
    await this.createEnhancedIndexes();

    console.log(
      'Finalized decimal migration - replaced integer tables with decimal tables'
    );
  }

  async seedInitialData() {
    // Check if data has already been seeded
    const existingProducts = await this.db.getFirstAsync(
      'SELECT COUNT(*) as count FROM products'
    );
    const hasProducts = (existingProducts as { count: number }).count > 0;

    // Only seed categories and suppliers if no products exist
    if (!hasProducts) {
      console.log('Seeding initial data with UUIDs...');
      const categories = [
        {
          name: 'အချိုရည်',
          description: 'အအေးမျိုးစုံ',
        },
      ];

      for (const category of categories) {
        const categoryId = generateUUID();
        try {
          await this.db.runAsync(
            'INSERT OR IGNORE INTO categories (id, name, description) VALUES (?, ?, ?)',
            [categoryId, category.name, category.description]
          );
        } catch (error) {
          // Fallback for databases without description column
          await this.db.runAsync(
            'INSERT OR IGNORE INTO categories (id, name) VALUES (?, ?)',
            [categoryId, category.name]
          );
        }
      }

      const suppliers = [
        {
          name: 'Myanmar Fresh Foods',
          contact_name: 'Thant Zin',
          phone: '09-123-456-789',
          email: 'thant@myanmarfresh.com',
          address: 'Yangon, Myanmar',
        },
      ];

      for (const supplier of suppliers) {
        const supplierId = generateUUID();
        await this.db.runAsync(
          'INSERT OR IGNORE INTO suppliers (id, name, contact_name, phone, email, address) VALUES (?, ?, ?, ?, ?, ?)',
          [
            supplierId,
            supplier.name,
            supplier.contact_name,
            supplier.phone,
            supplier.email,
            supplier.address,
          ]
        );
      }
    }

    // Seed expense categories if needed
    const existingExpenseCategories = await this.db.getFirstAsync(
      'SELECT COUNT(*) as count FROM expense_categories'
    );
    const hasExpenseCategories =
      (existingExpenseCategories as { count: number }).count > 0;

    if (!hasExpenseCategories) {
      const expenseCategories = [
        { name: 'Rent', description: 'Rent for store or office space' },
      ];

      for (const category of expenseCategories) {
        await this.addExpenseCategory(category.name, category.description);
      }

      console.log('Seeded expense categories');
    }

    // Verify UUID format for all seeded data
    await this.verifySeededDataUUIDs();

    // Only seed products if no products exist yet
    if (!hasProducts) {
      // Get category IDs for seeding products
      const categoryMap = new Map<string, string>();
      const categoriesForSeeding = (await this.db.getAllAsync(
        'SELECT id, name FROM categories'
      )) as { id: string; name: string }[];

      categoriesForSeeding.forEach((cat) => {
        categoryMap.set(cat.name, cat.id);
      });

      // Get supplier IDs for seeding products
      const supplierMap = new Map<string, string>();
      const suppliersForSeeding = (await this.db.getAllAsync(
        'SELECT id, name FROM suppliers'
      )) as { id: string; name: string }[];

      suppliersForSeeding.forEach((supplier) => {
        supplierMap.set(supplier.name, supplier.id);
      });

      const products = [
        {
          name: 'Speed ဗူးကြီး',
          barcode: '8901234567890',
          category_name: 'အချိုရည်',
          price: 1800,
          cost: 1200,
          quantity: 60,
          min_stock: 12,
          supplier_name: 'Myanmar Fresh Foods',
        },
      ];

      for (const product of products) {
        const categoryId = categoryMap.get(product.category_name);
        const supplierId = supplierMap.get(product.supplier_name);

        if (categoryId && supplierId) {
          const productId = generateUUID();
          await this.db.runAsync(
            'INSERT INTO products (id, name, barcode, category_id, price, cost, quantity, min_stock, supplier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              productId,
              product.name,
              product.barcode,
              categoryId,
              product.price,
              product.cost,
              product.quantity,
              product.min_stock,
              supplierId,
            ]
          );
        }
      }

      // Verify seeding was successful
      const seededCategories = await this.db.getFirstAsync(
        'SELECT COUNT(*) as count FROM categories'
      );
      const seededSuppliers = await this.db.getFirstAsync(
        'SELECT COUNT(*) as count FROM suppliers'
      );
      const seededProducts = await this.db.getFirstAsync(
        'SELECT COUNT(*) as count FROM products'
      );

      console.log(`Successfully seeded initial data with UUIDs:
        - Categories: ${(seededCategories as { count: number }).count}
        - Suppliers: ${(seededSuppliers as { count: number }).count}
        - Products: ${(seededProducts as { count: number }).count}`);
    }
  }

  private async verifySeededDataUUIDs(): Promise<void> {
    try {
      // Check categories have valid UUIDs
      const categories = (await this.db.getAllAsync(
        'SELECT id, name FROM categories LIMIT 5'
      )) as { id: string; name: string }[];

      // Check suppliers have valid UUIDs
      const suppliers = (await this.db.getAllAsync(
        'SELECT id, name FROM suppliers LIMIT 5'
      )) as { id: string; name: string }[];

      // Check products have valid UUIDs
      const products = (await this.db.getAllAsync(
        'SELECT id, name FROM products LIMIT 5'
      )) as { id: string; name: string }[];

      // Verify UUID format (basic check for length and hyphens)
      const isValidUUID = (uuid: string): boolean => {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
      };

      let invalidUUIDs = 0;

      categories.forEach((cat) => {
        if (!isValidUUID(cat.id)) {
          console.warn(`Invalid UUID for category "${cat.name}": ${cat.id}`);
          invalidUUIDs++;
        }
      });

      suppliers.forEach((supplier) => {
        if (!isValidUUID(supplier.id)) {
          console.warn(
            `Invalid UUID for supplier "${supplier.name}": ${supplier.id}`
          );
          invalidUUIDs++;
        }
      });

      products.forEach((product) => {
        if (!isValidUUID(product.id)) {
          console.warn(
            `Invalid UUID for product "${product.name}": ${product.id}`
          );
          invalidUUIDs++;
        }
      });

      if (invalidUUIDs === 0) {
        console.log('✓ All seeded data has valid UUIDs');
      } else {
        console.warn(`⚠ Found ${invalidUUIDs} invalid UUIDs in seeded data`);
      }
    } catch (error) {
      console.error('Error verifying seeded data UUIDs:', error);
    }
  }

  async getProducts(): Promise<Product[]> {
    const result = await this.db.getAllAsync(
      'SELECT p.*, c.name as category, s.name as supplier_name FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN suppliers s ON p.supplier_id = s.id ORDER BY p.name'
    );
    return result as Product[];
  }

  // New paginated product query with search and filtering
  async getProductsPaginated(params: {
    searchQuery?: string;
    categoryId?: string;
    sortBy?: 'name' | 'updated_at' | 'none';
    sortOrder?: 'asc' | 'desc';
    page: number;
    limit: number;
  }): Promise<{
    data: Product[];
    hasMore: boolean;
    total?: number;
    page: number;
  }> {
    const {
      searchQuery,
      categoryId,
      sortBy = 'updated_at',
      sortOrder = 'desc',
      page,
      limit,
    } = params;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams: any[] = [];

    // Build WHERE clause for search
    if (searchQuery && searchQuery.trim()) {
      whereClause = 'WHERE (p.name LIKE ? OR p.barcode = ?)';
      const searchPattern = `%${searchQuery.trim()}%`;
      queryParams.push(searchPattern, searchQuery.trim());
    }

    // Add category filter
    if (categoryId && categoryId !== 'All') {
      const categoryCondition = 'p.category_id = ?';
      if (whereClause) {
        whereClause += ` AND ${categoryCondition}`;
      } else {
        whereClause = `WHERE ${categoryCondition}`;
      }
      queryParams.push(categoryId);
    }

    // Build ORDER BY clause
    let orderByClause = '';
    if (sortBy === 'name') {
      orderByClause = `ORDER BY p.name ${sortOrder.toUpperCase()}`;
    } else if (sortBy === 'updated_at') {
      orderByClause = `ORDER BY p.updated_at ${sortOrder.toUpperCase()}, p.name ASC`;
    } else {
      // Default sorting (none or fallback)
      orderByClause = 'ORDER BY p.updated_at DESC, p.name ASC';
    }

    // Query with one extra item to check if there are more pages
    const query = `
      SELECT p.*, c.name as category, s.name as supplier_name,
             CASE WHEN bp.product_id IS NOT NULL THEN 1 ELSE 0 END as has_bulk_pricing
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN (SELECT DISTINCT product_id FROM bulk_pricing) bp ON p.id = bp.product_id
      ${whereClause}
      ${orderByClause}
      LIMIT ? OFFSET ?
    `;

    const result = await this.db.getAllAsync(query, [
      ...queryParams,
      limit + 1,
      offset,
    ]);
    const products = result as Product[];

    // Check if there are more pages
    const hasMore = products.length > limit;
    const data = hasMore ? products.slice(0, limit) : products;

    return {
      data,
      hasMore,
      page,
    };
  }

  // Lightweight search for sales screen
  async searchProductsForSale(
    query: string,
    limit: number = 20
  ): Promise<Product[]> {
    if (!query.trim()) return [];

    const searchPattern = `%${query.trim()}%`;
    const result = await this.db.getAllAsync(
      `
      SELECT p.id, p.name, p.barcode, p.price, p.cost, p.quantity, p.min_stock,
             c.name as category,
             CASE WHEN bp.product_id IS NOT NULL THEN 1 ELSE 0 END as has_bulk_pricing
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN (SELECT DISTINCT product_id FROM bulk_pricing) bp ON p.id = bp.product_id
      WHERE p.name LIKE ? OR p.barcode = ?
      ORDER BY 
        CASE WHEN p.barcode = ? THEN 0 ELSE 1 END,
        p.name ASC
      LIMIT ?
    `,
      [searchPattern, query.trim(), query.trim(), limit]
    );

    return result as Product[];
  }

  // Fast barcode lookup
  async findProductByBarcode(barcode: string): Promise<Product | null> {
    if (!barcode.trim()) return null;

    const result = await this.db.getFirstAsync(
      `
      SELECT p.*, c.name as category, s.name as supplier_name,
             CASE WHEN bp.product_id IS NOT NULL THEN 1 ELSE 0 END as has_bulk_pricing
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN (SELECT DISTINCT product_id FROM bulk_pricing) bp ON p.id = bp.product_id
      WHERE p.barcode = ?
    `,
      [barcode.trim()]
    );

    return result as Product | null;
  }

  // Simple bulk pricing check
  async hasProductBulkPricing(productId: string): Promise<boolean> {
    const result = await this.db.getFirstAsync(
      'SELECT 1 FROM bulk_pricing WHERE product_id = ? LIMIT 1',
      [productId]
    );
    return !!result;
  }

  // Get product counts by category
  async getCategoriesWithProductCounts(): Promise<
    Array<{ id: string; name: string; product_count: number }>
  > {
    try {
      const sql = `
        SELECT 
          c.id,
          c.name,
          COUNT(p.id) as product_count
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id
        GROUP BY c.id, c.name
        ORDER BY c.name
      `;
      const results = await this.db.getAllAsync(sql, []);
      return results as Array<{
        id: string;
        name: string;
        product_count: number;
      }>;
    } catch (error) {
      console.error('Error in getCategoriesWithProductCounts:', error);
      return [];
    }
  }

  async getProductsWithBulkPricing(): Promise<Product[]> {
    const products = await this.getProducts();

    // Get bulk pricing for all products in a single query
    const bulkPricingResult = (await this.db.getAllAsync(
      'SELECT * FROM bulk_pricing ORDER BY product_id, min_quantity'
    )) as BulkPricing[];

    // Group bulk pricing by product_id
    const bulkPricingMap = new Map<string, BulkPricing[]>();
    bulkPricingResult.forEach((bp) => {
      if (!bulkPricingMap.has(bp.product_id)) {
        bulkPricingMap.set(bp.product_id, []);
      }
      bulkPricingMap.get(bp.product_id)!.push(bp);
    });

    // Add bulk pricing to products
    return products.map((product) => ({
      ...product,
      bulk_pricing: bulkPricingMap.get(product.id) || [],
    }));
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    const result = await this.db.getAllAsync(
      'SELECT p.*, c.name as category, s.name as supplier_name FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.category_id = ? ORDER BY p.name',
      [categoryId]
    );
    return result as Product[];
  }

  async getProductByBarcode(barcode: string): Promise<Product | null> {
    const result = await this.db.getFirstAsync(
      'SELECT p.*, c.name as category, s.name as supplier_name FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.barcode = ?',
      [barcode]
    );
    return result as Product | null;
  }

  async addProduct(
    product:
      | Omit<Product, 'created_at' | 'updated_at'>
      | Omit<Product, 'id' | 'created_at' | 'updated_at'>
  ): Promise<string> {
    const id = (product as any).id || generateUUID();
    await this.db.runAsync(
      'INSERT INTO products (id, name, barcode, category_id, price, cost, quantity, min_stock, supplier_id, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        product.name,
        product.barcode || null, // Handle empty barcode
        product.category_id,
        product.price,
        product.cost,
        product.quantity,
        product.min_stock,
        product.supplier_id || null, // Handle optional supplier_id
        product.imageUrl || null,
      ]
    );
    return id;
  }

  async updateProduct(id: string, product: Partial<Product>): Promise<void> {
    // Filter out fields that shouldn't be updated and complex objects
    const allowedFields = [
      'name',
      'barcode',
      'category_id',
      'price',
      'cost',
      'quantity',
      'min_stock',
      'supplier_id',
      'imageUrl',
    ];
    const updateData: { [key: string]: any } = {};

    for (const key of allowedFields) {
      if (key in product) {
        updateData[key] = (product as any)[key];
      }
    }

    // If no fields to update, just update the timestamp
    if (Object.keys(updateData).length === 0) {
      await this.db.runAsync(
        `UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [id]
      );
      return;
    }

    const fields = Object.keys(updateData)
      .map((key) => `${key} = ?`)
      .join(', ');
    const values = Object.values(updateData).map((value) =>
      value === undefined ? null : value
    );

    await this.db.runAsync(
      `UPDATE products SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    );
  }

  async deleteProduct(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM products WHERE id = ?', [id]);
  }

  async getProductById(id: string): Promise<Product | null> {
    const result = await this.db.getFirstAsync(
      'SELECT p.*, c.name as category, s.name as supplier_name FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = ?',
      [id]
    );
    return result as Product | null;
  }

  async getLowStockProducts(): Promise<Product[]> {
    const result = await this.db.getAllAsync(
      'SELECT p.*, c.name as category, s.name as supplier_name FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.quantity <= p.min_stock ORDER BY p.quantity ASC'
    );
    return result as Product[];
  }

  async getCategories(): Promise<Category[]> {
    const result = await this.db.getAllAsync(
      'SELECT * FROM categories ORDER BY name'
    );
    return result as Category[];
  }

  async addCategory(
    category: Omit<Category, 'created_at'> | Omit<Category, 'id' | 'created_at'>
  ): Promise<string> {
    const id = (category as any).id || generateUUID();
    try {
      await this.db.runAsync(
        'INSERT INTO categories (id, name, description) VALUES (?, ?, ?)',
        [id, category.name, category.description || '']
      );
      return id;
    } catch (error) {
      // Fallback for databases without description column
      await this.db.runAsync(
        'INSERT INTO categories (id, name) VALUES (?, ?)',
        [id, category.name]
      );
      return id;
    }
  }

  async updateCategory(id: string, category: Partial<Category>): Promise<void> {
    // If no fields to update, return early
    if (Object.keys(category).length === 0) {
      return;
    }

    const fields = Object.keys(category)
      .map((key) => `${key} = ?`)
      .join(', ');
    const values = Object.values(category);

    try {
      await this.db.runAsync(`UPDATE categories SET ${fields} WHERE id = ?`, [
        ...values,
        id,
      ]);
    } catch (error) {
      // Fallback for databases without description column
      if (category.name) {
        await this.db.runAsync('UPDATE categories SET name = ? WHERE id = ?', [
          category.name,
          id,
        ]);
      }
    }
  }

  async deleteCategory(id: string): Promise<void> {
    // Check if category is being used by products
    const productsUsingCategory = (await this.db.getFirstAsync(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
      [id]
    )) as { count: number };

    if (productsUsingCategory.count > 0) {
      throw new Error('Cannot delete category that is being used by products');
    }

    await this.db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  }

  async getSuppliers(): Promise<Supplier[]> {
    const result = await this.db.getAllAsync(
      'SELECT * FROM suppliers ORDER BY name'
    );
    return result as Supplier[];
  }

  async getSupplierById(id: string): Promise<Supplier | null> {
    const result = await this.db.getFirstAsync(
      'SELECT * FROM suppliers WHERE id = ?',
      [id]
    );
    return result as Supplier | null;
  }

  // Enhanced supplier management methods
  async getSuppliersWithStats(
    searchQuery?: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<SupplierWithStats[]> {
    const offset = (page - 1) * pageSize;
    let query = `
      SELECT s.*, 
             COUNT(DISTINCT p.id) as total_products,
             COUNT(DISTINCT sm.id) as recent_deliveries,
             COALESCE(SUM(sm.quantity * sm.unit_cost), 0) as total_purchase_value
      FROM suppliers s
      LEFT JOIN products p ON s.id = p.supplier_id
      LEFT JOIN stock_movements sm ON s.id = sm.supplier_id AND sm.type = 'stock_in' AND sm.created_at >= datetime('now', '-30 days')
    `;

    let params: any[] = [];

    if (searchQuery) {
      query +=
        ' WHERE s.name LIKE ? OR s.contact_name LIKE ? OR s.phone LIKE ?';
      const searchPattern = `%${searchQuery}%`;
      params = [searchPattern, searchPattern, searchPattern];
    }

    query += ' GROUP BY s.id ORDER BY s.name ASC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const result = await this.db.getAllAsync(query, params);
    return result as SupplierWithStats[];
  }

  async addSupplier(
    supplier: Omit<Supplier, 'created_at'> | Omit<Supplier, 'id' | 'created_at'>
  ): Promise<string> {
    const id = (supplier as any).id || generateUUID();
    await this.db.runAsync(
      'INSERT INTO suppliers (id, name, contact_name, phone, email, address) VALUES (?, ?, ?, ?, ?, ?)',
      [
        id,
        supplier.name,
        supplier.contact_name,
        supplier.phone,
        supplier.email || null,
        supplier.address,
      ]
    );
    return id;
  }

  async updateSupplier(id: string, supplier: Partial<Supplier>): Promise<void> {
    const filteredKeys = Object.keys(supplier).filter(
      (key) => key !== 'id' && key !== 'created_at'
    );

    // If no fields to update, return early
    if (filteredKeys.length === 0) {
      return;
    }

    const fields = filteredKeys.map((key) => `${key} = ?`).join(', ');
    const values = filteredKeys.map((key) => (supplier as any)[key] || null);

    await this.db.runAsync(`UPDATE suppliers SET ${fields} WHERE id = ?`, [
      ...values,
      id,
    ]);
  }

  async deleteSupplier(id: string): Promise<void> {
    // Check if supplier has any products
    const productsCount = (await this.db.getFirstAsync(
      'SELECT COUNT(*) as count FROM products WHERE supplier_id = ?',
      [id]
    )) as { count: number };

    if (productsCount.count > 0) {
      throw new Error(
        'Cannot delete supplier with associated products. Please remove products first or assign them to another supplier.'
      );
    }

    await this.db.runAsync('DELETE FROM suppliers WHERE id = ?', [id]);
  }

  async getSupplierProducts(supplierId: string): Promise<SupplierProduct[]> {
    const result = await this.db.getAllAsync(
      `SELECT 
        p.id as product_id,
        p.name as product_name,
        p.quantity as current_stock,
        MAX(sm.created_at) as last_delivery_date,
        COALESCE(SUM(CASE WHEN sm.type = 'stock_in' THEN sm.quantity ELSE 0 END), 0) as total_received
       FROM products p
       LEFT JOIN stock_movements sm ON p.id = sm.product_id AND sm.supplier_id = ?
       WHERE p.supplier_id = ?
       GROUP BY p.id, p.name, p.quantity
       ORDER BY p.name`,
      [supplierId, supplierId]
    );
    return result as SupplierProduct[];
  }

  async getSupplierAnalytics(supplierId: string): Promise<{
    totalProducts: number;
    totalPurchaseValue: number;
    recentDeliveries: StockMovement[];
    topProducts: SupplierProduct[];
  }> {
    // Get total products
    const productsResult = (await this.db.getFirstAsync(
      'SELECT COUNT(*) as count FROM products WHERE supplier_id = ?',
      [supplierId]
    )) as { count: number };

    // Get total purchase value (last 30 days)
    const purchaseValueResult = (await this.db.getFirstAsync(
      `SELECT COALESCE(SUM(sm.quantity * sm.unit_cost), 0) as total_value
       FROM stock_movements sm
       WHERE sm.supplier_id = ? AND sm.type = 'stock_in' AND sm.created_at >= datetime('now', '-30 days')`,
      [supplierId]
    )) as { total_value: number };

    // Get recent deliveries
    const recentDeliveries = await this.getStockMovements(
      { supplierId, type: 'stock_in' },
      1,
      10
    );

    // Get top products by quantity received
    const topProducts = (await this.db.getAllAsync(
      `SELECT 
        p.id as product_id,
        p.name as product_name,
        p.quantity as current_stock,
        MAX(sm.created_at) as last_delivery_date,
        SUM(sm.quantity) as total_received
       FROM products p
       JOIN stock_movements sm ON p.id = sm.product_id
       WHERE p.supplier_id = ? AND sm.supplier_id = ? AND sm.type = 'stock_in'
       GROUP BY p.id, p.name, p.quantity
       ORDER BY total_received DESC
       LIMIT 5`,
      [supplierId, supplierId]
    )) as SupplierProduct[];

    return {
      totalProducts: productsResult.count,
      totalPurchaseValue: purchaseValueResult.total_value,
      recentDeliveries,
      topProducts,
    };
  }

  async addSale(
    sale: Omit<Sale, 'id' | 'created_at'> & { created_at?: string },
    items: Omit<SaleItem, 'id' | 'sale_id'>[]
  ): Promise<string> {
    // Start transaction for atomic operation
    await this.db.execAsync('BEGIN TRANSACTION');

    try {
      const saleId = generateUUID();
      const createdAt = formatTimestampForDatabase(sale.created_at);

      await this.db.runAsync(
        'INSERT INTO sales (id, total, payment_method, note, customer_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [
          saleId,
          sale.total,
          sale.payment_method,
          sale.note || null,
          sale.customer_id || null,
          createdAt,
        ]
      );

      for (const item of items) {
        const itemId = generateUUID();
        await this.db.runAsync(
          'INSERT INTO sale_items (id, sale_id, product_id, quantity, price, cost, discount, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            itemId,
            saleId,
            item.product_id,
            item.quantity,
            item.price,
            item.cost,
            item.discount || 0,
            item.subtotal,
          ]
        );

        await this.db.runAsync(
          'UPDATE products SET quantity = quantity - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }

      // Update customer statistics if customer is associated
      if (sale.customer_id) {
        await this.updateCustomerStatistics(sale.customer_id, sale.total);
      }

      await this.db.execAsync('COMMIT');
      return saleId;
    } catch (error) {
      await this.db.execAsync('ROLLBACK');
      throw error;
    }
  }

  // Add these functions after the getSales function
  async getSalesPaginated(
    page: number = 1,
    pageSize: number = 50
  ): Promise<Sale[]> {
    const offset = (page - 1) * pageSize;
    const result = await this.db.getAllAsync(
      `SELECT s.*, c.name as customer_name 
       FROM sales s 
       LEFT JOIN customers c ON s.customer_id = c.id 
       ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );
    return result as Sale[];
  }

  async getSalesByDateRangePaginated(
    startDate: Date,
    endDate: Date,
    page: number = 1,
    pageSize: number = 50
  ): Promise<Sale[]> {
    // Use local time ranges to match stored timestamps
    const startDateStr = getStartOfDayForDB(startDate);
    const endDateStr = getEndOfDayForDB(endDate);
    const offset = (page - 1) * pageSize;

    const result = await this.db.getAllAsync(
      `SELECT s.*, c.name as customer_name 
       FROM sales s 
       LEFT JOIN customers c ON s.customer_id = c.id 
       WHERE s.created_at >= ? AND s.created_at <= ? 
       ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
      [startDateStr, endDateStr, pageSize, offset]
    );
    return result as Sale[];
  }

  async getSalesByCustomer(
    customerId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<Sale[]> {
    const offset = (page - 1) * pageSize;
    const result = await this.db.getAllAsync(
      `SELECT s.*, c.name as customer_name 
       FROM sales s 
       LEFT JOIN customers c ON s.customer_id = c.id 
       WHERE s.customer_id = ? 
       ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
      [customerId, pageSize, offset]
    );
    return result as Sale[];
  }

  async getSalesByDateRange(
    startDate: Date,
    endDate: Date,
    limit: number = 100
  ): Promise<Sale[]> {
    // Use local time ranges to match stored timestamps
    const startDateStr = getStartOfDayForDB(startDate);
    const endDateStr = getEndOfDayForDB(endDate);

    const result = await this.db.getAllAsync(
      `SELECT s.*, c.name as customer_name 
       FROM sales s 
       LEFT JOIN customers c ON s.customer_id = c.id 
       WHERE s.created_at >= ? AND s.created_at <= ? 
       ORDER BY s.created_at DESC LIMIT ?`,
      [startDateStr, endDateStr, limit]
    );
    return result as Sale[];
  }

  // TIMEZONE-AWARE METHODS
  // These methods account for timezone offset where sales created at local time
  // are stored with UTC offset in the database

  /**
   * Get today's sales accounting for timezone offset
   * For -6:30 timezone: includes sales from yesterday 17:30 to today 17:30
   */
  async getTodaysSalesTimezoneAware(
    timezoneOffsetMinutes: number = -390
  ): Promise<Sale[]> {
    const { start, end } = getTimezoneAwareTodayRangeForDB(
      timezoneOffsetMinutes
    );

    const result = await this.db.getAllAsync(
      `SELECT s.*, c.name as customer_name 
       FROM sales s 
       LEFT JOIN customers c ON s.customer_id = c.id 
       WHERE s.created_at >= ? AND s.created_at <= ? 
       ORDER BY s.created_at DESC`,
      [start, end]
    );
    return result as Sale[];
  }

  /**
   * Get sales for a specific date accounting for timezone offset
   */
  async getSalesForDateTimezoneAware(
    date: Date,
    timezoneOffsetMinutes: number = -390
  ): Promise<Sale[]> {
    const { start, end } = getTimezoneAwareDateRangeForDB(
      date,
      timezoneOffsetMinutes
    );

    const result = await this.db.getAllAsync(
      `SELECT s.*, c.name as customer_name 
       FROM sales s 
       LEFT JOIN customers c ON s.customer_id = c.id 
       WHERE s.created_at >= ? AND s.created_at <= ? 
       ORDER BY s.created_at DESC`,
      [start, end]
    );
    return result as Sale[];
  }

  /**
   * Get sales for a date range accounting for timezone offset
   * This replaces getSalesByDateRange for timezone-aware queries
   */
  async getSalesByDateRangeTimezoneAware(
    startDate: Date,
    endDate: Date,
    timezoneOffsetMinutes: number = -390,
    limit: number = 100
  ): Promise<Sale[]> {
    // Get timezone-aware range for start date
    const startRange = getTimezoneAwareDateRangeForDB(
      startDate,
      timezoneOffsetMinutes
    );
    // Get timezone-aware range for end date
    const endRange = getTimezoneAwareDateRangeForDB(
      endDate,
      timezoneOffsetMinutes
    );

    const result = await this.db.getAllAsync(
      `SELECT s.*, c.name as customer_name 
       FROM sales s 
       LEFT JOIN customers c ON s.customer_id = c.id 
       WHERE s.created_at >= ? AND s.created_at <= ? 
       ORDER BY s.created_at DESC LIMIT ?`,
      [startRange.start, endRange.end, limit]
    );
    return result as Sale[];
  }

  /**
   * Get paginated sales for a date range accounting for timezone offset
   */
  async getSalesByDateRangePaginatedTimezoneAware(
    startDate: Date,
    endDate: Date,
    timezoneOffsetMinutes: number = -390,
    page: number = 1,
    pageSize: number = 50
  ): Promise<Sale[]> {
    // Get timezone-aware range for start date
    const startRange = getTimezoneAwareDateRangeForDB(
      startDate,
      timezoneOffsetMinutes
    );
    // Get timezone-aware range for end date
    const endRange = getTimezoneAwareDateRangeForDB(
      endDate,
      timezoneOffsetMinutes
    );
    const offset = (page - 1) * pageSize;

    const result = await this.db.getAllAsync(
      `SELECT s.*, c.name as customer_name 
       FROM sales s 
       LEFT JOIN customers c ON s.customer_id = c.id 
       WHERE s.created_at >= ? AND s.created_at <= ? 
       ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
      [startRange.start, endRange.end, pageSize, offset]
    );
    return result as Sale[];
  }

  async getSaleItems(
    saleId: string
  ): Promise<(SaleItem & { product_name: string })[]> {
    const result = await this.db.getAllAsync(
      'SELECT si.*, COALESCE(p.name, "[Deleted Product]") as product_name FROM sale_items si LEFT JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?',
      [saleId]
    );
    return result as (SaleItem & { product_name: string })[];
  }

  async deleteSale(saleId: string): Promise<void> {
    // Start a transaction to ensure data integrity
    await this.db.execAsync('BEGIN TRANSACTION');

    try {
      // Get sale items to restore product quantities
      const saleItems = await this.getSaleItems(saleId);

      // Restore product quantities
      for (const item of saleItems) {
        await this.db.runAsync(
          'UPDATE products SET quantity = quantity + ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }

      // Delete sale items first (due to foreign key constraint)
      await this.db.runAsync('DELETE FROM sale_items WHERE sale_id = ?', [
        saleId,
      ]);

      // Delete the sale
      await this.db.runAsync('DELETE FROM sales WHERE id = ?', [saleId]);

      // Commit the transaction
      await this.db.execAsync('COMMIT');
    } catch (error) {
      // Rollback in case of error
      await this.db.execAsync('ROLLBACK');
      throw error;
    }
  }

  async getSalesAnalytics(days: number = 30): Promise<{
    totalSales: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    profitMargin: number;
    avgSaleValue: number;
    totalItemsSold: number;
    topProducts: {
      name: string;
      imageUrl?: string;
      quantity: number;
      revenue: number;
      profit: number;
      margin: number;
    }[];
    revenueGrowth?: { percentage: number; isPositive: boolean };
  }> {
    // Calculate timezone-aware date range
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Use timezone-aware ranges for consistent querying
    const startRange = getTimezoneAwareDateRangeForDB(startDate, -390);
    const endRange = getTimezoneAwareDateRangeForDB(endDate, -390);
    const startDateStr = startRange.start;
    const endDateStr = endRange.end;

    const salesResult = (await this.db.getFirstAsync(
      `SELECT 
        COUNT(*) as total_sales, 
        SUM(total) as total_revenue, 
        AVG(total) as avg_sale 
       FROM sales 
       WHERE created_at >= ? AND created_at <= ?`,
      [startDateStr, endDateStr]
    )) as { total_sales: number; total_revenue: number; avg_sale: number };

    // Calculate cost and profit
    const costResult = (await this.db.getFirstAsync(
      `SELECT 
        SUM(si.quantity * COALESCE(p.cost, si.cost)) as total_cost,
        SUM(si.quantity) as total_items
       FROM sale_items si 
       LEFT JOIN products p ON si.product_id = p.id 
       JOIN sales s ON si.sale_id = s.id 
       WHERE s.created_at >= ? AND s.created_at <= ?`,
      [startDateStr, endDateStr]
    )) as { total_cost: number; total_items: number };

    const totalRevenue = salesResult.total_revenue || 0;
    const totalCost = costResult.total_cost || 0;
    const totalProfit = totalRevenue - totalCost;
    const profitMargin =
      totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Get top products with profit calculations
    const topProductsResult = (await this.db.getAllAsync(
      `SELECT 
        p.name, 
        p.imageUrl,
        SUM(si.quantity) as quantity, 
        SUM(si.subtotal) as revenue,
        SUM(si.quantity * p.cost) as cost,
        (SUM(si.subtotal) - SUM(si.quantity * p.cost)) as profit
       FROM sale_items si 
       JOIN products p ON si.product_id = p.id 
       JOIN sales s ON si.sale_id = s.id 
       WHERE s.created_at >= ? AND s.created_at <= ?
       GROUP BY p.id 
       ORDER BY revenue DESC 
       LIMIT 5`,
      [startDateStr, endDateStr]
    )) as {
      name: string;
      quantity: number;
      revenue: number;
      cost: number;
      profit: number;
    }[];

    // Calculate margin for each product
    const topProducts = topProductsResult.map((product) => ({
      ...product,
      margin:
        product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0,
    }));

    // Calculate growth compared to previous period using timezone-aware ranges
    const prevPeriodEndDate = new Date(startDate.getTime() - 1);
    const prevPeriodStartDate = new Date(
      prevPeriodEndDate.getTime() - days * 24 * 60 * 60 * 1000
    );
    const prevStartRange = getTimezoneAwareDateRangeForDB(
      prevPeriodStartDate,
      -390
    );
    const prevEndRange = getTimezoneAwareDateRangeForDB(
      prevPeriodEndDate,
      -390
    );
    const prevStartDateStr = prevStartRange.start;
    const prevEndDateStr = prevEndRange.end;

    const previousPeriodResult = (await this.db.getFirstAsync(
      `SELECT SUM(total) as previous_revenue 
       FROM sales 
       WHERE created_at >= ? AND created_at <= ?`,
      [prevStartDateStr, prevEndDateStr]
    )) as { previous_revenue: number };

    let revenueGrowth;
    if (previousPeriodResult.previous_revenue > 0) {
      const growthPercentage =
        ((totalRevenue - previousPeriodResult.previous_revenue) /
          previousPeriodResult.previous_revenue) *
        100;
      revenueGrowth = {
        percentage: Math.abs(growthPercentage),
        isPositive: growthPercentage >= 0,
      };
    }

    return {
      totalSales: salesResult.total_sales || 0,
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      avgSaleValue: salesResult.avg_sale || 0,
      totalItemsSold: costResult.total_items || 0,
      topProducts,
      revenueGrowth,
    };
  }

  async getCurrentMonthSalesAnalytics(): Promise<{
    totalSales: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    totalExpenses: number;
    totalBalance: number;
    netProfit: number;
    profitMargin: number;
    avgSaleValue: number;
    totalItemsSold: number;
    topProducts: {
      name: string;
      imageUrl?: string;
      quantity: number;
      revenue: number;
      profit: number;
      margin: number;
    }[];
    revenueGrowth?: { percentage: number; isPositive: boolean };
  }> {
    // Get current month date range accounting for timezone offset
    const { start: startDateStr, end: endDateStr } =
      getTimezoneAwareCurrentMonthRangeForDB(-390); // -6:30 timezone offset

    const salesResult = (await this.db.getFirstAsync(
      `SELECT 
        COUNT(*) as total_sales, 
        SUM(total) as total_revenue, 
        AVG(total) as avg_sale 
       FROM sales 
       WHERE created_at >= ? AND created_at <= ?`,
      [startDateStr, endDateStr]
    )) as { total_sales: number; total_revenue: number; avg_sale: number };

    // Calculate cost and profit
    const costResult = (await this.db.getFirstAsync(
      `SELECT 
        SUM(si.quantity * COALESCE(p.cost, si.cost)) as total_cost,
        SUM(si.quantity) as total_items
       FROM sale_items si 
       LEFT JOIN products p ON si.product_id = p.id 
       JOIN sales s ON si.sale_id = s.id 
       WHERE s.created_at >= ? AND s.created_at <= ?`,
      [startDateStr, endDateStr]
    )) as { total_cost: number; total_items: number };

    const totalRevenue = salesResult.total_revenue || 0;
    const totalCost = costResult.total_cost || 0;
    const totalProfit = totalRevenue - totalCost;
    const profitMargin =
      totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Get top products with profit calculations
    const topProductsResult = (await this.db.getAllAsync(
      `SELECT 
        p.name, 
        p.imageUrl,
        SUM(si.quantity) as quantity, 
        SUM(si.subtotal) as revenue,
        SUM(si.quantity * COALESCE(p.cost, 0)) as cost,
        (SUM(si.subtotal) - SUM(si.quantity * COALESCE(p.cost, 0))) as profit
       FROM sale_items si 
       JOIN products p ON si.product_id = p.id 
       JOIN sales s ON si.sale_id = s.id 
       WHERE s.created_at >= ? AND s.created_at <= ?
       GROUP BY p.id 
       ORDER BY revenue DESC 
       LIMIT 5`,
      [startDateStr, endDateStr]
    )) as {
      name: string;
      imageUrl?: string;
      quantity: number;
      revenue: number;
      cost: number;
      profit: number;
    }[];

    // Calculate margin for each product
    const topProducts = topProductsResult.map((product) => ({
      ...product,
      margin:
        product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0,
    }));

    // Calculate growth compared to previous month
    const now = new Date();
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const prevStartDateStr = getStartOfMonthForDB(prevMonthStart);
    const prevEndDateStr = getEndOfMonthForDB(prevMonthEnd);

    const previousMonthResult = (await this.db.getFirstAsync(
      `SELECT SUM(total) as previous_revenue 
       FROM sales 
       WHERE created_at >= ? AND created_at <= ?`,
      [prevStartDateStr, prevEndDateStr]
    )) as { previous_revenue: number };

    let revenueGrowth;
    if (previousMonthResult.previous_revenue > 0) {
      const growthPercentage =
        ((totalRevenue - previousMonthResult.previous_revenue) /
          previousMonthResult.previous_revenue) *
        100;
      revenueGrowth = {
        percentage: Math.abs(growthPercentage),
        isPositive: growthPercentage >= 0,
      };
    }

    // Get total expenses for the current month
    const expenseResult = (await this.db.getFirstAsync(
      `SELECT SUM(amount) as total_expenses 
       FROM expenses 
       WHERE created_at >= ? AND created_at <= ?`,
      [startDateStr, endDateStr]
    )) as { total_expenses: number };

    const totalExpenses = expenseResult.total_expenses || 0;
    const totalBalance = totalRevenue - totalExpenses;
    const netProfit = totalProfit - totalExpenses;

    return {
      totalSales: salesResult.total_sales || 0,
      totalRevenue,
      totalCost,
      totalProfit,
      totalExpenses,
      totalBalance,
      netProfit,
      profitMargin,
      avgSaleValue: salesResult.avg_sale || 0,
      totalItemsSold: costResult.total_items || 0,
      topProducts,
      revenueGrowth,
    };
  }

  async getCustomAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalSales: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    profitMargin: number;
    avgSaleValue: number;
    totalItemsSold: number;
    topProducts: {
      name: string;
      imageUrl?: string;
      quantity: number;
      revenue: number;
      profit: number;
      margin: number;
    }[];
  }> {
    // Use timezone-aware date ranges
    const startRange = getTimezoneAwareDateRangeForDB(startDate, -390);
    const endRange = getTimezoneAwareDateRangeForDB(endDate, -390);
    const startDateStr = startRange.start;
    const endDateStr = endRange.end;

    const salesResult = (await this.db.getFirstAsync(
      `SELECT 
        COUNT(*) as total_sales, 
        SUM(total) as total_revenue, 
        AVG(total) as avg_sale 
       FROM sales 
       WHERE created_at >= ? AND created_at <= ?`,
      [startDateStr, endDateStr]
    )) as { total_sales: number; total_revenue: number; avg_sale: number };

    // Calculate cost and profit
    const costResult = (await this.db.getFirstAsync(
      `SELECT 
        SUM(si.quantity * COALESCE(p.cost, si.cost)) as total_cost,
        SUM(si.quantity) as total_items
       FROM sale_items si 
       LEFT JOIN products p ON si.product_id = p.id 
       JOIN sales s ON si.sale_id = s.id 
       WHERE s.created_at >= ? AND s.created_at <= ?`,
      [startDateStr, endDateStr]
    )) as { total_cost: number; total_items: number };
    console.log('sale and co', salesResult, costResult);

    const totalRevenue = salesResult.total_revenue || 0;
    const totalCost = costResult.total_cost || 0;
    const totalProfit = totalRevenue - totalCost;
    const profitMargin =
      totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Get top products with profit calculations
    const topProductsResult = (await this.db.getAllAsync(
      `SELECT 
        COALESCE(p.name, "[Deleted Product]") as name, 
        p.imageUrl,
        SUM(si.quantity) as quantity, 
        SUM(si.subtotal) as revenue,
        SUM(si.quantity * COALESCE(p.cost, si.cost)) as cost,
        (SUM(si.subtotal) - SUM(si.quantity * COALESCE(p.cost, si.cost))) as profit
       FROM sale_items si 
       LEFT JOIN products p ON si.product_id = p.id 
       JOIN sales s ON si.sale_id = s.id 
       WHERE s.created_at >= ? AND s.created_at <= ?
       GROUP BY COALESCE(p.id, si.product_id) 
       ORDER BY revenue DESC 
       LIMIT 5`,
      [startDateStr, endDateStr]
    )) as {
      name: string;
      quantity: number;
      revenue: number;
      cost: number;
      profit: number;
    }[];

    // Calculate margin for each product
    const topProducts = topProductsResult.map((product) => ({
      ...product,
      margin:
        product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0,
    }));

    return {
      totalSales: salesResult.total_sales || 0,
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      avgSaleValue: salesResult.avg_sale || 0,
      totalItemsSold: costResult.total_items || 0,
      topProducts,
    };
  }

  // Add these methods to the DatabaseService class

  // Expense Categories CRUD
  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    return (await this.db.getAllAsync(
      'SELECT * FROM expense_categories ORDER BY name'
    )) as ExpenseCategory[];
  }

  async addExpenseCategory(
    name: string,
    description?: string
  ): Promise<string> {
    const id = generateUUID();
    await this.db.runAsync(
      'INSERT INTO expense_categories (id, name, description) VALUES (?, ?, ?)',
      [id, name, description || null]
    );
    return id;
  }

  async updateExpenseCategory(
    id: string,
    name: string,
    description?: string
  ): Promise<void> {
    await this.db.runAsync(
      'UPDATE expense_categories SET name = ?, description = ? WHERE id = ?',
      [name, description || null, id]
    );
  }

  async deleteExpenseCategory(id: string): Promise<void> {
    // Check if category is in use
    const expensesCount = (await this.db.getFirstAsync(
      'SELECT COUNT(*) as count FROM expenses WHERE category_id = ?',
      [id]
    )) as { count: number };

    if (expensesCount.count > 0) {
      throw new Error('Cannot delete category that has expenses');
    }

    await this.db.runAsync('DELETE FROM expense_categories WHERE id = ?', [id]);
  }

  // Expenses CRUD
  async getExpenses(limit: number = 50): Promise<Expense[]> {
    return (await this.db.getAllAsync(
      `SELECT e.*, ec.name as category_name 
     FROM expenses e
     JOIN expense_categories ec ON e.category_id = ec.id
     ORDER BY e.date DESC LIMIT ?`,
      [limit]
    )) as (Expense & { category_name: string })[];
  }

  async getExpensesByDateRange(
    startDate: Date,
    endDate: Date,
    limit: number = 100
  ): Promise<Expense[]> {
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

    return (await this.db.getAllAsync(
      `SELECT e.*, ec.name as category_name 
     FROM expenses e
     JOIN expense_categories ec ON e.category_id = ec.id
     WHERE e.date >= ? AND e.date <= ?
     ORDER BY e.date DESC LIMIT ?`,
      [startDateStr, endDateStr, limit]
    )) as (Expense & { category_name: string })[];
  }

  /**
   * Get expenses for a date range accounting for timezone offset
   */
  async getExpensesByDateRangeTimezoneAware(
    startDate: Date,
    endDate: Date,
    timezoneOffsetMinutes: number = -390,
    limit: number = 100
  ): Promise<Expense[]> {
    // Get timezone-aware range for start date
    const startRange = getTimezoneAwareDateRangeForDB(
      startDate,
      timezoneOffsetMinutes
    );
    // Get timezone-aware range for end date
    const endRange = getTimezoneAwareDateRangeForDB(
      endDate,
      timezoneOffsetMinutes
    );

    return (await this.db.getAllAsync(
      `SELECT e.*, ec.name as category_name 
     FROM expenses e
     JOIN expense_categories ec ON e.category_id = ec.id
     WHERE e.created_at >= ? AND e.created_at <= ?
     ORDER BY e.created_at DESC LIMIT ?`,
      [startRange.start, endRange.end, limit]
    )) as (Expense & { category_name: string })[];
  }

  async getExpensesPaginated(
    page: number = 1,
    pageSize: number = 20
  ): Promise<Expense[]> {
    const offset = (page - 1) * pageSize;

    return (await this.db.getAllAsync(
      `SELECT e.*, ec.name as category_name 
     FROM expenses e
     JOIN expense_categories ec ON e.category_id = ec.id
     ORDER BY e.date DESC LIMIT ? OFFSET ?`,
      [pageSize, offset]
    )) as (Expense & { category_name: string })[];
  }

  async getExpensesByDateRangePaginated(
    startDate: Date,
    endDate: Date,
    page: number = 1,
    pageSize: number = 20
  ): Promise<Expense[]> {
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();
    const offset = (page - 1) * pageSize;

    return (await this.db.getAllAsync(
      `SELECT e.*, ec.name as category_name 
     FROM expenses e
     JOIN expense_categories ec ON e.category_id = ec.id
     WHERE e.date >= ? AND e.date <= ?
     ORDER BY e.date DESC LIMIT ? OFFSET ?`,
      [startDateStr, endDateStr, pageSize, offset]
    )) as (Expense & { category_name: string })[];
  }

  async addExpense(
    category_id: string,
    amount: number,
    description: string,
    date: string
  ): Promise<string> {
    const id = generateUUID();
    await this.db.runAsync(
      `INSERT INTO expenses 
     (id, category_id, amount, description, date, updated_at) 
     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [id, category_id, amount, description, date]
    );
    return id;
  }

  async updateExpense(
    id: string,
    category_id: string,
    amount: number,
    description: string,
    date: string
  ): Promise<void> {
    await this.db.runAsync(
      `UPDATE expenses 
     SET category_id = ?, amount = ?, description = ?, date = ?, updated_at = datetime('now') 
     WHERE id = ?`,
      [category_id, amount, description, date, id]
    );
  }

  async deleteExpense(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
  }

  // Chart data methods
  async getRevenueExpensesTrend(
    startDate: Date,
    endDate: Date
  ): Promise<
    {
      date: string;
      revenue: number;
      expenses: number;
      netProfit: number;
      salesCount: number;
    }[]
  > {
    // Use timezone-aware date ranges
    const startRange = getTimezoneAwareDateRangeForDB(startDate, -390);
    const endRange = getTimezoneAwareDateRangeForDB(endDate, -390);
    const startDateStr = startRange.start;
    const endDateStr = endRange.end;

    // Determine granularity based on date range
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    let dateFormat: string;
    let groupBy: string;

    if (days <= 1) {
      // Hourly for single day
      dateFormat = '%Y-%m-%d %H:00:00';
      groupBy = "strftime('%Y-%m-%d %H:00:00', s.created_at, 'localtime')";
    } else if (days <= 31) {
      // Daily for up to a month
      dateFormat = '%Y-%m-%d';
      groupBy = "date(s.created_at, 'localtime')";
    } else if (days > 300) {
      // Monthly for year view
      dateFormat = '%Y-%m';
      groupBy = "strftime('%Y-%m', s.created_at, 'localtime')";
    } else {
      // Weekly for longer periods
      dateFormat = '%Y-W%W';
      groupBy = "strftime('%Y-W%W', s.created_at, 'localtime')";
    }

    // Get revenue data
    const revenueData = (await this.db.getAllAsync(
      `SELECT 
        ${groupBy} as date,
        SUM(s.total) as revenue,
        COUNT(s.id) as sales_count
       FROM sales s
       WHERE date(s.created_at, 'localtime') >= ? AND date(s.created_at, 'localtime') <= ?
       GROUP BY ${groupBy}
       ORDER BY date`,
      [startDateStr, endDateStr]
    )) as { date: string; revenue: number; sales_count: number }[];

    // Get expense data - use created_at with localtime for proper timezone handling
    const expenseData = (await this.db.getAllAsync(
      `SELECT 
        ${groupBy.replace('s.created_at', 'e.created_at')} as date,
        SUM(e.amount) as expenses
       FROM expenses e
       WHERE date(e.created_at, 'localtime') >= ? AND date(e.created_at, 'localtime') <= ?
       GROUP BY ${groupBy.replace('s.created_at', 'e.created_at')}
       ORDER BY date`,
      [startDateStr, endDateStr]
    )) as { date: string; expenses: number }[];

    // Merge revenue and expense data
    const expenseMap = new Map(
      expenseData.map((item) => [item.date, item.expenses])
    );
    const revenueMap = new Map(
      revenueData.map((item) => [
        item.date,
        { revenue: item.revenue, sales_count: item.sales_count },
      ])
    );

    // Get all unique dates
    const allDates = new Set([
      ...Array.from(revenueMap.keys()),
      ...Array.from(expenseMap.keys()),
    ]);

    const result = Array.from(allDates)
      .map((date) => {
        const revenueInfo = revenueMap.get(date) || {
          revenue: 0,
          sales_count: 0,
        };
        const expenses = expenseMap.get(date) || 0;

        return {
          date,
          revenue: revenueInfo.revenue,
          expenses,
          netProfit: revenueInfo.revenue - expenses,
          salesCount: revenueInfo.sales_count,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return result;
  }

  async getProfitMarginTrend(
    startDate: Date,
    endDate: Date
  ): Promise<
    {
      date: string;
      profitMargin: number;
      revenue: number;
      profit: number;
    }[]
  > {
    // Use timezone-aware date ranges
    const startRange = getTimezoneAwareDateRangeForDB(startDate, -390);
    const endRange = getTimezoneAwareDateRangeForDB(endDate, -390);
    const startDateStr = startRange.start;
    const endDateStr = endRange.end;

    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    let groupBy: string;

    if (days <= 1) {
      groupBy = "strftime('%Y-%m-%d %H:00:00', s.created_at, 'localtime')";
    } else if (days <= 31) {
      groupBy = "date(s.created_at, 'localtime')";
    } else {
      groupBy = "strftime('%Y-W%W', s.created_at, 'localtime')";
    }

    const result = (await this.db.getAllAsync(
      `SELECT 
        ${groupBy} as date,
        SUM(s.total) as revenue,
        SUM(si.quantity * COALESCE(p.cost, si.cost)) as total_cost,
        (SUM(s.total) - SUM(si.quantity * COALESCE(p.cost, si.cost))) as profit
       FROM sales s
       JOIN sale_items si ON s.id = si.sale_id
       LEFT JOIN products p ON si.product_id = p.id
       WHERE date(s.created_at, 'localtime') >= ? AND date(s.created_at, 'localtime') <= ?
       GROUP BY ${groupBy}
       ORDER BY date`,
      [startDateStr, endDateStr]
    )) as {
      date: string;
      revenue: number;
      total_cost: number;
      profit: number;
    }[];

    return result.map((item) => ({
      date: item.date,
      profitMargin: item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0,
      revenue: item.revenue,
      profit: item.profit,
    }));
  }

  // Analytics with expenses
  async getCustomAnalyticsWithExpenses(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalSales: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    avgSaleValue: number;
    totalItemsSold: number;
    topProducts: {
      name: string;
      quantity: number;
      revenue: number;
      profit: number;
      margin: number;
    }[];
    expensesByCategory: {
      category_name: string;
      amount: number;
      percentage: number;
    }[];
  }> {
    // Get existing analytics data
    const analytics = await this.getCustomAnalytics(startDate, endDate);

    // Get expenses for the period using timezone-aware ranges
    const startRange = getTimezoneAwareDateRangeForDB(startDate, -390);
    const endRange = getTimezoneAwareDateRangeForDB(endDate, -390);
    const startDateStr = startRange.start;
    const endDateStr = endRange.end;

    const expensesResult = (await this.db.getFirstAsync(
      `SELECT SUM(amount) as total_expenses
     FROM expenses
     WHERE created_at >= ? AND created_at <= ?`,
      [startDateStr, endDateStr]
    )) as { total_expenses: number };

    const totalExpenses = expensesResult.total_expenses || 0;
    const netProfit = analytics.totalProfit - totalExpenses;

    // Get expenses by category
    const expensesByCategory = (await this.db.getAllAsync(
      `SELECT ec.name as category_name, SUM(e.amount) as amount
     FROM expenses e
     JOIN expense_categories ec ON e.category_id = ec.id
     WHERE e.created_at >= ? AND e.created_at <= ?
     GROUP BY e.category_id
     ORDER BY amount DESC`,
      [startDateStr, endDateStr]
    )) as { category_name: string; amount: number }[];

    // Calculate percentage for each category
    const expensesByCategoryWithPercentage = expensesByCategory.map(
      (category) => ({
        ...category,
        percentage:
          totalExpenses > 0 ? (category.amount / totalExpenses) * 100 : 0,
      })
    );

    return {
      ...analytics,
      totalExpenses,
      netProfit,
      expensesByCategory: expensesByCategoryWithPercentage,
    };
  }

  // Bulk Pricing Methods
  private clearBulkPricingCache(productId: string) {
    this.bulkPricingCache.delete(productId);
    this.cacheExpiry.delete(productId);
  }

  // Batch processing utility for performance
  async batchOperation<T>(
    items: T[],
    operation: (batch: T[]) => Promise<void>,
    batchSize: number = 50
  ): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await operation(batch);
    }
  }

  // Clear all caches for performance reset
  clearAllCaches(): void {
    this.bulkPricingCache.clear();
    this.cacheExpiry.clear();
  }

  // Performance monitoring utility
  async measureQueryPerformance<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await queryFn();
      const endTime = Date.now();
      const duration = endTime - startTime;

      if (duration > 1000) {
        // Log slow queries (>1s)
        console.warn(`Slow query detected: ${queryName} took ${duration}ms`);
      }

      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.error(`Query failed: ${queryName} after ${duration}ms`, error);
      throw error;
    }
  }

  async addBulkPricing(
    bulkPricing: Omit<BulkPricing, 'id' | 'created_at'>
  ): Promise<string> {
    // Validate that bulk price is less than regular price
    const product = (await this.db.getFirstAsync(
      'SELECT price FROM products WHERE id = ?',
      [bulkPricing.product_id]
    )) as { price: number } | null;

    if (!product) {
      throw new Error('Product not found');
    }

    if (bulkPricing.bulk_price >= product.price) {
      throw new Error('Bulk price must be less than regular price');
    }

    // Check for overlapping quantity tiers
    const existingTiers = await this.getBulkPricingForProduct(
      bulkPricing.product_id
    );
    const hasOverlap = existingTiers.some(
      (tier) => tier.min_quantity === bulkPricing.min_quantity
    );

    if (hasOverlap) {
      throw new Error('A bulk pricing tier already exists for this quantity');
    }

    const id = generateUUID();
    await this.db.runAsync(
      'INSERT INTO bulk_pricing (id, product_id, min_quantity, bulk_price) VALUES (?, ?, ?, ?)',
      [
        id,
        bulkPricing.product_id,
        bulkPricing.min_quantity,
        bulkPricing.bulk_price,
      ]
    );

    // Clear cache for this product
    this.clearBulkPricingCache(bulkPricing.product_id);

    return id;
  }

  async updateBulkPricing(
    id: string,
    bulkPricing: Partial<BulkPricing>
  ): Promise<void> {
    // If updating price, validate it's less than regular price
    if (bulkPricing.bulk_price) {
      const existingTier = (await this.db.getFirstAsync(
        'SELECT product_id FROM bulk_pricing WHERE id = ?',
        [id]
      )) as { product_id: string } | null;

      if (existingTier) {
        const product = (await this.db.getFirstAsync(
          'SELECT price FROM products WHERE id = ?',
          [existingTier.product_id]
        )) as { price: number } | null;

        if (product && bulkPricing.bulk_price >= product.price) {
          throw new Error('Bulk price must be less than regular price');
        }
      }
    }

    const filteredKeys = Object.keys(bulkPricing).filter(
      (key) => key !== 'id' && key !== 'created_at'
    );

    // If no fields to update, return early
    if (filteredKeys.length === 0) {
      return;
    }

    const fields = filteredKeys.map((key) => `${key} = ?`).join(', ');
    const values = filteredKeys.map((key) => (bulkPricing as any)[key]);

    await this.db.runAsync(`UPDATE bulk_pricing SET ${fields} WHERE id = ?`, [
      ...values,
      id,
    ]);

    // Clear cache for the affected product
    const existingTier = (await this.db.getFirstAsync(
      'SELECT product_id FROM bulk_pricing WHERE id = ?',
      [id]
    )) as { product_id: string } | null;

    if (existingTier) {
      this.clearBulkPricingCache(existingTier.product_id);
    }
  }

  async deleteBulkPricing(id: string): Promise<void> {
    // Get product_id before deletion for cache clearing
    const existingTier = (await this.db.getFirstAsync(
      'SELECT product_id FROM bulk_pricing WHERE id = ?',
      [id]
    )) as { product_id: string } | null;

    await this.db.runAsync('DELETE FROM bulk_pricing WHERE id = ?', [id]);

    // Clear cache for the affected product
    if (existingTier) {
      this.clearBulkPricingCache(existingTier.product_id);
    }
  }

  async getBulkPricingForProduct(productId: string): Promise<BulkPricing[]> {
    // Check cache first
    const now = Date.now();
    const cacheKey = productId;

    if (this.bulkPricingCache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey) || 0;
      if (now < expiry) {
        return this.bulkPricingCache.get(cacheKey)!;
      }
    }

    // Fetch from database
    const result = await this.db.getAllAsync(
      'SELECT * FROM bulk_pricing WHERE product_id = ? ORDER BY min_quantity ASC',
      [productId]
    );

    const bulkPricing = result as BulkPricing[];

    // Cache the result
    this.bulkPricingCache.set(cacheKey, bulkPricing);
    this.cacheExpiry.set(cacheKey, now + this.CACHE_TTL);

    return bulkPricing;
  }

  async calculateBestPrice(
    productId: string,
    quantity: number
  ): Promise<{
    price: number;
    isBulkPrice: boolean;
    savings: number;
    appliedTier?: BulkPricing;
  }> {
    // Get regular product price
    const product = (await this.db.getFirstAsync(
      'SELECT price FROM products WHERE id = ?',
      [productId]
    )) as { price: number } | null;

    if (!product) {
      throw new Error('Product not found');
    }

    const regularPrice = product.price;
    const regularTotal = regularPrice * quantity;

    // Get applicable bulk pricing tiers
    const bulkTiers = await this.getBulkPricingForProduct(productId);
    const applicableTiers = bulkTiers.filter(
      (tier) => quantity >= tier.min_quantity
    );

    if (applicableTiers.length === 0) {
      return {
        price: regularPrice,
        isBulkPrice: false,
        savings: 0,
      };
    }

    // Find the best tier (lowest price among applicable tiers)
    const bestTier = applicableTiers.reduce((best, current) =>
      current.bulk_price < best.bulk_price ? current : best
    );

    const bulkTotal = bestTier.bulk_price * quantity;
    const savings = regularTotal - bulkTotal;

    return {
      price: bestTier.bulk_price,
      isBulkPrice: true,
      savings,
      appliedTier: bestTier,
    };
  }

  async validateBulkPricingTiers(
    productId: string,
    tiers: Omit<BulkPricing, 'id' | 'product_id' | 'created_at'>[]
  ): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Get product regular price
    const product = (await this.db.getFirstAsync(
      'SELECT price FROM products WHERE id = ?',
      [productId]
    )) as { price: number } | null;

    if (!product) {
      errors.push('Product not found');
      return { isValid: false, errors };
    }

    // Validate each tier
    for (const tier of tiers) {
      if (tier.min_quantity <= 0) {
        errors.push(
          `Minimum quantity must be greater than 0 for tier with quantity ${tier.min_quantity}`
        );
      }

      if (tier.bulk_price <= 0) {
        errors.push(
          `Bulk price must be greater than 0 for tier with quantity ${tier.min_quantity}`
        );
      }

      if (tier.bulk_price >= product.price) {
        errors.push(
          `Bulk price must be less than regular price (${product.price}) for tier with quantity ${tier.min_quantity}`
        );
      }
    }

    // Check for duplicate quantities
    const quantities = tiers.map((tier) => tier.min_quantity);
    const uniqueQuantities = new Set(quantities);
    if (quantities.length !== uniqueQuantities.size) {
      errors.push('Duplicate minimum quantities are not allowed');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Stock Movement Methods
  async addStockMovement(
    movement: Omit<
      StockMovement,
      'id' | 'created_at' | 'product_name' | 'supplier_name'
    >
  ): Promise<string> {
    // Start transaction for atomic operation
    await this.db.execAsync('BEGIN TRANSACTION');

    try {
      // Add the stock movement record
      const id = generateUUID();
      await this.db.runAsync(
        `INSERT INTO stock_movements 
         (id, product_id, type, quantity, reason, supplier_id, reference_number, unit_cost) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          movement.product_id,
          movement.type,
          movement.quantity,
          movement.reason || null,
          movement.supplier_id || null,
          movement.reference_number || null,
          movement.unit_cost || null,
        ]
      );

      // Update product quantity based on movement type
      if (movement.type === 'stock_in') {
        await this.db.runAsync(
          'UPDATE products SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [movement.quantity, movement.product_id]
        );
      } else if (movement.type === 'stock_out') {
        await this.db.runAsync(
          'UPDATE products SET quantity = CASE WHEN quantity >= ? THEN quantity - ? ELSE 0 END, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [movement.quantity, movement.quantity, movement.product_id]
        );
      }

      await this.db.execAsync('COMMIT');
      return id;
    } catch (error) {
      await this.db.execAsync('ROLLBACK');
      throw error;
    }
  }

  async getStockMovements(
    filters?: {
      productId?: string;
      type?: 'stock_in' | 'stock_out';
      startDate?: Date;
      endDate?: Date;
      supplierId?: string;
    },
    page: number = 1,
    pageSize: number = 50
  ): Promise<StockMovement[]> {
    const offset = (page - 1) * pageSize;
    let query = `
      SELECT sm.*, 
             COALESCE(p.name, '[Deleted Product]') as product_name,
             s.name as supplier_name
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      LEFT JOIN suppliers s ON sm.supplier_id = s.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (filters?.productId) {
      conditions.push('sm.product_id = ?');
      params.push(filters.productId);
    }

    if (filters?.type) {
      conditions.push('sm.type = ?');
      params.push(filters.type);
    }

    if (filters?.startDate) {
      conditions.push('sm.created_at >= ?');
      params.push(filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      conditions.push('sm.created_at <= ?');
      params.push(filters.endDate.toISOString());
    }

    if (filters?.supplierId) {
      conditions.push('sm.supplier_id = ?');
      params.push(filters.supplierId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY sm.created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const result = await this.db.getAllAsync(query, params);
    return result as StockMovement[];
  }

  async getStockMovementsByProduct(
    productId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<StockMovement[]> {
    return this.getStockMovements({ productId }, page, pageSize);
  }

  async updateProductQuantityWithMovement(
    productId: string,
    movementType: 'stock_in' | 'stock_out',
    quantity: number,
    reason?: string,
    supplierId?: string,
    referenceNumber?: string,
    unitCost?: number
  ): Promise<string> {
    return this.addStockMovement({
      product_id: productId,
      type: movementType,
      quantity,
      reason,
      supplier_id: supplierId,
      reference_number: referenceNumber,
      unit_cost: unitCost,
    });
  }

  async getStockMovementSummary(
    productId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalStockIn: number;
    totalStockOut: number;
    netMovement: number;
    movementCount: number;
  }> {
    let query = `
      SELECT 
        SUM(CASE WHEN type = 'stock_in' THEN quantity ELSE 0 END) as total_stock_in,
        SUM(CASE WHEN type = 'stock_out' THEN quantity ELSE 0 END) as total_stock_out,
        COUNT(*) as movement_count
      FROM stock_movements
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (productId) {
      conditions.push('product_id = ?');
      params.push(productId);
    }

    if (startDate) {
      conditions.push('created_at >= ?');
      params.push(startDate.toISOString());
    }

    if (endDate) {
      conditions.push('created_at <= ?');
      params.push(endDate.toISOString());
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const result = (await this.db.getFirstAsync(query, params)) as {
      total_stock_in: number;
      total_stock_out: number;
      movement_count: number;
    };

    const totalStockIn = result.total_stock_in || 0;
    const totalStockOut = result.total_stock_out || 0;

    return {
      totalStockIn,
      totalStockOut,
      netMovement: totalStockIn - totalStockOut,
      movementCount: result.movement_count || 0,
    };
  }

  // Customer Management Methods
  async getCustomers(
    searchQuery?: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<Customer[]> {
    const offset = (page - 1) * pageSize;
    let query = 'SELECT * FROM customers';
    let params: any[] = [];

    if (searchQuery) {
      query += ' WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?';
      const searchPattern = `%${searchQuery}%`;
      params = [searchPattern, searchPattern, searchPattern];
    }

    query += ' ORDER BY name ASC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const result = await this.db.getAllAsync(query, params);
    return result as Customer[];
  }

  async getCustomerById(id: string): Promise<Customer | null> {
    const result = await this.db.getFirstAsync(
      'SELECT * FROM customers WHERE id = ?',
      [id]
    );
    return result as Customer | null;
  }

  async addCustomer(
    customer:
      | Omit<
          Customer,
          'total_spent' | 'visit_count' | 'created_at' | 'updated_at'
        >
      | Omit<
          Customer,
          'id' | 'total_spent' | 'visit_count' | 'created_at' | 'updated_at'
        >
  ): Promise<string> {
    const id = (customer as any).id || generateUUID();
    await this.db.runAsync(
      'INSERT INTO customers (id, name, phone, email, address) VALUES (?, ?, ?, ?, ?)',
      [
        id,
        customer.name,
        customer.phone || null,
        customer.email || null,
        customer.address || null,
      ]
    );
    return id;
  }

  async updateCustomer(id: string, customer: Partial<Customer>): Promise<void> {
    const filteredKeys = Object.keys(customer).filter(
      (key) => key !== 'id' && key !== 'created_at'
    );

    // If no fields to update, just update the timestamp
    if (filteredKeys.length === 0) {
      await this.db.runAsync(
        `UPDATE customers SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [id]
      );
      return;
    }

    const fields = filteredKeys.map((key) => `${key} = ?`).join(', ');
    const values = filteredKeys.map((key) => (customer as any)[key]);

    await this.db.runAsync(
      `UPDATE customers SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    );
  }

  async deleteCustomer(id: string): Promise<void> {
    // Check if customer has any sales
    const salesCount = (await this.db.getFirstAsync(
      'SELECT COUNT(*) as count FROM sales WHERE customer_id = ?',
      [id]
    )) as { count: number };

    if (salesCount.count > 0) {
      throw new Error('Cannot delete customer with existing sales records');
    }

    await this.db.runAsync('DELETE FROM customers WHERE id = ?', [id]);
  }

  async getCustomerPurchaseHistory(
    customerId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<Sale[]> {
    const offset = (page - 1) * pageSize;
    const result = await this.db.getAllAsync(
      'SELECT * FROM sales WHERE customer_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [customerId, pageSize, offset]
    );
    return result as Sale[];
  }

  async updateCustomerStatistics(
    customerId: string,
    saleAmount: number
  ): Promise<void> {
    await this.db.runAsync(
      `UPDATE customers 
       SET total_spent = total_spent + ?, 
           visit_count = visit_count + 1,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [saleAmount, customerId]
    );
  }

  async getCustomerStatistics(customerId: string): Promise<{
    totalSpent: number;
    visitCount: number;
    averageOrderValue: number;
    lastVisit: string | null;
  }> {
    const customer = await this.getCustomerById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const lastSale = (await this.db.getFirstAsync(
      'SELECT created_at FROM sales WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1',
      [customerId]
    )) as { created_at: string } | null;

    const averageOrderValue =
      customer.visit_count > 0
        ? customer.total_spent / customer.visit_count
        : 0;

    return {
      totalSpent: customer.total_spent,
      visitCount: customer.visit_count,
      averageOrderValue,
      lastVisit: lastSale?.created_at || null,
    };
  }

  // Customer Analytics Methods
  async getCustomerPurchasePatterns(customerId: string): Promise<{
    monthlySpending: { month: string; amount: number }[];
    topCategories: { category: string; amount: number; percentage: number }[];
    purchaseFrequency: { dayOfWeek: string; count: number }[];
    averageItemsPerOrder: number;
  }> {
    // Monthly spending pattern
    const monthlySpending = (await this.db.getAllAsync(
      `
      SELECT 
        strftime('%Y-%m', s.created_at) as month,
        SUM(s.total) as amount
      FROM sales s
      WHERE s.customer_id = ?
      GROUP BY strftime('%Y-%m', s.created_at)
      ORDER BY month DESC
      LIMIT 12
    `,
      [customerId]
    )) as { month: string; amount: number }[];

    // Top categories by spending
    const topCategories = (await this.db.getAllAsync(
      `
      SELECT 
        c.name as category,
        SUM(si.subtotal) as amount,
        (SUM(si.subtotal) * 100.0 / (
          SELECT SUM(si2.subtotal) 
          FROM sale_items si2 
          JOIN sales s2 ON si2.sale_id = s2.id 
          WHERE s2.customer_id = ?
        )) as percentage
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE s.customer_id = ?
      GROUP BY c.id, c.name
      ORDER BY amount DESC
      LIMIT 5
    `,
      [customerId, customerId]
    )) as { category: string; amount: number; percentage: number }[];

    // Purchase frequency by day of week
    const purchaseFrequency = (await this.db.getAllAsync(
      `
      SELECT 
        CASE strftime('%w', created_at)
          WHEN '0' THEN 'Sunday'
          WHEN '1' THEN 'Monday'
          WHEN '2' THEN 'Tuesday'
          WHEN '3' THEN 'Wednesday'
          WHEN '4' THEN 'Thursday'
          WHEN '5' THEN 'Friday'
          WHEN '6' THEN 'Saturday'
        END as dayOfWeek,
        COUNT(*) as count
      FROM sales
      WHERE customer_id = ?
      GROUP BY strftime('%w', created_at)
      ORDER BY strftime('%w', created_at)
    `,
      [customerId]
    )) as { dayOfWeek: string; count: number }[];

    // Average items per order
    const avgItemsResult = (await this.db.getFirstAsync(
      `
      SELECT AVG(item_count) as average
      FROM (
        SELECT COUNT(si.id) as item_count
        FROM sales s
        JOIN sale_items si ON s.id = si.sale_id
        WHERE s.customer_id = ?
        GROUP BY s.id
      )
    `,
      [customerId]
    )) as { average: number } | null;

    return {
      monthlySpending,
      topCategories,
      purchaseFrequency,
      averageItemsPerOrder: avgItemsResult?.average || 0,
    };
  }

  async calculateCustomerLifetimeValue(customerId: string): Promise<{
    currentLTV: number;
    predictedLTV: number;
    customerSegment:
      | 'high_value'
      | 'medium_value'
      | 'low_value'
      | 'new'
      | 'at_risk';
    riskScore: number; // 0-100, higher means more likely to churn
  }> {
    const customer = await this.getCustomerById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Get customer's purchase history
    const firstSale = (await this.db.getFirstAsync(
      `
      SELECT created_at FROM sales 
      WHERE customer_id = ? 
      ORDER BY created_at ASC 
      LIMIT 1
    `,
      [customerId]
    )) as { created_at: string } | null;

    const lastSale = (await this.db.getFirstAsync(
      `
      SELECT created_at FROM sales 
      WHERE customer_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `,
      [customerId]
    )) as { created_at: string } | null;

    if (!firstSale || !lastSale) {
      return {
        currentLTV: 0,
        predictedLTV: 0,
        customerSegment: 'new',
        riskScore: 100,
      };
    }

    // Calculate customer lifetime in days
    const lifetimeDays = Math.max(
      1,
      (new Date(lastSale.created_at).getTime() -
        new Date(firstSale.created_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    // Current LTV is total spent
    const currentLTV = customer.total_spent;

    // Predict future LTV based on purchase frequency and average order value
    const avgOrderValue =
      customer.visit_count > 0
        ? customer.total_spent / customer.visit_count
        : 0;
    const purchaseFrequency = customer.visit_count / lifetimeDays; // purchases per day

    // Simple prediction: assume customer will continue for another year at current rate
    const predictedLTV = currentLTV + avgOrderValue * purchaseFrequency * 365;

    // Determine customer segment
    let customerSegment:
      | 'high_value'
      | 'medium_value'
      | 'low_value'
      | 'new'
      | 'at_risk';
    if (customer.visit_count < 3) {
      customerSegment = 'new';
    } else if (currentLTV >= 100000) {
      // 100,000 MMK
      customerSegment = 'high_value';
    } else if (currentLTV >= 50000) {
      // 50,000 MMK
      customerSegment = 'medium_value';
    } else {
      customerSegment = 'low_value';
    }

    // Calculate risk score (days since last purchase)
    const daysSinceLastPurchase =
      (new Date().getTime() - new Date(lastSale.created_at).getTime()) /
      (1000 * 60 * 60 * 24);
    const riskScore = Math.min(100, Math.max(0, daysSinceLastPurchase * 2)); // 2 points per day

    return {
      currentLTV,
      predictedLTV,
      customerSegment,
      riskScore,
    };
  }

  async getCustomerSegmentation(): Promise<{
    segments: {
      segment: 'high_value' | 'medium_value' | 'low_value' | 'new' | 'at_risk';
      count: number;
      totalValue: number;
      averageOrderValue: number;
    }[];
    totalCustomers: number;
  }> {
    const customers = await this.getCustomers();
    const segments = {
      high_value: { count: 0, totalValue: 0, orders: 0 },
      medium_value: { count: 0, totalValue: 0, orders: 0 },
      low_value: { count: 0, totalValue: 0, orders: 0 },
      new: { count: 0, totalValue: 0, orders: 0 },
      at_risk: { count: 0, totalValue: 0, orders: 0 },
    };

    for (const customer of customers) {
      const ltv = await this.calculateCustomerLifetimeValue(customer.id);

      let segment = ltv.customerSegment;
      if (ltv.riskScore > 60) {
        segment = 'at_risk';
      }

      segments[segment].count++;
      segments[segment].totalValue += customer.total_spent;
      segments[segment].orders += customer.visit_count;
    }

    const result = Object.entries(segments).map(([segment, data]) => ({
      segment: segment as
        | 'high_value'
        | 'medium_value'
        | 'low_value'
        | 'new'
        | 'at_risk',
      count: data.count,
      totalValue: data.totalValue,
      averageOrderValue: data.orders > 0 ? data.totalValue / data.orders : 0,
    }));

    return {
      segments: result,
      totalCustomers: customers.length,
    };
  }

  async getCustomerAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalCustomers: number;
    totalRevenue: number;
    topCustomers: {
      id: string;
      name: string;
      total_spent: number;
      total_orders: number;
      visit_count: number;
      avg_order_value: number;
    }[];
  }> {
    // Get customers with their spending in the date range
    const topCustomers = (await this.db.getAllAsync(
      `
      SELECT 
        c.id,
        c.name,
        COALESCE(SUM(s.total), 0) as total_spent,
        COUNT(s.id) as total_orders,
        c.visit_count,
        CASE 
          WHEN COUNT(s.id) > 0 THEN COALESCE(SUM(s.total), 0) / COUNT(s.id)
          ELSE 0 
        END as avg_order_value
      FROM customers c
      LEFT JOIN sales s ON c.id = s.customer_id 
        AND s.created_at BETWEEN ? AND ?
      GROUP BY c.id, c.name, c.visit_count
      ORDER BY total_spent DESC
      LIMIT 50
    `,
      [startDate.toISOString(), endDate.toISOString()]
    )) as {
      id: string;
      name: string;
      total_spent: number;
      total_orders: number;
      visit_count: number;
      avg_order_value: number;
    }[];

    // Get total revenue in the date range
    const revenueResult = (await this.db.getFirstAsync(
      `
      SELECT COALESCE(SUM(total), 0) as totalRevenue
      FROM sales 
      WHERE created_at BETWEEN ? AND ?
    `,
      [startDate.toISOString(), endDate.toISOString()]
    )) as { totalRevenue: number };

    // Get total unique customers who made purchases in the date range
    const customerCountResult = (await this.db.getFirstAsync(
      `
      SELECT COUNT(DISTINCT customer_id) as totalCustomers
      FROM sales 
      WHERE created_at BETWEEN ? AND ? AND customer_id IS NOT NULL
    `,
      [startDate.toISOString(), endDate.toISOString()]
    )) as { totalCustomers: number };

    return {
      totalCustomers: customerCountResult.totalCustomers,
      totalRevenue: revenueResult.totalRevenue,
      topCustomers,
    };
  }

  // Stock Movement Analytics Methods
  async getStockMovementTrends(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    dailyMovements: {
      date: string;
      stockIn: number;
      stockOut: number;
      netChange: number;
    }[];
    weeklyTrends: {
      week: string;
      stockIn: number;
      stockOut: number;
      netChange: number;
    }[];
    monthlyTrends: {
      month: string;
      stockIn: number;
      stockOut: number;
      netChange: number;
    }[];
    topMovingProducts: {
      productId: string;
      productName: string;
      totalMovement: number;
      netChange: number;
    }[];
  }> {
    const whereClause =
      startDate && endDate ? `WHERE sm.created_at BETWEEN ? AND ?` : '';
    const params =
      startDate && endDate
        ? [startDate.toISOString(), endDate.toISOString()]
        : [];

    // Daily movements
    const dailyMovements = (await this.db.getAllAsync(
      `
      SELECT 
        DATE(sm.created_at) as date,
        SUM(CASE WHEN sm.type = 'stock_in' THEN sm.quantity ELSE 0 END) as stockIn,
        SUM(CASE WHEN sm.type = 'stock_out' THEN sm.quantity ELSE 0 END) as stockOut,
        SUM(CASE WHEN sm.type = 'stock_in' THEN sm.quantity ELSE -sm.quantity END) as netChange
      FROM stock_movements sm
      ${whereClause}
      GROUP BY DATE(sm.created_at)
      ORDER BY date DESC
      LIMIT 30
    `,
      params
    )) as {
      date: string;
      stockIn: number;
      stockOut: number;
      netChange: number;
    }[];

    // Weekly trends
    const weeklyTrends = (await this.db.getAllAsync(
      `
      SELECT 
        strftime('%Y-W%W', sm.created_at) as week,
        SUM(CASE WHEN sm.type = 'stock_in' THEN sm.quantity ELSE 0 END) as stockIn,
        SUM(CASE WHEN sm.type = 'stock_out' THEN sm.quantity ELSE 0 END) as stockOut,
        SUM(CASE WHEN sm.type = 'stock_in' THEN sm.quantity ELSE -sm.quantity END) as netChange
      FROM stock_movements sm
      ${whereClause}
      GROUP BY strftime('%Y-W%W', sm.created_at)
      ORDER BY week DESC
      LIMIT 12
    `,
      params
    )) as {
      week: string;
      stockIn: number;
      stockOut: number;
      netChange: number;
    }[];

    // Monthly trends
    const monthlyTrends = (await this.db.getAllAsync(
      `
      SELECT 
        strftime('%Y-%m', sm.created_at) as month,
        SUM(CASE WHEN sm.type = 'stock_in' THEN sm.quantity ELSE 0 END) as stockIn,
        SUM(CASE WHEN sm.type = 'stock_out' THEN sm.quantity ELSE 0 END) as stockOut,
        SUM(CASE WHEN sm.type = 'stock_in' THEN sm.quantity ELSE -sm.quantity END) as netChange
      FROM stock_movements sm
      ${whereClause}
      GROUP BY strftime('%Y-%m', sm.created_at)
      ORDER BY month DESC
      LIMIT 12
    `,
      params
    )) as {
      month: string;
      stockIn: number;
      stockOut: number;
      netChange: number;
    }[];

    // Top moving products
    const topMovingProducts = (await this.db.getAllAsync(
      `
      SELECT 
        sm.product_id as productId,
        p.name as productName,
        SUM(sm.quantity) as totalMovement,
        SUM(CASE WHEN sm.type = 'stock_in' THEN sm.quantity ELSE -sm.quantity END) as netChange
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      ${whereClause}
      GROUP BY sm.product_id, p.name
      ORDER BY totalMovement DESC
      LIMIT 10
    `,
      params
    )) as {
      productId: string;
      productName: string;
      totalMovement: number;
      netChange: number;
    }[];

    return {
      dailyMovements,
      weeklyTrends,
      monthlyTrends,
      topMovingProducts,
    };
  }

  async calculateStockTurnoverRates(): Promise<{
    productTurnover: {
      productId: string;
      productName: string;
      turnoverRate: number;
      daysOfStock: number;
      category: string;
    }[];
    categoryTurnover: {
      categoryId: string;
      categoryName: string;
      avgTurnoverRate: number;
      totalValue: number;
    }[];
    overallTurnover: number;
  }> {
    // Calculate turnover rate for each product (sales / average inventory)
    const productTurnover = (await this.db.getAllAsync(`
      SELECT 
        p.id as productId,
        p.name as productName,
        c.name as category,
        p.quantity as currentStock,
        p.cost,
        COALESCE(sales_data.total_sold, 0) as totalSold,
        COALESCE(sales_data.total_sold, 0) * 1.0 / NULLIF(p.quantity, 0) as turnoverRate,
        CASE 
          WHEN COALESCE(sales_data.avg_daily_sales, 0) > 0 
          THEN p.quantity / sales_data.avg_daily_sales
          ELSE 999
        END as daysOfStock
      FROM products p
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN (
        SELECT 
          si.product_id,
          SUM(si.quantity) as total_sold,
          SUM(si.quantity) / 30.0 as avg_daily_sales
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        WHERE s.created_at >= date('now', '-30 days')
        GROUP BY si.product_id
      ) sales_data ON p.id = sales_data.product_id
      ORDER BY turnoverRate DESC
    `)) as {
      productId: string;
      productName: string;
      turnoverRate: number;
      daysOfStock: number;
      category: string;
    }[];

    // Calculate category-level turnover
    const categoryTurnover = (await this.db.getAllAsync(`
      SELECT 
        c.id as categoryId,
        c.name as categoryName,
        AVG(COALESCE(sales_data.total_sold, 0) * 1.0 / NULLIF(p.quantity, 0)) as avgTurnoverRate,
        SUM(p.quantity * p.cost) as totalValue
      FROM categories c
      JOIN products p ON c.id = p.category_id
      LEFT JOIN (
        SELECT 
          si.product_id,
          SUM(si.quantity) as total_sold
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        WHERE s.created_at >= date('now', '-30 days')
        GROUP BY si.product_id
      ) sales_data ON p.id = sales_data.product_id
      GROUP BY c.id, c.name
      ORDER BY avgTurnoverRate DESC
    `)) as {
      categoryId: string;
      categoryName: string;
      avgTurnoverRate: number;
      totalValue: number;
    }[];

    // Calculate overall turnover
    const overallResult = (await this.db.getFirstAsync(`
      SELECT 
        AVG(COALESCE(sales_data.total_sold, 0) * 1.0 / NULLIF(p.quantity, 0)) as overallTurnover
      FROM products p
      LEFT JOIN (
        SELECT 
          si.product_id,
          SUM(si.quantity) as total_sold
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        WHERE s.created_at >= date('now', '-30 days')
        GROUP BY si.product_id
      ) sales_data ON p.id = sales_data.product_id
    `)) as { overallTurnover: number } | null;

    return {
      productTurnover,
      categoryTurnover,
      overallTurnover: overallResult?.overallTurnover || 0,
    };
  }

  async predictLowStockItems(): Promise<{
    criticalItems: {
      productId: string;
      productName: string;
      currentStock: number;
      minStock: number;
      predictedDaysUntilEmpty: number;
      avgDailySales: number;
      category: string;
    }[];
    warningItems: {
      productId: string;
      productName: string;
      currentStock: number;
      minStock: number;
      predictedDaysUntilEmpty: number;
      avgDailySales: number;
      category: string;
    }[];
  }> {
    const stockPredictions = (await this.db.getAllAsync(`
      SELECT 
        p.id as productId,
        p.name as productName,
        p.quantity as currentStock,
        p.min_stock as minStock,
        c.name as category,
        COALESCE(sales_data.avg_daily_sales, 0) as avgDailySales,
        CASE 
          WHEN COALESCE(sales_data.avg_daily_sales, 0) > 0 
          THEN p.quantity / sales_data.avg_daily_sales
          ELSE 999
        END as predictedDaysUntilEmpty
      FROM products p
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN (
        SELECT 
          si.product_id,
          SUM(si.quantity) / 30.0 as avg_daily_sales
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        WHERE s.created_at >= date('now', '-30 days')
        GROUP BY si.product_id
      ) sales_data ON p.id = sales_data.product_id
      WHERE p.quantity > 0
      ORDER BY predictedDaysUntilEmpty ASC
    `)) as {
      productId: string;
      productName: string;
      currentStock: number;
      minStock: number;
      predictedDaysUntilEmpty: number;
      avgDailySales: number;
      category: string;
    }[];

    const criticalItems = stockPredictions.filter(
      (item) =>
        item.predictedDaysUntilEmpty <= 7 || item.currentStock <= item.minStock
    );

    const warningItems = stockPredictions.filter(
      (item) =>
        item.predictedDaysUntilEmpty > 7 &&
        item.predictedDaysUntilEmpty <= 14 &&
        item.currentStock > item.minStock
    );

    return {
      criticalItems,
      warningItems,
    };
  }

  async getStockMovementReport(
    startDate?: Date,
    endDate?: Date,
    productId?: string
  ): Promise<{
    summary: {
      totalStockIn: number;
      totalStockOut: number;
      netChange: number;
      totalTransactions: number;
      avgTransactionSize: number;
    };
    movements: {
      id: string;
      productName: string;
      type: 'stock_in' | 'stock_out';
      quantity: number;
      reason: string;
      supplierName?: string;
      createdAt: string;
    }[];
    productSummary?: {
      productName: string;
      openingStock: number;
      totalIn: number;
      totalOut: number;
      closingStock: number;
      netChange: number;
    };
  }> {
    let whereClause = '1=1';
    const params: any[] = [];

    if (startDate && endDate) {
      whereClause += ' AND sm.created_at BETWEEN ? AND ?';
      params.push(startDate.toISOString(), endDate.toISOString());
    }

    if (productId) {
      whereClause += ' AND sm.product_id = ?';
      params.push(productId);
    }

    // Summary data
    const summary = (await this.db.getFirstAsync(
      `
      SELECT 
        SUM(CASE WHEN sm.type = 'stock_in' THEN sm.quantity ELSE 0 END) as totalStockIn,
        SUM(CASE WHEN sm.type = 'stock_out' THEN sm.quantity ELSE 0 END) as totalStockOut,
        SUM(CASE WHEN sm.type = 'stock_in' THEN sm.quantity ELSE -sm.quantity END) as netChange,
        COUNT(*) as totalTransactions,
        AVG(sm.quantity) as avgTransactionSize
      FROM stock_movements sm
      WHERE ${whereClause}
    `,
      params
    )) as {
      totalStockIn: number;
      totalStockOut: number;
      netChange: number;
      totalTransactions: number;
      avgTransactionSize: number;
    } | null;

    // Detailed movements
    const movements = (await this.db.getAllAsync(
      `
      SELECT 
        sm.id,
        p.name as productName,
        sm.type,
        sm.quantity,
        sm.reason,
        s.name as supplierName,
        sm.created_at as createdAt
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      LEFT JOIN suppliers s ON sm.supplier_id = s.id
      WHERE ${whereClause}
      ORDER BY sm.created_at DESC
      LIMIT 1000
    `,
      params
    )) as {
      id: string;
      productName: string;
      type: 'stock_in' | 'stock_out';
      quantity: number;
      reason: string;
      supplierName?: string;
      createdAt: string;
    }[];

    let productSummary;
    if (productId) {
      // Get product summary for specific product
      const product = await this.getProductById(productId);
      if (product) {
        const totalIn = summary?.totalStockIn || 0;
        const totalOut = summary?.totalStockOut || 0;
        const netChange = summary?.netChange || 0;

        productSummary = {
          productName: product.name,
          openingStock: product.quantity - netChange,
          totalIn,
          totalOut,
          closingStock: product.quantity,
          netChange,
        };
      }
    }

    return {
      summary: summary || {
        totalStockIn: 0,
        totalStockOut: 0,
        netChange: 0,
        totalTransactions: 0,
        avgTransactionSize: 0,
      },
      movements,
      productSummary,
    };
  }

  // Bulk Pricing Analytics Methods
  async getBulkPricingInsights(): Promise<{
    discountImpact: {
      totalBulkDiscounts: number;
      totalManualDiscounts: number;
      totalSavingsGiven: number;
      avgDiscountPerSale: number;
      discountedSalesCount: number;
      totalSalesCount: number;
      discountPenetration: number; // percentage of sales with discounts
    };
    bulkPricingEffectiveness: {
      productId: string;
      productName: string;
      totalBulkSales: number;
      totalBulkDiscount: number;
      avgBulkDiscount: number;
      bulkSalesCount: number;
      regularSalesCount: number;
      bulkSalesPercentage: number;
    }[];
    revenueAnalysis: {
      totalRevenue: number;
      revenueWithoutDiscounts: number;
      discountImpactOnRevenue: number;
      avgOrderValueWithBulk: number;
      avgOrderValueWithoutBulk: number;
    };
  }> {
    // Discount impact analysis
    const discountImpactResult = (await this.db.getFirstAsync(`
      SELECT 
        SUM(si.bulk_discount) as totalBulkDiscounts,
        SUM(si.discount) as totalManualDiscounts,
        SUM(si.bulk_discount + si.discount) as totalSavingsGiven,
        AVG(si.bulk_discount + si.discount) as avgDiscountPerSale,
        COUNT(CASE WHEN (si.bulk_discount > 0 OR si.discount > 0) THEN 1 END) as discountedSalesCount,
        COUNT(*) as totalSalesCount
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.created_at >= date('now', '-30 days')
    `)) as {
      totalBulkDiscounts: number;
      totalManualDiscounts: number;
      totalSavingsGiven: number;
      avgDiscountPerSale: number;
      discountedSalesCount: number;
      totalSalesCount: number;
    } | null;

    const discountPenetration = discountImpactResult
      ? (discountImpactResult.discountedSalesCount /
          discountImpactResult.totalSalesCount) *
        100
      : 0;

    // Bulk pricing effectiveness by product
    const bulkPricingEffectiveness = (await this.db.getAllAsync(`
      SELECT 
        p.id as productId,
        p.name as productName,
        SUM(CASE WHEN si.bulk_discount > 0 THEN si.subtotal ELSE 0 END) as totalBulkSales,
        SUM(si.bulk_discount) as totalBulkDiscount,
        AVG(CASE WHEN si.bulk_discount > 0 THEN si.bulk_discount ELSE NULL END) as avgBulkDiscount,
        COUNT(CASE WHEN si.bulk_discount > 0 THEN 1 END) as bulkSalesCount,
        COUNT(CASE WHEN si.bulk_discount = 0 THEN 1 END) as regularSalesCount,
        (COUNT(CASE WHEN si.bulk_discount > 0 THEN 1 END) * 100.0 / COUNT(*)) as bulkSalesPercentage
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      WHERE s.created_at >= date('now', '-30 days')
      GROUP BY p.id, p.name
      HAVING COUNT(*) > 0
      ORDER BY totalBulkDiscount DESC
      LIMIT 20
    `)) as {
      productId: string;
      productName: string;
      totalBulkSales: number;
      totalBulkDiscount: number;
      avgBulkDiscount: number;
      bulkSalesCount: number;
      regularSalesCount: number;
      bulkSalesPercentage: number;
    }[];

    // Revenue analysis
    const revenueAnalysisResult = (await this.db.getFirstAsync(`
      SELECT 
        SUM(s.total) as totalRevenue,
        SUM(s.total + si_totals.total_discounts) as revenueWithoutDiscounts,
        SUM(si_totals.total_discounts) as discountImpactOnRevenue,
        AVG(CASE WHEN si_totals.has_bulk_discount THEN s.total ELSE NULL END) as avgOrderValueWithBulk,
        AVG(CASE WHEN NOT si_totals.has_bulk_discount THEN s.total ELSE NULL END) as avgOrderValueWithoutBulk
      FROM sales s
      JOIN (
        SELECT 
          si.sale_id,
          SUM(si.bulk_discount + si.discount) as total_discounts,
          MAX(CASE WHEN si.bulk_discount > 0 THEN 1 ELSE 0 END) as has_bulk_discount
        FROM sale_items si
        GROUP BY si.sale_id
      ) si_totals ON s.id = si_totals.sale_id
      WHERE s.created_at >= date('now', '-30 days')
    `)) as {
      totalRevenue: number;
      revenueWithoutDiscounts: number;
      discountImpactOnRevenue: number;
      avgOrderValueWithBulk: number;
      avgOrderValueWithoutBulk: number;
    } | null;

    return {
      discountImpact: {
        totalBulkDiscounts: discountImpactResult?.totalBulkDiscounts || 0,
        totalManualDiscounts: discountImpactResult?.totalManualDiscounts || 0,
        totalSavingsGiven: discountImpactResult?.totalSavingsGiven || 0,
        avgDiscountPerSale: discountImpactResult?.avgDiscountPerSale || 0,
        discountedSalesCount: discountImpactResult?.discountedSalesCount || 0,
        totalSalesCount: discountImpactResult?.totalSalesCount || 0,
        discountPenetration,
      },
      bulkPricingEffectiveness,
      revenueAnalysis: {
        totalRevenue: revenueAnalysisResult?.totalRevenue || 0,
        revenueWithoutDiscounts:
          revenueAnalysisResult?.revenueWithoutDiscounts || 0,
        discountImpactOnRevenue:
          revenueAnalysisResult?.discountImpactOnRevenue || 0,
        avgOrderValueWithBulk:
          revenueAnalysisResult?.avgOrderValueWithBulk || 0,
        avgOrderValueWithoutBulk:
          revenueAnalysisResult?.avgOrderValueWithoutBulk || 0,
      },
    };
  }

  async getBulkPricingOptimizationSuggestions(): Promise<{
    underperformingProducts: {
      productId: string;
      productName: string;
      currentBulkTiers: number;
      salesWithoutBulk: number;
      potentialBulkSales: number;
      suggestedAction: string;
    }[];
    overDiscountedProducts: {
      productId: string;
      productName: string;
      avgDiscountGiven: number;
      profitMargin: number;
      suggestedMaxDiscount: number;
      suggestedAction: string;
    }[];
    opportunityProducts: {
      productId: string;
      productName: string;
      highVolumeSales: number;
      noBulkPricing: boolean;
      avgQuantityPerSale: number;
      suggestedAction: string;
    }[];
  }> {
    // Find products with low bulk pricing adoption
    const underperformingProducts = (await this.db.getAllAsync(`
      SELECT 
        p.id as productId,
        p.name as productName,
        COUNT(bp.id) as currentBulkTiers,
        COUNT(CASE WHEN si.bulk_discount = 0 THEN 1 END) as salesWithoutBulk,
        COUNT(CASE WHEN si.bulk_discount > 0 THEN 1 END) as potentialBulkSales,
        'Consider adjusting bulk pricing tiers or promoting bulk discounts' as suggestedAction
      FROM products p
      LEFT JOIN bulk_pricing bp ON p.id = bp.product_id
      LEFT JOIN sale_items si ON p.id = si.product_id
      LEFT JOIN sales s ON si.sale_id = s.id
      WHERE s.created_at >= date('now', '-30 days')
      GROUP BY p.id, p.name
      HAVING COUNT(si.id) > 5 AND 
             (COUNT(CASE WHEN si.bulk_discount > 0 THEN 1 END) * 100.0 / COUNT(si.id)) < 30
      ORDER BY salesWithoutBulk DESC
      LIMIT 10
    `)) as {
      productId: string;
      productName: string;
      currentBulkTiers: number;
      salesWithoutBulk: number;
      potentialBulkSales: number;
      suggestedAction: string;
    }[];

    // Find products with excessive discounting affecting profit margins
    const overDiscountedProducts = (await this.db.getAllAsync(`
      SELECT 
        p.id as productId,
        p.name as productName,
        AVG(si.bulk_discount + si.discount) as avgDiscountGiven,
        ((p.price - p.cost) * 100.0 / p.price) as profitMargin,
        ((p.price - p.cost) * 0.5) as suggestedMaxDiscount,
        'Consider reducing discount amounts to maintain profitability' as suggestedAction
      FROM products p
      JOIN sale_items si ON p.id = si.product_id
      JOIN sales s ON si.sale_id = s.id
      WHERE s.created_at >= date('now', '-30 days')
        AND (si.bulk_discount + si.discount) > 0
      GROUP BY p.id, p.name, p.price, p.cost
      HAVING AVG(si.bulk_discount + si.discount) > ((p.price - p.cost) * 0.5)
      ORDER BY avgDiscountGiven DESC
      LIMIT 10
    `)) as {
      productId: string;
      productName: string;
      avgDiscountGiven: number;
      profitMargin: number;
      suggestedMaxDiscount: number;
      suggestedAction: string;
    }[];

    // Find high-volume products without bulk pricing
    const opportunityProducts = (await this.db.getAllAsync(`
      SELECT 
        p.id as productId,
        p.name as productName,
        COUNT(si.id) as highVolumeSales,
        CASE WHEN bp.id IS NULL THEN 1 ELSE 0 END as noBulkPricing,
        AVG(si.quantity) as avgQuantityPerSale,
        'Consider adding bulk pricing tiers for this high-volume product' as suggestedAction
      FROM products p
      JOIN sale_items si ON p.id = si.product_id
      JOIN sales s ON si.sale_id = s.id
      LEFT JOIN bulk_pricing bp ON p.id = bp.product_id
      WHERE s.created_at >= date('now', '-30 days')
      GROUP BY p.id, p.name
      HAVING COUNT(si.id) > 10 
        AND AVG(si.quantity) > 2
        AND bp.id IS NULL
      ORDER BY highVolumeSales DESC
      LIMIT 10
    `)) as {
      productId: string;
      productName: string;
      highVolumeSales: number;
      noBulkPricing: boolean;
      avgQuantityPerSale: number;
      suggestedAction: string;
    }[];

    return {
      underperformingProducts,
      overDiscountedProducts,
      opportunityProducts,
    };
  }

  async getBulkPricingPerformanceMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    periodComparison: {
      currentPeriod: {
        totalSales: number;
        bulkSales: number;
        bulkDiscountGiven: number;
        avgBulkOrderValue: number;
      };
      previousPeriod: {
        totalSales: number;
        bulkSales: number;
        bulkDiscountGiven: number;
        avgBulkOrderValue: number;
      };
      growth: {
        salesGrowth: number;
        bulkSalesGrowth: number;
        discountGrowth: number;
        orderValueGrowth: number;
      };
    };
    topPerformingTiers: {
      productId: string;
      productName: string;
      tierMinQuantity: number;
      tierDiscount: number;
      timesUsed: number;
      totalRevenue: number;
      avgOrderSize: number;
    }[];
  }> {
    const currentEndDate = endDate || new Date();
    const currentStartDate =
      startDate ||
      new Date(currentEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const periodLength = currentEndDate.getTime() - currentStartDate.getTime();
    const previousEndDate = new Date(currentStartDate.getTime());
    const previousStartDate = new Date(
      currentStartDate.getTime() - periodLength
    );

    // Current period metrics
    const currentPeriodResult = (await this.db.getFirstAsync(
      `
      SELECT 
        COUNT(DISTINCT s.id) as totalSales,
        COUNT(DISTINCT CASE WHEN si.bulk_discount > 0 THEN s.id END) as bulkSales,
        SUM(si.bulk_discount) as bulkDiscountGiven,
        AVG(CASE WHEN si.bulk_discount > 0 THEN s.total END) as avgBulkOrderValue
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      WHERE s.created_at BETWEEN ? AND ?
    `,
      [currentStartDate.toISOString(), currentEndDate.toISOString()]
    )) as {
      totalSales: number;
      bulkSales: number;
      bulkDiscountGiven: number;
      avgBulkOrderValue: number;
    } | null;

    // Previous period metrics
    const previousPeriodResult = (await this.db.getFirstAsync(
      `
      SELECT 
        COUNT(DISTINCT s.id) as totalSales,
        COUNT(DISTINCT CASE WHEN si.bulk_discount > 0 THEN s.id END) as bulkSales,
        SUM(si.bulk_discount) as bulkDiscountGiven,
        AVG(CASE WHEN si.bulk_discount > 0 THEN s.total END) as avgBulkOrderValue
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      WHERE s.created_at BETWEEN ? AND ?
    `,
      [previousStartDate.toISOString(), previousEndDate.toISOString()]
    )) as {
      totalSales: number;
      bulkSales: number;
      bulkDiscountGiven: number;
      avgBulkOrderValue: number;
    } | null;

    // Calculate growth rates
    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const currentPeriod = {
      totalSales: currentPeriodResult?.totalSales || 0,
      bulkSales: currentPeriodResult?.bulkSales || 0,
      bulkDiscountGiven: currentPeriodResult?.bulkDiscountGiven || 0,
      avgBulkOrderValue: currentPeriodResult?.avgBulkOrderValue || 0,
    };

    const previousPeriod = {
      totalSales: previousPeriodResult?.totalSales || 0,
      bulkSales: previousPeriodResult?.bulkSales || 0,
      bulkDiscountGiven: previousPeriodResult?.bulkDiscountGiven || 0,
      avgBulkOrderValue: previousPeriodResult?.avgBulkOrderValue || 0,
    };

    const growth = {
      salesGrowth: calculateGrowth(
        currentPeriod.totalSales,
        previousPeriod.totalSales
      ),
      bulkSalesGrowth: calculateGrowth(
        currentPeriod.bulkSales,
        previousPeriod.bulkSales
      ),
      discountGrowth: calculateGrowth(
        currentPeriod.bulkDiscountGiven,
        previousPeriod.bulkDiscountGiven
      ),
      orderValueGrowth: calculateGrowth(
        currentPeriod.avgBulkOrderValue,
        previousPeriod.avgBulkOrderValue
      ),
    };

    // Top performing bulk pricing tiers
    const topPerformingTiers = (await this.db.getAllAsync(
      `
      SELECT 
        p.id as productId,
        p.name as productName,
        bp.min_quantity as tierMinQuantity,
        bp.discount_percentage as tierDiscount,
        COUNT(si.id) as timesUsed,
        SUM(si.subtotal) as totalRevenue,
        AVG(si.quantity) as avgOrderSize
      FROM bulk_pricing bp
      JOIN products p ON bp.product_id = p.id
      JOIN sale_items si ON p.id = si.product_id AND si.quantity >= bp.min_quantity
      JOIN sales s ON si.sale_id = s.id
      WHERE s.created_at BETWEEN ? AND ?
        AND si.bulk_discount > 0
      GROUP BY p.id, p.name, bp.min_quantity, bp.discount_percentage
      ORDER BY totalRevenue DESC
      LIMIT 15
    `,
      [currentStartDate.toISOString(), currentEndDate.toISOString()]
    )) as {
      productId: string;
      productName: string;
      tierMinQuantity: number;
      tierDiscount: number;
      timesUsed: number;
      totalRevenue: number;
      avgOrderSize: number;
    }[];

    return {
      periodComparison: {
        currentPeriod,
        previousPeriod,
        growth,
      },
      topPerformingTiers,
    };
  }

  // Performance Optimization Methods
  async initializeOptimizations(): Promise<void> {
    const optimizer = new DatabaseOptimizer(this.db);

    try {
      // Create performance indexes
      await optimizer.createPerformanceIndexes();

      // Create materialized views for analytics
      await optimizer.createMaterializedViews();

      console.log('Database optimizations initialized successfully');
    } catch (error) {
      console.error('Error initializing database optimizations:', error);
      // Don't throw error to prevent app from crashing
    }
  }

  async analyzePerformance(): Promise<{
    tableStats: Array<{
      table: string;
      rowCount: number;
      indexCount: number;
    }>;
    recommendations: string[];
  }> {
    const optimizer = new DatabaseOptimizer(this.db);
    return optimizer.analyzePerformance();
  }

  async optimizeDatabase(): Promise<void> {
    const optimizer = new DatabaseOptimizer(this.db);
    await optimizer.optimizeDatabase();
  }

  async getDatabaseSize(): Promise<{
    pageCount: number;
    pageSize: number;
    totalSize: number;
    freePages: number;
  }> {
    const optimizer = new DatabaseOptimizer(this.db);
    return optimizer.getDatabaseSize();
  }

  async cleanupOldData(options: {
    deleteOldSales?: boolean;
    salesOlderThanDays?: number;
    deleteOldStockMovements?: boolean;
    stockMovementsOlderThanDays?: number;
    deleteOldExpenses?: boolean;
    expensesOlderThanDays?: number;
  }): Promise<{
    deletedSales: number;
    deletedStockMovements: number;
    deletedExpenses: number;
  }> {
    const optimizer = new DatabaseOptimizer(this.db);
    return optimizer.cleanupOldData(options);
  }

  // Monitored query wrapper for performance tracking
  async monitoredQuery<T>(
    queryName: string,
    queryFunction: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await queryFunction();
      const executionTime = Date.now() - startTime;
      PerformanceMonitor.recordQuery(queryName, executionTime);
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      PerformanceMonitor.recordQuery(`${queryName}_ERROR`, executionTime);
      throw error;
    }
  }

  // Daily Analytics Methods
  async getDailySalesForCurrentMonth(): Promise<{
    labels: string[];
    data: number[];
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Generate all days in the current month
    const allDays: string[] = [];
    const currentDate = new Date(startOfMonth);
    while (currentDate <= endOfMonth) {
      allDays.push(currentDate.getDate().toString());
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Use timezone-aware ranges for consistent querying
    const { start: startDateStr, end: endDateStr } =
      getTimezoneAwareCurrentMonthRangeForDB(-390);

    // Get sales data grouped by business day, but only include days within current month
    const salesData = (await this.db.getAllAsync(
      `SELECT 
        CASE 
          WHEN strftime('%H:%M', s.created_at) >= '17:30' 
          THEN CAST(strftime('%d', date(s.created_at, '+1 day')) AS INTEGER)
          ELSE CAST(strftime('%d', s.created_at) AS INTEGER)
        END as business_day,
        COALESCE(SUM(s.total), 0) as total_sales
      FROM sales s
      WHERE s.created_at >= ? AND s.created_at <= ?
      GROUP BY business_day
      HAVING business_day >= 1 AND business_day <= ?
      ORDER BY business_day`,
      [startDateStr, endDateStr, endOfMonth.getDate()]
    )) as { business_day: number; total_sales: number }[];

    // Create a map for quick lookup (convert day numbers to strings for matching)
    const salesMap = new Map(
      salesData.map((item) => [item.business_day.toString(), item.total_sales])
    );

    // Fill in missing days with 0
    const data = allDays.map((day) => salesMap.get(day) || 0);

    return {
      labels: allDays,
      data: data,
    };
  }

  async getDailyExpensesForCurrentMonth(): Promise<{
    labels: string[];
    data: number[];
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Generate all days in the current month
    const allDays: string[] = [];
    const currentDate = new Date(startOfMonth);
    while (currentDate <= endOfMonth) {
      allDays.push(currentDate.getDate().toString());
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Use timezone-aware ranges for consistent querying
    const { start: startDateStr, end: endDateStr } =
      getTimezoneAwareCurrentMonthRangeForDB(-390);

    // Get expense data grouped by business day, but only include days within current month
    const expenseData = (await this.db.getAllAsync(
      `SELECT 
        CASE 
          WHEN strftime('%H:%M', e.created_at) >= '17:30' 
          THEN CAST(strftime('%d', date(e.created_at, '+1 day')) AS INTEGER)
          ELSE CAST(strftime('%d', e.created_at) AS INTEGER)
        END as business_day,
        COALESCE(SUM(e.amount), 0) as total_expenses
      FROM expenses e
      WHERE e.created_at >= ? AND e.created_at <= ?
      GROUP BY business_day
      HAVING business_day >= 1 AND business_day <= ?
      ORDER BY business_day`,
      [startDateStr, endDateStr, endOfMonth.getDate()]
    )) as { business_day: number; total_expenses: number }[];

    // Create a map for quick lookup (convert day numbers to strings for matching)
    const expenseMap = new Map(
      expenseData.map((item) => [
        item.business_day.toString(),
        item.total_expenses,
      ])
    );

    // Fill in missing days with 0
    const data = allDays.map((day) => expenseMap.get(day) || 0);

    return {
      labels: allDays,
      data: data,
    };
  }

  // Shop Settings Methods removed - now using AsyncStorage (see shopSettingsStorage.ts)
}

export const initializeDatabase = async (
  onMigrationProgress?: (status: any) => void
): Promise<DatabaseService> => {
  try {
    const db = await SQLite.openDatabaseAsync('grocery_pos.db');
    const service = new DatabaseService(db);

    await service.createTables();

    // Check if UUID migration is needed with better error handling
    const migrationStatus = await MigrationStatusService.getMigrationStatus();
    if (!migrationStatus.uuidMigrationComplete) {
      console.log('Checking if UUID migration is needed...');

      try {
        const migrationService = new UUIDMigrationService(db);
        const isAlreadyMigrated = await migrationService.isMigrationComplete();

        if (isAlreadyMigrated) {
          console.log(
            'Database already uses UUID format, marking migration as complete'
          );
          await MigrationStatusService.markUUIDMigrationComplete();
        } else {
          console.log('Starting UUID migration...');
          await MigrationStatusService.recordMigrationAttempt();

          if (onMigrationProgress) {
            const originalUpdateStatus = (migrationService as any).updateStatus;
            (migrationService as any).updateStatus = (
              step: string,
              progress: number
            ) => {
              originalUpdateStatus.call(migrationService, step, progress);
              onMigrationProgress(migrationService.getMigrationStatus());
            };
          }

          const migrationReport = await migrationService.executeMigration();

          if (migrationReport.success) {
            await MigrationStatusService.markUUIDMigrationComplete();
            console.log('UUID migration completed successfully');
          } else {
            console.error('UUID migration failed:', migrationReport.errors);
            // Don't throw error in development to prevent crash
            if (__DEV__) {
              console.warn('Continuing without migration in development mode');
              await MigrationStatusService.markUUIDMigrationComplete();
            } else {
              throw new Error(
                `UUID migration failed: ${migrationReport.errors.join(', ')}`
              );
            }
          }
        }
      } catch (migrationError) {
        console.error('Migration error:', migrationError);
        if (__DEV__) {
          console.warn('Skipping migration in development mode due to error');
          await MigrationStatusService.markUUIDMigrationComplete();
        } else {
          throw migrationError;
        }
      }
    }

    await service.seedInitialData();
    return service;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};
