import { Group } from '../../models/Group';
import { createTestUser, createTestGroup } from '../helpers/testHelpers';
import mongoose from 'mongoose';

describe('Group Model', () => {
  describe('Required fields', () => {
    it('should create a group with required fields', async () => {
      const user = await createTestUser();
      const group = await createTestGroup(user._id, 'Test Group');
      expect(group.name).toBe('Test Group');
      expect(group.createdByUserId.toString()).toBe(user._id.toString());
    });

    it('should fail when name is missing', async () => {
      const user = await createTestUser();
      const group = new Group({
        createdByUserId: user._id,
        memberIds: [user._id],
      });
      await expect(group.save()).rejects.toThrow();
    });

    it('should fail when createdByUserId is missing', async () => {
      const group = new Group({
        name: 'Test Group',
        memberIds: [],
      });
      await expect(group.save()).rejects.toThrow();
    });
  });

  describe('Pre-save hook - creator auto-added to memberIds', () => {
    it('should automatically add creator to memberIds on creation', async () => {
      const user = await createTestUser();
      const group = new Group({
        name: 'Test Group',
        createdByUserId: user._id,
        memberIds: [], // Empty initially
      });
      await group.save();
      expect(group.memberIds.length).toBe(1);
      expect(group.memberIds[0].toString()).toBe(user._id.toString());
    });

    it('should not duplicate creator if already in memberIds', async () => {
      const user = await createTestUser();
      const group = new Group({
        name: 'Test Group',
        createdByUserId: user._id,
        memberIds: [user._id], // Already includes creator
      });
      await group.save();
      expect(group.memberIds.length).toBe(1);
      expect(group.memberIds[0].toString()).toBe(user._id.toString());
    });
  });

  describe('Name trimming', () => {
    it('should trim whitespace from name', async () => {
      const user = await createTestUser();
      const group = new Group({
        name: '  Test Group  ',
        createdByUserId: user._id,
        memberIds: [user._id],
      });
      await group.save();
      expect(group.name).toBe('Test Group');
    });
  });
});

