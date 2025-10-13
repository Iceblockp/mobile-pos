/**
 * Date utility functions for database operations
 */

/**
 * Format a Date object to SQLite datetime format: 'YYYY-MM-DD HH:MM:SS'
 * @param date - The date to format
 * @returns Formatted date string for SQLite storage
 */
export const formatDateForDatabase = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * Convert a Date object or date string to the database format
 * @param dateInput - Date object, date string, or undefined
 * @returns Formatted date string for database storage
 */
export const formatTimestampForDatabase = (
  dateInput?: Date | string
): string => {
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

/**
 * Get current timestamp in database format
 * @returns Current timestamp formatted for database storage
 */
export const getCurrentDatabaseTimestamp = (): string => {
  return formatDateForDatabase(new Date());
};

/**
 * Convert ISO string to database format without timezone conversion
 * @param isoString - ISO string (e.g., '2025-10-12T18:13:47.901Z')
 * @returns Database format string (e.g., '2025-10-12 18:13:47')
 */
export const convertISOToDBFormat = (isoString: string): string => {
  // Extract date and time parts from ISO string
  const match = isoString.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/
  );
  if (match) {
    const [, year, month, day, hours, minutes, seconds] = match;
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  // Fallback to regular formatting if pattern doesn't match
  return formatTimestampForDatabase(isoString);
};
