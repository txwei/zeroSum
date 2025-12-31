import express, { Response, Request } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Group } from '../models/Group';
import { User } from '../models/User';
import { isGroupMember } from '../middleware/groupAuth';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Create group
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, isPublic } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Group name is required' });
      return;
    }

    const group = new Group({
      name: name.trim(),
      description: description?.trim(),
      createdByUserId: req.userId,
      memberIds: [req.userId], // Creator is automatically added
      isPublic: isPublic !== undefined ? Boolean(isPublic) : true, // Default to public
    });

    await group.save();
    await group.populate('createdByUserId', 'username displayName');
    await group.populate('memberIds', 'username displayName');

    res.status(201).json(group);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List all groups - public groups for everyone, private groups only for members
router.get('/', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    let userId: string | null = null;

    // Try to get user ID if token is provided (optional auth)
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as {
          userId: string;
        };
        userId = decoded.userId;
      } catch (error) {
        // Invalid token, continue as unauthenticated
      }
    }

    // Build query: public groups OR groups where user is a member
    let query: any = { isPublic: true };
    if (userId) {
      query = {
        $or: [
          { isPublic: true },
          { memberIds: new mongoose.Types.ObjectId(userId) },
        ],
      };
    }

    const groups = await Group.find(query)
      .populate('createdByUserId', 'username displayName')
      .populate('memberIds', 'username displayName')
      .sort({ createdAt: -1 });

    res.json(groups);
  } catch (error) {
    console.error('List groups error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update group name, description, or isPublic
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, isPublic } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid group ID' });
      return;
    }

    const group = await Group.findById(id);
    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    // Check if user is admin
    if (group.createdByUserId.toString() !== req.userId) {
      res.status(403).json({ error: 'Only admin can update the group' });
      return;
    }

    if (name !== undefined) {
      if (!name.trim()) {
        res.status(400).json({ error: 'Group name cannot be empty' });
        return;
      }
      group.name = name.trim();
    }

    if (description !== undefined) {
      group.description = description?.trim();
    }

    if (isPublic !== undefined) {
      group.isPublic = Boolean(isPublic);
    }

    await group.save();
    await group.populate('createdByUserId', 'username displayName');
    await group.populate('memberIds', 'username displayName');

    res.json(group);
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get group details - public groups accessible without auth, private groups require membership
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid group ID' });
      return;
    }

    const group = await Group.findById(req.params.id);

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    // Check if group is public
    if (group.isPublic) {
      // Public group - allow access without authentication
      await group.populate('createdByUserId', 'username displayName');
      await group.populate('memberIds', 'username displayName');
      res.json(group);
      return;
    }

    // Private group - require authentication and membership
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({ error: 'Authentication required for private groups' });
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as {
        userId: string;
      };
      const userId = decoded.userId;

      // Check if user is a member (before populating, so memberIds are ObjectIds)
      if (!isGroupMember(group, userId)) {
        res.status(403).json({ error: 'Not a member of this group' });
        return;
      }

      // Populate after checking membership
      await group.populate('createdByUserId', 'username displayName');
      await group.populate('memberIds', 'username displayName');

      res.json(group);
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add member to group (any member can add)
router.post('/:id/members', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { username } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid group ID' });
      return;
    }

    if (!username) {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    const group = await Group.findById(id);
    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    // Check if user is a member
    const userId = req.userId?.toString() || '';
    if (!isGroupMember(group, userId)) {
      res.status(403).json({ error: 'Not a member of this group' });
      return;
    }

    // Find user by username
    const userToAdd = await User.findOne({ username: username.toLowerCase() });
    if (!userToAdd) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if user is already a member
    if (group.memberIds.includes(userToAdd._id)) {
      res.status(400).json({ error: 'User is already a member of this group' });
      return;
    }

    // Add user to group
    group.memberIds.push(userToAdd._id);
    await group.save();
    await group.populate('createdByUserId', 'username displayName');
    await group.populate('memberIds', 'username displayName');

    res.json(group);
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove member from group (only admin can remove)
router.delete(
  '/:id/members/:userId',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id, userId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
        res.status(400).json({ error: 'Invalid ID' });
        return;
      }

      const group = await Group.findById(id);
      if (!group) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      // Check if user is admin
      if (group.createdByUserId.toString() !== req.userId) {
        res.status(403).json({ error: 'Only admin can remove members' });
        return;
      }

      // Check if user to remove is in the group
      const memberIndex = group.memberIds.findIndex(
        (memberId) => memberId.toString() === userId
      );
      if (memberIndex === -1) {
        res.status(404).json({ error: 'User is not a member of this group' });
        return;
      }

      // Don't allow removing the admin
      if (userId === group.createdByUserId.toString()) {
        res.status(400).json({ error: 'Cannot remove the group admin' });
        return;
      }

      // Remove member
      group.memberIds.splice(memberIndex, 1);
      await group.save();
      await group.populate('createdByUserId', 'username displayName');
      await group.populate('memberIds', 'username displayName');

      res.json(group);
    } catch (error) {
      console.error('Remove member error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete group (only admin can delete)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid group ID' });
      return;
    }

    const group = await Group.findById(req.params.id);

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    // Check if user is admin
    if (group.createdByUserId.toString() !== req.userId) {
      res.status(403).json({ error: 'Only admin can delete the group' });
      return;
    }

    await Group.findByIdAndDelete(req.params.id);

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

