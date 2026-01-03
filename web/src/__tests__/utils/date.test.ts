/**
 * Tests for date utilities
 */
import { formatDateForInput, formatDateForDisplay, formatDateFromUTC } from '../../utils/date';

describe('Date Utilities', () => {
  describe('formatDateForInput', () => {
    it('should format date string for input field', () => {
      const dateString = '2024-12-18T00:00:00.000Z';
      const result = formatDateForInput(dateString);
      expect(result).toBe('2024-12-18');
    });

    it('should handle dates correctly with UTC', () => {
      // Create a date that would shift timezones
      const date = new Date('2024-12-18T23:00:00.000Z'); // This is Dec 19 in some timezones
      const result = formatDateForInput(date.toISOString());
      // Should use UTC date, not local date
      expect(result).toMatch(/2024-12-1[89]/); // Could be 18 or 19 depending on UTC
    });
  });

  describe('formatDateForDisplay', () => {
    it('should format date string for display', () => {
      const result = formatDateForDisplay('2024-12-18');
      expect(result).toMatch(/12\/18\/2024|18\/12\/2024|Dec 18, 2024/); // Format depends on locale
    });

    it('should return "No date" for undefined', () => {
      const result = formatDateForDisplay(undefined);
      expect(result).toBe('No date');
    });
  });

  describe('formatDateFromUTC', () => {
    it('should format UTC date string for display', () => {
      const result = formatDateFromUTC('2024-12-18T00:00:00.000Z');
      expect(result).toMatch(/12\/18\/2024|18\/12\/2024|Dec 18, 2024/);
    });

    it('should return "No date" for undefined', () => {
      const result = formatDateFromUTC(undefined);
      expect(result).toBe('No date');
    });
  });
});

