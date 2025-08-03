/**
 * Registration Controller - Application layer API endpoints for program registration management
 * Handles classes, registrations, rooms, and registration lifecycle
 * 
 * Updated to use Domain-Driven Design architecture with service container
 * and application services for business logic coordination.
 */

import { RegistrationType } from '../../core/values/registrationType.js';
import { serviceContainer } from '../../infrastructure/container/serviceContainer.js';
import { _fetchData } from '../../utils/helpers.js';

export class RegistrationController {
  /**
   * Get all classes
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
   * Get all registrations with pagination using application service
   */
  static async getRegistrations(req, res) {
    try {
      const request = req.body || {};

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
        pageSize: request.pageSize || 50,  // Increased from 10 to 50
        sortBy: request.sortBy || 'registeredAt',
        sortOrder: request.sortOrder || 'desc'
      };

      // Get registrations through application service
      const result = await registrationApplicationService.getRegistrations(options);

      // For backward compatibility with existing pagination format
      const legacyResult = _fetchData(() => result.registrations, request.page || 0, request.pageSize || 50);

      // Enhance with domain insights
      legacyResult.domainInsights = {
        totalActive: result.registrations.filter(r => r.isActive).length,
        totalByType: RegistrationController.#groupByRegistrationType(result.registrations),
        totalConflicts: result.registrations.filter(r => r.hasConflicts).length
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
      const userId = req.currentUser?.email || 'system';

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
        trimester: requestData.trimester || 'Fall'
      };

      // Process registration through application service
      const result = await registrationApplicationService.processRegistration(registrationData, userId);

      // Return enriched response
      res.status(201).json({
        success: true,
        message: 'Registration created successfully',
        data: {
          id: result.id,
          studentId: result.studentId,
          classId: result.classId,
          instructorId: result.instructorId,
          registrationType: result.registrationType,
          schoolYear: result.schoolYear,
          trimester: result.trimester,
          className: result.className,
          registeredAt: result.registeredAt,
          canMarkAttendance: result.canMarkAttendance,
          validationResults: result.validationResults,
          conflictAnalysis: result.conflictAnalysis
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
      const userId = req.currentUser?.email || 'system';

      const registrationApplicationService = serviceContainer.get('registrationApplicationService');

      const result = await registrationApplicationService.updateRegistration(registrationId, updates, userId);

      res.json({
        success: true,
        message: 'Registration updated successfully',
        data: result
      });

    } catch (error) {
      console.error('Error updating registration:', error);
      res.status(400).json({
        success: false,
        error: error.message
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
      const userId = req.currentUser?.email || 'system';

      const registrationApplicationService = serviceContainer.get('registrationApplicationService');

      const result = await registrationApplicationService.cancelRegistration(registrationId, reason, userId);

      res.json({
        success: true,
        message: 'Registration cancelled successfully',
        data: result
      });

    } catch (error) {
      console.error('Error cancelling registration:', error);
      res.status(400).json({
        success: false,
        error: error.message
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

      const validation = await registrationApplicationService.validateRegistration(registrationData);

      res.json({
        success: true,
        data: validation
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
        data: conflicts
      });

    } catch (error) {
      console.error('Error getting registration conflicts:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Register student (legacy endpoint for backward compatibility)
   */
  static async register(req, res) {
    try {
      const { studentId, classId, instructorId, registrationType } = req.body;
      const userId = req.currentUser?.email || 'system';

      if (!studentId || !registrationType) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const registrationData = {
        studentId,
        classId,
        instructorId,
        registrationType,
        schoolYear: '2025-2026',
        trimester: 'Fall'
      };

      const registrationApplicationService = serviceContainer.get('registrationApplicationService');
      const result = await registrationApplicationService.processRegistration(registrationData, userId);

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
      const { registrationId } = req.body;
      const userId = req.currentUser?.email || 'system';

      if (!registrationId) {
        return res.status(400).json({ error: 'Missing registrationId' });
      }

      const registrationApplicationService = serviceContainer.get('registrationApplicationService');
      await registrationApplicationService.cancelRegistration(registrationId, 'Unregistered via legacy endpoint', userId);

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
