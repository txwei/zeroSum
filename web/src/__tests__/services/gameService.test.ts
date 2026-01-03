import { gameService } from '../../services/gameService';
import apiClient from '../../api/client';

jest.mock('../../api/client');

describe('GameService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGameByPublicToken', () => {
    it('should call API and return game', async () => {
      const mockGame = {
        _id: '1',
        name: 'Test Game',
        transactions: [],
      };

      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockGame });

      const result = await gameService.getGameByPublicToken('test-token');

      expect(apiClient.get).toHaveBeenCalledWith('/games/public/test-token');
      expect(result).toEqual(mockGame);
    });
  });

  describe('createGame', () => {
    it('should call API and return created game', async () => {
      const mockGame = {
        _id: '1',
        name: 'New Game',
        groupId: 'group1',
      };

      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockGame });

      const result = await gameService.createGame('New Game', 'group1');

      expect(apiClient.post).toHaveBeenCalledWith('/games', {
        name: 'New Game',
        groupId: 'group1',
        date: undefined,
        transactions: undefined,
      });
      expect(result).toEqual(mockGame);
    });
  });

  describe('listGames', () => {
    it('should call API and return games list', async () => {
      const mockGames = [
        { _id: '1', name: 'Game 1' },
        { _id: '2', name: 'Game 2' },
      ];

      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockGames });

      const result = await gameService.listGames();

      expect(apiClient.get).toHaveBeenCalledWith('/games', { params: {} });
      expect(result).toEqual(mockGames);
    });

    it('should include groupId in params when provided', async () => {
      const mockGames = [{ _id: '1', name: 'Game 1' }];

      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockGames });

      await gameService.listGames('group1');

      expect(apiClient.get).toHaveBeenCalledWith('/games', {
        params: { groupId: 'group1' },
      });
    });
  });

  describe('updateGameName', () => {
    it('should call API and return updated game', async () => {
      const mockGame = { _id: '1', name: 'Updated Name' };

      (apiClient.put as jest.Mock).mockResolvedValue({ data: mockGame });

      const result = await gameService.updateGameName('token', 'Updated Name');

      expect(apiClient.put).toHaveBeenCalledWith('/games/public/token/name', {
        name: 'Updated Name',
      });
      expect(result).toEqual(mockGame);
    });
  });

  describe('settleGame', () => {
    it('should call API and return settled game', async () => {
      const mockGame = { _id: '1', name: 'Game', settled: true };

      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockGame });

      const result = await gameService.settleGame('token');

      expect(apiClient.post).toHaveBeenCalledWith('/games/public/token/settle');
      expect(result).toEqual(mockGame);
    });
  });
});

