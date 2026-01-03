/**
 * Custom hook for managing game form state and field updates
 */
import { useState, useRef, useCallback } from 'react';
import { Game } from '../types/api';
import { publicGameService } from '../services/publicGameService';
import { TIMING } from '../utils/constants';

export interface TransactionRow {
  index: number;
  playerName: string;
  amount: string;
}

export interface GameFormState {
  gameName: string;
  gameDate: string;
  rows: TransactionRow[];
  editingName: boolean;
  editingDate: boolean;
}

export interface GameFormActions {
  setGameName: (name: string) => void;
  setGameDate: (date: string) => void;
  setRows: (rows: TransactionRow[] | ((prev: TransactionRow[]) => TransactionRow[])) => void;
  setEditingName: (editing: boolean) => void;
  setEditingDate: (editing: boolean) => void;
  updateField: (rowId: number, field: 'playerName' | 'amount', value: string | number, immediate?: boolean) => Promise<void>;
  updateGameName: (newName: string, immediate?: boolean) => Promise<void>;
  updateGameDate: (newDate: string, immediate?: boolean) => Promise<void>;
  addRow: () => Promise<void>;
  deleteRow: (rowId: number) => Promise<void>;
  rowsRef: React.MutableRefObject<TransactionRow[]>;
  updatingFieldsRef: React.MutableRefObject<Set<string>>;
  saveTimeoutsRef: React.MutableRefObject<Map<string, NodeJS.Timeout>>;
}

/**
 * Hook for managing game form state
 */
