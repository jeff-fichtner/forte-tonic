/**
 * Google Apps Script Migration REEN008: Create Drop Requests Table
 *
 * 🎯 PURPOSE:
 * Creates the drop_requests table for tracking mid-trimester lesson drop requests
 * that require admin approval.
 *
 * 📋 SCHEMA:
 * - id: UUID primary key
 * - registrationId: UUID foreign key to registrations
 * - parentId: UUID foreign key to parents
 * - trimester: 'fall' | 'winter' | 'spring' - which trimester the registration belongs to
 * - reason: Text explanation from parent
 * - requestedAt: ISO date string when request was created
 * - status: 'pending' | 'approved' | 'rejected'
 * - reviewedBy: Email of admin who reviewed (nullable)
 * - reviewedAt: ISO date string when reviewed (nullable)
 * - adminNotes: Admin comments on decision (nullable)
 *
 * 🚀 TO USE:
 * 1. Set spreadsheet ID in Config.js: const SPREADSHEET_ID = "your-id";
 * 2. Deploy with clasp push
 * 3. Run migration: createDropRequestsTable()
 *    - Deletes existing drop_requests table if present
 *    - Creates fresh drop_requests table with schema
 *    - Safe to re-run - always nukes and recreates
 *
 * 💡 PATTERN: Single-step CREATE
 * Use for creating new tables. Always checks for existing and deletes before creating.
 */

/**
 * Create drop_requests table
 * Deletes existing table if present and creates fresh
 */
function createDropRequestsTable() {
  const migration = new CreateDropRequestsTableMigration(getSpreadsheetId());
  migration.create();
}

/**
 * Migration class for creating drop_requests table
 */
class CreateDropRequestsTableMigration {
  constructor(spreadsheetId) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.migrationName = 'Migration_REEN008';
    this.tableName = 'drop_requests';
  }

  /**
   * Create drop_requests table
   * Deletes existing table if present and creates fresh
   */
  create() {
    Logger.log(`🚀 CREATING TABLE: ${this.tableName}`);
    Logger.log(`📋 Migration: ${this.migrationName}`);
    Logger.log('='.repeat(50));

    try {
      // Delete existing table if it exists
      const existingSheet = this.spreadsheet.getSheetByName(this.tableName);
      if (existingSheet) {
        Logger.log(`🗑️  Deleting existing ${this.tableName} table`);
        this.spreadsheet.deleteSheet(existingSheet);
      }

      // Create new sheet
      Logger.log(`\n📊 Creating ${this.tableName} table...`);
      const newSheet = this.spreadsheet.insertSheet(this.tableName);

      // Set up the table structure
      this._setupTableStructure(newSheet);
      Logger.log(`   ✅ Created ${this.tableName} with schema`);

      Logger.log('\n🎉 TABLE CREATED SUCCESSFULLY!');
      Logger.log(`   ${this.tableName} is ready to use`);
      Logger.log('   Safe to re-run - will nuke and recreate');

    } catch (error) {
      Logger.log(`\n❌ TABLE CREATION FAILED: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set up the drop_requests table structure
   */
  _setupTableStructure(sheet) {
    // Define headers
    const headers = [
      'id',             // UUID primary key
      'registrationId', // UUID FK to registrations
      'parentId',       // UUID FK to parents
      'trimester',      // fall|winter|spring
      'reason',         // Text from parent
      'requestedAt',    // ISO date string
      'status',         // pending|approved|rejected
      'reviewedBy',     // Admin email (nullable)
      'reviewedAt',     // ISO date string (nullable)
      'adminNotes',     // Admin comments (nullable)
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
    sheet.setColumnWidth(2, 100);  // registrationId
    sheet.setColumnWidth(3, 100);  // parentId
    sheet.setColumnWidth(4, 80);   // trimester
    sheet.setColumnWidth(5, 300);  // reason
    sheet.setColumnWidth(6, 120);  // requestedAt
    sheet.setColumnWidth(7, 100);  // status
    sheet.setColumnWidth(8, 150);  // reviewedBy
    sheet.setColumnWidth(9, 120);  // reviewedAt
    sheet.setColumnWidth(10, 300); // adminNotes

    // Freeze header row
    sheet.setFrozenRows(1);

    Logger.log(`   ✅ Created table with ${headers.length} columns`);
    Logger.log(`      Columns: ${headers.join(', ')}`);
  }
}
