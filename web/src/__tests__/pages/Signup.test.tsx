import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Signup from '../../pages/Signup';
import { AuthProvider } from '../../context/AuthContext';
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
        {ui}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Signup Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render signup form', () => {
    renderWithProviders(<Signup />);

    expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('should show error when signup fails', async () => {
    (apiClient.post as jest.Mock).mockRejectedValue({
      response: { data: { error: 'Username already exists' } },
    });

    renderWithProviders(<Signup />);

    const usernameInput = screen.getByPlaceholderText(/username/i);
    const displayNameInput = screen.getByPlaceholderText(/display name/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const submitButton = screen.getByRole('button', { name: /sign up/i });

    fireEvent.change(usernameInput, { target: { value: 'existinguser' } });
    fireEvent.change(displayNameInput, { target: { value: 'Display Name' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/username already exists/i)).toBeInTheDocument();
    });
  });

  it('should call signup API on form submit', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: {
        token: 'test-token',
        user: { id: '1', username: 'newuser', displayName: 'New User' },
      },
    });

    renderWithProviders(<Signup />);

    const usernameInput = screen.getByPlaceholderText(/username/i);
    const displayNameInput = screen.getByPlaceholderText(/display name/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const submitButton = screen.getByRole('button', { name: /sign up/i });

    fireEvent.change(usernameInput, { target: { value: 'newuser' } });
    fireEvent.change(displayNameInput, { target: { value: 'New User' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/register', {
        username: 'newuser',
        displayName: 'New User',
        password: 'password123',
      });
    });
  });
});

