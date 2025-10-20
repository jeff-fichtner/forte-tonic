/**
 * Google Apps Script Migration REEN001: Add Intent Columns to Registrations
 *
 * 🎯 PURPOSE:
 * Add reenrollment intent tracking columns to registrations and registrations_audit tables.
 * This enables parents to indicate their intent (keep/drop/change) for lesson continuation.
 *
 * 📋 CHANGES MADE:
 * 1. Registrations Table: Add 3 columns (reenrollmentIntent, intentSubmittedAt, intentSubmittedBy)
 * 2. Registrations_Audit Table: Add 5 columns (above 3 + updatedAt, updatedBy)
 *
 * 🔧 NEW SIMPLE PATTERN:
 * - runMigration(): Creates working copy with changes (MIGRATION_registrations, MIGRATION_registrations_audit)
 * - applyMigration(): Deletes original tables, renames working copies to original names (DESTRUCTIVE)
 * - Each run deletes previous working copy and recreates from scratch
 *
 * 🚀 TO USE:
 * 1. Set spreadsheet ID in Config_v2.js: const SPREADSHEET_ID = "your-id";
 * 2. Deploy with clasp push
 * 3. Run migration: runAddIntentColumnsMigration()
 *    - Check the MIGRATION_* sheets to verify changes look correct
 * 4. Apply migration: applyAddIntentColumnsMigration()
 *    - WARNING: This is DESTRUCTIVE and cannot be undone
 */

/**
 * Step 1: Run migration - Creates working copies with changes
 * Safe to run multiple times - deletes previous attempt and recreates
 */
function runAddIntentColumnsMigration() {
  const migration = new AddIntentColumnsMigration(getSpreadsheetIdV2());
  migration.run();
}

/**
 * Step 2: Apply migration - Makes changes permanent
 * WARNING: DESTRUCTIVE - Deletes original tables and renames working copies
 */
function applyAddIntentColumnsMigration() {
  const migration = new AddIntentColumnsMigration(getSpreadsheetIdV2());
  migration.apply();
}

/**
 * Migration class for adding intent columns
 */
class AddIntentColumnsMigration {
  constructor(spreadsheetId) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.migrationName = 'Migration_REEN001';
    this.sheetsToMigrate = [
      { original: 'registrations', working: 'MIGRATION_registrations' },
      { original: 'registrations_audit', working: 'MIGRATION_registrations_audit' }
    ];
  }

  /**
   * Run migration - Create working copies with changes
   */
  run() {
    Logger.log(`🚀 RUNNING MIGRATION: ${this.migrationName}`);
    Logger.log('='.repeat(42 + this.migrationName.length));

    try {
      // Process each sheet
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

        // Add new columns
        if (original === 'registrations') {
          this.#addColumnsToRegistrations(workingCopy);
          Logger.log(`   ✅ Added 3 columns to ${working}`);
        } else if (original === 'registrations_audit') {
          this.#addColumnsToAudit(workingCopy);
          Logger.log(`   ✅ Added 5 columns to ${working}`);
        }
      });

      Logger.log('\n🎉 MIGRATION RUN COMPLETED!');
      Logger.log('\n📋 Next steps:');
      Logger.log('   1. Review the MIGRATION_* sheets to verify changes');
      Logger.log('   2. Run applyAddIntentColumnsMigration() to make permanent');
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
      // Verify working copies exist
      const missingSheets = [];
      this.sheetsToMigrate.forEach(({ working }) => {
        if (!this.spreadsheet.getSheetByName(working)) {
          missingSheets.push(working);
        }
      });

      if (missingSheets.length > 0) {
        throw new Error(`Working copies not found: ${missingSheets.join(', ')}. Run runAddIntentColumnsMigration() first.`);
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
   * Add columns to registrations working copy
   */
  #addColumnsToRegistrations(sheet) {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const columnsToAdd = ['reenrollmentIntent', 'intentSubmittedAt', 'intentSubmittedBy'];

    columnsToAdd.forEach(columnName => {
      if (!headers.includes(columnName)) {
        sheet.insertColumnAfter(sheet.getLastColumn());
        const newColIndex = sheet.getLastColumn();
        sheet.getRange(1, newColIndex).setValue(columnName);
      }
    });
  }

  /**
   * Add columns to audit working copy
   */
  #addColumnsToAudit(sheet) {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const columnsToAdd = ['reenrollmentIntent', 'intentSubmittedAt', 'intentSubmittedBy', 'updatedAt', 'updatedBy'];

    columnsToAdd.forEach(columnName => {
      if (!headers.includes(columnName)) {
        sheet.insertColumnAfter(sheet.getLastColumn());
        const newColIndex = sheet.getLastColumn();
        sheet.getRange(1, newColIndex).setValue(columnName);
      }
    });
  }
}
