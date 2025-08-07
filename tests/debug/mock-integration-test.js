#!/usr/bin/env node

/**
 * Mock Integration Test for getInstructorByAccessCode Route
 * This test uses mocks to avoid Google Sheets API calls
 */

import { jest } from '@jest/globals';

// Set test environment before imports
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'debug';

console.log('🚀 Mock Integration Test for getInstructorByAccessCode');
console.log('=' .repeat(60));

// Mock the Google Sheets client before importing anything
const mockGoogleSheetsDbClient = {
  getAllRecords: jest.fn(),
};

const mockServiceContainer = {
  userRepository: {
    getInstructorByAccessCode: jest.fn(),
  }
};

// Mock the modules
jest.unstable_mockModule('../../src/database/googleSheetsDbClient.js', () => ({
  GoogleSheetsDbClient: jest.fn(() => mockGoogleSheetsDbClient),
}));

jest.unstable_mockModule('../../src/infrastructure/container/serviceContainer.js', () => ({
  serviceContainer: {
    get: jest.fn((key) => {
      if (key === 'userRepository') {
        return mockServiceContainer.userRepository;
      }
      return {};
    }),
    register: jest.fn(),
    // Add other methods that might be called
    initialize: jest.fn(),
  }
}));

const TEST_SCENARIOS = [
  {
    name: 'Valid Instructor Found',
    accessCode: '123456',
    mockInstructor: {
      id: 'TEACHER1@EMAIL.COM',
      firstName: 'Alice',
      lastName: 'Teacher',
      email: 'teacher1@test.com',
      specialties: ['Piano', 'Violin'],
    },
    expectedStatus: 200,
  },
  {
    name: 'Instructor Not Found',
    accessCode: '999999',
    mockInstructor: null,
    expectedStatus: 404,
  },
  {
    name: 'Missing Access Code',
    accessCode: null,
    mockInstructor: null,
    expectedStatus: 400,
  },
];

async function setupMocks() {
  console.log('🔧 Setting up mocks...');
  
  // Mock UserTransformService
  jest.unstable_mockModule('../../src/services/userTransformService.js', () => ({
    UserTransformService: {
      transform: jest.fn((data, type) => ({
        ...data,
        type: type,
        transformed: true,
      })),
    }
  }));
  
  console.log('✅ Mocks setup complete');
}

async function testScenario(scenario) {
  console.log(`\n🧪 ${scenario.name}`);
  console.log('─'.repeat(50));
  
  try {
    // Setup mock response
    mockServiceContainer.userRepository.getInstructorByAccessCode
      .mockResolvedValueOnce(scenario.mockInstructor);
    
    // Import modules after mocking
    const request = (await import('supertest')).default;
    const { default: app } = await import('../../src/app.js');
    
    // Prepare request body
    const requestBody = scenario.accessCode !== null ? 
      { accessCode: scenario.accessCode } : 
      {};
    
    console.log('📤 Request body:', JSON.stringify(requestBody));
    
    // Make request
    const response = await request(app)
      .post('/api/getInstructorByAccessCode')
      .send(requestBody);
    
    console.log(`📥 Response status: ${response.status}`);
    console.log(`📥 Response body:`, response.body);
    
    // Verify status
    const statusMatch = response.status === scenario.expectedStatus;
    console.log(`${statusMatch ? '✅' : '❌'} Status: ${response.status} (expected: ${scenario.expectedStatus})`);
    
    // Verify mock was called correctly
    if (scenario.accessCode !== null) {
      const mockCalls = mockServiceContainer.userRepository.getInstructorByAccessCode.mock.calls;
      const lastCall = mockCalls[mockCalls.length - 1];
      const calledWithCorrectCode = lastCall && lastCall[0] === scenario.accessCode;
      console.log(`${calledWithCorrectCode ? '✅' : '❌'} Repository called with: ${lastCall?.[0]} (expected: ${scenario.accessCode})`);
    }
    
    // Verify response content
    if (scenario.expectedStatus === 200 && scenario.mockInstructor) {
      const hasInstructorData = response.body.firstName && response.body.lastName;
      console.log(`${hasInstructorData ? '✅' : '❌'} Response contains instructor data`);
    } else if (scenario.expectedStatus >= 400) {
      const hasError = response.body.error;
      console.log(`${hasError ? '✅' : '❌'} Response contains error message: ${response.body.error}`);
    }
    
    return statusMatch;
    
  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
    return false;
  }
}

async function runMockTests() {
  try {
    await setupMocks();
    
    let passedTests = 0;
    
    for (const scenario of TEST_SCENARIOS) {
      const passed = await testScenario(scenario);
      if (passed) {
        passedTests++;
      }
      
      // Clear mocks between tests
      jest.clearAllMocks();
    }
    
    // Summary
    console.log('\n📊 Test Summary');
    console.log('═'.repeat(30));
    console.log(`✅ Passed: ${passedTests}/${TEST_SCENARIOS.length}`);
    console.log(`❌ Failed: ${TEST_SCENARIOS.length - passedTests}/${TEST_SCENARIOS.length}`);
    
    if (passedTests === TEST_SCENARIOS.length) {
      console.log('\n🎉 All mock tests passed!');
      process.exit(0);
    } else {
      console.log('\n💔 Some tests failed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

// Run the test
runMockTests();
