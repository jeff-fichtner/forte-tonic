/**
 * User Controller - Application layer API endpoints for user management
 * Handles users, students, instructors, admins, and parents
 *
 * Updated to use Domain-Driven Design architecture with service container
 * and application services for business logic coordination.
 */

import { serviceContainer } from '../infrastructure/container/serviceContainer.js';
import type { Request, Response } from 'express';
import { AuthenticatedUserResponse } from '../models/shared/responses/authenticatedUserResponse.js';
import { AppConfigurationResponse } from '../models/shared/responses/appConfigurationResponse.js';
import { configService } from '../services/configurationService.js';
import { getLogger } from '../utils/logger.js';
import { successResponse, errorResponse, asString } from '../common/responseHelpers.js';
import { ValidationError, NotFoundError } from '../common/errors.js';
import { PeriodType } from '../utils/values/periodType.js';
import { Trimester } from '../utils/values/trimester.js';
import { PeriodService } from '../services/periodService.js';

const logger = getLogger();

export class UserController {
  /**
   * Get application configuration including current period and settings
   * Used by frontend initialization
   */
  static async getAppConfiguration(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const periodService = serviceContainer.get('periodService');
      const currentPeriod = await periodService.getCurrentPeriod();
      const nextPeriod = await periodService.getNextPeriod();

      // Get maintenance mode configuration from singleton configService
      const appConfig = configService.getApplicationConfig();

      const configurationData = {
        currentPeriod,
        nextPeriod,
        rockBandClassIds: configService.getRockBandClassIds(),
        currentTrimester: currentPeriod?.trimester,
        // Show the name of the next trimester in sequence, not the next period's trimester
        // During enrollment, the next scheduled period (e.g., open enrollment) can be the same trimester
        // Admins expect the label to reflect the upcoming trimester (e.g., winter → spring)
        nextTrimester: currentPeriod?.trimester
          ? PeriodService.getNextTrimesterInSequence(currentPeriod.trimester)
          : nextPeriod?.trimester,
        availableTrimesters: UserController._getAvailableTrimesters(currentPeriod),
        // Default trimester is always the current one (where active classes are happening)
        defaultTrimester: currentPeriod?.trimester,
        maintenanceMode: appConfig.maintenanceMode,
        maintenanceMessage: appConfig.maintenanceMessage,
      };

      const configuration = new AppConfigurationResponse(
        configurationData as unknown as ConstructorParameters<typeof AppConfigurationResponse>[0] // SC-005: cross-model interface narrowing
      );

      // Use standardized response format
      // HttpService will auto-unwrap { success: true, data: {...} } to just the data
      successResponse(res, configuration.toJSON(), {
        req,
        startTime,
        message: 'Application configuration retrieved successfully',
        context: { controller: 'UserController', method: 'getAppConfiguration' },
      });
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
   * Determine which trimesters should be visible/accessible based on current period
   *
   * Rules:
   * - Intent period: Show previous trimester (for review/history) + current trimester
   * - Priority/Open Enrollment/Registration: Show current trimester + next trimester (for enrollment)
   *
   * Examples:
   * - Fall Intent → [spring, fall] - can view spring history and current fall
   * - Fall Priority Enrollment → [fall, winter] - can view fall and enroll in winter
   * - Winter Priority Enrollment → [winter, spring] - can view winter and enroll in spring
   * - Spring Priority Enrollment → [spring, fall] - can view spring and enroll in fall (next year)
   *
   */
  private static _getAvailableTrimesters(
    currentPeriod: { trimester: string | null; periodType: string } | null
  ): string[] {
    if (!currentPeriod) {
      // No period configured - show only fall as fallback
      return [Trimester.FALL];
    }

    const currentTrimester = currentPeriod.trimester || Trimester.FALL;
    const currentPeriodType = currentPeriod.periodType;

    // During Intent period: show previous trimester + current trimester
    // This allows viewing history from previous trimester while in intent for current
    if (currentPeriodType === PeriodType.INTENT) {
      const previousTrimester = PeriodService.getPreviousTrimesterInSequence(currentTrimester);
      return [previousTrimester, currentTrimester];
    }

    // During Priority Enrollment, Open Enrollment, or Registration:
    // Show current trimester AND next trimester (for enrollment)
    if (
      currentPeriodType === PeriodType.PRIORITY_ENROLLMENT ||
      currentPeriodType === PeriodType.OPEN_ENROLLMENT ||
      currentPeriodType === PeriodType.REGISTRATION
    ) {
      const nextTrimester = PeriodService.getNextTrimesterInSequence(currentTrimester);
      return [currentTrimester, nextTrimester];
    }

    // Fallback: show only current trimester
    return [currentTrimester];
  }

  /**
   * Get all admins
   */
  static async getAdmins(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const userRepository = serviceContainer.get('userRepository');
      const data = await userRepository.getAdmins();

      successResponse(res, data, {
        req,
        startTime,
        context: { controller: 'UserController', method: 'getAdmins' },
      });
    } catch (error) {
      logger.error('Error getting admins:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'UserController', method: 'getAdmins' },
      });
    }
  }

  /**
   * Get all instructors
   */
  static async getInstructors(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const userRepository = serviceContainer.get('userRepository');

      // Force refresh to get latest data from spreadsheet
      const data = await userRepository.getInstructors();

      successResponse(res, data, {
        req,
        startTime,
        context: { controller: 'UserController', method: 'getInstructors' },
      });
    } catch (error) {
      logger.error('Error in getInstructors:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'UserController', method: 'getInstructors' },
      });
    }
  }

  /**
   * Get students - simplified to match instructor pattern
   */
  static async getStudents(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const userRepository = serviceContainer.get('userRepository');
      const data = await userRepository.getStudents();

      successResponse(res, data, {
        req,
        startTime,
        context: { controller: 'UserController', method: 'getStudents' },
      });
    } catch (error) {
      logger.error('Error getting students:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'UserController', method: 'getStudents' },
      });
    }
  }

  /**
   * Authenticate user by access code
   * NOTE: Returns null for failed authentication (required for frontend compatibility)
   * @param req - Express request object
   * @param res - Express response object
   */
  static async authenticateByAccessCode(req: Request, res: Response): Promise<void> {
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

      // If no match found, return null data
      if (!admin && !instructor && !parent) {
        logger.info(`Authentication failed for ${loginType} login with value: ${accessCode}`);

        return successResponse(res, null, {
          req,
          startTime,
          context: { controller: 'UserController', method: 'authenticateByAccessCode' },
        });
      }

      // Create AuthenticatedUserResponse with the matched user
      const authenticatedUser = new AuthenticatedUserResponse(
        admin?.email || instructor?.email || parent?.email || '',
        admin,
        instructor,
        parent
      );

      logger.info(`Authentication successful for ${loginType} login:`, {
        admin: !!admin,
        instructor: !!instructor,
        parent: !!parent,
      });

      successResponse(res, authenticatedUser, {
        req,
        startTime,
        context: { controller: 'UserController', method: 'authenticateByAccessCode' },
      });
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
   * REST: GET /admins/by-access-code/:accessCode
   */
  static async getAdminByAccessCode(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const accessCode = asString(req.params.accessCode);

      if (!accessCode) {
        throw new ValidationError('Access code is required');
      }

      const userRepository = serviceContainer.get('userRepository');
      const admin = await userRepository.getAdminByAccessCode(accessCode);

      if (!admin) {
        throw new NotFoundError('Admin not found with provided access code');
      }

      successResponse(res, admin, {
        req,
        startTime,
        context: { controller: 'UserController', method: 'getAdminByAccessCode' },
      });
    } catch (error) {
      logger.error('Error getting admin by access code:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'UserController', method: 'getAdminByAccessCode' },
      });
    }
  }

  /**
   * Get instructor by access code
   * REST: GET /instructors/by-access-code/:accessCode
   */
  static async getInstructorByAccessCode(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const accessCode = asString(req.params.accessCode);

      if (!accessCode) {
        throw new ValidationError('Access code is required');
      }

      const userRepository = serviceContainer.get('userRepository');
      const instructor = await userRepository.getInstructorByAccessCode(accessCode);

      if (!instructor) {
        throw new NotFoundError('Instructor not found with provided access code');
      }

      successResponse(res, instructor, {
        req,
        startTime,
        context: { controller: 'UserController', method: 'getInstructorByAccessCode' },
      });
    } catch (error) {
      logger.error('Error in getInstructorByAccessCode:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'UserController', method: 'getInstructorByAccessCode' },
      });
    }
  }

  /**
   * Get parent by access code
   * REST: GET /parents/by-access-code/:accessCode
   */
  static async getParentByAccessCode(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const accessCode = asString(req.params.accessCode);

      if (!accessCode) {
        throw new ValidationError('Access code is required');
      }

      const userRepository = serviceContainer.get('userRepository');
      const parent = await userRepository.getParentByAccessCode(accessCode);

      if (!parent) {
        throw new NotFoundError('Parent not found with provided access code');
      }

      successResponse(res, parent, {
        req,
        startTime,
        context: { controller: 'UserController', method: 'getParentByAccessCode' },
      });
    } catch (error) {
      logger.error('Error getting parent by access code:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'UserController', method: 'getParentByAccessCode' },
      });
    }
  }

  /**
   * Get instructor directory tab data
   * Returns only admins and instructors (no students, registrations, classes, rooms)
   * REST: GET /api/instructor/tabs/directory
   */
  static async getInstructorDirectoryTabData(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const queryService = serviceContainer.get('entityQueryService');

      const [admins, instructors] = await Promise.all([
        queryService.getAdmins(),
        queryService.getInstructors(),
      ]);

      const responseData = {
        admins,
        instructors,
      };

      successResponse(res, responseData, {
        req,
        startTime,
        message: 'Instructor directory data retrieved successfully',
        context: { controller: 'UserController', method: 'getInstructorDirectoryTabData' },
      });
    } catch (error) {
      logger.error('Error getting instructor directory tab data:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'UserController', method: 'getInstructorDirectoryTabData' },
      });
    }
  }

  /**
   * Get parent contact tab data
   * Returns admins and instructors currently teaching the parent's children
   * REST: GET /api/parent/tabs/contact/:trimester?parentId={parentId}
   */
  static async getParentContactTabData(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const parentId = asString(req.query.parentId);
      const trimester = asString(req.params.trimester);

      if (!parentId) {
        return errorResponse(
          res,
          new Error('Parent ID is required'),
          {
            req,
            startTime,
            context: { controller: 'UserController', method: 'getParentContactTabData' },
          },
          400
        );
      }

      if (!trimester) {
        return errorResponse(
          res,
          new Error('Trimester parameter is required'),
          {
            req,
            startTime,
            context: { controller: 'UserController', method: 'getParentContactTabData' },
          },
          400
        );
      }

      const queryService = serviceContainer.get('entityQueryService');

      // Get parent's students first (needed to scope registrations)
      const parentStudents = await queryService.getStudents({ parentId });
      const parentStudentIds = parentStudents.map(s => s.id);

      // Fetch registrations for the provided trimester
      const registrations = await queryService.getRegistrations({ trimester, studentIds: parentStudentIds });

      // Get instructors teaching parent's children
      const instructorIds = [
        ...new Set(registrations.map(reg => reg.instructorId).filter(Boolean)),
      ];

      const [relevantInstructors, admins] = await Promise.all([
        queryService.getInstructors({ instructorIds }),
        queryService.getAdmins(),
      ]);

      const responseData = {
        admins,
        instructors: relevantInstructors,
      };

      successResponse(res, responseData, {
        req,
        startTime,
        message: 'Parent contact data retrieved successfully',
        context: { controller: 'UserController', method: 'getParentContactTabData' },
      });
    } catch (error) {
      logger.error('Error getting parent contact tab data:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'UserController', method: 'getParentContactTabData' },
      });
    }
  }
}
