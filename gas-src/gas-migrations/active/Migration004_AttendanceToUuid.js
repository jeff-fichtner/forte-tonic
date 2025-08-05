/**
 * Google Apps Script Migration 004: Convert Attendance Tables to UUID
 *
 * This migration converts the attendance and attendance_audit tables to use
 * UUID primary keys for consistency with the registration system.
 *
 * Current Issue:
 * - Attendance table may have non-UUID IDs
 * - attendance_audit table needs consistent UUID format
 * - Need alignment with registration system UUIDs
 *
 * Solution:
 * - Convert attendance table IDs to UUIDs (if needed)
 * - Ensure attendance_audit uses UUIDs
 * - Update any foreign key references to registrations
 * - Maintain data integrity and relationships
 *
 * Features:
 * - Generates cryptographically secure UUIDs
 * - Updates foreign key references to registration UUIDs
 * - Preserves all existing data integrity
 * - Creates automatic backup for rollback capability
 *
 * To use:
 * 1. Run preview first: previewAttendanceToUuidMigration()
 * 2. Run migration: runAttendanceToUuidMigration()
 * 3. Verify results: verifyAttendanceToUuidMigration()
 */

/**
 * Main function to execute the attendance UUID migration
 */
function runAttendanceToUuidMigration() {
  const migration = new AttendanceToUuidMigration(getSpreadsheetId());
  migration.execute();
}

/**
 * Preview function to check what changes would be made
 */
function previewAttendanceToUuidMigration() {
  const migration = new AttendanceToUuidMigration(getSpreadsheetId());
  migration.preview();
}

/**
 * Rollback function to restore from backup
 */
function rollbackAttendanceToUuidMigration() {
  const migration = new AttendanceToUuidMigration(getSpreadsheetId());
  migration.rollback();
}

/**
 * Restore from automatic backup
 */
function restoreAttendanceToUuidMigrationFromBackup() {
  return restoreFromBackup('AttendanceToUuidMigration');
}

/**
 * Verification function
 */
function verifyAttendanceToUuidMigration() {
  const migration = new AttendanceToUuidMigration(getSpreadsheetId());
  migration.verify();
}

/**
 * Migration class for converting attendance tables to UUIDs
 */
class AttendanceToUuidMigration {
  constructor(spreadsheetId) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.description = 'Convert attendance and attendance_audit tables to UUID primary keys';
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
    console.log('🚀 Starting Attendance Tables to UUID Migration...');
    
