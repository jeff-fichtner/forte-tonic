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
  getRockBandClassIds: jest.fn().mockReturnValue([]),
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
  })),
}));

// Mock the email client
jest.unstable_mockModule('../../src/email/emailClient.js', () => ({
  EmailClient: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue({ success: true }),
  })),
}));

// Create mock period service with different scenarios
const mockPeriodService = {
  getCurrentPeriod: jest.fn().mockResolvedValue({
    trimester: 'Fall',
    periodType: PeriodType.INTENT,
    isCurrentPeriod: true,
    startDate: new Date('2025-01-15'),
  }),
  isIntentPeriodActive: jest.fn().mockResolvedValue(true),
};

// Create mock user repository (empty for this test)
const mockUserRepository = {};

// Mock the service container
jest.unstable_mockModule('../../src/infrastructure/container/serviceContainer.js', () => ({
  serviceContainer: {
    get: jest.fn().mockImplementation(serviceName => {
      if (serviceName === 'periodService') return mockPeriodService;
      if (serviceName === 'userRepository') return mockUserRepository;
      return null;
    }),
    register: jest.fn(),
    initialize: jest.fn().mockResolvedValue(undefined),
    isInitialized: jest.fn().mockReturnValue(true),
  },
}));

// Import app after all mocks are set up
const { app } = await import('../../src/app.js');

describe('Integration Test: POST /api/getAppConfiguration', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  test('should include currentPeriod and rockBandClassIds in response', async () => {
    // Mock period service to return an active intent period
    mockPeriodService.getCurrentPeriod.mockResolvedValue({
      trimester: 'Fall',
      periodType: PeriodType.INTENT,
      isCurrentPeriod: true,
      startDate: new Date('2025-01-15'),
    });

    const response = await request(app).post('/api/getAppConfiguration').send({}).expect(200);

    // Verify currentPeriod is included in response
    expect(response.body).toHaveProperty('currentPeriod');
    expect(response.body.currentPeriod).toBeDefined();
    expect(response.body.currentPeriod.trimester).toBe('Fall');
    expect(response.body.currentPeriod.periodType).toBe(PeriodType.INTENT);
    expect(response.body.currentPeriod.isCurrentPeriod).toBe(true);

    // Verify rockBandClassIds is included
    expect(response.body).toHaveProperty('rockBandClassIds');
    expect(response.body.rockBandClassIds).toEqual(['G015']);

    // Verify periodService.getCurrentPeriod was called
    expect(mockPeriodService.getCurrentPeriod).toHaveBeenCalled();
  });

  test('should return null currentPeriod when no period is active', async () => {
    // Mock period service to return null (no active period)
    mockPeriodService.getCurrentPeriod.mockResolvedValue(null);

    const response = await request(app).post('/api/getAppConfiguration').send({}).expect(200);

    // Verify currentPeriod is null in response
    expect(response.body).toHaveProperty('currentPeriod');
    expect(response.body.currentPeriod).toBeNull();

    // Verify rockBandClassIds is still included
    expect(response.body).toHaveProperty('rockBandClassIds');
    expect(response.body.rockBandClassIds).toEqual(['G015']);

    // Verify periodService.getCurrentPeriod was called
    expect(mockPeriodService.getCurrentPeriod).toHaveBeenCalled();
  });
});
