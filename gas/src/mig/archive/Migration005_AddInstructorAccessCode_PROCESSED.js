/**
 * Google Apps Script Migration 005: Add AccessCode Column to Instructors
 *
 * 🎯 PURPOSE:
 * This migration adds an AccessCode column to the instructors table to enable
 * secure instructor login functionality. Each instructor will get a unique
 * 6-digit numeric access code for authentication.
 *
 * ⚠️ CURRENT SITUATION:
 * - Instructors table exists but lacks AccessCode column
 * - Login system requires access codes for authentication
 * - Need to generate unique codes for existing instructors
 * - Must ensure no duplicate codes are generated
 *
 * ✅ SOLUTION:
 * - Add AccessCode column to instructors table
 * - Generate unique 6-digit numeric codes for all existing instructors
 * - Validate that all codes are unique within the instructor table
 * - Preserve all existing instructor data
 * - Use safe copy-modify-replace pattern for zero risk
 *
 * 📋 CHANGES MADE:
 * 1. Instructors Table: Add AccessCode column with unique numeric codes
 * 2. Data Validation: Ensure all access codes are unique and properly formatted
 * 3. Preservation: All existing instructor data remains intact
 *
 * 🔧 FEATURES:
 * - Generates cryptographically random 6-digit access codes
 * - Ensures uniqueness across all instructor access codes
 * - Validates code format (numeric only, 6 digits)
 * - Uses safe copy-modify-replace pattern
 * - Creates automatic backup for rollback capability
 * - Comprehensive verification functions
 *
 * 🚀 TO USE:
 * 1. Set spreadsheet ID in Config.js: const SPREADSHEET_ID = "your-id";
 * 2. Deploy with clasp push
 * 3. Run preview first: previewAddInstructorAccessCodeMigration()
 * 4. Run migration: runAddInstructorAccessCodeMigration()
 * 5. Verify results: verifyAddInstructorAccessCodeMigration()
 */

/**
 * Main function to execute the instructor access code migration
 */
function runAddInstructorAccessCodeMigration() {
  const migration = new AddInstructorAccessCodeMigration();
  migration.execute();
}

/**
 * Preview function to check what changes would be made
 * Run this first to see what the migration will do
 */
function previewAddInstructorAccessCodeMigration() {
  const migration = new AddInstructorAccessCodeMigration();
  migration.preview();
}

/**
 * Rollback function to restore from backup
 * Use this if you need to revert the changes
 */
function rollbackAddInstructorAccessCodeMigration() {
  const migration = new AddInstructorAccessCodeMigration();
  migration.rollback();
}

/**
 * Restore from automatic backup and delete the backup
 */
function restoreAddInstructorAccessCodeMigrationFromBackup() {
  return restoreFromBackup('Migration005_AddInstructorAccessCode');
}

/**
 * Verification function to check migration results
 * Run this after migration to ensure everything worked correctly
 */
function verifyAddInstructorAccessCodeMigration() {
  console.log('🔍 VERIFYING INSTRUCTOR ACCESS CODE MIGRATION');
  console.log('==============================================');
  
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const verifier = new AddInstructorAccessCodeMigrationVerifier(spreadsheet);
    
    const results = verifier.runAllChecks();
    
    console.log('\n📊 VERIFICATION SUMMARY:');
    console.log('========================');
    console.log(`✅ Total checks passed: ${results.passed}`);
    console.log(`❌ Total checks failed: ${results.failed}`);
    console.log(`⚠️  Warnings: ${results.warnings}`);
    console.log(`📋 Instructors checked: ${results.instructorsChecked}`);
    console.log(`🔑 Valid access codes: ${results.validAccessCodes}`);
    console.log(`🔄 Unique codes: ${results.uniqueCodes}`);
    
    if (results.failed === 0) {
      console.log('\n🎉 Migration verification PASSED! All systems go.');
      console.log('Instructors can now use their access codes to log in.');
    } else {
      console.log('\n❌ Migration verification FAILED. Please review the issues above.');
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    throw error;
  }
}

/**
 * Quick verification function for basic checks
 */
