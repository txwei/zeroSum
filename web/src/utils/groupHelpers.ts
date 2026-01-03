/**
 * Helper functions for working with Group objects
 */
import { Group } from '../types/api';

/**
 * Extract group ID from Group object (handles both id and _id for backward compatibility)
 */
export function getGroupId(group: Group | { id?: string; _id?: string }): string {
  return group.id || group._id || '';
}

