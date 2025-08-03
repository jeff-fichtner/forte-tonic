/**
 * Google Apps Script Migration 001: Structural Improvements
 * 
 * This script should be copied directly into a Google Apps Script project
 * that is bound to your Google Sheets document.
 * 
 * To use:
 * 1. Open your Google Sheets document
 * 2. Go to Extensions > Apps Script
 * 3. Copy this entire file content into a new .gs file
 * 4. Configure spreadsheet ID in Config.js (loaded automatically)
 * 5. Run the main function: runStructuralImprovements()
 * 
 * EXECUTION HISTORY:
 * =================
 * 2025-08-02: Executed runStructuralImprovementsDeleteStudentId() - DEV environment
 *             - StudentId column deleted from students sheet
 *             - Headers standardized across sheets
 */

/**
 * Main function to execute structural improvements
 * This will be the entry point when run from Google Apps Script
 */
function runStructuralImprovements() {
  const migration = new StructuralImprovementsMigration(getSpreadsheetId());
  migration.execute();
}

/**
 * Alternative function to execute structural improvements WITH StudentId column deletion
 * Use this if you want to completely remove the StudentId column instead of deprecating it
 */
function runStructuralImprovementsDeleteStudentId() {
  const migration = new StructuralImprovementsMigration(getSpreadsheetId(), {
    deleteStudentIdColumn: true
  });
  migration.execute();
}

/**
 * Preview function to check what changes would be made
 * Run this first to see what the migration will do
 */
function previewStructuralImprovements() {
  const migration = new StructuralImprovementsMigration(getSpreadsheetId());
  migration.preview();
}

/**
 * Preview function to check what changes would be made WITH StudentId deletion
 * Run this first to see what the migration will do when deleting StudentId column
 */
function previewStructuralImprovementsDeleteStudentId() {
  const migration = new StructuralImprovementsMigration(getSpreadsheetId(), {
    deleteStudentIdColumn: true
  });
  migration.preview();
}

/**
 * Rollback function to undo the migration changes
 * Use this if you need to revert the changes
 */
function rollbackStructuralImprovements() {
  const migration = new StructuralImprovementsMigration(getSpreadsheetId());
  migration.rollback();
}

/**
 * Migration class for structural improvements
 */
class StructuralImprovementsMigration {
  constructor(spreadsheetId, options = {}) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.description = 'Standardize headers and handle StudentId column';
    
