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
  getApplicationConfig: jest.fn().mockReturnValue({
    rockBandClassIds: ['G015'],
    maintenanceMode: false,
    maintenanceMessage:
      'The Forte registration system is currently undergoing updates. We will be back shortly. Thank you for your patience!',
  }),
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
    getAllRecords: jest.fn().mockResolvedValue([]),
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
    trimester: 'fall',
    periodType: PeriodType.INTENT,
    isCurrentPeriod: true,
    startDate: new Date('2025-01-15'),
  }),
  getNextPeriod: jest.fn().mockResolvedValue({
    trimester: 'winter',
    periodType: PeriodType.PRIORITY,
    startDate: new Date('2025-02-01'),
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
      trimester: 'fall',
      periodType: PeriodType.INTENT,
      isCurrentPeriod: true,
      startDate: new Date('2025-01-15'),
    });
    mockPeriodService.getNextPeriod.mockResolvedValue({
      trimester: 'winter',
      periodType: PeriodType.PRIORITY,
      startDate: new Date('2025-02-01'),
    });

    const response = await request(app).get('/api/configuration').expect(200);

    // Verify standardized response format
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty(
      'message',
      'Application configuration retrieved successfully'
    );

    // Verify currentPeriod is included in data
    expect(response.body.data).toHaveProperty('currentPeriod');
    expect(response.body.data.currentPeriod).toBeDefined();
    expect(response.body.data.currentPeriod.trimester).toBe('fall');
    expect(response.body.data.currentPeriod.periodType).toBe(PeriodType.INTENT);
    expect(response.body.data.currentPeriod.isCurrentPeriod).toBe(true);

    // Verify nextPeriod is included in data
    expect(response.body.data).toHaveProperty('nextPeriod');
    expect(response.body.data.nextPeriod).toBeDefined();
    expect(response.body.data.nextPeriod.trimester).toBe('winter');
    expect(response.body.data.nextPeriod.periodType).toBe(PeriodType.PRIORITY);

    // Verify rockBandClassIds is included in data
    expect(response.body.data).toHaveProperty('rockBandClassIds');
    expect(response.body.data.rockBandClassIds).toEqual(['G015']);

    // Verify maintenance mode fields are included
    expect(response.body.data).toHaveProperty('maintenanceMode');
    expect(response.body.data.maintenanceMode).toBe(false);
    expect(response.body.data).toHaveProperty('maintenanceMessage');

    // Verify periodService methods were called
    expect(mockPeriodService.getCurrentPeriod).toHaveBeenCalled();
    expect(mockPeriodService.getNextPeriod).toHaveBeenCalled();
  });

  test('should return null currentPeriod when no period is active', async () => {
    // Mock period service to return null (no active period)
    mockPeriodService.getCurrentPeriod.mockResolvedValue(null);
    mockPeriodService.getNextPeriod.mockResolvedValue(null);

    const response = await request(app).get('/api/configuration').expect(200);

    // Verify standardized response format
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty(
      'message',
      'Application configuration retrieved successfully'
    );

    // Verify currentPeriod is null in data
    expect(response.body.data).toHaveProperty('currentPeriod');
    expect(response.body.data.currentPeriod).toBeNull();

    // Verify nextPeriod is null in data
    expect(response.body.data).toHaveProperty('nextPeriod');
    expect(response.body.data.nextPeriod).toBeNull();

    // Verify rockBandClassIds is still included in data
    expect(response.body.data).toHaveProperty('rockBandClassIds');
    expect(response.body.data.rockBandClassIds).toEqual(['G015']);

    // Verify maintenance mode fields are included
    expect(response.body.data).toHaveProperty('maintenanceMode');
    expect(response.body.data.maintenanceMode).toBe(false);

    // Verify periodService methods were called
    expect(mockPeriodService.getCurrentPeriod).toHaveBeenCalled();
    expect(mockPeriodService.getNextPeriod).toHaveBeenCalled();
  });

  test('should return previous and current trimester during intent period', async () => {
    // During fall intent period, both spring (previous) and fall (current) should be available
    // This allows viewing spring history while managing fall intent
    mockPeriodService.getCurrentPeriod.mockResolvedValue({
      trimester: 'fall',
      periodType: PeriodType.INTENT,
      isCurrentPeriod: true,
      startDate: new Date('2025-01-15'),
    });
    mockPeriodService.getNextPeriod.mockResolvedValue({
      trimester: 'winter',
      periodType: PeriodType.PRIORITY_ENROLLMENT,
      startDate: new Date('2025-02-01'),
    });

    const response = await request(app).get('/api/configuration').expect(200);

    expect(response.body.data).toHaveProperty('availableTrimesters');
    expect(response.body.data.availableTrimesters).toEqual(['spring', 'fall']);
    expect(response.body.data.defaultTrimester).toBe('fall');
  });

  test('should return current and next trimester during priority enrollment', async () => {
    // During fall priority enrollment, both fall and winter should be available
    mockPeriodService.getCurrentPeriod.mockResolvedValue({
      trimester: 'fall',
      periodType: PeriodType.PRIORITY_ENROLLMENT,
      isCurrentPeriod: true,
      startDate: new Date('2025-02-01'),
    });
    mockPeriodService.getNextPeriod.mockResolvedValue({
      trimester: 'winter',
      periodType: PeriodType.OPEN_ENROLLMENT,
      startDate: new Date('2025-03-01'),
    });

    const response = await request(app).get('/api/configuration').expect(200);

    expect(response.body.data).toHaveProperty('availableTrimesters');
    expect(response.body.data.availableTrimesters).toEqual(['fall', 'winter']);
    expect(response.body.data.defaultTrimester).toBe('winter');
  });

  test('should cycle fall to next year during spring priority enrollment', async () => {
    // During spring priority enrollment, both spring and fall should be available
    mockPeriodService.getCurrentPeriod.mockResolvedValue({
      trimester: 'spring',
      periodType: PeriodType.PRIORITY_ENROLLMENT,
      isCurrentPeriod: true,
      startDate: new Date('2025-06-01'),
    });
    mockPeriodService.getNextPeriod.mockResolvedValue({
      trimester: 'fall',
      periodType: PeriodType.OPEN_ENROLLMENT,
      startDate: new Date('2025-07-01'),
    });

    const response = await request(app).get('/api/configuration').expect(200);

    expect(response.body.data).toHaveProperty('availableTrimesters');
    expect(response.body.data.availableTrimesters).toEqual(['spring', 'fall']);
    expect(response.body.data.defaultTrimester).toBe('fall');
  });

  test('should return current and next trimester during open enrollment', async () => {
    // During winter open enrollment, both winter and spring should be available
    mockPeriodService.getCurrentPeriod.mockResolvedValue({
      trimester: 'winter',
      periodType: PeriodType.OPEN_ENROLLMENT,
      isCurrentPeriod: true,
      startDate: new Date('2025-03-01'),
    });
    mockPeriodService.getNextPeriod.mockResolvedValue({
      trimester: 'spring',
      periodType: PeriodType.REGISTRATION,
      startDate: new Date('2025-04-01'),
    });

    const response = await request(app).get('/api/configuration').expect(200);

    expect(response.body.data).toHaveProperty('availableTrimesters');
    expect(response.body.data.availableTrimesters).toEqual(['winter', 'spring']);
    expect(response.body.data.defaultTrimester).toBe('spring');
  });

  test('should return current and next trimester during registration period', async () => {
    // During registration period, both current and next trimester should be available
    mockPeriodService.getCurrentPeriod.mockResolvedValue({
      trimester: 'fall',
      periodType: PeriodType.REGISTRATION,
      isCurrentPeriod: true,
      startDate: new Date('2025-01-01'),
    });
    mockPeriodService.getNextPeriod.mockResolvedValue({
      trimester: 'winter',
      periodType: PeriodType.INTENT,
      startDate: new Date('2025-02-01'),
    });

    const response = await request(app).get('/api/configuration').expect(200);

    expect(response.body.data).toHaveProperty('availableTrimesters');
    expect(response.body.data.availableTrimesters).toEqual(['fall', 'winter']);
    expect(response.body.data.defaultTrimester).toBe('fall');
  });

  test('should return previous and current during winter intent period', async () => {
    // During winter intent, show fall (previous) and winter (current)
    mockPeriodService.getCurrentPeriod.mockResolvedValue({
      trimester: 'winter',
      periodType: PeriodType.INTENT,
      isCurrentPeriod: true,
      startDate: new Date('2025-03-15'),
    });
    mockPeriodService.getNextPeriod.mockResolvedValue({
      trimester: 'spring',
      periodType: PeriodType.PRIORITY_ENROLLMENT,
      startDate: new Date('2025-04-01'),
    });

    const response = await request(app).get('/api/configuration').expect(200);

    expect(response.body.data).toHaveProperty('availableTrimesters');
    expect(response.body.data.availableTrimesters).toEqual(['fall', 'winter']);
    expect(response.body.data.defaultTrimester).toBe('winter');
  });

  test('should return previous and current during spring intent period', async () => {
    // During spring intent, show winter (previous) and spring (current)
    mockPeriodService.getCurrentPeriod.mockResolvedValue({
      trimester: 'spring',
      periodType: PeriodType.INTENT,
      isCurrentPeriod: true,
      startDate: new Date('2025-07-15'),
    });
    mockPeriodService.getNextPeriod.mockResolvedValue({
      trimester: 'fall',
      periodType: PeriodType.PRIORITY_ENROLLMENT,
      startDate: new Date('2025-08-01'),
    });

    const response = await request(app).get('/api/configuration').expect(200);

    expect(response.body.data).toHaveProperty('availableTrimesters');
    expect(response.body.data.availableTrimesters).toEqual(['winter', 'spring']);
    expect(response.body.data.defaultTrimester).toBe('spring');
  });
});
