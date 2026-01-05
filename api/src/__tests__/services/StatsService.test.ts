import { StatsService } from '../../services/StatsService';
import { ValidationError } from '../../types/errors';
import { createTestUser, createTestGroup, createTestGame } from '../helpers/testHelpers';
import { Request } from 'express';

describe('StatsService', () => {
  let statsService: StatsService;
  let mockRequest: Partial<Request>;

  beforeEach(() => {
    statsService = new StatsService();
    mockRequest = {
      headers: {},
    };
  });

  describe('getTotals', () => {
    it('should calculate totals for group', async () => {
      const testUser = await createTestUser('creator', 'Creator');
      const testGroup = await createTestGroup(testUser._id, 'Test Group', undefined, undefined, true);
      await createTestGame(testUser._id, testGroup._id, 'Game 1', new Date(), [
        { playerName: 'Alice', amount: 100 },
        { playerName: 'Bob', amount: -100 },
      ]);

      const totals = await statsService.getTotals(mockRequest as Request, testGroup._id.toString());

      expect(totals.length).toBeGreaterThan(0);
      const aliceTotal = totals.find(t => t.displayName === 'Alice');
      expect(aliceTotal?.total).toBe(100);
    });

    it('should throw ValidationError for private group without membership', async () => {
      const creator = await createTestUser('creator', 'Creator');
      const testGroup = await createTestGroup(creator._id, 'Private Group', undefined, undefined, false);

      await expect(
        statsService.getTotals(mockRequest as Request, testGroup._id.toString())
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getUserHistory', () => {
    it('should get user game history', async () => {
      const testUser = await createTestUser('creator', 'Creator');
      const testGroup = await createTestGroup(testUser._id);
      await createTestGame(testUser._id, testGroup._id, 'Game 1', new Date(), [
        { userId: testUser._id, playerName: 'Creator', amount: 50 },
        { playerName: 'Bob', amount: -50 },
      ]);

      const history = await statsService.getUserHistory(
        testUser._id.toString(),
        testUser._id.toString()
      );

      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toHaveProperty('game');
      expect(history[0]).toHaveProperty('amount');
    });
  });

  describe('getTrends', () => {
    it('should get trends data', async () => {
      const testUser = await createTestUser('creator', 'Creator');
      const testGroup = await createTestGroup(testUser._id, 'Test Group', undefined, undefined, true);
      await createTestGame(testUser._id, testGroup._id, 'Game 1', new Date(), [
        { playerName: 'Alice', amount: 100 },
        { playerName: 'Bob', amount: -100 },
      ]);

      const trends = await statsService.getTrends(
        mockRequest as Request,
        testGroup._id.toString(),
        ['playerName:Alice', 'playerName:Bob']
      );

      expect(trends).toHaveProperty('dataPoints');
      expect(trends).toHaveProperty('playerInfo');
      expect(trends.dataPoints.length).toBeGreaterThan(0);
    });

    it('should throw ValidationError for missing playerIds', async () => {
      const testUser = await createTestUser('creator', 'Creator');
      const testGroup = await createTestGroup(testUser._id);

      await expect(
        statsService.getTrends(mockRequest as Request, testGroup._id.toString(), [])
      ).rejects.toThrow(ValidationError);
    });
  });
});

