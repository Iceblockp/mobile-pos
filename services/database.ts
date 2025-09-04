import * as SQLite from 'expo-sqlite';

export interface Product {
  id: number;
  name: string;
  barcode?: string; // Make barcode optional
  category_id: number; // Changed from category string to category_id number
  category?: string; // Optional category name for joined queries
  price: number;
  cost: number;
  quantity: number;
  min_stock: number;
  supplier_id?: number; // Make supplier_id optional
  supplier_name?: string; // For joined queries
  imageUrl?: string; // Optional image URL property
  bulk_pricing?: BulkPricing[]; // For joined queries
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: number;
  total: number;
  payment_method: string;
  note?: string; // Optional note field
  customer_id?: number; // Optional customer relationship
  customer_name?: string; // For joined queries
  created_at: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  quantity: number;
  price: number;
  cost: number;
  discount: number; // Discount amount
  subtotal: number; // (price * quantity) - discount
}

export interface Supplier {
  id: number;
  name: string;
  contact_name: string;
  phone: string;
  email?: string; // Make email optional
  address: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

export interface Expense {
  id: number;
  category_id: number;
  amount: number;
  description: string;
  date: string;
  created_at: string;
  updated_at: string;
}

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
  supplier_id?: number; // Optional: some stock_in may not be from suppliers
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

// ShopSettings moved to shopSettingsStorage.ts (using AsyncStorage instead of SQLite)

export class DatabaseService {
  private db: SQLite.SQLiteDatabase;

  constructor(database: SQLite.SQLiteDatabase) {
    this.db = database;
  }

  async createTables() {
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact_name TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        barcode TEXT, /* Removed UNIQUE constraint */
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

      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total INTEGER NOT NULL,
        payment_method TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price INTEGER NOT NULL,
        cost INTEGER NOT NULL,
        subtotal INTEGER NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
      );

      CREATE TABLE IF NOT EXISTS expense_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES expense_categories (id)
      );

      -- shop_settings table removed (now using AsyncStorage)
      
      CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
      CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
      CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
      CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
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

        for (const category of categories as { id: number; name: string }[]) {
          await this.db.runAsync(
            'UPDATE products SET category_id = ? WHERE category = ?',
            [category.id, category.name]
          );
        }

