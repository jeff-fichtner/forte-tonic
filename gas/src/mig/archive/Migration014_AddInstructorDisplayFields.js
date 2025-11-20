/**
 * Migration 014: Add Instructor Display Fields
 *
 * Appends 2 new columns to the end of the instructors sheet:
 * - displayEmail: Public-facing email (if different from personal email)
 * - displayPhone: Public-facing phone (if different from personal phone)
 *
 * Current columns end at: accessCode (position 32)
 * New columns will be at positions 33 and 34
 *
 * Pattern: run/apply
 * - run(): Creates MIGRATION_instructors working copy with changes
 * - apply(): Deletes original, renames working copy (DESTRUCTIVE)
 */

/**
 * Step 1: Run migration - Creates working copy with new columns
 */
function runAddInstructorDisplayFieldsMigration() {
  const migration = new AddInstructorDisplayFieldsMigration(getSpreadsheetId());
  migration.run();
}

/**
 * Step 2: Apply migration - Makes changes permanent
 * WARNING: DESTRUCTIVE - Deletes original instructors sheet
 */
function applyAddInstructorDisplayFieldsMigration() {
  const migration = new AddInstructorDisplayFieldsMigration(getSpreadsheetId());
  migration.apply();
}

class AddInstructorDisplayFieldsMigration {
  constructor(spreadsheetId) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.migrationName = 'Migration_014_AddInstructorDisplayFields';

    this.sheetsToMigrate = [
      { original: 'instructors', working: 'MIGRATION_instructors' }
    ];
  }

  run() {
    Logger.log(`🚀 RUNNING MIGRATION: ${this.migrationName}`);
    Logger.log('='.repeat(42 + this.migrationName.length));

    try {
      // Delete previous working copy if exists
      const existingWorking = this.spreadsheet.getSheetByName('MIGRATION_instructors');
      if (existingWorking) {
        Logger.log('🗑️  Deleting previous MIGRATION_instructors');
        this.spreadsheet.deleteSheet(existingWorking);
      }

      // Get original instructors sheet
      const originalSheet = this.spreadsheet.getSheetByName('instructors');
      if (!originalSheet) {
        throw new Error('instructors sheet not found');
      }

      // Create full copy
      Logger.log('📋 Creating full copy: MIGRATION_instructors');
      const workingCopy = originalSheet.copyTo(this.spreadsheet);
      workingCopy.setName('MIGRATION_instructors');

      // Apply changes
      this._addColumns(workingCopy);

      Logger.log('\n🎉 MIGRATION RUN COMPLETED!');
      Logger.log('\n📋 Next steps:');
      Logger.log('   1. Review MIGRATION_instructors sheet to verify columns were added');
      Logger.log('   2. Run applyAddInstructorDisplayFieldsMigration() to make permanent');
      Logger.log('   ⚠️  WARNING: apply() is DESTRUCTIVE and cannot be undone!');

    } catch (error) {
      Logger.log(`\n❌ MIGRATION RUN FAILED: ${error.message}`);
      Logger.log(error.stack);
      throw error;
    }
  }

  apply() {
    Logger.log(`⚠️  APPLYING MIGRATION: ${this.migrationName}`);
    Logger.log('='.repeat(42 + this.migrationName.length));
    Logger.log('⚠️  WARNING: This is DESTRUCTIVE and cannot be undone!');

    try {
      // Verify working copy exists
      const workingSheet = this.spreadsheet.getSheetByName('MIGRATION_instructors');
      if (!workingSheet) {
        throw new Error('MIGRATION_instructors not found. Run runAddInstructorDisplayFieldsMigration() first.');
      }

      // Verify columns were added
      const headers = workingSheet.getRange(1, 1, 1, workingSheet.getLastColumn()).getValues()[0];
      const requiredColumns = ['displayEmail', 'displayPhone'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));

      if (missingColumns.length > 0) {
        throw new Error(`Working copy is missing required columns: ${missingColumns.join(', ')}. Run run() again.`);
      }

      // Delete original
      const originalSheet = this.spreadsheet.getSheetByName('instructors');
      if (originalSheet) {
        Logger.log('🗑️  Deleting original instructors');
        this.spreadsheet.deleteSheet(originalSheet);
      }

      // Rename working copy
      Logger.log('✏️  Renaming MIGRATION_instructors → instructors');
      workingSheet.setName('instructors');

      Logger.log('\n🎉 MIGRATION APPLIED SUCCESSFULLY!');
      Logger.log('✅ instructors sheet now has 2 new columns: displayEmail, displayPhone');

    } catch (error) {
      Logger.log(`\n❌ MIGRATION APPLY FAILED: ${error.message}`);
      Logger.log('⚠️  Original instructors sheet may have been deleted. Check manually.');
      Logger.log(error.stack);
      throw error;
    }
  }

  _addColumns(sheet) {
    Logger.log('\n📊 Adding columns to working copy...');

    // Get current headers
    const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
    const headers = headerRange.getValues()[0];

    Logger.log(`   Current columns: ${headers.join(', ')}`);

    // Check if columns already exist
    const columnsToAdd = ['displayEmail', 'displayPhone'];
    const existingColumns = columnsToAdd.filter(col => headers.includes(col));

    if (existingColumns.length > 0) {
      Logger.log(`   ⚠️  Columns already exist: ${existingColumns.join(', ')}`);
      Logger.log('   Skipping column addition');
      return;
    }

    // Append 2 new columns at the end
    Logger.log('   Appending 2 new columns at end...');
    const lastCol = sheet.getLastColumn();
    const lastRow = sheet.getLastRow();

    // Add column headers
    sheet.getRange(1, lastCol + 1).setValue('displayEmail');
    sheet.getRange(1, lastCol + 2).setValue('displayPhone');

    // Populate displayEmail with email values, leave displayPhone blank
    if (lastRow > 1) {
      Logger.log(`   Populating displayEmail for ${lastRow - 1} instructors...`);

      // Email column is at position 2
      const emailColumn = 2;
      const emailValues = sheet.getRange(2, emailColumn, lastRow - 1, 1).getValues();

      // Set displayEmail = email for all rows
      sheet.getRange(2, lastCol + 1, lastRow - 1, 1).setValues(emailValues);

      // displayPhone stays blank (already blank by default)
      Logger.log('   ✅ Populated displayEmail with email values');
      Logger.log('   ✅ Left displayPhone blank');
    }

    Logger.log('   ✅ Added 2 columns: displayEmail, displayPhone');

    // Verify final column order
    const finalHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    Logger.log(`   Final columns: ${finalHeaders.join(', ')}`);
  }
}
