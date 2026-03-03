import { jest } from '@jest/globals';
import { RegistrationType } from '../../src/utils/values/registrationType.js';

// Mock the problematic imports
jest.mock('../../src/web/js/data/httpService.js', () => ({
  HttpService: {
    fetch: jest.fn(),
    fetchAllPages: jest.fn(),
    post: jest.fn(),
  },
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

    mockRegistrations = [
      {
        id: '131509_TEACHER1@EMAIL.COM_Monday_17:15',
        studentId: '12345',
        instructorId: 'TEACHER1@EMAIL.COM',
        day: 'Monday',
        formattedStartTime: '17:15',
        length: 30,
        registrationType: RegistrationType.PRIVATE,
        instrument: 'Piano',
        student: null,
      },
      {
        id: '131510_TEACHER2@EMAIL.COM_Tuesday_10:00',
        studentId: '67890',
        instructorId: 'TEACHER2@EMAIL.COM',
        day: 'Tuesday',
        formattedStartTime: '10:00',
        length: 45,
        registrationType: RegistrationType.PRIVATE,
        instrument: 'Guitar',
        student: null,
      },
    ];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Registration and Student/Instructor ID Matching', () => {
    test('should find instructor and student for valid registration', () => {
      const registration = mockRegistrations[0];

      const instructor = mockInstructors.find(x => x.id === registration.instructorId);
      const student = mockStudents.find(x => x.id === registration.studentId);

      expect(instructor).toBeDefined();
      expect(student).toBeDefined();
      expect(instructor.id).toBe('TEACHER1@EMAIL.COM');
      expect(student.id).toBe('12345');
    });

    test('should handle missing instructor gracefully', () => {
      const registrationWithMissingInstructor = {
        id: 'test_missing_instructor',
        studentId: '12345',
        instructorId: 'MISSING_TEACHER',
        day: 'Wednesday',
        formattedStartTime: '14:00',
        length: 30,
        registrationType: RegistrationType.PRIVATE,
        instrument: 'Piano',
      };

      const instructor = mockInstructors.find(
        x => x.id === registrationWithMissingInstructor.instructorId
      );
      const student = mockStudents.find(x => x.id === registrationWithMissingInstructor.studentId);

      expect(instructor).toBeUndefined();
      expect(student).toBeDefined();
    });

    test('should handle missing student gracefully', () => {
      const registrationWithMissingStudent = {
        id: 'test_missing_student',
        studentId: '99999',
        instructorId: 'TEACHER1@EMAIL.COM',
        day: 'Wednesday',
        formattedStartTime: '14:00',
        length: 30,
        registrationType: RegistrationType.PRIVATE,
        instrument: 'Piano',
      };

      const instructor = mockInstructors.find(
        x => x.id === registrationWithMissingStudent.instructorId
      );
      const student = mockStudents.find(x => x.id === registrationWithMissingStudent.studentId);

      expect(instructor).toBeDefined();
      expect(student).toBeUndefined();
    });
  });

  describe('Student Association in Registration Mapping', () => {
    test('should populate student property using plain string studentId', () => {
      const mappedRegistrations = mockRegistrations.map(registration => {
        if (!registration.student) {
          registration.student = mockStudents.find(x => x.id === registration.studentId);
        }
        return registration;
      });

      expect(mappedRegistrations[0].student).toBeDefined();
      expect(mappedRegistrations[0].student.id).toBe('12345');
      expect(mappedRegistrations[1].student).toBeDefined();
      expect(mappedRegistrations[1].student.id).toBe('67890');
    });
  });

  describe('Filtering Logic', () => {
    test('should filter registrations by student ID correctly', () => {
      const targetStudentId = '12345';

      const filteredRegistrations = mockRegistrations.filter(x => x.studentId === targetStudentId);

      expect(filteredRegistrations).toHaveLength(1);
      expect(filteredRegistrations[0].id).toBe('131509_TEACHER1@EMAIL.COM_Monday_17:15');
    });

    test('should filter instructors by registration correctly', () => {
      const targetInstructorId = 'TEACHER1@EMAIL.COM';

      const hasRegistrations = mockRegistrations.some(
        registration => registration.instructorId === targetInstructorId
      );

      expect(hasRegistrations).toBe(true);
    });
  });

  describe('Plain String ID Properties', () => {
    test('should have plain string IDs', () => {
      const registration = mockRegistrations[0];

      expect(typeof registration.studentId).toBe('string');
      expect(typeof registration.instructorId).toBe('string');
      expect(registration.studentId).toBe('12345');
      expect(registration.instructorId).toBe('TEACHER1@EMAIL.COM');
    });

    test('should compare IDs directly with ===', () => {
      const registration = mockRegistrations[0];

      expect(registration.studentId === '12345').toBe(true);
      expect(registration.instructorId === 'TEACHER1@EMAIL.COM').toBe(true);
    });
  });

  describe('Table Row Generation Logic', () => {
    test('should return empty string when instructor or student not found', () => {
      const registrationWithInvalidIds = {
        id: '131509_TEACHER1@EMAIL.COM_Monday_17:15',
        studentId: '999999',
        instructorId: 'INVALID_TEACHER',
        day: 'Monday',
        formattedStartTime: '17:15',
        length: 30,
        registrationType: RegistrationType.PRIVATE,
        instrument: 'Piano',
      };

      const instructor = mockInstructors.find(
        x => x.id === registrationWithInvalidIds.instructorId
      );
      const student = mockStudents.find(x => x.id === registrationWithInvalidIds.studentId);

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

      const instructor = mockInstructors.find(x => x.id === registration.instructorId);
      const student = mockStudents.find(x => x.id === registration.studentId);

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
});
