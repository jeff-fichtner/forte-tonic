/**
 * Attendance Controller Tests (T012)
 * ====================================
 *
 * Tests for AttendanceController static methods:
 * - markAttendance: records attendance via req.attendanceRepository
 * - getAttendanceSummary: retrieves summary via req.attendanceRepository
 */

import { jest } from '@jest/globals';

// ---------------------------------------------------------------------------
// Module mocks (must precede dynamic import of the controller)
// ---------------------------------------------------------------------------

const mockGetAuthenticatedUserEmail = jest.fn();
jest.unstable_mockModule('../../../src/middleware/auth.js', () => ({
  getAuthenticatedUserEmail: mockGetAuthenticatedUserEmail,
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  getLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

const mockSuccessResponse = jest.fn();
const mockErrorResponse = jest.fn();
jest.unstable_mockModule('../../../src/common/responseHelpers.js', () => ({
  successResponse: mockSuccessResponse,
  errorResponse: mockErrorResponse,
  asString: (value: unknown, fallback: string = '') => {
    if (Array.isArray(value)) return String(value[0] ?? fallback);
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return fallback;
    return String(value);
  },
}));

jest.unstable_mockModule('../../../src/common/errors.js', () => ({
  ValidationError: class ValidationError extends Error {
    statusCode = 400;
    constructor(msg: string) {
      super(msg);
      this.name = 'ValidationError';
    }
  },
  ConflictError: class ConflictError extends Error {
    statusCode = 409;
    constructor(msg: string) {
      super(msg);
      this.name = 'ConflictError';
    }
  },
}));

// Import controller after all mocks are wired
const { AttendanceController } = await import(
  '../../../src/controllers/attendanceController.js'
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockAttendanceRepo() {
  return {
    hasAttendance: jest.fn(),
    create: jest.fn(),
    getAttendanceSummary: jest.fn(),
  };
}

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as any;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AttendanceController', () => {
  let mockAttendanceRepo: ReturnType<typeof createMockAttendanceRepo>;
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAttendanceRepo = createMockAttendanceRepo();
    res = createRes();
    mockGetAuthenticatedUserEmail.mockReturnValue('admin@test.com');
  });

  // -----------------------------------------------------------------------
  // markAttendance
  // -----------------------------------------------------------------------

  describe('markAttendance', () => {
    it('should record attendance and return success', async () => {
      const req = {
        body: {
          registrationId: 'reg1',
          week: '3',
          schoolYear: '2025-2026',
          trimester: 'fall',
        },
        attendanceRepository: mockAttendanceRepo,
      } as any;

      mockAttendanceRepo.hasAttendance.mockResolvedValue(false);
      mockAttendanceRepo.create.mockResolvedValue({
        id: 'att-001',
        registrationId: 'reg1',
        week: 3,
        schoolYear: '2025-2026',
        trimester: 'fall',
        recordedAt: '2025-01-15T10:00:00Z',
      });

      await AttendanceController.markAttendance(req, res);

      expect(mockGetAuthenticatedUserEmail).toHaveBeenCalledWith(req);
      expect(mockAttendanceRepo.hasAttendance).toHaveBeenCalledWith(
        'reg1',
        '3',
        '2025-2026',
        'fall',
      );
      expect(mockAttendanceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          registrationId: 'reg1',
          week: 3,
          schoolYear: '2025-2026',
          trimester: 'fall',
          recordedBy: 'admin@test.com',
        }),
        'admin@test.com',
      );
      expect(mockSuccessResponse).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          id: 'att-001',
          registrationId: 'reg1',
          week: 3,
        }),
        expect.objectContaining({ message: 'Attendance recorded successfully' }),
      );
    });

    it('should call errorResponse when attendance already exists (ConflictError)', async () => {
      const req = {
        body: {
          registrationId: 'reg1',
          week: '3',
          schoolYear: '2025-2026',
          trimester: 'fall',
        },
        attendanceRepository: mockAttendanceRepo,
      } as any;

      mockAttendanceRepo.hasAttendance.mockResolvedValue(true);

      await AttendanceController.markAttendance(req, res);

      expect(mockAttendanceRepo.create).not.toHaveBeenCalled();
      expect(mockErrorResponse).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ name: 'ConflictError' }),
        expect.any(Object),
      );
    });

    it('should call errorResponse when registrationId is missing (ValidationError)', async () => {
      const req = {
        body: { week: '3', schoolYear: '2025-2026', trimester: 'fall' },
        attendanceRepository: mockAttendanceRepo,
      } as any;

      await AttendanceController.markAttendance(req, res);

      expect(mockErrorResponse).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ name: 'ValidationError' }),
        expect.any(Object),
      );
    });

    it('should call errorResponse when week is missing (ValidationError)', async () => {
      const req = {
        body: { registrationId: 'reg1', schoolYear: '2025-2026', trimester: 'fall' },
        attendanceRepository: mockAttendanceRepo,
      } as any;

      await AttendanceController.markAttendance(req, res);

      expect(mockErrorResponse).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ name: 'ValidationError' }),
        expect.any(Object),
      );
    });
  });

  // -----------------------------------------------------------------------
  // getAttendanceSummary
  // -----------------------------------------------------------------------

  describe('getAttendanceSummary', () => {
    it('should return attendance summary for given params', async () => {
      const req = {
        params: { registrationId: 'reg1' },
        query: { schoolYear: '2025-2026', trimester: 'Spring' },
        attendanceRepository: mockAttendanceRepo,
      } as any;

      const summary = { totalWeeks: 12, attended: 8, missed: 4 };
      mockAttendanceRepo.getAttendanceSummary.mockResolvedValue(summary);

      await AttendanceController.getAttendanceSummary(req, res);

      expect(mockAttendanceRepo.getAttendanceSummary).toHaveBeenCalledWith(
        'reg1',
        '2025-2026',
        'Spring',
      );
      expect(mockSuccessResponse).toHaveBeenCalledWith(
        res,
        summary,
        expect.any(Object),
      );
    });

    it('should use default schoolYear and trimester when query params are absent', async () => {
      // These defaults are hardcoded in attendanceController.ts getAttendanceSummary.
      // If the source defaults change, this test should be updated to match.
      const DEFAULT_SCHOOL_YEAR = '2025-2026';
      const DEFAULT_TRIMESTER = 'Fall';

      const req = {
        params: { registrationId: 'reg1' },
        query: {},
        attendanceRepository: mockAttendanceRepo,
      } as any;

      mockAttendanceRepo.getAttendanceSummary.mockResolvedValue({});

      await AttendanceController.getAttendanceSummary(req, res);

      expect(mockAttendanceRepo.getAttendanceSummary).toHaveBeenCalledWith(
        'reg1',
        DEFAULT_SCHOOL_YEAR,
        DEFAULT_TRIMESTER,
      );
    });

    it('should call errorResponse when repository throws', async () => {
      const req = {
        params: { registrationId: 'reg1' },
        query: {},
        attendanceRepository: mockAttendanceRepo,
      } as any;

      mockAttendanceRepo.getAttendanceSummary.mockRejectedValue(
        new Error('DB failure'),
      );

      await AttendanceController.getAttendanceSummary(req, res);

      expect(mockErrorResponse).toHaveBeenCalledWith(
        res,
        expect.any(Error),
        expect.any(Object),
      );
    });
  });
});
