/**
 * Base Repository - implements common repository patterns
 * Provides caching, error handling, and standardized data access
 */

import { BaseService } from '../infrastructure/base/baseService.js';
import { GoogleSheetsDbClient } from '../database/googleSheetsDbClient.js';
import type { ConfigurationService } from '../services/configurationService.js';

/** Function that converts a mapped DB record into a model instance */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- SC-005: field mappings produce mixed types
export type RecordMapper<T> = (record: Record<string, any>) => T | null;

/**
 * Abstract base repository with standardized data access
 * Caching is handled at the GoogleSheetsDbClient layer
 */
export class BaseRepository<T extends object>
  extends BaseService
{
  entityName: string;
  dbClient: GoogleSheetsDbClient;
  protected mapRecord: RecordMapper<T>;

  constructor(
    entityName: string,
    mapRecord: RecordMapper<T>,
    dbClient: GoogleSheetsDbClient,
    configService?: ConfigurationService
  ) {
    super(configService);
    this.entityName = entityName;
    this.mapRecord = mapRecord;
    this.dbClient = dbClient;
  }

  /**
   * Creates a new record
   */
  async create(entityData: Record<string, unknown>, createdBy: string): Promise<T> {
    try {
      if (!createdBy) {
        throw new Error(`createdBy is required for audit trail when creating ${this.entityName}`);
      }

      this.logger.info(`📝 Creating new ${this.entityName} by ${createdBy}`);

      const created = await this.dbClient.appendRecord(
        this.entityName,
        entityData
      );

      this.logger.info(`✅ Created ${this.entityName} with ID:`, created.id);
      const converted = this.convertToModel(created as Record<string, unknown>);
      if (!converted) {
        throw new Error(`Failed to convert created ${this.entityName} to model`);
      }
      return converted;
    } catch (error) {
      this.logger.error(`❌ Error creating ${this.entityName}:`, error);
      throw new Error(`Failed to create ${this.entityName}: ${(error as Error).message}`);
    }
  }

  /**
   * Updates an existing record
   */
  async update(id: string, entityData: Record<string, unknown>, updatedBy: string = ''): Promise<T | null> {
    try {
      this.logger.info(`📝 Updating ${this.entityName} with ID:`, id);

      await this.dbClient.updateRecord(
        this.entityName,
        { ...entityData, id },
        updatedBy
      );

      this.logger.info(`✅ Updated ${this.entityName} with ID:`, id);

      // Re-fetch the updated record to return the current state
      return this.findById(id);
    } catch (error) {
      this.logger.error(`❌ Error updating ${this.entityName}:`, error);
      throw new Error(`Failed to update ${this.entityName}: ${(error as Error).message}`);
    }
  }

  /**
   * Deletes a record by ID
   */
  async delete(id: string, deletedBy: string): Promise<boolean> {
    try {
      if (!deletedBy) {
        throw new Error(`deletedBy is required for audit trail when deleting ${this.entityName}`);
      }

      this.logger.info(`🗑️ Deleting ${this.entityName} with ID:`, id);

      await this.dbClient.deleteRecord(this.entityName, id, deletedBy);

      this.logger.info(`✅ Deleted ${this.entityName} with ID:`, id);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error deleting ${this.entityName}:`, error);
      throw new Error(`Failed to delete ${this.entityName}: ${(error as Error).message}`);
    }
  }

  /**
   * Convert raw data to model instance
   */
  convertToModel(data: Record<string, unknown> | null): T | null {
    if (!data) {
      return null;
    }

    return this.mapRecord(data);
  }

  /**
   * Fetch and map all records from a specific sheet.
   * Subclasses managing multiple entity types can call this directly.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SC-005: field mappings produce mixed types
  protected async fetchAll<U extends object>(sheetKey: string, mapper: RecordMapper<U>): Promise<U[]> {
    const records = await this.dbClient.getAllRecords(sheetKey, (record: Record<string, any>) => {
      return mapper(record);
    });
    return records.filter((record): record is U => record !== null);
  }

  /**
   * Find all records
   */
  async findAll(_options: Record<string, unknown> = {}): Promise<T[]> {
    try {
      this.logger.info(`📋 Finding all ${this.entityName}s`);
      const records = await this.fetchAll(this.entityName, this.mapRecord);
      this.logger.info(`✅ Found ${records.length} ${this.entityName}s`);
      return records;
    } catch (error) {
      this.logger.error(`❌ Error finding all ${this.entityName}s:`, error);
      throw new Error(`Failed to find ${this.entityName}s: ${(error as Error).message}`);
    }
  }

  /**
   * Find records by a specific field value
   */
  async findBy(field: string, value: unknown): Promise<T[]> {
    try {
      this.logger.info(`🔍 Finding ${this.entityName}s by ${field}: ${String(value)}`);
      const allRecords = await this.findAll();
      return allRecords.filter(record => (record as Record<string, unknown>)[field] === value);
    } catch (error) {
      this.logger.error(`❌ Error finding ${this.entityName}s by ${field}:`, error);
      throw new Error(`Failed to find ${this.entityName}s by ${field}: ${(error as Error).message}`);
    }
  }

  /**
   * Find a single record by ID
   */
  async findById(id: string): Promise<T | null> {
    try {
      this.logger.info(`🔍 Finding ${this.entityName} by ID: ${id}`);
      const allRecords = await this.findAll();
      return (
        allRecords.find(record => String((record as Record<string, unknown>).id) === id) || null
      );
    } catch (error) {
      this.logger.error(`❌ Error finding ${this.entityName} by ID:`, error);
      throw new Error(`Failed to find ${this.entityName} by ID: ${(error as Error).message}`);
    }
  }
}
