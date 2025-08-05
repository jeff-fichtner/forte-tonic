/**
 * Updated Registration Model with UUID Primary Keys
 * =================================================
 * 
 * New schema supporting both UUID primary keys and composite key compatibility
 */

import { RegistrationId } from '../../utils/values/registrationId.js';
import { StudentId } from '../../utils/values/studentId.js';
import { InstructorId } from '../../utils/values/instructorId.js';

export class RegistrationV2 {
  constructor(data) {
    this.#validateConstructorData(data);

    // UUID primary key (new)
    this.id = new RegistrationId(data.id);
    
    // Composite key preservation (for backward compatibility)
    this.compositeKey = data.compositeKey;
    
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
    
    // Status and lifecycle
    this.status = data.status || 'active'; // 'active' | 'paused' | 'completed' | 'cancelled'
    this.expectedStartDate = data.expectedStartDate ? new Date(data.expectedStartDate) : null;
    
    // Audit fields
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.createdBy = data.createdBy;
    this.modifiedAt = data.modifiedAt ? new Date(data.modifiedAt) : new Date();
    this.modifiedBy = data.modifiedBy;
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
   * Get the composite key for backward compatibility
   */
  getCompositeKey() {
    if (this.compositeKey) {
      return this.compositeKey;
    }
    
    // Generate composite key based on type
    if (this.registrationType === 'group') {
      return `${this.studentId.getValue()}_${this.classId}`;
    } else {
      return `${this.studentId.getValue()}_${this.instructorId.getValue()}_${this.day}_${this.startTime}`;
    }
  }

  /**
   * Check if registration is active
   */
  isActive() {
    return this.status === 'active';
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
   * Factory method: Create from database row (UUID schema)
   */
  static fromDatabaseRow(row) {
    const [
      id, compositeKey, studentId, instructorId, day, startTime, length,
      registrationType, roomId, instrument, transportationType, notes,
      classId, classTitle, expectedStartDate, createdAt, createdBy,
      status, modifiedAt, modifiedBy, version
    ] = row;

    return new RegistrationV2({
      id,
      compositeKey,
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
      createdBy,
      status,
      modifiedAt,
      modifiedBy,
      version
    });
  }

  /**
   * Factory method: Create from legacy composite key row
   */
  static fromLegacyRow(row) {
    const [
      compositeKey, studentId, instructorId, day, startTime, length,
      registrationType, roomId, instrument, transportationType, notes,
      classId, classTitle, expectedStartDate, createdAt, createdBy
    ] = row;

    return new RegistrationV2({
      id: null, // Will generate UUID
      compositeKey,
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
      createdBy,
      status: 'active',
      modifiedAt: new Date().toISOString(),
      modifiedBy: 'legacy_migration',
      version: 1
    });
  }

  /**
   * Convert to database row format (UUID schema)
   */
  toDatabaseRow() {
    return [
      this.id.getValue(),
      this.getCompositeKey(),
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
      this.createdBy || '',
      this.status,
      this.modifiedAt.toISOString(),
      this.modifiedBy || '',
      this.version.toString()
    ];
  }

  /**
   * Factory method: Create new registration
   */
  static createNew(studentId, instructorId, options = {}) {
    return new RegistrationV2({
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
      createdBy: options.createdBy,
      status: 'active'
    });
  }

  /**
   * Update registration with new data
   */
  update(changes, modifiedBy) {
    // Create updated registration
    const updatedData = {
      ...this,
      ...changes,
      modifiedAt: new Date(),
      modifiedBy,
      version: this.version + 1
    };

    return new RegistrationV2(updatedData);
  }

  /**
   * Cancel registration
   */
  cancel(cancelledBy, reason = '') {
    return this.update({
      status: 'cancelled',
      notes: this.notes ? `${this.notes}; Cancelled: ${reason}` : `Cancelled: ${reason}`
    }, cancelledBy);
  }

  /**
   * Pause registration
   */
  pause(pausedBy, reason = '') {
    return this.update({
      status: 'paused',
      notes: this.notes ? `${this.notes}; Paused: ${reason}` : `Paused: ${reason}`
    }, pausedBy);
  }

  /**
   * Resume registration
   */
  resume(resumedBy) {
    return this.update({
      status: 'active',
      notes: this.notes ? `${this.notes}; Resumed` : 'Resumed'
    }, resumedBy);
  }
}
