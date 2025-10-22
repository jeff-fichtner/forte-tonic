/**
 * User Controller - Application layer API endpoints for user management
 * Handles users, students, instructors, admins, and parents
 *
 * Updated to use Domain-Driven Design architecture with service container
 * and application services for business logic coordination.
 */

import { UserTransformService } from '../services/userTransformService.js';
import { getAuthenticatedUserEmail } from '../middleware/auth.js';
import { serviceContainer } from '../infrastructure/container/serviceContainer.js';
import { AuthenticatedUserResponse } from '../models/shared/responses/authenticatedUserResponse.js';
import { AppConfigurationResponse } from '../models/shared/responses/appConfigurationResponse.js';
import { ConfigurationService } from '../services/configurationService.js';
import { getLogger } from '../utils/logger.js';
import { successResponse, errorResponse } from '../common/responseHelpers.js';
import { ValidationError } from '../common/errors.js';
import { HTTP_STATUS } from '../common/errorConstants.js';

const logger = getLogger();

export class UserController {
  /**
   * Get application configuration including current period and settings
   * CRITICAL: Used by frontend initialization - must return raw data for compatibility
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  static async getAppConfiguration(req, res) {
    const startTime = Date.now();

    try {
      const periodService = serviceContainer.get('periodService');
      const currentPeriod = await periodService.getCurrentPeriod();

      const configurationData = {
        currentPeriod,
        rockBandClassIds: ConfigurationService.getRockBandClassIds(),
      };

      const configuration = new AppConfigurationResponse(configurationData);

      // Return raw data (not wrapped) for backward compatibility
      // Frontend expects: AppConfigurationResponse.fromApiData(data)
      return res.json(configuration.toJSON());
    } catch (error) {
      logger.error('Error getting app configuration:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'UserController', method: 'getAppConfiguration' },
      });
    }
  }

  /**
   * Get all admins
   */
  static async getAdmins(req, res) {
    try {
      const userRepository = serviceContainer.get('userRepository');
      const data = await userRepository.getAdmins();
      const transformedData = UserTransformService.transformArray(data, 'admin');
      res.json(transformedData);
    } catch (error) {
      logger.error('Error getting admins:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get all instructors
   */
  static async getInstructors(req, res) {
    try {
      const userRepository = serviceContainer.get('userRepository');

      // Force refresh to get latest data from spreadsheet
      const data = await userRepository.getInstructors();

      // The data is already transformed by Instructor.fromDatabaseRow
      // No need to transform again with UserTransformService
      res.json(data);
    } catch (error) {
      logger.error('Error in getInstructors:', error);
      res.status(500).json({ error: 'Failed to retrieve instructors' });
    }
  }

  /**
   * Get students - simplified to match instructor pattern
   */
  static async getStudents(req, res) {
    try {
      const userRepository = serviceContainer.get('userRepository');
      const data = await userRepository.getStudents();
      const transformedData = UserTransformService.transformArray(data, 'student');
      res.json(transformedData);
    } catch (error) {
      logger.error('Error getting students:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get detailed student information using application service
   */
  static async getStudentDetails(req, res) {
    try {
      const { studentId } = req.params;
      const studentApplicationService = serviceContainer.get('studentApplicationService');

      const details = await studentApplicationService.getStudentDetails(studentId);

      res.json({
        success: true,
        data: details,
      });
    } catch (error) {
      logger.error('Error getting student details:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Update student profile using application service
   */
  static async updateStudent(req, res) {
    try {
      const { studentId } = req.params;
      const updates = req.body;
      const userId = getAuthenticatedUserEmail(req);

      const studentApplicationService = serviceContainer.get('studentApplicationService');

      const result = await studentApplicationService.updateStudentProfile(
        studentId,
        updates,
        userId
      );

      res.json({
        success: true,
        data: result,
        message: 'Student profile updated successfully',
      });
    } catch (error) {
      logger.error('Error updating student:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Enroll a new student using application service
   */
  static async enrollStudent(req, res) {
    try {
      const studentData = req.body;
      const userId = getAuthenticatedUserEmail(req);

      const studentApplicationService = serviceContainer.get('studentApplicationService');

      const result = await studentApplicationService.enrollStudent(studentData, userId);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Student enrolled successfully',
      });
    } catch (error) {
      logger.error('Error enrolling student:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Generate student progress report
   */
  static async getStudentProgressReport(req, res) {
    try {
      const { studentId } = req.params;

      const studentApplicationService = serviceContainer.get('studentApplicationService');

      const report = await studentApplicationService.generateProgressReport(studentId);

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      logger.error('Error generating progress report:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Private method: Get parent emails for a student
   */

  /**
   * Authenticate user by access code
   * NOTE: Returns null for failed authentication (required for frontend compatibility)
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  static async authenticateByAccessCode(req, res) {
    const startTime = Date.now();

    try {
      const { accessCode, loginType } = req.body;

      if (!accessCode) {
        throw new ValidationError('Access code is required');
      }

      const userRepository = serviceContainer.get('userRepository');

      let admin = null;
      let instructor = null;
      let parent = null;

      // Auto-detect authentication type based on access code format
      const isPhoneNumber = accessCode.length === 10 && /^\d{10}$/.test(accessCode);
      const isAccessCode = accessCode.length === 6 && /^\d{6}$/.test(accessCode);

      // Handle parent login with phone number (primary attempt)
      if (isPhoneNumber || loginType === 'parent') {
        parent = await userRepository.getParentByPhone(accessCode);
      }

      // Handle employee login with 6-digit access code (primary attempt)
      if (!parent && (isAccessCode || loginType === 'employee')) {
        // Check admin first
        admin = await userRepository.getAdminByAccessCode(accessCode);

        // If not found in admin, check instructor
        if (!admin) {
          instructor = await userRepository.getInstructorByAccessCode(accessCode);
        }
      }

      // Fallback attempts if primary method failed
      if (!admin && !instructor && !parent) {
        if (isPhoneNumber && loginType !== 'parent') {
          parent = await userRepository.getParentByPhone(accessCode);
        } else if (isAccessCode && loginType !== 'employee') {
          admin = await userRepository.getAdminByAccessCode(accessCode);
          if (!admin) {
            instructor = await userRepository.getInstructorByAccessCode(accessCode);
          }
        }
      }

      // If no match found, return null (frontend expects this)
      if (!admin && !instructor && !parent) {
        logger.info(`Authentication failed for ${loginType} login with value: ${accessCode}`);

        // IMPORTANT: Return raw null (not wrapped) for backward compatibility
        // Frontend checks: authenticatedUser !== null
        return res.json(null);
      }

      // Create AuthenticatedUserResponse with the matched user
      const authenticatedUser = new AuthenticatedUserResponse(
        admin?.email || instructor?.email || parent?.email,
        admin,
        instructor,
        parent
      );

      logger.info(`Authentication successful for ${loginType} login:`, {
        admin: !!admin,
        instructor: !!instructor,
        parent: !!parent,
      });

      // Return raw authenticated user (not wrapped) for backward compatibility
      res.json(authenticatedUser);
    } catch (error) {
      logger.error('Error authenticating by access code:', error);

      // Use standardized error response for server errors
      // This distinguishes from "no match found" (which returns null)
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'UserController', method: 'authenticateByAccessCode' },
      });
    }
  }

  /**
   * Get admin by access code
   */
  static async getAdminByAccessCode(req, res) {
    try {
      const { accessCode } = req.body;

      if (!accessCode) {
        return res.status(400).json({ error: 'Access code is required' });
      }

      const userRepository = serviceContainer.get('userRepository');
      const admin = await userRepository.getAdminByAccessCode(accessCode);

      if (!admin) {
        return res.status(404).json({ error: 'Admin not found with provided access code' });
      }

      const transformedData = UserTransformService.transform(admin, 'admin');
      res.json(transformedData);
    } catch (error) {
      logger.error('Error getting admin by access code:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get instructor by access code
   */
  static async getInstructorByAccessCode(req, res) {
    try {
      const { accessCode } = req.body;

      if (!accessCode) {
        return res.status(400).json({ error: 'Access code is required' });
      }

      const userRepository = serviceContainer.get('userRepository');
      const instructor = await userRepository.getInstructorByAccessCode(accessCode);

      if (!instructor) {
        return res.status(404).json({ error: 'Instructor not found with provided access code' });
      }

      const transformedData = UserTransformService.transform(instructor, 'instructor');
      res.json(transformedData);
    } catch (error) {
      logger.error('❌ ERROR in getInstructorByAccessCode:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get parent by access code
   */
  static async getParentByAccessCode(req, res) {
    try {
      const { accessCode } = req.body;

      if (!accessCode) {
        return res.status(400).json({ error: 'Access code is required' });
      }

      const userRepository = serviceContainer.get('userRepository');
      const parent = await userRepository.getParentByAccessCode(accessCode);

      if (!parent) {
        return res.status(404).json({ error: 'Parent not found with provided access code' });
      }

      const transformedData = UserTransformService.transform(parent, 'parent');
      res.json(transformedData);
    } catch (error) {
      logger.error('Error getting parent by access code:', error);
      res.status(500).json({ error: error.message });
    }
  }
}
