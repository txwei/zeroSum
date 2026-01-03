import apiClient from '../api/client';
import { Group } from '../types/api';

export class GroupService {
  async createGroup(name: string, description?: string, isPublic: boolean = true): Promise<Group> {
    const response = await apiClient.post<Group>('/groups', {
      name,
      description,
      isPublic,
    });
    return response.data;
  }

  async getGroupById(groupId: string): Promise<Group> {
    const response = await apiClient.get<Group>(`/groups/${groupId}`);
    return response.data;
  }

  async listGroups(): Promise<Group[]> {
    const response = await apiClient.get<Group[]>('/groups');
    return response.data;
  }

  async updateGroup(groupId: string, updates: { name?: string; description?: string; isPublic?: boolean }): Promise<Group> {
    const response = await apiClient.patch<Group>(`/groups/${groupId}`, updates);
    return response.data;
  }

  async addMember(groupId: string, username: string): Promise<Group> {
    const response = await apiClient.post<Group>(`/groups/${groupId}/members`, { username });
    return response.data;
  }

  async removeMember(groupId: string, memberUserId: string): Promise<Group> {
    const response = await apiClient.delete<Group>(`/groups/${groupId}/members/${memberUserId}`);
    return response.data;
  }

  async deleteGroup(groupId: string): Promise<void> {
    await apiClient.delete(`/groups/${groupId}`);
  }
}

export const groupService = new GroupService();


