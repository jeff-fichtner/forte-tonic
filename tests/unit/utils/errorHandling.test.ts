/**
 * ErrorHandling Unit Tests (T026)
 * ================================
 *
 * Tests for ErrorHandling.throwIfNo assertion utility:
 * - Passes through non-null values without throwing
 * - Throws Error with message for null/undefined
 */

import { ErrorHandling } from '../../../src/common/errorHandling.js';

describe('ErrorHandling', () => {
  describe('throwIfNo()', () => {
    test('should not throw for a non-null, non-undefined value', () => {
      expect(() => ErrorHandling.throwIfNo('valid', 'should not throw')).not.toThrow();
    });

    test('should return void (no return value)', () => {
      const result = ErrorHandling.throwIfNo({ id: 1 }, 'msg');
      expect(result).toBeUndefined();
    });

    test('should throw Error with provided message when value is null', () => {
      expect(() => ErrorHandling.throwIfNo(null, 'Value was null')).toThrow(
        new Error('Value was null'),
      );
    });

    test('should throw Error with provided message when value is undefined', () => {
      expect(() => ErrorHandling.throwIfNo(undefined, 'Value was undefined')).toThrow(
        new Error('Value was undefined'),
      );
    });
  });
});
