import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Interface for persistent migration status
 */
export interface PersistentMigrationStatus {
  uuidMigrationComplete: boolean;
  lastMigrationAttempt?: string;
  migrationVersion: string;
}

/**
 * Service for managing migration status persistence
 */
export class MigrationStatusService {
  private static readonly MIGRATION_STATUS_KEY = 'migration_status';
  private static readonly CURRENT_MIGRATION_VERSION = '1.0.0';

  /**
   * Get the current migration status from storage
   */
  static async getMigrationStatus(): Promise<PersistentMigrationStatus> {
    try {
      const statusJson = await AsyncStorage.getItem(this.MIGRATION_STATUS_KEY);
      if (statusJson) {
        return JSON.parse(statusJson);
      }
    } catch (error) {
      console.error('Error reading migration status:', error);
    }

    // Return default status if not found or error
    return {
      uuidMigrationComplete: false,
      migrationVersion: this.CURRENT_MIGRATION_VERSION,
    };
  }

  /**
   * Update migration status in storage
   */
  static async updateMigrationStatus(
    status: Partial<PersistentMigrationStatus>
  ): Promise<void> {
    try {
      const currentStatus = await this.getMigrationStatus();
      const updatedStatus: PersistentMigrationStatus = {
        ...currentStatus,
        ...status,
        migrationVersion: this.CURRENT_MIGRATION_VERSION,
      };

      await AsyncStorage.setItem(
        this.MIGRATION_STATUS_KEY,
        JSON.stringify(updatedStatus)
      );
    } catch (error) {
      console.error('Error updating migration status:', error);
      throw error;
    }
  }

  /**
   * Mark UUID migration as complete
   */
  static async markUUIDMigrationComplete(): Promise<void> {
    await this.updateMigrationStatus({
      uuidMigrationComplete: true,
      lastMigrationAttempt: new Date().toISOString(),
    });
  }

  /**
   * Record migration attempt
   */
  static async recordMigrationAttempt(): Promise<void> {
    await this.updateMigrationStatus({
      lastMigrationAttempt: new Date().toISOString(),
    });
  }

  /**
   * Check if UUID migration is complete
   */
  static async isUUIDMigrationComplete(): Promise<boolean> {
    const status = await this.getMigrationStatus();
    return status.uuidMigrationComplete;
  }

  /**
   * Reset migration status (for testing purposes)
   */
  static async resetMigrationStatus(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.MIGRATION_STATUS_KEY);
    } catch (error) {
      console.error('Error resetting migration status:', error);
      throw error;
    }
  }
}
