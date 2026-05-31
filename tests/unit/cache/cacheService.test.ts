/**
 * Cache Service Unit Tests
 * =========================
 *
 * Exercises src/cache/cacheService.ts — an in-memory cache with TTL,
 * a maxSize cap (oldest-key eviction), and explicit clear.
 */

import { jest } from '@jest/globals';
import { CacheService } from '../../../src/cache/cacheService.js';

describe('CacheService', () => {
  describe('set / get basics', () => {
    test('round-trips a value', () => {
      const c = new CacheService();
      c.set('k', { hello: 'world' });
      expect(c.get('k')).toEqual({ hello: 'world' });
    });

    test('returns null for a missing key', () => {
      const c = new CacheService();
      expect(c.get('does-not-exist')).toBeNull();
    });

    test('overwrites a previous value at the same key', () => {
      const c = new CacheService();
      c.set('k', 'first');
      c.set('k', 'second');
      expect(c.get('k')).toBe('second');
    });

    test('set with no expiry stores indefinitely (no timer scheduled)', () => {
      const c = new CacheService();
      c.set('k', 'forever');
      expect(c.get('k')).toBe('forever');
      // No timer because no expiresInMs was provided.
      expect(c.timers.size).toBe(0);
    });
  });

  describe('TTL / lazy expiry', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('returns the value while inside the TTL window', () => {
      const c = new CacheService();
      c.set('k', 'fresh', 1000);
      jest.advanceTimersByTime(500);
      expect(c.get('k')).toBe('fresh');
    });

    test('returns null after the TTL elapses, even if the active timer has not fired', () => {
      const c = new CacheService();
      c.set('k', 'stale-soon', 1000);
      // Move time past the TTL but DON'T advance fake timers — this exercises
      // the lazy-expiry check in get() rather than the active timer in set().
      const realNowSpy = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 1500);
      try {
        expect(c.get('k')).toBeNull();
      } finally {
        realNowSpy.mockRestore();
      }
    });

    test('active timer eventually removes the entry on its own', () => {
      const c = new CacheService();
      c.set('k', 'auto-expire', 1000);
      jest.advanceTimersByTime(1001);
      // After the timer fires, the entry is gone from the underlying map.
      expect(c.cache.has('k')).toBe(false);
      expect(c.get('k')).toBeNull();
    });

    test('overwriting a key with TTL clears the previous timer', () => {
      const c = new CacheService();
      c.set('k', 'first', 1000);
      c.set('k', 'second', 5000);
      // Advance past the FIRST timer's expiry; the second entry must survive.
      jest.advanceTimersByTime(1500);
      expect(c.get('k')).toBe('second');
    });
  });

  describe('maxSize eviction', () => {
    test('oldest entry is evicted when the cache is full and a new key is added', () => {
      const c = new CacheService(3);
      c.set('a', 1);
      c.set('b', 2);
      c.set('c', 3);
      c.set('d', 4); // 'a' should be evicted

      expect(c.get('a')).toBeNull();
      expect(c.get('b')).toBe(2);
      expect(c.get('c')).toBe(3);
      expect(c.get('d')).toBe(4);
    });

    test('overwriting an existing key does NOT evict another entry', () => {
      const c = new CacheService(3);
      c.set('a', 1);
      c.set('b', 2);
      c.set('c', 3);
      c.set('b', 99); // 'b' already exists — no eviction

      expect(c.get('a')).toBe(1);
      expect(c.get('b')).toBe(99);
      expect(c.get('c')).toBe(3);
    });

    test('eviction continues to work after the first eviction (oldest-of-current)', () => {
      const c = new CacheService(2);
      c.set('a', 1);
      c.set('b', 2);
      c.set('c', 3); // evicts 'a'
      c.set('d', 4); // evicts 'b'

      expect(c.get('a')).toBeNull();
      expect(c.get('b')).toBeNull();
      expect(c.get('c')).toBe(3);
      expect(c.get('d')).toBe(4);
    });
  });

  describe('delete', () => {
    test('removes a key and returns true when the key existed', () => {
      const c = new CacheService();
      c.set('k', 'v');
      expect(c.delete('k')).toBe(true);
      expect(c.get('k')).toBeNull();
    });

    test('returns false when the key did not exist', () => {
      const c = new CacheService();
      expect(c.delete('missing')).toBe(false);
    });

    test('clears any pending timer for the key', () => {
      jest.useFakeTimers();
      try {
        const c = new CacheService();
        c.set('k', 'v', 1000);
        expect(c.timers.has('k')).toBe(true);
        c.delete('k');
        expect(c.timers.has('k')).toBe(false);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('clear', () => {
    test('empties the cache', () => {
      const c = new CacheService();
      c.set('a', 1);
      c.set('b', 2);
      c.set('c', 3);

      c.clear();

      expect(c.get('a')).toBeNull();
      expect(c.get('b')).toBeNull();
      expect(c.get('c')).toBeNull();
      expect(c.cache.size).toBe(0);
    });

    test('clears all pending timers', () => {
      jest.useFakeTimers();
      try {
        const c = new CacheService();
        c.set('a', 1, 1000);
        c.set('b', 2, 2000);
        c.set('c', 3, 3000);
        expect(c.timers.size).toBe(3);

        c.clear();

        expect(c.timers.size).toBe(0);
      } finally {
        jest.useRealTimers();
      }
    });

    test('clear on an empty cache is a no-op', () => {
      const c = new CacheService();
      expect(() => c.clear()).not.toThrow();
      expect(c.cache.size).toBe(0);
    });
  });
});
