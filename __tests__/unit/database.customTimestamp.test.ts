import { DatabaseService, Sale, SaleItem } from '../../services/database';
import * as SQLite from 'expo-sqlite';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

describe('DatabaseService - Custom Timestamp Support', () => {
  let db: any;
  let databaseService: DatabaseService;

  beforeEach(() => {
    // Mock database methods
    db = {
      execAsync: jest.fn(),
      runAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(),
    };

    databaseService = new DatabaseService(db);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addSale with custom created_at', () => {
    it('should use provided created_at timestamp when specified', async () => {
      const customTimestamp = '2025-01-15 10:30:00';
      const mockSale = {
        total: 100.5,
        payment_method: 'cash',
        note: 'Test sale',
        customer_id: 'customer-123',
        created_at: customTimestamp,
      };

      const mockItems: Omit<SaleItem, 'id' | 'sale_id'>[] = [
        {
          product_id: 'product-1',
          quantity: 2,
          price: 25.25,
          cost: 15.0,
          discount: 0,
          subtotal: 50.5,
        },
        {
          product_id: 'product-2',
          quantity: 1,
          price: 50.0,
          cost: 30.0,
          discount: 0,
          subtotal: 50.0,
        },
      ];

      // Mock successful transaction
      db.execAsync.mockResolvedValue(undefined);
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1 });

      const saleId = await databaseService.addSale(mockSale, mockItems);

      // Verify transaction started
      expect(db.execAsync).toHaveBeenCalledWith('BEGIN TRANSACTION');

      // Verify sale was inserted with custom timestamp
      expect(db.runAsync).toHaveBeenCalledWith(
        'INSERT INTO sales (id, total, payment_method, note, customer_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [
          expect.any(String), // UUID
          100.5,
          'cash',
          'Test sale',
          'customer-123',
          customTimestamp, // Should use the provided timestamp
        ]
      );

      // Verify transaction committed
      expect(db.execAsync).toHaveBeenCalledWith('COMMIT');

      // Verify sale ID is returned
      expect(typeof saleId).toBe('string');
      expect(saleId.length).toBeGreaterThan(0);
    });

    it('should use current timestamp when created_at is not provided', async () => {
      const mockSale = {
        total: 75.25,
        payment_method: 'card',
        note: 'Another test sale',
        customer_id: null,
      };

      const mockItems: Omit<SaleItem, 'id' | 'sale_id'>[] = [
        {
          product_id: 'product-3',
          quantity: 1,
          price: 75.25,
          cost: 45.0,
          discount: 0,
          subtotal: 75.25,
        },
      ];

      // Mock current time - no need to mock since formatTimestampForDatabase handles it

      // Mock successful transaction
      db.execAsync.mockResolvedValue(undefined);
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1 });

      const saleId = await databaseService.addSale(mockSale, mockItems);

      // Verify sale was inserted with current timestamp
      expect(db.runAsync).toHaveBeenCalledWith(
        'INSERT INTO sales (id, total, payment_method, note, customer_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [
          expect.any(String), // UUID
          75.25,
          'card',
          'Another test sale',
          null,
          expect.stringMatching(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/), // Should use current time in correct format
        ]
      );

      expect(typeof saleId).toBe('string');
    });

    it('should handle empty created_at string by using current timestamp', async () => {
      const mockSale = {
        total: 50.0,
        payment_method: 'cash',
        created_at: '', // Empty string should fallback to current time
      };

      const mockItems: Omit<SaleItem, 'id' | 'sale_id'>[] = [
        {
          product_id: 'product-4',
          quantity: 1,
          price: 50.0,
          cost: 30.0,
          discount: 0,
          subtotal: 50.0,
        },
      ];

      // Mock current time
      const mockCurrentTime = '2025-10-12T15:45:00.000Z';
      jest
        .spyOn(Date.prototype, 'toISOString')
        .mockReturnValue(mockCurrentTime);

      // Mock successful transaction
      db.execAsync.mockResolvedValue(undefined);
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1 });

      const saleId = await databaseService.addSale(mockSale, mockItems);

      // Verify sale was inserted with current timestamp (fallback)
      expect(db.runAsync).toHaveBeenCalledWith(
        'INSERT INTO sales (id, total, payment_method, note, customer_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [
          expect.any(String), // UUID
          50.0,
          'cash',
          null,
          null,
          mockCurrentTime, // Should fallback to current time
        ]
      );

      expect(typeof saleId).toBe('string');
    });

    it('should properly format timestamp for SQLite storage', async () => {
      // Test with various timestamp formats
      const testCases = [
        '2025-01-15 10:30:00', // Database format
        '2025-12-25 23:59:59', // End of year
        '2025-06-15 12:00:00', // Midday
      ];

      for (const timestamp of testCases) {
        const mockSale = {
          total: 100.0,
          payment_method: 'cash',
          created_at: timestamp,
        };

        const mockItems: Omit<SaleItem, 'id' | 'sale_id'>[] = [
          {
            product_id: 'product-test',
            quantity: 1,
            price: 100.0,
            cost: 60.0,
            discount: 0,
            subtotal: 100.0,
          },
        ];

        // Reset mocks
        db.execAsync.mockClear();
        db.runAsync.mockClear();
        db.execAsync.mockResolvedValue(undefined);
        db.runAsync.mockResolvedValue({ lastInsertRowId: 1 });

        await databaseService.addSale(mockSale, mockItems);

        // Verify the timestamp is passed correctly to SQLite
        expect(db.runAsync).toHaveBeenCalledWith(
          'INSERT INTO sales (id, total, payment_method, note, customer_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [
            expect.any(String),
            100.0,
            'cash',
            null,
            null,
            timestamp, // Should preserve the exact timestamp format
          ]
        );
      }
    });

    it('should rollback transaction on error even with custom timestamp', async () => {
      const mockSale = {
        total: 100.0,
        payment_method: 'cash',
        created_at: '2025-01-15 10:30:00',
      };

      const mockItems: Omit<SaleItem, 'id' | 'sale_id'>[] = [
        {
          product_id: 'product-error',
          quantity: 1,
          price: 100.0,
          cost: 60.0,
          discount: 0,
          subtotal: 100.0,
        },
      ];

      // Mock transaction start success but sale insert failure
      db.execAsync.mockResolvedValueOnce(undefined); // BEGIN TRANSACTION
      db.runAsync.mockRejectedValueOnce(new Error('Database error'));
      db.execAsync.mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        databaseService.addSale(mockSale, mockItems)
      ).rejects.toThrow('Database error');

      // Verify rollback was called
      expect(db.execAsync).toHaveBeenCalledWith('ROLLBACK');
    });
  });
});
