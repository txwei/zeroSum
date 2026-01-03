import { AuthRequest } from '../middleware/auth';

/**
 * Check if the current user is a super user (admin of all groups)
 * Super user username: "wtx"
 */
export const isSuperUser = (req: AuthRequest): boolean => {
  if (!req.user) {
    return false;
  }
  return req.user.username === 'wtx';
};

