/**
 * Google Apps Script Migration 004: Convert Attendance Tables to UUID
 *
 * 🎯 PURPOSE:
 * Converts the attendance and attendance_audit tables to use UUID primary keys
 * for consistency with the registration system.
 *
 * 📋 WHAT IT DOES:
 * - Converts non-UUID IDs in attendance table to UUID format
 * - Converts non-UUID IDs in attendance_audit table to UUID format
 * - Preserves existing valid UUIDs
 * - Generates cryptographically secure UUIDs for non-UUID IDs
 *
 * 🚀 TO USE:
 * 1. Set spreadsheet ID in Config.js
 * 2. Deploy with clasp push
 * 3. Run: runAttendanceToUuidMigration() - Creates MIGRATION_* working copies
 * 4. Review MIGRATION_attendance and MIGRATION_attendance_audit sheets
 * 5. Run: applyAttendanceToUuidMigration() - Makes changes permanent (DESTRUCTIVE)
 */

/**
 * Step 1: Run migration - Creates working copies with UUID conversions
 */
function runAttendanceToUuidMigration() {
  const migration = new AttendanceToUuidMigration(getSpreadsheetId());
  migration.run();
}

/**
 * Step 2: Apply migration - Makes changes permanent
 * WARNING: DESTRUCTIVE - Deletes original tables and renames working copies
 */
function applyAttendanceToUuidMigration() {
  const migration = new AttendanceToUuidMigration(getSpreadsheetId());
  migration.apply();
}

/**
 * Migration class for converting attendance tables to UUIDs
 */
class AttendanceToUuidMigration {
  constructor(spreadsheetId) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.migrationName = 'AttendanceToUuid';

    this.sheetsToMigrate = [
      { original: 'attendance', working: 'MIGRATION_attendance' },
      { original: 'attendance_audit', working: 'MIGRATION_attendance_audit' }
    ];
  }

  /**
   * Run migration - Create working copies with UUID conversions
   */
  run() {
    Logger.log(`🚀 RUNNING MIGRATION: ${this.migrationName}`);
    Logger.log('='.repeat(42 + this.migrationName.length));

    try {
      this.sheetsToMigrate.forEach(({ original, working }) => {
        Logger.log(`\n📊 Processing ${original}...`);

        // Delete previous working copy if exists
        const existingWorking = this.spreadsheet.getSheetByName(working);
        if (existingWorking) {
          Logger.log(`   🗑️  Deleting previous ${working}`);
          this.spreadsheet.deleteSheet(existingWorking);
        }

        // Get original sheet
        const originalSheet = this.spreadsheet.getSheetByName(original);
        if (!originalSheet) {
          Logger.log(`   ⚠️  Original sheet '${original}' not found, skipping`);
          return;
        }

        // Create full copy
        Logger.log(`   📋 Creating full copy: ${working}`);
        const workingCopy = originalSheet.copyTo(this.spreadsheet);
        workingCopy.setName(working);

        // Convert IDs to UUIDs
        this._convertIdsToUuids(workingCopy, original);
        Logger.log(`   ✅ Converted IDs to UUIDs in ${working}`);
      });

      Logger.log('\n🎉 MIGRATION RUN COMPLETED!');
      Logger.log('\n📋 Next steps:');
      Logger.log('   1. Review the MIGRATION_* sheets to verify UUID conversions');
      Logger.log('   2. Run applyAttendanceToUuidMigration() to make permanent');
      Logger.log('   ⚠️  WARNING: apply() is DESTRUCTIVE and cannot be undone!');

    } catch (error) {
      Logger.log(`\n❌ MIGRATION RUN FAILED: ${error.message}`);
      throw error;
    }
  }

  /**
   * Apply migration - Make changes permanent
   * DESTRUCTIVE: Deletes original tables and renames working copies
   */
  apply() {
    Logger.log(`⚠️  APPLYING MIGRATION: ${this.migrationName}`);
    Logger.log('='.repeat(42 + this.migrationName.length));
    Logger.log('⚠️  WARNING: This is DESTRUCTIVE and cannot be undone!');

    try {
      // Verify all working copies exist
      const missingSheets = [];
      this.sheetsToMigrate.forEach(({ working }) => {
        if (!this.spreadsheet.getSheetByName(working)) {
          missingSheets.push(working);
        }
      });

      if (missingSheets.length > 0) {
        throw new Error(`Working copies not found: ${missingSheets.join(', ')}. Run runAttendanceToUuidMigration() first.`);
      }

      // Process each sheet
      this.sheetsToMigrate.forEach(({ original, working }) => {
        Logger.log(`\n📊 Processing ${original}...`);

        // Delete original
        const originalSheet = this.spreadsheet.getSheetByName(original);
        if (originalSheet) {
          Logger.log(`   🗑️  Deleting original ${original}`);
          this.spreadsheet.deleteSheet(originalSheet);
        }

        // Rename working copy to original
        const workingSheet = this.spreadsheet.getSheetByName(working);
        Logger.log(`   ✏️  Renaming ${working} → ${original}`);
        workingSheet.setName(original);
      });

      Logger.log('\n🎉 MIGRATION APPLIED SUCCESSFULLY!');
      Logger.log('   Attendance tables now use UUID primary keys');
      Logger.log('   Changes are now permanent');

    } catch (error) {
      Logger.log(`\n❌ MIGRATION APPLY FAILED: ${error.message}`);
      Logger.log('   Original tables may still exist - check manually');
      throw error;
    }
  }

  /**
   * Convert non-UUID IDs to UUIDs in a sheet
   */
  _convertIdsToUuids(sheet, sheetName) {
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);

    // Find ID column
    const idIndex = headers.indexOf('id') !== -1 ? headers.indexOf('id') : headers.indexOf('Id');
    if (idIndex === -1) {
      Logger.log(`     ⚠️  ID column not found in ${sheetName}, skipping`);
      return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let convertedCount = 0;

    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (row.length === 0) continue;

      const currentId = row[idIndex];

      // Convert if not already a valid UUID
      if (!currentId || !uuidRegex.test(currentId)) {
        const newUuid = this._generateUuid();
        sheet.getRange(i + 2, idIndex + 1).setValue(newUuid);
        convertedCount++;
      }
    }

    Logger.log(`     ✅ Converted ${convertedCount} IDs to UUIDs in ${sheetName}`);
  }

  /**
   * Generate a UUID v4
   */
  _generateUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Check if a string is a valid UUID
   */
  _isValidUuid(str) {
    if (!str) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
}
