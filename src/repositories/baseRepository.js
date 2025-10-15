/**
 * Base Repository - implements common repository patterns
 * Provides caching, error handling, and standardized data access
 */

import { BaseService } from '../infrastructure/base/baseService.js';
import { GoogleSheetsDbClient } from '../database/googleSheetsDbClient.js';

/**
 * Abstract base repository with caching and standardized data access
 */
export class BaseRepository extends BaseService {
  constructor(entityName, modelClass, dbClient = null, configService) {
    super(configService); // Initialize logger via BaseService
    this.entityName = entityName;
    this.modelClass = modelClass;
    this.dbClient = dbClient || new GoogleSheetsDbClient();
    this.cache = new Map();
    this.cacheTtl = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Creates a new record
   */
  async create(entityData, createdBy) {
    try {
      if (!createdBy) {
        throw new Error(`createdBy is required for audit trail when creating ${this.entityName}`);
      }

      this.logger.info(`📝 Creating new ${this.entityName} by ${createdBy}`);

      // Convert model instance to plain object if needed
      const data = entityData.toJSON ? entityData.toJSON() : entityData;

      const created = await this.dbClient.appendRecord(this.entityName, data, createdBy);
      this.clearCache(); // Clear cache after mutation

      this.logger.info(`✅ Created ${this.entityName} with ID:`, created.id);
      return this.convertToModel(created);
    } catch (error) {
      this.logger.error(`❌ Error creating ${this.entityName}:`, error);
      throw new Error(`Failed to create ${this.entityName}: ${error.message}`);
    }
  }

  /**
   * Updates an existing record
   */
  async update(id, entityData) {
    try {
      this.logger.info(`📝 Updating ${this.entityName} with ID:`, id);

      // Convert model instance to plain object if needed
      const data = entityData.toJSON ? entityData.toJSON() : entityData;
      data.id = id; // Ensure ID is set

      const updated = await this.dbClient.updateRecord(this.entityName, data);
      this.clearCache(); // Clear cache after mutation

      this.logger.info(`✅ Updated ${this.entityName} with ID:`, id);
      return this.convertToModel(updated);
    } catch (error) {
      this.logger.error(`❌ Error updating ${this.entityName}:`, error);
      throw new Error(`Failed to update ${this.entityName}: ${error.message}`);
    }
  }

  /**
   * Convert raw data to model instance
   */
  convertToModel(data) {
    if (!data) return null;
    return new this.modelClass(data);
  }

  /**
   * Clear cache for this entity
   */
  clearCache() {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${this.entityName}:`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Find all records
   */
  async findAll(options = {}) {
    try {
      this.logger.info(`📋 Finding all ${this.entityName}s`);
      const cacheKey = `${this.entityName}:all`;

      // Check cache first
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTtl) {
          this.logger.info(`📦 Returning cached ${this.entityName}s`);
          return cached.data;
        }
      }

      const records = await this.dbClient.getAllRecords(this.entityName, x => {
        if (this.modelClass && this.modelClass.fromDatabaseRow) {
          return this.modelClass.fromDatabaseRow(x);
        }
        return this.convertToModel(x);
      });

      // Cache the results
      this.cache.set(cacheKey, {
        data: records,
        timestamp: Date.now(),
      });

      this.logger.info(`✅ Found ${records.length} ${this.entityName}s`);
      return records;
    } catch (error) {
      this.logger.error(`❌ Error finding all ${this.entityName}s:`, error);
      throw new Error(`Failed to find ${this.entityName}s: ${error.message}`);
    }
  }

  /**
   * Find records by a specific field value
   */
  async findBy(field, value) {
    try {
      this.logger.info(`🔍 Finding ${this.entityName}s by ${field}: ${value}`);
      const allRecords = await this.findAll();
      return allRecords.filter(record => record[field] === value);
    } catch (error) {
      this.logger.error(`❌ Error finding ${this.entityName}s by ${field}:`, error);
      throw new Error(`Failed to find ${this.entityName}s by ${field}: ${error.message}`);
    }
  }

  /**
   * Find a single record by ID
   */
  async findById(id) {
    try {
      this.logger.info(`🔍 Finding ${this.entityName} by ID: ${id}`);
      const allRecords = await this.findAll();
      return allRecords.find(record => record.id === id) || null;
    } catch (error) {
      this.logger.error(`❌ Error finding ${this.entityName} by ID:`, error);
      throw new Error(`Failed to find ${this.entityName} by ID: ${error.message}`);
    }
  }

  // ... other methods would be here
}
