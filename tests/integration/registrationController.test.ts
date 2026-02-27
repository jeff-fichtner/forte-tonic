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
  transportationType: 'parent',
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
  deleteRegistration: jest
    .fn()
    .mockResolvedValue(true),
  validateRegistration: jest.fn().mockResolvedValue({
    isValid: true,
    conflicts: [],
    warnings: [],
  }),
  getStudentConflicts: jest.fn().mockResolvedValue([]),
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
    databaseClient: 'databaseClient', emailClient: 'emailClient', cacheService: 'cacheService',
    configurationService: 'configurationService', registrationRepository: 'registrationRepository',
    userRepository: 'userRepository', programRepository: 'programRepository',
    attendanceRepository: 'attendanceRepository', dropRequestRepository: 'dropRequestRepository',
    periodRepository: 'periodRepository', registrationService: 'registrationService',
    periodService: 'periodService', dropRequestService: 'dropRequestService',
    entityQueryService: 'entityQueryService',
  },
  serviceContainer: {
    get: jest.fn().mockImplementation(serviceName => {
      if (serviceName === 'userRepository') return mockUserRepository;
      if (serviceName === 'registrationRepository') return mockRegistrationRepository;
      if (serviceName === 'registrationService') return mockRegistrationService;
      if (serviceName === 'periodService') return mockPeriodService;
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
      day: 'Monday',
      startTime: '14:00',
      length: 30,
    };

    test('should create registration successfully', async () => {
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

    test('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/registrations')
        .set('x-access-code', '123456')
        .send({ studentId: 'STUDENT1' }) // Missing registrationType
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Missing required fields');
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

  describe('POST /api/registrations/next-trimester', () => {
    const validNextTrimesterData = {
      studentId: 'STUDENT1',
      registrationType: 'private',
      instructorId: 'INSTRUCTOR1@TEST.COM',
      day: 'Monday',
      startTime: '14:00',
    };

    test('should create next trimester registration for returning family', async () => {
      const response = await request(app)
        .post('/api/registrations/next-trimester')
        .set('x-access-code', '123456')
        .send(validNextTrimesterData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(mockPeriodService.canAccessNextTrimester).toHaveBeenCalledWith(true);
      expect(mockRegistrationService.processRegistration).toHaveBeenCalledWith(
        expect.objectContaining(validNextTrimesterData),
        expect.any(String),
        { isAdmin: false }
      );
    });

    test('should reject when next trimester not available', async () => {
      mockPeriodService.getEnrollmentTrimesterTable.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/registrations/next-trimester')
        .set('x-access-code', '123456')
        .send(validNextTrimesterData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should reject non-returning families during priority enrollment', async () => {
      mockRegistrationRepository._fetchRegistrations.mockResolvedValueOnce([]); // No current registrations
      mockPeriodService.canAccessNextTrimester.mockResolvedValueOnce(false);

      const response = await request(app)
        .post('/api/registrations/next-trimester')
        .set('x-access-code', '123456')
        .send(validNextTrimesterData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain(
        'Priority enrollment is for returning families'
      );
    });

    test('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/registrations/next-trimester')
        .set('x-access-code', '123456')
        .send({ studentId: 'STUDENT1' }) // Missing registrationType
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Missing required fields');
    });

    test('should handle backward link when replacing registration', async () => {
      const dataWithLink = {
        ...validNextTrimesterData,
        linkedPreviousRegistrationId: 'OLD-REG-ID',
      };

      const response = await request(app)
        .post('/api/registrations/next-trimester')
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
});