    // Configuration options
    this.options = {
      deleteStudentIdColumn: options.deleteStudentIdColumn || false, // Set to true to delete instead of deprecate
      ...options
    };
  }

  /**
   * Preview what changes will be made (read-only)
   */
  preview() {
    console.log('🔍 MIGRATION PREVIEW: Structural Improvements');
    console.log('============================================');
    
    try {
      const issues = [];
      const recommendations = [];

      // Check each sheet's headers for issues
      const sheetInfo = {
        students: this.spreadsheet.getSheetByName('students'),
        parents: this.spreadsheet.getSheetByName('parents'),
        instructors: this.spreadsheet.getSheetByName('instructors'),
        registrations: this.spreadsheet.getSheetByName('registrations')
      };

      for (const [sheetName, sheet] of Object.entries(sheetInfo)) {
        if (!sheet) {
          console.log(`⚠️  Sheet '${sheetName}' not found - skipping`);
          continue;
        }

        console.log(`🔍 Checking ${sheetName} sheet...`);
        
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        
        if (sheetName === 'parents') {
          if (headers.includes('Last Name') || headers.includes('First Name')) {
            issues.push(`${sheetName}: Uses spaced headers ("Last Name", "First Name")`);
            recommendations.push(`${sheetName}: Will rename to "LastName", "FirstName" for consistency`);
          }
        }

        if (sheetName === 'students') {
          if (headers.includes('StudentId') && headers.includes('Id')) {
            issues.push(`${sheetName}: Has redundant StudentId column`);
            if (this.options.deleteStudentIdColumn) {
              recommendations.push(`${sheetName}: Will DELETE StudentId column completely`);
            } else {
              recommendations.push(`${sheetName}: Will mark StudentId as deprecated`);
            }
          }
        }
      }

      console.log('\n📊 PREVIEW RESULTS:');
      
      if (issues.length === 0) {
        console.log('✅ No structural issues found - migration not needed!');
      } else {
        console.log(`📋 Found ${issues.length} issues that will be fixed:\n`);
        issues.forEach((issue, i) => console.log(`   ${i + 1}. ${issue}`));
        
        console.log('\n🔧 Migration will apply:\n');
        recommendations.forEach((rec, i) => console.log(`   ${i + 1}. ${rec}`));
      }

    } catch (error) {
      console.error('❌ Preview failed:', error.toString());
    }
  }

  /**
   * Execute the migration
   */
  execute() {
    console.log('🚀 EXECUTING MIGRATION: Structural Improvements');
    console.log('==============================================');
    
    const results = {
      headersFixed: 0,
      errors: []
    };

    try {
      // PHASE 1: Fix Headers (preserves all data)
      console.log('📝 PHASE 1: Standardizing Headers...');

      // Fix Parents sheet headers
      const parentsSheet = this.spreadsheet.getSheetByName('parents');
      if (parentsSheet) {
        console.log('   Fixing Parents sheet headers...');
        const headers = parentsSheet.getRange(1, 1, 1, 5);
        headers.setValues([['Id', 'Email', 'LastName', 'FirstName', 'Phone']]);
        results.headersFixed++;
      }

      // Standardize Students headers (handle StudentId column based on options)
      const studentsSheet = this.spreadsheet.getSheetByName('students');
      if (studentsSheet) {
        console.log('   Standardizing Students sheet headers...');
        
        if (this.options.deleteStudentIdColumn) {
          // Option 1: Delete StudentId column completely
          console.log('   🗑️ Deleting StudentId column...');
          
          // First, check if StudentId column exists
          const currentHeaders = studentsSheet.getRange(1, 1, 1, studentsSheet.getLastColumn()).getValues()[0];
          const studentIdIndex = currentHeaders.indexOf('StudentId');
          
          if (studentIdIndex !== -1) {
            // Delete the StudentId column (index + 1 because Sheets is 1-indexed)
            studentsSheet.deleteColumn(studentIdIndex + 1);
            console.log(`   ✅ Deleted StudentId column (was at position ${studentIdIndex + 1})`);
            
            // Set headers for remaining columns (without StudentId)
            const headers = studentsSheet.getRange(1, 1, 1, 8);
            headers.setValues([['Id', 'LastName', 'FirstName', 'LastNickname', 'FirstNickname', 'Grade', 'Parent1Id', 'Parent2Id']]);
          } else {
            console.log('   ℹ️ StudentId column not found, skipping deletion');
            // Set standard headers
            const headers = studentsSheet.getRange(1, 1, 1, 8);
            headers.setValues([['Id', 'LastName', 'FirstName', 'LastNickname', 'FirstNickname', 'Grade', 'Parent1Id', 'Parent2Id']]);
          }
        } else {
          // Option 2: Mark StudentId as deprecated (original behavior)
          const headers = studentsSheet.getRange(1, 1, 1, 9);
          headers.setValues([['Id', 'StudentId_DEPRECATED', 'LastName', 'FirstName', 'LastNickname', 'FirstNickname', 'Grade', 'Parent1Id', 'Parent2Id']]);
        }
        
        results.headersFixed++;
      }

      console.log('\n✅ MIGRATION COMPLETED SUCCESSFULLY!');
      console.log('\n📋 SUMMARY OF CHANGES:');
      console.log(`   • Headers fixed: ${results.headersFixed} sheets`);
      
      console.log('\n📋 WHAT WAS CHANGED:');
      console.log('   • Parents sheet: "Last Name" → "LastName", "First Name" → "FirstName"');
      
      if (this.options.deleteStudentIdColumn) {
        console.log('   • Students sheet: Headers standardized, StudentId column DELETED');
        logMigrationResult('Migration001 executed with StudentId deletion - DEV environment');
      } else {
        console.log('   • Students sheet: Headers standardized, StudentId marked as deprecated');
        logMigrationResult('Migration001 executed with StudentId deprecation - DEV environment');
      }

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
    console.log('🔄 ROLLING BACK MIGRATION: Structural Improvements');
    console.log('================================================');
    
    try {
      // Restore original headers
      console.log('📝 Restoring original headers...');

      // Restore Parents headers
      const parentsSheet = this.spreadsheet.getSheetByName('parents');
      if (parentsSheet) {
        const headers = parentsSheet.getRange(1, 1, 1, 5);
        headers.setValues([['Id', 'Email', 'Last Name', 'First Name', 'Phone']]);
        console.log('   ✅ Parents sheet headers restored');
      }

      // Restore Students headers  
      const studentsSheet = this.spreadsheet.getSheetByName('students');
      if (studentsSheet) {
        // Check current number of columns to determine if StudentId was deleted
        const currentColumns = studentsSheet.getLastColumn();
        
        if (currentColumns === 8) {
          // StudentId was likely deleted, need to insert it back
          console.log('   🔄 StudentId column appears to have been deleted, inserting it back...');
          studentsSheet.insertColumnAfter(1); // Insert after Id column
          const headers = studentsSheet.getRange(1, 1, 1, 9);
          headers.setValues([['Id', 'StudentId', 'LastName', 'FirstName', 'LastNickname', 'FirstNickname', 'Grade', 'Parent1Id', 'Parent2Id']]);
          console.log('   ✅ Students sheet headers restored with StudentId column recreated');
        } else {
          // Normal case - just restore headers
          const headers = studentsSheet.getRange(1, 1, 1, 9);
          headers.setValues([['Id', 'StudentId', 'LastName', 'FirstName', 'LastNickname', 'FirstNickname', 'Grade', 'Parent1Id', 'Parent2Id']]);
          console.log('   ✅ Students sheet headers restored');
        }
      }

      console.log('\n✅ ROLLBACK COMPLETED');
      console.log('\n⚠️  Note: If StudentId column was deleted, data may need to be restored from backup');
      
      return true;
    } catch (error) {
      console.error('❌ Rollback failed:', error.toString());
      return false;
    }
  }
}

/**
 * Utility function to log to both console and spreadsheet
 * You can create a "Migration Log" sheet to track execution
 */
function logMigrationResult(message) {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const fullMessage = `${timestamp}: ${message}`;
  
  console.log(`📝 ${fullMessage}`);
  
  // Optional: Log to a dedicated sheet
  try {
    const logSheet = SpreadsheetApp.openById(getSpreadsheetId()).getSheetByName('Migration Log');
    if (logSheet) {
      logSheet.appendRow([new Date(), 'Migration001', message, 'SUCCESS']);
    }
  } catch (error) {
    // Ignore if log sheet doesn't exist
    console.log('   (No Migration Log sheet found - skipping permanent log)');
  }
}
