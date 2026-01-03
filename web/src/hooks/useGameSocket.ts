/**
 * Custom hook for managing WebSocket connection for real-time game collaboration
 */
import { useEffect, useRef, RefObject } from 'react';
import { io, Socket } from 'socket.io-client';
import { getApiUrl, isDev } from '../utils/env';
import { Game } from '../types/api';

export interface FieldUpdate {
  rowId: number;
  field: 'playerName' | 'amount';
  value: string | number;
}

export interface RowAction {
  action: 'add' | 'delete';
  rowId?: number;
}

export interface GameSocketCallbacks {
  onGameUpdated?: (game: Game) => void;
  onFieldUpdated?: (update: FieldUpdate) => void;
  onRowActionUpdated?: (action: RowAction) => void;
}

export interface GameSocketActions {
  emitFieldUpdate: (rowId: number, field: 'playerName' | 'amount', value: string | number) => void;
  emitRowAction: (action: 'add' | 'delete', rowId?: number) => void;
  isConnected: () => boolean;
}

/**
 * Hook for managing WebSocket connection to a game
 */
export function useGameSocket(
  token: string | undefined,
  callbacks: GameSocketCallbacks
): GameSocketActions {
  const socketRef = useRef<Socket | null>(null);

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
    socket.on('field-updated', (update: FieldUpdate) => {
      callbacks.onFieldUpdated?.(update);
    });

    // Listen for row add/delete
    socket.on('row-action-updated', (action: RowAction) => {
      callbacks.onRowActionUpdated?.(action);
    });

    // Listen for full game updates (from server saves or initial join)
    socket.on('game-updated', (updatedGame: Game) => {
      callbacks.onGameUpdated?.(updatedGame);
    });

    return () => {
      if (socketRef.current) {
        socket.emit('leave-game', token);
        socket.disconnect();
        socketRef.current = null;
      }
    };
  }, [token]);

  const emitFieldUpdate = (rowId: number, field: 'playerName' | 'amount', value: string | number) => {
    if (socketRef.current && token) {
      socketRef.current.emit('field-update', {
        gameToken: token,
        rowId,
        field,
        value,
      });
    }
  };

  const emitRowAction = (action: 'add' | 'delete', rowId?: number) => {
    if (socketRef.current && token) {
      socketRef.current.emit('row-action', {
        gameToken: token,
        action,
        rowId,
      });
    }
  };

  const isConnected = () => {
    return socketRef.current?.connected ?? false;
  };

  return {
    emitFieldUpdate,
    emitRowAction,
    isConnected,
  };
}

