import { BaseRepository } from './baseRepository.js';
import { Keys } from '../utils/values/keys.js';
import { Class } from '../models/shared/index.js';

/**
 * Program Repository - handles program catalog data operations
 * Manages classes (group lessons)
 * Extends BaseRepository for consistent logging and base functionality
 */
export class ProgramRepository extends BaseRepository {
  /**
   * @param {object} dbClient - Database client instance
   * @param {object} configService - Configuration service for logger initialization
   */
  constructor(dbClient, configService) {
    // Use 'classes' as the primary entity since that's the main concern
    super(Keys.CLASSES, Class, dbClient, configService);
  }

  /**
   * Get all classes with caching
   * Uses inherited findAll() method from BaseRepository
   */
  async getClasses(forceRefresh = false) {
    const cacheKey = `${Keys.CLASSES}:all`;

    // Check cache first unless force refresh
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTtl) {
        this.logger.info(`📦 Returning cached ${Keys.CLASSES}`);
        return cached.data;
      }
    }

    this.logger.info(`📋 Loading ${Keys.CLASSES}`);
    const classes = await this.dbClient.getAllRecords(Keys.CLASSES, x => Class.fromDatabaseRow(x));

    // Cache the results
    this.cache.set(cacheKey, {
      data: classes,
      timestamp: Date.now(),
    });

    this.logger.info(`✅ Found ${classes.length} ${Keys.CLASSES}`);
    return classes;
  }

  /**
   * Get a specific class by ID
   */
  async getClassById(id) {
    const classes = await this.getClasses();
    return classes.find(x => x.id === id);
  }

  /**
   * Clear repository-level cache
   */
  clearCache() {
    this.cache.delete(`${Keys.CLASSES}:all`);
    this.logger.info('🧹 ProgramRepository cache cleared');
  }
}
