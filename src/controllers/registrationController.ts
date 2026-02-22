/**
 * Registration Controller - Application layer API endpoints for program registration management
 * Handles classes, registrations, rooms, and registration lifecycle
 *
 * Updated to use Domain-Driven Design architecture with service container
 * and application services for business logic coordination.
 */

import { getAuthenticatedUserEmail } from '../middleware/auth.js';
import type { Request, Response } from 'express';
import { getLogger } from '../utils/logger.js';
import { serviceContainer } from '../infrastructure/container/serviceContainer.js';
import { _fetchData } from '../utils/helpers.js';
import { successResponse, errorResponse, asString } from '../common/responseHelpers.js';
import { ValidationError, UnauthorizedError, NotFoundError } from '../common/errors.js';
import { TRIMESTER_SEQUENCE } from '../utils/values/trimester.js';
import { INTENT_TYPES } from '../constants/intentTypes.js';
import { UserType } from '../config/constants.js';

const logger = getLogger();

export class RegistrationController {
  /**
   * Get all classes/programs
   */
  static async getClasses(req: Request, res: Response): Promise<void> {
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
  static async getRegistrations(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      // Use the normalized request data from middleware
      const request = (req.requestData || {}) as Record<string, unknown>;
      const page = Number(request.page ?? 1);
      const pageSize = Number(request.pageSize ?? 1000);

      const registrationApplicationService = serviceContainer.get('registrationApplicationService');

      const options = {
        studentId: request.studentId,
        classId: request.classId,
        instructorId: request.instructorId,
        registrationType: request.registrationType,
        schoolYear: request.schoolYear,
        trimester: request.trimester,
        isActive: request.isActive,
        page,
        pageSize, // Increased to 1000
        sortBy: request.sortBy || 'registeredAt',
        sortOrder: request.sortOrder || 'desc',
      };

      // Get enriched registrations through application service
      const registrations = await registrationApplicationService.getRegistrations(options);

      // Apply pagination
      const paginatedResult = _fetchData(
        () => registrations,
        page || 0,
        pageSize || 1000
      );

      // Enhance with domain insights
      const legacyResult = {
        ...paginatedResult,
        domainInsights: {
          totalActive: registrations.filter(r => !!r.isActive).length,
          totalByType: RegistrationController.#groupByRegistrationType(registrations),
          totalConflicts: registrations.filter(r => !!r.hasConflicts).length,
        },
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
  static async getRooms(req: Request, res: Response): Promise<void> {
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
  static async createRegistration(req: Request, res: Response): Promise<void> {
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

      // Check if user is an admin (admins can bypass capacity restrictions and specify trimester)
      const isAdmin = req.currentUser?.userType === UserType.ADMIN;

      // Process registration through application service with authenticated user
      const result = await registrationApplicationService.processRegistration(
        requestData,
        authenticatedUserEmail,
        { isAdmin }
      );

      successResponse(res, result.registration, {
        message: 'Registration created successfully',
        statusCode: 201,
        req,
        startTime,
        context: { controller: 'RegistrationController', method: 'createRegistration' },
      });
    } catch (error) {
      logger.error('Error creating registration:', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        requestData: {
          studentId: req.body?.studentId,
          instructorId: req.body?.instructorId,
          registrationType: req.body?.registrationType,
          classId: req.body?.classId,
          day: req.body?.day,
          startTime: req.body?.startTime,
        },
      });
      errorResponse(res, error, {
        req,
        startTime,
        context: {
          controller: 'RegistrationController',
          method: 'createRegistration',
          studentId: req.body?.studentId,
          registrationType: req.body?.registrationType,
        },
        includeRequestData: true,
      });
    }
  }

  /**
   * Delete registration (REST DELETE endpoint)
   */
  static async deleteRegistration(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const registrationId = asString(req.params.id);

      // Get the authenticated user's email for audit purposes
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);

      if (!authenticatedUserEmail) {
        throw new UnauthorizedError('Authentication required for registration deletion');
      }

      if (!registrationId) {
        throw new ValidationError('Missing registrationId');
      }

      const registrationApplicationService = serviceContainer.get('registrationApplicationService');
      const registrationRepository = serviceContainer.get('registrationRepository');

      // Find which table contains this registration by searching all trimester tables
      const trimesterTables = TRIMESTER_SEQUENCE.map(trimester => `registrations_${trimester}`);
      let tableName = null;

      for (const table of trimesterTables) {
        try {
          const registration = await registrationRepository.findByIdInTable(table, registrationId);
          if (registration) {
            tableName = table;
            break;
          }
        } catch {
          // Continue searching in other tables
          logger.debug(`Registration not found in ${table}, continuing search...`);
        }
      }

      if (!tableName) {
        throw new ValidationError(
          `Registration ${registrationId} not found in any trimester table`
        );
      }

      logger.info(`🎯 Deleting registration from table: ${tableName}`, {
        registrationId,
        authenticatedUser: authenticatedUserEmail,
      });

      const result = await registrationApplicationService.cancelRegistration(
        registrationId,
        'Registration cancelled by user',
        authenticatedUserEmail,
        tableName
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
  static async updateIntent(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const id = asString(req.params.id);
      const { intent } = req.body;
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);

      // Validate intent
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
      const typedError = error as Error;
      if (typedError.message === 'Registration not found') {
        logger.error('Error updating intent:', error);
        errorResponse(res, new NotFoundError('Registration not found or access denied'), {
          req,
          startTime,
          context: { controller: 'RegistrationController', method: 'updateIntent' },
        });
        return;
      }
      logger.error('Error updating intent:', {
        error: typedError.message,
        stack: typedError.stack,
        registrationId: req.params?.id,
        intent: req.body?.intent,
      });
      errorResponse(res, error, {
        req,
        startTime,
        context: {
          controller: 'RegistrationController',
          method: 'updateIntent',
          registrationId: req.params?.id,
          intent: req.body?.intent,
        },
        includeRequestData: true,
      });
    }
  }

  /**
   * Private method: Group registrations by type
   */
  static #groupByRegistrationType(registrations: Record<string, unknown>[]): Record<string, number> {
    return registrations.reduce((acc: Record<string, number>, registration: Record<string, unknown>) => {
      const type = String(registration.registrationType || 'unknown');
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Get registrations for next trimester (enrollment periods only)
   * Access control:
   * - Priority enrollment: Only returning families
   * - Open enrollment: All families
   * - Other periods: Blocked
   * GET /api/registrations/next-trimester
   */
  static async getNextTrimesterRegistrations(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const periodService = serviceContainer.get('periodService');
      const registrationRepository = serviceContainer.get('registrationRepository');
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);

      logger.info('🎯 Next trimester registrations request from:', authenticatedUserEmail);

      // Check if next trimester table is available
      const nextTable = await periodService.getEnrollmentTrimesterTable();
      if (!nextTable) {
        throw new ValidationError('Next trimester registration is not currently available');
      }

      // Get all registrations from next trimester table
      const allRegistrations = await registrationRepository.getFromTable(nextTable);

      // Debug: Log classId for each registration
      logger.info(`📋 Found ${allRegistrations.length} registrations in next trimester:`);
      allRegistrations.forEach((reg, i: number) => {
        const classId = reg.classId || '';
        const classTitle = reg.classTitle || '';
        logger.info(
          `  [${i}] classId: "${classId}", classTitle: "${classTitle}", type: ${reg.registrationType}`
        );
      });

      // Note: This endpoint returns all next trimester registrations for the enrollment UI
      // Access control is enforced at the enrollment period level (see periodService checks)
      // Parents can only see/modify their own students via enrollment form validation
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
  static async createNextTrimesterRegistration(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const requestData = req.body;
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);
      const periodService = serviceContainer.get('periodService');
      const registrationRepository = serviceContainer.get('registrationRepository');
      const registrationApplicationService = serviceContainer.get('registrationApplicationService');

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
      const nextTable = await periodService.getEnrollmentTrimesterTable();
      if (!nextTable) {
        throw new ValidationError('Next trimester registration is not currently available');
      }

      // Admins bypass enrollment period restrictions
      const isAdmin = req.currentUser?.userType === UserType.ADMIN;

      if (!isAdmin) {
        // Check access permissions for non-admin users
        const currentTable = await periodService.getCurrentTrimesterTable();
        const currentRegistrations = await registrationRepository.getFromTable(currentTable);
        const hasActiveRegistrations = currentRegistrations.some(
          reg => reg.studentId === requestData.studentId
        );

        const canAccess = await periodService.canAccessNextTrimester(hasActiveRegistrations);
        if (!canAccess) {
          throw new UnauthorizedError(
            'You do not have access to next trimester registration at this time. ' +
              'Priority enrollment is for returning families only.'
          );
        }
      }

      // Use application service to validate and create registration with conflict checking
      // This ensures the same validation rules apply as regular registration creation
      const result = await registrationApplicationService.processRegistration(
        requestData,
        authenticatedUserEmail,
        { isAdmin }
      );

      logger.info(`✅ Created next trimester registration: ${result.registration.id}`);

      successResponse(res, result.registration, {
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
      logger.error('Error creating next trimester registration:', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        requestData: {
          studentId: req.body?.studentId,
          instructorId: req.body?.instructorId,
          registrationType: req.body?.registrationType,
          classId: req.body?.classId,
          linkedPreviousRegistrationId: req.body?.linkedPreviousRegistrationId,
        },
      });
      errorResponse(res, error, {
        req,
        startTime,
        context: {
          controller: 'RegistrationController',
          method: 'createNextTrimesterRegistration',
          studentId: req.body?.studentId,
          registrationType: req.body?.registrationType,
        },
        includeRequestData: true,
      });
    }
  }

  /**
   * Delete a next trimester registration (enrollment periods only)
   * DELETE /api/registrations/next-trimester/:id
   */
  static async deleteNextTrimesterRegistration(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const registrationId = asString(req.params.id);

      // Get the authenticated user's email for audit purposes
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);

      if (!authenticatedUserEmail) {
        throw new UnauthorizedError('Authentication required for registration deletion');
      }

      if (!registrationId) {
        throw new ValidationError('Missing registrationId');
      }

      const periodService = serviceContainer.get('periodService');
      const registrationApplicationService = serviceContainer.get('registrationApplicationService');

      // Get next trimester table
      const nextTable = await periodService.getEnrollmentTrimesterTable();
      if (!nextTable) {
        throw new ValidationError('Next trimester registration is not currently available');
      }

      logger.info('🎯 Deleting next trimester registration:', {
        registrationId,
        table: nextTable,
        authenticatedUser: authenticatedUserEmail,
      });

      // Delete the registration from next trimester table
      const result = await registrationApplicationService.cancelRegistration(
        registrationId,
        'Next trimester registration cancelled by user',
        authenticatedUserEmail,
        nextTable
      );

      successResponse(res, result, {
        message: 'Next trimester registration removed',
        req,
        startTime,
        context: {
          controller: 'RegistrationController',
          method: 'deleteNextTrimesterRegistration',
          registrationId,
          table: nextTable,
        },
      });
    } catch (error) {
      logger.error('Error deleting next trimester registration:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: {
          controller: 'RegistrationController',
          method: 'deleteNextTrimesterRegistration',
        },
      });
    }
  }

  /**
   * Get all registrations for a specific trimester (admin only)
   * GET /api/admin/registrations/:trimester
   */
  static async getRegistrationsByTrimester(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const trimester = asString(req.params.trimester);
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

  /**
   * Get comprehensive admin data for a specific trimester
   * Returns all data needed for admin UI: registrations, students, instructors, classes
   * GET /api/admin/trimester-data/:trimester
   */
  static async getAdminTrimesterData(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const trimester = asString(req.params.trimester);

      logger.info(`📋 Getting comprehensive admin data for trimester: ${trimester}`);

      // Get all necessary repositories
      const registrationRepository = serviceContainer.get('registrationRepository');
      const userRepository = serviceContainer.get('userRepository');
      const classRepository = serviceContainer.get('programRepository') as {
        getClasses(): Promise<unknown[]>;
      };

      // Fetch all data in parallel for performance
      const [registrations, students, instructors, classes] = await Promise.all([
        registrationRepository.getRegistrationsByTrimester(trimester),
        userRepository.getStudents(),
        userRepository.getInstructors(),
        classRepository.getClasses(),
      ]);

      const result = {
        trimester,
        registrations,
        students,
        instructors,
        classes,
      };

      successResponse(res, result, {
        message: `Retrieved admin data for ${trimester} trimester`,
        req,
        startTime,
        context: {
          controller: 'RegistrationController',
          method: 'getAdminTrimesterData',
          trimester,
          counts: {
            registrations: registrations.length,
            students: students.length,
            instructors: instructors.length,
            classes: classes.length,
          },
        },
      });
    } catch (error) {
      logger.error('Error getting admin trimester data:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: {
          controller: 'RegistrationController',
          method: 'getAdminTrimesterData',
        },
      });
    }
  }

  /**
   * Get admin wait list tab data
   * Returns only Rock Band registrations + associated students for wait list
   * REST: GET /api/admin/tabs/wait-list/:trimester
   */
  static async getAdminWaitListTabData(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const trimester = asString(req.params.trimester);

      if (!trimester) {
        return errorResponse(
          res,
          new Error('Trimester is required'),
          {
            req,
            startTime,
            context: { controller: 'RegistrationController', method: 'getAdminWaitListTabData' },
          },
          400
        );
      }

      const queryService = serviceContainer.get('entityQueryService');
      const configService = serviceContainer.get('configurationService');
      const rockBandClassIds = configService.getRockBandClassIds();

      const [allRegistrations, students] = await Promise.all([
        queryService.getRegistrations({ trimester }),
        queryService.getStudents(),
      ]);

      // Filter registrations to only include Rock Band classes (waitlist-specific)
      const waitListRegistrations = allRegistrations.filter(registration => {
        return rockBandClassIds.includes(String(registration.classId || ''));
      });

      // Filter students to only include those in wait list registrations
      const studentIdsInWaitList = new Set(
        waitListRegistrations.map(reg => reg.studentId).filter(Boolean)
      );
      const relevantStudents = students.filter(student => {
        return student.id ? studentIdsInWaitList.has(student.id) : false;
      });

      const responseData = {
        registrations: waitListRegistrations,
        students: relevantStudents,
      };

      successResponse(res, responseData, {
        req,
        startTime,
        message: 'Admin wait list data retrieved successfully',
        context: { controller: 'RegistrationController', method: 'getAdminWaitListTabData' },
      });
    } catch (error) {
      logger.error('Error getting admin wait list tab data:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'RegistrationController', method: 'getAdminWaitListTabData' },
      });
    }
  }

  /**
   * Get instructor weekly schedule tab data
   * Returns registrations for instructor + associated students + instructors + classes
   * REST: GET /api/instructor/tabs/weekly-schedule/:trimester?instructorId={instructorId}
   */
  static async getInstructorWeeklyScheduleTabData(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const instructorId = asString(req.query.instructorId);
      const trimester = asString(req.params.trimester);

      if (!trimester) {
        return errorResponse(
          res,
          new Error('Trimester parameter is required'),
          {
            req,
            startTime,
            context: {
              controller: 'RegistrationController',
              method: 'getInstructorWeeklyScheduleTabData',
            },
          },
          400
        );
      }

      if (!instructorId) {
        return errorResponse(
          res,
          new Error('Instructor ID is required'),
          {
            req,
            startTime,
            context: {
              controller: 'RegistrationController',
              method: 'getInstructorWeeklyScheduleTabData',
            },
          },
          400
        );
      }

      const queryService = serviceContainer.get('entityQueryService');

      // Fetch registrations for this instructor, excluding waitlist
      const registrations = await queryService.getRegistrations({ trimester, instructorId, excludeWaitlist: true });

      // Get student IDs from instructor's registrations
      const studentIdsInSchedule = new Set(
        registrations.map(reg => reg.studentId).filter(Boolean)
      );

      // Fetch remaining data in parallel
      const [allStudents, instructors, classes] = await Promise.all([
        queryService.getStudents(),
        queryService.getInstructors(),
        queryService.getClasses(),
      ]);

      const relevantStudents = allStudents.filter(student =>
        student.id ? studentIdsInSchedule.has(student.id) : false
      );

      const responseData = {
        registrations,
        students: relevantStudents,
        instructors: instructors,
        classes: classes,
      };

      successResponse(res, responseData, {
        req,
        startTime,
        message: 'Instructor weekly schedule data retrieved successfully',
        context: {
          controller: 'RegistrationController',
          method: 'getInstructorWeeklyScheduleTabData',
        },
      });
    } catch (error) {
      logger.error('Error getting instructor weekly schedule tab data:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: {
          controller: 'RegistrationController',
          method: 'getInstructorWeeklyScheduleTabData',
        },
      });
    }
  }

  /**
   * Get parent weekly schedule tab data
   * Returns registrations for parent's children + students + instructors + classes
   * (no admins, no other parents' data)
   * REST: GET /api/parent/tabs/weekly-schedule/:trimester?parentId=xxx
   */
  static async getParentWeeklyScheduleTabData(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const trimester = asString(req.params.trimester);
      const parentId = asString(req.query.parentId);

      if (!parentId) {
        return errorResponse(res, new Error('Parent ID is required'), {
          req,
          startTime,
          context: {
            controller: 'RegistrationController',
            method: 'getParentWeeklyScheduleTabData',
          },
        });
      }

      const queryService = serviceContainer.get('entityQueryService');

      // Get parent's students first (needed to scope registrations)
      const parentStudents = await queryService.getStudents({ parentId });
      const studentIds = parentStudents
        .map(student => student.id)
        .filter((id): id is string => Boolean(id));

      // Fetch registrations scoped to parent's students, plus classes
      const [parentRegistrations, classes] = await Promise.all([
        queryService.getRegistrations({ trimester, studentIds }),
        queryService.getClasses(),
      ]);

      // Get instructors teaching parent's children
      const instructorIds = [...new Set(parentRegistrations.map(reg => reg.instructorId))];
      const relevantInstructors = await queryService.getInstructors({ instructorIds });

      const responseData = {
        registrations: parentRegistrations,
        students: parentStudents,
        instructors: relevantInstructors,
        classes: classes,
      };

      successResponse(res, responseData, {
        req,
        startTime,
        message: 'Parent weekly schedule data retrieved successfully',
        context: { controller: 'RegistrationController', method: 'getParentWeeklyScheduleTabData' },
      });
    } catch (error) {
      logger.error('Error getting parent weekly schedule data:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'RegistrationController', method: 'getParentWeeklyScheduleTabData' },
      });
    }
  }

  /**
   * Get admin master schedule tab data
   * Returns registrations for trimester + students + instructors + classes
   * (no rooms, no other trimesters)
   * REST: GET /api/admin/tabs/master-schedule/:trimester
   */
  static async getAdminMasterScheduleTabData(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const trimester = asString(req.params.trimester);
      const queryService = serviceContainer.get('entityQueryService');

      const [registrations, students, instructors, classes] = await Promise.all([
        queryService.getRegistrations({ trimester }),
        queryService.getStudents(),
        queryService.getInstructors(),
        queryService.getClasses(),
      ]);

      const responseData = {
        registrations: registrations,
        students: students,
        instructors: instructors,
        classes: classes,
      };

      successResponse(res, responseData, {
        req,
        startTime,
        message: 'Admin master schedule data retrieved successfully',
        context: { controller: 'RegistrationController', method: 'getAdminMasterScheduleTabData' },
      });
    } catch (error) {
      logger.error('Error getting admin master schedule data:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'RegistrationController', method: 'getAdminMasterScheduleTabData' },
      });
    }
  }

  /**
   * Get parent registration tab data
   * Returns instructors, parent's children, classes, and registrations for the provided trimester
   * REST: GET /api/parent/tabs/registration/:trimester?parentId=xxx
   */
  static async getParentRegistrationTabData(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const parentId = asString(req.query.parentId);
      const trimester = asString(req.params.trimester);

      if (!parentId) {
        return errorResponse(res, new Error('Parent ID is required'), {
          req,
          startTime,
          context: { controller: 'RegistrationController', method: 'getParentRegistrationTabData' },
        });
      }

      if (!trimester) {
        return errorResponse(
          res,
          new Error('Trimester parameter is required'),
          {
            req,
            startTime,
            context: { controller: 'RegistrationController', method: 'getParentRegistrationTabData' },
          },
          400
        );
      }

      const queryService = serviceContainer.get('entityQueryService');

      // Fetch parent's students + registrations for the provided trimester + instructors + classes
      const [parentStudents, registrations, instructors, classes] =
        await Promise.all([
          queryService.getStudents({ parentId }),
          queryService.getRegistrations({ trimester }),
          queryService.getInstructors(),
          queryService.getClasses(),
        ]);

      const responseData = {
        instructors: instructors,
        students: parentStudents,
        classes: classes,
        registrations: registrations,
      };

      successResponse(res, responseData, {
        req,
        startTime,
        message: 'Parent registration data retrieved successfully',
        context: { controller: 'RegistrationController', method: 'getParentRegistrationTabData' },
      });
    } catch (error) {
      logger.error('Error getting parent registration data:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'RegistrationController', method: 'getParentRegistrationTabData' },
      });
    }
  }

  /**
   * Get data for admin registration tab
   * Returns all instructors, students, classes, and registrations for selected trimester
   * No scoping - admins need full dataset for registration management
   *
   * Route: GET /api/admin/tabs/registration/:trimester
   */
  static async getAdminRegistrationTabData(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const trimester = asString(req.params.trimester);

      if (!trimester) {
        return errorResponse(res, new Error('Trimester parameter is required'), {
          req,
          startTime,
          context: {
            controller: 'RegistrationController',
            method: 'getAdminRegistrationTabData',
          },
        });
      }

      const queryService = serviceContainer.get('entityQueryService');

      const [instructors, students, classes, registrations] = await Promise.all([
        queryService.getInstructors(),
        queryService.getStudents(),
        queryService.getClasses(),
        queryService.getRegistrations({ trimester }),
      ]);

      const responseData = {
        instructors: instructors,
        students: students,
        classes: classes,
        registrations: registrations,
      };

      successResponse(res, responseData, {
        req,
        startTime,
        message: 'Admin registration data retrieved successfully',
        context: { controller: 'RegistrationController', method: 'getAdminRegistrationTabData' },
      });
    } catch (error) {
      logger.error('Error getting admin registration data:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'RegistrationController', method: 'getAdminRegistrationTabData' },
      });
    }
  }
}
