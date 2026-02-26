import { BaseRepository } from './baseRepository.js';
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
  constructor(dbClient: GoogleSheetsDbClient, configService?: ConfigurationService) {
    super(Keys.CLASSES, (record) => Class.fromDatabaseRow(record), dbClient, configService);
  }

  /**
   * Get all classes
   */
  async getClasses(): Promise<Class[]> {
    return this.findAll();
  }

  /**
   * Get a specific class by ID
   */
  async getClassById(id: string): Promise<Class | null> {
    return this.findById(id);
  }
}
