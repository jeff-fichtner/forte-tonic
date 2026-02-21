/**
 * Unit tests for RegistrationValidationService
 */

import { RegistrationValidationService } from '../../../src/services/registrationValidationService.js';
import { RegistrationType } from '../../../src/utils/values/registrationType.js';

describe('RegistrationValidationService', () => {
  describe('isValidTrimester', () => {
    it('should accept fall', () => {
      expect(RegistrationValidationService.isValidTrimester('fall')).toBe(true);
    });

    it('should accept winter', () => {
      expect(RegistrationValidationService.isValidTrimester('winter')).toBe(true);
    });

    it('should accept spring', () => {
      expect(RegistrationValidationService.isValidTrimester('spring')).toBe(true);
    });

    it('should reject invalid trimester names', () => {
      expect(RegistrationValidationService.isValidTrimester('Summer')).toBe(false);
      expect(RegistrationValidationService.isValidTrimester('Autumn')).toBe(false);
      expect(RegistrationValidationService.isValidTrimester('Q1')).toBe(false);
    });

    it('should reject null and undefined', () => {
      expect(RegistrationValidationService.isValidTrimester(null)).toBe(false);
      expect(RegistrationValidationService.isValidTrimester(undefined)).toBe(false);
    });

    it('should be case-sensitive (lowercase only)', () => {
      expect(RegistrationValidationService.isValidTrimester('Fall')).toBe(false);
      expect(RegistrationValidationService.isValidTrimester('FALL')).toBe(false);
      expect(RegistrationValidationService.isValidTrimester('Winter')).toBe(false);
      expect(RegistrationValidationService.isValidTrimester('WINTER')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(RegistrationValidationService.isValidTrimester('')).toBe(false);
    });

    it('should reject numbers', () => {
      expect(RegistrationValidationService.isValidTrimester(1)).toBe(false);
      expect(RegistrationValidationService.isValidTrimester(0)).toBe(false);
    });
  });

  describe('isValidSchoolYear', () => {
    it('should accept valid school year format', () => {
      expect(RegistrationValidationService.isValidSchoolYear('2024-2025')).toBe(true);
      expect(RegistrationValidationService.isValidSchoolYear('2023-2024')).toBe(true);
    });

    it('should reject invalid year sequences', () => {
      expect(RegistrationValidationService.isValidSchoolYear('2024-2024')).toBe(false);
      expect(RegistrationValidationService.isValidSchoolYear('2024-2026')).toBe(false);
      expect(RegistrationValidationService.isValidSchoolYear('2025-2024')).toBe(false);
    });

    it('should reject invalid formats', () => {
      expect(RegistrationValidationService.isValidSchoolYear('2024/2025')).toBe(false);
      expect(RegistrationValidationService.isValidSchoolYear('24-25')).toBe(false);
      expect(RegistrationValidationService.isValidSchoolYear('2024')).toBe(false);
    });

    it('should reject null and undefined', () => {
      expect(RegistrationValidationService.isValidSchoolYear(null)).toBe(false);
      expect(RegistrationValidationService.isValidSchoolYear(undefined)).toBe(false);
    });
  });

  describe('isValidStartTime', () => {
    it('should accept valid time formats', () => {
      expect(RegistrationValidationService.isValidStartTime('09:00')).toBe(true);
      expect(RegistrationValidationService.isValidStartTime('14:30')).toBe(true);
      expect(RegistrationValidationService.isValidStartTime('23:59')).toBe(true);
      expect(RegistrationValidationService.isValidStartTime('00:00')).toBe(true);
    });

    it('should accept single-digit hours', () => {
      expect(RegistrationValidationService.isValidStartTime('9:00')).toBe(true);
      expect(RegistrationValidationService.isValidStartTime('1:30')).toBe(true);
    });

    it('should reject invalid hours', () => {
      expect(RegistrationValidationService.isValidStartTime('24:00')).toBe(false);
      expect(RegistrationValidationService.isValidStartTime('25:30')).toBe(false);
    });

    it('should reject invalid minutes', () => {
      expect(RegistrationValidationService.isValidStartTime('09:60')).toBe(false);
      expect(RegistrationValidationService.isValidStartTime('14:99')).toBe(false);
    });

    it('should reject invalid formats', () => {
      expect(RegistrationValidationService.isValidStartTime('9am')).toBe(false);
      expect(RegistrationValidationService.isValidStartTime('09:00:00')).toBe(false);
      expect(RegistrationValidationService.isValidStartTime('9.00')).toBe(false);
      expect(RegistrationValidationService.isValidStartTime('900')).toBe(false);
    });

    it('should reject null and undefined', () => {
      expect(RegistrationValidationService.isValidStartTime(null)).toBe(false);
      expect(RegistrationValidationService.isValidStartTime(undefined)).toBe(false);
    });
  });

  describe('isValidLessonLength', () => {
    it('should accept valid lesson lengths', () => {
      expect(RegistrationValidationService.isValidLessonLength(15)).toBe(true);
      expect(RegistrationValidationService.isValidLessonLength(30)).toBe(true);
      expect(RegistrationValidationService.isValidLessonLength(45)).toBe(true);
      expect(RegistrationValidationService.isValidLessonLength(60)).toBe(true);
    });

    it('should accept string numbers', () => {
      expect(RegistrationValidationService.isValidLessonLength('15')).toBe(true);
      expect(RegistrationValidationService.isValidLessonLength('30')).toBe(true);
      expect(RegistrationValidationService.isValidLessonLength('45')).toBe(true);
      expect(RegistrationValidationService.isValidLessonLength('60')).toBe(true);
    });

    it('should reject invalid lengths', () => {
      expect(RegistrationValidationService.isValidLessonLength(10)).toBe(false);
      expect(RegistrationValidationService.isValidLessonLength(20)).toBe(false);
      expect(RegistrationValidationService.isValidLessonLength(90)).toBe(false);
      expect(RegistrationValidationService.isValidLessonLength(0)).toBe(false);
    });

    it('should reject null and undefined', () => {
      expect(RegistrationValidationService.isValidLessonLength(null)).toBe(false);
      expect(RegistrationValidationService.isValidLessonLength(undefined)).toBe(false);
    });
  });

  describe('isValidRegistrationId', () => {
    describe('for GROUP registrations', () => {
      it('should accept valid group format', () => {
        expect(
          RegistrationValidationService.isValidRegistrationId(
            'STUDENT1_CLASS1',
            RegistrationType.GROUP
          )
        ).toBe(true);
      });

      it('should reject invalid formats', () => {
        expect(
          RegistrationValidationService.isValidRegistrationId('STUDENT1', RegistrationType.GROUP)
        ).toBe(false);
        expect(
          RegistrationValidationService.isValidRegistrationId('', RegistrationType.GROUP)
        ).toBe(false);
      });
    });

    describe('for PRIVATE registrations', () => {
      it('should accept valid private format', () => {
        expect(
          RegistrationValidationService.isValidRegistrationId(
            'STUDENT1_TEACHER1_Monday_09:00',
            RegistrationType.PRIVATE
          )
        ).toBe(true);
      });

      it('should reject invalid formats', () => {
        expect(
          RegistrationValidationService.isValidRegistrationId(
            'STUDENT1_TEACHER1',
            RegistrationType.PRIVATE
          )
        ).toBe(false);
        expect(
          RegistrationValidationService.isValidRegistrationId(
            'STUDENT1_TEACHER1_Monday',
            RegistrationType.PRIVATE
          )
        ).toBe(false);
      });
    });

    it('should reject null and undefined', () => {
      expect(
        RegistrationValidationService.isValidRegistrationId(null, RegistrationType.GROUP)
      ).toBe(false);
      expect(
        RegistrationValidationService.isValidRegistrationId(undefined, RegistrationType.PRIVATE)
      ).toBe(false);
    });
  });

  describe('validateGroupRegistration', () => {
    it('should not add errors for valid group registration', () => {
      const errors = [];
      RegistrationValidationService.validateGroupRegistration(
        {
          classId: 'CLASS1',
        },
        errors
      );
      expect(errors).toHaveLength(0);
    });

    it('should add error when classId is missing', () => {
      const errors = [];
      RegistrationValidationService.validateGroupRegistration({}, errors);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBe('Class ID is required for group registrations');
    });
  });

  describe('validatePrivateRegistration', () => {
    it('should not add errors for valid private registration', () => {
      const errors = [];
      RegistrationValidationService.validatePrivateRegistration(
        {
          instructorId: 'TEACHER1',
          instrument: 'Piano',
          day: 'Monday',
          startTime: '09:00',
          length: 30,
          transportationType: 'pickup',
        },
        errors
      );
      expect(errors).toHaveLength(0);
    });

    it('should add error when instructorId is missing', () => {
      const errors = [];
      RegistrationValidationService.validatePrivateRegistration(
        {
          instrument: 'Piano',
          day: 'Monday',
          startTime: '09:00',
          length: 30,
          transportationType: 'pickup',
        },
        errors
      );
      expect(errors).toContain('Instructor ID is required for private lessons');
    });

    it('should add error when instrument is missing', () => {
      const errors = [];
      RegistrationValidationService.validatePrivateRegistration(
        {
          instructorId: 'TEACHER1',
          day: 'Monday',
          startTime: '09:00',
          length: 30,
          transportationType: 'pickup',
        },
        errors
      );
      expect(errors).toContain('Instrument is required for private lessons');
    });

    it('should add error when day is missing', () => {
      const errors = [];
      RegistrationValidationService.validatePrivateRegistration(
        {
          instructorId: 'TEACHER1',
          instrument: 'Piano',
          startTime: '09:00',
          length: 30,
          transportationType: 'pickup',
        },
        errors
      );
      expect(errors).toContain('Day is required for private lessons');
    });

    it('should add error when startTime is missing', () => {
      const errors = [];
      RegistrationValidationService.validatePrivateRegistration(
        {
          instructorId: 'TEACHER1',
          instrument: 'Piano',
          day: 'Monday',
          length: 30,
          transportationType: 'pickup',
        },
        errors
      );
      expect(errors).toContain('Start time is required for private lessons');
    });

    it('should add error when length is missing', () => {
      const errors = [];
      RegistrationValidationService.validatePrivateRegistration(
        {
          instructorId: 'TEACHER1',
          instrument: 'Piano',
          day: 'Monday',
          startTime: '09:00',
          transportationType: 'pickup',
        },
        errors
      );
      expect(errors).toContain('Lesson length is required for private lessons');
    });

    it('should add error when transportationType is missing', () => {
      const errors = [];
      RegistrationValidationService.validatePrivateRegistration(
        {
          instructorId: 'TEACHER1',
          instrument: 'Piano',
          day: 'Monday',
          startTime: '09:00',
          length: 30,
        },
        errors
      );
      expect(errors).toContain('Transportation type is required for private lessons');
    });

    it('should add multiple errors when multiple fields are missing', () => {
      const errors = [];
      RegistrationValidationService.validatePrivateRegistration({}, errors);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('Instructor ID is required for private lessons');
      expect(errors).toContain('Instrument is required for private lessons');
    });
  });

  describe('validateBusinessRules', () => {
    it('should not add errors for valid business rules', () => {
      const errors = [];
      RegistrationValidationService.validateBusinessRules(
        {
          schoolYear: '2024-2025',
          trimester: 'fall',
          registrationType: RegistrationType.PRIVATE,
          startTime: '09:00',
          length: 30,
        },
        errors
      );
      expect(errors).toHaveLength(0);
    });

    it('should add error for invalid school year', () => {
      const errors = [];
      RegistrationValidationService.validateBusinessRules(
        {
          schoolYear: '2024-2026',
        },
        errors
      );
      expect(errors).toContain('Invalid school year format. Expected format: YYYY-YYYY');
    });

    it('should add error for invalid trimester', () => {
      const errors = [];
      RegistrationValidationService.validateBusinessRules(
        {
          trimester: 'Summer',
        },
        errors
      );
      expect(errors).toContain('Invalid trimester. Must be fall, winter, or spring');
    });

    it('should add error for invalid start time format', () => {
      const errors = [];
      RegistrationValidationService.validateBusinessRules(
        {
          registrationType: RegistrationType.PRIVATE,
          startTime: '9am',
        },
        errors
      );
      expect(errors).toContain('Invalid start time format');
    });

    it('should add error for invalid lesson length', () => {
      const errors = [];
      RegistrationValidationService.validateBusinessRules(
        {
          length: 20,
        },
        errors
      );
      expect(errors).toContain('Invalid lesson length. Must be 15, 30, 45, or 60 minutes');
    });

    it('should not validate start time for group registrations', () => {
      const errors = [];
      RegistrationValidationService.validateBusinessRules(
        {
          registrationType: RegistrationType.GROUP,
          startTime: 'invalid',
        },
        errors
      );
      expect(errors).toHaveLength(0);
    });
  });

  describe('validateRegistrationData', () => {
    it('should return valid for complete private registration', () => {
      const result = RegistrationValidationService.validateRegistrationData({
        studentId: 'STUDENT1',
        registrationType: RegistrationType.PRIVATE,
        instructorId: 'TEACHER1',
        instrument: 'Piano',
        day: 'Monday',
        startTime: '09:00',
        length: 30,
        transportationType: 'pickup',
        schoolYear: '2024-2025',
        trimester: 'fall',
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid for complete group registration', () => {
      const result = RegistrationValidationService.validateRegistrationData({
        studentId: 'STUDENT1',
        registrationType: RegistrationType.GROUP,
        classId: 'CLASS1',
        schoolYear: '2024-2025',
        trimester: 'winter',
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid when studentId is missing', () => {
      const result = RegistrationValidationService.validateRegistrationData({
        registrationType: RegistrationType.PRIVATE,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Student ID is required');
    });

    it('should return invalid when registrationType is missing', () => {
      const result = RegistrationValidationService.validateRegistrationData({
        studentId: 'STUDENT1',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Registration type is required');
    });

    it('should return invalid for incomplete private registration', () => {
      const result = RegistrationValidationService.validateRegistrationData({
        studentId: 'STUDENT1',
        registrationType: RegistrationType.PRIVATE,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Instructor ID is required for private lessons');
    });

    it('should return invalid for incomplete group registration', () => {
      const result = RegistrationValidationService.validateRegistrationData({
        studentId: 'STUDENT1',
        registrationType: RegistrationType.GROUP,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Class ID is required for group registrations');
    });

    it('should validate trimester using centralized enum', () => {
      const result = RegistrationValidationService.validateRegistrationData({
        studentId: 'STUDENT1',
        registrationType: RegistrationType.GROUP,
        classId: 'CLASS1',
        trimester: 'InvalidTrimester',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid trimester. Must be fall, winter, or spring');
    });

    it('should accept valid trimesters from centralized enum', () => {
      const fallResult = RegistrationValidationService.validateRegistrationData({
        studentId: 'STUDENT1',
        registrationType: RegistrationType.GROUP,
        classId: 'CLASS1',
        trimester: 'fall',
      });
      expect(fallResult.isValid).toBe(true);

      const winterResult = RegistrationValidationService.validateRegistrationData({
        studentId: 'STUDENT1',
        registrationType: RegistrationType.GROUP,
        classId: 'CLASS1',
        trimester: 'winter',
      });
      expect(winterResult.isValid).toBe(true);

      const springResult = RegistrationValidationService.validateRegistrationData({
        studentId: 'STUDENT1',
        registrationType: RegistrationType.GROUP,
        classId: 'CLASS1',
        trimester: 'spring',
      });
      expect(springResult.isValid).toBe(true);
    });

    it('should accumulate multiple validation errors', () => {
      const result = RegistrationValidationService.validateRegistrationData({
        registrationType: RegistrationType.PRIVATE,
        schoolYear: 'invalid',
        trimester: 'Summer',
        startTime: '25:00',
        length: 20,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });
  });
});