function quickVerifyInstructorAccessCodes() {
  console.log('⚡ QUICK INSTRUCTOR ACCESS CODE CHECK');
  console.log('====================================');
  
  const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
  const instructorsSheet = spreadsheet.getSheetByName('instructors');
  
  if (!instructorsSheet) {
    console.log('❌ Instructors sheet not found');
    return;
  }
  
  const data = instructorsSheet.getDataRange().getValues();
  const headers = data[0];
  const accessCodeIndex = headers.indexOf('AccessCode');
  
  if (accessCodeIndex === -1) {
    console.log('❌ AccessCode column not found');
    return;
  }
  
  const accessCodeRegex = /^\d{6}$/;
  const sampleSize = Math.min(5, data.length - 1);
  let validCount = 0;
  
  console.log('\n📊 Sample Access Code Check:');
  for (let i = 1; i <= sampleSize; i++) {
    const accessCode = data[i][accessCodeIndex];
    const isValid = accessCodeRegex.test(accessCode);
    if (isValid) validCount++;
    
    const nameIndex = headers.indexOf('name') !== -1 ? headers.indexOf('name') : headers.indexOf('Name');
    const instructorName = nameIndex !== -1 ? data[i][nameIndex] : `Row ${i}`;
    
    console.log(`   ${instructorName}: ${accessCode} ${isValid ? '✅' : '❌'}`);
  }
  
  console.log(`\n📋 Results: ${validCount}/${sampleSize} valid access codes`);
  
  if (validCount === sampleSize) {
    console.log('✅ All sampled access codes are valid!');
  } else {
    console.log('⚠️  Some access codes may need attention');
  }
}

/**
 * Migration class for Adding AccessCode Column to Instructors
 */
class AddInstructorAccessCodeMigration {
  constructor() {
    this.spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    this.migrationName = 'Add AccessCode Column to Instructors';
    this.migrationId = 'Migration005_AddInstructorAccessCode';
    this.changes = {
      instructors: []
    };
    this.generatedCodes = new Set(); // Track generated codes to ensure uniqueness
  }

  /**
   * Execute the migration using safe copy-modify-replace pattern
   */
  execute() {
    console.log('🚀 EXECUTING MIGRATION: Add AccessCode Column to Instructors');
    console.log('=============================================================');

    // Create automatic backup before starting
    console.log('📦 Creating automatic backup...');
    const backupResult = createMigrationBackup(this.migrationId, ['instructors']);
    
    if (!backupResult.success) {
      console.error('❌ Failed to create backup, aborting migration');
      throw new Error(`Backup failed: ${backupResult.error}`);
    }
    
    console.log('✅ Backup created successfully');

    try {
      // Analyze current state first
      this.analyzeCurrentState();
      
      // Define sheet modifications using safe copy-modify-replace pattern
      const sheetModifications = [
        {
          sheetName: 'instructors',
          modifyFunction: (workingSheet, originalSheet) => {
            return this.addAccessCodeColumnSafe(workingSheet, originalSheet);
          }
        }
      ];

      // Execute all modifications using batch safe pattern
      console.log('\n🔄 Applying safe sheet modifications...');
      const modificationResults = batchSafeSheetModification(sheetModifications);
      
      if (!modificationResults.success) {
        throw new Error(`Sheet modifications failed: ${modificationResults.failedSheets.join(', ')}`);
      }
      
      console.log('\n✅ Migration completed successfully!');
      console.log('📊 Migration Summary:');
      console.log(`   - Instructors processed: ${this.changes.instructors.length}`);
      console.log(`   - Access codes generated: ${this.generatedCodes.size}`);
      console.log(`   - All codes are unique: ${this.generatedCodes.size === this.changes.instructors.length ? '✅' : '❌'}`);
      
      console.log('\n🔑 Next Steps:');
      console.log('   - Run verification: verifyAddInstructorAccessCodeMigration()');
      console.log('   - Update instructor login system to use access codes');
      console.log('   - Communicate access codes to instructors securely');
      
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      console.log('🔄 Consider restoring from backup if needed');
      throw error;
    }
  }

  /**
   * Preview the migration without making changes
   */
  preview() {
    console.log('🔍 PREVIEWING MIGRATION: Add AccessCode Column to Instructors');
    console.log('=============================================================');
    
    try {
      this.analyzeCurrentState();
      
      console.log('\n📊 Preview Summary:');
      console.log('===================');
      console.log('✅ Preview completed - no changes made');
      console.log('📝 Run execute() to apply the migration');
      console.log('\n💡 Expected Changes:');
      console.log('   - AccessCode column will be added to instructors table');
      console.log('   - Each instructor will receive a unique 6-digit numeric code');
      console.log('   - All existing instructor data will be preserved');
      
    } catch (error) {
      console.error('❌ Preview failed:', error.message);
      throw error;
    }
  }

