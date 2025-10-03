import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

import { MigrationStatusService } from '../../services/migrationStatusService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockAsyncStorage = AsyncStorage as any;

describe('MigrationStatusService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMigrationStatus', () => {
    it('should return default status when no stored status exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const status = await MigrationStatusService.getMigrationStatus();

      expect(status).toEqual({
        uuidMigrationComplete: false,
        migrationVersion: '1.0.0',
      });
    });

    it('should return stored status when it exists', async () => {
      const storedStatus = {
        uuidMigrationComplete: true,
        lastMigrationAttempt: '2023-01-01T00:00:00.000Z',
        migrationVersion: '1.0.0',
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedStatus));

      const status = await MigrationStatusService.getMigrationStatus();

      expect(status).toEqual(storedStatus);
    });
  });

  describe('isUUIDMigrationComplete', () => {
    it('should return true when migration is complete', async () => {
      const status = {
        uuidMigrationComplete: true,
        migrationVersion: '1.0.0',
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(status));

      const isComplete = await MigrationStatusService.isUUIDMigrationComplete();

      expect(isComplete).toBe(true);
    });

    it('should return false when migration is not complete', async () => {
      const status = {
        uuidMigrationComplete: false,
        migrationVersion: '1.0.0',
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(status));

      const isComplete = await MigrationStatusService.isUUIDMigrationComplete();

      expect(isComplete).toBe(false);
    });
  });
});
