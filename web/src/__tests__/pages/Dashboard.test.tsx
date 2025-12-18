import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../../pages/Dashboard';
import { AuthProvider } from '../../context/AuthContext';
import { GroupProvider } from '../../context/GroupContext';
import apiClient from '../../api/client';

jest.mock('../../api/client');
jest.mock('../../context/AuthContext', () => ({
  ...jest.requireActual('../../context/AuthContext'),
  useAuth: () => ({
    user: { id: '1', username: 'testuser', displayName: 'Test User' },
  }),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <GroupProvider>
          {ui}
        </GroupProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock groups API call that GroupProvider makes
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url === '/groups') {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('should render games list', async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url === '/groups') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/games') {
        return Promise.resolve({
          data: [
            {
              _id: '1',
              name: 'Game 1',
              date: new Date().toISOString(),
              transactions: [],
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<Dashboard groupId="group1" />);

    await waitFor(() => {
      expect(screen.getByText('Game 1')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show create game button', async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url === '/groups') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/games') {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<Dashboard groupId="group1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create new game/i })).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show filter button for games', async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url === '/groups') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/games') {
        return Promise.resolve({
          data: [
            {
              _id: '1',
              name: 'Game 1',
              date: new Date().toISOString(),
              transactions: [{ userId: { _id: '1' }, amount: 100 }],
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<Dashboard groupId="group1" />);

    await waitFor(() => {
      expect(screen.getByText('Game 1')).toBeInTheDocument();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /my games only/i })).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

