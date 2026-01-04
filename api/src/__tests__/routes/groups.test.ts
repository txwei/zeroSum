import request from 'supertest';
import express from 'express';
import groupRoutes from '../../routes/groups';
import { authenticate } from '../../middleware/auth';
import { createTestUser, createTestGroup } from '../helpers/testHelpers';
import { createAuthHeader } from '../helpers/authHelpers';
import mongoose from 'mongoose';
import { errorHandler } from '../../middleware/errorHandler';

const app = express();
app.use(express.json());
app.use('/api/groups', authenticate, groupRoutes);
app.use(errorHandler);

describe('Group Routes', () => {
  let user1: { _id: mongoose.Types.ObjectId };
  let user2: { _id: mongoose.Types.ObjectId };
  let user1Token: string;
  let user2Token: string;

  beforeEach(async () => {
    user1 = await createTestUser('user1', 'User 1');
    user2 = await createTestUser('user2', 'User 2');
    user1Token = createAuthHeader(user1._id);
    user2Token = createAuthHeader(user2._id);
  });

  describe('POST /api/groups', () => {
    it('should create a group successfully', async () => {
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', user1Token)
        .send({
          name: 'New Group',
          description: 'Test description',
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('New Group');
      expect(response.body.description).toBe('Test description');
      expect(response.body.createdByUserId).toBe(user1._id.toString());
      expect(response.body.memberIds.length).toBeGreaterThan(0);
    });

    it('should automatically add creator to memberIds', async () => {
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', user1Token)
        .send({
          name: 'New Group',
        });

      expect(response.status).toBe(201);
      const memberIds = response.body.memberIds; // memberIds are already strings in DTO
      expect(memberIds).toContain(user1._id.toString());
    });

    it('should fail when name is missing', async () => {
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', user1Token)
        .send({
          description: 'Test description',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Group name must be a string');
    });

    it('should fail when not authenticated', async () => {
      const response = await request(app)
        .post('/api/groups')
        .send({
          name: 'New Group',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/groups', () => {
    it('should return list of user groups', async () => {
      await createTestGroup(user1._id, 'Group 1');
      await createTestGroup(user1._id, 'Group 2');
      // Create a private group for user2 so user1 won't see it
      await createTestGroup(user2._id, 'Group 3', undefined, [user2._id], false);

      const response = await request(app)
        .get('/api/groups')
        .set('Authorization', user1Token);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('name');
    });
  });

  describe('GET /api/groups/:id', () => {
    it('should return group details for a member', async () => {
      const group = await createTestGroup(user1._id, 'Test Group', undefined, [
        user1._id,
        user2._id,
      ]);

      const response = await request(app)
        .get(`/api/groups/${group._id}`)
        .set('Authorization', user2Token);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Test Group');
    });

    it('should return 403 for non-member', async () => {
      // Create a private group for this test
      const group = await createTestGroup(user1._id, 'Test Group', undefined, [
        user1._id,
      ], false);

      const response = await request(app)
        .get(`/api/groups/${group._id}`)
        .set('Authorization', user2Token);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Not a member of this group');
    });
  });

  describe('PATCH /api/groups/:id', () => {
    it('should update group name (admin only)', async () => {
      const group = await createTestGroup(user1._id, 'Old Name');

      const response = await request(app)
        .patch(`/api/groups/${group._id}`)
        .set('Authorization', user1Token)
        .send({
          name: 'New Name',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('New Name');
    });

    it('should return 403 when non-admin tries to update', async () => {
      const group = await createTestGroup(user1._id, 'Test Group', undefined, [
        user1._id,
        user2._id,
      ]);

      const response = await request(app)
        .patch(`/api/groups/${group._id}`)
        .set('Authorization', user2Token)
        .send({
          name: 'New Name',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Only admin can update the group');
    });
  });

  describe('POST /api/groups/:id/members', () => {
    it('should add member to group (any member can add)', async () => {
      const group = await createTestGroup(user1._id, 'Test Group', undefined, [
        user1._id,
        user2._id,
      ]);
      const user3 = await createTestUser('user3', 'User 3');

      const response = await request(app)
        .post(`/api/groups/${group._id}/members`)
        .set('Authorization', user2Token) // Non-admin member
        .send({
          username: 'user3',
        });

      expect(response.status).toBe(200);
      const memberIds = response.body.memberIds; // memberIds are already strings in DTO
      expect(memberIds).toContain(user3._id.toString());
    });

    it('should return 403 when non-member tries to add', async () => {
      const group = await createTestGroup(user1._id, 'Test Group', undefined, [
        user1._id,
      ]);
      const user3 = await createTestUser('user3', 'User 3');

      const response = await request(app)
        .post(`/api/groups/${group._id}/members`)
        .set('Authorization', user2Token) // Not a member
        .send({
          username: 'user3',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/groups/:groupId/members/:memberId', () => {
    it('should remove member (admin only)', async () => {
      const group = await createTestGroup(user1._id, 'Test Group', undefined, [
        user1._id,
        user2._id,
      ]);

      const response = await request(app)
        .delete(`/api/groups/${group._id}/members/${user2._id}`)
        .set('Authorization', user1Token); // Admin

      expect(response.status).toBe(200);
      const memberIds = response.body.memberIds.map((m: any) => m.id || m._id);
      expect(memberIds).not.toContain(user2._id.toString());
    });

    it('should return 403 when non-admin tries to remove', async () => {
      const group = await createTestGroup(user1._id, 'Test Group', undefined, [
        user1._id,
        user2._id,
      ]);
      const user3 = await createTestUser('user3', 'User 3');
      const user3Token = createAuthHeader(user3._id);

      // Add user3 to group
      await request(app)
        .post(`/api/groups/${group._id}/members`)
        .set('Authorization', user1Token)
        .send({ username: 'user3' });

      const response = await request(app)
        .delete(`/api/groups/${group._id}/members/${user2._id}`)
        .set('Authorization', user3Token); // Non-admin member

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Only admin can remove members');
    });
  });

  describe('DELETE /api/groups/:id', () => {
    it('should delete group (admin only)', async () => {
      const group = await createTestGroup(user1._id, 'Test Group');

      const response = await request(app)
        .delete(`/api/groups/${group._id}`)
        .set('Authorization', user1Token);

      expect(response.status).toBe(200);

      // Verify group is deleted
      const getResponse = await request(app)
        .get(`/api/groups/${group._id}`)
        .set('Authorization', user1Token);
      expect(getResponse.status).toBe(404);
    });

    it('should return 403 when non-admin tries to delete', async () => {
      const group = await createTestGroup(user1._id, 'Test Group', undefined, [
        user1._id,
        user2._id,
      ]);

      const response = await request(app)
        .delete(`/api/groups/${group._id}`)
        .set('Authorization', user2Token);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Only admin can delete the group');
    });
  });
});

