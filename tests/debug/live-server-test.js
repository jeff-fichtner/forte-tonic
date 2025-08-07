#!/usr/bin/env node

/**
 * Integration test that uses an existing running server
 * This avoids the hanging issue by testing against a live server
 */

import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:3000';
const API_ENDPOINT = `${SERVER_URL}/api/getInstructorByAccessCode`;

const TEST_CASES = [
  {
    name: 'Valid Access Code',
    accessCode: '123456',
    expectedStatus: [200, 404], // Either found or not found is OK
    description: 'Testing with a 6-digit access code'
  },
  {
    name: 'Invalid Access Code',
    accessCode: '999999',
    expectedStatus: [404],
    description: 'Testing with non-existent access code'
  },
  {
    name: 'Missing Access Code',
    accessCode: null,
    expectedStatus: [400],
    description: 'Testing with missing access code'
  },
  {
    name: 'Empty Access Code',
    accessCode: '',
    expectedStatus: [400],
    description: 'Testing with empty access code'
  }
];

async function checkServerHealth() {
  console.log('🔍 Checking if server is running...');
  
  try {
    const response = await fetch(`${SERVER_URL}/api/health`, {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      console.log('✅ Server is running and healthy');
      return true;
    } else {
      console.log('❌ Server is running but not healthy');
      return false;
    }
  } catch (error) {
    console.log('❌ Server is not running or not accessible');
    console.log('💡 Please start the server with: npm start');
    return false;
  }
}

async function runTestCase(testCase) {
  console.log(`\n🧪 ${testCase.name}`);
  console.log('─'.repeat(50));
  console.log(`📝 ${testCase.description}`);
  
  try {
    const body = testCase.accessCode !== null ? 
      { accessCode: testCase.accessCode } : 
      {};
    
    console.log('📤 Request body:', JSON.stringify(body));
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      timeout: 10000
    });
    
    const responseBody = await response.text();
    let parsedBody;
    
    try {
      parsedBody = JSON.parse(responseBody);
    } catch {
      parsedBody = responseBody;
    }
    
    console.log(`📥 Response status: ${response.status}`);
    console.log(`📥 Response body:`, parsedBody);
    
    // Check if status is expected
    const statusOk = testCase.expectedStatus.includes(response.status);
    const statusIndicator = statusOk ? '✅' : '❌';
    
    console.log(`${statusIndicator} Status check: ${response.status} (expected: ${testCase.expectedStatus.join(' or ')})`);
    
    // Additional validation based on status
    if (response.status === 200 && parsedBody) {
      console.log('✅ Success response contains data');
      if (parsedBody.firstName && parsedBody.lastName) {
        console.log(`👨‍🏫 Instructor found: ${parsedBody.firstName} ${parsedBody.lastName}`);
      }
    } else if (response.status === 404 && parsedBody?.error) {
      console.log('✅ 404 response contains error message:', parsedBody.error);
    } else if (response.status === 400 && parsedBody?.error) {
      console.log('✅ 400 response contains error message:', parsedBody.error);
    }
    
    return statusOk;
    
  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
    return false;
  }
}

async function runIntegrationTest() {
  console.log('🚀 Live Server Integration Test for getInstructorByAccessCode');
  console.log('═'.repeat(70));
  
  // Check if server is running
  const serverHealthy = await checkServerHealth();
  if (!serverHealthy) {
    console.log('\n❌ Cannot run tests - server is not available');
    process.exit(1);
  }
  
  let passedTests = 0;
  const totalTests = TEST_CASES.length;
  
  // Run all test cases
  for (const testCase of TEST_CASES) {
    const passed = await runTestCase(testCase);
    if (passed) {
      passedTests++;
    }
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('═'.repeat(30));
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n💔 Some tests failed');
    process.exit(1);
  }
}

// Add fetch polyfill check
if (!globalThis.fetch) {
  try {
    const { default: fetch } = await import('node-fetch');
    globalThis.fetch = fetch;
  } catch (error) {
    console.error('❌ node-fetch not available. Please install it: npm install node-fetch');
    process.exit(1);
  }
}

// Run the test
runIntegrationTest().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
