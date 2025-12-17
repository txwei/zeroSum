import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Game } from '../models/Game';
import mongoose from 'mongoose';

const router = express.Router();

// Create/update transactions for a game
router.post('/games/:gameId/transactions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { gameId } = req.params;
    const { transactions } = req.body;

    if (!mongoose.Types.ObjectId.isValid(gameId)) {
      res.status(400).json({ error: 'Invalid game ID' });
      return;
    }

    if (!Array.isArray(transactions)) {
      res.status(400).json({ error: 'Transactions must be an array' });
      return;
    }

    // Validate zero-sum
    const sum = transactions.reduce((acc: number, t: { amount: number }) => acc + (t.amount || 0), 0);
    if (Math.abs(sum) > 0.01) {
      res.status(400).json({
        error: 'Transactions must sum to zero',
        currentSum: sum,
      });
      return;
    }

    const game = await Game.findById(gameId);
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    // Update transactions
    game.transactions = transactions.map((t: { userId: string; amount: number }) => ({
      userId: new mongoose.Types.ObjectId(t.userId),
      amount: t.amount,
      createdAt: new Date(),
    }));

    await game.save();
    await game.populate('transactions.userId', 'username displayName');
    await game.populate('createdByUserId', 'username displayName');

    res.json(game);
  } catch (error) {
    console.error('Update transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update individual transaction
router.put(
  '/games/:gameId/transactions/:transactionId',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { gameId, transactionId } = req.params;
      const { amount } = req.body;

      if (!mongoose.Types.ObjectId.isValid(gameId) || !mongoose.Types.ObjectId.isValid(transactionId)) {
        res.status(400).json({ error: 'Invalid ID' });
        return;
      }

      if (typeof amount !== 'number') {
        res.status(400).json({ error: 'Amount is required and must be a number' });
        return;
      }

      const game = await Game.findById(gameId);
      if (!game) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }

      const transaction = game.transactions.id(transactionId);
      if (!transaction) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      // Update transaction amount
      transaction.amount = amount;

      // Validate zero-sum
      const sum = game.transactions.reduce((acc, t) => acc + t.amount, 0);
      if (Math.abs(sum) > 0.01) {
        res.status(400).json({
          error: 'Transactions must sum to zero',
          currentSum: sum,
        });
        return;
      }

      await game.save();
      await game.populate('transactions.userId', 'username displayName');
      await game.populate('createdByUserId', 'username displayName');

      res.json(game);
    } catch (error) {
      console.error('Update transaction error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete transaction
router.delete(
  '/games/:gameId/transactions/:transactionId',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { gameId, transactionId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(gameId) || !mongoose.Types.ObjectId.isValid(transactionId)) {
        res.status(400).json({ error: 'Invalid ID' });
        return;
      }

      const game = await Game.findById(gameId);
      if (!game) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }

      const transaction = game.transactions.id(transactionId);
      if (!transaction) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      transaction.deleteOne();

      // Validate zero-sum after deletion
      const sum = game.transactions.reduce((acc, t) => acc + t.amount, 0);
      if (Math.abs(sum) > 0.01) {
        res.status(400).json({
          error: 'Transactions must sum to zero after deletion',
          currentSum: sum,
        });
        return;
      }

      await game.save();
      await game.populate('transactions.userId', 'username displayName');
      await game.populate('createdByUserId', 'username displayName');

      res.json(game);
    } catch (error) {
      console.error('Delete transaction error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

