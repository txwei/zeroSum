import apiClient from '../api/client';
import { User } from '../types/api';

export class UserService {
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/users/me');
    return response.data;
  }

  async updateDisplayName(displayName: string): Promise<User> {
    const response = await apiClient.patch<User>('/users/me', { displayName });
    return response.data;
  }

  async listUsers(): Promise<User[]> {
    const response = await apiClient.get<User[]>('/users');
    return response.data;
  }
}

export const userService = new UserService();


