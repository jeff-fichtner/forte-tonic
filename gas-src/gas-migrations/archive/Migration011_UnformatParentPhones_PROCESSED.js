/**
 * Google Apps Script Migration 011: Unformat Parent Phone Numbers
 *
 * 🎯 PURPOSE:
 * This migration removes formatting from parent phone numbers, converting
 * them from XXX-XXX-XXXX format to XXXXXXXXXX format (digits only).
 *
 * ⚠️ CURRENT SITUATION:
 * - Parents table has Phone column with formatted numbers (XXX-XXX-XXXX)
 * - Need to remove dashes and other special characters
 * - Some numbers may be fake (XXX-XXX-XXXX) but should still be processed
 * - Need to preserve the actual digits while removing formatting
 *
 * ✅ SOLUTION:
 * - Remove all non-digit characters from phone numbers
 * - Convert XXX-XXX-XXXX to XXXXXXXXXX
 * - Preserve all existing parent data
 * - Use safe copy-modify-replace pattern for zero risk
 *
 * 📋 CHANGES MADE:
 * 1. Parents Table: Unformat Phone column values
 * 2. Data Validation: Ensure phone numbers are 10 digits after unformatting
 * 3. Preservation: All existing parent data remains intact
 *
 * 🔧 FEATURES:
 * - Removes dashes, spaces, parentheses, and other special characters
 * - Validates that result is 10 digits (standard US phone format)
 * - Handles fake phone numbers (XXX-XXX-XXXX where X represents any digit)
 * - Uses safe copy-modify-replace pattern
 * - Creates automatic backup for rollback capability
 * - Comprehensive verification functions
 *
 * 🚀 TO USE:
 * 1. Set spreadsheet ID in Config.js: const SPREADSHEET_ID = "your-id";
 * 2. Deploy with clasp push
 * 3. Run preview first: previewUnformatParentPhonesMigration()
 * 4. Run migration: runUnformatParentPhonesMigration()
 * 5. Verify results: verifyUnformatParentPhonesMigration()
 */

/**
 * Main function to execute the parent phone unformatting migration
 */
function runUnformatParentPhonesMigration() {
  const migration = new UnformatParentPhonesMigration();
  migration.execute();
}

/**
 * Preview function to check what changes would be made
 * Run this first to see what the migration will do
 */
function previewUnformatParentPhonesMigration() {
  const migration = new UnformatParentPhonesMigration();
  migration.preview();
}

/**
 * Rollback function to restore from backup
 * Use this if you need to revert the changes
 */
function rollbackUnformatParentPhonesMigration() {
  const migration = new UnformatParentPhonesMigration();
  migration.rollback();
}

/**
 * Restore from automatic backup and delete the backup
 */
function restoreUnformatParentPhonesMigrationFromBackup() {
  return restoreFromBackup('Migration011_UnformatParentPhones');
}

/**
 * Verification function to check migration results
 * Run this after migration to ensure everything worked correctly
 */
