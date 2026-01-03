/**
 * Centralized formatting utility functions
 */

export function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'No date';
  // Dates are stored as UTC midnight, so use UTC methods to avoid timezone shifts
  const date = new Date(dateString);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return new Date(year, month - 1, day).toLocaleDateString();
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat(currency === 'CNY' ? 'zh-CN' : 'en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function getCurrencySymbol(currency: string = 'USD'): string {
  return currency === 'CNY' ? '¥' : '$';
}


