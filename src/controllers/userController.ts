/**
 * User Controller
 * ===============
 *
 * API endpoints for user management.
 * Handles students, instructors, admins, parents, and app configuration.
 */

import { serviceContainer, ServiceKeys } from '../infrastructure/container/serviceContainer.js';
import type { Request, Response } from 'express';
import { AuthenticatedUserResponse } from '../models/shared/responses/authenticatedUserResponse.js';
import {
  AppConfigurationResponse,
  DEFAULT_REGISTRATION_CONFIG,
} from '../models/shared/responses/appConfigurationResponse.js';
import { configService } from '../services/configurationService.js';
import { getLogger } from '../utils/logger.js';
import { successResponse, errorResponse, asString } from '../common/responseHelpers.js';
import { ValidationError } from '../common/errors.js';
import { PeriodType } from '../utils/values/periodType.js';
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
      const periodService = serviceContainer.get(ServiceKeys.periodService);
      const userRepository = serviceContainer.get(ServiceKeys.userRepository);
      const [currentPeriod, nextPeriod, admins] = await Promise.all([
        periodService.getCurrentPeriod(),
        periodService.getNextPeriod(),
        userRepository.getAdmins(),
      ]);

      // Get maintenance mode configuration from singleton configService
      const appConfig = configService.getApplicationConfig();

      const directorAdmin = admins.find(a => a.isDirector) ?? null;
      const director = directorAdmin
        ? {
            fullName: directorAdmin.fullName,
            email: directorAdmin.email,
            displayEmail: directorAdmin.displayEmail,
            phone: directorAdmin.phoneNumber,
            displayPhone: directorAdmin.displayPhone,
          }
        : null;

      const configurationData = {
        currentPeriod,
        nextPeriod,
        rockBandClassIds: configService.getRockBandClassIds(),
        currentTrimester: currentPeriod.trimester,
        // Show the name of the next trimester in sequence, not the next period's trimester.
        // During enrollment, the next scheduled period (e.g., open enrollment) can be the same trimester.
        // Admins expect the label to reflect the upcoming trimester (e.g., winter → spring).
        nextTrimester: PeriodService.getNextTrimesterInSequence(currentPeriod.trimester),
        availableTrimesters: UserController._getAvailableTrimesters(currentPeriod),
        // Default trimester is always the current one (where active classes are happening)
        defaultTrimester: currentPeriod.trimester,
        maintenanceMode: appConfig.maintenanceMode,
        maintenanceMessage: appConfig.maintenanceMessage,
        director,
        registrationConfig: DEFAULT_REGISTRATION_CONFIG,
      };

      const configuration = new AppConfigurationResponse(configurationData);

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
  private static _getAvailableTrimesters(currentPeriod: {
    trimester: string;
    periodType: string;
  }): string[] {
    const currentTrimester = currentPeriod.trimester;
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
   * Authenticate user by access code.
   *
   * **`{ success: true, data: null }` on miss — not 401.** This endpoint
   * behaves as a *lookup probe*, not an authenticate-or-fail endpoint. On a
   * missed lookup it returns the standard success envelope with `data: null`
   * (HTTP 200), NOT a 401.
   *
   * Why this matters: the frontend's `HttpService` treats 401 as a session-
   * expiration signal — it clears `localStorage` (`forte_auth_session`) and
   * fires `#onSessionExpired`, which logs the user out and re-shows the login
   * modal (see [src/web/js/data/httpService.ts](../web/js/data/httpService.ts)
   * line 84 onward). If THIS endpoint returned 401, an unsuccessful login
   * attempt would clear the session of a user who isn't logged in yet and
   * loop the login modal on every failed attempt. So the miss must look like
   * a successful lookup with a null result.
   *
   * Do NOT change the return shape here without also updating `HttpService`
   * — the two sides of this contract must stay in sync.
   *
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

      const userRepository = serviceContainer.get(ServiceKeys.userRepository);

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
      const email = admin?.email || instructor?.email || parent?.email || '';
      const authenticatedUser = new AuthenticatedUserResponse({
        email,
        admin,
        instructor,
        parent,
      });

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
   * Get instructor directory tab data
   * Returns only admins and instructors (no students, registrations, classes, rooms)
   * REST: GET /api/instructor/tabs/directory
   */
  static async getInstructorDirectoryTabData(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const queryService = serviceContainer.get(ServiceKeys.entityQueryService);

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
        throw new ValidationError('Parent ID is required');
      }

      if (!trimester) {
        throw new ValidationError('Trimester parameter is required');
      }

      const queryService = serviceContainer.get(ServiceKeys.entityQueryService);

      // Get parent's students first (needed to scope registrations).
      // The route's trimester IS the active period for the lookup — keep them in sync.
      const parentStudents = await queryService.getStudents({ parentId, period: trimester });
      const parentStudentIds = parentStudents.map(s => s.id);

      // Fetch registrations for the provided trimester
      const registrations = await queryService.getRegistrations({
        trimester,
        studentIds: parentStudentIds,
      });

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
