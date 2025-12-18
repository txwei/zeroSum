import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TransactionInput from '../../components/TransactionInput';

describe('TransactionInput Component', () => {
  const mockUsers = [
    { id: '1', username: 'user1', displayName: 'User 1' },
    { id: '2', username: 'user2', displayName: 'User 2' },
  ];

  const defaultProps = {
    users: mockUsers,
    transactions: [],
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render user checkboxes', () => {
    render(<TransactionInput {...defaultProps} />);

    expect(screen.getByText('User 1')).toBeInTheDocument();
    expect(screen.getByText('User 2')).toBeInTheDocument();
  });

  it('should call onChange when user is toggled', () => {
    render(<TransactionInput {...defaultProps} />);

    const checkbox = screen.getByLabelText('User 1');
    fireEvent.click(checkbox);

    expect(defaultProps.onChange).toHaveBeenCalled();
  });

  it('should show amount inputs when users are selected', async () => {
    render(<TransactionInput {...defaultProps} />);

    const checkbox = screen.getByLabelText('User 1');
    fireEvent.click(checkbox);

    // After selecting, amount input should appear in the table
    await waitFor(() => {
      const inputs = screen.queryAllByDisplayValue('');
      expect(inputs.length).toBeGreaterThan(0);
    });
  });
});

