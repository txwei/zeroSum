import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { GameRepository } from '../repositories/GameRepository';
import { GroupService } from './GroupService';
import { TransactionService } from './TransactionService';
import { UserService } from './UserService';
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from '../types/errors';
import { validateString, validateObjectId, validateNumber } from '../utils/validators';
import { generatePublicToken, parseDate } from '../utils/helpers';
import { MAX_TOKEN_GENERATION_ATTEMPTS, BCRYPT_ROUNDS } from '../utils/constants';
import { logger } from '../utils/logger';
import { gameToDTO, GameDTO } from '../types/dto';
import { emitGameUpdate } from '../socket';
import { isSuperUser } from '../utils/superUser';
import { AuthRequest } from '../middleware/auth';

export class GameService {
  private gameRepository: GameRepository;
  private groupService: GroupService;
  private transactionService: TransactionService;
  private userService: UserService;

  constructor() {
    this.gameRepository = new GameRepository();
    this.groupService = new GroupService();
    this.transactionService = new TransactionService();
    this.userService = new UserService();
  }

  /**
   * Create a new game
   */
  async createGame(
    userId: string,
    name: string,
    groupId: string,
    date?: string,
    transactions?: Array<{ userId?: string; playerName?: string; amount: number }>
  ): Promise<GameDTO> {
    validateString(name, 'Game name', 1);
    validateObjectId(groupId, 'Group ID');

    // Verify group exists and user has access
    const group = await this.groupService.getGroupById(groupId, userId);
    const groupModel = await this.groupService.getRepository().findById(groupId);

    // For public groups, allow authenticated users to create games (even if not a member)
    // For private groups, require membership
    if (!groupModel.isPublic && !this.groupService.isMember(groupModel, userId)) {
      throw new ForbiddenError('Not a member of this group');
    }

    // If user is not a member, add them to the group (for public groups)
    if (!this.groupService.isMember(groupModel, userId)) {
      await this.groupService.getRepository().addMember(
        groupId,
        new mongoose.Types.ObjectId(userId)
      );
    }

    // Validate zero-sum if transactions are provided
    if (transactions && Array.isArray(transactions)) {
      this.transactionService.validateZeroSum(transactions);
    }

    // Process transactions
    const processedTransactions = transactions && Array.isArray(transactions)
      ? transactions.map((t) => ({
          userId: t.userId ? new mongoose.Types.ObjectId(t.userId) : undefined,
          playerName: t.playerName || '_',
          amount: t.amount,
          createdAt: new Date(),
        }))
      : [];

    // Generate unique public token
    let game;
    let attempts = 0;

    while (attempts < MAX_TOKEN_GENERATION_ATTEMPTS) {
      try {
        const token = generatePublicToken();

        game = await this.gameRepository.create({
          name: name.trim(),
          date: date ? parseDate(date) : undefined,
          createdByUserId: new mongoose.Types.ObjectId(userId),
          groupId: new mongoose.Types.ObjectId(groupId),
          transactions: processedTransactions,
          publicToken: token,
        });

        if (!game.publicToken) {
          throw new Error('Failed to set publicToken');
        }

        break;
      } catch (error: any) {
        if (error?.code === 11000 && error?.keyPattern?.publicToken && attempts < MAX_TOKEN_GENERATION_ATTEMPTS - 1) {
          attempts++;
          continue;
        }
        throw error;
      }
    }

    if (!game) {
      throw new Error('Failed to create game after multiple attempts');
    }

    logger.info('Game created', { gameId: game._id, name: game.name, createdBy: userId });

    return gameToDTO(game);
  }

  /**
   * Get game by public token
   */
  async getGameByPublicToken(token: string): Promise<GameDTO> {
    const game = await this.gameRepository.findByPublicToken(token);
    return gameToDTO(game);
  }

  /**
   * Get game by ID (with access control)
   */
  async getGameById(gameId: string, userId: string): Promise<GameDTO> {
    validateObjectId(gameId, 'Game ID');

    const game = await this.gameRepository.findById(gameId);
    const group = await this.groupService.getRepository().findById(game.groupId.toString());

    if (!this.groupService.isMember(group, userId)) {
      throw new ForbiddenError('Not a member of this group');
    }

    return gameToDTO(game);
  }

