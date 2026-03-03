/**
 * @jest-environment jsdom
 *
 * Registration Service Unit Tests
 * ================================
 *
 * Tests for the RegistrationService static methods extracted from the viewModel
 * (009-frontend-decomposition, Step US3).
 *
 * Covers delete-then-create replacement flow, response enrichment, delete with
 * confirmation, and intent submission. All registrations use a single endpoint;
 * trimester is always required.
 *
 * All external dependencies (HttpService, Registration model, window globals)
 * are mocked so the service logic is tested in isolation.
 */

import { jest } from '@jest/globals';

// ---------------------------------------------------------------------------
// Mock state — referenced by both mock factories and test assertions
// ---------------------------------------------------------------------------

const mockHttpPost = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockHttpDelete = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockHttpPatch = jest.fn<(...args: unknown[]) => Promise<unknown>>();

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing the module under test
// ---------------------------------------------------------------------------

jest.unstable_mockModule('../../../src/web/js/data/httpService.js', () => ({
  HttpService: {
    post: mockHttpPost,
    delete: mockHttpDelete,
    patch: mockHttpPatch,
  },
}));

const mockGetCurrentPeriod = jest.fn<() => unknown>();

jest.unstable_mockModule('../../../src/web/js/auth/session.js', () => ({
  UserSession: {
    getCurrentPeriod: mockGetCurrentPeriod,
  },
}));

jest.unstable_mockModule('../../../src/web/js/constants.js', () => ({
  ServerFunctions: {
    register: 'registrations',
  },
}));

// Registration constructor mock — returns a plain object with the data passed
// plus predictable studentId/instructorId for enrichment testing.
jest.unstable_mockModule('../../../src/models/shared/index.js', () => ({
  Registration: jest.fn((data: Record<string, unknown>) => ({
    ...data,
    studentId: data.studentId ?? 'stu-1',
    instructorId: data.instructorId ?? 'inst-1',
  })),
}));

// ---------------------------------------------------------------------------
// Dynamic import — required after jest.unstable_mockModule with ESM
// ---------------------------------------------------------------------------

const { RegistrationService } = await import('../../../src/web/js/data/registrationService.js');

// ---------------------------------------------------------------------------
// Global stubs (window.confirm, M.toast)
// ---------------------------------------------------------------------------

const mockConfirm = jest.fn<(message?: string) => boolean>();
const mockToast = jest.fn();

beforeEach(() => {
  // Reset all mock state before each test
  jest.clearAllMocks();

  // window.confirm
  (globalThis as Record<string, unknown>).confirm = mockConfirm;

  // Materialize toast
  (globalThis as Record<string, unknown>).M = { toast: mockToast };

  mockGetCurrentPeriod.mockReturnValue(undefined);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal registration-like response from HttpService.post */
function makeApiResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'reg-new',
    studentId: 'stu-1',
    instructorId: 'inst-1',
    day: 'Monday',
    startTime: '09:00',
    length: 30,
    registrationType: 'private',
    ...overrides,
  };
}

// ===========================================================================
// Tests
// ===========================================================================

