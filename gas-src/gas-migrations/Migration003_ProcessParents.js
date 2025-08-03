/**
 * Google Apps Script Migration 003: Process Parents
 * 
 * This script extracts parent information from student records and creates
 * separate parent records, then links them back to students.
 * 
 * To use:
 * 1. Open your Google Sheets document
 * 2. Go to Extensions > Apps Script
 * 3. Copy this entire file content into a new .gs file
 * 4. Run the main function: runProcessParents()
 */

/**
 * Main function to execute the parent processing migration
 * This will be the entry point when run from Google Apps Script
 */
function runProcessParents() {
  const migration = new ProcessParentsMigration();
  migration.execute();
}

/**
 * Preview function to check what changes would be made
 * Run this first to see what the migration will do
 */
function previewProcessParents() {
  const migration = new ProcessParentsMigration();
  migration.preview();
}

/**
 * Rollback function to undo the migration changes
 * Use this if you need to revert the changes
 */
function rollbackProcessParents() {
  const migration = new ProcessParentsMigration();
  migration.rollback();
}

/**
 * Migration class for processing parents from student data
 */
class ProcessParentsMigration {
  constructor() {
    this.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    this.description = 'Extract parent information from student records and create separate parent records';
  }

  /**
   * Preview what changes will be made (read-only)
   */
  preview() {
    console.log('🔍 MIGRATION PREVIEW: Process Parents');
    console.log('===================================');
    
    try {
      // Check if required sheets exist
      const studentsSheet = this.findStudentsSheet();
      const parentsSheet = this.spreadsheet.getSheetByName('parents');
      
      if (!studentsSheet) {
        console.log('❌ Error: No students sheet found');
        console.log('   Looking for sheets named: "students", "students-original"');
        return;
      }
      
      if (!parentsSheet) {
        console.log('❌ Error: "parents" sheet not found');
        console.log('   Please create a "parents" sheet first');
        return;
      }

      console.log('✅ Found required sheets');
      console.log(`   Students sheet: ${studentsSheet.getName()}`);
      console.log(`   Parents sheet: ${parentsSheet.getName()}`);

      // Analyze student data
      const studentData = this.getStudentData(studentsSheet);
      console.log(`\n📊 Analyzing ${studentData.length} student records...`);

      const parentAnalysis = this.analyzeParentData(studentData);
      
      console.log('\n📋 ANALYSIS RESULTS:');
      console.log(`   🔍 Total students analyzed: ${studentData.length}`);
      console.log(`   👨‍👩‍👧‍👦 Unique parents found: ${parentAnalysis.uniqueParents.size}`);
      console.log(`   📝 Student records with parent1: ${parentAnalysis.studentsWithParent1}`);
      console.log(`   📝 Student records with parent2: ${parentAnalysis.studentsWithParent2}`);
      console.log(`   ⚠️  Students with incomplete parent1 data: ${parentAnalysis.incompleteParent1}`);
      console.log(`   ⚠️  Students with incomplete parent2 data: ${parentAnalysis.incompleteParent2}`);

      if (parentAnalysis.uniqueParents.size === 0) {
        console.log('\n❌ No valid parent data found to process');
        return;
      }

      console.log('\n🔧 Migration will:');
      console.log(`   • Create ${parentAnalysis.uniqueParents.size} unique parent records`);
      console.log(`   • Update ${studentData.length} student records with parent IDs`);
      console.log(`   • Add parent ID columns to students sheet if missing`);

      // Show sample parent data
      const sampleParents = Array.from(parentAnalysis.uniqueParents.entries()).slice(0, 3);
      if (sampleParents.length > 0) {
        console.log('\n📋 SAMPLE PARENT RECORDS TO BE CREATED:');
        sampleParents.forEach(([id, parent], index) => {
          console.log(`   ${index + 1}. ${parent.firstName} ${parent.lastName} (${parent.email})`);
        });
      }

    } catch (error) {
      console.error('❌ Preview failed:', error.toString());
    }
  }

