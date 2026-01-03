import {
  validateObjectId,
  validateRequired,
  validateString,
  validateNumber,
  validateArray,
  validateZeroSum,
  validatePassword,
  validateUsername,
  validateDisplayName,
} from '../../utils/validators';
import { ValidationError } from '../../types/errors';
import mongoose from 'mongoose';

describe('validators', () => {
  describe('validateObjectId', () => {
    it('should pass for valid ObjectId', () => {
      const validId = new mongoose.Types.ObjectId().toString();
      expect(() => validateObjectId(validId)).not.toThrow();
    });

    it('should throw ValidationError for invalid ObjectId', () => {
      expect(() => validateObjectId('invalid-id')).toThrow(ValidationError);
    });
  });

  describe('validateRequired', () => {
    it('should pass for non-empty value', () => {
      expect(() => validateRequired('value', 'Field')).not.toThrow();
      expect(() => validateRequired(0, 'Field')).not.toThrow();
      expect(() => validateRequired(false, 'Field')).not.toThrow();
    });

    it('should throw ValidationError for undefined', () => {
      expect(() => validateRequired(undefined, 'Field')).toThrow(ValidationError);
    });

    it('should throw ValidationError for null', () => {
      expect(() => validateRequired(null, 'Field')).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty string', () => {
      expect(() => validateRequired('', 'Field')).toThrow(ValidationError);
    });
  });

  describe('validateString', () => {
    it('should pass for valid string', () => {
      expect(() => validateString('test', 'Field')).not.toThrow();
    });

    it('should throw ValidationError for non-string', () => {
      expect(() => validateString(123, 'Field')).toThrow(ValidationError);
    });

    it('should validate min length', () => {
      expect(() => validateString('ab', 'Field', 3)).toThrow(ValidationError);
      expect(() => validateString('abc', 'Field', 3)).not.toThrow();
    });

    it('should validate max length', () => {
      expect(() => validateString('abcd', 'Field', undefined, 3)).toThrow(ValidationError);
      expect(() => validateString('abc', 'Field', undefined, 3)).not.toThrow();
    });
  });

  describe('validateNumber', () => {
    it('should pass for valid number', () => {
      expect(() => validateNumber(123, 'Field')).not.toThrow();
    });

    it('should throw ValidationError for non-number', () => {
      expect(() => validateNumber('123', 'Field')).toThrow(ValidationError);
      expect(() => validateNumber(NaN, 'Field')).toThrow(ValidationError);
    });

    it('should validate min value', () => {
      expect(() => validateNumber(5, 'Field', 10)).toThrow(ValidationError);
      expect(() => validateNumber(10, 'Field', 10)).not.toThrow();
    });

    it('should validate max value', () => {
      expect(() => validateNumber(15, 'Field', undefined, 10)).toThrow(ValidationError);
      expect(() => validateNumber(10, 'Field', undefined, 10)).not.toThrow();
    });
  });

  describe('validateArray', () => {
    it('should pass for valid array', () => {
      expect(() => validateArray([1, 2, 3], 'Field')).not.toThrow();
    });

    it('should throw ValidationError for non-array', () => {
      expect(() => validateArray('not-array', 'Field')).toThrow(ValidationError);
    });

    it('should validate min length', () => {
      expect(() => validateArray([1], 'Field', 2)).toThrow(ValidationError);
      expect(() => validateArray([1, 2], 'Field', 2)).not.toThrow();
    });
  });

  describe('validateZeroSum', () => {
    it('should pass for zero-sum transactions', () => {
      const transactions = [
        { amount: 100 },
        { amount: -50 },
        { amount: -50 },
      ];
      expect(() => validateZeroSum(transactions)).not.toThrow();
    });

    it('should throw ValidationError for non-zero-sum', () => {
      const transactions = [
        { amount: 100 },
        { amount: -50 },
      ];
      expect(() => validateZeroSum(transactions)).toThrow(ValidationError);
    });

    it('should respect tolerance', () => {
      const transactions = [
        { amount: 100 },
        { amount: -50 },
        { amount: -50.005 },
      ];
      expect(() => validateZeroSum(transactions, 0.01)).not.toThrow();
    });
  });

  describe('validatePassword', () => {
    it('should pass for valid password', () => {
      expect(() => validatePassword('password123')).not.toThrow();
    });

    it('should throw ValidationError for short password', () => {
      expect(() => validatePassword('short')).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty password', () => {
      expect(() => validatePassword('')).toThrow(ValidationError);
    });
  });

  describe('validateUsername', () => {
    it('should pass for valid username', () => {
      expect(() => validateUsername('validuser123')).not.toThrow();
    });

    it('should throw ValidationError for short username', () => {
      expect(() => validateUsername('ab')).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid characters', () => {
      expect(() => validateUsername('user-name')).toThrow(ValidationError);
      expect(() => validateUsername('user name')).toThrow(ValidationError);
    });
  });

  describe('validateDisplayName', () => {
    it('should pass for valid display name', () => {
      expect(() => validateDisplayName('Valid Name')).not.toThrow();
    });

    it('should throw ValidationError for empty display name', () => {
      expect(() => validateDisplayName('')).toThrow(ValidationError);
      expect(() => validateDisplayName('   ')).toThrow(ValidationError);
    });
  });
});