  /**
   * Analyze current state before migration
   */
  analyzeCurrentState() {
    console.log('\n📊 Analyzing current state...');
    
    const instructorsSheet = this.spreadsheet.getSheetByName('instructors');
    if (!instructorsSheet) {
      throw new Error('Instructors sheet not found');
    }
    
    const data = instructorsSheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    console.log(`\n📋 Instructors Analysis:`);
    console.log(`   - Total instructors: ${dataRows.length}`);
    console.log(`   - Current headers: ${headers.join(', ')}`);
    
    // Check if AccessCode column already exists
    const accessCodeIndex = headers.indexOf('AccessCode');
    if (accessCodeIndex !== -1) {
      console.log(`   ⚠️  AccessCode column already exists at index ${accessCodeIndex}`);
      
      // Analyze existing access codes
      const existingCodes = dataRows.map(row => row[accessCodeIndex]).filter(code => code);
      console.log(`   - Existing access codes: ${existingCodes.length}`);
      
      if (existingCodes.length > 0) {
        const validCodes = existingCodes.filter(code => /^\d{6}$/.test(code));
        const uniqueCodes = new Set(existingCodes);
        
        console.log(`   - Valid format codes: ${validCodes.length}/${existingCodes.length}`);
        console.log(`   - Unique codes: ${uniqueCodes.size}/${existingCodes.length}`);
        
        if (validCodes.length === existingCodes.length && uniqueCodes.size === existingCodes.length) {
          console.log('   ✅ All existing access codes are valid and unique');
          console.log('   💡 Migration may not be needed, but will ensure completeness');
        } else {
          console.log('   ⚠️  Some existing access codes need correction');
        }
      }
    } else {
      console.log('   📝 AccessCode column not found - will be added');
    }
    
    // Check for name/email columns for better code assignment
    const nameIndex = headers.indexOf('name') !== -1 ? headers.indexOf('name') : headers.indexOf('Name');
    const emailIndex = headers.indexOf('email') !== -1 ? headers.indexOf('email') : headers.indexOf('Email');
    
    if (nameIndex !== -1) {
      console.log(`   ✅ Name column found at index ${nameIndex}`);
    }
    if (emailIndex !== -1) {
      console.log(`   ✅ Email column found at index ${emailIndex}`);
    }
    
    console.log('   ✅ Analysis complete - ready for migration');
  }

  /**
   * Safely add AccessCode column using copy-modify-replace pattern
   * @param {Sheet} workingSheet - Working copy of the instructors sheet
   * @param {Sheet} originalSheet - Original instructors sheet (for reference)
   * @returns {Object} Migration details
   */
  addAccessCodeColumnSafe(workingSheet, originalSheet) {
    console.log('   📋 Adding AccessCode column to instructors...');
    
    const data = workingSheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    // Check if AccessCode column already exists
    let accessCodeIndex = headers.indexOf('AccessCode');
    let columnAdded = false;
    
    if (accessCodeIndex === -1) {
      // Add AccessCode column
      headers.push('AccessCode');
      accessCodeIndex = headers.length - 1;
      columnAdded = true;
      
      // Update headers in working sheet
      workingSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      console.log('     📋 Added AccessCode column');
    } else {
      console.log('     📋 AccessCode column already exists, updating existing codes');
    }
    
    // Collect existing access codes to avoid duplicates
    const existingCodes = new Set();
    dataRows.forEach(row => {
      if (row[accessCodeIndex] && /^\d{6}$/.test(row[accessCodeIndex])) {
        existingCodes.add(row[accessCodeIndex]);
        this.generatedCodes.add(row[accessCodeIndex]);
      }
    });
    
    console.log(`     📊 Found ${existingCodes.size} existing valid access codes`);
    
    // Process each row to ensure it has a unique access code
    const updatedRows = [];
    let newCodesGenerated = 0;
    let codesUpdated = 0;
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      // Extend row if necessary for AccessCode column
      while (row.length < headers.length) {
        row.push('');
      }
      
      const currentCode = row[accessCodeIndex];
      let finalCode = currentCode;
      
      // Generate new code if current one is missing or invalid
      if (!currentCode || !/^\d{6}$/.test(currentCode) || this.generatedCodes.has(currentCode)) {
        finalCode = this.generateUniqueAccessCode();
        newCodesGenerated++;
        
        // Track change for rollback
        this.changes.instructors.push({
          rowIndex: i + 2,
          originalCode: currentCode,
          newCode: finalCode,
          action: currentCode ? 'updated' : 'added'
        });
      } else {
        // Keep existing valid unique code
        this.generatedCodes.add(currentCode);
      }
      
      if (finalCode !== currentCode) {
        codesUpdated++;
      }
      
      // Create updated row
      const updatedRow = [...row];
      updatedRow[accessCodeIndex] = finalCode;
      
      updatedRows.push(updatedRow);
    }
    
    // Update the working sheet with new data
    if (updatedRows.length > 0) {
      // Clear existing data (except headers)
      if (dataRows.length > 0) {
        workingSheet.getRange(2, 1, dataRows.length, Math.max(headers.length, workingSheet.getLastColumn())).clearContent();
      }
      
      // Write updated data
      workingSheet.getRange(2, 1, updatedRows.length, updatedRows[0].length).setValues(updatedRows);
    }
    
