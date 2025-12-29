import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Game } from '../models/Game';
import { Group } from '../models/Group';
import { isGroupMember } from '../middleware/groupAuth';
import mongoose from 'mongoose';

const router = express.Router();

// Helper function to calculate date filter based on time period
const getDateFilter = (timePeriod: string | undefined): any => {
  if (!timePeriod || timePeriod === 'all') {
    return {};
  }

  const now = new Date();
  let startDate: Date;

  switch (timePeriod) {
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    default:
      return {};
  }

  // Filter games where either date (if exists) or createdAt is within the time period
  // This handles cases where games might have date set or just use createdAt
  return {
    $or: [
      { date: { $gte: startDate } },
      { createdAt: { $gte: startDate } },
    ],
  };
};

// Get cumulative totals per user
router.get('/totals', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { groupId, timePeriod } = req.query;

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

      const userId = req.userId?.toString() || '';
      if (!isGroupMember(group, userId)) {
        res.status(403).json({ error: 'Not a member of this group' });
        return;
      }

      query = { groupId: new mongoose.Types.ObjectId(groupId as string) };
    }

    // Add time period filter
    const dateFilter = getDateFilter(timePeriod as string);
    if (Object.keys(dateFilter).length > 0) {
      // When dateFilter has $or, we need to use $and to combine with groupId
      // Otherwise MongoDB might not interpret it correctly
      const groupIdCondition = query.groupId;
      query = {
        $and: [
          { groupId: groupIdCondition },
          dateFilter,
        ],
      };
    }

    const games = await Game.find(query).populate('transactions.userId', 'username displayName');

    // Calculate totals per user
    // Handle both userId-based transactions (authenticated users) and playerName-based transactions (public games)
    const userTotals: Record<
      string,
      { userId: string; username: string; displayName: string; total: number }
    > = {};

    games.forEach((game) => {
      game.transactions.forEach((transaction) => {
        let userId: string;
        let username: string;
        let displayName: string;

        if (transaction.userId) {
          // Transaction has userId (authenticated user)
          userId = transaction.userId._id.toString();
          username = (transaction.userId as any).username;
          displayName = (transaction.userId as any).displayName;
        } else if (transaction.playerName && transaction.playerName !== '_' && transaction.playerName.trim() !== '') {
          // Transaction has playerName but no userId (public game entry)
          // Use playerName as the identifier - create a unique key based on playerName
          // Note: This groups all transactions with the same playerName together
          userId = `playerName:${transaction.playerName}`;
          username = transaction.playerName;
          displayName = transaction.playerName;
        } else {
          // Skip transactions with neither userId nor valid playerName
          return;
        }

        if (!userTotals[userId]) {
          userTotals[userId] = {
            userId,
            username,
            displayName,
            total: 0,
          };
        }

        userTotals[userId].total += transaction.amount;
      });
    });

    const totals = Object.values(userTotals).sort((a, b) => b.total - a.total);

    res.json(totals);
  } catch (error) {
    console.error('Get totals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's game history
router.get('/user/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { groupId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    // Get all groups user belongs to
    const userGroups = await Group.find({
      memberIds: req.userId,
    }).select('_id');

    const groupIds = userGroups.map((g) => g._id);

    let query: any = {
      'transactions.userId': userId,
      groupId: { $in: groupIds },
    };

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

      const userId = req.userId?.toString() || '';
      if (!isGroupMember(group, userId)) {
        res.status(403).json({ error: 'Not a member of this group' });
        return;
      }

      query.groupId = new mongoose.Types.ObjectId(groupId as string);
    }

    const games = await Game.find(query)
      .populate('transactions.userId', 'username displayName')
      .populate('createdByUserId', 'username displayName')
      .populate('groupId', 'name')
      .sort({ date: -1, createdAt: -1 });

    // Calculate user's amount for each game
    const gameHistory = games.map((game) => {
      const userTransaction = game.transactions.find(
        (t) => t.userId && t.userId._id.toString() === userId
      );
      return {
        game: {
          id: game._id,
          name: game.name,
          date: game.date,
          createdBy: game.createdByUserId,
        },
        amount: userTransaction ? userTransaction.amount : 0,
      };
    });

    res.json(gameHistory);
  } catch (error) {
    console.error('Get user history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get trend data (time-series cumulative balances) for selected players
router.get('/trends', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { groupId, playerIds } = req.query;

    if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      res.status(400).json({ error: 'playerIds array is required' });
      return;
    }

    // Separate player IDs into userIds (ObjectIds) and playerNames (strings starting with "playerName:")
    const userIds: string[] = [];
    const playerNames: string[] = [];
    
    (playerIds as string[]).forEach((id) => {
      if (id.startsWith('playerName:')) {
        playerNames.push(id.replace('playerName:', ''));
      } else if (mongoose.Types.ObjectId.isValid(id)) {
        userIds.push(id);
      }
    });

    if (userIds.length === 0 && playerNames.length === 0) {
      res.status(400).json({ error: 'No valid player IDs provided' });
      return;
    }

    // Get all groups user belongs to
    const userGroups = await Group.find({
      memberIds: req.userId,
    }).select('_id');

    const groupIds = userGroups.map((g) => g._id);

    // Build query to match either userId or playerName
    const queryConditions: any[] = [];
    if (userIds.length > 0) {
      queryConditions.push({
        'transactions.userId': { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) },
      });
    }
    if (playerNames.length > 0) {
      queryConditions.push({
        'transactions.playerName': { $in: playerNames },
      });
    }

    let query: any = {
      groupId: { $in: groupIds },
    };
    
    if (queryConditions.length > 0) {
      query.$or = queryConditions;
    }

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

      const userId = req.userId?.toString() || '';
      if (!isGroupMember(group, userId)) {
        res.status(403).json({ error: 'Not a member of this group' });
        return;
      }

      query.groupId = new mongoose.Types.ObjectId(groupId as string);
    }

    const games = await Game.find(query)
      .populate('transactions.userId', 'username displayName')
      .sort({ date: 1, createdAt: 1 }); // Sort chronologically

    // Build time-series data: for each date, calculate cumulative balance for each player
    interface DataPoint {
      date: string;
      [playerId: string]: string | number;
    }

    const dataPoints: DataPoint[] = [];
    const playerBalances: Record<string, number> = {};
    const playerInfo: Record<string, { username: string; displayName: string }> = {};

    // Build map of all valid player identifiers (both userIds and playerName-based IDs)
    const allPlayerIds = [...userIds, ...playerNames.map((name) => `playerName:${name}`)];

    // Initialize balances
    allPlayerIds.forEach((id) => {
      playerBalances[id] = 0;
    });

    // Process games chronologically
    games.forEach((game) => {
      // Use game.date if available, otherwise use createdAt
      const gameDate = game.date || game.createdAt;
      const dateKey = gameDate.toISOString().split('T')[0]; // YYYY-MM-DD format

      // Find or create data point for this date
      let dataPoint = dataPoints.find((dp) => dp.date === dateKey);
      if (!dataPoint) {
        const newDataPoint: DataPoint = { date: dateKey };
        allPlayerIds.forEach((id) => {
          newDataPoint[id] = playerBalances[id];
        });
        dataPoints.push(newDataPoint);
        dataPoint = newDataPoint;
      }

      // Process transactions for this game
      game.transactions.forEach((transaction) => {
        let playerId: string;
        let username: string;
        let displayName: string;

        if (transaction.userId) {
          // Transaction has userId
          playerId = transaction.userId._id.toString();
          username = (transaction.userId as any).username;
          displayName = (transaction.userId as any).displayName;
        } else if (transaction.playerName && transaction.playerName !== '_' && transaction.playerName.trim() !== '') {
          // Transaction has playerName but no userId
          playerId = `playerName:${transaction.playerName}`;
          username = transaction.playerName;
          displayName = transaction.playerName;
        } else {
          // Skip transactions with neither userId nor valid playerName
          return;
        }

        // Only process if this player is in our selected list
        if (!allPlayerIds.includes(playerId)) {
          return;
        }

        // Update cumulative balance
        playerBalances[playerId] += transaction.amount;

        // Store player info
        if (!playerInfo[playerId]) {
          playerInfo[playerId] = {
            username,
            displayName,
          };
        }

        // Update data point with new balance
        dataPoint[playerId] = playerBalances[playerId];
      });
    });

    // Ensure we have at least one data point (even if no games)
    if (dataPoints.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      const emptyPoint: DataPoint = { date: today };
      allPlayerIds.forEach((id) => {
        emptyPoint[id] = 0;
      });
      dataPoints.push(emptyPoint);
    }

    res.json({
      dataPoints,
      playerInfo,
    });
  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

