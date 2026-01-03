import apiClient from '../api/client';
import { Game, UserSearchResult } from '../types/api';

export class GameService {
  async getGameByPublicToken(token: string): Promise<Game> {
    const response = await apiClient.get<Game>(`/games/public/${token}`);
    return response.data;
  }

  async getGameMembers(token: string): Promise<any[]> {
    const response = await apiClient.get(`/games/public/${token}/members`);
    return response.data;
  }

  async searchUsers(token: string, query: string): Promise<UserSearchResult> {
    const response = await apiClient.get<UserSearchResult>(`/games/public/${token}/search-users`, {
      params: { q: query },
    });
    return response.data;
  }

  async updateGameName(token: string, name: string): Promise<Game> {
    const response = await apiClient.put<Game>(`/games/public/${token}/name`, { name });
    return response.data;
  }

  async updateGameDate(token: string, date?: string): Promise<Game> {
    const response = await apiClient.put<Game>(`/games/public/${token}/date`, { date });
    return response.data;
  }

  async updateTransactionField(
    token: string,
    rowId: number,
    field: 'playerName' | 'amount',
    value: string | number
  ): Promise<Game> {
    const response = await apiClient.patch<Game>(`/games/public/${token}/transaction/${rowId}`, {
      field,
      value,
    });
    return response.data;
  }

  async addTransaction(token: string, playerName?: string, amount?: number): Promise<Game> {
    const response = await apiClient.post<Game>(`/games/public/${token}/transaction`, {
      playerName,
      amount,
    });
    return response.data;
  }

  async deleteTransaction(token: string, rowId: number): Promise<Game> {
    const response = await apiClient.delete<Game>(`/games/public/${token}/transaction/${rowId}`);
    return response.data;
  }

  async settleGame(token: string): Promise<Game> {
    const response = await apiClient.post<Game>(`/games/public/${token}/settle`);
    return response.data;
  }

  async unsettleGame(token: string): Promise<Game> {
    const response = await apiClient.post<Game>(`/games/public/${token}/edit`);
    return response.data;
  }

  async quickSignup(token: string, username: string, displayName: string, password?: string): Promise<any> {
    const response = await apiClient.post(`/games/public/${token}/quick-signup`, {
      username,
      displayName,
      password,
    });
    return response.data;
  }

  async createGame(name: string, groupId: string, date?: string, transactions?: any[]): Promise<Game> {
    const response = await apiClient.post<Game>('/games', {
      name,
      groupId,
      date,
      transactions,
    });
    return response.data;
  }

  async listGames(groupId?: string): Promise<Game[]> {
    const response = await apiClient.get<Game[]>('/games', {
      params: groupId ? { groupId } : {},
    });
    return response.data;
  }

  async getGameById(gameId: string): Promise<Game> {
    const response = await apiClient.get<Game>(`/games/${gameId}`);
    return response.data;
  }

  async deleteGame(gameId: string): Promise<void> {
    await apiClient.delete(`/games/${gameId}`);
  }
}

export const gameService = new GameService();