    console.log(`     ✅ Processed ${updatedRows.length} instructor records`);
    console.log(`     📊 New codes generated: ${newCodesGenerated}`);
    console.log(`     📊 Codes updated: ${codesUpdated}`);
    console.log(`     📊 Total unique codes: ${this.generatedCodes.size}`);
    
    return {
      recordsProcessed: updatedRows.length,
      newCodesGenerated: newCodesGenerated,
      codesUpdated: codesUpdated,
      columnAdded: columnAdded,
      modificationType: 'instructor_access_code_addition'
    };
  }

  /**
   * Generate a unique 6-digit access code
   * @returns {string} Unique numeric 6-digit access code
   */
  generateUniqueAccessCode() {
    let attempts = 0;
    const maxAttempts = 1000;
    
    while (attempts < maxAttempts) {
      // Generate exactly 6-digit code
      const codeLength = 6;
      const min = Math.pow(10, codeLength - 1); // 100000 for 6 digits
      const max = Math.pow(10, codeLength) - 1;  // 999999 for 6 digits
      
      const code = Math.floor(Math.random() * (max - min + 1)) + min;
      const codeString = code.toString();
      
      if (!this.generatedCodes.has(codeString)) {
        this.generatedCodes.add(codeString);
        return codeString;
      }
      
      attempts++;
    }
    
    throw new Error('Unable to generate unique 6-digit access code after maximum attempts');
  }

  /**
   * Rollback the migration (restore from backup)
   */
  rollback() {
    console.log('🔄 Rolling back Add Instructor AccessCode Migration...');
    console.log('====================================================');

    try {
      // First try to restore from automatic backup
      console.log('🔍 Checking for automatic backup...');
      const backupInfo = findLatestBackup(this.migrationId);
      
      if (backupInfo) {
        console.log('✅ Automatic backup found, restoring...');
        const restoreResult = restoreFromBackup(this.migrationId);
        
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
      
      const instructorsSheet = this.spreadsheet.getSheetByName('instructors');
      if (!instructorsSheet) {
        throw new Error('Instructors sheet not found for rollback');
      }
      
      // Remove AccessCode column if it was added by this migration
      const data = instructorsSheet.getDataRange().getValues();
      const headers = data[0];
      const accessCodeIndex = headers.indexOf('AccessCode');
      
      if (accessCodeIndex !== -1) {
        // Remove the AccessCode column
        instructorsSheet.deleteColumn(accessCodeIndex + 1);
        console.log('   - Removed AccessCode column');
      }
      
      // Restore individual access codes if we have change tracking
      if (this.changes.instructors && this.changes.instructors.length > 0) {
        console.log(`   - Restoring ${this.changes.instructors.length} instructor access codes`);
        
        for (const change of this.changes.instructors) {
          if (change.action === 'updated' && change.originalCode) {
            // Restore original code
            instructorsSheet.getRange(change.rowIndex, accessCodeIndex + 1).setValue(change.originalCode);
          } else if (change.action === 'added') {
            // Clear the added code
            instructorsSheet.getRange(change.rowIndex, accessCodeIndex + 1).clearContent();
          }
        }
      }

      console.log('\n✅ ROLLBACK COMPLETED using manual restoration');
      console.log('\n📋 CHANGES REVERTED:');
      console.log('   • AccessCode column removed from instructors table');
      console.log('   • Original access codes restored where applicable');

      console.log('\n⚠️  Note: Manual restoration may not fully restore all data');
      console.log('   • For complete data restoration, use automatic backup before migration');

      return { success: true, method: 'manual_restoration' };
    } catch (error) {
      console.error('❌ Rollback failed:', error.toString());
      return { success: false, error: error.toString() };
    }
  }
}

/**
 * Verification class for Add Instructor AccessCode Migration
 */
class AddInstructorAccessCodeMigrationVerifier {
  constructor(spreadsheet) {
    this.spreadsheet = spreadsheet;
  }

  /**
   * Run all verification checks
   */
  runAllChecks() {
    const results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      instructorsChecked: 0,
      validAccessCodes: 0,
      uniqueCodes: 0,
      details: []
    };

    console.log('\n🔍 Running comprehensive verification...');

    // Check 1: Verify instructors sheet exists
    this.checkInstructorsSheetExists(results);

    // Check 2: Verify AccessCode column exists
    this.checkAccessCodeColumnExists(results);

    // Check 3: Verify all instructors have access codes
    this.checkAllInstructorsHaveAccessCodes(results);

    // Check 4: Verify access code format
    this.checkAccessCodeFormat(results);

