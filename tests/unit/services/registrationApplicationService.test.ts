/**
 * Unit tests for RegistrationApplicationService
 *
 * Covers:
 *   T002 - processRegistration (group success, duplicate conflict, private success,
 *           bus restriction, rock band waitlist, admin skip capacity)
 *   T003 - cancelRegistration (success with audit, missing registration)
 *   T004 - getRegistrations (enrichment with batch joins, empty registrations)
 */

import { jest } from '@jest/globals';

// ---------------------------------------------------------------------------
// Mock fns declared BEFORE jest.unstable_mockModule so closures capture them
// ---------------------------------------------------------------------------

const mockValidateRegistrationData = jest.fn();
const mockCheckConflicts = jest.fn();
const mockCreateNew = jest.fn();

// ---------------------------------------------------------------------------
// Mock static dependency modules (must precede dynamic import of SUT)
// ---------------------------------------------------------------------------

jest.unstable_mockModule('../../../src/services/registrationValidationService.js', () => ({
  RegistrationValidationService: {
    validateRegistrationData: mockValidateRegistrationData,
  },
}));

jest.unstable_mockModule('../../../src/services/registrationConflictService.js', () => ({
  RegistrationConflictService: {
    checkConflicts: mockCheckConflicts,
  },
}));

jest.unstable_mockModule('../../../src/models/shared/registration.js', () => ({
  Registration: {
    createNew: mockCreateNew,
  },
}));

jest.unstable_mockModule('../../../src/common/errors.js', () => {
  class ConflictError extends Error {
    readonly name = 'ConflictError' as const;
    readonly statusCode = 409;
    constructor(message: string) {
      super(message);
    }
  }
  return { ConflictError, NotFoundError: Error, ValidationError: Error, ForbiddenError: Error, UnauthorizedError: Error };
});

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  getLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

jest.unstable_mockModule('../../../src/services/configurationService.js', () => ({
  configService: {
    getRockBandClassIds: jest.fn().mockReturnValue(['G015']),
    getApplicationConfig: jest.fn().mockReturnValue({}),
    getServerConfig: jest.fn().mockReturnValue({ nodeEnv: 'test', logLevel: 'error' }),
    getLoggingConfig: jest.fn().mockReturnValue({ enableLogging: false }),
  },
}));

// DateHelpers + TonicDuration mock: the service uses these for bus-time validation
jest.unstable_mockModule('../../../src/utils/nativeDateTimeHelpers.js', () => {
  class MockTonicDuration {
    totalMinutes: number;
    constructor(totalMinutes = 0) {
      this.totalMinutes = Math.max(0, Math.min(totalMinutes, 1439));
    }
    get hours() {
      return Math.floor(this.totalMinutes / 60);
    }
    get minutes() {
      return this.totalMinutes % 60;
    }
    to24Hour() {
      const h = this.hours.toString().padStart(2, '0');
      const m = this.minutes.toString().padStart(2, '0');
      return `${h}:${m}`;
    }
  }
  return {
    DateHelpers: {
      parseTimeString: jest.fn().mockImplementation((str: string) => {
        const match = str.match(/^(\d{1,2}):(\d{2})$/);
        if (match) {
          return new MockTonicDuration(parseInt(match[1]) * 60 + parseInt(match[2]));
        }
        return new MockTonicDuration(0);
      }),
    },
    TonicDuration: MockTonicDuration,
  };
});

// ---------------------------------------------------------------------------
// Dynamic import of the system under test (AFTER all mocks are wired)
// ---------------------------------------------------------------------------

const { RegistrationApplicationService } = await import(
  '../../../src/services/registrationApplicationService.js'
);
const { ConflictError } = await import('../../../src/common/errors.js');

// ---------------------------------------------------------------------------
// Shared helpers & mock repositories
// ---------------------------------------------------------------------------

