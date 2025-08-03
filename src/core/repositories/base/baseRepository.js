/**
 * Base Repository - implements common repository patterns
 * Provides caching, error handling, and standardized data access
 */

import { GoogleSheetsDbClient } from '../../../infrastructure/database/googleSheetsDbClient.js';

/**
 * Abstract base repository with caching and standardized data access
 */
export class BaseRepository {
  constructor(entityName, modelClass, dbClient = null) {
    this.entityName = entityName;
    this.modelClass = modelClass;
    this.dbClient = dbClient || new GoogleSheetsDbClient();
    this.cache = new Map();
    this.cacheTtl = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Creates a new record
   */
  async create(entityData) {
    try {
      console.log(`📝 Creating new ${this.entityName}`);

      // Convert model instance to plain object if needed
      const data = entityData.toJSON ? entityData.toJSON() : entityData;

      const created = await this.dbClient.appendRecord(this.entityName, data);
      this.clearCache(); // Clear cache after mutation

      console.log(`✅ Created ${this.entityName} with ID:`, created.id);
      return this.convertToModel(created);
    } catch (error) {
      console.error(`❌ Error creating ${this.entityName}:`, error);
      throw new Error(`Failed to create ${this.entityName}: ${error.message}`);
    }
  }

  /**
   * Updates an existing record
   */
  async update(id, entityData) {
    try {
      console.log(`📝 Updating ${this.entityName} with ID:`, id);

      // Convert model instance to plain object if needed
      const data = entityData.toJSON ? entityData.toJSON() : entityData;
      data.id = id; // Ensure ID is set

      const updated = await this.dbClient.updateRecord(this.entityName, data);
      this.clearCache(); // Clear cache after mutation

      console.log(`✅ Updated ${this.entityName} with ID:`, id);
      return this.convertToModel(updated);
    } catch (error) {
      console.error(`❌ Error updating ${this.entityName}:`, error);
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

  // ... other methods would be here
}
