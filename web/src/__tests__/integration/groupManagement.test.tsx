import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Groups from '../../pages/Groups';
import { AuthProvider } from '../../context/AuthContext';
import { GroupProvider } from '../../context/GroupContext';
import apiClient from '../../api/client';

jest.mock('../../api/client');
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

describe('Group Management Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create group and add members flow', async () => {
    // Mock groups API call that GroupProvider makes
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [] });
    
    const mockRefreshGroups = jest.fn();
    jest.spyOn(require('../../context/GroupContext'), 'useGroup').mockReturnValue({
      groups: [],
      loading: false,
      refreshGroups: mockRefreshGroups,
    });
    
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { _id: '1', name: 'New Group', memberIds: [] },
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

