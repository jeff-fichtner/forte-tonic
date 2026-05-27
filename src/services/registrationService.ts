/**
 * Registration Service
 *
 * Coordinates registration operations between repositories and external services.
 * Handles validation, conflict checking, and persistence for registrations.
 */

import { BaseService } from '../infrastructure/base/baseService.js';
import { RegistrationType } from '../utils/values/registrationType.js';
import { TransportationType } from '../utils/values/transportationType.js';
import { isValidTrimester as validateTrimester } from '../utils/values/trimester.js';
import { ConfigurationService } from './configurationService.js';
import { Registration } from '../models/shared/registration.js';
import { ConflictError, ValidationError } from '../common/errors.js';
import { DEFAULT_REGISTRATION_CONFIG } from '../models/shared/responses/appConfigurationResponse.js';
import { getLogger } from '../utils/logger.js';
import type { Logger } from '../utils/logger.js';
import type { RegistrationData } from '../models/shared/registration.js';
import type { RegistrationRepository } from '../repositories/registrationRepository.js';
import type { UserRepository } from '../repositories/userRepository.js';
import type { ProgramRepository } from '../repositories/programRepository.js';
import type { ClassData } from '../models/shared/class.js';
import { DateHelpers, TonicDuration } from '../utils/nativeDateTimeHelpers.js';

// ---------------------------------------------------------------------------
// Types (formerly in registrationValidationService and registrationConflictService)
// ---------------------------------------------------------------------------

/**
 * Extended registration data that may contain optional context fields
 * not part of the core RegistrationData model (e.g., schoolYear, trimester)
 */
export type RegistrationInput = RegistrationData & Record<string, unknown>;

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

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Internal interfaces
// ---------------------------------------------------------------------------

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

interface ScheduleLesson {
  lessonNumber: number;
  date: Date;
  startTime: string;
  length: number | null;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface EnrichedRegistration {
  student: {
    id: string | undefined;
    firstName: string;
    lastName: string;
    grade: string | undefined;
  } | null;
  instructor: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  class: { id: string; title: string; instrument: string; size: string | null } | null;
  isActive: boolean;
  [key: string]: unknown;
}

export class RegistrationService extends BaseService {
  #registrationRepository: RegistrationRepository;
  #userRepository: UserRepository;
  #programRepository: ProgramRepository;

  // Lazy-initialized static logger for static conflict/validation methods
  static #_logger: Logger | null = null;

  static get #staticLogger(): Logger {
    if (!this.#_logger) {
      this.#_logger = getLogger();
    }
    return this.#_logger;
  }

  constructor(dependencies: RegistrationServiceDependencies, configService?: ConfigurationService) {
    super(configService);
    this.#registrationRepository = dependencies.registrationRepository;
    this.#userRepository = dependencies.userRepository;
    this.#programRepository = dependencies.programRepository;
  }

  // =========================================================================
  // Public API
  // =========================================================================

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
      if (
        registrationData.registrationType === RegistrationType.GROUP &&
        registrationData.classId
      ) {
        // For group registrations, populate missing fields from class data
        const groupClass = await this.#programRepository.getClassById(registrationData.classId);
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
      const basicValidation = RegistrationService.validateRegistrationData(registrationData);
      if (!basicValidation.isValid) {
        throw new Error(`Registration validation failed: ${basicValidation.errors.join(', ')}`);
      }

      // Step 2.5: Validate bus time restrictions for Late Bus transportation
      if (registrationData.transportationType === TransportationType.BUS) {
        const busValidation = this.#validateBusTimeRestrictions(
          registrationData.day,
          registrationData.startTime,
          Number(registrationData.length)
        );

        if (!busValidation.isValid) {
          throw new Error(busValidation.errorMessage ?? undefined);
        }
      }

      // Step 3: Get related entities
      const [student, instructor, groupClass] = await Promise.all([
        this.#userRepository.getStudentById(registrationData.studentId),
        this.#userRepository.getInstructorById(registrationData.instructorId),
        registrationData.classId
          ? this.#programRepository.getClassById(registrationData.classId)
          : Promise.resolve(null),
      ]);

      if (!student) {
        throw new Error(`Student not found: ${registrationData.studentId}`);
      }

      if (!instructor) {
        throw new Error(`Instructor not found: ${registrationData.instructorId}`);
      }

