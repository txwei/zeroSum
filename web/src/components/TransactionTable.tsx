/**
 * Transaction Table Component
 * Displays and allows editing of game transactions
 */
import { TransactionRow } from '../hooks/useGameForm';
import { Currency, CURRENCY_SYMBOLS } from '../utils/constants';
import MathKeyboard from './MathKeyboard';

interface TransactionTableProps {
  rows: TransactionRow[];
  isSettled: boolean;
  currency: Currency;
  isMobile: boolean;
  showKeyboard: boolean;
  activeInputRowIndex: number | null;
  amountInputRefs: React.MutableRefObject<Map<number, HTMLInputElement>>;
  activeInputRef: React.MutableRefObject<HTMLInputElement | null>;
  onFieldChange: (rowId: number, field: 'playerName' | 'amount', value: string | number) => void;
  onFieldBlur: (rowId: number, field: 'playerName' | 'amount', value: string | number, immediate?: boolean) => void;
  onDeleteRow: (rowId: number) => void;
  onAddRow: () => void;
  onKeyboardValueChange: (value: string) => void;
  onKeyboardEvaluate: (value: string) => void;
  onKeyboardClose: () => void;
  onEvaluateExpression: (expr: string) => number | null;
}

export function TransactionTable({
  rows,
  isSettled,
  currency,
  isMobile,
  showKeyboard,
  activeInputRowIndex,
  amountInputRefs,
  activeInputRef,
  onFieldChange,
  onFieldBlur,
  onDeleteRow,
  onAddRow,
  onKeyboardValueChange,
  onKeyboardEvaluate,
  onKeyboardClose,
  onEvaluateExpression,
}: TransactionTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(currency === 'CNY' ? 'zh-CN' : 'en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getCurrencySymbol = () => CURRENCY_SYMBOLS[currency];

  return (
    <>
      <div className="overflow-x-auto mb-4 -mx-4 sm:mx-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Player
              </th>
              <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-2 py-2 sm:py-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row) => (
              <tr key={row.index}>
                <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                  {isSettled ? (
                    <div className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                      {row.playerName || '—'}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={row.playerName}
                      onChange={(e) => onFieldChange(row.index, 'playerName', e.target.value)}
                      onBlur={(e) => onFieldBlur(row.index, 'playerName', e.target.value)}
                      placeholder="Name"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck="false"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    />
                  )}
                </td>
                <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                  {isSettled ? (
                    <div className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                      {row.amount ? formatCurrency(parseFloat(row.amount) || 0) : '—'}
                    </div>
                  ) : (
                    <div className="relative">
                      <span className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                        {getCurrencySymbol()}
                      </span>
                      <input
                        ref={(el) => {
                          if (el) {
                            amountInputRefs.current.set(row.index, el);
                          } else {
                            amountInputRefs.current.delete(row.index);
                          }
                        }}
                        type="text"
                        value={row.amount}
                        onChange={(e) => onFieldChange(row.index, 'amount', e.target.value)}
                        inputMode={isMobile ? "none" : "text"}
                        onFocus={() => {
                          if (isMobile && activeInputRowIndex === null) {
                            activeInputRef.current = amountInputRefs.current.get(row.index) || null;
                            // Keyboard will be shown by parent component
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const result = onEvaluateExpression((e.target as HTMLInputElement).value);
                            if (result !== null) {
                              onFieldBlur(row.index, 'amount', result.toString());
                            }
                            e.preventDefault();
                          }
                        }}
                        onBlur={(e) => {
                          setTimeout(() => {
                            const value = e.target.value;
                            onFieldBlur(row.index, 'amount', value);
                          }, 300);
                        }}
                        placeholder="0.00 or 10+5"
                        className="w-full pl-7 sm:pl-8 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  )}
                </td>
                <td className="px-2 py-2.5 sm:py-3">
                  {!isSettled && (
                    <button
                      onClick={() => onDeleteRow(row.index)}
                      disabled={rows.length <= 1}
                      className="p-1.5 sm:p-1.5 rounded-md text-red-600 hover:bg-red-50 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                      title="Delete row"
                      aria-label="Delete row"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium text-gray-900">Total</td>
              <td
                className={`px-3 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap text-sm font-medium ${
                  Math.abs(rows.reduce((acc, row) => {
                    const amount = parseFloat(row.amount);
                    return acc + (isNaN(amount) ? 0 : amount);
                  }, 0)) < 0.01 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatCurrency(
                  rows.reduce((acc, row) => {
                    const amount = parseFloat(row.amount);
                    return acc + (isNaN(amount) ? 0 : amount);
                  }, 0)
                )}
              </td>
              <td className="px-2 py-2.5 sm:py-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
      {!isSettled && (
        <div className="mt-4 sm:hidden">
          <button
            onClick={onAddRow}
            className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 flex items-center justify-center space-x-2 active:bg-blue-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Row</span>
          </button>
        </div>
      )}
      {showKeyboard && activeInputRowIndex !== null && (
        <MathKeyboard
          value={rows[activeInputRowIndex]?.amount || ''}
          onChange={onKeyboardValueChange}
          onEvaluate={onKeyboardEvaluate}
          onClose={onKeyboardClose}
          inputRef={activeInputRef}
        />
      )}
    </>
  );
}

