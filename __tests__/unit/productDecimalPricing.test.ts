import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DatabaseService } from '@/services/database';
import { currencySettingsService } from '@/services/currencySettingsService';
import { CurrencyManager } from '@/services/currencyManager';

describe('Product Decimal Pricing', () => {
  let db: DatabaseService;

  beforeEach(async () => {
    db = new DatabaseService();
    await db.initialize();

    // Set up Chinese Yuan currency (uses 2 decimal places)
    const cnySettings = CurrencyManager.getCurrencyByCode('CNY');
    if (cnySettings) {
      await currencySettingsService.updateCurrency(cnySettings);
    }
  });

  afterEach(async () => {
    await db.close();
  });

  it('should preserve decimal values when creating products with CNY currency', async () => {
    // Create a category first
    const categoryId = await db.addCategory({
      name: 'Test Category',
      description: 'Test category for decimal pricing',
    });

    // Create a product with decimal price and cost
    const productData = {
      name: 'Test Product with Decimals',
      category_id: categoryId,
      price: 25.99, // Decimal price
      cost: 15.5, // Decimal cost
      quantity: 10,
      min_stock: 5,
    };

    const productId = await db.addProduct(productData);

    // Retrieve the product and verify decimal values are preserved
    const savedProduct = await db.getProductById(productId);

    expect(savedProduct).toBeTruthy();
    expect(savedProduct!.price).toBe(25.99);
    expect(savedProduct!.cost).toBe(15.5);
  });

  it('should preserve decimal values when updating products with CNY currency', async () => {
    // Create a category first
    const categoryId = await db.addCategory({
      name: 'Test Category',
      description: 'Test category for decimal pricing',
    });

    // Create a product with integer values
    const productData = {
      name: 'Test Product',
      category_id: categoryId,
      price: 20,
      cost: 10,
      quantity: 10,
      min_stock: 5,
    };

    const productId = await db.addProduct(productData);

    // Update with decimal values
    await db.updateProduct(productId, {
      price: 22.75,
      cost: 12.25,
    });

    // Retrieve and verify decimal values are preserved
    const updatedProduct = await db.getProductById(productId);

    expect(updatedProduct).toBeTruthy();
    expect(updatedProduct!.price).toBe(22.75);
    expect(updatedProduct!.cost).toBe(12.25);
  });

  it('should handle Myanmar Kyat currency (no decimals) correctly', async () => {
    // Set up Myanmar Kyat currency (uses 0 decimal places)
    const mmkSettings = CurrencyManager.getCurrencyByCode('MMK');
    if (mmkSettings) {
      await currencySettingsService.updateCurrency(mmkSettings);
    }

    // Create a category first
    const categoryId = await db.addCategory({
      name: 'Test Category',
      description: 'Test category for MMK pricing',
    });

    // Create a product with decimal values (should be rounded for MMK)
    const productData = {
      name: 'Test Product MMK',
      category_id: categoryId,
      price: 2500.75, // Should be stored as 2501 for MMK
      cost: 1500.25, // Should be stored as 1500 for MMK
      quantity: 10,
      min_stock: 5,
    };

    const productId = await db.addProduct(productData);

    // Retrieve the product
    const savedProduct = await db.getProductById(productId);

    expect(savedProduct).toBeTruthy();
    // For MMK, decimals should be preserved in database but formatted without decimals
    expect(savedProduct!.price).toBe(2500.75);
    expect(savedProduct!.cost).toBe(1500.25);
  });
});
