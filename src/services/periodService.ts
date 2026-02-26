import { BaseService } from '../infrastructure/base/baseService.js';
import { PeriodType } from '../utils/values/periodType.js';
import { TRIMESTER_SEQUENCE } from '../utils/values/trimester.js';
import type { GoogleSheetsDbClient } from '../database/googleSheetsDbClient.js';
import type { ConfigurationService } from './configurationService.js';

/** Column schema for the periods sheet (not a model class, so defined here) */
export const PERIOD_COLUMNS = ['trimester', 'periodType', 'startDate'] as const;

export interface Period {
  trimester: string | null;
  periodType: string;
  startDate: Date | null;
  isCurrentPeriod?: boolean;
}

/**
 * Service for reading period information from database
 */
export class PeriodService extends BaseService {
  dbClient: GoogleSheetsDbClient;

  constructor(dbClient: GoogleSheetsDbClient, configService: ConfigurationService) {
    super(configService);
    this.dbClient = dbClient;
  }

  /**
   * Parse a period record from the database into a period object.
   * DB client mappings produce: trimester (lowercase string | null), startDate (Date | null).
   * @param record - Pre-mapped database record
   * @returns Period object or null if invalid
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _parsePeriodRow(record: Record<string, any>): Period | null { // SC-005: mappings produce Date | null
    if (!record || !record.trimester) return null;

    return {
      trimester: record.trimester,
      periodType: record.periodType,
      startDate: record.startDate,
    };
  }

  /**
   * Get all periods from database
   * @returns Array of period objects
   */
  async _getAllPeriods(): Promise<(Period | null)[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await this.dbClient.getAllRecords('periods', (record: Record<string, any>) => this._parsePeriodRow(record));
  }

