import mongoose from 'mongoose';
import { ValidationError } from '../types/errors';

/**
 * Validation utility functions
 */

export function validateObjectId(id: string, fieldName: string = 'ID'): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError(`Invalid ${fieldName}`);
  }
}

export function validateRequired(value: any, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`);
  }
}

export function validateString(value: any, fieldName: string, minLength?: number, maxLength?: number): void {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  if (minLength !== undefined && value.length < minLength) {
    throw new ValidationError(`${fieldName} must be at least ${minLength} characters`);
  }
  if (maxLength !== undefined && value.length > maxLength) {
    throw new ValidationError(`${fieldName} must be at most ${maxLength} characters`);
  }
}

export function validateNumber(value: any, fieldName: string, min?: number, max?: number): void {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError(`${fieldName} must be a valid number`);
  }
  if (min !== undefined && value < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`);
  }
  if (max !== undefined && value > max) {
    throw new ValidationError(`${fieldName} must be at most ${max}`);
  }
}

export function validateArray(value: any, fieldName: string, minLength?: number): void {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`);
  }
  if (minLength !== undefined && value.length < minLength) {
    throw new ValidationError(`${fieldName} must have at least ${minLength} items`);
  }
}

export function validateZeroSum(transactions: Array<{ amount: number }>, tolerance: number = 0.01): void {
  const sum = transactions.reduce((acc, t) => acc + (t.amount || 0), 0);
  if (Math.abs(sum) > tolerance) {
    throw new ValidationError(`Transactions must sum to zero (current sum: ${sum.toFixed(2)})`);
  }
}

export function validatePassword(password: string): void {
  if (!password || password.length < 6) {
    throw new ValidationError('Password must be at least 6 characters');
  }
}

export function validateUsername(username: string): void {
  if (!username || username.trim().length === 0) {
    throw new ValidationError('Username is required');
  }
  if (username.length < 3) {
    throw new ValidationError('Username must be at least 3 characters');
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new ValidationError('Username can only contain letters, numbers, and underscores');
  }
}

export function validateDisplayName(displayName: string): void {
  if (!displayName || displayName.trim().length === 0) {
    throw new ValidationError('Display name is required');
  }
  if (displayName.length < 1) {
    throw new ValidationError('Display name cannot be empty');
  }
}


