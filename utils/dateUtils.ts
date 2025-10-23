/**
 * Date utility functions for database operations
 *
 * TIMEZONE HANDLING STRATEGY:
 * - Store timestamps in local time format (YYYY-MM-DD HH:MM:SS)
 * - Query using local time ranges to match stored data
 * - Always use local time for date comparisons to avoid timezone mismatches
 */

/**
 * Format a Date object to SQLite datetime format: 'YYYY-MM-DD HH:MM:SS'
 * This stores the local time without timezone conversion
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

/**
 * Get start of day in local time for database queries
 * @param date - The date to get start of day for
 * @returns Database format string for start of day (00:00:00)
 */
export const getStartOfDayForDB = (date: Date): string => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  return formatDateForDatabase(startOfDay);
};

/**
 * Get end of day in local time for database queries
 * @param date - The date to get end of day for
 * @returns Database format string for end of day (23:59:59)
 */
export const getEndOfDayForDB = (date: Date): string => {
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return formatDateForDatabase(endOfDay);
};

/**
 * Get start of month in local time for database queries
 * @param date - The date to get start of month for
 * @returns Database format string for start of month
 */
export const getStartOfMonthForDB = (date: Date): string => {
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);
  return formatDateForDatabase(startOfMonth);
};

/**
 * Get end of month in local time for database queries
 * @param date - The date to get end of month for
 * @returns Database format string for end of month
 */
export const getEndOfMonthForDB = (date: Date): string => {
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);
  return formatDateForDatabase(endOfMonth);
};

/**
 * Get date range for "today" in local time
 * This ensures that when querying for today's data, it matches the local timezone
 * @returns Object with start and end timestamps for today
 */
export const getTodayRangeForDB = (): { start: string; end: string } => {
  const now = new Date();
  return {
    start: getStartOfDayForDB(now),
    end: getEndOfDayForDB(now),
  };
};

/**
 * Get date range for a specific date in local time
 * @param date - The date to get range for
 * @returns Object with start and end timestamps for the date
 */
export const getDateRangeForDB = (
  date: Date
): { start: string; end: string } => {
  return {
    start: getStartOfDayForDB(date),
    end: getEndOfDayForDB(date),
  };
};

/**
 * Get date range for current month in local time
 * @returns Object with start and end timestamps for current month
 */
export const getCurrentMonthRangeForDB = (): { start: string; end: string } => {
  const now = new Date();
  return {
    start: getStartOfMonthForDB(now),
    end: getEndOfMonthForDB(now),
  };
};

/**
 * Get timezone-aware date range for a specific date
 * This accounts for the timezone offset where the local "day" spans across calendar dates
 *
 * For querying "23rd" data when timezone offset is -6:30:
 * - Local day starts at 17:30 on 22nd and ends at 17:30 on 23rd
 * - Query range: 2025-10-22 17:30:00 to 2025-10-23 17:30:00
 *
 * @param date - The date to get timezone-aware range for (e.g., Oct 23)
 * @param timezoneOffsetMinutes - Timezone offset in minutes (e.g., -390 for -6:30)
 * @returns Object with start and end timestamps accounting for timezone
 */
export const getTimezoneAwareDateRangeForDB = (
  date: Date,
  timezoneOffsetMinutes: number = -390 // Default to -6:30 offset
): { start: string; end: string } => {
  // For -6:30 timezone, the local day boundary is at 17:30
  // So when querying for "23rd", we want:
  // Start: 22nd 17:30:00 (previous day at boundary time)
  // End: 23rd 17:30:00 (target day at boundary time)

  // For -390 minutes (-6:30), the boundary time is 17:30 (24 - 6.5 = 17.5 hours)
  const totalOffsetHours = Math.abs(timezoneOffsetMinutes) / 60; // 6.5 hours for -390 minutes
  const boundaryHour = 24 - totalOffsetHours; // 24 - 6.5 = 17.5 hours = 17:30
  const boundaryHours = Math.floor(boundaryHour); // 17
  const boundaryMinutes = (boundaryHour % 1) * 60; // 0.5 * 60 = 30

  // Start of local day: previous calendar day at boundary time
  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - 1); // Previous day
  startDate.setHours(boundaryHours, boundaryMinutes, 0, 0); // 17:30:00

  // End of local day: target calendar day at boundary time
  const endDate = new Date(date);
  endDate.setHours(boundaryHours, boundaryMinutes, 0, 0); // 17:30:00

  return {
    start: formatDateForDatabase(startDate),
    end: formatDateForDatabase(endDate),
  };
};

/**
 * Get timezone-aware range for "today" based on current timezone offset
 * This ensures that when querying for today's sales, it includes sales that were
 * created in the local timezone but stored with UTC offset
 *
 * @param timezoneOffsetMinutes - Timezone offset in minutes (e.g., -390 for -6:30)
 * @returns Object with start and end timestamps for today accounting for timezone
 */
