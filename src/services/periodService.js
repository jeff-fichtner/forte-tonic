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
          startDate: row[2] ? new Date(row[2]) : null,
        };
      });

      // Get current date/time
      const now = new Date();

      // Find the period with the latest startDate that has already started (single pass)
      const currentPeriod = allPeriods.reduce((latest, current) => {
        // Skip periods without valid startDate or that haven't started yet
        if (!current || !current.startDate || current.startDate > now) {
          return latest;
        }
        // Return current if no latest yet, or if current started more recently
        if (!latest || current.startDate > latest.startDate) {
          return current;
        }
        return latest;
      }, null);

      if (!currentPeriod) {
        this.logger.warn('No current period found (no period has started yet)');
        return null;
      }

      // Add isCurrentPeriod flag for backward compatibility
      return {
        ...currentPeriod,
        isCurrentPeriod: true,
      };
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
