/**
 * Base Repository Tests (T017)
 * ==============================
 *
 * Tests for BaseRepository<T> generic CRUD operations:
 * - create (appendRecord, toJSON handling)
 * - update (updateRecord + re-fetch)
 * - findAll (getAllRecords, null filtering)
 * - findBy (field value matching)
 * - findById (string ID comparison)
 * - convertToModel (mapper vs. no-mapper, null input)
 */

import { jest } from '@jest/globals';

// Module-level mocks: BaseService imports configurationService and logger at module level.

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
}));

const { BaseRepository } = await import('../../../src/repositories/baseRepository.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface TestEntity {
  id: string;
  name: string;
  value: number;
}

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
 * Mapper: converts a raw record into a TestEntity. Returns null for records
 * that lack an id (simulates invalid rows being filtered out).
 */
function testMapper(record: Record<string, unknown>): TestEntity | null {
  if (!record.id) return null;
  return {
    id: String(record.id),
    name: String(record.name ?? ''),
    value: Number(record.value ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BaseRepository', () => {
  let mockDbClient: MockDbClient;
  let repo: InstanceType<typeof BaseRepository>;

  beforeEach(() => {
    mockDbClient = createMockDbClient();
    repo = new BaseRepository('testEntity', testMapper, mockDbClient as unknown as import('../../../src/database/googleSheetsDbClient.js').GoogleSheetsDbClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------

  describe('create', () => {
    test('should call appendRecord and return converted model', async () => {
      const row = { id: 'abc-123', name: 'Item A', value: '42' };
      mockDbClient.appendRecord.mockResolvedValue(row);

      const result = await repo.create(
        { id: 'abc-123', name: 'Item A', value: 42 },
        'user@example.com',
      );

      expect(mockDbClient.appendRecord).toHaveBeenCalledWith(
        'testEntity',
        expect.objectContaining({ id: 'abc-123', name: 'Item A' }),
        'user@example.com',
      );

      expect(result).toEqual({ id: 'abc-123', name: 'Item A', value: 42 });
    });

    test('should call toJSON() on entityData when available', async () => {
      const toJSON = jest.fn().mockReturnValue({ id: 'xyz', name: 'Serialized', value: 7 });
      const entityData = { id: 'xyz', name: 'Original', value: 7, toJSON };

      const row = { id: 'xyz', name: 'Serialized', value: '7' };
      mockDbClient.appendRecord.mockResolvedValue(row);

      await repo.create(entityData as any, 'user@example.com');

      expect(toJSON).toHaveBeenCalled();
      expect(mockDbClient.appendRecord).toHaveBeenCalledWith(
        'testEntity',
        expect.objectContaining({ name: 'Serialized' }),
        'user@example.com',
      );
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------

  describe('update', () => {
    test('should call updateRecord then re-fetch via findById', async () => {
      mockDbClient.updateRecord.mockResolvedValue(undefined);

      // findById calls findAll which calls getAllRecords
      const updatedRow = { id: '123', name: 'Updated', value: 99 };
      mockDbClient.getAllRecords.mockImplementation(
        (_sheet: string, mapper: Function) => Promise.resolve([mapper(updatedRow)]),
      );

      const result = await repo.update('123', { name: 'Updated', value: 99 });

      expect(mockDbClient.updateRecord).toHaveBeenCalledWith(
        'testEntity',
        expect.objectContaining({ id: '123', name: 'Updated' }),
        '',
      );

      expect(result).toEqual({ id: '123', name: 'Updated', value: 99 });
    });
  });

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------

  describe('findAll', () => {
    test('should call getAllRecords and filter out null mapper results', async () => {
      const validRow = { id: 'v1', name: 'Valid', value: 10 };
      const invalidRow = { name: 'No ID', value: 5 }; // mapper returns null for missing id

      mockDbClient.getAllRecords.mockImplementation(
        (_sheet: string, mapper: Function) =>
          Promise.resolve([mapper(validRow), mapper(invalidRow)]),
      );

      const results = await repo.findAll();

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ id: 'v1', name: 'Valid', value: 10 });
    });
  });

  // -----------------------------------------------------------------------
  // findBy
  // -----------------------------------------------------------------------

  describe('findBy', () => {
    test('should return only records whose field matches the given value', async () => {
      const a = { id: '1', name: 'test', value: 10 };
      const b = { id: '2', name: 'other', value: 20 };
      const c = { id: '3', name: 'test', value: 30 };

      mockDbClient.getAllRecords.mockImplementation(
        (_sheet: string, mapper: Function) =>
          Promise.resolve([a, b, c].map((row) => mapper(row))),
      );

      const results = await repo.findBy('name', 'test');

      expect(results).toHaveLength(2);
      expect(results.map((r: any) => r.id)).toEqual(['1', '3']);
    });
  });

  // -----------------------------------------------------------------------
  // findById
  // -----------------------------------------------------------------------

  describe('findById', () => {
    test('should find record by string ID comparison', async () => {
      const row = { id: '123', name: 'Found', value: 42 };
      mockDbClient.getAllRecords.mockImplementation(
        (_sheet: string, mapper: Function) => Promise.resolve([mapper(row)]),
      );

      const result = await repo.findById('123');

      expect(result).toEqual({ id: '123', name: 'Found', value: 42 });
    });

    test('should return null when no record matches', async () => {
      mockDbClient.getAllRecords.mockImplementation(
        (_sheet: string, _mapper: Function) => Promise.resolve([]),
      );

      const result = await repo.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // convertToModel
  // -----------------------------------------------------------------------

  describe('convertToModel', () => {
    test('should use mapper when present', () => {
      const result = repo.convertToModel({ id: 'c1', name: 'Converted', value: '7' });

      expect(result).toEqual({ id: 'c1', name: 'Converted', value: 7 });
    });

    test('should return data as-is with identity mapper', () => {
      const identityMapper = (record: Record<string, unknown>) => record;
      const identityRepo = new BaseRepository('raw', identityMapper, mockDbClient as unknown as import('../../../src/database/googleSheetsDbClient.js').GoogleSheetsDbClient);
      const data = { id: 'r1', arbitrary: 'field' };

      const result = identityRepo.convertToModel(data);

      expect(result).toEqual(data);
    });

    test('should return null when input is null', () => {
      const result = repo.convertToModel(null);

      expect(result).toBeNull();
    });
  });
});
