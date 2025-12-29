// Utility to safely access import.meta.env in both Vite and Jest
// In production builds, Vite will replace import.meta.env at build time
// In Jest, we check for test environment and return defaults

/**
 * Get BASE_URL from import.meta.env
 */
export function getBasePath(): string {
  // In test environment, return default value
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return '/';
  }
  
  // In Vite, import.meta.env.BASE_URL will be replaced at build time
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - import.meta is available in Vite but not in Jest (handled above)
  return import.meta.env.BASE_URL || '/';
}

/**
 * Get VITE_API_URL from import.meta.env
 */
export function getApiUrl(): string | undefined {
  // In test environment, return undefined
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return undefined;
  }
  
  // In Vite, import.meta.env.VITE_API_URL will be replaced at build time
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - import.meta is available in Vite but not in Jest (handled above)
  return import.meta.env.VITE_API_URL;
}

/**
 * Check if we're in development mode
 */
export function isDev(): boolean {
  // In test environment, return false
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return false;
  }
  
  // In Vite, import.meta.env.DEV will be replaced at build time
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - import.meta is available in Vite but not in Jest (handled above)
  return import.meta.env.DEV === true;
}

