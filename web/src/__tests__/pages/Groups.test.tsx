import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Groups from '../../pages/Groups';
import { AuthProvider } from '../../context/AuthContext';
import { GroupProvider } from '../../context/GroupContext';
import apiClient from '../../api/client';

jest.mock('../../api/client');
jest.mock('../../context/GroupContext', () => ({
  ...jest.requireActual('../../context/GroupContext'),
  useGroup: () => ({
    groups: [],
    loading: false,
    refreshGroups: jest.fn(),
  }),
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
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

describe('Groups Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render groups list', async () => {
    const mockGroups = [
      { _id: '1', name: 'Group 1', memberIds: [], createdAt: new Date().toISOString() },
      { _id: '2', name: 'Group 2', memberIds: [], createdAt: new Date().toISOString() },
    ];
    
    jest.spyOn(require('../../context/GroupContext'), 'useGroup').mockReturnValue({
      groups: mockGroups,
      loading: false,
      refreshGroups: jest.fn(),
    });

    renderWithProviders(<Groups />);

    await waitFor(() => {
      expect(screen.getByText('Group 1')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    expect(screen.getByText('Group 2')).toBeInTheDocument();
  });

  it('should show create group form when button is clicked', async () => {
    jest.spyOn(require('../../context/GroupContext'), 'useGroup').mockReturnValue({
      groups: [],
      loading: false,
      refreshGroups: jest.fn(),
    });

    renderWithProviders(<Groups />);

    const createButtons = screen.getAllByRole('button', { name: /create group/i });
    fireEvent.click(createButtons[0]);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/poker night/i)).toBeInTheDocument();
    });
  });

  it('should create a new group', async () => {
    const mockRefreshGroups = jest.fn();
    jest.spyOn(require('../../context/GroupContext'), 'useGroup').mockReturnValue({
      groups: [],
      loading: false,
      refreshGroups: mockRefreshGroups,
    });
    
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { _id: '1', name: 'New Group', memberIds: [], createdAt: new Date().toISOString() },
    });

    renderWithProviders(<Groups />);

    const createButtons = screen.getAllByRole('button', { name: /create group/i });
    fireEvent.click(createButtons[0]);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/poker night/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/poker night/i);
    fireEvent.change(nameInput, { target: { value: 'New Group' } });

    const submitButtons = screen.getAllByRole('button', { name: /create group/i });
    const submitButton = submitButtons.find(btn => btn.getAttribute('type') === 'submit');
    if (submitButton) {
      fireEvent.click(submitButton);
    }

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/groups', {
        name: 'New Group',
        description: '',
      });
    });
  });
});