  /**
   * Execute the migration
   */
  execute() {
    console.log('🚀 EXECUTING MIGRATION: Process Parents');
    console.log('======================================');
    
    const results = {
      parentsCreated: 0,
      studentsUpdated: 0,
      columnsAdded: 0,
      errors: []
    };

    try {
      // Get required sheets
      const studentsSheet = this.findStudentsSheet();
      const parentsSheet = this.spreadsheet.getSheetByName('parents');
      
      if (!studentsSheet || !parentsSheet) {
        throw new Error('Required sheets not found');
      }

      // Get student data
      console.log('📊 Loading student data...');
      const studentData = this.getStudentData(studentsSheet);
      console.log(`   Found ${studentData.length} student records`);

      // Analyze and extract parent data
      console.log('\n👨‍👩‍👧‍👦 Processing parent information...');
      const parentAnalysis = this.analyzeParentData(studentData);
      
      console.log(`   Identified ${parentAnalysis.uniqueParents.size} unique parents`);

      // Add parent ID columns to students sheet if needed
      console.log('\n📝 Ensuring student sheet has parent ID columns...');
      const studentHeaders = studentsSheet.getRange(1, 1, 1, studentsSheet.getLastColumn()).getValues()[0];
      
      let parent1IdCol = studentHeaders.findIndex(h => h === 'Parent1Id') + 1;
      let parent2IdCol = studentHeaders.findIndex(h => h === 'Parent2Id') + 1;
      
      if (parent1IdCol === 0) {
        parent1IdCol = studentHeaders.length + 1;
        studentsSheet.getRange(1, parent1IdCol).setValue('Parent1Id');
        results.columnsAdded++;
        console.log(`   Added Parent1Id column at position ${parent1IdCol}`);
      }
      
      if (parent2IdCol === 0) {
        parent2IdCol = studentHeaders.length + (results.columnsAdded > 0 ? 2 : 1);
        studentsSheet.getRange(1, parent2IdCol).setValue('Parent2Id');
        results.columnsAdded++;
        console.log(`   Added Parent2Id column at position ${parent2IdCol}`);
      }

      // Create parent records
      console.log('\n🔄 Creating parent records...');
      const parentHeaders = parentsSheet.getRange(1, 1, 1, parentsSheet.getLastColumn()).getValues()[0];
      
      // Ensure parents sheet has proper headers
      if (parentHeaders.length === 0 || !parentHeaders.includes('Id')) {
        parentsSheet.getRange(1, 1, 1, 5).setValues([['Id', 'Email', 'LastName', 'FirstName', 'Phone']]);
        console.log('   Added headers to parents sheet');
      }

      // Add all parent records
      const parentRows = [];
      for (const [parentId, parent] of parentAnalysis.uniqueParents) {
        parentRows.push([
          parentId,
          parent.email || '',
          parent.lastName || '',
          parent.firstName || '',
          parent.phone || ''
        ]);
      }

      if (parentRows.length > 0) {
        const startRow = parentsSheet.getLastRow() + 1;
        parentsSheet.getRange(startRow, 1, parentRows.length, 5).setValues(parentRows);
        results.parentsCreated = parentRows.length;
        console.log(`   Created ${parentRows.length} parent records`);
      }

      // Update student records with parent IDs
      console.log('\n🔗 Linking students to parents...');
      for (let i = 0; i < studentData.length; i++) {
        const student = studentData[i];
        const rowNum = i + 2; // +2 because arrays are 0-indexed and sheet has header

        // Set Parent1Id
        if (student.parent1Id) {
          studentsSheet.getRange(rowNum, parent1IdCol).setValue(student.parent1Id);
        }

        // Set Parent2Id  
        if (student.parent2Id) {
          studentsSheet.getRange(rowNum, parent2IdCol).setValue(student.parent2Id);
        }

        results.studentsUpdated++;
      }

      console.log(`   Updated ${results.studentsUpdated} student records`);

      console.log('\n✅ MIGRATION COMPLETED SUCCESSFULLY!');
      console.log('\n📋 SUMMARY OF CHANGES:');
      console.log(`   • Parent records created: ${results.parentsCreated}`);
      console.log(`   • Student records updated: ${results.studentsUpdated}`);
      console.log(`   • New columns added: ${results.columnsAdded}`);
      
      console.log('\n📋 WHAT WAS CHANGED:');
      console.log('   • Parents sheet: Populated with unique parent records');
      console.log('   • Students sheet: Added Parent1Id and Parent2Id columns');
      console.log('   • All student records linked to their respective parents');

      return results;

    } catch (error) {
      console.error('❌ Migration failed:', error.toString());
      results.errors.push(error.toString());
      throw error;
    }
  }

