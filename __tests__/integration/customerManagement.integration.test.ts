import { DatabaseService } from '@/services/database';
import * as SQLite from 'expo-sqlite';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

describe('Customer Management Integration Tests', () => {
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

  describe('Complete Customer Lifecycle', () => {
    it('should handle complete customer management workflow', async () => {
      // Step 1: Create a new customer
      const customerData = {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        address: '123 Main St',
      };

      mockDatabase.runAsync.mockResolvedValueOnce({ lastInsertRowId: 1 });

      const customerId = await db.addCustomer(customerData);
      expect(customerId).toBe(1);

      // Step 2: Retrieve the customer
      const mockCustomer = {
        id: 1,
        ...customerData,
        total_spent: 0,
        visit_count: 0,
        created_at: '2024-01-15T10:00:00Z',
      };

      mockDatabase.getFirstAsync.mockResolvedValueOnce(mockCustomer);

      const retrievedCustomer = await db.getCustomerById(customerId);
      expect(retrievedCustomer).toEqual(mockCustomer);

      // Step 3: Update customer information
      const updateData = {
        email: 'john.doe@example.com',
        address: '456 Oak Ave',
      };

      mockDatabase.runAsync.mockResolvedValueOnce({});

      await db.updateCustomer(customerId, updateData);

      // Step 4: Simulate customer making purchases (update statistics)
      const saleData = {
        customer_id: customerId,
        total: 150.0,
        payment_method: 'cash',
        items: [{ product_id: 1, quantity: 2, price: 75.0 }],
      };

      // Mock sale creation and customer statistics update
      mockDatabase.runAsync
        .mockResolvedValueOnce({ lastInsertRowId: 1 }) // Sale insert
        .mockResolvedValueOnce({}) // Sale items insert
        .mockResolvedValueOnce({}); // Customer statistics update

      // Simulate updating customer statistics after sale
      await db.updateCustomerStatistics(customerId, 150.0);

      // Step 5: Retrieve updated customer statistics
      const updatedCustomer = {
        id: 1,
        name: 'John Doe',
        total_spent: 150,
        visit_count: 1,
      };

      const mockLastVisit = { created_at: '2024-01-15T14:00:00Z' };

      mockDatabase.getFirstAsync
        .mockResolvedValueOnce(updatedCustomer)
        .mockResolvedValueOnce(mockLastVisit);

      const statistics = await db.getCustomerStatistics(customerId);

      expect(statistics).toEqual({
        totalSpent: 150,
        visitCount: 1,
        averageOrderValue: 150,
        lastVisit: '2024-01-15T14:00:00Z',
      });

      // Step 6: Retrieve customer purchase history
      const mockPurchaseHistory = [
        {
          id: 1,
          customer_id: 1,
          total: 150.0,
          payment_method: 'cash',
          created_at: '2024-01-15T14:00:00Z',
        },
      ];

      mockDatabase.getAllAsync.mockResolvedValueOnce(mockPurchaseHistory);

      const purchaseHistory = await db.getCustomerPurchaseHistory(customerId);
      expect(purchaseHistory).toEqual(mockPurchaseHistory);
    });
  });

  describe('Customer Search and Filtering', () => {
    it('should handle customer search across multiple criteria', async () => {
      const mockCustomers = [
        {
          id: 1,
          name: 'John Doe',
          phone: '+1234567890',
          email: 'john@example.com',
        },
        {
          id: 2,
          name: 'Jane Smith',
          phone: '+0987654321',
          email: 'jane@example.com',
        },
        {
          id: 3,
          name: 'John Wilson',
          phone: '+1122334455',
          email: 'jwilson@example.com',
        },
      ];

      // Test search by name
      mockDatabase.getAllAsync.mockResolvedValueOnce([
        mockCustomers[0],
        mockCustomers[2],
      ]);

      const nameSearchResults = await db.getCustomers('John', 1, 10);
      expect(nameSearchResults).toHaveLength(2);
      expect(
        nameSearchResults.every((customer) => customer.name.includes('John'))
      ).toBe(true);

      // Test search by phone
      mockDatabase.getAllAsync.mockResolvedValueOnce([mockCustomers[0]]);

      const phoneSearchResults = await db.getCustomers('1234', 1, 10);
      expect(phoneSearchResults).toHaveLength(1);
      expect(phoneSearchResults[0].phone).toContain('1234');
    });
  });

  describe('Customer Analytics Integration', () => {
    it('should calculate customer segmentation correctly', async () => {
      const mockCustomers = [
        {
          id: 1,
          name: 'High Value Customer',
          total_spent: 5000,
          visit_count: 20,
        },
        {
          id: 2,
          name: 'Medium Value Customer',
          total_spent: 1500,
          visit_count: 8,
        },
        { id: 3, name: 'Low Value Customer', total_spent: 200, visit_count: 2 },
        { id: 4, name: 'New Customer', total_spent: 0, visit_count: 0 },
      ];

      mockDatabase.getAllAsync.mockResolvedValueOnce(mockCustomers);

      const segmentation = await db.getCustomerSegmentation();

      expect(segmentation).toHaveProperty('segments');
      expect(segmentation).toHaveProperty('totalCustomers', 4);
      expect(segmentation.segments).toHaveProperty('high_value');
      expect(segmentation.segments).toHaveProperty('medium_value');
      expect(segmentation.segments).toHaveProperty('low_value');
      expect(segmentation.segments).toHaveProperty('new');
    });

    it('should analyze customer purchase patterns', async () => {
      const customerId = 1;
      const mockCustomer = { id: 1, name: 'John Doe' };

      // Mock monthly spending data
      const mockMonthlySpending = [
        { month: '2024-01', amount: 500 },
        { month: '2024-02', amount: 750 },
        { month: '2024-03', amount: 600 },
      ];

      // Mock top categories data
      const mockTopCategories = [
        { category: 'Electronics', amount: 1200, percentage: 66.7 },
        { category: 'Books', amount: 400, percentage: 22.2 },
        { category: 'Clothing', amount: 200, percentage: 11.1 },
      ];

      mockDatabase.getFirstAsync.mockResolvedValueOnce(mockCustomer);
      mockDatabase.getAllAsync
        .mockResolvedValueOnce(mockMonthlySpending)
        .mockResolvedValueOnce(mockTopCategories);

      const patterns = await db.getCustomerPurchasePatterns(customerId);

      expect(patterns).toHaveProperty('monthlySpending');
      expect(patterns).toHaveProperty('topCategories');
      expect(patterns.monthlySpending).toEqual(mockMonthlySpending);
      expect(patterns.topCategories).toEqual(mockTopCategories);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle customer deletion with existing sales', async () => {
      const customerId = 1;

      // Mock customer with existing sales
      mockDatabase.getFirstAsync.mockResolvedValueOnce({ count: 5 });

      // Should not delete customer with existing sales
      await expect(db.deleteCustomer(customerId)).rejects.toThrow(
        'Cannot delete customer with existing sales'
      );
    });

    it('should handle duplicate customer detection', async () => {
      const customerData = {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        address: '123 Main St',
      };

      // Mock existing customer with same phone
      mockDatabase.getFirstAsync.mockResolvedValueOnce({
        id: 1,
        phone: '+1234567890',
      });

      await expect(db.addCustomer(customerData)).rejects.toThrow(
        'Customer with this phone number already exists'
      );
    });

    it('should handle customer statistics for customer with no purchases', async () => {
      const customerId = 1;
      const mockCustomer = {
        id: 1,
        name: 'New Customer',
        total_spent: 0,
        visit_count: 0,
      };

      mockDatabase.getFirstAsync
        .mockResolvedValueOnce(mockCustomer)
        .mockResolvedValueOnce(null); // No last visit

      const statistics = await db.getCustomerStatistics(customerId);

      expect(statistics).toEqual({
        totalSpent: 0,
        visitCount: 0,
        averageOrderValue: 0,
        lastVisit: null,
      });
    });
  });
});
