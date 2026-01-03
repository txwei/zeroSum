import { Request, Response, NextFunction } from 'express';
import { errorHandler, asyncHandler } from '../../middleware/errorHandler';
import { AppError, ValidationError, NotFoundError } from '../../types/errors';

describe('errorHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      path: '/test',
      method: 'GET',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  it('should handle AppError correctly', () => {
    const error = new ValidationError('Test validation error');

    errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Test validation error',
    });
  });

  it('should handle NotFoundError correctly', () => {
    const error = new NotFoundError('Resource');

    errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Resource not found',
    });
  });

  it('should handle generic Error with 500 status', () => {
    const error = new Error('Generic error');

    errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Generic error',
    });
  });

  it('should include details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const error = new Error('Test error');
    error.stack = 'Error stack trace';

    errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Test error',
      details: 'Error stack trace',
    });

    process.env.NODE_ENV = originalEnv;
  });

  it('should include additional error properties', () => {
    const error = new ValidationError('Test error');
    (error as any).duplicates = ['duplicate1', 'duplicate2'];

    errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Test error',
      duplicates: ['duplicate1', 'duplicate2'],
    });
  });
});

describe('asyncHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {};
    mockNext = jest.fn();
  });

  it('should handle async function successfully', async () => {
    const asyncFn = jest.fn().mockResolvedValue(undefined);
    const handler = asyncHandler(asyncFn);

    await handler(mockRequest as Request, mockResponse as Response, mockNext);

    expect(asyncFn).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should catch errors and pass to next', async () => {
    const error = new Error('Test error');
    const asyncFn = jest.fn().mockRejectedValue(error);
    const handler = asyncHandler(asyncFn);

    await handler(mockRequest as Request, mockResponse as Response, mockNext);

    expect(asyncFn).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledWith(error);
  });
});

