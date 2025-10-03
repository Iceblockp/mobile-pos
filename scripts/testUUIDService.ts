/**
 * Simple UUID Service Test Script for Mobile Environment
 *
 * This script can be imported and run in the mobile app to validate
 * the UUID utility service functionality.
 */

import {
  UUIDService,
  generateUUID,
  isValidUUID,
  generateMultipleUUIDs,
  validateMultipleUUIDs,
} from '../utils/uuid';

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
}

export class UUIDServiceTester {
  private results: TestResult[] = [];

  private assert(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(message);
    }
  }

  private runTest(testName: string, testFn: () => void): void {
    try {
      testFn();
      this.results.push({ testName, passed: true });
      console.log(`✅ ${testName}`);
    } catch (error) {
      this.results.push({
        testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
      });
      console.log(
        `❌ ${testName}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  testBasicGeneration(): void {
    this.runTest('UUID generation works', () => {
      const uuid = UUIDService.generate();
      this.assert(typeof uuid === 'string', 'UUID should be a string');
      this.assert(uuid.length === 36, 'UUID should be 36 characters long');
      this.assert(UUIDService.isValid(uuid), 'Generated UUID should be valid');
    });
  }

  testUniqueness(): void {
    this.runTest('UUID generation produces unique values', () => {
      const uuid1 = UUIDService.generate();
      const uuid2 = UUIDService.generate();
      const uuid3 = UUIDService.generate();

      this.assert(uuid1 !== uuid2, 'UUIDs should be unique');
      this.assert(uuid1 !== uuid3, 'UUIDs should be unique');
      this.assert(uuid2 !== uuid3, 'UUIDs should be unique');
    });
  }

  testValidation(): void {
    this.runTest('UUID validation works correctly', () => {
      // Test valid UUIDs
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      ];

      validUUIDs.forEach((uuid) => {
        this.assert(UUIDService.isValid(uuid), `${uuid} should be valid`);
      });

      // Test invalid UUIDs
      const invalidUUIDs = [
        '',
        'not-a-uuid',
        '550e8400-e29b-41d4-a716', // too short
        '550e8400e29b41d4a716446655440000', // missing hyphens
      ];

      invalidUUIDs.forEach((uuid) => {
        this.assert(!UUIDService.isValid(uuid), `${uuid} should be invalid`);
      });
    });
  }

  testMultipleGeneration(): void {
    this.runTest('Multiple UUID generation works', () => {
      const count = 5;
      const uuids = UUIDService.generateMultiple(count);

      this.assert(uuids.length === count, `Should generate ${count} UUIDs`);

      // Check uniqueness
      const uniqueUUIDs = new Set(uuids);
      this.assert(
        uniqueUUIDs.size === count,
        'All generated UUIDs should be unique'
      );

      // Check validity
      uuids.forEach((uuid) => {
        this.assert(
          UUIDService.isValid(uuid),
          `Generated UUID ${uuid} should be valid`
        );
      });
    });
  }

  testConvenienceFunctions(): void {
    this.runTest('Convenience functions work', () => {
      // Test generateUUID
      const uuid = generateUUID();
      this.assert(
        typeof uuid === 'string',
        'generateUUID should return string'
      );
      this.assert(isValidUUID(uuid), 'generateUUID should return valid UUID');

      // Test isValidUUID
      this.assert(
        isValidUUID('550e8400-e29b-41d4-a716-446655440000'),
        'isValidUUID should validate correct UUID'
      );
      this.assert(
        !isValidUUID('invalid'),
        'isValidUUID should reject invalid UUID'
      );

      // Test generateMultipleUUIDs
      const multipleUUIDs = generateMultipleUUIDs(3);
      this.assert(
        multipleUUIDs.length === 3,
        'generateMultipleUUIDs should return correct count'
      );

      // Test validateMultipleUUIDs
      const validationResult = validateMultipleUUIDs([
        '550e8400-e29b-41d4-a716-446655440000',
        'invalid',
      ]);
      this.assert(
        validationResult.valid.length === 1,
        'validateMultipleUUIDs should identify valid UUIDs'
      );
      this.assert(
        validationResult.invalid.length === 1,
        'validateMultipleUUIDs should identify invalid UUIDs'
      );
    });
  }

  runAllTests(): TestResult[] {
    console.log('🚀 Starting UUID Service Tests');
    console.log('='.repeat(40));

    this.results = []; // Reset results

    this.testBasicGeneration();
    this.testUniqueness();
    this.testValidation();
    this.testMultipleGeneration();
    this.testConvenienceFunctions();

    console.log('\n' + '='.repeat(40));
    console.log('📊 Test Summary');
    console.log('='.repeat(40));

    const totalTests = this.results.length;
    const passedTests = this.results.filter((r) => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ${failedTests > 0 ? '❌' : '✅'}`);
    console.log(
      `Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`
    );

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter((r) => !r.passed)
        .forEach((result) => {
          console.log(`   - ${result.testName}: ${result.error}`);
        });
    } else {
      console.log('\n🎉 All tests passed! UUID service is working correctly.');
    }

    return this.results;
  }
}

// Export for easy testing
export const testUUIDService = () => {
  const tester = new UUIDServiceTester();
  return tester.runAllTests();
};
