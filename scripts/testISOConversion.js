/**
 * Test script to verify ISO to DB format conversion
 */

// Simple conversion function for testing
const convertISOToDBFormat = (isoString) => {
  // Extract date and time parts from ISO string
  const match = isoString.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/
  );
  if (match) {
    const [, year, month, day, hours, minutes, seconds] = match;
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  return isoString; // fallback
};

console.log('=== ISO to DB Format Conversion Test ===\n');

// Test cases
const testCases = [
  '2025-10-12T18:13:47.901Z',
  '2025-01-01T00:00:00.000Z',
  '2025-12-31T23:59:59.999Z',
  '2025-06-15T12:30:45.123Z',
];

testCases.forEach((isoString, index) => {
  const converted = convertISOToDBFormat(isoString);
  console.log(`Test ${index + 1}:`);
  console.log(`Input:  ${isoString}`);
  console.log(`Output: ${converted}`);
  console.log('---');
});

// Verify the specific case from the log
const testInput = '2025-10-12T18:13:47.901Z';
const result = convertISOToDBFormat(testInput);
console.log(`\nSpecific test case:`);
console.log(`Input:  ${testInput}`);
console.log(`Output: ${result}`);
console.log(`Expected: 2025-10-12 18:13:47`);
console.log(`Match: ${result === '2025-10-12 18:13:47'}`);

console.log('\n✅ ISO conversion test completed!');
