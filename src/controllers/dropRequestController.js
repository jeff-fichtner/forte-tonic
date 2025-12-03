/**
 * Drop Request Controller
 * =========================
 *
 * API endpoints for drop request management.
 * Handles parent requests to drop mid-trimester lessons and admin review.
 */

import { getAuthenticatedUserEmail } from '../middleware/auth.js';
import { getLogger } from '../utils/logger.js';
import { serviceContainer } from '../infrastructure/container/serviceContainer.js';
import { successResponse, errorResponse } from '../common/responseHelpers.js';
import { ValidationError, UnauthorizedError } from '../common/errors.js';
import {
  DropRequestError,
  DropRequestNotFoundError,
  UnauthorizedDropRequestError,
  InvalidPeriodError,
  DuplicateDropRequestError,
  RegistrationNotFoundError,
  InvalidStatusTransitionError,
} from '../services/dropRequestService.js';

const logger = getLogger();

export class DropRequestController {
  /**
   * Create a new drop request (parent endpoint)
   * POST /api/drop-requests
   */
  static async createDropRequest(req, res) {
    const startTime = Date.now();

    try {
      const { registrationId, reason } = req.body;
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);

      logger.info('📝 Drop request creation requested:', {
        registrationId,
        authenticatedUser: authenticatedUserEmail,
        hasReason: !!reason,
      });

      // Validate request
      if (!registrationId) {
        throw new ValidationError('registrationId is required');
      }
      if (!reason || reason.trim().length === 0) {
        throw new ValidationError('reason is required and cannot be empty');
      }
      if (reason.length > 1000) {
        throw new ValidationError('reason cannot exceed 1000 characters');
      }

      // Get parent ID from current user
      const parentId = req.currentUser?.id;
      if (!parentId) {
        throw new ValidationError('Parent ID not found in session');
      }

      // Create drop request via service
      const dropRequestService = serviceContainer.get('dropRequestService');
      const dropRequest = await dropRequestService.createDropRequest(
        registrationId,
        parentId,
        reason.trim()
      );

      logger.info(`✅ Drop request created: ${dropRequest.id}`);

      successResponse(
        res,
        {
          dropRequest,
          message: 'Drop request submitted successfully. You will be notified when it is reviewed.',
        },
        {
          req,
          startTime,
          context: { controller: 'DropRequestController', method: 'createDropRequest' },
        }
      );
    } catch (error) {
      logger.error('❌ Error creating drop request:', error);

      // Map service errors to appropriate HTTP responses
      if (error instanceof InvalidPeriodError) {
        return errorResponse(
          res,
          error,
          {
            req,
            startTime,
            context: { controller: 'DropRequestController', method: 'createDropRequest' },
          },
          400
        );
      }
      if (error instanceof RegistrationNotFoundError) {
        return errorResponse(
          res,
          error,
          {
            req,
            startTime,
            context: { controller: 'DropRequestController', method: 'createDropRequest' },
          },
          404
        );
      }
      if (error instanceof UnauthorizedDropRequestError) {
        return errorResponse(
          res,
          error,
          {
            req,
            startTime,
            context: { controller: 'DropRequestController', method: 'createDropRequest' },
          },
          403
        );
      }
      if (error instanceof DuplicateDropRequestError) {
        return errorResponse(
          res,
          error,
          {
            req,
            startTime,
            context: { controller: 'DropRequestController', method: 'createDropRequest' },
          },
          409
        );
      }

      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'DropRequestController', method: 'createDropRequest' },
      });
    }
  }

  /**
   * Get all drop requests for the authenticated parent
   * GET /api/drop-requests/my-requests
   */
  static async getMyDropRequests(req, res) {
    const startTime = Date.now();

    try {
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);

      logger.info('📋 Parent requesting their drop requests:', {
        authenticatedUser: authenticatedUserEmail,
      });

      // Get parent ID from current user
      const parentId = req.currentUser?.id;
      if (!parentId) {
        throw new ValidationError('Parent ID not found in session');
      }

      // Get drop requests via service
      const dropRequestService = serviceContainer.get('dropRequestService');
      const dropRequests = await dropRequestService.getDropRequestsByParent(parentId);

      logger.info(`✅ Found ${dropRequests.length} drop requests for parent ${parentId}`);

      successResponse(
        res,
        { dropRequests },
        {
          req,
          startTime,
          context: { controller: 'DropRequestController', method: 'getMyDropRequests' },
        }
      );
    } catch (error) {
      logger.error('❌ Error getting parent drop requests:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'DropRequestController', method: 'getMyDropRequests' },
      });
    }
  }

  /**
   * Get all pending drop requests (admin endpoint)
   * GET /api/admin/drop-requests
   */
  static async getAllDropRequests(req, res) {
    const startTime = Date.now();

    try {
      // Verify caller is an admin
      const isAdmin = req.currentUser?.admin !== undefined;
      if (!isAdmin) {
        throw new UnauthorizedError('Admin access required');
      }

      const authenticatedUserEmail = getAuthenticatedUserEmail(req);

      logger.info('📋 Admin requesting all pending drop requests:', {
        authenticatedUser: authenticatedUserEmail,
      });

      // Get pending drop requests via service
      const dropRequestService = serviceContainer.get('dropRequestService');
      const dropRequests = await dropRequestService.getPendingDropRequests();

      logger.info(`✅ Found ${dropRequests.length} pending drop requests`);

      successResponse(
        res,
        { dropRequests },
        {
          req,
          startTime,
          context: { controller: 'DropRequestController', method: 'getAllDropRequests' },
        }
      );
    } catch (error) {
      logger.error('❌ Error getting all drop requests:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'DropRequestController', method: 'getAllDropRequests' },
      });
    }
  }

  /**
   * Approve a drop request (admin endpoint)
   * POST /api/admin/drop-requests/:id/approve
   */
  static async approveDropRequest(req, res) {
    const startTime = Date.now();

    try {
      // Verify caller is an admin
      const isAdmin = req.currentUser?.admin !== undefined;
      if (!isAdmin) {
        throw new UnauthorizedError('Admin access required');
      }

      const { id: requestId } = req.params;
      const { adminNotes } = req.body;
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);

      logger.info('✅ Admin approving drop request:', {
        requestId,
        authenticatedUser: authenticatedUserEmail,
        hasNotes: !!adminNotes,
      });

      // Validate request ID
      if (!requestId) {
        throw new ValidationError('Request ID is required');
      }

      // Approve drop request via service
      const dropRequestService = serviceContainer.get('dropRequestService');
      const dropRequest = await dropRequestService.approveDropRequest(
        requestId,
        authenticatedUserEmail,
        adminNotes || ''
      );

      logger.info(`✅ Drop request approved and registration deleted: ${requestId}`);

      successResponse(
        res,
        {
          dropRequest,
          message: 'Drop request approved and registration deleted successfully',
        },
        {
          req,
          startTime,
          context: { controller: 'DropRequestController', method: 'approveDropRequest' },
        }
      );
    } catch (error) {
      logger.error('❌ Error approving drop request:', error);

      if (error instanceof DropRequestNotFoundError) {
        return errorResponse(
          res,
          error,
          {
            req,
            startTime,
            context: { controller: 'DropRequestController', method: 'approveDropRequest' },
          },
          404
        );
      }
      if (error instanceof InvalidStatusTransitionError) {
        return errorResponse(
          res,
          error,
          {
            req,
            startTime,
            context: { controller: 'DropRequestController', method: 'approveDropRequest' },
          },
          400
        );
      }

      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'DropRequestController', method: 'approveDropRequest' },
      });
    }
  }

  /**
   * Reject a drop request (admin endpoint)
   * POST /api/admin/drop-requests/:id/reject
   */
  static async rejectDropRequest(req, res) {
    const startTime = Date.now();

    try {
      // Verify caller is an admin
      const isAdmin = req.currentUser?.admin !== undefined;
      if (!isAdmin) {
        throw new UnauthorizedError('Admin access required');
      }

      const { id: requestId } = req.params;
      const { adminNotes } = req.body;
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);

      logger.info('❌ Admin rejecting drop request:', {
        requestId,
        authenticatedUser: authenticatedUserEmail,
        hasNotes: !!adminNotes,
      });

      // Validate request ID
      if (!requestId) {
        throw new ValidationError('Request ID is required');
      }

      // Reject drop request via service
      const dropRequestService = serviceContainer.get('dropRequestService');
      const dropRequest = await dropRequestService.rejectDropRequest(
        requestId,
        authenticatedUserEmail,
        adminNotes || ''
      );

      logger.info(`✅ Drop request rejected, registration remains active: ${requestId}`);

      successResponse(
        res,
        {
          dropRequest,
          message: 'Drop request rejected. Registration remains active.',
        },
        {
          req,
          startTime,
          context: { controller: 'DropRequestController', method: 'rejectDropRequest' },
        }
      );
    } catch (error) {
      logger.error('❌ Error rejecting drop request:', error);

      if (error instanceof DropRequestNotFoundError) {
        return errorResponse(
          res,
          error,
          {
            req,
            startTime,
            context: { controller: 'DropRequestController', method: 'rejectDropRequest' },
          },
          404
        );
      }
      if (error instanceof InvalidStatusTransitionError) {
        return errorResponse(
          res,
          error,
          {
            req,
            startTime,
            context: { controller: 'DropRequestController', method: 'rejectDropRequest' },
          },
          400
        );
      }

      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'DropRequestController', method: 'rejectDropRequest' },
      });
    }
  }
}
