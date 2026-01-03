import { useState, useEffect, useCallback } from 'react';
import { gameService } from '../services/gameService';
import { Game } from '../types/api';

export function useGames(groupId?: string) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await gameService.listGames(groupId);
      setGames(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load games');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  return { games, loading, error, refetch: fetchGames };
}


