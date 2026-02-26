/**
 * Cache Service
 *
 * In-memory cache with expiration support.
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  expiresIn: number | null;
}

export class CacheService {
  cache: Map<string, CacheEntry<unknown>>;
  timers: Map<string, ReturnType<typeof setTimeout>>;
  maxSize: number;

  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.timers = new Map();
    this.maxSize = maxSize;
  }

  set<T>(key: string, value: T, expiresInMs: number | null = null): void {
    // Clear existing timer if key exists
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
      this.timers.delete(key);
    }

    // Evict oldest entry if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.delete(oldestKey);
      }
    }

    this.cache.set(key, { value, timestamp: Date.now(), expiresIn: expiresInMs });

    if (expiresInMs && expiresInMs > 0) {
      this.timers.set(key, setTimeout(() => this.delete(key), expiresInMs));
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    // Lazy expiry check
    if (entry.expiresIn && Date.now() - entry.timestamp > entry.expiresIn) {
      this.delete(key);
      return null;
    }

    return entry.value;
  }

  delete(key: string): boolean {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
      this.timers.delete(key);
    }
    return this.cache.delete(key);
  }

  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.cache.clear();
    this.timers.clear();
  }
}
