import { DatabaseService } from '@/services/database';
import * as SQLite from 'expo-sqlite';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

describe('DatabaseService - Customer Management', () => {
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

  describe('addCustomer', () => {
    it('should add a new customer successfully', async () => {
      const customerData = {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        address: '123 Main St',
      };

      mockDatabase.runAsync.mockResolvedValue({ lastInsertRowId: 1 });

      const result = await db.addCustomer(customerData);

      expect(result).toBe(1);
      expect(mockDatabase.runAsync).toHaveBeenCalledWith(
        'INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)',
        [
          customerData.name,
          customerData.phone,
          customerData.email,
          customerData.address,
        ]
      );
    });

    it('should handle missing optional fields', async () => {
      const customerData = {
        name: 'Jane Doe',
        phone: '',
        email: '',
        address: '',
      };

      mockDatabase.runAsync.mockResolvedValue({ lastInsertRowId: 2 });

      const result = await db.addCustomer(customerData);

      expect(result).toBe(2);
      expect(mockDatabase.runAsync).toHaveBeenCalledWith(
        'INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)',
        [customerData.name, '', '', '']
      );
    });
  });

  describe('getCustomers', () => {
    it('should retrieve customers with pagination', async () => {
      const mockCustomers = [
        {
          id: 1,
          name: 'John Doe',
          phone: '+1234567890',
          email: 'john@example.com',
        },
        {
          id: 2,
          name: 'Jane Doe',
          phone: '+0987654321',
          email: 'jane@example.com',
        },
      ];

      mockDatabase.getAllAsync.mockResolvedValue(mockCustomers);

      const result = await db.getCustomers(undefined, 1, 10);

      expect(result).toEqual(mockCustomers);
      expect(mockDatabase.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM customers ORDER BY name ASC LIMIT ? OFFSET ?',
        [10, 0]
      );
    });

    it('should search customers by name', async () => {
      const searchQuery = 'John';
      const mockCustomers = [
        {
          id: 1,
          name: 'John Doe',
          phone: '+1234567890',
          email: 'john@example.com',
        },
      ];

      mockDatabase.getAllAsync.mockResolvedValue(mockCustomers);

      const result = await db.getCustomers(searchQuery, 1, 10);

      expect(result).toEqual(mockCustomers);
      expect(mockDatabase.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? ORDER BY name ASC LIMIT ? OFFSET ?',
        [`%${searchQuery}%`, `%${searchQuery}%`, 10, 0]
      );
    });
  });

  describe('updateCustomer', () => {
    it('should update customer information', async () => {
      const customerId = 1;
      const updateData = {
        name: 'John Smith',
        email: 'johnsmith@example.com',
      };

      mockDatabase.runAsync.mockResolvedValue({});

      await db.updateCustomer(customerId, updateData);

      expect(mockDatabase.runAsync).toHaveBeenCalledWith(
        'UPDATE customers SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [updateData.name, updateData.email, customerId]
      );
    });
  });

  describe('deleteCustomer', () => {
    it('should delete a customer', async () => {
      const customerId = 1;

      mockDatabase.runAsync.mockResolvedValue({});

      await db.deleteCustomer(customerId);

      expect(mockDatabase.runAsync).toHaveBeenCalledWith(
        'DELETE FROM customers WHERE id = ?',
        [customerId]
      );
    });
  });

  describe('getCustomerStatistics', () => {
    it('should calculate customer statistics correctly', async () => {
      const customerId = 1;
      const mockCustomer = {
        id: 1,
        name: 'John Doe',
        total_spent: 1000,
        visit_count: 5,
      };
      const mockLastVisit = { created_at: '2024-01-15T10:00:00Z' };

      mockDatabase.getFirstAsync
        .mockResolvedValueOnce(mockCustomer)
        .mockResolvedValueOnce(mockLastVisit);

      const result = await db.getCustomerStatistics(customerId);

      expect(result).toEqual({
        totalSpent: 1000,
        visitCount: 5,
        averageOrderValue: 200, // 1000 / 5
        lastVisit: '2024-01-15T10:00:00Z',
      });
    });

    it('should handle customer with no purchases', async () => {
      const customerId = 1;
      const mockCustomer = {
        id: 1,
        name: 'John Doe',
        total_spent: 0,
        visit_count: 0,
      };

      mockDatabase.getFirstAsync
        .mockResolvedValueOnce(mockCustomer)
        .mockResolvedValueOnce(null);

      const result = await db.getCustomerStatistics(customerId);

      expect(result).toEqual({
        totalSpent: 0,
        visitCount: 0,
        averageOrderValue: 0,
        lastVisit: null,
      });
    });

    it('should throw error for non-existent customer', async () => {
      const customerId = 999;

      mockDatabase.getFirstAsync.mockResolvedValue(null);

      await expect(db.getCustomerStatistics(customerId)).rejects.toThrow(
        'Customer not found'
      );
    });
  });
});
