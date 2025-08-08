#!/usr/bin/env node

/**
 * Simple Debug Integration Test for getInstructorByAccessCode Route
 * This test runs directly without spawning processes to avoid hanging
 */

// Set test environment first
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'debug';

console.log('🚀 Starting Simple Debug Test for getInstructorByAccessCode');
console.log('=' .repeat(60));

import request from 'supertest';

const TEST_ACCESS_CODES = {
  VALID_INSTRUCTOR: '123456',
  INVALID_CODE: '999999',
  EMPTY_CODE: ''
};

let app;

async function initializeApp() {
  console.log('🔧 Initializing app...');
  
  try {
    // Import the app
    const appModule = await import('../../src/app.js');
    app = appModule.default;
    console.log('✅ App initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize app:', error.message);
    return false;
  }
}

async function testRoute() {
  console.log('\n🧪 Testing getInstructorByAccessCode route...');
  
  try {
    // Test with a valid-looking access code
    console.log('\n📝 Test 1: Testing with access code:', TEST_ACCESS_CODES.VALID_INSTRUCTOR);
    
    const response = await request(app)
      .post('/api/getInstructorByAccessCode')
      .send({ accessCode: TEST_ACCESS_CODES.VALID_INSTRUCTOR })
      .timeout(5000); // 5 second timeout
    
    console.log('📦 Response received:');
    console.log('   Status:', response.status);
    console.log('   Body:', JSON.stringify(response.body, null, 2));
    
    // Test with invalid access code
    console.log('\n📝 Test 2: Testing with invalid access code:', TEST_ACCESS_CODES.INVALID_CODE);
    
    const response2 = await request(app)
      .post('/api/getInstructorByAccessCode')
      .send({ accessCode: TEST_ACCESS_CODES.INVALID_CODE })
      .timeout(5000);
    
    console.log('📦 Response received:');
    console.log('   Status:', response2.status);
    console.log('   Body:', JSON.stringify(response2.body, null, 2));
    
    // Test with missing access code
    console.log('\n📝 Test 3: Testing with missing access code');
    
    const response3 = await request(app)
      .post('/api/getInstructorByAccessCode')
      .send({})
      .timeout(5000);
    
    console.log('📦 Response received:');
    console.log('   Status:', response3.status);
    console.log('   Body:', JSON.stringify(response3.body, null, 2));
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Tip: Make sure the server is not already running on the same port');
    }
    throw error;
  }
}

async function runTest() {
  try {
    const appReady = await initializeApp();
    if (!appReady) {
      process.exit(1);
    }
    
    await testRoute();
    
    console.log('\n🎉 Debug test completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Debug test failed:', error.message);
    console.error('\n📊 Debug info:');
    console.error('   Error type:', error.constructor.name);
    console.error('   Error code:', error.code);
    console.error('   Stack trace:', error.stack);
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
runTest();
