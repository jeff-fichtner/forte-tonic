import { getLogger } from '../utils/logger.js';
import { successResponse, errorResponse } from '../common/responseHelpers.js';

const logger = getLogger();

/**
 * Feedback Controller
 * Handles user feedback submissions and logs them to Cloud Logging
 */
export class FeedbackController {
  /**
   * Submit user feedback
   * POST /api/feedback
   */
  static async submitFeedback(req, res) {
    const startTime = Date.now();

    try {
      const { message, state } = req.body;

      // Log feedback to Cloud Logging with special severity for easy filtering
      const feedbackLog = {
        feedback: {
          message: message || '(no message provided)',
          userEmail: state?.currentUser?.email || 'unknown',
          timestamp: state?.timestamp || new Date().toISOString(),
          url: state?.url,
          currentSection: state?.currentSection,
          userAgent: state?.userAgent,
          screenResolution: state?.screenResolution,
          viewportSize: state?.viewportSize,
          isAdmin: state?.currentUser?.isAdmin,
          isInstructor: state?.currentUser?.isInstructor,
          isParent: state?.currentUser?.isParent,
          selectedTrimester: state?.selectedTrimester,
          currentPeriod: state?.currentPeriod,
          dataCounts: state?.dataCounts,
          parentRegistrationForm: state?.parentRegistrationForm,
        },
        fullState: state, // Include complete state for detailed debugging
      };

      logger.info('📝 USER FEEDBACK RECEIVED', feedbackLog);

      // Also log to console in development for easy viewing
      console.log('\n=== USER FEEDBACK RECEIVED ===');
      console.log('Message:', message || '(no message)');
      console.log('User:', state?.currentUser?.email || 'unknown');
      console.log('Full feedback:', JSON.stringify(feedbackLog, null, 2));
      console.log('================================\n');

      successResponse(
        res,
        { received: true },
        {
          message: 'Feedback received successfully',
          statusCode: 200,
          req,
          startTime,
          context: {
            controller: 'FeedbackController',
            method: 'submitFeedback',
            userEmail: state?.currentUser?.email,
          },
        }
      );
    } catch (error) {
      logger.error('Error processing feedback:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'FeedbackController', method: 'submitFeedback' },
      });
    }
  }
}
