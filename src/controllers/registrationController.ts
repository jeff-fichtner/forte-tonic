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
import {
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
} from '../common/errors.js';
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

      // Trimester is required — the service layer scopes the registration by trimester
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

      // Check if user is an admin (admins can bypass capacity restrictions)
      const isAdmin = req.currentUser?.userType === UserType.ADMIN;

      // Modify-via-replace path (User Story 2): when the request carries a
      // `replaceRegistrationId`, this is a "replace the old row with a new
      // one" operation, not a plain create. Authorize parent eligibility
      // BEFORE doing any writes — parents may only replace a registration
      // that (a) belongs to one of their students AND (b) has
      // `linkedPreviousRegistrationId` set (i.e., was carried forward by
      // the turnover script). Admins may replace anything. The actual
      // delete happens AFTER create succeeds so a failed create can't
      // strand the parent with no lesson.
      const replaceId = asString(requestData.replaceRegistrationId);
      if (replaceId) {
        await RegistrationController._authorizeReplace({
          replaceRegistrationId: replaceId,
          trimester: requestData.trimester,
          isAdmin,
          parentId: req.currentUser?.id,
        });
        // Strip the field before passing on — it's a controller-level concern,
        // not part of the registration row itself.
        delete requestData.replaceRegistrationId;
      }

      // Process registration through application service with authenticated user
      const result = await registrationService.processRegistration(
        requestData,
        authenticatedUserEmail,
        { isAdmin }
      );

      // Replace path: now that create succeeded, delete the old row. If this
      // fails the parent still has their new registration; an admin can
      // clean up the orphan. (The reverse order — delete first — would risk
      // losing the parent's lesson if create then failed.)
      if (replaceId) {
        try {
          await registrationService.deleteRegistration(
            replaceId,
            authenticatedUserEmail,
            requestData.trimester
          );
        } catch (deleteError) {
          logger.error('Replace: new registration created but old delete failed', {
            replaceRegistrationId: replaceId,
            newRegistrationId: result.registration?.id,
            error: (deleteError as Error).message,
          });
          // Surface as a 500 — the new row exists and an admin will need to
          // tidy up; the parent should be told something is off.
          throw new Error(
            `Registration created but failed to remove previous registration ${replaceId}: ${(deleteError as Error).message}`
          );
        }
      }

      successResponse(res, result.registration, {
        message: replaceId
          ? 'Registration replaced successfully'
          : 'Registration created successfully',
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

      if (req.currentUser?.userType !== UserType.ADMIN) {
        // 403, not 401 — the caller IS authenticated; they just lack the
        // admin role. A 401 here would (correctly) trip the frontend's
        // session-expired interceptor and force a logout, even though
        // the parent's session is perfectly valid.
        throw new ForbiddenError('Only administrators can delete registrations');
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
      const trimester = asString(req.params.trimester);
      const id = asString(req.params.id);
      const { intent } = req.body;
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);

      // Validate trimester
      if (!isValidTrimester(trimester)) {
        throw new ValidationError(
          `Invalid trimester: "${trimester}". Must be one of: ${TRIMESTER_SEQUENCE.join(', ')}`
        );
      }

      // Validate intent
      if (!Object.values(INTENT_TYPES).includes(intent)) {
        throw new ValidationError('Invalid intent. Must be: keep, drop, or change');
      }

      // Get repository and period service from container
      const registrationRepository = serviceContainer.get(ServiceKeys.registrationRepository);
      const periodService = serviceContainer.get(ServiceKeys.periodService);

      // Admins can update intent regardless of period; non-admins require active intent period
      const isAdmin = req.currentUser?.userType === UserType.ADMIN;
      if (!isAdmin) {
        const isIntentActive = await periodService.isIntentPeriodActive();
        if (!isIntentActive) {
          throw new ValidationError('Intent collection is not currently active');
        }
      }

      // Use helper method (includes authorization check)
      const registration = await registrationRepository.updateIntent(
        id,
        trimester,
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
        queryService.getStudents({ period: trimester }),
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

      // Fetch remaining data in parallel.
      // Pass the route's trimester as the period for student lookup (FR-003).
      const [allStudents, instructors, classes] = await Promise.all([
        queryService.getStudents({ period: trimester }),
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

      // Get parent's students first (needed to scope registrations).
      // Pass the route's trimester as the period (FR-003).
      const parentStudents = await queryService.getStudents({ parentId, period: trimester });
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
        queryService.getStudents({ period: trimester }),
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

      // Fetch parent's students + registrations for the provided trimester + instructors + classes.
      // Pass the route's trimester as the period for student lookup (FR-003);
      // this is what triggers the grade-bump when `trimester === 'summer'`.
      const [parentStudents, registrations, instructors, classes] = await Promise.all([
        queryService.getStudents({ parentId, period: trimester }),
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
        queryService.getStudents({ period: trimester }),
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

  /**
   * Authorize a "modify-via-replace" request. Admins may replace any
   * registration. Parents may replace ONLY a registration that:
   *  - exists in the target trimester
   *  - has `linkedPreviousRegistrationId` set (it was carried forward by
   *    the turnover script — that's the spec's only parent-modifiable shape)
   *  - belongs to one of their own students (parent1Id or parent2Id matches
   *    the authenticated parent's id)
   * Throws on any failure; returns silently on success.
   */
  private static async _authorizeReplace(args: {
    replaceRegistrationId: string;
    trimester: string;
    isAdmin: boolean;
    parentId: string | undefined;
  }): Promise<void> {
    const { replaceRegistrationId, trimester, isAdmin, parentId } = args;

    // Admins can replace anything — skip the ownership lookups entirely.
    if (isAdmin) return;

    if (!parentId) {
      throw new UnauthorizedError('Authentication required to replace a registration');
    }

    const registrationRepository = serviceContainer.get(ServiceKeys.registrationRepository);
    const existing = await registrationRepository.findByIdInTrimester(
      replaceRegistrationId,
      trimester
    );
    if (!existing) {
      throw new NotFoundError(`Registration to replace not found: ${replaceRegistrationId}`);
    }

    // Parent-modifiable only if the row was carried forward by the turnover
    // script — brand-new parent-created registrations have no linked previous.
    if (!existing.linkedPreviousRegistrationId) {
      throw new ForbiddenError(
        'You may only modify a registration that was carried forward from the previous trimester'
      );
    }

    // Ownership: find the student and confirm the authenticated parent is on it.
    // The trimester is used as the period for the lookup (FR-003); the
    // grade-bump is irrelevant here since we only need parent ids.
    const userRepository = serviceContainer.get(ServiceKeys.userRepository);
    const student = await userRepository.getStudentById(existing.studentId, trimester);
    if (student.parent1Id !== parentId && student.parent2Id !== parentId) {
      throw new ForbiddenError('You are not authorized to modify this registration');
    }
  }
}
