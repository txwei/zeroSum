import { renderHook, act, waitFor } from '@testing-library/react';
import { GroupProvider, useGroup } from '../../context/GroupContext';
import { AuthProvider } from '../../context/AuthContext';
import apiClient from '../../api/client';
import { ReactNode } from 'react';

jest.mock('../../api/client');
jest.mock('../../context/AuthContext', () => ({
  ...jest.requireActual('../../context/AuthContext'),
  useAuth: () => ({
    user: { id: '1', username: 'testuser', displayName: 'Test User' },
  }),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>
    <GroupProvider>{children}</GroupProvider>
  </AuthProvider>
);

describe('GroupContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Always mock the groups API call
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [] });
  });

  afterEach(async () => {
    // Wait for any pending async operations to complete
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  it('should fetch groups on mount', async () => {
    const mockGroups = [
      { _id: '1', name: 'Group 1', memberIds: [] },
      { _id: '2', name: 'Group 2', memberIds: [] },
    ];
    const mockGet = apiClient.get as jest.Mock;
    mockGet.mockResolvedValue({ data: mockGroups });

    const { result, unmount } = renderHook(() => useGroup(), { wrapper });

    // Wait for the API call to complete and state to update
    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 3000 }
    );

    expect(mockGet).toHaveBeenCalledWith('/groups');
    expect(result.current.groups).toEqual(mockGroups);
    
    // Cleanup and wait for any pending operations
    unmount();
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  });

  it('should select a group', async () => {
    const mockGet = apiClient.get as jest.Mock;
    mockGet.mockResolvedValue({ data: [] });
    
    const { result, unmount } = renderHook(() => useGroup(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 3000 }
    );

    act(() => {
      result.current.selectGroup('group1');
    });

    expect(result.current.selectedGroupId).toBe('group1');
    
    // Cleanup and wait for any pending operations
    unmount();
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  });

  it('should refresh groups', async () => {
    const mockGroups = [{ _id: '1', name: 'Group 1', memberIds: [] }];
    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockGroups });

    const { result, unmount } = renderHook(() => useGroup(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 3000 });

    await act(async () => {
      await result.current.refreshGroups();
    });

    expect(apiClient.get).toHaveBeenCalledWith('/groups');
    
    // Cleanup and wait for any pending operations
    unmount();
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  });
});

