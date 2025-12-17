import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Game } from '../models/Game';
import mongoose from 'mongoose';

const router = express.Router();

// Get cumulative totals per user
router.get('/totals', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const games = await Game.find({}).populate('transactions.userId', 'username displayName');

    // Calculate totals per user
    const userTotals: Record<
      string,
      { userId: string; username: string; displayName: string; total: number }
    > = {};

    games.forEach((game) => {
      game.transactions.forEach((transaction) => {
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

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const games = await Game.find({
      'transactions.userId': userId,
    })
      .populate('transactions.userId', 'username displayName')
      .populate('createdByUserId', 'username displayName')
      .sort({ date: -1, createdAt: -1 });

    // Calculate user's amount for each game
    const gameHistory = games.map((game) => {
      const userTransaction = game.transactions.find(
        (t) => t.userId._id.toString() === userId
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

