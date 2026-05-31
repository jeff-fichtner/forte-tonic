/**
 * Auth Middleware Unit Tests
 * ===========================
 *
 * Exercises the auth ladder in src/middleware/auth.ts:
 *  - initializeRepositories: extracts the authenticated user from access code
 *    (body / header / query, in priority order), populating req.currentUser.
 *  - requireAuth: returns 401 when req.currentUser is null; otherwise calls next.
 *  - getAuthenticatedUserEmail: returns the current user's email or throws.
 *
 * The ladder logic:
 *  - 10-digit numeric  → parent phone lookup
 *  - 6-digit numeric   → employee access code lookup
 *  - Falls back to the opposite path when the first lookup misses
 *  - The explicit x-login-type header bypasses the format-based auto-detect
 *
 * Per the defer-always policy for this test file: if any test surfaces a
 * surprising behavior (e.g., the loginType header doesn't actually win against
 * the format heuristic), the test pins the actual behavior with a comment
 * rather than asserting the expected behavior.
 *
 * Mocks: serviceContainer (returns a mock userRepository), logger,
 * configurationService. The real Sheets API is never touched.
 */

import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

const mockUserRepository = {
  getParentByPhone: jest.fn(),
  getUserByAccessCode: jest.fn(),
};

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
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

jest.unstable_mockModule('../../../src/infrastructure/container/serviceContainer.js', () => ({
  serviceContainer: {
    get: jest.fn().mockReturnValue(mockUserRepository),
  },
  ServiceKeys: { userRepository: 'userRepository' },
}));

