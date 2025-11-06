/**
 * Attendance Controller - Application layer API endpoints for attendance management
 * Handles attendance recording, removal, and summary reporting
 */

import { getAuthenticatedUserEmail } from '../middleware/auth.js';
import { getLogger } from '../utils/logger.js';
import { successResponse, errorResponse } from '../common/responseHelpers.js';
import { ValidationError, ConflictError } from '../common/errors.js';

const logger = getLogger();

export class AttendanceController {
  /**
   * Mark Attendance - New Repository Pattern
   */
  static async markAttendance(req, res) {
    const startTime = Date.now();

    try {
      const { registrationId, week, schoolYear, trimester } = req.body;

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
      const existingAttendance = await req.attendanceRepository.hasAttendance(
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

      const savedAttendance = await req.attendanceRepository.create(attendanceData);

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
      logger.error('Error recording attendance:', {
        error: error.message,
        stack: error.stack,
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
  static async getAttendanceSummary(req, res) {
    const startTime = Date.now();

    try {
      const { registrationId } = req.params;
      const { schoolYear = '2025-2026', trimester = 'Fall' } = req.query;

      const summary = await req.attendanceRepository.getAttendanceSummary(
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

  /**
   * Record attendance
   */
  static async recordAttendance(req, res) {
    const startTime = Date.now();

    try {
      const data = req.body;

      // Get the authenticated user's email for audit purposes
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);

      const attendanceRecord = await req.attendanceRepository.recordAttendance(
        data.registrationId,
        authenticatedUserEmail
      );

      successResponse(res, attendanceRecord, {
        req,
        startTime,
        context: {
          controller: 'AttendanceController',
          method: 'recordAttendance',
          registrationId: data.registrationId,
        },
      });
    } catch (error) {
      logger.error('Error recording attendance:', {
        error: error.message,
        stack: error.stack,
        registrationId: req.body?.registrationId,
      });
      errorResponse(res, error, {
        req,
        startTime,
        context: {
          controller: 'AttendanceController',
          method: 'recordAttendance',
          registrationId: req.body?.registrationId,
        },
        includeRequestData: true,
      });
    }
  }

  /**
   * Remove attendance
   */
  static async removeAttendance(req, res) {
    const startTime = Date.now();

    try {
      const data = req.body;

      // Get the authenticated user's email for audit purposes
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);

      const success = await req.attendanceRepository.removeAttendance(
        data.registrationId,
        authenticatedUserEmail
      );

      successResponse(res, success, {
        req,
        startTime,
        context: {
          controller: 'AttendanceController',
          method: 'removeAttendance',
          registrationId: data.registrationId,
        },
      });
    } catch (error) {
      logger.error('Error removing attendance:', {
        error: error.message,
        stack: error.stack,
        registrationId: req.body?.registrationId,
      });
      errorResponse(res, error, {
        req,
        startTime,
        context: {
          controller: 'AttendanceController',
          method: 'removeAttendance',
          registrationId: req.body?.registrationId,
        },
        includeRequestData: true,
      });
    }
  }
}
