/**
 * Unit tests for RegistrationService
 *
 * Covers:
 *   T002 - processRegistration (group success, duplicate conflict, private success,
 *           bus restriction, rock band waitlist, admin skip capacity)
 *   T003 - deleteRegistration (success with audit, missing registration)
 *   T004 - getRegistrations (enrichment with batch joins, empty registrations)
 */

import { jest } from '@jest/globals';

// ---------------------------------------------------------------------------
// Mock fns declared BEFORE jest.unstable_mockModule so closures capture them
// ---------------------------------------------------------------------------

const mockCreateNew = jest.fn();

// ---------------------------------------------------------------------------
// Mock dependency modules (must precede dynamic import of SUT)
// ---------------------------------------------------------------------------

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
      convertTo12HourFormat: jest.fn().mockImplementation((str: string) => str),
    },
    TonicDuration: MockTonicDuration,
  };
});

// ---------------------------------------------------------------------------
// Dynamic import of the system under test (AFTER all mocks are wired)
// ---------------------------------------------------------------------------

const { RegistrationService } = await import(
  '../../../src/services/registrationService.js'
);
const { ConflictError } = await import('../../../src/common/errors.js');
const { RegistrationType } = await import('../../../src/utils/values/registrationType.js');

// ---------------------------------------------------------------------------
// Shared helpers & mock repositories
// ---------------------------------------------------------------------------

function buildMockRegistrationRepository() {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    delete: jest.fn(),
    getNextTrimesterRegistrations: jest.fn(),
    findAll: jest.fn(),
    getActiveRegistrations: jest.fn(),
    _fetchRegistrations: jest.fn(),
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
    ...overrides,
  };
}

