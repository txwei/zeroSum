/**
 * Tests for PublicGameService
 */
import { publicGameService } from '../../services/publicGameService';
import apiClient from '../../api/client';

jest.mock('../../api/client');

describe('PublicGameService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGameByToken', () => {
    it('should fetch game by token', async () => {
      const mockGame = { _id: '1', name: 'Test Game' };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockGame });

      const result = await publicGameService.getGameByToken('token123');

      expect(apiClient.get).toHaveBeenCalledWith('/games/public/token123');
      expect(result).toEqual(mockGame);
    });
  });

  describe('updateGameName', () => {
    it('should update game name', async () => {
      const mockGame = { _id: '1', name: 'Updated Name' };
      (apiClient.put as jest.Mock).mockResolvedValue({ data: mockGame });

      const result = await publicGameService.updateGameName('token123', 'Updated Name');

      expect(apiClient.put).toHaveBeenCalledWith('/games/public/token123/name', { name: 'Updated Name' });
      expect(result).toEqual(mockGame);
    });
  });

  describe('updateTransactionField', () => {
    it('should update transaction field', async () => {
      const mockGame = { _id: '1', transactions: [] };
      (apiClient.patch as jest.Mock).mockResolvedValue({ data: mockGame });

      const result = await publicGameService.updateTransactionField('token123', 0, 'playerName', 'John');

      expect(apiClient.patch).toHaveBeenCalledWith('/games/public/token123/transaction/0', {
        field: 'playerName',
        value: 'John',
      });
      expect(result).toEqual(mockGame);
    });
  });

  describe('addTransaction', () => {
    it('should add a new transaction', async () => {
      const mockGame = { _id: '1', transactions: [{ playerName: 'John', amount: 10 }] };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockGame });

      const result = await publicGameService.addTransaction('token123', 'John', 10);

      expect(apiClient.post).toHaveBeenCalledWith('/games/public/token123/transaction', {
        playerName: 'John',
        amount: 10,
      });
      expect(result).toEqual(mockGame);
    });
  });

  describe('deleteTransaction', () => {
    it('should delete a transaction', async () => {
      const mockGame = { _id: '1', transactions: [] };
      (apiClient.delete as jest.Mock).mockResolvedValue({ data: mockGame });

      const result = await publicGameService.deleteTransaction('token123', 0);

      expect(apiClient.delete).toHaveBeenCalledWith('/games/public/token123/transaction/0');
      expect(result).toEqual(mockGame);
    });
  });

  describe('settleGame', () => {
    it('should settle the game', async () => {
      const mockGame = { _id: '1', settled: true };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockGame });

      const result = await publicGameService.settleGame('token123');

      expect(apiClient.post).toHaveBeenCalledWith('/games/public/token123/settle');
      expect(result).toEqual(mockGame);
    });
  });
});

