import mongoose from 'mongoose';
import { GameRepository } from '../repositories/GameRepository';
import { GroupService } from './GroupService';
import { NotFoundError, ValidationError, ForbiddenError } from '../types/errors';
import { validateObjectId, validateArray } from '../utils/validators';
import { getDateFilter } from '../utils/helpers';
import { getOptionalUserId } from '../utils/auth';
import { Request } from 'express';

export interface UserTotal {
  userId: string;
  username: string;
  displayName: string;
  total: number;
}

export interface GameHistoryItem {
  game: {
    id: string;
    name: string;
    date?: Date;
    createdBy: any;
  };
  amount: number;
}

export interface TrendsData {
  dataPoints: Array<{
    date: string;
    [playerId: string]: string | number;
  }>;
  playerInfo: Record<string, {
    username: string;
    displayName: string;
  }>;
}

export class StatsService {
  private gameRepository: GameRepository;
  private groupService: GroupService;

  constructor() {
    this.gameRepository = new GameRepository();
    this.groupService = new GroupService();
  }

  /**
   * Get cumulative totals per user
   */
  async getTotals(req: Request, groupId?: string, timePeriod?: string): Promise<UserTotal[]> {
    const userId = getOptionalUserId(req);

    if (groupId) {
      validateObjectId(groupId, 'Group ID');
      const group = await this.groupService.getRepository().findById(groupId);

      // Check access: public groups accessible to everyone, private groups require membership
      if (!group.isPublic) {
        if (!userId) {
          throw new ValidationError('Authentication required for private groups');
        }
        if (!this.groupService.isMember(group, userId)) {
          throw new ForbiddenError('Not a member of this group');
        }
      }

      const dateFilter = getDateFilter(timePeriod);
      const games = await this.gameRepository.findByGroupIdWithDateFilter(groupId, dateFilter);

      return this.calculateUserTotals(games);
    }

    // No groupId specified - return stats from all accessible groups
    const accessibleGroupIds = await this.groupService.getAccessibleGroupIds(userId);
    const dateFilter = getDateFilter(timePeriod);
    const games = await this.gameRepository.findByGroupIdsWithDateFilter(accessibleGroupIds, dateFilter);

    return this.calculateUserTotals(games);
  }

  /**
   * Get user's game history
   */
  async getUserHistory(userId: string, targetUserId: string, groupId?: string): Promise<GameHistoryItem[]> {
    validateObjectId(targetUserId, 'User ID');

    // Get all groups user belongs to
    const userGroups = await this.groupService.getRepository().findUserGroups(userId);
    const groupIds = userGroups.map(g => g._id);

    let queryGroupId: string | undefined = groupId;
    if (groupId) {
      validateObjectId(groupId, 'Group ID');
      const group = await this.groupService.getRepository().findById(groupId);
      if (!this.groupService.isMember(group, userId)) {
        throw new ForbiddenError('Not a member of this group');
      }
    }

    const games = await this.gameRepository.findByUserTransactions(targetUserId, groupIds, queryGroupId);

    return games.map((game) => {
      const userTransaction = game.transactions.find(
        (t) => t.userId && t.userId.toString() === targetUserId
      );
      return {
        game: {
          id: game._id.toString(),
          name: game.name,
          date: game.date,
          createdBy: game.createdByUserId,
        },
        amount: userTransaction ? userTransaction.amount : 0,
      };
    });
  }

  /**
   * Get trend data (time-series cumulative balances)
   */
  async getTrends(req: Request, groupId: string, playerIds: string[]): Promise<TrendsData> {
    if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      throw new ValidationError('playerIds array is required');
    }

    const userId = getOptionalUserId(req);
    validateObjectId(groupId, 'Group ID');

    const group = await this.groupService.getRepository().findById(groupId);

    // Check access: public groups accessible to everyone, private groups require membership
    if (!group.isPublic) {
      if (!userId) {
        throw new ValidationError('Authentication required for private groups');
      }
      if (!this.groupService.isMember(group, userId)) {
        throw new ValidationError('Not a member of this group');
      }
    }

