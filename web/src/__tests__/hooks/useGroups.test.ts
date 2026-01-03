import { renderHook, waitFor } from '@testing-library/react';
import { useGroups } from '../../hooks/useGroups';
import { groupService } from '../../services/groupService';

jest.mock('../../services/groupService');

describe('useGroups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch groups on mount', async () => {
    const mockGroups = [
      { _id: '1', name: 'Group 1' },
      { _id: '2', name: 'Group 2' },
    ];

    (groupService.listGroups as jest.Mock).mockResolvedValue(mockGroups);

    const { result } = renderHook(() => useGroups());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.groups).toEqual(mockGroups);
    expect(result.current.error).toBeNull();
  });

  it('should handle errors', async () => {
    const error = new Error('Failed to load groups');
    (groupService.listGroups as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useGroups());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load groups');
    expect(result.current.groups).toEqual([]);
  });

  it('should provide refetch function', async () => {
    const mockGroups = [{ _id: '1', name: 'Group 1' }];
    (groupService.listGroups as jest.Mock).mockResolvedValue(mockGroups);

    const { result } = renderHook(() => useGroups());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.refetch).toBeDefined();
    expect(typeof result.current.refetch).toBe('function');

    await result.current.refetch();

    expect(groupService.listGroups).toHaveBeenCalledTimes(2);
  });
});

