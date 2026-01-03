import express, { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { asyncHandler } from '../middleware/errorHandler';
import { validate } from '../middleware/validation';
import { validateRequiredString } from '../middleware/validation';
import { validateRequired } from '../utils/validators';
import { validatePassword } from '../utils/validators';

const router = express.Router();
const authService = new AuthService();

// Register
router.post(
  '/register',
  validate({
    body: {
      username: validateRequiredString,
      displayName: validateRequiredString,
      password: (value: any) => {
        validateRequired(value, 'Password');
        validatePassword(value);
      },
    },
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { username, displayName, password } = req.body;
    const result = await authService.register(username, displayName, password);
    res.status(201).json(result);
  })
);

// Login
router.post(
  '/login',
  validate({
    body: {
      username: validateRequiredString,
      password: validateRequiredString,
    },
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;
    const result = await authService.login(username, password);
    res.json(result);
  })
);

export default router;