        // Step 3: Set default category for products without valid category
        const defaultCategory = (await this.db.getFirstAsync(
          'SELECT id FROM categories LIMIT 1'
        )) as { id: number } | null;

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
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('stock_in', 'stock_out')),
          quantity INTEGER NOT NULL,
          reason TEXT,
          supplier_id INTEGER,
          reference_number TEXT,
          unit_cost INTEGER,
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
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          min_quantity INTEGER NOT NULL,
          bulk_price INTEGER NOT NULL,
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

    console.log('Created enhanced feature indexes');
  }

  async seedInitialData() {
    // Check if data has already been seeded
    const existingProducts = await this.db.getFirstAsync(
      'SELECT COUNT(*) as count FROM products'
    );
    const hasProducts = (existingProducts as { count: number }).count > 0;

    // Only seed categories and suppliers if no products exist
    if (!hasProducts) {
      const categories = [
        {
          name: 'ဆန်နှင့် ကောက်ပဲသီးနှံများ',
          description: 'ဆန်၊ ကောက်ညှင်း၊ ပဲများနှင့် ကောက်ပဲသီးနှံများ',
        },
        {
          name: 'အသားနှင့် ငါးများ',
          description: 'အသားတပ်၊ ကြက်သား၊ ဝက်သားနှင့် ငါးများ',
        },
        {
          name: 'ဟင်းသီးဟင်းရွက်များ',
          description: 'လတ်ဆတ်သော ဟင်းသီးဟင်းရွက်နှင့် သစ်သီးများ',
        },
        {
          name: 'မုန့်နှင့် အချိုများ',
          description: 'မုန့်များ၊ အချိုများနှင့် မုန့်ဖုတ်ပစ္စည်းများ',
        },
        {
          name: 'ယမကာများ',
          description: 'အချိုရည်များ၊ ရေများနှင့် ယမကာများ',
        },
        {
          name: 'ငါးပိနှင့် ဟင်းခတ်အမွှေးများ',
          description: 'ငါးပိ၊ ဆား၊ ဆီနှင့် ဟင်းခတ်အမွှေးများ',
        },
        {
          name: 'လက်ဖက်ရည်နှင့် ကော်ဖီ',
          description: 'လက်ဖက်ရည်၊ ကော်ဖီနှင့် ပူဖျော်ယမကာများ',
        },
        {
          name: 'အိမ်သုံးပစ္စည်းများ',
          description: 'သန့်ရှင်းရေးပစ္စည်းများနှင့် အိမ်သုံးလိုအပ်ချက်များ',
        },
        {
          name: 'ကိုယ်ရေးကိုယ်တာ စောင့်ရှောက်မှု',
          description:
            'ရေချိုးဆပ်ပြာ၊ သွားတိုက်ဆေးနှင့် ကိုယ်ရေးကိုယ်တာ ပစ္စည်းများ',
        },
        {
          name: 'အခြားပစ္စည်းများ',
          description: 'အခြားအမျိုးမျိုးသော ကုန်ပစ္စည်းများ',
        },
      ];

      for (const category of categories) {
        try {
          await this.db.runAsync(
            'INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)',
            [category.name, category.description]
          );
        } catch (error) {
          // Fallback for databases without description column
          await this.db.runAsync(
            'INSERT OR IGNORE INTO categories (name) VALUES (?)',
            [category.name]
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
        {
          name: 'Golden Valley Dairy',
          contact_name: 'Khin Maung',
          phone: '09-987-654-321',
          email: 'khin@goldenvalley.com',
          address: 'Mandalay, Myanmar',
        },
        {
          name: 'Ayeyarwady Beverages',
          contact_name: 'Moe Aung',
          phone: '09-456-789-123',
          email: 'moe@ayeyarwady.com',
          address: 'Bago, Myanmar',
        },
      ];

      for (const supplier of suppliers) {
        await this.db.runAsync(
          'INSERT OR IGNORE INTO suppliers (name, contact_name, phone, email, address) VALUES (?, ?, ?, ?, ?)',
          [
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
        {
          name: 'Utilities',
          description: 'Electricity, water, internet, etc.',
        },
        { name: 'Salaries', description: 'Employee salaries and wages' },
        { name: 'Inventory', description: 'Inventory purchases' },
        {
          name: 'Marketing',
          description: 'Advertising and marketing expenses',
        },
        { name: 'Maintenance', description: 'Equipment and store maintenance' },
        { name: 'Miscellaneous', description: 'Other expenses' },
      ];

      for (const category of expenseCategories) {
        await this.addExpenseCategory(category.name, category.description);
      }

      console.log('Seeded expense categories');
    }

    // Only seed products if no products exist yet
    if (!hasProducts) {
      // Get category IDs for seeding products
      const categoryMap = new Map<string, number>();
      const categoriesForSeeding = (await this.db.getAllAsync(
        'SELECT id, name FROM categories'
      )) as { id: number; name: string }[];

      categoriesForSeeding.forEach((cat) => {
        categoryMap.set(cat.name, cat.id);
      });

      const products = [
        {
          name: 'ရှမ်းဆန် ၅ ကီလို',
          barcode: '1234567890123',
          category_name: 'ဆန်နှင့် ကောက်ပဲသီးနှံများ',
          price: 8500,
          cost: 6000,
          quantity: 40,
          min_stock: 10,
          supplier_id: 1,
        },
        {
          name: 'ကြက်သား ၁ ကီလို',
          barcode: '2345678901234',
          category_name: 'အသားနှင့် ငါးများ',
          price: 4500,
          cost: 3200,
          quantity: 25,
          min_stock: 5,
          supplier_id: 1,
        },
        {
          name: 'ငွေ့ကောင်းသီး ၁ ကီလို',
          barcode: '3456789012345',
          category_name: 'ဟင်းသီးဟင်းရွက်များ',
          price: 1500,
          cost: 800,
          quantity: 100,
          min_stock: 20,
          supplier_id: 1,
        },
        {
          name: 'မုန့်ဟင်းခါး',
          barcode: '4567890123456',
          category_name: 'မုန့်နှင့် အချိုများ',
          price: 800,
          cost: 500,
          quantity: 50,
          min_stock: 15,
          supplier_id: 1,
        },
        {
          name: 'ကော်ကာကိုလာ ၅၀၀ မီလီ',
          barcode: '5678901234567',
          category_name: 'ယမကာများ',
          price: 1200,
          cost: 700,
          quantity: 80,
          min_stock: 15,
          supplier_id: 3,
        },
        {
          name: 'ငါးပိ ၁ ပုံး',
          barcode: '6789012345678',
          category_name: 'ငါးပိနှင့် ဟင်းခတ်အမွှေးများ',
          price: 2500,
          cost: 1800,
          quantity: 30,
          min_stock: 8,
          supplier_id: 1,
        },
        {
          name: 'လက်ဖက်ရည်ခြောက် ၁ ပက်ကက်',
          barcode: '7890123456789',
          category_name: 'လက်ဖက်ရည်နှင့် ကော်ဖီ',
          price: 3500,
          cost: 2200,
          quantity: 40,
          min_stock: 10,
          supplier_id: 2,
        },
        {
          name: 'ဆပ်ပြာ ၁ လုံး',
          barcode: '8901234567890',
          category_name: 'ကိုယ်ရေးကိုယ်တာ စောင့်ရှောက်မှု',
          price: 1800,
          cost: 1200,
          quantity: 60,
          min_stock: 12,
          supplier_id: 2,
        },
      ];

      for (const product of products) {
        const categoryId = categoryMap.get(product.category_name);
        if (categoryId) {
          await this.db.runAsync(
            'INSERT INTO products (name, barcode, category_id, price, cost, quantity, min_stock, supplier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
              product.name,
              product.barcode,
              categoryId,
              product.price,
              product.cost,
              product.quantity,
              product.min_stock,
              product.supplier_id,
            ]
          );
        }
      }
    }
  }

  async getProducts(): Promise<Product[]> {
    const result = await this.db.getAllAsync(
      'SELECT p.*, c.name as category FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.name'
    );
    return result as Product[];
  }

  async getProductsWithBulkPricing(): Promise<Product[]> {
    const products = await this.getProducts();

    // Get bulk pricing for all products in a single query
    const bulkPricingResult = (await this.db.getAllAsync(
      'SELECT * FROM bulk_pricing ORDER BY product_id, min_quantity'
    )) as BulkPricing[];

    // Group bulk pricing by product_id
    const bulkPricingMap = new Map<number, BulkPricing[]>();
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

  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    const result = await this.db.getAllAsync(
      'SELECT p.*, c.name as category FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.category_id = ? ORDER BY p.name',
      [categoryId]
    );
    return result as Product[];
  }

  async getProductByBarcode(barcode: string): Promise<Product | null> {
    const result = await this.db.getFirstAsync(
      'SELECT p.*, c.name as category FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.barcode = ?',
      [barcode]
    );
    return result as Product | null;
  }

  async addProduct(
    product: Omit<Product, 'id' | 'created_at' | 'updated_at'>
  ): Promise<number> {
    const result = await this.db.runAsync(
      'INSERT INTO products (name, barcode, category_id, price, cost, quantity, min_stock, supplier_id, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
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
    return result.lastInsertRowId;
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<void> {
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

  async deleteProduct(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM products WHERE id = ?', [id]);
  }

  async getLowStockProducts(): Promise<Product[]> {
    const result = await this.db.getAllAsync(
      'SELECT p.*, c.name as category FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.quantity <= p.min_stock ORDER BY p.quantity ASC'
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
    category: Omit<Category, 'id' | 'created_at'>
  ): Promise<number> {
    try {
      const result = await this.db.runAsync(
        'INSERT INTO categories (name, description) VALUES (?, ?)',
        [category.name, category.description || '']
      );
      return result.lastInsertRowId;
    } catch (error) {
      // Fallback for databases without description column
      const result = await this.db.runAsync(
        'INSERT INTO categories (name) VALUES (?)',
        [category.name]
      );
      return result.lastInsertRowId;
    }
  }

  async updateCategory(id: number, category: Partial<Category>): Promise<void> {
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

  async deleteCategory(id: number): Promise<void> {
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

  async addSale(
    sale: Omit<Sale, 'id' | 'created_at'>,
    items: Omit<SaleItem, 'id' | 'sale_id'>[]
  ): Promise<number> {
    // Start transaction for atomic operation
    await this.db.execAsync('BEGIN TRANSACTION');

    try {
      const saleResult = await this.db.runAsync(
        'INSERT INTO sales (total, payment_method, note, customer_id) VALUES (?, ?, ?, ?)',
        [
          sale.total,
          sale.payment_method,
          sale.note || null,
          sale.customer_id || null,
        ]
      );

      const saleId = saleResult.lastInsertRowId;

      for (const item of items) {
        await this.db.runAsync(
          'INSERT INTO sale_items (sale_id, product_id, quantity, price, cost, discount, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
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
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();
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
    customerId: number,
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
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

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

  async getSaleItems(
    saleId: number
  ): Promise<(SaleItem & { product_name: string })[]> {
    const result = await this.db.getAllAsync(
      'SELECT si.*, COALESCE(p.name, "[Deleted Product]") as product_name FROM sale_items si LEFT JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?',
      [saleId]
    );
    return result as (SaleItem & { product_name: string })[];
  }

  async deleteSale(saleId: number): Promise<void> {
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
    // Add these two lines to define the date range
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = startDate.toISOString().split('T')[0];

    const salesResult = (await this.db.getFirstAsync(
      `SELECT 
        COUNT(*) as total_sales, 
        SUM(total) as total_revenue, 
        AVG(total) as avg_sale 
       FROM sales 
       WHERE created_at >= datetime("now", "-${days} days")`
    )) as { total_sales: number; total_revenue: number; avg_sale: number };

    // Calculate cost and profit
    const costResult = (await this.db.getFirstAsync(
      `SELECT 
        SUM(si.quantity * COALESCE(p.cost, si.cost)) as total_cost,
        SUM(si.quantity) as total_items
       FROM sale_items si 
       LEFT JOIN products p ON si.product_id = p.id 
       JOIN sales s ON si.sale_id = s.id 
       WHERE date(s.created_at) >= ? AND date(s.created_at) <= ?`,
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
       WHERE s.created_at >= datetime("now", "-${days} days") 
       GROUP BY p.id 
       ORDER BY revenue DESC 
       LIMIT 5`
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

    // Calculate growth compared to previous period
    const previousPeriodResult = (await this.db.getFirstAsync(
      `SELECT SUM(total) as previous_revenue 
       FROM sales 
       WHERE created_at >= datetime("now", "-${days * 2} days") 
       AND created_at < datetime("now", "-${days} days")`
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
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

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
  ): Promise<number> {
    const result = await this.db.runAsync(
      'INSERT INTO expense_categories (name, description) VALUES (?, ?)',
      [name, description || null]
    );
    return result.lastInsertRowId;
  }

  async updateExpenseCategory(
    id: number,
    name: string,
    description?: string
  ): Promise<void> {
    await this.db.runAsync(
      'UPDATE expense_categories SET name = ?, description = ? WHERE id = ?',
      [name, description || null, id]
    );
  }

  async deleteExpenseCategory(id: number): Promise<void> {
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
    category_id: number,
    amount: number,
    description: string,
    date: string
  ): Promise<number> {
    const result = await this.db.runAsync(
      `INSERT INTO expenses 
     (category_id, amount, description, date, updated_at) 
     VALUES (?, ?, ?, ?, datetime('now'))`,
      [category_id, amount, description, date]
    );
    return result.lastInsertRowId;
  }

  async updateExpense(
    id: number,
    category_id: number,
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

  async deleteExpense(id: number): Promise<void> {
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
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

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

    // Get expense data
    const expenseData = (await this.db.getAllAsync(
      `SELECT 
        ${groupBy
          .replace('s.created_at', 'e.date')
          .replace(", 'localtime'", '')} as date,
        SUM(e.amount) as expenses
       FROM expenses e
       WHERE date(e.date) >= ? AND date(e.date) <= ?
       GROUP BY ${groupBy
         .replace('s.created_at', 'e.date')
         .replace(", 'localtime'", '')}
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
    const allDates = new Set([...revenueMap.keys(), ...expenseMap.keys()]);

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
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

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

    // Get expenses for the period
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

    const expensesResult = (await this.db.getFirstAsync(
      `SELECT SUM(amount) as total_expenses
     FROM expenses
     WHERE date >= ? AND date <= ?`,
      [startDateStr, endDateStr]
    )) as { total_expenses: number };

    const totalExpenses = expensesResult.total_expenses || 0;
    const netProfit = analytics.totalProfit - totalExpenses;

    // Get expenses by category
    const expensesByCategory = (await this.db.getAllAsync(
      `SELECT ec.name as category_name, SUM(e.amount) as amount
     FROM expenses e
     JOIN expense_categories ec ON e.category_id = ec.id
     WHERE e.date >= ? AND e.date <= ?
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
  async addBulkPricing(
    bulkPricing: Omit<BulkPricing, 'id' | 'created_at'>
  ): Promise<number> {
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

    const result = await this.db.runAsync(
      'INSERT INTO bulk_pricing (product_id, min_quantity, bulk_price) VALUES (?, ?, ?)',
      [bulkPricing.product_id, bulkPricing.min_quantity, bulkPricing.bulk_price]
    );
    return result.lastInsertRowId;
  }

  async updateBulkPricing(
    id: number,
    bulkPricing: Partial<BulkPricing>
  ): Promise<void> {
    // If updating price, validate it's less than regular price
    if (bulkPricing.bulk_price) {
      const existingTier = (await this.db.getFirstAsync(
        'SELECT product_id FROM bulk_pricing WHERE id = ?',
        [id]
      )) as { product_id: number } | null;

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

    const fields = Object.keys(bulkPricing)
      .filter((key) => key !== 'id' && key !== 'created_at')
      .map((key) => `${key} = ?`)
      .join(', ');
    const values = Object.keys(bulkPricing)
      .filter((key) => key !== 'id' && key !== 'created_at')
      .map((key) => (bulkPricing as any)[key]);

    await this.db.runAsync(`UPDATE bulk_pricing SET ${fields} WHERE id = ?`, [
      ...values,
      id,
    ]);
  }

  async deleteBulkPricing(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM bulk_pricing WHERE id = ?', [id]);
  }

  async getBulkPricingForProduct(productId: number): Promise<BulkPricing[]> {
    const result = await this.db.getAllAsync(
      'SELECT * FROM bulk_pricing WHERE product_id = ? ORDER BY min_quantity ASC',
      [productId]
    );
    return result as BulkPricing[];
  }

  async calculateBestPrice(
    productId: number,
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
    productId: number,
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
  ): Promise<number> {
    // Start transaction for atomic operation
    await this.db.execAsync('BEGIN TRANSACTION');

    try {
      // Add the stock movement record
      const result = await this.db.runAsync(
        `INSERT INTO stock_movements 
         (product_id, type, quantity, reason, supplier_id, reference_number, unit_cost) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
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
      return result.lastInsertRowId;
    } catch (error) {
      await this.db.execAsync('ROLLBACK');
      throw error;
    }
  }

  async getStockMovements(
    filters?: {
      productId?: number;
      type?: 'stock_in' | 'stock_out';
      startDate?: Date;
      endDate?: Date;
      supplierId?: number;
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
    productId: number,
    page: number = 1,
    pageSize: number = 20
  ): Promise<StockMovement[]> {
    return this.getStockMovements({ productId }, page, pageSize);
  }

  async updateProductQuantityWithMovement(
    productId: number,
    movementType: 'stock_in' | 'stock_out',
    quantity: number,
    reason?: string,
    supplierId?: number,
    referenceNumber?: string,
    unitCost?: number
  ): Promise<number> {
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
    productId?: number,
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

  async getCustomerById(id: number): Promise<Customer | null> {
    const result = await this.db.getFirstAsync(
      'SELECT * FROM customers WHERE id = ?',
      [id]
    );
    return result as Customer | null;
  }

  async addCustomer(
    customer: Omit<
      Customer,
      'id' | 'total_spent' | 'visit_count' | 'created_at' | 'updated_at'
    >
  ): Promise<number> {
    const result = await this.db.runAsync(
      'INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)',
      [
        customer.name,
        customer.phone || null,
        customer.email || null,
        customer.address || null,
      ]
    );
    return result.lastInsertRowId;
  }

  async updateCustomer(id: number, customer: Partial<Customer>): Promise<void> {
    const fields = Object.keys(customer)
      .filter((key) => key !== 'id' && key !== 'created_at')
      .map((key) => `${key} = ?`)
      .join(', ');
    const values = Object.keys(customer)
      .filter((key) => key !== 'id' && key !== 'created_at')
      .map((key) => (customer as any)[key]);

    await this.db.runAsync(
      `UPDATE customers SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    );
  }

  async deleteCustomer(id: number): Promise<void> {
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
    customerId: number,
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
    customerId: number,
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

  async getCustomerStatistics(customerId: number): Promise<{
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

  // Shop Settings Methods removed - now using AsyncStorage (see shopSettingsStorage.ts)
}

export const initializeDatabase = async (): Promise<DatabaseService> => {
  const db = await SQLite.openDatabaseAsync('grocery_pos.db');
  const service = new DatabaseService(db);

  await service.createTables();
  await service.seedInitialData();

  return service;
};
