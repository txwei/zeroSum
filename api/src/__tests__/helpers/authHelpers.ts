import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

/**
 * Generate a JWT token for a test user
 */
export function generateTestToken(userId: string | mongoose.Types.ObjectId): string {
  return jwt.sign(
    { userId: userId.toString() },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Create an authorization header with a test token
 */
export function createAuthHeader(userId: string | mongoose.Types.ObjectId): string {
  const token = generateTestToken(userId);
  return `Bearer ${token}`;
}

