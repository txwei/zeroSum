import { renderHook, waitFor } from '@testing-library/react';
import { useGames } from '../../hooks/useGames';
import { gameService } from '../../services/gameService';

jest.mock('../../services/gameService');

describe('useGames', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch games on mount', async () => {
    const mockGames = [
      { _id: '1', name: 'Game 1' },
      { _id: '2', name: 'Game 2' },
    ];

    (gameService.listGames as jest.Mock).mockResolvedValue(mockGames);

    const { result } = renderHook(() => useGames());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.games).toEqual(mockGames);
    expect(result.current.error).toBeNull();
  });

  it('should handle errors', async () => {
    const error = new Error('Failed to load games');
    (gameService.listGames as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useGames());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load games');
    expect(result.current.games).toEqual([]);
  });

  it('should refetch games when groupId changes', async () => {
    const mockGames = [{ _id: '1', name: 'Game 1' }];
    (gameService.listGames as jest.Mock).mockResolvedValue(mockGames);

    const { result, rerender } = renderHook(({ groupId }) => useGames(groupId), {
      initialProps: { groupId: 'group1' },
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(gameService.listGames).toHaveBeenCalledWith('group1');

    rerender({ groupId: 'group2' });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(gameService.listGames).toHaveBeenCalledWith('group2');
  });

  it('should provide refetch function', async () => {
    const mockGames = [{ _id: '1', name: 'Game 1' }];
    (gameService.listGames as jest.Mock).mockResolvedValue(mockGames);

    const { result } = renderHook(() => useGames());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.refetch).toBeDefined();
    expect(typeof result.current.refetch).toBe('function');

    await result.current.refetch();

    expect(gameService.listGames).toHaveBeenCalledTimes(2);
  });
});

