import { TransactionService } from '../../services/TransactionService';
import { ValidationError } from '../../types/errors';

describe('TransactionService', () => {
  let transactionService: TransactionService;

  beforeEach(() => {
    transactionService = new TransactionService();
  });

  describe('validateZeroSum', () => {
    it('should pass validation for zero-sum transactions', () => {
      const transactions = [
        { amount: 100 },
        { amount: -50 },
        { amount: -50 },
      ];

      expect(() => transactionService.validateZeroSum(transactions)).not.toThrow();
    });

    it('should throw ValidationError for non-zero-sum transactions', () => {
      const transactions = [
        { amount: 100 },
        { amount: -50 },
      ];

      expect(() => transactionService.validateZeroSum(transactions)).toThrow(ValidationError);
    });

    it('should pass validation within tolerance', () => {
      const transactions = [
        { amount: 100 },
        { amount: -50 },
        { amount: -50.005 }, // Within 0.01 tolerance
      ];

      expect(() => transactionService.validateZeroSum(transactions)).not.toThrow();
    });
  });

  describe('calculateSum', () => {
    it('should calculate sum correctly', () => {
      const transactions = [
        { amount: 100 },
        { amount: -50 },
        { amount: -50 },
      ];

      const sum = transactionService.calculateSum(transactions);
      expect(sum).toBe(0);
    });

    it('should handle empty array', () => {
      const sum = transactionService.calculateSum([]);
      expect(sum).toBe(0);
    });
  });

  describe('isBalanced', () => {
    it('should return true for balanced transactions', () => {
      const transactions = [
        { amount: 100 },
        { amount: -50 },
        { amount: -50 },
      ];

      expect(transactionService.isBalanced(transactions)).toBe(true);
    });

    it('should return false for unbalanced transactions', () => {
      const transactions = [
        { amount: 100 },
        { amount: -50 },
      ];

      expect(transactionService.isBalanced(transactions)).toBe(false);
    });
  });

  describe('validateTransaction', () => {
    it('should validate valid transaction', () => {
      const transaction = { amount: 100, playerName: 'Player 1' };

      expect(() => transactionService.validateTransaction(transaction)).not.toThrow();
    });

    it('should throw ValidationError for invalid amount', () => {
      const transaction = { amount: NaN, playerName: 'Player 1' };

      expect(() => transactionService.validateTransaction(transaction)).toThrow(ValidationError);
    });

    it('should throw ValidationError for missing identifiers', () => {
      const transaction = { amount: 100 };

      expect(() => transactionService.validateTransaction(transaction)).toThrow(ValidationError);
    });
  });

  describe('checkDuplicatePlayerNames', () => {
    it('should find duplicate player names', () => {
      const transactions = [
        { playerName: 'Alice' },
        { playerName: 'Bob' },
        { playerName: 'Alice' },
      ];

      const duplicates = transactionService.checkDuplicatePlayerNames(transactions);
      expect(duplicates).toContain('alice');
    });

    it('should return empty array for no duplicates', () => {
      const transactions = [
        { playerName: 'Alice' },
        { playerName: 'Bob' },
        { playerName: 'Charlie' },
      ];

      const duplicates = transactionService.checkDuplicatePlayerNames(transactions);
      expect(duplicates).toHaveLength(0);
    });

    it('should ignore placeholder names', () => {
      const transactions = [
        { playerName: '_' },
        { playerName: 'Alice' },
        { playerName: 'Bob' },
      ];

      const duplicates = transactionService.checkDuplicatePlayerNames(transactions);
      expect(duplicates).toHaveLength(0);
    });
  });
});

