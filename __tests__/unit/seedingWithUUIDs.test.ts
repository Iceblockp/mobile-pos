import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as SQLite from 'expo-sqlite';
import { DatabaseService } from '../../services/database';
import { isValidUUID } from '../../utils/uuid';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

describe('Database Seeding with UUIDs', () => {
  let db: SQLite.SQLiteDatabase;
  let service: DatabaseService;

  beforeEach(async () => {
    // Create in-memory database for each test
    db = await SQLite.openDatabaseAsync(':memory:');
    service = new DatabaseService(db);
    await service.createTables();
  });

  afterEach(async () => {
    if (db) {
      await db.closeAsync();
    }
  });

  describe('seedInitialData', () => {
    it('should seed categories with valid UUIDs', async () => {
      await service.seedInitialData();

      const categories = await service.getCategories();

      expect(categories.length).toBeGreaterThan(0);

      // Check that all categories have valid UUIDs
      categories.forEach((category) => {
        expect(isValidUUID(category.id)).toBe(true);
        expect(category.name).toBeTruthy();
      });
    });

    it('should seed suppliers with valid UUIDs', async () => {
      await service.seedInitialData();

      const suppliers = await service.getSuppliers();

      expect(suppliers.length).toBeGreaterThan(0);

      // Check that all suppliers have valid UUIDs
      suppliers.forEach((supplier) => {
        expect(isValidUUID(supplier.id)).toBe(true);
        expect(supplier.name).toBeTruthy();
      });
    });

    it('should seed products with valid UUIDs and proper relationships', async () => {
      await service.seedInitialData();

      const products = await service.getProducts();
      const categories = await service.getCategories();
      const suppliers = await service.getSuppliers();

      expect(products.length).toBeGreaterThan(0);

      // Check that all products have valid UUIDs
      products.forEach((product) => {
        expect(isValidUUID(product.id)).toBe(true);
        expect(product.name).toBeTruthy();

        // Check that category_id references a valid category
        expect(isValidUUID(product.category_id)).toBe(true);
        const category = categories.find((c) => c.id === product.category_id);
        expect(category).toBeTruthy();

        // Check that supplier_id references a valid supplier
        expect(isValidUUID(product.supplier_id)).toBe(true);
        const supplier = suppliers.find((s) => s.id === product.supplier_id);
        expect(supplier).toBeTruthy();
      });
    });

    it('should not seed data twice', async () => {
      // First seeding
      await service.seedInitialData();

      const firstCategories = await service.getCategories();
      const firstSuppliers = await service.getSuppliers();
      const firstProducts = await service.getProducts();

      // Second seeding attempt
      await service.seedInitialData();

      const secondCategories = await service.getCategories();
      const secondSuppliers = await service.getSuppliers();
      const secondProducts = await service.getProducts();

      // Should have the same counts (no duplicates)
      expect(secondCategories.length).toBe(firstCategories.length);
      expect(secondSuppliers.length).toBe(firstSuppliers.length);
      expect(secondProducts.length).toBe(firstProducts.length);
    });

    it('should seed expense categories with valid UUIDs', async () => {
      await service.seedInitialData();

      // Get expense categories
      const expenseCategories = await service.getExpenseCategories();

      expect(expenseCategories.length).toBeGreaterThan(0);

      // Check that all expense categories have valid UUIDs
      expenseCategories.forEach((category) => {
        expect(isValidUUID(category.id)).toBe(true);
        expect(category.name).toBeTruthy();
      });
    });

    it('should maintain referential integrity between products and their references', async () => {
      await service.seedInitialData();

      const products = await service.getProducts();

      for (const product of products) {
        // Verify category exists
        const category = await service.getCategoryById(product.category_id);
        expect(category).toBeTruthy();
        expect(category?.id).toBe(product.category_id);

        // Verify supplier exists
        const supplier = await service.getSupplierById(product.supplier_id);
        expect(supplier).toBeTruthy();
        expect(supplier?.id).toBe(product.supplier_id);
      }
    });

    it('should create products with all required fields', async () => {
      await service.seedInitialData();

      const products = await service.getProducts();

      products.forEach((product) => {
        expect(product.id).toBeTruthy();
        expect(product.name).toBeTruthy();
        expect(product.barcode).toBeTruthy();
        expect(product.category_id).toBeTruthy();
        expect(product.supplier_id).toBeTruthy();
        expect(typeof product.price).toBe('number');
        expect(typeof product.cost).toBe('number');
        expect(typeof product.quantity).toBe('number');
        expect(typeof product.min_stock).toBe('number');
      });
    });
  });
});
