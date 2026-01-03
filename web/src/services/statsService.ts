import apiClient from '../api/client';
import { StatsTotal, GameHistoryItem, TrendsData } from '../types/api';

export class StatsService {
  async getTotals(groupId?: string, timePeriod?: string): Promise<StatsTotal[]> {
    const response = await apiClient.get<StatsTotal[]>('/stats/totals', {
      params: {
        ...(groupId && { groupId }),
        ...(timePeriod && { timePeriod }),
      },
    });
    return response.data;
  }

  async getUserHistory(userId: string, groupId?: string): Promise<GameHistoryItem[]> {
    const response = await apiClient.get<GameHistoryItem[]>(`/stats/user/${userId}`, {
      params: {
        ...(groupId && { groupId }),
      },
    });
    return response.data;
  }

  async getTrends(groupId: string, playerIds: string[]): Promise<TrendsData> {
    const response = await apiClient.get<TrendsData>('/stats/trends', {
      params: {
        groupId,
        playerIds,
      },
    });
    return response.data;
  }
}

export const statsService = new StatsService();


