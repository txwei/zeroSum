import express, { Response, Request } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { GameService } from '../services/GameService';
import { asyncHandler } from '../middleware/errorHandler';
import { validate } from '../middleware/validation';
import { validateId, validateRequiredString, validateOptionalString } from '../middleware/validation';
import { getOptionalUserId } from '../utils/auth';
import { ValidationError } from '../types/errors';

const router = express.Router();
const gameService = new GameService();

// ========== PUBLIC ROUTES (No authentication required) ==========

// Get game by public token
router.get(
  '/public/:token',
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    const game = await gameService.getGameByPublicToken(token);
    res.json(game);
  })
);

// Get group members for public game
router.get(
  '/public/:token/members',
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    const members = await gameService.getGameMembers(token);
    res.json(members);
  })
);

// Search users by name (for autocomplete) - public route
router.get(
  '/public/:token/search-users',
  validate({
    query: {
      q: validateRequiredString,
    },
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    const { q } = req.query;
    const result = await gameService.searchUsersForGame(token, q as string);
    res.json(result);
  })
);

// Update game name - simple collaborative update
router.put(
  '/public/:token/name',
  validate({
    body: {
      name: validateRequiredString,
    },
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    const { name } = req.body;
    const game = await gameService.updateGameName(token, name);
    res.json(game);
  })
);

// Update game date - simple collaborative update
router.put(
  '/public/:token/date',
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    const { date } = req.body;
    const game = await gameService.updateGameDate(token, date);
    res.json(game);
  })
);

// Update a single field in a transaction (collaborative editing)
router.patch(
  '/public/:token/transaction/:rowId',
  validate({
    body: {
      field: (value: any) => {
        if (!value || !['playerName', 'amount'].includes(value)) {
          throw new ValidationError('field must be "playerName" or "amount"');
        }
      },
    },
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { token, rowId } = req.params;
    const { field, value } = req.body;
    const rowIndex = parseInt(rowId, 10);
    const game = await gameService.updateTransactionField(token, rowIndex, field, value);
    res.json(game);
  })
);

// Add new transaction row
router.post(
  '/public/:token/transaction',
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    const { playerName, amount } = req.body;
    const game = await gameService.addTransaction(token, playerName, amount);
    res.json(game);
  })
);

// Delete transaction row
router.delete(
  '/public/:token/transaction/:rowId',
  asyncHandler(async (req: Request, res: Response) => {
    const { token, rowId } = req.params;
    const rowIndex = parseInt(rowId, 10);
    const game = await gameService.deleteTransaction(token, rowIndex);
    res.json(game);
  })
);

// Settle game (make it read-only)
router.post(
  '/public/:token/settle',
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    const game = await gameService.settleGame(token);
    res.json(game);
  })
);

// Edit game (unsettle - make it editable again)
router.post(
  '/public/:token/edit',
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    const game = await gameService.unsettleGame(token);
    res.json(game);
  })
);

// Quick signup via public link
router.post(
  '/public/:token/quick-signup',
  validate({
    body: {
      username: validateRequiredString,
      displayName: validateRequiredString,
    },
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    const { username, displayName, password } = req.body;
    const user = await gameService.quickSignup(token, username, displayName, password);
    res.status(201).json(user);
  })
);

// ========== AUTHENTICATED ROUTES ==========

// Create game
router.post(
  '/',
  authenticate,
  validate({
    body: {
      name: validateRequiredString,
      groupId: validateId,
    },
  }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, date, groupId, transactions } = req.body;
    const game = await gameService.createGame(req.userId!, name, groupId, date, transactions);
    res.status(201).json(game);
  })
);

// List games - public groups accessible without auth, private groups require membership
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getOptionalUserId(req);
    const { groupId } = req.query;
    const games = await gameService.listGames(userId, groupId as string | undefined);
    res.json(games);
  })
);

// Get game details
router.get(
  '/:id',
  authenticate,
  validate({
    params: {
      id: validateId,
    },
  }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const game = await gameService.getGameById(req.params.id, req.userId!);
    res.json(game);
  })
);

// Delete game
router.delete(
  '/:id',
  authenticate,
  validate({
    params: {
      id: validateId,
    },
  }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await gameService.deleteGame(req.params.id, req.userId!, req);
    res.json({ message: 'Game deleted successfully' });
  })
);

export default router;
