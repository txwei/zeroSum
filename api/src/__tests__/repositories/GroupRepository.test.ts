import { GroupRepository } from '../../repositories/GroupRepository';
import { NotFoundError } from '../../types/errors';
import { createTestUser, createTestGroup } from '../helpers/testHelpers';
import mongoose from 'mongoose';

describe('GroupRepository', () => {
  let groupRepository: GroupRepository;

  beforeEach(() => {
    groupRepository = new GroupRepository();
  });

  describe('findById', () => {
    it('should find group by ID', async () => {
      const testUser = await createTestUser('creator', 'Creator');
      const testGroup = await createTestGroup(testUser._id);

      const group = await groupRepository.findById(testGroup._id.toString());

      expect(group._id.toString()).toBe(testGroup._id.toString());
      expect(group.name).toBe(testGroup.name);
    });

    it('should throw NotFoundError for non-existent group', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await expect(
        groupRepository.findById(fakeId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('findPublicGroups', () => {
    it('should find public groups', async () => {
      const testUser = await createTestUser('creator', 'Creator');
      await createTestGroup(testUser._id, 'Public Group', undefined, undefined, true);
      await createTestGroup(testUser._id, 'Private Group', undefined, undefined, false);

      const groups = await groupRepository.findPublicGroups();

      expect(groups.length).toBeGreaterThan(0);
      expect(groups.every(g => g.isPublic === true)).toBe(true);
    });
  });

  describe('findUserGroups', () => {
    it('should find groups where user is a member', async () => {
      const testUser = await createTestUser('creator', 'Creator');
      await createTestGroup(testUser._id, 'User Group');

      const groups = await groupRepository.findUserGroups(testUser._id.toString());

      expect(groups.length).toBeGreaterThan(0);
      expect(groups.some(g => g.memberIds.some(id => id.toString() === testUser._id.toString()))).toBe(true);
    });
  });

  describe('create', () => {
    it('should create a new group', async () => {
      const testUser = await createTestUser('creator', 'Creator');

      const group = await groupRepository.create({
        name: 'New Group',
        description: 'Description',
        createdByUserId: testUser._id,
        memberIds: [testUser._id],
        isPublic: true,
      });

      expect(group.name).toBe('New Group');
      expect(group.description).toBe('Description');
      expect(group.isPublic).toBe(true);
    });
  });

  describe('addMember', () => {
    it('should add member to group', async () => {
      const creator = await createTestUser('creator', 'Creator');
      const newMember = await createTestUser('newmember', 'New Member');
      const testGroup = await createTestGroup(creator._id);

      const updated = await groupRepository.addMember(
        testGroup._id.toString(),
        newMember._id
      );

      expect(updated.memberIds.some(id => id.toString() === newMember._id.toString())).toBe(true);
    });
  });

  describe('removeMember', () => {
    it('should remove member from group', async () => {
      const creator = await createTestUser('creator', 'Creator');
      const member = await createTestUser('member', 'Member');
      const testGroup = await createTestGroup(creator._id, 'Test Group', undefined, [creator._id, member._id]);

      const updated = await groupRepository.removeMember(
        testGroup._id.toString(),
        member._id.toString()
      );

      expect(updated.memberIds.some(id => id.toString() === member._id.toString())).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete group', async () => {
      const testUser = await createTestUser('creator', 'Creator');
      const testGroup = await createTestGroup(testUser._id);

      await groupRepository.delete(testGroup._id.toString());

      await expect(
        groupRepository.findById(testGroup._id.toString())
      ).rejects.toThrow(NotFoundError);
    });
  });
});

