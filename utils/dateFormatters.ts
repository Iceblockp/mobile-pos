/**
 * Date formatting utilities with localization support
 */

export type SupportedLocale = 'en' | 'my';

/**
 * Format date and time for display in the SaleDateTimeSelector component
 * @param date - The date to format
 * @param locale - The locale to use for formatting ('en' or 'my')
 * @returns Formatted date string
 */
export const formatSaleDateTime = (
  date: Date,
  locale: SupportedLocale = 'en'
): string => {
  if (locale === 'my') {
    // Myanmar locale formatting
    return formatMyanmarDateTime(date);
  }

  // English locale formatting (default)
  return formatEnglishDateTime(date);
};

/**
 * Format date and time for English locale
 * @param date - The date to format
 * @returns Formatted date string in English
 */
const formatEnglishDateTime = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  return date.toLocaleDateString('en-US', options);
};

/**
 * Format date and time for Myanmar locale
 * @param date - The date to format
 * @returns Formatted date string in Myanmar
 */
const formatMyanmarDateTime = (date: Date): string => {
  // Myanmar months
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

  // Format time in 12-hour format
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

/**
 * Get localized month names
 * @param locale - The locale to get month names for
 * @returns Array of month names
 */
export const getLocalizedMonths = (locale: SupportedLocale): string[] => {
  if (locale === 'my') {
    return [
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
  }

  return [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
};

/**
 * Get localized day names
 * @param locale - The locale to get day names for
 * @returns Array of day names
 */
export const getLocalizedDays = (locale: SupportedLocale): string[] => {
  if (locale === 'my') {
    return [
      'တနင်္ဂနွေ',
      'တနင်္လာ',
      'အင်္ဂါ',
      'ဗုဒ္ဓဟူး',
      'ကြာသပတေး',
      'သောကြာ',
      'စနေ',
    ];
  }

  return [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
};