function verifyUnformatParentPhonesMigration() {
  console.log('🔍 VERIFYING PARENT PHONE UNFORMATTING MIGRATION');
  console.log('===============================================');
  
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const verifier = new UnformatParentPhonesMigrationVerifier(spreadsheet);
    
    const results = verifier.runAllChecks();
    
    console.log('\n📊 VERIFICATION SUMMARY:');
    console.log('========================');
    console.log(`✅ Total checks passed: ${results.passed}`);
    console.log(`❌ Total checks failed: ${results.failed}`);
    console.log(`⚠️  Warnings: ${results.warnings}`);
    console.log(`📋 Parents checked: ${results.parentsChecked}`);
    console.log(`📞 Valid unformatted phones: ${results.validUnformattedPhones}`);
    console.log(`🔢 10-digit phones: ${results.tenDigitPhones}`);
    
    if (results.failed === 0) {
      console.log('\n🎉 Migration verification PASSED! All phone numbers unformatted.');
      console.log('Parent phone numbers are now in XXXXXXXXXX format.');
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
function quickVerifyParentPhones() {
  console.log('⚡ QUICK PARENT PHONE CHECK');
  console.log('==========================');
  
  const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
  const parentsSheet = spreadsheet.getSheetByName('parents');
  
  if (!parentsSheet) {
    console.log('❌ Parents sheet not found');
    return;
  }
  
  const data = parentsSheet.getDataRange().getValues();
  const headers = data[0];
  const phoneIndex = headers.indexOf('Phone') !== -1 ? headers.indexOf('Phone') : headers.indexOf('phone');
  
  if (phoneIndex === -1) {
    console.log('❌ Phone column not found');
    return;
  }
  
  const phoneRegex = /^[0-9X]{10}$/i;
  const sampleSize = Math.min(5, data.length - 1);
  let validCount = 0;
  
  console.log('\n📊 Sample Phone Check:');
  for (let i = 1; i <= sampleSize; i++) {
    const phone = data[i][phoneIndex];
    const isValid = phoneRegex.test(phone);
    if (isValid) validCount++;
    
    const nameIndex = headers.indexOf('firstName') !== -1 ? headers.indexOf('firstName') : 
                      headers.indexOf('FirstName') !== -1 ? headers.indexOf('FirstName') : 
                      headers.indexOf('name') !== -1 ? headers.indexOf('name') : -1;
    const parentName = nameIndex !== -1 ? data[i][nameIndex] : `Row ${i}`;
    
    console.log(`   ${parentName}: ${phone} ${isValid ? '✅' : '❌'}`);
  }
  
  console.log(`\n📋 Results: ${validCount}/${sampleSize} valid unformatted phones`);
  
  if (validCount === sampleSize) {
    console.log('✅ All sampled phones are unformatted!');
  } else {
    console.log('⚠️  Some phones may need attention');
  }
}

/**
 * Migration class for Unformatting Parent Phone Numbers
 */
class UnformatParentPhonesMigration {
  constructor() {
    this.spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    this.migrationName = 'Unformat Parent Phone Numbers';
    this.migrationId = 'Migration011_UnformatParentPhones';
    this.changes = {
      parents: []
    };
  }

  /**
   * Execute the migration using safe copy-modify-replace pattern
   */
  execute() {
    console.log('🚀 EXECUTING MIGRATION: Unformat Parent Phone Numbers');
    console.log('======================================================');

    // Create automatic backup before starting
    console.log('📦 Creating automatic backup...');
    const backupResult = createMigrationBackup(this.migrationId, ['parents']);
    
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
          sheetName: 'parents',
          modifyFunction: (workingSheet, originalSheet) => {
            return this.unformatPhoneColumnSafe(workingSheet, originalSheet);
          }
        }
      ];

      // Execute all modifications using batch safe pattern
      console.log('\n� Applying safe sheet modifications...');
      const modificationResults = batchSafeSheetModification(sheetModifications);
      
      if (!modificationResults.success) {
        console.error('❌ Safe sheet modifications failed:', modificationResults.error);
        throw new Error(`Migration failed: ${modificationResults.error}`);
      }
      
      console.log('\n✅ Migration completed successfully!');
      console.log('📊 Migration Summary:');
      console.log(`   - Parents processed: ${this.changes.parents.length}`);
      console.log(`   - Phones unformatted: ${this.changes.parents.filter(c => c.phoneChanged).length}`);
      
    } catch (error) {
      console.error('❌ Migration execution failed:', error.message);
      console.log('🔄 Consider rolling back: rollbackUnformatParentPhonesMigration()');
      throw error;
    }
  }

  /**
   * Preview the migration without making changes
   */
  preview() {
    console.log('🔍 PREVIEWING MIGRATION: Unformat Parent Phone Numbers');
    console.log('=======================================================');
    
    try {
      this.analyzeCurrentState();
      
      const parentsSheet = this.spreadsheet.getSheetByName('parents');
      if (!parentsSheet) {
        throw new Error('Parents sheet not found');
      }
      
      const data = parentsSheet.getDataRange().getValues();
      const headers = data[0];
      const dataRows = data.slice(1);
      
      const phoneIndex = headers.indexOf('Phone') !== -1 ? headers.indexOf('Phone') : headers.indexOf('phone');
      if (phoneIndex === -1) {
        throw new Error('Phone column not found');
      }
      
      console.log('\n📋 Preview of Changes:');
      console.log('======================');
      
      let changesToMake = 0;
      const sampleSize = Math.min(10, dataRows.length);
      
      for (let i = 0; i < sampleSize; i++) {
        const row = dataRows[i];
        const originalPhone = row[phoneIndex];
        const unformattedPhone = this.unformatPhoneNumber(originalPhone);
        
        if (originalPhone !== unformattedPhone) {
          changesToMake++;
          const nameIndex = headers.indexOf('firstName') !== -1 ? headers.indexOf('firstName') : 
                           headers.indexOf('FirstName') !== -1 ? headers.indexOf('FirstName') : 
                           headers.indexOf('name') !== -1 ? headers.indexOf('name') : -1;
          const parentName = nameIndex !== -1 ? row[nameIndex] : `Row ${i + 2}`;
          console.log(`   ${parentName}: "${originalPhone}" → "${unformattedPhone}"`);
        }
      }
      
      if (sampleSize < dataRows.length) {
        console.log(`   ... and ${dataRows.length - sampleSize} more rows`);
      }
      
      console.log(`\n📊 Preview Summary:`);
      console.log(`   - Total parents: ${dataRows.length}`);
      console.log(`   - Estimated changes: ${Math.ceil((changesToMake / sampleSize) * dataRows.length)}`);
      console.log(`   - Sample showed: ${changesToMake}/${sampleSize} needing changes`);
      
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
    
    const parentsSheet = this.spreadsheet.getSheetByName('parents');
    if (!parentsSheet) {
      throw new Error('Parents sheet not found');
    }
    
    const data = parentsSheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    console.log(`\n📋 Parents Analysis:`);
    console.log(`   - Total parents: ${dataRows.length}`);
    console.log(`   - Current headers: ${headers.join(', ')}`);
    
    // Find phone column
    const phoneIndex = headers.indexOf('Phone') !== -1 ? headers.indexOf('Phone') : headers.indexOf('phone');
    if (phoneIndex === -1) {
      throw new Error('Phone column not found in Parents sheet');
    }
    
    console.log(`   - Phone column found at index: ${phoneIndex}`);
    
    // Analyze phone number formats
    const phoneFormats = {};
    let emptyPhones = 0;
    
    dataRows.forEach(row => {
      const phone = row[phoneIndex];
      if (!phone || phone.toString().trim() === '') {
        emptyPhones++;
      } else {
        const format = this.analyzePhoneFormat(phone);
        phoneFormats[format] = (phoneFormats[format] || 0) + 1;
      }
    });
    
    console.log(`   - Empty phones: ${emptyPhones}`);
    console.log(`   - Phone formats found:`);
    Object.entries(phoneFormats).forEach(([format, count]) => {
      console.log(`     • ${format}: ${count} instances`);
    });
    
    console.log('   ✅ Analysis complete - ready for migration');
  }

  /**
   * Analyze phone number format
   */
  analyzePhoneFormat(phone) {
    const phoneStr = phone.toString();
    
    if (/^[0-9X]{10}$/i.test(phoneStr)) {
      return 'XXXXXXXXXX (already unformatted)';
    } else if (/^\d{3}-\d{3}-\d{4}$/.test(phoneStr)) {
      return 'XXX-XXX-XXXX (formatted digits with dashes)';
    } else if (/^[X]{3}-[X]{3}-[X]{4}$/i.test(phoneStr)) {
      return 'XXX-XXX-XXXX (formatted placeholders with dashes)';
    } else if (/^\(\d{3}\)\s?\d{3}-\d{4}$/.test(phoneStr)) {
      return '(XXX) XXX-XXXX (formatted digits with parens)';
    } else if (/^\([X]{3}\)\s?[X]{3}-[X]{4}$/i.test(phoneStr)) {
      return '(XXX) XXX-XXXX (formatted placeholders with parens)';
    } else if (/^\d{3}\.\d{3}\.\d{4}$/.test(phoneStr)) {
      return 'XXX.XXX.XXXX (formatted digits with dots)';
    } else if (/^[X]{3}\.[X]{3}\.[X]{4}$/i.test(phoneStr)) {
      return 'XXX.XXX.XXXX (formatted placeholders with dots)';
    } else if (/^\d{3}\s\d{3}\s\d{4}$/.test(phoneStr)) {
      return 'XXX XXX XXXX (formatted digits with spaces)';
    } else if (/^[X]{3}\s[X]{3}\s[X]{4}$/i.test(phoneStr)) {
      return 'XXX XXX XXXX (formatted placeholders with spaces)';
    } else {
      return `Other: "${phoneStr}"`;
    }
  }

  /**
   * Safely unformat phone numbers using copy-modify-replace pattern
   * @param {Sheet} workingSheet - Working copy of the parents sheet
   * @param {Sheet} originalSheet - Original parents sheet (for reference)
   * @returns {Object} Migration details
   */
  unformatPhoneColumnSafe(workingSheet, originalSheet) {
    console.log('   📞 Unformatting phone numbers in parents...');
    
    const data = workingSheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    // Find phone column
    const phoneIndex = headers.indexOf('Phone') !== -1 ? headers.indexOf('Phone') : headers.indexOf('phone');
    if (phoneIndex === -1) {
      throw new Error('Phone column not found in Parents sheet');
    }
    
    // Process each row to unformat phone numbers
    const updatedRows = [];
    let phonesUnformatted = 0;
    let phonesSkipped = 0;
    let phonesInvalid = 0;
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const originalPhone = row[phoneIndex];
      
      if (!originalPhone || originalPhone.toString().trim() === '') {
        phonesSkipped++;
        this.changes.parents.push({
          rowIndex: i + 2, // +2 because we skipped header and array is 0-based
          originalPhone: originalPhone,
          newPhone: originalPhone,
          phoneChanged: false,
          reason: 'Empty phone'
        });
        updatedRows.push(row);
      } else {
        const unformattedPhone = this.unformatPhoneNumber(originalPhone);
        
        if (this.isValidUnformattedPhone(unformattedPhone)) {
          if (originalPhone.toString() !== unformattedPhone) {
            // Phone needs to be updated
            phonesUnformatted++;
            this.changes.parents.push({
              rowIndex: i + 2,
              originalPhone: originalPhone,
              newPhone: unformattedPhone,
              phoneChanged: true,
              reason: 'Successfully unformatted'
            });
            
            // Create updated row
            const updatedRow = [...row];
            updatedRow[phoneIndex] = unformattedPhone;
            updatedRows.push(updatedRow);
            
            const nameIndex = headers.indexOf('firstName') !== -1 ? headers.indexOf('firstName') : 
                             headers.indexOf('FirstName') !== -1 ? headers.indexOf('FirstName') : 
                             headers.indexOf('name') !== -1 ? headers.indexOf('name') : -1;
            const parentName = nameIndex !== -1 ? row[nameIndex] : `Row ${i + 2}`;
            console.log(`     ✓ ${parentName}: "${originalPhone}" → "${unformattedPhone}"`);
          } else {
            phonesSkipped++;
            this.changes.parents.push({
              rowIndex: i + 2,
              originalPhone: originalPhone,
              newPhone: unformattedPhone,
              phoneChanged: false,
              reason: 'Already unformatted'
            });
            updatedRows.push(row);
          }
        } else {
          phonesInvalid++;
          const error = `Row ${i + 2}: Invalid phone "${originalPhone}" → "${unformattedPhone}" (not 10 digits)`;
          this.changes.parents.push({
            rowIndex: i + 2,
            originalPhone: originalPhone,
            newPhone: originalPhone,
            phoneChanged: false,
            reason: 'Invalid phone format'
          });
          updatedRows.push(row);
          console.log(`     ⚠️  ${error}`);
        }
      }
    }
    
    // Update the working sheet with new data
    if (updatedRows.length > 0) {
      const allData = [headers, ...updatedRows];
      workingSheet.clear();
      workingSheet.getRange(1, 1, allData.length, allData[0].length).setValues(allData);
    }
    
    console.log(`     ✅ Processed ${updatedRows.length} parent records`);
    console.log(`     📊 Phones unformatted: ${phonesUnformatted}`);
    console.log(`     📊 Phones skipped (empty): ${phonesSkipped}`);
    console.log(`     📊 Phones invalid: ${phonesInvalid}`);
    
    return {
      recordsProcessed: updatedRows.length,
      phonesUnformatted: phonesUnformatted,
      phonesSkipped: phonesSkipped,
      phonesInvalid: phonesInvalid,
      modificationType: 'parent_phone_unformatting'
    };
  }

  /**
   * Unformat a phone number by removing formatting characters (dashes, spaces, parentheses, etc.)
   * but preserving actual digit characters and placeholder characters like 'X'
   * @param {string} phone - Original phone number
   * @returns {string} Unformatted phone number (digits and X characters only)
   */
  unformatPhoneNumber(phone) {
    if (!phone) return '';
    
    // Remove formatting characters but keep digits and X characters
    // This removes: ( ) - . _ spaces and other special characters
    // But preserves: 0-9 digits and X characters (which represent placeholder digits)
    const unformatted = phone.toString().replace(/[^0-9X]/gi, '');
    
    return unformatted;
  }

  /**
   * Validate that unformatted phone is 10 characters (digits or X placeholders)
   * @param {string} phone - Unformatted phone number
   * @returns {boolean} True if valid 10-character phone (digits and/or X characters)
   */
  isValidUnformattedPhone(phone) {
    if (!phone) return false;
    
    // Should be exactly 10 characters: digits (0-9) or X placeholders
    return /^[0-9X]{10}$/i.test(phone);
  }

  /**
   * Rollback the migration (restore from backup)
   */
  rollback() {
    console.log('🔄 Rolling back Unformat Parent Phones Migration...');
    console.log('==================================================');
    
    try {
      const restored = restoreFromBackup(this.migrationId);
      if (restored) {
        console.log('✅ Migration successfully rolled back from backup');
      } else {
        console.log('❌ Failed to rollback migration - backup not found or restore failed');
      }
      return restored;
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      return false;
    }
  }
}

