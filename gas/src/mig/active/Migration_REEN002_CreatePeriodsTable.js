/**
 * Google Apps Script Migration REEN002: Create Periods Table
 *
 * 🎯 PURPOSE:
 * Create a periods table for tracking reenrollment periods (intent, priority, open, registration).
 * This is a manually-managed table that admin updates to control which period is currently active.
 *
 * 📋 CHANGES MADE:
 * 1. Creates 'periods' table with 4 columns: trimester, periodType, isCurrentPeriod, startDate
 * 2. Seeds with 12 period records (3 trimesters × 4 period types)
 * 3. Admin manually manages by setting isCurrentPeriod and filling in startDate
 *
 * 🔧 NEW SIMPLE PATTERN:
 * - runMigration(): Creates MIGRATION_periods sheet with data
 * - applyMigration(): Deletes original periods (if exists), renames MIGRATION_periods to periods (DESTRUCTIVE)
 * - Each run deletes previous working copy and recreates from scratch
 *
 * 🚀 TO USE:
 * 1. Set spreadsheet ID in Config.js: const SPREADSHEET_ID = "your-id";
 * 2. Deploy with clasp push
 * 3. Run migration: runCreatePeriodsTableMigration()
 *    - Check the MIGRATION_periods sheet to verify structure
 * 4. Apply migration: applyCreatePeriodsTableMigration()
 *    - WARNING: This is DESTRUCTIVE and cannot be undone
 * 5. Manually configure: Set isCurrentPeriod=TRUE for active period, fill in startDate values
 */

/**
 * Step 1: Run migration - Creates working copy with new table
 * Safe to run multiple times - deletes previous attempt and recreates
 */
function runCreatePeriodsTableMigration() {
  const migration = new CreatePeriodsTableMigration(getSpreadsheetId());
  migration.run();
}

/**
 * Step 2: Apply migration - Makes changes permanent
 * WARNING: DESTRUCTIVE - Deletes original periods table (if exists) and renames working copy
 */
function applyCreatePeriodsTableMigration() {
  const migration = new CreatePeriodsTableMigration(getSpreadsheetId());
  migration.apply();
}

/**
 * Migration class for creating periods table
 */
class CreatePeriodsTableMigration {
  constructor(spreadsheetId) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.migrationName = 'Migration_REEN002';
    this.workingSheetName = 'MIGRATION_periods';
    this.finalSheetName = 'periods';
  }

  /**
   * Run migration - Create working copy with new table
   */
  run() {
    Logger.log(`🚀 RUNNING MIGRATION: ${this.migrationName}`);
    Logger.log('='.repeat(42 + this.migrationName.length));

    try {
      // Delete previous working copy if exists
      const existingWorking = this.spreadsheet.getSheetByName(this.workingSheetName);
      if (existingWorking) {
        Logger.log(`🗑️  Deleting previous ${this.workingSheetName}`);
        this.spreadsheet.deleteSheet(existingWorking);
      }

      // Create new working sheet
      Logger.log(`\n📊 Creating ${this.workingSheetName}...`);
      const workingSheet = this.spreadsheet.insertSheet(this.workingSheetName);

      // Set up headers
      const headers = ['trimester', 'periodType', 'isCurrentPeriod', 'startDate'];
      const headerRange = workingSheet.getRange(1, 1, 1, headers.length);
      headerRange.setValues([headers]);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#e8eaf6');
      Logger.log(`   ✅ Added headers: ${headers.join(', ')}`);

      // Seed data
      const rowsCreated = this._seedPeriodData(workingSheet);
      Logger.log(`   ✅ Seeded ${rowsCreated} period records`);

      Logger.log('\n🎉 MIGRATION RUN COMPLETED!');
      Logger.log('\n📋 Next steps:');
      Logger.log(`   1. Review the ${this.workingSheetName} sheet to verify structure`);
      Logger.log('   2. Run applyCreatePeriodsTableMigration() to make permanent');
      Logger.log('   ⚠️  WARNING: apply() is DESTRUCTIVE and cannot be undone!');

    } catch (error) {
      Logger.log(`\n❌ MIGRATION RUN FAILED: ${error.message}`);
      throw error;
    }
  }

  /**
   * Apply migration - Make changes permanent
   * DESTRUCTIVE: Deletes original periods table (if exists) and renames working copy
   */
  apply() {
    Logger.log(`⚠️  APPLYING MIGRATION: ${this.migrationName}`);
    Logger.log('='.repeat(42 + this.migrationName.length));
    Logger.log('⚠️  WARNING: This is DESTRUCTIVE and cannot be undone!');

    try {
      // Verify working copy exists
      const workingSheet = this.spreadsheet.getSheetByName(this.workingSheetName);
      if (!workingSheet) {
        throw new Error(`Working copy '${this.workingSheetName}' not found. Run runCreatePeriodsTableMigration() first.`);
      }

      // Delete original if exists
      const originalSheet = this.spreadsheet.getSheetByName(this.finalSheetName);
      if (originalSheet) {
        Logger.log(`🗑️  Deleting original ${this.finalSheetName}`);
        this.spreadsheet.deleteSheet(originalSheet);
      }

      // Rename working copy to final name
      Logger.log(`✏️  Renaming ${this.workingSheetName} → ${this.finalSheetName}`);
      workingSheet.setName(this.finalSheetName);

      Logger.log('\n🎉 MIGRATION APPLIED SUCCESSFULLY!');
      Logger.log(`   ${this.finalSheetName} table created with 12 period records`);
      Logger.log('\n📋 Next steps:');
      Logger.log(`   1. Open the ${this.finalSheetName} sheet`);
      Logger.log('   2. Fill in startDate for each period');
      Logger.log('   3. Set isCurrentPeriod to TRUE for the currently active period');
      Logger.log('   4. Remember: Only ONE period should have isCurrentPeriod = TRUE');

    } catch (error) {
      Logger.log(`\n❌ MIGRATION APPLY FAILED: ${error.message}`);
      Logger.log('   Original table may still exist - check manually');
      throw error;
    }
  }

  /**
   * Seed period data
   * @private
   */
  _seedPeriodData(sheet) {
    // Note: These values match PeriodType constants in src/utils/values/periodType.js
    // Custom order: Fall has openEnrollment and registration only, Winter and Spring have all 4 phases
    const rows = [
      // Fall - only open enrollment and registration
      ['Fall', 'openEnrollment', '', ''],
      ['Fall', 'registration', '', ''],

      // Winter - all 4 phases
      ['Winter', 'intent', '', ''],
      ['Winter', 'priorityEnrollment', '', ''],
      ['Winter', 'openEnrollment', '', ''],
      ['Winter', 'registration', '', ''],

      // Spring - all 4 phases
      ['Spring', 'intent', '', ''],
      ['Spring', 'priorityEnrollment', '', ''],
      ['Spring', 'openEnrollment', '', ''],
      ['Spring', 'registration', '', '']
    ];

    // Insert rows starting at row 2
    const dataRange = sheet.getRange(2, 1, rows.length, 4);
    dataRange.setValues(rows);

    return rows.length;
  }
}