  /**
   * Rollback the migration changes
   */
  rollback() {
    console.log('🔄 ROLLING BACK MIGRATION: Process Parents');
    console.log('==========================================');
    
    try {
      const parentsSheet = this.spreadsheet.getSheetByName('parents');
      const studentsSheet = this.findStudentsSheet();
      
      if (parentsSheet) {
        console.log('🗑️  Clearing parents sheet...');
        const range = parentsSheet.getDataRange();
        if (range.getNumRows() > 1) {
          parentsSheet.getRange(2, 1, range.getNumRows() - 1, range.getNumColumns()).clearContent();
          console.log('   ✅ Parents data cleared (headers preserved)');
        }
      }

      if (studentsSheet) {
        console.log('🗑️  Clearing parent ID columns from students...');
        const headers = studentsSheet.getRange(1, 1, 1, studentsSheet.getLastColumn()).getValues()[0];
        
        const parent1IdCol = headers.findIndex(h => h === 'Parent1Id') + 1;
        const parent2IdCol = headers.findIndex(h => h === 'Parent2Id') + 1;
        
        if (parent1IdCol > 0) {
          const range = studentsSheet.getRange(2, parent1IdCol, studentsSheet.getLastRow() - 1, 1);
          range.clearContent();
          console.log('   ✅ Parent1Id column cleared');
        }
        
        if (parent2IdCol > 0) {
          const range = studentsSheet.getRange(2, parent2IdCol, studentsSheet.getLastRow() - 1, 1);
          range.clearContent();
          console.log('   ✅ Parent2Id column cleared');
        }
      }

      console.log('\n✅ ROLLBACK COMPLETED');
      console.log('\n📋 CHANGES REVERTED:');
      console.log('   • All parent records removed from parents sheet');
      console.log('   • Parent ID links cleared from students sheet');
      console.log('\n💡 Note: Parent ID columns still exist but are empty');
      console.log('   You can manually delete these columns if desired');
      
      return true;
    } catch (error) {
      console.error('❌ Rollback failed:', error.toString());
      return false;
    }
  }

  /**
   * Helper method to find the students sheet
   */
  findStudentsSheet() {
    // Try common student sheet names
    const possibleNames = ['students', 'students-original', 'Students', 'Students-Original'];
    
    for (const name of possibleNames) {
      const sheet = this.spreadsheet.getSheetByName(name);
      if (sheet) {
        return sheet;
      }
    }
    
    return null;
  }

  /**
   * Helper method to get and parse student data
   */
  getStudentData(studentsSheet) {
    const data = studentsSheet.getDataRange().getValues();
    if (data.length < 2) return [];
    
    const headers = data[0];
    const students = [];
    
    // Find column indices (flexible to handle different sheet structures)
    const getColIndex = (possibleNames) => {
      for (const name of possibleNames) {
        const index = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
        if (index >= 0) return index;
      }
      return -1;
    };
    
    const studentIdCol = getColIndex(['studentid', 'id']);
    const lastNameCol = getColIndex(['lastname', 'last name']);
    const firstNameCol = getColIndex(['firstname', 'first name']);
    const gradeCol = getColIndex(['grade']);
    
    // Parent1 columns
    const parent1FullNameCol = getColIndex(['parent1fullname', 'parent 1 full name', 'parent1name']);
    const parent1EmailCol = getColIndex(['parent1email', 'parent 1 email']);
    const parent1PhoneCol = getColIndex(['parent1phone', 'parent 1 phone']);
    
    // Parent2 columns  
    const parent2FullNameCol = getColIndex(['parent2fullname', 'parent 2 full name', 'parent2name']);
    const parent2EmailCol = getColIndex(['parent2email', 'parent 2 email']);
    const parent2PhoneCol = getColIndex(['parent2phone', 'parent 2 phone']);

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      const student = {
        studentId: studentIdCol >= 0 ? row[studentIdCol] : `STUDENT_${i}`,
        lastName: lastNameCol >= 0 ? row[lastNameCol] : '',
        firstName: firstNameCol >= 0 ? row[firstNameCol] : '',
        grade: gradeCol >= 0 ? row[gradeCol] : '',
        
        parent1FullName: parent1FullNameCol >= 0 ? row[parent1FullNameCol] : '',
        parent1Email: parent1EmailCol >= 0 ? row[parent1EmailCol] : '',
        parent1Phone: parent1PhoneCol >= 0 ? row[parent1PhoneCol] : '',
        
        parent2FullName: parent2FullNameCol >= 0 ? row[parent2FullNameCol] : '',
        parent2Email: parent2EmailCol >= 0 ? row[parent2EmailCol] : '',
        parent2Phone: parent2PhoneCol >= 0 ? row[parent2PhoneCol] : '',
        
        parent1Id: null, // Will be set during processing
        parent2Id: null  // Will be set during processing
      };
      
      students.push(student);
    }
    
