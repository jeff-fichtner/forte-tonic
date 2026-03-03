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
  UnauthorizedError: class UnauthorizedError extends Error {
    statusCode = 401;
    constructor(m) {
      super(m);
      this.name = 'UnauthorizedError';
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
            spreadsheetConfigured: true,
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
      expect(mockDatabaseClient.clearAllCache).toHaveBeenCalled();
      expect(mockSuccessResponse).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          message: 'All caches cleared successfully',
          clearedBy: 'admin@test.com',
        }),
        expect.any(Object)
      );
    });

    it('should call errorResponse with UnauthorizedError for non-admin access code', async () => {
      const req = { currentUser: { accessCode: 'wrong-code' } } as unknown;

      mockUserRepository.getAdminByAccessCode.mockResolvedValue(null);

      await SystemController.clearCache(req, res);

      expect(mockErrorResponse).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ name: 'UnauthorizedError' }),
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

    it('should succeed even when databaseClient lacks clearAllCache method', async () => {
      const req = { currentUser: { accessCode: '123456' } } as unknown;

      mockUserRepository.getAdminByAccessCode.mockResolvedValue({
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
      });

      // Temporarily replace clearAllCache with a non-function to simulate
      // a dbClient that does not support cache clearing
      const original = mockDatabaseClient.clearAllCache;
      (mockDatabaseClient as unknown as Record<string, unknown>).clearAllCache = undefined;

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
      mockDatabaseClient.clearAllCache = original;
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
