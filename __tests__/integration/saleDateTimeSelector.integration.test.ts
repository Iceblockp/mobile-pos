import { DatabaseService, Sale, SaleItem } from '../../services/database';

// Mock expo-sqlite for integration testing
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

describe('Sale DateTime Integration Tests', () => {
  let databaseService: DatabaseService;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock database
    mockDb = {
      execAsync: jest.fn(),
      runAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(),
    };

    databaseService = new DatabaseService(mockDb);

    // Mock successful transaction behavior
    mockDb.execAsync.mockResolvedValue(undefined);
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 1 });
  });

  describe('addSale with custom timestamps', () => {
    it('should integrate custom timestamp functionality with existing sale workflow', async () => {
      // Test data representing a typical sale with custom timestamp
      const customTimestamp = '2025-01-15T14:30:00.000Z';
      const saleData: Omit<Sale, 'id' | 'created_at'> & {
        created_at?: string;
      } = {
        total: 125.75,
        payment_method: 'card',
        note: 'Backdated sale entry',
        customer_id: 'customer-456',
        created_at: customTimestamp,
      };

      const saleItems: Omit<SaleItem, 'id' | 'sale_id'>[] = [
        {
          product_id: 'product-123',
          quantity: 2,
          price: 45.5,
          cost: 30.0,
          discount: 5.25,
          subtotal: 85.75,
        },
        {
          product_id: 'product-456',
          quantity: 1,
          price: 40.0,
          cost: 25.0,
          discount: 0,
          subtotal: 40.0,
        },
      ];

      // Execute the sale creation
      const saleId = await databaseService.addSale(saleData, saleItems);

      // Verify transaction management
      expect(mockDb.execAsync).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockDb.execAsync).toHaveBeenCalledWith('COMMIT');

      // Verify sale insertion with custom timestamp
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'INSERT INTO sales (id, total, payment_method, note, customer_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [
          expect.any(String), // Generated UUID
          125.75,
          'card',
          'Backdated sale entry',
          'customer-456',
          customTimestamp, // Custom timestamp should be preserved
        ]
      );

      // Verify return value
      expect(typeof saleId).toBe('string');
      expect(saleId.length).toBeGreaterThan(0);
    });

    it('should maintain backward compatibility for sales without custom timestamps', async () => {
      // Test data representing a normal sale (no custom timestamp)
      const saleData: Omit<Sale, 'id' | 'created_at'> = {
        total: 89.99,
        payment_method: 'cash',
        note: 'Regular sale',
        customer_id: null,
      };

      const saleItems: Omit<SaleItem, 'id' | 'sale_id'>[] = [
        {
          product_id: 'product-789',
          quantity: 1,
          price: 89.99,
          cost: 55.0,
          discount: 0,
          subtotal: 89.99,
        },
      ];

      // Mock current time for fallback
      const mockCurrentTime = '2025-10-12T16:45:30.000Z';
      jest
        .spyOn(Date.prototype, 'toISOString')
        .mockReturnValue(mockCurrentTime);

      // Execute the sale creation
      const saleId = await databaseService.addSale(saleData, saleItems);

      // Verify sale insertion uses current timestamp as fallback
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'INSERT INTO sales (id, total, payment_method, note, customer_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [
          expect.any(String), // Generated UUID
          89.99,
          'cash',
          'Regular sale',
          null,
          mockCurrentTime, // Should use current time as fallback
        ]
      );

      expect(typeof saleId).toBe('string');
    });
  });
});
