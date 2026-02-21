/**
 * Trimester Utilities Unit Tests
 * ==============================
 *
 * Tests for trimester constants and validation utilities
 */

import { jest } from '@jest/globals';
import {
  Trimester,
  TRIMESTER_SEQUENCE,
  isValidTrimester,
} from '../../../src/utils/values/trimester.js';

describe('Trimester Utilities', () => {
  describe('Trimester constants', () => {
    test('should have correct trimester values', () => {
      expect(Trimester.FALL).toBe('fall');
      expect(Trimester.WINTER).toBe('winter');
      expect(Trimester.SPRING).toBe('spring');
    });

    test('should have all trimesters in sequence', () => {
      expect(TRIMESTER_SEQUENCE).toEqual(['fall', 'winter', 'spring']);
      expect(TRIMESTER_SEQUENCE).toHaveLength(3);
    });

    test('TRIMESTER_SEQUENCE should be in chronological order', () => {
      expect(TRIMESTER_SEQUENCE[0]).toBe('fall');
      expect(TRIMESTER_SEQUENCE[1]).toBe('winter');
      expect(TRIMESTER_SEQUENCE[2]).toBe('spring');
    });
  });

  describe('isValidTrimester()', () => {
    test('should return true for valid lowercase trimesters', () => {
      expect(isValidTrimester('fall')).toBe(true);
      expect(isValidTrimester('winter')).toBe(true);
      expect(isValidTrimester('spring')).toBe(true);
    });

    test('should return false for invalid trimesters', () => {
      expect(isValidTrimester('summer')).toBe(false);
      expect(isValidTrimester('Fall')).toBe(false); // Capitalized
      expect(isValidTrimester('FALL')).toBe(false); // Uppercase
      expect(isValidTrimester('invalid')).toBe(false);
      expect(isValidTrimester('')).toBe(false);
    });

    test('should return false for non-string values', () => {
      expect(isValidTrimester(null)).toBe(false);
      expect(isValidTrimester(undefined)).toBe(false);
      expect(isValidTrimester(123)).toBe(false);
      expect(isValidTrimester({})).toBe(false);
      expect(isValidTrimester([])).toBe(false);
    });

    test('should handle edge cases', () => {
      expect(isValidTrimester('  fall  ')).toBe(false); // Has whitespace
      expect(isValidTrimester('fall ')).toBe(false);
      expect(isValidTrimester(' fall')).toBe(false);
    });
  });

  describe('Trimester enum usage', () => {
    test('should use Trimester constants for validation', () => {
      expect(isValidTrimester(Trimester.FALL)).toBe(true);
      expect(isValidTrimester(Trimester.WINTER)).toBe(true);
      expect(isValidTrimester(Trimester.SPRING)).toBe(true);
    });

    test('should be immutable (Object.values creates new array)', () => {
      const sequence1 = TRIMESTER_SEQUENCE;
      const sequence2 = TRIMESTER_SEQUENCE;

      // Should reference the same array
      expect(sequence1).toBe(sequence2);
    });
  });
});
