import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../../pages/Login';
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

describe('Auth Flow Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should complete full login flow', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: {
        token: 'test-token',
        user: { id: '1', username: 'testuser', displayName: 'Test User' },
      },
    });
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [] });

    renderWithProviders(<Login />);

    const usernameInput = screen.getByPlaceholderText(/username/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        username: 'testuser',
        password: 'password123',
      });
    });
  });
});

