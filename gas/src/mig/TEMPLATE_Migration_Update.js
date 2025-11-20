/**
 * Google Apps Script Migration Template - UPDATE PATTERN
 *
 * Use this pattern when MODIFYING existing table(s):
 * - Adding columns
 * - Removing columns
 * - Changing column order
 * - Updating data values
 *
 * PATTERN: Two-step (run/apply)
 * - run(): Creates MIGRATION_* working copies with changes
 * - apply(): Deletes originals, renames working copies (DESTRUCTIVE)
 *
 * Copy this template to create new migrations.
 * Replace [XXX] with migration number and [Description] with meaningful name.
 */

/**
 * Step 1: Run migration - Creates working copies with changes
 * Safe to run multiple times - deletes previous attempt and recreates
 */
function runYourUpdateMigrationNameMigration() {
  const migration = new YourUpdateMigrationNameMigration(getSpreadsheetId());
  migration.run();
}

/**
 * Step 2: Apply migration - Makes changes permanent
 * WARNING: DESTRUCTIVE - Deletes original tables and renames working copies
 */
function applyYourUpdateMigrationNameMigration() {
  const migration = new YourUpdateMigrationNameMigration(getSpreadsheetId());
  migration.apply();
}

/**
 * Migration class - UPDATE pattern
 */
class YourUpdateMigrationNameMigration {
  constructor(spreadsheetId) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.migrationName = 'Migration_XXX';

    // Define sheets to migrate (can update multiple tables in one migration)
    this.sheetsToMigrate = [
      { original: 'table1', working: 'MIGRATION_table1' },
      { original: 'table2', working: 'MIGRATION_table2' }
    ];
  }

  /**
   * Run migration - Create working copies with changes
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
          throw new Error(`Original sheet '${original}' not found`);
        }

        // Create full copy
        Logger.log(`   📋 Creating full copy: ${working}`);
        const workingCopy = originalSheet.copyTo(this.spreadsheet);
        workingCopy.setName(working);

        // Apply your changes to workingCopy
        this._applyChangesToSheet(workingCopy, original);
        Logger.log(`   ✅ Applied changes to ${working}`);
      });

      Logger.log('\n🎉 MIGRATION RUN COMPLETED!');
      Logger.log('\n📋 Next steps:');
      Logger.log('   1. Review the MIGRATION_* sheets to verify changes');
      Logger.log(`   2. Run apply${this.migrationName}() to make permanent`);
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
        throw new Error(`Working copies not found: ${missingSheets.join(', ')}. Run run${this.migrationName}() first.`);
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
      Logger.log('   Original tables replaced with migrated versions');
      Logger.log('   Changes are now permanent');

    } catch (error) {
      Logger.log(`\n❌ MIGRATION APPLY FAILED: ${error.message}`);
      Logger.log('   Original tables may still exist - check manually');
      throw error;
    }
  }

  /**
   * Apply changes to a working sheet copy
   * REPLACE THIS with your actual migration logic
   */
  _applyChangesToSheet(sheet, sheetName) {
    // Example: Add a column
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newColumnName = 'newColumn';

    if (!headers.includes(newColumnName)) {
      sheet.insertColumnAfter(sheet.getLastColumn());
      const newColIndex = sheet.getLastColumn();
      sheet.getRange(1, newColIndex).setValue(newColumnName);
      Logger.log(`   ➕ Added column: ${newColumnName}`);
    }

    // Example: Remove a column
    const columnToRemove = 'oldColumn';
    const removeIndex = headers.indexOf(columnToRemove) + 1; // +1 because Sheets is 1-indexed
    if (removeIndex > 0) {
      sheet.deleteColumn(removeIndex);
      Logger.log(`   ➖ Removed column: ${columnToRemove}`);
    }

    // Add your migration logic here based on sheetName
    switch (sheetName) {
      case 'table1':
        // Do something specific to table1
        break;
      case 'table2':
        // Do something specific to table2
        break;
    }
  }
}
