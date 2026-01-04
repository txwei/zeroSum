import request from 'supertest';
import express from 'express';
import userRoutes from '../../routes/users';
import { authenticate } from '../../middleware/auth';
import { createTestUser } from '../helpers/testHelpers';
import { createAuthHeader } from '../helpers/authHelpers';
import { errorHandler } from '../../middleware/errorHandler';

const app = express();
app.use(express.json());
app.use('/api/users', authenticate, userRoutes);
app.use(errorHandler);

describe('User Routes', () => {
  describe('GET /api/users/me', () => {
    it('should return current user profile', async () => {
      const user = await createTestUser('testuser', 'Test User');
      const token = createAuthHeader(user._id);

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', token);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        username: 'testuser',
        displayName: 'Test User',
      });
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/users/me');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/users/me', () => {
    it('should update display name', async () => {
      const user = await createTestUser('testuser', 'Old Name');
      const token = createAuthHeader(user._id);

      const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', token)
        .send({
          displayName: 'New Name',
        });

      expect(response.status).toBe(200);
      expect(response.body.displayName).toBe('New Name');
    });

    it('should fail when display name is empty', async () => {
      const user = await createTestUser('testuser', 'Test User');
      const token = createAuthHeader(user._id);

      const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', token)
        .send({
          displayName: '',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/users', () => {
    it('should return list of all users', async () => {
      await createTestUser('user1', 'User 1');
      await createTestUser('user2', 'User 2');
      const user3 = await createTestUser('user3', 'User 3');
      const token = createAuthHeader(user3._id);

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', token);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('username');
      expect(response.body[0]).toHaveProperty('displayName');
    });
  });
});

