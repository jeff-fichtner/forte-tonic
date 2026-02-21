/**
 * Cache Service
 *
 * In-memory cache implementation for application data caching
 * with TTL support and cache statistics.
 */

import { createLogger, Logger } from '../utils/logger.js';
import { configService } from '../services/configurationService.js';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number | null;
  hits: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  totalHistoricalOperations?: number;
}

interface CacheEntryInfo<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number | null;
  hits: number;
  isExpired: boolean;
  age: number;
}

interface CacheStatsReport extends CacheStats {
  size: number;
  maxSize: number;
  hitRate: string;
  memoryUsage: string;
}

export class CacheService {
  logger: Logger;
  cache: Map<string, CacheEntry<unknown>>;
  timers: Map<string, ReturnType<typeof setTimeout>>;
  stats: CacheStats;
  maxSize: number;

  constructor() {
    this.logger = createLogger(configService);
    this.cache = new Map();
    this.timers = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
    };
    this.maxSize = 1000; // Maximum number of cache entries
  }

  /**
   * Set a value in the cache with optional TTL
   */
  set<T>(key: string, value: T, ttlMs: number | null = null): boolean {
    try {
      // Clear existing timer if key exists
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key)!);
        this.timers.delete(key);
      }

      // Enforce cache size limit
      if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
        this.#evictOldestEntry();
      }

      // Store the value with metadata
      const entry: CacheEntry<T> = {
        value,
        timestamp: Date.now(),
        ttl: ttlMs,
        hits: 0,
      };

      this.cache.set(key, entry);
      this.stats.sets++;

      // Set TTL timer if specified
      if (ttlMs && ttlMs > 0) {
        const timer = setTimeout(() => {
          this.delete(key);
          this.stats.evictions++;
        }, ttlMs);

        this.timers.set(key, timer);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | null {
    try {
      const entry = this.cache.get(key) as CacheEntry<T> | undefined;

      if (!entry) {
        this.stats.misses++;
        return null;
      }

      // Check if entry has expired
      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
        this.delete(key);
        this.stats.misses++;
        this.stats.evictions++;
        return null;
      }

      // Update hit statistics
      entry.hits++;
      this.stats.hits++;

      return entry.value;
    } catch (error) {
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): boolean {
    try {
      const deleted = this.cache.delete(key);

      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key)!);
        this.timers.delete(key);
      }

      if (deleted) {
        this.stats.deletes++;
      }

      return deleted;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) return false;

    // Check if expired
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): boolean {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }

    this.cache.clear();
    this.timers.clear();

    // Reset stats except for historical data
    const totalOperations =
      this.stats.hits + this.stats.misses + this.stats.sets + this.stats.deletes;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: this.stats.evictions,
      totalHistoricalOperations: (this.stats.totalHistoricalOperations || 0) + totalOperations,
    };

    return true;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStatsReport {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? ((this.stats.hits / totalRequests) * 100).toFixed(2) : 0;

    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: `${hitRate}%`,
      memoryUsage: this.#estimateMemoryUsage(),
    };
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache entries with metadata
   */
  entries(): CacheEntryInfo<unknown>[] {
    const entries: CacheEntryInfo<unknown>[] = [];

    for (const [key, entry] of this.cache.entries()) {
      // Check if expired
      const isExpired = !!(entry.ttl && Date.now() - entry.timestamp > entry.ttl);

      entries.push({
        key,
        value: entry.value,
        timestamp: entry.timestamp,
        ttl: entry.ttl,
        hits: entry.hits,
        isExpired,
        age: Date.now() - entry.timestamp,
      });
    }

    return entries;
  }

  /**
   * Set maximum cache size
   */
  setMaxSize(maxSize: number): void {
    this.maxSize = maxSize;

    // Evict entries if current size exceeds new max
    while (this.cache.size > this.maxSize) {
      this.#evictOldestEntry();
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
        this.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }

    this.timers.clear();
    this.cache.clear();
  }

  /**
   * Private method: Evict oldest entry (LRU-like behavior)
   */
  #evictOldestEntry(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp: number = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Private method: Estimate memory usage
   */
  #estimateMemoryUsage(): string {
    try {
      // Rough estimation - not perfectly accurate but useful for monitoring
      let totalSize = 0;

      for (const [key, entry] of this.cache.entries()) {
        totalSize += JSON.stringify(key).length;
        totalSize += JSON.stringify(entry.value).length;
        totalSize += 50; // Overhead for metadata
      }

      return `${(totalSize / 1024).toFixed(2)} KB`;
    } catch (error) {
      return 'unknown';
    }
  }
}
