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

// Mock the GoogleSheetsDbClient
jest.unstable_mockModule('../../src/database/googleSheetsDbClient.js', () => ({
  GoogleSheetsDbClient: jest.fn().mockImplementation(() => ({
    spreadsheetId: 'test-sheet-id',
    getAllRecords: jest.fn().mockResolvedValue([]),
    readRange: jest.fn().mockResolvedValue([]),
    writeRange: jest.fn().mockResolvedValue({}),
    updateRange: jest.fn().mockResolvedValue({}),
    deleteRange: jest.fn().mockResolvedValue({}),
  })),
}));

// Mock the email client
jest.unstable_mockModule('../../src/email/emailClient.js', () => ({
  EmailClient: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue({ success: true }),
  })),
}));

// Create mock user repository with detailed instructor data
const mockUserRepository = {
  getAdmins: jest.fn().mockResolvedValue([]),
  getAdminByEmail: jest.fn().mockResolvedValue(null),
  getAdminByAccessCode: jest.fn().mockImplementation(accessCode => {
    const admins = [
      {
        id: 'admin1@test.com',
        email: 'admin1@test.com',
        firstName: 'Admin',
        lastName: 'User',
        accessCode: '111111',
        isActive: true,
      },
    ];
    const found = admins.find(a => a.accessCode === accessCode);
    return Promise.resolve(found || null);
  }),
  getInstructors: jest.fn().mockResolvedValue([
    {
      id: 'INSTRUCTOR1@TEST.COM',
      email: 'instructor1@test.com',
      firstName: 'John',
      lastName: 'Instructor',
      accessCode: '654321',
      specialties: ['Piano', 'Guitar'],
      isActive: true,
      phoneNumber: '555-0001',
      availability: {
        monday: { isAvailable: true, startTime: '09:00', endTime: '17:00', roomId: 'ROOM1' },
        tuesday: { isAvailable: true, startTime: '09:00', endTime: '17:00', roomId: 'ROOM1' },
      },
      gradeRange: { minimum: 1, maximum: 12 },
    },
    {
      id: 'INSTRUCTOR2@TEST.COM',
      email: 'instructor2@test.com',
      firstName: 'Jane',
      lastName: 'Teacher',
      accessCode: '789012',
      specialties: ['Violin', 'Viola'],
      isActive: true,
      phoneNumber: '555-0002',
    },
  ]),
  getInstructorById: jest.fn().mockResolvedValue(null),
  getInstructorByEmail: jest.fn().mockResolvedValue(null),
  getInstructorByAccessCode: jest.fn().mockImplementation(accessCode => {
    const instructors = [
      {
        id: 'INSTRUCTOR1@TEST.COM',
        email: 'instructor1@test.com',
        firstName: 'John',
        lastName: 'Instructor',
        accessCode: '654321',
        specialties: ['Piano', 'Guitar'],
        isActive: true,
        phoneNumber: '555-0001',
        availability: {
          monday: { isAvailable: true, startTime: '09:00', endTime: '17:00', roomId: 'ROOM1' },
          tuesday: { isAvailable: true, startTime: '09:00', endTime: '17:00', roomId: 'ROOM1' },
        },
        gradeRange: { minimum: 1, maximum: 12 },
      },
      {
        id: 'INSTRUCTOR2@TEST.COM',
        email: 'instructor2@test.com',
        firstName: 'Jane',
        lastName: 'Teacher',
        accessCode: '789012',
        specialties: ['Violin', 'Viola'],
        isActive: true,
        phoneNumber: '555-0002',
      },
    ];

    const found = instructors.find(i => i.accessCode === accessCode);
    return Promise.resolve(found || null);
  }),
  getStudents: jest.fn().mockResolvedValue([]),
  getStudentById: jest.fn().mockResolvedValue(null),
  getParents: jest.fn().mockResolvedValue([]),
  getParentByEmail: jest.fn().mockResolvedValue(null),
  getParentByAccessCode: jest.fn().mockImplementation(accessCode => {
    const parents = [
      {
        id: 'PARENT1',
        email: 'parent1@test.com',
        firstName: 'Parent',
        lastName: 'One',
        accessCode: '222222',
        phone: '555-1234',
        isActive: true,
      },
    ];
    const found = parents.find(p => p.accessCode === accessCode);
    return Promise.resolve(found || null);
  }),
  getUserByAccessCode: jest.fn().mockResolvedValue(null),
  getRooms: jest.fn().mockResolvedValue([]),
  getRoomById: jest.fn().mockResolvedValue(null),
};

// Mock the service container
jest.unstable_mockModule('../../src/infrastructure/container/serviceContainer.js', () => ({
  serviceContainer: {
    get: jest.fn().mockImplementation(serviceName => {
      if (serviceName === 'userRepository') {
        return mockUserRepository;
      }
      if (serviceName === 'programRepository') {
        return {
          findAll: jest.fn().mockResolvedValue([]),
          findById: jest.fn().mockResolvedValue(null),
        };
      }
      return {};
    }),
    register: jest.fn(),
    has: jest.fn().mockReturnValue(true),
  },
}));

// Import the app after all mocks are set up
const { default: app } = await import('../../src/app.js');

