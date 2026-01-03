/**
 * Centralized date utilities
 * Handles all date formatting and parsing consistently
 */

/**
 * Format date string (YYYY-MM-DD) for input field
 * The date is stored as UTC midnight, so we extract UTC date components
 * to avoid timezone shifts when displaying
 */
export function formatDateForInput(dateString: string): string {
  const date = new Date(dateString);
  // Use UTC methods to get the date components, since we store dates at UTC midnight
  // This ensures "2024-12-18" stays "2024-12-18" regardless of user's timezone
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date for display (localized)
 */
export function formatDateForDisplay(dateString: string | undefined): string {
  if (!dateString) return 'No date';
  
  // Parse the YYYY-MM-DD string and format it for display
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString();
}

/**
 * Format date from UTC string for display
 * Used when date comes from API as ISO string
 */
export function formatDateFromUTC(dateString: string | undefined): string {
  if (!dateString) return 'No date';
  
  // Dates are stored as UTC midnight, so use UTC methods to avoid timezone shifts
  const date = new Date(dateString);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return new Date(year, month - 1, day).toLocaleDateString();
}

