/**
 * Attendance Repository - handles attendance-specific data operations
 */

import { BaseRepository } from './baseRepository.js';
import { AttendanceRecord } from '../models/shared/attendanceRecord.js';
import { Keys } from '../utils/values/keys.js';

export class AttendanceRepository extends BaseRepository {
  constructor(dbClient) {
    super(Keys.ATTENDANCE, AttendanceRecord, dbClient);
  }

  /**
   * Generate unique attendance ID
   */
  generateAttendanceId(data) {
    return `${data.registrationId}_${data.week}_${data.schoolYear}_${data.trimester}`;
  }

  /**
   * Creates a new attendance record with proper ID generation
   */
  async create(attendanceData) {
    try {
      this.logger.info('📝 Recording attendance');

      // Check if attendance already exists
      const existingId = this.generateAttendanceId(attendanceData);
      const existing = await this.findById(existingId);

      if (existing) {
        throw new Error(`Attendance already recorded for this registration and week`);
      }

      // Generate unique ID
      attendanceData.id = existingId;

      // Add audit fields - recordedBy must be provided by calling code
      if (!attendanceData.recordedBy) {
        throw new Error('recordedBy is required for audit trail');
      }
      attendanceData.recordedAt = new Date().toISOString();

      // Save via parent
      const created = await super.create(attendanceData, attendanceData.recordedBy);

      this.logger.info('✅ Attendance recorded with ID:', created.id);
      return created;
    } catch (error) {
      this.logger.error('❌ Error recording attendance:', error);
      throw new Error(`Failed to record attendance: ${error.message}`);
    }
  }

  /**
   * Find attendance records by registration ID
   */
  async findByRegistrationId(registrationId) {
    return await this.findBy('registrationId', registrationId);
  }

  /**
   * Find attendance for specific week
   */
  async findByWeek(week, schoolYear, trimester) {
    const all = await this.findAll();
    return all.filter(
      record =>
        record.week === week && record.schoolYear === schoolYear && record.trimester === trimester
    );
  }

  /**
   * Get attendance summary for a registration
   */
  async getAttendanceSummary(registrationId, schoolYear, trimester) {
    const records = await this.findByRegistrationId(registrationId);
    const filtered = records.filter(
      record => record.schoolYear === schoolYear && record.trimester === trimester
    );

    return {
      registrationId,
      totalSessions: filtered.length,
      attendanceRate: filtered.length > 0 ? (filtered.length / 12) * 100 : 0, // Assuming 12 weeks per trimester
      records: filtered.sort((a, b) => a.week - b.week),
    };
  }

  /**
   * Check if attendance exists for registration and week
   */
  async hasAttendance(registrationId, week, schoolYear, trimester) {
    const id = this.generateAttendanceId({ registrationId, week, schoolYear, trimester });
    const record = await this.findById(id);
    return record !== null;
  }

  /**
   * Get attendance for multiple registrations
   */
  async getAttendanceForRegistrations(registrationIds) {
    const all = await this.findAll();
    return all.filter(x => registrationIds.includes(x.registrationId));
  }

  /**
   * Record attendance
   */
  async recordAttendance(registrationId, createdBy) {
    if (!registrationId) {
      throw new Error('Registration ID is required for attendance');
    }

    // Check for duplicate
    const existingAttendance = await this.getAttendanceForRegistrations([registrationId]);
    if (existingAttendance && existingAttendance.length > 0) {
      this.logger.warn(`Attendance already recorded for registration ${registrationId}`);
      return existingAttendance[0];
    }

    const result = await this.dbClient.appendRecord(
      Keys.ATTENDANCE,
      new AttendanceRecord(registrationId),
      createdBy
    );

    // Clear cache after mutation
    this.clearCache();

    return result;
  }

  /**
   * Remove attendance
   */
  async removeAttendance(registrationId, deletedBy) {
    if (!registrationId) {
      throw new Error('Registration ID is required');
    }

    // Check if attendance exists
    const existingAttendance = await this.getAttendanceForRegistrations([registrationId]);
    if (!existingAttendance || existingAttendance.length === 0) {
      this.logger.warn(`No attendance record found for registration ${registrationId}`);
      return true; // Return true for idempotency
    }

    await this.dbClient.deleteRecord(Keys.ATTENDANCE, registrationId, deletedBy);

    // Clear cache after mutation
    this.clearCache();

    return true;
  }
}
