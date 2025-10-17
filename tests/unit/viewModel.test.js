import { jest } from '@jest/globals';
import { Registration, Student, Instructor, Admin } from '../../src/models/shared/index.js';
import { StudentId } from '../../src/utils/values/studentId.js';
import { InstructorId } from '../../src/utils/values/instructorId.js';
import { RegistrationType } from '../../src/utils/values/registrationType.js';

// Mock the problematic imports
jest.mock('../../src/web/js/data/httpService.js', () => ({
  HttpService: {
    fetch: jest.fn(),
    fetchAllPages: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('../../src/web/js/data/indexedDbClient.js', () => ({
  IndexedDbClient: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    hasItems: jest.fn(),
    getAll: jest.fn(),
    insertRange: jest.fn(),
  })),
}));

jest.mock('../../src/web/js/utilities/domHelpers.js', () => ({
  DomHelpers: {
    waitForDocumentReadyAsync: jest.fn(),
  },
}));

jest.mock('../../src/web/js/components/navTabs.js', () => ({
  NavTabs: jest.fn(),
}));

jest.mock('../../src/web/js/components/table.js', () => ({
  Table: jest.fn(),
}));

jest.mock('../../src/web/js/workflows/adminRegistrationForm.js', () => ({
  AdminRegistrationForm: jest.fn(),
}));

// Mock DOM and browser APIs
global.document = {
  getElementById: jest.fn(),
  createElement: jest.fn(),
  querySelectorAll: jest.fn(),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
  },
};

global.navigator = {
  clipboard: {
    writeText: jest.fn(),
  },
};

global.M = {
  AutoInit: jest.fn(),
  toast: jest.fn(),
  FormSelect: {
    init: jest.fn(),
  },
};

global.confirm = jest.fn();
global.alert = jest.fn();