describe('Integration Test: GET /api/getInstructorByAccessCode', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Enable detailed console logging for debugging
  });

  afterEach(() => {});

  describe('Success Cases', () => {
    test('should return instructor data for valid access code', async () => {
      // BREAKPOINT: Add debugger statement for debugging
      // debugger;

      const accessCode = '654321';
      const expectedInstructor = {
        id: 'INSTRUCTOR1@TEST.COM',
        email: 'instructor1@test.com',
        firstName: 'John',
        lastName: 'Instructor',
        accessCode: '654321',
        specialties: ['Piano', 'Guitar'],
        isActive: true,
        phoneNumber: '555-0001',
      };
      const response = await request(app)
        .get(`/api/instructors/by-access-code/${accessCode}`)
        .expect(200);
      // BREAKPOINT: Examine response data
      // debugger;

      // Verify the wrapped response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', expectedInstructor.id);
      expect(response.body.data).toHaveProperty('email', expectedInstructor.email);
      expect(response.body.data).toHaveProperty('firstName', expectedInstructor.firstName);
      expect(response.body.data).toHaveProperty('lastName', expectedInstructor.lastName);
      expect(response.body.data).toHaveProperty('accessCode', expectedInstructor.accessCode);

      // Verify repository was called correctly
      expect(mockUserRepository.getInstructorByAccessCode).toHaveBeenCalledWith(accessCode);
      expect(mockUserRepository.getInstructorByAccessCode).toHaveBeenCalledTimes(1);
    });

    test('should return second instructor for different valid access code', async () => {
      // BREAKPOINT: Test with different instructor
      // debugger;

      const accessCode = '789012';

      const response = await request(app)
        .get(`/api/instructors/by-access-code/${accessCode}`)
        .expect(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', 'INSTRUCTOR2@TEST.COM');
      expect(response.body.data).toHaveProperty('firstName', 'Jane');
      expect(response.body.data).toHaveProperty('lastName', 'Teacher');
      expect(response.body.data).toHaveProperty('accessCode', '789012');
    });
  });

  describe('Error Cases', () => {
    test('should return 404 when instructor not found', async () => {
      // BREAKPOINT: Test not found scenario
      // debugger;

      const accessCode = '999999';

      const response = await request(app)
        .get(`/api/instructors/by-access-code/${accessCode}`)
        .expect(404);
      // Updated to expect standardized error format
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty(
        'message',
        'Instructor not found with provided access code'
      );
      expect(response.body.error).toHaveProperty('type', 'not_found');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');

      // Verify repository was called but found nothing
      expect(mockUserRepository.getInstructorByAccessCode).toHaveBeenCalledWith(accessCode);
      expect(mockUserRepository.getInstructorByAccessCode).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    test('should handle access code with whitespace', async () => {
      // Override mock to handle trimmed input
      mockUserRepository.getInstructorByAccessCode.mockImplementationOnce(accessCode => {
        // In real implementation, this might be trimmed
        const trimmedCode = accessCode?.trim();

        if (trimmedCode === '654321') {
          return Promise.resolve({
            id: 'INSTRUCTOR1@TEST.COM',
            email: 'instructor1@test.com',
            firstName: 'John',
            lastName: 'Instructor',
            accessCode: '654321',
          });
        }

        return Promise.resolve(null);
      });

      const response = await request(app)
        .get('/api/instructors/by-access-code/  654321  ')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('firstName', 'John');
    });
  });

  describe('Service Integration', () => {
    test('should verify UserTransformService integration', async () => {
      // BREAKPOINT: Check service transformation
      // debugger;

      const response = await request(app).get('/api/instructors/by-access-code/654321').expect(200);

      // Verify wrapped response with transformed data structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).toHaveProperty('firstName');
      expect(response.body.data).toHaveProperty('lastName');

      // Check that transformation occurred (UserTransformService.transform was called)
    });
  });
});

describe('Integration Test: GET /api/admins/by-access-code/:accessCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Success Cases', () => {
    test('should return admin data for valid access code', async () => {
      const accessCode = '111111';

      const response = await request(app)
        .get(`/api/admins/by-access-code/${accessCode}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', 'admin1@test.com');
      expect(response.body.data).toHaveProperty('email', 'admin1@test.com');
      expect(response.body.data).toHaveProperty('firstName', 'Admin');
      expect(response.body.data).toHaveProperty('lastName', 'User');
      // Note: accessCode is not returned by UserTransformService.transformAdmin

      expect(mockUserRepository.getAdminByAccessCode).toHaveBeenCalledWith(accessCode);
      expect(mockUserRepository.getAdminByAccessCode).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Cases', () => {
    test('should return 404 when admin not found', async () => {
      const accessCode = '999999';

      const response = await request(app)
        .get(`/api/admins/by-access-code/${accessCode}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty(
        'message',
        'Admin not found with provided access code'
      );
      expect(response.body.error).toHaveProperty('type', 'not_found');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');

      expect(mockUserRepository.getAdminByAccessCode).toHaveBeenCalledWith(accessCode);
    });
  });
});

describe('Integration Test: GET /api/parents/by-access-code/:accessCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Success Cases', () => {
    test('should return parent data for valid access code', async () => {
      const accessCode = '222222';

      const response = await request(app)
        .get(`/api/parents/by-access-code/${accessCode}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', 'PARENT1');
      expect(response.body.data).toHaveProperty('email', 'parent1@test.com');
      expect(response.body.data).toHaveProperty('firstName', 'Parent');
      expect(response.body.data).toHaveProperty('lastName', 'One');
      // Note: accessCode is not returned by UserTransformService.transformParent
      expect(response.body.data).toHaveProperty('phone', '555-1234');

      expect(mockUserRepository.getParentByAccessCode).toHaveBeenCalledWith(accessCode);
      expect(mockUserRepository.getParentByAccessCode).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Cases', () => {
    test('should return 404 when parent not found', async () => {
      const accessCode = '999999';

      const response = await request(app)
        .get(`/api/parents/by-access-code/${accessCode}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty(
        'message',
        'Parent not found with provided access code'
      );
      expect(response.body.error).toHaveProperty('type', 'not_found');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');

      expect(mockUserRepository.getParentByAccessCode).toHaveBeenCalledWith(accessCode);
    });
  });
});
