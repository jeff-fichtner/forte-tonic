/**
 * Registration Controller - Application layer API endpoints for program registration management
 * Handles classes, registrations, rooms, and registration lifecycle
 *
 * Updated to use Domain-Driven Design architecture with service container
 * and application services for business logic coordination.
 */

import { getAuthenticatedUserEmail } from '../middleware/auth.js';
import { RegistrationType } from '../utils/values/registrationType.js';
import { serviceContainer } from '../infrastructure/container/serviceContainer.js';
import { _fetchData } from '../utils/helpers.js';

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
      console.error('Error getting classes:', error);
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
      console.error('Error getting registrations:', error);
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
      console.error('Error getting rooms:', error);
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
      
      console.log('🎯 Registration creation request received:', {
        ...requestData,
        authenticatedUser: authenticatedUserEmail,
        currentUser: req.currentUser,
        hasAccessCode: !!requestData.accessCode
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

      const registrationData = {
        ...requestData,
        schoolYear: requestData.schoolYear || '2025-2026',
        trimester: requestData.trimester || 'Fall',
      };

      // Process registration through application service with authenticated user
      const result = await registrationApplicationService.processRegistration(
        registrationData,
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
          className: result.registration.className,
          roomId: result.registration.roomId,
          transportationType: result.registration.transportationType,
          notes: result.registration.notes,
          schoolYear: result.registration.schoolYear,
          trimester: result.registration.trimester,
          expectedStartDate: result.registration.expectedStartDate,
          registeredAt: result.registration.registeredAt,
          registeredBy: result.registration.registeredBy,
          // Include any additional computed fields
          canMarkAttendance: result.canMarkAttendance,
          validationResults: result.validationResults,
          conflictAnalysis: result.conflictAnalysis,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error creating registration:', error);
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
      console.error('Error updating registration:', error);
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
      
      console.log('🎯 Registration cancellation request received:', {
        registrationId,
        reason,
        authenticatedUser: authenticatedUserEmail
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
      console.error('Error cancelling registration:', error);
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
      console.error('Error validating registration:', error);
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
      console.error('Error getting registration conflicts:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Register - New Repository Pattern
   */
  static async registerWithRepository(req, res) {
    try {
      const registrationData = req.body;
      
      // Get the authenticated user's email for audit purposes
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);
      
      console.log('🎯 Registration request received:', {
        ...registrationData,
        authenticatedUser: authenticatedUserEmail
      });

      const programRepository = req.programRepository || serviceContainer.get('programRepository');

      // Get additional data needed for registration
      const userRepository = req.userRepository || serviceContainer.get('userRepository');
      
      let groupClass = null;
      if (registrationData.classId) {
        const classes = await programRepository.getClasses();
        groupClass = classes.find(c => c.id === registrationData.classId);
      }

      let instructor = null;
      if (registrationData.instructorId) {
        instructor = await userRepository.getInstructorById(registrationData.instructorId);
      }

      // Pass the authenticated user email to the register method
      const result = await programRepository.register(
        registrationData, 
        groupClass, 
        instructor, 
        authenticatedUserEmail // Use authenticated user email instead of 'SYSTEM'
      );

      res.status(201).json({
        success: true,
        data: result,
        message: 'Registration created successfully'
      });

    } catch (error) {
      console.error('❌ Error in register:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Unregister - New Repository Pattern  
   */
  static async unregisterWithRepository(req, res) {
    try {
      const { registrationId } = req.body;
      
      // Get the authenticated user's email for audit purposes
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);
      
      console.log('🎯 Unregister request received:', {
        registrationId,
        authenticatedUser: authenticatedUserEmail
      });

      if (!registrationId) {
        return res.status(400).json({
          success: false,
          error: 'Registration ID is required'
        });
      }

      const programRepository = req.programRepository || serviceContainer.get('programRepository');
      
      // Pass the authenticated user email to the unregister method
      const result = await programRepository.unregister(registrationId, authenticatedUserEmail);

      if (result.success) {
        res.json({
          success: true,
          message: 'Registration removed successfully',
          ...result
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      console.error('❌ Error in unregister:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
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
      
      console.log('🎯 Legacy registration request received:', {
        studentId,
        classId,
        instructorId,
        registrationType,
        authenticatedUser: authenticatedUserEmail
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
      console.error('Error registering student:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Unregister student (legacy endpoint for backward compatibility)
   */
  static async unregister(req, res) {
    try {
      console.log('Unregister endpoint called with body:', req.body);
      
      // Handle HttpService payload format: [{ data: { registrationId } }]
      let registrationId;
      if (Array.isArray(req.body) && req.body[0]?.data?.registrationId) {
        registrationId = req.body[0].data.registrationId;
      } else {
        registrationId = req.body.registrationId;
      }
      
      // Get the authenticated user's email for audit purposes
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);
      
      console.log('🎯 Legacy unregister request received:', {
        registrationId,
        authenticatedUser: authenticatedUserEmail
      });

      console.log('Extracted registrationId:', registrationId);
      console.log('registrationId type:', typeof registrationId);

      if (!registrationId) {
        console.error('Missing registrationId in request body');
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
      console.error('Error unregistering student:', error);
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
