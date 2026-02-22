/**
 * Base Repository - implements common repository patterns
 * Provides caching, error handling, and standardized data access
 */

import { BaseService } from '../infrastructure/base/baseService.js';
import { GoogleSheetsDbClient } from '../database/googleSheetsDbClient.js';
import type { ConfigurationService } from '../services/configurationService.js';

export interface IRepository<T> {
  create(entityData: Record<string, unknown>, createdBy: string): Promise<T>;
  update(id: string, entityData: Record<string, unknown>): Promise<T | null>;
  findAll(options?: Record<string, unknown>): Promise<T[]>;
  findBy(field: string, value: unknown): Promise<T[]>;
  findById(id: string): Promise<T | null>;
}

/** Function that converts a transformed DB record into a model instance */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- SC-005: field transforms produce mixed types
export type RecordMapper<T> = (record: Record<string, any>) => T | null;

/**
 * Abstract base repository with standardized data access
 * Caching is handled at the GoogleSheetsDbClient layer
 */
export class BaseRepository<T extends object>
  extends BaseService
  implements IRepository<T>
{
  entityName: string;
  dbClient: GoogleSheetsDbClient;
  protected mapRecord: RecordMapper<T> | null;

  constructor(
    entityName: string,
    mapRecord: RecordMapper<T> | null,
    dbClient: GoogleSheetsDbClient | null = null,
    configService?: ConfigurationService
  ) {
    super(configService);
    this.entityName = entityName;
    this.mapRecord = mapRecord;
    this.dbClient = dbClient || new GoogleSheetsDbClient(configService);
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

      // Convert model instance to plain object if needed
      const dataWithOptionalToJson = entityData as Record<string, unknown> & {
        toJSON?: () => Record<string, unknown>;
      };
      const data = dataWithOptionalToJson.toJSON ? dataWithOptionalToJson.toJSON() : entityData;

      const created = await this.dbClient.appendRecord(
        this.entityName,
        data as Record<string, unknown>,
        createdBy
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
  async update(id: string, entityData: Record<string, unknown>): Promise<T | null> {
    try {
      this.logger.info(`📝 Updating ${this.entityName} with ID:`, id);

      // Convert model instance to plain object if needed
      const dataWithOptionalToJson = entityData as Record<string, unknown> & {
        toJSON?: () => Record<string, unknown>;
      };
      const data = dataWithOptionalToJson.toJSON ? dataWithOptionalToJson.toJSON() : entityData;
      data.id = id;

      await this.dbClient.updateRecord(
        this.entityName,
        data as Record<string, unknown>,
        ''
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
   * Convert raw data to model instance
   */
  convertToModel(data: Record<string, unknown> | null): T | null {
    if (!data) {
      return null;
    }

    if (!this.mapRecord) {
      return data as T;
    }

    return this.mapRecord(data);
  }

  /**
   * Find all records
   * Caching is handled at the GoogleSheetsDbClient layer
   */
  async findAll(_options: Record<string, unknown> = {}): Promise<T[]> {
    try {
      this.logger.info(`📋 Finding all ${this.entityName}s`);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const records = await this.dbClient.getAllRecords(this.entityName, (record: Record<string, any>) => { // SC-005: field transforms produce mixed types
        if (this.mapRecord) {
          return this.mapRecord(record);
        }
        return record as T;
      });

      this.logger.info(`✅ Found ${records.length} ${this.entityName}s`);
      return records.filter((record): record is T => record !== null);
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
