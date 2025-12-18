import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('Game Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create game and view it in list', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [
        {
          _id: '1',
          name: 'Test Game',
          date: new Date().toISOString(),
          transactions: [],
        },
      ],
    });

    renderWithProviders(<Dashboard groupId="group1" />);

    await waitFor(() => {
      expect(screen.getByText('Test Game')).toBeInTheDocument();
    });
  });
});

