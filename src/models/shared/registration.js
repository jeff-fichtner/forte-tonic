/**
 * Registration Domain Entity - rich domain model with business behavior
 *
 * This represents a registration in the domain layer with business logic
 * and validation rules embedded within the entity itself.
 */

import { RegistrationType } from '../../utils/values/registrationType.js';
import { StudentId } from '../../utils/values/studentId.js';
import { InstructorId } from '../../utils/values/instructorId.js';
import { LessonTime } from '../../utils/values/lessonTime.js';

export class Registration {
  constructor(data) {
    this.#validateConstructorData(data);

    this.id = data.id;
    this.studentId = new StudentId(data.studentId);
    this.instructorId = new InstructorId(data.instructorId);
    this.registrationType = data.registrationType;
    this.day = data.day;
    this.lessonTime = new LessonTime(data.startTime, data.length);
    this.instrument = data.instrument;
    this.roomId = data.roomId;
    this.classId = data.classId;
    this.className = data.className;
    this.transportationType = data.transportationType;
    this.notes = data.notes;
    this.expectedStartDate = new Date(data.expectedStartDate);
    this.registeredAt = data.registeredAt ? new Date(data.registeredAt) : new Date();
    this.registeredBy = data.registeredBy;
    this.isActive = data.isActive !== false; // Default to true
  }

  /**
   * Validate required data for construction
   */
  #validateConstructorData(data) {
    if (!data) {
      throw new Error('Registration data is required');
    }

