/**
 * Registration Controller
 * =======================
 *
 * API endpoints for program registration management.
 * Handles classes, registrations, rooms, and registration lifecycle.
 */

import { getAuthenticatedUserEmail } from '../middleware/auth.js';
import type { Request, Response } from 'express';
import { getLogger } from '../utils/logger.js';
import { serviceContainer, ServiceKeys } from '../infrastructure/container/serviceContainer.js';
import { successResponse, errorResponse, asString } from '../common/responseHelpers.js';
import { ValidationError, UnauthorizedError, NotFoundError } from '../common/errors.js';
import { INTENT_TYPES } from '../constants/intentTypes.js';
import { UserType } from '../config/constants.js';
import { RegistrationService } from '../services/registrationService.js';
import { isValidTrimester, TRIMESTER_SEQUENCE } from '../utils/values/trimester.js';
import { DEFAULT_REGISTRATION_CONFIG } from '../models/shared/responses/appConfigurationResponse.js';

const logger = getLogger();

export class RegistrationController {
  /**
   * Create Registration using application service with comprehensive validation.
   * Requires trimester in request body. When targeting a future trimester,
   * enforces enrollment-period access control for non-admin users.
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

      // Trimester is required — the service layer needs it to target the correct sheet
      if (!requestData.trimester) {
        throw new ValidationError('Missing required field: trimester');
      }
      if (!isValidTrimester(requestData.trimester)) {
        throw new ValidationError(
          `Invalid trimester: "${requestData.trimester}". Must be one of: ${TRIMESTER_SEQUENCE.join(', ')}`
        );
      }

      // Comprehensive field validation (type-specific required fields + business rules)
      const validation = RegistrationService.validateRegistrationData(requestData);
      if (!validation.isValid) {
        throw new ValidationError(
          `Registration validation failed: ${validation.errors.join(', ')}`
        );
      }

      const registrationService = serviceContainer.get(ServiceKeys.registrationService);
      const periodService = serviceContainer.get(ServiceKeys.periodService);

      // Check if user is an admin (admins can bypass capacity and enrollment restrictions)
      const isAdmin = req.currentUser?.userType === UserType.ADMIN;

      // Enrollment-period access control for non-admin users targeting a future trimester
      if (!isAdmin) {
        const currentTrimester = await periodService.getCurrentTrimester();
        if (currentTrimester && requestData.trimester !== currentTrimester) {
          // Verify the enrollment table is available
          const enrollmentTable = await periodService.getEnrollmentTrimesterTable();
          if (!enrollmentTable) {
            throw new ValidationError('Next trimester registration is not currently available');
          }

          // Check access permissions (priority enrollment = returning families only)
          const registrationRepository = serviceContainer.get(ServiceKeys.registrationRepository);
          const currentRegistrations = await registrationRepository.findAll();
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
      }

      // Process registration through application service with authenticated user
      const result = await registrationService.processRegistration(
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

      const trimester = asString(req.params.trimester);
      if (!trimester) {
        throw new ValidationError('Missing trimester');
      }

      const registrationService = serviceContainer.get(ServiceKeys.registrationService);

      logger.info(`🎯 Deleting registration from trimester: ${trimester}`, {
        registrationId,
        authenticatedUser: authenticatedUserEmail,
      });

      const result = await registrationService.deleteRegistration(
        registrationId,
        authenticatedUserEmail,
        trimester
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
      const registrationRepository = serviceContainer.get(ServiceKeys.registrationRepository);
      const periodService = serviceContainer.get(ServiceKeys.periodService);

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
   * Get admin wait list tab data
   * Returns only Rock Band registrations + associated students for wait list
   * REST: GET /api/admin/tabs/wait-list/:trimester
   */
  static async getAdminWaitListTabData(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const trimester = asString(req.params.trimester);

      if (!trimester) {
        throw new ValidationError('Trimester is required');
      }

      const queryService = serviceContainer.get(ServiceKeys.entityQueryService);
      const configService = serviceContainer.get(ServiceKeys.configurationService);
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
        throw new ValidationError('Trimester parameter is required');
      }

      if (!instructorId) {
        throw new ValidationError('Instructor ID is required');
      }

      const queryService = serviceContainer.get(ServiceKeys.entityQueryService);

      // Fetch registrations for this instructor, excluding waitlist
      const registrations = await queryService.getRegistrations({
        trimester,
        instructorId,
        excludeWaitlist: true,
      });

      // Get student IDs from instructor's registrations
      const studentIdsInSchedule = new Set(registrations.map(reg => reg.studentId).filter(Boolean));

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
        instructors,
        classes,
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
        throw new ValidationError('Parent ID is required');
      }

      const queryService = serviceContainer.get(ServiceKeys.entityQueryService);

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
        classes,
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

      if (!trimester) {
        throw new ValidationError('Trimester parameter is required');
      }

      const queryService = serviceContainer.get(ServiceKeys.entityQueryService);

      const [registrations, students, instructors, classes] = await Promise.all([
        queryService.getRegistrations({ trimester }),
        queryService.getStudents(),
        queryService.getInstructors(),
        queryService.getClasses(),
      ]);

      const responseData = {
        registrations,
        students,
        instructors,
        classes,
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
        throw new ValidationError('Parent ID is required');
      }

      if (!trimester) {
        throw new ValidationError('Trimester parameter is required');
      }

      const queryService = serviceContainer.get(ServiceKeys.entityQueryService);
      const availabilityService = serviceContainer.get(ServiceKeys.availabilityService);
      const excludeRegistrationId = asString(req.query.excludeRegistrationId) || null;

      // Fetch parent's students + registrations for the provided trimester + instructors + classes
      const [parentStudents, registrations, instructors, classes] = await Promise.all([
        queryService.getStudents({ parentId }),
        queryService.getRegistrations({ trimester }),
        queryService.getInstructors(),
        queryService.getClasses(),
      ]);

      // Extract unique grades from parent's children for grade-keyed availability
      const uniqueGrades = [...new Set(parentStudents.map(s => s.grade ?? null))];

      const availableTimeSlots = availabilityService.computeAvailableTimeSlots(
        instructors,
        registrations,
        uniqueGrades,
        DEFAULT_REGISTRATION_CONFIG.lessonLengths,
        excludeRegistrationId
      );

      const responseData = {
        instructors,
        students: parentStudents,
        classes,
        registrations,
        availableTimeSlots,
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
        throw new ValidationError('Trimester parameter is required');
      }

      const queryService = serviceContainer.get(ServiceKeys.entityQueryService);

      const [instructors, students, classes, registrations] = await Promise.all([
        queryService.getInstructors(),
        queryService.getStudents(),
        queryService.getClasses(),
        queryService.getRegistrations({ trimester }),
      ]);

      const responseData = {
        instructors,
        students,
        classes,
        registrations,
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
