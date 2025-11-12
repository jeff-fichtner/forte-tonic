/**
 * Registration Conflict Service - Domain layer business logic for registration conflicts
 * Handles duplicate detection, schedule conflicts, and capacity management
 */

import { RegistrationType } from '../utils/values/registrationType.js';

export class RegistrationConflictService {
  /**
   * Checks for registration conflicts
   * @param {object} newRegistration - New registration data
   * @param {Array} existingRegistrations - Existing registrations
   * @param {object} options - Additional options
   * @param {boolean} options.skipCapacityCheck - Skip capacity validation (for admins)
   * @returns {object} Conflict check result
   */
  static async checkConflicts(newRegistration, existingRegistrations, options = {}) {
    const { skipCapacityCheck = false, groupClass = null } = options;
    const conflicts = [];

    // Check for duplicate registration
    const duplicateConflict = this.checkDuplicateRegistration(
      newRegistration,
      existingRegistrations
    );
    if (duplicateConflict) conflicts.push(duplicateConflict);

    // Check for schedule conflicts (private lessons only)
    if (newRegistration.registrationType === RegistrationType.PRIVATE) {
      const scheduleConflicts = this.checkScheduleConflicts(newRegistration, existingRegistrations);
      conflicts.push(...scheduleConflicts);
    }

    // Check for capacity conflicts (group classes only)
    // Admins can bypass capacity restrictions
    if (newRegistration.registrationType === RegistrationType.GROUP && !skipCapacityCheck) {
      const capacityConflict = this.checkClassCapacity(
        newRegistration,
        existingRegistrations,
        groupClass
      );
      if (capacityConflict) conflicts.push(capacityConflict);
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
    };
  }

  /**
   * Checks for duplicate registration (same student, same configuration)
   * @param {object} newRegistration - New registration data
   * @param {Array} existingRegistrations - Existing registrations
   * @returns {object|null} Duplicate conflict or null
   */
  static checkDuplicateRegistration(newRegistration, existingRegistrations) {
    const existing = existingRegistrations.find(reg => {
      if (reg.studentId !== newRegistration.studentId) return false;

      if (newRegistration.registrationType === RegistrationType.GROUP) {
        return (
          reg.classId === newRegistration.classId &&
          reg.schoolYear === newRegistration.schoolYear &&
          reg.trimester === newRegistration.trimester
        );
      } else {
        return (
          reg.instructorId === newRegistration.instructorId &&
          reg.day === newRegistration.day &&
          reg.startTime === newRegistration.startTime &&
          reg.schoolYear === newRegistration.schoolYear &&
          reg.trimester === newRegistration.trimester
        );
      }
    });

    if (existing) {
      return {
        type: 'duplicate',
        message: 'Student is already registered for this class/lesson',
        existingRegistrationId: existing.id,
      };
    }

    return null;
  }

  /**
   * Checks for schedule conflicts (student double-booked, instructor conflicts)
   * @param {object} newRegistration - New registration data
   * @param {Array} existingRegistrations - Existing registrations
   * @returns {Array} Array of schedule conflicts
   */
  static checkScheduleConflicts(newRegistration, existingRegistrations) {
    const conflicts = [];

    // Check student schedule conflict
    const studentConflict = this.checkStudentScheduleConflict(
      newRegistration,
      existingRegistrations
    );
    if (studentConflict) conflicts.push(studentConflict);

    // Check instructor schedule conflict
    const instructorConflict = this.checkInstructorScheduleConflict(
      newRegistration,
      existingRegistrations
    );
    if (instructorConflict) conflicts.push(instructorConflict);

    return conflicts;
  }

