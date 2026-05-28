/**
 * System Controller Tests (T013)
 * ================================
 *
 * Tests for SystemController static methods:
 * - getHealth: returns health status, environment, version, and features
 * - clearCache: admin-only cache clearing via service container
 */

import { jest } from '@jest/globals';

// ---------------------------------------------------------------------------
// Module mocks (must precede dynamic import of the controller)
// ---------------------------------------------------------------------------

const mockUserRepository = {
  getAdminByAccessCode: jest.fn(),
};

const mockDatabaseClient = {
  clearAllCache: jest.fn(),
};

const mockCacheService = {
  clear: jest.fn(),
};

jest.unstable_mockModule('../../../src/infrastructure/container/serviceContainer.js', () => ({
  ServiceKeys: {
    databaseClient: 'databaseClient',
    emailClient: 'emailClient',
    cacheService: 'cacheService',
    configurationService: 'configurationService',
    registrationRepository: 'registrationRepository',
    userRepository: 'userRepository',
    programRepository: 'programRepository',
    attendanceRepository: 'attendanceRepository',
    dropRequestRepository: 'dropRequestRepository',
    periodRepository: 'periodRepository',
    registrationService: 'registrationService',
    periodService: 'periodService',
    dropRequestService: 'dropRequestService',
    entityQueryService: 'entityQueryService',
  },
  serviceContainer: {
    get: jest.fn().mockImplementation(name => {
      const services = {
        userRepository: mockUserRepository,
        databaseClient: mockDatabaseClient,
        cacheService: mockCacheService,
      };
      return services[name] ?? null;
    }),
  },
}));

jest.unstable_mockModule('../../../src/services/configurationService.js', () => ({
  configService: {
    getServerConfig: jest.fn().mockReturnValue({ nodeEnv: 'test' }),
  },
}));

jest.unstable_mockModule('../../../src/config/environment.js', () => ({
  currentConfig: {
    baseUrl: 'http://localhost:3000',
    spreadsheetId: 'test-sheet',
  },
  isProduction: false,
  isStaging: false,
  version: {
    number: '1.0.0',
    buildDate: '2025-01-01',
    gitCommit: 'abc1234',
    environment: 'test',
  },
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
}));

jest.unstable_mockModule('../../../src/common/errorConstants.js', () => ({
  HTTP_STATUS: { OK: 200 },
}));

jest.unstable_mockModule('../../../src/common/errors.js', () => ({
  ValidationError: class ValidationError extends Error {
    statusCode = 400;
    constructor(m) {
      super(m);
      this.name = 'ValidationError';
    }
  },
  ForbiddenError: class ForbiddenError extends Error {
    statusCode = 403;
    constructor(m) {
      super(m);
      this.name = 'ForbiddenError';
    }
  },
}));

// Import controller after all mocks are wired
const { SystemController } = await import('../../../src/controllers/systemController.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SystemController', () => {
  let res: ReturnType<typeof createRes>;

  beforeEach(() => {
    jest.clearAllMocks();
    res = createRes();
  });

  // -----------------------------------------------------------------------
  // getHealth
  // -----------------------------------------------------------------------

  describe('getHealth', () => {
    it('should return healthy status with environment, version, and features', async () => {
      const req = {} as unknown;

      await SystemController.getHealth(req, res);

      expect(mockSuccessResponse).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          status: 'healthy',
          version: '1.0.0',
          baseUrl: 'http://localhost:3000',
          versionInfo: expect.objectContaining({
            buildDate: '2025-01-01',
            gitCommit: 'abc1234',
            environment: 'test',
          }),
          features: expect.objectContaining({
            isProduction: false,
            isStaging: false,
            dataStoreConfigured: true,
          }),
        }),
        expect.any(Object)
      );
    });
  });

  // -----------------------------------------------------------------------
  // clearCache
  // -----------------------------------------------------------------------

  describe('clearCache', () => {
    it('should clear cache when a valid admin code is provided', async () => {
      const req = { currentUser: { accessCode: '123456' } } as unknown;

      mockUserRepository.getAdminByAccessCode.mockResolvedValue({
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
      });

      await SystemController.clearCache(req, res);

      expect(mockUserRepository.getAdminByAccessCode).toHaveBeenCalledWith('123456');
      expect(mockCacheService.clear).toHaveBeenCalled();
      expect(mockSuccessResponse).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          message: 'All caches cleared successfully',
          clearedBy: 'admin@test.com',
        }),
        expect.any(Object)
      );
    });

    it('should call errorResponse with ForbiddenError for non-admin access code', async () => {
      // 403 (not 401): the caller is authenticated; they just aren't an admin.
      // A 401 would force the frontend to log them out — which is wrong for a
      // role-based denial.
      const req = { currentUser: { accessCode: 'wrong-code' } } as unknown;

      mockUserRepository.getAdminByAccessCode.mockResolvedValue(null);

      await SystemController.clearCache(req, res);

      expect(mockErrorResponse).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ name: 'ForbiddenError' }),
        expect.any(Object)
      );
    });

    it('should call errorResponse with ValidationError when currentUser is missing', async () => {
      const req = { currentUser: null } as unknown;

      await SystemController.clearCache(req, res);

      expect(mockErrorResponse).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ name: 'ValidationError' }),
        expect.any(Object)
      );
    });

    it('should succeed even when cacheService lacks clear method', async () => {
      const req = { currentUser: { accessCode: '123456' } } as unknown;

      mockUserRepository.getAdminByAccessCode.mockResolvedValue({
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
      });

      // Temporarily replace clear with a non-function to simulate
      // a cacheService that does not support clearing
      const original = mockCacheService.clear;
      (mockCacheService as unknown as Record<string, unknown>).clear = undefined;

      await SystemController.clearCache(req, res);

      expect(mockSuccessResponse).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          message: 'All caches cleared successfully',
          clearedBy: 'admin@test.com',
        }),
        expect.any(Object)
      );

      // Restore for other tests
      mockCacheService.clear = original;
    });

    it('should use firstName + lastName as clearedBy when email is absent', async () => {
      const req = { currentUser: { accessCode: '123456' } } as unknown;

      mockUserRepository.getAdminByAccessCode.mockResolvedValue({
        email: '',
        firstName: 'Admin',
        lastName: 'User',
      });

      await SystemController.clearCache(req, res);

      expect(mockSuccessResponse).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          clearedBy: 'Admin User',
        }),
        expect.any(Object)
      );
    });
  });
});
