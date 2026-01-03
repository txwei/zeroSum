import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { GameService } from '../services/GameService';
import { TransactionService } from '../services/TransactionService';
import { asyncHandler } from '../middleware/errorHandler';
import { validate } from '../middleware/validation';
import { validateId, validateRequiredArray, validateNumber } from '../middleware/validation';

const router = express.Router();
const gameService = new GameService();
const transactionService = new TransactionService();

// Create/update transactions for a game
router.post(
  '/games/:gameId/transactions',
  authenticate,
  validate({
    params: {
      gameId: validateId,
    },
    body: {
      transactions: validateRequiredArray,
    },
  }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { gameId } = req.params;
    const { transactions } = req.body;

    // Validate zero-sum
    transactionService.validateZeroSum(transactions);

    // Get game and verify access
    const game = await gameService.getGameById(gameId, req.userId!);

    // Update transactions (this would need a new method in GameService)
    // For now, we'll use the existing game model approach
    const Game = (await import('../models/Game')).Game;
    const gameModel = await Game.findById(gameId);
    if (!gameModel) {
      throw new Error('Game not found');
    }

    const mongoose = await import('mongoose');
    gameModel.transactions = transactions.map((t: { userId: string; amount: number; playerName?: string }) => ({
      userId: t.userId ? new mongoose.default.Types.ObjectId(t.userId) : undefined,
      playerName: t.playerName || '_',
      amount: t.amount,
      createdAt: new Date(),
    }));

    await gameModel.save();
    await gameModel.populate('transactions.userId', 'username displayName');
    await gameModel.populate('createdByUserId', 'username displayName');

    res.json(gameModel);
  })
);

// Update individual transaction
router.put(
  '/games/:gameId/transactions/:transactionId',
  authenticate,
  validate({
    params: {
      gameId: validateId,
      transactionId: validateId,
    },
    body: {
      amount: validateNumber,
    },
  }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { gameId, transactionId } = req.params;
    const { amount } = req.body;

    // Get game and verify access
    const game = await gameService.getGameById(gameId, req.userId!);

    const Game = (await import('../models/Game')).Game;
    const gameModel = await Game.findById(gameId);
    if (!gameModel) {
      throw new Error('Game not found');
    }

    const transaction = (gameModel.transactions as any).id(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    transaction.amount = amount;

    // Validate zero-sum
    transactionService.validateZeroSum(gameModel.transactions);

    await gameModel.save();
    await gameModel.populate('transactions.userId', 'username displayName');
    await gameModel.populate('createdByUserId', 'username displayName');

    res.json(gameModel);
  })
);

// Delete transaction
router.delete(
  '/games/:gameId/transactions/:transactionId',
  authenticate,
  validate({
    params: {
      gameId: validateId,
      transactionId: validateId,
    },
  }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { gameId, transactionId } = req.params;

    // Get game and verify access
    const game = await gameService.getGameById(gameId, req.userId!);

    const Game = (await import('../models/Game')).Game;
    const gameModel = await Game.findById(gameId);
    if (!gameModel) {
      throw new Error('Game not found');
    }

    const transaction = (gameModel.transactions as any).id(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    transaction.deleteOne();

    // Validate zero-sum after deletion
    transactionService.validateZeroSum(gameModel.transactions);

    await gameModel.save();
    await gameModel.populate('transactions.userId', 'username displayName');
    await gameModel.populate('createdByUserId', 'username displayName');

    res.json(gameModel);
  })
);

export default router;
