import { BaseService } from '../infrastructure/base/baseService.js';
import { PeriodType } from '../utils/values/periodType.js';

/**
 * Service for reading period information from database
 */
export class PeriodService extends BaseService {
  constructor(dbClient, configService) {
    super(configService);
    this.dbClient = dbClient;
  }

  /**
   * Get the currently active period
   * @returns {Promise<object|null>} Period object {trimester, periodType, isCurrentPeriod, startDate} or null if none active
   * @throws {Error} If database read fails
   */
  async getCurrentPeriod() {
    try {
      // Use getAllRecords (no caching) so period changes are reflected immediately
      const allPeriods = await this.dbClient.getAllRecords('periods', row => {
        if (!row || !row[0]) return null;

        // Skip header row
        const firstCell = String(row[0]).trim().toLowerCase();
        if (firstCell === 'trimester') return null;

        return {
          trimester: row[0],
          periodType: row[1],
          isCurrentPeriod: row[2] === true || row[2] === 'TRUE' || row[2] === 'true',
          startDate: row[3] ? new Date(row[3]) : null,
        };
      });

      // Find the one marked as current
      const currentPeriod = allPeriods.find(p => p && p.isCurrentPeriod === true);

      if (!currentPeriod) {
        this.logger.warn('No current period set in periods table');
        return null;
      }

      return currentPeriod;
    } catch (error) {
      this.logger.error('Error getting current period:', error);
      throw error;
    }
  }

  /**
   * Check if we're currently in the intent period
   * @returns {Promise<boolean>} True if current period type is 'intent'
   */
  async isIntentPeriodActive() {
    const currentPeriod = await this.getCurrentPeriod();
    return !!(currentPeriod && currentPeriod.periodType === PeriodType.INTENT);
  }
}
