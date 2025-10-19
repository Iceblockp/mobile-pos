import { DatabaseService } from '../../services/database';
import * as SQLite from 'expo-sqlite';

describe('Database Pagination', () => {
  let db: SQLite.SQLiteDatabase;
  let dbService: DatabaseService;

  beforeAll(async () => {
    db = await SQLite.openDatabaseAsync(':memory:');
    dbService = new DatabaseService(db);
    await dbService.createTables();

    // Seed test data
    await seedTestData();
  });

  afterAll(async () => {
    await db.closeAsync();
  });

  const seedTestData = async () => {
    // Add test categories
    await db.runAsync(
      'INSERT INTO categories (id, name) VALUES (?, ?), (?, ?)',
      ['cat1', 'Electronics', 'cat2', 'Books']
    );

    // Add test suppliers
    await db.runAsync(
      'INSERT INTO suppliers (id, name, contact_name, phone, address) VALUES (?, ?, ?, ?, ?)',
      ['sup1', 'Tech Supplier', 'John Doe', '123-456-7890', '123 Tech St']
    );

    // Add test products
    const products = [
      ['prod1', 'iPhone 15', 'IP15001', 'cat1', 999.99, 800.0, 10, 5, 'sup1'],
      [
        'prod2',
        'Samsung Galaxy',
        'SG001',
        'cat1',
        899.99,
        700.0,
        15,
        5,
        'sup1',
      ],
      ['prod3', 'JavaScript Book', 'JS001', 'cat2', 49.99, 30.0, 20, 10, null],
      ['prod4', 'Python Guide', 'PY001', 'cat2', 59.99, 35.0, 25, 10, null],
      ['prod5', 'iPad Pro', 'IP001', 'cat1', 1099.99, 900.0, 8, 3, 'sup1'],
    ];

    for (const product of products) {
      await db.runAsync(
        'INSERT INTO products (id, name, barcode, category_id, price, cost, quantity, min_stock, supplier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        product
      );
    }

    // Add bulk pricing for some products
    await db.runAsync(
      'INSERT INTO bulk_pricing (id, product_id, min_quantity, bulk_price) VALUES (?, ?, ?, ?), (?, ?, ?, ?)',
      ['bp1', 'prod1', 5, 950.0, 'bp2', 'prod2', 10, 850.0]
    );
  };

  describe('getProductsPaginated', () => {
    it('should return paginated products with correct structure', async () => {
      const result = await dbService.getProductsPaginated({
        page: 1,
        limit: 3,
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('hasMore');
      expect(result).toHaveProperty('page');
      expect(result.data).toHaveLength(3);
      expect(result.page).toBe(1);
      expect(result.hasMore).toBe(true);
    });

    it('should handle search by product name', async () => {
      const result = await dbService.getProductsPaginated({
        searchQuery: 'iPhone',
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('iPhone 15');
      expect(result.hasMore).toBe(false);
    });

    it('should handle search by barcode', async () => {
      const result = await dbService.getProductsPaginated({
        searchQuery: 'IP15001',
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].barcode).toBe('IP15001');
    });

    it('should filter by category', async () => {
      const result = await dbService.getProductsPaginated({
        categoryId: 'cat2',
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(2);
      expect(result.data.every((p) => p.category_id === 'cat2')).toBe(true);
    });

    it('should combine search and category filter', async () => {
      const result = await dbService.getProductsPaginated({
        searchQuery: 'Book',
        categoryId: 'cat2',
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('JavaScript Book');
    });

    it('should include bulk pricing flag', async () => {
      const result = await dbService.getProductsPaginated({
        page: 1,
        limit: 10,
      });

      const iPhoneProduct = result.data.find((p) => p.name === 'iPhone 15');
      const bookProduct = result.data.find((p) => p.name === 'JavaScript Book');

      expect(iPhoneProduct?.has_bulk_pricing).toBe(1);
      expect(bookProduct?.has_bulk_pricing).toBe(0);
    });
  });

  describe('searchProductsForSale', () => {
    it('should return lightweight product data for sales', async () => {
      const result = await dbService.searchProductsForSale('iPhone', 10);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('price');
      expect(result[0]).toHaveProperty('has_bulk_pricing');
      expect(result[0].name).toBe('iPhone 15');
    });

    it('should prioritize exact barcode matches', async () => {
      const result = await dbService.searchProductsForSale('IP15001', 10);

      expect(result).toHaveLength(1);
      expect(result[0].barcode).toBe('IP15001');
    });

    it('should return empty array for empty query', async () => {
      const result = await dbService.searchProductsForSale('', 10);
      expect(result).toHaveLength(0);
    });

    it('should limit results correctly', async () => {
      const result = await dbService.searchProductsForSale('a', 2);
      expect(result.length).toBeLessThanOrEqual(2);
    });
  });

  describe('findProductByBarcode', () => {
    it('should find product by exact barcode match', async () => {
      const result = await dbService.findProductByBarcode('IP15001');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('iPhone 15');
      expect(result?.barcode).toBe('IP15001');
    });

    it('should return null for non-existent barcode', async () => {
      const result = await dbService.findProductByBarcode('NONEXISTENT');
      expect(result).toBeNull();
    });

    it('should return null for empty barcode', async () => {
      const result = await dbService.findProductByBarcode('');
      expect(result).toBeNull();
    });

    it('should include bulk pricing flag', async () => {
      const result = await dbService.findProductByBarcode('IP15001');
      expect(result?.has_bulk_pricing).toBe(1);
    });
  });

  describe('hasProductBulkPricing', () => {
    it('should return true for products with bulk pricing', async () => {
      const result = await dbService.hasProductBulkPricing('prod1');
      expect(result).toBe(true);
    });

    it('should return false for products without bulk pricing', async () => {
      const result = await dbService.hasProductBulkPricing('prod3');
      expect(result).toBe(false);
    });

    it('should return false for non-existent products', async () => {
      const result = await dbService.hasProductBulkPricing('nonexistent');
      expect(result).toBe(false);
    });
  });
});
