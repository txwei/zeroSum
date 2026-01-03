/**
 * Tests for constants
 */
import { TIMING, VALIDATION, CURRENCY_SYMBOLS, CURRENCY_LOCALES } from '../../utils/constants';

describe('Constants', () => {
  describe('TIMING', () => {
    it('should have all timing constants defined', () => {
      expect(TIMING.DEBOUNCE_SAVE).toBe(200);
      expect(TIMING.STATE_UPDATE_DELAY).toBe(100);
      expect(TIMING.BLUR_DELAY).toBe(300);
      expect(TIMING.PREFETCH_DELAY).toBe(200);
      expect(TIMING.RETRY_DELAY).toBe(1000);
      expect(TIMING.ERROR_DISPLAY_DURATION).toBe(5000);
    });
  });

  describe('VALIDATION', () => {
    it('should have all validation constants defined', () => {
      expect(VALIDATION.ZERO_SUM_TOLERANCE).toBe(0.01);
      expect(VALIDATION.MOBILE_BREAKPOINT).toBe(640);
    });
  });

  describe('CURRENCY_SYMBOLS', () => {
    it('should have correct currency symbols', () => {
      expect(CURRENCY_SYMBOLS.USD).toBe('$');
      expect(CURRENCY_SYMBOLS.CNY).toBe('¥');
    });
  });

  describe('CURRENCY_LOCALES', () => {
    it('should have correct currency locales', () => {
      expect(CURRENCY_LOCALES.USD).toBe('en-US');
      expect(CURRENCY_LOCALES.CNY).toBe('zh-CN');
    });
  });
});

