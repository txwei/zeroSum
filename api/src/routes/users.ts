import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { UserService } from '../services/UserService';
import { asyncHandler } from '../middleware/errorHandler';
import { validate } from '../middleware/validation';
import { validateRequiredString } from '../middleware/validation';

const router = express.Router();
const userService = new UserService();

// Get current user profile
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await userService.getCurrentUser(req.userId!);
    res.json(user);
  })
);

// Update display name
router.patch(
  '/me',
  authenticate,
  validate({
    body: {
      displayName: validateRequiredString,
    },
  }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { displayName } = req.body;
    const user = await userService.updateDisplayName(req.userId!, displayName);
    res.json(user);
  })
);

// List all users (for participant selection)
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const users = await userService.listUsers();
    res.json(users);
  })
);

export default router;
