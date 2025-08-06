/**
 * Registration Model with UUID Primary Keys
 * =========================================
 * 
 * Simplified registration model without audit fields
 */

import { RegistrationId } from '../../utils/values/registrationId.js';
import { StudentId } from '../../utils/values/studentId.js';
import { InstructorId } from '../../utils/values/instructorId.js';

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
    this.registrationType = data.registrationType; // 'private' | 'group'
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
    this.version = parseInt(data.version) || 1;
  }

  #validateConstructorData(data) {
    if (!data) {
      throw new Error('Registration data is required');
    }

    const required = ['studentId', 'instructorId', 'day', 'startTime', 'registrationType'];
    const missing = required.filter(field => !data[field]);

    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Validate registration type
    if (!['private', 'group'].includes(data.registrationType)) {
      throw new Error('Registration type must be "private" or "group"');
    }

    // Validate group lessons have classId
    if (data.registrationType === 'group' && !data.classId) {
      throw new Error('Group registrations must have a classId');
    }
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
   * Factory method: Create from database row (simplified 16-column schema)
   */
  static fromDatabaseRow(row) {
    const [
      id, studentId, instructorId, day, startTime, length,
      registrationType, roomId, instrument, transportationType, notes,
      classId, classTitle, expectedStartDate, createdAt, createdBy
    ] = row;

    return new Registration({
      id,
      studentId,
      instructorId,
      day,
      startTime,
      length,
      registrationType,
      roomId,
      instrument,
      transportationType,
      notes,
      classId,
      classTitle,
      expectedStartDate,
      createdAt,
      createdBy
    });
  }

  /**
   * Convert to database row format (simplified 16-column schema)
   */
  toDatabaseRow() {
    return [
      this.id.getValue(),
      this.studentId.getValue(),
      this.instructorId.getValue(),
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
      this.createdBy || ''
    ];
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
      createdBy: options.createdBy
    });
  }

}