    const required = [
      'studentId',
      'instructorId',
      'registrationType',
      'day',
      'startTime',
      'length',
    ];
    const missing = required.filter(field => !data[field] && data[field] !== 0);

    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    if (!Object.values(RegistrationType).includes(data.registrationType)) {
      throw new Error(`Invalid registration type: ${data.registrationType}`);
    }
  }

  /**
   * Business rule: Check if this registration conflicts with another
   */
  conflictsWith(otherRegistration) {
    // Same student cannot be registered twice for the same class
    if (
      this.registrationType === RegistrationType.GROUP &&
      otherRegistration.registrationType === RegistrationType.GROUP
    ) {
      return (
        this.studentId.equals(otherRegistration.studentId) &&
        this.classId === otherRegistration.classId
      );
    }

    // For private lessons, check time conflicts for same instructor
    if (
      this.instructorId.equals(otherRegistration.instructorId) &&
      this.day === otherRegistration.day
    ) {
      return this.lessonTime.overlapsWith(otherRegistration.lessonTime);
    }

    return false;
  }

  /**
   * Business rule: Check if registration can be modified
   */
  canBeModified() {
    const now = new Date();
    const daysDifference = Math.floor((this.expectedStartDate - now) / (1000 * 60 * 60 * 24));

    // Cannot modify if lessons have already started or will start within 24 hours
    return daysDifference > 1;
  }

  /**
   * Business rule: Check if registration can be cancelled
   */
  canBeCancelled() {
    if (!this.isActive) {
      return { canCancel: false, reason: 'Registration is already inactive' };
    }

    const now = new Date();
    const daysDifference = Math.floor((this.expectedStartDate - now) / (1000 * 60 * 60 * 24));

    if (daysDifference < 1) {
      return {
        canCancel: false,
        reason: 'Cannot cancel within 24 hours of start date',
        requiresManagerialApproval: true,
      };
    }

    return {
      canCancel: true,
      refundEligible: daysDifference >= 7,
      cancellationFee: daysDifference >= 7 ? 0 : 25,
    };
  }

  /**
   * Business rule: Get next lesson date
   */
  getNextLessonDate() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].indexOf(this.day);
    if (dayOfWeek === -1) {
      throw new Error(`Invalid day: ${this.day}`);
    }

    const nextLesson = new Date(Math.max(today, this.expectedStartDate));

    // Find next occurrence of the lesson day
    while (nextLesson.getDay() !== (dayOfWeek + 1) % 7) {
      nextLesson.setDate(nextLesson.getDate() + 1);
    }

    return nextLesson;
  }

  /**
   * Business rule: Calculate total lesson cost
   */
  calculateLessonCost(pricePerMinute = 1.5) {
    if (this.registrationType === RegistrationType.GROUP) {
      // Group lessons have fixed pricing
      return 150; // Fixed group lesson price
    }

    // Private lessons calculated by duration
    return this.lessonTime.durationMinutes * pricePerMinute;
  }

  /**
   * Business rule: Check if transportation is required
   */
  requiresTransportation() {
    return (
      this.transportationType && ['pickup', 'dropoff', 'both'].includes(this.transportationType)
    );
  }

  /**
   * Business rule: Generate lesson schedule for the term
   */
  generateLessonSchedule(numberOfLessons = 12) {
    const lessons = [];
    const currentDate = this.getNextLessonDate();

    for (let i = 0; i < numberOfLessons; i++) {
      lessons.push({
        lessonNumber: i + 1,
        date: new Date(currentDate),
        startTime: this.lessonTime.startTime,
        endTime: this.lessonTime.endTime,
        duration: this.lessonTime.durationMinutes,
        cost: this.calculateLessonCost(),
      });

      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7);
    }

    return lessons;
  }

  /**
   * Domain event: Registration was created
   */
  toCreatedEvent() {
    return {
      type: 'RegistrationCreated',
      registrationId: this.id,
      studentId: this.studentId.value,
      instructorId: this.instructorId.value,
      registrationType: this.registrationType,
      expectedStartDate: this.expectedStartDate,
      createdAt: this.registeredAt,
    };
  }

  /**
   * Domain event: Registration was cancelled
   */
  toCancelledEvent(reason) {
    return {
      type: 'RegistrationCancelled',
      registrationId: this.id,
      studentId: this.studentId.value,
      reason,
      cancelledAt: new Date(),
    };
  }

  /**
   * Convert to data transfer object for persistence
   */
  toDataObject() {
    return {
      id: this.id,
      studentId: this.studentId.value,
      instructorId: this.instructorId.value,
      registrationType: this.registrationType,
      day: this.day,
      startTime: this.lessonTime.startTime,
      length: this.lessonTime.durationMinutes,
      instrument: this.instrument,
      roomId: this.roomId,
      classId: this.classId,
      className: this.className,
      transportationType: this.transportationType,
      notes: this.notes,
      expectedStartDate: this.expectedStartDate.toISOString(),
      registeredAt: this.registeredAt.toISOString(),
      registeredBy: this.registeredBy,
      isActive: this.isActive,
    };
  }

  /**
   * Factory method: Create from data object
   */
  static fromDataObject(data) {
    return new Registration(data);
  }

  /**
   * Factory method: Create from API data (frontend compatibility)
   */
  static fromApiData(data) {
    // Transform API data structure to match constructor expectations
    const transformedData = {
      ...data,
      // Extract primitive values from value objects if they exist, otherwise use as-is
      studentId: data.studentId?.value || data.studentId,
      instructorId: data.instructorId?.value || data.instructorId,
      // Extract startTime and length from lessonTime object if present
      startTime: data.lessonTime?.startTime || data.startTime,
      length: data.lessonTime?.durationMinutes || data.length,
    };
    
    return new Registration(transformedData);
  }

  /**
   * Factory method: Create from database row
   */
  static fromDatabaseRow(row) {
    const [
      id,
      studentId,
      instructorId,
      day,
      startTime,
      length,
      registrationType,
      roomId,
      schoolYear,
      createdBy,
    ] = row;

    return new Registration({
      id,
      studentId,
      instructorId,
      registrationType,
      day,
      startTime,
      length,
      roomId,
      schoolYear,
      registeredBy: createdBy,
      instrument: null, // Not stored in basic row structure
      classId: null, // Not stored in basic row structure
      className: null, // Not stored in basic row structure
      transportationType: null, // Not stored in basic row structure
      notes: null, // Not stored in basic row structure
      expectedStartDate: new Date(), // Default to now if not provided
      registeredAt: new Date(), // Default to now if not provided
      isActive: true, // Default to active
    });
  }

  /**
   * Factory method: Create new registration
   */
  static createNew(
    studentId,
    instructorId,
    registrationType,
    day,
    startTime,
    length,
    options = {}
  ) {
    const id = options.id || `${studentId}_${instructorId}_${day}_${startTime}`;

    return new Registration({
      id,
      studentId,
      instructorId,
      registrationType,
      day,
      startTime,
      length,
      instrument: options.instrument,
      roomId: options.roomId,
      classId: options.classId,
      className: options.className,
      transportationType: options.transportationType,
      notes: options.notes,
      expectedStartDate: options.expectedStartDate || new Date(),
      registeredBy: options.registeredBy || 'system',
    });
  }
}