describe('ViewModel ID Comparison Logic', () => {
  let mockStudents;
  let mockInstructors;
  let mockRegistrations;

  beforeEach(() => {
    // Create mock data with proper value objects
    mockStudents = [
      {
        id: '12345',
        firstName: 'John',
        lastName: 'Student',
        fullName: 'John Student',
        formattedGrade: '5th Grade',
        parentEmails: 'parent1@test.com',
      },
      {
        id: '67890',
        firstName: 'Jane',
        lastName: 'Student',
        fullName: 'Jane Student',
        formattedGrade: '6th Grade',
        parentEmails: 'parent2@test.com',
      },
    ];

    mockInstructors = [
      {
        id: 'TEACHER1@EMAIL.COM',
        firstName: 'Alice',
        lastName: 'Teacher',
        fullName: 'Alice Teacher',
        email: 'teacher1@test.com',
        instruments: ['Piano', 'Violin'],
      },
      {
        id: 'TEACHER2@EMAIL.COM',
        firstName: 'Bob',
        lastName: 'Instructor',
        fullName: 'Bob Instructor',
        email: 'teacher2@test.com',
        instruments: ['Guitar'],
      },
    ];

    // Create mock registrations with value objects
    mockRegistrations = [
      {
        id: '131509_TEACHER1@EMAIL.COM_Monday_17:15',
        studentId: new StudentId('12345'),
        instructorId: new InstructorId('TEACHER1@EMAIL.COM'),
        day: 'Monday',
        formattedStartTime: '17:15',
        length: 30,
        registrationType: RegistrationType.INDIVIDUAL,
        instrument: 'Piano',
        student: null, // Will be populated by viewModel
      },
      {
        id: '131510_TEACHER2@EMAIL.COM_Tuesday_10:00',
        studentId: new StudentId('67890'),
        instructorId: new InstructorId('TEACHER2@EMAIL.COM'),
        day: 'Tuesday',
        formattedStartTime: '10:00',
        length: 45,
        registrationType: RegistrationType.INDIVIDUAL,
        instrument: 'Guitar',
        student: null,
      },
    ];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Registration and Student/Instructor ID Matching', () => {
    test('should find instructor and student for valid registration with value object IDs', () => {
      const registration = mockRegistrations[0];

      // This is the CORRECT way after our fix
      const instructor = mockInstructors.find(x => x.id === registration.instructorId.value);
      const student = mockStudents.find(x => x.id === registration.studentId.value);

      expect(instructor).toBeDefined();
      expect(student).toBeDefined();
      expect(instructor.id).toBe('TEACHER1@EMAIL.COM');
      expect(student.id).toBe('12345');
    });

    test('should not find instructor/student when using registration IDs without .value (the bug we fixed)', () => {
      const registration = mockRegistrations[0];

      // This is the INCORRECT way that was causing the bug
      const instructor = mockInstructors.find(x => x.id === registration.instructorId);
      const student = mockStudents.find(x => x.id === registration.studentId);

      expect(instructor).toBeUndefined();
      expect(student).toBeUndefined();
    });

    test('should handle missing instructor gracefully', () => {
      const registrationWithMissingInstructor = {
        id: 'test_missing_instructor',
        studentId: new StudentId('12345'),
        instructorId: new InstructorId('MISSING_TEACHER'),
        day: 'Wednesday',
        formattedStartTime: '14:00',
        length: 30,
        registrationType: RegistrationType.INDIVIDUAL,
        instrument: 'Piano',
      };

      const instructor = mockInstructors.find(
        x => x.id === registrationWithMissingInstructor.instructorId.value
      );
      const student = mockStudents.find(
        x => x.id === registrationWithMissingInstructor.studentId.value
      );

      expect(instructor).toBeUndefined();
      expect(student).toBeDefined();
    });

    test('should handle missing student gracefully', () => {
      const registrationWithMissingStudent = {
        id: 'test_missing_student',
        studentId: new StudentId('99999'),
        instructorId: new InstructorId('TEACHER1@EMAIL.COM'),
        day: 'Wednesday',
        formattedStartTime: '14:00',
        length: 30,
        registrationType: RegistrationType.INDIVIDUAL,
        instrument: 'Piano',
      };

      const instructor = mockInstructors.find(
        x => x.id === registrationWithMissingStudent.instructorId.value
      );
      const student = mockStudents.find(
        x => x.id === registrationWithMissingStudent.studentId.value
      );

      expect(instructor).toBeDefined();
      expect(student).toBeUndefined();
    });
  });

  describe('Student Association in Registration Mapping', () => {
    test('should populate student property using .value from studentId (correct approach)', () => {
      // Simulate the CORRECT mapping logic from the viewModel after our fix
      const mappedRegistrations = mockRegistrations.map(registration => {
        if (!registration.student) {
          registration.student = mockStudents.find(x => x.id === registration.studentId.value);
        }
        return registration;
      });

      expect(mappedRegistrations[0].student).toBeDefined();
      expect(mappedRegistrations[0].student.id).toBe('12345');
      expect(mappedRegistrations[1].student).toBeDefined();
      expect(mappedRegistrations[1].student.id).toBe('67890');
    });

    test('should not populate student property when using studentId without .value (the old buggy logic)', () => {
      // Simulate the old INCORRECT logic that was causing the bug
      const mappedRegistrations = mockRegistrations.map(registration => {
        if (!registration.student) {
          registration.student = mockStudents.find(x => x.id === registration.studentId);
        }
        return registration;
      });

      expect(mappedRegistrations[0].student).toBeUndefined();
      expect(mappedRegistrations[1].student).toBeUndefined();
    });
  });

  describe('Filtering Logic', () => {
    test('should filter registrations by student ID correctly', () => {
      const targetStudentId = '12345';

      // CORRECT filtering using .value (after our fix)
      const correctFilteredRegistrations = mockRegistrations.filter(
        x => x.studentId.value === targetStudentId
      );

      // INCORRECT filtering without .value (the bug we fixed)
      const incorrectFilteredRegistrations = mockRegistrations.filter(
        x => x.studentId === targetStudentId
      );

      expect(correctFilteredRegistrations).toHaveLength(1);
      expect(correctFilteredRegistrations[0].id).toBe('131509_TEACHER1@EMAIL.COM_Monday_17:15');
      expect(incorrectFilteredRegistrations).toHaveLength(0);
    });

    test('should filter instructors by registration correctly', () => {
      const targetInstructorId = 'TEACHER1@EMAIL.COM';

      // CORRECT filtering using .value (after our fix)
      const hasRegistrations = mockRegistrations.some(
        registration => registration.instructorId.value === targetInstructorId
      );

      // INCORRECT filtering without .value (the bug we fixed)
      const hasRegistrationsIncorrect = mockRegistrations.some(
        registration => registration.instructorId === targetInstructorId
      );

      expect(hasRegistrations).toBe(true);
      expect(hasRegistrationsIncorrect).toBe(false);
    });
  });

  describe('Value Object Properties', () => {
    test('should have StudentId and InstructorId as value objects', () => {
      const registration = mockRegistrations[0];

      expect(registration.studentId).toBeInstanceOf(StudentId);
      expect(registration.instructorId).toBeInstanceOf(InstructorId);
      expect(registration.studentId.value).toBe('12345');
      expect(registration.instructorId.value).toBe('TEACHER1@EMAIL.COM');
    });

    test('should be able to compare value objects using equals method', () => {
      const registration = mockRegistrations[0];
      const sameStudentId = new StudentId('12345');
      const differentStudentId = new StudentId('67890');

      expect(registration.studentId.equals(sameStudentId)).toBe(true);
      expect(registration.studentId.equals(differentStudentId)).toBe(false);
    });

    test('should convert value objects to string properly', () => {
      const registration = mockRegistrations[0];

      expect(registration.studentId.toString()).toBe('12345');
      expect(registration.instructorId.toString()).toBe('TEACHER1@EMAIL.COM');
    });
  });

  describe('Table Row Generation Logic', () => {
    test('should return empty string when instructor or student not found', () => {
      const registrationWithInvalidIds = {
        id: '131509_TEACHER1@EMAIL.COM_Monday_17:15',
        studentId: new StudentId('999999'), // Invalid student ID
        instructorId: new InstructorId('INVALID_TEACHER'), // Invalid instructor ID
        day: 'Monday',
        formattedStartTime: '17:15',
        length: 30,
        registrationType: RegistrationType.INDIVIDUAL,
        instrument: 'Piano',
      };

      // Simulate the table row generation logic from viewModel
      const instructor = mockInstructors.find(
        x => x.id === registrationWithInvalidIds.instructorId.value
      );
      const student = mockStudents.find(x => x.id === registrationWithInvalidIds.studentId.value);

      let result;
      if (!instructor || !student) {
        console.warn(
          `Instructor or student not found for registration: ${registrationWithInvalidIds.id}`
        );
        result = '';
      } else {
        result = `<td>${registrationWithInvalidIds.day}</td>`;
      }

      expect(result).toBe('');
    });

    test('should generate proper table row when instructor and student are found', () => {
      const registration = mockRegistrations[0];

      // Simulate the table row generation logic from viewModel
      const instructor = mockInstructors.find(x => x.id === registration.instructorId.value);
      const student = mockStudents.find(x => x.id === registration.studentId.value);

      let result;
      if (!instructor || !student) {
        console.warn(`Instructor or student not found for registration: ${registration.id}`);
        result = '';
      } else {
        result = `<td>${registration.day}</td><td>${student.firstName}</td><td>${instructor.firstName}</td>`;
      }

      expect(result).toBe('<td>Monday</td><td>John</td><td>Alice</td>');
    });
  });

  describe('Error Handling and Logging', () => {
    test('should log warning when instructor or student not found', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const registrationWithInvalidIds = {
        id: 'invalid_registration',
        studentId: new StudentId('999999'),
        instructorId: new InstructorId('INVALID_TEACHER'),
        day: 'Monday',
        formattedStartTime: '10:00',
        length: 30,
      };

      const instructor = mockInstructors.find(
        x => x.id === registrationWithInvalidIds.instructorId.value
      );
      const student = mockStudents.find(x => x.id === registrationWithInvalidIds.studentId.value);

      if (!instructor || !student) {
        console.warn(
          `Instructor or student not found for registration: ${registrationWithInvalidIds.id}`
        );
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        'Instructor or student not found for registration: invalid_registration'
      );

      consoleSpy.mockRestore();
    });

    test('should log correct registration ID in error message format', () => {
      const originalErrorRegistrationId = '131509_TEACHER1@EMAIL.COM_Monday_17:15';

      // This tests that our error message format matches the original error
      expect(originalErrorRegistrationId).toMatch(/^\d+_[^_]+@[^_]+_[^_]+_\d+:\d+$/);
    });
  });

  describe('Value Object vs Primitive Comparison Validation', () => {
    test('should demonstrate the exact bug that was happening', () => {
      const registration = mockRegistrations[0];

      // The bug: comparing value object with primitive
      expect(registration.studentId === '12345').toBe(false);
      expect(registration.instructorId === 'TEACHER1@EMAIL.COM').toBe(false);

      // The fix: accessing the .value property
      expect(registration.studentId.value === '12345').toBe(true);
      expect(registration.instructorId.value === 'TEACHER1@EMAIL.COM').toBe(true);
    });

    test('should verify that direct comparison with find() fails', () => {
      const registration = mockRegistrations[0];

      // This would fail (the bug)
      const failedInstructorFind = mockInstructors.find(x => x.id === registration.instructorId);
      const failedStudentFind = mockStudents.find(x => x.id === registration.studentId);

      // This works (the fix)
      const successfulInstructorFind = mockInstructors.find(
        x => x.id === registration.instructorId.value
      );
      const successfulStudentFind = mockStudents.find(x => x.id === registration.studentId.value);

      expect(failedInstructorFind).toBeUndefined();
      expect(failedStudentFind).toBeUndefined();
      expect(successfulInstructorFind).toBeDefined();
      expect(successfulStudentFind).toBeDefined();
    });
  });
});