      // Step 3.6: Validate room assignment (optional for now, validated if provided)
      // TODO: Make roomId required once all registration flows populate it
      if (registrationData.roomId) {
        const room = await this.#userRepository.getRoomById(registrationData.roomId);
        if (!room) {
          throw new ValidationError(
            `Invalid room: "${registrationData.roomId}" does not match any known room`
          );
        }

        this.logger.info(
          `🏫 Room assignment for ${registrationData.registrationType} registration:`,
          {
            day: registrationData.day,
            instructorId: instructor.id,
            roomId: registrationData.roomId,
          }
        );
      }

      // Step 4: Program-specific validation (catalog/class rules)
      const programValidation = this.#validateProgramRules(groupClass ?? null);
      if (!programValidation.isValid) {
        throw new Error(`Program validation failed: ${programValidation.errors.join(', ')}`);
      }

      // Step 5: Check for conflicts with existing registrations in the enrollment trimester
      const existingRegistrations =
        await this.#registrationRepository.getNextTrimesterRegistrations();

      const conflictData: ConflictRegistrationData = {
        studentId: registrationData.studentId,
        instructorId: registrationData.instructorId,
        day: registrationData.day,
        startTime: registrationData.startTime,
        length: Number(registrationData.length) || 0,
        registrationType: registrationData.registrationType,
        classId: registrationData.classId,
      };

      const conflictRegistrations: ConflictRegistrationData[] = existingRegistrations.map(reg => ({
        id: reg.id,
        studentId: reg.studentId,
        instructorId: reg.instructorId,
        day: reg.day,
        startTime: reg.startTime,
        length: reg.length ?? 0,
        registrationType: reg.registrationType,
        classId: reg.classId,
      }));

      const conflictCheck = await RegistrationService.checkConflicts(
        conflictData,
        conflictRegistrations,
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

      const persistedRegistration = await this.#registrationRepository.create(
        { ...serializedRegistration },
        targetTrimester
      );

      this.logger.info('✅ Registration processed successfully:', persistedRegistration.id);

