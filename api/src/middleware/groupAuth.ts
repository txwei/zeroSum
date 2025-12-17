import { Response } from 'express';
import { Group } from '../models/Group';
import { AuthRequest } from './auth';

/**
 * Helper function to check if a user is a member of a group
 * Works with both populated and unpopulated memberIds
 */
export const isGroupMember = (group: any, userId: string): boolean => {
  if (!group || !userId) return false;

  return group.memberIds.some((memberId: any) => {
    // Handle both ObjectId and populated user object
    const memberIdStr = memberId._id ? memberId._id.toString() : memberId.toString();
    return memberIdStr === userId;
  });
};

/**
 * Middleware to verify user is a member of a group
 */
export const verifyGroupMembership = async (
  req: AuthRequest,
  res: Response,
  next: () => void,
  groupId: string
): Promise<void> => {
  try {
    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    const userId = req.userId?.toString();
    if (!isGroupMember(group, userId || '')) {
      res.status(403).json({ error: 'Not a member of this group' });
      return;
    }

    next();
  } catch (error) {
    console.error('Group membership verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Check if user is admin of a group
 */
export const isGroupAdmin = (group: any, userId: string): boolean => {
  if (!group || !userId) return false;
  return group.createdByUserId.toString() === userId;
};

