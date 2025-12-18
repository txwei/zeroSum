import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Game } from '../models/Game';
import { Group } from '../models/Group';
import { isGroupMember } from '../middleware/groupAuth';
import mongoose from 'mongoose';

const router = express.Router();

// Get cumulative totals per user
router.get('/totals', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.query;

    // Get all groups user belongs to
    const userGroups = await Group.find({
      memberIds: req.userId,
    }).select('_id');

    const groupIds = userGroups.map((g) => g._id);

    let query: any = { groupId: { $in: groupIds } };

    // If groupId is provided, filter by that group (and verify membership)
    if (groupId) {
      if (!mongoose.Types.ObjectId.isValid(groupId as string)) {
        res.status(400).json({ error: 'Invalid group ID' });
        return;
      }

      const group = await Group.findById(groupId);
      if (!group) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      const userId = req.userId?.toString() || '';
      if (!isGroupMember(group, userId)) {
        res.status(403).json({ error: 'Not a member of this group' });
        return;
      }

      query = { groupId: new mongoose.Types.ObjectId(groupId as string) };
    }

    const games = await Game.find(query).populate('transactions.userId', 'username displayName');

    // Calculate totals per user
    const userTotals: Record<
      string,
      { userId: string; username: string; displayName: string; total: number }
    > = {};

    games.forEach((game) => {
      game.transactions.forEach((transaction) => {
        // Skip transactions without userId (playerName-only transactions)
        if (!transaction.userId) {
          return;
        }
        
        const userId = transaction.userId._id.toString();
        const username = (transaction.userId as any).username;
        const displayName = (transaction.userId as any).displayName;

        if (!userTotals[userId]) {
          userTotals[userId] = {
            userId,
            username,
            displayName,
            total: 0,
          };
        }

        userTotals[userId].total += transaction.amount;
      });
    });

    const totals = Object.values(userTotals).sort((a, b) => b.total - a.total);

    res.json(totals);
  } catch (error) {
    console.error('Get totals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's game history
router.get('/user/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { groupId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    // Get all groups user belongs to
    const userGroups = await Group.find({
      memberIds: req.userId,
    }).select('_id');

    const groupIds = userGroups.map((g) => g._id);

    let query: any = {
      'transactions.userId': userId,
      groupId: { $in: groupIds },
    };

    // If groupId is provided, filter by that group (and verify membership)
    if (groupId) {
      if (!mongoose.Types.ObjectId.isValid(groupId as string)) {
        res.status(400).json({ error: 'Invalid group ID' });
        return;
      }

      const group = await Group.findById(groupId);
      if (!group) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      const userId = req.userId?.toString() || '';
      if (!isGroupMember(group, userId)) {
        res.status(403).json({ error: 'Not a member of this group' });
        return;
      }

      query.groupId = new mongoose.Types.ObjectId(groupId as string);
    }

    const games = await Game.find(query)
      .populate('transactions.userId', 'username displayName')
      .populate('createdByUserId', 'username displayName')
      .populate('groupId', 'name')
      .sort({ date: -1, createdAt: -1 });

    // Calculate user's amount for each game
    const gameHistory = games.map((game) => {
      const userTransaction = game.transactions.find(
        (t) => t.userId && t.userId._id.toString() === userId
      );
      return {
        game: {
          id: game._id,
          name: game.name,
          date: game.date,
          createdBy: game.createdByUserId,
        },
        amount: userTransaction ? userTransaction.amount : 0,
      };
    });

    res.json(gameHistory);
  } catch (error) {
    console.error('Get user history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

