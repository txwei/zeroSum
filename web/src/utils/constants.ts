/**
 * Application constants
 * Centralized location for all magic numbers and strings
 */

// Timing constants (in milliseconds)
export const TIMING = {
  DEBOUNCE_SAVE: 200,
  STATE_UPDATE_DELAY: 100,
  BLUR_DELAY: 300,
  PREFETCH_DELAY: 200,
  RETRY_DELAY: 1000,
  ERROR_DISPLAY_DURATION: 5000,
} as const;

// Validation constants
export const VALIDATION = {
  ZERO_SUM_TOLERANCE: 0.01,
  MOBILE_BREAKPOINT: 640,
} as const;

// Currency options
export type Currency = 'USD' | 'CNY';

export const CURRENCIES: Currency[] = ['USD', 'CNY'];

// Currency symbols
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  CNY: '¥',
};

// Currency locales
export const CURRENCY_LOCALES: Record<Currency, string> = {
  USD: 'en-US',
  CNY: 'zh-CN',
};

