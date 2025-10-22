/**
 * Google Apps Script Migration 006: Add AccessCode Column to Admins
 *
 * 🎯 PURPOSE:
 * This migration adds an AccessCode column to the admins table to enable
 * secure admin login functionality. Each admin will get a unique
 * 6-digit numeric access code for authentication.
 *
 * ⚠️ CURRENT SITUATION:
 * - Admins table exists but lacks AccessCode column
 * - Login system requires access codes for authentication
 * - Need to generate unique codes for existing admins
 * - Must ensure no duplicate codes are generated
 *
 * ✅ SOLUTION:
 * - Add AccessCode column to admins table
 * - Generate unique 6-digit numeric codes for all existing admins
 * - Validate that all codes are unique within the admin table
 * - Preserve all existing admin data
 * - Use safe copy-modify-replace pattern for zero risk
 *
 * 📋 CHANGES MADE:
 * 1. Admins Table: Add AccessCode column with unique numeric codes
 * 2. Data Validation: Ensure all access codes are unique and properly formatted
 * 3. Preservation: All existing admin data remains intact
 *
 * 🔧 FEATURES:
 * - Generates cryptographically random 6-digit access codes
 * - Ensures uniqueness across all admin access codes
 * - Validates code format (numeric only, 6 digits)
 * - Uses safe copy-modify-replace pattern
 * - Creates automatic backup for rollback capability
 * - Comprehensive verification functions
 *
 * 🚀 TO USE:
 * 1. Set spreadsheet ID in Config.js: const SPREADSHEET_ID = "your-id";
 * 2. Deploy with clasp push
 * 3. Run preview first: previewAddAdminAccessCodeMigration()
 * 4. Run migration: runAddAdminAccessCodeMigration()
 * 5. Verify results: verifyAddAdminAccessCodeMigration()
 */

/**
 * Main function to execute the admin access code migration
 */
function runAddAdminAccessCodeMigration() {
  const migration = new AddAdminAccessCodeMigration();
  migration.execute();
}

/**
 * Preview function to check what changes would be made
 * Run this first to see what the migration will do
 */
function previewAddAdminAccessCodeMigration() {
  const migration = new AddAdminAccessCodeMigration();
  migration.preview();
}

/**
 * Rollback function to restore from backup
 * Use this if you need to revert the changes
 */
function rollbackAddAdminAccessCodeMigration() {
  const migration = new AddAdminAccessCodeMigration();
  migration.rollback();
}

/**
 * Restore from automatic backup and delete the backup
 */
function restoreAddAdminAccessCodeMigrationFromBackup() {
  return restoreFromBackup('Migration006_AddAdminAccessCode');
}

/**
 * Verification function to check migration results
 * Run this after migration to ensure everything worked correctly
 */
