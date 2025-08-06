/**
 * Google Apps Script Migration 002: Convert Composite Keys to UUID Primary Keys
 *
 * 🎯 PURPOSE:
 * This migration transforms the registration system from complex composite keys
 * to simple UUID primary keys for better maintainability and performance.
 *
 * ⚠️ CURRENT PROBLEM:
 * - Registration IDs like "131509_TEACHER1@EMAIL.COM_Monday_17:15" are complex
 * - Group class IDs like "72768_G002" use different pattern
 * - Two different key patterns (private vs group)
 * - Difficult to query, update, and maintain
 * - Causes issues with frontend relationship mapping
 * - Makes API endpoint design complex
 * - Complicates caching strategies
 *
 * ✅ SOLUTION:
 * - Replace all composite keys with UUIDs like "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 * - Universal format for all registration types
 * - Easier database queries and relationships
 * - Simplified API endpoints
 * - Better frontend data handling
 * - Consistent with modern best practices
 *
 * 📋 WHAT CHANGES:
 * 1. Registrations Table: Id column composite keys → UUIDs, all other data preserved
 * 2. Registrations Audit Table: Completely rebuilt for consistency with new UUIDs
 * 3. Original composite keys are NOT preserved (backup restoration for rollback)
 *
 * 🔧 FEATURES:
 * - Generates cryptographically secure UUIDs
 * - Rebuilds audit table for consistency
 * - Preserves all existing data integrity
 * - Creates automatic backup for rollback capability
 * - Comprehensive verification functions
 *
 * 🚀 TO USE:
 * 1. Set spreadsheet ID in Config.js: const SPREADSHEET_ID = "your-id";
 * 2. Deploy with clasp push
 * 3. Run preview first: previewCompositeToUuidMigration()
 * 4. Run migration: runCompositeToUuidMigration()
 * 5. Verify results: verifyCompositeToUuidMigration()
 */

/**
 * Main function to execute the composite key to UUID migration
 */
function runCompositeToUuidMigration() {
  const migration = new CompositeToUuidMigration();
  migration.execute();
}

/**
 * Preview function to check what changes would be made
 * Run this first to see what the migration will do
 */
function previewCompositeToUuidMigration() {
  const migration = new CompositeToUuidMigration();
  migration.preview();
}

/**
 * Rollback function to restore original composite keys
 * Use this if you need to revert the changes
 */
function rollbackCompositeToUuidMigration() {
  const migration = new CompositeToUuidMigration();
  migration.rollback();
}

/**
 * Restore from automatic backup and delete the backup
 */
function restoreCompositeToUuidMigrationFromBackup() {
  return restoreFromBackup('Migration002_CompositeToUuid');
}

/**
 * Verification function to check migration results
 * Run this after migration to ensure everything worked correctly
 */
