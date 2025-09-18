import { DatabaseService } from '@/services/database';
import * as SQLite from 'expo-sqlite';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

describe('DatabaseService - Stock Movement Management', () => {
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

  describe('addStockMovement', () => {
    it('should add stock in movement successfully', async () => {
      const movementData = {
        product_id: 1,
        type: 'stock_in' as const,
        quantity: 100,
        reason: 'Initial stock',
        supplier_id: 1,
        reference_number: 'REF001',
        unit_cost: 10.5,
      };

      mockDatabase.runAsync.mockResolvedValue({ lastInsertRowId: 1 });

      const result = await db.addStockMovement(movementData);

      expect(result).toBe(1);
      expect(mockDatabase.runAsync).toHaveBeenCalledWith(
        'INSERT INTO stock_movements (product_id, type, quantity, reason, supplier_id, reference_number, unit_cost) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          movementData.product_id,
          movementData.type,
          movementData.quantity,
          movementData.reason,
          movementData.supplier_id,
          movementData.reference_number,
          movementData.unit_cost,
        ]
      );
    });

    it('should add stock out movement successfully', async () => {
      const movementData = {
        product_id: 1,
        type: 'stock_out' as const,
        quantity: 50,
        reason: 'Sale',
        supplier_id: null,
        reference_number: 'SALE001',
        unit_cost: null,
      };

      mockDatabase.runAsync.mockResolvedValue({ lastInsertRowId: 2 });

      const result = await db.addStockMovement(movementData);

      expect(result).toBe(2);
      expect(mockDatabase.runAsync).toHaveBeenCalledWith(
        'INSERT INTO stock_movements (product_id, type, quantity, reason, supplier_id, reference_number, unit_cost) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          movementData.product_id,
          movementData.type,
          movementData.quantity,
          movementData.reason,
          null,
          movementData.reference_number,
          null,
        ]
      );
    });
  });

  describe('getStockMovements', () => {
    it('should retrieve stock movements with pagination', async () => {
      const mockMovements = [
        {
          id: 1,
          product_id: 1,
          type: 'stock_in',
          quantity: 100,
          reason: 'Initial stock',
          created_at: '2024-01-15T10:00:00Z',
        },
        {
          id: 2,
          product_id: 1,
          type: 'stock_out',
          quantity: 50,
          reason: 'Sale',
          created_at: '2024-01-15T11:00:00Z',
        },
      ];

      mockDatabase.getAllAsync.mockResolvedValue(mockMovements);

      const result = await db.getStockMovements({}, 1, 10);

      expect(result).toEqual(mockMovements);
      expect(mockDatabase.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM stock_movements ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [10, 0]
      );
    });

    it('should filter stock movements by product', async () => {
      const filters = { productId: 1 };
      const mockMovements = [
        {
          id: 1,
          product_id: 1,
          type: 'stock_in',
          quantity: 100,
          reason: 'Initial stock',
        },
      ];

      mockDatabase.getAllAsync.mockResolvedValue(mockMovements);

      const result = await db.getStockMovements(filters, 1, 10);

      expect(result).toEqual(mockMovements);
      expect(mockDatabase.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM stock_movements WHERE product_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [1, 10, 0]
      );
    });

    it('should filter stock movements by type', async () => {
      const filters = { type: 'stock_in' as const };
      const mockMovements = [
        {
          id: 1,
          product_id: 1,
          type: 'stock_in',
          quantity: 100,
          reason: 'Initial stock',
        },
      ];

      mockDatabase.getAllAsync.mockResolvedValue(mockMovements);

      const result = await db.getStockMovements(filters, 1, 10);

      expect(result).toEqual(mockMovements);
      expect(mockDatabase.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM stock_movements WHERE type = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        ['stock_in', 10, 0]
      );
    });

    it('should filter stock movements by date range', async () => {
      const filters = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };
      const mockMovements = [
        {
          id: 1,
          product_id: 1,
          type: 'stock_in',
          quantity: 100,
          created_at: '2024-01-15T10:00:00Z',
        },
      ];

      mockDatabase.getAllAsync.mockResolvedValue(mockMovements);

      const result = await db.getStockMovements(filters, 1, 10);

      expect(result).toEqual(mockMovements);
      expect(mockDatabase.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM stock_movements WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [filters.startDate.toISOString(), filters.endDate.toISOString(), 10, 0]
      );
    });
  });

  describe('updateProductQuantityWithMovement', () => {
    it('should update product quantity for stock in movement', async () => {
      const productId = 1;
      const movementType = 'stock_in';
      const quantity = 100;
      const unitCost = 10.5;

      mockDatabase.runAsync.mockResolvedValue({ lastInsertRowId: 1 });

      const result = await db.updateProductQuantityWithMovement(
        productId,
        movementType,
        quantity,
        'Initial stock',
        1,
        'REF001',
        unitCost
      );

      expect(result).toBe(1);

      // Should update product quantity
      expect(mockDatabase.runAsync).toHaveBeenCalledWith(
        'UPDATE products SET quantity = quantity + ? WHERE id = ?',
        [quantity, productId]
      );
    });

    it('should update product quantity for stock out movement', async () => {
      const productId = 1;
      const movementType = 'stock_out';
      const quantity = 50;

      mockDatabase.runAsync.mockResolvedValue({ lastInsertRowId: 2 });

      const result = await db.updateProductQuantityWithMovement(
        productId,
        movementType,
        quantity,
        'Sale'
      );

      expect(result).toBe(2);

      // Should decrease product quantity
      expect(mockDatabase.runAsync).toHaveBeenCalledWith(
        'UPDATE products SET quantity = quantity - ? WHERE id = ?',
        [quantity, productId]
      );
    });
  });

  describe('getStockMovementSummary', () => {
    it('should calculate stock movement summary for a product', async () => {
      const productId = 1;
      const mockSummary = [
        { type: 'stock_in', total_quantity: 200 },
        { type: 'stock_out', total_quantity: 75 },
      ];

      mockDatabase.getAllAsync.mockResolvedValue(mockSummary);

      const result = await db.getStockMovementSummary(productId);

      expect(result).toEqual(mockSummary);
      expect(mockDatabase.getAllAsync).toHaveBeenCalledWith(
        'SELECT type, SUM(quantity) as total_quantity FROM stock_movements WHERE product_id = ? GROUP BY type',
        [productId]
      );
    });

    it('should calculate stock movement summary for all products', async () => {
      const mockSummary = [
        { type: 'stock_in', total_quantity: 500 },
        { type: 'stock_out', total_quantity: 200 },
      ];

      mockDatabase.getAllAsync.mockResolvedValue(mockSummary);

      const result = await db.getStockMovementSummary();

      expect(result).toEqual(mockSummary);
      expect(mockDatabase.getAllAsync).toHaveBeenCalledWith(
        'SELECT type, SUM(quantity) as total_quantity FROM stock_movements GROUP BY type',
        []
      );
    });
  });
});
