/**
 * Registration Model with UUID Primary Keys
 * =========================================
 *
 * Simplified registration model without audit fields
 */

import { RegistrationId } from '../../utils/values/registrationId.js';
import { StudentId } from '../../utils/values/studentId.js';
import { InstructorId } from '../../utils/values/instructorId.js';

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
    this.length = parseInt(data.length) || 30;

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
    // Skip empty rows or header rows
    if (!row || !row[0] || !Array.isArray(row) || row.length === 0) {
      return null;
    }

    // Skip header rows (check if first column is "Id", "ID", or other header-like values)
    const firstCell = String(row[0]).trim().toLowerCase();
    if (firstCell === 'id' || firstCell === 'registrationid' || firstCell === 'registration_id') {
      return null;
    }

    // Skip rows where the ID doesn't look like a UUID (basic check)
    const idValue = String(row[0]).trim();
    if (idValue.length < 10 || idValue === 'Id' || !idValue.includes('-')) {
      return null;
    }

    try {
      // Map array indices to field names based on registration schema
      // Order: Id, StudentId, InstructorId, Day, StartTime, Length, RegistrationType,
      //        RoomId, Instrument, TransportationType, Notes, ClassId, ClassTitle,
      //        ExpectedStartDate, CreatedAt, CreatedBy, reenrollmentIntent, intentSubmittedAt, intentSubmittedBy

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
   * Convert to database row format (simplified 16-column schema)
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
    };
  }

  /**
   * Factory method: Create new registration
   */
  static createNew(studentId, instructorId, options = {}) {
    return new Registration({
      studentId,
      instructorId,
      day: options.day,
      startTime: options.startTime,
      length: options.length || 30,
      registrationType: options.registrationType || 'private',
      roomId: options.roomId,
      instrument: options.instrument,
      transportationType: options.transportationType,
      notes: options.notes,
      classId: options.classId,
      classTitle: options.classTitle,
      expectedStartDate: options.expectedStartDate,
      createdAt: new Date().toISOString(),
      createdBy: options.createdBy,
    });
  }
}
