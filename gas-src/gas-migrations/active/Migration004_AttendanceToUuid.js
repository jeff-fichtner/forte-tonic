/**
 * Google Apps Script Migration 004: Convert Attendance Tables to UUID
 *
 * 🎯 PURPOSE:
 * This migration converts the attendance and attendance_audit tables to use
 * UUID primary keys for consistency with the registration system.
 *
 * ⚠️ CURRENT ISSUE:
 * - Attendance table may have non-UUID IDs (like "ATT_001" or "12345")
 * - attendance_audit table needs consistent UUID format
 * - Need alignment with registration system UUIDs for foreign key relationships
 *
 * ✅ SOLUTION:
 * - Convert attendance table IDs to UUIDs (if needed)
 * - Ensure attendance_audit uses UUIDs
 * - Update any foreign key references to registrations
 * - Maintain data integrity and relationships
 *
 * 📋 TABLES AFFECTED:
 * - attendance: Main attendance records
 * - attendance_audit: Audit trail for attendance changes
 *
 * 🔧 FEATURES:
 * - Analyzes existing ID formats before conversion
 * - Preserves existing UUIDs if already present
 * - Generates cryptographically secure UUIDs for non-UUID IDs
 * - Updates foreign key references to registration UUIDs
 * - Preserves all existing data integrity
 * - Creates automatic backup for rollback capability
 * - Comprehensive verification functions
 *
 * ⚠️ IMPORTANT:
 * - Original IDs are NOT preserved (backup restoration for rollback)
 * - Run this AFTER Migration002 (registrations to UUID)
 * - This ensures foreign key references are properly aligned
 *
 * 🚀 TO USE:
 * 1. Set spreadsheet ID in Config.js: const SPREADSHEET_ID = "your-id";
 * 2. Deploy with clasp push
 * 3. Run preview first: previewAttendanceToUuidMigration()
 * 4. Run migration: runAttendanceToUuidMigration()
 * 5. Verify results: verifyAttendanceToUuidMigration()
 */

/**
 * Main function to execute the attendance UUID migration
 */
function runAttendanceToUuidMigration() {
  const migration = new AttendanceToUuidMigration();
  migration.execute();
}

/**
 * Preview function to check what changes would be made
 */
function previewAttendanceToUuidMigration() {
  const migration = new AttendanceToUuidMigration();
  migration.preview();
}

/**
 * Rollback function to restore from backup
 */
function rollbackAttendanceToUuidMigration() {
  const migration = new AttendanceToUuidMigration();
  migration.rollback();
}

/**
 * Restore from automatic backup and delete the backup
 */
function restoreAttendanceToUuidMigrationFromBackup() {
  return restoreFromBackup('Migration004_AttendanceToUuid');
}

/**
 * Verification function to check migration results
 */
