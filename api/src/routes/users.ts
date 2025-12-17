import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { User } from '../models/User';

const router = express.Router();

// Get current user profile
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user._id,
      username: user.username,
      displayName: user.displayName,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update display name
router.patch('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { displayName } = req.body;

    if (!displayName || displayName.trim().length === 0) {
      res.status(400).json({ error: 'Display name is required' });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { displayName: displayName.trim() },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user._id,
      username: user.username,
      displayName: user.displayName,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List all users (for participant selection)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find({}).select('username displayName').sort({ displayName: 1 });

    res.json(
      users.map((user) => ({
        id: user._id,
        username: user.username,
        displayName: user.displayName,
      }))
    );
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

