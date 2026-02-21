/**
 * Registration Model with UUID Primary Keys
 * =========================================
 *
 * Simplified registration model without audit fields
 */

import { UuidUtility } from '../../utils/uuidUtility.js';

const DayNames: string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export type RegistrationType = 'private' | 'group';
export type ReenrollmentIntent = 'keep' | 'drop' | 'change';

export interface RegistrationData {
  id?: string;
  studentId: string;
  instructorId: string;
  day: string;
  startTime: string;
  length?: string | number;
  registrationType: string;    // normalized to RegistrationType in constructor
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
  length?: string | number;
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
  registrationType: RegistrationType;
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

interface ScheduleLesson {
  lessonNumber: number;
  date: Date;
  startTime: string;
  length: number | null;
}

export class Registration {
  id: string;
  studentId: string;
  instructorId: string;
  day: string;
  startTime: string;
  length: number | null;
  isWaitlistClass: boolean;
  registrationType: RegistrationType;
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
    this.#validateConstructorData(data);

    // UUID primary key
    this.id = data.id || UuidUtility.generateUuid();

    // Core relationship fields
    this.studentId = data.studentId;
    this.instructorId = data.instructorId;

    // Scheduling fields
    this.day = data.day;
    this.startTime = data.startTime;

    // Length validation: strict for everything EXCEPT waitlist
    const parsedLength = parseInt(data.length as string);
    const isWaitlistClass = data.isWaitlistClass === true;

    if (!isWaitlistClass) {
      // All non-waitlist registrations require valid length
      if (!parsedLength || isNaN(parsedLength)) {
        throw new Error('length is required and must be a valid number');
      }
      this.length = parsedLength;
    } else {
      // Waitlist: length is completely ignored
      this.length = !isNaN(parsedLength) ? parsedLength : null;
    }

    // Store waitlist class flag for persistence
    this.isWaitlistClass = isWaitlistClass;

    // Registration details
    this.registrationType = data.registrationType as RegistrationType; // Already normalized in validation
    this.roomId = data.roomId || '';
    this.instrument = data.instrument || '';
    this.transportationType = data.transportationType || '';
    this.notes = data.notes || '';

    // Group lesson fields
    this.classId = data.classId || '';
    this.classTitle = data.classTitle || '';

    // Lifecycle fields (simplified - no audit trail)
    this.expectedStartDate = data.expectedStartDate ? new Date(data.expectedStartDate as string | number) : null;
    this.createdAt = data.createdAt ? new Date(data.createdAt as string | number) : new Date();
    this.createdBy = data.createdBy || '';

    // Reenrollment intent fields
    this.reenrollmentIntent = data.reenrollmentIntent || null;
    this.intentSubmittedAt = data.intentSubmittedAt ? new Date(data.intentSubmittedAt as string | number) : null;
    this.intentSubmittedBy = data.intentSubmittedBy || null;

    // Linked registration for tracking changes between trimesters
    this.linkedPreviousRegistrationId = data.linkedPreviousRegistrationId || null;
  }

  #validateConstructorData(data: RegistrationData): void {
    if (!data) {
      throw new Error('Registration data is required');
    }

    const required: (keyof RegistrationData)[] = ['studentId', 'instructorId', 'day', 'startTime', 'registrationType'];
    const missing = required.filter(field => data[field] === undefined || data[field] === null);

    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Validate registration type (normalize common variations)
    const normalizedType = this.#normalizeRegistrationType(data.registrationType);
    if (!['private', 'group'].includes(normalizedType)) {
      data.registrationType = 'private';
    } else {
      data.registrationType = normalizedType;
    }

