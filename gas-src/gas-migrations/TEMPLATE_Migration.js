/**
 * Google Apps Script Migration Template
 *
 * Copy this template to create new migrations for Google Sheets.
 * Replace [XXX] with the migration number and [Description] with a meaningful name.
 *
 * To use:
 * 1. Copy this file and rename to Migration[XXX]_[Description].js
 * 2. Set your spreadsheet ID in Config.js: const SPREADSHEET_ID = "your-id";
 * 3. Update function names to match your migration
 * 4. Test thoroughly with preview function first
 */

/**
 * Main function to execute YourMigrationName
 * This will be the entry point when run from Google Apps Script
 * TODO: Replace "YourMigrationName" with your actual migration name
 */
function runYourMigrationName() {
  const migration = new YourMigrationNameClass(getSpreadsheetId());
  migration.execute();
}

/**
 * Preview function to check what changes would be made
 * Run this first to see what the migration will do
 * TODO: Replace "YourMigrationName" with your actual migration name
 */
function previewYourMigrationName() {
  const migration = new YourMigrationNameClass(getSpreadsheetId());
  migration.preview();
}

/**
 * Rollback function to undo the migration changes
 * Use this if you need to revert the changes
 * TODO: Replace "YourMigrationName" with your actual migration name
 */
function rollbackYourMigrationName() {
  const migration = new YourMigrationNameClass(getSpreadsheetId());
  migration.rollback();
}

/**
 * Restore from automatic backup and delete the backup
 * TODO: Replace "YourMigrationName" with your actual migration name
 */
function restoreYourMigrationNameFromBackup() {
  return restoreFromBackup('YourMigrationName');
}

/**
 * Delete backup without restoring
 * TODO: Replace "YourMigrationName" with your actual migration name
 */
function deleteYourMigrationNameBackup() {
  return deleteBackup('YourMigrationName');
}

/**
 * Migration class for Your Migration Description
 * TODO: Replace "YourMigrationNameClass" and description with your actual migration details
 */
