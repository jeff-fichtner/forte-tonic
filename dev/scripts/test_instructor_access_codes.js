import { GoogleSheetsDbClient } from '../../src/database/googleSheetsDbClient.js';
import { configService } from '../../src/services/configurationService.js';
import { createLogger } from '../../src/utils/logger.js';
import { Instructor } from '../../src/models/shared/instructor.js';
import { Keys } from '../../src/utils/values/keys.js';

async function testInstructorAccessCodes() {
  console.log('🔍 Testing instructor access codes...\n');
  
  try {
    // Initialize logger first
    const logger = createLogger(configService);
    
    // Initialize client using the config service
    const client = new GoogleSheetsDbClient(configService);
    console.log('✅ Client initialized successfully\n');
    
    // Get raw instructor data
    const rawData = await client.getAllRecords(Keys.INSTRUCTORS);
    console.log(`📊 Found ${rawData.length} raw instructor records`);
    
    // Transform to Instructor objects
    const instructors = rawData.map(row => Instructor.fromDatabaseRow(row)).filter(x => !x.isDeactivated);
    console.log(`📊 Found ${instructors.length} active instructors\n`);
    
    // Check first few instructors
    console.log('🔍 First 3 instructor access codes:');
    instructors.slice(0, 3).forEach((instructor, index) => {
      console.log(`${index + 1}. ${instructor.firstName} ${instructor.lastName}`);
      console.log(`   Email: ${instructor.email}`);
      console.log(`   AccessCode: "${instructor.accessCode}" (type: ${typeof instructor.accessCode})`);
      console.log('');
    });
    
    // Look for specific access code
    const targetCode = '404833';
    const targetInstructor = instructors.find(i => i.accessCode === targetCode);
    console.log(`🎯 Looking for instructor with access code ${targetCode}:`);
    if (targetInstructor) {
      console.log(`✅ Found: ${targetInstructor.firstName} ${targetInstructor.lastName}`);
      console.log(`   Email: ${targetInstructor.email}`);
      console.log(`   AccessCode: "${targetInstructor.accessCode}"`);
    } else {
      console.log(`❌ Not found with access code ${targetCode}`);
      const availableCodes = instructors.map(i => i.accessCode).filter(Boolean);
      console.log(`Available access codes (${availableCodes.length}):`, availableCodes.slice(0, 10));
    }
    
    // Check raw data for position 32
    console.log('\n🔍 Raw data analysis for first few instructors:');
    rawData.slice(0, 2).forEach((row, index) => {
      console.log(`\nRow ${index + 1}:`);
      console.log(`  Row length: ${row.length}`);
      console.log(`  Position 32 (AccessCode): "${row[32]}"`);
      console.log(`  Last 3 columns: [${row.slice(-3).map(v => `"${v}"`).join(', ')}]`);
    });
    
  } catch (error) {
    console.error('❌ Error testing instructor access codes:', error);
  }
}

testInstructorAccessCodes();