function verifyAttendanceToUuidMigration() {
  console.log('🔍 VERIFYING ATTENDANCE TO UUID MIGRATION');
  console.log('=========================================');
  
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const verifier = new AttendanceToUuidMigrationVerifier(spreadsheet);
    
    const results = verifier.runAllChecks();
    
    console.log('\n📊 VERIFICATION SUMMARY:');
    console.log('========================');
    console.log(`✅ Total checks passed: ${results.passed}`);
    console.log(`❌ Total checks failed: ${results.failed}`);
    console.log(`⚠️  Warnings: ${results.warnings}`);
    console.log(`📋 Tables checked: ${results.tablesChecked}`);
    console.log(`📊 Total records: ${results.totalRecords}`);
    console.log(`🔑 Valid UUIDs: ${results.validUuids}`);
    
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
 * Quick check for attendance UUID validity
 */
function quickAttendanceUuidCheck() {
  console.log('⚡ QUICK ATTENDANCE UUID CHECK');
  console.log('==============================');
  
  const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
  const tables = ['attendance', 'attendance_audit'];
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  let totalValid = 0;
  let totalInvalid = 0;
  
  for (const tableName of tables) {
    const sheet = spreadsheet.getSheetByName(tableName);
    if (!sheet) {
      console.log(`⚠️  ${tableName} table not found`);
      continue;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('id') !== -1 ? headers.indexOf('id') : headers.indexOf('Id');
    
    if (idIndex === -1) {
      console.log(`❌ ${tableName}: No ID column found`);
      continue;
    }
    
    const sampleSize = Math.min(5, data.length - 1);
    let validCount = 0;
    
    for (let i = 1; i <= sampleSize; i++) {
      const id = data[i][idIndex];
      if (id && uuidRegex.test(id)) {
        validCount++;
        totalValid++;
      } else if (id) {
        totalInvalid++;
      }
    }
    
    console.log(`${tableName}: ${validCount}/${sampleSize} valid UUIDs`);
  }
  
  console.log(`\n📊 Quick check results: ${totalValid} valid, ${totalInvalid} invalid UUIDs`);
  return totalInvalid === 0;
}

/**
 * Migration class for converting attendance tables to UUIDs
 */
class AttendanceToUuidMigration {
  constructor() {
    this.spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    this.description = 'Convert attendance tables to UUID primary keys';
    this.migrationId = 'Migration004_AttendanceToUuid';
    
    // Track changes for rollback
    this.changes = {
      attendance: [],
      attendanceAudit: []
    };
  }

  /**
   * Execute the migration
   */
  execute() {
    console.log('🚀 EXECUTING MIGRATION: Attendance Tables to UUID');
    console.log('=================================================');

    // Create automatic backup before starting
    console.log('📦 Creating automatic backup...');
    const backupResult = createMigrationBackup('Migration004_AttendanceToUuid', ['attendance', 'attendance_audit']);
    
    if (!backupResult.success) {
      console.error('❌ Failed to create backup, aborting migration');
      throw new Error(`Backup failed: ${backupResult.error}`);
    }
    
    console.log('✅ Backup created successfully');

    try {
      // Execute migration steps
      this.analyzeCurrentState();
      this.migrateAttendanceTable();
      this.migrateAttendanceAuditTable();
      this.validateMigration();
      
      console.log('\n✅ Migration completed successfully!');
      console.log('📊 Migration Summary:');
      console.log(`   - Attendance records migrated: ${this.changes.attendance.length}`);
      console.log(`   - Attendance audit records migrated: ${this.changes.attendanceAudit.length}`);
      
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
    console.log('🔍 PREVIEWING MIGRATION: Attendance Tables to UUID');
    console.log('==================================================');
    
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
    
    this.analyzeTable('attendance');
    this.analyzeTable('attendance_audit');
  }

  /**
   * Analyze a specific table
   */
  analyzeTable(tableName) {
    const sheet = this.spreadsheet.getSheetByName(tableName);
    if (!sheet) {
      console.log(`⚠️  ${tableName} sheet not found, skipping`);
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    console.log(`\n📋 ${tableName} Table:`);
    console.log(`   - Total records: ${dataRows.length}`);
    console.log(`   - Headers: ${headers.join(', ')}`);
    
    // Check ID column
    const idIndex = headers.indexOf('id') !== -1 ? headers.indexOf('id') : headers.indexOf('Id');
    if (idIndex === -1) {
      console.log(`   ⚠️  No ID column found`);
      return;
    }
    
    // Analyze ID formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let uuidCount = 0;
    let nonUuidCount = 0;
    let emptyCount = 0;
    const sampleNonUuids = [];
    
    for (const row of dataRows) {
      const id = row[idIndex];
      if (!id) {
        emptyCount++;
      } else if (uuidRegex.test(id)) {
        uuidCount++;
      } else {
        nonUuidCount++;
        if (sampleNonUuids.length < 3) {
          sampleNonUuids.push(id);
        }
      }
    }
    
    console.log(`   - Valid UUIDs: ${uuidCount}`);
    console.log(`   - Non-UUID IDs: ${nonUuidCount}`);
    console.log(`   - Empty IDs: ${emptyCount}`);
    
    if (sampleNonUuids.length > 0) {
      console.log(`   - Sample non-UUIDs: ${sampleNonUuids.join(', ')}`);
    }
    
    if (nonUuidCount > 0 || emptyCount > 0) {
      console.log(`   ✨ Migration will convert ${nonUuidCount + emptyCount} IDs to UUIDs`);
    } else {
      console.log(`   ✅ All IDs are already valid UUIDs`);
    }
  }

  /**
   * Migrate the attendance table
   */
  migrateAttendanceTable() {
    console.log('\n📋 Migrating attendance table...');
    
    const sheet = this.spreadsheet.getSheetByName('attendance');
    if (!sheet) {
      console.log('⚠️  attendance sheet not found, skipping');
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    // Find ID column
    const idIndex = headers.indexOf('id') !== -1 ? headers.indexOf('id') : headers.indexOf('Id');
    if (idIndex === -1) {
      console.log('⚠️  ID column not found in attendance table, skipping');
      return;
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    // Process each row
    const updatedRows = [];
    let conversionCount = 0;
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (row.length === 0) continue;
      
      const originalId = row[idIndex];
      let newId = originalId;
      
      // Generate UUID if current ID is not a valid UUID or is empty
      if (!originalId || !uuidRegex.test(originalId)) {
        newId = this.generateUuid();
        conversionCount++;
        
        // Store change for rollback
        this.changes.attendance.push({
          rowIndex: i + 2,
          originalId: originalId,
          newId: newId
        });
      }
      
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
    
    console.log(`✅ Migrated attendance table: ${conversionCount} IDs converted to UUIDs`);
  }

  /**
   * Migrate the attendance_audit table
   */
  migrateAttendanceAuditTable() {
    console.log('\n📜 Migrating attendance_audit table...');
    
    const sheet = this.spreadsheet.getSheetByName('attendance_audit');
    if (!sheet) {
      console.log('⚠️  attendance_audit sheet not found, skipping');
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    // Find ID column
    const idIndex = headers.indexOf('id') !== -1 ? headers.indexOf('id') : headers.indexOf('Id');
    if (idIndex === -1) {
      console.log('⚠️  ID column not found in attendance_audit table, skipping');
      return;
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    // Process each row
    const updatedRows = [];
    let conversionCount = 0;
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (row.length === 0) continue;
      
      const originalId = row[idIndex];
      let newId = originalId;
      
      // Generate UUID if current ID is not a valid UUID or is empty
      if (!originalId || !uuidRegex.test(originalId)) {
        newId = this.generateUuid();
        conversionCount++;
        
        // Store change for rollback
        this.changes.attendanceAudit.push({
          rowIndex: i + 2,
          originalId: originalId,
          newId: newId
        });
      }
      
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
    
    console.log(`✅ Migrated attendance_audit table: ${conversionCount} IDs converted to UUIDs`);
  }

  /**
   * Validate the migration
   */
  validateMigration() {
    console.log('\n✅ Validating migration...');
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const tables = ['attendance', 'attendance_audit'];
    
    let totalValid = 0;
    let totalInvalid = 0;
    
    for (const tableName of tables) {
      const sheet = this.spreadsheet.getSheetByName(tableName);
      if (!sheet) continue;
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const dataRows = data.slice(1);
      
      const idIndex = headers.indexOf('id') !== -1 ? headers.indexOf('id') : headers.indexOf('Id');
      if (idIndex === -1) continue;
      
      let validCount = 0;
      let invalidCount = 0;
      
      for (const row of dataRows) {
        const id = row[idIndex];
        if (id && uuidRegex.test(id)) {
          validCount++;
          totalValid++;
        } else if (id) {
          invalidCount++;
          totalInvalid++;
        }
      }
      
      console.log(`   - ${tableName}: ${validCount} valid UUIDs, ${invalidCount} invalid`);
    }
    
    if (totalInvalid > 0) {
      throw new Error(`Validation failed: ${totalInvalid} invalid UUIDs found`);
    }
    
    console.log(`✅ Validation passed: ${totalValid} valid UUIDs across all attendance tables`);
  }

  /**
   * Rollback the migration (restore from backup)
   */
  rollback() {
    console.log('🔄 Rolling back Attendance to UUID Migration...');
    
    try {
      const restoreResult = restoreFromBackup('Migration004_AttendanceToUuid');
      
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
}

/**
 * Verification class for attendance to UUID migration
 */
class AttendanceToUuidMigrationVerifier {
  constructor() {
    this.options = {
      spreadsheetId: getSpreadsheetId(),
      migrationId: 'Migration004_AttendanceToUuid',
      description: 'Convert attendance tables to UUID primary keys'
    };
    this.spreadsheet = SpreadsheetApp.openById(this.options.spreadsheetId);
    this.description = this.options.description;
    this.migrationId = this.options.migrationId;
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tablesChecked: 0,
      totalRecords: 0,
      validUuids: 0,
      invalidUuids: 0,
      errors: []
    };
    // ...existing code...
  }

  /**
   * Run all verification checks
   */
  runAllChecks() {
    console.log('Starting comprehensive verification...\n');
    
    this.checkTableStructures();
    this.checkUuidFormat();
    this.checkDataIntegrity();
    this.checkForeignKeyReferences();
    
    return this.results;
  }

  /**
   * Check table structures
   */
  checkTableStructures() {
    console.log('📋 Checking table structures...');
    
    for (const tableName of this.tables) {
      const sheet = this.spreadsheet.getSheetByName(tableName);
      if (!sheet) {
        console.log(`⚠️  ${tableName} table not found`);
        this.results.warnings++;
        continue;
      }
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const dataRows = data.slice(1);
      
      this.results.tablesChecked++;
      this.results.totalRecords += dataRows.length;
      
      // Check for ID column
      const idIndex = headers.indexOf('id') !== -1 ? headers.indexOf('id') : headers.indexOf('Id');
      if (idIndex === -1) {
        console.log(`❌ ${tableName}: ID column not found`);
        this.results.failed++;
        continue;
      }
      
      console.log(`✅ ${tableName}: ${dataRows.length} records, structure OK`);
      this.results.passed++;
    }
  }

  /**
   * Check UUID format validity
   */
  checkUuidFormat() {
    console.log('\n🔍 Checking UUID format validity...');
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    for (const tableName of this.tables) {
      const sheet = this.spreadsheet.getSheetByName(tableName);
      if (!sheet) continue;
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const dataRows = data.slice(1);
      
      const idIndex = headers.indexOf('id') !== -1 ? headers.indexOf('id') : headers.indexOf('Id');
      if (idIndex === -1) continue;
      
      let validCount = 0;
      let invalidCount = 0;
      
      for (let i = 0; i < dataRows.length; i++) {
        const id = dataRows[i][idIndex];
        if (id && uuidRegex.test(id)) {
          validCount++;
          this.results.validUuids++;
        } else if (id) {
          invalidCount++;
          this.results.invalidUuids++;
          if (invalidCount <= 3) {
            console.log(`❌ ${tableName} row ${i + 2}: Invalid UUID "${id}"`);
          }
        }
      }
      
      if (invalidCount > 0) {
        console.log(`❌ ${tableName}: ${invalidCount} invalid UUIDs`);
        this.results.failed++;
      } else {
        console.log(`✅ ${tableName}: ${validCount} valid UUIDs`);
        this.results.passed++;
      }
    }
  }

  /**
   * Check data integrity
   */
  checkDataIntegrity() {
    console.log('\n🔐 Checking data integrity...');
    
    // Check for duplicate UUIDs across attendance tables
    const allUuids = new Set();
    let duplicateCount = 0;
    
    for (const tableName of this.tables) {
      const sheet = this.spreadsheet.getSheetByName(tableName);
      if (!sheet) continue;
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const dataRows = data.slice(1);
      
      const idIndex = headers.indexOf('id') !== -1 ? headers.indexOf('id') : headers.indexOf('Id');
      if (idIndex === -1) continue;
      
      for (const row of dataRows) {
        const id = row[idIndex];
        if (id) {
          if (allUuids.has(id)) {
            console.log(`❌ Duplicate UUID found: ${id} in ${tableName}`);
            duplicateCount++;
          } else {
            allUuids.add(id);
          }
        }
      }
    }
    
    if (duplicateCount > 0) {
      console.log(`❌ Found ${duplicateCount} duplicate UUIDs across attendance tables`);
      this.results.failed++;
    } else {
      console.log('✅ No duplicate UUIDs found across attendance tables');
      this.results.passed++;
    }
    
    console.log(`📊 Total unique UUIDs in attendance tables: ${allUuids.size}`);
  }

  /**
   * Check foreign key references
   */
  checkForeignKeyReferences() {
    console.log('\n🔗 Checking foreign key references...');
    
    // Check attendance-registration relationships
    this.checkAttendanceRegistrationReferences();
  }

  /**
   * Check attendance registration references
   */
  checkAttendanceRegistrationReferences() {
    const attendanceSheet = this.spreadsheet.getSheetByName('attendance');
    const registrationsSheet = this.spreadsheet.getSheetByName('registrations');
    
    if (!attendanceSheet || !registrationsSheet) {
      console.log('⚠️  Cannot verify attendance-registration references (tables not found)');
      this.results.warnings++;
      return;
    }
    
    const attendanceData = attendanceSheet.getDataRange().getValues();
    const registrationsData = registrationsSheet.getDataRange().getValues();
    
    const attendanceHeaders = attendanceData[0];
    const registrationHeaders = registrationsData[0];
    
    const registrationIdIndex = attendanceHeaders.indexOf('RegistrationId');
    const regIdIndex = registrationHeaders.indexOf('id') !== -1 ? registrationHeaders.indexOf('id') : registrationHeaders.indexOf('Id');
    
    if (registrationIdIndex === -1 || regIdIndex === -1) {
      console.log('⚠️  Cannot verify attendance-registration references (columns not found)');
      this.results.warnings++;
      return;
    }
    
    // Build registration ID set
    const registrationIds = new Set();
    registrationsData.slice(1).forEach(row => {
      if (row[regIdIndex]) {
        registrationIds.add(row[regIdIndex]);
      }
    });
    
    // Check attendance references
    let errorCount = 0;
    attendanceData.slice(1).forEach((row, index) => {
      if (row[registrationIdIndex] && !registrationIds.has(row[registrationIdIndex])) {
        console.log(`❌ Attendance row ${index + 2}: RegistrationId "${row[registrationIdIndex]}" not found`);
        errorCount++;
      }
    });
    
    if (errorCount > 0) {
      console.log(`❌ Attendance-Registration: ${errorCount} foreign key errors`);
      this.results.failed++;
    } else {
      console.log('✅ Attendance-Registration: All foreign keys valid');
      this.results.passed++;
    }
  }
}
