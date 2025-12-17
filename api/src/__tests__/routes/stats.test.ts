import request from 'supertest';
import express from 'express';
import statsRoutes from '../../routes/stats';
import { authenticate } from '../../middleware/auth';
import { createTestUser, createTestGroup } from '../helpers/testHelpers';
import { createAuthHeader } from '../helpers/authHelpers';
import mongoose from 'mongoose';

const app = express();
app.use(express.json());
app.use('/api/stats', authenticate, statsRoutes);

describe('Stats Routes', () => {
  let user1: { _id: mongoose.Types.ObjectId };
  let group: any;
  let user1Token: string;

  beforeEach(async () => {
    user1 = await createTestUser('user1', 'User 1');
    group = await createTestGroup(user1._id, 'Test Group');
    user1Token = createAuthHeader(user1._id);
  });

  describe('GET /api/stats/totals', () => {
    it('should return cumulative totals for a group', async () => {
      const response = await request(app)
        .get(`/api/stats/totals?groupId=${group._id}`)
        .set('Authorization', user1Token);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return cumulative totals for all groups when groupId not provided', async () => {
      const response = await request(app)
        .get('/api/stats/totals')
        .set('Authorization', user1Token);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 403 when user is not a member of the group', async () => {
      const user2 = await createTestUser('user2', 'User 2');
      const user2Token = createAuthHeader(user2._id);

      const response = await request(app)
        .get(`/api/stats/totals?groupId=${group._id}`)
        .set('Authorization', user2Token);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/stats/user/:userId', () => {
    it('should return user game history for a group', async () => {
      const response = await request(app)
        .get(`/api/stats/user/${user1._id}?groupId=${group._id}`)
        .set('Authorization', user1Token);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return user game history for all groups when groupId not provided', async () => {
      const response = await request(app)
        .get(`/api/stats/user/${user1._id}`)
        .set('Authorization', user1Token);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 403 when user is not a member of the group', async () => {
      const user2 = await createTestUser('user2', 'User 2');
      const user2Token = createAuthHeader(user2._id);

      const response = await request(app)
        .get(`/api/stats/user/${user2._id}?groupId=${group._id}`)
        .set('Authorization', user2Token);

      expect(response.status).toBe(403);
    });
  });
});

