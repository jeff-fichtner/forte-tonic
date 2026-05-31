/**
 * Comprehensive integration tests for RegistrationController
 * Tests endpoints that exist in routes/api.js
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import { PeriodType } from '../../src/utils/values/periodType.js';

// Mock the configuration service
const mockConfigService = {
  getGoogleSheetsAuth: jest.fn().mockReturnValue({
    clientEmail: 'test-service-account@test-project.iam.gserviceaccount.com',
    privateKey: 'test-private-key',
  }),
  getGoogleSheetsConfig: jest.fn().mockReturnValue({
    spreadsheetId: 'test-spreadsheet-id',
  }),
  getServerConfig: jest.fn().mockReturnValue({
    port: 3001,
    nodeEnv: 'test',
    isDevelopment: false,
    isTest: true,
    isProduction: false,
  }),
  getEmailConfig: jest.fn().mockReturnValue({
    smtpHost: 'test-smtp.example.com',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: 'test@example.com',
    smtpPassword: 'test-password',
    defaultFromAddress: 'test@example.com',
  }),
  getLoggingConfig: jest.fn().mockReturnValue({
    enableLogging: false,
    logLevel: 'error',
  }),
  getBaseUrl: jest.fn().mockReturnValue('http://localhost:3001'),
  isTest: jest.fn().mockReturnValue(true),
  isDevelopment: jest.fn().mockReturnValue(false),
};

// Mock the configuration service module
jest.unstable_mockModule('../../src/services/configurationService.js', () => ({
  configService: mockConfigService,
}));

// Mock the GoogleSheetsDbClient
jest.unstable_mockModule('../../src/database/googleSheetsDbClient.js', () => ({
  GoogleSheetsDbClient: jest.fn().mockImplementation(() => ({
    spreadsheetId: 'test-sheet-id',
    getAllRecords: jest.fn().mockResolvedValue([]),
    updateRecord: jest.fn().mockResolvedValue({}),
    insertIntoSheet: jest.fn().mockResolvedValue({}),
    deleteRecord: jest.fn().mockResolvedValue({}),
  })),
  dataSheetForTrimester: (trimester: string) => `registrations_${trimester}`,
  auditSheetForTrimester: (trimester: string) => `registrations_${trimester}_audit`,
}));

// Mock the email client
jest.unstable_mockModule('../../src/email/emailClient.js', () => ({
  EmailClient: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue({ success: true }),
  })),
}));

// Test data
const mockRegistration = {
  id: '123e4567-e89b-42d3-8456-426614174000',
  studentId: 'STUDENT1',
  instructorId: 'INSTRUCTOR1@TEST.COM',
  day: 'Monday',
  startTime: '14:00',
  length: 30,
  registrationType: 'private',
  roomId: 'ROOM1',
  instrument: 'Piano',
  transportationType: 'pickup',
  notes: '',
  classId: null,
  classTitle: null,
  expectedStartDate: null,
  createdAt: new Date('2025-01-01'),
  createdBy: 'admin@test.com',
  reenrollmentIntent: null,
  intentSubmittedAt: null,
  intentSubmittedBy: null,
  isActive: true,
  hasConflicts: false,
};

const mockParent = {
  id: 'PARENT1',
  email: 'parent@test.com',
  phone: '1234567890',
  firstName: 'John',
  lastName: 'Doe',
};

// Create mock repositories
const mockUserRepository = {
  getParentByPhone: jest.fn().mockResolvedValue(mockParent),
  getUserByAccessCode: jest.fn().mockResolvedValue({
    user: mockParent,
    userType: 'parent',
  }),
};

const mockRegistrationRepository = {
  findAll: jest.fn().mockResolvedValue([mockRegistration]),
  getActiveRegistrations: jest.fn().mockResolvedValue([mockRegistration]),
  create: jest.fn().mockResolvedValue(mockRegistration),
  update: jest.fn().mockResolvedValue(mockRegistration),
  delete: jest.fn().mockResolvedValue(true),
  updateIntent: jest.fn().mockResolvedValue({ ...mockRegistration, reenrollmentIntent: 'keep' }),
  _fetchRegistrations: jest.fn().mockResolvedValue([mockRegistration]),
  findByIdInTrimester: jest.fn().mockResolvedValue(mockRegistration),
};

const mockRegistrationService = {
  processRegistration: jest.fn().mockResolvedValue({
    registration: mockRegistration,
    warnings: [],
  }),
  updateRegistration: jest.fn().mockResolvedValue(mockRegistration),
  deleteRegistration: jest.fn().mockResolvedValue(true),
  validateRegistration: jest.fn().mockResolvedValue({
    isValid: true,
    conflicts: [],
    warnings: [],
  }),
  getStudentConflicts: jest.fn().mockResolvedValue([]),
};

const mockAvailabilityService = {
  computeAvailableTimeSlots: jest.fn().mockReturnValue({
    '5': [
      {
        instructorId: 'INSTRUCTOR1@TEST.COM',
        day: 'monday',
        dayName: 'Monday',
        time: '14:00',
        timeFormatted: '2:00 PM',
        length: 30,
        instrument: 'Piano',
      },
    ],
  }),
};

const mockEntityQueryService = {
  getStudents: jest.fn().mockResolvedValue([
    {
      id: 'STUDENT1',
      firstName: 'Child',
      lastName: 'Doe',
      parentId: 'PARENT1',
      grade: 5,
    },
  ]),
  getRegistrations: jest.fn().mockResolvedValue([mockRegistration]),
  getInstructors: jest.fn().mockResolvedValue([
    {
      id: 'INSTRUCTOR1@TEST.COM',
      firstName: 'Jane',
      lastName: 'Smith',
      specialties: ['Piano'],
      availability: {
        monday: { isAvailable: true, startTime: '08:00', endTime: '17:00' },
      },
    },
  ]),
  getClasses: jest.fn().mockResolvedValue([]),
};

const mockPeriodService = {
  getCurrentPeriod: jest.fn().mockResolvedValue({
    trimester: 'fall',
    periodType: PeriodType.INTENT,
    isCurrentPeriod: true,
    startDate: new Date('2025-01-15'),
  }),
  isIntentPeriodActive: jest.fn().mockResolvedValue(true),
};

// Mock the service container
jest.unstable_mockModule('../../src/infrastructure/container/serviceContainer.js', () => ({
  ServiceKeys: {
    databaseClient: 'databaseClient',
    emailClient: 'emailClient',
    cacheService: 'cacheService',
    configurationService: 'configurationService',
    registrationRepository: 'registrationRepository',
    userRepository: 'userRepository',
    programRepository: 'programRepository',
    attendanceRepository: 'attendanceRepository',
    dropRequestRepository: 'dropRequestRepository',
    periodRepository: 'periodRepository',
    registrationService: 'registrationService',
    periodService: 'periodService',
    dropRequestService: 'dropRequestService',
    entityQueryService: 'entityQueryService',
    availabilityService: 'availabilityService',
  },
  serviceContainer: {
    get: jest.fn().mockImplementation(serviceName => {
      if (serviceName === 'userRepository') return mockUserRepository;
      if (serviceName === 'registrationRepository') return mockRegistrationRepository;
      if (serviceName === 'registrationService') return mockRegistrationService;
      if (serviceName === 'periodService') return mockPeriodService;
      if (serviceName === 'entityQueryService') return mockEntityQueryService;
      if (serviceName === 'availabilityService') return mockAvailabilityService;
      return null;
    }),
    register: jest.fn(),
    initialize: jest.fn().mockResolvedValue(undefined),
    isInitialized: jest.fn().mockReturnValue(true),
  },
}));

// Import app after all mocks are set up
const { app } = await import('../../src/app.js');

describe('RegistrationController Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/registrations (createRegistration)', () => {
    const validRegistrationData = {
      studentId: 'STUDENT1',
      instructorId: 'INSTRUCTOR1@TEST.COM',
      registrationType: 'private',
      trimester: 'fall',
      day: 'Monday',
      startTime: '14:00',
      length: 30,
      instrument: 'Piano',
      transportationType: 'pickup',
    };

    test('should create registration successfully for current trimester', async () => {
      const response = await request(app)
        .post('/api/registrations')
        .set('x-access-code', '123456')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(mockRegistrationService.processRegistration).toHaveBeenCalledWith(
        validRegistrationData,
        expect.any(String),
        { isAdmin: false }
      );
    });

    test('should reject missing trimester', async () => {
      const response = await request(app)
        .post('/api/registrations')
        .set('x-access-code', '123456')
        .send({ studentId: 'STUDENT1', registrationType: 'private' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Missing required field: trimester');
    });

    test('should reject invalid trimester', async () => {
      const response = await request(app)
        .post('/api/registrations')
        .set('x-access-code', '123456')
        .send({ studentId: 'STUDENT1', registrationType: 'private', trimester: 'autumn' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid trimester');
    });

    // Summer is a valid registration trimester just like fall/winter/spring.
    test('should accept summer as a valid trimester and create the registration', async () => {
      const summerRegistrationData = {
        ...validRegistrationData,
        trimester: 'summer',
      };

      const response = await request(app)
        .post('/api/registrations')
        .set('x-access-code', '123456')
        .send(summerRegistrationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(mockRegistrationService.processRegistration).toHaveBeenCalledWith(
        summerRegistrationData,
        expect.any(String),
        { isAdmin: false }
      );
    });

    // Modify-via-replace flow for carried-forward summer registration.
    // The controller handles replaceRegistrationId itself: authorizes parent
    // eligibility, calls processRegistration (without the replace field),
    // then calls deleteRegistration on the old row.
    test('should accept replaceRegistrationId for a summer modify-via-replace', async () => {
      // Old registration must be carried-forward (have linkedPreviousRegistrationId)
      // and belong to the authenticated parent's student for the parent
      // authorization to succeed.
      mockRegistrationRepository.findByIdInTrimester.mockResolvedValueOnce({
        ...mockRegistration,
        id: 'PREVIOUS-SUMMER-REG-ID',
        linkedPreviousRegistrationId: 'SPRING-REG-ID',
        studentId: 'STUDENT1',
      });
      // mockUserRepository must respond to getStudentById with a student
      // whose parent matches the authenticated parent's id (PARENT1).
      (mockUserRepository as unknown as Record<string, jest.Mock>).getStudentById = jest
        .fn()
        .mockResolvedValueOnce({ id: 'STUDENT1', parent1Id: 'PARENT1', parent2Id: null });

      const summerReplaceData = {
        ...validRegistrationData,
        trimester: 'summer',
        replaceRegistrationId: 'PREVIOUS-SUMMER-REG-ID',
      };

      const response = await request(app)
        .post('/api/registrations')
        .set('x-access-code', '123456')
        .send(summerReplaceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      // Controller strips replaceRegistrationId before calling processRegistration.
      expect(mockRegistrationService.processRegistration).toHaveBeenCalledWith(
        expect.not.objectContaining({ replaceRegistrationId: expect.anything() }),
        expect.any(String),
        { isAdmin: false }
      );
      // After create succeeds, controller deletes the old row.
      expect(mockRegistrationService.deleteRegistration).toHaveBeenCalledWith(
        'PREVIOUS-SUMMER-REG-ID',
        expect.any(String),
        'summer'
      );
    });

    test('should reject missing registrationType', async () => {
      const response = await request(app)
        .post('/api/registrations')
        .set('x-access-code', '123456')
        .send({ studentId: 'STUDENT1', trimester: 'fall' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Registration type is required');
    });

    test('should reject private registration missing type-specific fields', async () => {
      const response = await request(app)
        .post('/api/registrations')
        .set('x-access-code', '123456')
        .send({ studentId: 'STUDENT1', registrationType: 'private', trimester: 'fall' })
        .expect(400);

      expect(response.body.success).toBe(false);
      const message = response.body.error.message;
      expect(message).toContain('Instructor ID is required');
      expect(message).toContain('Instrument is required');
      expect(message).toContain('Start time is required');
      expect(message).toContain('Transportation type is required');
    });

    test('should handle service layer errors', async () => {
      mockRegistrationService.processRegistration.mockRejectedValueOnce(
        new Error('Class not found')
      );

      const response = await request(app)
        .post('/api/registrations')
        .set('x-access-code', '123456')
        .send(validRegistrationData)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/registrations (next trimester)', () => {
    const nextTrimesterData = {
      studentId: 'STUDENT1',
      registrationType: 'private',
      trimester: 'winter',
      instructorId: 'INSTRUCTOR1@TEST.COM',
      day: 'Monday',
      startTime: '14:00',
      length: 30,
      instrument: 'Piano',
      transportationType: 'pickup',
    };

    test('should handle backward link when replacing registration', async () => {
      const dataWithLink = {
        ...nextTrimesterData,
        linkedPreviousRegistrationId: 'OLD-REG-ID',
      };

      const response = await request(app)
        .post('/api/registrations')
        .set('x-access-code', '123456')
        .send(dataWithLink)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(mockRegistrationService.processRegistration).toHaveBeenCalledWith(
        expect.objectContaining({
          linkedPreviousRegistrationId: 'OLD-REG-ID',
        }),
        expect.any(String),
        { isAdmin: false }
      );
    });
  });

  describe('GET /api/parent/tabs/registration/:trimester (getParentRegistrationTabData)', () => {
    test('should return availableTimeSlots keyed by grade', async () => {
      const response = await request(app)
        .get('/api/parent/tabs/registration/fall?parentId=PARENT1')
        .set('x-access-code', '123456')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.availableTimeSlots).toBeDefined();

      // Verify shape: Record<string, AvailableTimeSlot[]>
      const slots = response.body.data.availableTimeSlots;
      expect(typeof slots).toBe('object');
      expect(Array.isArray(slots['5'])).toBe(true);
      expect(slots['5'][0]).toEqual(
        expect.objectContaining({
          instructorId: expect.any(String),
          day: expect.any(String),
          dayName: expect.any(String),
          time: expect.any(String),
          timeFormatted: expect.any(String),
          length: expect.any(Number),
          instrument: expect.any(String),
        })
      );
    });

    test('should pass excludeRegistrationId to availability service', async () => {
      const excludeId = '123e4567-e89b-42d3-8456-426614174000';
      await request(app)
        .get(
          `/api/parent/tabs/registration/fall?parentId=PARENT1&excludeRegistrationId=${excludeId}`
        )
        .set('x-access-code', '123456')
        .expect(200);

      expect(mockAvailabilityService.computeAvailableTimeSlots).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Array),
        expect.any(Array),
        expect.any(Array),
        excludeId
      );
    });

    test('should return standard response fields alongside availableTimeSlots', async () => {
      const response = await request(app)
        .get('/api/parent/tabs/registration/fall?parentId=PARENT1')
        .set('x-access-code', '123456')
        .expect(200);

      expect(response.body.data).toEqual(
        expect.objectContaining({
          instructors: expect.any(Array),
          students: expect.any(Array),
          classes: expect.any(Array),
          registrations: expect.any(Array),
          availableTimeSlots: expect.any(Object),
        })
      );
    });
  });

  describe('DELETE /api/registrations/:trimester/:id', () => {
    test('should delete registration when user is admin', async () => {
      mockUserRepository.getUserByAccessCode.mockResolvedValueOnce({
        user: mockParent,
        userType: 'admin',
      });

      const registrationId = '123e4567-e89b-42d3-8456-426614174000';
      const response = await request(app)
        .delete(`/api/registrations/fall/${registrationId}`)
        .set('x-access-code', '123456')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockRegistrationService.deleteRegistration).toHaveBeenCalledWith(
        registrationId,
        expect.any(String),
        'fall'
      );
    });

    test('should reject invalid trimester with the same response shape as POST /api/registrations', async () => {
      mockUserRepository.getUserByAccessCode.mockResolvedValueOnce({
        user: mockParent,
        userType: 'admin',
      });

      const registrationId = '123e4567-e89b-42d3-8456-426614174000';
      const deleteResponse = await request(app)
        .delete(`/api/registrations/autumn/${registrationId}`)
        .set('x-access-code', '123456')
        .expect(400);

      const createResponse = await request(app)
        .post('/api/registrations')
        .set('x-access-code', '123456')
        .send({ studentId: 'STUDENT1', registrationType: 'private', trimester: 'autumn' })
        .expect(400);

      // Both endpoints must produce the same shape on invalid trimester:
      // same HTTP status, same envelope, same error code/type.
      expect(deleteResponse.status).toBe(createResponse.status);
      expect(deleteResponse.body.success).toBe(false);
      expect(createResponse.body.success).toBe(false);
      expect(deleteResponse.body.error.code).toBe(createResponse.body.error.code);
      expect(deleteResponse.body.error.type).toBe(createResponse.body.error.type);
      expect(deleteResponse.body.error.message).toContain('Invalid trimester');
      expect(deleteResponse.body.error.message).toContain('autumn');
      // The service must not be called when the trimester fails validation.
      expect(mockRegistrationService.deleteRegistration).not.toHaveBeenCalledWith(
        registrationId,
        expect.any(String),
        'autumn'
      );
    });

    test('should reject deletion by non-admin user with 403 (not 401)', async () => {
      // 403 not 401: the user IS authenticated; they just lack admin role.
      // 401 would (correctly) trigger the frontend's session-expired logout,
      // which is wrong for a permission denial.
      const registrationId = '123e4567-e89b-42d3-8456-426614174000';
      const response = await request(app)
        .delete(`/api/registrations/fall/${registrationId}`)
        .set('x-access-code', '123456')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Only administrators can delete registrations');
    });

    test('should reject deletion without authentication', async () => {
      const registrationId = '123e4567-e89b-42d3-8456-426614174000';
      const response = await request(app)
        .delete(`/api/registrations/fall/${registrationId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
