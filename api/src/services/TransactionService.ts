import { ZERO_SUM_TOLERANCE } from '../utils/constants';
import { validateZeroSum } from '../utils/validators';
import { ValidationError } from '../types/errors';

export class TransactionService {
  /**
   * Validate that transactions sum to zero
   */
  validateZeroSum(transactions: Array<{ amount: number }>): void {
    try {
      validateZeroSum(transactions, ZERO_SUM_TOLERANCE);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Invalid transaction data');
    }
  }

  /**
   * Calculate the sum of transaction amounts
   */
  calculateSum(transactions: Array<{ amount: number }>): number {
    return transactions.reduce((acc, t) => acc + (t.amount || 0), 0);
  }

  /**
   * Check if transactions are balanced (sum to zero within tolerance)
   */
  isBalanced(transactions: Array<{ amount: number }>): boolean {
    const sum = this.calculateSum(transactions);
    return Math.abs(sum) <= ZERO_SUM_TOLERANCE;
  }

  /**
   * Validate transaction data structure
   */
  validateTransaction(transaction: { amount: number; playerName?: string; userId?: string }): void {
    if (typeof transaction.amount !== 'number' || isNaN(transaction.amount)) {
      throw new ValidationError('Transaction amount must be a valid number');
    }
    
    // At least one identifier must be present
    if (!transaction.playerName && !transaction.userId) {
      throw new ValidationError('Transaction must have either playerName or userId');
    }
  }

  /**
   * Validate all transactions in an array
   */
  validateTransactions(transactions: Array<{ amount: number; playerName?: string; userId?: string }>): void {
    transactions.forEach((t, index) => {
      try {
        this.validateTransaction(t);
      } catch (error) {
        throw new ValidationError(`Transaction at index ${index} is invalid: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  /**
   * Check for duplicate player names (case-insensitive)
   */
  checkDuplicatePlayerNames(transactions: Array<{ playerName?: string }>): string[] {
    const playerNames = transactions
      .map(t => t.playerName?.trim().toLowerCase())
      .filter(name => name && name !== '_');
    
    const nameCounts = new Map<string, number>();
    playerNames.forEach(name => {
      if (name) {
        nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
      }
    });
    
    return Array.from(nameCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([name, _]) => name);
  }
}