class YourMigrationNameClass {
  constructor(spreadsheetId) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.description = 'Your Migration Description Here';
  }

  /**
   * Preview what changes will be made (read-only)
   */
  preview() {
    console.log(`🔍 MIGRATION PREVIEW: ${this.migrationName}`);
    console.log('='.repeat(50 + this.migrationName.length));

    try {
      // REPLACE: Add your preview logic here
      // This should analyze the current state and show what would change

      // Example: Check if required sheets exist
      const requiredSheets = ['sheet1', 'sheet2']; // REPLACE with your sheets
      const missingSheets = [];

      requiredSheets.forEach(sheetName => {
        const sheet = this.spreadsheet.getSheetByName(sheetName);
        if (!sheet) {
          missingSheets.push(sheetName);
        } else {
          console.log(`✅ Found required sheet: ${sheetName}`);
        }
      });

      if (missingSheets.length > 0) {
        console.log(`❌ Missing required sheets: ${missingSheets.join(', ')}`);
        return;
      }

      // REPLACE: Add your specific analysis logic here
      // Examples:
      // - Count records that will be affected
      // - Check for data validation issues
      // - Identify potential conflicts
      // - Verify prerequisites

      console.log('\n📊 PREVIEW RESULTS:');
      console.log('   REPLACE: Add specific preview results here');

      // Example output:
      // console.log(`   • Records to be updated: ${recordCount}`);
      // console.log(`   • New columns to be added: ${newColumns.length}`);
      // console.log(`   • Validation rules to be applied: ${validationRules.length}`);
    } catch (error) {
      console.error('❌ Preview failed:', error.toString());
    }
  }

  /**
   * Execute the migration using safe copy-modify-replace pattern
   */
  execute() {
    console.log(`🚀 EXECUTING MIGRATION: ${this.migrationName}`);
    console.log('='.repeat(45 + this.migrationName.length));

    // Create automatic backup before starting
    console.log('📦 Creating automatic backup...');
    const sheetsToBackup = ['sheet1', 'sheet2']; // TODO: Replace with actual sheet names
    const backupResult = createMigrationBackup('YourMigrationName', sheetsToBackup);
    
    if (!backupResult.success) {
      console.error('❌ Failed to create backup, aborting migration');
      throw new Error(`Backup failed: ${backupResult.error}`);
    }
    
    console.log('✅ Backup created successfully');

    const results = {
      recordsUpdated: 0,
      columnsAdded: 0,
      validationRulesAdded: 0,
      formattingApplied: 0,
      errors: [],
      backupInfo: backupResult
    };

    try {
      // REPLACE: Define sheet modifications using safe pattern
      const sheetModifications = [
        {
          sheetName: 'sheet1', // TODO: Replace with actual sheet name
          modifyFunction: (workingSheet, originalSheet) => {
            // TODO: Replace with your actual modification logic
            return this.modifySheet1(workingSheet, originalSheet, results);
          }
        },
        {
          sheetName: 'sheet2', // TODO: Replace with actual sheet name  
          modifyFunction: (workingSheet, originalSheet) => {
            // TODO: Replace with your actual modification logic
            return this.modifySheet2(workingSheet, originalSheet, results);
          }
        }
        // TODO: Add more sheet modifications as needed
      ];

      // Execute all modifications using batch safe pattern
      console.log('\n🔄 Applying safe sheet modifications...');
      const modificationResults = batchSafeSheetModification(sheetModifications);
      
      if (!modificationResults.success) {
        throw new Error(`Sheet modifications failed: ${modificationResults.failedSheets.join(', ')}`);
      }

      console.log('\n✅ MIGRATION COMPLETED SUCCESSFULLY!');
      console.log('\n📋 SUMMARY OF CHANGES:');
      console.log(`   • Records updated: ${results.recordsUpdated}`);
      console.log(`   • Columns added: ${results.columnsAdded}`);
      console.log(`   • Validation rules added: ${results.validationRulesAdded}`);
      console.log(`   • Formatting improvements: ${results.formattingApplied}`);

      // REPLACE: Add specific change descriptions
      console.log('\n📋 SPECIFIC CHANGES MADE:');
      console.log('   • REPLACE: List what was actually changed');
      console.log('   • REPLACE: Include any important notes');

      return results;
    } catch (error) {
      console.error('❌ Migration failed:', error.toString());
      results.errors.push(error.toString());
      throw error;
    }
  }

  /**
   * Rollback the migration changes
   * Uses automatic backup if available, otherwise manual restoration
   */
  rollback() {
    console.log(`🔄 ROLLING BACK MIGRATION: ${this.migrationName}`);
    console.log('='.repeat(50 + this.migrationName.length));

    try {
      // First try to restore from automatic backup
      console.log('🔍 Checking for automatic backup...');
      const backupInfo = findLatestBackup('YourMigrationName'); // TODO: Replace with actual migration name
      
      if (backupInfo) {
        console.log('✅ Automatic backup found, restoring...');
        const restoreResult = restoreFromBackup('YourMigrationName'); // TODO: Replace with actual migration name
        
        if (restoreResult.success) {
          console.log('✅ ROLLBACK COMPLETED using automatic backup');
          console.log(`Restored sheets: ${restoreResult.restoredSheets.join(', ')}`);
          return { success: true, method: 'automatic_backup', restoredSheets: restoreResult.restoredSheets };
        } else {
          console.log('❌ Automatic backup restore failed, falling back to manual restoration');
        }
      } else {
        console.log('ℹ️  No automatic backup found, using manual restoration');
      }

      // Manual restoration as fallback
      console.log('📝 Performing manual restoration...');

      // REPLACE: Add your manual rollback logic here
      // Example rollback operations:
      // - Restore original headers
      // - Remove added columns
      // - Clear added data
      // - Remove validation rules

      // REPLACE: Implement specific rollback steps

      console.log('\n✅ ROLLBACK COMPLETED using manual restoration');
      console.log('\n📋 CHANGES REVERTED:');
      console.log('   • REPLACE: List what was reverted');

      // Note about manual cleanup if needed
      console.log('\n⚠️  Note: Manual restoration may not fully restore all data');
      console.log('   • For complete data restoration, use automatic backup before migration');
      console.log('   • REPLACE: Add specific manual cleanup instructions if needed');

      return { success: true, method: 'manual_restoration' };
    } catch (error) {
      console.error('❌ Rollback failed:', error.toString());
      return { success: false, error: error.toString() };
    }
  }

  /**
   * REPLACE: Add helper methods as needed
   *
   * Examples:
   * - getSheetData(sheetName)
   * - validateSheetStructure()
   * - applyBatchUpdates(updates)
   * - logProgress(message)
   */

  /**
   * TODO: Replace with your actual sheet1 modification logic
   * This method will be called with a working copy of sheet1
   * 
   * @param {Sheet} workingSheet - The working copy of the sheet to modify
   * @param {Sheet} originalSheet - Reference to the original sheet (for data comparison)
   * @param {Object} results - Results object to update with changes made
   * @returns {Object} Modification details
   */
  modifySheet1(workingSheet, originalSheet, results) {
    console.log('   🔧 Modifying sheet1...');
    
    // TODO: Replace with your actual modification logic
    // Examples:
    // - Update specific cells: workingSheet.getRange('A1').setValue('New Value');
    // - Add new columns: workingSheet.insertColumnAfter(2);
    // - Modify headers: workingSheet.getRange(1, 1, 1, 3).setValues([['New', 'Headers', 'Here']]);
    // - Transform data formats
    // - Apply data validation
    
    // Example modification (remove this in actual implementation):
    const data = workingSheet.getDataRange().getValues();
    console.log(`     📊 Processing ${data.length - 1} rows of data`);
    
    // Update results with what was actually changed
    results.recordsUpdated += data.length - 1; // Example
    
    return {
      rowsProcessed: data.length - 1,
      modificationType: 'example_modification'
    };
  }

  /**
   * TODO: Replace with your actual sheet2 modification logic
   * This method will be called with a working copy of sheet2
   * 
   * @param {Sheet} workingSheet - The working copy of the sheet to modify
   * @param {Sheet} originalSheet - Reference to the original sheet (for data comparison)
   * @param {Object} results - Results object to update with changes made
   * @returns {Object} Modification details
   */
  modifySheet2(workingSheet, originalSheet, results) {
    console.log('   🔧 Modifying sheet2...');
    
    // TODO: Replace with your actual modification logic
    
    // Example modification (remove this in actual implementation):
    const headers = workingSheet.getRange(1, 1, 1, workingSheet.getLastColumn()).getValues()[0];
    console.log(`     📋 Processing headers: ${headers.join(', ')}`);
    
    // Update results with what was actually changed
    results.columnsAdded += 1; // Example
    
    return {
      headersProcessed: headers.length,
      modificationType: 'example_modification'
    };
  }

  /**
   * Helper method to get sheet data safely
   */
  getSheetData(sheetName) {
    const sheet = this.spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    if (sheet.getLastRow() < 2) {
      return { headers: [], data: [] };
    }

    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();

    return {
      headers: values[0],
      data: values.slice(1),
      sheet: sheet,
      range: dataRange,
    };
  }

  /**
   * Helper method to log progress with timestamps
   */
  logProgress(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
  }
}

/**
 * REPLACE: Add any utility functions here
 *
 * These functions can be called independently for testing or maintenance
 */

/**
 * Utility function to validate the spreadsheet structure
 * REPLACE: Customize for your specific validation needs
 */
function validateSpreadsheetStructure() {
  console.log('🔍 VALIDATING SPREADSHEET STRUCTURE');
  console.log('===================================');

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  // REPLACE: Add your validation logic
  const requiredSheets = ['sheet1', 'sheet2']; // REPLACE
  let isValid = true;

  requiredSheets.forEach(sheetName => {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      console.log(`❌ Missing required sheet: ${sheetName}`);
      isValid = false;
    } else {
      console.log(`✅ Found sheet: ${sheetName}`);

      // REPLACE: Add column validation
      // const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      // console.log(`   Headers: ${headers.join(', ')}`);
    }
  });

  console.log('\n' + (isValid ? '✅ Structure is valid' : '❌ Structure has issues'));
  return isValid;
}

/**
 * REPLACE: Add any additional utility functions
 *
 * Examples:
 * - createBackupSheet()
 * - exportMigrationLog()
 * - sendNotificationEmail()
 * - scheduleCleanupTask()
 */
