import { BaseRepository } from './baseRepository.js';
import { Keys } from '../utils/values/keys.js';
import type { GoogleSheetsDbClient } from '../database/googleSheetsDbClient.js';
import type { ConfigurationService } from '../services/configurationService.js';

/** Column schema for the periods sheet */
export const PERIOD_COLUMNS = ['trimester', 'periodType', 'startDate'] as const;

export interface Period {
  trimester: string;
  periodType: string;
  startDate: Date | null;
  isCurrentPeriod?: boolean;
}

/**
 * Period Repository - handles period data access
 * Periods are simple read-only records (trimester, periodType, startDate)
 */
export class PeriodRepository extends BaseRepository<Period> {
  constructor(dbClient: GoogleSheetsDbClient, configService?: ConfigurationService) {
    super(
      Keys.PERIODS,
      record => PeriodRepository.fromDatabaseRow(record),
      dbClient,
      configService
    );
  }

  /**
   * Parse a period record from the database.
   * DB client mappings produce: trimester (lowercase string | null), startDate (Date | null).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDatabaseRow(record: Record<string, any>): Period | null {
    if (!record || !record.trimester) return null;

    return {
      trimester: record.trimester,
      periodType: record.periodType,
      startDate: record.startDate,
    };
  }

  /**
   * Get all periods. Always fetched live — the `periods` sheet is deliberately
   * excluded from the 5-minute in-memory cache in `googleSheetsDbClient`
   * (see [src/database/googleSheetsDbClient.ts](../database/googleSheetsDbClient.ts)
   * around the cache-skip check for the `periods` sheet name).
   *
   * Periods govern which trimester is active and which registrations table
   * writes target (`PeriodService.getEnrollmentTrimesterTable()`). A stale
   * period — even by 5 minutes at a boundary — would cause writes to land
   * in the wrong trimester's sheet. The cost of one live Sheets read per call
   * is acceptable; the cost of a misrouted write is not.
   */
  async getAll(): Promise<Period[]> {
    return this.findAll();
  }
}
