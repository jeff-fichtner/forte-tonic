import { jest } from '@jest/globals';
import request from 'supertest';

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
  getBaseUrl: jest.fn().mockReturnValue('http://localhost:3001'),
  isTest: jest.fn().mockReturnValue(true),
  isDevelopment: jest.fn().mockReturnValue(false),
};

// Mock the configuration service module
jest.unstable_mockModule('../../src/services/configurationService.js', () => ({
  configService: mockConfigService,
  ConfigurationService: class MockConfigurationService {
    constructor() {
      return mockConfigService;
    }
    static getRockBandClassIds() {
      return ['rock-band-1', 'rock-band-2'];
    }
  },
}));

// Mock the GoogleSheetsDbClient before importing anything else
jest.unstable_mockModule('../../src/database/googleSheetsDbClient.js', () => ({
  GoogleSheetsDbClient: jest.fn().mockImplementation((_configService = mockConfigService) => ({
    spreadsheetId: 'test-sheet-id',
    getAllRecords: jest.fn().mockResolvedValue([
      ['admin@test.com', 'Test', 'Admin', '555-1234'],
      ['admin2@test.com', 'Test2', 'Admin2', '555-5678'],
    ]),
    readRange: jest.fn().mockResolvedValue([
      ['Header1', 'Header2', 'Header3'],
      ['Data1', 'Data2', 'Data3'],
    ]),
    writeRange: jest.fn().mockResolvedValue(true),
    insertIntoSheet: jest.fn().mockResolvedValue(true),
    appendRecord: jest.fn().mockResolvedValue(true),
    updateRecord: jest.fn().mockResolvedValue(true),
    deleteRecord: jest.fn().mockResolvedValue(true),
  })),
  // Named exports from the dbClient module — used by services/repositories
  // for the trimester → sheet-name mapping (added in the magic-string cleanup).
  dataSheetForTrimester: (trimester: string) => `registrations_${trimester}`,
  auditSheetForTrimester: (trimester: string) => `registrations_${trimester}_audit`,
}));

// Mock the repositories and client directly
const mockUserRepository = {
  getAdmins: jest.fn().mockResolvedValue([
    {
      id: '1',
      email: 'admin@test.com',
      firstName: 'Test',
      lastName: 'Admin',
      phone: '5551234000',
    },
  ]),
  getAdminByAccessCode: jest.fn().mockResolvedValue({
    id: '1',
    email: 'admin@test.com',
    firstName: 'Test',
    lastName: 'Admin',
    phone: '5551234000',
    accessCode: '123456',
  }),
  getInstructorByAccessCode: jest.fn().mockResolvedValue(null),
  getParentByPhone: jest.fn().mockResolvedValue(null),
};

const mockDbClient = {
  spreadsheetId: 'test-sheet-id',
  auth: {
    constructor: { name: 'GoogleAuth' },
  },
  sheets: {
    spreadsheets: {
      get: jest.fn().mockResolvedValue({
        data: {
          properties: { title: 'Test Spreadsheet' },
          sheets: [{ properties: { title: 'Students' } }, { properties: { title: 'Instructors' } }],
        },
      }),
      values: {
        get: jest.fn().mockResolvedValue({
          data: {
            values: [
              ['Header1', 'Header2', 'Header3'],
              ['Data1', 'Data2', 'Data3'],
            ],
          },
        }),
      },
    },
  },
};

// Mock the middleware to add repositories to req
jest.unstable_mockModule('../../src/middleware/auth.js', () => ({
  initializeRepositories: (req, res, next) => {
    req.currentUser = {
      email: 'test-user@example.com',
      admin: {
        id: '1',
        email: 'admin@test.com',
        firstName: 'Test',
        lastName: 'Admin',
      },
      instructor: null,
      parent: null,
      displayName: 'Test Admin',
      toJSON: function () {
        return {
          email: this.email,
          admin: this.admin,
          instructor: this.instructor,
          parent: this.parent,
          displayName: this.displayName,
        };
      },
    };
    next();
  },
  getAuthenticatedUserEmail: jest.fn().mockImplementation(req => {
    return req.currentUser?.email || 'test-user@example.com';
  }),
  requireAuth: (req, res, next) => next(),
}));

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
  },
  serviceContainer: {
    initialize: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockImplementation(serviceName => {
      const services = {
        userRepository: mockUserRepository,
        databaseClient: mockDbClient,
        periodService: {
          getCurrentPeriod: jest.fn().mockResolvedValue(null),
          isIntentPeriodActive: jest.fn().mockResolvedValue(false),
        },
      };
      return services[serviceName];
    }),
  },
}));

describe('Server Integration Tests', () => {
  let app;

  beforeAll(async () => {
    // Import the app after mocks are set up - use app.js to avoid starting server
    const appModule = await import('../../src/app.js');
    app = appModule.app;

    // Initialize the app services
    await appModule.initializeApp();
  });

  describe('Static Routes', () => {
    test('GET / should serve index.html', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.type).toBe('text/html');
    });

    test('GET /js/:filename should serve TypeScript files with correct MIME type', async () => {
      // This will try to load an actual file, so we'll test with a known file
      const response = await request(app).get('/js/main.ts');
      expect(response.status).toBe(200);
      expect(response.get('Content-Type')).toBe('text/javascript; charset=utf-8');
    });
  });

  describe('API Routes', () => {
    describe('POST /api/auth/access-code', () => {
      test('should return authenticated user for valid access code', async () => {
        // Mock the repository method to return an admin for this test
        mockUserRepository.getAdminByAccessCode.mockResolvedValueOnce({
          id: '1',
          email: 'admin@test.com',
          firstName: 'Test',
          lastName: 'Admin',
          phone: '5551234000',
          accessCode: '123456',
          toJSON: function () {
            return {
              id: this.id,
              email: this.email,
              firstName: this.firstName,
              lastName: this.lastName,
              phone: this.phone,
              accessCode: this.accessCode,
            };
          },
        });

        const response = await request(app)
          .post('/api/auth/access-code')
          .send({ accessCode: '123456' })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        const user = response.body.data;

        expect(user).toHaveProperty('email', 'admin@test.com');
        expect(user).toHaveProperty('admin');
        expect(user.admin).toHaveProperty('firstName', 'Test');
        expect(user).toHaveProperty('instructor', null);
        expect(user).toHaveProperty('parent', null);
      });

      test('should return null for invalid access code', async () => {
        // Mock all repository methods to return null/undefined (using mockResolvedValue instead of mockResolvedValueOnce
        // because the controller may call these methods multiple times in fallback logic)
        mockUserRepository.getAdminByAccessCode.mockResolvedValue(null);
        mockUserRepository.getInstructorByAccessCode.mockResolvedValue(null);
        mockUserRepository.getParentByPhone.mockResolvedValue(null);

        const response = await request(app)
          .post('/api/auth/access-code')
          .send({ accessCode: '999999' })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for non-existent routes', async () => {
      const _response = await request(app).get('/non-existent-route').expect(404);
    });

    test('should handle 404 for non-existent API endpoints', async () => {
      const _response = await request(app).post('/api/non-existent-endpoint').expect(404);
    });
  });

  describe('Middleware', () => {
    test('should apply CORS headers', async () => {
      const response = await request(app).get('/');
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    test('should apply security headers', async () => {
      const response = await request(app).get('/');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-content-type-options');
    });
  });
});
