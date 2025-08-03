/**
 * Registration Validation Service - Domain layer business rule validation
 * Contains all business logic for registration validation and rule enforcement
 */

import { RegistrationType } from '../../core/values/registrationType.js';

export class RegistrationValidationService {
  /**
   * Validates registration data according to business rules
   * @param {object} registrationData - The registration data to validate
   * @returns {object} Validation result with isValid boolean and errors array
   */
  static validateRegistrationData(registrationData) {
    const errors = [];

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
   * @param {object} registrationData - Registration data
   * @param {Array} errors - Errors array to populate
   */
  static validateGroupRegistration(registrationData, errors) {
    if (!registrationData.classId) {
      errors.push('Class ID is required for group registrations');
    }
  }

  /**
   * Validates private registration specific requirements
   * @param {object} registrationData - Registration data
   * @param {Array} errors - Errors array to populate
   */
  static validatePrivateRegistration(registrationData, errors) {
    if (!registrationData.instructorId) {
      errors.push('Instructor ID is required for private lessons');
    }
    if (!registrationData.instrument) {
      errors.push('Instrument is required for private lessons');
    }
    if (!registrationData.day) {
      errors.push('Day is required for private lessons');
    }
    if (!registrationData.startTime) {
      errors.push('Start time is required for private lessons');
    }
    if (!registrationData.length) {
      errors.push('Lesson length is required for private lessons');
    }
    if (!registrationData.transportationType) {
      errors.push('Transportation type is required for private lessons');
    }
  }

  /**
   * Validates business rules and constraints
   * @param {object} registrationData - Registration data
   * @param {Array} errors - Errors array to populate
   */
  static validateBusinessRules(registrationData, errors) {
    // School year validation
    if (registrationData.schoolYear && !this.isValidSchoolYear(registrationData.schoolYear)) {
      errors.push('Invalid school year format. Expected format: YYYY-YYYY');
    }

    // Trimester validation
    if (registrationData.trimester && !this.isValidTrimester(registrationData.trimester)) {
      errors.push('Invalid trimester. Must be Fall, Winter, or Spring');
    }

    // Start time validation for private lessons
    if (registrationData.registrationType === RegistrationType.PRIVATE && registrationData.startTime) {
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
   * @param {string} schoolYear - School year to validate
   * @returns {boolean} True if valid
   */
  static isValidSchoolYear(schoolYear) {
    const pattern = /^\d{4}-\d{4}$/;
    if (!pattern.test(schoolYear)) return false;

    const [startYear, endYear] = schoolYear.split('-').map(Number);
    return endYear === startYear + 1;
  }

  /**
   * Validates trimester values
   * @param {string} trimester - Trimester to validate
   * @returns {boolean} True if valid
   */
  static isValidTrimester(trimester) {
    const validTrimesters = ['Fall', 'Winter', 'Spring'];
    return validTrimesters.includes(trimester);
  }

  /**
   * Validates start time format (HH:MM format)
   * @param {string} startTime - Start time to validate
   * @returns {boolean} True if valid
   */
  static isValidStartTime(startTime) {
    const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timePattern.test(startTime);
  }

  /**
   * Validates lesson length (15, 30, 45, or 60 minutes)
   * @param {number} length - Lesson length in minutes
   * @returns {boolean} True if valid
   */
  static isValidLessonLength(length) {
    const validLengths = [15, 30, 45, 60];
    return validLengths.includes(Number(length));
  }

  /**
   * Validates registration ID format
   * @param {string} registrationId - Registration ID to validate
   * @param {string} registrationType - Registration type
   * @returns {boolean} True if valid format
   */
  static isValidRegistrationId(registrationId, registrationType) {
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
