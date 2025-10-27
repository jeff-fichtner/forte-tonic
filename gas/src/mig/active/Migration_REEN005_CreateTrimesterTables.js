/**
 * Google Apps Script Migration REEN005: Create Trimester-Specific Registration Tables
 *
 * 🎯 PURPOSE:
 * Migrate from single registrations table to trimester-specific tables.
 * Current registrations become registrations_fall, then create winter and spring tables.
 *
 * 📋 CHANGES MADE:
 * 1. Renames 'registrations' to 'registrations_fall'
 * 2. Renames 'registrations_audit' to 'registrations_fall_audit'
 * 3. Creates 'registrations_winter' with same schema (empty)
 * 4. Creates 'registrations_winter_audit' with same schema (empty)
 * 5. Creates 'registrations_spring' with same schema (empty)
 * 6. Creates 'registrations_spring_audit' with same schema (empty)
 *
 * 🔧 WORKING COPY PATTERN:
 * - runMigration(): Creates MIGRATION_* working copies
 * - applyMigration(): Renames to final names (DESTRUCTIVE)
 *
 * 🚀 TO USE:
 * 1. Set spreadsheet ID in Config.js: const SPREADSHEET_ID = "your-id";
 * 2. Deploy with clasp push
 * 3. Run migration: runCreateTrimesterTablesMigration()
 *    - Check the MIGRATION_* sheets to verify structure
 * 4. Apply migration: applyCreateTrimesterTablesMigration()
 *    - WARNING: This is DESTRUCTIVE and cannot be undone
 *
 * ⚠️  IMPORTANT: Current registrations data will be in registrations_fall after apply
 */

/**
 * Step 1: Run migration - Creates working copies
 * Safe to run multiple times - deletes previous attempt and recreates
 */
function runCreateTrimesterTablesMigration() {
  const migration = new CreateTrimesterTablesMigration(getSpreadsheetId());
  migration.run();
}

/**
 * Step 2: Apply migration - Makes changes permanent
 * WARNING: DESTRUCTIVE - Renames tables to final names
 */
function applyCreateTrimesterTablesMigration() {
  const migration = new CreateTrimesterTablesMigration(getSpreadsheetId());
  migration.apply();
}

/**
 * Migration class for creating trimester tables
 */
