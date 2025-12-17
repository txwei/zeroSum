import { Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { User } from '../../models/User';
import { createTestUser } from '../helpers/testHelpers';
import { generateTestToken } from '../helpers/authHelpers';
import jwt from 'jsonwebtoken';

describe('Authentication Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Valid token', () => {
    it('should call next() when valid token is provided', async () => {
      const user = await createTestUser();
      const token = generateTestToken(user._id);

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.userId).toBe(user._id.toString());
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('Invalid/missing token', () => {
    it('should return 401 when no token is provided', async () => {
      mockRequest.headers = {};

      await authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      await authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid token',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not found', async () => {
      // Create a valid ObjectId that doesn't exist in the database
      const { Types } = await import('mongoose');
      const nonExistentId = new Types.ObjectId();
      const token = generateTestToken(nonExistentId);

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User not found',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('Expired token', () => {
    it('should return 401 when token is expired', async () => {
      const expiredToken = jwt.sign(
        { userId: '507f1f77bcf86cd799439011' },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      mockRequest.headers = {
        authorization: `Bearer ${expiredToken}`,
      };

      await authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid token',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});

