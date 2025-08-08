/**
 * Advanced caching system for Google Sheets data
 * Provides intelligent cache invalidation, change detection, and performance optimization
 */

/**
 * Cache entry with metadata
 */
class CacheEntry {
  constructor(data, options = {}) {
    this.data = data;
    this.timestamp = Date.now();
    this.ttl = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this.accessCount = 0;
    this.lastAccessed = Date.now();
    this.tags = options.tags || [];
    this.size = this.calculateSize(data);
    this.checksum = this.calculateChecksum(data);
  }

  /**
   * Check if cache entry is still valid
   */
  isValid() {
    return Date.now() - this.timestamp < this.ttl;
  }

  /**
   * Mark as accessed and increment counter
   */
  markAccessed() {
    this.lastAccessed = Date.now();
    this.accessCount++;
  }

  /**
   * Calculate approximate size of cached data
   */
  calculateSize(data) {
    return JSON.stringify(data).length;
  }

  /**
   * Calculate checksum for change detection
   */
  calculateChecksum(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Check if data has changed
   */
  hasChanged(newData) {
    return this.calculateChecksum(newData) !== this.checksum;
  }
}

/**
 * Advanced cache manager with intelligent invalidation
 */
export class SheetCacheManager {
  constructor(options = {}) {
    this.cache = new Map();
    this.defaultTtl = options.defaultTtl || 5 * 60 * 1000; // 5 minutes
    this.maxSize = options.maxSize || 100 * 1024 * 1024; // 100MB
    this.maxEntries = options.maxEntries || 1000;
    this.hitRate = { hits: 0, misses: 0 };
    this.dependencies = new Map(); // Track which caches depend on others
  }

  /**
   * Get data from cache
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.hitRate.misses++;
      return null;
    }

    if (!entry.isValid()) {
      this.cache.delete(key);
      this.hitRate.misses++;
      return null;
    }

    entry.markAccessed();
    this.hitRate.hits++;
    return entry.data;
  }

  /**
   * Set data in cache with options
   */
  set(key, data, options = {}) {
    const ttl = options.ttl || this.defaultTtl;
    const tags = options.tags || [];

    const entry = new CacheEntry(data, { ttl, tags });

    // Check size limits
    this.enforceSize();

    this.cache.set(key, entry);

    // Set up dependencies
    if (options.dependsOn) {
      this.addDependency(key, options.dependsOn);
    }

    console.log(`📦 Cached ${key} (${entry.size} bytes, TTL: ${ttl}ms)`);
  }

  /**
   * Invalidate cache by key
   */
  invalidate(key) {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.invalidateDependents(key);
      console.log(`🗑️ Invalidated cache: ${key}`);
    }
  }

