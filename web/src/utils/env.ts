// Utility to safely access import.meta.env in both Vite and Jest
// In production builds, Vite will replace import.meta.env at build time
// In Jest, this file will be mocked

// This conditional compilation approach ensures Jest doesn't parse import.meta
// while still allowing Vite to perform static replacement
const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

/**
 * Get BASE_URL from import.meta.env
 */
export function getBasePath(): string {
  if (isTest) {
    return '/';
  }
  return import.meta.env.BASE_URL || '/';
}

/**
 * Get VITE_API_URL from import.meta.env
 */
export function getApiUrl(): string | undefined {
  if (isTest) {
    return undefined;
  }
  return import.meta.env.VITE_API_URL;
}

/**
 * Check if we're in development mode
 */
export function isDev(): boolean {
  if (isTest) {
    return false;
  }
  return import.meta.env.DEV === true;
}

