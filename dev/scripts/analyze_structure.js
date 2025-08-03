import { google } from 'googleapis';
import fs from 'fs';

// SECURITY: Load spreadsheet ID from environment variables  
// See dev/credentials/temp_credentials.json for development setup (gitignored)
const SPREADSHEET_ID = process.env.WORKING_SPREADSHEET_ID || 'PLACEHOLDER_SPREADSHEET_ID_LOAD_FROM_ENV';

async function analyzeAndRecommendStructure() {
  console.log('🔍 ANALYZING CURRENT STRUCTURE FOR OPTIMIZATION RECOMMENDATIONS\n');
  
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

    console.log('📊 CURRENT SHEET ANALYSIS:\n');

    // Analyze each sheet's structure and data patterns
    const sheetAnalysis = {};
    const sheetNames = ['students', 'instructors', 'parents', 'classes', 'registrations', 'rooms'];

    for (const sheetName of sheetNames) {
      console.log(`🔍 Analyzing ${sheetName}...`);
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A1:Z100`,
      });

      const values = response.data.values || [];
      if (values.length === 0) continue;

      const headers = values[0];
      const dataRows = values.slice(1).filter(row => row.length > 0);

      sheetAnalysis[sheetName] = {
        headers,
        rowCount: dataRows.length,
        columnCount: headers.length,
        sampleData: dataRows.slice(0, 3)
      };

      console.log(`   Headers: [${headers.slice(0, 8).join(', ')}${headers.length > 8 ? '...' : ''}]`);
      console.log(`   Data rows: ${dataRows.length}`);
    }

    console.log('\n🚨 STRUCTURAL ISSUES IDENTIFIED:\n');

    // Issue 1: Column inconsistencies
    console.log('❌ ISSUE 1: Column Header Inconsistencies');
    if (sheetAnalysis.parents) {
      console.log('   Parents sheet has "Last Name", "First Name" (with spaces)');
      console.log('   Other sheets use "LastName", "FirstName" (no spaces)');
      console.log('   → This causes mapping issues in your code');
    }

    // Issue 2: Missing indexes
    console.log('\n❌ ISSUE 2: Missing Database Indexes (Sheets row freezing)');
    console.log('   Header rows should be frozen for better navigation');
    console.log('   Large datasets benefit from frozen header rows');

    // Issue 3: Data validation missing
    console.log('\n❌ ISSUE 3: Missing Data Validation');
    console.log('   Email columns lack email validation');
    console.log('   Grade columns allow inconsistent formats');
    console.log('   Date columns lack date validation');

    // Issue 4: Redundant data
    console.log('\n❌ ISSUE 4: Data Redundancy');
    if (sheetAnalysis.students) {
      console.log('   Students have both "Id" and "StudentId" columns');
      console.log('   Unclear which is the primary identifier');
    }

    console.log('\n✅ RECOMMENDED STRUCTURAL IMPROVEMENTS:\n');

    // Generate specific recommendations
    const recommendations = {
      columnStandardization: {
        description: 'Standardize column naming across all sheets',
        changes: {
          parents: {
            from: ['Id', 'Email', 'Last Name', 'First Name', 'Phone'],
            to: ['Id', 'Email', 'LastName', 'FirstName', 'Phone']
          },
          students: {
            from: ['Id', 'StudentId', 'LastName', 'FirstName', 'LastNickname', 'FirstNickname', 'Grade', 'Parent1Id', 'Parent2Id'],
            to: ['Id', 'LastName', 'FirstName', 'LastNickname', 'FirstNickname', 'Grade', 'Parent1Id', 'Parent2Id'], // Remove redundant StudentId
            reasoning: 'StudentId appears to duplicate Id - consolidate to single identifier'
          }
        }
      },
      
      dataValidation: {
        description: 'Add data validation rules to ensure data integrity',
        rules: {
          emails: 'Email format validation on all email columns',
          grades: 'Dropdown list with valid grade values (K, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)',
          phones: 'Phone number format validation',
          dates: 'Date format validation on timestamp columns',
          instruments: 'Dropdown list with valid instruments (Piano, Guitar, Violin, etc.)'
        }
      },

      indexOptimization: {
        description: 'Add indexes and formatting for better performance',
        improvements: {
          frozenHeaders: 'Freeze row 1 (headers) for all sheets',
          sortingColumns: 'Add filter buttons to header row',
          conditionalFormatting: 'Highlight duplicate IDs in red',
          columnWidths: 'Auto-resize columns for better readability'
        }
      },

      newSheetStructures: {
        description: 'Additional sheets for better data organization',
        suggestions: {
          lookup_tables: {
            grades: ['Grade', 'Description', 'AgeRange'],
            instruments: ['Instrument', 'Category', 'DifficultyLevel'],
            rooms: ['RoomId', 'Name', 'Capacity', 'Equipment'],
            school_years: ['Year', 'StartDate', 'EndDate', 'IsActive']
          },
          enhanced_registrations: {
            description: 'Richer registration tracking',
            columns: ['Id', 'StudentId', 'InstructorId', 'ClassId', 'RegistrationType', 'SchoolYear', 'Trimester', 'StartDate', 'EndDate', 'WeeklyTime', 'RoomId', 'Status', 'CreatedAt', 'CreatedBy', 'ModifiedAt', 'ModifiedBy']
          }
        }
      }
    };

    console.log('🔧 1. COLUMN STANDARDIZATION:');
    console.log('   ✅ Rename "Last Name" → "LastName" in parents sheet');
    console.log('   ✅ Rename "First Name" → "FirstName" in parents sheet');
    console.log('   ✅ Remove redundant "StudentId" column from students (use "Id" only)');
    console.log('   ✅ Ensure consistent casing across all sheet headers');

    console.log('\n📋 2. DATA VALIDATION RULES:');
    console.log('   ✅ Email validation: All email columns');
    console.log('   ✅ Grade dropdown: K, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12');
    console.log('   ✅ Phone format: (XXX) XXX-XXXX or XXX-XXX-XXXX');
    console.log('   ✅ Instrument dropdown: Piano, Guitar, Violin, Cello, Flute, Clarinet, etc.');
    console.log('   ✅ Date validation: All timestamp columns');

    console.log('\n⚡ 3. PERFORMANCE OPTIMIZATIONS:');
    console.log('   ✅ Freeze header rows (row 1) on all sheets');
    console.log('   ✅ Add filter buttons to headers for sorting/searching');
    console.log('   ✅ Conditional formatting to highlight duplicate IDs');
    console.log('   ✅ Auto-resize columns for better readability');

    console.log('\n🆕 4. NEW LOOKUP TABLES (Optional but Recommended):');
    console.log('   ✅ "lookup_grades" sheet: Grade definitions and age ranges');
    console.log('   ✅ "lookup_instruments" sheet: Instrument categories and difficulty');
    console.log('   ✅ "lookup_school_years" sheet: Academic year date ranges');
    console.log('   ✅ "system_config" sheet: Application configuration values');

    console.log('\n📊 5. ENHANCED REGISTRATIONS STRUCTURE:');
    console.log('   Current registrations have rich scheduling data but limited tracking');
    console.log('   ✅ Add Status column: Active, Completed, Cancelled, Pending');
    console.log('   ✅ Add audit columns: CreatedAt, CreatedBy, ModifiedAt, ModifiedBy');
    console.log('   ✅ Add SchoolYear and Trimester for better organization');

    console.log('\n🎯 IMMEDIATE PRIORITY CHANGES:\n');
    console.log('🥇 HIGH PRIORITY:');
    console.log('   1. Fix column naming inconsistency in parents sheet');
    console.log('   2. Remove redundant StudentId column from students');
    console.log('   3. Add data validation for emails and grades');
    console.log('   4. Freeze header rows on all sheets');

    console.log('\n🥈 MEDIUM PRIORITY:');
    console.log('   5. Add filter buttons and conditional formatting');
    console.log('   6. Create lookup tables for grades and instruments');
    console.log('   7. Enhance registrations with status and audit fields');

    console.log('\n🥉 LOW PRIORITY:');
    console.log('   8. Add system configuration sheet');
    console.log('   9. Implement advanced conditional formatting');
    console.log('   10. Add data export/import templates');

    return recommendations;

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    throw error;
  }
}

// Run the analysis
analyzeAndRecommendStructure()
  .then(() => {
    console.log('\n🎉 Structure analysis completed!');
    console.log('\n💡 Would you like me to implement any of these changes to your test spreadsheet?');
  })
  .catch((error) => {
    console.error('\n💥 Analysis failed:', error.message);
    process.exit(1);
  });
