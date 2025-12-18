import express, { Response, Request } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Game } from '../models/Game';
import { Group } from '../models/Group';
import { User } from '../models/User';
import { isGroupMember } from '../middleware/groupAuth';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

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
    const { q } = req.query; // Search query

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

    // Search all users by displayName or username
    const searchRegex = new RegExp(q, 'i');
    const allUsers = await User.find({
      $or: [
        { displayName: searchRegex },
        { username: searchRegex },
      ],
    }).select('username displayName').limit(10);

    // Categorize users: in group vs not in group
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

// Update game name/date via public link
router.put('/public/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { name, date } = req.body;

    if (!name && !date) {
      res.status(400).json({ error: 'name or date is required' });
      return;
    }

    const game = await Game.findOne({ publicToken: token });
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    if (name) {
      game.name = name.trim();
    }
    if (date) {
      game.date = new Date(date);
    }

    await game.save();
    await game.populate('transactions.userId', 'username displayName');
    await game.populate('createdByUserId', 'username displayName');
    await game.populate('groupId', 'name');

    res.json(game);
  } catch (error) {
    console.error('Update public game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add/update transaction via public link (allows editing any transaction)
router.post('/public/:token/transactions', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { userId, playerName, amount, transactionIndex } = req.body;

    if (amount === undefined) {
      res.status(400).json({ error: 'amount is required' });
      return;
    }

    if (!userId && !playerName) {
      res.status(400).json({ error: 'Either userId or playerName is required' });
      return;
    }

    const game = await Game.findOne({ publicToken: token });
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    // If userId is provided, verify user is a member of the group
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      const group = await Group.findById(game.groupId);
      if (!group) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      const isMember = group.memberIds.some(
        (memberId) => memberId.toString() === userId
      );
      if (!isMember) {
        res.status(403).json({ error: 'User is not a member of this group' });
        return;
      }
    }

    // If transactionIndex is provided, update that specific transaction
    if (transactionIndex !== undefined && transactionIndex >= 0 && transactionIndex < game.transactions.length) {
      const transaction = game.transactions[transactionIndex];
      transaction.amount = amount;
      if (userId) {
        transaction.userId = new mongoose.Types.ObjectId(userId);
        transaction.playerName = undefined;
      } else if (playerName) {
        transaction.playerName = playerName.trim();
        transaction.userId = undefined;
      }
    } else {
      // Find existing transaction by userId or playerName
      let existingIndex = -1;
      if (userId) {
        existingIndex = game.transactions.findIndex(
          (t) => t.userId && t.userId.toString() === userId
        );
      } else if (playerName) {
        existingIndex = game.transactions.findIndex(
          (t) => t.playerName && t.playerName.trim().toLowerCase() === playerName.trim().toLowerCase()
        );
      }

      if (existingIndex >= 0) {
        // Update existing transaction
        game.transactions[existingIndex].amount = amount;
        if (userId) {
          game.transactions[existingIndex].userId = new mongoose.Types.ObjectId(userId);
          game.transactions[existingIndex].playerName = undefined;
        } else if (playerName) {
          game.transactions[existingIndex].playerName = playerName.trim();
          game.transactions[existingIndex].userId = undefined;
        }
      } else {
        // Add new transaction
        const newTransaction: any = {
          amount,
          createdAt: new Date(),
        };
        if (userId) {
          newTransaction.userId = new mongoose.Types.ObjectId(userId);
        } else {
          newTransaction.playerName = playerName.trim();
        }
        game.transactions.push(newTransaction);
      }
    }

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
    await game.populate('groupId', 'name');

    res.json(game);
  } catch (error) {
    console.error('Add/update public transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete transaction via public link
router.delete('/public/:token/transactions', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { index } = req.query;

    if (index === undefined) {
      res.status(400).json({ error: 'index query parameter is required' });
      return;
    }

    const transactionIndex = parseInt(index as string, 10);
    if (isNaN(transactionIndex) || transactionIndex < 0) {
      res.status(400).json({ error: 'Invalid transaction index' });
      return;
    }

    const game = await Game.findOne({ publicToken: token });
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    if (transactionIndex >= game.transactions.length) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    game.transactions.splice(transactionIndex, 1);

    await game.save();
    await game.populate('transactions.userId', 'username displayName');
    await game.populate('createdByUserId', 'username displayName');
    await game.populate('groupId', 'name');

    res.json(game);
  } catch (error) {
    console.error('Delete public transaction error:', error);
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

    // Check if game exists
    const game = await Game.findOne({ publicToken: token });
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      res.status(400).json({ error: 'Username already exists' });
      return;
    }

    // Hash password if provided, otherwise use a default
    const passwordToHash = password || crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(passwordToHash, 10);

    // Create user
    const user = new User({
      username: username.toLowerCase(),
      displayName,
      passwordHash,
    });

    await user.save();

    // Auto-add user to the game's group
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

    // Return user without password
    const userResponse = {
      _id: user._id,
      id: user._id,
      username: user.username,
      displayName: user.displayName,
      createdAt: user.createdAt,
    };

    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Quick signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add existing user to group (after login) - public route
router.post('/public/:token/add-user-to-group', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
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

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if user is already in group
    const userIdStr = userId.toString();
    const isMember = group.memberIds.some(
      (memberId) => memberId.toString() === userIdStr
    );

    if (!isMember) {
      group.memberIds.push(new mongoose.Types.ObjectId(userId));
      await group.save();
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        id: user._id,
        username: user.username,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    console.error('Add user to group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== AUTHENTICATED ROUTES ==========

// Create game
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, date, transactions, groupId } = req.body;

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

    // Verify group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    const userId = req.userId?.toString() || '';
    if (!isGroupMember(group, userId)) {
      res.status(403).json({ error: 'Not a member of this group' });
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

    // Retry logic for duplicate publicToken (extremely rare)
    let game;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        // Generate token upfront to ensure it's set
        const token = crypto.randomBytes(8).toString('base64url');
        console.log('Generated token for new game:', token);
        
        // Create game object
        game = new Game({
          name: name.trim(),
          date: date ? new Date(date) : undefined,
          createdByUserId: req.userId,
          groupId: new mongoose.Types.ObjectId(groupId),
          transactions: transactions || [],
        });
        
        // Set publicToken as a property (not in constructor) to ensure Mongoose recognizes it
        game.publicToken = token;
        console.log('Set publicToken on game object:', game.publicToken);

        await game.save();
        console.log('Game saved. publicToken after save:', game.publicToken);
        
        // Verify publicToken was set (should always be true now)
        if (!game.publicToken) {
          console.error('ERROR: publicToken missing after save despite being set!');
          throw new Error('Failed to set publicToken');
        }
        
        // Double-check by querying the database directly
        const savedGame = await Game.findById(game._id).lean();
        if (!savedGame || !(savedGame as any).publicToken) {
          console.error('ERROR: publicToken not found in database after save!');
          console.error('Saved game from DB keys:', savedGame ? Object.keys(savedGame) : 'null');
          throw new Error('publicToken not persisted to database');
        }
        
        console.log('Game saved successfully with publicToken:', game.publicToken);
        console.log('Verified in database:', (savedGame as any).publicToken);
        break; // Success, exit retry loop
      } catch (saveError: any) {
        // Check if it's a duplicate key error for publicToken
        if (saveError?.code === 11000 && saveError?.keyPattern?.publicToken && attempts < maxAttempts - 1) {
          attempts++;
          console.warn(`Duplicate publicToken detected, retrying (attempt ${attempts}/${maxAttempts})`);
          continue; // Retry with a new token (will be generated in next iteration)
        }
        throw saveError; // Re-throw if not a duplicate key error or max attempts reached
      }
    }
    
    if (!game) {
      throw new Error('Failed to create game after multiple attempts');
    }

    // Get the game ID and publicToken before any operations
    const gameId = game._id.toString();
    const publicTokenFromGame = game.publicToken;
    console.log('Before populate - gameId:', gameId, 'publicToken:', publicTokenFromGame);
    
    // Reload from database to get fresh copy with publicToken
    const freshGame = await Game.findById(gameId).lean();
    const publicTokenFromDB = freshGame ? (freshGame as any).publicToken : null;
    console.log('From database - publicToken:', publicTokenFromDB);
    
    await game.populate('transactions.userId', 'username displayName');
    await game.populate('createdByUserId', 'username displayName');

    // Convert to plain object
    const gameObj = game.toObject();
    
    // Build response object, ensuring publicToken is included from multiple sources
    const gameResponse: any = {
      ...gameObj,
      publicToken: publicTokenFromDB || publicTokenFromGame || game.publicToken || (gameObj as any).publicToken,
    };
    
    // Final check - if still missing, something is very wrong
    if (!gameResponse.publicToken) {
      console.error('CRITICAL ERROR: publicToken is missing from all sources!');
      console.error('game.publicToken:', game.publicToken);
      console.error('gameObj.publicToken:', (gameObj as any).publicToken);
      console.error('freshGame.publicToken:', publicTokenFromDB);
      console.error('gameResponse keys:', Object.keys(gameResponse));
      
      // This should never happen, but if it does, return error
      return res.status(500).json({ 
        error: 'Failed to generate public token for game',
        gameId: gameId 
      });
    }

    console.log('SUCCESS: Final response includes publicToken:', gameResponse.publicToken);
    
    res.status(201).json(gameResponse);
  } catch (error: any) {
    console.error('Create game error:', error);
    // Return more specific error message
    const errorMessage = error?.message || 'Internal server error';
    const statusCode = error?.name === 'ValidationError' ? 400 : 500;
    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
});

// List games
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.query;

    // Get all groups user belongs to
    const userGroups = await Group.find({
      memberIds: req.userId,
    }).select('_id');

    const groupIds = userGroups.map((g) => g._id);

    let query: any = { groupId: { $in: groupIds } };

    // If groupId is provided, filter by that group (and verify membership)
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

      const isMember = group.memberIds.some(
        (memberId) => memberId.toString() === req.userId
      );
      if (!isMember) {
        res.status(403).json({ error: 'Not a member of this group' });
        return;
      }

      query = { groupId: new mongoose.Types.ObjectId(groupId as string) };
    }

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

    // Verify user is a member of the group
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

    // Verify user is a member of the group
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

