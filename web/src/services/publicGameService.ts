/**
 * Public Game Service
 * Handles all API calls for public game operations
 */
import apiClient from '../api/client';

export interface UpdateTransactionFieldRequest {
  field: 'playerName' | 'amount';
  value: string | number;
}

export interface AddTransactionRequest {
  playerName?: string;
  amount?: number;
}

export interface UpdateGameNameRequest {
  name: string;
}

export interface UpdateGameDateRequest {
  date: string | null;
}

class PublicGameService {
  /**
   * Get game by public token
   */
  async getGameByToken(token: string) {
    const response = await apiClient.get(`/games/public/${token}`);
    return response.data;
  }

  /**
   * Update game name
   */
  async updateGameName(token: string, name: string) {
    const response = await apiClient.put(`/games/public/${token}/name`, { name });
    return response.data;
  }

  /**
   * Update game date
   */
  async updateGameDate(token: string, date: string | null) {
    const response = await apiClient.put(`/games/public/${token}/date`, { date });
    return response.data;
  }

  /**
   * Update a transaction field
   */
  async updateTransactionField(
    token: string,
    rowId: number,
    field: 'playerName' | 'amount',
    value: string | number
  ) {
    const response = await apiClient.patch(`/games/public/${token}/transaction/${rowId}`, {
      field,
      value,
    });
    return response.data;
  }

  /**
   * Add a new transaction row
   */
  async addTransaction(token: string, playerName?: string, amount?: number) {
    const response = await apiClient.post(`/games/public/${token}/transaction`, {
      playerName,
      amount,
    });
    return response.data;
  }

  /**
   * Delete a transaction row
   */
  async deleteTransaction(token: string, rowId: number) {
    const response = await apiClient.delete(`/games/public/${token}/transaction/${rowId}`);
    return response.data;
  }

  /**
   * Settle game (make it read-only)
   */
  async settleGame(token: string) {
    const response = await apiClient.post(`/games/public/${token}/settle`);
    return response.data;
  }

  /**
   * Edit game (unsettle - make it editable again)
   */
  async editGame(token: string) {
    const response = await apiClient.post(`/games/public/${token}/edit`);
    return response.data;
  }
}

export const publicGameService = new PublicGameService();

