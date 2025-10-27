/**
 * Registration Controller - Application layer API endpoints for program registration management
 * Handles classes, registrations, rooms, and registration lifecycle
 *
 * Updated to use Domain-Driven Design architecture with service container
 * and application services for business logic coordination.
 */

import { getAuthenticatedUserEmail } from '../middleware/auth.js';
import { getLogger } from '../utils/logger.js';
import { serviceContainer } from '../infrastructure/container/serviceContainer.js';
import { _fetchData } from '../utils/helpers.js';
import { successResponse, errorResponse } from '../common/responseHelpers.js';
import { ValidationError, UnauthorizedError, NotFoundError } from '../common/errors.js';

const logger = getLogger();

export class RegistrationController {
  /**
   * Get all classes/programs
   */
  static async getClasses(req, res) {
    const startTime = Date.now();

    try {
      const programRepository = serviceContainer.get('programRepository');
      const data = await programRepository.getClasses();

      successResponse(res, data, {
        req,
        startTime,
        context: { controller: 'RegistrationController', method: 'getClasses' },
      });
    } catch (error) {
      logger.error('Error getting classes:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'RegistrationController', method: 'getClasses' },
      });
    }
  }

  /**
   * Get registrations with filtering and pagination
   */
  static async getRegistrations(req, res) {
    const startTime = Date.now();

    try {
      // Use the normalized request data from middleware
      const request = req.requestData || {};

      const registrationApplicationService = serviceContainer.get('registrationApplicationService');

      const options = {
        studentId: request.studentId,
        classId: request.classId,
        instructorId: request.instructorId,
        registrationType: request.registrationType,
        schoolYear: request.schoolYear,
        trimester: request.trimester,
        isActive: request.isActive,
        page: request.page || 1,
        pageSize: request.pageSize || 1000, // Increased to 1000
        sortBy: request.sortBy || 'registeredAt',
        sortOrder: request.sortOrder || 'desc',
      };

      // Get registrations through application service
      const result = await registrationApplicationService.getRegistrations(options);

      // For backward compatibility with existing pagination format
      const legacyResult = _fetchData(
        () => result.registrations,
        request.page || 0,
        request.pageSize || 1000
      );

      // Enhance with domain insights
      legacyResult.domainInsights = {
        totalActive: result.registrations.filter(r => r.isActive).length,
        totalByType: RegistrationController.#groupByRegistrationType(result.registrations),
        totalConflicts: result.registrations.filter(r => r.hasConflicts).length,
      };

      successResponse(res, legacyResult, {
        req,
        startTime,
        context: { controller: 'RegistrationController', method: 'getRegistrations' },
      });
    } catch (error) {
      logger.error('Error getting registrations:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'RegistrationController', method: 'getRegistrations' },
      });
    }
  }

  /**
   * Get all rooms
   */
  static async getRooms(req, res) {
    const startTime = Date.now();

    try {
      const userRepository = serviceContainer.get('userRepository');
      const data = await userRepository.getRooms();

      successResponse(res, data, {
        req,
        startTime,
        context: { controller: 'RegistrationController', method: 'getRooms' },
      });
    } catch (error) {
      logger.error('Error getting rooms:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'RegistrationController', method: 'getRooms' },
      });
    }
  }

  /**
   * Create Registration using application service with comprehensive validation
   */
  static async createRegistration(req, res) {
    const startTime = Date.now();

    try {
      const requestData = req.body;

      // Get the authenticated user's email for audit purposes
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);

      logger.info('🎯 Registration creation request received:', {
        ...requestData,
        authenticatedUser: authenticatedUserEmail,
        currentUser: req.currentUser,
        hasAccessCode: !!requestData.accessCode,
      });

      // Basic validation
      if (!requestData.studentId || !requestData.registrationType) {
        throw new ValidationError('Missing required fields: studentId, registrationType');
      }

      // Use the registration application service for business logic
      const registrationApplicationService = serviceContainer.get('registrationApplicationService');

      // Process registration through application service with authenticated user
      const result = await registrationApplicationService.processRegistration(
        requestData,
        authenticatedUserEmail
      );

      successResponse(res, result.registration, {
        message: 'Registration created successfully',
        statusCode: 201,
        req,
        startTime,
        context: { controller: 'RegistrationController', method: 'createRegistration' },
      });
    } catch (error) {
      logger.error('Error creating registration:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'RegistrationController', method: 'createRegistration' },
      });
    }
  }

  /**
   * Update registration using application service
   */
  static async updateRegistration(req, res) {
    const startTime = Date.now();

    try {
      const { registrationId } = req.params;
      const updates = req.body;
      const userId = getAuthenticatedUserEmail(req);

      const registrationApplicationService = serviceContainer.get('registrationApplicationService');

      const result = await registrationApplicationService.updateRegistration(
        registrationId,
        updates,
        userId
      );

      successResponse(res, result, {
        message: 'Registration updated successfully',
        req,
        startTime,
        context: { controller: 'RegistrationController', method: 'updateRegistration' },
      });
    } catch (error) {
      logger.error('Error updating registration:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'RegistrationController', method: 'updateRegistration' },
      });
    }
  }

  /**
   * Cancel registration using application service
   */
  static async cancelRegistration(req, res) {
    const startTime = Date.now();

    try {
      const { registrationId } = req.params;
      const { reason } = req.body;

      // Get the authenticated user's email for audit purposes
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);

      logger.info('🎯 Registration cancellation request received:', {
        registrationId,
        reason,
        authenticatedUser: authenticatedUserEmail,
      });

      const registrationApplicationService = serviceContainer.get('registrationApplicationService');

      const result = await registrationApplicationService.cancelRegistration(
        registrationId,
        reason,
        authenticatedUserEmail
      );

      successResponse(res, result, {
        message: 'Registration cancelled successfully',
        req,
        startTime,
        context: { controller: 'RegistrationController', method: 'cancelRegistration' },
      });
    } catch (error) {
      logger.error('Error cancelling registration:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'RegistrationController', method: 'cancelRegistration' },
      });
    }
  }

  /**
   * Validate registration for conflicts and eligibility
   */
  static async validateRegistration(req, res) {
    const startTime = Date.now();

    try {
      const registrationData = req.body;

      const registrationApplicationService = serviceContainer.get('registrationApplicationService');

      const validation =
        await registrationApplicationService.validateRegistration(registrationData);

      successResponse(res, validation, {
        req,
        startTime,
        context: { controller: 'RegistrationController', method: 'validateRegistration' },
      });
    } catch (error) {
      logger.error('Error validating registration:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'RegistrationController', method: 'validateRegistration' },
      });
    }
  }

  /**
   * Get registration conflicts for a student
   */
  static async getRegistrationConflicts(req, res) {
    const startTime = Date.now();

    try {
      const { studentId } = req.params;

      const registrationApplicationService = serviceContainer.get('registrationApplicationService');

      const conflicts = await registrationApplicationService.getStudentConflicts(studentId);

      successResponse(res, conflicts, {
        req,
        startTime,
        context: {
          controller: 'RegistrationController',
          method: 'getRegistrationConflicts',
          studentId: req.params.studentId,
        },
      });
    } catch (error) {
      logger.error('Error getting registration conflicts:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'RegistrationController', method: 'getRegistrationConflicts' },
      });
    }
  }

  /**
   * Register student (legacy endpoint for backward compatibility)
   */
  static async register(req, res) {
    const startTime = Date.now();

    try {
      const { studentId, classId, instructorId, registrationType } = req.body;

      // Get the authenticated user's email for audit purposes
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);

      if (!studentId || !registrationType) {
        throw new ValidationError('Missing required fields');
      }

      const registrationData = {
        studentId,
        classId,
        instructorId,
        registrationType,
        schoolYear: '2025-2026',
        trimester: 'Fall',
      };

      const registrationApplicationService = serviceContainer.get('registrationApplicationService');
      const result = await registrationApplicationService.processRegistration(
        registrationData,
        authenticatedUserEmail
      );

      successResponse(res, result.registration, {
        message: 'Registration created successfully',
        statusCode: 201,
        req,
        startTime,
        context: { controller: 'RegistrationController', method: 'register (legacy)', studentId },
      });
    } catch (error) {
      logger.error('Error registering student:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'RegistrationController', method: 'register (legacy)' },
      });
    }
  }

  /**
   * Delete registration (REST DELETE endpoint)
   */
  static async deleteRegistration(req, res) {
    const startTime = Date.now();

    try {
      const registrationId = req.params.id;

      // Get the authenticated user's email for audit purposes
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);

      if (!authenticatedUserEmail) {
        throw new UnauthorizedError('Authentication required for registration deletion');
      }

      if (!registrationId) {
        throw new ValidationError('Missing registrationId');
      }

      const registrationApplicationService = serviceContainer.get('registrationApplicationService');
      const result = await registrationApplicationService.cancelRegistration(
        registrationId,
        'Registration cancelled by user',
        authenticatedUserEmail
      );

      successResponse(res, result, {
        message: 'Registration removed',
        req,
        startTime,
        context: {
          controller: 'RegistrationController',
          method: 'deleteRegistration',
          registrationId,
        },
      });
    } catch (error) {
      logger.error('Error deleting registration:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'RegistrationController', method: 'deleteRegistration' },
      });
    }
  }

  /**
   * Update reenrollment intent for a registration
   * PATCH /api/registrations/:id/intent
   */
  static async updateIntent(req, res) {
    const startTime = Date.now();

    try {
      const { id } = req.params;
      const { intent } = req.body;
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);

      // Validate intent
      const { INTENT_TYPES } = await import('../constants/intentTypes.js');
      if (!Object.values(INTENT_TYPES).includes(intent)) {
        throw new ValidationError('Invalid intent. Must be: keep, drop, or change');
      }

      // Get repository and period service from container
      const registrationRepository = serviceContainer.get('registrationRepository');
      const periodService = serviceContainer.get('periodService');

      // Check period is active
      const isIntentActive = await periodService.isIntentPeriodActive();
      if (!isIntentActive) {
        throw new ValidationError('Intent collection is not currently active');
      }

      // Use helper method (includes authorization check)
      const registration = await registrationRepository.updateIntent(
        id,
        intent,
        authenticatedUserEmail
      );

      successResponse(res, registration, {
        req,
        startTime,
        context: {
          controller: 'RegistrationController',
          method: 'updateIntent',
          registrationId: id,
          intent,
        },
      });
    } catch (error) {
      if (error.message === 'Registration not found') {
        logger.error('Error updating intent:', error);
        errorResponse(res, new NotFoundError('Registration not found or access denied'), {
          req,
          startTime,
          context: { controller: 'RegistrationController', method: 'updateIntent' },
        });
        return;
      }
      logger.error('Error updating intent:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'RegistrationController', method: 'updateIntent' },
      });
    }
  }

  /**
   * Private method: Group registrations by type
   */
  static #groupByRegistrationType(registrations) {
    return registrations.reduce((acc, registration) => {
      const type = registration.registrationType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Get registrations for next trimester (enrollment periods only)
   * Access control:
   * - Priority enrollment: Only returning families
   * - Open enrollment: All families
   * - Other periods: Blocked
   * GET /api/registrations/next-trimester
   */
  static async getNextTrimesterRegistrations(req, res) {
    const startTime = Date.now();

    try {
      const periodService = serviceContainer.get('periodService');
      const registrationRepository = serviceContainer.get('registrationRepository');
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);

      logger.info('🎯 Next trimester registrations request from:', authenticatedUserEmail);

      // Check if next trimester table is available
      const nextTable = await periodService.getNextTrimesterTable();
      if (!nextTable) {
        throw new ValidationError('Next trimester registration is not currently available');
      }

      // Get all registrations from next trimester table
      const allRegistrations = await registrationRepository.getFromTable(nextTable);

      // TODO: Filter by user's access (parent sees their students, admin sees all)
      // For now, returning all - implement proper filtering based on req.currentUser
      const userRegistrations = allRegistrations;

      successResponse(res, userRegistrations, {
        req,
        startTime,
        context: {
          controller: 'RegistrationController',
          method: 'getNextTrimesterRegistrations',
          table: nextTable,
          count: userRegistrations.length,
        },
      });
    } catch (error) {
      logger.error('Error getting next trimester registrations:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'RegistrationController', method: 'getNextTrimesterRegistrations' },
      });
    }
  }

  /**
   * Create registration in next trimester (enrollment periods only)
   * Enforces access control and creates backward link if modifying existing registration
   * POST /api/registrations/next-trimester
   */
  static async createNextTrimesterRegistration(req, res) {
    const startTime = Date.now();

    try {
      const requestData = req.body;
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);
      const periodService = serviceContainer.get('periodService');
      const registrationRepository = serviceContainer.get('registrationRepository');

      logger.info('🎯 Next trimester registration creation:', {
        studentId: requestData.studentId,
        replacesId: requestData.linkedPreviousRegistrationId,
        authenticatedUser: authenticatedUserEmail,
      });

      // Validation
      if (!requestData.studentId || !requestData.registrationType) {
        throw new ValidationError('Missing required fields: studentId, registrationType');
      }

      // Check if next trimester table is available
      const nextTable = await periodService.getNextTrimesterTable();
      if (!nextTable) {
        throw new ValidationError('Next trimester registration is not currently available');
      }

      // Check access permissions
      const currentTable = await periodService.getCurrentTrimesterTable();
      const currentRegistrations = await registrationRepository.getFromTable(currentTable);
      const hasActiveRegistrations = currentRegistrations.some(
        reg => (reg.studentId?.value || reg.studentId) === requestData.studentId
      );

      const canAccess = await periodService.canAccessNextTrimester(hasActiveRegistrations);
      if (!canAccess) {
        throw new UnauthorizedError(
          'You do not have access to next trimester registration at this time. ' +
            'Priority enrollment is for returning families only.'
        );
      }

      // Create registration in next trimester table
      const registration = await registrationRepository.createInTable(nextTable, {
        ...requestData,
        createdBy: authenticatedUserEmail,
      });

      logger.info(
        `✅ Created next trimester registration: ${registration.id?.value || registration.id}`
      );

      successResponse(res, registration, {
        message: 'Next trimester registration created successfully',
        statusCode: 201,
        req,
        startTime,
        context: {
          controller: 'RegistrationController',
          method: 'createNextTrimesterRegistration',
          table: nextTable,
          hasBackwardLink: !!requestData.linkedPreviousRegistrationId,
        },
      });
    } catch (error) {
      logger.error('Error creating next trimester registration:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: {
          controller: 'RegistrationController',
          method: 'createNextTrimesterRegistration',
        },
      });
    }
  }

  /**
   * Get all registrations for a specific trimester (admin only)
   * GET /api/admin/registrations/:trimester
   */
  static async getRegistrationsByTrimester(req, res) {
    const startTime = Date.now();

    try {
      const { trimester } = req.params;
      const registrationRepository = serviceContainer.get('registrationRepository');

      logger.info(`📋 Getting registrations for trimester: ${trimester}`);

      // Get registrations for the specified trimester
      const registrations = await registrationRepository.getRegistrationsByTrimester(trimester);

      successResponse(res, registrations, {
        message: `Retrieved ${registrations.length} registrations for ${trimester} trimester`,
        req,
        startTime,
        context: {
          controller: 'RegistrationController',
          method: 'getRegistrationsByTrimester',
          trimester,
        },
      });
    } catch (error) {
      logger.error('Error getting registrations by trimester:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: {
          controller: 'RegistrationController',
          method: 'getRegistrationsByTrimester',
        },
      });
    }
  }
}
