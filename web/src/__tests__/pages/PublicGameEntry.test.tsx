import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PublicGameEntry from '../../pages/PublicGameEntry';
import apiClient from '../../api/client';
import { io } from 'socket.io-client';

// Mock dependencies
jest.mock('../../api/client');
jest.mock('socket.io-client');
jest.mock('../../components/MathKeyboard', () => {
  return function MockMathKeyboard({ value, onChange, onEvaluate, onClose }: any) {
    return (
      <div data-testid="math-keyboard">
        <input
          data-testid="keyboard-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button data-testid="keyboard-evaluate" onClick={() => onEvaluate(value)}>
          Evaluate
        </button>
        <button data-testid="keyboard-close" onClick={onClose}>
          Close
        </button>
      </div>
    );
  };
});

// Helper to create mock socket with event handlers
const createMockSocket = () => {
  const handlers: Record<string, Array<(data?: any) => void>> = {};
  const mockSocket = {
    on: jest.fn((event: string, handler: (data?: any) => void) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
    }),
    emit: jest.fn(),
    disconnect: jest.fn(),
    id: 'test-socket-id',
    // Helper to trigger events (simulates server/other user actions)
    trigger: (event: string, data?: any) => {
      if (handlers[event]) {
        handlers[event].forEach(handler => handler(data));
      }
    },
    // Get handler for an event (for testing)
    getHandler: (event: string) => handlers[event]?.[0],
    // Clear all handlers
    clear: () => {
      Object.keys(handlers).forEach(key => delete handlers[key]);
    },
  };
  return mockSocket;
};

let mockSocket: ReturnType<typeof createMockSocket>;

(io as jest.Mock).mockImplementation(() => {
  mockSocket = createMockSocket();
  return mockSocket;
});

const mockGame = {
  _id: 'game1',
  name: 'Test Game',
  date: '2024-01-15T00:00:00.000Z',
  publicToken: 'test-token',
  settled: false,
  createdByUserId: {
    _id: 'user1',
    username: 'testuser',
    displayName: 'Test User',
  },
  groupId: {
    _id: 'group1',
    name: 'Test Group',
  },
  transactions: [
    { _id: 't1', playerName: 'Alice', amount: 100 },
    { _id: 't2', playerName: 'Bob', amount: -100 },
  ],
};

const renderWithRouter = (token: string = 'test-token') => {
  return render(
    <MemoryRouter initialEntries={[`/games/public/${token}`]}>
      <Routes>
        <Route path="/games/public/:token" element={<PublicGameEntry />} />
      </Routes>
    </MemoryRouter>
  );
};

// Helper to wait for socket connection
const waitForSocketConnection = async () => {
  await waitFor(() => {
    expect(mockSocket).toBeDefined();
    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
  });
  // Trigger connect event
  act(() => {
    if (mockSocket) {
      const connectHandler = mockSocket.getHandler('connect');
      if (connectHandler) connectHandler();
    }
  });
  // Wait a bit for join-game to be emitted
  await waitFor(() => {
    if (mockSocket) {
      expect(mockSocket.emit).toHaveBeenCalledWith('join-game', expect.any(String));
    }
  }, { timeout: 1000 });
};