export function useGameForm(
  token: string | undefined,
  _game: Game | null,
  isSettled: boolean,
  onFieldUpdate?: (rowId: number, field: 'playerName' | 'amount', value: string | number) => void
): [GameFormState, GameFormActions] {
  const [gameName, setGameName] = useState('');
  const [gameDate, setGameDate] = useState('');
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [editingDate, setEditingDate] = useState(false);

  const rowsRef = useRef<TransactionRow[]>([]);
  const updatingFieldsRef = useRef<Set<string>>(new Set());
  const saveTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const addingRowRef = useRef<boolean>(false);
  const deletingRowRef = useRef<boolean>(false);
  const expectedRowCountRef = useRef<number | null>(null);

  // Keep rowsRef in sync with rows state
  const setRowsWithRef = useCallback((updater: TransactionRow[] | ((prev: TransactionRow[]) => TransactionRow[])) => {
    setRows((prevRows) => {
      const newRows = typeof updater === 'function' ? updater(prevRows) : updater;
      rowsRef.current = newRows;
      return newRows;
    });
  }, []);

  const updateField = useCallback(async (
    rowId: number,
    field: 'playerName' | 'amount',
    value: string | number,
    immediate = false
  ) => {
    if (isSettled) return;
    
    const fieldKey = `${rowId}-${field}`;
    updatingFieldsRef.current.add(fieldKey);

    // Optimistic update
    setRowsWithRef((currentRows) => {
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
      return newRows;
    });

    // Broadcast to other users
    onFieldUpdate?.(rowId, field, value);

    // Save to server (with debounce, or immediately if requested)
    const saveToServer = async () => {
      const currentRows = rowsRef.current;
      if (rowId >= 0 && rowId < currentRows.length) {
        // For amount field, validate before saving
        if (field === 'amount') {
          const strValue = value.toString();
          if (strValue === '') {
            updatingFieldsRef.current.delete(fieldKey);
            return;
          }
          
          const hasOperators = /[+\-*/()]/.test(strValue);
          if (hasOperators) {
            return; // Don't save expressions until evaluated
          }
          
          const numValue = parseFloat(strValue);
          if (isNaN(numValue) || strValue === '-' || strValue === '.' || strValue === '+' || strValue === '*' || strValue === '/') {
            return;
          }
        }
        
        updatingFieldsRef.current.delete(fieldKey);
        
        const payload = {
          field,
          value: field === 'amount' ? parseFloat(value.toString()) : value,
        };
        
        try {
          if (!token) return;
          await publicGameService.updateTransactionField(token, rowId, field, payload.value);
        } catch (err: any) {
          console.error('Failed to save field update:', err);
          // Retry once after a short delay
          setTimeout(() => {
            if (!token) return;
            publicGameService.updateTransactionField(token, rowId, field, payload.value)
              .catch((retryErr) => {
                console.error('Retry save also failed:', retryErr);
              });
          }, TIMING.RETRY_DELAY);
        }
      }
    };

    // Clear existing timeout for this field
    const existingTimeout = saveTimeoutsRef.current.get(fieldKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    if (immediate) {
      saveToServer();
    } else {
      const timeout = setTimeout(saveToServer, TIMING.DEBOUNCE_SAVE);
      saveTimeoutsRef.current.set(fieldKey, timeout);
    }
  }, [isSettled, token, onFieldUpdate, setRowsWithRef]);

  const updateGameName = useCallback(async (newName: string, immediate = false) => {
    if (isSettled) return;
    setGameName(newName);

    if (immediate && token) {
      try {
        await publicGameService.updateGameName(token, newName);
      } catch (err) {
        console.error('Failed to save game name:', err);
        setTimeout(() => {
          if (!token) return;
          publicGameService.updateGameName(token, newName).catch((retryErr) => {
            console.error('Retry save name also failed:', retryErr);
          });
        }, TIMING.RETRY_DELAY);
      }
    }
  }, [isSettled, token]);

  const updateGameDate = useCallback(async (newDate: string, immediate = false) => {
    if (isSettled) return;
    setGameDate(newDate);

    if (immediate && token) {
      try {
        await publicGameService.updateGameDate(token, newDate || null);
      } catch (err) {
        console.error('Failed to save game date:', err);
        setTimeout(() => {
          if (!token) return;
          publicGameService.updateGameDate(token, newDate || null).catch((retryErr) => {
            console.error('Retry save date also failed:', retryErr);
          });
        }, TIMING.RETRY_DELAY);
      }
    }
  }, [isSettled, token]);

  const addRow = useCallback(async () => {
    if (isSettled || !token) return;
    
    addingRowRef.current = true;
    const newIndex = rows.length;
    const newRow: TransactionRow = { index: newIndex, playerName: '', amount: '' };
    
    // Optimistic update
    setRowsWithRef((currentRows) => [...currentRows, newRow]);

    // Save to server immediately
    try {
      await publicGameService.addTransaction(token, '', 0);
      setTimeout(() => {
        addingRowRef.current = false;
      }, TIMING.STATE_UPDATE_DELAY);
    } catch (err) {
      console.error('Failed to add row:', err);
      addingRowRef.current = false;
      // Revert on error
      setRowsWithRef((currentRows) => currentRows.slice(0, -1));
    }
  }, [isSettled, token, rows.length, setRowsWithRef]);

  const deleteRow = useCallback(async (rowId: number) => {
    if (isSettled || !token) return;
    
    if (rows.length <= 1) {
      throw new Error('At least one row is required');
    }

    deletingRowRef.current = true;
    const previousRows = [...rows];
    const expectedCount = rows.length - 1;
    expectedRowCountRef.current = expectedCount;

    // Optimistic update
    setRowsWithRef((currentRows) => {
      const newRows = currentRows.filter((_, idx) => idx !== rowId);
      return newRows.map((row, idx) => ({ ...row, index: idx }));
    });

    try {
      const response = await publicGameService.deleteTransaction(token, rowId);
      setTimeout(() => {
        deletingRowRef.current = false;
        if (response && response.transactions && response.transactions.length === expectedCount) {
          expectedRowCountRef.current = null;
        }
      }, TIMING.STATE_UPDATE_DELAY);
    } catch (err) {
      console.error('Failed to delete row:', err);
      deletingRowRef.current = false;
      expectedRowCountRef.current = null;
      // Revert on error
      setRowsWithRef(previousRows);
    }
  }, [isSettled, token, rows, setRowsWithRef]);

  const state: GameFormState = {
    gameName,
    gameDate,
    rows,
    editingName,
    editingDate,
  };

  const actions: GameFormActions = {
    setGameName,
    setGameDate,
    setRows: setRowsWithRef,
    setEditingName,
    setEditingDate,
    updateField,
    updateGameName,
    updateGameDate,
    addRow,
    deleteRow,
    rowsRef,
    updatingFieldsRef,
    saveTimeoutsRef,
  };

  return [state, actions];
}

