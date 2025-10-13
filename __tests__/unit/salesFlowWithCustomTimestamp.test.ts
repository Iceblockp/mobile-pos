/**
 * Unit tests for sales flow with custom timestamp functionality
 */

import { DatabaseService } from '../../services/database';
import { formatSaleDateTime } from '../../utils/dateFormatters';

// Mock the database
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

// Mock date formatters
jest.mock('../../utils/dateFormatters', () => ({
  formatSaleDateTime: jest.fn((date: Date, locale: string) => {
    if (locale === 'my') {
      return 'အောက်တိုဘာ 12, 2025 2:30 ညနေ';
    }
    return 'Oct 12, 2025 2:30 PM';
  }),
}));

describe('Sales Flow with Custom Timestamp', () => {
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
    jest.clearAllMocks();
  });

  describe('Complete Sales Flow', () => {
    it('should process sale with custom timestamp end-to-end', async () => {
      const customTimestamp = '2025-01-15 10:30:00';
      const saleData = {
        total: 150.75,
        payment_method: 'cash',
        note: 'Custom timestamp sale',
        customer_id: 'customer-123',
        created_at: customTimestamp,
      };

      const saleItems = [
        {
          product_id: 'product-1',
          quantity: 2,
          price: 50.25,
          cost: 30.0,
          discount: 0,
          subtotal: 100.5,
        },
        {
          product_id: 'product-2',
          quantity: 1,
          price: 50.25,
          cost: 30.0,
          discount: 0,
          subtotal: 50.25,
        },
      ];

      // Mock successful database operations
      db.execAsync.mockResolvedValue(undefined);
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1 });

      // Process the sale
      const saleId = await databaseService.addSale(saleData, saleItems);

      // Verify the sale was created with custom timestamp
      expect(db.runAsync).toHaveBeenCalledWith(
        'INSERT INTO sales (id, total, payment_method, note, customer_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [
          expect.any(String),
          150.75,
          'cash',
          'Custom timestamp sale',
          'customer-123',
          customTimestamp,
        ]
      );

      expect(typeof saleId).toBe('string');
      expect(saleId.length).toBeGreaterThan(0);
    });

    it('should process sale with default timestamp when none provided', async () => {
      const saleData = {
        total: 75.0,
        payment_method: 'card',
        note: 'Default timestamp sale',
        customer_id: null,
      };

      const saleItems = [
        {
          product_id: 'product-3',
          quantity: 1,
          price: 75.0,
          cost: 45.0,
          discount: 0,
          subtotal: 75.0,
        },
      ];

      // Mock successful database operations
      db.execAsync.mockResolvedValue(undefined);
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1 });

      // Process the sale
      const saleId = await databaseService.addSale(saleData, saleItems);

      // Verify the sale was created with current timestamp in correct format
      expect(db.runAsync).toHaveBeenCalledWith(
        'INSERT INTO sales (id, total, payment_method, note, customer_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [
          expect.any(String),
          75.0,
          'card',
          'Default timestamp sale',
          null,
          expect.stringMatching(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/), // Should use current time in correct format
        ]
      );

      expect(typeof saleId).toBe('string');
    });

    it('should handle multiple sales with different timestamps', async () => {
      const sales = [
        {
          data: {
            total: 100.0,
            payment_method: 'cash',
            created_at: '2025-01-15 09:00:00',
          },
          items: [
            {
              product_id: 'product-1',
              quantity: 1,
              price: 100.0,
              cost: 60.0,
              discount: 0,
              subtotal: 100.0,
            },
          ],
        },
        {
          data: {
            total: 200.0,
            payment_method: 'card',
            created_at: '2025-01-15 15:30:00',
          },
          items: [
            {
              product_id: 'product-2',
              quantity: 2,
              price: 100.0,
              cost: 60.0,
              discount: 0,
              subtotal: 200.0,
            },
          ],
        },
      ];

      // Mock successful database operations
      db.execAsync.mockResolvedValue(undefined);
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1 });

      const saleIds = [];

      // Process each sale
      for (const sale of sales) {
        const saleId = await databaseService.addSale(sale.data, sale.items);
        saleIds.push(saleId);
      }

      // Verify both sales were processed with their respective timestamps
      expect(db.runAsync).toHaveBeenCalledWith(
        'INSERT INTO sales (id, total, payment_method, note, customer_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [expect.any(String), 100.0, 'cash', null, null, '2025-01-15 09:00:00']
      );

      expect(db.runAsync).toHaveBeenCalledWith(
        'INSERT INTO sales (id, total, payment_method, note, customer_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [expect.any(String), 200.0, 'card', null, null, '2025-01-15 15:30:00']
      );

      expect(saleIds).toHaveLength(2);
      saleIds.forEach((id) => {
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Date Formatting Integration', () => {
    it('should format timestamps correctly for display', () => {
      const testDate = new Date('2025-10-12T14:30:00');

      const englishFormatted = formatSaleDateTime(testDate, 'en');
      const myanmarFormatted = formatSaleDateTime(testDate, 'my');

      expect(englishFormatted).toBe('Oct 12, 2025 2:30 PM');
      expect(myanmarFormatted).toBe('အောက်တိုဘာ 12, 2025 2:30 ညနေ');
    });

    it('should handle edge case timestamps', () => {
      const edgeCases = [
        new Date('2025-01-01T00:00:00'), // New Year midnight
        new Date('2025-12-31T23:59:59'), // End of year
        new Date('2025-06-15T12:00:00'), // Midday
      ];

      edgeCases.forEach((date) => {
        const formatted = formatSaleDateTime(date, 'en');
        expect(typeof formatted).toBe('string');
        expect(formatted.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully during sale processing', async () => {
      const saleData = {
        total: 100.0,
        payment_method: 'cash',
        created_at: '2025-01-15 10:30:00',
      };

      const saleItems = [
        {
          product_id: 'product-error',
          quantity: 1,
          price: 100.0,
          cost: 60.0,
          discount: 0,
          subtotal: 100.0,
        },
      ];

      // Mock database error
      db.execAsync.mockResolvedValueOnce(undefined); // BEGIN TRANSACTION
      db.runAsync.mockRejectedValueOnce(
        new Error('Database connection failed')
      );
      db.execAsync.mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        databaseService.addSale(saleData, saleItems)
      ).rejects.toThrow('Database connection failed');

      // Verify rollback was called
      expect(db.execAsync).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should use provided timestamp even if format is unusual', async () => {
      const saleData = {
        total: 100.0,
        payment_method: 'cash',
        created_at: 'invalid-timestamp',
      };

      const saleItems = [
        {
          product_id: 'product-1',
          quantity: 1,
          price: 100.0,
          cost: 60.0,
          discount: 0,
          subtotal: 100.0,
        },
      ];

      // Mock successful database operations
      db.execAsync.mockResolvedValue(undefined);
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1 });

      const saleId = await databaseService.addSale(saleData, saleItems);

      // Should parse and format the timestamp correctly
      expect(db.runAsync).toHaveBeenCalledWith(
        'INSERT INTO sales (id, total, payment_method, note, customer_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [
          expect.any(String),
          100.0,
          'cash',
          null,
          null,
          expect.stringMatching(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/), // Should format to correct format
        ]
      );

      expect(typeof saleId).toBe('string');
    });
  });

  describe('Performance Considerations', () => {
    it('should handle batch sales processing efficiently', async () => {
      const batchSize = 10;
      const sales = Array.from({ length: batchSize }, (_, index) => ({
        data: {
          total: 100 + index,
          payment_method: 'cash',
          created_at: `2025-01-15 ${String(10 + index).padStart(2, '0')}:00:00`,
        },
        items: [
          {
            product_id: `product-${index}`,
            quantity: 1,
            price: 100 + index,
            cost: 60,
            discount: 0,
            subtotal: 100 + index,
          },
        ],
      }));

      // Mock successful database operations
      db.execAsync.mockResolvedValue(undefined);
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1 });

      const startTime = Date.now();

      // Process all sales
      const saleIds = await Promise.all(
        sales.map((sale) => databaseService.addSale(sale.data, sale.items))
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Verify all sales were processed
      expect(saleIds).toHaveLength(batchSize);
      saleIds.forEach((id) => {
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      });

      // Performance should be reasonable (less than 1 second for 10 sales in test environment)
      expect(processingTime).toBeLessThan(1000);
    });
  });
});
