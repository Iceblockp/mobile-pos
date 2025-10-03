/**
 * Simple test script for utils/uuid.ts
 * Run with: node test-uuid.js
 */

// Mock expo-crypto for Node.js environment
const mockExpoCrypto = {
  randomUUID: () => {
    // Simple UUID v4 implementation for testing
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  },
};

// Mock the expo-crypto module
require.cache[require.resolve('expo-crypto')] = {
  exports: mockExpoCrypto,
};

// Now we can test the UUID service
async function testUUIDService() {
  console.log('🚀 Testing utils/uuid.ts');
  console.log('='.repeat(40));

  let passedTests = 0;
  let totalTests = 0;

  function runTest(testName, testFn) {
    totalTests++;
    try {
      testFn();
      console.log(`✅ ${testName}`);
      passedTests++;
    } catch (error) {
      console.log(`❌ ${testName}: ${error.message}`);
    }
  }

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  // Import the UUID service after mocking
  const { UUIDService, generateUUID, isValidUUID } = require('./utils/uuid.ts');

  // Test 1: Basic UUID generation
  runTest('UUID generation works', () => {
    const uuid = UUIDService.generate();
    assert(typeof uuid === 'string', 'UUID should be a string');
    assert(uuid.length === 36, 'UUID should be 36 characters long');
    assert(uuid.split('-').length === 5, 'UUID should have 5 segments');
  });

  // Test 2: UUID validation
  runTest('UUID validation works', () => {
    // Test valid UUIDs
    const validUUIDs = [
      '550e8400-e29b-41d4-a716-446655440000',
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    ];

    validUUIDs.forEach((uuid) => {
      assert(UUIDService.isValid(uuid), `${uuid} should be valid`);
    });

    // Test invalid UUIDs
    const invalidUUIDs = [
      '',
      'not-a-uuid',
      '550e8400-e29b-41d4-a716', // too short
      '550e8400e29b41d4a716446655440000', // missing hyphens
    ];

    invalidUUIDs.forEach((uuid) => {
      assert(!UUIDService.isValid(uuid), `${uuid} should be invalid`);
    });
  });

  // Test 3: Generated UUIDs are valid
  runTest('Generated UUIDs are valid', () => {
    for (let i = 0; i < 5; i++) {
      const uuid = UUIDService.generate();
      assert(
        UUIDService.isValid(uuid),
        `Generated UUID ${uuid} should be valid`
      );
    }
  });

  // Test 4: UUID uniqueness
  runTest('UUIDs are unique', () => {
    const uuid1 = UUIDService.generate();
    const uuid2 = UUIDService.generate();
    const uuid3 = UUIDService.generate();

    assert(uuid1 !== uuid2, 'UUIDs should be unique');
    assert(uuid1 !== uuid3, 'UUIDs should be unique');
    assert(uuid2 !== uuid3, 'UUIDs should be unique');
  });

  // Test 5: Multiple UUID generation
  runTest('Multiple UUID generation works', () => {
    const count = 5;
    const uuids = UUIDService.generateMultiple(count);

    assert(uuids.length === count, `Should generate ${count} UUIDs`);

    // Check uniqueness
    const uniqueUUIDs = new Set(uuids);
    assert(uniqueUUIDs.size === count, 'All generated UUIDs should be unique');

    // Check validity
    uuids.forEach((uuid) => {
      assert(
        UUIDService.isValid(uuid),
        `Generated UUID ${uuid} should be valid`
      );
    });
  });

  // Test 6: Convenience functions
  runTest('Convenience functions work', () => {
    const uuid = generateUUID();
    assert(typeof uuid === 'string', 'generateUUID should return string');
    assert(isValidUUID(uuid), 'generateUUID should return valid UUID');
    assert(
      isValidUUID('550e8400-e29b-41d4-a716-446655440000'),
      'isValidUUID should validate correct UUID'
    );
    assert(!isValidUUID('invalid'), 'isValidUUID should reject invalid UUID');
  });

  // Test 7: Edge cases
  runTest('Edge cases handled correctly', () => {
    // Empty array for generateMultiple
    assert(
      UUIDService.generateMultiple(0).length === 0,
      'Should return empty array for count 0'
    );
    assert(
      UUIDService.generateMultiple(-1).length === 0,
      'Should return empty array for negative count'
    );

    // Nil UUID check
    assert(
      UUIDService.isNil('00000000-0000-0000-0000-000000000000'),
      'Should identify nil UUID'
    );
    assert(
      !UUIDService.isNil('550e8400-e29b-41d4-a716-446655440000'),
      'Should reject non-nil UUID'
    );

    // Invalid input handling
    assert(!UUIDService.isValid(null), 'Should handle null input');
    assert(!UUIDService.isValid(undefined), 'Should handle undefined input');
    assert(!UUIDService.isValid(123), 'Should handle number input');
  });

  console.log('\n' + '='.repeat(40));
  console.log('📊 Test Results');
  console.log('='.repeat(40));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(
    `Failed: ${totalTests - passedTests} ${
      totalTests - passedTests > 0 ? '❌' : '✅'
    }`
  );
  console.log(
    `Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`
  );

  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! utils/uuid.ts is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.');
  }

  return passedTests === totalTests;
}

// Run the tests
testUUIDService()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
