import * as SQLite from 'expo-sqlite';

export interface Product {
  id: number;
  name: string;
  barcode?: string; // Make barcode optional
  category: string;
  price: number;
  cost: number;
  quantity: number;
  min_stock: number;
  supplier_id: number;
  imageUrl?: string; // Optional image URL property
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: number;
  total: number;
  payment_method: string;
  created_at: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  quantity: number;
  price: number;
  cost: number; // Add this line
  subtotal: number;
}

export interface Supplier {
  id: number;
  name: string;
  contact_name: string;
  phone: string;
  email: string;
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

      CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);

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
        category TEXT NOT NULL,
        price INTEGER NOT NULL,
        cost INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        min_stock INTEGER NOT NULL DEFAULT 10,
        supplier_id INTEGER,
        imageUrl TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
      
      CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
      CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
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
    } catch (error) {
      console.log('Migration completed or column already exists');
    }
  }

  async seedInitialData() {
    // Check if data has already been seeded
    const existingProducts = await this.db.getFirstAsync(
      'SELECT COUNT(*) as count FROM products'
    );
    const hasProducts = (existingProducts as { count: number }).count > 0;

    // Only seed categories and suppliers if needed
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
      const products = [
        {
          name: 'ရှမ်းဆန် ၅ ကီလို',
          barcode: '1234567890123',
          category: 'ဆန်နှင့် ကောက်ပဲသီးနှံများ',
          price: 8500,
          cost: 6000,
          quantity: 40,
          min_stock: 10,
          supplier_id: 1,
        },
        {
          name: 'ကြက်သား ၁ ကီလို',
          barcode: '2345678901234',
          category: 'အသားနှင့် ငါးများ',
          price: 4500,
          cost: 3200,
          quantity: 25,
          min_stock: 5,
          supplier_id: 1,
        },
        {
          name: 'ငွေ့ကောင်းသီး ၁ ကီလို',
          barcode: '3456789012345',
          category: 'ဟင်းသီးဟင်းရွက်များ',
          price: 1500,
          cost: 800,
          quantity: 100,
          min_stock: 20,
          supplier_id: 1,
        },
        {
          name: 'မုန့်ဟင်းခါး',
          barcode: '4567890123456',
          category: 'မုန့်နှင့် အချိုများ',
          price: 800,
          cost: 500,
          quantity: 50,
          min_stock: 15,
          supplier_id: 1,
        },
        {
          name: 'ကော်ကာကိုလာ ၅၀၀ မီလီ',
          barcode: '5678901234567',
          category: 'ယမကာများ',
          price: 1200,
          cost: 700,
          quantity: 80,
          min_stock: 15,
          supplier_id: 3,
        },
        {
          name: 'ငါးပိ ၁ ပုံး',
          barcode: '6789012345678',
          category: 'ငါးပိနှင့် ဟင်းခတ်အမွှေးများ',
          price: 2500,
          cost: 1800,
          quantity: 30,
          min_stock: 8,
          supplier_id: 1,
        },
        {
          name: 'လက်ဖက်ရည်ခြောက် ၁ ပက်ကက်',
          barcode: '7890123456789',
          category: 'လက်ဖက်ရည်နှင့် ကော်ဖီ',
          price: 3500,
          cost: 2200,
          quantity: 40,
          min_stock: 10,
          supplier_id: 2,
        },
        {
          name: 'ဆပ်ပြာ ၁ လုံး',
          barcode: '8901234567890',
          category: 'ကိုယ်ရေးကိုယ်တာ စောင့်ရှောက်မှု',
          price: 1800,
          cost: 1200,
          quantity: 60,
          min_stock: 12,
          supplier_id: 2,
        },
      ];

      for (const product of products) {
        await this.db.runAsync(
          'INSERT INTO products (name, barcode, category, price, cost, quantity, min_stock, supplier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            product.name,
            product.barcode,
            product.category,
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

  async getProducts(): Promise<Product[]> {
    const result = await this.db.getAllAsync(
      'SELECT * FROM products ORDER BY name'
    );
    return result as Product[];
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    const result = await this.db.getAllAsync(
      'SELECT * FROM products WHERE category = ? ORDER BY name',
      [category]
    );
    return result as Product[];
  }

  async getProductByBarcode(barcode: string): Promise<Product | null> {
    const result = await this.db.getFirstAsync(
      'SELECT * FROM products WHERE barcode = ?',
      [barcode]
    );
    return result as Product | null;
  }

  async addProduct(
    product: Omit<Product, 'id' | 'created_at' | 'updated_at'>
  ): Promise<number> {
    const result = await this.db.runAsync(
      'INSERT INTO products (name, barcode, category, price, cost, quantity, min_stock, supplier_id, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        product.name,
        product.barcode || null, // Handle empty barcode
        product.category,
        product.price,
        product.cost,
        product.quantity,
        product.min_stock,
        product.supplier_id,
        product.imageUrl || null,
      ]
    );
    return result.lastInsertRowId;
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<void> {
    const fields = Object.keys(product)
      .map((key) => `${key} = ?`)
      .join(', ');
    const values = Object.values(product);

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
      'SELECT * FROM products WHERE quantity <= min_stock ORDER BY quantity ASC'
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
      'SELECT COUNT(*) as count FROM products p JOIN categories c ON p.category = c.name WHERE c.id = ?',
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
    const saleResult = await this.db.runAsync(
      'INSERT INTO sales (total, payment_method) VALUES (?, ?)',
      [sale.total, sale.payment_method]
    );

    const saleId = saleResult.lastInsertRowId;

    for (const item of items) {
      await this.db.runAsync(
        'INSERT INTO sale_items (sale_id, product_id, quantity, price, cost, subtotal) VALUES (?, ?, ?, ?, ?, ?)',
        [
          saleId,
          item.product_id,
          item.quantity,
          item.price,
          item.cost,
          item.subtotal,
        ]
      );

      await this.db.runAsync(
        'UPDATE products SET quantity = quantity - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    return saleId;
  }

  // Add these functions after the getSales function
  async getSalesPaginated(
    page: number = 1,
    pageSize: number = 50
  ): Promise<Sale[]> {
    const offset = (page - 1) * pageSize;
    const result = await this.db.getAllAsync(
      'SELECT * FROM sales ORDER BY created_at DESC LIMIT ? OFFSET ?',
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
      'SELECT * FROM sales WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [startDateStr, endDateStr, pageSize, offset]
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
      'SELECT * FROM sales WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC LIMIT ?',
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
}

export const initializeDatabase = async (): Promise<DatabaseService> => {
  const db = await SQLite.openDatabaseAsync('grocery_pos.db');
  const service = new DatabaseService(db);

  await service.createTables();
  await service.seedInitialData();

  return service;
};
