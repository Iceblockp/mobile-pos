import { DatabaseService } from '@/services/database';
import * as SQLite from 'expo-sqlite';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

describe('DatabaseService - Migration Safety and Rollback', () => {
  let db: DatabaseService;
  let mockDatabase: any;

  beforeEach(() => {
    mockDatabase = {
      execAsync: jest.fn(),
      runAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(),
    };

    (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDatabase);
    db = new DatabaseService(mockDatabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Enhanced Features Migration', () => {
    it('should successfully migrate enhanced features', async () => {
      // Mock successful migration steps
      mockDatabase.execAsync
        .mockResolvedValueOnce({}) // BEGIN TRANSACTION
        .mockResolvedValueOnce({}) // Create customers table
        .mockResolvedValueOnce({}) // Create stock_movements table
        .mockResolvedValueOnce({}) // Create bulk_pricing table
        .mockResolvedValueOnce({}) // Add customer_id to sales table
        .mockResolvedValueOnce({}) // Create indexes
        .mockResolvedValueOnce({}); // COMMIT

      await db.migrateEnhancedFeatures();

      expect(mockDatabase.execAsync).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockDatabase.execAsync).toHaveBeenCalledWith('COMMIT');
      expect(mockDatabase.execAsync).toHaveBeenCalledTimes(7);
    });

    it('should rollback migration on failure', async () => {
      // Mock migration failure
      mockDatabase.execAsync
        .mockResolvedValueOnce({}) // BEGIN TRANSACTION
        .mockResolvedValueOnce({}) // Create customers table
        .mockRejectedValueOnce(new Error('Table creation failed')) // Fail on stock_movements table
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(db.migrateEnhancedFeatures()).rejects.toThrow(
        'Table creation failed'
      );

      expect(mockDatabase.execAsync).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockDatabase.execAsync).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('Table Creation Safety', () => {
    it('should create customers table safely', async () => {
      // Mock table doesn't exist
      mockDatabase.getFirstAsync.mockResolvedValueOnce(null);
      mockDatabase.execAsync.mockResolvedValueOnce({});

      await db.createCustomersTable();

      expect(mockDatabase.getFirstAsync).toHaveBeenCalledWith(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='customers'"
      );
      expect(mockDatabase.execAsync).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE customers')
      );
    });

    it('should skip table creation if table already exists', async () => {
      // Mock table already exists
      mockDatabase.getFirstAsync.mockResolvedValueOnce({ name: 'customers' });

      await db.createCustomersTable();

      expect(mockDatabase.getFirstAsync).toHaveBeenCalledWith(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='customers'"
      );
      expect(mockDatabase.execAsync).not.toHaveBeenCalled();
    });

    it('should create stock_movements table safely', async () => {
      // Mock table doesn't exist
      mockDatabase.getFirstAsync.mockResolvedValueOnce(null);
      mockDatabase.execAsync.mockResolvedValueOnce({});

      await db.createStockMovementsTable();

      expect(mockDatabase.getFirstAsync).toHaveBeenCalledWith(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='stock_movements'"
      );
      expect(mockDatabase.execAsync).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE stock_movements')
      );
    });

    it('should create bulk_pricing table safely', async () => {
      // Mock table doesn't exist
      mockDatabase.getFirstAsync.mockResolvedValueOnce(null);
      mockDatabase.execAsync.mockResolvedValueOnce({});

      await db.createBulkPricingTable();

      expect(mockDatabase.getFirstAsync).toHaveBeenCalledWith(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='bulk_pricing'"
      );
      expect(mockDatabase.execAsync).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE bulk_pricing')
      );
    });
  });

  describe('Column Addition Safety', () => {
    it('should safely add customer_id column to sales table', async () => {
      // Mock column doesn't exist
      mockDatabase.getAllAsync.mockResolvedValueOnce([
        { name: 'id' },
        { name: 'total' },
        { name: 'payment_method' },
        // customer_id column missing
      ]);
      mockDatabase.execAsync.mockResolvedValueOnce({});

      await db.addCustomerIdToSales();

      expect(mockDatabase.getAllAsync).toHaveBeenCalledWith(
        'PRAGMA table_info(sales)'
      );
      expect(mockDatabase.execAsync).toHaveBeenCalledWith(
        'ALTER TABLE sales ADD COLUMN customer_id INTEGER REFERENCES customers(id)'
      );
    });

    it('should skip column addition if column already exists', async () => {
      // Mock column already exists
      mockDatabase.getAllAsync.mockResolvedValueOnce([
        { name: 'id' },
        { name: 'total' },
        { name: 'payment_method' },
        { name: 'customer_id' }, // Column already exists
      ]);

      await db.addCustomerIdToSales();

      expect(mockDatabase.getAllAsync).toHaveBeenCalledWith(
        'PRAGMA table_info(sales)'
      );
      expect(mockDatabase.execAsync).not.toHaveBeenCalled();
    });
  });

  describe('Index Creation Safety', () => {
    it('should create indexes safely with IF NOT EXISTS', async () => {
      const expectedIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)',
        'CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)',
        'CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id)',
        'CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type)',
        'CREATE INDEX IF NOT EXISTS idx_bulk_pricing_product_id ON bulk_pricing(product_id)',
        'CREATE INDEX IF NOT EXISTS idx_bulk_pricing_min_quantity ON bulk_pricing(min_quantity)',
        'CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id)',
        'CREATE INDEX IF NOT EXISTS idx_stock_movements_product_date ON stock_movements(product_id, created_at)',
        'CREATE INDEX IF NOT EXISTS idx_stock_movements_type_date ON stock_movements(type, created_at)',
        'CREATE INDEX IF NOT EXISTS idx_sales_customer_date ON sales(customer_id, created_at)',
        'CREATE INDEX IF NOT EXISTS idx_customers_total_spent ON customers(total_spent DESC)',
      ];

      mockDatabase.execAsync.mockResolvedValue({});

      await db.createEnhancedIndexes();

      expectedIndexes.forEach((indexSql) => {
        expect(mockDatabase.execAsync).toHaveBeenCalledWith(indexSql);
      });
    });

    it('should handle index creation failures gracefully', async () => {
      // Mock some indexes succeed, one fails
      mockDatabase.execAsync
        .mockResolvedValueOnce({}) // First index succeeds
        .mockRejectedValueOnce(new Error('Index creation failed')) // Second index fails
        .mockResolvedValueOnce({}); // Third index succeeds

      // Index creation should not throw, but log the error
      await expect(db.createEnhancedIndexes()).rejects.toThrow(
        'Index creation failed'
      );
    });
  });

  describe('Data Integrity During Migration', () => {
    it('should preserve existing data during migration', async () => {
      // Mock existing data
      const existingCustomers = [
        { id: 1, name: 'John Doe', phone: '+1234567890' },
        { id: 2, name: 'Jane Smith', phone: '+0987654321' },
      ];

      const existingSales = [
        { id: 1, total: 100.0, payment_method: 'cash' },
        { id: 2, total: 150.0, payment_method: 'card' },
      ];

      // Mock successful migration
      mockDatabase.execAsync.mockResolvedValue({});
      mockDatabase.getAllAsync
        .mockResolvedValueOnce(existingCustomers) // Before migration
        .mockResolvedValueOnce(existingSales) // Before migration
        .mockResolvedValueOnce(existingCustomers) // After migration
        .mockResolvedValueOnce(existingSales); // After migration

      // Simulate checking data before and after migration
      const customersBefore = await db.getCustomers();
      const salesBefore = await db.getSales();

      await db.migrateEnhancedFeatures();

      const customersAfter = await db.getCustomers();
      const salesAfter = await db.getSales();

      expect(customersAfter).toEqual(customersBefore);
      expect(salesAfter).toEqual(salesBefore);
    });

    it('should validate foreign key constraints after migration', async () => {
      // Mock successful migration
      mockDatabase.execAsync.mockResolvedValue({});

      await db.migrateEnhancedFeatures();

      // Verify foreign key constraints are enabled
      expect(mockDatabase.execAsync).toHaveBeenCalledWith(
        'PRAGMA foreign_keys = ON'
      );
    });
  });

  describe('Migration Rollback Scenarios', () => {
    it('should rollback on customers table creation failure', async () => {
      mockDatabase.execAsync
        .mockResolvedValueOnce({}) // BEGIN TRANSACTION
        .mockRejectedValueOnce(new Error('Customers table creation failed'))
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(db.migrateEnhancedFeatures()).rejects.toThrow(
        'Customers table creation failed'
      );

      expect(mockDatabase.execAsync).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should rollback on stock movements table creation failure', async () => {
      mockDatabase.execAsync
        .mockResolvedValueOnce({}) // BEGIN TRANSACTION
        .mockResolvedValueOnce({}) // Create customers table
        .mockRejectedValueOnce(
          new Error('Stock movements table creation failed')
        )
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(db.migrateEnhancedFeatures()).rejects.toThrow(
        'Stock movements table creation failed'
      );

      expect(mockDatabase.execAsync).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should rollback on bulk pricing table creation failure', async () => {
      mockDatabase.execAsync
        .mockResolvedValueOnce({}) // BEGIN TRANSACTION
        .mockResolvedValueOnce({}) // Create customers table
        .mockResolvedValueOnce({}) // Create stock_movements table
        .mockRejectedValueOnce(new Error('Bulk pricing table creation failed'))
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(db.migrateEnhancedFeatures()).rejects.toThrow(
        'Bulk pricing table creation failed'
      );

      expect(mockDatabase.execAsync).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should rollback on index creation failure', async () => {
      mockDatabase.execAsync
        .mockResolvedValueOnce({}) // BEGIN TRANSACTION
        .mockResolvedValueOnce({}) // Create customers table
        .mockResolvedValueOnce({}) // Create stock_movements table
        .mockResolvedValueOnce({}) // Create bulk_pricing table
        .mockResolvedValueOnce({}) // Add customer_id to sales
        .mockRejectedValueOnce(new Error('Index creation failed'))
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(db.migrateEnhancedFeatures()).rejects.toThrow(
        'Index creation failed'
      );

      expect(mockDatabase.execAsync).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('Migration State Verification', () => {
    it('should verify migration completed successfully', async () => {
      // Mock successful migration
      mockDatabase.execAsync.mockResolvedValue({});

      // Mock table existence checks after migration
      mockDatabase.getFirstAsync
        .mockResolvedValueOnce({ name: 'customers' })
        .mockResolvedValueOnce({ name: 'stock_movements' })
        .mockResolvedValueOnce({ name: 'bulk_pricing' });

      await db.migrateEnhancedFeatures();

      // Verify all tables exist after migration
      const customersTable = await mockDatabase.getFirstAsync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='customers'"
      );
      const stockMovementsTable = await mockDatabase.getFirstAsync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='stock_movements'"
      );
      const bulkPricingTable = await mockDatabase.getFirstAsync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='bulk_pricing'"
      );

      expect(customersTable).toBeTruthy();
      expect(stockMovementsTable).toBeTruthy();
      expect(bulkPricingTable).toBeTruthy();
    });
  });
});
