import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../types/errors';
import { validateObjectId, validateRequired, validateString, validateArray } from '../utils/validators';

/**
 * Validation middleware factory
 */
export const validate = (schema: {
  body?: Record<string, (value: any) => void>;
  params?: Record<string, (value: any) => void>;
  query?: Record<string, (value: any) => void>;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate body
      if (schema.body) {
        Object.entries(schema.body).forEach(([key, validator]) => {
          if (req.body[key] !== undefined) {
            validator(req.body[key]);
          }
        });
      }

      // Validate params
      if (schema.params) {
        Object.entries(schema.params).forEach(([key, validator]) => {
          if (req.params[key]) {
            validator(req.params[key]);
          }
        });
      }

      // Validate query
      if (schema.query) {
        Object.entries(schema.query).forEach(([key, validator]) => {
          if (req.query[key]) {
            validator(req.query[key]);
          }
        });
      }

      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  };
};

/**
 * Common validation functions for middleware
 */
export const validateId = (value: any): void => {
  validateObjectId(value, 'ID');
};

export const validateRequiredString = (value: any): void => {
  validateRequired(value, 'Field');
  validateString(value, 'Field');
};

export const validateOptionalString = (value: any): void => {
  if (value !== undefined) {
    validateString(value, 'Field');
  }
};

export const validateRequiredArray = (value: any): void => {
  validateRequired(value, 'Field');
  validateArray(value, 'Field');
};

export const validateNumber = (value: any): void => {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError('Field must be a valid number');
  }
};

