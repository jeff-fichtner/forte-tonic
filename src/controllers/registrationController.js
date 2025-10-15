/**
 * Registration Controller - Application layer API endpoints for program registration management
 * Handles classes, registrations, rooms, and registration lifecycle
 *
 * Updated to use Domain-Driven Design architecture with service container
 * and application services for business logic coordination.
 */

import { getAuthenticatedUserEmail } from '../middleware/auth.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger();
import { serviceContainer } from '../infrastructure/container/serviceContainer.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger();
import { _fetchData } from '../utils/helpers.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger();

export class RegistrationController {
  /**
   * Get all classes/programs
   */
  static async getClasses(req, res) {
    try {
      const programRepository = serviceContainer.get('programRepository');
      const data = await programRepository.getClasses();
      res.json(data);
    } catch (error) {
      logger.error('Error getting classes:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get registrations with filtering and pagination
   */
  static async getRegistrations(req, res) {
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

      res.json(legacyResult);
    } catch (error) {
      logger.error('Error getting registrations:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get all rooms
   */
  static async getRooms(req, res) {
    try {
      const userRepository = serviceContainer.get('userRepository');
      const data = await userRepository.getRooms();
      res.json(data);
    } catch (error) {
      logger.error('Error getting rooms:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Create Registration using application service with comprehensive validation
   */
  static async createRegistration(req, res) {
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
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: studentId, registrationType',
        });
      }

      // Use the registration application service for business logic
      const registrationApplicationService = serviceContainer.get('registrationApplicationService');

      // Process registration through application service with authenticated user
      const result = await registrationApplicationService.processRegistration(
        requestData,
        authenticatedUserEmail
      );

      // Return enriched response with complete registration data
      res.status(201).json({
        success: true,
        message: 'Registration created successfully',
        data: {
          id: result.registration.id,
          studentId: result.registration.studentId,
          instructorId: result.registration.instructorId,
          day: result.registration.day,
          startTime: result.registration.startTime,
          length: result.registration.length,
          registrationType: result.registration.registrationType,
          instrument: result.registration.instrument,
          classId: result.registration.classId,
          classTitle: result.registration.classTitle,
          roomId: result.registration.roomId,
          transportationType: result.registration.transportationType,
          notes: result.registration.notes,
          schoolYear: result.registration.schoolYear,
          trimester: result.registration.trimester,
          expectedStartDate: result.registration.expectedStartDate,
          registeredAt: result.registration.registeredAt,
          registeredBy: result.registration.registeredBy,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error creating registration:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to create registration',
        error: error.message,
      });
    }
  }

  /**
   * Update registration using application service
   */
  static async updateRegistration(req, res) {
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

      res.json({
        success: true,
        message: 'Registration updated successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Error updating registration:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Cancel registration using application service
   */
  static async cancelRegistration(req, res) {
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

      res.json({
        success: true,
        message: 'Registration cancelled successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Error cancelling registration:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Validate registration for conflicts and eligibility
   */
  static async validateRegistration(req, res) {
    try {
      const registrationData = req.body;

      const registrationApplicationService = serviceContainer.get('registrationApplicationService');

      const validation =
        await registrationApplicationService.validateRegistration(registrationData);

      res.json({
        success: true,
        data: validation,
      });
    } catch (error) {
      logger.error('Error validating registration:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get registration conflicts for a student
   */
  static async getRegistrationConflicts(req, res) {
    try {
      const { studentId } = req.params;

      const registrationApplicationService = serviceContainer.get('registrationApplicationService');

      const conflicts = await registrationApplicationService.getStudentConflicts(studentId);

      res.json({
        success: true,
        data: conflicts,
      });
    } catch (error) {
      logger.error('Error getting registration conflicts:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Register student (legacy endpoint for backward compatibility)
   */
  static async register(req, res) {
    try {
      const { studentId, classId, instructorId, registrationType } = req.body;

      // Get the authenticated user's email for audit purposes
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);

      logger.info('🎯 Legacy registration request received:', {
        studentId,
        classId,
        instructorId,
        registrationType,
        authenticatedUser: authenticatedUserEmail,
      });

      if (!studentId || !registrationType) {
        return res.status(400).json({ error: 'Missing required fields' });
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

      res.json({ success: true, registration: result });
    } catch (error) {
      logger.error('Error registering student:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Unregister student (legacy endpoint for backward compatibility)
   */
  static async unregister(req, res) {
    try {
      logger.info('Unregister endpoint called with body:', req.body);

      // Handle HttpService payload format: [{ data: { registrationId, accessCode } }]
      let registrationId, accessCode;
      if (Array.isArray(req.body) && req.body[0]?.data) {
        registrationId = req.body[0].data.registrationId;
        accessCode = req.body[0].data.accessCode;
      } else {
        registrationId = req.body.registrationId;
        accessCode = req.body.accessCode;
      }

      // Get the authenticated user's email for audit purposes
      let authenticatedUserEmail = getAuthenticatedUserEmail(req);

      // If access code is provided, validate it and use it for more specific audit trail
      if (accessCode) {
        try {
          const userRepository = req.userRepository || serviceContainer.get('userRepository');
          const operatorUser = await userRepository.getOperatorUserByAccessCode(accessCode);
          if (operatorUser) {
            // Use the access code user's email for more precise audit trail
            authenticatedUserEmail = operatorUser.email || authenticatedUserEmail;
          }
        } catch (accessCodeError) {
          logger.warn(
            'Could not validate access code for audit, using session user:',
            accessCodeError.message
          );
          // Continue with session-based authentication as fallback
        }
      }

      if (!authenticatedUserEmail) {
        return res.status(401).json({ error: 'Authentication required for registration deletion' });
      }

      logger.info('🎯 Legacy unregister request received:', {
        registrationId,
        authenticatedUser: authenticatedUserEmail,
        hasAccessCode: !!accessCode,
      });

      logger.info('Extracted registrationId:', registrationId);
      logger.info('registrationId type:', typeof registrationId);

      if (!registrationId) {
        logger.error('Missing registrationId in request body');
        return res.status(400).json({ error: 'Missing registrationId' });
      }

      const registrationApplicationService = serviceContainer.get('registrationApplicationService');
      await registrationApplicationService.cancelRegistration(
        registrationId,
        'Unregistered via legacy endpoint',
        authenticatedUserEmail
      );

      res.json({ success: true, message: 'Registration removed' });
    } catch (error) {
      logger.error('Error unregistering student:', error);
      res.status(500).json({ error: error.message });
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
}
