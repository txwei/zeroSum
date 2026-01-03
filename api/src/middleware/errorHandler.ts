import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/errors';
import { logger } from '../utils/logger';

/**
 * Centralized error handling middleware
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error
  if (err instanceof AppError && err.isOperational) {
    logger.warn('Operational error', {
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.error('Unexpected error', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  // Determine status code
  const statusCode = err instanceof AppError ? err.statusCode : 500;

  // Prepare error response
  const errorResponse: any = {
    error: err.message || 'Internal server error',
  };

  // Add details in development
  if (process.env.NODE_ENV === 'development' && !(err instanceof AppError)) {
    errorResponse.details = err.stack;
  }

  // Add additional error properties if they exist
  if (err instanceof AppError && (err as any).duplicates) {
    errorResponse.duplicates = (err as any).duplicates;
  }

  if (err instanceof AppError && (err as any).currentSum !== undefined) {
    errorResponse.currentSum = (err as any).currentSum;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};


