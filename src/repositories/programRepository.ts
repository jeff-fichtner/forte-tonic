import { BaseRepository } from './baseRepository.js';
import type { ModelClass } from './baseRepository.js';
import { Keys } from '../utils/values/keys.js';
import { Class } from '../models/shared/index.js';
import type { GoogleSheetsDbClient } from '../database/googleSheetsDbClient.js';
import type { ConfigurationService } from '../services/configurationService.js';

/**
 * Program Repository - handles program catalog data operations
 * Manages classes (group lessons)
 * Extends BaseRepository for consistent logging and base functionality
 */
export class ProgramRepository extends BaseRepository<Class> {
  constructor(dbClient?: GoogleSheetsDbClient, configService?: ConfigurationService) {
    // Use 'classes' as the primary entity since that's the main concern
    super(Keys.CLASSES, Class as unknown as ModelClass<Class>, dbClient, configService); // SC-005: class constructor → generic ModelClass interface
  }

  /**
   * Get all classes
   * Caching is handled at the GoogleSheetsDbClient layer
   */
  async getClasses(): Promise<Class[]> {
    this.logger.info(`📋 Loading ${Keys.CLASSES}`);
    const classes = await this.dbClient.getAllRecords(Keys.CLASSES, (x: string[]) => Class.fromDatabaseRow(x));

    this.logger.info(`✅ Found ${classes.length} ${Keys.CLASSES}`);
    return classes;
  }

  /**
   * Get a specific class by ID
   */
  async getClassById(id: string): Promise<Class | undefined> {
    const classes = await this.getClasses();
    return classes.find(x => x.id === id);
  }
}
