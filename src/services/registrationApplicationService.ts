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
import type { ConflictRegistrationData } from './registrationConflictService.js';
import { ConfigurationService } from './configurationService.js';
import { Registration } from '../models/shared/registration.js';
import { ConflictError } from '../common/errors.js';
import type { RegistrationData } from '../models/shared/registration.js';
import type { RegistrationRepository } from '../repositories/registrationRepository.js';
import type { UserRepository } from '../repositories/userRepository.js';
import type { ProgramRepository } from '../repositories/programRepository.js';
import type { Class, ClassData } from '../models/shared/class.js';
import type { Instructor, DayAvailability } from '../models/shared/instructor.js';
import type { Student } from '../models/shared/student.js';
import { DateHelpers, TonicDuration } from '../utils/nativeDateTimeHelpers.js';

/**
 * Registration input from the API layer.
 * Extends the core RegistrationData with optional context fields
 * (e.g., trimester, schoolYear) that are not part of the persisted model.
 */
type RegistrationInput = RegistrationData & Record<string, unknown>;

interface RegistrationServiceDependencies {
  registrationRepository: RegistrationRepository;
  userRepository: UserRepository;
  programRepository: ProgramRepository;
}

interface ProcessRegistrationOptions {
  isAdmin?: boolean;
}

interface RegistrationsOptions {
  page?: number;
  pageSize?: number;
  [key: string]: unknown;
}

interface BusValidationResult {
  isValid: boolean;
  errorMessage: string | null;
}

interface EnrichedRegistration {
  student: { id: string | undefined; firstName: string; lastName: string; email: string | null; grade: string | undefined } | null;
  instructor: { id: string; firstName: string | null; lastName: string | null; email: string | null } | null;
  class: { id: string; title: string; instrument: string; size: string | null } | null;
  isActive: boolean;
  [key: string]: unknown;
}

export class RegistrationApplicationService extends BaseService {
  registrationRepository: RegistrationRepository;
  userRepository: UserRepository;
  programRepository: ProgramRepository;

  constructor(dependencies: RegistrationServiceDependencies, configService?: ConfigurationService) {
    super(configService);
    this.registrationRepository = dependencies.registrationRepository;
    this.userRepository = dependencies.userRepository;
    this.programRepository = dependencies.programRepository;
  }

