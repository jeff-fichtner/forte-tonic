/**
 * Registration Model with UUID Primary Keys
 * =========================================
 *
 * Simplified registration model without audit fields
 */

import { UuidUtility } from '../../utils/uuidUtility.js';
import { RegistrationType } from '../../utils/values/registrationType.js';
import type { RegistrationTypeValue } from '../../utils/values/registrationType.js';
// Re-export the value type for consumers that imported `RegistrationType` as a type from here
export type { RegistrationTypeValue };
export type ReenrollmentIntent = 'keep' | 'drop' | 'change';

export interface RegistrationData {
  [key: string]: unknown;
  id?: string;
  studentId: string;
  instructorId: string;
  day: string;
  startTime: string;
  length?: number | null;
  registrationType: string; // normalized to RegistrationType in constructor
  roomId?: string;
  instrument?: string;
  transportationType?: string;
  notes?: string;
  classId?: string;
  classTitle?: string;
  expectedStartDate?: string | Date | null;
  createdAt?: string | Date;
  createdBy?: string;
  reenrollmentIntent?: ReenrollmentIntent | null;
  intentSubmittedAt?: string | Date | null;
  intentSubmittedBy?: string | null;
  linkedPreviousRegistrationId?: string | null;
  isWaitlistClass?: boolean;
}

interface CreateNewOptions {
  day: string;
  startTime: string;
  length?: string | number | null;
  registrationType: string;
  roomId?: string;
  instrument?: string;
  transportationType?: string;
  notes?: string;
  classId?: string;
  classTitle?: string;
  expectedStartDate?: string | Date | null;
  createdBy?: string;
  isWaitlistClass?: boolean;
}

export interface RegistrationJSON {
  id: string;
  studentId: string;
  instructorId: string;
  day: string;
  startTime: string;
  length: number | null;
  registrationType: RegistrationTypeValue;
  roomId: string;
  instrument: string;
  transportationType: string;
  notes: string;
  classId: string;
  classTitle: string;
  expectedStartDate: Date | null;
  createdAt: Date;
  createdBy: string;
  reenrollmentIntent: ReenrollmentIntent | null;
  intentSubmittedAt: Date | null;
  intentSubmittedBy: string | null;
  linkedPreviousRegistrationId: string | null;
  isWaitlistClass: boolean;
}

export class Registration {
  /** Column schema: positional order of fields in the registrations spreadsheet */
  static readonly columns = [
    'id',
    'studentId',
    'instructorId',
    'day',
    'startTime',
    'length',
    'registrationType',
    'roomId',
    'instrument',
    'transportationType',
    'notes',
    'classId',
    'classTitle',
    'expectedStartDate',
    'createdAt',
    'createdBy',
    'reenrollmentIntent',
    'intentSubmittedAt',
    'intentSubmittedBy',
    'linkedPreviousRegistrationId',
  ] as const;

  /** Column schema for registration audit sheets */
  static readonly auditColumns = [
    'id',
    'registrationId',
    'studentId',
    'instructorId',
    'day',
    'startTime',
    'length',
    'registrationType',
    'roomId',
    'instrument',
    'transportationType',
    'notes',
    'classId',
    'classTitle',
    'expectedStartDate',
    'createdAt',
    'createdBy',
    'isDeleted',
    'deletedAt',
    'deletedBy',
    'reenrollmentIntent',
    'intentSubmittedAt',
    'intentSubmittedBy',
    'updatedAt',
    'updatedBy',
    'linkedPreviousRegistrationId',
  ] as const;

  id: string;
  studentId: string;
  instructorId: string;
  day: string;
  startTime: string;
  length: number | null;
  isWaitlistClass: boolean;
  registrationType: RegistrationTypeValue;
  roomId: string;
  instrument: string;
  transportationType: string;
  notes: string;
  classId: string;
  classTitle: string;
  expectedStartDate: Date | null;
  createdAt: Date;
  createdBy: string;
  reenrollmentIntent: ReenrollmentIntent | null;
  intentSubmittedAt: Date | null;
  intentSubmittedBy: string | null;
  linkedPreviousRegistrationId: string | null;

  constructor(data: RegistrationData) {
    // UUID primary key
    this.id = data.id || UuidUtility.generateUuid();

    // Core relationship fields
    this.studentId = data.studentId;
    this.instructorId = data.instructorId;

    // Scheduling fields
    this.day = data.day;
    this.startTime = data.startTime;

    // Length: already coerced to number|null by DB client mappings or createNew
    const isWaitlistClass = data.isWaitlistClass === true;
    this.length = data.length ?? null;

    // Store waitlist class flag for persistence
    this.isWaitlistClass = isWaitlistClass;

    // Registration details — normalize type from DB variations
    this.registrationType = this.#normalizeRegistrationType(data.registrationType);
    this.roomId = data.roomId || '';
    this.instrument = data.instrument || '';
    this.transportationType = data.transportationType || '';
    this.notes = data.notes || '';

    // Group lesson fields
    this.classId = data.classId || '';
    this.classTitle = data.classTitle || '';

    // Lifecycle fields (simplified - no audit trail)
    this.expectedStartDate = data.expectedStartDate
      ? new Date(data.expectedStartDate as string | number)
      : null;
    this.createdAt = data.createdAt ? new Date(data.createdAt as string | number) : new Date();
    this.createdBy = data.createdBy || '';

    // Reenrollment intent fields
    this.reenrollmentIntent = data.reenrollmentIntent || null;
    this.intentSubmittedAt = data.intentSubmittedAt
      ? new Date(data.intentSubmittedAt as string | number)
      : null;
    this.intentSubmittedBy = data.intentSubmittedBy || null;

    // Linked registration for tracking changes between trimesters
    this.linkedPreviousRegistrationId = data.linkedPreviousRegistrationId || null;
  }

