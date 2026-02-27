/**
 * Attendance Controller - Application layer API endpoints for attendance management
 * Handles attendance recording and summary reporting
 */

import { getAuthenticatedUserEmail } from '../middleware/auth.js';
import type { Request, Response } from 'express';
import { getLogger } from '../utils/logger.js';
import { serviceContainer, ServiceKeys } from '../infrastructure/container/serviceContainer.js';
import { successResponse, errorResponse, asString } from '../common/responseHelpers.js';
import { ValidationError, ConflictError } from '../common/errors.js';

const logger = getLogger();

export class AttendanceController {
  /**
   * Mark Attendance - New Repository Pattern
   */
  static async markAttendance(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const { registrationId, week, schoolYear, trimester } = req.body;
      const attendanceRepository = serviceContainer.get(ServiceKeys.attendanceRepository);

      // Get the authenticated user's email for audit purposes
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);

      // Validation
      if (!registrationId || !week) {
        throw new ValidationError('Missing required fields: registrationId, week');
      }

      // Validate required fields
      if (!schoolYear) {
        throw new ValidationError('schoolYear is required');
      }
      if (!trimester) {
        throw new ValidationError('trimester is required');
      }

      // Check if attendance already exists
      const existingAttendance = await attendanceRepository.hasAttendance(
        registrationId,
        week,
        schoolYear,
        trimester
      );

      if (existingAttendance) {
        throw new ConflictError('Attendance already recorded for this registration and week');
      }

      // Create attendance record
      const attendanceData = {
        registrationId,
        week: parseInt(week),
        schoolYear,
        trimester,
        recordedBy: authenticatedUserEmail,
        recordedAt: new Date().toISOString(),
      };

      const savedAttendance = await attendanceRepository.create(attendanceData, authenticatedUserEmail);

      successResponse(
        res,
        {
          id: savedAttendance.id,
          registrationId: savedAttendance.registrationId,
          week: savedAttendance.week,
          schoolYear: savedAttendance.schoolYear,
          trimester: savedAttendance.trimester,
          recordedAt: savedAttendance.recordedAt,
        },
        {
          message: 'Attendance recorded successfully',
          req,
          startTime,
          context: {
            controller: 'AttendanceController',
            method: 'markAttendance',
            registrationId,
            week,
          },
        }
      );
    } catch (error) {
      const typedError = error as Error;
      logger.error('Error recording attendance:', {
        error: typedError.message,
        stack: typedError.stack,
        requestData: {
          registrationId: req.body?.registrationId,
          week: req.body?.week,
          schoolYear: req.body?.schoolYear,
          trimester: req.body?.trimester,
        },
      });
      errorResponse(res, error, {
        req,
        startTime,
        context: {
          controller: 'AttendanceController',
          method: 'markAttendance',
          registrationId: req.body?.registrationId,
          week: req.body?.week,
        },
        includeRequestData: true,
      });
    }
  }

  /**
   * Get Attendance Summary
   */
  static async getAttendanceSummary(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const registrationId = asString(req.params.registrationId);
      const schoolYear = asString(req.query.schoolYear, '2025-2026');
      const trimester = asString(req.query.trimester, 'Fall');
      const attendanceRepository = serviceContainer.get(ServiceKeys.attendanceRepository);

      const summary = await attendanceRepository.getAttendanceSummary(
        registrationId,
        schoolYear,
        trimester
      );

      successResponse(res, summary, {
        req,
        startTime,
        context: {
          controller: 'AttendanceController',
          method: 'getAttendanceSummary',
          registrationId,
        },
      });
    } catch (error) {
      logger.error('Error getting attendance summary:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'AttendanceController', method: 'getAttendanceSummary' },
      });
    }
  }

}
