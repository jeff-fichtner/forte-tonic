/**
 * Registration Application Service
 *
 * Coordinates registration operations between domain services, repositories,
 * and external services. Handles the application workflow for registration
 * processes including validation, conflict checking, and persistence.
 */

import { BaseService } from '../infrastructure/base/baseService.js';
import { RegistrationValidationService } from './registrationValidationService.js';
import { RegistrationConflictService } from './registrationConflictService.js';
import { ProgramValidationService } from './programValidationService.js';
import { Registration } from '../models/shared/registration.js';

export class RegistrationApplicationService extends BaseService {
  constructor(dependencies, configService) {
    super(configService); // Initialize logger via BaseService
    this.registrationRepository = dependencies.registrationRepository;
    this.userRepository = dependencies.userRepository;
    this.programRepository = dependencies.programRepository;
    this.auditService = dependencies.auditService;
  }

  /**
   * Process a new registration with full workflow
   * @param {object} registrationData - Registration data
   * @param {string} userId - User ID for audit logging
   * @param {object} options - Additional options
   * @param {boolean} options.isAdmin - Whether the user is an admin (bypasses capacity checks)
   */
  async processRegistration(registrationData, userId, options = {}) {
    try {
      const { isAdmin = false } = options;
      this.logger.info('🎵 Processing new registration', { isAdmin });

      // Step 1: Handle group registration data population
      if (registrationData.registrationType === 'group' && registrationData.classId) {
        // For group registrations, populate missing fields from class data
        const groupClass = await this.programRepository.getClassById(registrationData.classId);
        if (!groupClass) {
          throw new Error(`Class not found: ${registrationData.classId}`);
        }

        // Check if this is a Rock Band waitlist class
        const rockBandClassIds = this.configService.getRockBandClassIds();
        const isWaitlistClass = rockBandClassIds.includes(groupClass.id);

        // Populate instructor and class-specific data for group registrations
        registrationData.instructorId = groupClass.instructorId;
        registrationData.day = groupClass.day;
        registrationData.startTime = groupClass.startTime;
        registrationData.length = groupClass.length;
        registrationData.instrument = groupClass.instrument;
        registrationData.classTitle = groupClass.title;
        registrationData.isWaitlistClass = isWaitlistClass; // Pass to model for validation

        // Set default transportation for group registrations if not specified
        if (!registrationData.transportationType) {
          registrationData.transportationType = 'pickup'; // Default for group classes
        }

        this.logger.info('🎓 Group registration data populated from class:', {
          classId: registrationData.classId,
          instructorId: registrationData.instructorId,
          day: registrationData.day,
          startTime: registrationData.startTime,
          instrument: registrationData.instrument,
          isWaitlistClass: isWaitlistClass,
        });
      }

      // Step 2: Validate basic registration data (now with populated fields)
      const basicValidation =
        RegistrationValidationService.validateRegistrationData(registrationData);
      if (!basicValidation.isValid) {
        throw new Error(`Registration validation failed: ${basicValidation.errors.join(', ')}`);
      }

      // Step 2.5: Validate bus time restrictions for Late Bus transportation
      if (registrationData.transportationType === 'bus') {
        // Ensure length is a number (convert from string if needed)
        const lengthMinutes = parseInt(registrationData.length) || 0;

        const busValidation = this.#validateBusTimeRestrictions(
          registrationData.day,
          registrationData.startTime,
          lengthMinutes
        );

        if (!busValidation.isValid) {
          throw new Error(busValidation.errorMessage);
        }
      }

      // Step 3: Get related entities
      const [student, instructor, groupClass] = await Promise.all([
        this.userRepository.getStudentById(registrationData.studentId),
        this.userRepository.getInstructorById(registrationData.instructorId),
        registrationData.classId
          ? this.programRepository.getClassById(registrationData.classId)
          : null,
      ]);

      if (!student) {
        throw new Error(`Student not found: ${registrationData.studentId}`);
      }

      if (!instructor) {
        throw new Error(`Instructor not found: ${registrationData.instructorId}`);
      }

      // Step 3.5: Populate room assignment from instructor's schedule for both group and private registrations
      const dayName = registrationData.day.toLowerCase();
      const roomIdKey = `${dayName}RoomId`;

      // Get room ID from instructor's availability for the specific day
      if (
        instructor.availability &&
        instructor.availability[dayName] &&
        instructor.availability[dayName].roomId
      ) {
        registrationData.roomId = instructor.availability[dayName].roomId;
      } else if (instructor[roomIdKey]) {
        // Fallback: try direct property access on instructor object
        registrationData.roomId = instructor[roomIdKey];
      } else {
        this.logger.warn(`No room assignment found for instructor ${instructor.id} on ${dayName}`);
        registrationData.roomId = 'ROOM-001'; // Default fallback
      }

      this.logger.info(
        `🏫 Room assignment for ${registrationData.registrationType} registration:`,
        {
          day: dayName,
          instructorId: instructor.id,
          roomId: registrationData.roomId,
        }
      );

      // Step 4: Program-specific validation (catalog/class rules)
      const programValidation = ProgramValidationService.validateRegistration(
        registrationData,
        groupClass
      );
      if (!programValidation.isValid) {
        throw new Error(`Program validation failed: ${programValidation.errors.join(', ')}`);
      }

      // Step 5: Check for conflicts with existing registrations in the enrollment trimester
      // (During enrollment periods, this checks against the NEXT trimester where the registration will be saved)
      const existingRegistrations = await this.registrationRepository.getEnrollmentRegistrations();

      // Check for duplicate group registrations (student can only be enrolled in a class once)
      if (registrationData.registrationType === 'group' && registrationData.classId) {
        const existingGroupRegistration = existingRegistrations.find(
          reg =>
            reg.studentId === registrationData.studentId &&
            reg.classId === registrationData.classId &&
            reg.registrationType === 'group'
        );

        if (existingGroupRegistration) {
          throw new Error(
            `Student is already enrolled in this class. Students can only be enrolled in a class once.`
          );
        }
      }

      const conflictCheck = await RegistrationConflictService.checkConflicts(
        registrationData,
        existingRegistrations,
        { skipCapacityCheck: isAdmin }
      );

      if (conflictCheck.hasConflicts) {
        throw new Error(
          `Registration conflicts detected: ${conflictCheck.conflicts.map(c => c.message).join('; ')}`
        );
      }

      // Step 6: Create registration model
      this.logger.info('📝 Registration data before creating model:', registrationData);
      const registrationEntity = Registration.createNew(
        registrationData.studentId,
        registrationData.instructorId,
        {
          id: RegistrationConflictService.generateRegistrationId(registrationData),
          registrationType: registrationData.registrationType,
          day: registrationData.day,
          startTime: registrationData.startTime,
          length: registrationData.length,
          instrument: registrationData.instrument,
          roomId: registrationData.roomId,
          classId: registrationData.classId,
          classTitle: registrationData.classTitle,
          transportationType: registrationData.transportationType,
          notes: registrationData.notes,
          expectedStartDate: registrationData.expectedStartDate,
          createdBy: userId,
          isWaitlistClass: registrationData.isWaitlistClass, // Pass flag for validation
        }
      );

      // Step 7: Persist the registration
      const registrationDataObject = registrationEntity.toDataObject();
      this.logger.info('📊 Registration data object before persistence:', registrationDataObject);
      this.logger.info(`🔍 isWaitlistClass flag: ${registrationDataObject.isWaitlistClass}`);

      // For admin-created registrations with explicit trimester, use that trimester table
      // Otherwise, use the enrollment trimester (for parents during enrollment periods)
      const targetTrimester =
        isAdmin && registrationData.trimester ? registrationData.trimester : null;

      const persistedRegistration = await this.registrationRepository.create(
        registrationDataObject,
        targetTrimester
      );

      // Step 8: Audit logging
      if (this.auditService) {
        await this.auditService.logRegistrationCreated(persistedRegistration, userId);
      }

      this.logger.info('✅ Registration processed successfully:', persistedRegistration.id);

      // Generate lesson schedule with complete registration data
      let lessonSchedule = null;
      try {
        // Ensure we have the required fields for lesson schedule generation
        const scheduleData = {
          ...persistedRegistration,
          expectedStartDate: persistedRegistration.expectedStartDate || new Date(),
          day: persistedRegistration.day,
          startTime: persistedRegistration.startTime,
          length: persistedRegistration.length,
        };

        if (scheduleData.day && scheduleData.startTime && scheduleData.length) {
          lessonSchedule = persistedRegistration.generateSchedule();
        }
      } catch (scheduleError) {
        this.logger.warn('⚠️ Could not generate lesson schedule:', scheduleError.message);
        lessonSchedule = [];
      }

      return {
        success: true,
        registration: persistedRegistration,
        lessonSchedule: lessonSchedule,
      };
    } catch (error) {
      this.logger.error('❌ Registration processing failed:', error);

      // Audit failure
      if (this.auditService) {
        await this.auditService.logRegistrationFailed(registrationData, error.message, userId);
      }

      throw error;
    }
  }

  /**
   * Cancel a registration with workflow
   */
  async cancelRegistration(registrationId, reason, userId, tableName = null) {
    try {
      this.logger.info('🚫 Cancelling registration:', { registrationId, tableName });

      // Get existing registration from the specified table (or default table)
      const existingData = tableName
        ? await this.registrationRepository.findByIdInTable(tableName, registrationId)
        : await this.registrationRepository.findById(registrationId);

      if (!existingData) {
        throw new Error(`Registration not found: ${registrationId}`);
      }

      // existingData is already a Registration instance from the repository
      const registration = existingData;

      // For admin/instructor deletions, bypass complex business logic checks
      // and proceed with deletion (as requested - work with current schema)

      // Perform cancellation from the specified table
      if (tableName) {
        await this.registrationRepository.deleteFromTable(tableName, registrationId, userId);
      } else {
        await this.registrationRepository.delete(registrationId, userId);
      }

      // Get student and instructor for audit logging
      const [student, instructor] = await Promise.all([
        this.userRepository.getStudentById(registration.studentId.value),
        this.userRepository.getInstructorById(registration.instructorId.value),
      ]);

      // Audit logging
      if (this.auditService) {
        await this.auditService.logRegistrationCancelled(registration, reason, userId);
      }

      this.logger.info('✅ Registration cancelled successfully');

      return {
        success: true,
        message: 'Registration cancelled successfully',
      };
    } catch (error) {
      this.logger.error('❌ Registration cancellation failed:', error);
      throw error;
    }
  }

  /**
   * Get registration details with enriched information
   */
  async getRegistrationDetails(registrationId) {
    try {
      const registrationData = await this.registrationRepository.findById(registrationId);
      if (!registrationData) {
        throw new Error(`Registration not found: ${registrationId}`);
      }

      const registration = Registration.fromDataObject(registrationData);

      // Get related entities
      const [student, instructor, groupClass] = await Promise.all([
        this.userRepository.getStudentById(registration.studentId.value),
        this.userRepository.getInstructorById(registration.instructorId.value),
        registration.classId ? this.programRepository.getClassById(registration.classId) : null,
      ]);

      return {
        registration: registration.toDataObject(),
        student,
        instructor,
        groupClass,
        lessonSchedule: registration.generateSchedule(),
        nextLessonDate: registration.getNextLessonDate(),
        canModify: registration.canBeModified(),
        cancellationInfo: registration.canBeCancelled(),
        totalCost: registration.calculateLessonCost(),
        requiresTransportation: registration.requiresTransportation(),
      };
    } catch (error) {
      this.logger.error('❌ Failed to get registration details:', error);
      throw error;
    }
  }

  /**
   * Get registrations by student with enriched data
   */
  async getStudentRegistrations(studentId) {
    try {
      const registrations = await this.registrationRepository.findByStudentId(studentId);

      const enrichedRegistrations = await Promise.all(
        registrations.map(async regData => {
          const registration = Registration.fromDataObject(regData);
          const instructor = await this.userRepository.getInstructorById(
            registration.instructorId.value
          );

          return {
            ...registration.toDataObject(),
            instructor,
            nextLessonDate: registration.getNextLessonDate(),
            canModify: registration.canBeModified(),
            totalCost: registration.calculateLessonCost(),
          };
        })
      );

      return enrichedRegistrations;
    } catch (error) {
      this.logger.error('❌ Failed to get student registrations:', error);
      throw error;
    }
  }

  /**
   * Get registrations with filtering and pagination
   */
  async getRegistrations(options = {}) {
    try {
      this.logger.info('📋 Getting registrations with options:', options);

      // Get registrations from repository
      const registrations = await this.registrationRepository.getRegistrations(options);

      // Defensive check: if registrations is undefined or null, return empty array
      if (!registrations) {
        this.logger.warn('No registrations returned from repository, returning empty array');
        return {
          registrations: [],
          totalCount: 0,
          page: options.page || 1,
          pageSize: options.pageSize || 1000,
        };
      }

      // Enrich registrations with student and instructor details
      const enrichedRegistrations = await Promise.all(
        registrations.map(async registration => {
          const [student, instructor, groupClass] = await Promise.all([
            this.userRepository.getStudentById(registration.studentId),
            this.userRepository.getInstructorById(registration.instructorId),
            registration.classId ? this.programRepository.getClassById(registration.classId) : null,
          ]);

          return {
            ...registration,
            student: student
              ? {
                  id: student.id,
                  firstName: student.firstName,
                  lastName: student.lastName,
                  email: student.email,
                  grade: student.grade,
                }
              : null,
            instructor: instructor
              ? {
                  id: instructor.id,
                  firstName: instructor.firstName,
                  lastName: instructor.lastName,
                  email: instructor.email,
                }
              : null,
            class: groupClass
              ? {
                  id: groupClass.id,
                  name: groupClass.name,
                  instrument: groupClass.instrument,
                  capacity: groupClass.capacity,
                }
              : null,
            // Add business logic flags
            hasConflicts: false, // TODO: Implement conflict detection
            isActive: true, // Simplified - no status field
          };
        })
      );

      this.logger.info(`📊 Found ${enrichedRegistrations.length} registrations`);

      return {
        registrations: enrichedRegistrations,
        totalCount: enrichedRegistrations.length,
        page: options.page || 1,
        pageSize: options.pageSize || 1000,
      };
    } catch (error) {
      this.logger.error('❌ Error getting registrations:', error);
      throw error;
    }
  }

  /**
   * Parse time string (supports both "HH:MM" and "H:MM AM/PM" formats) to minutes since midnight
   */
  #parseTime(timeStr) {
    if (!timeStr) return null;

    // Handle AM/PM format (e.g., "3:00 PM", "11:30 AM")
    if (timeStr.includes('AM') || timeStr.includes('PM')) {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let hour24 = hours;

      if (period === 'PM' && hours !== 12) {
        hour24 += 12;
      } else if (period === 'AM' && hours === 12) {
        hour24 = 0;
      }

      return hour24 * 60 + (minutes || 0);
    }

    // Handle 24-hour format (e.g., "15:00", "09:30")
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }

  /**
   * Helper method to format minutes since midnight back to HH:MM format
   */
  #formatTimeFromMinutes(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Validate bus time restrictions for Late Bus transportation
   * @param {string} day - Day of the week (e.g., 'Monday', 'Wednesday')
   * @param {string} startTime - Start time (e.g., '14:30')
   * @param {number} lengthMinutes - Duration in minutes
   * @returns {object} Validation result with isValid boolean and errorMessage
   */
  #validateBusTimeRestrictions(day, startTime, lengthMinutes) {
    this.logger.info('🚌 Validating bus time restrictions:', {
      day,
      startTime,
      lengthMinutes,
      lengthType: typeof lengthMinutes,
    });

    // Ensure lengthMinutes is a number
    const durationMinutes = parseInt(lengthMinutes) || 0;
    if (durationMinutes !== lengthMinutes) {
      this.logger.warn(
        `⚠️  Length was not a number: "${lengthMinutes}" (${typeof lengthMinutes}), converted to: ${durationMinutes}`
      );
    }

    // Parse start time and calculate end time
    const startMinutes = this.#parseTime(startTime);
    const endMinutes = startMinutes + durationMinutes;

    // Convert end time back to time string for display
    const endTimeDisplay = this.#formatTimeFromMinutes(endMinutes);

    // Bus schedule restrictions
    const busDeadlines = {
      Monday: '16:45', // 4:45 PM
      Tuesday: '16:45', // 4:45 PM
      Wednesday: '16:15', // 4:15 PM
      Thursday: '16:45', // 4:45 PM
      Friday: '16:45', // 4:45 PM
    };

    const deadlineTime = busDeadlines[day];
    if (!deadlineTime) {
      this.logger.info('🚌 Unknown day, allowing bus transportation');
      return { isValid: true, errorMessage: null }; // Unknown day, allow
    }

    const deadlineMinutes = this.#parseTime(deadlineTime);
    const deadlineDisplay = this.#formatTimeFromMinutes(deadlineMinutes);

    if (endMinutes > deadlineMinutes) {
      const errorMessage = `Late Bus is not available for lessons ending after ${deadlineDisplay} on ${day}. This lesson ends at ${endTimeDisplay}. Please select "Late Pick Up" instead or choose a different time slot.`;
      this.logger.info('🚌 Bus time restriction violated:', errorMessage);
      return { isValid: false, errorMessage };
    }

    this.logger.info('🚌 Bus time validation passed');
    return { isValid: true, errorMessage: null };
  }
}
