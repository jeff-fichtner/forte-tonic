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

  toDatabaseRow(): string[] {
    return [
      this.id,
      this.registrationId,
      String(this.week),
      this.schoolYear,
      this.trimester,
      String(this.attended),
      this.notes,
      this.recordedBy,
      this.recordedAt,
      this.createdAt,
      this.createdBy,
    ];
  }

  static fromDatabaseRow(row: string[]): AttendanceRecord {
    return new AttendanceRecord({
      id: row[0],
      registrationId: row[1] || '',
      week: Number(row[2] || 0),
      schoolYear: row[3] || '',
      trimester: row[4] || '',
      attended: row[5] ? row[5].toLowerCase() === 'true' : true,
      notes: row[6] || '',
      recordedBy: row[7] || '',
      recordedAt: row[8] || '',
      createdAt: row[9] || '',
      createdBy: row[10] || '',
    });
  }
}
