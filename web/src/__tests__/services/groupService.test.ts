import { groupService } from '../../services/groupService';
import apiClient from '../../api/client';

jest.mock('../../api/client');

describe('GroupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createGroup', () => {
    it('should call API and return created group', async () => {
      const mockGroup = {
        _id: '1',
        name: 'New Group',
        isPublic: true,
      };

      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockGroup });

      const result = await groupService.createGroup('New Group');

      expect(apiClient.post).toHaveBeenCalledWith('/groups', {
        name: 'New Group',
        description: undefined,
        isPublic: true,
      });
      expect(result).toEqual(mockGroup);
    });
  });

  describe('listGroups', () => {
    it('should call API and return groups list', async () => {
      const mockGroups = [
        { _id: '1', name: 'Group 1' },
        { _id: '2', name: 'Group 2' },
      ];

      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockGroups });

      const result = await groupService.listGroups();

      expect(apiClient.get).toHaveBeenCalledWith('/groups');
      expect(result).toEqual(mockGroups);
    });
  });

  describe('getGroupById', () => {
    it('should call API and return group', async () => {
      const mockGroup = { _id: '1', name: 'Test Group' };

      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockGroup });

      const result = await groupService.getGroupById('1');

      expect(apiClient.get).toHaveBeenCalledWith('/groups/1');
      expect(result).toEqual(mockGroup);
    });
  });

  describe('updateGroup', () => {
    it('should call API and return updated group', async () => {
      const mockGroup = { _id: '1', name: 'Updated Group' };

      (apiClient.patch as jest.Mock).mockResolvedValue({ data: mockGroup });

      const result = await groupService.updateGroup('1', { name: 'Updated Group' });

      expect(apiClient.patch).toHaveBeenCalledWith('/groups/1', {
        name: 'Updated Group',
      });
      expect(result).toEqual(mockGroup);
    });
  });

  describe('addMember', () => {
    it('should call API and return updated group', async () => {
      const mockGroup = { _id: '1', name: 'Group', memberIds: ['1', '2'] };

      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockGroup });

      const result = await groupService.addMember('1', 'username');

      expect(apiClient.post).toHaveBeenCalledWith('/groups/1/members', {
        username: 'username',
      });
      expect(result).toEqual(mockGroup);
    });
  });

  describe('deleteGroup', () => {
    it('should call API to delete group', async () => {
      (apiClient.delete as jest.Mock).mockResolvedValue({});

      await groupService.deleteGroup('1');

      expect(apiClient.delete).toHaveBeenCalledWith('/groups/1');
    });
  });
});

