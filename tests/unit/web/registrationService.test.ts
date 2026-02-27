/**
 * @jest-environment jsdom
 *
 * Registration Service Unit Tests
 * ================================
 *
 * Tests for the RegistrationService static methods extracted from the viewModel
 * (009-frontend-decomposition, Step US3).
 *
 * Covers endpoint routing (admin vs parent, enrollment vs non-enrollment),
 * delete-then-create replacement flow, response enrichment, delete with
 * confirmation, and intent submission.
 *
 * All external dependencies (HttpService, periodHelpers, Registration model,
 * window globals) are mocked so the service logic is tested in isolation.
 */

import { jest } from '@jest/globals';

// ---------------------------------------------------------------------------
// Mock state — referenced by both mock factories and test assertions
// ---------------------------------------------------------------------------

const mockHttpPost = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockHttpDelete = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockHttpPatch = jest.fn<(...args: unknown[]) => Promise<unknown>>();

const mockIsEnrollmentPeriod = jest.fn<(period: unknown) => boolean>();

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing the module under test
// ---------------------------------------------------------------------------

jest.unstable_mockModule(
  '../../../src/web/js/data/httpService.js',
  () => ({
    HttpService: {
      post: mockHttpPost,
      delete: mockHttpDelete,
      patch: mockHttpPatch,
    },
  }),
);

jest.unstable_mockModule(
  '../../../src/web/js/utilities/periodHelpers.js',
  () => ({
    isEnrollmentPeriod: mockIsEnrollmentPeriod,
  }),
);

jest.unstable_mockModule(
  '../../../src/web/js/constants.js',
  () => ({
    ServerFunctions: {
      register: 'registrations',
      createNextTrimesterRegistration: 'registrations/next-trimester',
    },
  }),
);

// Registration constructor mock — returns a plain object with the data passed
// plus predictable studentId/instructorId for enrichment testing.
jest.unstable_mockModule(
  '../../../src/models/shared/index.js',
  () => ({
    Registration: jest.fn((data: Record<string, unknown>) => ({
      ...data,
      studentId: data.studentId ?? 'stu-1',
      instructorId: data.instructorId ?? 'inst-1',
    })),
  }),
);

// ---------------------------------------------------------------------------
// Dynamic import — required after jest.unstable_mockModule with ESM
// ---------------------------------------------------------------------------

const { RegistrationService } = await import(
  '../../../src/web/js/data/registrationService.js'
);

// ---------------------------------------------------------------------------
// Global stubs (window.confirm, M.toast, window.UserSession)
// ---------------------------------------------------------------------------

const mockConfirm = jest.fn<(message?: string) => boolean>();
const mockToast = jest.fn();
const mockGetCurrentPeriod = jest.fn<() => unknown>();

