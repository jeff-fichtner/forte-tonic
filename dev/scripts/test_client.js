import { GoogleSheetsDbClient } from '../../src/database/googleSheetsDbClient.js';
import { Student } from '../../src/models/shared/student.js';
import { Parent } from '../../src/models/shared/parent.js';
import { Instructor } from '../../src/models/shared/instructor.js';
import { Registration } from '../../src/models/shared/registration.js';
import { configService } from '../../src/services/configurationService.js';
import { createLogger } from '../../src/utils/logger.js';

// SECURITY: This file loads credentials from environment variables or dev/credentials/
// Never commit real credentials to version control!
// See dev/credentials/temp_credentials.json for development setup (gitignored)

async function testCurrentClient() {
  console.log('🧪 Testing Current GoogleSheetsDbClient Implementation...\n');
  
  try {
    // Initialize logger first
    const logger = createLogger(configService);
    
    // Initialize your existing client using the config service
    const client = new GoogleSheetsDbClient(configService);
    
    console.log('✅ Client initialized successfully\n');
    
    // Test performance of key operations
    console.log('📊 PERFORMANCE TESTING:\n');
    
    // Test 1: Get all students (using correct factory method)
    console.log('🎓 Testing getAllRecords for students...');
    const startStudents = Date.now();
    const students = await client.getAllRecords('students', x => Student.fromDatabaseRow(x));
    const endStudents = Date.now();
    console.log(`   ✅ Retrieved ${students.length} students in ${endStudents - startStudents}ms`);
    
    if (students.length > 0) {
      console.log(`   📋 Sample student: ${students[0].firstName} ${students[0].lastName} (ID: ${students[0].id})`);
    }
    
    // Test 2: Get all parents
    console.log('\n👨‍👩‍👧‍👦 Testing getAllRecords for parents...');
    const startParents = Date.now();
    const parents = await client.getAllRecords('parents', x => Parent.fromDatabaseRow(x));
    const endParents = Date.now();
    console.log(`   ✅ Retrieved ${parents.length} parents in ${endParents - startParents}ms`);
    
    if (parents.length > 0) {
      console.log(`   📋 Sample parent: ${parents[0].firstName} ${parents[0].lastName} (${parents[0].email})`);
    }
    
    // Test 3: Get all instructors
    console.log('\n👨‍🏫 Testing getAllRecords for instructors...');
    const startInstructors = Date.now();
    const instructors = await client.getAllRecords('instructors', x => Instructor.fromDatabaseRow(x));
    const endInstructors = Date.now();
    console.log(`   ✅ Retrieved ${instructors.length} instructors in ${endInstructors - startInstructors}ms`);
    
    if (instructors.length > 0) {
      console.log(`   📋 Sample instructor: ${instructors[0].firstName} ${instructors[0].lastName} (${instructors[0].email})`);
    }
    
    // Test 4: Get registrations
    console.log('\n📝 Testing getAllRecords for registrations...');
    const startRegs = Date.now();
    const registrations = await client.getAllRecords('registrations', x => Registration.fromDatabaseRow(x));
    const endRegs = Date.now();
    console.log(`   ✅ Retrieved ${registrations.length} registrations in ${endRegs - startRegs}ms`);
    
    if (registrations.length > 0) {
      console.log(`   📋 Sample registration: Student ${registrations[0].studentId} -> Instructor ${registrations[0].instructorId}`);
    }
    
    // Test 5: Test specific query
    if (students.length > 0 && students[0].id) {
      console.log('\n🔍 Testing getFromSheetByColumnValue...');
      const startQuery = Date.now();
      const specificStudent = await client.getFromSheetByColumnValue('students', 'id', students[0].id);
      const endQuery = Date.now();
      console.log(`   ✅ Found specific student in ${endQuery - startQuery}ms`);
      console.log(`   📋 Result: ${specificStudent.length} records found`);
    }
    
    console.log('\n📈 PERFORMANCE SUMMARY:');
    console.log(`   Students: ${endStudents - startStudents}ms for ${students.length} records`);
    console.log(`   Parents: ${endParents - startParents}ms for ${parents.length} records`);
    console.log(`   Instructors: ${endInstructors - startInstructors}ms for ${instructors.length} records`);
    console.log(`   Registrations: ${endRegs - startRegs}ms for ${registrations.length} records`);
    
    const totalTime = (endStudents - startStudents) + (endParents - startParents) + (endInstructors - startInstructors) + (endRegs - startRegs);
    console.log(`   Total time for all data: ${totalTime}ms`);
    
    return {
      students: students.length,
      parents: parents.length,
      instructors: instructors.length,
      registrations: registrations.length,
      totalTime
    };
    
  } catch (error) {
    console.error('❌ Error testing client:', error.message);
    console.error(error.stack);
    throw error;
  }
}

// Run the test
testCurrentClient()
  .then((results) => {
    console.log('\n🎉 Client testing completed successfully!');
    console.log('Results:', results);
  })
  .catch((error) => {
    console.error('\n💥 Client testing failed:', error.message);
    process.exit(1);
  });
