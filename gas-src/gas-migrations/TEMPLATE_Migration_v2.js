/**
 * Google Apps Script Migration Template v2 - Simplified Pattern
 *
 * NEW SIMPLE PATTERN (v2):
 * - run(): Creates MIGRATION_* working copies with changes
 * - apply(): Deletes originals, renames working copies (DESTRUCTIVE)
 * - No rollback, no backups - keep it simple
 * - Each run deletes previous working copy and recreates from scratch
 *
 * Copy this template to create new migrations.
 * Replace [XXX] with migration number and [Description] with meaningful name.
 *
 * To use:
 * 1. Copy this file and rename to Migration_XXX_Description.js
 * 2. Set your spreadsheet ID in Config.js
 * 3. Update function names and class name
 * 4. Define sheetsToMigrate or working/final sheet names
 * 5. Implement migration logic in helper methods
 */

/**
 * Step 1: Run migration - Creates working copies with changes
 * Safe to run multiple times - deletes previous attempt and recreates
 */
function runYourMigrationNameMigration() {
  const migration = new YourMigrationNameMigration(getSpreadsheetIdV2());
  migration.run();
}

/**
 * Step 2: Apply migration - Makes changes permanent
 * WARNING: DESTRUCTIVE - Deletes original tables and renames working copies
 */
function applyYourMigrationNameMigration() {
  const migration = new YourMigrationNameMigration(getSpreadsheetIdV2());
  migration.apply();
}

/**
 * Migration class
 */
class YourMigrationNameMigration {
  constructor(spreadsheetId) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.migrationName = 'Migration_XXX';

    // OPTION 1: For modifying existing tables
    // Define multiple sheets to migrate
    this.sheetsToMigrate = [
      { original: 'table1', working: 'MIGRATION_table1' },
      { original: 'table2', working: 'MIGRATION_table2' }
    ];

    // OPTION 2: For creating a new table
    // this.workingSheetName = 'MIGRATION_newtable';
    // this.finalSheetName = 'newtable';
  }

  /**
   * Run migration - Create working copies with changes
   */
  run() {
    Logger.log(`🚀 RUNNING MIGRATION: ${this.migrationName}`);
    Logger.log('='.repeat(42 + this.migrationName.length));

    try {
      // OPTION 1: Modify existing tables
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
        this.#applyChangesToSheet(workingCopy, original);
        Logger.log(`   ✅ Applied changes to ${working}`);
      });

      // OPTION 2: Create new table (uncomment if using)
      /*
      // Delete previous working copy if exists
      const existingWorking = this.spreadsheet.getSheetByName(this.workingSheetName);
      if (existingWorking) {
        Logger.log(`🗑️  Deleting previous ${this.workingSheetName}`);
        this.spreadsheet.deleteSheet(existingWorking);
      }

      // Create new sheet
      Logger.log(`\n📊 Creating ${this.workingSheetName}...`);
      const workingSheet = this.spreadsheet.insertSheet(this.workingSheetName);

      // Set up your new table
      this.#createNewTable(workingSheet);
      Logger.log(`   ✅ Created ${this.workingSheetName}`);
      */

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
      // OPTION 1: For multiple sheets
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

      // OPTION 2: For single new table (uncomment if using)
      /*
      // Verify working copy exists
      const workingSheet = this.spreadsheet.getSheetByName(this.workingSheetName);
      if (!workingSheet) {
        throw new Error(`Working copy '${this.workingSheetName}' not found. Run run${this.migrationName}() first.`);
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
      */

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
  #applyChangesToSheet(sheet, sheetName) {
    // Example: Add a column
    // const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    // const newColumnName = 'newColumn';
    //
    // if (!headers.includes(newColumnName)) {
    //   sheet.insertColumnAfter(sheet.getLastColumn());
    //   const newColIndex = sheet.getLastColumn();
    //   sheet.getRange(1, newColIndex).setValue(newColumnName);
    // }

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

  /**
   * Create a new table structure
   * REPLACE THIS with your actual table creation logic
   */
  #createNewTable(sheet) {
    // Example: Create headers
    // const headers = ['column1', 'column2', 'column3'];
    // const headerRange = sheet.getRange(1, 1, 1, headers.length);
    // headerRange.setValues([headers]);
    // headerRange.setFontWeight('bold');
    // headerRange.setBackground('#e8eaf6');

    // Example: Seed data
    // const rows = [
    //   ['value1', 'value2', 'value3'],
    //   ['value4', 'value5', 'value6']
    // ];
    // const dataRange = sheet.getRange(2, 1, rows.length, rows[0].length);
    // dataRange.setValues(rows);
  }
}
