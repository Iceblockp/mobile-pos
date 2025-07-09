import * as SQLite from 'expo-sqlite';

export interface Product {
  id: number;
  name: string;
  barcode: string;
  category: string;
  price: number;
  cost: number;
  quantity: number;
  min_stock: number;
  supplier_id: number;
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
        barcode TEXT UNIQUE,
        category TEXT NOT NULL,
        price INTEGER NOT NULL,
        cost INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        min_stock INTEGER NOT NULL DEFAULT 10,
        supplier_id INTEGER,
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
        name: 'Dairy & Eggs',
        description: 'Milk, cheese, yogurt, and egg products',
      },
      {
        name: 'Meat & Seafood',
        description: 'Fresh and frozen meat, poultry, and seafood',
      },
      {
        name: 'Fruits & Vegetables',
        description: 'Fresh produce, fruits, and vegetables',
      },
      { name: 'Bakery', description: 'Bread, pastries, and baked goods' },
      { name: 'Beverages', description: 'Soft drinks, juices, and beverages' },
      {
        name: 'Snacks & Confectionery',
        description: 'Chips, candies, and snack foods',
      },
      {
        name: 'Frozen Foods',
        description: 'Frozen meals, ice cream, and frozen items',
      },
      {
        name: 'Household Items',
        description: 'Cleaning supplies and household necessities',
      },
      {
        name: 'Personal Care',
        description: 'Toiletries and personal hygiene products',
      },
      {
        name: 'Grains & Cereals',
        description: 'Rice, noodles, and breakfast cereals',
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

    // Only seed products if no products exist yet
    if (!hasProducts) {
      const products = [
        {
          name: 'Fresh Milk 1L',
          barcode: '1234567890123',
          category: 'Dairy & Eggs',
          price: 2500,
          cost: 1800,
          quantity: 50,
          min_stock: 10,
          supplier_id: 2,
        },
        {
          name: 'Free Range Eggs 12pk',
          barcode: '2345678901234',
          category: 'Dairy & Eggs',
          price: 3500,
          cost: 2200,
          quantity: 30,
          min_stock: 5,
          supplier_id: 2,
        },
        {
          name: 'Bananas 1kg',
          barcode: '3456789012345',
          category: 'Fruits & Vegetables',
          price: 1500,
          cost: 800,
          quantity: 100,
          min_stock: 20,
          supplier_id: 1,
        },
        {
          name: 'Coca Cola 500ml',
          barcode: '4567890123456',
          category: 'Beverages',
          price: 1200,
          cost: 700,
          quantity: 80,
          min_stock: 15,
          supplier_id: 3,
        },
        {
          name: 'White Bread Loaf',
          barcode: '5678901234567',
          category: 'Bakery',
          price: 1800,
          cost: 1200,
          quantity: 25,
          min_stock: 8,
          supplier_id: 1,
        },
        {
          name: 'Jasmine Rice 5kg',
          barcode: '6789012345678',
          category: 'Grains & Cereals',
          price: 8500,
          cost: 6000,
          quantity: 40,
          min_stock: 10,
          supplier_id: 1,
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

  async getSales(limit: number = 50): Promise<Sale[]> {
    const result = await this.db.getAllAsync(
      'SELECT * FROM sales ORDER BY created_at DESC LIMIT ?',
      [limit]
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
      'SELECT si.*, p.name as product_name FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?',
      [saleId]
    );
    return result as (SaleItem & { product_name: string })[];
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
        SUM(si.quantity * p.cost) as total_cost,
        SUM(si.quantity) as total_items
       FROM sale_items si 
       JOIN products p ON si.product_id = p.id 
       JOIN sales s ON si.sale_id = s.id 
       WHERE s.created_at >= datetime("now", "-${days} days")`
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
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const salesResult = (await this.db.getFirstAsync(
      `SELECT 
        COUNT(*) as total_sales, 
        SUM(total) as total_revenue, 
        AVG(total) as avg_sale 
       FROM sales 
       WHERE date(created_at) >= ? AND date(created_at) <= ?`,
      [startDateStr, endDateStr]
    )) as { total_sales: number; total_revenue: number; avg_sale: number };

    // Calculate cost and profit
    const costResult = (await this.db.getFirstAsync(
      `SELECT 
        SUM(si.quantity * p.cost) as total_cost,
        SUM(si.quantity) as total_items
       FROM sale_items si 
       JOIN products p ON si.product_id = p.id 
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
       WHERE date(s.created_at) >= ? AND date(s.created_at) <= ?
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
}

export const initializeDatabase = async (): Promise<DatabaseService> => {
  const db = await SQLite.openDatabaseAsync('grocery_pos.db');
  const service = new DatabaseService(db);

  await service.createTables();
  await service.seedInitialData();

  return service;
};