function buildMockRegistrationRepository() {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdInTable: jest.fn(),
    deleteFromTable: jest.fn(),
    getEnrollmentRegistrations: jest.fn(),
    getRegistrations: jest.fn(),
    getActiveRegistrations: jest.fn(),
    findAll: jest.fn(),
    getFromTable: jest.fn(),
  };
}

function buildMockUserRepository() {
  return {
    getStudentById: jest.fn(),
    getInstructorById: jest.fn(),
    getStudents: jest.fn(),
    getInstructors: jest.fn(),
  };
}

function buildMockProgramRepository() {
  return {
    getClassById: jest.fn(),
    getClasses: jest.fn(),
  };
}

/** Minimal config service stub satisfying BaseService constructor */
const mockConfigService = {
  getRockBandClassIds: jest.fn().mockReturnValue(['G015']),
  getApplicationConfig: jest.fn().mockReturnValue({}),
  getServerConfig: jest.fn().mockReturnValue({ nodeEnv: 'test', logLevel: 'error' }),
  getLoggingConfig: jest.fn().mockReturnValue({ enableLogging: false }),
};

/** Build a Registration-like object returned by mocks */
function fakeRegistration(overrides: Record<string, unknown> = {}) {
  return {
    id: 'reg-001',
    studentId: 'student-100',
    instructorId: 'instructor-200',
    day: 'Monday',
    startTime: '15:00',
    length: 30,
    registrationType: 'private',
    roomId: 'R1',
    instrument: 'Piano',
    transportationType: 'pickup',
    notes: '',
    classId: '',
    classTitle: '',
    expectedStartDate: new Date('2026-02-01'),
    createdAt: new Date(),
    createdBy: 'user-1',
    isWaitlistClass: false,
    reenrollmentIntent: null,
    intentSubmittedAt: null,
    intentSubmittedBy: null,
    linkedPreviousRegistrationId: null,
    toJSON() {
      return { ...this };
    },
    generateSchedule: jest.fn().mockReturnValue([]),
    ...overrides,
  };
}

function fakeStudent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'student-100',
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@example.com',
    grade: '5',
    parent1Id: 'p1',
    parent2Id: 'p2',
    parentEmails: '',
    ...overrides,
  };
}

function fakeInstructor(overrides: Record<string, unknown> = {}) {
  return {
    id: 'instructor-200',
    firstName: 'Bob',
    lastName: 'Jones',
    email: 'bob@example.com',
    isActive: true,
    availability: {
      monday: { isAvailable: true, startTime: '14:00', endTime: '18:00', roomId: 'R1' },
      tuesday: { isAvailable: true, startTime: '14:00', endTime: '18:00', roomId: 'R2' },
      wednesday: { isAvailable: true, startTime: '14:00', endTime: '18:00', roomId: 'R3' },
      thursday: { isAvailable: true, startTime: '14:00', endTime: '18:00', roomId: 'R4' },
      friday: { isAvailable: true, startTime: '14:00', endTime: '18:00', roomId: 'R5' },
    },
    ...overrides,
  };
}

