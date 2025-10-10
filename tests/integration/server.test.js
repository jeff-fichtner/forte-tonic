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
  getOperatorByEmail: jest.fn().mockResolvedValue({
    email: process.env.OPERATOR_EMAIL || 'test-operator@example.com',
    role: 'operator',
    admin: '123456', // Access code instead of email
    instructor: null,
    parent: null,
  }),
  getAdminByAccessCode: jest.fn().mockResolvedValue({
    id: '1',
    email: 'admin@test.com',
    firstName: 'Test',
    lastName: 'Admin',
    phone: '555-1234',
    accessCode: '123456',
  }),
  getInstructorByAccessCode: jest.fn().mockResolvedValue(null),
  getParentByAccessCode: jest.fn().mockResolvedValue(null),
  getAdminByEmail: jest.fn().mockResolvedValue({
    id: '1',
    email: 'admin@test.com',
    firstName: 'Test',
    lastName: 'Admin',
    phone: '555-1234',
  }),
  getInstructorByEmail: jest.fn().mockResolvedValue(null),
  getParentByEmail: jest.fn().mockResolvedValue(null),
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
  initializeRepositories: (req, res, next) => {
    req.dbClient = mockDbClient;
    req.userRepository = mockUserRepository;
    req.programRepository = mockProgramRepository;
    req.currentUser = {
      email: process.env.OPERATOR_EMAIL || 'test-operator@example.com',
      admin: { id: '1', email: 'admin@test.com', firstName: 'Test', lastName: 'Admin' },
      instructor: null,
      parent: null,
      roles: [],
      primaryRole: 'admin',
      displayName: 'Test Admin',
      operatorEmail: process.env.OPERATOR_EMAIL || 'test-operator@example.com',
      toJSON: function () {
        return {
          email: this.email,
          admin: this.admin,
          instructor: this.instructor,
          parent: this.parent,
          roles: this.roles,
          primaryRole: this.primaryRole,
          displayName: this.displayName,
        };
      },
    };
    req.user = req.currentUser; // For compatibility
    next();
  },
  getAuthenticatedUserEmail: jest.fn().mockImplementation(req => {
    return req.currentUser?.operatorEmail || req.currentUser?.email || 'test-operator@example.com';
  }),
  requireAuth: (req, res, next) => next(),
  requireOperator: (req, res, next) => next(),
}));

// Mock the service container
jest.unstable_mockModule('../../src/infrastructure/container/serviceContainer.js', () => ({
  serviceContainer: {
    initialize: jest.fn().mockResolvedValue(undefined),
    getUserRepository: jest.fn().mockReturnValue(mockUserRepository),
    get: jest.fn().mockImplementation(serviceName => {
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
                recommendedLessonDuration: 30,
              },
              {
                id: '2',
                firstName: 'Jane',
                lastName: 'Smith',
                grade: '8',
                ageCategory: 'middle',
                hasEmergencyContact: false,
                recommendedLessonDuration: 45,
              },
            ],
            totalCount: 2,
            page: 1,
            pageSize: 1000,
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
    describe('POST /api/getOperatorUser', () => {
      test('should return current user', async () => {
        const response = await request(app).post('/api/getOperatorUser').expect(200);

        // Handle double-stringified JSON from server
        let user;
        try {
          user = JSON.parse(JSON.parse(response.text));
        } catch {
          user = JSON.parse(response.text);
        }
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('primaryRole');
        expect(user).toHaveProperty('displayName');
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
        const response = await request(app).post('/api/getStudents').expect(200);

        let result;
        try {
          result = JSON.parse(JSON.parse(response.text));
        } catch {
          result = JSON.parse(response.text);
        }

        // Should return direct array like other user endpoints
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toHaveProperty('id');
        expect(result[0]).toHaveProperty('firstName');
        expect(result[0]).toHaveProperty('lastName');
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

    describe('POST /api/authenticateByAccessCode', () => {
      test('should return authenticated user for valid access code', async () => {
        // Mock the repository method to return an admin for this test
        mockUserRepository.getAdminByAccessCode.mockResolvedValueOnce({
          id: '1',
          email: 'admin@test.com',
          firstName: 'Test',
          lastName: 'Admin',
          phone: '555-1234',
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
          .post('/api/authenticateByAccessCode')
          .send({ accessCode: '123456' })
          .expect(200);

        let user;
        try {
          user = JSON.parse(JSON.parse(response.text));
        } catch {
          user = JSON.parse(response.text);
        }

        expect(user).toHaveProperty('email', 'admin@test.com');
        expect(user).toHaveProperty('admin');
        expect(user.admin).toHaveProperty('firstName', 'Test');
        expect(user).toHaveProperty('instructor', null);
        expect(user).toHaveProperty('parent', null);
      });

      test('should return null for invalid access code', async () => {
        // Mock all repository methods to return null/undefined
        mockUserRepository.getAdminByAccessCode.mockResolvedValueOnce(null);
        mockUserRepository.getInstructorByAccessCode.mockResolvedValueOnce(null);
        mockUserRepository.getParentByAccessCode.mockResolvedValueOnce(null);

        const response = await request(app)
          .post('/api/authenticateByAccessCode')
          .send({ accessCode: '999999' })
          .expect(200);

        expect(response.text).toBe('null');
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