beforeEach(() => {
  // Reset all mock state before each test
  jest.clearAllMocks();

  // window.confirm
  (globalThis as Record<string, unknown>).confirm = mockConfirm;

  // Materialize toast
  (globalThis as Record<string, unknown>).M = { toast: mockToast };

  // window.UserSession
  (globalThis as Record<string, unknown>).UserSession = {
    getCurrentPeriod: mockGetCurrentPeriod,
  };

  // Default: not an enrollment period
  mockIsEnrollmentPeriod.mockReturnValue(false);
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
// 1. create() — endpoint routing
// ---------------------------------------------------------------------------
describe('RegistrationService.create()', () => {
  describe('endpoint routing', () => {
    test('admin always uses regular endpoint regardless of enrollment period', async () => {
      mockIsEnrollmentPeriod.mockReturnValue(true);
      mockGetCurrentPeriod.mockReturnValue({ trimester: 'Spring', periodType: 'Priority Enrollment' });
      mockHttpPost.mockResolvedValue(makeApiResponse());

      await RegistrationService.create(
        { trimester: 'Spring' },
        {},
        { isAdmin: true },
      );

      expect(mockHttpPost).toHaveBeenCalledWith('registrations', expect.any(Object));
    });

    test('parent uses next trimester endpoint during enrollment', async () => {
      mockIsEnrollmentPeriod.mockReturnValue(true);
      mockGetCurrentPeriod.mockReturnValue({ trimester: 'Spring', periodType: 'Priority Enrollment' });
      mockHttpPost.mockResolvedValue(makeApiResponse());

      await RegistrationService.create({ trimester: 'Spring' }, {}, { isAdmin: false });

      expect(mockHttpPost).toHaveBeenCalledWith(
        'registrations/next-trimester',
        expect.any(Object),
      );
    });

    test('parent uses regular endpoint outside enrollment', async () => {
      mockIsEnrollmentPeriod.mockReturnValue(false);
      mockHttpPost.mockResolvedValue(makeApiResponse());

      await RegistrationService.create({ trimester: 'Fall' }, {}, { isAdmin: false });

      expect(mockHttpPost).toHaveBeenCalledWith('registrations', expect.any(Object));
    });

    test('defaults isAdmin to false when options omitted', async () => {
      mockIsEnrollmentPeriod.mockReturnValue(true);
      mockGetCurrentPeriod.mockReturnValue({ trimester: 'Spring', periodType: 'Open Enrollment' });
      mockHttpPost.mockResolvedValue(makeApiResponse());

      await RegistrationService.create({ trimester: 'Spring' });

      expect(mockHttpPost).toHaveBeenCalledWith(
        'registrations/next-trimester',
        expect.any(Object),
      );
    });
  });

  // -------------------------------------------------------------------------
  // 2. create() — replacement flow
  // -------------------------------------------------------------------------
  describe('replacement flow', () => {
    test('deletes old registration before creating new one when replaceRegistrationId is set', async () => {
      mockIsEnrollmentPeriod.mockReturnValue(false);
      mockHttpDelete.mockResolvedValue(undefined);
      mockHttpPost.mockResolvedValue(makeApiResponse());

      await RegistrationService.create(
        { trimester: 'Fall', replaceRegistrationId: 'old-reg-1' },
        {},
        { isAdmin: false },
      );

      expect(mockHttpDelete).toHaveBeenCalledWith('registrations/Fall/old-reg-1');
      expect(mockHttpPost).toHaveBeenCalled();
    });

    test('uses next-trimester delete endpoint during enrollment for parents', async () => {
      mockIsEnrollmentPeriod.mockReturnValue(true);
      mockGetCurrentPeriod.mockReturnValue({ trimester: 'Spring', periodType: 'Priority Enrollment' });
      mockHttpDelete.mockResolvedValue(undefined);
      mockHttpPost.mockResolvedValue(makeApiResponse());

      await RegistrationService.create(
        { trimester: 'Spring', replaceRegistrationId: 'old-reg-2' },
        {},
        { isAdmin: false },
      );

      expect(mockHttpDelete).toHaveBeenCalledWith('registrations/next-trimester/old-reg-2');
    });

    test('uses regular delete endpoint for admin even during enrollment', async () => {
      mockIsEnrollmentPeriod.mockReturnValue(true);
      mockGetCurrentPeriod.mockReturnValue({ trimester: 'Spring', periodType: 'Priority Enrollment' });
      mockHttpDelete.mockResolvedValue(undefined);
      mockHttpPost.mockResolvedValue(makeApiResponse());

      await RegistrationService.create(
        { trimester: 'Spring', replaceRegistrationId: 'old-reg-3' },
        {},
        { isAdmin: true },
      );

      expect(mockHttpDelete).toHaveBeenCalledWith('registrations/Spring/old-reg-3');
    });

    test('throws and does not create new registration when delete fails', async () => {
      mockIsEnrollmentPeriod.mockReturnValue(false);
      mockHttpDelete.mockRejectedValue(new Error('delete failed'));

      await expect(
        RegistrationService.create(
          { trimester: 'Fall', replaceRegistrationId: 'old-reg-4' },
          {},
          { isAdmin: false },
        ),
      ).rejects.toThrow('Failed to delete old registration: delete failed');

      expect(mockHttpPost).not.toHaveBeenCalled();
    });

    test('strips replaceRegistrationId from data before POST', async () => {
      mockIsEnrollmentPeriod.mockReturnValue(false);
      mockHttpDelete.mockResolvedValue(undefined);
      mockHttpPost.mockResolvedValue(makeApiResponse());

      const data = { trimester: 'Fall', replaceRegistrationId: 'old-reg-5' };
      await RegistrationService.create(data, {}, { isAdmin: false });

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
      mockHttpPost.mockResolvedValue(makeApiResponse({ studentId: 'stu-1', instructorId: 'inst-1' }));

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
        { students, instructors },
      );

      expect(result.student).toEqual({ id: 'stu-1', firstName: 'Alice' });
      expect(result.instructor).toEqual({ id: 'inst-1', firstName: 'Carol' });
    });

    test('missing student logs warning but does not fail', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockHttpPost.mockResolvedValue(makeApiResponse({ studentId: 'stu-unknown' }));

      const students = [{ id: 'stu-other', firstName: 'Eve' }];

      const result = await RegistrationService.create(
        { trimester: 'Fall' },
        { students, instructors: [] },
      );

      expect(result.student).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Student not found'),
      );
      warnSpy.mockRestore();
    });

    test('missing instructor logs warning but does not fail', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockHttpPost.mockResolvedValue(makeApiResponse({ instructorId: 'inst-unknown' }));

      const instructors = [{ id: 'inst-other', firstName: 'Frank' }];

      const result = await RegistrationService.create(
        { trimester: 'Fall' },
        { students: [], instructors },
      );

      expect(result.instructor).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Instructor not found'),
      );
      warnSpy.mockRestore();
    });

    test('does not warn when lookup arrays are empty', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockHttpPost.mockResolvedValue(makeApiResponse());

      await RegistrationService.create({ trimester: 'Fall' }, { students: [], instructors: [] });

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    test('does not warn when lookup arrays are null (default)', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockHttpPost.mockResolvedValue(makeApiResponse());

      await RegistrationService.create({ trimester: 'Fall' });

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // 4. create() — trimester handling
  // -------------------------------------------------------------------------
  describe('trimester handling', () => {
    test('sets trimester from currentPeriod when using regular endpoint and not provided', async () => {
      mockIsEnrollmentPeriod.mockReturnValue(false);
      mockGetCurrentPeriod.mockReturnValue({ trimester: 'Fall 2025' });
      mockHttpPost.mockResolvedValue(makeApiResponse());

      const data: Record<string, unknown> = {};
      await RegistrationService.create(data, {}, { isAdmin: false });

      // The data object should have been mutated to include the trimester
      expect(mockHttpPost).toHaveBeenCalledWith(
        'registrations',
        expect.objectContaining({ trimester: 'Fall 2025' }),
      );
    });

    test('does not override trimester when already provided', async () => {
      mockIsEnrollmentPeriod.mockReturnValue(false);
      mockGetCurrentPeriod.mockReturnValue({ trimester: 'Fall 2025' });
      mockHttpPost.mockResolvedValue(makeApiResponse());

      await RegistrationService.create(
        { trimester: 'Spring 2026' },
        {},
        { isAdmin: false },
      );

      expect(mockHttpPost).toHaveBeenCalledWith(
        'registrations',
        expect.objectContaining({ trimester: 'Spring 2026' }),
      );
    });

    test('does not set trimester when currentPeriod has no trimester', async () => {
      mockIsEnrollmentPeriod.mockReturnValue(false);
      mockGetCurrentPeriod.mockReturnValue({});
      mockHttpPost.mockResolvedValue(makeApiResponse());

      const data: Record<string, unknown> = {};
      await RegistrationService.create(data, {}, { isAdmin: false });

      expect(mockHttpPost).toHaveBeenCalledWith(
        'registrations',
        expect.not.objectContaining({ trimester: expect.anything() }),
      );
    });

    test('does not set trimester when using next-trimester endpoint', async () => {
      mockIsEnrollmentPeriod.mockReturnValue(true);
      mockGetCurrentPeriod.mockReturnValue({ trimester: 'Fall 2025', periodType: 'Priority Enrollment' });
      mockHttpPost.mockResolvedValue(makeApiResponse());

      const data: Record<string, unknown> = {};
      await RegistrationService.create(data, {}, { isAdmin: false });

      // Should use next-trimester endpoint, and trimester should NOT be auto-set
      expect(mockHttpPost).toHaveBeenCalledWith(
        'registrations/next-trimester',
        expect.not.objectContaining({ trimester: expect.anything() }),
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
    mockHttpDelete.mockResolvedValue(undefined);

    await RegistrationService.delete('reg-100', 'fall');

    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this registration?');
    expect(mockHttpDelete).toHaveBeenCalledWith('registrations/fall/reg-100');
  });

  test('does nothing if user cancels confirmation', async () => {
    mockConfirm.mockReturnValue(false);

    await RegistrationService.delete('reg-100', 'fall');

    expect(mockHttpDelete).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });

  test('shows success toast on completion', async () => {
    mockConfirm.mockReturnValue(true);
    mockHttpDelete.mockResolvedValue(undefined);

    await RegistrationService.delete('reg-100', 'fall');

    expect(mockToast).toHaveBeenCalledWith({ html: 'Registration deleted successfully.' });
  });

  test('shows error toast on failure', async () => {
    mockConfirm.mockReturnValue(true);
    mockHttpDelete.mockRejectedValue(new Error('network error'));

    await RegistrationService.delete('reg-100', 'fall');

    expect(mockToast).toHaveBeenCalledWith({ html: 'Error deleting registration.' });
  });

  test('shows error toast when no registration ID provided', async () => {
    mockConfirm.mockReturnValue(true);

    await RegistrationService.delete('', 'fall');

    expect(mockHttpDelete).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith({ html: 'Error: No registration ID provided for deletion.' });
  });
});

// ---------------------------------------------------------------------------
// 6. submitIntent()
// ---------------------------------------------------------------------------
describe('RegistrationService.submitIntent()', () => {
  test('sends PATCH request with correct endpoint and payload', async () => {
    mockHttpPatch.mockResolvedValue({ success: true });

    await RegistrationService.submitIntent('reg-200', 'keep');

    expect(mockHttpPatch).toHaveBeenCalledWith(
      'registrations/reg-200/intent',
      { intent: 'keep' },
    );
  });

  test('shows success toast on completion', async () => {
    mockHttpPatch.mockResolvedValue({ success: true });

    await RegistrationService.submitIntent('reg-200', 'drop');

    expect(mockToast).toHaveBeenCalledWith({ html: 'Intent submitted successfully.' });
  });

  test('returns the response data on success', async () => {
    const responseData = { id: 'reg-200', reenrollmentIntent: 'change' };
    mockHttpPatch.mockResolvedValue(responseData);

    const result = await RegistrationService.submitIntent('reg-200', 'change');

    expect(result).toEqual(responseData);
  });

  test('shows error toast on failure', async () => {
    mockHttpPatch.mockRejectedValue(new Error('Server error'));

    await expect(
      RegistrationService.submitIntent('reg-200', 'keep'),
    ).rejects.toThrow('Server error');

    expect(mockToast).toHaveBeenCalledWith({ html: 'Server error' });
  });

  test('re-throws error after showing toast', async () => {
    const error = new Error('intent failed');
    mockHttpPatch.mockRejectedValue(error);

    await expect(
      RegistrationService.submitIntent('reg-200', 'drop'),
    ).rejects.toThrow(error);
  });

  test('uses generic message when error has no message', async () => {
    const error = { message: '' };
    mockHttpPatch.mockRejectedValue(error);

    await expect(
      RegistrationService.submitIntent('reg-200', 'keep'),
    ).rejects.toBe(error);

    expect(mockToast).toHaveBeenCalledWith({ html: 'Error submitting intent.' });
  });
});
