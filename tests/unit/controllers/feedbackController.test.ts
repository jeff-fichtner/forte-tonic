/**
 * Feedback Controller Tests
 * ==================================
 *
 * Tests for FeedbackController static methods:
 * - submitFeedback: logs feedback to Cloud Logging and returns success
 */

import { jest } from '@jest/globals';

// ---------------------------------------------------------------------------
// Module mocks (must precede dynamic import of the controller)
// ---------------------------------------------------------------------------

const mockLoggerInfo = jest.fn();
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  getLogger: () => ({
    info: mockLoggerInfo,
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

// Import controller after all mocks are wired
const { FeedbackController } = await import('../../../src/controllers/feedbackController.js');

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

describe('FeedbackController', () => {
  let res: ReturnType<typeof createRes>;

  beforeEach(() => {
    jest.clearAllMocks();
    res = createRes();
  });

  describe('submitFeedback', () => {
    it('should log feedback with message and state, then return success', async () => {
      const req = {
        body: {
          message: 'Great app!',
          state: {
            currentUser: { email: 'user@test.com' },
          },
        },
      } as unknown;

      await FeedbackController.submitFeedback(req, res);

      // Verify logger.info was called with the feedback marker string
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining('USER FEEDBACK RECEIVED'),
        expect.objectContaining({
          feedback: expect.objectContaining({
            message: 'Great app!',
            userEmail: 'user@test.com',
          }),
        })
      );

      expect(mockSuccessResponse).toHaveBeenCalledWith(
        res,
        { received: true },
        expect.objectContaining({ message: 'Feedback received successfully' })
      );
    });

    it('should log "(no message provided)" when message is absent', async () => {
      const req = {
        body: {
          state: {
            currentUser: { email: 'user@test.com' },
          },
        },
      } as unknown;

      await FeedbackController.submitFeedback(req, res);

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining('USER FEEDBACK RECEIVED'),
        expect.objectContaining({
          feedback: expect.objectContaining({
            message: '(no message provided)',
            userEmail: 'user@test.com',
          }),
        })
      );

      expect(mockSuccessResponse).toHaveBeenCalledWith(res, { received: true }, expect.any(Object));
    });

    it('should succeed with empty body (no message, no state)', async () => {
      const req = { body: {} } as unknown;

      await FeedbackController.submitFeedback(req, res);

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining('USER FEEDBACK RECEIVED'),
        expect.objectContaining({
          feedback: expect.objectContaining({
            message: '(no message provided)',
            userEmail: 'unknown',
          }),
        })
      );

      expect(mockSuccessResponse).toHaveBeenCalledWith(res, { received: true }, expect.any(Object));
    });
  });
});
