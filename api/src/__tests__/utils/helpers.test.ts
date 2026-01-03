import {
  generatePublicToken,
  normalizeUsername,
  parseDate,
  formatDate,
  getDateFilter,
} from '../../utils/helpers';

describe('helpers', () => {
  describe('generatePublicToken', () => {
    it('should generate a token', () => {
      const token = generatePublicToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate unique tokens', () => {
      const token1 = generatePublicToken();
      const token2 = generatePublicToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('normalizeUsername', () => {
    it('should lowercase and trim username', () => {
      expect(normalizeUsername('  USERNAME  ')).toBe('username');
      expect(normalizeUsername('UserName')).toBe('username');
    });
  });

  describe('parseDate', () => {
    it('should parse YYYY-MM-DD format', () => {
      const date = parseDate('2024-01-15');
      expect(date).toBeInstanceOf(Date);
      expect(date?.getUTCFullYear()).toBe(2024);
      expect(date?.getUTCMonth()).toBe(0); // January is 0
      expect(date?.getUTCDate()).toBe(15);
    });

    it('should return undefined for empty string', () => {
      expect(parseDate('')).toBeUndefined();
      expect(parseDate('   ')).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(parseDate(undefined)).toBeUndefined();
    });

    it('should throw error for invalid format', () => {
      expect(() => parseDate('invalid')).toThrow();
      expect(() => parseDate('2024-1-15')).toThrow();
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date(Date.UTC(2024, 0, 15));
      const formatted = formatDate(date);
      expect(formatted).toMatch(/2024.*01.*15|1\/15\/2024|15\/1\/2024/); // Format depends on locale
    });
  });

  describe('getDateFilter', () => {
    it('should return empty object for "all"', () => {
      const filter = getDateFilter('all');
      expect(filter).toEqual({});
    });

    it('should return empty object for undefined', () => {
      const filter = getDateFilter(undefined);
      expect(filter).toEqual({});
    });

    it('should return date filter for "30d"', () => {
      const filter = getDateFilter('30d');
      expect(filter).toHaveProperty('$or');
      expect(filter.$or).toBeDefined();
    });

    it('should return date filter for "90d"', () => {
      const filter = getDateFilter('90d');
      expect(filter).toHaveProperty('$or');
    });

    it('should return date filter for "year"', () => {
      const filter = getDateFilter('year');
      expect(filter).toHaveProperty('$or');
    });

    it('should return empty object for invalid period', () => {
      const filter = getDateFilter('invalid');
      expect(filter).toEqual({});
    });
  });
});

