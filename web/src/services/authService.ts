import apiClient from '../api/client';
import { AuthResponse } from '../types/api';

export class AuthService {
  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', { username, password });
    return response.data;
  }

  async register(username: string, displayName: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', {
      username,
      displayName,
      password,
    });
    return response.data;
  }
}

export const authService = new AuthService();


