import express, { Response, Request } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { GroupService } from '../services/GroupService';
import { asyncHandler } from '../middleware/errorHandler';
import { validate } from '../middleware/validation';
import { validateId, validateRequiredString, validateOptionalString } from '../middleware/validation';
import { getOptionalUserId } from '../utils/auth';

const router = express.Router();
const groupService = new GroupService();

// Create group
router.post(
  '/',
  authenticate,
  validate({
    body: {
      name: validateRequiredString,
    },
  }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, description, isPublic } = req.body;
    const group = await groupService.createGroup(
      req.userId!,
      name,
      description,
      isPublic
    );
    res.status(201).json(group);
  })
);

// List all groups - public groups for everyone, private groups only for members
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getOptionalUserId(req);
    const groups = await groupService.listGroups(userId);
    res.json(groups);
  })
);

// Get group details - public groups accessible without auth, private groups require membership
router.get(
  '/:id',
  validate({
    params: {
      id: validateId,
    },
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getOptionalUserId(req);
    const group = await groupService.getGroupById(req.params.id, userId);
    res.json(group);
  })
);

// Update group name, description, or isPublic
router.patch(
  '/:id',
  authenticate,
  validate({
    params: {
      id: validateId,
    },
  }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, description, isPublic } = req.body;
    const group = await groupService.updateGroup(id, req.userId!, { name, description, isPublic }, req);
    res.json(group);
  })
);

// Add member to group (any member can add)
router.post(
  '/:id/members',
  authenticate,
  validate({
    params: {
      id: validateId,
    },
    body: {
      username: validateRequiredString,
    },
  }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { username } = req.body;
    const group = await groupService.addMember(id, req.userId!, username, req);
    res.json(group);
  })
);

// Remove member from group (only admin can remove)
router.delete(
  '/:id/members/:userId',
  authenticate,
  validate({
    params: {
      id: validateId,
      userId: validateId,
    },
  }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id, userId } = req.params;
    const group = await groupService.removeMember(id, req.userId!, userId, req);
    res.json(group);
  })
);

// Delete group (only admin can delete)
router.delete(
  '/:id',
  authenticate,
  validate({
    params: {
      id: validateId,
    },
  }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await groupService.deleteGroup(id, req.userId!, req);
    res.json({ message: 'Group deleted successfully' });
  })
);

export default router;