      // Generate lesson schedule with complete registration data
      let lessonSchedule: ScheduleLesson[] | null = null;
      try {
        if (
          persistedRegistration.day &&
          persistedRegistration.startTime &&
          persistedRegistration.length
        ) {
          lessonSchedule = this.#generateLessonSchedule(persistedRegistration);
        }
      } catch (scheduleError) {
        this.logger.warn(
          '⚠️ Could not generate lesson schedule:',
          (scheduleError as Error).message
        );
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
   * Delete a registration from the specified trimester table
   */
  async deleteRegistration(
    registrationId: string,
    userId: string,
    trimester: string
  ): Promise<boolean> {
    try {
      this.logger.info('🗑️ Deleting registration:', { registrationId, trimester });

      if (!trimester) {
        throw new Error('trimester is required to determine which trimester table to delete from');
      }

      await this.#registrationRepository.delete(registrationId, userId, trimester);

      this.logger.info('✅ Registration deleted successfully');

      return true;
    } catch (error) {
      this.logger.error('❌ Registration deletion failed:', error);
      throw error;
    }
  }

  /**
   * Get registrations enriched with student, instructor, and class data.
   * Pagination is handled by the controller layer.
   */
  async getRegistrations(options: RegistrationsOptions = {}): Promise<EnrichedRegistration[]> {
    try {
      this.logger.info('📋 Getting registrations with options:', options);

      // Get registrations from repository
      const registrations = await this.#registrationRepository.findAll(options);

      if (!registrations || registrations.length === 0) {
        return [];
      }

      // Batch-fetch all related entities and build lookup maps
      const [allStudents, allInstructors, allClasses] = await Promise.all([
        this.#userRepository.getStudents(),
        this.#userRepository.getInstructors(),
        this.#programRepository.getClasses(),
      ]);

      const studentMap = new Map(allStudents.map(s => [s.id, s]));
      const instructorMap = new Map(allInstructors.map(i => [i.id, i]));
      const classMap = new Map(allClasses.map(c => [c.id, c]));

      // Join in memory
      const enrichedRegistrations = registrations.map(registration => {
        const studentData = studentMap.get(registration.studentId);
        const instructorData = instructorMap.get(registration.instructorId);
        const groupClassData = registration.classId
          ? classMap.get(registration.classId)
          : undefined;

        return {
          ...registration,
          student: studentData
            ? {
                id: studentData.id,
                firstName: studentData.firstName,
                lastName: studentData.lastName,
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

  // =========================================================================
  // Validation (formerly RegistrationValidationService)
  // =========================================================================

  /**
   * Validates registration data according to business rules
   */
  static validateRegistrationData(registrationData: RegistrationInput): ValidationResult {
    const errors: string[] = [];

    // Core validation
    if (!registrationData.studentId) errors.push('Student ID is required');
    if (!registrationData.registrationType) errors.push('Registration type is required');
    if (!registrationData.transportationType) {
      errors.push('Transportation type is required');
    } else if (
      !Object.values(TransportationType).includes(
        registrationData.transportationType as (typeof TransportationType)[keyof typeof TransportationType]
      )
    ) {
      errors.push(
        `Invalid transportation type: "${registrationData.transportationType}". Must be one of: ${Object.values(TransportationType).join(', ')}`
      );
    }

    // Type-specific validation
    if (registrationData.registrationType === RegistrationType.GROUP) {
      this.#validateGroupRegistration(registrationData, errors);
    } else if (registrationData.registrationType === RegistrationType.PRIVATE) {
      this.#validatePrivateRegistration(registrationData, errors);
    }

    // Business rule validation
    this.#validateBusinessRules(registrationData, errors);

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static #validateGroupRegistration(registrationData: RegistrationInput, errors: string[]): void {
    if (!registrationData.classId) {
      errors.push('Class ID is required for group registrations');
    }
  }

  static #validatePrivateRegistration(registrationData: RegistrationInput, errors: string[]): void {
    if (!registrationData.instructorId) {
      errors.push('Instructor ID is required for private lessons');
    }
    if (!registrationData.instrument) {
      errors.push('Instrument is required for private lessons');
    }
    if (registrationData.day === undefined || registrationData.day === null) {
      errors.push('Day is required for private lessons');
    }
    if (!registrationData.startTime) {
      errors.push('Start time is required for private lessons');
    }
    if (registrationData.length == null) {
      errors.push('Lesson length is required for private lessons');
    }
  }

  static #validateBusinessRules(registrationData: RegistrationInput, errors: string[]): void {
    // School year validation
    if (registrationData.schoolYear && !this.isValidSchoolYear(registrationData.schoolYear)) {
      errors.push('Invalid school year format. Expected format: YYYY-YYYY');
    }

    // Trimester validation
    if (registrationData.trimester && !this.isValidTrimester(registrationData.trimester)) {
      errors.push('Invalid trimester. Must be fall, winter, or spring');
    }

    // Start time validation for private lessons
    if (
      registrationData.registrationType === RegistrationType.PRIVATE &&
      registrationData.startTime
    ) {
      if (!this.isValidStartTime(registrationData.startTime)) {
        errors.push('Invalid start time format');
      }
    }

    // Lesson length validation
    if (registrationData.length && !this.isValidLessonLength(registrationData.length)) {
      errors.push(
        `Invalid lesson length. Must be ${DEFAULT_REGISTRATION_CONFIG.lessonLengths.join(', ')} minutes`
      );
    }
  }

  static isValidSchoolYear(schoolYear: unknown): boolean {
    if (typeof schoolYear !== 'string') return false;
    const pattern = /^\d{4}-\d{4}$/;
    if (!pattern.test(schoolYear)) return false;

    const [startYear, endYear] = schoolYear.split('-').map(Number);
    return endYear === startYear + 1;
  }

  static isValidTrimester(trimester: unknown): boolean {
    return typeof trimester === 'string' ? validateTrimester(trimester) : false;
  }

  static isValidStartTime(startTime: unknown): boolean {
    if (typeof startTime !== 'string') return false;
    const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timePattern.test(startTime);
  }

  static isValidLessonLength(length: unknown): boolean {
    return DEFAULT_REGISTRATION_CONFIG.lessonLengths.includes(Number(length));
  }

  // =========================================================================
  // Conflict Detection (formerly RegistrationConflictService)
  // =========================================================================

  /**
   * Checks for registration conflicts
   */
  static async checkConflicts(
    newRegistration: ConflictRegistrationData,
    existingRegistrations: ConflictRegistrationData[],
    options: { skipCapacityCheck?: boolean; groupClass?: ConflictGroupClass | null } = {}
  ): Promise<ConflictResult> {
    const { skipCapacityCheck = false, groupClass = null } = options;
    const conflicts: Conflict[] = [];

    this.#staticLogger.debug('Conflict check start:', {
      studentId: newRegistration.studentId,
      instructorId: newRegistration.instructorId,
      day: newRegistration.day,
      startTime: newRegistration.startTime,
      length: newRegistration.length,
      registrationType: newRegistration.registrationType,
      classId: newRegistration.classId,
      existingCount: existingRegistrations.length,
      skipCapacityCheck,
      groupClassId: groupClass?.id || 'none',
    });

    // Check for duplicate registration
    const duplicateConflict = this.checkDuplicateRegistration(
      newRegistration,
      existingRegistrations
    );
    if (duplicateConflict) {
      // Exit early - duplicate is definitive, no need to check other conflicts
      this.#staticLogger.debug('Duplicate found - exiting early');
      conflicts.push(duplicateConflict);
      return {
        hasConflicts: true,
        conflicts,
      };
    }

    // Check for student schedule conflicts (both private and group)
    // Students cannot have overlapping lessons regardless of type
    this.#staticLogger.debug('Checking student schedule conflicts');
    const studentConflict = this.checkStudentScheduleConflict(
      newRegistration,
      existingRegistrations
    );
    if (studentConflict) conflicts.push(studentConflict);

    // Check for instructor schedule conflicts (private lessons only)
    // Group classes don't block instructor time in the same way
    if (newRegistration.registrationType === RegistrationType.PRIVATE) {
      this.#staticLogger.debug('Registration is PRIVATE - checking instructor schedule conflicts');
      const instructorConflict = this.checkInstructorScheduleConflict(
        newRegistration,
        existingRegistrations
      );
      if (instructorConflict) conflicts.push(instructorConflict);
    } else {
      this.#staticLogger.debug('Registration is GROUP - skipping instructor schedule conflicts');
    }

    // Check for capacity conflicts (group classes only)
    // Admins can bypass capacity restrictions
    if (newRegistration.registrationType === RegistrationType.GROUP && !skipCapacityCheck) {
      this.#staticLogger.debug('Registration is GROUP - checking capacity');
      const capacityConflict = this.checkClassCapacity(
        newRegistration,
        existingRegistrations,
        groupClass
      );
      if (capacityConflict) conflicts.push(capacityConflict);
    }

    if (conflicts.length > 0) {
      this.#staticLogger.info(
        `Registration conflicts found: ${conflicts.map(c => `${c.type}: ${c.message}`).join('; ')}`
      );
    } else {
      this.#staticLogger.debug('No registration conflicts found');
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
    };
  }

  /**
   * Checks for duplicate registration (same student, same configuration)
   */
  static checkDuplicateRegistration(
    newRegistration: ConflictRegistrationData,
    existingRegistrations: ConflictRegistrationData[]
  ): Conflict | null {
    const newStudentId = newRegistration.studentId;
    const newInstructorId = newRegistration.instructorId;

    this.#staticLogger.debug(
      `Checking duplicates: studentId=${newStudentId}, instructorId=${newInstructorId}, day=${newRegistration.day}, startTime=${newRegistration.startTime}, classId=${newRegistration.classId}`
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
          this.#staticLogger.debug(
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
          this.#staticLogger.debug(
            `  [${index}] PRIVATE check: studentId=${regStudentId} (match=${studentMatch}), instructorId=${regInstructorId} (match=${instructorMatch}), day=${reg.day} (match=${dayMatch}), startTime=${reg.startTime} (match=${timeMatch}) => duplicate=${isDuplicate}`
          );
        }

        return isDuplicate;
      }
    });

    if (existing) {
      this.#staticLogger.debug(`Duplicate found: existingId=${existing.id}`);
      return {
        type: 'duplicate',
        message: 'Student is already registered for this class/lesson',
        existingRegistrationId: existing.id,
      };
    }

    this.#staticLogger.debug('No duplicate found');
    return null;
  }

  /**
   * Checks if student has conflicting lesson at same time
   */
  static checkStudentScheduleConflict(
    newRegistration: ConflictRegistrationData,
    existingRegistrations: ConflictRegistrationData[]
  ): Conflict | null {
    const newStudentId = newRegistration.studentId;
    this.#staticLogger.debug(
      `Checking student schedule: studentId=${newStudentId}, day=${newRegistration.day}, startTime=${newRegistration.startTime}, length=${newRegistration.length}`
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
        this.#staticLogger.debug(
          `  [${index}] studentId=${regStudentId} (match=${studentMatch}), day=${reg.day} (match=${dayMatch}), time=${reg.startTime}-${reg.startTime}+${reg.length}min vs ${newRegistration.startTime}+${newRegistration.length}min => overlap=${overlap}`
        );
        return overlap;
      }

      return false;
    });

    if (conflict) {
      this.#staticLogger.debug(`Student schedule conflict found: conflictingId=${conflict.id}`);
      return {
        type: 'student_schedule',
        message: `Student has conflicting lesson on ${conflict.day} at ${DateHelpers.convertTo12HourFormat(conflict.startTime)}`,
        conflictingRegistrationId: conflict.id,
      };
    }

    this.#staticLogger.debug('No student schedule conflict found');
    return null;
  }

  /**
   * Checks if instructor has conflicting lesson at same time
   */
  static checkInstructorScheduleConflict(
    newRegistration: ConflictRegistrationData,
    existingRegistrations: ConflictRegistrationData[]
  ): Conflict | null {
    const newInstructorId = newRegistration.instructorId;
    this.#staticLogger.debug(
      `Checking instructor schedule: instructorId=${newInstructorId}, day=${newRegistration.day}, startTime=${newRegistration.startTime}, length=${newRegistration.length}`
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
        this.#staticLogger.debug(
          `  [${index}] instructorId=${regInstructorId} (match=${instructorMatch}), day=${reg.day} (match=${dayMatch}), time=${reg.startTime}+${reg.length}min vs ${newRegistration.startTime}+${newRegistration.length}min => overlap=${overlap}`
        );
        return overlap;
      }

      return false;
    });

    if (conflict) {
      this.#staticLogger.debug(`Instructor schedule conflict found: conflictingId=${conflict.id}`);
      return {
        type: 'instructor_schedule',
        message: `Instructor has conflicting lesson on ${conflict.day} at ${DateHelpers.convertTo12HourFormat(conflict.startTime)}`,
        conflictingRegistrationId: conflict.id,
      };
    }

    this.#staticLogger.debug('No instructor schedule conflict found');
    return null;
  }

  /**
   * Checks if class has reached capacity
   */
  static checkClassCapacity(
    newRegistration: ConflictRegistrationData,
    existingRegistrations: ConflictRegistrationData[],
    groupClass: ConflictGroupClass | null = null
  ): Conflict | null {
    this.#staticLogger.debug(
      `Checking class capacity: classId=${newRegistration.classId}, groupClass.size=${groupClass?.size}`
    );

    const maxCapacity = groupClass?.size;
    if (maxCapacity == null) {
      this.#staticLogger.debug('No size defined on class - unlimited capacity, skipping check');
      return null; // No size defined = unlimited capacity
    }

    const classRegistrations = existingRegistrations.filter(
      (reg: ConflictRegistrationData) => reg.classId === newRegistration.classId
    );

    this.#staticLogger.debug(
      `Current registrations for class: ${classRegistrations.length}, maxCapacity: ${maxCapacity}`
    );

    if (classRegistrations.length >= maxCapacity) {
      this.#staticLogger.debug(
        `CLASS CAPACITY CONFLICT: ${classRegistrations.length} >= ${maxCapacity}`
      );
      return {
        type: 'class_capacity',
        message: `Class has reached maximum capacity (${maxCapacity} students)`,
        currentCount: classRegistrations.length,
        maxCapacity,
      };
    }

    this.#staticLogger.debug('No capacity conflict found');
    return null;
  }

  /**
   * Checks if two time slots overlap
   */
  static timesOverlap(time1: string, duration1: number, time2: string, duration2: number): boolean {
    if (!time1 || !time2) return false;
    const start1 = this.timeToMinutes(time1);
    const end1 = start1 + duration1;
    const start2 = this.timeToMinutes(time2);
    const end2 = start2 + duration2;

    const overlaps = start1 < end2 && start2 < end1;
    this.#staticLogger.debug(
      `timesOverlap: ${time1}(${start1})+${duration1}min=[${start1}-${end1}] vs ${time2}(${start2})+${duration2}min=[${start2}-${end2}] => ${overlaps}`
    );

    return overlaps;
  }

  /**
   * Converts time string (HH:MM) to minutes since midnight
   */
  static timeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // =========================================================================
  // Private instance methods
  // =========================================================================

  /**
   * Validate program-specific business rules for a registration.
   */
  #validateProgramRules(groupClass: ClassData | null): { isValid: boolean; errors: string[] } {
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

  /**
   * Generate weekly lesson schedule from registration data
   */
  #generateLessonSchedule(
    registration: Registration,
    numberOfLessons: number = 12
  ): ScheduleLesson[] {
    const startDate = new Date(registration.expectedStartDate || new Date());
    const dayOfWeek = DAY_NAMES.indexOf(registration.day);

    if (dayOfWeek === -1) {
      throw new Error(`Invalid day: ${registration.day}`);
    }

    const currentDate = new Date(startDate);
    while (currentDate.getDay() !== (dayOfWeek + 1) % 7) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const lessons: ScheduleLesson[] = [];
    for (let i = 0; i < numberOfLessons; i++) {
      lessons.push({
        lessonNumber: i + 1,
        date: new Date(currentDate),
        startTime: registration.startTime,
        length: registration.length,
      });
      currentDate.setDate(currentDate.getDate() + 7);
    }

    return lessons;
  }
}
