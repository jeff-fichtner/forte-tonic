import { RepositoryHelper } from './helpers/repositoryHelper.js';
import { Keys } from '../utils/values/keys.js';
import { Class } from '../models/shared/index.js';

/**
 * Program Repository - handles program catalog data operations
 * Manages classes (group lessons) and rooms
 */
export class ProgramRepository {
  constructor(dbClient) {
    this.dbClient = dbClient;
  }

  /**
   * Get all classes
   */
  async getClasses(forceRefresh = false) {
    return await RepositoryHelper.getAndSetData(
      () => this.classes,
      async () =>
        (this.classes = await this.dbClient.getAllRecords(Keys.CLASSES, x =>
          Class.fromDatabaseRow(x)
        )),
      Keys.CLASSES,
      forceRefresh,
      this.logger
    );
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
    this.classes = null;
    this.logger.info('🧹 ProgramRepository cache cleared');
  }
}
