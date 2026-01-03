import express, { Response, Request } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { StatsService } from '../services/StatsService';
import { asyncHandler } from '../middleware/errorHandler';
import { validate } from '../middleware/validation';
import { validateId, validateRequiredArray } from '../middleware/validation';

const router = express.Router();
const statsService = new StatsService();

// Get cumulative totals per user - public groups accessible without auth, private groups require membership
router.get(
  '/totals',
  asyncHandler(async (req: Request, res: Response) => {
    const { groupId, timePeriod } = req.query;
    const totals = await statsService.getTotals(req, groupId as string | undefined, timePeriod as string | undefined);
    res.json(totals);
  })
);

// Get user's game history
router.get(
  '/user/:userId',
  authenticate,
  validate({
    params: {
      userId: validateId,
    },
  }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const { groupId } = req.query;
    const history = await statsService.getUserHistory(req.userId!, userId, groupId as string | undefined);
    res.json(history);
  })
);

// Get trend data (time-series cumulative balances) for selected players
router.get(
  '/trends',
  validate({
    query: {
      groupId: validateId,
      playerIds: validateRequiredArray,
    },
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { groupId, playerIds } = req.query;
    const trends = await statsService.getTrends(req, groupId as string, playerIds as string[]);
    res.json(trends);
  })
);

export default router;
