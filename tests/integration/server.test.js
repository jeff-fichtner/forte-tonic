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
  ConfigurationService: jest.fn().mockImplementation(() => mockConfigService),
}));

// Mock the GoogleSheetsDbClient before importing anything else
jest.unstable_mockModule('../../src/database/googleSheetsDbClient.js', () => ({
  GoogleSheetsDbClient: jest.fn().mockImplementation((configService = mockConfigService) => ({
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
    getFromSheetByColumnValue: jest.fn().mockResolvedValue([]),
  })),
}));

// Mock the repositories and client directly
const mockUserRepository = {
  getAdmins: jest
    .fn()
    .mockResolvedValue([
      { id: '1', email: 'admin@test.com', firstName: 'Test', lastName: 'Admin', phone: '555-1234' },
    ]),
  getInstructors: jest.fn().mockResolvedValue([
    {
      id: '1',
      email: 'instructor@test.com',
      firstName: 'Test',
      lastName: 'Instructor',
      phone: '555-5678',
    },
  ]),
  getStudents: jest
    .fn()
    .mockResolvedValue([
      { id: '1', email: 'student@test.com', firstName: 'Test', lastName: 'Student', grade: '5' },
    ]),
  getParents: jest.fn().mockResolvedValue([
    {
      id: '1',
      email: 'parent@test.com',
      firstName: 'Test',
      lastName: 'Parent',
      phone: '555-9999',
    },
  ]),
  getRooms: jest
    .fn()
    .mockResolvedValue([{ id: '1', name: 'Piano Room', location: 'Main Building' }]),
};

const mockProgramRepository = {
  getClasses: jest.fn().mockResolvedValue([{ id: '1', name: 'Beginner Piano', instructorId: '1' }]),
  getRegistrations: jest
    .fn()
    .mockResolvedValue([{ id: '1', studentId: '1', classId: '1', registrationType: 'group' }]),
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
  initializeUserContext: (req, res, next) => {
    req.dbClient = mockDbClient;
    req.userRepository = mockUserRepository;
    req.programRepository = mockProgramRepository;
    req.currentUser = {
      email: 'test@example.com',
      isOperator: true,
      admin: { id: 'test-admin-id', email: 'test@example.com' },
    };
    next();
  },
  requireAuth: (req, res, next) => next(),
  requireOperator: (req, res, next) => next(),
}));

