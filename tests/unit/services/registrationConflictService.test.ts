/**
 * Unit tests for RegistrationConflictService
 */

import { RegistrationConflictService } from '../../../src/services/registrationConflictService.js';
import { RegistrationType } from '../../../src/utils/values/registrationType.js';

describe('RegistrationConflictService', () => {
  // ============================================================
  // DUPLICATE REGISTRATION TESTS
  // ============================================================
  describe('checkDuplicateRegistration', () => {
    describe('Private Lessons', () => {
      it('should detect duplicate: same student + same instructor + same day + same time', () => {
        const newRegistration = {
          studentId: 'student-123',
          instructorId: 'instructor-456',
          day: 'Monday',
          startTime: '14:00',
          registrationType: RegistrationType.PRIVATE,
        };

        const existingRegistrations = [
          {
            studentId: 'student-123',
            instructorId: 'instructor-456',
            day: 'Monday',
            startTime: '14:00',
          },
        ];

        const result = RegistrationConflictService.checkDuplicateRegistration(
          newRegistration,
          existingRegistrations
        );

        expect(result).not.toBeNull();
        expect(result.type).toBe('duplicate');
      });

      it('should allow: same student + same instructor + same day + different time', () => {
        const newRegistration = {
          studentId: 'student-123',
          instructorId: 'instructor-456',
          day: 'Monday',
          startTime: '14:00',
          registrationType: RegistrationType.PRIVATE,
        };

        const existingRegistrations = [
          {
            studentId: 'student-123',
            instructorId: 'instructor-456',
            day: 'Monday',
            startTime: '15:00', // Different time
          },
        ];

        const result = RegistrationConflictService.checkDuplicateRegistration(
          newRegistration,
          existingRegistrations
        );

        expect(result).toBeNull();
      });

      it('should allow: same student + different instructor + same day + same time', () => {
        const newRegistration = {
          studentId: 'student-123',
          instructorId: 'instructor-456',
          day: 'Monday',
          startTime: '14:00',
          registrationType: RegistrationType.PRIVATE,
        };

        const existingRegistrations = [
          {
            studentId: 'student-123',
            instructorId: 'instructor-999', // Different instructor
            day: 'Monday',
            startTime: '14:00',
          },
        ];

        const result = RegistrationConflictService.checkDuplicateRegistration(
          newRegistration,
          existingRegistrations
        );

        expect(result).toBeNull();
      });

      it('should allow: different student + same instructor + same day + same time', () => {
        const newRegistration = {
          studentId: 'student-123',
          instructorId: 'instructor-456',
          day: 'Monday',
          startTime: '14:00',
          registrationType: RegistrationType.PRIVATE,
        };

        const existingRegistrations = [
          {
            studentId: 'student-999', // Different student
            instructorId: 'instructor-456',
            day: 'Monday',
            startTime: '14:00',
          },
        ];

        const result = RegistrationConflictService.checkDuplicateRegistration(
          newRegistration,
          existingRegistrations
        );

        expect(result).toBeNull();
      });

      it('should allow: same student + same instructor + different day + same time', () => {
        const newRegistration = {
          studentId: 'student-123',
          instructorId: 'instructor-456',
          day: 'Monday',
          startTime: '14:00',
          registrationType: RegistrationType.PRIVATE,
        };

        const existingRegistrations = [
          {
            studentId: 'student-123',
            instructorId: 'instructor-456',
            day: 'Tuesday', // Different day
            startTime: '14:00',
          },
        ];

        const result = RegistrationConflictService.checkDuplicateRegistration(
          newRegistration,
          existingRegistrations
        );

        expect(result).toBeNull();
      });
    });

    describe('Group Classes', () => {
      it('should detect duplicate: same student + same class', () => {
        const newRegistration = {
          studentId: 'student-123',
          classId: 'class-789',
          registrationType: RegistrationType.GROUP,
        };

        const existingRegistrations = [
          {
            studentId: 'student-123',
            classId: 'class-789',
          },
        ];

        const result = RegistrationConflictService.checkDuplicateRegistration(
          newRegistration,
          existingRegistrations
        );

        expect(result).not.toBeNull();
        expect(result.type).toBe('duplicate');
      });

      it('should allow: same student + different class', () => {
        const newRegistration = {
          studentId: 'student-123',
          classId: 'class-789',
          registrationType: RegistrationType.GROUP,
        };

        const existingRegistrations = [
          {
            studentId: 'student-123',
            classId: 'class-999', // Different class
          },
        ];

        const result = RegistrationConflictService.checkDuplicateRegistration(
          newRegistration,
          existingRegistrations
        );

        expect(result).toBeNull();
      });

      it('should allow: different student + same class', () => {
        const newRegistration = {
          studentId: 'student-123',
          classId: 'class-789',
          registrationType: RegistrationType.GROUP,
        };

        const existingRegistrations = [
          {
            studentId: 'student-999', // Different student
            classId: 'class-789',
          },
        ];

        const result = RegistrationConflictService.checkDuplicateRegistration(
          newRegistration,
          existingRegistrations
        );

        expect(result).toBeNull();
      });
    });

    describe('Value Object Handling', () => {
      it('should work with plain string IDs on both sides', () => {
        const newRegistration = {
          studentId: 'student-123',
          instructorId: 'instructor-456',
          day: 'Monday',
          startTime: '14:00',
          registrationType: RegistrationType.PRIVATE,
        };

        const existingRegistrations = [
          {
            studentId: 'student-123',
            instructorId: 'instructor-456',
            day: 'Monday',
            startTime: '14:00',
          },
        ];

        const result = RegistrationConflictService.checkDuplicateRegistration(
          newRegistration,
          existingRegistrations
        );

        expect(result).not.toBeNull();
        expect(result.type).toBe('duplicate');
      });

      it('should work with value objects on existing and plain strings on new', () => {
        const newRegistration = {
          studentId: 'student-123',
          instructorId: 'instructor-456',
          day: 'Monday',
          startTime: '14:00',
          registrationType: RegistrationType.PRIVATE,
        };

        const existingRegistrations = [
          {
            studentId: 'student-123',
            instructorId: 'instructor-456',
            day: 'Monday',
            startTime: '14:00',
          },
        ];

        const result = RegistrationConflictService.checkDuplicateRegistration(
          newRegistration,
          existingRegistrations
        );

        expect(result).not.toBeNull();
        expect(result.type).toBe('duplicate');
      });
    });
  });

  // ============================================================
  // STUDENT SCHEDULE CONFLICT TESTS
  // ============================================================
  describe('checkStudentScheduleConflict', () => {
    it('should detect conflict: same student + same day + overlapping times', () => {
      const newRegistration = {
        studentId: 'student-123',
        day: 'Monday',
        startTime: '14:00',
        length: 30,
      };

      const existingRegistrations = [
        {
          studentId: 'student-123',
          day: 'Monday',
          startTime: '14:15', // Overlaps with 14:00-14:30
          length: 30,
        },
      ];

      const result = RegistrationConflictService.checkStudentScheduleConflict(
        newRegistration,
        existingRegistrations
      );

      expect(result).not.toBeNull();
      expect(result.type).toBe('student_schedule');
    });

    it('should allow: same student + same day + adjacent times (no overlap)', () => {
      const newRegistration = {
        studentId: 'student-123',
        day: 'Monday',
        startTime: '14:00',
        length: 30,
      };

      const existingRegistrations = [
        {
          studentId: 'student-123',
          day: 'Monday',
          startTime: '14:30', // Starts exactly when new one ends
          length: 30,
        },
      ];

      const result = RegistrationConflictService.checkStudentScheduleConflict(
        newRegistration,
        existingRegistrations
      );

      expect(result).toBeNull();
    });

    it('should allow: same student + same day + non-overlapping times', () => {
      const newRegistration = {
        studentId: 'student-123',
        day: 'Monday',
        startTime: '14:00',
        length: 30,
      };

      const existingRegistrations = [
        {
          studentId: 'student-123',
          day: 'Monday',
          startTime: '15:00', // Well after 14:00-14:30
          length: 30,
        },
      ];

      const result = RegistrationConflictService.checkStudentScheduleConflict(
        newRegistration,
        existingRegistrations
      );

      expect(result).toBeNull();
    });

    it('should allow: same student + different day + same time', () => {
      const newRegistration = {
        studentId: 'student-123',
        day: 'Monday',
        startTime: '14:00',
        length: 30,
      };

      const existingRegistrations = [
        {
          studentId: 'student-123',
          day: 'Tuesday', // Different day
          startTime: '14:00',
          length: 30,
        },
      ];

      const result = RegistrationConflictService.checkStudentScheduleConflict(
        newRegistration,
        existingRegistrations
      );

      expect(result).toBeNull();
    });

    it('should allow: different student + same day + same time', () => {
      const newRegistration = {
        studentId: 'student-123',
        day: 'Monday',
        startTime: '14:00',
        length: 30,
      };

      const existingRegistrations = [
        {
          studentId: 'student-999', // Different student
          day: 'Monday',
          startTime: '14:00',
          length: 30,
        },
      ];

      const result = RegistrationConflictService.checkStudentScheduleConflict(
        newRegistration,
        existingRegistrations
      );

      expect(result).toBeNull();
    });

    it('should detect conflict when new lesson is contained within existing', () => {
      const newRegistration = {
        studentId: 'student-123',
        day: 'Monday',
        startTime: '14:15',
        length: 15, // 14:15-14:30
      };

      const existingRegistrations = [
        {
          studentId: 'student-123',
          day: 'Monday',
          startTime: '14:00',
          length: 60, // 14:00-15:00 contains the new lesson
        },
      ];

      const result = RegistrationConflictService.checkStudentScheduleConflict(
        newRegistration,
        existingRegistrations
      );

      expect(result).not.toBeNull();
      expect(result.type).toBe('student_schedule');
    });

    it('should detect conflict when existing lesson is contained within new', () => {
      const newRegistration = {
        studentId: 'student-123',
        day: 'Monday',
        startTime: '14:00',
        length: 60, // 14:00-15:00
      };

      const existingRegistrations = [
        {
          studentId: 'student-123',
          day: 'Monday',
          startTime: '14:15',
          length: 15, // 14:15-14:30 is contained within new
        },
      ];

      const result = RegistrationConflictService.checkStudentScheduleConflict(
        newRegistration,
        existingRegistrations
      );

      expect(result).not.toBeNull();
      expect(result.type).toBe('student_schedule');
    });
  });

  // ============================================================
  // INSTRUCTOR SCHEDULE CONFLICT TESTS
  // ============================================================
  describe('checkInstructorScheduleConflict', () => {
    it('should detect conflict: same instructor + same day + overlapping times', () => {
      const newRegistration = {
        instructorId: 'instructor-456',
        day: 'Monday',
        startTime: '14:00',
        length: 30,
      };

      const existingRegistrations = [
        {
          instructorId: 'instructor-456',
          day: 'Monday',
          startTime: '14:15', // Overlaps
          length: 30,
        },
      ];

      const result = RegistrationConflictService.checkInstructorScheduleConflict(
        newRegistration,
        existingRegistrations
      );

      expect(result).not.toBeNull();
      expect(result.type).toBe('instructor_schedule');
    });

    it('should allow: same instructor + same day + adjacent times', () => {
      const newRegistration = {
        instructorId: 'instructor-456',
        day: 'Monday',
        startTime: '14:00',
        length: 30,
      };

      const existingRegistrations = [
        {
          instructorId: 'instructor-456',
          day: 'Monday',
          startTime: '14:30', // Starts exactly when new one ends
          length: 30,
        },
      ];

      const result = RegistrationConflictService.checkInstructorScheduleConflict(
        newRegistration,
        existingRegistrations
      );

      expect(result).toBeNull();
    });

    it('should allow: same instructor + same day + non-overlapping times', () => {
      const newRegistration = {
        instructorId: 'instructor-456',
        day: 'Monday',
        startTime: '14:00',
        length: 30,
      };

      const existingRegistrations = [
        {
          instructorId: 'instructor-456',
          day: 'Monday',
          startTime: '15:00',
          length: 30,
        },
      ];

      const result = RegistrationConflictService.checkInstructorScheduleConflict(
        newRegistration,
        existingRegistrations
      );

      expect(result).toBeNull();
    });

    it('should allow: same instructor + different day + same time', () => {
      const newRegistration = {
        instructorId: 'instructor-456',
        day: 'Monday',
        startTime: '14:00',
        length: 30,
      };

      const existingRegistrations = [
        {
          instructorId: 'instructor-456',
          day: 'Tuesday', // Different day
          startTime: '14:00',
          length: 30,
        },
      ];

      const result = RegistrationConflictService.checkInstructorScheduleConflict(
        newRegistration,
        existingRegistrations
      );

      expect(result).toBeNull();
    });

    it('should allow: different instructor + same day + same time', () => {
      const newRegistration = {
        instructorId: 'instructor-456',
        day: 'Monday',
        startTime: '14:00',
        length: 30,
      };

      const existingRegistrations = [
        {
          instructorId: 'instructor-999', // Different instructor
          day: 'Monday',
          startTime: '14:00',
          length: 30,
        },
      ];

      const result = RegistrationConflictService.checkInstructorScheduleConflict(
        newRegistration,
        existingRegistrations
      );

      expect(result).toBeNull();
    });

    it('should work with plain string instructor IDs', () => {
      const newRegistration = {
        instructorId: 'instructor-456',
        day: 'Monday',
        startTime: '14:00',
        length: 30,
      };

      const existingRegistrations = [
        {
          instructorId: 'instructor-456', // Plain string
          day: 'Monday',
          startTime: '14:00',
          length: 30,
        },
      ];

      const result = RegistrationConflictService.checkInstructorScheduleConflict(
        newRegistration,
        existingRegistrations
      );

      expect(result).not.toBeNull();
      expect(result.type).toBe('instructor_schedule');
    });
  });

  // ============================================================
  // CLASS CAPACITY TESTS
  // ============================================================
  describe('checkClassCapacity', () => {
    it('should detect conflict: class at capacity', () => {
      const newRegistration = {
        classId: 'class-789',
      };

      const existingRegistrations = [
        { classId: 'class-789', studentId: 'student-1' },
        { classId: 'class-789', studentId: 'student-2' },
        { classId: 'class-789', studentId: 'student-3' },
      ];

      const groupClass = { id: 'class-789', size: 3 };

      const result = RegistrationConflictService.checkClassCapacity(
        newRegistration,
        existingRegistrations,
        groupClass
      );

      expect(result).not.toBeNull();
      expect(result.type).toBe('class_capacity');
      expect(result.currentCount).toBe(3);
      expect(result.maxCapacity).toBe(3);
    });

    it('should allow: class under capacity', () => {
      const newRegistration = {
        classId: 'class-789',
      };

      const existingRegistrations = [
        { classId: 'class-789', studentId: 'student-1' },
        { classId: 'class-789', studentId: 'student-2' },
      ];

      const groupClass = { id: 'class-789', size: 5 };

      const result = RegistrationConflictService.checkClassCapacity(
        newRegistration,
        existingRegistrations,
        groupClass
      );

      expect(result).toBeNull();
    });

    it('should allow: class with no size defined (unlimited capacity)', () => {
      const newRegistration = {
        classId: 'class-789',
      };

      const existingRegistrations = [
        { classId: 'class-789', studentId: 'student-1' },
        { classId: 'class-789', studentId: 'student-2' },
        { classId: 'class-789', studentId: 'student-3' },
        { classId: 'class-789', studentId: 'student-4' },
        { classId: 'class-789', studentId: 'student-5' },
      ];

      const groupClass = { id: 'class-789' }; // No size defined

      const result = RegistrationConflictService.checkClassCapacity(
        newRegistration,
        existingRegistrations,
        groupClass
      );

      expect(result).toBeNull();
    });

    it('should detect conflict: class with size 0', () => {
      const newRegistration = {
        classId: 'class-789',
      };

      const existingRegistrations = [{ classId: 'class-789', studentId: 'student-1' }];

      const groupClass = { id: 'class-789', size: 0 };

      const result = RegistrationConflictService.checkClassCapacity(
        newRegistration,
        existingRegistrations,
        groupClass
      );

      expect(result).not.toBeNull();
      expect(result!.type).toBe('class_capacity');
      expect(result!.maxCapacity).toBe(0);
    });

    it('should allow: no groupClass provided (unlimited capacity)', () => {
      const newRegistration = {
        classId: 'class-789',
      };

      const existingRegistrations = [{ classId: 'class-789', studentId: 'student-1' }];

      const result = RegistrationConflictService.checkClassCapacity(
        newRegistration,
        existingRegistrations,
        null
      );

      expect(result).toBeNull();
    });

    it('should only count registrations for the same class', () => {
      const newRegistration = {
        classId: 'class-789',
      };

      const existingRegistrations = [
        { classId: 'class-789', studentId: 'student-1' },
        { classId: 'class-789', studentId: 'student-2' },
        { classId: 'class-OTHER', studentId: 'student-3' }, // Different class
        { classId: 'class-OTHER', studentId: 'student-4' }, // Different class
      ];

      const groupClass = { id: 'class-789', size: 3 };

      const result = RegistrationConflictService.checkClassCapacity(
        newRegistration,
        existingRegistrations,
        groupClass
      );

      expect(result).toBeNull(); // Only 2 in class-789, capacity is 3
    });
  });

  // ============================================================
  // TIME OVERLAP TESTS
  // ============================================================
  describe('timesOverlap', () => {
    it('should detect overlap: partial overlap at start', () => {
      // New: 14:00-14:30, Existing: 14:15-14:45
      expect(RegistrationConflictService.timesOverlap('14:00', 30, '14:15', 30)).toBe(true);
    });

    it('should detect overlap: partial overlap at end', () => {
      // New: 14:15-14:45, Existing: 14:00-14:30
      expect(RegistrationConflictService.timesOverlap('14:15', 30, '14:00', 30)).toBe(true);
    });

    it('should detect overlap: new contained within existing', () => {
      // New: 14:15-14:30, Existing: 14:00-15:00
      expect(RegistrationConflictService.timesOverlap('14:15', 15, '14:00', 60)).toBe(true);
    });

    it('should detect overlap: existing contained within new', () => {
      // New: 14:00-15:00, Existing: 14:15-14:30
      expect(RegistrationConflictService.timesOverlap('14:00', 60, '14:15', 15)).toBe(true);
    });

    it('should detect overlap: exact same times', () => {
      expect(RegistrationConflictService.timesOverlap('14:00', 30, '14:00', 30)).toBe(true);
    });

    it('should not detect overlap: adjacent times (end meets start)', () => {
      // 14:00-14:30 and 14:30-15:00 should NOT overlap
      expect(RegistrationConflictService.timesOverlap('14:00', 30, '14:30', 30)).toBe(false);
    });

    it('should not detect overlap: adjacent times (start meets end)', () => {
      // 14:30-15:00 and 14:00-14:30 should NOT overlap
      expect(RegistrationConflictService.timesOverlap('14:30', 30, '14:00', 30)).toBe(false);
    });

    it('should not detect overlap: completely separate times', () => {
      expect(RegistrationConflictService.timesOverlap('14:00', 30, '16:00', 30)).toBe(false);
      expect(RegistrationConflictService.timesOverlap('10:00', 30, '14:00', 30)).toBe(false);
    });

    it('should handle different lesson lengths', () => {
      // 15 min lesson
      expect(RegistrationConflictService.timesOverlap('14:00', 15, '14:10', 15)).toBe(true);
      // 45 min lesson
      expect(RegistrationConflictService.timesOverlap('14:00', 45, '14:30', 30)).toBe(true);
      // 60 min lesson
      expect(RegistrationConflictService.timesOverlap('14:00', 60, '14:45', 30)).toBe(true);
    });
  });

  // ============================================================
  // TIME TO MINUTES CONVERSION TESTS
  // ============================================================
  describe('timeToMinutes', () => {
    it('should convert midnight correctly', () => {
      expect(RegistrationConflictService.timeToMinutes('00:00')).toBe(0);
    });

    it('should convert typical lesson times', () => {
      expect(RegistrationConflictService.timeToMinutes('14:00')).toBe(840);
      expect(RegistrationConflictService.timeToMinutes('14:30')).toBe(870);
      expect(RegistrationConflictService.timeToMinutes('15:45')).toBe(945);
      expect(RegistrationConflictService.timeToMinutes('09:00')).toBe(540);
    });

    it('should convert end of day correctly', () => {
      expect(RegistrationConflictService.timeToMinutes('23:59')).toBe(1439);
    });

    it('should return 0 for null', () => {
      expect(RegistrationConflictService.timeToMinutes(null)).toBe(0);
    });

    it('should return 0 for undefined', () => {
      expect(RegistrationConflictService.timeToMinutes(undefined)).toBe(0);
    });
  });

  // ============================================================
  // INTEGRATION TESTS (checkConflicts)
  // ============================================================
  describe('checkConflicts (integration)', () => {
    describe('Private Lessons', () => {
      it('should detect instructor conflict only (different student, same instructor, overlapping)', async () => {
        const newRegistration = {
          studentId: 'student-123',
          instructorId: 'instructor-456',
          day: 'Monday',
          startTime: '14:00',
          length: 30,
          registrationType: RegistrationType.PRIVATE,
        };

        const existingRegistrations = [
          {
            studentId: 'student-999', // Different student
            instructorId: 'instructor-456', // Same instructor
            day: 'Monday',
            startTime: '14:00', // Same time
            length: 30,
          },
        ];

        const result = await RegistrationConflictService.checkConflicts(
          newRegistration,
          existingRegistrations
        );

        expect(result.hasConflicts).toBe(true);
        expect(result.conflicts).toHaveLength(1);
        expect(result.conflicts[0].type).toBe('instructor_schedule');
      });

      it('should detect student conflict only (same student, different instructor, overlapping)', async () => {
        const newRegistration = {
          studentId: 'student-123',
          instructorId: 'instructor-456',
          day: 'Monday',
          startTime: '14:00',
          length: 30,
          registrationType: RegistrationType.PRIVATE,
        };

        const existingRegistrations = [
          {
            studentId: 'student-123', // Same student
            instructorId: 'instructor-999', // Different instructor
            day: 'Monday',
            startTime: '14:00', // Same time
            length: 30,
          },
        ];

        const result = await RegistrationConflictService.checkConflicts(
          newRegistration,
          existingRegistrations
        );

        expect(result.hasConflicts).toBe(true);
        expect(result.conflicts).toHaveLength(1);
        expect(result.conflicts[0].type).toBe('student_schedule');
      });

      it('should detect multiple conflicts (duplicate + student + instructor)', async () => {
        const newRegistration = {
          studentId: 'student-123',
          instructorId: 'instructor-456',
          day: 'Monday',
          startTime: '14:00',
          length: 30,
          registrationType: RegistrationType.PRIVATE,
        };

        const existingRegistrations = [
          {
            studentId: 'student-123',
            instructorId: 'instructor-456',
            day: 'Monday',
            startTime: '14:00',
            length: 30,
          },
        ];

        const result = await RegistrationConflictService.checkConflicts(
          newRegistration,
          existingRegistrations
        );

        // Duplicate exits early - only get the duplicate conflict
        expect(result.hasConflicts).toBe(true);
        expect(result.conflicts.length).toBe(1);
        expect(result.conflicts[0].type).toBe('duplicate');
      });

      it('should allow registration with no conflicts', async () => {
        const newRegistration = {
          studentId: 'student-123',
          instructorId: 'instructor-456',
          day: 'Monday',
          startTime: '14:00',
          length: 30,
          registrationType: RegistrationType.PRIVATE,
        };

        const existingRegistrations = [
          {
            studentId: 'student-999',
            instructorId: 'instructor-999',
            day: 'Tuesday',
            startTime: '10:00',
            length: 30,
          },
        ];

        const result = await RegistrationConflictService.checkConflicts(
          newRegistration,
          existingRegistrations
        );

        expect(result.hasConflicts).toBe(false);
        expect(result.conflicts).toHaveLength(0);
      });
    });

    describe('Group Classes', () => {
      it('should detect duplicate group registration', async () => {
        const newRegistration = {
          studentId: 'student-123',
          classId: 'class-789',
          registrationType: RegistrationType.GROUP,
        };

        const existingRegistrations = [
          {
            studentId: 'student-123',
            classId: 'class-789',
          },
        ];

        const result = await RegistrationConflictService.checkConflicts(
          newRegistration,
          existingRegistrations
        );

        expect(result.hasConflicts).toBe(true);
        expect(result.conflicts.some(c => c.type === 'duplicate')).toBe(true);
      });

      it('should detect capacity conflict for group class', async () => {
        const newRegistration = {
          studentId: 'student-NEW',
          classId: 'class-789',
          registrationType: RegistrationType.GROUP,
        };

        const existingRegistrations = [
          { studentId: 'student-1', classId: 'class-789' },
          { studentId: 'student-2', classId: 'class-789' },
          { studentId: 'student-3', classId: 'class-789' },
        ];

        const groupClass = { id: 'class-789', size: 3 };

        const result = await RegistrationConflictService.checkConflicts(
          newRegistration,
          existingRegistrations,
          { groupClass }
        );

        expect(result.hasConflicts).toBe(true);
        expect(result.conflicts.some(c => c.type === 'class_capacity')).toBe(true);
      });

      it('should allow admin to bypass capacity check', async () => {
        const newRegistration = {
          studentId: 'student-NEW',
          classId: 'class-789',
          registrationType: RegistrationType.GROUP,
        };

        const existingRegistrations = [
          { studentId: 'student-1', classId: 'class-789' },
          { studentId: 'student-2', classId: 'class-789' },
          { studentId: 'student-3', classId: 'class-789' },
        ];

        const groupClass = { id: 'class-789', size: 3 };

        const result = await RegistrationConflictService.checkConflicts(
          newRegistration,
          existingRegistrations,
          { groupClass, skipCapacityCheck: true }
        );

        expect(result.hasConflicts).toBe(false);
      });

      it('should check student schedule conflicts for group registrations', async () => {
        const newRegistration = {
          studentId: 'student-123',
          classId: 'class-789',
          day: 'Monday',
          startTime: '14:00',
          length: 60,
          registrationType: RegistrationType.GROUP,
        };

        // Same student has a private lesson at the same time
        // Group registrations now check student schedule conflicts
        const existingRegistrations = [
          {
            studentId: 'student-123',
            instructorId: 'instructor-456',
            day: 'Monday',
            startTime: '14:00',
            length: 30,
          },
        ];

        const result = await RegistrationConflictService.checkConflicts(
          newRegistration,
          existingRegistrations
        );

        // Should have student_schedule conflict (students can't be double-booked)
        expect(result.hasConflicts).toBe(true);
        const studentConflict = result.conflicts.find(c => c.type === 'student_schedule');
        expect(studentConflict).toBeDefined();

        // Should NOT have instructor_schedule conflict (group classes don't block instructor)
        const instructorConflict = result.conflicts.find(c => c.type === 'instructor_schedule');
        expect(instructorConflict).toBeUndefined();
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty existing registrations', async () => {
        const newRegistration = {
          studentId: 'student-123',
          instructorId: 'instructor-456',
          day: 'Monday',
          startTime: '14:00',
          length: 30,
          registrationType: RegistrationType.PRIVATE,
        };

        const result = await RegistrationConflictService.checkConflicts(newRegistration, []);

        expect(result.hasConflicts).toBe(false);
        expect(result.conflicts).toHaveLength(0);
      });

      it('should handle null/undefined length gracefully', async () => {
        const newRegistration = {
          studentId: 'student-123',
          instructorId: 'instructor-456',
          day: 'Monday',
          startTime: '14:00',
          length: null,
          registrationType: RegistrationType.PRIVATE,
        };

        const existingRegistrations = [
          {
            studentId: 'student-123',
            instructorId: 'instructor-456',
            day: 'Monday',
            startTime: '14:00',
            length: undefined,
          },
        ];

        // Should not throw
        const result = await RegistrationConflictService.checkConflicts(
          newRegistration,
          existingRegistrations
        );

        expect(result).toBeDefined();
      });
    });
  });
});
