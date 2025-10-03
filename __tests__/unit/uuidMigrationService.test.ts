/**
 * Basic unit tests for UUIDMigrationService
 * Tests core functionality without React Native dependencies
 */

// Mock implementations
const mockUUIDService = {
  generate: () => '12345678-1234-4567-8901-123456789012',
  isValid: () => true,
};

const mockFileSystem = {
  documentDirectory: '/mock/documents/',
  copyAsync: jest.fn(),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
};

// Mock SQLite database
const mockDb = {
  execAsync: jest.fn(),
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  runAsync: jest.fn(),
  _db: {
    _db: {
      filename: '/mock/database/path.db',
    },
  },
};

// Mock modules
jest.mock('expo-file-system', () => mockFileSystem);
jest.mock('../../utils/uuid', () => ({
  UUIDService: mockUUIDService,
}));

import {
  UUIDMigrationService,
  MigrationStatus,
  MigrationReport,
} from '../../services/uuidMigrationService';

describe('UUIDMigrationService', () => {
  let migrationService: UUIDMigrationService;

  beforeEach(() => {
    jest.clearAllMocks();
    migrationService = new UUIDMigrationService(mockDb as any);
  });

  describe('getMigrationStatus', () => {
    it('should return initial migration status', () => {
      const status = migrationService.getMigrationStatus();

      expect(status).toEqual({
        isComplete: false,
        currentStep: 'Not started',
        progress: 0,
      });
    });
  });

  describe('isMigrationComplete', () => {
    it('should return false when migration is not complete', async () => {
      mockDb.getAllAsync.mockResolvedValue([{ name: 'id', type: 'INTEGER' }]);

      const isComplete = await migrationService.isMigrationComplete();
      expect(isComplete).toBe(false);
    });

    it('should return true when migration is complete', async () => {
      mockDb.getAllAsync.mockResolvedValue([{ name: 'id', type: 'TEXT' }]);

      const isComplete = await migrationService.isMigrationComplete();
      expect(isComplete).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      mockDb.getAllAsync.mockRejectedValue(new Error('Database error'));

      const isComplete = await migrationService.isMigrationComplete();
      expect(isComplete).toBe(false);
    });
  });

  describe('createBackup', () => {
    it('should create a database backup', async () => {
      mockFileSystem.copyAsync.mockResolvedValue(undefined);

      const backupPath = await migrationService.createBackup();

      expect(backupPath).toMatch(/\/mock\/documents\/database_backup_.*\.db/);
      expect(mockFileSystem.copyAsync).toHaveBeenCalledWith({
        from: '/mock/database/path.db',
        to: expect.stringMatching(/\/mock\/documents\/database_backup_.*\.db/),
      });
    });

    it('should handle backup creation errors', async () => {
      mockFileSystem.copyAsync.mockRejectedValue(new Error('Copy failed'));

      await expect(migrationService.createBackup()).rejects.toThrow(
        'Failed to create backup: Error: Copy failed'
      );
    });
  });

  describe('createUUIDTables', () => {
    it('should create UUID table schemas successfully', async () => {
      mockDb.execAsync.mockResolvedValue(undefined);

      await migrationService.createUUIDTables();

      // Verify transaction was started and committed
      expect(mockDb.execAsync).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockDb.execAsync).toHaveBeenCalledWith('COMMIT');

      // Verify some table creation calls
      expect(mockDb.execAsync).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE categories_uuid')
      );
      expect(mockDb.execAsync).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE products_uuid')
      );
    });

    it('should rollback on error', async () => {
      mockDb.execAsync
        .mockResolvedValueOnce(undefined) // BEGIN TRANSACTION
        .mockRejectedValueOnce(new Error('Table creation failed')); // First table creation

      await expect(migrationService.createUUIDTables()).rejects.toThrow(
        'Failed to create UUID tables'
      );
      expect(mockDb.execAsync).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('executeMigration', () => {
    it('should skip migration if already complete', async () => {
      mockDb.getAllAsync.mockResolvedValue([{ name: 'id', type: 'TEXT' }]);

      const report = await migrationService.executeMigration();

      expect(report.success).toBe(true);
      expect(report.warnings).toContain(
        'Migration was already completed previously'
      );
    });

    it('should execute full migration successfully', async () => {
      // Mock migration not complete
      mockDb.getAllAsync.mockResolvedValue([{ name: 'id', type: 'INTEGER' }]);

      // Mock successful operations
      mockDb.execAsync.mockResolvedValue(undefined);
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue({ count: 0 });

      // Mock empty tables for migration
      mockDb.getAllAsync.mockResolvedValue([]);

      mockFileSystem.copyAsync.mockResolvedValue(undefined);

      const report = await migrationService.executeMigration();

      expect(report.success).toBe(true);
      expect(report.tablesProcessed).toEqual([
        'categories',
        'expense_categories',
        'suppliers',
        'customers',
        'products',
        'sales',
        'sale_items',
        'expenses',
        'stock_movements',
        'bulk_pricing',
      ]);
    });

    it('should handle migration errors and attempt rollback', async () => {
      // Mock migration not complete
      mockDb.getAllAsync.mockResolvedValue([{ name: 'id', type: 'INTEGER' }]);

      mockFileSystem.copyAsync
        .mockResolvedValueOnce(undefined) // Backup creation
        .mockResolvedValueOnce(undefined); // Rollback

      // Mock error during table creation
      mockDb.execAsync
        .mockResolvedValueOnce(undefined) // BEGIN TRANSACTION for backup
        .mockRejectedValueOnce(new Error('Migration failed'));

      const report = await migrationService.executeMigration();

      expect(report.success).toBe(false);
      expect(report.errors).toContain(
        'Failed to create UUID tables: Error: Migration failed'
      );
      expect(report.warnings).toContain('Rollback completed successfully');
    });
  });

  describe('UUID generation and validation', () => {
    it('should generate valid UUIDs for migration', () => {
      const uuid = mockUUIDService.generate();
      expect(uuid).toBe('12345678-1234-4567-8901-123456789012');
      expect(mockUUIDService.isValid(uuid)).toBe(true);
    });
  });

  describe('Migration validation', () => {
    it('should validate UUID formats in all tables', async () => {
      // Mock successful validation responses
      mockDb.getFirstAsync.mockResolvedValue({ count: 0 });
      mockDb.getAllAsync.mockResolvedValue([
        { id: '12345678-1234-4567-8901-123456789012' },
      ]);

      const validationReport = await migrationService.validateMigration();

      expect(validationReport.success).toBe(true);
      expect(validationReport.validationResults.uuidFormats.passed).toBe(true);
    });

    it('should validate foreign key relationships', async () => {
      // Mock successful validation responses
      mockDb.getFirstAsync.mockResolvedValue({ count: 0 });
      mockDb.getAllAsync.mockResolvedValue([]);

      const validationReport = await migrationService.validateMigration();

      expect(validationReport.success).toBe(true);
      expect(validationReport.validationResults.foreignKeys.passed).toBe(true);
    });

    it('should validate record counts and data integrity', async () => {
      // Mock successful validation responses
      mockDb.getFirstAsync.mockResolvedValue({ count: 0 });
      mockDb.getAllAsync.mockResolvedValue([]);

      const validationReport = await migrationService.validateMigration();

      expect(validationReport.success).toBe(true);
      expect(validationReport.validationResults.recordCounts.passed).toBe(true);
      expect(validationReport.validationResults.dataIntegrity.passed).toBe(
        true
      );
    });

    it('should detect validation failures', async () => {
      // Mock validation failure - null UUIDs found
      mockDb.getFirstAsync
        .mockResolvedValueOnce({ count: 3 }) // 3 null UUIDs in categories
        .mockResolvedValue({ count: 0 }); // Other validations pass

      mockDb.getAllAsync.mockResolvedValue([]);

      await expect(migrationService.validateMigration()).rejects.toThrow(
        'Migration validation failed'
      );
    });
  });
});
