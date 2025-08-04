/**
 * ⚠️  NOT PRODUCTION READY - ARCHIVED ⚠️
 *
 * Google Apps Script Migration 002: Add Class Names to Registration
 *
 * ARCHIVED: This migration has been moved to archive as it's not production ready.
 * Do not use this migration in production environments.
 *
 * This script adds class names to registration records based on class IDs.
 * It's a data migration that populates missing className fields.
 *
 * To use:
 * 1. Open your Google Sheets document
 * 2. Go to Extensions > Apps Script
 * 3. Copy this entire file content into a new .gs file
 * 4. Configure spreadsheet ID in Config.js (loaded automatically)
 * 5. Run the main function: runAddClassNamesToRegistration()
 */

/**
 * Main function to execute the class name addition migration
 * This will be the entry point when run from Google Apps Script
 */
function runAddClassNamesToRegistration() {
  const migration = new AddClassNamesToRegistrationMigration(getSpreadsheetId());
  migration.execute();
}

/**
 * Preview function to check what changes would be made
 * Run this first to see what the migration will do
 */
function previewAddClassNamesToRegistration() {
  const migration = new AddClassNamesToRegistrationMigration(getSpreadsheetId());
  migration.preview();
}

/**
 * Rollback function to undo the migration changes
 * Use this if you need to revert the changes
 */
function rollbackAddClassNamesToRegistration() {
  const migration = new AddClassNamesToRegistrationMigration(getSpreadsheetId());
  migration.rollback();
}

/**
 * Migration class for adding class names to registrations
 */
class AddClassNamesToRegistrationMigration {
  constructor(spreadsheetId) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.description = 'Add class names to registration records based on class IDs';
  }

  /**
   * Preview what changes will be made (read-only)
   */
  preview() {
    console.log('⚠️  WARNING: This migration is NOT PRODUCTION READY');
    console.log('🔍 MIGRATION PREVIEW: Add Class Names to Registration');
    console.log('==================================================');

    try {
      const registrationsSheet = this.spreadsheet.getSheetByName('registrations');
      const classesSheet = this.spreadsheet.getSheetByName('classes');

      if (!registrationsSheet) {
        console.log('❌ Error: "registrations" sheet not found');
        return;
      }

      if (!classesSheet) {
        console.log('❌ Error: "classes" sheet not found');
        return;
      }

      // Get all data
      const registrationsData = registrationsSheet.getDataRange().getValues();
      const classesData = classesSheet.getDataRange().getValues();

      if (registrationsData.length < 2) {
        console.log('ℹ️  No registration data found');
        return;
      }

      if (classesData.length < 2) {
        console.log('ℹ️  No class data found');
        return;
      }

      // Parse headers
      const regHeaders = registrationsData[0];
      const classHeaders = classesData[0];

      // Find column indices
      const regClassIdCol = regHeaders.findIndex(h => h === 'ClassId');
      const regClassNameCol = regHeaders.findIndex(h => h === 'ClassTitle' || h === 'ClassName');
      const classIdCol = classHeaders.findIndex(h => h === 'Id');
      const classTitleCol = classHeaders.findIndex(h => h === 'Title');

      console.log(`📍 Column mappings:`);
      console.log(
        `   Registration ClassId column: ${regClassIdCol >= 0 ? regClassIdCol + 1 : 'NOT FOUND'}`
      );
      console.log(
        `   Registration ClassName column: ${regClassNameCol >= 0 ? regClassNameCol + 1 : 'NOT FOUND'}`
      );
      console.log(`   Classes Id column: ${classIdCol >= 0 ? classIdCol + 1 : 'NOT FOUND'}`);
      console.log(
        `   Classes Title column: ${classTitleCol >= 0 ? classTitleCol + 1 : 'NOT FOUND'}`
      );

      if (regClassIdCol < 0) {
        console.log('❌ Error: Could not find ClassId column in registrations sheet');
        return;
      }

      if (classIdCol < 0 || classTitleCol < 0) {
        console.log('❌ Error: Could not find Id or Title columns in classes sheet');
        return;
      }

      // Build class map
      const classMap = new Map();
      for (let i = 1; i < classesData.length; i++) {
        const classId = classesData[i][classIdCol];
        const classTitle = classesData[i][classTitleCol];
        if (classId && classTitle) {
          classMap.set(classId.toString(), classTitle.toString());
        }
      }

      console.log(`📚 Found ${classMap.size} classes available for mapping`);

      // Analyze registrations
      let registrationsToUpdate = 0;
      let registrationsWithMissingClass = 0;
      let registrationsAlreadyHaveClassName = 0;

      for (let i = 1; i < registrationsData.length; i++) {
        const classId = registrationsData[i][regClassIdCol];
        const existingClassName = regClassNameCol >= 0 ? registrationsData[i][regClassNameCol] : '';

        if (classId) {
          if (classMap.has(classId.toString())) {
            if (!existingClassName || existingClassName.trim() === '') {
              registrationsToUpdate++;
            } else {
              registrationsAlreadyHaveClassName++;
            }
          } else {
            registrationsWithMissingClass++;
          }
        }
      }

      console.log('\n📊 ANALYSIS RESULTS:');
      console.log(`   📝 Registrations that will be updated: ${registrationsToUpdate}`);
      console.log(
        `   ✅ Registrations already have class names: ${registrationsAlreadyHaveClassName}`
      );
      console.log(
        `   ⚠️  Registrations with missing class references: ${registrationsWithMissingClass}`
      );
      console.log(`   📋 Total registrations analyzed: ${registrationsData.length - 1}`);

      if (registrationsToUpdate === 0) {
        console.log('\n✅ No updates needed - all registrations already have class names!');
      } else {
        console.log('\n🔧 Migration will:');
        console.log(`   • Add class names to ${registrationsToUpdate} registration records`);
        if (regClassNameCol < 0) {
          console.log(`   • Create a new "ClassTitle" column in the registrations sheet`);
        }
      }

      if (registrationsWithMissingClass > 0) {
        console.log('\n⚠️  Warning:');
        console.log(
          `   • ${registrationsWithMissingClass} registrations reference classes that don't exist`
        );
        console.log('   • These will be skipped during the migration');
      }
    } catch (error) {
      console.error('❌ Preview failed:', error.toString());
    }
  }

  /**
   * Execute the migration
   */
  execute() {
    console.log('⚠️  WARNING: This migration is NOT PRODUCTION READY');
    console.log('🚀 EXECUTING MIGRATION: Add Class Names to Registration');
    console.log('====================================================');

    // Prevent execution of non-production ready migration
    console.log('❌ EXECUTION BLOCKED: This migration is archived and not production ready');
    console.log('Please use a different migration or update this one before proceeding.');
    return { error: 'Migration not production ready' };
  }

  /**
   * Rollback the migration changes
   */
  rollback() {
    console.log('⚠️  WARNING: This migration is NOT PRODUCTION READY');
    console.log('🔄 ROLLING BACK MIGRATION: Add Class Names to Registration');
    console.log('=========================================================');

    console.log('❌ ROLLBACK BLOCKED: This migration is archived and not production ready');
    return false;
  }
}

