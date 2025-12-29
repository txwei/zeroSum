// Utility to safely access import.meta.env in both Vite and Jest
// In Jest, import.meta causes parsing errors, so we check for test environment first

/**
 * Get a value from import.meta.env, with fallback for Jest
 */
export function getEnvVar(key: string, defaultValue: string = ''): string {
  // In test environment, return default value
  const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  if (isTest) {
    return defaultValue;
  }
  
  // In Vite (non-test), try to access import.meta.env
  try {
    // Use Function constructor to avoid Jest static analysis
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - import.meta is available in Vite
    const getEnv = new Function('key', 'return typeof import !== "undefined" && import.meta && import.meta.env ? import.meta.env[key] : undefined');
    const value = getEnv(key);
    return value || defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Get BASE_URL from import.meta.env
 */
export function getBasePath(): string {
  return getEnvVar('BASE_URL', '/');
}

/**
 * Get VITE_API_URL from import.meta.env
 */
export function getApiUrl(): string | undefined {
  const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  if (isTest) {
    return undefined;
  }
  
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - import.meta is available in Vite
    const getEnv = new Function('return typeof import !== "undefined" && import.meta && import.meta.env ? import.meta.env.VITE_API_URL : undefined');
    return getEnv();
  } catch {
    return undefined;
  }
}

/**
 * Check if we're in development mode
 */
export function isDev(): boolean {
  const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  if (isTest) {
    return false;
  }
  
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - import.meta is available in Vite
    const getEnv = new Function('return typeof import !== "undefined" && import.meta && import.meta.env ? import.meta.env.DEV : false');
    return getEnv() === true;
  } catch {
    return false;
  }
}

