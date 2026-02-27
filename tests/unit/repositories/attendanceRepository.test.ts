/**
 * Attendance Repository Tests (T016)
 * ====================================
 *
 * Tests for AttendanceRepository CRUD and query operations:
 * - generateAttendanceId (composite key generation)
 * - create (duplicate prevention, audit writing)
 * - findByRegistrationId
 * - findByWeek
 * - getAttendanceSummary
 * - hasAttendance
 * - getAttendanceForRegistrations
 */

import { jest } from '@jest/globals';

// Module-level mocks: BaseService imports configurationService and logger at module level.
// We must mock these before importing the repository.

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

jest.unstable_mockModule('../../../src/utils/uuidUtility.js', () => ({
  UuidUtility: {
    generateUuid: jest.fn().mockReturnValue('mock-uuid-123'),
  },
}));

jest.unstable_mockModule('../../../src/database/googleSheetsDbClient.js', () => ({
  GoogleSheetsDbClient: jest.fn(),
}));

const { AttendanceRepository } = await import(
  '../../../src/repositories/attendanceRepository.js'
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/** Build a plain attendance-record-like object that AttendanceRecord.fromDatabaseRow would produce. */
function makeAttendanceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'R1_3_2025-2026_fall',
    registrationId: 'R1',
    week: 3,
    schoolYear: '2025-2026',
    trimester: 'fall',
    attended: true,
    notes: '',
    recordedBy: 'teacher@example.com',
    recordedAt: '2026-01-15T10:00:00Z',
    createdAt: '2026-01-15T10:00:00Z',
    createdBy: 'teacher@example.com',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AttendanceRepository', () => {
  let mockDbClient: MockDbClient;
  let repo: InstanceType<typeof AttendanceRepository>;

  beforeEach(() => {
    mockDbClient = createMockDbClient();
    repo = new AttendanceRepository(mockDbClient as unknown as import('../../../src/database/googleSheetsDbClient.js').GoogleSheetsDbClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // generateAttendanceId
  // -----------------------------------------------------------------------

  describe('generateAttendanceId', () => {
    test('should return composite ID from registrationId, week, schoolYear, trimester', () => {
      const result = repo.generateAttendanceId({
        registrationId: 'R1',
        week: 3,
        schoolYear: '2025-2026',
        trimester: 'fall',
      });

      expect(result).toBe('R1_3_2025-2026_fall');
    });
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------

  describe('create', () => {
    test('should create a new attendance record and write audit', async () => {
      // findById (via findAll -> getAllRecords) returns empty — no duplicate
      mockDbClient.getAllRecords.mockImplementation(
        (_sheet: string, mapper: Function) => Promise.resolve([]),
      );

      // appendRecord returns a row object (the "created" row from the sheet)
      const createdRow = makeAttendanceRow();
      mockDbClient.appendRecord.mockResolvedValue(createdRow);

      // insertIntoSheet for audit — just resolve
      mockDbClient.insertIntoSheet.mockResolvedValue(undefined);

      const entityData = {
        registrationId: 'R1',
        week: 3,
        schoolYear: '2025-2026',
        trimester: 'fall',
        attended: true,
        recordedBy: 'teacher@example.com',
      };

      const result = await repo.create(entityData, 'teacher@example.com');

      // The result should have the expected ID
      expect(result.id).toBe('R1_3_2025-2026_fall');
      expect(result.registrationId).toBe('R1');

      // appendRecord should have been called for the attendance record (no createdBy arg)
      expect(mockDbClient.appendRecord).toHaveBeenCalledWith(
        'attendance',
        expect.objectContaining({ id: 'R1_3_2025-2026_fall' }),
      );

      // Audit record should have been written via appendRecord with USER_ENTERED
      expect(mockDbClient.appendRecord).toHaveBeenCalledWith(
        'attendance_audit',
        expect.objectContaining({
          action: 'CREATE',
          attendanceId: 'R1_3_2025-2026_fall',
          performedBy: 'teacher@example.com',
        }),
        'USER_ENTERED',
      );
    });

    test('should throw when duplicate attendance exists', async () => {
      // findById finds a matching record — duplicate
      const existing = makeAttendanceRow();
      mockDbClient.getAllRecords.mockImplementation(
        (_sheet: string, mapper: Function) => Promise.resolve([mapper(existing)]),
      );

      const entityData = {
        registrationId: 'R1',
        week: 3,
        schoolYear: '2025-2026',
        trimester: 'fall',
        attended: true,
        recordedBy: 'teacher@example.com',
      };

      await expect(repo.create(entityData, 'teacher@example.com')).rejects.toThrow(
        'already recorded',
      );

      expect(mockDbClient.appendRecord).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // findByRegistrationId
  // -----------------------------------------------------------------------

  describe('findByRegistrationId', () => {
    test('should return only records matching the given registrationId', async () => {
      const r1a = makeAttendanceRow({ id: 'R1_1_2025-2026_fall', registrationId: 'R1', week: 1 });
      const r1b = makeAttendanceRow({ id: 'R1_2_2025-2026_fall', registrationId: 'R1', week: 2 });
      const r2 = makeAttendanceRow({ id: 'R2_1_2025-2026_fall', registrationId: 'R2', week: 1 });

      mockDbClient.getAllRecords.mockImplementation(
        (_sheet: string, mapper: Function) =>
          Promise.resolve([r1a, r1b, r2].map((row) => mapper(row))),
      );

      const results = await repo.findByRegistrationId('R1');

      expect(results).toHaveLength(2);
      expect(results.every((r: any) => r.registrationId === 'R1')).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // findByWeek
  // -----------------------------------------------------------------------

  describe('findByWeek', () => {
    test('should return records matching week, schoolYear, and trimester', async () => {
      const w3fall = makeAttendanceRow({ id: 'R1_3_2025-2026_fall', week: 3 });
      const w4fall = makeAttendanceRow({ id: 'R1_4_2025-2026_fall', week: 4 });
      const w3winter = makeAttendanceRow({
        id: 'R1_3_2025-2026_winter',
        week: 3,
        trimester: 'winter',
      });

      mockDbClient.getAllRecords.mockImplementation(
        (_sheet: string, mapper: Function) =>
          Promise.resolve([w3fall, w4fall, w3winter].map((row) => mapper(row))),
      );

      const results = await repo.findByWeek(3, '2025-2026', 'fall');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('R1_3_2025-2026_fall');
    });
  });

  // -----------------------------------------------------------------------
  // getAttendanceSummary
  // -----------------------------------------------------------------------

  describe('getAttendanceSummary', () => {
    test('should derive attendance rate from distinct weeks across all trimester records', async () => {
      // R1 attended weeks 2, 5, 8 in fall
      const r1w2 = makeAttendanceRow({
        id: 'R1_2_2025-2026_fall',
        registrationId: 'R1',
        week: 2,
        schoolYear: '2025-2026',
        trimester: 'fall',
      });
      const r1w5 = makeAttendanceRow({
        id: 'R1_5_2025-2026_fall',
        registrationId: 'R1',
        week: 5,
        schoolYear: '2025-2026',
        trimester: 'fall',
      });
      const r1w8 = makeAttendanceRow({
        id: 'R1_8_2025-2026_fall',
        registrationId: 'R1',
        week: 8,
        schoolYear: '2025-2026',
        trimester: 'fall',
      });
      // R2 attended weeks 2, 5, 8, 10 in fall — adds week 10 to the distinct set
      const r2w2 = makeAttendanceRow({
        id: 'R2_2_2025-2026_fall',
        registrationId: 'R2',
        week: 2,
        schoolYear: '2025-2026',
        trimester: 'fall',
      });
      const r2w5 = makeAttendanceRow({
        id: 'R2_5_2025-2026_fall',
        registrationId: 'R2',
        week: 5,
        schoolYear: '2025-2026',
        trimester: 'fall',
      });
      const r2w8 = makeAttendanceRow({
        id: 'R2_8_2025-2026_fall',
        registrationId: 'R2',
        week: 8,
        schoolYear: '2025-2026',
        trimester: 'fall',
      });
      const r2w10 = makeAttendanceRow({
        id: 'R2_10_2025-2026_fall',
        registrationId: 'R2',
        week: 10,
        schoolYear: '2025-2026',
        trimester: 'fall',
      });
      // Different trimester — should be excluded from distinct-week count
      const winterRec = makeAttendanceRow({
        id: 'R1_1_2025-2026_winter',
        registrationId: 'R1',
        week: 1,
        schoolYear: '2025-2026',
        trimester: 'winter',
      });

      mockDbClient.getAllRecords.mockImplementation(
        (_sheet: string, mapper: Function) =>
          Promise.resolve(
            [r1w2, r1w5, r1w8, r2w2, r2w5, r2w8, r2w10, winterRec].map((row) => mapper(row)),
          ),
      );

      const summary = await repo.getAttendanceSummary('R1', '2025-2026', 'fall');

      expect(summary.registrationId).toBe('R1');
      expect(summary.totalSessions).toBe(3);
      // Distinct fall weeks across all registrations: {2, 5, 8, 10} = 4
      // attendanceRate = (3 / 4) * 100 = 75
      expect(summary.attendanceRate).toBe(75);
      // Records should be sorted ascending by week
      expect(summary.records.map((r: any) => r.week)).toEqual([2, 5, 8]);
    });

    test('should return zero totals when no records exist', async () => {
      mockDbClient.getAllRecords.mockImplementation(
        (_sheet: string, _mapper: Function) => Promise.resolve([]),
      );

      const summary = await repo.getAttendanceSummary('R1', '2025-2026', 'fall');

      expect(summary.registrationId).toBe('R1');
      expect(summary.totalSessions).toBe(0);
      expect(summary.attendanceRate).toBe(0);
      expect(summary.records).toEqual([]);
    });

    test('should return 100% when student has records for all scheduled weeks', async () => {
      // Only one registration with records for all weeks that exist
      const w1 = makeAttendanceRow({
        id: 'R1_1_2025-2026_fall',
        registrationId: 'R1',
        week: 1,
        schoolYear: '2025-2026',
        trimester: 'fall',
      });
      const w2 = makeAttendanceRow({
        id: 'R1_2_2025-2026_fall',
        registrationId: 'R1',
        week: 2,
        schoolYear: '2025-2026',
        trimester: 'fall',
      });

      mockDbClient.getAllRecords.mockImplementation(
        (_sheet: string, mapper: Function) =>
          Promise.resolve([w1, w2].map((row) => mapper(row))),
      );

      const summary = await repo.getAttendanceSummary('R1', '2025-2026', 'fall');

      expect(summary.totalSessions).toBe(2);
      // Distinct weeks: {1, 2} = 2, student has 2 records → 100%
      expect(summary.attendanceRate).toBe(100);
    });
  });

  // -----------------------------------------------------------------------
  // hasAttendance
  // -----------------------------------------------------------------------

  describe('hasAttendance', () => {
    test('should return true when attendance record exists', async () => {
      const existing = makeAttendanceRow({ id: 'R1_3_2025-2026_fall' });
      mockDbClient.getAllRecords.mockImplementation(
        (_sheet: string, mapper: Function) => Promise.resolve([mapper(existing)]),
      );

      const result = await repo.hasAttendance('R1', 3, '2025-2026', 'fall');

      expect(result).toBe(true);
    });

    test('should return false when attendance record does not exist', async () => {
      mockDbClient.getAllRecords.mockImplementation(
        (_sheet: string, _mapper: Function) => Promise.resolve([]),
      );

      const result = await repo.hasAttendance('R1', 3, '2025-2026', 'fall');

      expect(result).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // getAttendanceForRegistrations
  // -----------------------------------------------------------------------

  describe('getAttendanceForRegistrations', () => {
    test('should return records only for specified registrationIds', async () => {
      const r1 = makeAttendanceRow({ id: 'R1_1_2025-2026_fall', registrationId: 'R1' });
      const r2 = makeAttendanceRow({ id: 'R2_1_2025-2026_fall', registrationId: 'R2' });
      const r3 = makeAttendanceRow({ id: 'R3_1_2025-2026_fall', registrationId: 'R3' });

      mockDbClient.getAllRecords.mockImplementation(
        (_sheet: string, mapper: Function) =>
          Promise.resolve([r1, r2, r3].map((row) => mapper(row))),
      );

      const results = await repo.getAttendanceForRegistrations(['R1', 'R3']);

      expect(results).toHaveLength(2);
      const ids = results.map((r: any) => r.registrationId);
      expect(ids).toContain('R1');
      expect(ids).toContain('R3');
      expect(ids).not.toContain('R2');
    });
  });
});