class CreateTrimesterTablesMigration {
  constructor(spreadsheetId) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.migrationName = 'Migration_REEN005';
  }

  /**
   * Run migration - Create working copies
   */
  run() {
    Logger.log(`🚀 RUNNING MIGRATION: ${this.migrationName}`);
    Logger.log('='.repeat(42 + this.migrationName.length));

    try {
      // Get original sheets
      const registrationsSheet = this.spreadsheet.getSheetByName('registrations');
      const auditSheet = this.spreadsheet.getSheetByName('registrations_audit');

      if (!registrationsSheet) {
        throw new Error('Original registrations sheet not found');
      }
      if (!auditSheet) {
        throw new Error('Original registrations_audit sheet not found');
      }

      // Get schema from registrations and audit
      const registrationHeaders = registrationsSheet.getRange(1, 1, 1, registrationsSheet.getLastColumn()).getValues()[0];
      const auditHeaders = auditSheet.getRange(1, 1, 1, auditSheet.getLastColumn()).getValues()[0];
      Logger.log(`📋 Registration schema has ${registrationHeaders.length} columns`);
      Logger.log(`📋 Audit schema has ${auditHeaders.length} columns`);

      // Delete any previous working copies
      this._deleteWorkingCopies();

      // Create working copies for Fall (from existing data)
      Logger.log('\n📊 Creating Fall trimester working copies...');
      const fallReg = registrationsSheet.copyTo(this.spreadsheet);
      fallReg.setName('MIGRATION_registrations_fall');
      Logger.log('   ✅ Created MIGRATION_registrations_fall');

      const fallAudit = auditSheet.copyTo(this.spreadsheet);
      fallAudit.setName('MIGRATION_registrations_fall_audit');
      Logger.log('   ✅ Created MIGRATION_registrations_fall_audit');

      // Create empty working copies for Winter
      Logger.log('\n📊 Creating Winter trimester working copies...');
      this._createEmptyTrimesterTable('MIGRATION_registrations_winter', registrationHeaders);
      this._createEmptyTrimesterTable('MIGRATION_registrations_winter_audit', auditHeaders);

      // Create empty working copies for Spring
      Logger.log('\n📊 Creating Spring trimester working copies...');
      this._createEmptyTrimesterTable('MIGRATION_registrations_spring', registrationHeaders);
      this._createEmptyTrimesterTable('MIGRATION_registrations_spring_audit', auditHeaders);

      Logger.log('\n🎉 MIGRATION RUN COMPLETED!');
      Logger.log('\n📋 Next steps:');
      Logger.log('   1. Review the MIGRATION_* sheets to verify structure');
      Logger.log('   2. MIGRATION_registrations_fall should have all current data');
      Logger.log('   3. MIGRATION_registrations_winter/spring should be empty (headers only)');
      Logger.log('   4. Run applyCreateTrimesterTablesMigration() to make permanent');
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
      const requiredSheets = [
        'MIGRATION_registrations_fall',
        'MIGRATION_registrations_fall_audit',
        'MIGRATION_registrations_winter',
        'MIGRATION_registrations_winter_audit',
        'MIGRATION_registrations_spring',
        'MIGRATION_registrations_spring_audit'
      ];

      const missingSheets = requiredSheets.filter(name =>
        !this.spreadsheet.getSheetByName(name)
      );

      if (missingSheets.length > 0) {
        throw new Error(`Working copies not found: ${missingSheets.join(', ')}. Run runCreateTrimesterTablesMigration() first.`);
      }

      // Delete original registrations and audit
      Logger.log('\n📊 Deleting original tables...');
      const origReg = this.spreadsheet.getSheetByName('registrations');
      const origAudit = this.spreadsheet.getSheetByName('registrations_audit');

      if (origReg) {
        Logger.log('   🗑️  Deleting registrations');
        this.spreadsheet.deleteSheet(origReg);
      }
      if (origAudit) {
        Logger.log('   🗑️  Deleting registrations_audit');
        this.spreadsheet.deleteSheet(origAudit);
      }

      // Rename working copies to final names
      Logger.log('\n📊 Renaming working copies to final names...');

      const mappings = [
        { working: 'MIGRATION_registrations_fall', final: 'registrations_fall' },
        { working: 'MIGRATION_registrations_fall_audit', final: 'registrations_fall_audit' },
        { working: 'MIGRATION_registrations_winter', final: 'registrations_winter' },
        { working: 'MIGRATION_registrations_winter_audit', final: 'registrations_winter_audit' },
        { working: 'MIGRATION_registrations_spring', final: 'registrations_spring' },
        { working: 'MIGRATION_registrations_spring_audit', final: 'registrations_spring_audit' }
      ];

      mappings.forEach(({ working, final }) => {
        const sheet = this.spreadsheet.getSheetByName(working);
        Logger.log(`   ✏️  Renaming ${working} → ${final}`);
        sheet.setName(final);
      });

      Logger.log('\n🎉 MIGRATION APPLIED SUCCESSFULLY!');
      Logger.log('   Created 6 trimester-specific tables:');
      Logger.log('   - registrations_fall (contains all existing data)');
      Logger.log('   - registrations_fall_audit');
      Logger.log('   - registrations_winter (empty, ready for reenrollment)');
      Logger.log('   - registrations_winter_audit');
      Logger.log('   - registrations_spring (empty, ready for reenrollment)');
      Logger.log('   - registrations_spring_audit');

    } catch (error) {
      Logger.log(`\n❌ MIGRATION APPLY FAILED: ${error.message}`);
      Logger.log('   Original tables may still exist - check manually');
      throw error;
    }
  }

  /**
   * Delete all working copies from previous run
   * @private
   */
  _deleteWorkingCopies() {
    const workingCopyNames = [
      'MIGRATION_registrations_fall',
      'MIGRATION_registrations_fall_audit',
      'MIGRATION_registrations_winter',
      'MIGRATION_registrations_winter_audit',
      'MIGRATION_registrations_spring',
      'MIGRATION_registrations_spring_audit'
    ];

    workingCopyNames.forEach(name => {
      const sheet = this.spreadsheet.getSheetByName(name);
      if (sheet) {
        Logger.log(`   🗑️  Deleting previous ${name}`);
        this.spreadsheet.deleteSheet(sheet);
      }
    });
  }

  /**
   * Create an empty table with headers only
   * @private
   */
  _createEmptyTrimesterTable(sheetName, headers) {
    const sheet = this.spreadsheet.insertSheet(sheetName);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#e8eaf6');
    Logger.log(`   ✅ Created ${sheetName} (empty)`);
  }
}