    // Validate group lessons have classId
    if (data.registrationType === 'group' && !data.classId) {
      data.registrationType = 'private';
    }
  }

  /**
   * Normalize registration type to handle variations in data
   */
  #normalizeRegistrationType(type: string): RegistrationType {
    if (!type || typeof type !== 'string') {
      return 'private'; // Default fallback
    }

    const normalized = type.toLowerCase().trim();

    // Handle common variations
    if (normalized.includes('group') || normalized.includes('class')) {
      return 'group';
    }
    if (normalized.includes('private') || normalized.includes('individual')) {
      return 'private';
    }

    // If it's exactly 'private' or 'group', return as-is
    if (['private', 'group'].includes(normalized)) {
      return normalized as RegistrationType;
    }

    // Default fallback for unknown types
    return 'private';
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
  static fromDatabaseRow(row: string[]): Registration | null {
    // Skip empty rows
    if (!row || !row[0] || !Array.isArray(row) || row.length === 0) {
      return null;
    }

    try {
      // Map array indices to field names based on registration schema
      // Order: Id, StudentId, InstructorId, Day, StartTime, Length, RegistrationType,
      //        RoomId, Instrument, TransportationType, Notes, ClassId, ClassTitle,
      //        ExpectedStartDate, CreatedAt, CreatedBy, reenrollmentIntent, intentSubmittedAt, intentSubmittedBy

      // Determine if this is a waitlist class based on classId
      // On server: This will be set based on whatever validation we can do
      // On browser: ClassManager can check against configuration
      const classId = row[11];
      const classTitle = row[12];
      let isWaitlistClass = false;

      // Browser environment: use ClassManager if available
      if (typeof window !== 'undefined' && window.ClassManager?.isRockBandClass) {
        isWaitlistClass = window.ClassManager.isRockBandClass(classId);
      }
      // Server environment: check classTitle for "Waitlist" indicator
      else {
        isWaitlistClass = classTitle && String(classTitle).toLowerCase().includes('waitlist') ? true : false;
      }

      return new Registration({
        id: row[0] ? String(row[0]) : row[0], // Id (UUID) - ensure string
        studentId: row[1] ? String(row[1]) : row[1], // StudentId - ensure string
        instructorId: row[2] ? String(row[2]) : row[2], // InstructorId - ensure string
        day: row[3], // Day
        startTime: row[4], // StartTime
        length: row[5], // Length
        registrationType: row[6], // RegistrationType
        roomId: row[7], // RoomId
        instrument: row[8], // Instrument
        transportationType: row[9], // TransportationType
        notes: row[10], // Notes
        classId: row[11], // ClassId
        classTitle: row[12], // ClassTitle
        expectedStartDate: row[13], // ExpectedStartDate
        createdAt: row[14], // CreatedAt
        createdBy: row[15], // CreatedBy
        reenrollmentIntent: row[16] as ReenrollmentIntent, // reenrollmentIntent
        intentSubmittedAt: row[17], // intentSubmittedAt
        intentSubmittedBy: row[18], // intentSubmittedBy
        linkedPreviousRegistrationId: row[19], // linkedPreviousRegistrationId
        isWaitlistClass: isWaitlistClass, // Derived from classId for validation
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Convert to database row format (20-column schema with intent and linking)
   */
  toDatabaseRow(): string[] {
    return [
      this.id,
      this.studentId,
      this.instructorId,
      this.day,
      this.startTime,
      this.length!.toString(),
      this.registrationType,
      this.roomId || '',
      this.instrument || '',
      this.transportationType || '',
      this.notes || '',
      this.classId || '',
      this.classTitle || '',
      this.expectedStartDate ? this.expectedStartDate.toISOString() : '',
      this.createdAt.toISOString(),
      this.createdBy || '',
      this.reenrollmentIntent || '',
      this.intentSubmittedAt ? this.intentSubmittedAt.toISOString() : '',
      this.intentSubmittedBy || '',
      this.linkedPreviousRegistrationId || '',
    ];
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
  static createNew(studentId: string, instructorId: string, options: CreateNewOptions): Registration {
    // Length validation: strict for non-waitlist classes, optional for waitlist classes
    const isWaitlistClass = options.isWaitlistClass === true;
    if (!isWaitlistClass && !options.length) {
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
      length: options.length,
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

  /**
   * Generate lesson schedule for this registration
   * Returns array of lesson dates with timing information
   */
  generateSchedule(numberOfLessons: number = 12): ScheduleLesson[] {
    const lessons: ScheduleLesson[] = [];
    const startDate = new Date(this.expectedStartDate as Date);
    const dayOfWeek = DayNames.indexOf(this.day);

    if (dayOfWeek === -1) {
      throw new Error(`Invalid day: ${this.day}`);
    }

    // Find the first occurrence of the day
    const currentDate = new Date(startDate);
    while (currentDate.getDay() !== (dayOfWeek + 1) % 7) {
      // Adjust for JavaScript's Sunday=0
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Generate lesson dates
    for (let i = 0; i < numberOfLessons; i++) {
      lessons.push({
        lessonNumber: i + 1,
        date: new Date(currentDate),
        startTime: this.startTime,
        length: this.length,
      });

      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7);
    }

    return lessons;
  }
}
