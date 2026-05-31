/**
 * AttendanceRecord model - unified for both backend and frontend use
 */

export interface AttendanceRecordData {
  id?: string;
  registrationId: string;
  week?: number;
  schoolYear?: string;
  trimester?: string;
  attended?: boolean;
  notes?: string;
  recordedBy?: string;
  recordedAt?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface AttendanceRecordJSON {
  id: string;
  registrationId: string;
  week: number;
  schoolYear: string;
  trimester: string;
  attended: boolean;
  notes: string;
  recordedBy: string;
  recordedAt: string;
  createdAt: string;
  createdBy: string;
}

export class AttendanceRecord {
  /** Column schema: positional order of fields in the attendance spreadsheet */
  static readonly columns = [
    'id',
    'registrationId',
    'week',
    'schoolYear',
    'trimester',
    'attended',
    'notes',
    'recordedBy',
    'recordedAt',
    'createdAt',
    'createdBy',
  ] as const;

  /** Column schema for attendance audit sheet */
  static readonly auditColumns = [
    'id',
    'action',
    'attendanceId',
    'registrationId',
    'week',
    'schoolYear',
    'trimester',
    'performedBy',
    'performedAt',
  ] as const;

  id: string;
  registrationId: string;
  week: number;
  schoolYear: string;
  trimester: string;
  attended: boolean;
  notes: string;
  recordedBy: string;
  recordedAt: string;
  createdAt: string;
  createdBy: string;

  /**
   * Creates an AttendanceRecord instance
   */
  constructor(data: AttendanceRecordData) {
    this.id = data.id || '';
    this.registrationId = data.registrationId;
    this.week = Number(data.week || 0);
    this.schoolYear = data.schoolYear || '';
    this.trimester = data.trimester || '';
    this.attended = data.attended ?? true;
    this.notes = data.notes || '';
    this.recordedBy = data.recordedBy || data.createdBy || '';
    this.recordedAt = data.recordedAt || data.createdAt || new Date().toISOString();
    this.createdAt = data.createdAt || data.recordedAt || new Date().toISOString();
    this.createdBy = data.createdBy || data.recordedBy || '';
  }

  toJSON(): AttendanceRecordJSON {
    return {
      id: this.id,
      registrationId: this.registrationId,
      week: this.week,
      schoolYear: this.schoolYear,
      trimester: this.trimester,
      attended: this.attended,
      notes: this.notes,
      recordedBy: this.recordedBy,
      recordedAt: this.recordedAt,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
    };
  }

  /**
   * Factory method for creating from database record (named fields, pre-mapped by DB client).
   * DB client mappings produce: week (number), attended (boolean).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDatabaseRow(record: Record<string, any>): AttendanceRecord {
    return new AttendanceRecord({
      id: record.id,
      registrationId: record.registrationId || '',
      week: record.week,
      schoolYear: record.schoolYear || '',
      trimester: record.trimester || '',
      attended: record.attended,
      notes: record.notes || '',
      recordedBy: record.recordedBy || '',
      recordedAt: record.recordedAt || '',
      createdAt: record.createdAt || '',
      createdBy: record.createdBy || '',
    });
  }
}
