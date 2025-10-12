/**
 * Test script to verify date localization functionality
 */

// Simple date formatting functions for testing
const formatEnglishDateTime = (date) => {
  const options = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  return date.toLocaleDateString('en-US', options);
};

const formatMyanmarDateTime = (date) => {
  const myanmarMonths = [
    'ဇန်နဝါရီ',
    'ဖေဖော်ဝါရီ',
    'မတ်',
    'ဧပြီ',
    'မေ',
    'ဇွန်',
    'ဇူလိုင်',
    'သြဂုတ်',
    'စက်တင်ဘာ',
    'အောက်တိုဘာ',
    'နိုဝင်ဘာ',
    'ဒီဇင်ဘာ',
  ];

  const day = date.getDate();
  const month = myanmarMonths[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'ညနေ' : 'နံနက်';

  if (hours > 12) {
    hours -= 12;
  } else if (hours === 0) {
    hours = 12;
  }

  const formattedMinutes = minutes.toString().padStart(2, '0');

  return `${month} ${day}, ${year} ${hours}:${formattedMinutes} ${ampm}`;
};

// Test dates
const testDates = [
  new Date('2025-10-12T09:15:00'), // Morning
  new Date('2025-10-12T12:00:00'), // Noon
  new Date('2025-10-12T14:30:00'), // Afternoon
  new Date('2025-10-12T23:45:00'), // Night
  new Date('2025-01-01T00:00:00'), // New Year midnight
];

console.log('=== Date Localization Test ===\n');

testDates.forEach((date, index) => {
  console.log(`Test Date ${index + 1}: ${date.toISOString()}`);
  console.log(`English: ${formatEnglishDateTime(date)}`);
  console.log(`Myanmar: ${formatMyanmarDateTime(date)}`);
  console.log('---');
});

console.log('\n✅ Date localization test completed successfully!');