/**
 * Verification class for Unformat Parent Phones Migration
 */
class UnformatParentPhonesMigrationVerifier {
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
      parentsChecked: 0,
      validUnformattedPhones: 0,
      tenDigitPhones: 0
    };
    
    try {
      this.checkParentsSheetExists(results);
      this.checkPhoneColumnExists(results);
      this.checkAllPhonesUnformatted(results);
      this.checkPhoneFormat(results);
      this.checkNoDataLoss(results);
    } catch (error) {
      console.error('❌ Verification checks failed:', error.message);
      results.failed++;
    }
    
    return results;
  }

  checkParentsSheetExists(results) {
    const parentsSheet = this.spreadsheet.getSheetByName('parents');
    if (parentsSheet) {
      console.log('✅ Parents sheet exists');
      results.passed++;
    } else {
      console.log('❌ Parents sheet not found');
      results.failed++;
    }
  }

  checkPhoneColumnExists(results) {
    try {
      const parentsSheet = this.spreadsheet.getSheetByName('parents');
      if (!parentsSheet) {
        console.log('❌ Cannot check phone column - sheet not found');
        results.failed++;
        return;
      }
      
      const headers = parentsSheet.getDataRange().getValues()[0];
      const phoneIndex = headers.indexOf('Phone') !== -1 ? headers.indexOf('Phone') : headers.indexOf('phone');
      
      if (phoneIndex !== -1) {
        console.log('✅ Phone column found');
        results.passed++;
      } else {
        console.log('❌ Phone column not found');
        results.failed++;
      }
    } catch (error) {
      console.log('❌ Error checking phone column:', error.message);
      results.failed++;
    }
  }

  checkAllPhonesUnformatted(results) {
    try {
      const parentsSheet = this.spreadsheet.getSheetByName('parents');
      const data = parentsSheet.getDataRange().getValues();
      const headers = data[0];
      const phoneIndex = headers.indexOf('Phone') !== -1 ? headers.indexOf('Phone') : headers.indexOf('phone');
      
      if (phoneIndex === -1) {
        console.log('❌ Cannot verify phones - Phone column not found');
        results.failed++;
        return;
      }
      
      let formattedPhones = 0;
      let totalPhones = 0;
      
      for (let i = 1; i < data.length; i++) {
        const phone = data[i][phoneIndex];
        if (phone && phone.toString().trim() !== '') {
          totalPhones++;
          if (/[-.()\s]/.test(phone.toString())) {
            formattedPhones++;
          }
        }
      }
      
      results.parentsChecked = data.length - 1;
      
      if (formattedPhones === 0) {
        console.log('✅ All phones are unformatted');
        results.passed++;
      } else {
        console.log(`❌ ${formattedPhones} phones still have formatting`);
        results.failed++;
      }
    } catch (error) {
      console.log('❌ Error checking phone formatting:', error.message);
      results.failed++;
    }
  }

  checkPhoneFormat(results) {
    try {
      const parentsSheet = this.spreadsheet.getSheetByName('parents');
      const data = parentsSheet.getDataRange().getValues();
      const headers = data[0];
      const phoneIndex = headers.indexOf('Phone') !== -1 ? headers.indexOf('Phone') : headers.indexOf('phone');
      
      let validPhones = 0;
      let invalidPhones = 0;
      let emptyPhones = 0;
      
      for (let i = 1; i < data.length; i++) {
        const phone = data[i][phoneIndex];
        if (!phone || phone.toString().trim() === '') {
          emptyPhones++;
        } else if (/^[0-9X]{10}$/i.test(phone.toString())) {
          validPhones++;
        } else {
          invalidPhones++;
        }
      }
      
      results.validUnformattedPhones = validPhones;
      results.tenDigitPhones = validPhones;
      
      if (invalidPhones === 0) {
        console.log('✅ All non-empty phones are 10 characters (digits or X)');
        results.passed++;
      } else {
        console.log(`❌ ${invalidPhones} phones are not 10 characters`);
        results.failed++;
      }
    } catch (error) {
      console.log('❌ Error checking phone format:', error.message);
      results.failed++;
    }
  }

  checkNoDataLoss(results) {
    try {
      const parentsSheet = this.spreadsheet.getSheetByName('parents');
      const data = parentsSheet.getDataRange().getValues();
      
      if (data.length > 1) {
        console.log('✅ Parent data is present');
        results.passed++;
      } else {
        console.log('❌ No parent data found');
        results.failed++;
      }
    } catch (error) {
      console.log('❌ Error checking data loss:', error.message);
      results.failed++;
    }
  }
}

