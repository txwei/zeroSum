import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import apiClient from '../api/client';

interface Game {
  _id: string;
  name: string;
  date?: string;
  publicToken: string;
  settled?: boolean;
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
    playerName?: string;
    amount: number;
  }>;
}

interface TransactionRow {
  index: number;
  playerName: string;
  amount: string;
}

type Currency = 'USD' | 'CNY';

const PublicGameEntry = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gameName, setGameName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [gameDate, setGameDate] = useState<string>('');
  const [editingDate, setEditingDate] = useState(false);
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const updatingFieldsRef = useRef<Set<string>>(new Set()); // Track fields being updated locally
  const nameUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map()); // Track pending saves
  const rowsRef = useRef<TransactionRow[]>([]); // Keep ref for beforeunload

  // Helper function to format date to YYYY-MM-DD
  // The date is stored as UTC midnight, so we need to extract the UTC date components
  // to avoid timezone shifts when displaying
  const formatDateForInput = (dateString: string): string => {
    const date = new Date(dateString);
    // Use UTC methods to get the date components, since we store dates at UTC midnight
    // This ensures "2024-12-18" stays "2024-12-18" regardless of user's timezone
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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

    let finalSocketUrl: string;
    const viteApiUrl = import.meta.env.VITE_API_URL;
    
    if (viteApiUrl) {
      finalSocketUrl = viteApiUrl.replace(/\/api\/?$/, '');
    } else if (import.meta.env.DEV) {
      finalSocketUrl = 'http://localhost:5001';
    } else {
      finalSocketUrl = window.location.origin;
    }
    
    if (!finalSocketUrl.startsWith('http://') && !finalSocketUrl.startsWith('https://')) {
      finalSocketUrl = window.location.protocol === 'https:' 
        ? `https://${finalSocketUrl}` 
        : `http://${finalSocketUrl}`;
    }

    const socket = io(finalSocketUrl, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket.io connected:', socket.id);
      socket.emit('join-game', token);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket.io disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket.io connection error:', error.message);
    });

    socket.on('reconnect', () => {
      socket.emit('join-game', token);
    });

    // Listen for field-level updates from other users
    socket.on('field-updated', ({ rowId, field, value }: { rowId: number; field: 'playerName' | 'amount'; value: string | number }) => {
      const fieldKey = `${rowId}-${field}`;
      // Only update if we're not currently editing this field
      if (!updatingFieldsRef.current.has(fieldKey)) {
        setRows((currentRows) => {
          const newRows = [...currentRows];
          if (rowId >= 0 && rowId < newRows.length) {
            if (field === 'playerName') {
              // Hide placeholder underscore - treat it as empty in UI
              const displayValue = (value as string) === '_' ? '' : (value as string);
              newRows[rowId] = { ...newRows[rowId], playerName: displayValue };
            } else if (field === 'amount') {
              newRows[rowId] = { ...newRows[rowId], amount: value.toString() };
            }
          }
          return newRows;
        });
      }
    });

    // Listen for game name updates
    socket.on('game-name-updated', ({ name }: { name: string }) => {
      if (!editingName) {
        setGameName(name);
        setGame((currentGame) => currentGame ? { ...currentGame, name } : null);
      }
    });

    // Listen for game date updates
    socket.on('game-date-updated', ({ date }: { date?: string }) => {
      if (!editingDate) {
        if (date) {
          const formattedDate = formatDateForInput(date);
          setGameDate(formattedDate);
        } else {
          setGameDate('');
        }
        setGame((currentGame) => currentGame ? { ...currentGame, date } : null);
      }
    });

    // Listen for row add/delete
    socket.on('row-action-updated', ({ action, rowId }: { action: 'add' | 'delete'; rowId?: number }) => {
      if (action === 'add') {
        setRows((currentRows) => [...currentRows, { index: currentRows.length, playerName: '', amount: '' }]);
      } else if (action === 'delete' && rowId !== undefined) {
        setRows((currentRows) => {
          const newRows = currentRows.filter((_, idx) => idx !== rowId);
          // Re-index
          return newRows.map((row, idx) => ({ ...row, index: idx }));
        });
      }
    });

    // Listen for full game updates (from server saves or initial join)
    // This is the source of truth - always update when received
    socket.on('game-updated', (updatedGame: Game) => {
      setGame(updatedGame);
      setGameName(updatedGame.name);
      // Update date using local timezone
      if (updatedGame.date) {
        const formattedDate = formatDateForInput(updatedGame.date);
        setGameDate(formattedDate);
      } else {
        setGameDate('');
      }
      // Update rows from server (this is the authoritative state)
      const newRows: TransactionRow[] = updatedGame.transactions.map((t, idx) => {
        // Use playerName only - hide placeholder underscore
        const displayName = t.playerName && t.playerName !== '_' ? t.playerName : '';
        return {
          index: idx,
          playerName: displayName,
          amount: t.amount.toString(),
        };
      });
      // Ensure at least one empty row
      if (newRows.length === 0) {
        newRows.push({ index: 0, playerName: '', amount: '' });
      }
      setRows(newRows);
      rowsRef.current = newRows;
    });

    return () => {
      if (socketRef.current) {
        socket.emit('leave-game', token);
        socket.disconnect();
        socketRef.current = null;
      }
      if (nameUpdateTimeoutRef.current) {
        clearTimeout(nameUpdateTimeoutRef.current);
      }
      if (dateUpdateTimeoutRef.current) {
        clearTimeout(dateUpdateTimeoutRef.current);
      }
      if (dateSocketTimeoutRef.current) {
        clearTimeout(dateSocketTimeoutRef.current);
      }
    };
  }, [token, editingName, editingDate]);

  useEffect(() => {
    if (game) {
      setGameName(game.name);
      // Format date for input (YYYY-MM-DD) using local timezone
      if (game.date) {
        const formattedDate = formatDateForInput(game.date);
        setGameDate(formattedDate);
      } else {
        setGameDate('');
      }
      const newRows: TransactionRow[] = game.transactions.map((t, idx) => {
        // Use playerName only - hide placeholder underscore
        const displayName = t.playerName && t.playerName !== '_' ? t.playerName : '';
        return {
          index: idx,
          playerName: displayName,
          amount: t.amount.toString(),
        };
      });
      // Ensure at least one empty row
      if (newRows.length === 0) {
        newRows.push({ index: 0, playerName: '', amount: '' });
      }
      setRows(newRows);
      rowsRef.current = newRows; // Keep ref in sync
    }
  }, [game?._id]);

  // Keep rowsRef in sync with rows state
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  // Save all pending changes before page unload or visibility change
  useEffect(() => {
    const saveAllPending = async () => {
      // Clear all pending timeouts and save immediately
      const pendingSaves = Array.from(saveTimeoutsRef.current.keys());
      for (const key of pendingSaves) {
        const timeout = saveTimeoutsRef.current.get(key);
        if (timeout) {
          clearTimeout(timeout);
          saveTimeoutsRef.current.delete(key);
        }
      }
      
      // Force save current state
      const currentRows = rowsRef.current;
      if (token && currentRows.length > 0) {
            // Save each row that has data
        const savePromises: Promise<any>[] = [];
        for (let i = 0; i < currentRows.length; i++) {
          const row = currentRows[i];
          if (row.playerName || row.amount) {
            // Save playerName
            if (row.playerName) {
              savePromises.push(
                apiClient.patch(`/games/public/${token}/transaction/${i}`, {
                  field: 'playerName',
                  value: row.playerName,
                }).catch((err) => {
                  console.error(`Failed to save row ${i} playerName:`, err);
                })
              );
            }
            // Save amount
            if (row.amount) {
              savePromises.push(
                apiClient.patch(`/games/public/${token}/transaction/${i}`, {
                  field: 'amount',
                  value: parseFloat(row.amount) || 0,
                }).catch((err) => {
                  console.error(`Failed to save row ${i} amount:`, err);
                })
              );
            }
          }
        }
        // Wait for all saves to complete (but don't block if taking too long)
        Promise.all(savePromises).catch(() => {
          // Ignore errors, we tried our best
        });
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Use synchronous API to save (navigator.sendBeacon would be better but requires different endpoint)
      // For now, we'll rely on visibilitychange which is more reliable
      saveAllPending();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Page is being hidden (user switching tabs, closing, etc.)
        saveAllPending();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token]);

  const fetchGame = async () => {
    try {
      const response = await apiClient.get(`/games/public/${token}`);
      setGame(response.data);
      setLoading(false);
    } catch (err: any) {
      console.error('❌ Failed to load game:', err);
      setError(err.response?.data?.error || 'Failed to load game');
      setLoading(false);
    }
  };

  // Update a field in real-time (Google Docs style)
  const updateField = async (rowId: number, field: 'playerName' | 'amount', value: string | number, immediate = false) => {
    if (isSettled) return; // Don't allow edits when settled
    const fieldKey = `${rowId}-${field}`;
    updatingFieldsRef.current.add(fieldKey);

    // Optimistic update
    setRows((currentRows) => {
      const newRows = [...currentRows];
      if (rowId >= 0 && rowId < newRows.length) {
        if (field === 'playerName') {
          newRows[rowId] = { 
            ...newRows[rowId], 
            playerName: value as string,
          };
        } else if (field === 'amount') {
          newRows[rowId] = { ...newRows[rowId], amount: value.toString() };
        }
      }
      rowsRef.current = newRows; // Keep ref in sync
      return newRows;
    });

    // Broadcast to other users immediately
    if (socketRef.current && token) {
      socketRef.current.emit('field-update', {
        gameToken: token,
        rowId,
        field,
        value,
      });
    }

    // Save to server (with short debounce, or immediately if requested)
    const saveToServer = async () => {
      updatingFieldsRef.current.delete(fieldKey);
      
      // Only save if row exists
      const currentRows = rowsRef.current;
      if (rowId >= 0 && rowId < currentRows.length) {
        const payload: any = {
          field,
          value: field === 'amount' ? parseFloat(value as string) : value,
        };
        try {
          const response = await apiClient.patch(`/games/public/${token}/transaction/${rowId}`, payload);
          // Update local state with server response to ensure sync
          if (response.data) {
            setGame(response.data);
          }
        } catch (err: any) {
          console.error('Failed to save field update:', err);
          const errorMsg = err.response?.data?.error || err.message || 'Failed to save';
          console.error(`Save error for row ${rowId}, field ${field}:`, errorMsg);
          
          // Retry once after a short delay
          setTimeout(() => {
            apiClient.patch(`/games/public/${token}/transaction/${rowId}`, payload)
              .then((retryResponse) => {
                if (retryResponse.data) {
                  setGame(retryResponse.data);
                }
              })
              .catch((retryErr) => {
                console.error('Retry save also failed:', retryErr);
                // Show error to user if retry also fails
                setError(`Failed to save ${field}. Please try again.`);
                setTimeout(() => setError(''), 5000);
              });
          }, 1000);
        }
      }
    };

    // Clear existing timeout for this field
    const existingTimeout = saveTimeoutsRef.current.get(fieldKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    if (immediate) {
      // Save immediately (e.g., on blur)
      saveToServer();
    } else {
      // Debounce: save after 200ms of no changes (reduced from 500ms)
      const timeout = setTimeout(saveToServer, 200);
      saveTimeoutsRef.current.set(fieldKey, timeout);
    }
  };

  const updateGameName = async (newName: string, immediate = false) => {
    if (isSettled) return; // Don't allow edits when settled
    setGameName(newName);

    // Broadcast immediately
    if (socketRef.current && token) {
      if (nameUpdateTimeoutRef.current) {
        clearTimeout(nameUpdateTimeoutRef.current);
      }
      nameUpdateTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('game-name-update', {
          gameToken: token,
          name: newName,
        });
      }, 200);
    }

    // Save to server (with shorter debounce, or immediately if requested)
    if (nameUpdateTimeoutRef.current) {
      clearTimeout(nameUpdateTimeoutRef.current);
    }
    
    const saveName = async () => {
      try {
        await apiClient.put(`/games/public/${token}/name`, { name: newName });
      } catch (err) {
        console.error('Failed to save game name:', err);
        // Retry once
        setTimeout(() => {
          apiClient.put(`/games/public/${token}/name`, { name: newName }).catch((retryErr) => {
            console.error('Retry save name also failed:', retryErr);
          });
        }, 1000);
      }
    };

    if (immediate) {
      saveName();
    } else {
      nameUpdateTimeoutRef.current = setTimeout(saveName, 300); // Reduced from 1000ms
    }
  };

  const dateUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dateSocketTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateGameDate = async (newDate: string, immediate = false) => {
    if (isSettled) return; // Don't allow edits when settled
    setGameDate(newDate);

    // Broadcast immediately
    if (socketRef.current && token) {
      if (dateSocketTimeoutRef.current) {
        clearTimeout(dateSocketTimeoutRef.current);
      }
      dateSocketTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('game-date-update', {
          gameToken: token,
          date: newDate || undefined,
        });
      }, 200);
    }

    // Save to server (with shorter debounce, or immediately if requested)
    if (dateUpdateTimeoutRef.current) {
      clearTimeout(dateUpdateTimeoutRef.current);
    }
    
    const saveDate = async () => {
      try {
        await apiClient.put(`/games/public/${token}/date`, { date: newDate || null });
      } catch (err) {
        console.error('Failed to save game date:', err);
        // Retry once
        setTimeout(() => {
          apiClient.put(`/games/public/${token}/date`, { date: newDate || null }).catch((retryErr) => {
            console.error('Retry save date also failed:', retryErr);
          });
        }, 1000);
      }
    };

    if (immediate) {
      saveDate();
    } else {
      dateUpdateTimeoutRef.current = setTimeout(saveDate, 300);
    }
  };

  const addRow = async () => {
    if (isSettled) return; // Don't allow edits when settled
    const newIndex = rows.length;
    const newRow: TransactionRow = { index: newIndex, playerName: '', amount: '' };
    
    // Optimistic update
    setRows((currentRows) => {
      const updated = [...currentRows, newRow];
      rowsRef.current = updated;
      return updated;
    });

    // Broadcast to other users
    if (socketRef.current && token) {
      socketRef.current.emit('row-action', {
        gameToken: token,
        action: 'add',
      });
    }

    // Save to server immediately
    try {
      const response = await apiClient.post(`/games/public/${token}/transaction`, {
        playerName: '',
        amount: 0,
      });
      // Update with server response to ensure sync
      if (response.data) {
        setGame(response.data);
      }
    } catch (err) {
      console.error('Failed to add row:', err);
      // Revert on error
      setRows((currentRows) => {
        const reverted = currentRows.slice(0, -1);
        rowsRef.current = reverted;
        return reverted;
      });
    }
  };

  const deleteRow = async (rowId: number) => {
    if (isSettled) return; // Don't allow edits when settled
    if (rows.length <= 1) {
      setError('At least one row is required');
      return;
    }

    // Store current state for potential revert
    const previousRows = [...rows];

    // Optimistic update
    setRows((currentRows) => {
      const newRows = currentRows.filter((_, idx) => idx !== rowId);
      const reindexed = newRows.map((row, idx) => ({ ...row, index: idx }));
      rowsRef.current = reindexed;
      return reindexed;
    });

    // Broadcast to other users
    if (socketRef.current && token) {
      socketRef.current.emit('row-action', {
        gameToken: token,
        action: 'delete',
        rowId,
      });
    }

    // Save to server immediately
    try {
      const response = await apiClient.delete(`/games/public/${token}/transaction/${rowId}`);
      // Update with server response to ensure sync
      if (response.data) {
        setGame(response.data);
      }
    } catch (err) {
      console.error('Failed to delete row:', err);
      // Revert on error
      setRows(previousRows);
      rowsRef.current = previousRows;
    }
  };


  const handleSettle = async () => {
    if (!isValid) {
      setError('Game must be balanced (sum equals zero) before settling');
      return;
    }

    try {
      const response = await apiClient.post(`/games/public/${token}/settle`);
      if (response.data) {
        setGame(response.data);
        setError('');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to settle game';
      const duplicates = err.response?.data?.duplicates;
      if (duplicates && duplicates.length > 0) {
        setError(`${errorMsg}: ${duplicates.join(', ')}`);
      } else {
        setError(errorMsg);
      }
    }
  };

  const handleEdit = async () => {
    try {
      const response = await apiClient.post(`/games/public/${token}/edit`);
      if (response.data) {
        setGame(response.data);
        setError('');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to edit game');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(currency === 'CNY' ? 'zh-CN' : 'en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getCurrencySymbol = () => {
    return currency === 'CNY' ? '¥' : '$';
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

  // Calculate sum and check if balanced (recalculates on every render/change)
  const sum = rows.reduce((acc, row) => {
    const amount = parseFloat(row.amount);
    if (isNaN(amount)) return acc;
    return acc + amount;
  }, 0);

  // Check if game is balanced: sum must be zero AND at least one row has both player and amount
  const isValid = Math.abs(sum) < 0.01 && rows.some(r => {
    const hasPlayer = r.playerName && r.playerName.trim() !== '' && r.playerName.trim() !== ' ';
    const hasAmount = r.amount && r.amount !== '' && parseFloat(r.amount) !== 0;
    return hasPlayer && hasAmount;
  });

  const isSettled = game?.settled || false;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {showCopiedMessage && (
          <div className="fixed top-4 right-4 bg-white shadow-lg border border-gray-200 rounded-lg px-4 py-3 z-50 flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium text-gray-900">URL copied</span>
          </div>
        )}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Game Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            {game?.groupId && (
              <div className="mb-3">
                <button
                  onClick={() => navigate(`/groups/${game.groupId._id}`)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                >
                  ← Back to {game.groupId.name}
                </button>
              </div>
            )}
            {editingName && !isSettled ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={gameName}
                  onChange={(e) => updateGameName(e.target.value)}
                  onBlur={(e) => {
                    updateGameName(e.target.value, true);
                    setEditingName(false);
                  }}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Game title"
                  autoFocus
                />
                <button
                  onClick={() => setEditingName(false)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Done
                </button>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h1 
                    className={`text-2xl font-bold text-gray-900 ${!isSettled ? 'cursor-pointer hover:text-blue-600' : ''}`}
                    onClick={() => !isSettled && setEditingName(true)}
                    title={!isSettled ? "Click to edit" : ""}
                  >
                    {gameName}
                  </h1>
                  <button
                    onClick={() => {
                      const publicLink = `${window.location.origin}${import.meta.env.BASE_URL || '/'}games/public/${token}`;
                      navigator.clipboard.writeText(publicLink).then(() => {
                        setShowCopiedMessage(true);
                        setTimeout(() => setShowCopiedMessage(false), 2000);
                      });
                    }}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50"
                  >
                    Copy Game URL
                  </button>
                </div>
                {editingDate && !isSettled ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="date"
                      value={gameDate}
                      onChange={(e) => updateGameDate(e.target.value)}
                      onBlur={(e) => {
                        updateGameDate(e.target.value, true);
                        setEditingDate(false);
                      }}
                      className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => setEditingDate(false)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div 
                    className={`text-sm text-gray-500 ${!isSettled ? 'cursor-pointer hover:text-blue-600' : ''}`}
                    onClick={() => !isSettled && setEditingDate(true)}
                    title={!isSettled ? "Click to edit" : ""}
                  >
                    {gameDate ? (() => {
                      // Parse the YYYY-MM-DD string and format it for display
                      const [year, month, day] = gameDate.split('-').map(Number);
                      const date = new Date(year, month - 1, day);
                      return date.toLocaleDateString();
                    })() : 'No date set'}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-6 py-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="mb-6 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {isValid 
                    ? '✓ Balanced' 
                    : `Unbalanced (sum: ${formatCurrency(sum)})`}
                </span>
                {isSettled && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    ✓ Settled
                  </span>
                )}
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                >
                  <option value="USD">USD ($)</option>
                  <option value="CNY">CNY (¥)</option>
                </select>
              </div>
              <div className="flex space-x-2">
                {!isSettled ? (
                  <button
                    onClick={handleSettle}
                    disabled={!isValid}
                    className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Settle Game
                  </button>
                ) : (
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    Edit Game
                  </button>
                )}
              </div>
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
                    <tr key={row.index}>
                      <td className="px-4 py-3">
                        {isSettled ? (
                          <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                            {row.playerName || '—'}
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={row.playerName}
                            onChange={(e) => updateField(row.index, 'playerName', e.target.value)}
                            onBlur={(e) => updateField(row.index, 'playerName', e.target.value, true)}
                            placeholder="Enter player name..."
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isSettled ? (
                          <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                            {row.amount ? formatCurrency(parseFloat(row.amount) || 0) : '—'}
                          </div>
                        ) : (
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                              {getCurrencySymbol()}
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              value={row.amount}
                              onChange={(e) => updateField(row.index, 'amount', e.target.value)}
                              onBlur={(e) => updateField(row.index, 'amount', e.target.value, true)}
                              placeholder="0.00"
                              className="w-full pl-8 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {!isSettled && (
                          <button
                            onClick={() => deleteRow(row.index)}
                            disabled={rows.length <= 1}
                            className="text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                            title="Remove row"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">Total</td>
                    <td
                      className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${
                        isValid ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(sum)}
                    </td>
                    <td>
                      {!isSettled && (
                        <button
                          onClick={addRow}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          + Add Row
                        </button>
                      )}
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
