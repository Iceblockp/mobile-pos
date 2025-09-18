import * as SQLite from 'expo-sqlite';

export class DatabaseOptimizer {
  private db: SQLite.SQLiteDatabase;

  constructor(database: SQLite.SQLiteDatabase) {
    this.db = database;
  }

  /**
   * Create performance indexes for supplier management and decimal pricing
   */
  async createPerformanceIndexes(): Promise<void> {
    console.log('Creating performance indexes...');

    try {
      // Supplier indexes
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_suppliers_name 
        ON suppliers(name COLLATE NOCASE)
      `);

      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_suppliers_contact_name 
        ON suppliers(contact_name COLLATE NOCASE)
      `);

      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_suppliers_phone 
        ON suppliers(phone)
      `);

      // Product-supplier relationship indexes
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_products_supplier_id 
        ON products(supplier_id)
      `);

      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_products_category_supplier 
        ON products(category_id, supplier_id)
      `);

      // Stock movement indexes for supplier analytics
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_stock_movements_supplier_id 
        ON stock_movements(supplier_id)
      `);

      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_stock_movements_product_supplier 
        ON stock_movements(product_id, supplier_id)
      `);

      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at 
        ON stock_movements(created_at)
      `);

      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_stock_movements_supplier_date 
        ON stock_movements(supplier_id, created_at)
      `);

      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_stock_movements_type_supplier 
        ON stock_movements(type, supplier_id)
      `);

      // Sales and pricing indexes
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_sale_items_product_id 
        ON sale_items(product_id)
      `);

      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_sales_created_at 
        ON sales(created_at)
      `);

      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_sales_customer_date 
        ON sales(customer_id, created_at)
      `);

      // Bulk pricing indexes
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_bulk_pricing_product_quantity 
        ON bulk_pricing(product_id, min_quantity)
      `);

      // Expense indexes
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_expenses_category_date 
        ON expenses(category_id, created_at)
      `);

      console.log('Performance indexes created successfully');
    } catch (error) {
      console.error('Error creating performance indexes:', error);
      throw error;
    }
  }

  /**
   * Analyze database performance and provide recommendations
   */
  async analyzePerformance(): Promise<{
    tableStats: Array<{
      table: string;
      rowCount: number;
      indexCount: number;
    }>;
    recommendations: string[];
  }> {
    console.log('Analyzing database performance...');

    const tableStats = [];
    const recommendations = [];

    try {
      // Get table statistics
      const tables = [
        'suppliers',
        'products',
        'sales',
        'sale_items',
        'stock_movements',
        'bulk_pricing',
        'expenses',
        'customers',
        'categories',
      ];

      for (const table of tables) {
        // Get row count
        const rowCountResult = (await this.db.getFirstAsync(
          `SELECT COUNT(*) as count FROM ${table}`
        )) as { count: number };

        // Get index count
        const indexResult = await this.db.getAllAsync(
          `SELECT name FROM sqlite_master WHERE type='index' AND tbl_name=?`,
          [table]
        );

        tableStats.push({
          table,
          rowCount: rowCountResult.count,
          indexCount: indexResult.length,
        });
      }

      // Generate recommendations based on table sizes
      for (const stat of tableStats) {
        if (stat.rowCount > 1000 && stat.indexCount < 2) {
          recommendations.push(
            `Consider adding indexes to ${stat.table} table (${stat.rowCount} rows, ${stat.indexCount} indexes)`
          );
        }

        if (stat.rowCount > 10000) {
          recommendations.push(
            `${stat.table} table has ${stat.rowCount} rows - consider implementing pagination`
          );
        }
      }

      // Check for missing foreign key indexes
      const missingIndexes = await this.checkMissingForeignKeyIndexes();
      recommendations.push(...missingIndexes);

      return {
        tableStats,
        recommendations,
      };
    } catch (error) {
      console.error('Error analyzing performance:', error);
      throw error;
    }
  }

  /**
   * Check for missing foreign key indexes
   */
  private async checkMissingForeignKeyIndexes(): Promise<string[]> {
    const recommendations = [];

    try {
      // Check if foreign key indexes exist
      const foreignKeys = [
        { table: 'products', column: 'category_id', referenced: 'categories' },
        { table: 'products', column: 'supplier_id', referenced: 'suppliers' },
        { table: 'sales', column: 'customer_id', referenced: 'customers' },
        { table: 'sale_items', column: 'sale_id', referenced: 'sales' },
        { table: 'sale_items', column: 'product_id', referenced: 'products' },
        {
          table: 'stock_movements',
          column: 'product_id',
          referenced: 'products',
        },
        {
          table: 'stock_movements',
          column: 'supplier_id',
          referenced: 'suppliers',
        },
        { table: 'bulk_pricing', column: 'product_id', referenced: 'products' },
        {
          table: 'expenses',
          column: 'category_id',
          referenced: 'expense_categories',
        },
      ];

      for (const fk of foreignKeys) {
        const indexExists = await this.db.getFirstAsync(
          `SELECT name FROM sqlite_master 
           WHERE type='index' 
           AND tbl_name=? 
           AND sql LIKE ?`,
          [fk.table, `%${fk.column}%`]
        );

        if (!indexExists) {
          recommendations.push(
            `Missing index on ${fk.table}.${fk.column} (foreign key to ${fk.referenced})`
          );
        }
      }
    } catch (error) {
      console.error('Error checking foreign key indexes:', error);
    }

    return recommendations;
  }

  /**
   * Optimize database by running VACUUM and ANALYZE
   */
  async optimizeDatabase(): Promise<void> {
    console.log('Optimizing database...');

    try {
      // Update table statistics
      await this.db.execAsync('ANALYZE');
      console.log('Database statistics updated');

      // Reclaim unused space
      await this.db.execAsync('VACUUM');
      console.log('Database vacuumed');

      console.log('Database optimization completed');
    } catch (error) {
      console.error('Error optimizing database:', error);
      throw error;
    }
  }

  /**
   * Get database size information
   */
  async getDatabaseSize(): Promise<{
    pageCount: number;
    pageSize: number;
    totalSize: number;
    freePages: number;
  }> {
    try {
      const pageCountResult = (await this.db.getFirstAsync(
        'PRAGMA page_count'
      )) as { page_count: number };

      const pageSizeResult = (await this.db.getFirstAsync(
        'PRAGMA page_size'
      )) as { page_size: number };

      const freePagesResult = (await this.db.getFirstAsync(
        'PRAGMA freelist_count'
      )) as { freelist_count: number };

      return {
        pageCount: pageCountResult.page_count,
        pageSize: pageSizeResult.page_size,
        totalSize: pageCountResult.page_count * pageSizeResult.page_size,
        freePages: freePagesResult.freelist_count,
      };
    } catch (error) {
      console.error('Error getting database size:', error);
      throw error;
    }
  }

  /**
   * Monitor query performance
   */
  async monitorQuery<T>(
    queryName: string,
    queryFunction: () => Promise<T>
  ): Promise<{
    result: T;
    executionTime: number;
    memoryUsage?: number;
  }> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage?.()?.heapUsed || 0;

    try {
      const result = await queryFunction();
      const executionTime = Date.now() - startTime;
      const endMemory = process.memoryUsage?.()?.heapUsed || 0;
      const memoryUsage = endMemory - startMemory;

      console.log(`Query "${queryName}" executed in ${executionTime}ms`);
      if (memoryUsage > 0) {
        console.log(
          `Memory usage: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`
        );
      }

      return {
        result,
        executionTime,
        memoryUsage: memoryUsage > 0 ? memoryUsage : undefined,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(
        `Query "${queryName}" failed after ${executionTime}ms:`,
        error
      );
      throw error;
    }
  }

  /**
   * Create materialized views for complex analytics
   */
  async createMaterializedViews(): Promise<void> {
    console.log('Creating materialized views for analytics...');

    try {
      // Supplier summary view
      await this.db.execAsync(`
        CREATE VIEW IF NOT EXISTS supplier_summary AS
        SELECT 
          s.id,
          s.name,
          s.contact_name,
          s.phone,
          s.email,
          s.address,
          s.created_at,
          COUNT(DISTINCT p.id) as total_products,
          COUNT(DISTINCT CASE 
            WHEN sm.type = 'stock_in' AND sm.created_at >= date('now', '-30 days') 
            THEN sm.id 
          END) as recent_deliveries,
          COALESCE(SUM(CASE 
            WHEN sm.type = 'stock_in' AND sm.unit_cost_decimal IS NOT NULL 
            THEN sm.quantity * sm.unit_cost_decimal
            WHEN sm.type = 'stock_in' AND sm.unit_cost IS NOT NULL 
            THEN sm.quantity * (sm.unit_cost / 100.0)
            ELSE 0 
          END), 0) as total_purchase_value
        FROM suppliers s
        LEFT JOIN products p ON s.id = p.supplier_id
        LEFT JOIN stock_movements sm ON s.id = sm.supplier_id
        GROUP BY s.id, s.name, s.contact_name, s.phone, s.email, s.address, s.created_at
      `);

      // Product performance view
      await this.db.execAsync(`
        CREATE VIEW IF NOT EXISTS product_performance AS
        SELECT 
          p.id,
          p.name,
          p.price,
          p.cost,
          p.quantity,
          p.supplier_id,
          s.name as supplier_name,
          COUNT(si.id) as times_sold,
          COALESCE(SUM(si.quantity), 0) as total_sold,
          COALESCE(SUM(si.subtotal), 0) as total_revenue,
          COALESCE(SUM((si.price - si.cost) * si.quantity), 0) as total_profit
        FROM products p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN sale_items si ON p.id = si.product_id
        GROUP BY p.id, p.name, p.price, p.cost, p.quantity, p.supplier_id, s.name
      `);

      // Monthly sales summary view
      await this.db.execAsync(`
        CREATE VIEW IF NOT EXISTS monthly_sales_summary AS
        SELECT 
          strftime('%Y-%m', s.created_at) as month,
          COUNT(*) as sale_count,
          SUM(s.total) as total_revenue,
          AVG(s.total) as average_sale,
          COUNT(DISTINCT s.customer_id) as unique_customers
        FROM sales s
        GROUP BY strftime('%Y-%m', s.created_at)
        ORDER BY month DESC
      `);

      console.log('Materialized views created successfully');
    } catch (error) {
      console.error('Error creating materialized views:', error);
      throw error;
    }
  }

  /**
   * Clean up old data to improve performance
   */
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
    console.log('Cleaning up old data...');

    let deletedSales = 0;
    let deletedStockMovements = 0;
    let deletedExpenses = 0;

    try {
      await this.db.execAsync('BEGIN TRANSACTION');

      // Clean up old sales
      if (options.deleteOldSales && options.salesOlderThanDays) {
        const salesResult = await this.db.runAsync(
          `DELETE FROM sales 
           WHERE created_at < date('now', '-${options.salesOlderThanDays} days')`
        );
        deletedSales = salesResult.changes;
        console.log(`Deleted ${deletedSales} old sales records`);
      }

      // Clean up old stock movements
      if (
        options.deleteOldStockMovements &&
        options.stockMovementsOlderThanDays
      ) {
        const movementsResult = await this.db.runAsync(
          `DELETE FROM stock_movements 
           WHERE created_at < date('now', '-${options.stockMovementsOlderThanDays} days')`
        );
        deletedStockMovements = movementsResult.changes;
        console.log(
          `Deleted ${deletedStockMovements} old stock movement records`
        );
      }

      // Clean up old expenses
      if (options.deleteOldExpenses && options.expensesOlderThanDays) {
        const expensesResult = await this.db.runAsync(
          `DELETE FROM expenses 
           WHERE created_at < date('now', '-${options.expensesOlderThanDays} days')`
        );
        deletedExpenses = expensesResult.changes;
        console.log(`Deleted ${deletedExpenses} old expense records`);
      }

      await this.db.execAsync('COMMIT');
      console.log('Data cleanup completed successfully');

      return {
        deletedSales,
        deletedStockMovements,
        deletedExpenses,
      };
    } catch (error) {
      await this.db.execAsync('ROLLBACK');
      console.error('Error during data cleanup:', error);
      throw error;
    }
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static queries: Map<
    string,
    {
      count: number;
      totalTime: number;
      averageTime: number;
      maxTime: number;
      minTime: number;
    }
  > = new Map();

  static recordQuery(queryName: string, executionTime: number): void {
    const existing = this.queries.get(queryName);

    if (existing) {
      existing.count++;
      existing.totalTime += executionTime;
      existing.averageTime = existing.totalTime / existing.count;
      existing.maxTime = Math.max(existing.maxTime, executionTime);
      existing.minTime = Math.min(existing.minTime, executionTime);
    } else {
      this.queries.set(queryName, {
        count: 1,
        totalTime: executionTime,
        averageTime: executionTime,
        maxTime: executionTime,
        minTime: executionTime,
      });
    }
  }

  static getQueryStats(): Array<{
    queryName: string;
    count: number;
    totalTime: number;
    averageTime: number;
    maxTime: number;
    minTime: number;
  }> {
    return Array.from(this.queries.entries()).map(([queryName, stats]) => ({
      queryName,
      ...stats,
    }));
  }

  static getSlowQueries(threshold: number = 1000): Array<{
    queryName: string;
    averageTime: number;
    maxTime: number;
    count: number;
  }> {
    return this.getQueryStats()
      .filter((stat) => stat.averageTime > threshold)
      .sort((a, b) => b.averageTime - a.averageTime);
  }

  static reset(): void {
    this.queries.clear();
  }

  static logStats(): void {
    console.log('\n📊 Query Performance Statistics:');
    console.log('================================');

    const stats = this.getQueryStats().sort(
      (a, b) => b.averageTime - a.averageTime
    );

    for (const stat of stats) {
      console.log(`${stat.queryName}:`);
      console.log(`  Count: ${stat.count}`);
      console.log(`  Average: ${stat.averageTime.toFixed(2)}ms`);
      console.log(`  Min: ${stat.minTime}ms`);
      console.log(`  Max: ${stat.maxTime}ms`);
      console.log(`  Total: ${stat.totalTime}ms`);
      console.log('');
    }

    const slowQueries = this.getSlowQueries();
    if (slowQueries.length > 0) {
      console.log('⚠️  Slow Queries (>1000ms average):');
      for (const query of slowQueries) {
        console.log(
          `  ${query.queryName}: ${query.averageTime.toFixed(2)}ms avg`
        );
      }
    }
  }
}

/**
 * Cache manager for frequently accessed data
 */
export class QueryCache {
  private static cache: Map<
    string,
    {
      data: any;
      timestamp: number;
      ttl: number;
    }
  > = new Map();

  static set(key: string, data: any, ttlMs: number = 300000): void {
    // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  static get<T>(key: string): T | null {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  static invalidate(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  static getStats(): {
    size: number;
    hitRate: number;
    keys: string[];
  } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses
      keys: Array.from(this.cache.keys()),
    };
  }
}
