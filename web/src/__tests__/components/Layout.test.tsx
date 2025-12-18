import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../../components/Layout';
import { AuthProvider } from '../../context/AuthContext';
import { GroupProvider } from '../../context/GroupContext';

// Mock the contexts
jest.mock('../../context/AuthContext', () => ({
  ...jest.requireActual('../../context/AuthContext'),
  useAuth: jest.fn(() => ({
    user: { id: '1', username: 'testuser', displayName: 'Test User' },
    logout: jest.fn(),
  })),
}));

jest.mock('../../context/GroupContext', () => ({
  ...jest.requireActual('../../context/GroupContext'),
  useGroup: jest.fn(() => ({
    groups: [],
    selectedGroup: null,
    loading: false,
  })),
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

describe('Layout Component', () => {
  it('should render navigation with app title', () => {
    renderWithProviders(<Layout />);

    expect(screen.getByText('Zero-Sum Tracker')).toBeInTheDocument();
  });

  it('should render Groups link', () => {
    renderWithProviders(<Layout />);

    const groupsLinks = screen.getAllByText('Groups');
    expect(groupsLinks.length).toBeGreaterThan(0);
  });

  it('should render user display name', () => {
    renderWithProviders(<Layout />);

    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('should render logout button', () => {
    renderWithProviders(<Layout />);

    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });
});

