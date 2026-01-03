import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import apiClient from '../api/client';
import { getBasePath, getApiUrl, isDev } from '../utils/env';
import MathKeyboard from '../components/MathKeyboard';

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
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [activeInputRowIndex, setActiveInputRowIndex] = useState<number | null>(null);
  const amountInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const activeInputRef = useRef<HTMLInputElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const keyboardClosingRef = useRef<boolean>(false); // Track if keyboard is being closed intentionally

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const socketRef = useRef<Socket | null>(null);
  const updatingFieldsRef = useRef<Set<string>>(new Set()); // Track fields being updated locally
  const saveTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map()); // Track pending saves
  const rowsRef = useRef<TransactionRow[]>([]); // Keep ref for beforeunload
  const addingRowRef = useRef<boolean>(false); // Track if we're currently adding a row
  const deletingRowRef = useRef<boolean>(false); // Track if we're currently deleting a row
  const expectedRowCountRef = useRef<number | null>(null); // Track expected row count after deletion
  const focusingInputRef = useRef<boolean>(false); // Track if we're intentionally focusing an input

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

  // Safely evaluate math expressions
  const evaluateExpression = (expr: string): number | null => {
    try {
      // Remove whitespace
      let cleanExpr = expr.trim();
      
      // Remove leading "=" if present (for backward compatibility)
      if (cleanExpr.startsWith('=')) {
        cleanExpr = cleanExpr.substring(1).trim();
      }
      
      // Only allow numbers, operators, parentheses, and decimal points
      if (!/^[0-9+\-*/().\s]+$/.test(cleanExpr)) {
        return null;
      }
      
      // Use Function constructor for safe evaluation (safer than eval)
      // Only allows mathematical expressions
      const result = new Function(`return ${cleanExpr}`)();
      
      // Verify result is a valid number
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return result;
      }
      return null;
    } catch {
      return null;
    }
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
    const viteApiUrl = getApiUrl();
    
    if (viteApiUrl) {
      finalSocketUrl = viteApiUrl.replace(/\/api\/?$/, '');
    } else if (isDev()) {
      finalSocketUrl = 'http://localhost:5001';
    } else {
      finalSocketUrl = window.location.origin;
    }
    
    if (finalSocketUrl && !finalSocketUrl.startsWith('http://') && !finalSocketUrl.startsWith('https://')) {
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
      // Only update rows if we're not actively adding or deleting a row locally
      if (addingRowRef.current || deletingRowRef.current) {
        return;
      }
      
      // If we have an expected row count (from a deletion), only accept updates that match
      if (expectedRowCountRef.current !== null) {
        if (updatedGame.transactions.length !== expectedRowCountRef.current) {
          // Server update doesn't match our expected count, ignore it
          return;
        }
        // Matches expected count, clear the expectation
        expectedRowCountRef.current = null;
      }
      
      setGame(updatedGame);
      
      // Only update gameName if not currently editing
      if (!editingName) {
        setGameName(updatedGame.name);
      }
      
      // Only update gameDate if not currently editing
      if (!editingDate) {
        // Update date using local timezone
        if (updatedGame.date) {
          const formattedDate = formatDateForInput(updatedGame.date);
          setGameDate(formattedDate);
        } else {
          setGameDate('');
        }
      }
      // Update rows from server (this is the authoritative state)
      // But preserve any fields that are currently being edited to prevent flickering
      // Also skip if we're currently adding a row to prevent race condition
      if (!addingRowRef.current && !deletingRowRef.current) {
        setRows((currentRows) => {
          const newRows: TransactionRow[] = updatedGame.transactions.map((t, idx) => {
            // Use playerName only - hide placeholder underscore
            const displayName = t.playerName && t.playerName !== '_' ? t.playerName : '';
            
            // If we're currently editing this field, keep the current value to prevent flicker
            const playerNameKey = `${idx}-playerName`;
            const amountKey = `${idx}-amount`;
            const isEditingPlayerName = updatingFieldsRef.current.has(playerNameKey);
            const isEditingAmount = updatingFieldsRef.current.has(amountKey);
            
            // Preserve current value if actively editing
            const currentRow = currentRows[idx];
            return {
              index: idx,
              playerName: isEditingPlayerName && currentRow ? currentRow.playerName : displayName,
              amount: isEditingAmount && currentRow ? currentRow.amount : t.amount.toString(),
            };
          });
          // Ensure at least one empty row
          if (newRows.length === 0) {
            newRows.push({ index: 0, playerName: '', amount: '' });
          }
          rowsRef.current = newRows;
          return newRows;
        });
      }
    });

    return () => {
      if (socketRef.current) {
        socket.emit('leave-game', token);
        socket.disconnect();
        socketRef.current = null;
      }
    };
  }, [token, editingName, editingDate]);

  useEffect(() => {
    if (game) {
      // Only update gameName if not currently editing to prevent input jumping
      if (!editingName) {
        setGameName(game.name);
      }
      // Format date for input (YYYY-MM-DD) using local timezone
      // Only update gameDate if not currently editing
      if (!editingDate) {
        if (game.date) {
          const formattedDate = formatDateForInput(game.date);
          setGameDate(formattedDate);
        } else {
          setGameDate('');
        }
      }
      // Update rows from game, but preserve any fields currently being edited
      // Also preserve optimistic rows (rows that exist in state but not yet in game.transactions)
      setRows((currentRows) => {
        // If we're adding a row, preserve optimistic rows
        if (addingRowRef.current && currentRows.length > game.transactions.length) {
          // Don't update rows yet - wait for the server response
          return currentRows;
        }
        
        // If we're deleting a row, check if the server update matches our expected count
        if (deletingRowRef.current || expectedRowCountRef.current !== null) {
          const expectedCount = expectedRowCountRef.current ?? currentRows.length;
          if (game.transactions.length !== expectedCount) {
            // Server update doesn't match our expected count, ignore it
            return currentRows;
          }
          // Matches expected count, clear the expectation
          if (expectedRowCountRef.current !== null) {
            expectedRowCountRef.current = null;
          }
        }
        
        const newRows: TransactionRow[] = game.transactions.map((t, idx) => {
          // Use playerName only - hide placeholder underscore
          const displayName = t.playerName && t.playerName !== '_' ? t.playerName : '';
          
          // If we're currently editing this field, keep the current value to prevent flicker
          const playerNameKey = `${idx}-playerName`;
          const amountKey = `${idx}-amount`;
          const isEditingPlayerName = updatingFieldsRef.current.has(playerNameKey);
          const isEditingAmount = updatingFieldsRef.current.has(amountKey);
          
          // Preserve current value if actively editing
          const currentRow = currentRows[idx];
          return {
            index: idx,
            playerName: isEditingPlayerName && currentRow ? currentRow.playerName : displayName,
            amount: isEditingAmount && currentRow ? currentRow.amount : t.amount.toString(),
          };
        });
        
        // Preserve optimistic rows (rows that exist in currentRows but not yet in game.transactions)
        // This prevents flickering when adding a new row
        if (currentRows.length > game.transactions.length) {
          const optimisticRows = currentRows.slice(game.transactions.length);
          newRows.push(...optimisticRows.map((row, idx) => ({
            ...row,
            index: game.transactions.length + idx,
          })));
        }
        
        // Ensure at least one empty row
        if (newRows.length === 0) {
          newRows.push({ index: 0, playerName: '', amount: '' });
        }
        rowsRef.current = newRows; // Keep ref in sync
        return newRows;
      });
    }
  }, [game?._id, game?.transactions.length, editingName, editingDate]);

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

    const handleBeforeUnload = () => {
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

    // Don't evaluate formulas automatically - just store the value as-is
    const processedValue = value;

    // Optimistic update
    setRows((currentRows) => {
      const newRows = [...currentRows];
      if (rowId >= 0 && rowId < newRows.length) {
        if (field === 'playerName') {
          newRows[rowId] = { 
            ...newRows[rowId], 
            playerName: processedValue as string,
          };
        } else if (field === 'amount') {
          newRows[rowId] = { ...newRows[rowId], amount: processedValue.toString() };
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
        value: processedValue,
      });
    }

    // Save to server (with short debounce, or immediately if requested)
    const saveToServer = async () => {
      // Only save if row exists
      const currentRows = rowsRef.current;
      if (rowId >= 0 && rowId < currentRows.length) {
        // For amount field, validate before saving
        if (field === 'amount') {
          const strValue = processedValue as string;
          // Don't save if value is empty
          if (strValue === '') {
            updatingFieldsRef.current.delete(fieldKey);
            return;
          }
          
          // Check if the string contains operators (indicating it's an expression, not just a number)
          const hasOperators = /[+\-*/()]/.test(strValue);
          
          // If it contains operators, it's an expression - don't save until evaluated
          if (hasOperators) {
            // Keep the field in updatingFieldsRef so server updates don't overwrite it
            return;
          }
          
          // Check if it's a valid number
          const numValue = parseFloat(strValue);
          
          // Don't save if it's just a partial operator or invalid
          if (isNaN(numValue) || strValue === '-' || strValue === '.' || strValue === '+' || strValue === '*' || strValue === '/') {
            // Keep the field in updatingFieldsRef so server updates don't overwrite it
            return;
          }
          
          // If it's a valid number (no operators), save it
        }
        
        // Remove from updatingFieldsRef before saving (only if we're actually going to save)
        updatingFieldsRef.current.delete(fieldKey);
        
        const payload: any = {
          field,
          value: field === 'amount' ? parseFloat(processedValue as string) : processedValue,
        };
        try {
          const response = await apiClient.patch(`/games/public/${token}/transaction/${rowId}`, payload);
          // Update local state with server response to ensure sync
          // But don't update if we're still editing this field (prevents flicker)
          if (response.data && !updatingFieldsRef.current.has(fieldKey)) {
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
                // Don't update if we're still editing this field (prevents flicker)
                if (retryResponse.data && !updatingFieldsRef.current.has(fieldKey)) {
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

    // Only save to server when immediate (on blur or clicking Done)
    // No real-time broadcasting - last save wins
    if (immediate) {
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
    }
  };

  const updateGameDate = async (newDate: string, immediate = false) => {
    if (isSettled) return; // Don't allow edits when settled
    setGameDate(newDate);

    // Only save to server when immediate (on blur)
    // No real-time broadcasting - last save wins
    if (immediate) {
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
    }
  };

  const addRow = async () => {
    if (isSettled) return; // Don't allow edits when settled
    addingRowRef.current = true;
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
      // Wait a bit before allowing game-updated to process
      setTimeout(() => {
        addingRowRef.current = false;
        if (response.data) {
          setGame(response.data);
        }
      }, 100);
    } catch (err) {
      console.error('Failed to add row:', err);
      addingRowRef.current = false;
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

    deletingRowRef.current = true;
    
    // Store current state for potential revert
    const previousRows = [...rows];
    const expectedCount = rows.length - 1; // Expected count after deletion
    expectedRowCountRef.current = expectedCount;

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
      // Wait a bit before allowing game-updated to process
      setTimeout(() => {
        deletingRowRef.current = false;
        // Clear expected count only after we've confirmed the server response
        if (response.data && response.data.transactions.length === expectedCount) {
          expectedRowCountRef.current = null;
          setGame(response.data);
        } else {
          // Server response doesn't match, keep expecting the count
          // It will be cleared when we receive a matching game-updated event
        }
      }, 100);
    } catch (err) {
      console.error('Failed to delete row:', err);
      deletingRowRef.current = false;
      expectedRowCountRef.current = null;
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
    <div className="min-h-screen bg-gray-50 py-8 pb-80 sm:pb-8">
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
          <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200">
            {game?.groupId && (
              <div className="mb-2 sm:mb-3">
                <button
                  onClick={() => navigate(`/groups/${game.groupId._id}`)}
                  className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 flex items-center"
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      updateGameName(gameName, true);
                      setEditingName(false);
                      e.preventDefault();
                    }
                  }}
                  onBlur={(e) => {
                    updateGameName(e.target.value, true);
                    setEditingName(false);
                  }}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm sm:text-base"
                  placeholder="Game title"
                  autoFocus
                />
                <button
                  onClick={() => {
                    updateGameName(gameName, true);
                    setEditingName(false);
                  }}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Done
                </button>
              </div>
            ) : (
              <div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 mb-2">
                  <h1 
                    className={`text-xl sm:text-2xl font-bold text-gray-900 break-words ${!isSettled ? 'cursor-pointer hover:text-blue-600' : ''}`}
                    onClick={() => !isSettled && setEditingName(true)}
                    title={!isSettled ? "Click to edit" : ""}
                  >
                    {gameName}
                  </h1>
                  <button
                    onClick={() => {
                      const publicLink = `${window.location.origin}${getBasePath()}games/public/${token}`;
                      navigator.clipboard.writeText(publicLink).then(() => {
                        setShowCopiedMessage(true);
                        setTimeout(() => setShowCopiedMessage(false), 2000);
                      });
                    }}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1 text-xs sm:text-sm text-blue-600 hover:text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50 whitespace-nowrap self-start sm:self-auto"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="hidden sm:inline">Copy Game URL</span>
                    <span className="sm:hidden">Copy URL</span>
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
                      className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => setEditingDate(false)}
                      className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div 
                    className={`text-xs sm:text-sm text-gray-500 ${!isSettled ? 'cursor-pointer hover:text-blue-600' : ''}`}
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

          <div className="px-4 py-4 sm:px-6 sm:py-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2.5 sm:py-3 rounded mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="mb-4 sm:mb-6">
              {/* Mobile: Stack vertically */}
              <div className="sm:hidden space-y-2.5">
                {/* Status badge */}
                <div className="flex items-center justify-center">
                  <span
                    className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap shadow-sm ${
                      isValid ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}
                  >
                    {isValid 
                      ? '✓ Balanced' 
                      : `Unbalanced: ${formatCurrency(sum)}`}
                  </span>
                </div>
                
                {/* Currency and Settled badge row */}
                <div className="flex items-center justify-center gap-2">
                  {isSettled && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-500 text-white whitespace-nowrap shadow-sm">
                      ✓ Settled
                    </span>
                  )}
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as Currency)}
                    className="px-3 py-1.5 rounded-lg border-2 border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm font-medium"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="CNY">CNY (¥)</option>
                  </select>
                </div>
                
                {/* Action button */}
                <div className="flex items-center justify-center">
                  {!isSettled ? (
                    <button
                      onClick={handleSettle}
                      disabled={!isValid}
                      className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-md transform transition-all active:scale-95"
                    >
                      Settle Game
                    </button>
                  ) : (
                    <button
                      onClick={handleEdit}
                      className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 whitespace-nowrap shadow-md transform transition-all active:scale-95"
                    >
                      Edit Game
                    </button>
                  )}
                </div>
              </div>
              
              {/* Desktop: Horizontal layout */}
              <div className="hidden sm:flex sm:justify-between sm:items-center">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap shadow-sm ${
                      isValid ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}
                  >
                    {isValid 
                      ? '✓ Balanced' 
                      : `Unbalanced (sum: ${formatCurrency(sum)})`}
                  </span>
                  {isSettled && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-500 text-white whitespace-nowrap shadow-sm">
                      ✓ Settled
                    </span>
                  )}
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as Currency)}
                    className="px-3 py-1.5 rounded-lg border-2 border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm font-medium"
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
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-md"
                    >
                      Settle Game
                    </button>
                  ) : (
                    <button
                      onClick={handleEdit}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 whitespace-nowrap shadow-md"
                    >
                      Edit Game
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Players Table */}
            <div className="overflow-x-auto mb-4 -mx-4 sm:mx-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-2 py-2 sm:py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.map((row) => (
                    <tr key={row.index}>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        {isSettled ? (
                          <div className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                            {row.playerName || '—'}
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={row.playerName}
                            onChange={(e) => updateField(row.index, 'playerName', e.target.value)}
                            onBlur={(e) => updateField(row.index, 'playerName', e.target.value, true)}
                            placeholder="Name"
                            autoCapitalize="off"
                            autoCorrect="off"
                            spellCheck="false"
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          />
                        )}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        {isSettled ? (
                          <div className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                            {row.amount ? formatCurrency(parseFloat(row.amount) || 0) : '—'}
                          </div>
                        ) : (
                          <div className="relative">
                            <span className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                              {getCurrencySymbol()}
                            </span>
                            <input
                              ref={(el) => {
                                if (el) {
                                  amountInputRefs.current.set(row.index, el);
                                } else {
                                  amountInputRefs.current.delete(row.index);
                                }
                              }}
                              type="text"
                              value={row.amount}
                              onChange={(e) => updateField(row.index, 'amount', e.target.value)}
                              inputMode={isMobile ? "none" : "text"}
                              onMouseDown={() => {
                                // Prevent blur when clicking on the input (especially on mobile)
                                if (isMobile) {
                                  focusingInputRef.current = true;
                                  // Small delay to ensure focus happens
                                  setTimeout(() => {
                                    focusingInputRef.current = false;
                                  }, 100);
                                }
                              }}
                              onFocus={(e) => {
                                // Only show keyboard on mobile
                                if (isMobile) {
                                  activeInputRef.current = e.target;
                                  setActiveInputRowIndex(row.index);
                                  setShowKeyboard(true);
                                  focusingInputRef.current = false; // Clear flag after focus
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  // Evaluate expression on Enter
                                  const value = (e.target as HTMLInputElement).value;
                                  const result = evaluateExpression(value);
                                  if (result !== null) {
                                    updateField(row.index, 'amount', result.toString(), true);
                                  }
                                  e.preventDefault();
                                }
                              }}
                              onBlur={(e) => {
                                // Delay to allow keyboard button clicks
                                setTimeout(() => {
                                  // If we're intentionally focusing this input, don't close keyboard
                                  if (focusingInputRef.current) {
                                    return;
                                  }
                                  
                                  // Check if the input is still focused (user might have clicked back)
                                  const activeElement = document.activeElement;
                                  if (activeElement === e.target) {
                                    // Input is still focused, keep keyboard open
                                    return;
                                  }
                                  
                                  // If keyboard is being closed intentionally, don't refocus
                                  if (keyboardClosingRef.current) {
                                    keyboardClosingRef.current = false;
                                    setShowKeyboard(false);
                                    setActiveInputRowIndex(null);
                                    const value = e.target.value;
                                    updateField(row.index, 'amount', value, true);
                                    return;
                                  }
                                  
                                  // Check if focus moved to keyboard
                                  if (activeElement && activeElement.closest('.math-keyboard')) {
                                    return;
                                  }
                                  
                                  // Check if focus moved to another input in the same form
                                  if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                                    // User moved to another field, close keyboard and clear editing flag
                                    const fieldKey = `${row.index}-amount`;
                                    updatingFieldsRef.current.delete(fieldKey);
                                    setShowKeyboard(false);
                                    setActiveInputRowIndex(null);
                                    const value = e.target.value;
                                    updateField(row.index, 'amount', value, true);
                                    return;
                                  }
                                  
                                  // If keyboard is being closed, clear editing flag
                                  if (keyboardClosingRef.current) {
                                    const fieldKey = `${row.index}-amount`;
                                    updatingFieldsRef.current.delete(fieldKey);
                                  }
                                  
                                  // If keyboard is still supposed to be open, keep it open
                                  // But don't refocus - let user click back if they want
                                  if (showKeyboard && activeInputRowIndex === row.index) {
                                    // Don't refocus automatically - this was causing the jump
                                    return;
                                  }
                                  
                                  setShowKeyboard(false);
                                  setActiveInputRowIndex(null);
                                  
                                  // Save value on blur (don't auto-evaluate)
                                  const value = e.target.value;
                                  updateField(row.index, 'amount', value, true);
                                }, 300);
                              }}
                              placeholder="0.00 or 10+5"
                              className="w-full pl-7 sm:pl-8 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2.5 sm:py-3">
                        {!isSettled && (
                          <button
                            onClick={() => deleteRow(row.index)}
                            disabled={rows.length <= 1}
                            className="p-1.5 sm:p-1.5 rounded-md text-red-600 hover:bg-red-50 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                            title="Delete row"
                            aria-label="Delete row"
                          >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium text-gray-900">Total</td>
                    <td
                      className={`px-3 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap text-sm font-medium ${
                        isValid ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(sum)}
                    </td>
                    <td className="px-2 py-2.5 sm:py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {!isSettled && (
              <div className="mt-4 sm:hidden">
                <button
                  onClick={addRow}
                  className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 flex items-center justify-center space-x-2 active:bg-blue-800"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Row</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {showKeyboard && activeInputRowIndex !== null && (
        <MathKeyboard
          value={rows[activeInputRowIndex]?.amount || ''}
          onChange={(value) => {
            if (activeInputRowIndex !== null) {
              updateField(activeInputRowIndex, 'amount', value);
            }
          }}
          onEvaluate={(value) => {
            if (activeInputRowIndex !== null) {
              const result = evaluateExpression(value);
              if (result !== null) {
                updateField(activeInputRowIndex, 'amount', result.toString(), true);
              }
            }
          }}
          onClose={() => {
            keyboardClosingRef.current = true; // Mark that we're closing intentionally
            if (activeInputRowIndex !== null) {
              // Clear the editing flag for this field
              const fieldKey = `${activeInputRowIndex}-amount`;
              updatingFieldsRef.current.delete(fieldKey);
            }
            setShowKeyboard(false);
            setActiveInputRowIndex(null);
            if (activeInputRef.current) {
              activeInputRef.current.blur();
            }
          }}
          inputRef={activeInputRef}
        />
      )}
    </div>
  );
};

export default PublicGameEntry;
