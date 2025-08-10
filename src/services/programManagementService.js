/**
 * Program Management Service - business logic for program operations
 *
 * Handles:
 * - Registration business rules and room assignment
 * - Class and schedule management
 * - Attendance tracking and validation
 * - Program workflow orchestration
 */

import { RegistrationType } from '../utils/values/registrationType.js';
import { DateHelpers } from '../utils/nativeDateTimeHelpers.js';

export class ProgramManagementService {
  /**
   * Prepare registration data with business rules applied
   */
  static prepareRegistrationData(registrationData, groupClass, instructor) {
    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const date = DateHelpers.getStartOfCurrentDayUTC();

    let weekDayIndex = null;
    let weekDay = null;

    // Apply group class business rules
    if (groupClass) {
      weekDay = groupClass.day;
      weekDayIndex = weekDays.indexOf(groupClass.day);

      if (weekDayIndex === -1) {
        throw new Error(`Invalid day: ${groupClass.day}. Must be one of: ${weekDays.join(', ')}`);
      }

      // Group class overrides
      registrationData.instructorId = instructor.id;
      registrationData.startTime = groupClass.startTime;
      registrationData.length = groupClass.length;
      registrationData.instrument = groupClass.instrument;
      registrationData.className = groupClass.title;
      registrationData.registrationType = RegistrationType.GROUP;
    } else {
      // Private lesson business rules
      weekDayIndex = parseInt(registrationData.day);
      if (isNaN(weekDayIndex) || weekDayIndex < 0 || weekDayIndex >= weekDays.length) {
        throw new Error(
          `Invalid day index: ${registrationData.day}. Must be 0-4 for ${weekDays.join(', ')}`
        );
      }
      weekDay = weekDays[weekDayIndex];
      registrationData.registrationType = RegistrationType.PRIVATE;
    }

    // Room assignment business logic
    const rooms = [
      instructor.mondayRoomId,
      instructor.tuesdayRoomId,
      instructor.wednesdayRoomId,
      instructor.thursdayRoomId,
      instructor.fridayRoomId,
    ];

    registrationData.roomId = rooms[weekDayIndex];
    if (!registrationData.roomId) {
      throw new Error(`No room assigned for instructor ${instructor.id} on ${weekDay}`);
    }

    // Set expected start date
    registrationData.expectedStartDate = date;
    registrationData.day = weekDay;

    return {
      ...registrationData,
      weekDayIndex,
      weekDay,
    };
  }

  /**
   * Validate registration can be processed
   */
  static validateRegistration(registrationData, groupClass, instructor) {
    const errors = [];

    // Student ID required
    if (!registrationData.studentId) {
      errors.push('Student ID is required');
    }

    // Instructor validation
    if (!instructor || !instructor.id) {
      errors.push('Valid instructor is required');
    }

    // Group class specific validation
    if (groupClass) {
      if (!groupClass.day || !groupClass.startTime || !groupClass.length) {
        errors.push('Group class must have day, start time, and length');
      }
      if (!groupClass.title) {
        errors.push('Group class title is required');
      }
    } else {
      // Private lesson validation
      if (!registrationData.day && registrationData.day !== 0) {
        errors.push('Day is required for private lessons');
      }
      if (!registrationData.startTime) {
        errors.push('Start time is required for private lessons');
      }
      if (!registrationData.length) {
        errors.push('Lesson length is required for private lessons');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Business rules for attendance recording
   */
  static validateAttendanceRecording(registrationId, existingAttendance) {
    const errors = [];

    if (!registrationId) {
      errors.push('Registration ID is required for attendance');
    }

    if (existingAttendance && existingAttendance.length > 0) {
      errors.push(`Attendance already recorded for registration ${registrationId}`);
    }

    return {
      canRecord: errors.length === 0,
      errors,
      existingRecord: existingAttendance?.[0] || null,
    };
  }

  /**
   * Business rules for attendance removal
   */
  static validateAttendanceRemoval(registrationId, existingAttendance) {
    const errors = [];

    if (!registrationId) {
      errors.push('Registration ID is required');
    }

    if (!existingAttendance || existingAttendance.length === 0) {
      errors.push(`No attendance record found for registration ${registrationId}`);
    }

    return {
      canRemove: errors.length === 0,
      errors,
      recordToRemove: existingAttendance?.[0] || null,
    };
  }

  /**
   * Business rules for unregistration
   */
  static validateUnregistration(registrationId, registration) {
    const errors = [];

    if (!registrationId) {
      errors.push('Registration ID is required');
    }

    if (!registration) {
      errors.push(`Registration ${registrationId} not found`);
    }

    // Could add more business rules here:
    // - Check if lessons have started
    // - Check for pending payments
    // - Check cancellation policies
    // - Validate refund eligibility

    return {
      canUnregister: errors.length === 0,
      errors,
      requiresRefund: false, // Business logic for refund determination
      cancellationFee: 0, // Business logic for cancellation fees
    };
  }

  /**
   * Calculate room assignment for instructor and day
   */
  static getRoomForInstructorDay(instructor, dayIndex) {
    const rooms = [
      instructor.mondayRoomId,
      instructor.tuesdayRoomId,
      instructor.wednesdayRoomId,
      instructor.thursdayRoomId,
      instructor.fridayRoomId,
    ];

    if (dayIndex < 0 || dayIndex >= rooms.length) {
      throw new Error(`Invalid day index: ${dayIndex}`);
    }

    const roomId = rooms[dayIndex];
    if (!roomId) {
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      throw new Error(`No room assigned for instructor ${instructor.id} on ${dayNames[dayIndex]}`);
    }

    return roomId;
  }

  /**
   * Business logic for determining if a class can accept more students
   */
  static canAcceptMoreStudents(groupClass, currentRegistrations) {
    if (!groupClass) return true; // Private lessons don't have capacity limits

    const maxCapacity = groupClass.maxStudents || 10; // Default capacity
    const currentCount = currentRegistrations.filter(reg => reg.classId === groupClass.id).length;

    return {
      canAccept: currentCount < maxCapacity,
      currentCount,
      maxCapacity,
      availableSpots: maxCapacity - currentCount,
    };
  }

  /**
   * Generate expected lesson dates based on registration
   */
  static generateLessonSchedule(registrationData, numberOfLessons = 12) {
    const lessons = [];
    const startDate = new Date(registrationData.expectedStartDate);
    const dayOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].indexOf(
      registrationData.day
    );

    if (dayOfWeek === -1) {
      throw new Error(`Invalid day: ${registrationData.day}`);
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
        startTime: registrationData.startTime,
        length: registrationData.length,
        expectedEndTime: this.calculateEndTime(registrationData.startTime, registrationData.length),
      });

      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7);
    }

    return lessons;
  }

  /**
   * Calculate end time based on start time and length
   */
  static calculateEndTime(startTime, lengthMinutes) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + lengthMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;

    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  }
}
