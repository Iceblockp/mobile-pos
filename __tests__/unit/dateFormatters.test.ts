import {
  formatSaleDateTime,
  getLocalizedMonths,
  getLocalizedDays,
} from '@/utils/dateFormatters';

describe('Date Formatters', () => {
  const testDate = new Date('2025-10-12T14:30:00'); // October 12, 2025, 2:30 PM

  describe('formatSaleDateTime', () => {
    it('should format date correctly for English locale', () => {
      const formatted = formatSaleDateTime(testDate, 'en');
      expect(formatted).toMatch(/Oct 12, 2025/);
      expect(formatted).toMatch(/2:30 PM/);
    });

    it('should format date correctly for Myanmar locale', () => {
      const formatted = formatSaleDateTime(testDate, 'my');
      expect(formatted).toContain('အောက်တိုဘာ');
      expect(formatted).toContain('12');
      expect(formatted).toContain('2025');
      expect(formatted).toContain('2:30');
      expect(formatted).toContain('ညနေ');
    });

    it('should default to English locale when no locale specified', () => {
      const formatted = formatSaleDateTime(testDate);
      expect(formatted).toMatch(/Oct 12, 2025/);
      expect(formatted).toMatch(/2:30 PM/);
    });

    it('should handle morning time correctly in Myanmar locale', () => {
      const morningDate = new Date('2025-10-12T09:15:00'); // 9:15 AM
      const formatted = formatSaleDateTime(morningDate, 'my');
      expect(formatted).toContain('9:15');
      expect(formatted).toContain('နံနက်');
    });

    it('should handle midnight correctly in Myanmar locale', () => {
      const midnightDate = new Date('2025-10-12T00:00:00'); // 12:00 AM
      const formatted = formatSaleDateTime(midnightDate, 'my');
      expect(formatted).toContain('12:00');
      expect(formatted).toContain('နံနက်');
    });

    it('should handle noon correctly in Myanmar locale', () => {
      const noonDate = new Date('2025-10-12T12:00:00'); // 12:00 PM
      const formatted = formatSaleDateTime(noonDate, 'my');
      expect(formatted).toContain('12:00');
      expect(formatted).toContain('ညနေ');
    });

    it('should handle all months correctly in Myanmar locale', () => {
      const months = [
        { month: 0, expected: 'ဇန်နဝါရီ' },
        { month: 1, expected: 'ဖေဖော်ဝါရီ' },
        { month: 2, expected: 'မတ်' },
        { month: 3, expected: 'ဧပြီ' },
        { month: 4, expected: 'မေ' },
        { month: 5, expected: 'ဇွန်' },
        { month: 6, expected: 'ဇူလိုင်' },
        { month: 7, expected: 'သြဂုတ်' },
        { month: 8, expected: 'စက်တင်ဘာ' },
        { month: 9, expected: 'အောက်တိုဘာ' },
        { month: 10, expected: 'နိုဝင်ဘာ' },
        { month: 11, expected: 'ဒီဇင်ဘာ' },
      ];

      months.forEach(({ month, expected }) => {
        const date = new Date(2025, month, 15, 14, 30);
        const formatted = formatSaleDateTime(date, 'my');
        expect(formatted).toContain(expected);
      });
    });

    it('should handle hour conversion correctly in Myanmar locale', () => {
      const testCases = [
        { hour: 0, expected: '12', period: 'နံနက်' }, // 12 AM
        { hour: 1, expected: '1', period: 'နံနက်' }, // 1 AM
        { hour: 11, expected: '11', period: 'နံနက်' }, // 11 AM
        { hour: 12, expected: '12', period: 'ညနေ' }, // 12 PM
        { hour: 13, expected: '1', period: 'ညနေ' }, // 1 PM
        { hour: 23, expected: '11', period: 'ညနေ' }, // 11 PM
      ];

      testCases.forEach(({ hour, expected, period }) => {
        const date = new Date(2025, 9, 12, hour, 30);
        const formatted = formatSaleDateTime(date, 'my');
        expect(formatted).toContain(`${expected}:30`);
        expect(formatted).toContain(period);
      });
    });

    it('should pad minutes correctly', () => {
      const testCases = [
        { minutes: 0, expected: '00' },
        { minutes: 5, expected: '05' },
        { minutes: 15, expected: '15' },
        { minutes: 59, expected: '59' },
      ];

      testCases.forEach(({ minutes, expected }) => {
        const date = new Date(2025, 9, 12, 14, minutes);
        const formatted = formatSaleDateTime(date, 'my');
        expect(formatted).toContain(`:${expected}`);
      });
    });
  });

  describe('getLocalizedMonths', () => {
    it('should return English month names for English locale', () => {
      const months = getLocalizedMonths('en');
      expect(months).toHaveLength(12);
      expect(months[0]).toBe('January');
      expect(months[11]).toBe('December');
    });

    it('should return Myanmar month names for Myanmar locale', () => {
      const months = getLocalizedMonths('my');
      expect(months).toHaveLength(12);
      expect(months[0]).toBe('ဇန်နဝါရီ');
      expect(months[11]).toBe('ဒီဇင်ဘာ');
    });
  });

  describe('getLocalizedDays', () => {
    it('should return English day names for English locale', () => {
      const days = getLocalizedDays('en');
      expect(days).toHaveLength(7);
      expect(days[0]).toBe('Sunday');
      expect(days[6]).toBe('Saturday');
    });

    it('should return Myanmar day names for Myanmar locale', () => {
      const days = getLocalizedDays('my');
      expect(days).toHaveLength(7);
      expect(days[0]).toBe('တနင်္ဂနွေ');
      expect(days[6]).toBe('စနေ');
    });
  });
});