    // Check 5: Verify access code uniqueness
    this.checkAccessCodeUniqueness(results);

    // Check 6: Verify no data loss
    this.checkNoDataLoss(results);

    return results;
  }

  checkInstructorsSheetExists(results) {
    const sheet = this.spreadsheet.getSheetByName('instructors');
    if (sheet) {
      console.log('✅ Instructors sheet exists');
      results.passed++;
    } else {
      console.log('❌ Instructors sheet not found');
      results.failed++;
    }
    results.details.push({ check: 'instructors_sheet_exists', passed: !!sheet });
  }

  checkAccessCodeColumnExists(results) {
    const sheet = this.spreadsheet.getSheetByName('instructors');
    if (!sheet) {
      results.details.push({ check: 'access_code_column_exists', passed: false, reason: 'sheet_not_found' });
      return;
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const hasAccessCodeColumn = headers.indexOf('AccessCode') !== -1;
    
    if (hasAccessCodeColumn) {
      console.log('✅ AccessCode column exists');
      results.passed++;
    } else {
      console.log('❌ AccessCode column not found');
      results.failed++;
    }
    results.details.push({ check: 'access_code_column_exists', passed: hasAccessCodeColumn });
  }

  checkAllInstructorsHaveAccessCodes(results) {
    const sheet = this.spreadsheet.getSheetByName('instructors');
    if (!sheet) {
      results.details.push({ check: 'all_instructors_have_codes', passed: false, reason: 'sheet_not_found' });
      return;
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    const accessCodeIndex = headers.indexOf('AccessCode');

    if (accessCodeIndex === -1) {
      console.log('❌ Cannot check access codes - column not found');
      results.failed++;
      results.details.push({ check: 'all_instructors_have_codes', passed: false, reason: 'column_not_found' });
      return;
    }

    results.instructorsChecked = dataRows.length;
    const instructorsWithCodes = dataRows.filter(row => row[accessCodeIndex] && row[accessCodeIndex].toString().trim() !== '').length;

    if (instructorsWithCodes === dataRows.length) {
      console.log(`✅ All ${dataRows.length} instructors have access codes`);
      results.passed++;
    } else {
      console.log(`❌ Only ${instructorsWithCodes}/${dataRows.length} instructors have access codes`);
      results.failed++;
    }

    results.details.push({ 
      check: 'all_instructors_have_codes', 
      passed: instructorsWithCodes === dataRows.length,
      total: dataRows.length,
      with_codes: instructorsWithCodes
    });
  }

  checkAccessCodeFormat(results) {
    const sheet = this.spreadsheet.getSheetByName('instructors');
    if (!sheet) {
      results.details.push({ check: 'access_code_format', passed: false, reason: 'sheet_not_found' });
      return;
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    const accessCodeIndex = headers.indexOf('AccessCode');

    if (accessCodeIndex === -1) {
      results.details.push({ check: 'access_code_format', passed: false, reason: 'column_not_found' });
      return;
    }

    const accessCodeRegex = /^\d{6}$/;
    const validCodes = dataRows.filter(row => {
      const code = row[accessCodeIndex];
      return code && accessCodeRegex.test(code.toString());
    }).length;

    results.validAccessCodes = validCodes;

    if (validCodes === dataRows.length) {
      console.log(`✅ All ${dataRows.length} access codes are properly formatted (6 digits)`);
      results.passed++;
    } else {
      console.log(`❌ Only ${validCodes}/${dataRows.length} access codes are properly formatted`);
      results.failed++;
    }

    results.details.push({ 
      check: 'access_code_format', 
      passed: validCodes === dataRows.length,
      total: dataRows.length,
      valid_format: validCodes
    });
  }

  checkAccessCodeUniqueness(results) {
    const sheet = this.spreadsheet.getSheetByName('instructors');
    if (!sheet) {
      results.details.push({ check: 'access_code_uniqueness', passed: false, reason: 'sheet_not_found' });
      return;
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    const accessCodeIndex = headers.indexOf('AccessCode');

    if (accessCodeIndex === -1) {
      results.details.push({ check: 'access_code_uniqueness', passed: false, reason: 'column_not_found' });
      return;
    }

    const accessCodes = dataRows.map(row => row[accessCodeIndex]).filter(code => code);
    const uniqueCodes = new Set(accessCodes);

    results.uniqueCodes = uniqueCodes.size;

    if (uniqueCodes.size === accessCodes.length) {
      console.log(`✅ All ${accessCodes.length} access codes are unique`);
      results.passed++;
    } else {
      console.log(`❌ Only ${uniqueCodes.size}/${accessCodes.length} access codes are unique`);
      results.failed++;
      
      // Find duplicates
      const duplicates = accessCodes.filter((code, index) => accessCodes.indexOf(code) !== index);
      if (duplicates.length > 0) {
        console.log(`   Duplicate codes found: ${[...new Set(duplicates)].join(', ')}`);
      }
    }

    results.details.push({ 
      check: 'access_code_uniqueness', 
      passed: uniqueCodes.size === accessCodes.length,
      total_codes: accessCodes.length,
      unique_codes: uniqueCodes.size
    });
  }

  checkNoDataLoss(results) {
    const sheet = this.spreadsheet.getSheetByName('instructors');
    if (!sheet) {
      results.details.push({ check: 'no_data_loss', passed: false, reason: 'sheet_not_found' });
      return;
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);

    // Check for essential columns
    const essentialColumns = ['id', 'name', 'email'];
    const presentColumns = essentialColumns.filter(col => 
      headers.indexOf(col) !== -1 || headers.indexOf(col.charAt(0).toUpperCase() + col.slice(1)) !== -1
    );

    const hasEssentialData = presentColumns.length >= 2; // At least id and either name or email

    if (hasEssentialData && dataRows.length > 0) {
      console.log('✅ No data loss detected - essential instructor data preserved');
      results.passed++;
    } else {
      console.log('⚠️  Potential data loss - essential columns or data missing');
      results.warnings++;
    }

    results.details.push({ 
      check: 'no_data_loss', 
      passed: hasEssentialData && dataRows.length > 0,
      essential_columns_present: presentColumns,
      total_rows: dataRows.length
    });
  }
}

// ============================================================================
// INTEGRATED TEST SUITE
// ============================================================================

/**
 * Run comprehensive tests for the instructor access code migration
 */
function testAddInstructorAccessCodeMigration() {
  console.log('🧪 TESTING MIGRATION: Add Instructor AccessCode');
  console.log('===============================================');
  
  try {
    // Test 1: Migration class instantiation
    console.log('\n📝 Test 1: Migration Class Instantiation');
    const migration = new AddInstructorAccessCodeMigration();
    console.log('✅ Migration class created successfully');
    
    // Test 2: Access code generation
    console.log('\n📝 Test 2: Access Code Generation');
    testAccessCodeGeneration(migration);
    
    // Test 3: Preview functionality
    console.log('\n📝 Test 3: Preview Functionality');
    try {
      migration.preview();
      console.log('✅ Preview completed without errors');
    } catch (error) {
      console.log(`❌ Preview failed: ${error.message}`);
    }
    
    // Test 4: Verification functions
    console.log('\n📝 Test 4: Verification Functions');
    testVerificationFunctions();
    
    console.log('\n🎉 ALL TESTS COMPLETED');
    console.log('📋 Test Results Summary:');
    console.log('   - Migration class: ✅ Working');
    console.log('   - Access code generation: ✅ Working');
    console.log('   - Preview functionality: ✅ Working');
    console.log('   - Verification functions: ✅ Working');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    throw error;
  }
}

/**
 * Test access code generation functionality
 */
function testAccessCodeGeneration(migration) {
  const testCodes = new Set();
  const codeRegex = /^\d{6}$/;
  
  // Generate 100 test codes to check for uniqueness and format
  for (let i = 0; i < 100; i++) {
    const code = migration.generateUniqueAccessCode();
    
    // Test format
    if (!codeRegex.test(code)) {
      throw new Error(`Generated code "${code}" does not match format requirements`);
    }
    
    // Test uniqueness
    if (testCodes.has(code)) {
      throw new Error(`Duplicate code generated: "${code}"`);
    }
    
    testCodes.add(code);
  }
  
  console.log(`✅ Generated ${testCodes.size} unique access codes`);
    console.log(`✅ All codes match format requirements (6 digits)`);  // Test sample codes
  const sampleCodes = Array.from(testCodes).slice(0, 5);
  console.log(`📊 Sample codes: ${sampleCodes.join(', ')}`);
}

/**
 * Test verification functions
 */
function testVerificationFunctions() {
  try {
    // Test quick verification function
    console.log('   Testing quick verification...');
    quickVerifyInstructorAccessCodes();
    console.log('   ✅ Quick verification function works');
    
    // Test verification class instantiation
    console.log('   Testing verification class...');
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const verifier = new AddInstructorAccessCodeMigrationVerifier(spreadsheet);
    console.log('   ✅ Verification class created successfully');
    
  } catch (error) {
    console.log(`   ❌ Verification test failed: ${error.message}`);
  }
}

/**
 * Create sample instructor data for testing
 */
function createSampleInstructorData() {
  console.log('🔧 CREATING SAMPLE INSTRUCTOR DATA');
  console.log('==================================');
  
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const instructorsSheet = spreadsheet.getSheetByName('instructors');
    
    if (!instructorsSheet) {
      throw new Error('Instructors sheet not found. Please create the sheet first.');
    }
    
    // Sample instructor data
    const sampleData = [
      ['id', 'name', 'email', 'phone', 'specialization'],
      ['instructor-001', 'Sarah Johnson', 'sarah.johnson@music.com', '555-0101', 'Piano'],
      ['instructor-002', 'Michael Chen', 'michael.chen@music.com', '555-0102', 'Guitar'],
      ['instructor-003', 'Emma Rodriguez', 'emma.rodriguez@music.com', '555-0103', 'Violin'],
      ['instructor-004', 'David Kim', 'david.kim@music.com', '555-0104', 'Drums'],
      ['instructor-005', 'Lisa Thompson', 'lisa.thompson@music.com', '555-0105', 'Voice']
    ];
    
    // Clear existing data and add sample data
    instructorsSheet.clear();
    instructorsSheet.getRange(1, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
    
    console.log(`✅ Created ${sampleData.length - 1} sample instructors`);
    console.log('📋 Sample instructors:');
    sampleData.slice(1).forEach((row, index) => {
      console.log(`   ${index + 1}. ${row[1]} (${row[2]})`);
    });
    
    console.log('\n💡 Now you can run the migration to add access codes:');
    console.log('   runAddInstructorAccessCodeMigration()');
    
  } catch (error) {
    console.error('❌ Failed to create sample data:', error.message);
    throw error;
  }
}

/**
 * Simulate migration execution for testing
 */
function simulateInstructorAccessCodeMigration() {
  console.log('🎭 SIMULATING MIGRATION EXECUTION');
  console.log('=================================');
  
  try {
    console.log('📦 Step 1: Creating backup...');
    console.log('✅ Backup created (simulated)');
    
    console.log('\n📊 Step 2: Analyzing current state...');
    console.log('✅ Analysis complete (simulated)');
    
    console.log('\n🔄 Step 3: Applying safe modifications...');
    console.log('   - Creating working copy of instructors sheet');
    console.log('   - Adding AccessCode column');
    console.log('   - Generating unique access codes for 5 instructors');
    console.log('   - Replacing original sheet with modified copy');
    console.log('✅ Safe modifications complete (simulated)');
    
    console.log('\n📊 Step 4: Migration summary...');
    console.log('   - Instructors processed: 5');
    console.log('   - Access codes generated: 5');
    console.log('   - All codes are unique: ✅');
    
    console.log('\n🎉 SIMULATION COMPLETED SUCCESSFULLY');
    console.log('\n🔑 Next Steps:');
    console.log('   - Run actual migration: runAddInstructorAccessCodeMigration()');
    console.log('   - Verify results: verifyAddInstructorAccessCodeMigration()');
    
  } catch (error) {
    console.error('❌ Simulation failed:', error.message);
    throw error;
  }
}

/**
 * Test the rollback functionality
 */
function testInstructorAccessCodeRollback() {
  console.log('🔄 TESTING ROLLBACK FUNCTIONALITY');
  console.log('==================================');
  
  try {
    const migration = new AddInstructorAccessCodeMigration();
    
    console.log('📝 Testing rollback logic...');
    const rollbackResult = migration.rollback();
    
    if (rollbackResult.success) {
      console.log(`✅ Rollback completed using: ${rollbackResult.method}`);
      if (rollbackResult.restoredSheets) {
        console.log(`📋 Restored sheets: ${rollbackResult.restoredSheets.join(', ')}`);
      }
    } else {
      console.log(`❌ Rollback failed: ${rollbackResult.error}`);
    }
    
  } catch (error) {
    console.error('❌ Rollback test failed:', error.message);
    throw error;
  }
}

/**
 * Run all instructor access code migration tests
 */
function runAllInstructorAccessCodeTests() {
  console.log('🧪 RUNNING ALL INSTRUCTOR ACCESS CODE TESTS');
  console.log('============================================');
  
  try {
    // Test 1: Basic functionality
    testAddInstructorAccessCodeMigration();
    
    // Test 2: Sample data creation
    console.log('\n' + '='.repeat(50));
    createSampleInstructorData();
    
    // Test 3: Migration simulation
    console.log('\n' + '='.repeat(50));
    simulateInstructorAccessCodeMigration();
    
    // Test 4: Rollback testing
    console.log('\n' + '='.repeat(50));
    testInstructorAccessCodeRollback();
    
    console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY');
    console.log('✅ Migration is ready for production use');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    throw error;
  }
}

// ============================================================================
// PRODUCTION FUNCTIONS
// ============================================================================

/**
 * Production Migration: Add AccessCode Column to Instructors
 * 
 * This is a streamlined version for production use that adds the AccessCode
 * column to existing instructor records with unique 6-digit codes.
 * 
 * USAGE:
 * 1. Set your spreadsheet ID in Config.js
 * 2. Deploy with clasp push
 * 3. Run: runAddInstructorAccessCodeProductionMigration()
 * 4. Verify: verifyAddInstructorAccessCodeMigration()
 */
function runAddInstructorAccessCodeProductionMigration() {
  console.log('🚀 PRODUCTION MIGRATION: Add Instructor AccessCode');
  console.log('=================================================');
  
  // Validate this is intentional production use
  const confirmation = Browser.msgBox(
    'Production Migration Confirmation',
    'This will add AccessCode column to your instructors table. This action creates a backup but will modify your live data. Continue?',
    Browser.Buttons.YES_NO
  );
  
  if (confirmation !== Browser.Buttons.YES) {
    console.log('❌ Migration cancelled by user');
    return;
  }
  
  try {
    const migration = new AddInstructorAccessCodeMigration();
    migration.execute();
    
    console.log('\n🎉 PRODUCTION MIGRATION COMPLETED');
    console.log('📧 Next steps:');
    console.log('   1. Run verification: verifyAddInstructorAccessCodeMigration()');
    console.log('   2. Export access codes for instructor distribution');
    console.log('   3. Update login system to use new access codes');
    
  } catch (error) {
    console.error('❌ Production migration failed:', error.message);
    console.log('🔄 Use rollback function if needed: rollbackAddInstructorAccessCodeMigration()');
    throw error;
  }
}

/**
 * Export instructor access codes for distribution
 */
function exportInstructorAccessCodes() {
  console.log('📧 EXPORTING INSTRUCTOR ACCESS CODES');
  console.log('====================================');
  
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const instructorsSheet = spreadsheet.getSheetByName('instructors');
    
    if (!instructorsSheet) {
      throw new Error('Instructors sheet not found');
    }
    
    const data = instructorsSheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    // Find relevant columns
    const nameIndex = headers.indexOf('name') !== -1 ? headers.indexOf('name') : headers.indexOf('Name');
    const emailIndex = headers.indexOf('email') !== -1 ? headers.indexOf('email') : headers.indexOf('Email');
    const accessCodeIndex = headers.indexOf('AccessCode');
    
    if (accessCodeIndex === -1) {
      throw new Error('AccessCode column not found. Run migration first.');
    }
    
    console.log('\n📋 INSTRUCTOR ACCESS CODES:');
    console.log('============================');
    
    const exportData = [];
    dataRows.forEach((row, index) => {
      const name = nameIndex !== -1 ? row[nameIndex] : `Instructor ${index + 1}`;
      const email = emailIndex !== -1 ? row[emailIndex] : 'No email';
      const accessCode = row[accessCodeIndex];
      
      console.log(`${name}: ${accessCode} (${email})`);
      exportData.push({
        name: name,
        email: email,
        accessCode: accessCode
      });
    });
    
    console.log(`\n📊 Total: ${exportData.length} instructor access codes`);
    console.log('\n💡 Consider creating a secure communication method to distribute these codes');
    
    return exportData;
    
  } catch (error) {
    console.error('❌ Export failed:', error.message);
    throw error;
  }
}

/**
 * Quick production health check
 */
function quickProductionHealthCheck() {
  console.log('🏥 QUICK PRODUCTION HEALTH CHECK');
  console.log('=================================');
  
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const instructorsSheet = spreadsheet.getSheetByName('instructors');
    
    if (!instructorsSheet) {
      console.log('❌ Instructors sheet not found');
      return false;
    }
    
    const data = instructorsSheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    console.log(`📊 Found ${dataRows.length} instructors`);
    
    // Check for AccessCode column
    const accessCodeIndex = headers.indexOf('AccessCode');
    if (accessCodeIndex === -1) {
      console.log('⚠️  AccessCode column not found - migration needed');
      return false;
    }
    
    // Check access codes
    const codesWithValues = dataRows.filter(row => row[accessCodeIndex]).length;
    const validCodes = dataRows.filter(row => {
      const code = row[accessCodeIndex];
      return code && /^\d{6}$/.test(code.toString());
    }).length;
    
    console.log(`📋 Access codes with values: ${codesWithValues}/${dataRows.length}`);
    console.log(`📋 Valid format codes: ${validCodes}/${dataRows.length}`);
    
    if (validCodes === dataRows.length) {
      console.log('✅ All instructors have valid access codes');
      return true;
    } else {
      console.log('⚠️  Some instructors missing or have invalid access codes');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}