const { initializeRepositories, requireAuth, getAuthenticatedUserEmail } = await import(
  '../../../src/middleware/auth.js'
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createReq(options: {
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  currentUser?: Request['currentUser'];
}): Request {
  return {
    body: options.body ?? {},
    headers: options.headers ?? {},
    query: options.query ?? {},
    currentUser: options.currentUser,
  } as unknown as Request;
}

function createRes(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
}

function createNext(): NextFunction {
  return jest.fn();
}

// ---------------------------------------------------------------------------
// initializeRepositories — the ladder
// ---------------------------------------------------------------------------

describe('initializeRepositories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('access code source priority (body > header > query)', () => {
    test('prefers body.accessCode when all three sources are present', async () => {
      mockUserRepository.getParentByPhone.mockResolvedValue({ id: 'p1', email: 'p1@example.com' });
      const req = createReq({
        body: { accessCode: '1111111111' },
        headers: { 'x-access-code': '2222222222' },
        query: { accessCode: '3333333333' },
      });

      await initializeRepositories(req, createRes(), createNext());

      expect(mockUserRepository.getParentByPhone).toHaveBeenCalledWith('1111111111');
    });

    test('uses x-access-code header when body has no code', async () => {
      mockUserRepository.getParentByPhone.mockResolvedValue({ id: 'p1', email: 'p1@example.com' });
      const req = createReq({
        headers: { 'x-access-code': '2222222222' },
        query: { accessCode: '3333333333' },
      });

      await initializeRepositories(req, createRes(), createNext());

      expect(mockUserRepository.getParentByPhone).toHaveBeenCalledWith('2222222222');
    });

    test('falls back to query.accessCode when body and header are empty', async () => {
      mockUserRepository.getParentByPhone.mockResolvedValue({ id: 'p1', email: 'p1@example.com' });
      const req = createReq({ query: { accessCode: '3333333333' } });

      await initializeRepositories(req, createRes(), createNext());

      expect(mockUserRepository.getParentByPhone).toHaveBeenCalledWith('3333333333');
    });
  });

  describe('format-based auto-detection', () => {
    test('10-digit numeric routes to parent phone lookup', async () => {
      mockUserRepository.getParentByPhone.mockResolvedValue({ id: 'p1', email: 'parent@e.com' });
      const req = createReq({ body: { accessCode: '5551234567' } });
      const next = createNext();

      await initializeRepositories(req, createRes(), next);

      expect(mockUserRepository.getParentByPhone).toHaveBeenCalledWith('5551234567');
      expect(mockUserRepository.getUserByAccessCode).not.toHaveBeenCalled();
      expect(req.currentUser).toMatchObject({
        id: 'p1',
        email: 'parent@e.com',
        accessCode: '5551234567',
        userType: 'parent',
      });
      expect(next).toHaveBeenCalled();
    });

    test('6-digit numeric routes to employee access code lookup', async () => {
      mockUserRepository.getUserByAccessCode.mockResolvedValue({
        user: { id: 'a1', email: 'admin@e.com' },
        userType: 'admin',
      });
      const req = createReq({ body: { accessCode: '123456' } });
      const next = createNext();

      await initializeRepositories(req, createRes(), next);

      expect(mockUserRepository.getUserByAccessCode).toHaveBeenCalledWith('123456');
      expect(mockUserRepository.getParentByPhone).not.toHaveBeenCalled();
      expect(req.currentUser).toMatchObject({
        id: 'a1',
        email: 'admin@e.com',
        userType: 'admin',
      });
      expect(next).toHaveBeenCalled();
    });
  });

  describe('fallback behavior on first-lookup miss', () => {
    // PINNED ACTUAL BEHAVIOR (differs from naive expectation of "fall back to the
    // opposite path"). Tracing the ladder for a 10-digit code with no header
    // and no parent match:
    //   1. First block: isPhoneNumber=true → parent lookup → returns null
    //   2. Second block: !userResult=true, but isAccessCode=false and no EMPLOYEE
    //      header → skipped (employee path is NOT eligible)
    //   3. Fallback block: !userResult=true. The first inner branch is
    //      `isPhoneNumber && loginType !== PARENT`, which is also true → it
    //      RE-TRIES THE PARENT PATH, not the employee path.
    // The "fallback to the opposite path" framing is misleading. The fallback
    // really retries the same path under a different condition. The employee
    // path is only reached for a 10-digit code if the caller sends an explicit
    // x-login-type: employee header.
    test('10-digit code with no parent match: parent lookup is re-tried, employee path NOT reached', async () => {
      mockUserRepository.getParentByPhone.mockResolvedValue(null);
      mockUserRepository.getUserByAccessCode.mockResolvedValue({
        user: { id: 'i1', email: 'instructor@e.com' },
        userType: 'instructor',
      });

      const req = createReq({ body: { accessCode: '5551234567' } });
      await initializeRepositories(req, createRes(), createNext());

      // Parent lookup is called twice (once from the first block, once from the
      // fallback). Employee path is never reached.
      expect(mockUserRepository.getParentByPhone).toHaveBeenCalledTimes(2);
      expect(mockUserRepository.getUserByAccessCode).not.toHaveBeenCalled();
      expect(req.currentUser).toBeNull();
    });

    test('6-digit code with no employee match: employee lookup is re-tried, parent path NOT reached', async () => {
      mockUserRepository.getUserByAccessCode.mockResolvedValue(null);
      mockUserRepository.getParentByPhone.mockResolvedValue({
        id: 'p2',
        email: 'parent2@e.com',
      });

      const req = createReq({ body: { accessCode: '654321' } });
      await initializeRepositories(req, createRes(), createNext());

      // Same shape: employee lookup re-tried, parent path never reached.
      expect(mockUserRepository.getUserByAccessCode).toHaveBeenCalledTimes(2);
      expect(mockUserRepository.getParentByPhone).not.toHaveBeenCalled();
      expect(req.currentUser).toBeNull();
    });
  });

  describe('explicit x-login-type header', () => {
    test('explicit PARENT header routes to parent lookup regardless of format', async () => {
      mockUserRepository.getParentByPhone.mockResolvedValue({ id: 'p1', email: 'p@e.com' });
      // A 6-digit numeric WOULD auto-detect as employee, but the explicit header forces parent path.
      const req = createReq({
        body: { accessCode: '123456' },
        headers: { 'x-login-type': 'parent' },
      });

      await initializeRepositories(req, createRes(), createNext());

      expect(mockUserRepository.getParentByPhone).toHaveBeenCalledWith('123456');
      // Pinned behavior: the explicit header is checked together with the
      // format heuristic via `||`, so a parent-typed 6-digit code IS retried
      // on the employee path on miss (since the format heuristic still
      // applies). See the if/else if structure in extractAuthenticatedUser.
    });

    test('PINNED: explicit EMPLOYEE header on a 10-digit code does NOT skip the parent path', async () => {
      // The explicit header makes the employee path ELIGIBLE in the second
      // block, but the format heuristic still fires the parent lookup first
      // (because `isPhoneNumber=true` satisfies the first block's `||`). If the
      // parent lookup returns a user, the employee path never runs.
      // This is likely surprising behavior — a caller sending an explicit
      // x-login-type: employee header probably expects to bypass parent
      // lookup entirely. The auth ladder doesn't do that.
      mockUserRepository.getParentByPhone.mockResolvedValue({
        id: 'p1',
        email: 'parent@e.com',
      });
      const req = createReq({
        body: { accessCode: '5551234567' },
        headers: { 'x-login-type': 'employee' },
      });

      await initializeRepositories(req, createRes(), createNext());

      expect(mockUserRepository.getParentByPhone).toHaveBeenCalledWith('5551234567');
      // Pinned: even with the explicit employee header, a 10-digit code that
      // matches a parent gets the PARENT identity.
      expect(req.currentUser).toMatchObject({ userType: 'parent' });
    });

    test('PINNED: explicit EMPLOYEE header on a 10-digit code, parent miss: employee path THEN runs', async () => {
      // Continuation of the above: when the parent lookup misses, the second
      // block's eligibility check (`isAccessCode || loginType === EMPLOYEE`)
      // succeeds via the explicit header, so the employee lookup runs.
      mockUserRepository.getParentByPhone.mockResolvedValue(null);
      mockUserRepository.getUserByAccessCode.mockResolvedValue({
        user: { id: 'a1', email: 'admin@e.com' },
        userType: 'admin',
      });
      const req = createReq({
        body: { accessCode: '5551234567' },
        headers: { 'x-login-type': 'employee' },
      });

      await initializeRepositories(req, createRes(), createNext());

      expect(mockUserRepository.getParentByPhone).toHaveBeenCalledWith('5551234567');
      expect(mockUserRepository.getUserByAccessCode).toHaveBeenCalledWith('5551234567');
      expect(req.currentUser).toMatchObject({ userType: 'admin' });
    });
  });

  describe('miss cases', () => {
    test('no access code anywhere → req.currentUser is null', async () => {
      const req = createReq({});
      const next = createNext();

      await initializeRepositories(req, createRes(), next);

      expect(req.currentUser).toBeNull();
      expect(next).toHaveBeenCalled();
      expect(mockUserRepository.getParentByPhone).not.toHaveBeenCalled();
      expect(mockUserRepository.getUserByAccessCode).not.toHaveBeenCalled();
    });

    test('valid-format access code that matches nothing → req.currentUser is null', async () => {
      mockUserRepository.getParentByPhone.mockResolvedValue(null);
      mockUserRepository.getUserByAccessCode.mockResolvedValue(null);

      const req = createReq({ body: { accessCode: '5551234567' } });
      const next = createNext();

      await initializeRepositories(req, createRes(), next);

      expect(req.currentUser).toBeNull();
      expect(next).toHaveBeenCalled();
    });

    test('malformed access code (not 6 or 10 digits) → req.currentUser is null', async () => {
      const req = createReq({ body: { accessCode: '12345' } });
      const next = createNext();

      await initializeRepositories(req, createRes(), next);

      expect(req.currentUser).toBeNull();
      expect(next).toHaveBeenCalled();
      // Neither lookup path is eligible — format doesn't match and there's no header override.
      expect(mockUserRepository.getParentByPhone).not.toHaveBeenCalled();
      expect(mockUserRepository.getUserByAccessCode).not.toHaveBeenCalled();
    });

    test('repository throws → req.currentUser is null and next still runs', async () => {
      mockUserRepository.getParentByPhone.mockRejectedValue(new Error('Sheets down'));

      const req = createReq({ body: { accessCode: '5551234567' } });
      const next = createNext();

      await initializeRepositories(req, createRes(), next);

      expect(req.currentUser).toBeNull();
      expect(next).toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// requireAuth
// ---------------------------------------------------------------------------

describe('requireAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('passes through when req.currentUser is populated', () => {
    const req = createReq({
      currentUser: { id: 'u1', email: 'u@e.com', accessCode: '123456', userType: 'admin' },
    });
    const res = createRes();
    const next = createNext();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('returns 401 with the standard envelope when req.currentUser is null', () => {
    const req = createReq({ currentUser: null });
    const res = createRes();
    const next = createNext();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: expect.any(String),
          type: expect.any(String),
          message: expect.stringMatching(/authentication/i),
        }),
      })
    );
  });

  test('returns 401 when req.currentUser is undefined', () => {
    const req = createReq({});
    const res = createRes();
    const next = createNext();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// ---------------------------------------------------------------------------
// getAuthenticatedUserEmail
// ---------------------------------------------------------------------------

describe('getAuthenticatedUserEmail', () => {
  test('returns the email when req.currentUser has one', () => {
    const req = createReq({
      currentUser: {
        id: 'u1',
        email: 'me@example.com',
        accessCode: '123456',
        userType: 'admin',
      },
    });

    expect(getAuthenticatedUserEmail(req)).toBe('me@example.com');
  });

  test('throws UnauthorizedError when no current user', () => {
    const req = createReq({ currentUser: null });

    expect(() => getAuthenticatedUserEmail(req)).toThrow(/authentication required/i);
  });

  test('throws when current user exists but email is empty', () => {
    const req = createReq({
      currentUser: { id: 'u1', email: '', accessCode: '123456', userType: 'admin' },
    });

    expect(() => getAuthenticatedUserEmail(req)).toThrow(/authentication required/i);
  });
});
