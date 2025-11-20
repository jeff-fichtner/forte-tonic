/**
 * Migration 011: Add Admin Role and Display Fields
 *
 * Appends 4 new columns to the end of the admins sheet:
 * - role: Job title/role (e.g., "Forte Director", "Forte Associate Manager")
 * - displayEmail: Public-facing email (if different from personal email)
 * - displayPhone: Public-facing phone (if different from personal phone)
 * - isDirector: Boolean flag to identify the director
 *
 * Current column order: id, email, lastName, firstName, phone, accessCode
 * Resulting column order: id, email, lastName, firstName, phone, accessCode,
 *                         role, displayEmail, displayPhone, isDirector
 *
 * Pattern: run/apply
 * - run(): Creates MIGRATION_admins working copy with changes
 * - apply(): Deletes original, renames working copy (DESTRUCTIVE)
 */

/**
 * Step 1: Run migration - Creates working copy with new columns
 */
function runAddAdminRoleAndDisplayFieldsMigration() {
  const migration = new AddAdminRoleAndDisplayFieldsMigration(getSpreadsheetId());
  migration.run();
}

/**
 * Step 2: Apply migration - Makes changes permanent
 * WARNING: DESTRUCTIVE - Deletes original admins sheet
 */
function applyAddAdminRoleAndDisplayFieldsMigration() {
  const migration = new AddAdminRoleAndDisplayFieldsMigration(getSpreadsheetId());
  migration.apply();
}

class AddAdminRoleAndDisplayFieldsMigration {
  constructor(spreadsheetId) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.migrationName = 'Migration_011_AddAdminRoleAndDisplayFields';

    this.sheetsToMigrate = [
      { original: 'admins', working: 'MIGRATION_admins' }
    ];
  }

  run() {
    Logger.log(`🚀 RUNNING MIGRATION: ${this.migrationName}`);
    Logger.log('='.repeat(42 + this.migrationName.length));

    try {
      // Delete previous working copy if exists
      const existingWorking = this.spreadsheet.getSheetByName('MIGRATION_admins');
      if (existingWorking) {
        Logger.log('🗑️  Deleting previous MIGRATION_admins');
        this.spreadsheet.deleteSheet(existingWorking);
      }

      // Get original admins sheet
      const originalSheet = this.spreadsheet.getSheetByName('admins');
      if (!originalSheet) {
        throw new Error('admins sheet not found');
      }

      // Create full copy
      Logger.log('📋 Creating full copy: MIGRATION_admins');
      const workingCopy = originalSheet.copyTo(this.spreadsheet);
      workingCopy.setName('MIGRATION_admins');

      // Apply changes
      this._addColumns(workingCopy);

      Logger.log('\n🎉 MIGRATION RUN COMPLETED!');
      Logger.log('\n📋 Next steps:');
      Logger.log('   1. Review MIGRATION_admins sheet to verify columns were added');
      Logger.log('   2. Run applyAddAdminRoleAndDisplayFieldsMigration() to make permanent');
      Logger.log('   ⚠️  WARNING: apply() is DESTRUCTIVE and cannot be undone!');
      Logger.log('\n📝 After applying:');
      Logger.log('   Admin must manually populate the new columns:');
      Logger.log('   - Director: role="Forte Director", displayPhone="(415) 945-5121", isDirector=TRUE');
      Logger.log('   - Other admins: role="Forte Associate Manager", displayEmail="forte@mcds.org", displayPhone="(415) 945-5122", isDirector=FALSE');

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
      const workingSheet = this.spreadsheet.getSheetByName('MIGRATION_admins');
      if (!workingSheet) {
        throw new Error('MIGRATION_admins not found. Run runAddAdminRoleAndDisplayFieldsMigration() first.');
      }

      // Verify columns were added
      const headers = workingSheet.getRange(1, 1, 1, workingSheet.getLastColumn()).getValues()[0];
      const requiredColumns = ['role', 'displayEmail', 'displayPhone', 'isDirector'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));

      if (missingColumns.length > 0) {
        throw new Error(`Working copy is missing required columns: ${missingColumns.join(', ')}. Run run() again.`);
      }

      // Delete original
      const originalSheet = this.spreadsheet.getSheetByName('admins');
      if (originalSheet) {
        Logger.log('🗑️  Deleting original admins');
        this.spreadsheet.deleteSheet(originalSheet);
      }

      // Rename working copy
      Logger.log('✏️  Renaming MIGRATION_admins → admins');
      workingSheet.setName('admins');

      Logger.log('\n🎉 MIGRATION APPLIED SUCCESSFULLY!');
      Logger.log('✅ admins sheet now has 4 new columns: role, displayEmail, displayPhone, isDirector');
      Logger.log('\n⚠️  IMPORTANT: Admin must now manually populate the new columns:');
      Logger.log('   1. Open the admins sheet');
      Logger.log('   2. For director (ndemosslevy@mcds.org):');
      Logger.log('      - role: "Forte Director"');
      Logger.log('      - displayEmail: (leave empty)');
      Logger.log('      - displayPhone: "(415) 945-5121"');
      Logger.log('      - isDirector: TRUE');
      Logger.log('   3. For other admins:');
      Logger.log('      - role: "Forte Associate Manager"');
      Logger.log('      - displayEmail: "forte@mcds.org"');
      Logger.log('      - displayPhone: "(415) 945-5122"');
      Logger.log('      - isDirector: FALSE');

    } catch (error) {
      Logger.log(`\n❌ MIGRATION APPLY FAILED: ${error.message}`);
      Logger.log('⚠️  Original admins sheet may have been deleted. Check manually.');
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
    const columnsToAdd = ['role', 'displayEmail', 'displayPhone', 'isDirector'];
    const existingColumns = columnsToAdd.filter(col => headers.includes(col));

    if (existingColumns.length > 0) {
      Logger.log(`   ⚠️  Columns already exist: ${existingColumns.join(', ')}`);
      Logger.log('   Skipping column addition');
      return;
    }

    // Append 4 new columns at the end
    Logger.log('   Appending 4 new columns at end...');
    const lastCol = sheet.getLastColumn();

    sheet.getRange(1, lastCol + 1).setValue('role');
    sheet.getRange(1, lastCol + 2).setValue('displayEmail');
    sheet.getRange(1, lastCol + 3).setValue('displayPhone');
    sheet.getRange(1, lastCol + 4).setValue('isDirector');

    Logger.log('   ✅ Added 4 columns: role, displayEmail, displayPhone, isDirector');

    // Verify final column order
    const finalHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    Logger.log(`   Final columns: ${finalHeaders.join(', ')}`);
  }
}
