import { jest } from '@jest/globals';

// ---------------------------------------------------------------------------
// Mock service container
// ---------------------------------------------------------------------------
const mockPeriodService = {
  getCurrentPeriod: jest.fn(),
  getNextPeriod: jest.fn(),
};

const mockUserRepository = {
  getAdmins: jest.fn(),
  getInstructors: jest.fn(),
  getStudents: jest.fn(),
  getAdminByAccessCode: jest.fn(),
  getInstructorByAccessCode: jest.fn(),
  getParentByAccessCode: jest.fn(),
  getParentByPhone: jest.fn(),
};

const mockEntityQueryService = {
  getAdmins: jest.fn(),
  getInstructors: jest.fn(),
  getStudents: jest.fn(),
  getRegistrations: jest.fn(),
};

jest.unstable_mockModule('../../../src/infrastructure/container/serviceContainer.js', () => ({
  serviceContainer: {
    get: jest.fn().mockImplementation((name: string) => {
      const services: Record<string, unknown> = {
        periodService: mockPeriodService,
        userRepository: mockUserRepository,
        entityQueryService: mockEntityQueryService,
      };
      return services[name] ?? null;
    }),
  },
}));

// ---------------------------------------------------------------------------
// Mock configService
// ---------------------------------------------------------------------------
const mockConfigService = {
  getRockBandClassIds: jest.fn().mockReturnValue(['G015']),
  getApplicationConfig: jest.fn().mockReturnValue({
    maintenanceMode: false,
    maintenanceMessage: 'System maintenance',
  }),
};

jest.unstable_mockModule('../../../src/services/configurationService.js', () => ({
  configService: mockConfigService,
}));

// ---------------------------------------------------------------------------
// Mock response helpers
// ---------------------------------------------------------------------------
const mockSuccessResponse = jest.fn();
const mockErrorResponse = jest.fn();

jest.unstable_mockModule('../../../src/common/responseHelpers.js', () => ({
  successResponse: mockSuccessResponse,
  errorResponse: mockErrorResponse,
  asString: jest.fn((v: unknown) => {
    if (Array.isArray(v)) return String(v[0] ?? '');
    if (typeof v === 'string') return v;
    if (v === null || v === undefined) return '';
    return String(v);
  }),
}));

// ---------------------------------------------------------------------------
// Mock logger
// ---------------------------------------------------------------------------
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  getLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Mock errors
// ---------------------------------------------------------------------------
jest.unstable_mockModule('../../../src/common/errors.js', () => ({
  ValidationError: class ValidationError extends Error {
    statusCode = 400;
    constructor(msg: string) {
      super(msg);
      this.name = 'ValidationError';
    }
  },
  NotFoundError: class NotFoundError extends Error {
    statusCode = 404;
    constructor(msg: string) {
      super(msg);
      this.name = 'NotFoundError';
    }
  },
}));

// ---------------------------------------------------------------------------
// Mock AppConfigurationResponse - pass through data for easy assertion
// ---------------------------------------------------------------------------
jest.unstable_mockModule(
  '../../../src/models/shared/responses/appConfigurationResponse.js',
  () => ({
    AppConfigurationResponse: class {
      data: unknown;
      constructor(data: unknown) {
        this.data = data;
      }
      toJSON() {
        return this.data;
      }
    },
  })
);

// ---------------------------------------------------------------------------
// Mock AuthenticatedUserResponse
// ---------------------------------------------------------------------------
jest.unstable_mockModule(
  '../../../src/models/shared/responses/authenticatedUserResponse.js',
  () => ({
    AuthenticatedUserResponse: class {
      email: string;
      admin: unknown;
      instructor: unknown;
      parent: unknown;
      constructor(data: {
        email: string;
        admin?: unknown;
        instructor?: unknown;
        parent?: unknown;
      }) {
        this.email = data.email;
        this.admin = data.admin;
        this.instructor = data.instructor;
        this.parent = data.parent;
      }
    },
  })
);