  /**
   * Normalize registration type to handle variations in data
   */
  #normalizeRegistrationType(type: string): RegistrationTypeValue {
    if (!type || typeof type !== 'string') {
      return RegistrationType.PRIVATE; // Default fallback
    }

    const normalized = type.toLowerCase().trim();

    // Handle common variations
    if (normalized.includes('group') || normalized.includes('class')) {
      return RegistrationType.GROUP;
    }
    if (normalized.includes('private') || normalized.includes('individual')) {
      return RegistrationType.PRIVATE;
    }

    // If it's exactly 'private' or 'group', return as-is
    if (normalized === RegistrationType.PRIVATE || normalized === RegistrationType.GROUP) {
      return normalized as RegistrationTypeValue;
    }

    // Default fallback for unknown types
    return RegistrationType.PRIVATE;
  }

  /**
   * Update reenrollment intent for this registration
   * @param intent - One of: 'keep', 'drop', 'change'
   * @param submittedBy - Email or identifier of who submitted
   * @returns This registration instance for chaining
   */
  updateIntent(intent: ReenrollmentIntent, submittedBy: string): Registration {
    this.reenrollmentIntent = intent;
    this.intentSubmittedAt = new Date();
    this.intentSubmittedBy = submittedBy;
    return this;
  }

  /**
   * Create Registration from database row data
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDatabaseRow(record: Record<string, any>): Registration | null {
    if (!record || !record.id) {
      return null;
    }

    try {
      return new Registration({
        id: record.id,
        studentId: record.studentId,
        instructorId: record.instructorId,
        day: record.day,
        startTime: record.startTime,
        length: record.length,
        registrationType: record.registrationType,
        roomId: record.roomId,
        instrument: record.instrument,
        transportationType: record.transportationType,
        notes: record.notes,
        classId: record.classId,
        classTitle: record.classTitle,
        expectedStartDate: record.expectedStartDate,
        createdAt: record.createdAt,
        createdBy: record.createdBy,
        reenrollmentIntent: record.reenrollmentIntent as ReenrollmentIntent,
        intentSubmittedAt: record.intentSubmittedAt,
        intentSubmittedBy: record.intentSubmittedBy,
        linkedPreviousRegistrationId: record.linkedPreviousRegistrationId,
      });
    } catch (_error) {
      return null;
    }
  }

  /**
   * Converts the registration to a plain object for API responses
   * This method is automatically called by JSON.stringify() and Express res.json()
   * @returns Plain object representation
   */
  toJSON(): RegistrationJSON {
    return {
      id: this.id,
      studentId: this.studentId,
      instructorId: this.instructorId,
      day: this.day,
      startTime: this.startTime,
      length: this.length,
      registrationType: this.registrationType,
      roomId: this.roomId,
      instrument: this.instrument,
      transportationType: this.transportationType,
      notes: this.notes,
      classId: this.classId,
      classTitle: this.classTitle,
      expectedStartDate: this.expectedStartDate,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
      reenrollmentIntent: this.reenrollmentIntent,
      intentSubmittedAt: this.intentSubmittedAt,
      intentSubmittedBy: this.intentSubmittedBy,
      linkedPreviousRegistrationId: this.linkedPreviousRegistrationId,
      isWaitlistClass: this.isWaitlistClass,
    };
  }

  /**
   * Factory method: Create new registration
   */
  static createNew(
    studentId: string,
    instructorId: string,
    options: CreateNewOptions
  ): Registration {
    const isWaitlistClass = options.isWaitlistClass === true;
    const parsedLength = options.length != null ? parseInt(String(options.length)) : null;

    if (!isWaitlistClass && (parsedLength == null || isNaN(parsedLength))) {
      throw new Error('length is required');
    }
    if (!options.registrationType) {
      throw new Error('registrationType is required');
    }
    return new Registration({
      studentId,
      instructorId,
      day: options.day,
      startTime: options.startTime,
      length: parsedLength != null && !isNaN(parsedLength) ? parsedLength : null,
      registrationType: options.registrationType,
      roomId: options.roomId,
      instrument: options.instrument,
      transportationType: options.transportationType,
      notes: options.notes,
      classId: options.classId,
      classTitle: options.classTitle,
      expectedStartDate: options.expectedStartDate,
      createdAt: new Date().toISOString(),
      createdBy: options.createdBy,
      isWaitlistClass: options.isWaitlistClass, // Pass flag to constructor for validation
    });
  }
}