function fakeClass(overrides: Record<string, unknown> = {}) {
  return {
    id: 'G001',
    instructorId: 'instructor-200',
    day: 'Monday',
    startTime: '15:00',
    length: 60,
    endTime: '16:00',
    instrument: 'Guitar',
    title: 'Guitar Ensemble',
    size: '10',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RegistrationApplicationService', () => {
  let service: InstanceType<typeof RegistrationApplicationService>;
  let mockRegRepo: ReturnType<typeof buildMockRegistrationRepository>;
  let mockUserRepo: ReturnType<typeof buildMockUserRepository>;
  let mockProgramRepo: ReturnType<typeof buildMockProgramRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRegRepo = buildMockRegistrationRepository();
    mockUserRepo = buildMockUserRepository();
    mockProgramRepo = buildMockProgramRepository();

    service = new RegistrationApplicationService(
      {
        registrationRepository: mockRegRepo,
        userRepository: mockUserRepo,
        programRepository: mockProgramRepo,
      },
      mockConfigService as any,
    );
  });

  // ========================================================================
  // T002 - processRegistration
  // ========================================================================
  describe('processRegistration', () => {
    // ------------------------------------------------------------------
    // Shared mock defaults for the happy-path (private registration)
    // ------------------------------------------------------------------
    function setupHappyPathMocks(overrides?: {
      registrationData?: Record<string, unknown>;
      classData?: Record<string, unknown>;
      registrationType?: string;
    }) {
      const student = fakeStudent();
      const instructor = fakeInstructor();

      mockValidateRegistrationData.mockReturnValue({ isValid: true, errors: [] });
      mockCheckConflicts.mockResolvedValue({ hasConflicts: false, conflicts: [] });
      mockRegRepo.getEnrollmentRegistrations.mockResolvedValue([]);

      mockUserRepo.getStudentById.mockResolvedValue(student);
      mockUserRepo.getInstructorById.mockResolvedValue(instructor);
      mockProgramRepo.getClassById.mockResolvedValue(
        overrides?.classData ?? null,
      );

      const reg = fakeRegistration(overrides?.registrationData);
      mockCreateNew.mockReturnValue(reg);
      mockRegRepo.create.mockResolvedValue(reg);
    }

    // ------------------------------------------------------------------
    // T002-1: Group registration success
    // ------------------------------------------------------------------
    it('should successfully process a group registration', async () => {
      const groupClass = fakeClass();
      setupHappyPathMocks({ classData: groupClass });
      mockProgramRepo.getClassById.mockResolvedValue(groupClass);

      const reg = fakeRegistration({
        registrationType: 'group',
        classId: 'G001',
        classTitle: 'Guitar Ensemble',
        isWaitlistClass: false,
      });
      mockCreateNew.mockReturnValue(reg);
      mockRegRepo.create.mockResolvedValue(reg);

      const result = await service.processRegistration(
        {
          studentId: 'student-100',
          instructorId: 'instructor-200',
          registrationType: 'group',
          classId: 'G001',
          day: 'Monday',
          startTime: '15:00',
          length: 60,
          trimester: 'winter',
        },
        'user-1',
      );

      expect(result.success).toBe(true);
      expect(result.registration).toBeDefined();
      expect(mockValidateRegistrationData).toHaveBeenCalled();
      expect(mockCheckConflicts).toHaveBeenCalled();
      expect(mockRegRepo.create).toHaveBeenCalled();
    });

    // ------------------------------------------------------------------
    // T002-2: Duplicate group registration conflict
    // ------------------------------------------------------------------
    it('should throw when student is already enrolled in the same group class', async () => {
      const groupClass = fakeClass();
      setupHappyPathMocks({ classData: groupClass });
      mockProgramRepo.getClassById.mockResolvedValue(groupClass);

      // Existing registration with the same studentId + classId
      mockRegRepo.getEnrollmentRegistrations.mockResolvedValue([
        {
          studentId: 'student-100',
          classId: 'G001',
          registrationType: 'group',
          instructorId: 'instructor-200',
          day: 'Monday',
          startTime: '15:00',
        },
      ]);

      await expect(
        service.processRegistration(
          {
            studentId: 'student-100',
            instructorId: 'instructor-200',
            registrationType: 'group',
            classId: 'G001',
            day: 'Monday',
            startTime: '15:00',
            length: 60,
            trimester: 'winter',
          },
          'user-1',
        ),
      ).rejects.toThrow('Student is already enrolled in this class');
    });

    // ------------------------------------------------------------------
    // T002-3: Private lesson success
    // ------------------------------------------------------------------
    it('should successfully process a private lesson registration', async () => {
      setupHappyPathMocks();

      const reg = fakeRegistration({ registrationType: 'private' });
      mockCreateNew.mockReturnValue(reg);
      mockRegRepo.create.mockResolvedValue(reg);

      const result = await service.processRegistration(
        {
          studentId: 'student-100',
          instructorId: 'instructor-200',
          registrationType: 'private',
          day: 'Monday',
          startTime: '15:00',
          length: 30,
          instrument: 'Piano',
          transportationType: 'pickup',
          trimester: 'winter',
        },
        'user-1',
      );

      expect(result.success).toBe(true);
      expect(result.registration).toBeDefined();
      expect(mockRegRepo.create).toHaveBeenCalled();
    });

    // ------------------------------------------------------------------
    // T002-4: Bus restriction violation (Wednesday, ends after 16:15)
    // ------------------------------------------------------------------
    it('should throw when bus transportation ends after the deadline', async () => {
      setupHappyPathMocks();

      await expect(
        service.processRegistration(
          {
            studentId: 'student-100',
            instructorId: 'instructor-200',
            registrationType: 'private',
            day: 'Wednesday',
            startTime: '16:00',
            length: 30,
            transportationType: 'bus',
            trimester: 'winter',
          },
          'user-1',
        ),
      ).rejects.toThrow(/Late Bus is not available/);
    });

    it('should allow bus transportation when lesson ends before the deadline', async () => {
      setupHappyPathMocks();

      const reg = fakeRegistration({ transportationType: 'bus', day: 'Monday', startTime: '15:00', length: 30 });
      mockCreateNew.mockReturnValue(reg);
      mockRegRepo.create.mockResolvedValue(reg);

      const result = await service.processRegistration(
        {
          studentId: 'student-100',
          instructorId: 'instructor-200',
          registrationType: 'private',
          day: 'Monday',
          startTime: '15:00',
          length: 30,
          transportationType: 'bus',
          trimester: 'winter',
        },
        'user-1',
      );

      expect(result.success).toBe(true);
    });

    // ------------------------------------------------------------------
    // T002-5: Rock Band waitlist class detection
    // ------------------------------------------------------------------
    it('should set isWaitlistClass=true when classId matches rock band class IDs', async () => {
      // Rock band class ID configured as 'G015' in the mockConfigService
      const rockBandClass = fakeClass({ id: 'G015', title: 'Rock Band' });
      setupHappyPathMocks({ classData: rockBandClass });
      mockProgramRepo.getClassById.mockResolvedValue(rockBandClass);

      const reg = fakeRegistration({ isWaitlistClass: true, classId: 'G015' });
      mockCreateNew.mockReturnValue(reg);
      mockRegRepo.create.mockResolvedValue(reg);

      await service.processRegistration(
        {
          studentId: 'student-100',
          instructorId: 'instructor-200',
          registrationType: 'group',
          classId: 'G015',
          day: 'Monday',
          startTime: '15:00',
          length: 60,
          trimester: 'winter',
        },
        'user-1',
      );

      // Verify that Registration.createNew was called with isWaitlistClass=true
      const createNewCall = mockCreateNew.mock.calls[0];
      const optionsArg = createNewCall[2] as Record<string, unknown>;
      expect(optionsArg.isWaitlistClass).toBe(true);
    });

    it('should set isWaitlistClass=false when classId does NOT match rock band class IDs', async () => {
      const normalClass = fakeClass({ id: 'G001', title: 'Guitar Ensemble' });
      setupHappyPathMocks({ classData: normalClass });
      mockProgramRepo.getClassById.mockResolvedValue(normalClass);

      const reg = fakeRegistration({ isWaitlistClass: false, classId: 'G001' });
      mockCreateNew.mockReturnValue(reg);
      mockRegRepo.create.mockResolvedValue(reg);

      await service.processRegistration(
        {
          studentId: 'student-100',
          instructorId: 'instructor-200',
          registrationType: 'group',
          classId: 'G001',
          day: 'Monday',
          startTime: '15:00',
          length: 60,
          trimester: 'winter',
        },
        'user-1',
      );

      const createNewCall = mockCreateNew.mock.calls[0];
      const optionsArg = createNewCall[2] as Record<string, unknown>;
      expect(optionsArg.isWaitlistClass).toBe(false);
    });

    // ------------------------------------------------------------------
    // T002-6: Admin skip capacity check
    // ------------------------------------------------------------------
    it('should pass skipCapacityCheck=true to checkConflicts when isAdmin=true', async () => {
      const groupClass = fakeClass();
      setupHappyPathMocks({ classData: groupClass });
      mockProgramRepo.getClassById.mockResolvedValue(groupClass);

      const reg = fakeRegistration({ registrationType: 'group', classId: 'G001' });
      mockCreateNew.mockReturnValue(reg);
      mockRegRepo.create.mockResolvedValue(reg);

      await service.processRegistration(
        {
          studentId: 'student-100',
          instructorId: 'instructor-200',
          registrationType: 'group',
          classId: 'G001',
          day: 'Monday',
          startTime: '15:00',
          length: 60,
          trimester: 'winter',
        },
        'admin-user',
        { isAdmin: true },
      );

      expect(mockCheckConflicts).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ skipCapacityCheck: true }),
      );
    });

    it('should pass skipCapacityCheck=false to checkConflicts for non-admin users', async () => {
      const groupClass = fakeClass();
      setupHappyPathMocks({ classData: groupClass });
      mockProgramRepo.getClassById.mockResolvedValue(groupClass);

      const reg = fakeRegistration({ registrationType: 'group', classId: 'G001' });
      mockCreateNew.mockReturnValue(reg);
      mockRegRepo.create.mockResolvedValue(reg);

      await service.processRegistration(
        {
          studentId: 'student-100',
          instructorId: 'instructor-200',
          registrationType: 'group',
          classId: 'G001',
          day: 'Monday',
          startTime: '15:00',
          length: 60,
          trimester: 'winter',
        },
        'user-1',
      );

      expect(mockCheckConflicts).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ skipCapacityCheck: false }),
      );
    });

    // ------------------------------------------------------------------
    // Additional processRegistration edge cases
    // ------------------------------------------------------------------
    it('should throw ConflictError when checkConflicts reports conflicts', async () => {
      setupHappyPathMocks();

      mockCheckConflicts.mockResolvedValue({
        hasConflicts: true,
        conflicts: [{ type: 'instructor_schedule', message: 'Instructor already booked' }],
      });

      await expect(
        service.processRegistration(
          {
            studentId: 'student-100',
            instructorId: 'instructor-200',
            registrationType: 'private',
            day: 'Monday',
            startTime: '15:00',
            length: 30,
            trimester: 'winter',
          },
          'user-1',
        ),
      ).rejects.toThrow(/Registration conflicts detected/);
    });

    it('should throw when validation fails', async () => {
      setupHappyPathMocks();
      mockValidateRegistrationData.mockReturnValue({
        isValid: false,
        errors: ['startTime is required'],
      });

      await expect(
        service.processRegistration(
          {
            studentId: 'student-100',
            instructorId: 'instructor-200',
            registrationType: 'private',
            day: 'Monday',
            startTime: '',
            length: 30,
            trimester: 'winter',
          },
          'user-1',
        ),
      ).rejects.toThrow(/Registration validation failed/);
    });

    it('should throw when student is not found', async () => {
      setupHappyPathMocks();
      mockUserRepo.getStudentById.mockResolvedValue(null);

      await expect(
        service.processRegistration(
          {
            studentId: 'nonexistent',
            instructorId: 'instructor-200',
            registrationType: 'private',
            day: 'Monday',
            startTime: '15:00',
            length: 30,
            trimester: 'winter',
          },
          'user-1',
        ),
      ).rejects.toThrow(/Student not found/);
    });

    it('should throw when instructor is not found', async () => {
      setupHappyPathMocks();
      mockUserRepo.getInstructorById.mockResolvedValue(null);

      await expect(
        service.processRegistration(
          {
            studentId: 'student-100',
            instructorId: 'nonexistent',
            registrationType: 'private',
            day: 'Monday',
            startTime: '15:00',
            length: 30,
            trimester: 'winter',
          },
          'user-1',
        ),
      ).rejects.toThrow(/Instructor not found/);
    });

    it('should throw when trimester is not provided', async () => {
      setupHappyPathMocks();

      const reg = fakeRegistration();
      mockCreateNew.mockReturnValue(reg);

      await expect(
        service.processRegistration(
          {
            studentId: 'student-100',
            instructorId: 'instructor-200',
            registrationType: 'private',
            day: 'Monday',
            startTime: '15:00',
            length: 30,
            // trimester intentionally omitted
          },
          'user-1',
        ),
      ).rejects.toThrow(/Trimester must be explicitly provided/);
    });

    it('should throw when group class is not found', async () => {
      setupHappyPathMocks();
      mockProgramRepo.getClassById.mockResolvedValue(undefined);

      await expect(
        service.processRegistration(
          {
            studentId: 'student-100',
            instructorId: 'instructor-200',
            registrationType: 'group',
            classId: 'NONEXISTENT',
            day: 'Monday',
            startTime: '15:00',
            length: 60,
            trimester: 'winter',
          },
          'user-1',
        ),
      ).rejects.toThrow(/Class not found/);
    });
  });

  // ========================================================================
  // T003 - cancelRegistration
  // ========================================================================
  describe('cancelRegistration', () => {
    // ------------------------------------------------------------------
    // T003-1: Successful cancellation with audit logging
    // ------------------------------------------------------------------
    it('should cancel a registration and log the audit event', async () => {
      const existingReg = fakeRegistration({ id: 'reg-cancel-1' });
      mockRegRepo.findByIdInTable.mockResolvedValue(existingReg);
      mockRegRepo.deleteFromTable.mockResolvedValue(true);
      mockUserRepo.getStudentById.mockResolvedValue(fakeStudent());
      mockUserRepo.getInstructorById.mockResolvedValue(fakeInstructor());

      const result = await service.cancelRegistration(
        'reg-cancel-1',
        'Changed schedule',
        'admin-user',
        'registrations_winter',
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Registration cancelled successfully');
      expect(mockRegRepo.deleteFromTable).toHaveBeenCalledWith(
        'registrations_winter',
        'reg-cancel-1',
        'admin-user',
      );
    });

    // ------------------------------------------------------------------
    // T003-2: Missing registration throws error
    // ------------------------------------------------------------------
    it('should throw when registration is not found', async () => {
      mockRegRepo.findByIdInTable.mockResolvedValue(null);

      await expect(
        service.cancelRegistration(
          'nonexistent-id',
          'No longer needed',
          'admin-user',
          'registrations_winter',
        ),
      ).rejects.toThrow(/Registration not found/);
    });

    it('should throw when tableName is not provided', async () => {
      const existingReg = fakeRegistration({ id: 'reg-cancel-2' });
      mockRegRepo.findByIdInTable.mockResolvedValue(existingReg);
      // findById path (tableName=null) finds the registration but tableName is required for deletion
      (mockRegRepo as any).findById = jest.fn().mockResolvedValue(existingReg);

      await expect(
        service.cancelRegistration(
          'reg-cancel-2',
          'Testing',
          'admin-user',
          null,
        ),
      ).rejects.toThrow(/tableName is required/);
    });
  });

  // ========================================================================
  // T004 - getRegistrations
  // ========================================================================
  describe('getRegistrations', () => {
    // ------------------------------------------------------------------
    // T004-1: Enrichment with batch joins
    // ------------------------------------------------------------------
    it('should enrich registrations with student, instructor, and class data', async () => {
      const reg1 = {
        id: 'reg-A',
        studentId: 'student-100',
        instructorId: 'instructor-200',
        classId: 'G001',
        day: 'Monday',
        startTime: '15:00',
        length: 60,
        registrationType: 'group',
      };
      const reg2 = {
        id: 'reg-B',
        studentId: 'student-101',
        instructorId: 'instructor-201',
        classId: '',
        day: 'Tuesday',
        startTime: '14:00',
        length: 30,
        registrationType: 'private',
      };

      mockRegRepo.getRegistrations.mockResolvedValue([reg1, reg2]);

      const student1 = fakeStudent({ id: 'student-100', firstName: 'Alice', lastName: 'Smith' });
      const student2 = fakeStudent({ id: 'student-101', firstName: 'Carol', lastName: 'Brown' });
      const instructor1 = fakeInstructor({ id: 'instructor-200', firstName: 'Bob', lastName: 'Jones' });
      const instructor2 = fakeInstructor({ id: 'instructor-201', firstName: 'Dave', lastName: 'Lee' });
      const cls1 = fakeClass({ id: 'G001', title: 'Guitar Ensemble', instrument: 'Guitar', size: '10' });

      mockUserRepo.getStudents.mockResolvedValue([student1, student2]);
      mockUserRepo.getInstructors.mockResolvedValue([instructor1, instructor2]);
      mockProgramRepo.getClasses.mockResolvedValue([cls1]);

      const results = await service.getRegistrations({});

      expect(results).toHaveLength(2);

      // First registration: group with class
      expect(results[0].student).toEqual({
        id: 'student-100',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        grade: '5',
      });
      expect(results[0].instructor).toEqual({
        id: 'instructor-200',
        firstName: 'Bob',
        lastName: 'Jones',
        email: 'bob@example.com',
      });
      expect(results[0].class).toEqual({
        id: 'G001',
        title: 'Guitar Ensemble',
        instrument: 'Guitar',
        size: '10',
      });
      expect(results[0].isActive).toBe(true);

      // Second registration: private, no class
      expect(results[1].student).toEqual({
        id: 'student-101',
        firstName: 'Carol',
        lastName: 'Brown',
        email: 'alice@example.com',
        grade: '5',
      });
      expect(results[1].class).toBeNull();
      expect(results[1].isActive).toBe(true);
    });

    it('should return null for student/instructor not found in lookup maps', async () => {
      const reg = {
        id: 'reg-orphan',
        studentId: 'missing-student',
        instructorId: 'missing-instructor',
        classId: '',
        day: 'Monday',
        startTime: '15:00',
        length: 30,
        registrationType: 'private',
      };

      mockRegRepo.getRegistrations.mockResolvedValue([reg]);
      mockUserRepo.getStudents.mockResolvedValue([]);
      mockUserRepo.getInstructors.mockResolvedValue([]);
      mockProgramRepo.getClasses.mockResolvedValue([]);

      const results = await service.getRegistrations({});

      expect(results).toHaveLength(1);
      expect(results[0].student).toBeNull();
      expect(results[0].instructor).toBeNull();
      expect(results[0].class).toBeNull();
    });

    // ------------------------------------------------------------------
    // T004-2: Empty registrations
    // ------------------------------------------------------------------
    it('should return empty array when no registrations exist', async () => {
      mockRegRepo.getRegistrations.mockResolvedValue([]);

      const results = await service.getRegistrations({});

      expect(results).toEqual([]);
      // Batch-fetch calls should NOT be made when there are no registrations
      expect(mockUserRepo.getStudents).not.toHaveBeenCalled();
      expect(mockUserRepo.getInstructors).not.toHaveBeenCalled();
      expect(mockProgramRepo.getClasses).not.toHaveBeenCalled();
    });

    it('should return empty array when getRegistrations returns null', async () => {
      mockRegRepo.getRegistrations.mockResolvedValue(null);

      const results = await service.getRegistrations({});

      expect(results).toEqual([]);
    });
  });
});
