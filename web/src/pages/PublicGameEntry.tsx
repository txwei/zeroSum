import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import apiClient from '../api/client';
import PlayerAutocomplete from '../components/PlayerAutocomplete';

interface Game {
  _id: string;
  name: string;
  date?: string;
  publicToken: string;
  createdByUserId: {
    _id: string;
    username: string;
    displayName: string;
  };
  groupId: {
    _id: string;
    name: string;
  };
  transactions: Array<{
    _id?: string;
    userId?: {
      _id: string;
      username: string;
      displayName: string;
    };
    playerName?: string;
    amount: number;
  }>;
}


interface PlayerRow {
  id: string; // Unique ID for this row
  playerInput: string; // The text input value
  userId?: string; // If a member is selected
  playerName?: string; // If just a name (not a member)
  amount: string; // Amount as string for input
}

const PublicGameEntry = () => {
  const { token } = useParams<{ token: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingGameName, setEditingGameName] = useState(false);
  const [gameName, setGameName] = useState('');
  const [rows, setRows] = useState<PlayerRow[]>([]);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (token && token !== 'undefined') {
      fetchGame();
    } else {
      setError('Invalid game link. Please check the URL and try again.');
      setLoading(false);
    }
  }, [token]);

  // Set up WebSocket connection for real-time updates
  useEffect(() => {
    if (!token || token === 'undefined') {
      return;
    }

    // Get API base URL for Socket.io connection
    // Socket.io connects to the server root, not /api
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    // Remove /api suffix if present for Socket.io (Socket.io doesn't use /api prefix)
    const socketUrl = apiUrl.replace(/\/api\/?$/, '');
    
    // If no protocol specified and we're in production, use https
    let finalSocketUrl = socketUrl;
    if (!socketUrl.startsWith('http://') && !socketUrl.startsWith('https://')) {
      finalSocketUrl = window.location.protocol === 'https:' 
        ? `https://${socketUrl}` 
        : `http://${socketUrl}`;
    }

    // Connect to Socket.io server
    const socket = io(finalSocketUrl, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    // Join the game room
    socket.emit('join-game', token);

    // Listen for game updates
    socket.on('game-updated', (updatedGame: Game) => {
      // Only update if we're not currently submitting (to avoid conflicts)
      if (!submitting) {
        setGame(updatedGame);
      }
    });

    // Handle connection errors
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      // Fallback to polling if WebSocket fails
    });

    // Cleanup on unmount
    return () => {
      socket.emit('leave-game', token);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, submitting]);

  useEffect(() => {
    if (game) {
      setGameName(game.name);
      // Initialize rows from game transactions, or start with 2 empty rows
      if (game.transactions.length > 0) {
        const initialRows: PlayerRow[] = game.transactions.map((t, index) => ({
          id: `row-${index}`,
          playerInput: t.userId ? (t.userId.displayName || '') : (t.playerName || ''),
          userId: t.userId?._id,
          playerName: t.playerName,
          amount: t.amount.toString(),
        }));
        setRows(initialRows);
      } else {
        // Start with 2 empty rows
        setRows([
          { id: 'row-0', playerInput: '', amount: '' },
          { id: 'row-1', playerInput: '', amount: '' },
        ]);
      }
    }
  }, [game]);

  const fetchGame = async () => {
    try {
      const response = await apiClient.get(`/games/public/${token}`);
      setGame(response.data);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load game');
      setLoading(false);
    }
  };

  // Members are now fetched by PlayerAutocomplete component
  // No need to fetch here anymore

  const handleUpdateGameName = async () => {
    setError('');
    setSubmitting(true);

    try {
      const response = await apiClient.put(`/games/public/${token}`, {
        name: gameName.trim(),
      });
      setGame(response.data);
      setEditingGameName(false);
      setSuccess('Game name updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update game name');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAll = async () => {
    setError('');
    setSubmitting(true);

    try {
      // First, delete all existing transactions
      const currentTransactionCount = game?.transactions.length || 0;
      for (let i = currentTransactionCount - 1; i >= 0; i--) {
        await apiClient.delete(`/games/public/${token}/transactions?index=${i}`);
      }

      // Then, add all new transactions from rows
      for (const row of rows) {
        if (!row.amount || row.amount === '') {
          continue; // Skip empty rows
        }

        const amount = parseFloat(row.amount);
        if (isNaN(amount)) {
          continue; // Skip invalid amounts
        }

        const payload: any = {
          amount,
        };

        if (row.userId) {
          // Member selected
          payload.userId = row.userId;
        } else if (row.playerName && row.playerName.trim()) {
          // Just a name (not a member)
          payload.playerName = row.playerName.trim();
        } else {
          continue; // Skip rows without user/name
        }

        await apiClient.post(`/games/public/${token}/transactions`, payload);
      }

      // Refresh game data
      await fetchGame();
      setSuccess('All changes saved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save changes');
    } finally {
      setSubmitting(false);
    }
  };

  const addRow = () => {
    const newRow: PlayerRow = {
      id: `row-${Date.now()}`,
      playerInput: '',
      amount: '',
    };
    setRows([...rows, newRow]);
  };

  const removeRow = (rowId: string) => {
    if (rows.length <= 1) {
      setError('At least one row is required');
      return;
    }
    setRows(rows.filter(r => r.id !== rowId));
  };

  const updateRow = (rowId: string, updates: Partial<PlayerRow>) => {
    setRows(rows.map(r => r.id === rowId ? { ...r, ...updates } : r));
  };

  const handleUserCreated = (rowId: string) => (newUser: { _id: string; id?: string; username: string; displayName: string }) => {
    updateRow(rowId, {
      playerInput: newUser.displayName,
      userId: newUser._id || newUser.id,
      playerName: undefined,
    });
    setSuccess('User created and added to group!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error && !game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!game) {
    return null;
  }

  // Calculate sum from rows
  const sum = rows.reduce((acc, row) => {
    const amount = parseFloat(row.amount) || 0;
    return acc + amount;
  }, 0);
  // Valid if sum is zero (or very close) and at least one row has an amount
  const isValid = Math.abs(sum) < 0.01 && rows.some(r => r.amount !== '');
  // Show "balanced" by default if no amounts entered yet
  const hasAmounts = rows.some(r => r.amount !== '');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Game Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            {editingGameName ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Game title"
                />
                <button
                  onClick={handleUpdateGameName}
                  disabled={submitting}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingGameName(false);
                    setGameName(game.name);
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">{game.name}</h1>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const publicLink = `${window.location.origin}${import.meta.env.BASE_URL || '/'}games/public/${token}`;
                      navigator.clipboard.writeText(publicLink).then(() => {
                        setSuccess('Game URL copied to clipboard!');
                        setTimeout(() => setSuccess(''), 3000);
                      });
                    }}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50"
                  >
                    Copy Game URL
                  </button>
                  <button
                    onClick={() => setEditingGameName(true)}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50"
                  >
                    Edit Title
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                {success}
              </div>
            )}

            <div className="mb-6 flex justify-between items-center">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  !hasAmounts || isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {!hasAmounts || isValid 
                  ? '✓ Balanced' 
                  : `Unbalanced (sum: ${formatCurrency(sum)})`}
              </span>
              <button
                onClick={handleSaveAll}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save All Changes'}
              </button>
            </div>

            {/* Players Table */}
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">
                        <PlayerAutocomplete
                          token={token || ''}
                          value={row.playerInput}
                          onChange={(value, userId, playerName) => {
                            updateRow(row.id, {
                              playerInput: value,
                              userId,
                              playerName,
                            });
                          }}
                          onUserCreated={handleUserCreated(row.id)}
                          placeholder="Enter player name..."
                          excludeUserIds={rows
                            .filter(r => r.id !== row.id && r.userId)
                            .map(r => r.userId!)
                            .filter(Boolean)}
                          selectedUserId={row.userId}
                          selectedPlayerName={row.playerName}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          value={row.amount}
                          onChange={(e) => updateRow(row.id, { amount: e.target.value })}
                          placeholder="0.00"
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => removeRow(row.id)}
                          disabled={rows.length <= 1}
                          className="text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                          title="Remove row"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">Total</td>
                    <td
                      className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${
                        !hasAmounts || isValid ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(sum)}
                    </td>
                    <td>
                      <button
                        onClick={addRow}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        + Add Row
                      </button>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default PublicGameEntry;
