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
  
  // Use eval to prevent Jest from parsing import.meta at compile time
  // In Vite, this will work normally
  try {
    // eslint-disable-next-line no-eval
    return eval('import.meta.env.BASE_URL') || '/';
  } catch {
    return '/';
  }
}

/**
 * Get VITE_API_URL from import.meta.env
 */
export function getApiUrl(): string | undefined {
  // In test environment, return undefined
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return undefined;
  }
  
  // Use eval to prevent Jest from parsing import.meta at compile time
  // In Vite, this will work normally
  try {
    // eslint-disable-next-line no-eval
    return eval('import.meta.env.VITE_API_URL');
  } catch {
    return undefined;
  }
}

/**
 * Check if we're in development mode
 */
export function isDev(): boolean {
  // In test environment, return false
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return false;
  }
  
  // Use eval to prevent Jest from parsing import.meta at compile time
  // In Vite, this will work normally
  try {
    // eslint-disable-next-line no-eval
    return eval('import.meta.env.DEV') === true;
  } catch {
    return false;
  }
}

