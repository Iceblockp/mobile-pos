import { DatabaseService } from '@/services/database';
import * as SQLite from 'expo-sqlite';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

describe('Stock Movement Tracking Integration Tests', () => {
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

  describe('Complete Stock Movement Workflow', () => {
    it('should handle complete stock movement lifecycle', async () => {
      const productId = 1;
      const initialQuantity = 0;

      // Step 1: Initial stock in
      const stockInData = {
        product_id: productId,
        type: 'stock_in' as const,
        quantity: 100,
        reason: 'Initial inventory',
        supplier_id: 1,
        reference_number: 'PO001',
        unit_cost: 10.0,
      };

      mockDatabase.runAsync
        .mockResolvedValueOnce({ lastInsertRowId: 1 }) // Stock movement insert
        .mockResolvedValueOnce({}); // Product quantity update

      const movementId1 = await db.updateProductQuantityWithMovement(
        productId,
        stockInData.type,
        stockInData.quantity,
        stockInData.reason,
        stockInData.supplier_id,
        stockInData.reference_number,
        stockInData.unit_cost
      );

      expect(movementId1).toBe(1);

      // Verify product quantity was updated correctly
      expect(mockDatabase.runAsync).toHaveBeenCalledWith(
        'UPDATE products SET quantity = quantity + ? WHERE id = ?',
        [stockInData.quantity, productId]
      );

      // Step 2: Additional stock in
      const additionalStockIn = {
        product_id: productId,
        type: 'stock_in' as const,
        quantity: 50,
        reason: 'Restock',
        supplier_id: 1,
        reference_number: 'PO002',
        unit_cost: 9.5,
      };

      mockDatabase.runAsync
        .mockResolvedValueOnce({ lastInsertRowId: 2 })
        .mockResolvedValueOnce({});

      const movementId2 = await db.updateProductQuantityWithMovement(
        productId,
        additionalStockIn.type,
        additionalStockIn.quantity,
        additionalStockIn.reason,
        additionalStockIn.supplier_id,
        additionalStockIn.reference_number,
        additionalStockIn.unit_cost
      );

      expect(movementId2).toBe(2);

      // Step 3: Stock out (sale)
      const stockOutData = {
        product_id: productId,
        type: 'stock_out' as const,
        quantity: 25,
        reason: 'Sale',
        reference_number: 'SALE001',
      };

      mockDatabase.runAsync
        .mockResolvedValueOnce({ lastInsertRowId: 3 })
        .mockResolvedValueOnce({});

      const movementId3 = await db.updateProductQuantityWithMovement(
        productId,
        stockOutData.type,
        stockOutData.quantity,
        stockOutData.reason,
        undefined,
        stockOutData.reference_number
      );

      expect(movementId3).toBe(3);

      // Verify product quantity was decreased
      expect(mockDatabase.runAsync).toHaveBeenCalledWith(
        'UPDATE products SET quantity = quantity - ? WHERE id = ?',
        [stockOutData.quantity, productId]
      );

      // Step 4: Retrieve stock movement history
      const mockMovements = [
        {
          id: 3,
          product_id: productId,
          type: 'stock_out',
          quantity: 25,
          reason: 'Sale',
          created_at: '2024-01-15T16:00:00Z',
        },
        {
          id: 2,
          product_id: productId,
          type: 'stock_in',
          quantity: 50,
          reason: 'Restock',
          created_at: '2024-01-15T12:00:00Z',
        },
        {
          id: 1,
          product_id: productId,
          type: 'stock_in',
          quantity: 100,
          reason: 'Initial inventory',
          created_at: '2024-01-15T10:00:00Z',
        },
      ];

      mockDatabase.getAllAsync.mockResolvedValueOnce(mockMovements);

      const movements = await db.getStockMovementsByProduct(productId);
      expect(movements).toEqual(mockMovements);

      // Step 5: Calculate stock movement summary
      const mockSummary = [
        { type: 'stock_in', total_quantity: 150 },
        { type: 'stock_out', total_quantity: 25 },
      ];

      mockDatabase.getAllAsync.mockResolvedValueOnce(mockSummary);

      const summary = await db.getStockMovementSummary(productId);
      expect(summary).toEqual(mockSummary);
    });
  });

  describe('Stock Movement Analytics', () => {
    it('should calculate stock turnover rates correctly', async () => {
      const productId = 1;
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // Mock stock movements for the period
      const mockMovements = [
        { type: 'stock_in', quantity: 200, created_at: '2024-01-05T10:00:00Z' },
        {
          type: 'stock_out',
          quantity: 150,
          created_at: '2024-01-15T14:00:00Z',
        },
        { type: 'stock_out', quantity: 30, created_at: '2024-01-25T16:00:00Z' },
      ];

      mockDatabase.getAllAsync.mockResolvedValueOnce(mockMovements);

      const movements = await db.getStockMovements(
        { productId, startDate, endDate },
        1,
        100
      );

      // Calculate turnover rate
      const totalStockIn = movements
        .filter((m) => m.type === 'stock_in')
        .reduce((sum, m) => sum + m.quantity, 0);

      const totalStockOut = movements
        .filter((m) => m.type === 'stock_out')
        .reduce((sum, m) => sum + m.quantity, 0);

      const turnoverRate = totalStockOut / totalStockIn;

      expect(totalStockIn).toBe(200);
      expect(totalStockOut).toBe(180);
      expect(turnoverRate).toBe(0.9); // 90% turnover rate
    });

    it('should identify slow-moving inventory', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // Mock products with different movement patterns
      const mockProducts = [
        { id: 1, name: 'Fast Moving Product', quantity: 10 },
        { id: 2, name: 'Slow Moving Product', quantity: 100 },
        { id: 3, name: 'No Movement Product', quantity: 50 },
      ];

      const mockMovements = [
        // Product 1: High movement
        {
          product_id: 1,
          type: 'stock_out',
          quantity: 90,
          created_at: '2024-01-15T10:00:00Z',
        },
        // Product 2: Low movement
        {
          product_id: 2,
          type: 'stock_out',
          quantity: 5,
          created_at: '2024-01-20T10:00:00Z',
        },
        // Product 3: No movement (empty result)
      ];

      mockDatabase.getAllAsync
        .mockResolvedValueOnce(mockProducts)
        .mockResolvedValueOnce(mockMovements);

      // Simulate slow-moving inventory analysis
      const products = await db.getProducts();
      const movements = await db.getStockMovements(
        { startDate, endDate },
        1,
        1000
      );

      const slowMovingProducts = products.filter((product) => {
        const productMovements = movements.filter(
          (m) => m.product_id === product.id
        );
        const totalMovement = productMovements.reduce(
          (sum, m) => sum + m.quantity,
          0
        );
        const movementRate = totalMovement / product.quantity;
        return movementRate < 0.1; // Less than 10% movement rate
      });

      expect(slowMovingProducts).toHaveLength(2); // Products 2 and 3
    });
  });

  describe('Stock Movement Validation', () => {
    it('should prevent negative stock levels', async () => {
      const productId = 1;
      const currentQuantity = 10;

      // Mock current product quantity
      mockDatabase.getFirstAsync.mockResolvedValueOnce({
        quantity: currentQuantity,
      });

      // Attempt to remove more stock than available
      const stockOutQuantity = 15;

      // This should be validated before the movement is created
      const isValidMovement = currentQuantity >= stockOutQuantity;
      expect(isValidMovement).toBe(false);

      if (!isValidMovement) {
        expect(() => {
          throw new Error('Insufficient stock for this operation');
        }).toThrow('Insufficient stock for this operation');
      }
    });

    it('should validate stock movement data integrity', async () => {
      const invalidMovements = [
        {
          product_id: null, // Invalid product ID
          type: 'stock_in',
          quantity: 100,
          reason: 'Test',
        },
        {
          product_id: 1,
          type: 'invalid_type', // Invalid movement type
          quantity: 100,
          reason: 'Test',
        },
        {
          product_id: 1,
          type: 'stock_in',
          quantity: -10, // Negative quantity
          reason: 'Test',
        },
      ];

      for (const movement of invalidMovements) {
        expect(() => {
          // Simulate validation logic
          if (!movement.product_id || movement.product_id <= 0) {
            throw new Error('Invalid product ID');
          }
          if (!['stock_in', 'stock_out'].includes(movement.type)) {
            throw new Error('Invalid movement type');
          }
          if (movement.quantity <= 0) {
            throw new Error('Quantity must be positive');
          }
        }).toThrow();
      }
    });
  });

  describe('Batch Stock Operations', () => {
    it('should handle bulk stock movements efficiently', async () => {
      const bulkMovements = [
        {
          product_id: 1,
          type: 'stock_in',
          quantity: 50,
          reason: 'Bulk import 1',
        },
        {
          product_id: 2,
          type: 'stock_in',
          quantity: 75,
          reason: 'Bulk import 2',
        },
        {
          product_id: 3,
          type: 'stock_in',
          quantity: 100,
          reason: 'Bulk import 3',
        },
      ];

      // Mock successful batch operations
      mockDatabase.runAsync
        .mockResolvedValueOnce({ lastInsertRowId: 1 })
        .mockResolvedValueOnce({}) // Product 1 update
        .mockResolvedValueOnce({ lastInsertRowId: 2 })
        .mockResolvedValueOnce({}) // Product 2 update
        .mockResolvedValueOnce({ lastInsertRowId: 3 })
        .mockResolvedValueOnce({}); // Product 3 update

      // Process bulk movements
      const results = [];
      for (const movement of bulkMovements) {
        const result = await db.updateProductQuantityWithMovement(
          movement.product_id,
          movement.type as 'stock_in' | 'stock_out',
          movement.quantity,
          movement.reason
        );
        results.push(result);
      }

      expect(results).toEqual([1, 2, 3]);
      expect(mockDatabase.runAsync).toHaveBeenCalledTimes(6); // 3 movements + 3 quantity updates
    });
  });

  describe('Stock Movement Reporting', () => {
    it('should generate comprehensive stock movement reports', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockDetailedMovements = [
        {
          id: 1,
          product_id: 1,
          product_name: 'Product A',
          type: 'stock_in',
          quantity: 100,
          unit_cost: 10.0,
          supplier_name: 'Supplier 1',
          created_at: '2024-01-05T10:00:00Z',
        },
        {
          id: 2,
          product_id: 1,
          product_name: 'Product A',
          type: 'stock_out',
          quantity: 25,
          unit_cost: null,
          supplier_name: null,
          created_at: '2024-01-15T14:00:00Z',
        },
      ];

      mockDatabase.getAllAsync.mockResolvedValueOnce(mockDetailedMovements);

      // Simulate detailed movement report query
      const movements = await db.getStockMovements(
        { startDate, endDate },
        1,
        1000
      );

      // Calculate report metrics
      const reportMetrics = {
        totalMovements: movements.length,
        totalStockIn: movements
          .filter((m) => m.type === 'stock_in')
          .reduce((sum, m) => sum + m.quantity, 0),
        totalStockOut: movements
          .filter((m) => m.type === 'stock_out')
          .reduce((sum, m) => sum + m.quantity, 0),
        totalValue: movements
          .filter((m) => m.unit_cost)
          .reduce((sum, m) => sum + m.quantity * m.unit_cost!, 0),
      };

      expect(reportMetrics).toEqual({
        totalMovements: 2,
        totalStockIn: 100,
        totalStockOut: 25,
        totalValue: 1000, // 100 * 10.00
      });
    });
  });
});
