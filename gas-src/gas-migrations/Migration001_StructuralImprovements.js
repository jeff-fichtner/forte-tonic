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
 * 4. Run the main function: runStructuralImprovements()
 */

/**
 * Main function to execute structural improvements
 * This will be the entry point when run from Google Apps Script
 */
function runStructuralImprovements() {
  const migration = new StructuralImprovementsMigration();
  migration.execute();
}

/**
 * Preview function to check what changes would be made
 * Run this first to see what the migration will do
 */
function previewStructuralImprovements() {
  const migration = new StructuralImprovementsMigration();
  migration.preview();
}

/**
 * Rollback function to undo the migration changes
 * Use this if you need to revert the changes
 */
function rollbackStructuralImprovements() {
  const migration = new StructuralImprovementsMigration();
  migration.rollback();
}

/**
 * Migration class for structural improvements
 */
class StructuralImprovementsMigration {
  constructor() {
    this.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    this.description = 'Standardize headers, add validation, freeze rows, and highlight duplicates';
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
            recommendations.push(`${sheetName}: Will mark StudentId as deprecated`);
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
      validationRulesAdded: 0,
      formattingApplied: 0,
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

      // Standardize Students headers (mark StudentId as deprecated)
      const studentsSheet = this.spreadsheet.getSheetByName('students');
      if (studentsSheet) {
        console.log('   Standardizing Students sheet headers...');
        const headers = studentsSheet.getRange(1, 1, 1, 9);
        headers.setValues([['Id', 'StudentId_DEPRECATED', 'LastName', 'FirstName', 'LastNickname', 'FirstNickname', 'Grade', 'Parent1Id', 'Parent2Id']]);
        results.headersFixed++;
      }

      // PHASE 2: Advanced Google Sheets formatting
      console.log('\n⚡ PHASE 2: Advanced Formatting & Validation...');
      
      // 2A. Freeze header rows on all sheets
      console.log('   Adding frozen header rows...');
      const sheets = [parentsSheet, studentsSheet, 
                     this.spreadsheet.getSheetByName('instructors'),
                     this.spreadsheet.getSheetByName('registrations')];
      
      sheets.forEach(sheet => {
        if (sheet) {
          sheet.setFrozenRows(1);
          results.formattingApplied++;
        }
      });

      // 2B. Add data validation for emails
      console.log('   Adding email validation...');
      
      // Parents email validation (column B)
      if (parentsSheet) {
        const emailRange = parentsSheet.getRange(2, 2, parentsSheet.getMaxRows() - 1, 1);
        const emailValidation = SpreadsheetApp.newDataValidation()
          .requireTextIsEmail()
          .setHelpText('Enter a valid email address')
          .build();
        emailRange.setDataValidation(emailValidation);
        results.validationRulesAdded++;
      }

      // Instructors email validation (column B)
      const instructorsSheet = this.spreadsheet.getSheetByName('instructors');
      if (instructorsSheet) {
        const emailRange = instructorsSheet.getRange(2, 2, instructorsSheet.getMaxRows() - 1, 1);
        const emailValidation = SpreadsheetApp.newDataValidation()
          .requireTextIsEmail()
          .setHelpText('Enter a valid email address')
          .build();
        emailRange.setDataValidation(emailValidation);
        results.validationRulesAdded++;
      }

      // 2C. Add grade validation (dropdown)
      console.log('   Adding grade validation...');
      if (studentsSheet) {
        const gradeRange = studentsSheet.getRange(2, 7, studentsSheet.getMaxRows() - 1, 1);
        const gradeValidation = SpreadsheetApp.newDataValidation()
          .requireValueInList(['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'])
          .setHelpText('Select a valid grade: K, 1-12')
          .build();
        gradeRange.setDataValidation(gradeValidation);
        results.validationRulesAdded++;
      }

      // 2D. Add conditional formatting for duplicate IDs
      console.log('   Adding duplicate ID highlighting...');
      sheets.forEach(sheet => {
        if (sheet) {
          const idRange = sheet.getRange(2, 1, sheet.getMaxRows() - 1, 1);
          const rule = SpreadsheetApp.newConditionalFormatRule()
            .whenFormulaSatisfied('=COUNTIF($A$2:$A,A2)>1')
            .setBackground('#ff6666')
            .setRanges([idRange])
            .build();
          const rules = sheet.getConditionalFormatRules();
          rules.push(rule);
          sheet.setConditionalFormatRules(rules);
          results.formattingApplied++;
        }
      });

      console.log('\n✅ MIGRATION COMPLETED SUCCESSFULLY!');
      console.log('\n📋 SUMMARY OF CHANGES:');
      console.log(`   • Headers fixed: ${results.headersFixed} sheets`);
      console.log(`   • Validation rules added: ${results.validationRulesAdded}`);
      console.log(`   • Formatting applied: ${results.formattingApplied} improvements`);
      
      console.log('\n📋 WHAT WAS CHANGED:');
      console.log('   • Parents sheet: "Last Name" → "LastName", "First Name" → "FirstName"');
      console.log('   • Students sheet: Headers standardized, StudentId marked as deprecated');
      console.log('   • All sheets: Header rows frozen for better navigation');
      console.log('   • Email columns: Validation added (parents, instructors)');
      console.log('   • Grade column: Dropdown validation (K, 1-12)');
      console.log('   • All ID columns: Duplicate highlighting in red');

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
        const headers = studentsSheet.getRange(1, 1, 1, 9);
        headers.setValues([['Id', 'StudentId', 'LastName', 'FirstName', 'LastNickname', 'FirstNickname', 'Grade', 'Parent1Id', 'Parent2Id']]);
        console.log('   ✅ Students sheet headers restored');
      }

      console.log('\n✅ ROLLBACK COMPLETED');
      console.log('\n⚠️  Note: The following items need manual cleanup:');
      console.log('   • Data validation rules');
      console.log('   • Frozen headers (can be unfrozen via View menu)');
      console.log('   • Conditional formatting rules');
      
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
  console.log(message);
  
  // Optional: Log to a dedicated sheet
  try {
    const logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Migration Log');
    if (logSheet) {
      const timestamp = new Date();
      logSheet.appendRow([timestamp, 'Migration001', message]);
    }
  } catch (error) {
    // Ignore if log sheet doesn't exist
  }
}
