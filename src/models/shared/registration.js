/**
 * Registration Model with UUID Primary Keys
 * =========================================
 *
 * Simplified registration model without audit fields
 */

import { RegistrationId } from '../../utils/values/registrationId.js';
import { StudentId } from '../../utils/values/studentId.js';
import { InstructorId } from '../../utils/values/instructorId.js';
import { LessonTime } from '../../utils/values/lessonTime.js';

// Day names constant for schedule generation
// Defined locally to avoid import issues when this shared model is loaded in the browser
const DayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Helper function to extract string values from various data types
function extractStringValue(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    // If it's an object, it might have an id, value, or _value property
    if (value.id) return String(value.id);
    if (value.value) return String(value.value);
    if (value._value) return String(value._value);
    if (value.uuid) return String(value.uuid);

    // If it's an array, take the first element
    if (Array.isArray(value) && value.length > 0) {
      return String(value[0]);
    }

    return String(value); // This will produce "[object Object]"
  }

  return String(value);
}

export class Registration {
  constructor(data) {
    this.#validateConstructorData(data);

    // UUID primary key (new)
    this.id = new RegistrationId(data.id);

    // Core relationship fields
    this.studentId = new StudentId(data.studentId);
    this.instructorId = new InstructorId(data.instructorId);

    // Scheduling fields
    this.day = data.day;
    this.startTime = data.startTime;

    // Length validation: strict for non-waitlist classes, optional for waitlist classes
    const parsedLength = parseInt(data.length);
    const isWaitlistClass = data.isWaitlistClass === true;

    if (!isWaitlistClass) {
      // For non-waitlist classes, length is required and must be positive
      if (!parsedLength || isNaN(parsedLength)) {
        throw new Error('length is required and must be a valid number');
      }
      this.length = parsedLength;
    } else {
      // For waitlist classes, allow null/0 or positive number
      this.length = !isNaN(parsedLength) ? parsedLength : null;
    }

    // Store waitlist class flag for persistence
    this.isWaitlistClass = isWaitlistClass;

    // Registration details
    this.registrationType = data.registrationType; // Already normalized in validation
    this.roomId = data.roomId;
    this.instrument = data.instrument;
    this.transportationType = data.transportationType;
    this.notes = data.notes;

    // Group lesson fields
    this.classId = data.classId;
    this.classTitle = data.classTitle;

    // Lifecycle fields (simplified - no audit trail)
    this.expectedStartDate = data.expectedStartDate ? new Date(data.expectedStartDate) : null;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.createdBy = data.createdBy;

    // Reenrollment intent fields
    this.reenrollmentIntent = data.reenrollmentIntent || null;
    this.intentSubmittedAt = data.intentSubmittedAt ? new Date(data.intentSubmittedAt) : null;
    this.intentSubmittedBy = data.intentSubmittedBy || null;

    // Linked registration for tracking changes between trimesters
    this.linkedPreviousRegistrationId = data.linkedPreviousRegistrationId || null;
  }

  #validateConstructorData(data) {
    if (!data) {
      throw new Error('Registration data is required');
    }

