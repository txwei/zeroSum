import jwt from 'jsonwebtoken';
import { Request } from 'express';

/**
 * Extract user ID from optional authentication token
 * Returns null if no token or invalid token
 */
export function getOptionalUserId(req: Request): string | null {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as {
      userId: string;
    };
    return decoded.userId;
  } catch (error) {
    // Invalid token, return null
    return null;
  }
}


