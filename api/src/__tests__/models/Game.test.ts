import { Game } from '../../models/Game';
import { createTestUser, createTestGroup, createTestGame } from '../helpers/testHelpers';
import mongoose from 'mongoose';

describe('Game Model', () => {
  let user: { _id: mongoose.Types.ObjectId };
  let group: any;

  beforeEach(async () => {
    user = await createTestUser();
    group = await createTestGroup(user._id);
  });

  describe('Required fields', () => {
    it('should create a game with required fields', async () => {
      const game = await createTestGame(user._id, group._id, 'Test Game', new Date());
      expect(game.name).toBe('Test Game');
      expect(game.createdByUserId.toString()).toBe(user._id.toString());
      expect(game.groupId.toString()).toBe(group._id.toString());
    });

    it('should fail when name is missing', async () => {
      const game = new Game({
        date: new Date(),
        createdByUserId: user._id,
        groupId: group._id,
        transactions: [],
      });
      await expect(game.save()).rejects.toThrow();
    });

    it('should allow game without date (optional field)', async () => {
      const game = new Game({
        name: 'Test Game',
        createdByUserId: user._id,
        groupId: group._id,
        transactions: [],
      });
      await game.save();
      expect(game.name).toBe('Test Game');
      expect(game.date).toBeUndefined();
    });

    it('should fail when createdByUserId is missing', async () => {
      const game = new Game({
        name: 'Test Game',
        date: new Date(),
        groupId: group._id,
        transactions: [],
      });
      await expect(game.save()).rejects.toThrow();
    });

    it('should fail when groupId is missing', async () => {
      const game = new Game({
        name: 'Test Game',
        date: new Date(),
        createdByUserId: user._id,
        transactions: [],
      });
      await expect(game.save()).rejects.toThrow();
    });
  });

  describe('Name trimming', () => {
    it('should trim whitespace from name', async () => {
      const game = new Game({
        name: '  Test Game  ',
        date: new Date(),
        createdByUserId: user._id,
        groupId: group._id,
        transactions: [],
      });
      await game.save();
      expect(game.name).toBe('Test Game');
    });
  });

  describe('Transactions', () => {
    it('should allow empty transactions array', async () => {
      const game = await createTestGame(user._id, group._id, 'Test Game', new Date(), []);
      expect(game.transactions).toEqual([]);
    });

    it('should store transactions with userId and amount', async () => {
      const user2 = await createTestUser('user2', 'User 2');
      const transactions = [
        { userId: user._id, playerName: '_', amount: 100 },
        { userId: user2._id, playerName: '_', amount: -100 },
      ];
      const game = await createTestGame(user._id, group._id, 'Test Game', new Date(), transactions);
      expect(game.transactions.length).toBe(2);
      expect(game.transactions[0].amount).toBe(100);
      expect(game.transactions[1].amount).toBe(-100);
    });
  });
});

