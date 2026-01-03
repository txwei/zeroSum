/**
 * Centralized game cache for the application
 * This provides a single source of truth for cached game data
 */
import { Game } from '../types/api';

// Cache for game details by gameId
export const gameDetailsCache = new Map<string, Game>();

// Cache for game lists by groupId
export const gameListCache = new Map<string, Game[]>();

/**
 * Clear game details cache for a specific game
 */
export function clearGameDetailsCache(gameId: string): void {
  gameDetailsCache.delete(gameId);
}

/**
 * Clear game list cache for a specific group
 */
export function clearGameListCache(groupId: string): void {
  gameListCache.delete(groupId);
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  gameDetailsCache.clear();
  gameListCache.clear();
}

