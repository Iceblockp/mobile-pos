import { randomUUID } from 'expo-crypto';

/**
 * UUID utility service for generating and validating UUID v4 identifiers
 * Used for migrating from integer IDs to UUID-based identifiers
 */
export class UUIDService {
  /**
   * Generate a new UUID v4 (random) identifier
   * @returns A new UUID string in standard format
   */
  static generate(): string {
    return randomUUID();
  }

  /**
   * Validate if a string is a properly formatted UUID v4
   * @param uuid The string to validate
   * @returns True if the string is a valid UUID v4, false otherwise
   */
  static isValid(uuid: string): boolean {
    if (!uuid || typeof uuid !== 'string') {
      return false;
    }

    // UUID v4 regex pattern: 8-4-4-4-12 hexadecimal digits
    // Version 4 UUIDs have '4' in the version position and '8', '9', 'a', or 'b' in the variant position
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidV4Regex.test(uuid);
  }

  /**
   * Generate multiple unique UUIDs
   * @param count Number of UUIDs to generate
   * @returns Array of unique UUID strings
   */
  static generateMultiple(count: number): string[] {
    if (count <= 0) {
      return [];
    }

    const uuids = new Set<string>();

    // Generate UUIDs until we have the requested count of unique ones
    while (uuids.size < count) {
      uuids.add(this.generate());
    }

    return Array.from(uuids);
  }

  /**
   * Validate an array of UUIDs
   * @param uuids Array of UUID strings to validate
   * @returns Object with validation results
   */
  static validateMultiple(uuids: string[]): {
    valid: string[];
    invalid: string[];
    duplicates: string[];
    isAllValid: boolean;
  } {
    const valid: string[] = [];
    const invalid: string[] = [];
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const uuid of uuids) {
      if (this.isValid(uuid)) {
        if (seen.has(uuid)) {
          duplicates.push(uuid);
        } else {
          valid.push(uuid);
          seen.add(uuid);
        }
      } else {
        invalid.push(uuid);
      }
    }

    return {
      valid,
      invalid,
      duplicates,
      isAllValid: invalid.length === 0 && duplicates.length === 0,
    };
  }

  /**
   * Check if a UUID is nil (all zeros)
   * @param uuid The UUID to check
   * @returns True if the UUID is nil, false otherwise
   */
  static isNil(uuid: string): boolean {
    return uuid === '00000000-0000-0000-0000-000000000000';
  }
}

// Export convenience functions for common operations
export const generateUUID = UUIDService.generate;
export const isValidUUID = UUIDService.isValid;
export const generateMultipleUUIDs = UUIDService.generateMultiple;
export const validateMultipleUUIDs = UUIDService.validateMultiple;