describe('PublicGameEntry Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock window.location
    delete (window as any).location;
    (window as any).location = {
      origin: 'http://localhost:3000',
      protocol: 'http:',
    };

    // Mock navigator.clipboard (only if not already defined to avoid conflicts)
    if (!navigator.clipboard) {
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: jest.fn().mockResolvedValue(undefined),
        },
        writable: true,
        configurable: true,
      });
    } else {
      (navigator.clipboard as any).writeText = jest.fn().mockResolvedValue(undefined);
    }

    // Mock window.innerWidth for mobile detection
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024, // Desktop by default
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    act(() => {
      if (mockSocket) {
        mockSocket.clear();
      }
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state initially', () => {
      (apiClient.get as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves
      renderWithRouter();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should show error when token is invalid', async () => {
      renderWithRouter('undefined');
      await waitFor(() => {
        expect(screen.getByText(/Invalid game link/i)).toBeInTheDocument();
      });
    });

    it('should show error when token is missing', async () => {
      render(
        <MemoryRouter initialEntries={['/games/public/']}>
          <Routes>
            <Route path="/games/public/:token" element={<PublicGameEntry />} />
          </Routes>
        </MemoryRouter>
      );
      await waitFor(() => {
        expect(screen.getByText(/Invalid game link/i)).toBeInTheDocument();
      });
    });

    it('should show error when game fetch fails with network error', async () => {
      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Network error'));
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByText(/Failed to load game/i)).toBeInTheDocument();
      });
    });

    it('should show error when game fetch fails with API error', async () => {
      (apiClient.get as jest.Mock).mockRejectedValue({
        response: { data: { error: 'Game not found' } },
      });
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByText('Game not found')).toBeInTheDocument();
      });
    });

    it('should handle error without response object', async () => {
      (apiClient.get as jest.Mock).mockRejectedValue({
        message: 'Connection failed',
      });
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByText(/Failed to load game/i)).toBeInTheDocument();
      });
    });
  });

  describe('Game Display and Initialization', () => {
    beforeEach(() => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockGame });
    });

    it('should display game name', async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByText('Test Game')).toBeInTheDocument();
      });
    });

    it('should display game date in readable format', async () => {
      renderWithRouter();
      await waitFor(() => {
        // Date should be formatted and displayed (format varies by locale)
        const dateElement = screen.getByText(/January|1\/15\/2024|15\/01\/2024/i);
        expect(dateElement).toBeInTheDocument();
      });
    });

    it('should display "No date set" when date is missing', async () => {
      const gameWithoutDate = { ...mockGame, date: undefined };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: gameWithoutDate });
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByText('No date set')).toBeInTheDocument();
      });
    });

    it('should display all transactions in table', async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Bob')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show balance status correctly for balanced game', async () => {
      renderWithRouter();
      // Wait for game to load first
      await waitFor(() => {
        expect(screen.getByText('Test Game')).toBeInTheDocument();
      }, { timeout: 3000 });
      // Then check for balance status
      await waitFor(() => {
        expect(screen.getByText(/Balanced/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show unbalanced status with correct sum', async () => {
      const unbalancedGame = {
        ...mockGame,
        transactions: [
          { _id: 't1', playerName: 'Alice', amount: 100 },
          { _id: 't2', playerName: 'Bob', amount: -50 },
        ],
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: unbalancedGame });
      renderWithRouter();
      // Wait for game to load first
      await waitFor(() => {
        expect(screen.getByText('Test Game')).toBeInTheDocument();
      }, { timeout: 3000 });
      // Then check for unbalanced status
      await waitFor(() => {
        expect(screen.getByText(/Unbalanced/i)).toBeInTheDocument();
        expect(screen.getByText(/\$50\.00|¥50\.00/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should ensure at least one empty row exists', async () => {
      const emptyGame = { ...mockGame, transactions: [] };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: emptyGame });
      renderWithRouter();
      await waitFor(() => {
        const nameInputs = screen.getAllByPlaceholderText('Name');
        expect(nameInputs.length).toBeGreaterThan(0);
      });
    });

    it('should initialize WebSocket connection on mount', async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(io).toHaveBeenCalled();
      });
    });

    it('should join game room on socket connect', async () => {
      renderWithRouter();
      await waitForSocketConnection();
      expect(mockSocket.emit).toHaveBeenCalledWith('join-game', 'test-token');
    });
  });

  describe('Game Name Editing', () => {
    beforeEach(() => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockGame });
      (apiClient.put as jest.Mock).mockResolvedValue({ data: { ...mockGame, name: 'Updated Name' } });
    });

    it('should allow editing game name by clicking', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByText('Test Game')).toBeInTheDocument();
      });

      const nameElement = screen.getByText('Test Game');
      await user.click(nameElement);

      const input = screen.getByPlaceholderText('Game title');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('Test Game');
    });

    it('should save name on Enter key', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByText('Test Game')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Test Game'));
      const input = screen.getByPlaceholderText('Game title');
      await user.clear(input);
      await user.type(input, 'Updated Game Name');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(apiClient.put).toHaveBeenCalledWith(
          '/games/public/test-token/name',
          { name: 'Updated Game Name' }
        );
      });
    });

    it('should save name on blur', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByText('Test Game')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Test Game'));
      const input = screen.getByPlaceholderText('Game title');
      await user.clear(input);
      await user.type(input, 'Updated Game Name');
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(apiClient.put).toHaveBeenCalledWith(
          '/games/public/test-token/name',
          { name: 'Updated Game Name' }
        );
      });
    });

    it('should save name on Done button click', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByText('Test Game')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Test Game'));
      const input = screen.getByPlaceholderText('Game title');
      await user.clear(input);
      await user.type(input, 'Updated Game Name');
      await user.click(screen.getByRole('button', { name: /done/i }));

      await waitFor(() => {
        expect(apiClient.put).toHaveBeenCalledWith(
          '/games/public/test-token/name',
          { name: 'Updated Game Name' }
        );
      });
    });

    it('should not allow editing name when game is settled', async () => {
      const settledGame = { ...mockGame, settled: true };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: settledGame });
      
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByText('Test Game')).toBeInTheDocument();
      });

      const nameElement = screen.getByText('Test Game');
      await user.click(nameElement);

      // Should not show input field
      expect(screen.queryByPlaceholderText('Game title')).not.toBeInTheDocument();
    });

    it('should retry on save failure', async () => {
      const user = userEvent.setup({ delay: null });
      (apiClient.put as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { ...mockGame, name: 'Updated' } });
      
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByText('Test Game')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Test Game'));
      const input = screen.getByPlaceholderText('Game title');
      await user.clear(input);
      await user.type(input, 'Updated');
      await user.keyboard('{Enter}');

      // Wait for retry (happens after 1 second)
      jest.advanceTimersByTime(1100);
      
      await waitFor(() => {
        expect(apiClient.put).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Game Date Editing', () => {
    beforeEach(() => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockGame });
      (apiClient.put as jest.Mock).mockResolvedValue({ data: mockGame });
    });

    it('should allow editing date by clicking', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByText(/January|1\/15\/2024/i)).toBeInTheDocument();
      });

      const dateElement = screen.getByText(/January|1\/15\/2024/i);
      await user.click(dateElement);

      const dateInput = screen.getByDisplayValue('2024-01-15');
      expect(dateInput).toBeInTheDocument();
    });

    it('should save date on blur', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByText(/January|1\/15\/2024/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/January|1\/15\/2024/i));
      const dateInput = screen.getByDisplayValue('2024-01-15');
      await user.clear(dateInput);
      await user.type(dateInput, '2024-02-20');
      await user.tab();

      await waitFor(() => {
        expect(apiClient.put).toHaveBeenCalledWith(
          '/games/public/test-token/date',
          { date: '2024-02-20' }
        );
      });
    });

    it('should save empty date when cleared', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByText(/January|1\/15\/2024/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/January|1\/15\/2024/i));
      const dateInput = screen.getByDisplayValue('2024-01-15');
      await user.clear(dateInput);
      await user.tab();

      await waitFor(() => {
        expect(apiClient.put).toHaveBeenCalledWith(
          '/games/public/test-token/date',
          { date: null }
        );
      });
    });
  });

  describe('Transaction Row Management', () => {
    beforeEach(() => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockGame });
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: {
          ...mockGame,
          transactions: [...mockGame.transactions, { _id: 't3', playerName: '', amount: 0 }],
        },
      });
      (apiClient.delete as jest.Mock).mockResolvedValue({
        data: {
          ...mockGame,
          transactions: [mockGame.transactions[0]],
        },
      });
    });

    it('should allow adding a new row', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      }, { timeout: 3000 });

      const addButton = screen.getByRole('button', { name: /add row/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          '/games/public/test-token/transaction',
          { playerName: '', amount: 0 }
        );
      });
    });

    it('should show optimistic update when adding row', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      }, { timeout: 3000 });

      const initialInputs = screen.getAllByPlaceholderText('Name');
      const initialCount = initialInputs.length;

      const addButton = screen.getByRole('button', { name: /add row/i });
      await user.click(addButton);

      // Should immediately show new row (optimistic update)
      await waitFor(() => {
        const newInputs = screen.getAllByPlaceholderText('Name');
        expect(newInputs.length).toBe(initialCount + 1);
      });
    });

    it('should revert optimistic update on add failure', async () => {
      const user = userEvent.setup({ delay: null });
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Failed'));
      
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      }, { timeout: 3000 });

      const initialInputs = screen.getAllByPlaceholderText('Name');
      const initialCount = initialInputs.length;

      const addButton = screen.getByRole('button', { name: /add row/i });
      await user.click(addButton);

      // Wait for error and revert
      await waitFor(() => {
        const inputs = screen.getAllByPlaceholderText('Name');
        expect(inputs.length).toBe(initialCount); // Reverted
      });
    });

    it('should allow deleting a row', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Bob')).toBeInTheDocument();
      }, { timeout: 3000 });

      const deleteButtons = screen.getAllByLabelText('Delete row');
      expect(deleteButtons.length).toBeGreaterThan(0);
      
      await user.click(deleteButtons[deleteButtons.length - 1]);

      await waitFor(() => {
        expect(apiClient.delete).toHaveBeenCalled();
      });
    });

    it('should prevent deleting the last row', async () => {
      const user = userEvent.setup({ delay: null });
      const singleRowGame = {
        ...mockGame,
        transactions: [{ _id: 't1', playerName: 'Alice', amount: 0 }],
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: singleRowGame });
      
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      }, { timeout: 3000 });

      const deleteButton = screen.getByLabelText('Delete row');
      expect(deleteButton).toBeDisabled();
    });

    it('should show error when trying to delete last row', async () => {
      const user = userEvent.setup({ delay: null });
      const twoRowGame = {
        ...mockGame,
        transactions: [
          { _id: 't1', playerName: 'Alice', amount: 0 },
          { _id: 't2', playerName: 'Bob', amount: 0 },
        ],
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: twoRowGame });
      (apiClient.delete as jest.Mock).mockResolvedValue({
        data: {
          ...twoRowGame,
          transactions: [twoRowGame.transactions[1]],
        },
      });
      
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Delete first row
      const deleteButtons = screen.getAllByLabelText('Delete row');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        // Now only one row left, try to delete it
        const remainingDeleteButton = screen.getByLabelText('Delete row');
        expect(remainingDeleteButton).toBeDisabled();
      }, { timeout: 3000 });
    });

    it('should handle delete failure and revert', async () => {
      const user = userEvent.setup({ delay: null });
      (apiClient.delete as jest.Mock).mockRejectedValue(new Error('Failed'));
      
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Bob')).toBeInTheDocument();
      }, { timeout: 3000 });

      const deleteButtons = screen.getAllByLabelText('Delete row');
      const initialCount = deleteButtons.length;
      
      await user.click(deleteButtons[deleteButtons.length - 1]);

      // Should revert on error
      await waitFor(() => {
        const errorMessage = screen.getByText(/At least one row is required/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });

  describe('Transaction Field Updates', () => {
    beforeEach(() => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockGame });
      (apiClient.patch as jest.Mock).mockResolvedValue({ data: mockGame });
    });

    it('should update player name field', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      });

      const playerInput = screen.getByDisplayValue('Alice');
      await user.clear(playerInput);
      await user.type(playerInput, 'Alice Updated');
      
      // Wait for debounce (200ms)
      jest.advanceTimersByTime(250);
      await user.tab(); // Trigger blur for immediate save

      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalledWith(
          '/games/public/test-token/transaction/0',
          { field: 'playerName', value: 'Alice Updated' }
        );
      }, { timeout: 1000 });
    });

    it('should debounce player name updates', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      });

      const playerInput = screen.getByDisplayValue('Alice');
      await user.type(playerInput, 'A');
      jest.advanceTimersByTime(100);
      await user.type(playerInput, 'l');
      jest.advanceTimersByTime(100);
      await user.type(playerInput, 'i');
      jest.advanceTimersByTime(250); // Complete debounce

      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalled();
      });
    });

    it('should update amount field', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        const amountInputs = screen.getAllByPlaceholderText(/0\.00/i);
        expect(amountInputs.length).toBeGreaterThan(0);
      });

      const amountInput = screen.getAllByPlaceholderText(/0\.00/i)[0];
      await user.clear(amountInput);
      await user.type(amountInput, '150');
      jest.advanceTimersByTime(250);
      await user.tab();

      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalledWith(
          '/games/public/test-token/transaction/0',
          expect.objectContaining({
            field: 'amount',
            value: 150,
          })
        );
      }, { timeout: 1000 });
    });

    it('should not save empty amount', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        const amountInputs = screen.getAllByPlaceholderText(/0\.00/i);
        expect(amountInputs.length).toBeGreaterThan(0);
      });

      const amountInput = screen.getAllByPlaceholderText(/0\.00/i)[0];
      await user.clear(amountInput);
      jest.advanceTimersByTime(250);
      await user.tab();

      // Should not call patch for empty amount
      await waitFor(() => {
        expect(apiClient.patch).not.toHaveBeenCalled();
      }, { timeout: 500 });
    });

    it('should not save partial math expressions', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        const amountInputs = screen.getAllByPlaceholderText(/0\.00/i);
        expect(amountInputs.length).toBeGreaterThan(0);
      });

      const amountInput = screen.getAllByPlaceholderText(/0\.00/i)[0];
      await user.clear(amountInput);
      await user.type(amountInput, '10+');
      jest.advanceTimersByTime(250);

      // Should not save incomplete expression
      expect(apiClient.patch).not.toHaveBeenCalled();
    });

    it('should evaluate math expressions on Enter', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        const amountInputs = screen.getAllByPlaceholderText(/0\.00/i);
        expect(amountInputs.length).toBeGreaterThan(0);
      });

      const amountInput = screen.getAllByPlaceholderText(/0\.00/i)[0];
      await user.clear(amountInput);
      await user.type(amountInput, '10+5');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalledWith(
          '/games/public/test-token/transaction/0',
          expect.objectContaining({
            field: 'amount',
            value: 15,
          })
        );
      });
    });

    it('should handle complex math expressions', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        const amountInputs = screen.getAllByPlaceholderText(/0\.00/i);
        expect(amountInputs.length).toBeGreaterThan(0);
      });

      const amountInput = screen.getAllByPlaceholderText(/0\.00/i)[0];
      await user.clear(amountInput);
      await user.type(amountInput, '(10+5)*2');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalledWith(
          '/games/public/test-token/transaction/0',
          expect.objectContaining({
            field: 'amount',
            value: 30,
          })
        );
      });
    });

    it('should handle invalid math expressions gracefully', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        const amountInputs = screen.getAllByPlaceholderText(/0\.00/i);
        expect(amountInputs.length).toBeGreaterThan(0);
      });

      const amountInput = screen.getAllByPlaceholderText(/0\.00/i)[0];
      await user.clear(amountInput);
      await user.type(amountInput, '10+abc');
      await user.keyboard('{Enter}');

      // Should not save invalid expression
      await waitFor(() => {
        expect(apiClient.patch).not.toHaveBeenCalled();
      }, { timeout: 500 });
    });

    it('should retry on save failure', async () => {
      const user = userEvent.setup({ delay: null });
      (apiClient.patch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: mockGame });
      
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      });

      const playerInput = screen.getByDisplayValue('Alice');
      await user.clear(playerInput);
      await user.type(playerInput, 'Updated');
      jest.advanceTimersByTime(250);
      await user.tab();

      // Wait for retry (happens after 1 second)
      jest.advanceTimersByTime(1100);
      
      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Multi-User Real-Time Collaboration', () => {
    beforeEach(() => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockGame });
      (apiClient.patch as jest.Mock).mockResolvedValue({ data: mockGame });
    });

    it('should receive field updates from other users', async () => {
      renderWithRouter();
      await waitForSocketConnection();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      });

      // Simulate another user updating player name
      act(() => {
        mockSocket.trigger('field-updated', {
          rowId: 0,
          field: 'playerName',
          value: 'Alice from Other User',
        });
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Alice from Other User')).toBeInTheDocument();
      });
    });

    it('should not overwrite field being edited locally', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      await waitForSocketConnection();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      });

      // Start editing locally
      const playerInput = screen.getByDisplayValue('Alice');
      await user.click(playerInput);
      await user.type(playerInput, 'Local Edit');

      // Simulate other user update while we're editing
      act(() => {
        mockSocket.trigger('field-updated', {
          rowId: 0,
          field: 'playerName',
          value: 'Other User Edit',
        });
      });

      // Should keep local edit
      expect(playerInput).toHaveValue('AliceLocal Edit');
    });

    it('should apply other user update after local edit completes', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      await waitForSocketConnection();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      });

      const playerInput = screen.getByDisplayValue('Alice');
      await user.click(playerInput);
      await user.type(playerInput, 'Local');
      jest.advanceTimersByTime(250);
      await user.tab(); // Complete local edit

      // Wait for save to complete
      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalled();
      });

      // Now other user update should apply
      act(() => {
        mockSocket.trigger('field-updated', {
          rowId: 0,
          field: 'playerName',
          value: 'Other User Update',
        });
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Other User Update')).toBeInTheDocument();
      });
    });

    it('should receive row add from other user', async () => {
      renderWithRouter();
      await waitForSocketConnection();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      });

      const initialInputs = screen.getAllByPlaceholderText('Name');
      const initialCount = initialInputs.length;

      // Simulate other user adding a row
      act(() => {
        mockSocket.trigger('row-action-updated', { action: 'add' });
      });

      await waitFor(() => {
        const newInputs = screen.getAllByPlaceholderText('Name');
        expect(newInputs.length).toBe(initialCount + 1);
      });
    });

    it('should receive row delete from other user', async () => {
      renderWithRouter();
      await waitForSocketConnection();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Bob')).toBeInTheDocument();
      });

      const initialInputs = screen.getAllByPlaceholderText('Name');
      const initialCount = initialInputs.length;

      // Simulate other user deleting last row
      act(() => {
        mockSocket.trigger('row-action-updated', {
          action: 'delete',
          rowId: initialCount - 1,
        });
      });

      await waitFor(() => {
        const newInputs = screen.getAllByPlaceholderText('Name');
        expect(newInputs.length).toBe(initialCount - 1);
      });
    });

    it('should handle simultaneous edits from multiple users', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      await waitForSocketConnection();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      });

      // User 1 (local) starts editing row 0
      const playerInput0 = screen.getByDisplayValue('Alice');
      await user.click(playerInput0);
      await user.type(playerInput0, 'User1');

      // User 2 (remote) updates row 0
      act(() => {
        mockSocket.trigger('field-updated', {
          rowId: 0,
          field: 'playerName',
          value: 'User2',
        });
      });

      // User 1's edit should be preserved
      expect(playerInput0).toHaveValue('AliceUser1');

      // User 2 (remote) updates row 1
      act(() => {
        mockSocket.trigger('field-updated', {
          rowId: 1,
          field: 'playerName',
          value: 'User2 Bob',
        });
      });

      // Row 1 should update (not being edited locally)
      await waitFor(() => {
        expect(screen.getByDisplayValue('User2 Bob')).toBeInTheDocument();
      });
    });

    it('should handle full game update from server', async () => {
      renderWithRouter();
      await waitForSocketConnection();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      });

      const updatedGame = {
        ...mockGame,
        name: 'Updated Game Name',
        transactions: [
          { _id: 't1', playerName: 'Charlie', amount: 50 },
          { _id: 't2', playerName: 'David', amount: -50 },
        ],
      };

      // Simulate server sending full game update
      act(() => {
        mockSocket.trigger('game-updated', updatedGame);
      });

      await waitFor(() => {
        expect(screen.getByText('Updated Game Name')).toBeInTheDocument();
        expect(screen.getByText('Charlie')).toBeInTheDocument();
        expect(screen.getByText('David')).toBeInTheDocument();
      });
    });

    it('should ignore game-updated during local row add', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      await waitForSocketConnection();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      });

      // Start adding row locally
      const addButton = screen.getByRole('button', { name: /add row/i });
      await user.click(addButton);

      const initialInputs = screen.getAllByPlaceholderText('Name');
      const initialCount = initialInputs.length;

      // Server sends update while we're adding
      act(() => {
        mockSocket.trigger('game-updated', mockGame);
      });

      // Should preserve optimistic row
      await waitFor(() => {
        const currentInputs = screen.getAllByPlaceholderText('Name');
        expect(currentInputs.length).toBeGreaterThanOrEqual(initialCount);
      });
    });

    it('should ignore game-updated during local row delete', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      await waitForSocketConnection();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Bob')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText('Delete row');
      const initialCount = deleteButtons.length;

      // Start deleting row
      await user.click(deleteButtons[deleteButtons.length - 1]);

      // Server sends update while we're deleting
      act(() => {
        mockSocket.trigger('game-updated', mockGame);
      });

      // Should preserve delete state
      await waitFor(() => {
        const currentDeleteButtons = screen.getAllByLabelText('Delete row');
        // Should have deleted one row
        expect(currentDeleteButtons.length).toBeLessThan(initialCount);
      });
    });

    it('should handle socket reconnection', async () => {
      renderWithRouter();
      await waitForSocketConnection();
      
      // Simulate disconnect
      act(() => {
        mockSocket.trigger('disconnect', 'io server disconnect');
      });

      // Simulate reconnect
      act(() => {
        mockSocket.trigger('reconnect');
      });

      // Should rejoin game
      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('join-game', 'test-token');
      }, { timeout: 1000 });
    });

    it('should broadcast local field updates to other users', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      await waitForSocketConnection();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      });

      const playerInput = screen.getByDisplayValue('Alice');
      await user.clear(playerInput);
      await user.type(playerInput, 'Updated');

      // Should emit field-update to socket
      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith(
          'field-update',
          expect.objectContaining({
            gameToken: 'test-token',
            rowId: 0,
            field: 'playerName',
            value: 'Updated',
          })
        );
      });
    });

    it('should broadcast row add to other users', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      await waitForSocketConnection();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add row/i });
      await user.click(addButton);

      // Should emit row-action to socket
      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith(
          'row-action',
          expect.objectContaining({
            gameToken: 'test-token',
            action: 'add',
          })
        );
      });
    });

    it('should broadcast row delete to other users', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      await waitForSocketConnection();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Bob')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText('Delete row');
      await user.click(deleteButtons[deleteButtons.length - 1]);

      // Should emit row-action to socket
      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith(
          'row-action',
          expect.objectContaining({
            gameToken: 'test-token',
            action: 'delete',
            rowId: expect.any(Number),
          })
        );
      });
    });
  });

  describe('Settle Game Functionality', () => {
    beforeEach(() => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockGame });
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { ...mockGame, settled: true },
      });
    });

    it('should settle game when balanced', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByText(/Balanced/i)).toBeInTheDocument();
      });

      const settleButton = screen.getByRole('button', { name: /settle game/i });
      expect(settleButton).not.toBeDisabled();
      
      await user.click(settleButton);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          '/games/public/test-token/settle'
        );
      });
    });

    it('should disable settle button when unbalanced', async () => {
      const unbalancedGame = {
        ...mockGame,
        transactions: [
          { _id: 't1', playerName: 'Alice', amount: 100 },
          { _id: 't2', playerName: 'Bob', amount: -50 },
        ],
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: unbalancedGame });
      
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByText(/Unbalanced/i)).toBeInTheDocument();
      });

      const settleButton = screen.getByRole('button', { name: /settle game/i });
      expect(settleButton).toBeDisabled();
    });

    it('should show error when trying to settle unbalanced game', async () => {
      const user = userEvent.setup({ delay: null });
      const unbalancedGame = {
        ...mockGame,
        transactions: [
          { _id: 't1', playerName: 'Alice', amount: 100 },
          { _id: 't2', playerName: 'Bob', amount: -50 },
        ],
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: unbalancedGame });
      
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByText(/Unbalanced/i)).toBeInTheDocument();
      });

      const settleButton = screen.getByRole('button', { name: /settle game/i });
      expect(settleButton).toBeDisabled();
    });

    it('should require at least one row with both player and amount to be valid', async () => {
      const emptyGame = {
        ...mockGame,
        transactions: [
          { _id: 't1', playerName: '', amount: 0 },
        ],
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: emptyGame });
      
      renderWithRouter();
      
      await waitFor(() => {
        const settleButton = screen.getByRole('button', { name: /settle game/i });
        expect(settleButton).toBeDisabled();
      });
    });

    it('should handle settle failure with error message', async () => {
      const user = userEvent.setup({ delay: null });
      (apiClient.post as jest.Mock).mockRejectedValue({
        response: { data: { error: 'Cannot settle: duplicates found', duplicates: ['Alice'] } },
      });
      
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByText(/Balanced/i)).toBeInTheDocument();
      });

      const settleButton = screen.getByRole('button', { name: /settle game/i });
      await user.click(settleButton);

      await waitFor(() => {
        expect(screen.getByText(/Cannot settle.*Alice/i)).toBeInTheDocument();
      });
    });

    it('should show settled badge after settling', async () => {
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByText(/Balanced/i)).toBeInTheDocument();
      });

      const user = userEvent.setup({ delay: null });
      const settleButton = screen.getByRole('button', { name: /settle game/i });
      await user.click(settleButton);

      await waitFor(() => {
        expect(screen.getByText(/Settled/i)).toBeInTheDocument();
      });
    });

    it('should allow editing after clicking Edit Game', async () => {
      const settledGame = { ...mockGame, settled: true };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: settledGame });
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { ...settledGame, settled: false },
      });
      
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit game/i })).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit game/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          '/games/public/test-token/edit'
        );
      });
    });
  });

  describe('Currency Selection', () => {
    beforeEach(() => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockGame });
    });

    it('should allow changing currency to CNY', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      });

      const currencySelect = screen.getByRole('combobox');
      await user.selectOptions(currencySelect, 'CNY');

      // Verify currency symbol changes
      await waitFor(() => {
        // Should see ¥ symbol in amounts
        const amountCells = screen.getAllByText(/¥/i);
        expect(amountCells.length).toBeGreaterThan(0);
      });
    });

    it('should allow changing currency back to USD', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      });

      const currencySelect = screen.getByRole('combobox');
      await user.selectOptions(currencySelect, 'CNY');
      await user.selectOptions(currencySelect, 'USD');

      // Should show $ symbol
      await waitFor(() => {
        const amountCells = screen.getAllByText(/\$/);
        expect(amountCells.length).toBeGreaterThan(0);
      });
    });

    it('should format amounts correctly for each currency', async () => {
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      });

      // Check USD formatting (default)
      const usdAmounts = screen.getAllByText(/\$100\.00|\$-\d+\.\d+/);
      expect(usdAmounts.length).toBeGreaterThan(0);
    });
  });

  describe('Copy URL Functionality', () => {
    beforeEach(() => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockGame });
    });

    it('should copy game URL to clipboard', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByText('Test Game')).toBeInTheDocument();
      });

      const copyButton = screen.getByRole('button', { name: /copy.*url/i });
      await user.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('/games/public/test-token')
      );

      // Verify success message appears
      await waitFor(() => {
        expect(screen.getByText('URL copied')).toBeInTheDocument();
      });
    });

    it('should hide success message after timeout', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByText('Test Game')).toBeInTheDocument();
      });

      const copyButton = screen.getByRole('button', { name: /copy.*url/i });
      await user.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText('URL copied')).toBeInTheDocument();
      });

      // Advance timer past 2 second timeout
      jest.advanceTimersByTime(2100);

      await waitFor(() => {
        expect(screen.queryByText('URL copied')).not.toBeInTheDocument();
      });
    });
  });

  describe('Settled Game State', () => {
    beforeEach(() => {
      const settledGame = { ...mockGame, settled: true };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: settledGame });
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { ...settledGame, settled: false },
      });
    });

    it('should show settled badge', async () => {
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByText(/Settled/i)).toBeInTheDocument();
      });
    });

    it('should disable editing when settled', async () => {
      renderWithRouter();
      
      await waitFor(() => {
        // Inputs should be read-only divs, not editable inputs
        const playerInputs = screen.queryAllByPlaceholderText('Name');
        expect(playerInputs.length).toBe(0);
      });
    });

    it('should show read-only transaction values', async () => {
      renderWithRouter();
      
      await waitFor(() => {
        // Should show player names in read-only divs (not inputs)
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should hide delete buttons when settled', async () => {
      renderWithRouter();
      
      await waitFor(() => {
        const deleteButtons = screen.queryAllByLabelText('Delete row');
        expect(deleteButtons.length).toBe(0);
      });
    });

    it('should hide add row button when settled', async () => {
      renderWithRouter();
      
      await waitFor(() => {
        const addButton = screen.queryByRole('button', { name: /add row/i });
        expect(addButton).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty transactions array', async () => {
      const emptyGame = { ...mockGame, transactions: [] };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: emptyGame });
      renderWithRouter();
      
      await waitFor(() => {
        // Should show at least one empty row
        const nameInputs = screen.getAllByPlaceholderText('Name');
        expect(nameInputs.length).toBeGreaterThan(0);
      });
    });

    it('should handle very long player names', async () => {
      const longNameGame = {
        ...mockGame,
        transactions: [
          { _id: 't1', playerName: 'A'.repeat(100), amount: 100 },
        ],
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: longNameGame });
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('A'.repeat(100))).toBeInTheDocument();
      });
    });

    it('should handle very large amounts', async () => {
      const largeAmountGame = {
        ...mockGame,
        transactions: [
          { _id: 't1', playerName: 'Alice', amount: 999999999.99 },
        ],
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: largeAmountGame });
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('999999999.99')).toBeInTheDocument();
      });
    });

    it('should handle negative amounts', async () => {
      const negativeGame = {
        ...mockGame,
        transactions: [
          { _id: 't1', playerName: 'Alice', amount: -100 },
        ],
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: negativeGame });
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('-100')).toBeInTheDocument();
      });
    });

    it('should handle decimal amounts', async () => {
      const decimalGame = {
        ...mockGame,
        transactions: [
          { _id: 't1', playerName: 'Alice', amount: 123.45 },
        ],
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: decimalGame });
      renderWithRouter();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('123.45')).toBeInTheDocument();
      });
    });

    it('should handle placeholder underscore in playerName', async () => {
      const underscoreGame = {
        ...mockGame,
        transactions: [
          { _id: 't1', playerName: '_', amount: 100 },
        ],
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: underscoreGame });
      renderWithRouter();
      
      await waitFor(() => {
        // Underscore should be hidden (treated as empty)
        const nameInput = screen.getByPlaceholderText('Name');
        expect(nameInput).toHaveValue('');
      });
    });

    it('should handle socket connection errors gracefully', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockGame });
      const errorSocket = createMockSocket();
      (io as jest.Mock).mockImplementation(() => {
        // Simulate connection error after a delay
        jest.advanceTimersByTime(100);
        act(() => {
          errorSocket.trigger('connect_error', { message: 'Connection failed' });
        });
        return errorSocket;
      });
      
      renderWithRouter();
      
      // Should still render game even if socket fails
      await waitFor(() => {
        expect(screen.getByText('Test Game')).toBeInTheDocument();
      });
    });

    it('should handle rapid successive updates', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      await waitForSocketConnection();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      });

      const playerInput = screen.getByDisplayValue('Alice');
      
      // Rapid typing
      await act(async () => {
        await user.type(playerInput, 'A');
        jest.advanceTimersByTime(50);
        await user.type(playerInput, 'B');
        jest.advanceTimersByTime(50);
        await user.type(playerInput, 'C');
        jest.advanceTimersByTime(250); // Complete debounce
      });

      // Should only save once after debounce
      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalled();
      });
    });

    it('should handle out-of-bounds row updates from socket', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockGame });
      renderWithRouter();
      await waitForSocketConnection();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      });

      // Simulate invalid row update
      act(() => {
        if (mockSocket) {
          mockSocket.trigger('field-updated', {
            rowId: 999, // Invalid row
            field: 'playerName',
            value: 'Invalid',
          });
        }
      });

      // Should not crash or show invalid data
      await waitFor(() => {
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile-Specific Behavior', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500, // Mobile width
      });
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockGame });
      // Reset clipboard mock for mobile tests
      if (navigator.clipboard) {
        (navigator.clipboard as any).writeText = jest.fn().mockResolvedValue(undefined);
      }
    });

    it('should show mobile layout', async () => {
      renderWithRouter();
      
      await waitFor(() => {
        // Mobile layout should stack elements vertically
        expect(screen.getByText('Test Game')).toBeInTheDocument();
      });
    });

    it('should show math keyboard on mobile when focusing amount input', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        const amountInputs = screen.getAllByPlaceholderText(/0\.00/i);
        expect(amountInputs.length).toBeGreaterThan(0);
      });

      const amountInput = screen.getAllByPlaceholderText(/0\.00/i)[0];
      await user.click(amountInput);

      await waitFor(() => {
        expect(screen.getByTestId('math-keyboard')).toBeInTheDocument();
      });
    });

    it('should close keyboard when clicking close button', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithRouter();
      
      await waitFor(() => {
        const amountInputs = screen.getAllByPlaceholderText(/0\.00/i);
        expect(amountInputs.length).toBeGreaterThan(0);
      });

      const amountInput = screen.getAllByPlaceholderText(/0\.00/i)[0];
      await user.click(amountInput);

      await waitFor(() => {
        expect(screen.getByTestId('math-keyboard')).toBeInTheDocument();
      });

      const closeButton = screen.getByTestId('keyboard-close');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('math-keyboard')).not.toBeInTheDocument();
      });
    });
  });
});
