/**
 * Unit tests for the case-insensitive enum-value normalization helper.
 */

import { normalizeEnumValue } from '../../../src/utils/enumNormalization.js';

describe('normalizeEnumValue', () => {
  const trimesters = ['fall', 'winter', 'spring', 'summer'] as const;
  const periodTypes = ['intent', 'priorityEnrollment', 'openEnrollment', 'registration'] as const;

  describe('case-insensitive matching for lowercase-canonical enums', () => {
    test('returns the canonical value for an exact match', () => {
      expect(normalizeEnumValue('fall', trimesters)).toBe('fall');
      expect(normalizeEnumValue('summer', trimesters)).toBe('summer');
    });

    test('returns the canonical value for an uppercase input', () => {
      expect(normalizeEnumValue('FALL', trimesters)).toBe('fall');
      expect(normalizeEnumValue('SUMMER', trimesters)).toBe('summer');
    });

    test('returns the canonical value for a mixed-case input', () => {
      expect(normalizeEnumValue('Fall', trimesters)).toBe('fall');
      expect(normalizeEnumValue('SpRiNg', trimesters)).toBe('spring');
    });

    test('returns the canonical value for a capitalized input', () => {
      expect(normalizeEnumValue('Winter', trimesters)).toBe('winter');
    });
  });

  describe('case-insensitive matching for camelCase-canonical enums', () => {
    test('returns the canonical camelCase form for an all-lowercase input', () => {
      expect(normalizeEnumValue('priorityenrollment', periodTypes)).toBe('priorityEnrollment');
      expect(normalizeEnumValue('openenrollment', periodTypes)).toBe('openEnrollment');
    });

    test('returns the canonical camelCase form for an all-uppercase input', () => {
      expect(normalizeEnumValue('PRIORITYENROLLMENT', periodTypes)).toBe('priorityEnrollment');
    });

    test('returns the canonical camelCase form for PascalCase input', () => {
      expect(normalizeEnumValue('PriorityEnrollment', periodTypes)).toBe('priorityEnrollment');
      expect(normalizeEnumValue('OpenEnrollment', periodTypes)).toBe('openEnrollment');
    });

    test('returns the canonical form for an exact match', () => {
      expect(normalizeEnumValue('priorityEnrollment', periodTypes)).toBe('priorityEnrollment');
    });
  });

  describe('empty / missing input', () => {
    test('returns null for null input', () => {
      expect(normalizeEnumValue(null, trimesters)).toBeNull();
    });

    test('returns null for undefined input', () => {
      expect(normalizeEnumValue(undefined, trimesters)).toBeNull();
    });

    test('returns null for empty string input', () => {
      expect(normalizeEnumValue('', trimesters)).toBeNull();
    });
  });

  describe('unknown values throw', () => {
    test('throws for a non-matching value', () => {
      expect(() => normalizeEnumValue('autumn', trimesters)).toThrow(
        /Invalid enum value: 'autumn'/
      );
    });

    test('throws for a value with leading/trailing whitespace', () => {
      // Whitespace is not stripped — admins should enter clean values
      expect(() => normalizeEnumValue(' fall ', trimesters)).toThrow(/Invalid enum value/);
    });

    test('error message lists valid values', () => {
      expect(() => normalizeEnumValue('xxx', trimesters)).toThrow(/fall, winter, spring, summer/);
    });

    test('error message uses fieldName when provided', () => {
      expect(() => normalizeEnumValue('xxx', trimesters, 'trimester')).toThrow(
        /Invalid trimester: 'xxx'/
      );
      expect(() => normalizeEnumValue('xxx', periodTypes, 'periodType')).toThrow(
        /Invalid periodType: 'xxx'/
      );
    });
  });

  describe('round-trip property', () => {
    test('every canonical value normalizes back to itself', () => {
      for (const v of trimesters) {
        expect(normalizeEnumValue(v, trimesters)).toBe(v);
      }
      for (const v of periodTypes) {
        expect(normalizeEnumValue(v, periodTypes)).toBe(v);
      }
    });
  });
});
