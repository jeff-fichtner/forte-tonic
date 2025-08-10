/**
 * Attendance Controller - Application layer API endpoints for attendance management
 * Handles attendance recording, removal, and summary reporting
 */

import { getAuthenticatedUserEmail } from '../middleware/auth.js';

export class AttendanceController {
  /**
   * Mark Attendance - New Repository Pattern
   */
  static async markAttendance(req, res) {
    try {
      const { registrationId, week, schoolYear, trimester } = req.body;

      // Get the authenticated user's email for audit purposes
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);
      
      console.log('🎯 Mark attendance request received:', {
        registrationId,
        week,
        authenticatedUser: authenticatedUserEmail
      });

      // Validation
      if (!registrationId || !week) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: registrationId, week',
        });
      }

      // Check if attendance already exists
      const existingAttendance = await req.attendanceRepository.hasAttendance(
        registrationId,
        week,
        schoolYear || '2025-2026',
        trimester || 'Fall'
      );

      if (existingAttendance) {
        return res.status(409).json({
          success: false,
          message: 'Attendance already recorded for this registration and week',
        });
      }

      // Create attendance record
      const attendanceData = {
        registrationId,
        week: parseInt(week),
        schoolYear: schoolYear || '2025-2026',
        trimester: trimester || 'Fall',
        recordedBy: authenticatedUserEmail,
        recordedAt: new Date().toISOString(),
      };

      const savedAttendance = await req.attendanceRepository.create(attendanceData);

      // Return confirmation
      res.json({
        success: true,
        message: 'Attendance recorded successfully',
        data: {
          id: savedAttendance.id,
          registrationId: savedAttendance.registrationId,
          week: savedAttendance.week,
          schoolYear: savedAttendance.schoolYear,
          trimester: savedAttendance.trimester,
          recordedAt: savedAttendance.recordedAt,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error recording attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record attendance',
        error: error.message,
      });
    }
  }

  /**
   * Get Attendance Summary
   */
  static async getAttendanceSummary(req, res) {
    try {
      const { registrationId } = req.params;
      const { schoolYear = '2025-2026', trimester = 'Fall' } = req.query;

      const summary = await req.attendanceRepository.getAttendanceSummary(
        registrationId,
        schoolYear,
        trimester
      );

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error('Error getting attendance summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get attendance summary',
        error: error.message,
      });
    }
  }

  /**
   * Record attendance (legacy endpoint)
   */
  static async recordAttendance(req, res) {
    try {
      const data = req.body;
      
      // Get the authenticated user's email for audit purposes
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);
      
      console.log('🎯 Record attendance request received:', {
        registrationId: data.registrationId,
        authenticatedUser: authenticatedUserEmail
      });

      const attendanceRecord = await req.programRepository.recordAttendance(
        data.registrationId,
        authenticatedUserEmail
      );

      res.json({ attendanceRecord });
    } catch (error) {
      console.error('Error recording attendance:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Remove attendance (legacy endpoint)
   */
  static async removeAttendance(req, res) {
    try {
      const data = req.body;
      
      // Get the authenticated user's email for audit purposes
      const authenticatedUserEmail = getAuthenticatedUserEmail(req);
      
      console.log('🎯 Remove attendance request received:', {
        registrationId: data.registrationId,
        authenticatedUser: authenticatedUserEmail
      });

      const success = await req.programRepository.removeAttendance(
        data.registrationId,
        authenticatedUserEmail
      );

      res.json({ success });
    } catch (error) {
      console.error('Error removing attendance:', error);
      res.status(500).json({ error: error.message });
    }
  }
}
