/**
 * Google Apps Script Migration Template - DROP PATTERN
 *
 * Use this pattern when DELETING a table:
 * - Removing an obsolete sheet/table
 * - Cleaning up after a refactoring
 *
 * PATTERN: Single-step (drop) with safety confirmation
 * - drop(): Deletes the table permanently
 * - Requires uncommenting a confirmation line to execute
 * - THIS IS DESTRUCTIVE AND CANNOT BE UNDONE
 *
 * Copy this template to create new migrations.
 * Replace [XXX] with migration number and [Description] with meaningful name.
 */

/**
 * Drop the table
 * DANGEROUS: This permanently deletes data
 *
 * SAFETY MECHANISM:
 * You MUST uncomment the confirmation line in the drop() method
 * before this will actually delete anything.
 */
function dropYourDropTableNameTable() {
  const migration = new YourDropTableNameMigration(getSpreadsheetId());
  migration.drop();
}

/**
 * Migration class - DROP pattern
 */
class YourDropTableNameMigration {
  constructor(spreadsheetId) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.migrationName = 'Migration_XXX_DropYourTableName';

    // Define table(s) to drop
    this.tablesToDrop = [
      'obsolete_table_1',
      'obsolete_table_2'
    ];
  }

  /**
   * Drop tables
   * DESTRUCTIVE: Permanently deletes the table(s)
   */
  drop() {
    Logger.log(`⚠️  DROPPING TABLES: ${this.tablesToDrop.join(', ')}`);
    Logger.log('='.repeat(50));
    Logger.log('⚠️⚠️⚠️  DANGER: THIS WILL PERMANENTLY DELETE DATA  ⚠️⚠️⚠️');
    Logger.log('');

    // SAFETY MECHANISM: You must uncomment this line to proceed
    // const CONFIRMED = true;

    if (typeof CONFIRMED === 'undefined' || !CONFIRMED) {
      Logger.log('❌ DROP CANCELLED - Safety confirmation required');
      Logger.log('');
      Logger.log('To proceed with deletion:');
      Logger.log('1. Review the tablesToDrop array to ensure you are deleting the correct tables');
      Logger.log('2. Make a backup of your spreadsheet (File > Make a copy)');
      Logger.log('3. Uncomment the line: const CONFIRMED = true;');
      Logger.log('4. Run this function again');
      Logger.log('');
      Logger.log('⚠️  THIS ACTION CANNOT BE UNDONE');
      return;
    }

    try {
      Logger.log('✅ Safety confirmation received - proceeding with deletion\n');

      this.tablesToDrop.forEach(tableName => {
        const sheet = this.spreadsheet.getSheetByName(tableName);

        if (sheet) {
          Logger.log(`🗑️  Deleting table: ${tableName}`);
          this.spreadsheet.deleteSheet(sheet);
          Logger.log(`   ✅ Deleted: ${tableName}`);
        } else {
          Logger.log(`   ⚠️  Table not found (may already be deleted): ${tableName}`);
        }
      });

      Logger.log('\n🎉 TABLES DROPPED SUCCESSFULLY!');
      Logger.log('   Tables have been permanently deleted');

    } catch (error) {
      Logger.log(`\n❌ DROP FAILED: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Example usage:
 *
 * 1. Update tablesToDrop array with the tables you want to delete
 * 2. Backup your spreadsheet (File > Make a copy)
 * 3. Uncomment the confirmation line in drop()
 * 4. Run dropYourTableNameTable()
 */
