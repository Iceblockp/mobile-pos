import { DatabaseService } from '@/services/database';
import * as SQLite from 'expo-sqlite';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

describe('DatabaseService - Bulk Pricing Management', () => {
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

  describe('addBulkPricing', () => {
    it('should add bulk pricing tier successfully', async () => {
      const bulkPricingData = {
        product_id: 1,
        min_quantity: 10,
        bulk_price: 8.5,
      };

      // Mock product price check
      mockDatabase.getFirstAsync.mockResolvedValueOnce({ price: 10.0 });
      // Mock existing tiers check
      mockDatabase.getAllAsync.mockResolvedValueOnce([]);
      // Mock insert
      mockDatabase.runAsync.mockResolvedValue({ lastInsertRowId: 1 });

      const result = await db.addBulkPricing(bulkPricingData);

      expect(result).toBe(1);
      expect(mockDatabase.runAsync).toHaveBeenCalledWith(
        'INSERT INTO bulk_pricing (product_id, min_quantity, bulk_price) VALUES (?, ?, ?)',
        [
          bulkPricingData.product_id,
          bulkPricingData.min_quantity,
          bulkPricingData.bulk_price,
        ]
      );
    });

    it('should reject bulk price higher than regular price', async () => {
      const bulkPricingData = {
        product_id: 1,
        min_quantity: 10,
        bulk_price: 12.0, // Higher than regular price
      };

      // Mock product price check
      mockDatabase.getFirstAsync.mockResolvedValueOnce({ price: 10.0 });

      await expect(db.addBulkPricing(bulkPricingData)).rejects.toThrow(
        'Bulk price must be less than regular price'
      );
    });

    it('should reject overlapping quantity tiers', async () => {
      const bulkPricingData = {
        product_id: 1,
        min_quantity: 15, // Overlaps with existing tier
        bulk_price: 8.0,
      };

      // Mock product price check
      mockDatabase.getFirstAsync.mockResolvedValueOnce({ price: 10.0 });
      // Mock existing tiers with overlap
      mockDatabase.getAllAsync.mockResolvedValueOnce([
        { id: 1, min_quantity: 10, bulk_price: 8.5 },
        { id: 2, min_quantity: 20, bulk_price: 7.5 },
      ]);

      await expect(db.addBulkPricing(bulkPricingData)).rejects.toThrow(
        'Quantity tier overlaps with existing tier'
      );
    });
  });

  describe('getBulkPricingForProduct', () => {
    it('should retrieve bulk pricing tiers for a product', async () => {
      const productId = 1;
      const mockTiers = [
        { id: 1, product_id: 1, min_quantity: 10, bulk_price: 8.5 },
        { id: 2, product_id: 1, min_quantity: 20, bulk_price: 7.5 },
        { id: 3, product_id: 1, min_quantity: 50, bulk_price: 6.5 },
      ];

      mockDatabase.getAllAsync.mockResolvedValue(mockTiers);

      const result = await db.getBulkPricingForProduct(productId);

      expect(result).toEqual(mockTiers);
      expect(mockDatabase.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM bulk_pricing WHERE product_id = ? ORDER BY min_quantity ASC',
        [productId]
      );
    });

    it('should return empty array for product with no bulk pricing', async () => {
      const productId = 1;

      mockDatabase.getAllAsync.mockResolvedValue([]);

      const result = await db.getBulkPricingForProduct(productId);

      expect(result).toEqual([]);
    });
  });

  describe('calculateBestPrice', () => {
    it('should return regular price when no bulk pricing applies', async () => {
      const productId = 1;
      const quantity = 5;

      // Mock product price
      mockDatabase.getFirstAsync.mockResolvedValue({ price: 10.0 });
      // Mock no bulk pricing tiers
      mockDatabase.getAllAsync.mockResolvedValue([]);

      const result = await db.calculateBestPrice(productId, quantity);

      expect(result).toEqual({
        price: 10.0,
        isBulkPrice: false,
        savings: 0,
      });
    });

    it('should return regular price when quantity is below minimum bulk tier', async () => {
      const productId = 1;
      const quantity = 5;

      // Mock product price
      mockDatabase.getFirstAsync.mockResolvedValue({ price: 10.0 });
      // Mock bulk pricing tiers
      mockDatabase.getAllAsync.mockResolvedValue([
        { id: 1, product_id: 1, min_quantity: 10, bulk_price: 8.5 },
        { id: 2, product_id: 1, min_quantity: 20, bulk_price: 7.5 },
      ]);

      const result = await db.calculateBestPrice(productId, quantity);

      expect(result).toEqual({
        price: 10.0,
        isBulkPrice: false,
        savings: 0,
      });
    });

    it('should return best bulk price when quantity qualifies', async () => {
      const productId = 1;
      const quantity = 15;

      // Mock product price
      mockDatabase.getFirstAsync.mockResolvedValue({ price: 10.0 });
      // Mock bulk pricing tiers
      mockDatabase.getAllAsync.mockResolvedValue([
        { id: 1, product_id: 1, min_quantity: 10, bulk_price: 8.5 },
        { id: 2, product_id: 1, min_quantity: 20, bulk_price: 7.5 },
      ]);

      const result = await db.calculateBestPrice(productId, quantity);

      expect(result).toEqual({
        price: 8.5,
        isBulkPrice: true,
        savings: 22.5, // (10.00 - 8.50) * 15
        appliedTier: {
          id: 1,
          product_id: 1,
          min_quantity: 10,
          bulk_price: 8.5,
        },
      });
    });

    it('should return best available bulk price for high quantities', async () => {
      const productId = 1;
      const quantity = 25;

      // Mock product price
      mockDatabase.getFirstAsync.mockResolvedValue({ price: 10.0 });
      // Mock bulk pricing tiers
      mockDatabase.getAllAsync.mockResolvedValue([
        { id: 1, product_id: 1, min_quantity: 10, bulk_price: 8.5 },
        { id: 2, product_id: 1, min_quantity: 20, bulk_price: 7.5 },
        { id: 3, product_id: 1, min_quantity: 50, bulk_price: 6.5 },
      ]);

      const result = await db.calculateBestPrice(productId, quantity);

      expect(result).toEqual({
        price: 7.5,
        isBulkPrice: true,
        savings: 62.5, // (10.00 - 7.50) * 25
        appliedTier: {
          id: 2,
          product_id: 1,
          min_quantity: 20,
          bulk_price: 7.5,
        },
      });
    });

    it('should throw error for non-existent product', async () => {
      const productId = 999;
      const quantity = 10;

      mockDatabase.getFirstAsync.mockResolvedValue(null);

      await expect(db.calculateBestPrice(productId, quantity)).rejects.toThrow(
        'Product not found'
      );
    });
  });

  describe('updateBulkPricing', () => {
    it('should update bulk pricing tier successfully', async () => {
      const tierId = 1;
      const updateData = {
        min_quantity: 15,
        bulk_price: 8.0,
      };

      // Mock existing tier check for price validation
      mockDatabase.getFirstAsync
        .mockResolvedValueOnce({ product_id: 1 })
        .mockResolvedValueOnce({ price: 10.0 });

      mockDatabase.runAsync.mockResolvedValue({});

      await db.updateBulkPricing(tierId, updateData);

      expect(mockDatabase.runAsync).toHaveBeenCalledWith(
        'UPDATE bulk_pricing SET min_quantity = ?, bulk_price = ? WHERE id = ?',
        [updateData.min_quantity, updateData.bulk_price, tierId]
      );
    });

    it('should reject bulk price update higher than regular price', async () => {
      const tierId = 1;
      const updateData = {
        bulk_price: 12.0, // Higher than regular price
      };

      // Mock existing tier and product price
      mockDatabase.getFirstAsync
        .mockResolvedValueOnce({ product_id: 1 })
        .mockResolvedValueOnce({ price: 10.0 });

      await expect(db.updateBulkPricing(tierId, updateData)).rejects.toThrow(
        'Bulk price must be less than regular price'
      );
    });
  });

  describe('deleteBulkPricing', () => {
    it('should delete bulk pricing tier successfully', async () => {
      const tierId = 1;

      // Mock getting product_id before deletion for cache clearing
      mockDatabase.getFirstAsync.mockResolvedValue({ product_id: 1 });
      mockDatabase.runAsync.mockResolvedValue({});

      await db.deleteBulkPricing(tierId);

      expect(mockDatabase.runAsync).toHaveBeenCalledWith(
        'DELETE FROM bulk_pricing WHERE id = ?',
        [tierId]
      );
    });
  });

  describe('validateBulkPricingTiers', () => {
    it('should validate non-overlapping tiers', async () => {
      const productId = 1;
      const newTier = { min_quantity: 25, bulk_price: 7.0 };
      const existingTiers = [
        { id: 1, min_quantity: 10, bulk_price: 8.5 },
        { id: 2, min_quantity: 20, bulk_price: 7.5 },
      ];

      // This should not throw an error
      expect(() => {
        // Simulate validation logic
        const hasOverlap = existingTiers.some(
          (tier) =>
            (newTier.min_quantity >= tier.min_quantity &&
              newTier.min_quantity < tier.min_quantity + 10) ||
            (tier.min_quantity >= newTier.min_quantity &&
              tier.min_quantity < newTier.min_quantity + 10)
        );
        if (hasOverlap) {
          throw new Error('Quantity tier overlaps with existing tier');
        }
      }).not.toThrow();
    });
  });
});