  /**
   * List games (with access control)
   */
  async listGames(userId: string | null, groupId?: string): Promise<GameDTO[]> {
    if (groupId) {
      validateObjectId(groupId, 'Group ID');
      const group = await this.groupService.getRepository().findById(groupId);

      // Check access: public groups accessible to everyone, private groups require membership
      if (!group.isPublic) {
        if (!userId) {
          throw new ForbiddenError('Authentication required for private groups');
        }
        if (!this.groupService.isMember(group, userId)) {
          throw new ForbiddenError('Not a member of this group');
        }
      }

      const games = await this.gameRepository.findByGroupId(groupId);
      return games.map(gameToDTO);
    }

    // No groupId specified - return games from all accessible groups
    const accessibleGroupIds = await this.groupService.getAccessibleGroupIds(userId);
    const games = await this.gameRepository.findByGroupIds(accessibleGroupIds);
    return games.map(gameToDTO);
  }

  /**
   * Update game name
   */
  async updateGameName(token: string, name: string): Promise<GameDTO> {
    validateString(name, 'Game name', 1);

    const game = await this.gameRepository.findByPublicToken(token);

    if (game.settled) {
      throw new ForbiddenError('Game is settled and cannot be edited');
    }

    game.name = name.trim();
    const updatedGame = await this.gameRepository.save(game);

    emitGameUpdate(token, updatedGame.toJSON());

    return gameToDTO(updatedGame);
  }

  /**
   * Update game date
   */
  async updateGameDate(token: string, date?: string): Promise<GameDTO> {
    const game = await this.gameRepository.findByPublicToken(token);

    if (game.settled) {
      throw new ForbiddenError('Game is settled and cannot be edited');
    }

    game.date = date ? parseDate(date) : undefined;
    const updatedGame = await this.gameRepository.save(game);

    emitGameUpdate(token, updatedGame.toJSON());

    return gameToDTO(updatedGame);
  }

  /**
   * Update transaction field
   */
  async updateTransactionField(
    token: string,
    rowId: number,
    field: 'playerName' | 'amount',
    value: string | number
  ): Promise<GameDTO> {
    if (!['playerName', 'amount'].includes(field)) {
      throw new ValidationError('field must be "playerName" or "amount"');
    }

    const game = await this.gameRepository.findByPublicToken(token);

    if (game.settled) {
      throw new ForbiddenError('Game is settled and cannot be edited');
    }

    const rowIndex = parseInt(rowId.toString(), 10);
    if (isNaN(rowIndex) || rowIndex < 0) {
      throw new ValidationError('Invalid row index');
    }

    // Create missing rows
    while (game.transactions.length <= rowIndex) {
      game.transactions.push({
        playerName: '_',
        amount: 0,
        createdAt: new Date(),
      });
    }

    const transaction = game.transactions[rowIndex];

    if (field === 'playerName') {
      const trimmedValue = (value as string)?.trim() || '';
      if (trimmedValue === '' && transaction.playerName && transaction.playerName !== '_') {
        transaction.playerName = '_';
      } else {
        transaction.playerName = trimmedValue || '_';
      }
      transaction.userId = undefined;
    } else if (field === 'amount') {
      const numValue = parseFloat(value.toString());
      if (isNaN(numValue)) {
        throw new ValidationError('amount must be a valid number');
      }
      transaction.amount = numValue;
    }

    if (!transaction.playerName || transaction.playerName.trim() === '') {
      transaction.playerName = '_';
    }

    const updatedGame = await this.gameRepository.save(game);

    emitGameUpdate(token, updatedGame.toJSON());

    return gameToDTO(updatedGame);
  }

  /**
   * Add transaction
   */
  async addTransaction(token: string, playerName?: string, amount?: number): Promise<GameDTO> {
    const game = await this.gameRepository.findByPublicToken(token);

    if (game.settled) {
      throw new ForbiddenError('Game is settled and cannot be edited');
    }

    const newTransaction: any = {
      playerName: playerName?.trim() || '_',
      amount: amount || 0,
      createdAt: new Date(),
    };

    game.transactions.push(newTransaction);
    const updatedGame = await this.gameRepository.save(game);

    emitGameUpdate(token, updatedGame.toJSON());

    return gameToDTO(updatedGame);
  }

