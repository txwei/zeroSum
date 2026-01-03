import { useState, useEffect, useCallback } from 'react';
import { gameService } from '../services/gameService';
import { Game } from '../types/api';
import { gameDetailsCache } from '../utils/gameCache';

export function useGameDetails(gameId: string | null) {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGame = useCallback(async () => {
    if (!gameId) {
      setGame(null);
      setLoading(false);
      return;
    }

    // Check cache first
    const cached = gameDetailsCache.get(gameId);
    if (cached) {
      setGame(cached);
      setLoading(false);
      // Fetch fresh data in background
    } else {
      setLoading(true);
    }

    try {
      setError(null);
      const data = await gameService.getGameById(gameId);
      gameDetailsCache.set(gameId, data);
      setGame(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load game');
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  return { game, loading, error, refetch: fetchGame };
}


