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
  getCurrentTrimester: jest.fn().mockResolvedValue('fall'),
  getEnrollmentTrimesterTable: jest.fn().mockResolvedValue('registrations_winter'),
  canAccessNextTrimester: jest.fn().mockResolvedValue(true),
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
        .send({ studentId: 'STUDENT1', registrationType: 'private', trimester: 'summer' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid trimester');
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

  describe('POST /api/registrations (next trimester — enrollment access control)', () => {
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

    test('should create registration for returning family targeting next trimester', async () => {
      const response = await request(app)
        .post('/api/registrations')
        .set('x-access-code', '123456')
        .send(nextTrimesterData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(mockPeriodService.canAccessNextTrimester).toHaveBeenCalledWith(true);
      expect(mockRegistrationService.processRegistration).toHaveBeenCalledWith(
        expect.objectContaining(nextTrimesterData),
        expect.any(String),
        { isAdmin: false }
      );
    });

    test('should reject when enrollment table not available for next trimester', async () => {
      mockPeriodService.getEnrollmentTrimesterTable.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/registrations')
        .set('x-access-code', '123456')
        .send(nextTrimesterData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should reject non-returning families during priority enrollment', async () => {
      mockRegistrationRepository.findAll.mockResolvedValueOnce([]); // No current registrations
      mockPeriodService.canAccessNextTrimester.mockResolvedValueOnce(false);

      const response = await request(app)
        .post('/api/registrations')
        .set('x-access-code', '123456')
        .send(nextTrimesterData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain(
        'Priority enrollment is for returning families'
      );
    });

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
    test('should delete registration', async () => {
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

    test('should reject deletion without authentication', async () => {
      const registrationId = '123e4567-e89b-42d3-8456-426614174000';
      const response = await request(app)
        .delete(`/api/registrations/fall/${registrationId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