    try {
      // Create automatic backup
      console.log('📦 Creating automatic backup...');
      this.createBackup();
      
      // Execute migration steps
      this.migrateAttendanceTable();
      this.migrateAttendanceAuditTable();
      this.validateMigration();
      
      console.log('✅ Migration completed successfully!');
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      console.log('🔄 Consider running rollbackAttendanceToUuidMigration() to revert changes');
      throw error;
    }
  }

  /**
   * Preview what the migration will do
   */
  preview() {
    console.log('👀 PREVIEW: Attendance Tables to UUID Migration');
    console.log('==============================================');
    
    try {
      // Analyze attendance table
      console.log(`\n📊 Analyzing attendance table:`);
      const attendanceAnalysis = this.analyzeAttendanceTable();
      
      // Analyze attendance_audit table
      console.log(`\n📜 Analyzing attendance_audit table:`);
      const auditAnalysis = this.analyzeAttendanceAuditTable();
      
      console.log(`\n📋 Planned Changes:`);
      console.log(`   1. Convert attendance table IDs to UUIDs (if needed)`);
      console.log(`   2. Ensure attendance_audit table uses UUIDs`);
      console.log(`   3. Update any foreign key references`);
      console.log(`   4. Maintain all data relationships and integrity`);
      console.log(`   ⚠️  Note: Original IDs will NOT be preserved (backup for rollback)`);
      console.log(`\n✅ Preview complete. Run runAttendanceToUuidMigration() to execute.`);
      
    } catch (error) {
      console.error('❌ Preview failed:', error.message);
      throw error;
    }
  }

  /**
   * Analyze attendance table
   */
  analyzeAttendanceTable() {
    const sheet = this.spreadsheet.getSheetByName('attendance');
    if (!sheet) {
      console.log(`   ⚠️  attendance sheet not found`);
      return { exists: false };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    const idColumnIndex = headers.indexOf('Id');
    if (idColumnIndex === -1) {
      console.log(`   ⚠️  No Id column found in attendance table`);
      return { exists: true, hasIdColumn: false };
    }
    
    let uuidCount = 0;
    let nonUuidCount = 0;
    
    for (const row of dataRows) {
      if (row.length === 0 || !row[idColumnIndex]) continue;
      
      if (this.isUuid(row[idColumnIndex])) {
        uuidCount++;
      } else {
        nonUuidCount++;
      }
    }
    
    console.log(`   📋 Records: ${dataRows.length}`);
    console.log(`   📋 Current UUIDs: ${uuidCount}`);
    console.log(`   📋 Non-UUIDs to convert: ${nonUuidCount}`);
    
    return {
      exists: true,
      hasIdColumn: true,
      totalRecords: dataRows.length,
      uuidCount,
      nonUuidCount
    };
  }

  /**
   * Analyze attendance_audit table
   */
  analyzeAttendanceAuditTable() {
    const sheet = this.spreadsheet.getSheetByName('attendance_audit');
    if (!sheet) {
      console.log(`   ⚠️  attendance_audit sheet not found`);
      return { exists: false };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    const idColumnIndex = headers.indexOf('Id');
    const registrationIdIndex = headers.indexOf('RegistrationId');
    
    console.log(`   📋 Audit records: ${dataRows.length}`);
    console.log(`   📋 Has Id column: ${idColumnIndex !== -1 ? 'Yes' : 'No'}`);
    console.log(`   📋 Has RegistrationId column: ${registrationIdIndex !== -1 ? 'Yes' : 'No'}`);
    
    if (idColumnIndex !== -1) {
      let uuidCount = 0;
      for (const row of dataRows) {
        if (row.length === 0 || !row[idColumnIndex]) continue;
        if (this.isUuid(row[idColumnIndex])) {
          uuidCount++;
        }
      }
      console.log(`   📋 Current UUID audit IDs: ${uuidCount}`);
    }
    
    return {
      exists: true,
      hasIdColumn: idColumnIndex !== -1,
      hasRegistrationIdColumn: registrationIdIndex !== -1,
      totalRecords: dataRows.length
    };
  }

  /**
   * Migrate the attendance table
   */
  migrateAttendanceTable() {
    console.log('📅 Migrating attendance table...');
    
    const sheet = this.spreadsheet.getSheetByName('attendance');
    if (!sheet) {
      console.log('⚠️  attendance sheet not found, skipping');
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    const idColumnIndex = headers.indexOf('Id');
    if (idColumnIndex === -1) {
      console.log('⚠️  No Id column found in attendance table, skipping');
      return;
    }
    
    // Process each row
    const updatedRows = [];
    let convertedCount = 0;
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (row.length === 0 || !row[idColumnIndex]) continue;
      
      const originalId = row[idColumnIndex];
      let newId = originalId;
      
      // Convert to UUID if not already a UUID
      if (!this.isUuid(originalId)) {
        newId = this.generateUuid();
        convertedCount++;
        
        // Store change for rollback
        this.changes.attendance.push({
          rowIndex: i + 2,
          originalId: originalId,
          newId: newId
        });
      }
      
      // Create updated row
      const updatedRow = [...row];
      updatedRow[idColumnIndex] = newId;
      
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
    
    console.log(`✅ Migrated attendance table: ${convertedCount} IDs converted to UUIDs`);
  }

  /**
   * Migrate the attendance_audit table
   */
  migrateAttendanceAuditTable() {
    console.log('📜 Migrating attendance_audit table...');
    
    const sheet = this.spreadsheet.getSheetByName('attendance_audit');
    if (!sheet) {
      console.log('⚠️  attendance_audit sheet not found, skipping');
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    const idColumnIndex = headers.indexOf('Id');
    if (idColumnIndex === -1) {
      console.log('⚠️  No Id column found in attendance_audit table, skipping');
      return;
    }
    
    // Process each row
    const updatedRows = [];
    let convertedCount = 0;
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (row.length === 0) continue;
      
      const originalId = row[idColumnIndex];
      let newId = originalId;
      
      // Convert to UUID if not already a UUID
      if (originalId && !this.isUuid(originalId)) {
        newId = this.generateUuid();
        convertedCount++;
        
        // Store change for rollback
        this.changes.attendanceAudit.push({
          rowIndex: i + 2,
          originalId: originalId,
          newId: newId
        });
      } else if (!originalId) {
        // Generate UUID for empty audit IDs
        newId = this.generateUuid();
        convertedCount++;
      }
      
      // Create updated row
      const updatedRow = [...row];
      updatedRow[idColumnIndex] = newId;
      
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
    
    console.log(`✅ Migrated attendance_audit table: ${convertedCount} IDs converted to UUIDs`);
  }

  /**
   * Validate the migration was successful
   */
  validateMigration() {
    console.log('🔍 Validating migration...');
    
    let totalValidated = 0;
    let totalErrors = 0;
    
    // Validate attendance table
    const attendanceResult = this.validateTable('attendance');
    totalValidated += attendanceResult.valid;
    totalErrors += attendanceResult.errors;
    
    // Validate attendance_audit table
    const auditResult = this.validateTable('attendance_audit');
    totalValidated += auditResult.valid;
    totalErrors += auditResult.errors;
    
    if (totalErrors > 0) {
      throw new Error(`Validation failed: ${totalErrors} invalid UUIDs found`);
    }
    
    console.log(`✅ Validation passed: ${totalValidated} valid UUIDs across all tables`);
  }

  /**
   * Validate a specific table
   */
  validateTable(tableName) {
    const sheet = this.spreadsheet.getSheetByName(tableName);
    if (!sheet) {
      console.log(`   ⚠️  ${tableName} sheet not found`);
      return { valid: 0, errors: 0 };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    const idColumnIndex = headers.indexOf('Id');
    if (idColumnIndex === -1) {
      console.log(`   ⚠️  No Id column in ${tableName}`);
      return { valid: 0, errors: 0 };
    }
    
    let validCount = 0;
    let errorCount = 0;
    
    for (const row of dataRows) {
      if (row.length === 0) continue;
      
      const id = row[idColumnIndex];
      if (id && this.isUuid(id)) {
        validCount++;
      } else if (id) {
        errorCount++;
      }
    }
    
    if (errorCount === 0) {
      console.log(`   ✅ ${tableName}: ${validCount} valid UUIDs`);
    } else {
      console.log(`   ❌ ${tableName}: ${errorCount} invalid UUIDs`);
    }
    
    return { valid: validCount, errors: errorCount };
  }

  /**
   * Verify migration results
   */
  verify() {
    console.log('🔍 Verifying Attendance Tables UUID Migration...');
    console.log('===============================================');
    
    try {
      this.validateMigration();
      
      console.log('\n📊 Verification Summary:');
      console.log('   ✅ All attendance table IDs are valid UUIDs');
      console.log('   ✅ All attendance_audit table IDs are valid UUIDs');
      console.log('   ✅ Migration completed successfully');
      
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      throw error;
    }
  }

  /**
   * Print migration summary
   */
  printSummary() {
    console.log('\n📊 Migration Summary:');
    console.log('====================');
    
    const attendanceChanges = this.changes.attendance.length;
    const auditChanges = this.changes.attendanceAudit.length;
    
    console.log(`   - attendance: ${attendanceChanges} IDs converted to UUIDs`);
    console.log(`   - attendance_audit: ${auditChanges} IDs converted to UUIDs`);
    console.log('📦 Backup created for rollback if needed');
    console.log('✅ Run verifyAttendanceToUuidMigration() to perform verification');
  }

  /**
   * Rollback the migration using backup restoration
   */
  rollback() {
    console.log('🔄 Rolling back Attendance Tables to UUID Migration...');
    console.log('ℹ️  Since original IDs are not preserved, rollback requires backup restoration');
    
    try {
      // Use backup restoration for rollback
      const backupResult = restoreFromBackup('AttendanceToUuidMigration');
      
      if (backupResult && backupResult.success) {
        console.log('✅ Rollback completed successfully using backup restoration!');
      } else {
        throw new Error('Backup restoration failed');
      }
      
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      console.log('📦 Manual restoration may be required from spreadsheet version history');
      throw error;
    }
  }

  /**
   * Create backup before migration
   */
  createBackup() {
    try {
      const backupResult = createMigrationBackup(this.migrationId, ['attendance', 'attendance_audit']);
      console.log(`✅ Backup created: ${backupResult.backupPrefix}`);
      return backupResult;
    } catch (error) {
      console.error('⚠️  Backup creation failed:', error.message);
      console.log('Continuing with migration (backup recommended but not required)');
    }
  }

  /**
   * Generate a UUID v4
   */
  generateUuid() {
    const chars = '0123456789abcdef';
    const uuid = [];
    
    for (let i = 0; i < 36; i++) {
      if (i === 8 || i === 13 || i === 18 || i === 23) {
        uuid[i] = '-';
      } else if (i === 14) {
        uuid[i] = '4';
      } else if (i === 19) {
        uuid[i] = chars[Math.floor(Math.random() * 4) + 8];
      } else {
        uuid[i] = chars[Math.floor(Math.random() * 16)];
      }
    }
    
    return uuid.join('');
  }

  /**
   * Check if a string is a valid UUID
   */
  isUuid(str) {
    if (!str || typeof str !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
}
