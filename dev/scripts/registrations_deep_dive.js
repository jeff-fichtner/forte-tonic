import { GoogleSheetsDbClient } from '../../src/database/googleSheetsDbClient.js';
import { Student } from '../../src/models/shared/student.js';
import { Parent } from '../../src/models/shared/parent.js';
import { Instructor } from '../../src/models/shared/instructor.js';
import { Registration } from '../../src/models/shared/registration.js';
import { configService } from '../../src/services/configurationService.js';
import { createLogger } from '../../src/utils/logger.js';

async function analyzeRegistrationsDeepDive() {
  console.log('🎯 REGISTRATIONS DEEP DIVE ANALYSIS');
  console.log('====================================\n');
  
  try {
    // Initialize logger and client
    const logger = createLogger(configService);
    const client = new GoogleSheetsDbClient(configService);
    
    console.log('✅ Client initialized successfully\n');

    // Get all raw registration data
    console.log('📊 FETCHING ALL REGISTRATION DATA...\n');
    
    const registrationsRaw = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.spreadsheetId,
      range: 'registrations!A1:Z100',
    });

    const registrationsAuditRaw = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.spreadsheetId,
      range: 'registrations_audit!A1:Z100',
    });

    const studentsRaw = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.spreadsheetId,
      range: 'students!A1:Z100',
    });

    const instructorsRaw = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.spreadsheetId,
      range: 'instructors!A1:Z100',
    });

    const classesRaw = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.spreadsheetId,
      range: 'classes!A1:Z100',
    });

    // Parse registrations data
    const regValues = registrationsRaw.data.values || [];
    const regHeaders = regValues[0] || [];
    const regRows = regValues.slice(1);

    console.log('🎼 REGISTRATIONS SHEET ANALYSIS');
    console.log('═══════════════════════════════');
    console.log(`📋 Headers (${regHeaders.length}):`, regHeaders);
    console.log(`📊 Data rows: ${regRows.length}\n`);

    // Analyze each registration in detail
    console.log('🔍 DETAILED REGISTRATION ANALYSIS:');
    console.log('──────────────────────────────────');
    
    regRows.forEach((row, index) => {
      if (row.length === 0) return;
      
      console.log(`\n📝 Registration ${index + 1}:`);
      regHeaders.forEach((header, i) => {
        if (row[i] !== undefined && row[i] !== '') {
          console.log(`   ${header}: "${row[i]}"`);
        }
      });
    });

    // Analyze composite key pattern
    console.log('\n\n🔑 COMPOSITE KEY ANALYSIS:');
    console.log('═════════════════════════');
    
    const compositeKeys = regRows.map(row => row[0]).filter(id => id);
    console.log(`📊 Total composite keys: ${compositeKeys.length}\n`);
    
    compositeKeys.forEach((key, index) => {
      const parts = key.split('_');
      console.log(`🗝️  Key ${index + 1}: "${key}"`);
      console.log(`   Parts (${parts.length}): [${parts.join('] [')  }]`);
      
      if (parts.length >= 4) {
        console.log(`   → StudentId: ${parts[0]}`);
        console.log(`   → InstructorId: ${parts[1]}`);
        console.log(`   → Day: ${parts[2]}`);
        console.log(`   → StartTime: ${parts[3]}`);
        if (parts.length > 4) {
          console.log(`   → Additional: ${parts.slice(4).join('_')}`);
        }
      }
      console.log('');
    });

    // Analyze registrations audit trail
    const auditValues = registrationsAuditRaw.data.values || [];
    const auditHeaders = auditValues[0] || [];
    const auditRows = auditValues.slice(1);

    console.log('\n📜 REGISTRATIONS AUDIT TRAIL:');
    console.log('═══════════════════════════');
    console.log(`📋 Audit headers (${auditHeaders.length}):`, auditHeaders);
    console.log(`📊 Audit rows: ${auditRows.length}\n`);

    auditRows.forEach((row, index) => {
      if (row.length === 0) return;
      
      console.log(`📋 Audit Entry ${index + 1}:`);
      console.log(`   ID: ${row[0] || 'N/A'}`);
      console.log(`   RegistrationId: ${row[1] || 'N/A'}`);
      console.log(`   StudentId: ${row[2] || 'N/A'}`);
      console.log(`   InstructorId: ${row[3] || 'N/A'}`);
      console.log(`   IsDeleted: ${row[18] || 'false'}`);
      console.log(`   DeletedAt: ${row[19] || 'N/A'}`);
      console.log(`   DeletedBy: ${row[20] || 'N/A'}`);
      console.log('');
    });

    // Cross-reference analysis
    console.log('\n🔗 CROSS-REFERENCE ANALYSIS:');
    console.log('════════════════════════════');
    
    const studentValues = studentsRaw.data.values || [];
    const instructorValues = instructorsRaw.data.values || [];
    const classValues = classesRaw.data.values || [];
    
    const studentIds = studentValues.slice(1).map(row => row[0]).filter(id => id);
    const instructorIds = instructorValues.slice(1).map(row => row[0]).filter(id => id);
    const classIds = classValues.slice(1).map(row => row[0]).filter(id => id);
    
    console.log(`📊 Available Students: ${studentIds.length}`);
    console.log(`📊 Available Instructors: ${instructorIds.length}`);
    console.log(`📊 Available Classes: ${classIds.length}\n`);

    // Validate relationships
    regRows.forEach((row, index) => {
      if (row.length === 0) return;
      
      const studentId = row[1];
      const instructorId = row[2];
      const classId = row[11]; // ClassId column
      
      console.log(`🔍 Registration ${index + 1} Validation:`);
      console.log(`   StudentId "${studentId}": ${studentIds.includes(studentId) ? '✅ Valid' : '❌ Missing'}`);
      console.log(`   InstructorId "${instructorId}": ${instructorIds.includes(instructorId) ? '✅ Valid' : '❌ Missing'}`);
      if (classId) {
        console.log(`   ClassId "${classId}": ${classIds.includes(classId) ? '✅ Valid' : '❌ Missing'}`);
      } else {
        console.log(`   ClassId: ⚪ Not specified (private lesson)`);
      }
      console.log('');
    });

    // Registration type analysis
    console.log('\n📊 REGISTRATION TYPE ANALYSIS:');
    console.log('═════════════════════════════');
    
    const typeCount = {};
    const instrumentCount = {};
    const dayCount = {};
    
    regRows.forEach(row => {
      if (row.length === 0) return;
      
      const type = row[6] || 'unknown'; // RegistrationType
      const instrument = row[8] || 'unknown'; // Instrument
      const day = row[3] || 'unknown'; // Day
      
      typeCount[type] = (typeCount[type] || 0) + 1;
      instrumentCount[instrument] = (instrumentCount[instrument] || 0) + 1;
      dayCount[day] = (dayCount[day] || 0) + 1;
    });
    
    console.log('📊 By Registration Type:');
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} registrations`);
    });
    
    console.log('\n🎵 By Instrument:');
    Object.entries(instrumentCount).forEach(([instrument, count]) => {
      console.log(`   ${instrument}: ${count} registrations`);
    });
    
    console.log('\n📅 By Day of Week:');
    Object.entries(dayCount).forEach(([day, count]) => {
      console.log(`   ${day}: ${count} registrations`);
    });

    console.log('\n✅ Registrations deep dive analysis complete!');

  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
    throw error;
  }
}

// Run the analysis
analyzeRegistrationsDeepDive()
  .then(() => {
    console.log('\n🎉 Registration analysis completed successfully!');
  })
  .catch((error) => {
    console.error('\n💥 Analysis failed:', error.message);
    process.exit(1);
  });