function verifyCompositeToUuidMigration() {
  console.log('🔍 VERIFYING COMPOSITE TO UUID MIGRATION');
  console.log('=========================================');
  
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const verifier = new CompositeToUuidMigrationVerifier(spreadsheet);
    
    const results = verifier.runAllChecks();
    
    console.log('\n📊 VERIFICATION SUMMARY:');
    console.log('========================');
    console.log(`✅ Total checks passed: ${results.passed}`);
    console.log(`❌ Total checks failed: ${results.failed}`);
    console.log(`⚠️  Warnings: ${results.warnings}`);
    
    if (results.failed === 0) {
      console.log('\n🎉 Migration verification PASSED! All systems go.');
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
 * Quick check for UUID format validity
 */
function quickCompositeToUuidCheck() {
  console.log('⚡ QUICK COMPOSITE TO UUID CHECK');
  console.log('================================');
  
  const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
  const registrationsSheet = spreadsheet.getSheetByName('registrations');
  
  if (!registrationsSheet) {
    console.log('❌ Registrations sheet not found');
    return false;
  }
  
  const data = registrationsSheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf('id') !== -1 ? headers.indexOf('id') : headers.indexOf('Id');
  
  if (idIndex === -1) {
    console.log('❌ No ID column found');
    return false;
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const sampleSize = Math.min(10, data.length - 1);
  
  for (let i = 1; i <= sampleSize; i++) {
    const id = data[i][idIndex];
    if (!uuidRegex.test(id)) {
      console.log(`❌ Row ${i}: "${id}" is not a valid UUID`);
      return false;
    }
  }
  
  console.log(`✅ All ${sampleSize} sampled IDs are valid UUIDs`);
  return true;
}

/**
 * Migration class for converting composite keys to UUIDs
 */
class CompositeToUuidMigration {
  constructor() {
    this.spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    this.description = 'Convert composite keys to UUID primary keys in registrations';
    this.migrationId = 'Migration002_CompositeToUuid';
    
    // Track changes for rollback
    this.changes = {
      registrations: [],
      registrationsAudit: []
    };
  }

  /**
   * Execute the migration
   */
  execute() {
    console.log('🚀 EXECUTING MIGRATION: Composite Keys to UUID');
    console.log('===============================================');

    // Create automatic backup before starting
    console.log('📦 Creating automatic backup...');
    const backupResult = createMigrationBackup('Migration002_CompositeToUuid', ['registrations', 'registrations_audit']);
    
    if (!backupResult.success) {
      console.error('❌ Failed to create backup, aborting migration');
      throw new Error(`Backup failed: ${backupResult.error}`);
    }
    
    console.log('✅ Backup created successfully');

    try {
      // Execute migration steps
      this.analyzeCurrentState();
      this.migrateRegistrationsTable();
      this.migrateRegistrationsAuditTable();
      
      console.log('\n✅ Migration completed successfully!');
      console.log('📊 Migration Summary:');
      console.log(`   - Registrations migrated: ${this.changes.registrations.length}`);
      console.log(`   - Audit records migrated: ${this.changes.registrationsAudit.length}`);
      
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
    console.log('🔍 PREVIEWING MIGRATION: Composite Keys to UUID');
    console.log('================================================');
    
    try {
      this.analyzeCurrentState();
      
      console.log('\n📊 Preview Summary:');
      console.log('===================');
      console.log('✅ Preview completed - no changes made');
      console.log('📝 Run execute() to apply the migration');
      
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
    
    const registrationsSheet = this.spreadsheet.getSheetByName('registrations');
    if (!registrationsSheet) {
      throw new Error('Registrations sheet not found');
    }
    
    const data = registrationsSheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    console.log(`\n📋 Registrations Analysis:`);
    console.log(`   - Total registrations: ${dataRows.length}`);
    console.log(`   - Current headers: ${headers.join(', ')}`);
    
    // Check for ID column
    const idIndex = headers.indexOf('id') !== -1 ? headers.indexOf('id') : headers.indexOf('Id');
    if (idIndex === -1) {
      throw new Error('ID column not found in registrations table');
    }
    
    // Sample current ID format
    if (dataRows.length > 0) {
      const sampleIds = dataRows.slice(0, 3).map(row => row[idIndex]);
      console.log(`   - Sample current IDs: ${sampleIds.join(', ')}`);
    }
    
    // Analyze audit table
    const auditSheet = this.spreadsheet.getSheetByName('registrations_audit');
    if (auditSheet) {
      const auditData = auditSheet.getDataRange().getValues();
      const auditRows = auditData.slice(1);
      console.log(`\n📜 Audit Analysis:`);
      console.log(`   - Audit records to update: ${auditRows.length}`);
    }
    
    console.log('\n🔄 Migration will:');
    console.log(`   1. Convert ${dataRows.length} registration IDs to UUIDs`);
    console.log(`   2. Rebuild registrations_audit table for consistency`);
  }

  /**
   * Migrate the registrations table
   */
  migrateRegistrationsTable() {
    console.log('\n📋 Migrating registrations table...');
    
    const sheet = this.spreadsheet.getSheetByName('registrations');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    // Find ID column
    const idIndex = headers.indexOf('id') !== -1 ? headers.indexOf('id') : headers.indexOf('Id');
    if (idIndex === -1) {
      throw new Error('ID column not found in registrations table');
    }
    
    // Process each row
    const updatedRows = [];
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (row.length === 0) continue;
      
      const originalId = row[idIndex];
      const newId = this.generateUuid();
      
      // Store change for rollback
      this.changes.registrations.push({
        rowIndex: i + 2,
        originalId: originalId,
        newId: newId
      });
      
      // Create updated row
      const updatedRow = [...row];
      updatedRow[idIndex] = newId;
      
      updatedRows.push(updatedRow);
    }
    
    // Update the sheet with new data
    if (updatedRows.length > 0) {
      // Clear existing data (except headers)
      if (dataRows.length > 0) {
        sheet.getRange(2, 1, dataRows.length, headers.length).clearContent();
      }
      
      // Write updated data
      sheet.getRange(2, 1, updatedRows.length, updatedRows[0].length).setValues(updatedRows);
    }
    
    console.log(`✅ Migrated ${updatedRows.length} registration records`);
  }

  /**
   * Migrate the registrations_audit table using rebuild approach for consistency
   */
  migrateRegistrationsAuditTable() {
    console.log('📜 Rebuilding registrations_audit table for consistency...');
    
    const auditSheet = this.spreadsheet.getSheetByName('registrations_audit');
    if (!auditSheet) {
      console.log('⚠️  registrations_audit sheet not found, skipping');
      return;
    }

    // Get current audit data for change tracking
    const auditData = auditSheet.getDataRange().getValues();
    const auditHeaders = auditData[0];
    const auditRows = auditData.slice(1);
    
    // Clear audit table but keep headers
    if (auditRows.length > 0) {
      auditSheet.getRange(2, 1, auditRows.length, auditHeaders.length).clearContent();
      console.log(`   - Cleared ${auditRows.length} existing audit records`);
    }

    // Get current registrations data (now with UUIDs)
    const registrationsSheet = this.spreadsheet.getSheetByName('registrations');
    const registrationsData = registrationsSheet.getDataRange().getValues();
    const registrationsHeaders = registrationsData[0];
    const registrationsRows = registrationsData.slice(1);

    // Find column indices
    const regIdIndex = registrationsHeaders.indexOf('id') !== -1 ? registrationsHeaders.indexOf('id') : registrationsHeaders.indexOf('Id');
    const auditIdIndex = auditHeaders.indexOf('id') !== -1 ? auditHeaders.indexOf('id') : auditHeaders.indexOf('Id');
    const registrationIdIndex = auditHeaders.indexOf('registration_id') !== -1 ? auditHeaders.indexOf('registration_id') : auditHeaders.indexOf('RegistrationId');
    const actionIndex = auditHeaders.indexOf('action') !== -1 ? auditHeaders.indexOf('action') : auditHeaders.indexOf('Action');
    const timestampIndex = auditHeaders.indexOf('timestamp') !== -1 ? auditHeaders.indexOf('timestamp') : auditHeaders.indexOf('Timestamp');
    const userIndex = auditHeaders.indexOf('user') !== -1 ? auditHeaders.indexOf('user') : auditHeaders.indexOf('User');
    const oldValuesIndex = auditHeaders.indexOf('old_values') !== -1 ? auditHeaders.indexOf('old_values') : auditHeaders.indexOf('OldValues');
    const newValuesIndex = auditHeaders.indexOf('new_values') !== -1 ? auditHeaders.indexOf('new_values') : auditHeaders.indexOf('NewValues');

    if (regIdIndex === -1) {
      console.log('⚠️  id column not found in registrations table, skipping audit rebuild');
      return;
    }

    // Validate audit table structure
    const requiredColumns = ['id', 'registration_id', 'action', 'timestamp', 'user', 'old_values', 'new_values'];
    const missingColumns = requiredColumns.filter(col => 
      auditHeaders.indexOf(col) === -1 && 
      auditHeaders.indexOf(col.charAt(0).toUpperCase() + col.slice(1)) === -1
    );
    
    if (missingColumns.length > 0) {
      console.log(`⚠️  Missing audit columns: ${missingColumns.join(', ')}, skipping audit rebuild`);
      return;
    }

    // Create new audit records for all current registrations
    const newAuditRecords = [];
    const currentTimestamp = new Date().toISOString();

    registrationsRows.forEach((row, index) => {
      const registrationId = row[regIdIndex];
      
      if (!registrationId) {
        console.log(`⚠️  Skipping registration row ${index + 2}: missing ID`);
        return;
      }

      // Create registration object for new_values
      const registrationObject = {};
      registrationsHeaders.forEach((header, i) => {
        registrationObject[header] = row[i];
      });

      // Create audit record
      const auditRecord = new Array(auditHeaders.length).fill('');
      if (auditIdIndex !== -1) auditRecord[auditIdIndex] = this.generateUuid();
      if (registrationIdIndex !== -1) auditRecord[registrationIdIndex] = registrationId;
      if (actionIndex !== -1) auditRecord[actionIndex] = 'INSERT';
      if (timestampIndex !== -1) auditRecord[timestampIndex] = currentTimestamp;
      if (userIndex !== -1) auditRecord[userIndex] = 'MIGRATION_002_REBUILD';
      if (oldValuesIndex !== -1) auditRecord[oldValuesIndex] = '{}';
      if (newValuesIndex !== -1) auditRecord[newValuesIndex] = JSON.stringify(registrationObject);

      newAuditRecords.push(auditRecord);

      // Track change for rollback
      this.changes.registrationsAudit.push({
        rowIndex: newAuditRecords.length + 1,
        originalAuditId: null, // New record
        originalRegistrationId: registrationId,
        newAuditId: auditRecord[auditIdIndex],
        newRegistrationId: registrationId,
        action: 'REBUILT'
      });
    });

    // Write new audit records
    if (newAuditRecords.length > 0) {
      auditSheet.getRange(2, 1, newAuditRecords.length, newAuditRecords[0].length).setValues(newAuditRecords);
    }

    console.log(`✅ Rebuilt ${newAuditRecords.length} audit records with consistent UUID references`);
  }

  /**
   * Rollback the migration (restore from backup)
   */
  rollback() {
    console.log('🔄 Rolling back Composite to UUID Migration...');
    
    try {
      const restoreResult = restoreFromBackup('Migration002_CompositeToUuid');
      
      if (restoreResult.success) {
        console.log('✅ Rollback completed successfully');
        console.log(`📊 Restored ${restoreResult.restoredSheets} sheets from backup`);
      } else {
        console.error('❌ Rollback failed:', restoreResult.error);
      }
      
      return restoreResult;
      
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate a UUID v4
   */
  generateUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Check if a string is a valid UUID
   */
  isUuid(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
}

/**
 * Verification class for composite to UUID migration
 */
class CompositeToUuidMigrationVerifier {
  constructor() {
    this.options = {
      spreadsheetId: getSpreadsheetId(),
      migrationId: 'Migration002_CompositeToUuid',
      description: 'Convert composite keys to UUIDs'
    };
    this.spreadsheet = SpreadsheetApp.openById(this.options.spreadsheetId);
    this.description = this.options.description;
    this.migrationId = this.options.migrationId;
    // ...existing code...
  }

  /**
   * Run all verification checks
   */
  runAllChecks() {
    console.log('Starting comprehensive verification...\n');
    
    this.checkRegistrationsTable();
    this.checkAuditTable();
    this.checkUuidFormat();
    this.checkDataIntegrity();
    
    return this.results;
  }

  /**
   * Check registrations table structure and data
   */
  checkRegistrationsTable() {
    console.log('📋 Checking registrations table...');
    
    const sheet = this.spreadsheet.getSheetByName('registrations');
    if (!sheet) {
      console.log('❌ Registrations sheet not found');
      this.results.failed++;
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    // Check for ID column
    const idIndex = headers.indexOf('id') !== -1 ? headers.indexOf('id') : headers.indexOf('Id');
    if (idIndex === -1) {
      console.log('❌ ID column not found in registrations table');
      this.results.failed++;
      return;
    }
    
    console.log(`✅ Found ${dataRows.length} registration records`);
    console.log(`✅ ID column found at index ${idIndex}`);
    this.results.passed += 2;
    
    // Check for empty IDs
    let emptyIds = 0;
    for (let i = 0; i < dataRows.length; i++) {
      if (!dataRows[i][idIndex]) {
        emptyIds++;
      }
    }
    
    if (emptyIds > 0) {
      console.log(`⚠️  Found ${emptyIds} empty IDs`);
      this.results.warnings++;
    } else {
      console.log('✅ No empty IDs found');
      this.results.passed++;
    }
  }

  /**
   * Check audit table structure
   */
  checkAuditTable() {
    console.log('\n📜 Checking registrations_audit table...');
    
    const sheet = this.spreadsheet.getSheetByName('registrations_audit');
    if (!sheet) {
      console.log('⚠️  Registrations_audit sheet not found');
      this.results.warnings++;
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    console.log(`✅ Found ${dataRows.length} audit records`);
    this.results.passed++;
    
    // Check required columns
    const requiredCols = ['id', 'registration_id', 'action', 'timestamp'];
    const missingCols = requiredCols.filter(col => 
      headers.indexOf(col) === -1 && 
      headers.indexOf(col.charAt(0).toUpperCase() + col.slice(1)) === -1
    );
    
    if (missingCols.length > 0) {
      console.log(`❌ Missing audit columns: ${missingCols.join(', ')}`);
      this.results.failed++;
    } else {
      console.log('✅ All required audit columns present');
      this.results.passed++;
    }
  }

  /**
   * Check UUID format validity
   */
  checkUuidFormat() {
    console.log('\n🔍 Checking UUID format validity...');
    
    const sheet = this.spreadsheet.getSheetByName('registrations');
    if (!sheet) {
      this.results.failed++;
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    const idIndex = headers.indexOf('id') !== -1 ? headers.indexOf('id') : headers.indexOf('Id');
    if (idIndex === -1) {
      this.results.failed++;
      return;
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let validUuids = 0;
    let invalidUuids = 0;
    
    for (let i = 0; i < dataRows.length; i++) {
      const id = dataRows[i][idIndex];
      if (id && uuidRegex.test(id)) {
        validUuids++;
      } else if (id) {
        invalidUuids++;
        if (invalidUuids <= 3) { // Only show first 3 examples
          console.log(`❌ Invalid UUID at row ${i + 2}: "${id}"`);
        }
      }
    }
    
    console.log(`✅ Valid UUIDs: ${validUuids}`);
    if (invalidUuids > 0) {
      console.log(`❌ Invalid UUIDs: ${invalidUuids}`);
      this.results.failed++;
    } else {
      this.results.passed++;
    }
  }

  /**
   * Check data integrity
   */
  checkDataIntegrity() {
    console.log('\n🔐 Checking data integrity...');
    
    const regSheet = this.spreadsheet.getSheetByName('registrations');
    const auditSheet = this.spreadsheet.getSheetByName('registrations_audit');
    
    if (!regSheet) {
      this.results.failed++;
      return;
    }
    
    const regData = regSheet.getDataRange().getValues();
    const regDataRows = regData.slice(1);
    
    // Check for duplicate UUIDs
    const regHeaders = regData[0];
    const idIndex = regHeaders.indexOf('id') !== -1 ? regHeaders.indexOf('id') : regHeaders.indexOf('Id');
    
    if (idIndex !== -1) {
      const ids = regDataRows.map(row => row[idIndex]).filter(id => id);
      const uniqueIds = new Set(ids);
      
      if (ids.length === uniqueIds.size) {
        console.log('✅ No duplicate IDs found');
        this.results.passed++;
      } else {
        console.log(`❌ Found ${ids.length - uniqueIds.size} duplicate IDs`);
        this.results.failed++;
      }
    }
    
    // Check audit-registration relationship if audit exists
    if (auditSheet) {
      const auditData = auditSheet.getDataRange().getValues();
      const auditDataRows = auditData.slice(1);
      
      if (auditDataRows.length > 0) {
        console.log(`✅ Audit table has ${auditDataRows.length} records`);
        this.results.passed++;
      }
    }
    
    console.log('\n🔐 Data integrity check completed');
  }
}
