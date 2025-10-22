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
  })),
}));

// Mock the email client
jest.unstable_mockModule('../../src/email/emailClient.js', () => ({
  EmailClient: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue({ success: true }),
  })),
}));

// Create mock registration data
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
};

const mockUpdatedRegistration = {
  ...mockRegistration,
  reenrollmentIntent: 'keep',
  intentSubmittedAt: new Date('2025-01-20'),
  intentSubmittedBy: 'parent@test.com',
};

// Create mock repositories
const mockRegistrationRepository = {
  getRegistrations: jest.fn().mockResolvedValue([mockRegistration]),
  updateIntent: jest.fn().mockResolvedValue(mockUpdatedRegistration),
};

const mockUserRepository = {
  getParentByPhone: jest.fn().mockImplementation(phone => {
    if (phone === '111111' || phone === '1234567890') {
      return Promise.resolve({
        id: 'PARENT1',
        email: 'parent@test.com',
        phone: phone,
      });
    }
    return Promise.resolve(null);
  }),
  getUserByAccessCode: jest.fn().mockResolvedValue(null),
};

// Create mock period service
const mockPeriodService = {
  getCurrentPeriod: jest.fn().mockResolvedValue({
    trimester: 'Fall',
    periodType: PeriodType.INTENT,
    isCurrentPeriod: true,
    startDate: new Date('2025-01-15'),
  }),
  isIntentPeriodActive: jest.fn().mockResolvedValue(true),
};

// Mock the service container
jest.unstable_mockModule('../../src/infrastructure/container/serviceContainer.js', () => ({
  serviceContainer: {
    get: jest.fn().mockImplementation(serviceName => {
      if (serviceName === 'userRepository') return mockUserRepository;
      if (serviceName === 'registrationRepository') return mockRegistrationRepository;
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

describe('Integration Test: PATCH /api/registrations/:id/intent', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    mockRegistrationRepository.updateIntent.mockResolvedValue(mockUpdatedRegistration);
    mockPeriodService.isIntentPeriodActive.mockResolvedValue(true);
  });

  describe('Success Cases', () => {
    test('should successfully submit intent "keep"', async () => {
      const response = await request(app)
        .patch('/api/registrations/123e4567-e89b-42d3-8456-426614174000/intent')
        .set('x-access-code', '111111')
        .set('x-login-type', 'parent')
        .send({ intent: 'keep' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.registration).toBeDefined();
      expect(response.body.registration.reenrollmentIntent).toBe('keep');
      expect(mockRegistrationRepository.updateIntent).toHaveBeenCalledWith(
        '123e4567-e89b-42d3-8456-426614174000',
        'keep',
        'parent@test.com'
      );
    });

    test('should successfully submit intent "drop"', async () => {
      const dropUpdated = { ...mockUpdatedRegistration, reenrollmentIntent: 'drop' };
      mockRegistrationRepository.updateIntent.mockResolvedValue(dropUpdated);

      const response = await request(app)
        .patch('/api/registrations/123e4567-e89b-42d3-8456-426614174000/intent')
        .set('x-access-code', '111111')
        .set('x-login-type', 'parent')
        .send({ intent: 'drop' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.registration.reenrollmentIntent).toBe('drop');
    });

    test('should successfully submit intent "change"', async () => {
      const changeUpdated = { ...mockUpdatedRegistration, reenrollmentIntent: 'change' };
      mockRegistrationRepository.updateIntent.mockResolvedValue(changeUpdated);

      const response = await request(app)
        .patch('/api/registrations/123e4567-e89b-42d3-8456-426614174000/intent')
        .set('x-access-code', '111111')
        .set('x-login-type', 'parent')
        .send({ intent: 'change' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.registration.reenrollmentIntent).toBe('change');
    });
  });

  describe('Error Cases', () => {
    test('should return 400 for invalid intent value', async () => {
      const response = await request(app)
        .patch('/api/registrations/123e4567-e89b-42d3-8456-426614174000/intent')
        .set('x-access-code', '111111')
        .set('x-login-type', 'parent')
        .send({ intent: 'invalid' })
        .expect(400);

      expect(response.body.error).toContain('Invalid intent');
      expect(mockRegistrationRepository.updateIntent).not.toHaveBeenCalled();
    });

    test('should return 400 when intent period is not active', async () => {
      mockPeriodService.isIntentPeriodActive.mockResolvedValue(false);

      const response = await request(app)
        .patch('/api/registrations/123e4567-e89b-42d3-8456-426614174000/intent')
        .set('x-access-code', '111111')
        .set('x-login-type', 'parent')
        .send({ intent: 'keep' })
        .expect(400);

      expect(response.body.error).toContain('Intent collection is not currently active');
      expect(mockRegistrationRepository.updateIntent).not.toHaveBeenCalled();
    });

    test('should return 404 when registration not found or access denied', async () => {
      mockRegistrationRepository.updateIntent.mockRejectedValue(
        new Error('Registration not found')
      );

      const response = await request(app)
        .patch('/api/registrations/123e4567-e89b-42d3-8456-426614174000/intent')
        .set('x-access-code', '111111')
        .set('x-login-type', 'parent')
        .send({ intent: 'keep' })
        .expect(404);

      expect(response.body.error).toContain('Registration not found or access denied');
    });
  });
});
