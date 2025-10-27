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

// Create ConfigurationService class mock
class ConfigurationServiceMock {
  static getRockBandClassIds() {
    return ['G015'];
  }
}

// Mock the configuration service module
jest.unstable_mockModule('../../src/services/configurationService.js', () => ({
  configService: mockConfigService,
  ConfigurationService: ConfigurationServiceMock,
}));

// Mock the GoogleSheetsDbClient
jest.unstable_mockModule('../../src/database/googleSheetsDbClient.js', () => ({
  GoogleSheetsDbClient: jest.fn().mockImplementation(() => ({
    spreadsheetId: 'test-sheet-id',
    getAllRecords: jest.fn().mockResolvedValue([]),
    getCachedData: jest.fn().mockResolvedValue([]),
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
const mockClass = {
  id: 'CLASS1',
  title: 'Piano Beginner',
  instructor: 'INSTRUCTOR1@TEST.COM',
  day: 'Monday',
  startTime: '14:00',
  length: 30,
  roomId: 'ROOM1',
};

const mockRoom = {
  id: 'ROOM1',
  name: 'Music Room 1',
  capacity: 10,
};

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
const mockProgramRepository = {
  getClasses: jest.fn().mockResolvedValue([mockClass]),
};

const mockUserRepository = {
  getRooms: jest.fn().mockResolvedValue([mockRoom]),
  getParentByPhone: jest.fn().mockResolvedValue(mockParent),
  getUserByAccessCode: jest.fn().mockResolvedValue({
    user: mockParent,
    userType: 'admin',
  }),
};

const mockRegistrationRepository = {
  getRegistrations: jest.fn().mockResolvedValue([mockRegistration]),
  getActiveRegistrations: jest.fn().mockResolvedValue([mockRegistration]),
  create: jest.fn().mockResolvedValue(mockRegistration),
  update: jest.fn().mockResolvedValue(mockRegistration),
  delete: jest.fn().mockResolvedValue(true),
  updateIntent: jest.fn().mockResolvedValue({ ...mockRegistration, reenrollmentIntent: 'keep' }),
  getFromTable: jest.fn().mockResolvedValue([mockRegistration]),
  createInTable: jest.fn().mockResolvedValue(mockRegistration),
};

const mockRegistrationApplicationService = {
  getRegistrations: jest.fn().mockResolvedValue({
    registrations: [mockRegistration],
    totalCount: 1,
  }),
  processRegistration: jest.fn().mockResolvedValue({
    registration: mockRegistration,
    warnings: [],
  }),
  updateRegistration: jest.fn().mockResolvedValue(mockRegistration),
  cancelRegistration: jest.fn().mockResolvedValue({ success: true, registrationId: mockRegistration.id }),
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
  getCurrentTrimesterTable: jest.fn().mockResolvedValue('registrations_fall'),
  getNextTrimesterTable: jest.fn().mockResolvedValue('registrations_winter'),
  canAccessNextTrimester: jest.fn().mockResolvedValue(true),
};

// Mock the service container
jest.unstable_mockModule('../../src/infrastructure/container/serviceContainer.js', () => ({
  serviceContainer: {
    get: jest.fn().mockImplementation(serviceName => {
      if (serviceName === 'programRepository') return mockProgramRepository;
      if (serviceName === 'userRepository') return mockUserRepository;
      if (serviceName === 'registrationRepository') return mockRegistrationRepository;
      if (serviceName === 'registrationApplicationService') return mockRegistrationApplicationService;
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

  describe('GET /api/classes', () => {
    test('should return all classes', async () => {
      const response = await request(app)
        .get('/api/classes')
        .set('x-access-code', '123456')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([mockClass]);
      expect(mockProgramRepository.getClasses).toHaveBeenCalled();
    });

    test('should handle repository errors', async () => {
      mockProgramRepository.getClasses.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/classes')
        .set('x-access-code', '123456')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/rooms', () => {
    test('should return all rooms', async () => {
      const response = await request(app)
        .get('/api/rooms')
        .set('x-access-code', '123456')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([mockRoom]);
      expect(mockUserRepository.getRooms).toHaveBeenCalled();
    });

    test('should handle repository errors', async () => {
      mockUserRepository.getRooms.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/rooms')
        .set('x-access-code', '123456')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/registrations', () => {
    test('should return registrations with default pagination', async () => {
      const response = await request(app)
        .get('/api/registrations')
        .set('x-access-code', '123456')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toBeDefined();
    });

    test('should filter registrations by studentId', async () => {
      const response = await request(app)
        .get('/api/registrations?studentId=STUDENT1')
        .set('x-access-code', '123456')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/registrations?page=2&pageSize=50')
        .set('x-access-code', '123456')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
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
      expect(mockRegistrationApplicationService.processRegistration).toHaveBeenCalledWith(
        validRegistrationData,
        expect.any(String)
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
      mockRegistrationApplicationService.processRegistration.mockRejectedValueOnce(
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

  describe('POST /api/unregister (legacy)', () => {
    test('should unregister student with standard payload', async () => {
      const response = await request(app)
        .post('/api/unregister')
        .set('x-access-code', '123456')
        .send({
          registrationId: '123e4567-e89b-42d3-8456-426614174000',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockRegistrationApplicationService.cancelRegistration).toHaveBeenCalledWith(
        '123e4567-e89b-42d3-8456-426614174000',
        'Unregistered via legacy endpoint',
        expect.any(String)
      );
    });

    test('should handle HttpService array payload format', async () => {
      const response = await request(app)
        .post('/api/unregister')
        .set('x-access-code', '123456')
        .send([
          {
            data: {
              registrationId: '123e4567-e89b-42d3-8456-426614174000',
              accessCode: '654321',
            },
          },
        ])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockUserRepository.getUserByAccessCode).toHaveBeenCalledWith('654321');
    });

    test('should validate access code when provided', async () => {
      mockUserRepository.getUserByAccessCode.mockResolvedValueOnce({
        user: { email: 'verified@test.com' },
        userType: 'admin',
      });

      const response = await request(app)
        .post('/api/unregister')
        .set('x-access-code', '123456')
        .send({
          registrationId: '123e4567-e89b-42d3-8456-426614174000',
          accessCode: '654321',
        })
        .expect(200);

      expect(mockUserRepository.getUserByAccessCode).toHaveBeenCalledWith('654321');
    });

    test('should reject missing registrationId', async () => {
      const response = await request(app)
        .post('/api/unregister')
        .set('x-access-code', '123456')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Missing registrationId');
    });
  });

  describe('GET /api/registrations/next-trimester', () => {
    test('should return next trimester registrations', async () => {
      const response = await request(app)
        .get('/api/registrations/next-trimester')
        .set('x-access-code', '123456')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Dates are serialized to strings in JSON
      expect(response.body.data).toEqual([
        {
          ...mockRegistration,
          createdAt: mockRegistration.createdAt.toISOString(),
        },
      ]);
      expect(mockPeriodService.getNextTrimesterTable).toHaveBeenCalled();
      expect(mockRegistrationRepository.getFromTable).toHaveBeenCalledWith('registrations_winter');
    });

    test('should reject when next trimester not available', async () => {
      mockPeriodService.getNextTrimesterTable.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/registrations/next-trimester')
        .set('x-access-code', '123456')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not currently available');
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
      expect(mockRegistrationRepository.createInTable).toHaveBeenCalledWith(
        'registrations_winter',
        expect.objectContaining(validNextTrimesterData)
      );
    });

    test('should reject when next trimester not available', async () => {
      mockPeriodService.getNextTrimesterTable.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/registrations/next-trimester')
        .set('x-access-code', '123456')
        .send(validNextTrimesterData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should reject non-returning families during priority enrollment', async () => {
      mockRegistrationRepository.getFromTable.mockResolvedValueOnce([]); // No current registrations
      mockPeriodService.canAccessNextTrimester.mockResolvedValueOnce(false);

      const response = await request(app)
        .post('/api/registrations/next-trimester')
        .set('x-access-code', '123456')
        .send(validNextTrimesterData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Priority enrollment is for returning families');
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
      expect(mockRegistrationRepository.createInTable).toHaveBeenCalledWith(
        'registrations_winter',
        expect.objectContaining({
          linkedPreviousRegistrationId: 'OLD-REG-ID',
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should return 500 for unexpected errors', async () => {
      mockProgramRepository.getClasses.mockRejectedValueOnce(new Error('Unexpected error'));

      const response = await request(app)
        .get('/api/classes')
        .set('x-access-code', '123456')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('should include error information in responses', async () => {
      mockUserRepository.getRooms.mockRejectedValueOnce(new Error('Database timeout'));

      const response = await request(app)
        .get('/api/rooms')
        .set('x-access-code', '123456')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });
});