// ---------------------------------------------------------------------------
// Import real enums (plain objects, safe to import before module load)
// ---------------------------------------------------------------------------
const { PeriodType } = await import('../../../src/utils/values/periodType.js');
const { Trimester } = await import('../../../src/utils/values/trimester.js');

// ---------------------------------------------------------------------------
// Import the controller AFTER all mocks are wired
// ---------------------------------------------------------------------------
const { UserController } = await import(
  '../../../src/controllers/userController.js'
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createMockReqRes(overrides: Record<string, unknown> = {}) {
  const req = { body: {}, params: {}, query: {}, ...overrides } as any;
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
  return { req, res };
}

function makePeriod(trimester: string, periodType: string) {
  return { trimester, periodType, startDate: '2025-01-01' };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('UserController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // T009 - getAppConfiguration
  // =========================================================================
  describe('getAppConfiguration', () => {
    function setupPeriods(
      current: { trimester: string; periodType: string } | null,
      next: { trimester: string; periodType: string } | null = null
    ) {
      mockPeriodService.getCurrentPeriod.mockResolvedValue(
        current ? makePeriod(current.trimester, current.periodType) : null
      );
      mockPeriodService.getNextPeriod.mockResolvedValue(
        next ? makePeriod(next.trimester, next.periodType) : null
      );
    }

    function getConfigData(): Record<string, unknown> {
      // The controller calls successResponse(res, configuration.toJSON(), ...).
      // Our mock AppConfigurationResponse.toJSON() returns the raw data object,
      // so the second arg to successResponse IS the config data directly.
      return mockSuccessResponse.mock.calls[0][1] as Record<string, unknown>;
    }

    it('should return [spring, fall] for fall intent period', async () => {
      setupPeriods({ trimester: Trimester.FALL, periodType: PeriodType.INTENT });
      const { req, res } = createMockReqRes();

      await UserController.getAppConfiguration(req, res);

      expect(mockSuccessResponse).toHaveBeenCalledTimes(1);
      const data = getConfigData();
      expect(data.availableTrimesters).toEqual([Trimester.SPRING, Trimester.FALL]);
    });

    it('should return [fall, winter] for fall priority enrollment', async () => {
      setupPeriods({
        trimester: Trimester.FALL,
        periodType: PeriodType.PRIORITY_ENROLLMENT,
      });
      const { req, res } = createMockReqRes();

      await UserController.getAppConfiguration(req, res);

      const data = getConfigData();
      expect(data.availableTrimesters).toEqual([Trimester.FALL, Trimester.WINTER]);
    });

    it('should return [fall, winter] for fall open enrollment', async () => {
      setupPeriods({
        trimester: Trimester.FALL,
        periodType: PeriodType.OPEN_ENROLLMENT,
      });
      const { req, res } = createMockReqRes();

      await UserController.getAppConfiguration(req, res);

      const data = getConfigData();
      expect(data.availableTrimesters).toEqual([Trimester.FALL, Trimester.WINTER]);
    });

    it('should return [fall, winter] for fall registration', async () => {
      setupPeriods({
        trimester: Trimester.FALL,
        periodType: PeriodType.REGISTRATION,
      });
      const { req, res } = createMockReqRes();

      await UserController.getAppConfiguration(req, res);

      const data = getConfigData();
      expect(data.availableTrimesters).toEqual([Trimester.FALL, Trimester.WINTER]);
    });

    it('should return [fall, winter] for winter intent period', async () => {
      setupPeriods({
        trimester: Trimester.WINTER,
        periodType: PeriodType.INTENT,
      });
      const { req, res } = createMockReqRes();

      await UserController.getAppConfiguration(req, res);

      const data = getConfigData();
      expect(data.availableTrimesters).toEqual([Trimester.FALL, Trimester.WINTER]);
    });

    it('should return [winter, spring] for winter priority enrollment', async () => {
      setupPeriods({
        trimester: Trimester.WINTER,
        periodType: PeriodType.PRIORITY_ENROLLMENT,
      });
      const { req, res } = createMockReqRes();

      await UserController.getAppConfiguration(req, res);

      const data = getConfigData();
      expect(data.availableTrimesters).toEqual([
        Trimester.WINTER,
        Trimester.SPRING,
      ]);
    });

    it('should return [spring, fall] for spring priority enrollment', async () => {
      setupPeriods({
        trimester: Trimester.SPRING,
        periodType: PeriodType.PRIORITY_ENROLLMENT,
      });
      const { req, res } = createMockReqRes();

      await UserController.getAppConfiguration(req, res);

      const data = getConfigData();
      expect(data.availableTrimesters).toEqual([Trimester.SPRING, Trimester.FALL]);
    });

    it('should return [fall] when no period is configured', async () => {
      setupPeriods(null);
      const { req, res } = createMockReqRes();

      await UserController.getAppConfiguration(req, res);

      const data = getConfigData();
      expect(data.availableTrimesters).toEqual([Trimester.FALL]);
    });

    it('should derive nextTrimester from _getNextTrimester, not from next period', async () => {
      // Current is fall intent, next period is also fall (open enrollment).
      // nextTrimester should still be winter (from the cyclic sequence).
      setupPeriods(
        { trimester: Trimester.FALL, periodType: PeriodType.INTENT },
        { trimester: Trimester.FALL, periodType: PeriodType.OPEN_ENROLLMENT }
      );
      const { req, res } = createMockReqRes();

      await UserController.getAppConfiguration(req, res);

      const data = getConfigData();
      expect(data.nextTrimester).toBe(Trimester.WINTER);
    });
  });

  // =========================================================================
  // T010 - authenticateByAccessCode
  // =========================================================================
  describe('authenticateByAccessCode', () => {
    it('should find parent by 10-digit phone number', async () => {
      const parentObj = { email: 'parent@test.com', id: 'p1' };
      mockUserRepository.getParentByPhone.mockResolvedValue(parentObj);

      const { req, res } = createMockReqRes({
        body: { accessCode: '5551234567', loginType: 'parent' },
      });

      await UserController.authenticateByAccessCode(req, res);

      expect(mockUserRepository.getParentByPhone).toHaveBeenCalledWith(
        '5551234567'
      );
      expect(mockSuccessResponse).toHaveBeenCalledTimes(1);
      const responseData = mockSuccessResponse.mock.calls[0][1] as {
        email: string;
        parent: unknown;
      };
      expect(responseData.email).toBe('parent@test.com');
      expect(responseData.parent).toBe(parentObj);
    });

    it('should find admin by 6-digit access code', async () => {
      const adminObj = { email: 'admin@test.com', id: 'a1' };
      mockUserRepository.getAdminByAccessCode.mockResolvedValue(adminObj);

      const { req, res } = createMockReqRes({
        body: { accessCode: '123456', loginType: 'employee' },
      });

      await UserController.authenticateByAccessCode(req, res);

      expect(mockUserRepository.getAdminByAccessCode).toHaveBeenCalledWith(
        '123456'
      );
      expect(mockSuccessResponse).toHaveBeenCalledTimes(1);
      const responseData = mockSuccessResponse.mock.calls[0][1] as {
        email: string;
        admin: unknown;
      };
      expect(responseData.email).toBe('admin@test.com');
      expect(responseData.admin).toBe(adminObj);
    });

    it('should fall through to instructor when admin not found with 6-digit code', async () => {
      const instructorObj = { email: 'instructor@test.com', id: 'i1' };
      mockUserRepository.getAdminByAccessCode.mockResolvedValue(null);
      mockUserRepository.getInstructorByAccessCode.mockResolvedValue(
        instructorObj
      );

      const { req, res } = createMockReqRes({
        body: { accessCode: '654321', loginType: 'employee' },
      });

      await UserController.authenticateByAccessCode(req, res);

      expect(mockUserRepository.getAdminByAccessCode).toHaveBeenCalledWith(
        '654321'
      );
      expect(
        mockUserRepository.getInstructorByAccessCode
      ).toHaveBeenCalledWith('654321');
      expect(mockSuccessResponse).toHaveBeenCalledTimes(1);
      const responseData = mockSuccessResponse.mock.calls[0][1] as {
        email: string;
        instructor: unknown;
      };
      expect(responseData.email).toBe('instructor@test.com');
      expect(responseData.instructor).toBe(instructorObj);
    });

    it('should return null data when no match is found', async () => {
      mockUserRepository.getAdminByAccessCode.mockResolvedValue(null);
      mockUserRepository.getInstructorByAccessCode.mockResolvedValue(null);
      mockUserRepository.getParentByPhone.mockResolvedValue(null);

      const { req, res } = createMockReqRes({
        body: { accessCode: '999999', loginType: 'employee' },
      });

      await UserController.authenticateByAccessCode(req, res);

      expect(mockSuccessResponse).toHaveBeenCalledTimes(1);
      expect(mockSuccessResponse.mock.calls[0][1]).toBeNull();
    });
  });

  // =========================================================================
  // T011 - Other endpoints
  // =========================================================================
  describe('getAdminByAccessCode', () => {
    it('should return admin when found', async () => {
      const adminObj = { id: 'a1', email: 'admin@test.com' };
      mockUserRepository.getAdminByAccessCode.mockResolvedValue(adminObj);

      const { req, res } = createMockReqRes({
        params: { accessCode: '111111' },
      });

      await UserController.getAdminByAccessCode(req, res);

      expect(mockSuccessResponse).toHaveBeenCalledTimes(1);
      expect(mockSuccessResponse.mock.calls[0][1]).toBe(adminObj);
    });

    it('should call errorResponse when admin not found', async () => {
      mockUserRepository.getAdminByAccessCode.mockResolvedValue(null);

      const { req, res } = createMockReqRes({
        params: { accessCode: '000000' },
      });

      await UserController.getAdminByAccessCode(req, res);

      expect(mockErrorResponse).toHaveBeenCalledTimes(1);
      const errorArg = mockErrorResponse.mock.calls[0][1] as Error;
      expect(errorArg.name).toBe('NotFoundError');
      expect(errorArg.message).toMatch(/admin not found/i);
    });
  });

  describe('getInstructorByAccessCode', () => {
    it('should return instructor when found', async () => {
      const instructorObj = { id: 'i1', email: 'inst@test.com' };
      mockUserRepository.getInstructorByAccessCode.mockResolvedValue(
        instructorObj
      );

      const { req, res } = createMockReqRes({
        params: { accessCode: '222222' },
      });

      await UserController.getInstructorByAccessCode(req, res);

      expect(mockSuccessResponse).toHaveBeenCalledTimes(1);
      expect(mockSuccessResponse.mock.calls[0][1]).toBe(instructorObj);
    });
  });

  describe('getParentByAccessCode', () => {
    it('should return parent when found', async () => {
      const parentObj = { id: 'p1', email: 'parent@test.com' };
      mockUserRepository.getParentByAccessCode.mockResolvedValue(parentObj);

      const { req, res } = createMockReqRes({
        params: { accessCode: '333333' },
      });

      await UserController.getParentByAccessCode(req, res);

      expect(mockSuccessResponse).toHaveBeenCalledTimes(1);
      expect(mockSuccessResponse.mock.calls[0][1]).toBe(parentObj);
    });
  });

  describe('getAdmins', () => {
    it('should return all admins', async () => {
      const admins = [
        { id: 'a1', email: 'admin1@test.com' },
        { id: 'a2', email: 'admin2@test.com' },
      ];
      mockUserRepository.getAdmins.mockResolvedValue(admins);

      const { req, res } = createMockReqRes();

      await UserController.getAdmins(req, res);

      expect(mockSuccessResponse).toHaveBeenCalledTimes(1);
      expect(mockSuccessResponse.mock.calls[0][1]).toBe(admins);
    });
  });

  describe('getInstructorDirectoryTabData', () => {
    it('should return admins and instructors via entityQueryService', async () => {
      const admins = [{ id: 'a1' }];
      const instructors = [{ id: 'i1' }, { id: 'i2' }];
      mockEntityQueryService.getAdmins.mockResolvedValue(admins);
      mockEntityQueryService.getInstructors.mockResolvedValue(instructors);

      const { req, res } = createMockReqRes();

      await UserController.getInstructorDirectoryTabData(req, res);

      expect(mockEntityQueryService.getAdmins).toHaveBeenCalledTimes(1);
      expect(mockEntityQueryService.getInstructors).toHaveBeenCalledTimes(1);
      expect(mockSuccessResponse).toHaveBeenCalledTimes(1);

      const responseData = mockSuccessResponse.mock.calls[0][1] as {
        admins: unknown[];
        instructors: unknown[];
      };
      expect(responseData.admins).toBe(admins);
      expect(responseData.instructors).toBe(instructors);
    });
  });

  describe('getParentContactTabData', () => {
    it('should return scoped instructors for a parent', async () => {
      const parentStudents = [
        { id: 's1', firstName: 'Alice' },
        { id: 's2', firstName: 'Bob' },
      ];
      const registrations = [
        { id: 'r1', studentId: 's1', instructorId: 'i1' },
        { id: 'r2', studentId: 's2', instructorId: 'i2' },
        { id: 'r3', studentId: 's1', instructorId: 'i1' }, // duplicate instructorId
      ];
      const scopedInstructors = [{ id: 'i1' }, { id: 'i2' }];
      const admins = [{ id: 'a1' }];

      mockEntityQueryService.getStudents.mockResolvedValue(parentStudents);
      mockEntityQueryService.getRegistrations.mockResolvedValue(registrations);
      mockEntityQueryService.getInstructors.mockResolvedValue(
        scopedInstructors
      );
      mockEntityQueryService.getAdmins.mockResolvedValue(admins);

      const { req, res } = createMockReqRes({
        query: { parentId: 'p1' },
        params: { trimester: 'fall' },
      });

      await UserController.getParentContactTabData(req, res);

      // Verify students were fetched for the parent
      expect(mockEntityQueryService.getStudents).toHaveBeenCalledWith({
        parentId: 'p1',
      });

      // Verify registrations scoped to student IDs and trimester
      expect(mockEntityQueryService.getRegistrations).toHaveBeenCalledWith({
        trimester: 'fall',
        studentIds: ['s1', 's2'],
      });

      // Verify instructors fetched by de-duplicated IDs
      expect(mockEntityQueryService.getInstructors).toHaveBeenCalledWith({
        instructorIds: ['i1', 'i2'],
      });

      expect(mockSuccessResponse).toHaveBeenCalledTimes(1);
      const responseData = mockSuccessResponse.mock.calls[0][1] as {
        admins: unknown[];
        instructors: unknown[];
      };
      expect(responseData.admins).toBe(admins);
      expect(responseData.instructors).toBe(scopedInstructors);
    });

    it('should return 400 error when parentId is missing', async () => {
      const { req, res } = createMockReqRes({
        query: {},
        params: { trimester: 'fall' },
      });

      await UserController.getParentContactTabData(req, res);

      expect(mockErrorResponse).toHaveBeenCalledTimes(1);
      const errorArg = mockErrorResponse.mock.calls[0][1] as Error;
      expect(errorArg.message).toMatch(/parent id is required/i);
      // Fourth positional arg is the fallback status code
      expect(mockErrorResponse.mock.calls[0][3]).toBe(400);
    });
  });
});
