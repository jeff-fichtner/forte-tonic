/**
 * Registration Validation Service - Domain layer business rule validation
 * Contains all business logic for registration validation and rule enforcement
 */

import { RegistrationType } from '../utils/values/registrationType.js';
import { isValidTrimester as validateTrimester } from '../utils/values/trimester.js';
import type { RegistrationData } from '../models/shared/registration.js';

/**
 * Extended registration data that may contain optional context fields
 * not part of the core RegistrationData model (e.g., schoolYear, trimester)
 */
type RegistrationInput = RegistrationData & Record<string, unknown>;

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class RegistrationValidationService {
  /**
   * Validates registration data according to business rules
   * @param registrationData - The registration data to validate
   * @returns Validation result with isValid boolean and errors array
   */
  static validateRegistrationData(registrationData: RegistrationInput): ValidationResult {
    const errors: string[] = [];

    // Core validation
    if (!registrationData.studentId) errors.push('Student ID is required');
    if (!registrationData.registrationType) errors.push('Registration type is required');

    // Type-specific validation
    if (registrationData.registrationType === RegistrationType.GROUP) {
      this.validateGroupRegistration(registrationData, errors);
    } else if (registrationData.registrationType === RegistrationType.PRIVATE) {
      this.validatePrivateRegistration(registrationData, errors);
    }

    // Business rule validation
    this.validateBusinessRules(registrationData, errors);

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates group registration specific requirements
   * @param registrationData - Registration data
   * @param errors - Errors array to populate
   */
  static validateGroupRegistration(registrationData: RegistrationInput, errors: string[]): void {
    if (!registrationData.classId) {
      errors.push('Class ID is required for group registrations');
    }
    // Note: Other fields like instructorId, day, startTime, length, instrument
    // will be populated automatically from the class data, so we don't validate them here
  }

  /**
   * Validates private registration specific requirements
   * @param registrationData - Registration data
   * @param errors - Errors array to populate
   */
  static validatePrivateRegistration(registrationData: RegistrationInput, errors: string[]): void {
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
    if (!registrationData.transportationType) {
      errors.push('Transportation type is required for private lessons');
    }
  }

  /**
   * Validates business rules and constraints
   * @param registrationData - Registration data
   * @param errors - Errors array to populate
   */
  static validateBusinessRules(registrationData: RegistrationInput, errors: string[]): void {
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
      errors.push('Invalid lesson length. Must be 15, 30, 45, or 60 minutes');
    }
  }

  /**
   * Validates school year format (YYYY-YYYY)
   * @param schoolYear - School year to validate
   * @returns True if valid
   */
  static isValidSchoolYear(schoolYear: unknown): boolean {
    if (typeof schoolYear !== 'string') return false;
    const pattern = /^\d{4}-\d{4}$/;
    if (!pattern.test(schoolYear)) return false;

    const [startYear, endYear] = schoolYear.split('-').map(Number);
    return endYear === startYear + 1;
  }

  /**
   * Validates trimester values
   * @param trimester - Trimester to validate
   * @returns True if valid
   */
  static isValidTrimester(trimester: unknown): boolean {
    return typeof trimester === 'string' ? validateTrimester(trimester) : false;
  }

  /**
   * Validates start time format (HH:MM format)
   * @param startTime - Start time to validate
   * @returns True if valid
   */
  static isValidStartTime(startTime: unknown): boolean {
    if (typeof startTime !== 'string') return false;
    const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timePattern.test(startTime);
  }

  /**
   * Validates lesson length (15, 30, 45, or 60 minutes)
   * @param length - Lesson length in minutes
   * @returns True if valid
   */
  static isValidLessonLength(length: unknown): boolean {
    const validLengths = [15, 30, 45, 60];
    return validLengths.includes(Number(length));
  }

  /**
   * Validates registration ID format
   * @param registrationId - Registration ID to validate
   * @param registrationType - Registration type
   * @returns True if valid format
   */
  static isValidRegistrationId(registrationId: unknown, registrationType: unknown): boolean {
    if (typeof registrationId !== 'string') return false;
    if (!registrationId) return false;

    if (registrationType === RegistrationType.GROUP) {
      // Group format: studentId_classId
      return /^.+_.+$/.test(registrationId);
    } else {
      // Private format: studentId_instructorId_day_startTime
      return /^.+_.+_.+_.+$/.test(registrationId);
    }
  }
}