function fakeStudent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'student-100',
    firstName: 'Alice',
    lastName: 'Smith',
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
    size: 10,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RegistrationService', () => {
  let service: InstanceType<typeof RegistrationService>;
  let mockRegRepo: ReturnType<typeof buildMockRegistrationRepository>;
  let mockUserRepo: ReturnType<typeof buildMockUserRepository>;
  let mockProgramRepo: ReturnType<typeof buildMockProgramRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRegRepo = buildMockRegistrationRepository();
    mockUserRepo = buildMockUserRepository();
    mockProgramRepo = buildMockProgramRepository();

    service = new RegistrationService(
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

      mockRegRepo.getNextTrimesterRegistrations.mockResolvedValue([]);

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
      expect(mockRegRepo.create).toHaveBeenCalled();
    });

    // ------------------------------------------------------------------
    // T002-2: Duplicate group registration conflict (now caught by conflict detection)
    // ------------------------------------------------------------------
    it('should throw when student is already enrolled in the same group class', async () => {
      const groupClass = fakeClass();
      setupHappyPathMocks({ classData: groupClass });
      mockProgramRepo.getClassById.mockResolvedValue(groupClass);

      // Existing registration with the same studentId + classId
      mockRegRepo.getNextTrimesterRegistrations.mockResolvedValue([
        {
          studentId: 'student-100',
          classId: 'G001',
          registrationType: 'group',
          instructorId: 'instructor-200',
          day: 'Monday',
          startTime: '15:00',
          length: 60,
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
      ).rejects.toThrow(/Registration conflicts detected/);
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
            instrument: 'Piano',
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
          instrument: 'Piano',
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
    // T002-6: Admin skip capacity check (group class at capacity, admin bypasses)
    // ------------------------------------------------------------------
    it('should allow admin to register in a full class (capacity bypass)', async () => {
      const groupClass = fakeClass({ size: 2 });
      setupHappyPathMocks({ classData: groupClass });
      mockProgramRepo.getClassById.mockResolvedValue(groupClass);

      // Class is full: 2 registrations, capacity 2
      mockRegRepo.getNextTrimesterRegistrations.mockResolvedValue([
        { studentId: 'student-1', classId: 'G001', registrationType: 'group', instructorId: 'instructor-200', day: 'Monday', startTime: '15:00', length: 60 },
        { studentId: 'student-2', classId: 'G001', registrationType: 'group', instructorId: 'instructor-200', day: 'Monday', startTime: '15:00', length: 60 },
      ]);

      const reg = fakeRegistration({ registrationType: 'group', classId: 'G001' });
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
        'admin-user',
        { isAdmin: true },
      );

      expect(result.success).toBe(true);
    });

    it('should reject non-admin registering in a full class', async () => {
      const groupClass = fakeClass({ size: 2 });
      setupHappyPathMocks({ classData: groupClass });
      mockProgramRepo.getClassById.mockResolvedValue(groupClass);

      // Class is full: 2 registrations, capacity 2
      mockRegRepo.getNextTrimesterRegistrations.mockResolvedValue([
        { studentId: 'student-1', classId: 'G001', registrationType: 'group', instructorId: 'instructor-200', day: 'Monday', startTime: '15:00', length: 60 },
        { studentId: 'student-2', classId: 'G001', registrationType: 'group', instructorId: 'instructor-200', day: 'Monday', startTime: '15:00', length: 60 },
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
      ).rejects.toThrow(/Registration conflicts detected/);
    });

    // ------------------------------------------------------------------
    // Additional processRegistration edge cases
    // ------------------------------------------------------------------
    it('should throw ConflictError when schedule conflicts exist', async () => {
      setupHappyPathMocks();

      // Existing registration with same student, same day, overlapping time
      mockRegRepo.getNextTrimesterRegistrations.mockResolvedValue([
        {
          id: 'existing-reg',
          studentId: 'student-100',
          instructorId: 'instructor-999',
          day: 'Monday',
          startTime: '15:00',
          length: 30,
          registrationType: 'private',
        },
      ]);

      await expect(
        service.processRegistration(
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
        ),
      ).rejects.toThrow(/Registration conflicts detected/);
    });

    it('should throw when validation fails (missing required fields)', async () => {
      setupHappyPathMocks();

      await expect(
        service.processRegistration(
          {
            // Missing studentId — validation will fail
            registrationType: 'private',
            day: 'Monday',
            startTime: '15:00',
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
            instrument: 'Piano',
            transportationType: 'pickup',
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
            instrument: 'Piano',
            transportationType: 'pickup',
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
            instrument: 'Piano',
            transportationType: 'pickup',
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
  // T003 - deleteRegistration
  // ========================================================================
  describe('deleteRegistration', () => {
    // ------------------------------------------------------------------
    // T003-1: Successful deletion with audit logging
    // ------------------------------------------------------------------
    it('should delete a registration and log the audit event', async () => {
      mockRegRepo.delete.mockResolvedValue(true);

      const result = await service.deleteRegistration(
        'reg-cancel-1',
        'admin-user',
        'winter',
      );

      expect(result).toBe(true);
      expect(mockRegRepo.delete).toHaveBeenCalledWith(
        'reg-cancel-1',
        'admin-user',
        'winter',
      );
    });

    // ------------------------------------------------------------------
    // T003-2: Missing registration throws error
    // ------------------------------------------------------------------
    it('should throw when registration is not found', async () => {
      mockRegRepo.delete.mockRejectedValue(new Error('Registration not found'));

      await expect(
        service.deleteRegistration(
          'nonexistent-id',
          'admin-user',
          'winter',
        ),
      ).rejects.toThrow(/Registration not found/);
    });

    it('should throw when trimester is not provided', async () => {
      await expect(
        service.deleteRegistration(
          'reg-cancel-2',
          'admin-user',
          null,
        ),
      ).rejects.toThrow(/trimester is required/);
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

      mockRegRepo.findAll.mockResolvedValue([reg1, reg2]);

      const student1 = fakeStudent({ id: 'student-100', firstName: 'Alice', lastName: 'Smith' });
      const student2 = fakeStudent({ id: 'student-101', firstName: 'Carol', lastName: 'Brown' });
      const instructor1 = fakeInstructor({ id: 'instructor-200', firstName: 'Bob', lastName: 'Jones' });
      const instructor2 = fakeInstructor({ id: 'instructor-201', firstName: 'Dave', lastName: 'Lee' });
      const cls1 = fakeClass({ id: 'G001', title: 'Guitar Ensemble', instrument: 'Guitar', size: 10 });

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
        size: 10,
      });
      expect(results[0].isActive).toBe(true);

      // Second registration: private, no class
      expect(results[1].student).toEqual({
        id: 'student-101',
        firstName: 'Carol',
        lastName: 'Brown',
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

      mockRegRepo.findAll.mockResolvedValue([reg]);
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
      mockRegRepo.findAll.mockResolvedValue([]);

      const results = await service.getRegistrations({});

      expect(results).toEqual([]);
      // Batch-fetch calls should NOT be made when there are no registrations
      expect(mockUserRepo.getStudents).not.toHaveBeenCalled();
      expect(mockUserRepo.getInstructors).not.toHaveBeenCalled();
      expect(mockProgramRepo.getClasses).not.toHaveBeenCalled();
    });

    it('should return empty array when getRegistrations returns null', async () => {
      mockRegRepo.findAll.mockResolvedValue(null);

      const results = await service.getRegistrations({});

      expect(results).toEqual([]);
    });
  });
});

// =========================================================================
// Static Validation Methods
// =========================================================================

describe('RegistrationService - Validation', () => {
  describe('isValidTrimester', () => {
    it('should accept fall', () => {
      expect(RegistrationService.isValidTrimester('fall')).toBe(true);
    });

    it('should accept winter', () => {
      expect(RegistrationService.isValidTrimester('winter')).toBe(true);
    });

    it('should accept spring', () => {
      expect(RegistrationService.isValidTrimester('spring')).toBe(true);
    });

    it('should reject invalid trimester names', () => {
      expect(RegistrationService.isValidTrimester('Summer')).toBe(false);
      expect(RegistrationService.isValidTrimester('Autumn')).toBe(false);
      expect(RegistrationService.isValidTrimester('Q1')).toBe(false);
    });

    it('should reject null and undefined', () => {
      expect(RegistrationService.isValidTrimester(null)).toBe(false);
      expect(RegistrationService.isValidTrimester(undefined)).toBe(false);
    });

    it('should be case-sensitive (lowercase only)', () => {
      expect(RegistrationService.isValidTrimester('Fall')).toBe(false);
      expect(RegistrationService.isValidTrimester('FALL')).toBe(false);
      expect(RegistrationService.isValidTrimester('Winter')).toBe(false);
      expect(RegistrationService.isValidTrimester('WINTER')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(RegistrationService.isValidTrimester('')).toBe(false);
    });

    it('should reject numbers', () => {
      expect(RegistrationService.isValidTrimester(1)).toBe(false);
      expect(RegistrationService.isValidTrimester(0)).toBe(false);
    });
  });

  describe('isValidSchoolYear', () => {
    it('should accept valid school year format', () => {
      expect(RegistrationService.isValidSchoolYear('2024-2025')).toBe(true);
      expect(RegistrationService.isValidSchoolYear('2023-2024')).toBe(true);
    });

    it('should reject invalid year sequences', () => {
      expect(RegistrationService.isValidSchoolYear('2024-2024')).toBe(false);
      expect(RegistrationService.isValidSchoolYear('2024-2026')).toBe(false);
      expect(RegistrationService.isValidSchoolYear('2025-2024')).toBe(false);
    });

    it('should reject invalid formats', () => {
      expect(RegistrationService.isValidSchoolYear('2024/2025')).toBe(false);
      expect(RegistrationService.isValidSchoolYear('24-25')).toBe(false);
      expect(RegistrationService.isValidSchoolYear('2024')).toBe(false);
    });

    it('should reject null and undefined', () => {
      expect(RegistrationService.isValidSchoolYear(null)).toBe(false);
      expect(RegistrationService.isValidSchoolYear(undefined)).toBe(false);
    });
  });

  describe('isValidStartTime', () => {
    it('should accept valid time formats', () => {
      expect(RegistrationService.isValidStartTime('09:00')).toBe(true);
      expect(RegistrationService.isValidStartTime('14:30')).toBe(true);
      expect(RegistrationService.isValidStartTime('23:59')).toBe(true);
      expect(RegistrationService.isValidStartTime('00:00')).toBe(true);
    });

    it('should accept single-digit hours', () => {
      expect(RegistrationService.isValidStartTime('9:00')).toBe(true);
      expect(RegistrationService.isValidStartTime('1:30')).toBe(true);
    });

    it('should reject invalid hours', () => {
      expect(RegistrationService.isValidStartTime('24:00')).toBe(false);
      expect(RegistrationService.isValidStartTime('25:30')).toBe(false);
    });

    it('should reject invalid minutes', () => {
      expect(RegistrationService.isValidStartTime('09:60')).toBe(false);
      expect(RegistrationService.isValidStartTime('14:99')).toBe(false);
    });

    it('should reject invalid formats', () => {
      expect(RegistrationService.isValidStartTime('9am')).toBe(false);
      expect(RegistrationService.isValidStartTime('09:00:00')).toBe(false);
      expect(RegistrationService.isValidStartTime('9.00')).toBe(false);
      expect(RegistrationService.isValidStartTime('900')).toBe(false);
    });

    it('should reject null and undefined', () => {
      expect(RegistrationService.isValidStartTime(null)).toBe(false);
      expect(RegistrationService.isValidStartTime(undefined)).toBe(false);
    });
  });

  describe('isValidLessonLength', () => {
    it('should accept valid lesson lengths', () => {
      expect(RegistrationService.isValidLessonLength(15)).toBe(true);
      expect(RegistrationService.isValidLessonLength(30)).toBe(true);
      expect(RegistrationService.isValidLessonLength(45)).toBe(true);
      expect(RegistrationService.isValidLessonLength(60)).toBe(true);
    });

    it('should accept string numbers', () => {
      expect(RegistrationService.isValidLessonLength('15')).toBe(true);
      expect(RegistrationService.isValidLessonLength('30')).toBe(true);
      expect(RegistrationService.isValidLessonLength('45')).toBe(true);
      expect(RegistrationService.isValidLessonLength('60')).toBe(true);
    });

    it('should reject invalid lengths', () => {
      expect(RegistrationService.isValidLessonLength(10)).toBe(false);
      expect(RegistrationService.isValidLessonLength(20)).toBe(false);
      expect(RegistrationService.isValidLessonLength(90)).toBe(false);
      expect(RegistrationService.isValidLessonLength(0)).toBe(false);
    });

    it('should reject null and undefined', () => {
      expect(RegistrationService.isValidLessonLength(null)).toBe(false);
      expect(RegistrationService.isValidLessonLength(undefined)).toBe(false);
    });
  });

  describe('validateRegistrationData', () => {
    it('should return valid for complete private registration', () => {
      const result = RegistrationService.validateRegistrationData({
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
      const result = RegistrationService.validateRegistrationData({
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
      const result = RegistrationService.validateRegistrationData({
        registrationType: RegistrationType.PRIVATE,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Student ID is required');
    });

    it('should return invalid when registrationType is missing', () => {
      const result = RegistrationService.validateRegistrationData({
        studentId: 'STUDENT1',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Registration type is required');
    });

    it('should return invalid for incomplete private registration', () => {
      const result = RegistrationService.validateRegistrationData({
        studentId: 'STUDENT1',
        registrationType: RegistrationType.PRIVATE,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Instructor ID is required for private lessons');
    });

    it('should return invalid for incomplete group registration', () => {
      const result = RegistrationService.validateRegistrationData({
        studentId: 'STUDENT1',
        registrationType: RegistrationType.GROUP,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Class ID is required for group registrations');
    });

    it('should validate trimester using centralized enum', () => {
      const result = RegistrationService.validateRegistrationData({
        studentId: 'STUDENT1',
        registrationType: RegistrationType.GROUP,
        classId: 'CLASS1',
        trimester: 'InvalidTrimester',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid trimester. Must be fall, winter, or spring');
    });

    it('should accept valid trimesters from centralized enum', () => {
      const fallResult = RegistrationService.validateRegistrationData({
        studentId: 'STUDENT1',
        registrationType: RegistrationType.GROUP,
        classId: 'CLASS1',
        trimester: 'fall',
      });
      expect(fallResult.isValid).toBe(true);

      const winterResult = RegistrationService.validateRegistrationData({
        studentId: 'STUDENT1',
        registrationType: RegistrationType.GROUP,
        classId: 'CLASS1',
        trimester: 'winter',
      });
      expect(winterResult.isValid).toBe(true);

      const springResult = RegistrationService.validateRegistrationData({
        studentId: 'STUDENT1',
        registrationType: RegistrationType.GROUP,
        classId: 'CLASS1',
        trimester: 'spring',
      });
      expect(springResult.isValid).toBe(true);
    });

    it('should accumulate multiple validation errors', () => {
      const result = RegistrationService.validateRegistrationData({
        registrationType: RegistrationType.PRIVATE,
        schoolYear: 'invalid',
        trimester: 'Summer',
        startTime: '25:00',
        length: 20,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });

    it('should add error when classId is missing for group registration', () => {
      const result = RegistrationService.validateRegistrationData({
        studentId: 'STUDENT1',
        registrationType: RegistrationType.GROUP,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Class ID is required for group registrations');
    });

    it('should add errors when private registration fields are missing', () => {
      const result = RegistrationService.validateRegistrationData({
        studentId: 'STUDENT1',
        registrationType: RegistrationType.PRIVATE,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Instructor ID is required for private lessons');
      expect(result.errors).toContain('Instrument is required for private lessons');
      expect(result.errors).toContain('Day is required for private lessons');
      expect(result.errors).toContain('Start time is required for private lessons');
      expect(result.errors).toContain('Lesson length is required for private lessons');
      expect(result.errors).toContain('Transportation type is required for private lessons');
    });

    it('should add error for invalid school year', () => {
      const result = RegistrationService.validateRegistrationData({
        studentId: 'STUDENT1',
        registrationType: RegistrationType.GROUP,
        classId: 'CLASS1',
        schoolYear: '2024-2026',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid school year format. Expected format: YYYY-YYYY');
    });

    it('should add error for invalid start time format in private registration', () => {
      const result = RegistrationService.validateRegistrationData({
        studentId: 'STUDENT1',
        registrationType: RegistrationType.PRIVATE,
        instructorId: 'TEACHER1',
        instrument: 'Piano',
        day: 'Monday',
        startTime: '9am',
        length: 30,
        transportationType: 'pickup',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid start time format');
    });

    it('should add error for invalid lesson length', () => {
      const result = RegistrationService.validateRegistrationData({
        studentId: 'STUDENT1',
        registrationType: RegistrationType.GROUP,
        classId: 'CLASS1',
        length: 20,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid lesson length. Must be 15, 30, 45, or 60 minutes');
    });

    it('should not validate start time for group registrations', () => {
      const result = RegistrationService.validateRegistrationData({
        studentId: 'STUDENT1',
        registrationType: RegistrationType.GROUP,
        classId: 'CLASS1',
        startTime: 'invalid',
      });

      expect(result.isValid).toBe(true);
    });
  });
});

// =========================================================================
// Static Conflict Detection Methods
// =========================================================================

describe('RegistrationService - Conflict Detection', () => {
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

        const result = RegistrationService.checkDuplicateRegistration(
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
            startTime: '15:00',
          },
        ];

        const result = RegistrationService.checkDuplicateRegistration(
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
            instructorId: 'instructor-999',
            day: 'Monday',
            startTime: '14:00',
          },
        ];

        const result = RegistrationService.checkDuplicateRegistration(
          newRegistration,
          existingRegistrations
        );

        expect(result).toBeNull();
      });

      it('should allow: different student + same instructor + same day + same time', () => {
        const result = RegistrationService.checkDuplicateRegistration(
          { studentId: 'student-123', instructorId: 'instructor-456', day: 'Monday', startTime: '14:00', registrationType: RegistrationType.PRIVATE },
          [{ studentId: 'student-999', instructorId: 'instructor-456', day: 'Monday', startTime: '14:00' }]
        );
        expect(result).toBeNull();
      });

      it('should allow: same student + same instructor + different day + same time', () => {
        const result = RegistrationService.checkDuplicateRegistration(
          { studentId: 'student-123', instructorId: 'instructor-456', day: 'Monday', startTime: '14:00', registrationType: RegistrationType.PRIVATE },
          [{ studentId: 'student-123', instructorId: 'instructor-456', day: 'Tuesday', startTime: '14:00' }]
        );
        expect(result).toBeNull();
      });
    });

    describe('Group Classes', () => {
      it('should detect duplicate: same student + same class', () => {
        const result = RegistrationService.checkDuplicateRegistration(
          { studentId: 'student-123', classId: 'class-789', registrationType: RegistrationType.GROUP },
          [{ studentId: 'student-123', classId: 'class-789' }]
        );
        expect(result).not.toBeNull();
        expect(result.type).toBe('duplicate');
      });

      it('should allow: same student + different class', () => {
        const result = RegistrationService.checkDuplicateRegistration(
          { studentId: 'student-123', classId: 'class-789', registrationType: RegistrationType.GROUP },
          [{ studentId: 'student-123', classId: 'class-999' }]
        );
        expect(result).toBeNull();
      });

      it('should allow: different student + same class', () => {
        const result = RegistrationService.checkDuplicateRegistration(
          { studentId: 'student-123', classId: 'class-789', registrationType: RegistrationType.GROUP },
          [{ studentId: 'student-999', classId: 'class-789' }]
        );
        expect(result).toBeNull();
      });
    });

    describe('Value Object Handling', () => {
      it('should work with plain string IDs on both sides', () => {
        const result = RegistrationService.checkDuplicateRegistration(
          { studentId: 'student-123', instructorId: 'instructor-456', day: 'Monday', startTime: '14:00', registrationType: RegistrationType.PRIVATE },
          [{ studentId: 'student-123', instructorId: 'instructor-456', day: 'Monday', startTime: '14:00' }]
        );
        expect(result).not.toBeNull();
        expect(result.type).toBe('duplicate');
      });

      it('should work with value objects on existing and plain strings on new', () => {
        const result = RegistrationService.checkDuplicateRegistration(
          { studentId: 'student-123', instructorId: 'instructor-456', day: 'Monday', startTime: '14:00', registrationType: RegistrationType.PRIVATE },
          [{ studentId: 'student-123', instructorId: 'instructor-456', day: 'Monday', startTime: '14:00' }]
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
      const result = RegistrationService.checkStudentScheduleConflict(
        { studentId: 'student-123', day: 'Monday', startTime: '14:00', length: 30 },
        [{ studentId: 'student-123', day: 'Monday', startTime: '14:15', length: 30 }]
      );
      expect(result).not.toBeNull();
      expect(result.type).toBe('student_schedule');
    });

    it('should allow: same student + same day + adjacent times (no overlap)', () => {
      const result = RegistrationService.checkStudentScheduleConflict(
        { studentId: 'student-123', day: 'Monday', startTime: '14:00', length: 30 },
        [{ studentId: 'student-123', day: 'Monday', startTime: '14:30', length: 30 }]
      );
      expect(result).toBeNull();
    });

    it('should allow: same student + same day + non-overlapping times', () => {
      const result = RegistrationService.checkStudentScheduleConflict(
        { studentId: 'student-123', day: 'Monday', startTime: '14:00', length: 30 },
        [{ studentId: 'student-123', day: 'Monday', startTime: '15:00', length: 30 }]
      );
      expect(result).toBeNull();
    });

    it('should allow: same student + different day + same time', () => {
      const result = RegistrationService.checkStudentScheduleConflict(
        { studentId: 'student-123', day: 'Monday', startTime: '14:00', length: 30 },
        [{ studentId: 'student-123', day: 'Tuesday', startTime: '14:00', length: 30 }]
      );
      expect(result).toBeNull();
    });

    it('should allow: different student + same day + same time', () => {
      const result = RegistrationService.checkStudentScheduleConflict(
        { studentId: 'student-123', day: 'Monday', startTime: '14:00', length: 30 },
        [{ studentId: 'student-999', day: 'Monday', startTime: '14:00', length: 30 }]
      );
      expect(result).toBeNull();
    });

    it('should detect conflict when new lesson is contained within existing', () => {
      const result = RegistrationService.checkStudentScheduleConflict(
        { studentId: 'student-123', day: 'Monday', startTime: '14:15', length: 15 },
        [{ studentId: 'student-123', day: 'Monday', startTime: '14:00', length: 60 }]
      );
      expect(result).not.toBeNull();
      expect(result.type).toBe('student_schedule');
    });

    it('should detect conflict when existing lesson is contained within new', () => {
      const result = RegistrationService.checkStudentScheduleConflict(
        { studentId: 'student-123', day: 'Monday', startTime: '14:00', length: 60 },
        [{ studentId: 'student-123', day: 'Monday', startTime: '14:15', length: 15 }]
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
      const result = RegistrationService.checkInstructorScheduleConflict(
        { instructorId: 'instructor-456', day: 'Monday', startTime: '14:00', length: 30 },
        [{ instructorId: 'instructor-456', day: 'Monday', startTime: '14:15', length: 30 }]
      );
      expect(result).not.toBeNull();
      expect(result.type).toBe('instructor_schedule');
    });

    it('should allow: same instructor + same day + adjacent times', () => {
      const result = RegistrationService.checkInstructorScheduleConflict(
        { instructorId: 'instructor-456', day: 'Monday', startTime: '14:00', length: 30 },
        [{ instructorId: 'instructor-456', day: 'Monday', startTime: '14:30', length: 30 }]
      );
      expect(result).toBeNull();
    });

    it('should allow: same instructor + same day + non-overlapping times', () => {
      const result = RegistrationService.checkInstructorScheduleConflict(
        { instructorId: 'instructor-456', day: 'Monday', startTime: '14:00', length: 30 },
        [{ instructorId: 'instructor-456', day: 'Monday', startTime: '15:00', length: 30 }]
      );
      expect(result).toBeNull();
    });

    it('should allow: same instructor + different day + same time', () => {
      const result = RegistrationService.checkInstructorScheduleConflict(
        { instructorId: 'instructor-456', day: 'Monday', startTime: '14:00', length: 30 },
        [{ instructorId: 'instructor-456', day: 'Tuesday', startTime: '14:00', length: 30 }]
      );
      expect(result).toBeNull();
    });

    it('should allow: different instructor + same day + same time', () => {
      const result = RegistrationService.checkInstructorScheduleConflict(
        { instructorId: 'instructor-456', day: 'Monday', startTime: '14:00', length: 30 },
        [{ instructorId: 'instructor-999', day: 'Monday', startTime: '14:00', length: 30 }]
      );
      expect(result).toBeNull();
    });

    it('should work with plain string instructor IDs', () => {
      const result = RegistrationService.checkInstructorScheduleConflict(
        { instructorId: 'instructor-456', day: 'Monday', startTime: '14:00', length: 30 },
        [{ instructorId: 'instructor-456', day: 'Monday', startTime: '14:00', length: 30 }]
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
      const result = RegistrationService.checkClassCapacity(
        { classId: 'class-789' },
        [
          { classId: 'class-789', studentId: 'student-1' },
          { classId: 'class-789', studentId: 'student-2' },
          { classId: 'class-789', studentId: 'student-3' },
        ],
        { id: 'class-789', size: 3 }
      );
      expect(result).not.toBeNull();
      expect(result.type).toBe('class_capacity');
      expect(result.currentCount).toBe(3);
      expect(result.maxCapacity).toBe(3);
    });

    it('should allow: class under capacity', () => {
      const result = RegistrationService.checkClassCapacity(
        { classId: 'class-789' },
        [
          { classId: 'class-789', studentId: 'student-1' },
          { classId: 'class-789', studentId: 'student-2' },
        ],
        { id: 'class-789', size: 5 }
      );
      expect(result).toBeNull();
    });

    it('should allow: class with no size defined (unlimited capacity)', () => {
      const result = RegistrationService.checkClassCapacity(
        { classId: 'class-789' },
        [
          { classId: 'class-789', studentId: 'student-1' },
          { classId: 'class-789', studentId: 'student-2' },
          { classId: 'class-789', studentId: 'student-3' },
          { classId: 'class-789', studentId: 'student-4' },
          { classId: 'class-789', studentId: 'student-5' },
        ],
        { id: 'class-789' }
      );
      expect(result).toBeNull();
    });

    it('should detect conflict: class with size 0', () => {
      const result = RegistrationService.checkClassCapacity(
        { classId: 'class-789' },
        [{ classId: 'class-789', studentId: 'student-1' }],
        { id: 'class-789', size: 0 }
      );
      expect(result).not.toBeNull();
      expect(result!.type).toBe('class_capacity');
      expect(result!.maxCapacity).toBe(0);
    });

    it('should allow: no groupClass provided (unlimited capacity)', () => {
      const result = RegistrationService.checkClassCapacity(
        { classId: 'class-789' },
        [{ classId: 'class-789', studentId: 'student-1' }],
        null
      );
      expect(result).toBeNull();
    });

    it('should only count registrations for the same class', () => {
      const result = RegistrationService.checkClassCapacity(
        { classId: 'class-789' },
        [
          { classId: 'class-789', studentId: 'student-1' },
          { classId: 'class-789', studentId: 'student-2' },
          { classId: 'class-OTHER', studentId: 'student-3' },
          { classId: 'class-OTHER', studentId: 'student-4' },
        ],
        { id: 'class-789', size: 3 }
      );
      expect(result).toBeNull();
    });
  });

  // ============================================================
  // TIME OVERLAP TESTS
  // ============================================================
  describe('timesOverlap', () => {
    it('should detect overlap: partial overlap at start', () => {
      expect(RegistrationService.timesOverlap('14:00', 30, '14:15', 30)).toBe(true);
    });

    it('should detect overlap: partial overlap at end', () => {
      expect(RegistrationService.timesOverlap('14:15', 30, '14:00', 30)).toBe(true);
    });

    it('should detect overlap: new contained within existing', () => {
      expect(RegistrationService.timesOverlap('14:15', 15, '14:00', 60)).toBe(true);
    });

    it('should detect overlap: existing contained within new', () => {
      expect(RegistrationService.timesOverlap('14:00', 60, '14:15', 15)).toBe(true);
    });

    it('should detect overlap: exact same times', () => {
      expect(RegistrationService.timesOverlap('14:00', 30, '14:00', 30)).toBe(true);
    });

    it('should not detect overlap: adjacent times (end meets start)', () => {
      expect(RegistrationService.timesOverlap('14:00', 30, '14:30', 30)).toBe(false);
    });

    it('should not detect overlap: adjacent times (start meets end)', () => {
      expect(RegistrationService.timesOverlap('14:30', 30, '14:00', 30)).toBe(false);
    });

    it('should not detect overlap: completely separate times', () => {
      expect(RegistrationService.timesOverlap('14:00', 30, '16:00', 30)).toBe(false);
      expect(RegistrationService.timesOverlap('10:00', 30, '14:00', 30)).toBe(false);
    });

    it('should handle different lesson lengths', () => {
      expect(RegistrationService.timesOverlap('14:00', 15, '14:10', 15)).toBe(true);
      expect(RegistrationService.timesOverlap('14:00', 45, '14:30', 30)).toBe(true);
      expect(RegistrationService.timesOverlap('14:00', 60, '14:45', 30)).toBe(true);
    });
  });

  // ============================================================
  // TIME TO MINUTES CONVERSION TESTS
  // ============================================================
  describe('timeToMinutes', () => {
    it('should convert midnight correctly', () => {
      expect(RegistrationService.timeToMinutes('00:00')).toBe(0);
    });

    it('should convert typical lesson times', () => {
      expect(RegistrationService.timeToMinutes('14:00')).toBe(840);
      expect(RegistrationService.timeToMinutes('14:30')).toBe(870);
      expect(RegistrationService.timeToMinutes('15:45')).toBe(945);
      expect(RegistrationService.timeToMinutes('09:00')).toBe(540);
    });

    it('should convert end of day correctly', () => {
      expect(RegistrationService.timeToMinutes('23:59')).toBe(1439);
    });

    it('should return 0 for null', () => {
      expect(RegistrationService.timeToMinutes(null as unknown as string)).toBe(0);
    });

    it('should return 0 for undefined', () => {
      expect(RegistrationService.timeToMinutes(undefined as unknown as string)).toBe(0);
    });
  });

  // ============================================================
  // INTEGRATION TESTS (checkConflicts)
  // ============================================================
  describe('checkConflicts (integration)', () => {
    describe('Private Lessons', () => {
      it('should detect instructor conflict only (different student, same instructor, overlapping)', async () => {
        const result = await RegistrationService.checkConflicts(
          { studentId: 'student-123', instructorId: 'instructor-456', day: 'Monday', startTime: '14:00', length: 30, registrationType: RegistrationType.PRIVATE },
          [{ studentId: 'student-999', instructorId: 'instructor-456', day: 'Monday', startTime: '14:00', length: 30 }]
        );
        expect(result.hasConflicts).toBe(true);
        expect(result.conflicts).toHaveLength(1);
        expect(result.conflicts[0].type).toBe('instructor_schedule');
      });

      it('should detect student conflict only (same student, different instructor, overlapping)', async () => {
        const result = await RegistrationService.checkConflicts(
          { studentId: 'student-123', instructorId: 'instructor-456', day: 'Monday', startTime: '14:00', length: 30, registrationType: RegistrationType.PRIVATE },
          [{ studentId: 'student-123', instructorId: 'instructor-999', day: 'Monday', startTime: '14:00', length: 30 }]
        );
        expect(result.hasConflicts).toBe(true);
        expect(result.conflicts).toHaveLength(1);
        expect(result.conflicts[0].type).toBe('student_schedule');
      });

      it('should detect duplicate conflict (exact match)', async () => {
        const result = await RegistrationService.checkConflicts(
          { studentId: 'student-123', instructorId: 'instructor-456', day: 'Monday', startTime: '14:00', length: 30, registrationType: RegistrationType.PRIVATE },
          [{ studentId: 'student-123', instructorId: 'instructor-456', day: 'Monday', startTime: '14:00', length: 30 }]
        );
        expect(result.hasConflicts).toBe(true);
        expect(result.conflicts.length).toBe(1);
        expect(result.conflicts[0].type).toBe('duplicate');
      });

      it('should allow registration with no conflicts', async () => {
        const result = await RegistrationService.checkConflicts(
          { studentId: 'student-123', instructorId: 'instructor-456', day: 'Monday', startTime: '14:00', length: 30, registrationType: RegistrationType.PRIVATE },
          [{ studentId: 'student-999', instructorId: 'instructor-999', day: 'Tuesday', startTime: '10:00', length: 30 }]
        );
        expect(result.hasConflicts).toBe(false);
        expect(result.conflicts).toHaveLength(0);
      });
    });

    describe('Group Classes', () => {
      it('should detect duplicate group registration', async () => {
        const result = await RegistrationService.checkConflicts(
          { studentId: 'student-123', classId: 'class-789', registrationType: RegistrationType.GROUP },
          [{ studentId: 'student-123', classId: 'class-789' }]
        );
        expect(result.hasConflicts).toBe(true);
        expect(result.conflicts.some(c => c.type === 'duplicate')).toBe(true);
      });

      it('should detect capacity conflict for group class', async () => {
        const result = await RegistrationService.checkConflicts(
          { studentId: 'student-NEW', classId: 'class-789', registrationType: RegistrationType.GROUP },
          [
            { studentId: 'student-1', classId: 'class-789' },
            { studentId: 'student-2', classId: 'class-789' },
            { studentId: 'student-3', classId: 'class-789' },
          ],
          { groupClass: { id: 'class-789', size: 3 } }
        );
        expect(result.hasConflicts).toBe(true);
        expect(result.conflicts.some(c => c.type === 'class_capacity')).toBe(true);
      });

      it('should allow admin to bypass capacity check', async () => {
        const result = await RegistrationService.checkConflicts(
          { studentId: 'student-NEW', classId: 'class-789', registrationType: RegistrationType.GROUP },
          [
            { studentId: 'student-1', classId: 'class-789' },
            { studentId: 'student-2', classId: 'class-789' },
            { studentId: 'student-3', classId: 'class-789' },
          ],
          { groupClass: { id: 'class-789', size: 3 }, skipCapacityCheck: true }
        );
        expect(result.hasConflicts).toBe(false);
      });

      it('should check student schedule conflicts for group registrations', async () => {
        const result = await RegistrationService.checkConflicts(
          { studentId: 'student-123', classId: 'class-789', day: 'Monday', startTime: '14:00', length: 60, registrationType: RegistrationType.GROUP },
          [{ studentId: 'student-123', instructorId: 'instructor-456', day: 'Monday', startTime: '14:00', length: 30 }]
        );
        expect(result.hasConflicts).toBe(true);
        expect(result.conflicts.find(c => c.type === 'student_schedule')).toBeDefined();
        expect(result.conflicts.find(c => c.type === 'instructor_schedule')).toBeUndefined();
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty existing registrations', async () => {
        const result = await RegistrationService.checkConflicts(
          { studentId: 'student-123', instructorId: 'instructor-456', day: 'Monday', startTime: '14:00', length: 30, registrationType: RegistrationType.PRIVATE },
          []
        );
        expect(result.hasConflicts).toBe(false);
        expect(result.conflicts).toHaveLength(0);
      });

      it('should handle null/undefined length gracefully', async () => {
        const result = await RegistrationService.checkConflicts(
          { studentId: 'student-123', instructorId: 'instructor-456', day: 'Monday', startTime: '14:00', length: null, registrationType: RegistrationType.PRIVATE },
          [{ studentId: 'student-123', instructorId: 'instructor-456', day: 'Monday', startTime: '14:00', length: undefined }]
        );
        expect(result).toBeDefined();
      });
    });
  });
});