    return students;
  }

  /**
   * Helper method to analyze parent data and create unique parent records
   */
  analyzeParentData(studentData) {
    const uniqueParents = new Map();
    let studentsWithParent1 = 0;
    let studentsWithParent2 = 0;
    let incompleteParent1 = 0;
    let incompleteParent2 = 0;

    for (const student of studentData) {
      // Process Parent1
      if (student.parent1FullName || student.parent1Email) {
        studentsWithParent1++;
        
        const parent1Names = this.parseFullName(student.parent1FullName);
        if (student.parent1Email && parent1Names.firstName && parent1Names.lastName) {
          const parent1Id = `${student.parent1Email}_${parent1Names.lastName}_${parent1Names.firstName}`;
          
          if (!uniqueParents.has(parent1Id)) {
            uniqueParents.set(parent1Id, {
              email: student.parent1Email,
              lastName: parent1Names.lastName,
              firstName: parent1Names.firstName,
              phone: student.parent1Phone
            });
          }
          
          student.parent1Id = parent1Id;
        } else {
          incompleteParent1++;
        }
      }

      // Process Parent2
      if (student.parent2FullName || student.parent2Email) {
        studentsWithParent2++;
        
        const parent2Names = this.parseFullName(student.parent2FullName);
        if (student.parent2Email && parent2Names.firstName && parent2Names.lastName) {
          const parent2Id = `${student.parent2Email}_${parent2Names.lastName}_${parent2Names.firstName}`;
          
          if (!uniqueParents.has(parent2Id)) {
            uniqueParents.set(parent2Id, {
              email: student.parent2Email,
              lastName: parent2Names.lastName,
              firstName: parent2Names.firstName,
              phone: student.parent2Phone
            });
          }
          
          student.parent2Id = parent2Id;
        } else {
          incompleteParent2++;
        }
      }
    }

    return {
      uniqueParents,
      studentsWithParent1,
      studentsWithParent2,
      incompleteParent1,
      incompleteParent2
    };
  }

  /**
   * Helper method to parse full name into first and last names
   */
  parseFullName(fullName) {
    if (!fullName || typeof fullName !== 'string') {
      return { firstName: '', lastName: '' };
    }
    
    // Handle "Last, First" format
    if (fullName.includes(', ')) {
      const parts = fullName.split(', ');
      return {
        lastName: parts[0].trim(),
        firstName: parts[1] ? parts[1].trim() : ''
      };
    }
    
    // Handle "First Last" format
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' ')
      };
    }
    
    // Single name - assume it's the last name
    return {
      firstName: '',
      lastName: fullName.trim()
    };
  }
}

/**
 * Utility function to validate sheet structure for parent processing
 */
function validateSheetsForParentProcessing() {
  console.log('🔍 VALIDATING SHEET STRUCTURE');
  console.log('=============================');
  
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const migration = new ProcessParentsMigration();
  
  // Check for students sheet
  const studentsSheet = migration.findStudentsSheet();
  if (!studentsSheet) {
    console.log('❌ No students sheet found');
    console.log('   Expected sheet names: students, students-original, Students, etc.');
    return false;
  }
  
  console.log(`✅ Found students sheet: ${studentsSheet.getName()}`);
  
  // Check for parents sheet
  const parentsSheet = spreadsheet.getSheetByName('parents');
  if (!parentsSheet) {
    console.log('❌ No "parents" sheet found');
    console.log('   Please create a sheet named "parents" first');
    return false;
  }
  
  console.log('✅ Found parents sheet');
  
  // Validate student sheet structure
  const headers = studentsSheet.getRange(1, 1, 1, studentsSheet.getLastColumn()).getValues()[0];
  console.log(`📋 Students sheet headers: ${headers.join(', ')}`);
  
  const hasParentData = headers.some(h => 
    h.toLowerCase().includes('parent') && 
    (h.toLowerCase().includes('email') || h.toLowerCase().includes('name'))
  );
  
  if (!hasParentData) {
    console.log('⚠️  Warning: No parent-related columns found in students sheet');
    console.log('   Expected columns with names like: parent1email, parent1fullname, etc.');
  } else {
    console.log('✅ Found parent-related columns in students sheet');
  }
  
  return true;
}
