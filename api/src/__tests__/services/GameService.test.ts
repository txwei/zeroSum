import { GameService } from '../../services/GameService';
import { GameRepository } from '../../repositories/GameRepository';
import { NotFoundError, ForbiddenError, ValidationError } from '../../types/errors';
import { createTestUser, createTestGroup, createTestGame } from '../helpers/testHelpers';
import mongoose from 'mongoose';

describe('GameService', () => {
  let gameService: GameService;
  let gameRepository: GameRepository;

  beforeEach(() => {
    gameService = new GameService();
    gameRepository = new GameRepository();
  });

  describe('createGame', () => {
    it('should create a new game', async () => {
      const testUser = await createTestUser('creator', 'Creator');
      const testGroup = await createTestGroup(testUser._id, 'Test Group', undefined, undefined, true);

      const game = await gameService.createGame(
        testUser._id.toString(),
        'New Game',
        testGroup._id.toString()
      );

      expect(game.name).toBe('New Game');
      expect(game.groupId).toBe(testGroup._id.toString());
    });

    it('should validate zero-sum transactions', async () => {
      const testUser = await createTestUser('creator', 'Creator');
      const testGroup = await createTestGroup(testUser._id, 'Test Group', undefined, undefined, true);

      const transactions = [
        { amount: 100 },
        { amount: -50 },
        { amount: -50 },
      ];

      const game = await gameService.createGame(
        testUser._id.toString(),
        'New Game',
        testGroup._id.toString(),
        undefined,
        transactions
      );

      expect(game).toBeDefined();
    });

    it('should throw ValidationError for non-zero-sum transactions', async () => {
      const testUser = await createTestUser('creator', 'Creator');
      const testGroup = await createTestGroup(testUser._id, 'Test Group', undefined, undefined, true);

      const transactions = [
        { amount: 100 },
        { amount: -50 },
      ];

      await expect(
        gameService.createGame(
          testUser._id.toString(),
          'New Game',
          testGroup._id.toString(),
          undefined,
          transactions
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getGameByPublicToken', () => {
    it('should get game by public token', async () => {
      const testUser = await createTestUser('creator', 'Creator');
      const testGroup = await createTestGroup(testUser._id);
      const testGame = await createTestGame(testUser._id, testGroup._id);

      const Game = (await import('../../models/Game')).Game;
      const savedGame = await Game.findById(testGame._id);

      if (savedGame && savedGame.publicToken) {
        const game = await gameService.getGameByPublicToken(savedGame.publicToken);

        expect(game.id).toBe(testGame._id.toString());
      }
    });
  });

  describe('getGameById', () => {
    it('should get game by ID with access control', async () => {
      const testUser = await createTestUser('creator', 'Creator');
      const testGroup = await createTestGroup(testUser._id);
      const testGame = await createTestGame(testUser._id, testGroup._id);

      const game = await gameService.getGameById(testGame._id.toString(), testUser._id.toString());

      expect(game.id).toBe(testGame._id.toString());
    });

    it('should throw ForbiddenError for non-member', async () => {
      const creator = await createTestUser('creator', 'Creator');
      const nonMember = await createTestUser('nonmember', 'Non Member');
      const testGroup = await createTestGroup(creator._id, 'Private Group', undefined, undefined, false);
      const testGame = await createTestGame(creator._id, testGroup._id);

      await expect(
        gameService.getGameById(testGame._id.toString(), nonMember._id.toString())
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('settleGame', () => {
    it('should settle game successfully', async () => {
      const testUser = await createTestUser('creator', 'Creator');
      const testGroup = await createTestGroup(testUser._id);
      const testGame = await createTestGame(testUser._id, testGroup._id, 'Test Game', new Date(), [
        { playerName: 'Alice', amount: 100 },
        { playerName: 'Bob', amount: -100 },
      ]);

      const Game = (await import('../../models/Game')).Game;
      const savedGame = await Game.findById(testGame._id);

      if (savedGame && savedGame.publicToken) {
        const game = await gameService.settleGame(savedGame.publicToken);

        expect(game.settled).toBe(true);
      }
    });

    it('should throw ValidationError for duplicate player names', async () => {
      const testUser = await createTestUser('creator', 'Creator');
      const testGroup = await createTestGroup(testUser._id);
      const testGame = await createTestGame(testUser._id, testGroup._id, 'Test Game', new Date(), [
        { playerName: 'Alice', amount: 100 },
        { playerName: 'alice', amount: -100 }, // Duplicate (case-insensitive)
      ]);

      const Game = (await import('../../models/Game')).Game;
      const savedGame = await Game.findById(testGame._id);

      if (savedGame && savedGame.publicToken) {
        await expect(
          gameService.settleGame(savedGame.publicToken)
        ).rejects.toThrow(ValidationError);
      }
    });
  });

  describe('updateTransactionField', () => {
    it('should update transaction field', async () => {
      const testUser = await createTestUser('creator', 'Creator');
      const testGroup = await createTestGroup(testUser._id);
      const testGame = await createTestGame(testUser._id, testGroup._id);

      const Game = (await import('../../models/Game')).Game;
      const savedGame = await Game.findById(testGame._id);

      if (savedGame && savedGame.publicToken) {
        const game = await gameService.updateTransactionField(
          savedGame.publicToken,
          0,
          'amount',
          50
        );

        expect(game).toBeDefined();
      }
    });

    it('should throw ForbiddenError for settled game', async () => {
      const testUser = await createTestUser('creator', 'Creator');
      const testGroup = await createTestGroup(testUser._id);
      const testGame = await createTestGame(testUser._id, testGroup._id);

      const Game = (await import('../../models/Game')).Game;
      const savedGame = await Game.findById(testGame._id);
      if (savedGame) {
        savedGame.settled = true;
        await savedGame.save();

        if (savedGame.publicToken) {
          await expect(
            gameService.updateTransactionField(savedGame.publicToken, 0, 'amount', 50)
          ).rejects.toThrow(ForbiddenError);
        }
      }
    });
  });
});

