/**
 * Game Status Bar Component
 * Displays game balance status, currency selector, and settle/edit button
 */
import { Currency, CURRENCY_LOCALES } from '../utils/constants';

interface GameStatusBarProps {
  isValid: boolean;
  sum: number;
  isSettled: boolean;
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  onSettle: () => void;
  onEdit: () => void;
}

export function GameStatusBar({
  isValid,
  sum,
  isSettled,
  currency,
  onCurrencyChange,
  onSettle,
  onEdit,
}: GameStatusBarProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
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
            onChange={(e) => onCurrencyChange(e.target.value as Currency)}
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
              onClick={onSettle}
              disabled={!isValid}
              className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-md transform transition-all active:scale-95"
            >
              Settle Game
            </button>
          ) : (
            <button
              onClick={onEdit}
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
            onChange={(e) => onCurrencyChange(e.target.value as Currency)}
            className="px-3 py-1.5 rounded-lg border-2 border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm font-medium"
          >
            <option value="USD">USD ($)</option>
            <option value="CNY">CNY (¥)</option>
          </select>
        </div>
        <div className="flex space-x-2">
          {!isSettled ? (
            <button
              onClick={onSettle}
              disabled={!isValid}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-md"
            >
              Settle Game
            </button>
          ) : (
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 whitespace-nowrap shadow-md"
            >
              Edit Game
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

