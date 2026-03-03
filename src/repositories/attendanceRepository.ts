/**
 * Attendance Repository - handles attendance-specific data operations
 */

import { BaseRepository } from './baseRepository.js';
import { AttendanceRecord } from '../models/shared/attendanceRecord.js';
import { UuidUtility } from '../utils/uuidUtility.js';
import { Keys } from '../utils/values/keys.js';
import type { GoogleSheetsDbClient } from '../database/googleSheetsDbClient.js';
import type { ConfigurationService } from '../services/configurationService.js';

interface AttendanceIdData {
  registrationId: string;
  week: string | number;
  schoolYear: string;
  trimester: string;
}

interface AttendanceCreateData {
  [key: string]: unknown;
  id?: string;
  registrationId: string;
  week: string | number;
  schoolYear: string;
  trimester: string;
  attended?: boolean;
  notes?: string;
  recordedBy?: string;
  recordedAt?: string;
  createdBy?: string;
  createdAt?: string;
}

interface AttendanceSummary {
  registrationId: string;
  totalSessions: number;
  attendanceRate: number;
  records: AttendanceRecord[];
}

export class AttendanceRepository extends BaseRepository<AttendanceRecord> {
  /**
   * @param dbClient - Database client instance
   * @param configService - Configuration service for logger initialization
   */
  constructor(dbClient: GoogleSheetsDbClient, configService?: ConfigurationService) {
    super(
      Keys.ATTENDANCE,
      record => AttendanceRecord.fromDatabaseRow(record),
      dbClient,
      configService
    );
  }

  /**
   * Write an attendance audit record to the audit sheet.
   * Moved from DB client to repository (US4) — domain logic belongs in the repository layer.
   */
  async #writeAuditRecord(
    attendanceRecord: AttendanceRecord,
    performedBy: string,
    isDeleted: boolean = false
  ): Promise<void> {
    const auditRecord: Record<string, unknown> = {
      id: UuidUtility.generateUuid(),
      action: isDeleted ? 'DELETE' : 'CREATE',
      attendanceId: attendanceRecord.id,
      registrationId: attendanceRecord.registrationId,
      week: attendanceRecord.week,
      schoolYear: attendanceRecord.schoolYear,
      trimester: attendanceRecord.trimester,
      performedBy,
      performedAt: new Date().toISOString(),
    };
    await this.dbClient.appendRecord(Keys.ATTENDANCEAUDIT, auditRecord);
  }

  /**
   * Generate unique attendance ID
   */
  generateAttendanceId(data: AttendanceIdData): string {
    return `${data.registrationId}_${String(data.week)}_${data.schoolYear}_${data.trimester}`;
  }

  /**
   * Creates a new attendance record with proper ID generation
   */
  override async create(
    entityData: Record<string, unknown>,
    createdBy: string
  ): Promise<AttendanceRecord> {
    try {
      const attendanceData = entityData as AttendanceCreateData;
      this.logger.info('📝 Recording attendance');

      // Check if attendance already exists
      const existingId = this.generateAttendanceId(attendanceData);
      const existing = await this.findById(existingId);

      if (existing) {
        throw new Error('Attendance already recorded for this registration and week');
      }

      // Generate unique ID
      attendanceData.id = existingId;

      // Add audit fields - recordedBy must be provided by calling code
      if (!attendanceData.recordedBy) {
        attendanceData.recordedBy = createdBy;
      }
      if (!attendanceData.recordedBy) {
        throw new Error('recordedBy is required for audit trail');
      }
      attendanceData.recordedAt = new Date().toISOString();

      // Save via parent
      const created = await super.create(attendanceData, attendanceData.recordedBy);

      // Write audit record
      await this.#writeAuditRecord(created, attendanceData.recordedBy);

      this.logger.info('✅ Attendance recorded with ID:', created.id);
      return created;
    } catch (error) {
      this.logger.error('❌ Error recording attendance:', error);
      throw new Error(`Failed to record attendance: ${(error as Error).message}`);
    }
  }

  /**
   * Find attendance records by registration ID
   */
  async findByRegistrationId(registrationId: string): Promise<AttendanceRecord[]> {
    return await this.findBy('registrationId', registrationId);
  }

  /**
   * Find attendance for specific week
   */
  async findByWeek(
    week: string | number,
    schoolYear: string,
    trimester: string
  ): Promise<AttendanceRecord[]> {
    const all = await this.findAll();
    return all.filter(
      record =>
        String(record.week) === String(week) &&
        record.schoolYear === schoolYear &&
        record.trimester === trimester
    );
  }

  /**
   * Get attendance summary for a registration
   */
  async getAttendanceSummary(
    registrationId: string,
    schoolYear: string,
    trimester: string
  ): Promise<AttendanceSummary> {
    const records = await this.findByRegistrationId(registrationId);
    const filtered = records.filter(
      record => record.schoolYear === schoolYear && record.trimester === trimester
    );

    // Derive total scheduled sessions from all attendance records in this trimester
    // instead of hard-coding 12
    const allRecords = await this.findAll();
    const trimesterRecords = allRecords.filter(
      record => record.schoolYear === schoolYear && record.trimester === trimester
    );
    const distinctWeeks = new Set(trimesterRecords.map(r => String(r.week)));
    const totalScheduledSessions = distinctWeeks.size || filtered.length || 1;

    return {
      registrationId,
      totalSessions: filtered.length,
      attendanceRate: filtered.length > 0 ? (filtered.length / totalScheduledSessions) * 100 : 0,
      records: filtered.sort((a, b) => Number(a.week) - Number(b.week)),
    };
  }

  /**
   * Check if attendance exists for registration and week
   */
  async hasAttendance(
    registrationId: string,
    week: string | number,
    schoolYear: string,
    trimester: string
  ): Promise<boolean> {
    const id = this.generateAttendanceId({ registrationId, week, schoolYear, trimester });
    const record = await this.findById(id);
    return record !== null;
  }

  /**
   * Get attendance for multiple registrations
   */
  async getAttendanceForRegistrations(registrationIds: string[]): Promise<AttendanceRecord[]> {
    const all = await this.findAll();
    return all.filter(x => registrationIds.includes(x.registrationId));
  }
}
