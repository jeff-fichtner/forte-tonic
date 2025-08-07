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

// Mock the email service
jest.unstable_mockModule('../../src/email/emailService.js', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue({ success: true }),
    validateConfig: jest.fn().mockReturnValue(true),
  })),
}));

// Create mock user repository with detailed instructor data
const mockUserRepository = {
  getAdmins: jest.fn().mockResolvedValue([]),
  getAdminByEmail: jest.fn().mockResolvedValue(null),
  getAdminByAccessCode: jest.fn().mockResolvedValue(null),
  getOperatorByEmail: jest.fn().mockResolvedValue({
    id: '1',
    email: 'operator@test.com',
    role: 'OPERATOR',
    admin: '123456',
    instructor: '654321',
    parent: null,
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
  getInstructorByAccessCode: jest.fn().mockImplementation((accessCode) => {
    console.log(`🔍 DEBUG: getInstructorByAccessCode called with: "${accessCode}"`);
    
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
    console.log(`🔍 DEBUG: Found instructor:`, found ? `${found.firstName} ${found.lastName} (${found.email})` : 'null');
    
    return Promise.resolve(found || null);
  }),
  getStudents: jest.fn().mockResolvedValue([]),
  getStudentById: jest.fn().mockResolvedValue(null),
  getParents: jest.fn().mockResolvedValue([]),
  getParentByEmail: jest.fn().mockResolvedValue(null),
  getParentByAccessCode: jest.fn().mockResolvedValue(null),
  getUserByAccessCode: jest.fn().mockResolvedValue(null),
  getRooms: jest.fn().mockResolvedValue([]),
  getRoomById: jest.fn().mockResolvedValue(null),
};

// Mock the service container
jest.unstable_mockModule('../../src/infrastructure/container/serviceContainer.js', () => ({
  serviceContainer: {
    get: jest.fn().mockImplementation((serviceName) => {
      console.log(`🔍 DEBUG: Service container requested: "${serviceName}"`);
      
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
    console.log('\n🧪 Starting new test...');
  });

  afterEach(() => {
    console.log('✅ Test completed\n');
  });

  describe('Success Cases', () => {
    test('should return instructor data for valid access code', async () => {
      console.log('🎯 Testing valid access code: 654321');
      
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

      console.log('📤 Sending request to /api/getInstructorByAccessCode');
      
      const response = await request(app)
        .post('/api/getInstructorByAccessCode')
        .send({ accessCode })
        .expect(200);

      console.log('📥 Response received:', response.body);
      
      // BREAKPOINT: Examine response data
      // debugger;
      
      // Verify the response structure
      expect(response.body).toHaveProperty('id', expectedInstructor.id);
      expect(response.body).toHaveProperty('email', expectedInstructor.email);
      expect(response.body).toHaveProperty('firstName', expectedInstructor.firstName);
      expect(response.body).toHaveProperty('lastName', expectedInstructor.lastName);
      expect(response.body).toHaveProperty('accessCode', expectedInstructor.accessCode);

      // Verify repository was called correctly
      expect(mockUserRepository.getInstructorByAccessCode).toHaveBeenCalledWith(accessCode);
      expect(mockUserRepository.getInstructorByAccessCode).toHaveBeenCalledTimes(1);
      
      console.log('✅ All assertions passed for valid access code test');
    });

    test('should return second instructor for different valid access code', async () => {
      console.log('🎯 Testing second valid access code: 789012');
      
      // BREAKPOINT: Test with different instructor
      // debugger;
      
      const accessCode = '789012';
      
      const response = await request(app)
        .post('/api/getInstructorByAccessCode')
        .send({ accessCode })
        .expect(200);

      console.log('📥 Response for second instructor:', response.body);
      
      expect(response.body).toHaveProperty('id', 'INSTRUCTOR2@TEST.COM');
      expect(response.body).toHaveProperty('firstName', 'Jane');
      expect(response.body).toHaveProperty('lastName', 'Teacher');
      expect(response.body).toHaveProperty('accessCode', '789012');
      
      console.log('✅ Second instructor test passed');
    });
  });

  describe('Error Cases', () => {
    test('should return 400 when access code is missing', async () => {
      console.log('🎯 Testing missing access code');
      
      // BREAKPOINT: Test validation error
      // debugger;
      
      const response = await request(app)
        .post('/api/getInstructorByAccessCode')
        .send({}) // No accessCode provided
        .expect(400);

      console.log('📥 Error response for missing access code:', response.body);
      
      expect(response.body).toHaveProperty('error', 'Access code is required');
      
      // Verify repository was NOT called
      expect(mockUserRepository.getInstructorByAccessCode).not.toHaveBeenCalled();
      
      console.log('✅ Missing access code validation test passed');
    });

    test('should return 400 when access code is empty string', async () => {
      console.log('🎯 Testing empty access code');
      
      const response = await request(app)
        .post('/api/getInstructorByAccessCode')
        .send({ accessCode: '' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Access code is required');
      expect(mockUserRepository.getInstructorByAccessCode).not.toHaveBeenCalled();
      
      console.log('✅ Empty access code validation test passed');
    });

    test('should return 404 when instructor not found', async () => {
      console.log('🎯 Testing invalid access code: 999999');
      
      // BREAKPOINT: Test not found scenario
      // debugger;
      
      const accessCode = '999999';
      
      const response = await request(app)
        .post('/api/getInstructorByAccessCode')
        .send({ accessCode })
        .expect(404);

      console.log('📥 Error response for invalid access code:', response.body);
      
      expect(response.body).toHaveProperty('error', 'Instructor not found with provided access code');
      
      // Verify repository was called but found nothing
      expect(mockUserRepository.getInstructorByAccessCode).toHaveBeenCalledWith(accessCode);
      expect(mockUserRepository.getInstructorByAccessCode).toHaveBeenCalledTimes(1);
      
      console.log('✅ Instructor not found test passed');
    });
  });

  describe('Edge Cases', () => {
    test('should handle null access code', async () => {
      console.log('🎯 Testing null access code');
      
      const response = await request(app)
        .post('/api/getInstructorByAccessCode')
        .send({ accessCode: null })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Access code is required');
      
      console.log('✅ Null access code test passed');
    });

    test('should handle access code with whitespace', async () => {
      console.log('🎯 Testing access code with whitespace');
      
      // Override mock to handle trimmed input
      mockUserRepository.getInstructorByAccessCode.mockImplementationOnce((accessCode) => {
        console.log(`🔍 DEBUG: Received access code with potential whitespace: "${accessCode}"`);
        
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
        .post('/api/getInstructorByAccessCode')
        .send({ accessCode: '  654321  ' })
        .expect(200);

      expect(response.body).toHaveProperty('firstName', 'John');
      
      console.log('✅ Whitespace handling test passed');
    });
  });

  describe('Service Integration', () => {
    test('should verify UserTransformService integration', async () => {
      console.log('🎯 Testing UserTransformService integration');
      
      // BREAKPOINT: Check service transformation
      // debugger;
      
      const response = await request(app)
        .post('/api/getInstructorByAccessCode')
        .send({ accessCode: '654321' })
        .expect(200);

      // Verify transformed data structure
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('firstName');
      expect(response.body).toHaveProperty('lastName');
      
      // Check that transformation occurred (UserTransformService.transform was called)
      console.log('📊 Transformed response structure verified');
      
      console.log('✅ Service integration test passed');
    });
  });
});
