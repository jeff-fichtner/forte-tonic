#!/usr/bin/env node

/**
 * Simple Google Sheets Connection Test
 * This helps debug the GaxiosError: Request failed with status code 500
 */

console.log('🔍 Testing Google Sheets Connection...');
console.log('=' .repeat(50));

async function testConnection() {
  try {
    // Import the client
    const { GoogleSheetsDbClient } = await import('../../src/database/googleSheetsDbClient.js');
    
    console.log('✅ GoogleSheetsDbClient imported successfully');
    
    // Try to create the client
    const client = new GoogleSheetsDbClient();
    console.log('✅ GoogleSheetsDbClient instantiated successfully');
    
    // Try a simple operation
    console.log('🔍 Testing simple API call...');
    
    // This will try to get a small amount of data
    const testData = await client.getAllRecords('ROLES', x => x);
    
    console.log('✅ API call successful!');
    console.log('📊 Retrieved', testData.length, 'roles');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    
    if (error.message.includes('Request failed with status code 500')) {
      console.log('\n💡 Possible causes of Google Sheets API 500 error:');
      console.log('   1. API quota exceeded for today');
      console.log('   2. Spreadsheet is temporarily unavailable');
      console.log('   3. Service account permissions issue');
      console.log('   4. Google Sheets service is experiencing issues');
      console.log('\n💡 Solutions:');
      console.log('   1. Wait a few minutes and try again');
      console.log('   2. Check Google Cloud Console for quota usage');
      console.log('   3. Use the live server test instead: npm run test:debug-live');
    }
    
    console.log('\n📊 Error details:');
    console.log('   Type:', error.constructor.name);
    console.log('   Status:', error.status || 'N/A');
    console.log('   Code:', error.code || 'N/A');
  }
}

testConnection();
