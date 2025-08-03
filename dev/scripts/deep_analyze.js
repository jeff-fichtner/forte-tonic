import { google } from 'googleapis';
import fs from 'fs';

// SECURITY: Load spreadsheet ID from environment variables
// See dev/credentials/temp_credentials.json for development setup (gitignored)
const SPREADSHEET_ID = process.env.WORKING_SPREADSHEET_ID || 'PLACEHOLDER_SPREADSHEET_ID_LOAD_FROM_ENV';

async function deepAnalyzeSheets() {
  console.log('🔬 Deep Analysis of Tonic Music Program Data...\n');
  
  try {
    // Load credentials - handle both running from project root and from scripts directory
    const credentialsPath = fs.existsSync('../credentials/temp_credentials.json') 
      ? '../credentials/temp_credentials.json' 
      : 'dev/credentials/temp_credentials.json';
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    
    // Initialize Google Auth
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    console.log('📊 CURRENT DATA STRUCTURE ANALYSIS\n');

    // Analyze key relationships and data patterns
    const sheetData = {};

    // Get all data from each sheet
    const sheetNames = ['roles', 'admins', 'instructors', 'parents', 'students', 'classes', 'rooms', 'registrations', 'attendance'];
    
    for (const sheetName of sheetNames) {
      console.log(`📥 Loading ${sheetName} data...`);
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetName}!A1:Z1000`,
        });

        const values = response.data.values || [];
        if (values.length > 0) {
          const headers = values[0];
          const rows = values.slice(1);
          sheetData[sheetName] = { headers, rows };
          console.log(`   ✅ Loaded ${rows.length} rows with ${headers.length} columns`);
        }
      } catch (error) {
        console.log(`   ❌ Error loading ${sheetName}: ${error.message}`);
      }
    }

    console.log('\n📋 DATA RELATIONSHIP ANALYSIS\n');

    // Analyze Students -> Parents relationship
    if (sheetData.students && sheetData.parents) {
      console.log('👨‍👩‍👧‍👦 STUDENT-PARENT RELATIONSHIPS:');
      const students = sheetData.students.rows;
      const parents = sheetData.parents.rows;
      
      let studentsWithParents = 0;
      let orphanedStudents = 0;
      
      students.forEach((student, index) => {
        if (student.length < 8) return; // Skip incomplete rows
        
        const [id, studentId, lastName, firstName, lastNick, firstNick, grade, parent1Id, parent2Id] = student;
        
        if (parent1Id || parent2Id) {
          studentsWithParents++;
        } else {
          orphanedStudents++;
        }
      });
      
      console.log(`   Students with parent links: ${studentsWithParents}`);
      console.log(`   Students without parents: ${orphanedStudents}`);
      console.log(`   Total parents in system: ${parents.length}`);
    }

    // Analyze Registrations -> Students/Instructors relationship
    if (sheetData.registrations && sheetData.students && sheetData.instructors) {
      console.log('\n🎵 REGISTRATION ANALYSIS:');
      const registrations = sheetData.registrations.rows;
      const students = sheetData.students.rows;
      const instructors = sheetData.instructors.rows;
      
      console.log(`   Total registrations: ${registrations.length}`);
      
      // Analyze registration types
      const regTypes = {};
      const instruments = {};
      
      registrations.forEach(reg => {
        if (reg.length < 7) return;
        const [id, studentId, instructorId, day, startTime, length, regType, roomId, instrument] = reg;
        
        regTypes[regType] = (regTypes[regType] || 0) + 1;
        instruments[instrument] = (instruments[instrument] || 0) + 1;
      });
      
      console.log('   Registration types:', Object.entries(regTypes).map(([type, count]) => `${type}: ${count}`).join(', '));
      console.log('   Instruments:', Object.entries(instruments).map(([inst, count]) => `${inst}: ${count}`).join(', '));
    }

    // Analyze Attendance patterns
    if (sheetData.attendance) {
      console.log('\n📅 ATTENDANCE ANALYSIS:');
      const attendance = sheetData.attendance.rows;
      console.log(`   Attendance records: ${attendance.length}`);
      
      if (sheetData.attendance_audit) {
        const auditRecords = sheetData.attendance_audit.rows;
        console.log(`   Audit trail records: ${auditRecords.length}`);
      }
    }

    console.log('\n🏗️  SCHEMA ANALYSIS\n');

    // Compare with current code expectations
    console.log('📝 COMPARING WITH CURRENT CODE SCHEMA:');
    
    const expectedSchemas = {
      students: ['id', 'firstName', 'lastName', 'firstNickname', 'lastNickname', 'grade', 'parent1Id', 'parent2Id'],
      parents: ['id', 'firstName', 'lastName', 'email', 'phone'],
      instructors: ['id', 'firstName', 'lastName', 'email', 'phone'],
      classes: ['id', 'name', 'instructorId', 'roomId', 'dayOfWeek', 'startTime', 'endTime', 'instrument', 'lengthOption', 'maxStudents'],
      registrations: ['id', 'studentId', 'instructorId', 'classId', 'registrationType', 'schoolYear', 'trimester'],
    };

    Object.entries(expectedSchemas).forEach(([sheetName, expectedCols]) => {
      if (sheetData[sheetName]) {
        const actualCols = sheetData[sheetName].headers;
        console.log(`\n   ${sheetName.toUpperCase()}:`);
        console.log(`     Expected: [${expectedCols.join(', ')}]`);
        console.log(`     Actual:   [${actualCols.slice(0, 10).join(', ')}${actualCols.length > 10 ? '...' : ''}]`);
        
        // Find missing columns
        const missing = expectedCols.filter(col => !actualCols.some(actual => 
          actual.toLowerCase().replace(/\s+/g, '') === col.toLowerCase().replace(/\s+/g, '')
        ));
        
        if (missing.length > 0) {
          console.log(`     ⚠️  Missing: [${missing.join(', ')}]`);
        }
        
        // Find extra columns
        const extra = actualCols.filter(actual => !expectedCols.some(expected => 
          actual.toLowerCase().replace(/\s+/g, '') === expected.toLowerCase().replace(/\s+/g, '')
        ));
        
        if (extra.length > 0) {
          console.log(`     ➕ Extra: [${extra.slice(0, 5).join(', ')}${extra.length > 5 ? '...' : ''}]`);
        }
      }
    });

    console.log('\n✅ Deep analysis complete!');
    return sheetData;

  } catch (error) {
    console.error('❌ Error in deep analysis:', error.message);
    throw error;
  }
}

// Run the deep analysis
deepAnalyzeSheets()
  .then(() => {
    console.log('\n🎉 Deep analysis completed successfully!');
  })
  .catch((error) => {
    console.error('\n💥 Deep analysis failed:', error.message);
    process.exit(1);
  });