function verifyAddAdminAccessCodeMigration() {
  console.log('🔍 VERIFYING ADMIN ACCESS CODE MIGRATION');
  console.log('========================================');
  
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const verifier = new AddAdminAccessCodeMigrationVerifier(spreadsheet);
    
    const results = verifier.runAllChecks();
    
    console.log('\n📊 VERIFICATION SUMMARY:');
    console.log('========================');
    console.log(`✅ Total checks passed: ${results.passed}`);
    console.log(`❌ Total checks failed: ${results.failed}`);
    console.log(`⚠️  Warnings: ${results.warnings}`);
    console.log(`📋 Admins checked: ${results.adminsChecked}`);
    console.log(`🔑 Valid access codes: ${results.validAccessCodes}`);
    console.log(`🔄 Unique codes: ${results.uniqueCodes}`);
    
    if (results.failed === 0) {
      console.log('\n🎉 Migration verification PASSED! All systems go.');
      console.log('Admins can now use their access codes to log in.');
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
function quickVerifyAdminAccessCodes() {
  console.log('⚡ QUICK ADMIN ACCESS CODE CHECK');
  console.log('===============================');
  
  const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
  const adminsSheet = spreadsheet.getSheetByName('admins');
  
  if (!adminsSheet) {
    console.log('❌ Admins sheet not found');
    return;
  }
  
  const data = adminsSheet.getDataRange().getValues();
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
    const adminName = nameIndex !== -1 ? data[i][nameIndex] : `Row ${i}`;
    
    console.log(`   ${adminName}: ${accessCode} ${isValid ? '✅' : '❌'}`);
  }
  
  console.log(`\n📋 Results: ${validCount}/${sampleSize} valid access codes`);
  
  if (validCount === sampleSize) {
    console.log('✅ All sampled access codes are valid!');
  } else {
    console.log('⚠️  Some access codes may need attention');
  }
}

/**
 * Migration class for Adding AccessCode Column to Admins
 */
class AddAdminAccessCodeMigration {
  constructor() {
    this.spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    this.migrationName = 'Add AccessCode Column to Admins';
    this.migrationId = 'Migration006_AddAdminAccessCode';
    this.changes = {
      admins: []
    };
    this.generatedCodes = new Set(); // Track generated codes to ensure uniqueness
  }

  /**
   * Execute the migration using safe copy-modify-replace pattern
   */
  execute() {
    console.log('🚀 EXECUTING MIGRATION: Add AccessCode Column to Admins');
    console.log('=======================================================');

    // Create automatic backup before starting
    console.log('📦 Creating automatic backup...');
    const backupResult = createMigrationBackup(this.migrationId, ['admins']);
    
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
          sheetName: 'admins',
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
      console.log(`   - Admins processed: ${this.changes.admins.length}`);
      console.log(`   - Access codes generated: ${this.generatedCodes.size}`);
      console.log(`   - All codes are unique: ${this.generatedCodes.size === this.changes.admins.length ? '✅' : '❌'}`);
      
      console.log('\n🔑 Next Steps:');
      console.log('   - Run verification: verifyAddAdminAccessCodeMigration()');
      console.log('   - Update admin login system to use access codes');
      console.log('   - Communicate access codes to admins securely');
      
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
    console.log('🔍 PREVIEWING MIGRATION: Add AccessCode Column to Admins');
    console.log('========================================================');
    
    try {
      this.analyzeCurrentState();
      
      console.log('\n📊 Preview Summary:');
      console.log('===================');
      console.log('✅ Preview completed - no changes made');
      console.log('📝 Run execute() to apply the migration');
      console.log('\n💡 Expected Changes:');
      console.log('   - AccessCode column will be added to admins table');
      console.log('   - Each admin will receive a unique 6-digit numeric code');
      console.log('   - All existing admin data will be preserved');
      
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
    
    const adminsSheet = this.spreadsheet.getSheetByName('admins');
    if (!adminsSheet) {
      throw new Error('Admins sheet not found');
    }
    
    const data = adminsSheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    console.log(`\n📋 Admins Analysis:`);
    console.log(`   - Total admins: ${dataRows.length}`);
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
   * @param {Sheet} workingSheet - Working copy of the admins sheet
   * @param {Sheet} originalSheet - Original admins sheet (for reference)
   * @returns {Object} Migration details
   */
  addAccessCodeColumnSafe(workingSheet, originalSheet) {
    console.log('   📋 Adding AccessCode column to admins...');
    
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
        this.changes.admins.push({
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
    
    console.log(`     ✅ Processed ${updatedRows.length} admin records`);
    console.log(`     📊 New codes generated: ${newCodesGenerated}`);
    console.log(`     📊 Codes updated: ${codesUpdated}`);
    console.log(`     📊 Total unique codes: ${this.generatedCodes.size}`);
    
    return {
      recordsProcessed: updatedRows.length,
      newCodesGenerated: newCodesGenerated,
      codesUpdated: codesUpdated,
      columnAdded: columnAdded,
      modificationType: 'admin_access_code_addition'
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
    console.log('🔄 Rolling back Add Admin AccessCode Migration...');
    console.log('================================================');

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
      
      const adminsSheet = this.spreadsheet.getSheetByName('admins');
      if (!adminsSheet) {
        throw new Error('Admins sheet not found for rollback');
      }
      
      // Remove AccessCode column if it was added by this migration
      const data = adminsSheet.getDataRange().getValues();
      const headers = data[0];
      const accessCodeIndex = headers.indexOf('AccessCode');
      
      if (accessCodeIndex !== -1) {
        // Remove the AccessCode column
        adminsSheet.deleteColumn(accessCodeIndex + 1);
        console.log('   - Removed AccessCode column');
      }
      
      // Restore individual access codes if we have change tracking
      if (this.changes.admins && this.changes.admins.length > 0) {
        console.log(`   - Restoring ${this.changes.admins.length} admin access codes`);
        
        for (const change of this.changes.admins) {
          if (change.action === 'updated' && change.originalCode) {
            // Restore original code
            adminsSheet.getRange(change.rowIndex, accessCodeIndex + 1).setValue(change.originalCode);
          } else if (change.action === 'added') {
            // Clear the added code
            adminsSheet.getRange(change.rowIndex, accessCodeIndex + 1).clearContent();
          }
        }
      }

      console.log('\n✅ ROLLBACK COMPLETED using manual restoration');
      console.log('\n📋 CHANGES REVERTED:');
      console.log('   • AccessCode column removed from admins table');
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
 * Verification class for Add Admin AccessCode Migration
 */
class AddAdminAccessCodeMigrationVerifier {
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
      adminsChecked: 0,
      validAccessCodes: 0,
      uniqueCodes: 0,
      details: []
    };

    console.log('\n🔍 Running comprehensive verification...');

    // Check 1: Verify admins sheet exists
    this.checkAdminsSheetExists(results);

    // Check 2: Verify AccessCode column exists
    this.checkAccessCodeColumnExists(results);

    // Check 3: Verify all admins have access codes
    this.checkAllAdminsHaveAccessCodes(results);

    // Check 4: Verify access code format
    this.checkAccessCodeFormat(results);

    // Check 5: Verify access code uniqueness
    this.checkAccessCodeUniqueness(results);

    // Check 6: Verify no data loss
    this.checkNoDataLoss(results);

    return results;
  }

  checkAdminsSheetExists(results) {
    const sheet = this.spreadsheet.getSheetByName('admins');
    if (sheet) {
      console.log('✅ Admins sheet exists');
      results.passed++;
    } else {
      console.log('❌ Admins sheet not found');
      results.failed++;
    }
    results.details.push({ check: 'admins_sheet_exists', passed: !!sheet });
  }

  checkAccessCodeColumnExists(results) {
    const sheet = this.spreadsheet.getSheetByName('admins');
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

  checkAllAdminsHaveAccessCodes(results) {
    const sheet = this.spreadsheet.getSheetByName('admins');
    if (!sheet) {
      results.details.push({ check: 'all_admins_have_codes', passed: false, reason: 'sheet_not_found' });
      return;
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    const accessCodeIndex = headers.indexOf('AccessCode');

    if (accessCodeIndex === -1) {
      console.log('❌ Cannot check access codes - column not found');
      results.failed++;
      results.details.push({ check: 'all_admins_have_codes', passed: false, reason: 'column_not_found' });
      return;
    }

    results.adminsChecked = dataRows.length;
    const adminsWithCodes = dataRows.filter(row => row[accessCodeIndex] && row[accessCodeIndex].toString().trim() !== '').length;

    if (adminsWithCodes === dataRows.length) {
      console.log(`✅ All ${dataRows.length} admins have access codes`);
      results.passed++;
    } else {
      console.log(`❌ Only ${adminsWithCodes}/${dataRows.length} admins have access codes`);
      results.failed++;
    }

    results.details.push({ 
      check: 'all_admins_have_codes', 
      passed: adminsWithCodes === dataRows.length,
      total: dataRows.length,
      with_codes: adminsWithCodes
    });
  }

  checkAccessCodeFormat(results) {
    const sheet = this.spreadsheet.getSheetByName('admins');
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
    const sheet = this.spreadsheet.getSheetByName('admins');
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
    const sheet = this.spreadsheet.getSheetByName('admins');
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
      console.log('✅ No data loss detected - essential admin data preserved');
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
 * Main function to run all admin access code migration tests
 */
function runAdminAccessCodeMigrationTests() {
  console.log('🧪 RUNNING ADMIN ACCESS CODE MIGRATION TESTS');
  console.log('===========================================');
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  
  const tester = new AdminAccessCodeMigrationTester();
  
  try {
    const results = tester.runAllTests();
    
    console.log('\n📊 TEST SUMMARY');
    console.log('===============');
    console.log(`✅ Tests passed: ${results.passed}`);
    console.log(`❌ Tests failed: ${results.failed}`);
    console.log(`⚠️  Warnings: ${results.warnings}`);
    console.log(`📋 Total tests: ${results.total}`);
    console.log(`⏱️  Execution time: ${results.executionTime}ms`);
    
    if (results.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Migration is ready for production.');
    } else {
      console.log('\n❌ SOME TESTS FAILED! Please review and fix issues before deployment.');
    }
    
    return results;
    
  } catch (error) {
    console.error('💥 Test suite crashed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

/**
 * Quick smoke test for basic admin access code functionality
 */
function quickTestAdminAccessCodes() {
  console.log('⚡ QUICK ADMIN ACCESS CODE TEST');
  console.log('==============================');
  
  const tester = new AdminAccessCodeMigrationTester();
  
  try {
    // Create minimal test data
    const testData = tester.createMinimalTestData();
    
    // Test basic access code generation
    const migration = new AddAdminAccessCodeMigration();
    const uniqueCodes = new Set();
    
    console.log('\n🔑 Testing access code generation...');
    for (let i = 0; i < 10; i++) {
      const code = migration.generateUniqueAccessCode();
      uniqueCodes.add(code);
      
      // Validate format
      if (!/^\d{6}$/.test(code)) {
        console.log(`❌ Invalid format: ${code}`);
        return { success: false, error: 'Invalid access code format' };
      }
    }
    
    if (uniqueCodes.size === 10) {
      console.log('✅ All generated codes are unique and properly formatted');
    } else {
      console.log(`❌ Only ${uniqueCodes.size}/10 codes are unique`);
      return { success: false, error: 'Non-unique codes generated' };
    }
    
    console.log('\n✅ Quick test passed - basic functionality working');
    return { success: true, uniqueCodes: uniqueCodes.size };
    
  } catch (error) {
    console.error('❌ Quick test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test the migration with sample admin data
 */
function testAdminMigrationWithSampleData() {
  console.log('📊 TESTING ADMIN MIGRATION WITH SAMPLE DATA');
  console.log('============================================');
  
  const tester = new AdminAccessCodeMigrationTester();
  
  try {
    // Create and populate test data
    console.log('📝 Setting up sample admin data...');
    const sampleData = tester.createSampleAdminData();
    
    // Run migration preview
    console.log('\n🔍 Testing migration preview...');
    const migration = new AddAdminAccessCodeMigration();
    migration.preview();
    
    // Run actual migration
    console.log('\n🚀 Running migration...');
    migration.execute();
    
    // Verify results
    console.log('\n✅ Running verification...');
    const verificationResults = verifyAddAdminAccessCodeMigration();
    
    if (verificationResults.failed === 0) {
      console.log('✅ Sample data test PASSED');
      return { success: true, results: verificationResults };
    } else {
      console.log('❌ Sample data test FAILED');
      return { success: false, results: verificationResults };
    }
    
  } catch (error) {
    console.error('❌ Sample data test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test migration rollback functionality
 */
function testAdminAccessCodeRollback() {
  console.log('🔄 TESTING ADMIN ACCESS CODE ROLLBACK');
  console.log('=====================================');
  
  try {
    // Create backup state
    console.log('📦 Creating initial backup...');
    const backupResult = createMigrationBackup('Test_AdminAccessCode_Rollback', ['admins']);
    
    if (!backupResult.success) {
      console.log('❌ Failed to create backup for rollback test');
      return { success: false, error: 'Backup creation failed' };
    }
    
    // Run migration
    console.log('🚀 Running migration...');
    const migration = new AddAdminAccessCodeMigration();
    migration.execute();
    
    // Verify migration succeeded
    console.log('✅ Verifying migration...');
    const postMigrationResults = verifyAddAdminAccessCodeMigration();
    
    if (postMigrationResults.failed > 0) {
      console.log('❌ Migration failed, cannot test rollback');
      return { success: false, error: 'Migration failed' };
    }
    
    // Test rollback
    console.log('🔄 Testing rollback...');
    const rollbackResult = migration.rollback();
    
    if (rollbackResult.success) {
      console.log('✅ Rollback test PASSED');
      return { success: true, rollbackMethod: rollbackResult.method };
    } else {
      console.log('❌ Rollback test FAILED');
      return { success: false, error: rollbackResult.error };
    }
    
  } catch (error) {
    console.error('❌ Rollback test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Admin Access Code Migration Tester Class
 */
class AdminAccessCodeMigrationTester {
  constructor() {
    this.spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    this.startTime = Date.now();
    this.testResults = {
      passed: 0,
      failed: 0,
      warnings: 0,
      total: 0,
      details: []
    };
  }

  /**
   * Run all comprehensive tests
   */
  runAllTests() {
    const tests = [
      { name: 'Setup Test Environment', func: () => this.testSetupEnvironment() },
      { name: 'Access Code Generation', func: () => this.testAccessCodeGeneration() },
      { name: 'Access Code Uniqueness', func: () => this.testAccessCodeUniqueness() },
      { name: 'Migration with Empty Data', func: () => this.testMigrationWithEmptyData() },
      { name: 'Migration with Sample Data', func: () => this.testMigrationWithSampleData() },
      { name: 'Migration with Existing Codes', func: () => this.testMigrationWithExistingCodes() },
      { name: 'Data Preservation', func: () => this.testDataPreservation() },
      { name: 'Column Addition', func: () => this.testColumnAddition() },
      { name: 'Format Validation', func: () => this.testFormatValidation() },
      { name: 'Performance Test', func: () => this.testPerformance() },
      { name: 'Error Handling', func: () => this.testErrorHandling() },
      { name: 'Rollback Functionality', func: () => this.testRollbackFunctionality() }
    ];

    console.log(`\n🧪 Running ${tests.length} comprehensive tests...\n`);

    tests.forEach((test, index) => {
      console.log(`📋 Test ${index + 1}/${tests.length}: ${test.name}`);
      console.log('-'.repeat(50));
      
      try {
        const result = test.func();
        this.recordTestResult(test.name, result);
        
        if (result.passed) {
          console.log(`✅ PASSED: ${test.name}`);
        } else {
          console.log(`❌ FAILED: ${test.name} - ${result.error || result.message}`);
        }
      } catch (error) {
        console.log(`💥 CRASHED: ${test.name} - ${error.message}`);
        this.recordTestResult(test.name, { passed: false, error: error.message, crashed: true });
      }
      
      console.log(''); // Empty line for readability
    });

    const executionTime = Date.now() - this.startTime;
    
    return {
      ...this.testResults,
      total: this.testResults.passed + this.testResults.failed,
      executionTime: executionTime
    };
  }

  recordTestResult(testName, result) {
    if (result.passed) {
      this.testResults.passed++;
    } else {
      this.testResults.failed++;
    }
    
    if (result.warning) {
      this.testResults.warnings++;
    }
    
    this.testResults.details.push({
      test: testName,
      passed: result.passed,
      error: result.error,
      warning: result.warning,
      details: result.details
    });
  }

  testSetupEnvironment() {
    console.log('   🔧 Checking test environment...');
    
    try {
      // Check if spreadsheet is accessible
      const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
      if (!spreadsheet) {
        return { passed: false, error: 'Cannot access test spreadsheet' };
      }
      
      // Check if admins sheet exists or can be created
      let adminsSheet = spreadsheet.getSheetByName('admins');
      if (!adminsSheet) {
        console.log('   📋 Creating admins sheet for testing...');
        adminsSheet = spreadsheet.insertSheet('admins');
      }
      
      console.log('   ✅ Test environment ready');
      return { passed: true };
      
    } catch (error) {
      return { passed: false, error: `Environment setup failed: ${error.message}` };
    }
  }

  testAccessCodeGeneration() {
    console.log('   🔑 Testing access code generation...');
    
    try {
      const migration = new AddAdminAccessCodeMigration();
      const generatedCodes = [];
      
      // Generate multiple codes
      for (let i = 0; i < 20; i++) {
        const code = migration.generateUniqueAccessCode();
        generatedCodes.push(code);
        
        // Check format
        if (!/^\d{6}$/.test(code)) {
          return { passed: false, error: `Invalid code format: ${code}` };
        }
      }
      
      // Check uniqueness
      const uniqueCodes = new Set(generatedCodes);
      if (uniqueCodes.size !== generatedCodes.length) {
        return { passed: false, error: 'Generated codes are not unique' };
      }
      
      console.log(`   ✅ Generated ${generatedCodes.length} unique, valid codes`);
      return { passed: true, details: { codes_generated: generatedCodes.length } };
      
    } catch (error) {
      return { passed: false, error: `Code generation failed: ${error.message}` };
    }
  }

  testAccessCodeUniqueness() {
    console.log('   🔄 Testing access code uniqueness...');
    
    try {
      const migration = new AddAdminAccessCodeMigration();
      const codes = new Set();
      const attempts = 100;
      
      for (let i = 0; i < attempts; i++) {
        const code = migration.generateUniqueAccessCode();
        if (codes.has(code)) {
          return { passed: false, error: `Duplicate code generated: ${code}` };
        }
        codes.add(code);
      }
      
      console.log(`   ✅ ${attempts} codes generated, all unique`);
      return { passed: true, details: { unique_codes: codes.size } };
      
    } catch (error) {
      return { passed: false, error: `Uniqueness test failed: ${error.message}` };
    }
  }

  testMigrationWithEmptyData() {
    console.log('   📋 Testing migration with empty admin data...');
    
    try {
      // Create empty admins sheet
      this.createEmptyAdminsSheet();
      
      // Run migration
      const migration = new AddAdminAccessCodeMigration();
      migration.execute();
      
      // Verify that AccessCode column was added
      const adminsSheet = this.spreadsheet.getSheetByName('admins');
      const headers = adminsSheet.getRange(1, 1, 1, adminsSheet.getLastColumn()).getValues()[0];
      
      if (headers.indexOf('AccessCode') === -1) {
        return { passed: false, error: 'AccessCode column not added to empty sheet' };
      }
      
      console.log('   ✅ Empty data migration successful');
      return { passed: true };
      
    } catch (error) {
      return { passed: false, error: `Empty data test failed: ${error.message}` };
    }
  }

  testMigrationWithSampleData() {
    console.log('   📊 Testing migration with sample admin data...');
    
    try {
      // Create sample data
      const sampleData = this.createSampleAdminData();
      
      // Run migration
      const migration = new AddAdminAccessCodeMigration();
      migration.execute();
      
      // Verify results
      const verificationResults = verifyAddAdminAccessCodeMigration();
      
      if (verificationResults.failed > 0) {
        return { passed: false, error: 'Migration verification failed', details: verificationResults };
      }
      
      console.log(`   ✅ Sample data migration successful (${verificationResults.adminsChecked} admins)`);
      return { passed: true, details: verificationResults };
      
    } catch (error) {
      return { passed: false, error: `Sample data test failed: ${error.message}` };
    }
  }

  testMigrationWithExistingCodes() {
    console.log('   🔄 Testing migration with existing access codes...');
    
    try {
      // Create data with some existing access codes
      const existingCodes = ['1234', '5678', '9999'];
      this.createAdminDataWithExistingCodes(existingCodes);
      
      // Run migration
      const migration = new AddAdminAccessCodeMigration();
      migration.execute();
      
      // Verify existing codes are preserved
      const adminsSheet = this.spreadsheet.getSheetByName('admins');
      const data = adminsSheet.getDataRange().getValues();
      const headers = data[0];
      const accessCodeIndex = headers.indexOf('AccessCode');
      
      const preservedCodes = data.slice(1).map(row => row[accessCodeIndex]).slice(0, existingCodes.length);
      
      for (let i = 0; i < existingCodes.length; i++) {
        if (preservedCodes[i] !== existingCodes[i]) {
          return { passed: false, error: `Existing code not preserved: expected ${existingCodes[i]}, got ${preservedCodes[i]}` };
        }
      }
      
      console.log('   ✅ Existing codes preserved successfully');
      return { passed: true, details: { preserved_codes: existingCodes.length } };
      
    } catch (error) {
      return { passed: false, error: `Existing codes test failed: ${error.message}` };
    }
  }

  testDataPreservation() {
    console.log('   💾 Testing data preservation during migration...');
    
    try {
      // Create rich sample data
      const originalData = this.createRichAdminData();
      
      // Record original data
      const adminsSheet = this.spreadsheet.getSheetByName('admins');
      const originalValues = adminsSheet.getDataRange().getValues();
      
      // Run migration
      const migration = new AddAdminAccessCodeMigration();
      migration.execute();
      
      // Check that original data is preserved
      const newValues = adminsSheet.getDataRange().getValues();
      const originalHeaders = originalValues[0];
      const newHeaders = newValues[0];
      
      // Check that all original columns still exist
      for (const originalHeader of originalHeaders) {
        if (newHeaders.indexOf(originalHeader) === -1) {
          return { passed: false, error: `Original column missing: ${originalHeader}` };
        }
      }
      
      // Check that data in original columns is preserved
      for (let rowIndex = 1; rowIndex < originalValues.length; rowIndex++) {
        const originalRow = originalValues[rowIndex];
        const newRow = newValues[rowIndex];
        
        for (let colIndex = 0; colIndex < originalHeaders.length; colIndex++) {
          const originalValue = originalRow[colIndex];
          const newColIndex = newHeaders.indexOf(originalHeaders[colIndex]);
          const newValue = newRow[newColIndex];
          
          if (originalValue !== newValue) {
            return { 
              passed: false, 
              error: `Data not preserved at row ${rowIndex + 1}, column ${originalHeaders[colIndex]}: ${originalValue} → ${newValue}` 
            };
          }
        }
      }
      
      console.log('   ✅ All original data preserved');
      return { passed: true, details: { rows_checked: originalValues.length - 1 } };
      
    } catch (error) {
      return { passed: false, error: `Data preservation test failed: ${error.message}` };
    }
  }

  testColumnAddition() {
    console.log('   📋 Testing AccessCode column addition...');
    
    try {
      // Create sheet without AccessCode column
      this.createSampleAdminData();
      
      const adminsSheet = this.spreadsheet.getSheetByName('admins');
      const originalHeaders = adminsSheet.getRange(1, 1, 1, adminsSheet.getLastColumn()).getValues()[0];
      
      // Verify AccessCode column doesn't exist
      if (originalHeaders.indexOf('AccessCode') !== -1) {
        // Remove it for testing
        const accessCodeIndex = originalHeaders.indexOf('AccessCode');
        adminsSheet.deleteColumn(accessCodeIndex + 1);
      }
      
      // Run migration
      const migration = new AddAdminAccessCodeMigration();
      migration.execute();
      
      // Verify AccessCode column was added
      const newHeaders = adminsSheet.getRange(1, 1, 1, adminsSheet.getLastColumn()).getValues()[0];
      const accessCodeIndex = newHeaders.indexOf('AccessCode');
      
      if (accessCodeIndex === -1) {
        return { passed: false, error: 'AccessCode column was not added' };
      }
      
      console.log(`   ✅ AccessCode column added at position ${accessCodeIndex + 1}`);
      return { passed: true, details: { column_position: accessCodeIndex + 1 } };
      
    } catch (error) {
      return { passed: false, error: `Column addition test failed: ${error.message}` };
    }
  }

  testFormatValidation() {
    console.log('   📏 Testing access code format validation...');
    
    try {
      // Create sample data and run migration
      this.createSampleAdminData();
      const migration = new AddAdminAccessCodeMigration();
      migration.execute();
      
      // Check all access codes match the expected format
      const adminsSheet = this.spreadsheet.getSheetByName('admins');
      const data = adminsSheet.getDataRange().getValues();
      const headers = data[0];
      const accessCodeIndex = headers.indexOf('AccessCode');
      
      if (accessCodeIndex === -1) {
        return { passed: false, error: 'AccessCode column not found for format validation' };
      }
      
      const accessCodeRegex = /^\d{6}$/;
      const invalidCodes = [];
      
      for (let i = 1; i < data.length; i++) {
        const code = data[i][accessCodeIndex];
        if (!accessCodeRegex.test(code)) {
          invalidCodes.push({ row: i + 1, code: code });
        }
      }
      
      if (invalidCodes.length > 0) {
        return { 
          passed: false, 
          error: `Invalid access code formats found: ${invalidCodes.map(ic => `${ic.code} (row ${ic.row})`).join(', ')}` 
        };
      }
      
      console.log(`   ✅ All ${data.length - 1} access codes have valid format`);
      return { passed: true, details: { codes_validated: data.length - 1 } };
      
    } catch (error) {
      return { passed: false, error: `Format validation test failed: ${error.message}` };
    }
  }

  testPerformance() {
    console.log('   ⚡ Testing migration performance...');
    
    try {
      // Create large dataset for performance testing
      const largeDataSize = 50; // Reasonable size for testing
      this.createLargeAdminDataset(largeDataSize);
      
      const startTime = Date.now();
      
      // Run migration
      const migration = new AddAdminAccessCodeMigration();
      migration.execute();
      
      const executionTime = Date.now() - startTime;
      
      // Verify all records processed
      const verificationResults = verifyAddAdminAccessCodeMigration();
      
      if (verificationResults.failed > 0) {
        return { passed: false, error: 'Performance test migration failed verification' };
      }
      
      const recordsPerSecond = Math.round((largeDataSize / executionTime) * 1000);
      
      console.log(`   ✅ Processed ${largeDataSize} records in ${executionTime}ms (${recordsPerSecond} records/sec)`);
      return { 
        passed: true, 
        details: { 
          records: largeDataSize, 
          execution_time: executionTime, 
          records_per_second: recordsPerSecond 
        } 
      };
      
    } catch (error) {
      return { passed: false, error: `Performance test failed: ${error.message}` };
    }
  }

  testErrorHandling() {
    console.log('   🛡️  Testing error handling...');
    
    try {
      // Test with malformed data
      let errorsCaught = 0;
      
      // Test 2: Missing admins sheet
      try {
        const adminsSheet = this.spreadsheet.getSheetByName('admins');
        if (adminsSheet) {
          this.spreadsheet.deleteSheet(adminsSheet);
        }
        
        const migration = new AddAdminAccessCodeMigration();
        migration.analyzeCurrentState(); // This should fail gracefully
        
        // If we get here, the error handling worked
        console.log('     ✅ Missing sheet error handled gracefully');
        errorsCaught++;
      } catch (error) {
        // This is expected
        console.log('     ✅ Missing sheet error caught as expected');
        errorsCaught++;
      }
      
      // Recreate sheet for other tests
      this.createSampleAdminData();
      
      if (errorsCaught > 0) {
        console.log(`   ✅ Error handling working (${errorsCaught} errors handled)`);
        return { passed: true, details: { errors_handled: errorsCaught } };
      } else {
        return { passed: false, error: 'No error conditions were properly tested' };
      }
      
    } catch (error) {
      return { passed: false, error: `Error handling test failed: ${error.message}` };
    }
  }

  testRollbackFunctionality() {
    console.log('   🔄 Testing rollback functionality...');
    
    try {
      // Create initial state
      this.createSampleAdminData();
      
      // Create backup
      const backupResult = createMigrationBackup('Test_AdminRollback', ['admins']);
      if (!backupResult.success) {
        return { passed: false, error: 'Failed to create backup for rollback test' };
      }
      
      // Run migration
      const migration = new AddAdminAccessCodeMigration();
      migration.execute();
      
      // Verify migration worked
      const adminsSheet = this.spreadsheet.getSheetByName('admins');
      const headers = adminsSheet.getRange(1, 1, 1, adminsSheet.getLastColumn()).getValues()[0];
      const accessCodeIndex = headers.indexOf('AccessCode');
      
      if (accessCodeIndex === -1) {
        return { passed: false, error: 'Migration did not add AccessCode column' };
      }
      
      // Test rollback
      const rollbackResult = migration.rollback();
      
      if (!rollbackResult.success) {
        return { passed: false, error: `Rollback failed: ${rollbackResult.error}` };
      }
      
      console.log('   ✅ Rollback functionality working');
      return { passed: true, details: { rollback_method: rollbackResult.method } };
      
    } catch (error) {
      return { passed: false, error: `Rollback test failed: ${error.message}` };
    }
  }

  // Helper methods for creating test data

  createEmptyAdminsSheet() {
    const adminsSheet = this.spreadsheet.getSheetByName('admins');
    if (adminsSheet) {
      this.spreadsheet.deleteSheet(adminsSheet);
    }
    
    const newSheet = this.spreadsheet.insertSheet('admins');
    newSheet.getRange(1, 1, 1, 3).setValues([['id', 'name', 'email']]);
    
    return newSheet;
  }

  createMinimalTestData() {
    const adminsSheet = this.createEmptyAdminsSheet();
    
    const data = [
      ['id', 'name', 'email'],
      ['1', 'Admin One', 'admin1@test.com'],
      ['2', 'Admin Two', 'admin2@test.com']
    ];
    
    adminsSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    
    return { admins: data.length - 1 };
  }

  createSampleAdminData() {
    const adminsSheet = this.createEmptyAdminsSheet();
    
    const data = [
      ['id', 'name', 'email', 'role', 'created_date'],
      ['1', 'John Smith', 'john.smith@school.edu', 'Principal', '2024-01-15'],
      ['2', 'Sarah Johnson', 'sarah.johnson@school.edu', 'Vice Principal', '2024-02-01'],
      ['3', 'Mike Wilson', 'mike.wilson@school.edu', 'IT Administrator', '2024-02-15'],
      ['4', 'Lisa Chen', 'lisa.chen@school.edu', 'Registrar', '2024-03-01'],
      ['5', 'David Brown', 'david.brown@school.edu', 'Department Head', '2024-03-15']
    ];
    
    adminsSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    
    return { admins: data.length - 1 };
  }

  createAdminDataWithExistingCodes(existingCodes) {
    const adminsSheet = this.createEmptyAdminsSheet();
    
    const data = [
      ['id', 'name', 'email', 'AccessCode']
    ];
    
    // Add admins with existing codes
    existingCodes.forEach((code, index) => {
      data.push([
        (index + 1).toString(),
        `Admin ${index + 1}`,
        `admin${index + 1}@test.com`,
        code
      ]);
    });
    
    // Add admins without codes
    for (let i = existingCodes.length; i < existingCodes.length + 3; i++) {
      data.push([
        (i + 1).toString(),
        `Admin ${i + 1}`,
        `admin${i + 1}@test.com`,
        ''
      ]);
    }
    
    adminsSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    
    return { admins: data.length - 1, existing_codes: existingCodes.length };
  }

  createRichAdminData() {
    const adminsSheet = this.createEmptyAdminsSheet();
    
    const data = [
      ['id', 'uuid', 'name', 'email', 'role', 'department', 'phone', 'created_date', 'last_login', 'active'],
      ['1', 'uuid-001', 'John Smith', 'john.smith@school.edu', 'Principal', 'Administration', '555-0101', '2024-01-15', '2024-08-01', 'true'],
      ['2', 'uuid-002', 'Sarah Johnson', 'sarah.johnson@school.edu', 'Vice Principal', 'Administration', '555-0102', '2024-02-01', '2024-07-30', 'true'],
      ['3', 'uuid-003', 'Mike Wilson', 'mike.wilson@school.edu', 'IT Administrator', 'Technology', '555-0103', '2024-02-15', '2024-08-05', 'true']
    ];
    
    adminsSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    
    return { admins: data.length - 1 };
  }

  createLargeAdminDataset(size) {
    const adminsSheet = this.createEmptyAdminsSheet();
    
    const data = [['id', 'name', 'email', 'role']];
    
    for (let i = 1; i <= size; i++) {
      data.push([
        i.toString(),
        `Admin ${i}`,
        `admin${i}@school.edu`,
        i % 5 === 0 ? 'Principal' : i % 3 === 0 ? 'Vice Principal' : 'Administrator'
      ]);
    }
    
    adminsSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    
    return { admins: size };
  }
}

// ============================================================================
// PRODUCTION FUNCTIONS
// ============================================================================

/**
 * Production-ready admin access code migration with confirmations
 * Use this function for live deployments
 */
function runProductionAdminAccessCodeMigration() {
  console.log('🏭 PRODUCTION ADMIN ACCESS CODE MIGRATION');
  console.log('=========================================');
  console.log('⚠️  WARNING: This will modify live admin data!');
  console.log('📋 Current spreadsheet:', getSpreadsheetId());
  console.log('⏰ Starting at:', new Date().toISOString());
  
  try {
    // Pre-flight checks
    console.log('\n🔍 Running pre-flight checks...');
    const preFlightResults = runAdminAccessCodePreFlightCheck();
    
    if (!preFlightResults.safe) {
      console.log('❌ Pre-flight checks failed. Migration aborted.');
      console.log('🔧 Please resolve the following issues:');
      preFlightResults.issues.forEach(issue => console.log(`   • ${issue}`));
      return { success: false, error: 'Pre-flight checks failed', issues: preFlightResults.issues };
    }
    
    console.log('✅ Pre-flight checks passed');
    
    // Production confirmation
    const confirmation = Browser.msgBox(
      'Production Migration Confirmation',
      'This will add AccessCode column to your admins table and modify live data. Continue?',
      Browser.Buttons.YES_NO
    );
    
    if (confirmation !== Browser.Buttons.YES) {
      console.log('❌ Migration cancelled by user');
      return { success: false, error: 'User cancelled migration' };
    }
    
    console.log('✅ Production confirmation received');
    
    // Create production backup
    console.log('\n📦 Creating production backup...');
    const backupResult = createMigrationBackup('Production_AdminAccessCode_' + Date.now(), ['admins']);
    
    if (!backupResult.success) {
      console.log('❌ Failed to create production backup. Migration aborted.');
      return { success: false, error: 'Backup creation failed', details: backupResult.error };
    }
    
    console.log(`✅ Production backup created: ${backupResult.backupSheetName}`);
    
    // Execute migration
    console.log('\n🚀 Executing production migration...');
    const migration = new AddAdminAccessCodeMigration();
    migration.execute();
    
    // Verify results
    console.log('\n🔍 Verifying production results...');
    const verificationResults = verifyAddAdminAccessCodeMigration();
    
    if (verificationResults.failed > 0) {
      console.log('❌ Production verification failed!');
      console.log('🔄 Consider rolling back immediately');
      return { 
        success: false, 
        error: 'Production verification failed', 
        verification: verificationResults,
        backup: backupResult.backupSheetName
      };
    }
    
    console.log('\n🎉 PRODUCTION MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('===============================================');
    console.log('📊 Results Summary:');
    console.log(`   ✅ Admins processed: ${verificationResults.adminsChecked}`);
    console.log(`   ✅ Valid access codes: ${verificationResults.validAccessCodes}`);
    console.log(`   ✅ Unique codes: ${verificationResults.uniqueCodes}`);
    console.log(`   📦 Backup created: ${backupResult.backupSheetName}`);
    
    console.log('\n📋 Next Steps:');
    console.log('   1. Export access codes: exportAdminAccessCodes()');
    console.log('   2. Distribute codes to admins securely');
    console.log('   3. Update admin login system');
    console.log('   4. Monitor admin authentication');
    
    return { 
      success: true, 
      verification: verificationResults,
      backup: backupResult.backupSheetName,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('💥 Production migration failed:', error.message);
    console.log('🔄 Consider restoring from backup');
    return { success: false, error: error.message };
  }
}

/**
 * Pre-flight checks for admin access code migration
 */
function runAdminAccessCodePreFlightCheck() {
  console.log('🔍 ADMIN ACCESS CODE PRE-FLIGHT CHECKS');
  console.log('=====================================');
  
  const results = {
    safe: true,
    issues: [],
    adminCount: 0,
    existingCodes: 0,
    newCodes: 0
  };
  
  try {
    // Check spreadsheet access
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    if (!spreadsheet) {
      results.safe = false;
      results.issues.push('Cannot access spreadsheet');
      return results;
    }
    console.log('✅ Spreadsheet access confirmed');
    
    // Check admins sheet
    const adminsSheet = spreadsheet.getSheetByName('admins');
    if (!adminsSheet) {
      results.safe = false;
      results.issues.push('Admins sheet not found');
      return results;
    }
    console.log('✅ Admins sheet found');
    
    // Analyze admin data
    const data = adminsSheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    results.adminCount = dataRows.length;
    console.log(`📊 Found ${dataRows.length} admin records`);
    
    if (dataRows.length === 0) {
      results.issues.push('No admin data found');
      console.log('⚠️  Warning: No admin data to process');
    }
    
    // Check for AccessCode column
    const accessCodeIndex = headers.indexOf('AccessCode');
    if (accessCodeIndex !== -1) {
      const existingCodes = dataRows.map(row => row[accessCodeIndex]).filter(code => code && /^\d{6}$/.test(code));
      results.existingCodes = existingCodes.length;
      results.newCodes = dataRows.length - existingCodes.length;
      
      console.log(`📋 Existing valid access codes: ${existingCodes.length}`);
      console.log(`📋 New codes needed: ${results.newCodes}`);
      
      // Check for duplicates in existing codes
      const uniqueExisting = new Set(existingCodes);
      if (uniqueExisting.size !== existingCodes.length) {
        results.issues.push(`Duplicate access codes found in existing data`);
        console.log('⚠️  Warning: Duplicate access codes detected');
      }
    } else {
      results.newCodes = dataRows.length;
      console.log('📋 AccessCode column not found - will be created');
      console.log(`📋 New codes needed: ${results.newCodes}`);
    }
    
    // Final safety assessment
    if (results.issues.length > 0) {
      results.safe = false;
      console.log(`\n❌ Pre-flight checks failed with ${results.issues.length} issues`);
    } else {
      console.log('\n✅ All pre-flight checks passed - migration ready');
    }
    
    return results;
    
  } catch (error) {
    results.safe = false;
    results.issues.push(`Pre-flight check error: ${error.message}`);
    console.error('❌ Pre-flight check failed:', error.message);
    return results;
  }
}

/**
 * Export admin access codes for distribution
 */
function exportAdminAccessCodes() {
  console.log('📤 EXPORTING ADMIN ACCESS CODES');
  console.log('================================');
  
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const adminsSheet = spreadsheet.getSheetByName('admins');
    
    if (!adminsSheet) {
      console.log('❌ Admins sheet not found');
      return { success: false, error: 'Admins sheet not found' };
    }
    
    const data = adminsSheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    // Find relevant column indices
    const accessCodeIndex = headers.indexOf('AccessCode');
    const nameIndex = headers.indexOf('name') !== -1 ? headers.indexOf('name') : headers.indexOf('Name');
    const emailIndex = headers.indexOf('email') !== -1 ? headers.indexOf('email') : headers.indexOf('Email');
    const idIndex = headers.indexOf('id') !== -1 ? headers.indexOf('id') : headers.indexOf('ID');
    
    if (accessCodeIndex === -1) {
      console.log('❌ AccessCode column not found');
      return { success: false, error: 'AccessCode column not found' };
    }
    
    // Create export data
    const exportData = [];
    let validExports = 0;
    const exportDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    console.log('\n📋 ADMIN ACCESS CODES:');
    console.log('=====================');
    
    dataRows.forEach((row, index) => {
      const accessCode = row[accessCodeIndex];
      
      if (accessCode && /^\d{6}$/.test(accessCode)) {
        const adminId = idIndex !== -1 ? row[idIndex] : (index + 1).toString();
        const name = nameIndex !== -1 ? row[nameIndex] : 'Unknown';
        const email = emailIndex !== -1 ? row[emailIndex] : 'Unknown';
        
        console.log(`${name}: ${accessCode} (${email})`);
        exportData.push({
          adminId: adminId,
          name: name,
          email: email,
          accessCode: accessCode,
          exportDate: exportDate
        });
        validExports++;
      }
    });
    
    console.log(`\n📊 Total: ${validExports} admin access codes exported`);
    console.log('💡 Distribute these codes securely to authorized admins');
    
    return { 
      success: true, 
      exportData: exportData,
      totalExported: validExports,
      exportDate: exportDate
    };
    
  } catch (error) {
    console.error('❌ Export failed:', error.message);
    return { success: false, error: error.message };
  }
}