    const required = ['studentId', 'instructorId', 'day', 'startTime', 'registrationType'];
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
  #normalizeRegistrationType(type) {
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
      return normalized;
    }

    // Default fallback for unknown types
    return 'private';
  }

  /**
   * Check if registration is for a private lesson
   */
  isPrivateLesson() {
    return this.registrationType === 'private';
  }

  /**
   * Check if registration is for a group class
   */
  isGroupClass() {
    return this.registrationType === 'group';
  }

  /**
   * Get lesson duration in minutes
   */
  getDurationMinutes() {
    return this.length;
  }

  /**
   * Get formatted lesson time
   */
  getFormattedTime() {
    const time = this.startTime;
    if (time.includes(':')) {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    }
    return time;
  }

  /**
   * Update reenrollment intent for this registration
   * @param {string} intent - One of: 'keep', 'drop', 'change'
   * @param {string} submittedBy - Email or identifier of who submitted
   * @returns {Registration} This registration instance for chaining
   */
  updateIntent(intent, submittedBy) {
    this.reenrollmentIntent = intent;
    this.intentSubmittedAt = new Date();
    this.intentSubmittedBy = submittedBy;
    return this;
  }

  /**
   * Create Registration from database row data
   */
  static fromDatabaseRow(row) {
    // Skip empty rows
    if (!row || !row[0] || !Array.isArray(row) || row.length === 0) {
      return null;
    }

    try {
      // Map array indices to field names based on registration schema
      // Order: Id, StudentId, InstructorId, Day, StartTime, Length, RegistrationType,
      //        RoomId, Instrument, TransportationType, Notes, ClassId, ClassTitle,
      //        ExpectedStartDate, CreatedAt, CreatedBy, reenrollmentIntent, intentSubmittedAt, intentSubmittedBy

      // Detect if this is a Rock Band waitlist class by checking the classId
      // This is necessary because isWaitlistClass is not stored in the database
      const classId = row[11]; // ClassId
      // Try to get Rock Band class IDs from browser or fallback to hardcoded value
      // In browser: window.UserSession.getAppConfig().rockBandClassIds
      // On server: Not available, but we use default G015
      const rockBandClassIds =
        (typeof window !== 'undefined' &&
          window?.UserSession?.getAppConfig?.()?.rockBandClassIds) ||
        [];
      const isWaitlistClass = classId && rockBandClassIds.includes(String(classId).trim());

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
        reenrollmentIntent: row[16], // reenrollmentIntent
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
   * Create Registration from API data
   * @param {object} data - API data object
   * @returns {Registration} Registration instance
   */
  static fromApiData(data) {
    // Handle ID fields that might be objects or other types
    const processedData = {
      ...data,
      id: extractStringValue(data.id),
      studentId: extractStringValue(data.studentId),
      instructorId: extractStringValue(data.instructorId),
    };

    return new Registration(processedData);
  }

  /**
   * Convert to database row format (20-column schema with intent and linking)
   */
  toDatabaseRow() {
    return [
      this.id.getValue(),
      this.studentId.value,
      this.instructorId.value,
      this.day,
      this.startTime,
      this.length.toString(),
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
   * Convert Registration entity to plain data object for persistence
   */
  toDataObject() {
    // Helper function to safely extract values from value objects or plain values
    const extractValue = valueOrObject => {
      if (!valueOrObject) return null;
      if (typeof valueOrObject === 'string' || typeof valueOrObject === 'number') {
        return valueOrObject;
      }
      if (valueOrObject.getValue && typeof valueOrObject.getValue === 'function') {
        return valueOrObject.getValue();
      }
      if (valueOrObject.value !== undefined) {
        return valueOrObject.value;
      }
      return String(valueOrObject);
    };

    return {
      id: extractValue(this.id),
      studentId: extractValue(this.studentId),
      instructorId: extractValue(this.instructorId),
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
   * Converts the registration to a plain object for API responses
   * This method is automatically called by JSON.stringify() and Express res.json()
   * @returns {object} Plain object representation
   */
  toJSON() {
    return this.toDataObject();
  }

  /**
   * Factory method: Create new registration
   */
  static createNew(studentId, instructorId, options = {}) {
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
  generateSchedule(numberOfLessons = 12) {
    const lessons = [];
    const startDate = new Date(this.expectedStartDate);
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

    // Create LessonTime value object for this registration
    const lessonTime = new LessonTime(this.startTime, this.length);

    // Generate lesson dates
    for (let i = 0; i < numberOfLessons; i++) {
      lessons.push({
        lessonNumber: i + 1,
        date: new Date(currentDate),
        startTime: lessonTime.startTime,
        length: lessonTime.durationMinutes,
        expectedEndTime: lessonTime.endTime,
      });

      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7);
    }

    return lessons;
  }
}
