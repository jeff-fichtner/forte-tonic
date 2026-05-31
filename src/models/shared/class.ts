import { DateHelpers } from '../../utils/nativeDateTimeHelpers.js';

/**
 * Class model - unified for both backend and frontend use
 *
 * Database fields (persisted in Classes sheet):
 * - id, instructorId, day, startTime, length, endTime, instrument, title, size, minimumGrade, maximumGrade, isRestricted, roomId
 */

export interface ClassData {
  id: string;
  instructorId: string;
  day: string;
  startTime: string;
  length: number;
  endTime: string;
  instrument: string;
  title: string;
  size?: string | null;
  minimumGrade?: number | null;
  maximumGrade?: number | null;
  isRestricted?: boolean;
  roomId?: string | null;
}

export interface ClassJSON {
  id: string;
  instructorId: string;
  day: string;
  startTime: string;
  length: number;
  endTime: string;
  instrument: string;
  title: string;
  size: string | null;
  minimumGrade: number | null;
  maximumGrade: number | null;
  isRestricted: boolean;
  roomId: string | null;
  formattedStartTime: string;
  formattedEndTime: string;
  formattedMinimumGrade: string;
  formattedMaximumGrade: string;
  formattedName: string;
  durationMinutes: number;
  formattedDuration: string;
  timeSlot: string;
}

export class Class {
  /** Column schema: positional order of fields in the classes spreadsheet */
  static readonly columns = [
    'id',
    'instructorId',
    'day',
    'startTime',
    'length',
    'endTime',
    'instrument',
    'title',
    'size',
    'minimumGrade',
    'maximumGrade',
    'isRestricted',
    'roomId',
  ] as const;

  id: string;
  instructorId: string;
  day: string;
  startTime: string;
  length: number;
  endTime: string;
  instrument: string;
  title: string;
  size: string | null;
  minimumGrade: number | null;
  maximumGrade: number | null;
  isRestricted: boolean;
  roomId: string | null;

  /**
   * Creates a Class instance
   */
  constructor(data: ClassData) {
    this.id = data.id;
    this.instructorId = data.instructorId;
    this.day = data.day;
    this.startTime = data.startTime;
    this.length = data.length;
    this.endTime = data.endTime;
    this.instrument = data.instrument;
    this.title = data.title;
    this.size = data.size || null;
    this.minimumGrade = data.minimumGrade || null;
    this.maximumGrade = data.maximumGrade || null;
    this.isRestricted = data.isRestricted || false;
    this.roomId = data.roomId || null;
  }

  /**
   * Factory method for creating from database record (named fields, pre-mapped by DB client).
   * DB client mappings produce: startTime/endTime (string), length (number), isRestricted (boolean).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDatabaseRow(record: Record<string, any>): Class {
    return new Class({
      id: record.id,
      instructorId: record.instructorId,
      day: record.day,
      startTime: record.startTime,
      length: record.length,
      endTime: record.endTime,
      instrument: record.instrument,
      title: record.title,
      size: record.size,
      minimumGrade: record.minimumGrade,
      maximumGrade: record.maximumGrade,
      isRestricted: record.isRestricted,
      roomId: record.roomId,
    });
  }

  /**
   * Gets formatted start time
   */
  get formattedStartTime(): string {
    if (!this.startTime) return '';

    try {
      return String(DateHelpers.convertTimeFormat(this.startTime, '12hour'));
    } catch {
      return this.startTime.toString();
    }
  }

  /**
   * Gets formatted end time
   */
  get formattedEndTime(): string {
    if (!this.endTime) return '';

    try {
      return String(DateHelpers.convertTimeFormat(this.endTime, '12hour'));
    } catch {
      return this.endTime.toString();
    }
  }

  /**
   * Gets formatted minimum grade
   */
  get formattedMinimumGrade(): string {
    return this.formatGrade(this.minimumGrade);
  }

  /**
   * Gets formatted maximum grade
   */
  get formattedMaximumGrade(): string {
    return this.formatGrade(this.maximumGrade);
  }

  /**
   * Formats a grade for display
   */
  formatGrade(grade: string | number | null): string {
    if (!grade && grade !== 0) return '';

    // Handle numeric 0 and string "0" for kindergarten (consistent with numberExtensions.js)
    if (grade === 0 || grade === '0') return 'K';

    const gradeStr = grade.toString().toLowerCase();

    if (gradeStr === 'k' || gradeStr === 'kindergarten') return 'K';
    if (gradeStr.includes('pre')) return 'Pre-K';
    if (!isNaN(Number(gradeStr))) return gradeStr;

    return grade.toString();
  }

  /**
   * Gets formatted class name with grade range and schedule
   */
  get formattedName(): string {
    const gradeRange = `${this.formattedMinimumGrade}-${this.formattedMaximumGrade}`;
    return `${this.title} (${gradeRange}): ${this.day} at ${this.formattedStartTime}`;
  }

  /**
   * Gets class duration in minutes
   */
  get durationMinutes(): number {
    if (this.length) return this.length;

    if (this.startTime && this.endTime) {
      const start = new Date(this.startTime);
      const end = new Date(this.endTime);
      return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    }

    return 0;
  }

  /**
   * Gets formatted duration
   */
  get formattedDuration(): string {
    const minutes = this.durationMinutes;
    if (minutes < 60) return `${minutes} min`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Checks if the class is suitable for a specific grade
   */
  isGradeEligible(grade: number | string): boolean {
    if (this.minimumGrade === null || this.maximumGrade === null) return false;
    const gradeNum = Number(grade);
    return gradeNum >= this.minimumGrade && gradeNum <= this.maximumGrade;
  }

  /**
   * Gets the time slot as a string
   */
  get timeSlot(): string {
    return `${this.day} ${this.formattedStartTime} - ${this.formattedEndTime}`;
  }

  /**
   * Converts the class to a plain object for API responses
   */
  toJSON(): ClassJSON {
    return {
      id: this.id,
      instructorId: this.instructorId,
      day: this.day,
      startTime: this.startTime,
      length: this.length,
      endTime: this.endTime,
      instrument: this.instrument,
      title: this.title,
      size: this.size,
      minimumGrade: this.minimumGrade,
      maximumGrade: this.maximumGrade,
      isRestricted: this.isRestricted,
      roomId: this.roomId,
      formattedStartTime: this.formattedStartTime,
      formattedEndTime: this.formattedEndTime,
      formattedMinimumGrade: this.formattedMinimumGrade,
      formattedMaximumGrade: this.formattedMaximumGrade,
      formattedName: this.formattedName,
      durationMinutes: this.durationMinutes,
      formattedDuration: this.formattedDuration,
      timeSlot: this.timeSlot,
    };
  }
}