  /**
   * Checks if student has conflicting lesson at same time
   * @param {object} newRegistration - New registration data
   * @param {Array} existingRegistrations - Existing registrations
   * @returns {object|null} Student conflict or null
   */
  static checkStudentScheduleConflict(newRegistration, existingRegistrations) {
    const conflict = existingRegistrations.find(
      reg =>
        reg.studentId === newRegistration.studentId &&
        reg.day === newRegistration.day &&
        this.timesOverlap(
          reg.startTime,
          reg.length,
          newRegistration.startTime,
          newRegistration.length
        ) &&
        reg.schoolYear === newRegistration.schoolYear &&
        reg.trimester === newRegistration.trimester &&
        reg.isActive !== false
    );

    if (conflict) {
      return {
        type: 'student_schedule',
        message: `Student has conflicting lesson on ${newRegistration.day} at ${newRegistration.startTime}`,
        conflictingRegistrationId: conflict.id,
      };
    }

    return null;
  }

  /**
   * Checks if instructor has conflicting lesson at same time
   * @param {object} newRegistration - New registration data
   * @param {Array} existingRegistrations - Existing registrations
   * @returns {object|null} Instructor conflict or null
   */
  static checkInstructorScheduleConflict(newRegistration, existingRegistrations) {
    const conflict = existingRegistrations.find(
      reg =>
        reg.instructorId === newRegistration.instructorId &&
        reg.day === newRegistration.day &&
        this.timesOverlap(
          reg.startTime,
          reg.length,
          newRegistration.startTime,
          newRegistration.length
        ) &&
        reg.schoolYear === newRegistration.schoolYear &&
        reg.trimester === newRegistration.trimester &&
        reg.isActive !== false
    );

    if (conflict) {
      return {
        type: 'instructor_schedule',
        message: `Instructor has conflicting lesson on ${newRegistration.day} at ${newRegistration.startTime}`,
        conflictingRegistrationId: conflict.id,
      };
    }

    return null;
  }

  /**
   * Checks if class has reached capacity
   * @param {object} newRegistration - New registration data
   * @param {Array} existingRegistrations - Existing registrations
   * @returns {object|null} Capacity conflict or null
   */
  static checkClassCapacity(newRegistration, existingRegistrations, groupClass = null) {
    const classRegistrations = existingRegistrations.filter(
      reg =>
        reg.classId === newRegistration.classId &&
        reg.schoolYear === newRegistration.schoolYear &&
        reg.trimester === newRegistration.trimester &&
        reg.isActive !== false
    );

    // Get actual class capacity from the class object, fallback to 12 if not available
    const maxCapacity = groupClass?.size || 12;

    if (classRegistrations.length >= maxCapacity) {
      return {
        type: 'class_capacity',
        message: `Class has reached maximum capacity (${maxCapacity} students)`,
        currentCount: classRegistrations.length,
        maxCapacity,
      };
    }

    return null;
  }

  /**
   * Checks if two time slots overlap
   * @param {string} time1 - First start time (HH:MM)
   * @param {number} duration1 - First duration in minutes
   * @param {string} time2 - Second start time (HH:MM)
   * @param {number} duration2 - Second duration in minutes
   * @returns {boolean} True if times overlap
   */
  static timesOverlap(time1, duration1, time2, duration2) {
    const start1 = this.timeToMinutes(time1);
    const end1 = start1 + duration1;
    const start2 = this.timeToMinutes(time2);
    const end2 = start2 + duration2;

    return start1 < end2 && start2 < end1;
  }

  /**
   * Converts time string (HH:MM) to minutes since midnight
   * @param {string} timeStr - Time string in HH:MM format
   * @returns {number} Minutes since midnight
   */
  static timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Generates a composite registration ID
   * @param {object} registrationData - Registration data
   * @returns {string} Generated registration ID
   */
  static generateRegistrationId(registrationData) {
    if (registrationData.registrationType === RegistrationType.GROUP) {
      return `${registrationData.studentId}_${registrationData.classId}`;
    } else {
      return `${registrationData.studentId}_${registrationData.instructorId}_${registrationData.day}_${registrationData.startTime}`;
    }
  }

  /**
   * Validates that registration ID doesn't already exist
   * @param {string} registrationId - Registration ID to check
   * @param {Array} existingRegistrations - Existing registrations
   * @returns {boolean} True if ID is unique
   */
  static isUniqueRegistrationId(registrationId, existingRegistrations) {
    return !existingRegistrations.some(reg => reg.id === registrationId);
  }
}