  /**
   * Process a new registration with full workflow
   */
  async processRegistration(
    registrationData: RegistrationInput,
    userId: string,
    options: ProcessRegistrationOptions = {}
  ): Promise<{ success: boolean; registration: Registration; lessonSchedule: unknown[] | null }> {
    try {
      const { isAdmin = false } = options;
      this.logger.info('🎵 Processing new registration', { isAdmin });

      // Step 1: Handle group registration data population
      if (registrationData.registrationType === 'group' && registrationData.classId) {
        // For group registrations, populate missing fields from class data
        const groupClass = await this.programRepository.getClassById(
          registrationData.classId
        );
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
        registrationData.isWaitlistClass = isWaitlistClass;

        // Set default transportation for group registrations if not specified
        if (!registrationData.transportationType) {
          registrationData.transportationType = 'pickup';
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
        const lengthMinutes = parseInt(String(registrationData.length), 10) || 0;

        const busValidation = this.#validateBusTimeRestrictions(
          registrationData.day,
          registrationData.startTime,
          lengthMinutes
        );

        if (!busValidation.isValid) {
          throw new Error(busValidation.errorMessage ?? undefined);
        }
      }

      // Step 3: Get related entities
      const [student, instructor, groupClass] = await Promise.all([
        this.userRepository.getStudentById(registrationData.studentId),
        this.userRepository.getInstructorById(registrationData.instructorId),
        registrationData.classId
          ? this.programRepository.getClassById(registrationData.classId)
          : Promise.resolve(null),
      ]);

      if (!student) {
        throw new Error(`Student not found: ${registrationData.studentId}`);
      }

      if (!instructor) {
        throw new Error(`Instructor not found: ${registrationData.instructorId}`);
      }

      // Step 3.5: Populate room assignment from instructor's schedule for both group and private registrations
      const dayName = registrationData.day.toLowerCase();
      const instructorData = instructor;

      // Get room ID from instructor's availability for the specific day
      // SC-005: dynamic key access on fixed-key interface requires cast
      const availability = instructorData.availability as unknown as Record<string, DayAvailability> | undefined;
      if (
        availability &&
        availability[dayName] &&
        availability[dayName].roomId
      ) {
        registrationData.roomId = availability[dayName].roomId;
      } else {
        this.logger.warn(
          `No room assignment found for instructor ${instructorData.id} on ${dayName}`
        );
        registrationData.roomId = 'unknown';
      }

      this.logger.info(
        `🏫 Room assignment for ${registrationData.registrationType} registration:`,
        {
          day: dayName,
          instructorId: instructorData.id,
          roomId: registrationData.roomId,
        }
      );

      // Step 4: Program-specific validation (catalog/class rules)
      const programValidation = this.#validateProgramRules(groupClass ?? null);
      if (!programValidation.isValid) {
        throw new Error(`Program validation failed: ${programValidation.errors.join(', ')}`);
      }

      // Step 5: Check for conflicts with existing registrations in the enrollment trimester
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
            'Student is already enrolled in this class. Students can only be enrolled in a class once.'
          );
        }
      }

      const conflictCheck = await RegistrationConflictService.checkConflicts(
        registrationData as unknown as ConflictRegistrationData, // SC-005: cross-model interface narrowing
        existingRegistrations as unknown as ConflictRegistrationData[], // SC-005: cross-model interface narrowing
        {
          skipCapacityCheck: isAdmin,
          groupClass: groupClass
            ? { id: groupClass.id, size: groupClass.size ? Number(groupClass.size) : undefined }
            : null,
        }
      );

      if (conflictCheck.hasConflicts) {
        throw new ConflictError(
          `Registration conflicts detected: ${conflictCheck.conflicts.map(c => c.message).join('; ')}`
        );
      }

      // Step 6: Create registration model
      this.logger.info('📝 Registration data before creating model:', registrationData);
      const registrationEntity = Registration.createNew(
        registrationData.studentId,
        registrationData.instructorId,
        {
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
          isWaitlistClass: registrationData.isWaitlistClass,
        }
      );

      // Step 7: Persist the registration
      const serializedRegistration = registrationEntity.toJSON();
      this.logger.info('📊 Registration data before persistence:', serializedRegistration);
      this.logger.info(`🔍 isWaitlistClass flag: ${serializedRegistration.isWaitlistClass}`);

      // Determine target trimester - caller must always provide explicit trimester
      const targetTrimester = registrationData.trimester as string | undefined;

      if (!targetTrimester) {
        throw new Error(
          'Trimester must be explicitly provided when creating registration - cannot determine automatically'
        );
      }

      this.logger.info(`🎯 Registration target trimester: ${targetTrimester}, isAdmin: ${isAdmin}`);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SC-005: typed model → generic storage API
      const persistedRegistration = await this.registrationRepository.create(
        serializedRegistration as unknown as Record<string, unknown>,
        targetTrimester
      );

      this.logger.info('✅ Registration processed successfully:', persistedRegistration.id);

      // Generate lesson schedule with complete registration data
      let lessonSchedule: unknown[] | null = null;
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
        this.logger.warn('⚠️ Could not generate lesson schedule:', (scheduleError as Error).message);
        lessonSchedule = [];
      }

      return {
        success: true,
        registration: persistedRegistration,
        lessonSchedule: lessonSchedule,
      };
    } catch (error) {
      this.logger.error('❌ Registration processing failed:', error);

      throw error;
    }
  }

  /**
   * Cancel a registration with workflow
   */
  async cancelRegistration(
    registrationId: string,
    reason: string,
    userId: string,
    tableName: string | null = null
  ): Promise<{ success: boolean; message: string }> {
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
        throw new Error('tableName is required to determine which trimester table to delete from');
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
   * Get registrations enriched with student, instructor, and class data.
   * Pagination is handled by the controller layer.
   */
  async getRegistrations(
    options: RegistrationsOptions = {}
  ): Promise<EnrichedRegistration[]> {
    try {
      this.logger.info('📋 Getting registrations with options:', options);

      // Get registrations from repository
      const registrations = await this.registrationRepository.getRegistrations(options);

      if (!registrations || registrations.length === 0) {
        return [];
      }

      // Batch-fetch all related entities and build lookup maps
      const [allStudents, allInstructors, allClasses] = await Promise.all([
        this.userRepository.getStudents(),
        this.userRepository.getInstructors(),
        this.programRepository.getClasses(),
      ]);

      const studentMap = new Map(allStudents.map(s => [s.id, s]));
      const instructorMap = new Map(allInstructors.map(i => [i.id, i]));
      const classMap = new Map(allClasses.map(c => [c.id, c]));

      // Join in memory
      const enrichedRegistrations = registrations.map(registration => {
        const studentData = studentMap.get(registration.studentId);
        const instructorData = instructorMap.get(registration.instructorId);
        const groupClassData = registration.classId ? classMap.get(registration.classId) : undefined;

        return {
          ...registration,
          student: studentData
            ? {
                id: studentData.id,
                firstName: studentData.firstName,
                lastName: studentData.lastName,
                email: studentData.email,
                grade: studentData.grade,
              }
            : null,
          instructor: instructorData
            ? {
                id: instructorData.id,
                firstName: instructorData.firstName,
                lastName: instructorData.lastName,
                email: instructorData.email,
              }
            : null,
          class: groupClassData
            ? {
                id: groupClassData.id,
                title: groupClassData.title,
                instrument: groupClassData.instrument,
                size: groupClassData.size,
              }
            : null,
          isActive: true,
        };
      });

      this.logger.info(`📊 Found ${enrichedRegistrations.length} registrations`);

      return enrichedRegistrations;
    } catch (error) {
      this.logger.error('❌ Error getting registrations:', error);
      throw error;
    }
  }

  /**
   * Validate program-specific business rules for a registration.
   * (Data format validation is handled by RegistrationValidationService)
   */
  #validateProgramRules(
    groupClass: ClassData | null
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (groupClass) {
      const rockBandClassIds = this.configService.getRockBandClassIds();
      const isWaitlistClass = groupClass.id ? rockBandClassIds.includes(groupClass.id) : false;

      if (!isWaitlistClass && (!groupClass.day || !groupClass.startTime || !groupClass.length)) {
        errors.push('Group class must have day, start time, and length');
      }

      if (!groupClass.title) {
        errors.push('Group class title is required');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate bus time restrictions for Late Bus transportation
   */
  #validateBusTimeRestrictions(
    day: string,
    startTime: string,
    lengthMinutes: number
  ): BusValidationResult {
    this.logger.info('🚌 Validating bus time restrictions:', {
      day,
      startTime,
      lengthMinutes,
      lengthType: typeof lengthMinutes,
    });

    // Ensure lengthMinutes is a number
    const durationMinutes = parseInt(String(lengthMinutes), 10) || 0;
    if (durationMinutes !== lengthMinutes) {
      this.logger.warn(
        `⚠️  Length was not a number: "${lengthMinutes}" (${typeof lengthMinutes}), converted to: ${durationMinutes}`
      );
    }

    // Parse start time and calculate end time
    if (!startTime) {
      return { isValid: true, errorMessage: null };
    }
    const startMinutes = DateHelpers.parseTimeString(startTime).totalMinutes;
    const endMinutes = startMinutes + durationMinutes;

    // Convert end time back to time string for display
    const endTimeDisplay = new TonicDuration(endMinutes).to24Hour();

    // Bus schedule restrictions
    const busDeadlines: Record<string, string> = {
      Monday: '16:45',
      Tuesday: '16:45',
      Wednesday: '16:15',
      Thursday: '16:45',
      Friday: '16:45',
    };

    const deadlineTime = busDeadlines[day];
    if (!deadlineTime) {
      this.logger.info('🚌 Unknown day, allowing bus transportation');
      return { isValid: true, errorMessage: null };
    }

    const deadlineMinutes = DateHelpers.parseTimeString(deadlineTime).totalMinutes;
    const deadlineDisplay = new TonicDuration(deadlineMinutes).to24Hour();

    if (endMinutes > deadlineMinutes) {
      const errorMessage = `Late Bus is not available for lessons ending after ${deadlineDisplay} on ${day}. This lesson ends at ${endTimeDisplay}. Please select "Late Pick Up" instead or choose a different time slot.`;
      this.logger.info('🚌 Bus time restriction violated:', errorMessage);
      return { isValid: false, errorMessage };
    }

    this.logger.info('🚌 Bus time validation passed');
    return { isValid: true, errorMessage: null };
  }
}
