/**
 * Unit tests for the period display-name helper.
 */

import { periodDisplayName } from '../../../src/web/js/utilities/periodDisplayName.js';

describe('periodDisplayName', () => {
  describe('identity-period mappings (fall, winter, spring)', () => {
    test('returns "Fall" for fall', () => {
      expect(periodDisplayName('fall')).toBe('Fall');
    });

    test('returns "Winter" for winter', () => {
      expect(periodDisplayName('winter')).toBe('Winter');
    });

    test('returns "Spring" for spring', () => {
      expect(periodDisplayName('spring')).toBe('Spring');
    });
  });

  describe('summer → "Next Fall" mapping', () => {
    test('returns "Next Fall" for summer (not "Summer")', () => {
      expect(periodDisplayName('summer')).toBe('Next Fall');
      expect(periodDisplayName('summer')).not.toBe('Summer');
    });
  });

  describe('error cases', () => {
    test('throws on empty string', () => {
      expect(() => periodDisplayName('')).toThrow(/unknown period/);
    });

    test('throws on null', () => {
      expect(() => periodDisplayName(null as unknown as string)).toThrow(/unknown period/);
    });

    test('throws on undefined', () => {
      expect(() => periodDisplayName(undefined as unknown as string)).toThrow(/unknown period/);
    });

    test('throws on capitalized period (case-sensitive)', () => {
      expect(() => periodDisplayName('Fall')).toThrow(/unknown period 'Fall'/);
    });

    test('throws on unrecognized value', () => {
      expect(() => periodDisplayName('autumn')).toThrow(/unknown period 'autumn'/);
    });

    test('error message lists valid periods', () => {
      expect(() => periodDisplayName('xxx')).toThrow(/fall, winter, spring, summer/);
    });
  });
});