    // Separate player IDs into userIds and playerNames
    const userIds: string[] = [];
    const playerNames: string[] = [];

    playerIds.forEach((id) => {
      if (id.startsWith('playerName:')) {
        playerNames.push(id.replace('playerName:', ''));
      } else if (mongoose.Types.ObjectId.isValid(id)) {
        userIds.push(id);
      }
    });

    if (userIds.length === 0 && playerNames.length === 0) {
      throw new ValidationError('No valid player IDs provided');
    }

    const games = await this.gameRepository.findByTrends(groupId, userIds, playerNames);

    return this.buildTrendsData(games, userIds, playerNames);
  }

  /**
   * Calculate user totals from games
   */
  private calculateUserTotals(games: any[]): UserTotal[] {
    const userTotals: Record<string, UserTotal> = {};

    games.forEach((game) => {
      game.transactions.forEach((transaction: any) => {
        let playerId: string;
        let username: string;
        let displayName: string;

        if (transaction.userId) {
          playerId = transaction.userId._id.toString();
          username = transaction.userId.username;
          displayName = transaction.userId.displayName;
        } else if (transaction.playerName && transaction.playerName !== '_' && transaction.playerName.trim() !== '') {
          playerId = `playerName:${transaction.playerName}`;
          username = transaction.playerName;
          displayName = transaction.playerName;
        } else {
          return;
        }

        if (!userTotals[playerId]) {
          userTotals[playerId] = {
            userId: playerId,
            username,
            displayName,
            total: 0,
          };
        }

        userTotals[playerId].total += transaction.amount;
      });
    });

    return Object.values(userTotals).sort((a, b) => b.total - a.total);
  }

  /**
   * Build trends data from games
   */
  private buildTrendsData(games: any[], userIds: string[], playerNames: string[]): TrendsData {
    const dataPoints: Array<{ date: string; [key: string]: string | number }> = [];
    const playerBalances: Record<string, number> = {};
    const playerInfo: Record<string, { username: string; displayName: string }> = {};

    const allPlayerIds = [...userIds, ...playerNames.map((name) => `playerName:${name}`)];

    // Initialize balances
    allPlayerIds.forEach((id) => {
      playerBalances[id] = 0;
    });

    // Process games chronologically
    games.forEach((game) => {
      const gameDate = game.date || game.createdAt;
      const dateKey = gameDate.toISOString().split('T')[0];

      let dataPoint = dataPoints.find((dp) => dp.date === dateKey);
      if (!dataPoint) {
        const newDataPoint: any = { date: dateKey };
        allPlayerIds.forEach((id) => {
          newDataPoint[id] = playerBalances[id];
        });
        dataPoints.push(newDataPoint);
        dataPoint = newDataPoint;
      }

      game.transactions.forEach((transaction: any) => {
        let playerId: string;
        let username: string;
        let displayName: string;

        if (transaction.userId) {
          playerId = transaction.userId._id.toString();
          username = transaction.userId.username;
          displayName = transaction.userId.displayName;
        } else if (transaction.playerName && transaction.playerName !== '_' && transaction.playerName.trim() !== '') {
          playerId = `playerName:${transaction.playerName}`;
          username = transaction.playerName;
          displayName = transaction.playerName;
        } else {
          return;
        }

        if (!allPlayerIds.includes(playerId)) {
          return;
        }

        playerBalances[playerId] += transaction.amount;

        if (!playerInfo[playerId]) {
          playerInfo[playerId] = { username, displayName };
        }

        if (dataPoint) {
          dataPoint[playerId] = playerBalances[playerId];
        }
      });
    });

    // Ensure we have at least one data point
    if (dataPoints.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      const emptyPoint: any = { date: today };
      allPlayerIds.forEach((id) => {
        emptyPoint[id] = 0;
      });
      dataPoints.push(emptyPoint);
    }

    return { dataPoints, playerInfo };
  }
}


