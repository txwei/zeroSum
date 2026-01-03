/**
 * Application constants
 */

export const ZERO_SUM_TOLERANCE = 0.01;
export const JWT_EXPIRY = '7d';
export const BCRYPT_ROUNDS = 10;
export const MAX_TOKEN_GENERATION_ATTEMPTS = 3;
export const TOKEN_LENGTH = 8;
export const MIN_PASSWORD_LENGTH = 6;
export const MIN_USERNAME_LENGTH = 3;
export const MAX_SEARCH_RESULTS = 10;

export const TIME_PERIODS = {
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
  'year': 365 * 24 * 60 * 60 * 1000,
} as const;

export const SUPER_USER_USERNAME = 'twei';