// Mock the service container
jest.unstable_mockModule('../../src/infrastructure/container/serviceContainer.js', () => ({
  serviceContainer: {
    initialize: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockImplementation((serviceName) => {
      const services = {
        userRepository: mockUserRepository,
        programRepository: mockProgramRepository,
        studentApplicationService: {
          getStudents: jest.fn().mockResolvedValue({
            students: [
              {
                id: '1',
                firstName: 'John',
                lastName: 'Doe',
                grade: '5',
                ageCategory: 'elementary',
                hasEmergencyContact: true,
                eligibilityInfo: { eligible: true },
                recommendedLessonDuration: 30,
              },
              {
                id: '2',
                firstName: 'Jane',
                lastName: 'Smith',
                grade: '8',
                ageCategory: 'middle',
                hasEmergencyContact: false,
                eligibilityInfo: { eligible: false },
                recommendedLessonDuration: 45,
              },
            ],
            totalCount: 2,
            page: 1,
            pageSize: 10,
          }),
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

    test('GET /js/:filename should serve JavaScript files with correct MIME type', async () => {
      // This will try to load an actual file, so we'll test with a known file
      const response = await request(app).get('/js/viewModel.js');
      expect(response.status).toBe(200);
      expect(response.get('Content-Type')).toBe('application/javascript; charset=UTF-8');
    });
  });

  describe('API Routes', () => {
    describe('POST /api/getAuthenticatedUser', () => {
      test('should return current user', async () => {
        const response = await request(app).post('/api/getAuthenticatedUser').expect(200);

        // Handle double-stringified JSON from server
        let user;
        try {
          user = JSON.parse(JSON.parse(response.text));
        } catch {
          user = JSON.parse(response.text);
        }
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('isOperator');
      });
    });

    describe('POST /api/getAdmins', () => {
      test('should return list of admins', async () => {
        const response = await request(app).post('/api/getAdmins').expect(200);

        let admins;
        try {
          admins = JSON.parse(JSON.parse(response.text));
        } catch {
          admins = JSON.parse(response.text);
        }
        expect(Array.isArray(admins)).toBe(true);
        expect(admins).toHaveLength(1);
        expect(admins[0]).toHaveProperty('email', 'admin@test.com');
      });
    });

    describe('POST /api/getInstructors', () => {
      test('should return list of instructors', async () => {
        const response = await request(app).post('/api/getInstructors').expect(200);

        let instructors;
        try {
          instructors = JSON.parse(JSON.parse(response.text));
        } catch {
          instructors = JSON.parse(response.text);
        }
        expect(Array.isArray(instructors)).toBe(true);
        expect(instructors).toHaveLength(1);
        expect(instructors[0]).toHaveProperty('email', 'instructor@test.com');
      });
    });

    describe('POST /api/getStudents', () => {
      test('should return list of students', async () => {
        const response = await request(app)
          .post('/api/getStudents')
          .send([{ page: 0, pageSize: 10 }])
          .expect(200);

        let result;
        try {
          result = JSON.parse(JSON.parse(response.text));
        } catch {
          result = JSON.parse(response.text);
        }
        expect(result).toHaveProperty('data');
        expect(Array.isArray(result.data)).toBe(true);
        expect(result).toHaveProperty('total');
        expect(result).toHaveProperty('page');
        expect(result).toHaveProperty('pageSize');
      });
    });

    describe('POST /api/getClasses', () => {
      test('should return list of classes', async () => {
        const response = await request(app).post('/api/getClasses').expect(200);

        let classes;
        try {
          classes = JSON.parse(JSON.parse(response.text));
        } catch {
          classes = JSON.parse(response.text);
        }
        expect(Array.isArray(classes)).toBe(true);
        expect(classes).toHaveLength(1);
        expect(classes[0]).toHaveProperty('name', 'Beginner Piano');
      });
    });

    describe('POST /api/getRooms', () => {
      test('should return list of rooms', async () => {
        const response = await request(app).post('/api/getRooms').expect(200);

        let rooms;
        try {
          rooms = JSON.parse(JSON.parse(response.text));
        } catch {
          rooms = JSON.parse(response.text);
        }
        expect(Array.isArray(rooms)).toBe(true);
        expect(rooms).toHaveLength(1);
        expect(rooms[0]).toHaveProperty('name', 'Piano Room');
      });
    });

    describe('POST /api/testConnection', () => {
      test('should test Google Sheets connection', async () => {
        const response = await request(app).post('/api/testConnection').expect(200);

        let result;
        try {
          result = JSON.parse(JSON.parse(response.text));
        } catch {
          result = JSON.parse(response.text);
        }
        expect(result).toHaveProperty('success', true);
        expect(result).toHaveProperty('spreadsheetTitle', 'Test Spreadsheet');
        expect(result).toHaveProperty('availableSheets');
        expect(Array.isArray(result.availableSheets)).toBe(true);
      });
    });

    describe('POST /api/testSheetData', () => {
      test('should test sheet data retrieval', async () => {
        const response = await request(app)
          .post('/api/testSheetData')
          .send({ sheetName: 'Students' })
          .expect(200);

        let result;
        try {
          result = JSON.parse(JSON.parse(response.text));
        } catch {
          result = JSON.parse(response.text);
        }
        expect(result).toHaveProperty('success', true);
        expect(result).toHaveProperty('sheetName', 'Students');
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for non-existent routes', async () => {
      const response = await request(app).get('/non-existent-route').expect(404);
    });

    test('should handle 404 for non-existent API endpoints', async () => {
      const response = await request(app).post('/api/non-existent-endpoint').expect(404);
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
