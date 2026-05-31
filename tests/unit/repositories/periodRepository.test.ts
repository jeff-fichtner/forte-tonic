/**
 * Period Repository Unit Tests
 * =============================
 *
 * Exercises src/repositories/periodRepository.ts. PeriodRepository is a thin
 * wrapper around BaseRepository.findAll(), but the contract is important:
 *  - getAll() returns the rows the mocked dbClient provides, mapped through
 *    fromDatabaseRow (which drops rows missing a `trimester`).
 *  - Each getAll() call hits the dbClient — periods are NOT cached at the
 *    googleSheetsDbClient layer (the dbClient skips its 5-min cache for the
 *    periods sheet because a stale period would misroute writes between
 *    trimesters).
 */

import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  getLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

jest.unstable_mockModule('../../../src/services/configurationService.js', () => ({
  configService: {
    getServerConfig: jest.fn().mockReturnValue({ nodeEnv: 'test' }),
    getLoggingConfig: jest.fn().mockReturnValue({ enableLogging: false }),
  },
}));

jest.unstable_mockModule('../../../src/database/googleSheetsDbClient.js', () => ({
  GoogleSheetsDbClient: jest.fn(),
  dataSheetForTrimester: (trimester: string) => `registrations_${trimester}`,
  auditSheetForTrimester: (trimester: string) => `registrations_${trimester}_audit`,
}));

const { PeriodRepository } = await import('../../../src/repositories/periodRepository.js');

interface MockDbClient {
  appendRecord: jest.Mock;
  updateRecord: jest.Mock;
  getAllRecords: jest.Mock;
  deleteRecord: jest.Mock;
  clearSheetCache: jest.Mock;
  insertIntoSheet: jest.Mock;
}

function createMockDbClient(): MockDbClient {
  return {
    appendRecord: jest.fn(),
    updateRecord: jest.fn(),
    getAllRecords: jest.fn(),
    deleteRecord: jest.fn(),
    clearSheetCache: jest.fn(),
    insertIntoSheet: jest.fn(),
  };
}

/**
 * Configure the mock dbClient to apply the mapper to each raw row (which is
 * what the real client does). Tests provide raw rows + the mapper is called
 * per-row; null returns are filtered out by BaseRepository's fetchAll.
 */
function setMockRows(dbClient: MockDbClient, rows: Record<string, unknown>[]): void {
  dbClient.getAllRecords.mockImplementation(
    async (_sheetKey: string, mapper: (r: Record<string, unknown>) => unknown) => {
      return rows.map(r => mapper(r));
    }
  );
}

describe('PeriodRepository', () => {
  let dbClient: MockDbClient;
  let repository: InstanceType<typeof PeriodRepository>;

  beforeEach(() => {
    dbClient = createMockDbClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new PeriodRepository(dbClient as any);
  });

  describe('getAll()', () => {
    test('returns the rows the dbClient provides, mapped to Period shape', async () => {
      const rows = [
        { trimester: 'fall', periodType: 'registration', startDate: new Date('2026-08-15') },
        {
          trimester: 'winter',
          periodType: 'priorityEnrollment',
          startDate: new Date('2026-11-01'),
        },
      ];
      setMockRows(dbClient, rows);

      const result = await repository.getAll();

      expect(result).toEqual([
        {
          trimester: 'fall',
          periodType: 'registration',
          startDate: new Date('2026-08-15'),
        },
        {
          trimester: 'winter',
          periodType: 'priorityEnrollment',
          startDate: new Date('2026-11-01'),
        },
      ]);
    });

    test('drops rows that lack a trimester (fromDatabaseRow returns null)', async () => {
      const rows = [
        { trimester: 'fall', periodType: 'registration', startDate: new Date('2026-08-15') },
        { trimester: null, periodType: 'registration', startDate: new Date('2026-09-01') },
        { trimester: '', periodType: 'registration', startDate: new Date('2026-09-01') },
        {
          trimester: 'spring',
          periodType: 'openEnrollment',
          startDate: new Date('2026-12-01'),
        },
      ];
      setMockRows(dbClient, rows);

      const result = await repository.getAll();

      expect(result.map((p: { trimester: string }) => p.trimester)).toEqual(['fall', 'spring']);
    });

    test('returns an empty array when the sheet has no rows', async () => {
      setMockRows(dbClient, []);
      expect(await repository.getAll()).toEqual([]);
    });

    test('passes through to dbClient.getAllRecords on EVERY call (no internal caching)', async () => {
      // The point of periodRepository being uncached: callers can rely on every
      // call hitting the source of truth. (The dbClient layer separately skips
      // its 5-min cache for the periods sheet — that's covered by integration
      // tests of googleSheetsDbClient.)
      setMockRows(dbClient, []);

      await repository.getAll();
      await repository.getAll();
      await repository.getAll();

      expect(dbClient.getAllRecords).toHaveBeenCalledTimes(3);
    });

    test('propagates errors from dbClient unchanged', async () => {
      dbClient.getAllRecords.mockRejectedValue(new Error('Sheets API timed out'));
      await expect(repository.getAll()).rejects.toThrow(/Sheets API timed out/);
    });
  });

  describe('PeriodRepository.fromDatabaseRow', () => {
    test('returns null for a falsy record', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(PeriodRepository.fromDatabaseRow(null as any)).toBeNull();
    });

    test('returns null for a record missing trimester', () => {
      expect(
        PeriodRepository.fromDatabaseRow({ periodType: 'registration', startDate: new Date() })
      ).toBeNull();
    });

    test('returns a Period for a complete row', () => {
      const startDate = new Date('2026-08-15');
      expect(
        PeriodRepository.fromDatabaseRow({
          trimester: 'fall',
          periodType: 'registration',
          startDate,
        })
      ).toEqual({ trimester: 'fall', periodType: 'registration', startDate });
    });
  });
});