export const getTimezoneAwareTodayRangeForDB = (
  timezoneOffsetMinutes: number = -390
): { start: string; end: string } => {
  const today = new Date();
  return getTimezoneAwareDateRangeForDB(today, timezoneOffsetMinutes);
};

/**
 * Get timezone-aware range for current month
 * @param timezoneOffsetMinutes - Timezone offset in minutes (e.g., -390 for -6:30)
 * @returns Object with start and end timestamps for current month accounting for timezone
 */
export const getTimezoneAwareCurrentMonthRangeForDB = (
  timezoneOffsetMinutes: number = -390
): { start: string; end: string } => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // For -6:30 timezone, each local day starts at 17:30 of the previous calendar day
  const totalOffsetHours = Math.abs(timezoneOffsetMinutes) / 60; // 6.5 hours for -390 minutes
  const boundaryHour = 24 - totalOffsetHours; // 24 - 6.5 = 17.5 hours = 17:30
  const boundaryHours = Math.floor(boundaryHour); // 17
  const boundaryMinutes = (boundaryHour % 1) * 60; // 0.5 * 60 = 30

  // Start of month: previous day at boundary time
  const adjustedStart = new Date(startOfMonth);
  adjustedStart.setDate(adjustedStart.getDate() - 1); // Previous day
  adjustedStart.setHours(boundaryHours, boundaryMinutes, 0, 0); // 17:30:00

  // End of month: last day of month at boundary time
  const adjustedEnd = new Date(endOfMonth);
  adjustedEnd.setHours(boundaryHours, boundaryMinutes, 0, 0); // 17:30:00

  return {
    start: formatDateForDatabase(adjustedStart),
    end: formatDateForDatabase(adjustedEnd),
  };
};

/**
 * Get timezone-aware range for current year
 * @param timezoneOffsetMinutes - Timezone offset in minutes (e.g., -390 for -6:30)
 * @returns Object with start and end timestamps for current year accounting for timezone
 */
export const getTimezoneAwareCurrentYearRangeForDB = (
  timezoneOffsetMinutes: number = -390
): { start: string; end: string } => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1); // Jan 1
  const endOfYear = new Date(now.getFullYear(), 11, 31); // Dec 31

  // For -6:30 timezone, each local day starts at 17:30 of the previous calendar day
  const totalOffsetHours = Math.abs(timezoneOffsetMinutes) / 60; // 6.5 hours for -390 minutes
  const boundaryHour = 24 - totalOffsetHours; // 24 - 6.5 = 17.5 hours = 17:30
  const boundaryHours = Math.floor(boundaryHour); // 17
  const boundaryMinutes = (boundaryHour % 1) * 60; // 0.5 * 60 = 30

  // Start of year: Dec 31 of previous year at boundary time
  const adjustedStart = new Date(startOfYear);
  adjustedStart.setDate(adjustedStart.getDate() - 1); // Previous day (Dec 31 of prev year)
  adjustedStart.setHours(boundaryHours, boundaryMinutes, 0, 0); // 17:30:00

  // End of year: Dec 31 at boundary time
  const adjustedEnd = new Date(endOfYear);
  adjustedEnd.setHours(boundaryHours, boundaryMinutes, 0, 0); // 17:30:00

  return {
    start: formatDateForDatabase(adjustedStart),
    end: formatDateForDatabase(adjustedEnd),
  };
};

/**
 * Get timezone-aware range for a specific month and year
 * @param year - The year (e.g., 2025)
 * @param month - The month (0-11, where 0 = January)
 * @param timezoneOffsetMinutes - Timezone offset in minutes (e.g., -390 for -6:30)
 * @returns Object with start and end timestamps for the specified month accounting for timezone
 */
export const getTimezoneAwareMonthRangeForDB = (
  year: number,
  month: number,
  timezoneOffsetMinutes: number = -390
): { start: string; end: string } => {
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);

  // For -6:30 timezone, each local day starts at 17:30 of the previous calendar day
  const totalOffsetHours = Math.abs(timezoneOffsetMinutes) / 60; // 6.5 hours for -390 minutes
  const boundaryHour = 24 - totalOffsetHours; // 24 - 6.5 = 17.5 hours = 17:30
  const boundaryHours = Math.floor(boundaryHour); // 17
  const boundaryMinutes = (boundaryHour % 1) * 60; // 0.5 * 60 = 30

  // Start of month: previous day at boundary time
  const adjustedStart = new Date(startOfMonth);
  adjustedStart.setDate(adjustedStart.getDate() - 1); // Previous day
  adjustedStart.setHours(boundaryHours, boundaryMinutes, 0, 0); // 17:30:00

  // End of month: last day of month at boundary time
  const adjustedEnd = new Date(endOfMonth);
  adjustedEnd.setHours(boundaryHours, boundaryMinutes, 0, 0); // 17:30:00

  return {
    start: formatDateForDatabase(adjustedStart),
    end: formatDateForDatabase(adjustedEnd),
  };
};