  /**
   * Delete transaction
   */
  async deleteTransaction(token: string, rowId: number): Promise<GameDTO> {
    const game = await this.gameRepository.findByPublicToken(token);

    if (game.settled) {
      throw new ForbiddenError('Game is settled and cannot be edited');
    }

    const rowIndex = parseInt(rowId.toString(), 10);
    if (isNaN(rowIndex) || rowIndex < 0 || rowIndex >= game.transactions.length) {
      throw new NotFoundError('Transaction');
    }

    game.transactions.splice(rowIndex, 1);
    const updatedGame = await this.gameRepository.save(game);

    emitGameUpdate(token, updatedGame.toJSON());

    return gameToDTO(updatedGame);
  }

  /**
   * Settle game
   */
  async settleGame(token: string): Promise<GameDTO> {
    const game = await this.gameRepository.findByPublicToken(token);

    // Check for duplicate player names
    const duplicates = this.transactionService.checkDuplicatePlayerNames(game.transactions);
    if (duplicates.length > 0) {
      const error = new ValidationError('Cannot settle game: duplicate player names found');
      (error as any).duplicates = duplicates;
      throw error;
    }

    game.settled = true;
    const updatedGame = await this.gameRepository.save(game);

    emitGameUpdate(token, updatedGame.toJSON());

    logger.info('Game settled', { gameId: game._id, token });

    return gameToDTO(updatedGame);
  }

  /**
   * Unsettle game (make editable)
   */
  async unsettleGame(token: string): Promise<GameDTO> {
    const game = await this.gameRepository.findByPublicToken(token);

    game.settled = false;
    const updatedGame = await this.gameRepository.save(game);

    emitGameUpdate(token, updatedGame.toJSON());

    return gameToDTO(updatedGame);
  }

  /**
   * Delete game
   */
  async deleteGame(gameId: string, userId: string, req?: AuthRequest): Promise<void> {
    validateObjectId(gameId, 'Game ID');

    const game = await this.gameRepository.findById(gameId);
    const group = await this.groupService.getRepository().findById(game.groupId.toString());

    // Super user can delete any game, otherwise check permissions
    if (!isSuperUser(req || {} as AuthRequest)) {
      if (!this.groupService.isMember(group, userId)) {
        throw new ForbiddenError('Not a member of this group');
      }

      if (game.createdByUserId.toString() !== userId) {
        throw new ForbiddenError('Not authorized to delete this game');
      }
    }

    await this.gameRepository.delete(gameId);

    logger.info('Game deleted', { gameId, deletedBy: userId });
  }

  /**
   * Get group members for public game
   */
  async getGameMembers(token: string): Promise<any[]> {
    const game = await this.gameRepository.findByPublicToken(token);
    const group = await this.groupService.getRepository().findByIdPopulated(game.groupId.toString());
    return group.memberIds as any[];
  }

  /**
   * Search users for public game
   */
  async searchUsersForGame(token: string, query: string): Promise<{
    inGroup: any[];
    notInGroup: any[];
  }> {
    if (!query || typeof query !== 'string') {
      throw new ValidationError('Search query is required');
    }

    const game = await this.gameRepository.findByPublicToken(token);
    const group = await this.groupService.getRepository().findById(game.groupId.toString());

    const allUsers = await this.userService.getRepository().searchUsers(query, 10);

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

    return {
      inGroup: usersInGroup,
      notInGroup: usersNotInGroup,
    };
  }

  /**
   * Quick signup via public game link
   */
  async quickSignup(token: string, username: string, displayName: string, password?: string): Promise<any> {
    const game = await this.gameRepository.findByPublicToken(token);
    const group = await this.groupService.getRepository().findById(game.groupId.toString());

    // Hash password
    const passwordToHash = password || crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(passwordToHash, BCRYPT_ROUNDS);

    // Create user
    const user = await this.userService.getRepository().create({
      username,
      displayName,
      passwordHash,
    });

    // Add user to group if not already a member
    const userIdStr = user._id.toString();
    if (!this.groupService.isMember(group, userIdStr)) {
      await this.groupService.getRepository().addMember(
        game.groupId.toString(),
        user._id
      );
    }

    return {
      _id: user._id,
      id: user._id,
      username: user.username,
      displayName: user.displayName,
      createdAt: user.createdAt,
    };
  }
}

