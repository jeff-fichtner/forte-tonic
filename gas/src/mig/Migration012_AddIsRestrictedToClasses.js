/**
 * Migration 012: Add isRestricted Column to Classes
 *
 * Adds 1 new column to Classes sheet:
 * - isRestricted: Boolean flag to indicate classes restricted from parent registration
 *
 * This replaces the hardcoded RESTRICTED_CLASS_IDS array in classManager.js
 * Currently hardcoded as ['G001', 'G012', 'G014']
 *
 * Pattern: run/apply
 * - run(): Creates MIGRATION_Classes working copy with changes
 * - apply(): Deletes original, renames working copy (DESTRUCTIVE)
 */

/**
 * Step 1: Run migration - Creates working copy with new column
 */
function runAddIsRestrictedToClassesMigration() {
  const migration = new AddIsRestrictedToClassesMigration(getSpreadsheetId());
  migration.run();
}

/**
 * Step 2: Apply migration - Makes changes permanent
 * WARNING: DESTRUCTIVE - Deletes original Classes sheet
 */
function applyAddIsRestrictedToClassesMigration() {
  const migration = new AddIsRestrictedToClassesMigration(getSpreadsheetId());
  migration.apply();
}

class AddIsRestrictedToClassesMigration {
  constructor(spreadsheetId) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.migrationName = 'Migration_012_AddIsRestrictedToClasses';

    this.sheetsToMigrate = [
      { original: 'Classes', working: 'MIGRATION_Classes' }
    ];
  }

  run() {
    Logger.log(`🚀 RUNNING MIGRATION: ${this.migrationName}`);
    Logger.log('='.repeat(42 + this.migrationName.length));

    try {
      // Delete previous working copy if exists
      const existingWorking = this.spreadsheet.getSheetByName('MIGRATION_Classes');
      if (existingWorking) {
        Logger.log('🗑️  Deleting previous MIGRATION_Classes');
        this.spreadsheet.deleteSheet(existingWorking);
      }

      // Get original Classes sheet
      const originalSheet = this.spreadsheet.getSheetByName('Classes');
      if (!originalSheet) {
        throw new Error('Classes sheet not found');
      }

      // Create full copy
      Logger.log('📋 Creating full copy: MIGRATION_Classes');
      const workingCopy = originalSheet.copyTo(this.spreadsheet);
      workingCopy.setName('MIGRATION_Classes');

      // Apply changes
      this._addIsRestrictedColumn(workingCopy);

      Logger.log('\n🎉 MIGRATION RUN COMPLETED!');
      Logger.log('\n📋 Next steps:');
      Logger.log('   1. Review MIGRATION_Classes sheet to verify column was added');
      Logger.log('   2. Run applyAddIsRestrictedToClassesMigration() to make permanent');
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
      const workingSheet = this.spreadsheet.getSheetByName('MIGRATION_Classes');
      if (!workingSheet) {
        throw new Error('MIGRATION_Classes not found. Run runAddIsRestrictedToClassesMigration() first.');
      }

      // Verify column was added
      const headers = workingSheet.getRange(1, 1, 1, workingSheet.getLastColumn()).getValues()[0];
      if (!headers.includes('isRestricted')) {
        throw new Error('Working copy is missing isRestricted column. Run run() again.');
      }

      Logger.log('   ✅ Verified isRestricted column exists');

      // Delete original
      const originalSheet = this.spreadsheet.getSheetByName('Classes');
      if (originalSheet) {
        Logger.log('🗑️  Deleting original Classes');
        this.spreadsheet.deleteSheet(originalSheet);
      }

      // Rename working copy
      Logger.log('✏️  Renaming MIGRATION_Classes → Classes');
      workingSheet.setName('Classes');

      Logger.log('\n🎉 MIGRATION APPLIED SUCCESSFULLY!');
      Logger.log('✅ Classes sheet now has isRestricted column');

    } catch (error) {
      Logger.log(`\n❌ MIGRATION APPLY FAILED: ${error.message}`);
      Logger.log('⚠️  Original Classes sheet may have been deleted. Check manually.');
      Logger.log(error.stack);
      throw error;
    }
  }

  _addIsRestrictedColumn(sheet) {
    Logger.log('\n📊 Adding isRestricted column to working copy...');

    // Get current headers
    const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
    const headers = headerRange.getValues()[0];

    Logger.log(`   Current columns: ${headers.join(', ')}`);

    // Check if isRestricted already exists
    if (headers.includes('isRestricted')) {
      Logger.log('   ⚠️  isRestricted column already exists, skipping...');
      return;
    }

    // Add new column at the end
    Logger.log('   Inserting isRestricted column at end...');
    sheet.insertColumnAfter(sheet.getLastColumn());
    const newColIndex = sheet.getLastColumn();

    // Set header
    sheet.getRange(1, newColIndex).setValue('isRestricted');

    Logger.log('   ✅ Added isRestricted column');

    // Verify final column order
    const finalHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    Logger.log(`   Final columns: ${finalHeaders.join(', ')}`);
  }
}
