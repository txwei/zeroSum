import express, { Response, Request } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Game } from '../models/Game';
import { Group } from '../models/Group';
import { User } from '../models/User';
import { isGroupMember } from '../middleware/groupAuth';
import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { emitGameUpdate } from '../socket';

const router = express.Router();

// ========== PUBLIC ROUTES (No authentication required) ==========

// Get game by public token
router.get('/public/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const game = await Game.findOne({ publicToken: token })
      .populate('transactions.userId', 'username displayName')
      .populate('createdByUserId', 'username displayName')
      .populate('groupId', 'name');

    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    res.json(game);
  } catch (error) {
    console.error('Get public game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get group members for public game
router.get('/public/:token/members', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const game = await Game.findOne({ publicToken: token });
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    const group = await Group.findById(game.groupId).populate('memberIds', 'username displayName');
    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    res.json(group.memberIds);
  } catch (error) {
    console.error('Get public game members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search users by name (for autocomplete) - public route
router.get('/public/:token/search-users', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    const game = await Game.findOne({ publicToken: token });
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    const group = await Group.findById(game.groupId);
    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    const searchRegex = new RegExp(q, 'i');
    const allUsers = await User.find({
      $or: [
        { displayName: searchRegex },
        { username: searchRegex },
      ],
    }).select('username displayName').limit(10);

    const groupMemberIds = group.memberIds.map(id => id.toString());
    const usersInGroup: any[] = [];
    const usersNotInGroup: any[] = [];

    allUsers.forEach(user => {
      const userObj = {
        _id: user._id,
        id: user._id,
        username: user.username,
        displayName: user.displayName,
      };
      
      if (groupMemberIds.includes(user._id.toString())) {
        usersInGroup.push(userObj);
      } else {
        usersNotInGroup.push(userObj);
      }
    });

    res.json({
      inGroup: usersInGroup,
      notInGroup: usersNotInGroup,
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update game name - simple collaborative update
router.put('/public/:token/name', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const game = await Game.findOne({ publicToken: token });
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    // Check if game is settled (read-only)
    if (game.settled) {
      res.status(403).json({ error: 'Game is settled and cannot be edited' });
      return;
    }

    game.name = name.trim();
    await game.save();
    await game.populate('transactions.userId', 'username displayName');
    await game.populate('createdByUserId', 'username displayName');
    await game.populate('groupId', 'name');

    emitGameUpdate(token, game.toJSON());
    res.json(game);
  } catch (error) {
    console.error('Update game name error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update game date - simple collaborative update
router.put('/public/:token/date', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { date } = req.body;

    const game = await Game.findOne({ publicToken: token });
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    // Check if game is settled (read-only)
    if (game.settled) {
      res.status(403).json({ error: 'Game is settled and cannot be edited' });
      return;
    }

    // Set date to provided value or null if empty/undefined
    // Parse the date string (YYYY-MM-DD) and create a date at UTC midnight
    // This prevents timezone issues where the date might shift by a day
    if (date && typeof date === 'string' && date.trim() !== '') {
      // Parse YYYY-MM-DD format and create date at UTC midnight
      // This ensures the date is stored consistently regardless of server timezone
      const [year, month, day] = date.split('-').map(Number);
      // Create date at UTC midnight to avoid timezone shifts
      game.date = new Date(Date.UTC(year, month - 1, day));
    } else {
      game.date = undefined;
    }
    
    await game.save();
    await game.populate('transactions.userId', 'username displayName');
    await game.populate('createdByUserId', 'username displayName');
    await game.populate('groupId', 'name');

    emitGameUpdate(token, game.toJSON());
    res.json(game);
  } catch (error) {
    console.error('Update game date error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a single field in a transaction (collaborative editing)
router.patch('/public/:token/transaction/:rowId', async (req: Request, res: Response) => {
  try {
    const { token, rowId } = req.params;
    const { field, value } = req.body;

    if (!field || !['playerName', 'amount'].includes(field)) {
      res.status(400).json({ error: 'field must be "playerName" or "amount"' });
      return;
    }

    const game = await Game.findOne({ publicToken: token });
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    // Check if game is settled (read-only)
    if (game.settled) {
      res.status(403).json({ error: 'Game is settled and cannot be edited' });
      return;
    }

    // Find transaction by rowId (we'll use index for simplicity)
    const rowIndex = parseInt(rowId, 10);
    if (isNaN(rowIndex) || rowIndex < 0) {
      res.status(400).json({ error: 'Invalid row index' });
      return;
    }

    // If row doesn't exist, create it (and any missing rows before it)
    // Create empty transactions with placeholder to satisfy validation
    while (game.transactions.length <= rowIndex) {
      game.transactions.push({
        playerName: '_', // Underscore placeholder to satisfy validation (will be updated below)
        amount: 0,
        createdAt: new Date(),
      });
    }

    const transaction = game.transactions[rowIndex];

    if (field === 'playerName') {
      const trimmedValue = (value as string)?.trim() || '';
        // Use trimmed value, or underscore if empty (to satisfy validation)
        if (trimmedValue === '' && transaction.playerName && transaction.playerName !== '_') {
          // User cleared a previously set value - keep it as underscore for validation
          transaction.playerName = '_';
        } else {
          transaction.playerName = trimmedValue || '_';
        }
      // Always clear userId - we only use playerName now
        transaction.userId = undefined;
    } else if (field === 'amount') {
      const numValue = parseFloat(value as string);
      if (isNaN(numValue)) {
        res.status(400).json({ error: 'amount must be a valid number' });
        return;
      }
      transaction.amount = numValue;
    }
    
    // Ensure transaction has playerName for validation
    if (!transaction.playerName || transaction.playerName.trim() === '') {
      transaction.playerName = '_'; // Fallback to underscore if somehow empty
    }

    await game.save();
    await game.populate('transactions.userId', 'username displayName');
    await game.populate('createdByUserId', 'username displayName');
    await game.populate('groupId', 'name');

    emitGameUpdate(token, game.toJSON());
    res.json(game);
  } catch (error) {
    console.error('Update transaction field error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new transaction row
router.post('/public/:token/transaction', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { playerName, amount } = req.body;

    const game = await Game.findOne({ publicToken: token });
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    // Check if game is settled (read-only)
    if (game.settled) {
      res.status(403).json({ error: 'Game is settled and cannot be edited' });
      return;
    }

    // Create new transaction with placeholder to satisfy validation
    // Use a non-empty placeholder that won't be trimmed (underscore works)
    const trimmedPlayerName = playerName?.trim() || '';
    const newTransaction: any = {
      playerName: trimmedPlayerName || '_', // Underscore placeholder to satisfy validation (will be updated when user types)
      amount: amount || 0,
      createdAt: new Date(),
    };

    game.transactions.push(newTransaction);
    await game.save();
    await game.populate('transactions.userId', 'username displayName');
    await game.populate('createdByUserId', 'username displayName');
    await game.populate('groupId', 'name');

    emitGameUpdate(token, game.toJSON());
    res.json(game);
  } catch (error) {
    console.error('Add transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete transaction row
router.delete('/public/:token/transaction/:rowId', async (req: Request, res: Response) => {
  try {
    const { token, rowId } = req.params;

    const game = await Game.findOne({ publicToken: token });
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    // Check if game is settled (read-only)
    if (game.settled) {
      res.status(403).json({ error: 'Game is settled and cannot be edited' });
      return;
    }

    const rowIndex = parseInt(rowId, 10);
    if (isNaN(rowIndex) || rowIndex < 0 || rowIndex >= game.transactions.length) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    game.transactions.splice(rowIndex, 1);
    await game.save();
    await game.populate('transactions.userId', 'username displayName');
    await game.populate('createdByUserId', 'username displayName');
    await game.populate('groupId', 'name');

    emitGameUpdate(token, game.toJSON());
    res.json(game);
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Settle game (make it read-only)
router.post('/public/:token/settle', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const game = await Game.findOne({ publicToken: token });
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    // Validate that no two transactions have the same player name (case-insensitive)
    // Only check transactions that have a non-empty playerName (not placeholder)
    const playerNames = game.transactions
      .map(t => {
        // Use playerName only (userId is kept for backward compatibility but not used)
        const name = t.playerName || '';
        return name.trim().toLowerCase();
      })
      .filter(name => name !== '' && name !== '_'); // Filter out empty and placeholder names

    const uniqueNames = new Set(playerNames);
    if (playerNames.length !== uniqueNames.size) {
      // Find duplicates for better error message
      const nameCounts = new Map<string, number>();
      playerNames.forEach(name => {
        nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
      });
      const duplicates = Array.from(nameCounts.entries())
        .filter(([_, count]) => count > 1)
        .map(([name, _]) => name);
      
      res.status(400).json({ 
        error: 'Cannot settle game: duplicate player names found',
        duplicates: duplicates
      });
      return;
    }

    // Set game as settled
    game.settled = true;
    await game.save();
    await game.populate('transactions.userId', 'username displayName');
    await game.populate('createdByUserId', 'username displayName');
    await game.populate('groupId', 'name');

    emitGameUpdate(token, game.toJSON());
    res.json(game);
  } catch (error) {
    console.error('Settle game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Edit game (unsettle - make it editable again)
router.post('/public/:token/edit', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const game = await Game.findOne({ publicToken: token });
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    // Unsettle the game
    game.settled = false;
    await game.save();
    await game.populate('transactions.userId', 'username displayName');
    await game.populate('createdByUserId', 'username displayName');
    await game.populate('groupId', 'name');

    emitGameUpdate(token, game.toJSON());
    res.json(game);
  } catch (error) {
    console.error('Edit game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Quick signup via public link
router.post('/public/:token/quick-signup', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { username, displayName, password } = req.body;

    if (!username || !displayName) {
      res.status(400).json({ error: 'username and displayName are required' });
      return;
    }

    const game = await Game.findOne({ publicToken: token });
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      res.status(400).json({ error: 'Username already exists' });
      return;
    }

    const passwordToHash = password || crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(passwordToHash, 10);

    const user = new User({
      username: username.toLowerCase(),
      displayName,
      passwordHash,
    });

    await user.save();

    const group = await Group.findById(game.groupId);
    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    const userIdStr = user._id.toString();
    const isMember = group.memberIds.some(
      (memberId) => memberId.toString() === userIdStr
    );
    if (!isMember) {
      group.memberIds.push(user._id);
      await group.save();
    }

    res.status(201).json({
      _id: user._id,
      id: user._id,
      username: user.username,
      displayName: user.displayName,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Quick signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== AUTHENTICATED ROUTES ==========

// Create game
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, date, groupId, transactions } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    if (!groupId) {
      res.status(400).json({ error: 'Group ID is required' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      res.status(400).json({ error: 'Invalid group ID' });
      return;
    }

    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    const userId = req.userId?.toString() || '';
    
    // For public groups, allow authenticated users to create games (even if not a member)
    // For private groups, require membership
    if (!group.isPublic && !isGroupMember(group, userId)) {
      res.status(403).json({ error: 'Not a member of this group' });
      return;
    }
    
    // If user is not a member, add them to the group (for public groups)
    if (!isGroupMember(group, userId)) {
      group.memberIds.push(new mongoose.Types.ObjectId(userId));
      await group.save();
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

    let game;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const token = crypto.randomBytes(8).toString('base64url');
        
        // Process transactions if provided
        const processedTransactions = transactions && Array.isArray(transactions)
          ? transactions.map((t: { userId?: string; playerName?: string; amount: number }) => ({
              userId: t.userId ? new mongoose.Types.ObjectId(t.userId) : undefined,
              playerName: t.playerName || '_', // Use placeholder if not provided (required by validation)
              amount: t.amount,
              createdAt: new Date(),
            }))
          : [];
        
        game = new Game({
          name: name.trim(),
          date: date ? new Date(date) : undefined,
          createdByUserId: req.userId,
          groupId: new mongoose.Types.ObjectId(groupId),
          transactions: processedTransactions,
        });
        
        game.publicToken = token;
        await game.save();
        
        if (!game.publicToken) {
          throw new Error('Failed to set publicToken');
        }
        
        break;
      } catch (saveError: any) {
        if (saveError?.code === 11000 && saveError?.keyPattern?.publicToken && attempts < maxAttempts - 1) {
          attempts++;
          continue;
        }
        throw saveError;
      }
    }
    
    if (!game) {
      throw new Error('Failed to create game after multiple attempts');
    }

    await game.populate('transactions.userId', 'username displayName');
    await game.populate('createdByUserId', 'username displayName');

    const gameObj = game.toObject();
    const gameResponse: any = {
      ...gameObj,
      publicToken: game.publicToken,
    };

    res.status(201).json(gameResponse);
  } catch (error: any) {
    console.error('Create game error:', error);
    const errorMessage = error?.message || 'Internal server error';
    const statusCode = error?.name === 'ValidationError' ? 400 : 500;
    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
});

// List games - public groups accessible without auth, private groups require membership
router.get('/', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.query;

    const token = req.headers.authorization?.replace('Bearer ', '');
    let userId: string | null = null;

    // Try to get user ID if token is provided (optional auth)
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as {
          userId: string;
        };
        userId = decoded.userId;
      } catch (error) {
        // Invalid token, continue as unauthenticated
      }
    }

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

      // Check access: public groups accessible to everyone, private groups require membership
      if (!group.isPublic) {
        if (!userId) {
          res.status(401).json({ error: 'Authentication required for private groups' });
          return;
        }
      const isMember = group.memberIds.some(
          (memberId) => memberId.toString() === userId
      );
      if (!isMember) {
        res.status(403).json({ error: 'Not a member of this group' });
        return;
      }
      }

      // Allow access to this group's games
      const query = { groupId: new mongoose.Types.ObjectId(groupId as string) };
      const games = await Game.find(query)
        .populate('transactions.userId', 'username displayName')
        .populate('createdByUserId', 'username displayName')
        .populate('groupId', 'name')
        .sort({ date: -1, createdAt: -1 });

      res.json(games);
      return;
    }

    // No groupId specified - return games from all accessible groups
    // For authenticated users: public groups + groups they're members of
    // For unauthenticated users: only public groups
    let accessibleGroupIds: mongoose.Types.ObjectId[] = [];

    if (userId) {
      // Get public groups and groups user is a member of
      const publicGroups = await Group.find({ isPublic: true }).select('_id');
      const userGroups = await Group.find({
        memberIds: userId,
      }).select('_id');
      
      const allGroupIds = [
        ...publicGroups.map(g => g._id),
        ...userGroups.map(g => g._id),
      ];
      // Remove duplicates
      accessibleGroupIds = Array.from(new Set(allGroupIds.map(id => id.toString())))
        .map(id => new mongoose.Types.ObjectId(id));
    } else {
      // Only public groups for unauthenticated users
      const publicGroups = await Group.find({ isPublic: true }).select('_id');
      accessibleGroupIds = publicGroups.map(g => g._id);
    }

    const query: any = { groupId: { $in: accessibleGroupIds } };
    const games = await Game.find(query)
      .populate('transactions.userId', 'username displayName')
      .populate('createdByUserId', 'username displayName')
      .populate('groupId', 'name')
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
      .populate('createdByUserId', 'username displayName')
      .populate('groupId', 'name');

    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    const group = await Group.findById(game.groupId);
    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    const isMember = group.memberIds.some(
      (memberId) => memberId.toString() === req.userId
    );
    if (!isMember) {
      res.status(403).json({ error: 'Not a member of this group' });
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

    const group = await Group.findById(game.groupId);
    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    const isMember = group.memberIds.some(
      (memberId) => memberId.toString() === req.userId
    );
    if (!isMember) {
      res.status(403).json({ error: 'Not a member of this group' });
      return;
    }

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
