import { BaseRepository } from './baseRepository.js';
import { Keys } from '../utils/values/keys.js';
import { Class } from '../models/shared/index.js';
import { NotFoundError } from '../common/errors.js';
import type { GoogleSheetsDbClient } from '../database/googleSheetsDbClient.js';
import type { ConfigurationService } from '../services/configurationService.js';

/**
 * Program Repository - handles program catalog data operations
 * Manages classes (group lessons)
 * Extends BaseRepository for consistent logging and base functionality
 */
export class ProgramRepository extends BaseRepository<Class> {
  constructor(dbClient: GoogleSheetsDbClient, configService?: ConfigurationService) {
    super(Keys.CLASSES, record => Class.fromDatabaseRow(record), dbClient, configService);
  }

  /**
   * Get all classes
   */
  async getClasses(): Promise<Class[]> {
    return this.findAll();
  }

  /**
   * Get a specific class by ID. Throws NotFoundError if the ID does not
   * match a known class — for entity-lookup callers an absent record is a
   * data-integrity bug. Callers that legitimately have no class (e.g.,
   * private lessons with no `classId`) should skip the call entirely.
   */
  async getClassById(id: string): Promise<Class> {
    const groupClass = await this.findById(id);
    if (!groupClass) {
      throw new NotFoundError(`Class not found: ${id}`);
    }
    return groupClass;
  }
}
