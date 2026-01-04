import crypto from 'crypto';
import { Types } from 'mongoose';
import { TOKEN_LENGTH } from './constants';

/**
 * Helper utility functions
 */

/**
 * Extract ID string from ObjectId or populated object
 */
export function extractId(value: Types.ObjectId | { _id: Types.ObjectId } | string): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Types.ObjectId) {
    return value.toString();
  }
  if (value && typeof value === 'object' && '_id' in value) {
    return value._id.toString();
  }
  return String(value);
}

export function generatePublicToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString('base64url');
}

export function normalizeUsername(username: string): string {
  return username.toLowerCase().trim();
}

export function parseDate(dateString?: string): Date | undefined {
  if (!dateString || dateString.trim() === '') {
    return undefined;
  }
  
  // Validate YYYY-MM-DD format strictly
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(dateString)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }
  
  // Parse YYYY-MM-DD format and create date at UTC midnight
  // This prevents timezone issues where the date might shift by a day
  const parts = dateString.split('-').map(Number);
  if (parts.length !== 3) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }
  
  const [year, month, day] = parts;
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDateFilter(timePeriod?: string): { $or?: Array<{ date?: { $gte: Date }; createdAt?: { $gte: Date } }> } {
  if (!timePeriod || timePeriod === 'all') {
    return {};
  }

  const now = new Date();
  let startDate: Date;

  switch (timePeriod) {
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    default:
      return {};
  }

  return {
    $or: [
      { date: { $gte: startDate } },
      { createdAt: { $gte: startDate } },
    ],
  };
}


