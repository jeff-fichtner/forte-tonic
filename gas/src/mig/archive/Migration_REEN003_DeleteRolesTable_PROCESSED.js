/**
 * Google Apps Script Migration REEN003: Delete Roles Table
 *
 * 🎯 PURPOSE:
 * Delete the unused 'roles' table from the spreadsheet.
 * The roles concept has been removed from the application - only admin, instructor, and parent
 * user types exist, determined by which sheet a user's record appears in.
 *
 * 📋 CHANGES MADE:
 * 1. Delete 'roles' sheet if it exists
 *
 * ⚠️  WARNING:
 * This is a DESTRUCTIVE operation that cannot be undone.
 * Make sure you have a backup of your spreadsheet before running.
 *
 * 🚀 TO USE:
 * 1. Set spreadsheet ID in Config.js: const SPREADSHEET_ID = "your-id";
 * 2. Deploy with clasp push
 * 3. Run migration: runDeleteRolesTableMigration()
 *    - You will be prompted to confirm deletion
 */

/**
 * Run migration - Deletes the roles table after confirmation
 */
function runDeleteRolesTableMigration() {
  const migration = new DeleteRolesTableMigration(getSpreadsheetId());
  migration.run();
}

/**
 * Migration class for deleting roles table
 */
class DeleteRolesTableMigration {
  constructor(spreadsheetId) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.migrationName = 'Migration_REEN003';
    this.targetSheetName = 'roles';
  }

  /**
   * Main run method - Deletes roles sheet with confirmation
   */
  run() {
    Logger.log(`\n${'='.repeat(80)}`);
    Logger.log(`🚀 ${this.migrationName}: Delete Roles Table`);
    Logger.log(`${'='.repeat(80)}\n`);

    try {
      // Check if roles sheet exists
      const rolesSheet = this.spreadsheet.getSheetByName(this.targetSheetName);

      if (!rolesSheet) {
        Logger.log(`✅ Sheet '${this.targetSheetName}' does not exist. Nothing to delete.`);
        Logger.log(`\n${'='.repeat(80)}`);
        Logger.log('✅ Migration complete - no action needed');
        Logger.log(`${'='.repeat(80)}\n`);
        return;
      }

      // Show confirmation prompt
      Logger.log(`⚠️  Found sheet '${this.targetSheetName}' with ${rolesSheet.getLastRow()} rows`);
      Logger.log(`\n${'='.repeat(80)}`);
      Logger.log('⚠️  CONFIRMATION REQUIRED');
      Logger.log(`${'='.repeat(80)}`);
      Logger.log('This will PERMANENTLY DELETE the "roles" sheet.');
      Logger.log('This action CANNOT be undone.');
      Logger.log('\nTo proceed:');
      Logger.log('1. Make sure you have a backup of your spreadsheet');
      Logger.log('2. Uncomment the deletion line in the code (search for "UNCOMMENT TO DELETE")');
      Logger.log('3. Run this migration again');
      Logger.log(`${'='.repeat(80)}\n`);

      // SAFETY: Require manual uncomment to actually delete
      // UNCOMMENT THE LINE BELOW TO DELETE THE ROLES TABLE
      // this.deleteRolesSheet(rolesSheet);

      Logger.log('⚠️  Deletion NOT performed (safety lock in place)');
      Logger.log('Read the instructions above to proceed.');

    } catch (error) {
      Logger.log(`\n${'='.repeat(80)}`);
      Logger.log(`❌ ERROR: ${error.message}`);
      Logger.log(`${'='.repeat(80)}\n`);
      throw error;
    }
  }

  /**
   * Delete the roles sheet
   * @param {Sheet} sheet - The sheet to delete
   */
  deleteRolesSheet(sheet) {
    Logger.log(`\n${'='.repeat(80)}`);
    Logger.log('🗑️  DELETING ROLES SHEET');
    Logger.log(`${'='.repeat(80)}\n`);

    const rowCount = sheet.getLastRow();
    const columnCount = sheet.getLastColumn();

    Logger.log(`📊 Sheet info before deletion:`);
    Logger.log(`   - Name: ${this.targetSheetName}`);
    Logger.log(`   - Rows: ${rowCount}`);
    Logger.log(`   - Columns: ${columnCount}`);
    Logger.log('');

    // Delete the sheet
    this.spreadsheet.deleteSheet(sheet);

    Logger.log(`✅ Sheet '${this.targetSheetName}' has been deleted`);
    Logger.log(`\n${'='.repeat(80)}`);
    Logger.log('✅ Migration complete');
    Logger.log(`${'='.repeat(80)}\n`);
  }
}