// ---------------------------------------------------------------------------
// 1. create() — always uses single endpoint
// ---------------------------------------------------------------------------
describe('RegistrationService.create()', () => {
  describe('endpoint routing', () => {
    test('always uses registrations endpoint', async () => {
      mockHttpPost.mockResolvedValue({ ok: true, data: makeApiResponse() });

      await RegistrationService.create({ trimester: 'Spring' });

      expect(mockHttpPost).toHaveBeenCalledWith('registrations', expect.any(Object));
    });

    test('passes trimester through to the endpoint', async () => {
      mockHttpPost.mockResolvedValue({ ok: true, data: makeApiResponse() });

      await RegistrationService.create({ trimester: 'winter' });

      expect(mockHttpPost).toHaveBeenCalledWith(
        'registrations',
        expect.objectContaining({ trimester: 'winter' })
      );
    });
  });

  // -------------------------------------------------------------------------
  // 2. create() — replacement flow
  // -------------------------------------------------------------------------
  describe('replacement flow', () => {
    test('deletes old registration before creating new one when replaceRegistrationId is set', async () => {
      mockHttpDelete.mockResolvedValue({ ok: true, data: undefined });
      mockHttpPost.mockResolvedValue({ ok: true, data: makeApiResponse() });

      await RegistrationService.create({
        trimester: 'Fall',
        replaceRegistrationId: 'old-reg-1',
      });

      expect(mockHttpDelete).toHaveBeenCalledWith('registrations/Fall/old-reg-1');
      expect(mockHttpPost).toHaveBeenCalled();
    });

    test('always uses trimester-based delete endpoint', async () => {
      mockHttpDelete.mockResolvedValue({ ok: true, data: undefined });
      mockHttpPost.mockResolvedValue({ ok: true, data: makeApiResponse() });

      await RegistrationService.create({
        trimester: 'Spring',
        replaceRegistrationId: 'old-reg-2',
      });

      expect(mockHttpDelete).toHaveBeenCalledWith('registrations/Spring/old-reg-2');
    });

    test('returns error and does not create new registration when delete fails', async () => {
      mockHttpDelete.mockResolvedValue({
        ok: false,
        error: { message: 'delete failed' },
      });

      const result = await RegistrationService.create({
        trimester: 'Fall',
        replaceRegistrationId: 'old-reg-4',
      });

      expect(result).toEqual({
        ok: false,
        error: { message: 'Failed to delete old registration: delete failed' },
      });
      expect(mockHttpPost).not.toHaveBeenCalled();
    });

    test('strips replaceRegistrationId from data before POST', async () => {
      mockHttpDelete.mockResolvedValue({ ok: true, data: undefined });
      mockHttpPost.mockResolvedValue({ ok: true, data: makeApiResponse() });

      const data = { trimester: 'Fall', replaceRegistrationId: 'old-reg-5' };
      await RegistrationService.create(data);

      // The POST payload should not contain replaceRegistrationId
      const postPayload = mockHttpPost.mock.calls[0][1] as Record<string, unknown>;
      expect(postPayload.replaceRegistrationId).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 3. create() — enrichment
  // -------------------------------------------------------------------------
  describe('enrichment', () => {
    test('attaches student and instructor objects to returned registration', async () => {
      mockHttpPost.mockResolvedValue({
        ok: true,
        data: makeApiResponse({ studentId: 'stu-1', instructorId: 'inst-1' }),
      });

      const students = [
        { id: 'stu-1', firstName: 'Alice' },
        { id: 'stu-2', firstName: 'Bob' },
      ];
      const instructors = [
        { id: 'inst-1', firstName: 'Carol' },
        { id: 'inst-2', firstName: 'Dave' },
      ];

      const result = await RegistrationService.create(
        { trimester: 'Fall' },
        { students, instructors }
      );

      expect(result.ok).toBe(true);
      const data = (result as { ok: true; data: Record<string, unknown> }).data;
      expect(data.student).toEqual({ id: 'stu-1', firstName: 'Alice' });
      expect(data.instructor).toEqual({ id: 'inst-1', firstName: 'Carol' });
    });

    test('missing student logs warning but does not fail', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockHttpPost.mockResolvedValue({
        ok: true,
        data: makeApiResponse({ studentId: 'stu-unknown' }),
      });

      const students = [{ id: 'stu-other', firstName: 'Eve' }];

      const result = await RegistrationService.create(
        { trimester: 'Fall' },
        { students, instructors: [] }
      );

      expect(result.ok).toBe(true);
      const data = (result as { ok: true; data: Record<string, unknown> }).data;
      expect(data.student).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Student not found'));
      warnSpy.mockRestore();
    });

    test('missing instructor logs warning but does not fail', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockHttpPost.mockResolvedValue({
        ok: true,
        data: makeApiResponse({ instructorId: 'inst-unknown' }),
      });

      const instructors = [{ id: 'inst-other', firstName: 'Frank' }];

      const result = await RegistrationService.create(
        { trimester: 'Fall' },
        { students: [], instructors }
      );

      expect(result.ok).toBe(true);
      const data = (result as { ok: true; data: Record<string, unknown> }).data;
      expect(data.instructor).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Instructor not found'));
      warnSpy.mockRestore();
    });

    test('does not warn when lookup arrays are empty', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockHttpPost.mockResolvedValue({ ok: true, data: makeApiResponse() });

      await RegistrationService.create({ trimester: 'Fall' }, { students: [], instructors: [] });

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    test('does not warn when lookup arrays are null (default)', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockHttpPost.mockResolvedValue({ ok: true, data: makeApiResponse() });

      await RegistrationService.create({ trimester: 'Fall' });

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // 4. create() — trimester handling
  // -------------------------------------------------------------------------
  describe('trimester handling', () => {
    test('sets trimester from currentPeriod when not provided', async () => {
      mockGetCurrentPeriod.mockReturnValue({ trimester: 'Fall 2025' });
      mockHttpPost.mockResolvedValue({ ok: true, data: makeApiResponse() });

      const data: Record<string, unknown> = {};
      await RegistrationService.create(data);

      expect(mockHttpPost).toHaveBeenCalledWith(
        'registrations',
        expect.objectContaining({ trimester: 'Fall 2025' })
      );
    });

    test('does not override trimester when already provided', async () => {
      mockGetCurrentPeriod.mockReturnValue({ trimester: 'Fall 2025' });
      mockHttpPost.mockResolvedValue({ ok: true, data: makeApiResponse() });

      await RegistrationService.create({ trimester: 'Spring 2026' });

      expect(mockHttpPost).toHaveBeenCalledWith(
        'registrations',
        expect.objectContaining({ trimester: 'Spring 2026' })
      );
    });

    test('does not set trimester when currentPeriod has no trimester', async () => {
      mockGetCurrentPeriod.mockReturnValue({});
      mockHttpPost.mockResolvedValue({ ok: true, data: makeApiResponse() });

      const data: Record<string, unknown> = {};
      await RegistrationService.create(data);

      expect(mockHttpPost).toHaveBeenCalledWith(
        'registrations',
        expect.not.objectContaining({ trimester: expect.anything() })
      );
    });
  });
});

// ---------------------------------------------------------------------------
// 5. delete()
// ---------------------------------------------------------------------------
describe('RegistrationService.delete()', () => {
  test('confirms with user before deleting', async () => {
    mockConfirm.mockReturnValue(true);
    mockHttpDelete.mockResolvedValue({ ok: true, data: undefined });

    await RegistrationService.delete('reg-100', 'fall');

    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this registration?');
    expect(mockHttpDelete).toHaveBeenCalledWith('registrations/fall/reg-100');
  });

  test('does nothing if user cancels confirmation', async () => {
    mockConfirm.mockReturnValue(false);

    const result = await RegistrationService.delete('reg-100', 'fall');

    expect(mockHttpDelete).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: { message: 'Cancelled' } });
  });

  test('shows success toast on completion', async () => {
    mockConfirm.mockReturnValue(true);
    mockHttpDelete.mockResolvedValue({ ok: true, data: undefined });

    await RegistrationService.delete('reg-100', 'fall');

    expect(mockToast).toHaveBeenCalledWith({
      html: 'Registration deleted successfully.',
    });
  });

  test('shows error toast on failure', async () => {
    mockConfirm.mockReturnValue(true);
    mockHttpDelete.mockResolvedValue({
      ok: false,
      error: { message: 'network error' },
    });

    await RegistrationService.delete('reg-100', 'fall');

    expect(mockToast).toHaveBeenCalledWith({ html: 'network error' });
  });

  test('returns error when no registration ID provided', async () => {
    mockConfirm.mockReturnValue(true);

    const result = await RegistrationService.delete('', 'fall');

    expect(mockHttpDelete).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      error: { message: 'No registration ID provided for deletion' },
    });
  });
});

// ---------------------------------------------------------------------------
// 6. submitIntent()
// ---------------------------------------------------------------------------
describe('RegistrationService.submitIntent()', () => {
  test('sends PATCH request with correct endpoint and payload', async () => {
    mockHttpPatch.mockResolvedValue({ ok: true, data: { success: true } });

    await RegistrationService.submitIntent('reg-200', 'keep');

    expect(mockHttpPatch).toHaveBeenCalledWith('registrations/reg-200/intent', {
      intent: 'keep',
    });
  });

  test('shows success toast on completion', async () => {
    mockHttpPatch.mockResolvedValue({ ok: true, data: { success: true } });

    await RegistrationService.submitIntent('reg-200', 'drop');

    expect(mockToast).toHaveBeenCalledWith({
      html: 'Intent submitted successfully.',
    });
  });

  test('returns the HttpResult on success', async () => {
    const responseData = { id: 'reg-200', reenrollmentIntent: 'change' };
    mockHttpPatch.mockResolvedValue({ ok: true, data: responseData });

    const result = await RegistrationService.submitIntent('reg-200', 'change');

    expect(result).toEqual({ ok: true, data: responseData });
  });

  test('shows error toast on failure', async () => {
    mockHttpPatch.mockResolvedValue({
      ok: false,
      error: { message: 'Server error' },
    });

    const result = await RegistrationService.submitIntent('reg-200', 'keep');

    expect(result).toEqual({ ok: false, error: { message: 'Server error' } });
    expect(mockToast).toHaveBeenCalledWith({ html: 'Server error' });
  });

  test('returns error result after showing toast', async () => {
    mockHttpPatch.mockResolvedValue({
      ok: false,
      error: { message: 'intent failed' },
    });

    const result = await RegistrationService.submitIntent('reg-200', 'drop');

    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: { message: string } }).error.message).toBe(
      'intent failed'
    );
  });

  test('uses generic message when error has no message', async () => {
    mockHttpPatch.mockResolvedValue({ ok: false, error: { message: '' } });

    const result = await RegistrationService.submitIntent('reg-200', 'keep');

    expect(result.ok).toBe(false);
    expect(mockToast).toHaveBeenCalledWith({
      html: 'Error submitting intent.',
    });
  });
});