  /**
   * Invalidate by tags
   */
  invalidateByTag(tag) {
    const keysToInvalidate = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        keysToInvalidate.push(key);
      }
    }

    keysToInvalidate.forEach(key => this.invalidate(key));
    console.log(`🗑️ Invalidated ${keysToInvalidate.length} entries with tag: ${tag}`);
  }

  /**
   * Add dependency relationship
   */
  addDependency(dependent, dependency) {
    if (!this.dependencies.has(dependency)) {
      this.dependencies.set(dependency, new Set());
    }
    this.dependencies.get(dependency).add(dependent);
  }

  /**
   * Invalidate dependent caches
   */
  invalidateDependents(key) {
    const dependents = this.dependencies.get(key);
    if (dependents) {
      dependents.forEach(dependent => {
        this.invalidate(dependent);
      });
    }
  }

  /**
   * Enforce cache size limits
   */
  enforceSize() {
    // Remove entries if we exceed limits
    if (this.cache.size >= this.maxEntries) {
      this.evictLeastUsed();
    }

    // Check total size
    const totalSize = this.getTotalSize();
    if (totalSize > this.maxSize) {
      this.evictBySize();
    }
  }

  /**
   * Evict least recently used entries
   */
  evictLeastUsed() {
    const entries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].lastAccessed - b[1].lastAccessed
    );

    const toRemove = Math.ceil(this.cache.size * 0.1); // Remove 10%
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }

    console.log(`🧹 Evicted ${toRemove} least used cache entries`);
  }

  /**
   * Evict by size to free up memory
   */
  evictBySize() {
    const entries = Array.from(this.cache.entries()).sort((a, b) => b[1].size - a[1].size); // Largest first

    let freedSize = 0;
    const targetSize = this.maxSize * 0.8; // Target 80% of max

    for (const [key, entry] of entries) {
      this.cache.delete(key);
      freedSize += entry.size;

      if (this.getTotalSize() <= targetSize) {
        break;
      }
    }

    console.log(`🧹 Evicted entries to free ${freedSize} bytes`);
  }

  /**
   * Get total cache size
   */
  getTotalSize() {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.size;
    }
    return total;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalAccess = this.hitRate.hits + this.hitRate.misses;
    const hitRate = totalAccess > 0 ? ((this.hitRate.hits / totalAccess) * 100).toFixed(2) : 0;

    return {
      entries: this.cache.size,
      hitRate: `${hitRate}%`,
      totalSize: this.getTotalSize(),
      avgEntrySize: this.cache.size > 0 ? Math.round(this.getTotalSize() / this.cache.size) : 0,
      hits: this.hitRate.hits,
      misses: this.hitRate.misses,
    };
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.dependencies.clear();
    this.hitRate = { hits: 0, misses: 0 };
    console.log('🗑️ Cache cleared');
  }

  /**
   * Preload data with smart strategy
   */
  async preload(key, loader, options = {}) {
    const existing = this.get(key);
    if (existing && !options.force) {
      return existing;
    }

    try {
      console.log(`🔄 Preloading ${key}...`);
      const data = await loader();
      this.set(key, data, options);
      return data;
    } catch (error) {
      console.error(`❌ Failed to preload ${key}:`, error);
      throw error;
    }
  }

  /**
   * Background refresh for stale data
   */
  async backgroundRefresh(key, loader, options = {}) {
    const entry = this.cache.get(key);

    // If data is getting stale but still valid, refresh in background
    if (entry) {
      const timeUntilExpiry = entry.ttl - (Date.now() - entry.timestamp);
      const refreshThreshold = entry.ttl * 0.2; // Refresh when 20% TTL remaining

      if (timeUntilExpiry <= refreshThreshold) {
        // Don't await - this is background
        this.refreshInBackground(key, loader, options);
      }
    }
  }

  /**
   * Perform background refresh without blocking
   */
  async refreshInBackground(key, loader, options = {}) {
    try {
      console.log(`🔄 Background refreshing ${key}...`);
      const newData = await loader();

      // Check if data actually changed
      const existing = this.cache.get(key);
      if (existing && !existing.hasChanged(newData)) {
        // Data unchanged, just update timestamp
        existing.timestamp = Date.now();
        console.log(`✅ ${key} unchanged, extended TTL`);
      } else {
        // Data changed, update cache
        this.set(key, newData, options);
        console.log(`✅ ${key} refreshed with new data`);
      }
    } catch (error) {
      console.error(`❌ Background refresh failed for ${key}:`, error);
    }
  }
}

/**
 * Cache key generators for consistent naming
 */
export class CacheKeys {
  static entity(entityName) {
    return `entity:${entityName}:all`;
  }

  static entityFiltered(entityName, criteria) {
    const criteriaString = Object.entries(criteria)
      .sort()
      .map(([key, value]) => `${key}:${value}`)
      .join('|');
    return `entity:${entityName}:filtered:${criteriaString}`;
  }

  static entityById(entityName, id) {
    return `entity:${entityName}:id:${id}`;
  }

  static entityByField(entityName, fieldName, value) {
    return `entity:${entityName}:${fieldName}:${value}`;
  }

  static relationship(parentEntity, childEntity, parentId) {
    return `rel:${parentEntity}:${childEntity}:${parentId}`;
  }

  static aggregation(entityName, type, criteria = {}) {
    const criteriaString =
      Object.keys(criteria).length > 0
        ? ':' +
          Object.entries(criteria)
            .sort()
            .map(([k, v]) => `${k}:${v}`)
            .join('|')
        : '';
    return `agg:${entityName}:${type}${criteriaString}`;
  }
}

/**
 * Default cache manager instance
 */
export const cacheManager = new SheetCacheManager({
  defaultTtl: 5 * 60 * 1000, // 5 minutes
  maxSize: 50 * 1024 * 1024, // 50MB
  maxEntries: 500,
});
