import { isGroupMember, isGroupAdmin } from '../../middleware/groupAuth';
import { Group } from '../../models/Group';
import { createTestUser, createTestGroup } from '../helpers/testHelpers';
import mongoose from 'mongoose';

describe('Group Auth Helpers', () => {
  let user1: { _id: mongoose.Types.ObjectId };
  let user2: { _id: mongoose.Types.ObjectId };
  let group: any;

  beforeEach(async () => {
    user1 = await createTestUser('user1', 'User 1');
    user2 = await createTestUser('user2', 'User 2');
    group = await createTestGroup(user1._id, 'Test Group', undefined, [
      user1._id,
      user2._id,
    ]);
  });

  describe('isGroupMember', () => {
    it('should return true when user is a member (unpopulated memberIds)', () => {
      const result = isGroupMember(group, user1._id.toString());
      expect(result).toBe(true);
    });

    it('should return true when user is a member (populated memberIds)', async () => {
      const Group = (await import('../../models/Group')).Group;
      const populatedGroup = await Group.findById(group._id).populate('memberIds', 'username displayName');
      const result = isGroupMember(populatedGroup, user1._id.toString());
      expect(result).toBe(true);
    });

    it('should return false when user is not a member', async () => {
      const user3 = await createTestUser('user3', 'User 3');
      const result = isGroupMember(group, user3._id.toString());
      expect(result).toBe(false);
    });

    it('should return false when group is null', () => {
      const result = isGroupMember(null, user1._id.toString());
      expect(result).toBe(false);
    });

    it('should return false when userId is empty', () => {
      const result = isGroupMember(group, '');
      expect(result).toBe(false);
    });
  });

  describe('isGroupAdmin', () => {
    it('should return true when user is the group creator', () => {
      const result = isGroupAdmin(group, user1._id.toString());
      expect(result).toBe(true);
    });

    it('should return false when user is not the group creator', () => {
      const result = isGroupAdmin(group, user2._id.toString());
      expect(result).toBe(false);
    });

    it('should return false when group is null', () => {
      const result = isGroupAdmin(null, user1._id.toString());
      expect(result).toBe(false);
    });

    it('should return false when userId is empty', () => {
      const result = isGroupAdmin(group, '');
      expect(result).toBe(false);
    });
  });
});

