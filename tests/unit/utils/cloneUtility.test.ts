/**
 * CloneUtility Unit Tests (T023)
 * ===============================
 *
 * Tests for CloneUtility.clone deep-clone behavior:
 * - True deep clone (mutations don't propagate)
 * - null/undefined values converted to empty string
 * - Non-null values preserved
 * - Nested objects deeply cloned
 */

import { CloneUtility } from '../../../src/utils/cloneUtility.js';

describe('CloneUtility', () => {
  describe('clone()', () => {
    test('should deep clone so modifying the clone does not affect the original', () => {
      const original = { name: 'Alice', nested: { value: 42 } };
      const cloned = CloneUtility.clone(original);

      cloned.name = 'Bob';
      cloned.nested.value = 99;

      expect(original.name).toBe('Alice');
      expect(original.nested.value).toBe(42);
    });

    test('should convert null values to empty string', () => {
      const obj = { a: null as string | null, b: 'hello' };
      const cloned = CloneUtility.clone(obj);

      expect(cloned.a).toBe('');
      expect(cloned.b).toBe('hello');
    });

    test('should convert undefined values to empty string', () => {
      const obj = { a: undefined as string | undefined, b: 'world' };
      const cloned = CloneUtility.clone(obj);

      expect(cloned.a).toBe('');
      expect(cloned.b).toBe('world');
    });

    test('should preserve non-null values of various types', () => {
      const obj = { str: 'text', num: 42, bool: true };
      const cloned = CloneUtility.clone(obj);

      expect(cloned.str).toBe('text');
      expect(cloned.num).toBe(42);
      expect(cloned.bool).toBe(true);
    });

    test('should deeply clone nested objects (not shallow)', () => {
      const original = { level1: { level2: { value: 'deep' } } };
      const cloned = CloneUtility.clone(original);

      // Verify nested references are different objects
      expect(cloned.level1).not.toBe(original.level1);
      expect(cloned.level1.level2).not.toBe(original.level1.level2);

      // Verify values match
      expect(cloned.level1.level2.value).toBe('deep');
    });
  });
});
