/**
 * Google Apps Script Migration Template - CREATE PATTERN
 *
 * Use this pattern when CREATING a new table:
 * - Adding a new sheet/table to the spreadsheet
 * - Setting up initial schema
 * - Optionally seeding initial data
 *
 * PATTERN: Single-step (create)
 * - create(): Deletes existing table (if any) and creates fresh
 * - Always safe to re-run - nukes and recreates each time
 * - No separate apply step needed
 *
 * Copy this template to create new migrations.
 * Replace [XXX] with migration number and [Description] with meaningful name.
 */

/**
 * Create the new table
 * Safe to run multiple times - deletes existing and recreates
 */
function createYourCreateTableNameTable() {
  const migration = new YourCreateTableNameMigration(getSpreadsheetId());
  migration.create();
}

/**
 * Migration class - CREATE pattern
 */
class YourCreateTableNameMigration {
  constructor(spreadsheetId) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.migrationName = 'Migration_XXX_CreateYourTableName';
    this.tableName = 'your_table_name';
  }

  /**
   * Create table - Deletes existing and creates fresh
   */
  create() {
    Logger.log(`🚀 CREATING TABLE: ${this.tableName}`);
    Logger.log('='.repeat(35 + this.tableName.length));

    try {
      // Delete existing table if it exists
      const existingSheet = this.spreadsheet.getSheetByName(this.tableName);
      if (existingSheet) {
        Logger.log(`🗑️  Deleting existing ${this.tableName} table`);
        this.spreadsheet.deleteSheet(existingSheet);
      }

      // Create new sheet
      Logger.log(`\n📊 Creating ${this.tableName} table...`);
      const sheet = this.spreadsheet.insertSheet(this.tableName);

      // Set up the table structure
      this._createTableStructure(sheet);

      Logger.log('\n🎉 TABLE CREATED SUCCESSFULLY!');
      Logger.log(`   ${this.tableName} is ready to use`);

    } catch (error) {
      Logger.log(`\n❌ TABLE CREATION FAILED: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create the table structure
   * REPLACE THIS with your actual table schema
   */
  _createTableStructure(sheet) {
    // Define headers
    const headers = [
      'id',             // UUID primary key
      'column1',        // Description
      'column2',        // Description
      'column3',        // Description
      'createdAt',      // ISO date string
      'createdBy',      // User who created
    ];

    // Write headers to first row
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // Format header row
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4a86e8');
    headerRange.setFontColor('#ffffff');

    // Set column widths for readability
    sheet.setColumnWidth(1, 100);  // id
    sheet.setColumnWidth(2, 150);  // column1
    sheet.setColumnWidth(3, 150);  // column2
    sheet.setColumnWidth(4, 150);  // column3
    sheet.setColumnWidth(5, 120);  // createdAt
    sheet.setColumnWidth(6, 150);  // createdBy

    // Freeze header row
    sheet.setFrozenRows(1);

    Logger.log(`   ✅ Created table with ${headers.length} columns`);
    Logger.log(`      Columns: ${headers.join(', ')}`);

    // Optional: Add seed data
    // this._seedInitialData(sheet);
  }

  /**
   * Optional: Seed initial data
   */
  _seedInitialData(sheet) {
    const now = new Date().toISOString();
    const seedData = [
      ['uuid-1', 'value1', 'value2', 'value3', now, 'system'],
      ['uuid-2', 'value4', 'value5', 'value6', now, 'system'],
    ];

    if (seedData.length > 0) {
      sheet.getRange(2, 1, seedData.length, seedData[0].length).setValues(seedData);
      Logger.log(`   🌱 Seeded ${seedData.length} initial rows`);
    }
  }
}
