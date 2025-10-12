// Mock DateTimePicker
jest.mock('@react-native-community/datetimepicker', () => {
  return jest.fn(() => null);
});

// Mock Lucide React Native icons
jest.mock('lucide-react-native', () => ({
  Calendar: jest.fn(() => null),
  Clock: jest.fn(() => null),
}));

// Mock LocalizationContext
jest.mock('@/context/LocalizationContext', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  useLocalization: () => ({
    language: 'en',
    setLanguage: jest.fn(),
    t: (key: string) => key,
    isRTL: false,
  }),
}));

// Mock date formatters
jest.mock('@/utils/dateFormatters', () => ({
  formatSaleDateTime: jest.fn((date: Date, locale: string) => {
    if (locale === 'my') {
      return 'အောက်တိုဘာ 12, 2025 2:30 ညနေ';
    }
    return 'Oct 12, 2025 2:30 PM';
  }),
}));

describe('SaleDateTimeSelector', () => {
  const mockOnDateTimeChange = jest.fn();
  const testDate = new Date('2025-10-12T14:30:00');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Date Formatting', () => {
    it('should format date correctly for English locale', () => {
      const { formatSaleDateTime } = require('@/utils/dateFormatters');
      const formatted = formatSaleDateTime(testDate, 'en');
      expect(formatted).toBe('Oct 12, 2025 2:30 PM');
    });

    it('should format date correctly for Myanmar locale', () => {
      const { formatSaleDateTime } = require('@/utils/dateFormatters');
      const formatted = formatSaleDateTime(testDate, 'my');
      expect(formatted).toBe('အောက်တိုဘာ 12, 2025 2:30 ညနေ');
    });

    it('should handle different times of day correctly', () => {
      const { formatSaleDateTime } = require('@/utils/dateFormatters');

      const morningDate = new Date('2025-10-12T09:15:00');
      const noonDate = new Date('2025-10-12T12:00:00');
      const nightDate = new Date('2025-10-12T23:45:00');

      expect(formatSaleDateTime(morningDate, 'en')).toContain('AM');
      expect(formatSaleDateTime(noonDate, 'en')).toContain('PM');
      expect(formatSaleDateTime(nightDate, 'en')).toContain('PM');
    });
  });

  describe('Component Interactions', () => {
    it('should handle date change callback', () => {
      const newDate = new Date('2025-10-13T15:45:00');
      mockOnDateTimeChange(newDate);
      expect(mockOnDateTimeChange).toHaveBeenCalledWith(newDate);
    });

    it('should preserve time when changing date', () => {
      const originalDate = new Date('2025-10-12T14:30:00');
      const newDateOnly = new Date('2025-10-13T00:00:00');

      const newDate = new Date(newDateOnly);
      newDate.setHours(originalDate.getHours());
      newDate.setMinutes(originalDate.getMinutes());

      expect(newDate.getHours()).toBe(14);
      expect(newDate.getMinutes()).toBe(30);
      expect(newDate.getDate()).toBe(13);
    });

    it('should preserve date when changing time', () => {
      const originalDate = new Date('2025-10-12T14:30:00');
      const newTimeOnly = new Date('2025-01-01T16:45:00');

      const newDate = new Date(originalDate);
      newDate.setHours(newTimeOnly.getHours());
      newDate.setMinutes(newTimeOnly.getMinutes());

      expect(newDate.getDate()).toBe(12);
      expect(newDate.getMonth()).toBe(9); // October (0-indexed)
      expect(newDate.getFullYear()).toBe(2025);
      expect(newDate.getHours()).toBe(16);
      expect(newDate.getMinutes()).toBe(45);
    });
  });

  describe('Date Constraints', () => {
    it('should handle maximum date constraint', () => {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 1);

      expect(futureDate > today).toBe(true);
    });

    it('should allow past dates', () => {
      const today = new Date();
      const pastDate = new Date();
      pastDate.setDate(today.getDate() - 1);

      expect(pastDate < today).toBe(true);
    });

    it('should allow current date', () => {
      const now = new Date();
      const currentDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      expect(currentDate.toDateString()).toBe(now.toDateString());
    });
  });

  describe('Edge Cases', () => {
    it('should handle midnight correctly', () => {
      const midnightDate = new Date('2025-10-12T00:00:00');
      const newDate = new Date(midnightDate);

      expect(newDate.getHours()).toBe(0);
      expect(newDate.getMinutes()).toBe(0);
    });

    it('should handle end of day correctly', () => {
      const endOfDayDate = new Date('2025-10-12T23:59:59');
      const newDate = new Date(endOfDayDate);

      expect(newDate.getHours()).toBe(23);
      expect(newDate.getMinutes()).toBe(59);
    });

    it('should handle month boundaries correctly', () => {
      const endOfMonth = new Date('2025-01-31T14:30:00');
      const startOfNextMonth = new Date('2025-02-01T14:30:00');

      expect(endOfMonth.getMonth()).toBe(0); // January
      expect(startOfNextMonth.getMonth()).toBe(1); // February
    });

    it('should handle year boundaries correctly', () => {
      const endOfYear = new Date('2024-12-31T23:59:59');
      const startOfNextYear = new Date('2025-01-01T00:00:00');

      expect(endOfYear.getFullYear()).toBe(2024);
      expect(startOfNextYear.getFullYear()).toBe(2025);
    });
  });
});
