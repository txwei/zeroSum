import { GroupService } from '../../services/GroupService';
import { GroupRepository } from '../../repositories/GroupRepository';
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from '../../types/errors';
import { createTestUser, createTestGroup } from '../helpers/testHelpers';
import mongoose from 'mongoose';

describe('GroupService', () => {
  let groupService: GroupService;
  let groupRepository: GroupRepository;

  beforeEach(() => {
    groupService = new GroupService();
    groupRepository = new GroupRepository();
  });

  describe('createGroup', () => {
    it('should create a new group', async () => {
      const testUser = await createTestUser('creator', 'Creator');

      const group = await groupService.createGroup(
        testUser._id.toString(),
        'New Group',
        'Description',
        true
      );

      expect(group.name).toBe('New Group');
      expect(group.description).toBe('Description');
      expect(group.isPublic).toBe(true);
      expect(group.memberIds).toContain(testUser._id.toString());
    });

    it('should throw ValidationError for empty name', async () => {
      const testUser = await createTestUser('creator', 'Creator');

      await expect(
        groupService.createGroup(testUser._id.toString(), '', 'Description')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getGroupById', () => {
    it('should get public group without auth', async () => {
      const testUser = await createTestUser('creator', 'Creator');
      const testGroup = await createTestGroup(testUser._id, 'Public Group', undefined, undefined, true);

      const group = await groupService.getGroupById(testGroup._id.toString(), null);

      expect(group.id).toBe(testGroup._id.toString());
      expect(group.name).toBe('Public Group');
    });

    it('should get private group with membership', async () => {
      const testUser = await createTestUser('creator', 'Creator');
      const testGroup = await createTestGroup(testUser._id, 'Private Group', undefined, undefined, false);

      const group = await groupService.getGroupById(testGroup._id.toString(), testUser._id.toString());

      expect(group.id).toBe(testGroup._id.toString());
    });

    it('should throw ForbiddenError for private group without membership', async () => {
      const creator = await createTestUser('creator', 'Creator');
      const otherUser = await createTestUser('other', 'Other');
      const testGroup = await createTestGroup(creator._id, 'Private Group', undefined, undefined, false);

      await expect(
        groupService.getGroupById(testGroup._id.toString(), otherUser._id.toString())
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('listGroups', () => {
    it('should list accessible groups', async () => {
      const testUser = await createTestUser('creator', 'Creator');
      await createTestGroup(testUser._id, 'Public Group', undefined, undefined, true);

      const groups = await groupService.listGroups(null);

      expect(groups.length).toBeGreaterThan(0);
    });
  });

  describe('addMember', () => {
    it('should add member to group', async () => {
      const creator = await createTestUser('creator', 'Creator');
      const newMember = await createTestUser('newmember', 'New Member');
      const testGroup = await createTestGroup(creator._id, 'Test Group');

      const updated = await groupService.addMember(
        testGroup._id.toString(),
        creator._id.toString(),
        'newmember'
      );

      expect(updated.memberIds).toContain(newMember._id.toString());
    });

    it('should throw ForbiddenError if requester is not a member', async () => {
      const creator = await createTestUser('creator', 'Creator');
      const nonMember = await createTestUser('nonmember', 'Non Member');
      const newMember = await createTestUser('newmember', 'New Member');
      const testGroup = await createTestGroup(creator._id, 'Test Group');

      await expect(
        groupService.addMember(testGroup._id.toString(), nonMember._id.toString(), 'newmember')
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ConflictError if user is already a member', async () => {
      const creator = await createTestUser('creator', 'Creator');
      const member = await createTestUser('member', 'Member');
      const testGroup = await createTestGroup(creator._id, 'Test Group', undefined, [creator._id, member._id]);

      await expect(
        groupService.addMember(testGroup._id.toString(), creator._id.toString(), 'member')
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('removeMember', () => {
    it('should remove member from group', async () => {
      const creator = await createTestUser('creator', 'Creator');
      const member = await createTestUser('member', 'Member');
      const testGroup = await createTestGroup(creator._id, 'Test Group', undefined, [creator._id, member._id]);

      const updated = await groupService.removeMember(
        testGroup._id.toString(),
        creator._id.toString(),
        member._id.toString()
      );

      expect(updated.memberIds).not.toContain(member._id.toString());
    });

    it('should throw ForbiddenError if requester is not admin', async () => {
      const creator = await createTestUser('creator', 'Creator');
      const member = await createTestUser('member', 'Member');
      const testGroup = await createTestGroup(creator._id, 'Test Group', undefined, [creator._id, member._id]);

      await expect(
        groupService.removeMember(testGroup._id.toString(), member._id.toString(), member._id.toString())
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('deleteGroup', () => {
    it('should delete group', async () => {
      const creator = await createTestUser('creator', 'Creator');
      const testGroup = await createTestGroup(creator._id, 'Test Group');

      await groupService.deleteGroup(testGroup._id.toString(), creator._id.toString());

      await expect(
        groupRepository.findById(testGroup._id.toString())
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if requester is not admin', async () => {
      const creator = await createTestUser('creator', 'Creator');
      const member = await createTestUser('member', 'Member');
      const testGroup = await createTestGroup(creator._id, 'Test Group', undefined, [creator._id, member._id]);

      await expect(
        groupService.deleteGroup(testGroup._id.toString(), member._id.toString())
      ).rejects.toThrow(ForbiddenError);
    });
  });
});