/**
 * Utility function to validate sheet structure
 * Call this to check if your sheets have the required columns
 */
function validateSheetsForClassNameMigration() {
  console.log('⚠️  WARNING: This migration is NOT PRODUCTION READY');
  console.log('🔍 VALIDATING SHEET STRUCTURE');
  console.log('=============================');

  // TODO: Replace with your actual spreadsheet ID
  const spreadsheetId = 'YOUR_SPREADSHEET_ID_HERE';
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);

  const registrationsSheet = spreadsheet.getSheetByName('registrations');
  const classesSheet = spreadsheet.getSheetByName('classes');

  let isValid = true;

  // Check registrations sheet
  if (!registrationsSheet) {
    console.log('❌ Missing: "registrations" sheet');
    isValid = false;
  } else {
    const regHeaders = registrationsSheet
      .getRange(1, 1, 1, registrationsSheet.getLastColumn())
      .getValues()[0];
    console.log('✅ Found "registrations" sheet');
    console.log(`   Headers: ${regHeaders.join(', ')}`);

    if (!regHeaders.includes('ClassId')) {
      console.log('⚠️  Warning: No "ClassId" column found in registrations');
      isValid = false;
    }
  }

  // Check classes sheet
  if (!classesSheet) {
    console.log('❌ Missing: "classes" sheet');
    isValid = false;
  } else {
    const classHeaders = classesSheet
      .getRange(1, 1, 1, classesSheet.getLastColumn())
      .getValues()[0];
    console.log('✅ Found "classes" sheet');
    console.log(`   Headers: ${classHeaders.join(', ')}`);

    if (!classHeaders.includes('Id')) {
      console.log('⚠️  Warning: No "Id" column found in classes');
      isValid = false;
    }
    if (!classHeaders.includes('Title')) {
      console.log('⚠️  Warning: No "Title" column found in classes');
      isValid = false;
    }
  }

  console.log(
    '\n' + (isValid ? '✅ Sheet structure is valid for migration' : '❌ Sheet structure has issues')
  );
  return isValid;
}
