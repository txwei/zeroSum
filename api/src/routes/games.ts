import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Game } from '../models/Game';
import mongoose from 'mongoose';

const router = express.Router();

// Create game
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, date, transactions } = req.body;

    if (!name || !date) {
      res.status(400).json({ error: 'Name and date are required' });
      return;
    }

    // Validate zero-sum if transactions are provided
    if (transactions && Array.isArray(transactions)) {
      const sum = transactions.reduce((acc: number, t: { amount: number }) => acc + (t.amount || 0), 0);
      if (Math.abs(sum) > 0.01) {
        res.status(400).json({
          error: 'Transactions must sum to zero',
          currentSum: sum,
        });
        return;
      }
    }

    const game = new Game({
      name: name.trim(),
      date: new Date(date),
      createdByUserId: req.userId,
      transactions: transactions || [],
    });

    await game.save();
    await game.populate('transactions.userId', 'username displayName');
    await game.populate('createdByUserId', 'username displayName');

    res.status(201).json(game);
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List games
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const games = await Game.find({})
      .populate('transactions.userId', 'username displayName')
      .populate('createdByUserId', 'username displayName')
      .sort({ date: -1, createdAt: -1 });

    res.json(games);
  } catch (error) {
    console.error('List games error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get game details
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid game ID' });
      return;
    }

    const game = await Game.findById(req.params.id)
      .populate('transactions.userId', 'username displayName')
      .populate('createdByUserId', 'username displayName');

    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    res.json(game);
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete game
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid game ID' });
      return;
    }

    const game = await Game.findById(req.params.id);

    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    // Only allow creator to delete
    if (game.createdByUserId.toString() !== req.userId) {
      res.status(403).json({ error: 'Not authorized to delete this game' });
      return;
    }

    await Game.findByIdAndDelete(req.params.id);

    res.json({ message: 'Game deleted successfully' });
  } catch (error) {
    console.error('Delete game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

