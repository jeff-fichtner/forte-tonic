/**
 * Program Repository Unit Tests
 * ==============================
 *
 * Exercises src/repositories/programRepository.ts (the class catalog
 * repository). Thin wrapper around BaseRepository; verifies:
 *  - getClasses() returns Class instances the dbClient yields
 *  - getClassById() returns the matching class
 *  - getClassById() throws NotFoundError when the id matches nothing
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

const { ProgramRepository } = await import('../../../src/repositories/programRepository.js');
const { NotFoundError } = await import('../../../src/common/errors.js');

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
 * Configure the mock dbClient to apply the mapper per row (matches the real
 * client's contract — BaseRepository's fetchAll filters nulls afterward).
 */
function setMockRows(dbClient: MockDbClient, rows: Record<string, unknown>[]): void {
  dbClient.getAllRecords.mockImplementation(
    async (_sheetKey: string, mapper: (r: Record<string, unknown>) => unknown) => {
      return rows.map(r => mapper(r));
    }
  );
}

const sampleClassRows = [
  {
    id: 'c1',
    title: 'Beginner Guitar',
    instructorId: 'i1',
    day: 'Monday',
    startTime: '15:00',
    length: 60,
    instrument: 'Guitar',
    minimumGrade: '0',
    maximumGrade: '8',
    isRestricted: null,
    capacity: 10,
  },
  {
    id: 'c2',
    title: 'Intermediate Piano',
    instructorId: 'i2',
    day: 'Wednesday',
    startTime: '16:00',
    length: 45,
    instrument: 'Piano',
    minimumGrade: '3',
    maximumGrade: '8',
    isRestricted: null,
    capacity: 8,
  },
];

describe('ProgramRepository', () => {
  let dbClient: MockDbClient;
  let repository: InstanceType<typeof ProgramRepository>;

  beforeEach(() => {
    dbClient = createMockDbClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new ProgramRepository(dbClient as any);
  });

  describe('getClasses()', () => {
    test('returns the classes the dbClient provides', async () => {
      setMockRows(dbClient, sampleClassRows);

      const result = await repository.getClasses();

      expect(result).toHaveLength(2);
      expect(result.map((c: { id: string }) => c.id)).toEqual(['c1', 'c2']);
    });

    test('returns an empty array when the sheet has no rows', async () => {
      setMockRows(dbClient, []);
      expect(await repository.getClasses()).toEqual([]);
    });

    test('propagates errors from dbClient unchanged', async () => {
      dbClient.getAllRecords.mockRejectedValue(new Error('Sheets API exploded'));
      await expect(repository.getClasses()).rejects.toThrow('Sheets API exploded');
    });
  });

  describe('getClassById()', () => {
    test('returns the matching class', async () => {
      setMockRows(dbClient, sampleClassRows);

      const result = await repository.getClassById('c2');

      expect(result.id).toBe('c2');
      expect(result.title).toBe('Intermediate Piano');
    });

    test('throws NotFoundError when the id matches nothing', async () => {
      setMockRows(dbClient, sampleClassRows);

      await expect(repository.getClassById('does-not-exist')).rejects.toThrow(NotFoundError);
      await expect(repository.getClassById('does-not-exist')).rejects.toThrow(/does-not-exist/);
    });

    test('throws NotFoundError when the sheet is empty', async () => {
      setMockRows(dbClient, []);
      await expect(repository.getClassById('c1')).rejects.toThrow(NotFoundError);
    });
  });
});
