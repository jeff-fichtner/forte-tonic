/**
 * Registration Conflict Service - Domain layer business logic for registration conflicts
 * Handles duplicate detection, schedule conflicts, and capacity management
 */

import { RegistrationType } from '../utils/values/registrationType.js';
import { getLogger } from '../utils/logger.js';
import { DateHelpers } from '../utils/nativeDateTimeHelpers.js';

const logger = getLogger();

export interface ConflictRegistrationData {
  id?: string;
  studentId: string;
  instructorId: string;
  day: string;
  startTime: string;
  length: number;
  registrationType: string;
  classId?: string;
  [key: string]: unknown;
}

export interface ConflictGroupClass {
  id: string;
  size?: number;
}

interface Conflict {
  type: string;
  message: string;
  existingRegistrationId?: string;
  conflictingRegistrationId?: string;
  currentCount?: number;
  maxCapacity?: number;
}

interface ConflictResult {
  hasConflicts: boolean;
  conflicts: Conflict[];
}

export class RegistrationConflictService {
  /**
   * Checks for registration conflicts
   * @param newRegistration - New registration data
   * @param existingRegistrations - Existing registrations
   * @param options - Additional options
   * @param options.skipCapacityCheck - Skip capacity validation (for admins)
   * @returns Conflict check result
   */
  static async checkConflicts(
    newRegistration: ConflictRegistrationData,
    existingRegistrations: ConflictRegistrationData[],
    options: { skipCapacityCheck?: boolean; groupClass?: ConflictGroupClass | null } = {}
  ): Promise<ConflictResult> {
    const { skipCapacityCheck = false, groupClass = null } = options;
    const conflicts: Conflict[] = [];

    logger.info('========== CONFLICT CHECK START ==========');
    logger.info('New registration:', {
      studentId: newRegistration.studentId,
      instructorId: newRegistration.instructorId,
      day: newRegistration.day,
      startTime: newRegistration.startTime,
      length: newRegistration.length,
      registrationType: newRegistration.registrationType,
      classId: newRegistration.classId,
    });
    logger.info(`Existing registrations count: ${existingRegistrations.length}`);
    logger.info(
      `Options: skipCapacityCheck=${skipCapacityCheck}, groupClass=${groupClass?.id || 'none'}`
    );

    // Check for duplicate registration
    const duplicateConflict = this.checkDuplicateRegistration(
      newRegistration,
      existingRegistrations
    );
    if (duplicateConflict) {
      // Exit early - duplicate is definitive, no need to check other conflicts
      logger.info('Duplicate found - exiting early');
      conflicts.push(duplicateConflict);
      return {
        hasConflicts: true,
        conflicts,
      };
    }

    // Check for student schedule conflicts (both private and group)
    // Students cannot have overlapping lessons regardless of type
    logger.info('Checking student schedule conflicts');
    const studentConflict = this.checkStudentScheduleConflict(
      newRegistration,
      existingRegistrations
    );
    if (studentConflict) conflicts.push(studentConflict);

    // Check for instructor schedule conflicts (private lessons only)
    // Group classes don't block instructor time in the same way
    if (newRegistration.registrationType === RegistrationType.PRIVATE) {
      logger.info('Registration is PRIVATE - checking instructor schedule conflicts');
      const instructorConflict = this.checkInstructorScheduleConflict(
        newRegistration,
        existingRegistrations
      );
      if (instructorConflict) conflicts.push(instructorConflict);
    } else {
      logger.info('Registration is GROUP - skipping instructor schedule conflicts');
    }

    // Check for capacity conflicts (group classes only)
    // Admins can bypass capacity restrictions
    if (newRegistration.registrationType === RegistrationType.GROUP && !skipCapacityCheck) {
      logger.info('Registration is GROUP - checking capacity');
      const capacityConflict = this.checkClassCapacity(
        newRegistration,
        existingRegistrations,
        groupClass
      );
      if (capacityConflict) conflicts.push(capacityConflict);
    }

    logger.info('========== CONFLICT CHECK RESULT ==========');
    logger.info(`Conflicts found: ${conflicts.length}`);
    if (conflicts.length > 0) {
      conflicts.forEach((c, i) => {
        logger.info(`  Conflict ${i + 1}: type=${c.type}, message=${c.message}`);
      });
    }
    logger.info('========== CONFLICT CHECK END ==========');

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
    };
  }

  /**
   * Checks for duplicate registration (same student, same configuration)
   * @param newRegistration - New registration data
   * @param existingRegistrations - Existing registrations
   * @returns Duplicate conflict or null
   */
  static checkDuplicateRegistration(
    newRegistration: ConflictRegistrationData,
    existingRegistrations: ConflictRegistrationData[]
  ): Conflict | null {
    logger.info('--- Checking for DUPLICATE registration ---');

    const newStudentId = newRegistration.studentId;
    const newInstructorId = newRegistration.instructorId;

    logger.info(
      `New reg: studentId=${newStudentId}, instructorId=${newInstructorId}, day=${newRegistration.day}, startTime=${newRegistration.startTime}, classId=${newRegistration.classId}`
    );

    const existing = existingRegistrations.find((reg: ConflictRegistrationData, index: number) => {
      const regStudentId = reg.studentId;
      const regInstructorId = reg.instructorId;

      if (newRegistration.registrationType === RegistrationType.GROUP) {
        // Group: classId + studentId
        const classMatch = reg.classId === newRegistration.classId;
        const studentMatch = regStudentId === newStudentId;
        const isDuplicate = classMatch && studentMatch;

        if (classMatch || studentMatch) {
          logger.info(
            `  [${index}] GROUP check: classId=${reg.classId} (match=${classMatch}), studentId=${regStudentId} (match=${studentMatch}) => duplicate=${isDuplicate}`
          );
        }

        return isDuplicate;
      } else {
        // Private: studentId + instructorId + startTime + day
        const studentMatch = regStudentId === newStudentId;
        const instructorMatch = regInstructorId === newInstructorId;
        const timeMatch = reg.startTime === newRegistration.startTime;
        const dayMatch = reg.day === newRegistration.day;
        const isDuplicate = studentMatch && instructorMatch && timeMatch && dayMatch;

        if (studentMatch && instructorMatch) {
          logger.info(
            `  [${index}] PRIVATE check: studentId=${regStudentId} (match=${studentMatch}), instructorId=${regInstructorId} (match=${instructorMatch}), day=${reg.day} (match=${dayMatch}), startTime=${reg.startTime} (match=${timeMatch}) => duplicate=${isDuplicate}`
          );
        }

        return isDuplicate;
      }
    });

    if (existing) {
      logger.info(`DUPLICATE FOUND: existingId=${existing.id}`);
      return {
        type: 'duplicate',
        message: 'Student is already registered for this class/lesson',
        existingRegistrationId: existing.id,
      };
    }

    logger.info('No duplicate found');
    return null;
  }

  /**
   * Checks for schedule conflicts (student double-booked, instructor conflicts)
   * @param newRegistration - New registration data
   * @param existingRegistrations - Existing registrations
   * @returns Array of schedule conflicts
   */
  static checkScheduleConflicts(
    newRegistration: ConflictRegistrationData,
    existingRegistrations: ConflictRegistrationData[]
  ): Conflict[] {
    const conflicts: Conflict[] = [];

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
   * @param newRegistration - New registration data
   * @param existingRegistrations - Existing registrations
   * @returns Student conflict or null
   */
  static checkStudentScheduleConflict(
    newRegistration: ConflictRegistrationData,
    existingRegistrations: ConflictRegistrationData[]
  ): Conflict | null {
    logger.info('--- Checking for STUDENT SCHEDULE conflict ---');

    const newStudentId = newRegistration.studentId;
    logger.info(
      `New reg: studentId=${newStudentId}, day=${newRegistration.day}, startTime=${newRegistration.startTime}, length=${newRegistration.length}`
    );

    const conflict = existingRegistrations.find((reg: ConflictRegistrationData, index: number) => {
      const regStudentId = reg.studentId;
      const studentMatch = regStudentId === newStudentId;
      const dayMatch = reg.day === newRegistration.day;

      if (studentMatch && dayMatch) {
        const overlap = this.timesOverlap(
          reg.startTime,
          reg.length,
          newRegistration.startTime,
          newRegistration.length
        );
        logger.info(
          `  [${index}] studentId=${regStudentId} (match=${studentMatch}), day=${reg.day} (match=${dayMatch}), time=${reg.startTime}-${reg.startTime}+${reg.length}min vs ${newRegistration.startTime}+${newRegistration.length}min => overlap=${overlap}`
        );
        return overlap;
      }

      return false;
    });

    if (conflict) {
      logger.info(`STUDENT SCHEDULE CONFLICT FOUND: conflictingId=${conflict.id}`);
      return {
        type: 'student_schedule',
        message: `Student has conflicting lesson on ${conflict.day} at ${DateHelpers.convertTo12HourFormat(conflict.startTime)}`,
        conflictingRegistrationId: conflict.id,
      };
    }

    logger.info('No student schedule conflict found');
    return null;
  }

  /**
   * Checks if instructor has conflicting lesson at same time
   * @param newRegistration - New registration data
   * @param existingRegistrations - Existing registrations
   * @returns Instructor conflict or null
   */
  static checkInstructorScheduleConflict(
    newRegistration: ConflictRegistrationData,
    existingRegistrations: ConflictRegistrationData[]
  ): Conflict | null {
    logger.info('--- Checking for INSTRUCTOR SCHEDULE conflict ---');

    const newInstructorId = newRegistration.instructorId;
    logger.info(
      `New reg: instructorId=${newInstructorId}, day=${newRegistration.day}, startTime=${newRegistration.startTime}, length=${newRegistration.length}`
    );

    const conflict = existingRegistrations.find((reg: ConflictRegistrationData, index: number) => {
      const regInstructorId = reg.instructorId;
      const instructorMatch = regInstructorId === newInstructorId;
      const dayMatch = reg.day === newRegistration.day;

      if (instructorMatch && dayMatch) {
        const overlap = this.timesOverlap(
          reg.startTime,
          reg.length,
          newRegistration.startTime,
          newRegistration.length
        );
        logger.info(
          `  [${index}] instructorId=${regInstructorId} (match=${instructorMatch}), day=${reg.day} (match=${dayMatch}), time=${reg.startTime}+${reg.length}min vs ${newRegistration.startTime}+${newRegistration.length}min => overlap=${overlap}`
        );
        return overlap;
      }

      return false;
    });

    if (conflict) {
      logger.info(`INSTRUCTOR SCHEDULE CONFLICT FOUND: conflictingId=${conflict.id}`);
      return {
        type: 'instructor_schedule',
        message: `Instructor has conflicting lesson on ${conflict.day} at ${DateHelpers.convertTo12HourFormat(conflict.startTime)}`,
        conflictingRegistrationId: conflict.id,
      };
    }

    logger.info('No instructor schedule conflict found');
    return null;
  }

  /**
   * Checks if class has reached capacity
   * @param newRegistration - New registration data
   * @param existingRegistrations - Existing registrations
   * @returns Capacity conflict or null
   */
  static checkClassCapacity(
    newRegistration: ConflictRegistrationData,
    existingRegistrations: ConflictRegistrationData[],
    groupClass: ConflictGroupClass | null = null
  ): Conflict | null {
    logger.info('--- Checking for CLASS CAPACITY conflict ---');
    logger.info(`classId=${newRegistration.classId}, groupClass.size=${groupClass?.size}`);

    const maxCapacity = groupClass?.size;
    if (!maxCapacity) {
      logger.info('No size defined on class - unlimited capacity, skipping check');
      return null; // No size defined = unlimited capacity
    }

    const classRegistrations = existingRegistrations.filter(
      (reg: ConflictRegistrationData) => reg.classId === newRegistration.classId
    );

    logger.info(
      `Current registrations for class: ${classRegistrations.length}, maxCapacity: ${maxCapacity}`
    );

    if (classRegistrations.length >= maxCapacity) {
      logger.info(`CLASS CAPACITY CONFLICT: ${classRegistrations.length} >= ${maxCapacity}`);
      return {
        type: 'class_capacity',
        message: `Class has reached maximum capacity (${maxCapacity} students)`,
        currentCount: classRegistrations.length,
        maxCapacity,
      };
    }

    logger.info('No capacity conflict found');
    return null;
  }

  /**
   * Checks if two time slots overlap
   * @param time1 - First start time (HH:MM)
   * @param duration1 - First duration in minutes
   * @param time2 - Second start time (HH:MM)
   * @param duration2 - Second duration in minutes
   * @returns True if times overlap
   */
  static timesOverlap(time1: string, duration1: number, time2: string, duration2: number): boolean {
    const start1 = this.timeToMinutes(time1);
    const end1 = start1 + duration1;
    const start2 = this.timeToMinutes(time2);
    const end2 = start2 + duration2;

    const overlaps = start1 < end2 && start2 < end1;
    logger.debug(
      `timesOverlap: ${time1}(${start1})+${duration1}min=[${start1}-${end1}] vs ${time2}(${start2})+${duration2}min=[${start2}-${end2}] => ${overlaps}`
    );

    return overlaps;
  }

  /**
   * Converts time string (HH:MM) to minutes since midnight
   * @param timeStr - Time string in HH:MM format
   * @returns Minutes since midnight
   */
  static timeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Generates a composite registration ID
   * @param registrationData - Registration data
   * @returns Generated registration ID
   */
  static generateRegistrationId(registrationData: ConflictRegistrationData): string {
    if (registrationData.registrationType === RegistrationType.GROUP) {
      return `${registrationData.studentId}_${registrationData.classId}`;
    } else {
      return `${registrationData.studentId}_${registrationData.instructorId}_${registrationData.day}_${registrationData.startTime}`;
    }
  }

  /**
   * Validates that registration ID doesn't already exist
   * @param registrationId - Registration ID to check
   * @param existingRegistrations - Existing registrations
   * @returns True if ID is unique
   */
  static isUniqueRegistrationId(registrationId: string, existingRegistrations: ConflictRegistrationData[]): boolean {
    return !existingRegistrations.some((reg: ConflictRegistrationData) => reg.id === registrationId);
  }
}
