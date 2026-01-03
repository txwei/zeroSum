import { GameRepository } from '../../repositories/GameRepository';
import { NotFoundError } from '../../types/errors';
import { createTestUser, createTestGroup, createTestGame } from '../helpers/testHelpers';
import mongoose from 'mongoose';

describe('GameRepository', () => {
  let gameRepository: GameRepository;

  beforeEach(() => {
    gameRepository = new GameRepository();
  });

  describe('findById', () => {
    it('should find game by ID', async () => {
      const testUser = await createTestUser('creator', 'Creator');
      const testGroup = await createTestGroup(testUser._id);
      const testGame = await createTestGame(testUser._id, testGroup._id);

      const game = await gameRepository.findById(testGame._id.toString());

      expect(game._id.toString()).toBe(testGame._id.toString());
      expect(game.name).toBe(testGame.name);
    });

    it('should throw NotFoundError for non-existent game', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await expect(
        gameRepository.findById(fakeId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('findByPublicToken', () => {
    it('should find game by public token', async () => {
      const testUser = await createTestUser('creator', 'Creator');
      const testGroup = await createTestGroup(testUser._id);
      const testGame = await createTestGame(testUser._id, testGroup._id);
      
      // Get the actual token from the saved game
      const Game = (await import('../../models/Game')).Game;
      const savedGame = await Game.findById(testGame._id);

      if (savedGame && savedGame.publicToken) {
        const game = await gameRepository.findByPublicToken(savedGame.publicToken);

        expect(game._id.toString()).toBe(testGame._id.toString());
      }
    });

    it('should throw NotFoundError for invalid token', async () => {
      await expect(
        gameRepository.findByPublicToken('invalid-token')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('findByGroupId', () => {
    it('should find games by group ID', async () => {
      const testUser = await createTestUser('creator', 'Creator');
      const testGroup = await createTestGroup(testUser._id);
      await createTestGame(testUser._id, testGroup._id, 'Game 1');
      await createTestGame(testUser._id, testGroup._id, 'Game 2');

      const games = await gameRepository.findByGroupId(testGroup._id.toString());

      expect(games.length).toBeGreaterThanOrEqual(2);
      expect(games.every(g => g.groupId.toString() === testGroup._id.toString())).toBe(true);
    });
  });

  describe('create', () => {
    it('should create a new game', async () => {
      const testUser = await createTestUser('creator', 'Creator');
      const testGroup = await createTestGroup(testUser._id);

      const game = await gameRepository.create({
        name: 'New Game',
        createdByUserId: testUser._id,
        groupId: testGroup._id,
        transactions: [],
        publicToken: 'test-token-123',
        settled: false,
      });

      expect(game.name).toBe('New Game');
      expect(game.publicToken).toBe('test-token-123');
    });
  });

  describe('update', () => {
    it('should update game', async () => {
      const testUser = await createTestUser('creator', 'Creator');
      const testGroup = await createTestGroup(testUser._id);
      const testGame = await createTestGame(testUser._id, testGroup._id);

      const updated = await gameRepository.update(testGame._id.toString(), {
        name: 'Updated Game',
      });

      expect(updated.name).toBe('Updated Game');
    });
  });

  describe('delete', () => {
    it('should delete game', async () => {
      const testUser = await createTestUser('creator', 'Creator');
      const testGroup = await createTestGroup(testUser._id);
      const testGame = await createTestGame(testUser._id, testGroup._id);

      await gameRepository.delete(testGame._id.toString());

      await expect(
        gameRepository.findById(testGame._id.toString())
      ).rejects.toThrow(NotFoundError);
    });
  });
});

