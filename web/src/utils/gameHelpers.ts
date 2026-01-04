/**
 * Helper functions for working with Game objects
 */
import { Game } from '../types/api';

/**
 * Extract game ID from Game object (handles both id and _id for backward compatibility)
 */
export function getGameId(game: Game | { id?: string; _id?: string }): string {
  return game.id || game._id || '';
}

