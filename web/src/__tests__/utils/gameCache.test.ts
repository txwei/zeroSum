/**
 * Tests for game cache utilities
 */
import { gameDetailsCache, gameListCache, clearGameDetailsCache, clearGameListCache, clearAllCaches } from '../../utils/gameCache';
import { Game } from '../../types/api';

describe('Game Cache', () => {
  beforeEach(() => {
    clearAllCaches();
  });

  describe('gameDetailsCache', () => {
    it('should store and retrieve game details', () => {
      const game: Game = {
        _id: '1',
        name: 'Test Game',
        createdByUserId: { _id: '1', username: 'test', displayName: 'Test User' },
        groupId: { _id: '1', name: 'Test Group' },
        transactions: [],
      };

      gameDetailsCache.set('1', game);
      const retrieved = gameDetailsCache.get('1');

      expect(retrieved).toEqual(game);
    });

    it('should clear specific game details', () => {
      const game: Game = {
        _id: '1',
        name: 'Test Game',
        createdByUserId: { _id: '1', username: 'test', displayName: 'Test User' },
        groupId: { _id: '1', name: 'Test Group' },
        transactions: [],
      };

      gameDetailsCache.set('1', game);
      clearGameDetailsCache('1');

      expect(gameDetailsCache.get('1')).toBeUndefined();
    });
  });

  describe('gameListCache', () => {
    it('should store and retrieve game lists', () => {
      const games: Game[] = [
        {
          _id: '1',
          name: 'Test Game 1',
          createdByUserId: { _id: '1', username: 'test', displayName: 'Test User' },
          groupId: { _id: '1', name: 'Test Group' },
          transactions: [],
        },
      ];

      gameListCache.set('group1', games);
      const retrieved = gameListCache.get('group1');

      expect(retrieved).toEqual(games);
    });

    it('should clear specific game list', () => {
      const games: Game[] = [];
      gameListCache.set('group1', games);
      clearGameListCache('group1');

      expect(gameListCache.get('group1')).toBeUndefined();
    });
  });

  describe('clearAllCaches', () => {
    it('should clear all caches', () => {
      const game: Game = {
        _id: '1',
        name: 'Test Game',
        createdByUserId: { _id: '1', username: 'test', displayName: 'Test User' },
        groupId: { _id: '1', name: 'Test Group' },
        transactions: [],
      };

      gameDetailsCache.set('1', game);
      gameListCache.set('group1', [game]);

      clearAllCaches();

      expect(gameDetailsCache.size).toBe(0);
      expect(gameListCache.size).toBe(0);
    });
  });
});

