/**
 * Test script to verify timestamp formatting
 */

// Simple timestamp formatting function for testing
const formatDateForDatabase = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const formatTimestampForDatabase = (dateInput) => {
  if (!dateInput) {
    return formatDateForDatabase(new Date());
  }

  if (typeof dateInput === 'string') {
    // If it's already in the correct format, return as-is
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateInput)) {
      return dateInput;
    }
    // Otherwise, parse and format
    const date = new Date(dateInput);
    return formatDateForDatabase(date);
  }

  return formatDateForDatabase(dateInput);
};

console.log('=== Timestamp Format Test ===\n');

// Test cases
const testCases = [
  {
    input: new Date('2025-10-12T14:30:25.123Z'),
    description: 'Date object with milliseconds',
  },
  { input: '2025-10-12T14:30:25.000Z', description: 'ISO string' },
  { input: '2025-10-12 14:30:25', description: 'Already correct format' },
  { input: undefined, description: 'Undefined (should use current time)' },
  { input: new Date(), description: 'Current date object' },
];

testCases.forEach(({ input, description }, index) => {
  console.log(`Test ${index + 1}: ${description}`);
  console.log(`Input: ${input}`);
  console.log(`Output: ${formatTimestampForDatabase(input)}`);
  console.log('---');
});

// Verify format
const testOutput = formatTimestampForDatabase(
  new Date('2025-10-12T14:30:25.000Z')
);
const expectedFormat = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

console.log(`\nFormat verification:`);
console.log(`Output: "${testOutput}"`);
console.log(`Matches expected format: ${expectedFormat.test(testOutput)}`);
console.log(`Expected format: YYYY-MM-DD HH:MM:SS`);

console.log('\n✅ Timestamp format test completed!');
