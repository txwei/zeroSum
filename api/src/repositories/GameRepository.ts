import mongoose from 'mongoose';
import { Game, IGame } from '../models/Game';
import { NotFoundError } from '../types/errors';

export class GameRepository {
  async findById(id: string): Promise<IGame> {
    const game = await Game.findById(id)
      .populate('transactions.userId', 'username displayName')
      .populate('createdByUserId', 'username displayName')
      .populate('groupId', 'name');
    
    if (!game) {
      throw new NotFoundError('Game');
    }
    
    return game;
  }

  async findByPublicToken(token: string): Promise<IGame> {
    const game = await Game.findOne({ publicToken: token })
      .populate('transactions.userId', 'username displayName')
      .populate('createdByUserId', 'username displayName')
      .populate('groupId', 'name');
    
    if (!game) {
      throw new NotFoundError('Game');
    }
    
    return game;
  }

  async findByGroupId(groupId: string): Promise<IGame[]> {
    return Game.find({ groupId: new mongoose.Types.ObjectId(groupId) })
      .populate('transactions.userId', 'username displayName')
      .populate('createdByUserId', 'username displayName')
      .populate('groupId', 'name')
      .sort({ date: -1, createdAt: -1 });
  }

  async findByGroupIds(groupIds: mongoose.Types.ObjectId[]): Promise<IGame[]> {
    return Game.find({ groupId: { $in: groupIds } })
      .populate('transactions.userId', 'username displayName')
      .populate('createdByUserId', 'username displayName')
      .populate('groupId', 'name')
      .sort({ date: -1, createdAt: -1 });
  }

  async findByGroupIdWithDateFilter(
    groupId: string,
    dateFilter: any
  ): Promise<IGame[]> {
    const query: any = { groupId: new mongoose.Types.ObjectId(groupId) };
    
    if (Object.keys(dateFilter).length > 0) {
      query.$and = [
        { groupId: new mongoose.Types.ObjectId(groupId) },
        dateFilter,
      ];
    }

    return Game.find(query).populate('transactions.userId', 'username displayName');
  }

  async findByGroupIdsWithDateFilter(
    groupIds: mongoose.Types.ObjectId[],
    dateFilter: any
  ): Promise<IGame[]> {
    let query: any = { groupId: { $in: groupIds } };
    
    if (Object.keys(dateFilter).length > 0) {
      query.$and = [
        { groupId: { $in: groupIds } },
        dateFilter,
      ];
    }

    return Game.find(query).populate('transactions.userId', 'username displayName');
  }

  async findByUserTransactions(
    userId: string,
    groupIds: mongoose.Types.ObjectId[],
    groupId?: string
  ): Promise<IGame[]> {
    let query: any = {
      'transactions.userId': userId,
      groupId: { $in: groupIds },
    };

    if (groupId) {
      query.groupId = new mongoose.Types.ObjectId(groupId);
    }

    return Game.find(query)
      .populate('transactions.userId', 'username displayName')
      .populate('createdByUserId', 'username displayName')
      .populate('groupId', 'name')
      .sort({ date: -1, createdAt: -1 });
  }

  async findByTrends(
    groupId: string,
    userIds: string[],
    playerNames: string[]
  ): Promise<IGame[]> {
    const queryConditions: any[] = [];
    
    if (userIds.length > 0) {
      queryConditions.push({
        'transactions.userId': { $in: userIds.map(id => new mongoose.Types.ObjectId(id)) },
      });
    }
    
    if (playerNames.length > 0) {
      queryConditions.push({
        'transactions.playerName': { $in: playerNames },
      });
    }

    const query: any = {
      groupId: new mongoose.Types.ObjectId(groupId),
    };
    
    if (queryConditions.length > 0) {
      query.$or = queryConditions;
    }

    return Game.find(query)
      .populate('transactions.userId', 'username displayName')
      .sort({ date: 1, createdAt: 1 });
  }

  async create(gameData: Partial<IGame>): Promise<IGame> {
    const game = new Game(gameData);
    await game.save();
    await game.populate('transactions.userId', 'username displayName');
    await game.populate('createdByUserId', 'username displayName');
    await game.populate('groupId', 'name');
    return game;
  }

  async update(id: string, updates: Partial<IGame>): Promise<IGame> {
    const game = await Game.findByIdAndUpdate(id, updates, { new: true })
      .populate('transactions.userId', 'username displayName')
      .populate('createdByUserId', 'username displayName')
      .populate('groupId', 'name');
    
    if (!game) {
      throw new NotFoundError('Game');
    }
    
    return game;
  }

  async save(game: IGame): Promise<IGame> {
    await game.save();
    await game.populate('transactions.userId', 'username displayName');
    await game.populate('createdByUserId', 'username displayName');
    await game.populate('groupId', 'name');
    return game;
  }

  async delete(id: string): Promise<void> {
    const result = await Game.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundError('Game');
    }
  }

  async existsByPublicToken(token: string): Promise<boolean> {
    const count = await Game.countDocuments({ publicToken: token });
    return count > 0;
  }
}