  /**
   * Get the currently active period
   * @returns Period object {trimester, periodType, isCurrentPeriod, startDate} or null if none active
   * @throws If database read fails
   */
  async getCurrentPeriod(): Promise<(Period & { isCurrentPeriod: boolean }) | null> {
    try {
      const allPeriods = await this._getAllPeriods();

      // Get current date/time
      const now = new Date();

      // Find the period with the latest startDate that has already started (single pass)
      const currentPeriod = allPeriods.reduce<Period | null>((latest, current) => {
        // Skip periods without valid startDate or that haven't started yet
        if (!current || !current.startDate || current.startDate > now) {
          return latest;
        }
        // Return current if no latest yet, or if current started more recently
        if (!latest || current.startDate! > latest.startDate!) {
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
   * @returns True if current period type is 'intent'
   */
  async isIntentPeriodActive(): Promise<boolean> {
    const currentPeriod = await this.getCurrentPeriod();
    return !!(currentPeriod && currentPeriod.periodType === PeriodType.INTENT);
  }

  /**
   * Check if we're currently in an enrollment period (priority or open)
   * @returns True if current period is priority or open enrollment
   */
  async isEnrollmentPeriodActive(): Promise<boolean> {
    const currentPeriod = await this.getCurrentPeriod();
    return !!(
      currentPeriod &&
      (currentPeriod.periodType === PeriodType.PRIORITY_ENROLLMENT ||
        currentPeriod.periodType === PeriodType.OPEN_ENROLLMENT)
    );
  }

  /**
   * Get the next upcoming period
   * @returns Next period object {trimester, periodType, startDate} or null if no future periods
   * @throws If database read fails
   */
  async getNextPeriod(): Promise<Period | null> {
    try {
      const allPeriods = await this._getAllPeriods();

      // Get current date/time
      const now = new Date();

      // Find the period with the earliest startDate that hasn't started yet (single pass)
      const nextPeriod = allPeriods.reduce<Period | null>((earliest, current) => {
        // Skip periods without valid startDate or that have already started
        if (!current || !current.startDate || current.startDate <= now) {
          return earliest;
        }
        // Return current if no earliest yet, or if current starts sooner
        if (!earliest || current.startDate! < earliest.startDate!) {
          return current;
        }
        return earliest;
      }, null);

      if (!nextPeriod) {
        this.logger.warn('No next period found (no future periods scheduled)');
        return null;
      }

      return nextPeriod;
    } catch (error) {
      this.logger.error('Error getting next period:', error);
      throw error;
    }
  }

  /**
   * Get the current trimester's registration table name based on active period
   * Table names are derived from period.trimester, not stored in the periods table
   * @returns Table name like "registrations_fall"
   * @throws If no active period found
   */
  async getCurrentTrimesterTable(): Promise<string> {
    const period = await this.getCurrentPeriod();
    if (!period || !period.trimester) {
      throw new Error('No active period found');
    }
    return `registrations_${period.trimester}`;
  }

  /**
   * Get the next trimester in sequence from the next period
   * Returns null if there is no next period scheduled
   * @returns Trimester name like "winter" or null
   */
  async getNextTrimester(): Promise<string | null> {
    const nextPeriod = await this.getNextPeriod();
    return nextPeriod?.trimester || null;
  }

  /**
   * Get current trimester from current period
   * @returns Trimester name like "fall" or null
   */
  async getCurrentTrimester(): Promise<string | null> {
    const currentPeriod = await this.getCurrentPeriod();
    return currentPeriod?.trimester || null;
  }

  /**
   * Get the appropriate table for enrollment operations (read/write)
   * During enrollment periods: uses next trimester (e.g., fall enrollment → winter table)
   * During active instruction: uses current trimester
   * @returns Table name like "registrations_fall"
   * @throws If no active period found
   */
  async getEnrollmentTrimesterTable(): Promise<string> {
    const period = await this.getCurrentPeriod();
    if (!period || !period.trimester) {
      throw new Error('No active period found');
    }

    // During enrollment periods, target the next trimester
    if (
      period.periodType === PeriodType.PRIORITY_ENROLLMENT ||
      period.periodType === PeriodType.OPEN_ENROLLMENT
    ) {
      const nextTrimester = PeriodService.getNextTrimesterInSequence(period.trimester);
      return `registrations_${nextTrimester}`;
    }

    // During instruction period, use current trimester
    return `registrations_${period.trimester}`;
  }

  /**
   * Get the next trimester in the annual sequence
   * fall → winter → spring → fall (cycles)
   * @param currentTrimester - "fall", "winter", or "spring" (case-insensitive)
   * @returns Next trimester name in lowercase
   * @throws If invalid trimester name
   */
  static getNextTrimesterInSequence(currentTrimester: string): string {
    if (!currentTrimester || typeof currentTrimester !== 'string') {
      throw new Error(`Invalid trimester: ${currentTrimester}`);
    }
    const index = TRIMESTER_SEQUENCE.findIndex(
      t => t.toLowerCase() === currentTrimester.toLowerCase()
    );
    if (index === -1) {
      throw new Error(`Invalid trimester: ${currentTrimester}`);
    }
    return TRIMESTER_SEQUENCE[(index + 1) % TRIMESTER_SEQUENCE.length];
  }

  /**
   * Get the previous trimester in the annual sequence
   * fall → spring, winter → fall, spring → winter (reverse cycles)
   * @param currentTrimester - "fall", "winter", or "spring" (case-insensitive)
   * @returns Previous trimester name in lowercase
   * @throws If invalid trimester name
   */
  static getPreviousTrimesterInSequence(currentTrimester: string): string {
    if (!currentTrimester || typeof currentTrimester !== 'string') {
      throw new Error(`Invalid trimester: ${currentTrimester}`);
    }
    const index = TRIMESTER_SEQUENCE.findIndex(
      t => t.toLowerCase() === currentTrimester.toLowerCase()
    );
    if (index === -1) {
      throw new Error(`Invalid trimester: ${currentTrimester}`);
    }
    return TRIMESTER_SEQUENCE[(index - 1 + TRIMESTER_SEQUENCE.length) % TRIMESTER_SEQUENCE.length];
  }

  /**
   * Check if a user can access next trimester enrollment based on current period and registration status
   * Rules:
   * - Open Enrollment: ALL families can access (returning + new)
   * - Priority Enrollment: Only returning families (those with active registrations)
   * - Other periods: No one can access next trimester
   * @param hasActiveRegistrations - Does user have registrations in current trimester?
   * @returns True if user can access next trimester enrollment
   */
  async canAccessNextTrimester(hasActiveRegistrations: boolean): Promise<boolean> {
    const period = await this.getCurrentPeriod();
    if (!period) {
      return false;
    }

    // During open enrollment, ALL families can access
    if (period.periodType === PeriodType.OPEN_ENROLLMENT) {
      return true;
    }

    // During priority enrollment, only returning families
    if (period.periodType === PeriodType.PRIORITY_ENROLLMENT) {
      return hasActiveRegistrations;
    }

    // Not an enrollment period
    return false;
  }
}
