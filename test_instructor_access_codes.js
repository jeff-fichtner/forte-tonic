#!/usr/bin/env node

/**
 * Debug script to test instructor access codes
 */

import { currentConfig } from './src/config/environment.js';
import { GoogleSheetsDbClient } from './src/database/googleSheetsDbClient.js';
import { Instructor } from './src/models/shared/instructor.js';
import { Keys } from './src/utils/values/keys.js';
import { configService } from './src/services/configurationService.js';
import { createLogger } from './src/utils/logger.js';

async function testInstructorAccessCodes() {
  try {
    console.log('🔍 Testing instructor access codes...');
    
    // Initialize logger
    const logger = createLogger(configService);
    
    // Initialize Google Sheets database client
    const dbClient = new GoogleSheetsDbClient(currentConfig.googleSheets);
    
    // Get raw instructor data
    const rawData = await dbClient.getAllRecords(Keys.INSTRUCTORS, row => row);
    console.log(`📊 Found ${rawData.length} raw instructor records`);
    
    // Transform to Instructor objects
    const instructors = rawData.map(row => Instructor.fromDatabaseRow(row)).filter(x => !x.isDeactivated);
    console.log(`📊 Found ${instructors.length} active instructors`);
    
    // Check first few instructors
    console.log('\n🔍 First 3 instructor access codes:');
    instructors.slice(0, 3).forEach((instructor, index) => {
      console.log(`${index + 1}. ${instructor.firstName} ${instructor.lastName}`);
      console.log(`   Email: ${instructor.email}`);
      console.log(`   AccessCode: ${instructor.accessCode}`);
      console.log(`   AccessCode type: ${typeof instructor.accessCode}`);
      console.log('');
    });
    
    // Look for specific access code
    const targetCode = '404833';
    const targetInstructor = instructors.find(i => i.accessCode === targetCode);
    console.log(`\n🎯 Looking for instructor with access code ${targetCode}:`);
    if (targetInstructor) {
      console.log(`✅ Found: ${targetInstructor.firstName} ${targetInstructor.lastName}`);
      console.log(`   Email: ${targetInstructor.email}`);
      console.log(`   AccessCode: ${targetInstructor.accessCode}`);
    } else {
      console.log(`❌ Not found with access code ${targetCode}`);
      console.log('Available access codes:', instructors.map(i => i.accessCode).filter(Boolean).slice(0, 10));
    }
    
    // Check raw data for the last column (position 32)
    console.log('\n🔍 Raw data analysis for first instructor:');
    const firstRawRow = rawData[0];
    console.log(`Raw row length: ${firstRawRow.length}`);
    console.log(`Position 32 (AccessCode): "${firstRawRow[32]}"`);
    console.log(`Position 31: "${firstRawRow[31]}"`);
    console.log(`Last few positions:`, firstRawRow.slice(-5));
    
    // Show all column values for debugging
    console.log('\n📋 All columns for first instructor:');
    firstRawRow.forEach((value, index) => {
      console.log(`  ${index}: "${value}"`);
    });
    
    // Let's also check a few more instructors to see if there's a pattern
    console.log('\n📋 Column count for first 5 instructors:');
    rawData.slice(0, 5).forEach((row, idx) => {
      console.log(`  Instructor ${idx + 1}: ${row.length} columns, last 3 values: [${row.slice(-3).join(', ')}]`);
    });
    
  } catch (error) {
    console.error('❌ Error testing instructor access codes:', error);
  }
}

testInstructorAccessCodes();
