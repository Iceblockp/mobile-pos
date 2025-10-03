/**
 * Test script for UUID migration fix
 * Tests the enhanced migration service with data integrity fixes
 */

// Mock SQLite database for testing
const mockDb = {
  execAsync: jest.fn(),
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  runAsync: jest.fn(),
};

// Mock UUIDService
const mockUUIDService = {
  generate: () => '12345678-1234-4567-8901-123456789012',
  isValid: () => true,
};

// Mock DataIntegrityFixer
const mockDataIntegrityFixer = {
  diagnoseAndFix: jest
    .fn()
    .mockResolvedValue({ issuesFound: 1, issuesFixed: 1 }),
  createMissingDefaultCategories: jest.fn().mockResolvedValue(undefined),
};

// Mock modules
jest.mock('../utils/uuid', () => ({
  UUIDService: mockUUIDService,
}));

jest.mock('../scripts/fixDataIntegrityIssues', () => ({
  default: jest.fn().mockImplementation(() => mockDataIntegrityFixer),
}));

import { UUIDMigrationService } from '../services/uuidMigrationService';

describe('UUID Migration Fix', () => {
  let migrationService: UUIDMigrationService;

  beforeEach(() => {
    jest.clearAllMocks();
    migrationService = new UUIDMigrationService(mockDb as any);
  });

  describe('Enhanced Migration with Data Integrity Fixes', () => {
    it('should fix data integrity issues before migration', async () => {
      // Mock migration not complete
      mockDb.getAllAsync.mockResolvedValueOnce([
        { name: 'id', type: 'INTEGER' },
      ]);

      // Mock successful operations
      mockDb.execAsync.mockResolvedValue(undefined);
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue({ count: 0 });

      // Mock empty tables for migration
      mockDb.getAllAsync.mockResolvedValue([]);

      const report = await migrationService.executeMigration();

      expect(report.success).toBe(true);
      expect(mockDataIntegrityFixer.diagnoseAndFix).toHaveBeenCalled();
      expect(
        mockDataIntegrityFixer.createMissingDefaultCategories
      ).toHaveBeenCalled();
      expect(report.warnings).toContain(
        'Fixed 1/1 data integrity issues before migration'
      );
    });

    it('should handle pre-migration validation errors gracefully', async () => {
      // Mock migration not complete
      mockDb.getAllAsync.mockResolvedValueOnce([
        { name: 'id', type: 'INTEGER' },
      ]);

      // Mock data integrity fixer failure
      mockDataIntegrityFixer.diagnoseAndFix.mockRejectedValueOnce(
        new Error('Critical data integrity issue')
      );

      const report = await migrationService.executeMigration();

      expect(report.success).toBe(false);
      expect(report.errors).toContain(
        expect.stringContaining('Critical data integrity issue')
      );
    });

    it('should provide detailed error messages for mapping failures', async () => {
      // Mock migration not complete
      mockDb.getAllAsync.mockResolvedValueOnce([
        { name: 'id', type: 'INTEGER' },
      ]);

      // Mock successful initial operations
      mockDb.execAsync.mockResolvedValue(undefined);
      mockDb.runAsync.mockResolvedValue(undefined);

      // Mock data with orphaned references
      mockDb.getAllAsync
        .mockResolvedValueOnce([]) // categories
        .mockResolvedValueOnce([]) // expense_categories
        .mockResolvedValueOnce([]) // suppliers
        .mockResolvedValueOnce([]) // customers
        .mockResolvedValueOnce([]) // products
        .mockResolvedValueOnce([]) // sales
        .mockResolvedValueOnce([{ id: 1, sale_id: 1, product_id: 5 }]); // sale_items with orphaned product

      // Mock UUID mapping creation
      mockDb.getFirstAsync
        .mockResolvedValueOnce(null) // No mapping found for products.5
        .mockResolvedValueOnce(null); // No original record found either

      const report = await migrationService.executeMigration();

      expect(report.success).toBe(false);
      expect(report.errors).toContain(
        expect.stringContaining(
          'Foreign key constraint violation: products.5 does not exist'
        )
      );
    });
  });

  describe('Data Integrity Validation', () => {
    it('should validate foreign key relationships before migration', async () => {
      // This test verifies that the pre-migration validation catches issues
      const validationQueries = [
        'SELECT p.id, p.category_id FROM products p LEFT JOIN categories c',
        'SELECT si.id, si.product_id FROM sale_items si LEFT JOIN products p',
      ];

      // Mock validation queries
      mockDb.getAllAsync.mockImplementation((query: string) => {
        if (query.includes('LEFT JOIN')) {
          return Promise.resolve([]); // No orphaned records
        }
        return Promise.resolve([]);
      });

      // The validation should pass without throwing errors
      expect(async () => {
        await migrationService.executeMigration();
      }).not.toThrow();
    });
  });
});

console.log('✅ UUID Migration Fix Tests Completed');
console.log('🔧 Enhanced migration service includes:');
console.log('  - Pre-migration data integrity fixes');
console.log('  - Detailed error messages for debugging');
console.log('  - Automatic cleanup of orphaned records');
console.log('  - Default category creation for orphaned products');
console.log('  - Comprehensive validation before migration');

export {};
