/**
 * Google Apps Script Migration REEN006: Change Trimester (Reenrollment)
 *
 * 🎯 PURPOSE:
 * Copy registrations from one trimester to another based on reenrollment intent.
 * Supports transitioning students marked "keep" or "change" from fall → winter or winter → spring.
 *
 * 📋 CHANGES MADE:
 * 1. Reads registrations from source trimester (e.g., registrations_fall)
 * 2. Filters for reenrollmentIntent = "keep" or "change"
 * 3. Generates new UUID for each copied registration
 * 4. Links to previous registration via linkedPreviousRegistrationId
 * 5. Sets createdAt to current timestamp and createdBy to "system"
 * 6. Clears reenrollment intent columns (reenrollmentIntent, intentSubmittedAt, intentSubmittedBy set to blank)
 * 7. Creates audit record in target trimester audit table for each copied registration
 *
 * 🔧 WORKING COPY PATTERN:
 * - run(): Creates MIGRATION_* working copy of target with changes
 * - apply(): Replaces original target table (DESTRUCTIVE)
 *
 * 🚀 TO USE:
 * 1. Set TARGET_TRIMESTER to "winter" or "spring" in the class constructor
 * 2. Set spreadsheet ID in Config.js: const SPREADSHEET_ID = "your-id";
 * 3. Deploy with clasp push
 * 4. Run migration: runChangeTrimesterMigration()
 *    - Check MIGRATION_registrations_[target] to verify copied data
 * 5. Apply migration: applyChangeTrimesterMigration()
 *    - WARNING: This is DESTRUCTIVE and cannot be undone
 *
 * ⚠️  IMPORTANT:
 * - Students with intent "drop" or blank will NOT be copied
 * - Each registration gets a new UUID and is linked to its source
 * - Intent columns are preserved in schema but values are cleared (ready for new cycle)
 * - Source trimester data remains unchanged
 * - Target trimester will be REPLACED with filtered source data
 */

/**
 * Step 1: Run migration - Creates working copy with changes
 * Safe to run multiple times - deletes previous attempt and recreates
 */
function runChangeTrimesterMigration() {
  const migration = new ChangeTrimesterMigration(getSpreadsheetId());
  migration.run();
}

/**
 * Step 2: Apply migration - Makes changes permanent
 * WARNING: DESTRUCTIVE - Replaces target trimester table
 */
function applyChangeTrimesterMigration() {
  const migration = new ChangeTrimesterMigration(getSpreadsheetId());
  migration.apply();
}

/**
 * Migration class for changing trimesters (reenrollment)
 */
class ChangeTrimesterMigration {
  constructor(spreadsheetId) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.migrationName = 'Migration_REEN006';

    // ⚠️  CONFIGURE THIS: Set target trimester to "winter" or "spring"
    this.TARGET_TRIMESTER = 'winter';

    // Determine source and target tables based on target trimester
    this.sourceTrimester = this._getSourceTrimester();
    this.sourceTable = `registrations_${this.sourceTrimester}`;
    this.targetTable = `registrations_${this.TARGET_TRIMESTER}`;
    this.workingTable = `MIGRATION_${this.targetTable}`;
    this.targetAuditTable = `registrations_${this.TARGET_TRIMESTER}_audit`;
    this.workingAuditTable = `MIGRATION_${this.targetAuditTable}`;

    // Intent values to copy
    this.INTENTS_TO_COPY = ['keep', 'change'];

    // Columns to clear when copying (intent tracking columns - keep in schema but blank the values)
    this.COLUMNS_TO_CLEAR = ['reenrollmentIntent', 'intentSubmittedAt', 'intentSubmittedBy'];
  }

  /**
   * Get source trimester based on target
   * @private
   */
  _getSourceTrimester() {
    if (this.TARGET_TRIMESTER === 'winter') {
      return 'fall';
    } else if (this.TARGET_TRIMESTER === 'spring') {
      return 'winter';
    } else {
      throw new Error(`Invalid TARGET_TRIMESTER: ${this.TARGET_TRIMESTER}. Must be "winter" or "spring"`);
    }
  }

  /**
   * Run migration - Create working copy with filtered data
   */
  run() {
    Logger.log(`🚀 RUNNING MIGRATION: ${this.migrationName}`);
    Logger.log('='.repeat(42 + this.migrationName.length));
    Logger.log(`📋 Target: ${this.sourceTrimester} → ${this.TARGET_TRIMESTER}`);

    try {
      // Get source sheet
      const sourceSheet = this.spreadsheet.getSheetByName(this.sourceTable);
      if (!sourceSheet) {
        throw new Error(`Source sheet '${this.sourceTable}' not found`);
      }

      // Delete previous working copy if exists
      const existingWorking = this.spreadsheet.getSheetByName(this.workingTable);
      if (existingWorking) {
        Logger.log(`🗑️  Deleting previous ${this.workingTable}`);
        this.spreadsheet.deleteSheet(existingWorking);
      }

      // Get all data from source
      const lastRow = sourceSheet.getLastRow();
      const lastCol = sourceSheet.getLastColumn();

      if (lastRow < 1) {
        throw new Error(`Source sheet '${this.sourceTable}' has no data`);
      }

      const headers = sourceSheet.getRange(1, 1, 1, lastCol).getValues()[0];
      Logger.log(`📊 Source has ${lastRow - 1} rows, ${lastCol} columns`);

      // Find required column indices
      const columnIndices = this._getColumnIndices(headers);
      this._validateRequiredColumns(columnIndices);

      // All columns are kept (no filtering)
      Logger.log(`   📋 Copying all ${headers.length} columns (intent columns will be cleared)`);

      // Create new working sheet with all headers
      Logger.log(`\n📊 Creating ${this.workingTable}...`);
      const workingSheet = this.spreadsheet.insertSheet(this.workingTable);

      // Copy all headers
      const headerRange = workingSheet.getRange(1, 1, 1, headers.length);
      headerRange.setValues([headers]);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#e8eaf6');

      // Filter and transform rows
      const transformedRows = this._filterAndTransformRows(
        sourceSheet,
        headers,
        columnIndices,
        lastRow,
        lastCol
      );

      if (transformedRows.length > 0) {
        const dataRange = workingSheet.getRange(2, 1, transformedRows.length, headers.length);
        dataRange.setValues(transformedRows);
        Logger.log(`   ✅ Copied ${transformedRows.length} rows (intent: ${this.INTENTS_TO_COPY.join(', ')})`);
      } else {
        Logger.log(`   ⚠️  No rows found with intent: ${this.INTENTS_TO_COPY.join(', ')}`);
      }

      // Summary
      const dropCount = (lastRow - 1) - transformedRows.length;
      Logger.log(`\n📈 Summary:`);
      Logger.log(`   Source (${this.sourceTable}): ${lastRow - 1} total rows`);
      Logger.log(`   Copied to working: ${transformedRows.length} rows`);
      Logger.log(`   Not copied (drop/blank): ${dropCount} rows`);
      Logger.log(`   New UUIDs generated: ${transformedRows.length}`);

      // Create audit records
      Logger.log(`\n📜 Creating audit records...`);
      this._createAuditRecords(transformedRows, headers);

      Logger.log('\n🎉 MIGRATION RUN COMPLETED!');
      Logger.log('\n📋 Next steps:');
      Logger.log(`   1. Review ${this.workingTable} to verify correct data`);
      Logger.log(`   2. Review ${this.workingAuditTable} to verify audit records`);
      Logger.log(`   3. Verify students with "keep"/"change" intent were copied`);
      Logger.log(`   4. Run applyChangeTrimesterMigration() to make permanent`);
      Logger.log(`   ⚠️  WARNING: apply() will REPLACE ${this.targetTable} and ${this.targetAuditTable}!`);

    } catch (error) {
      Logger.log(`\n❌ MIGRATION RUN FAILED: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get column indices for required fields
   * @private
   */
  _getColumnIndices(headers) {
    return {
      id: headers.indexOf('Id'),
      reenrollmentIntent: headers.indexOf('reenrollmentIntent'),
      createdAt: headers.indexOf('CreatedAt'),
      createdBy: headers.indexOf('CreatedBy'),
      linkedPreviousRegistrationId: headers.indexOf('linkedPreviousRegistrationId')
    };
  }

  /**
   * Validate that required columns exist
   * @private
   */
  _validateRequiredColumns(columnIndices) {
    const required = ['id', 'reenrollmentIntent', 'createdAt', 'createdBy', 'linkedPreviousRegistrationId'];
    const missing = required.filter(field => columnIndices[field] === -1);

    if (missing.length > 0) {
      const fieldToColumnName = {
        id: 'Id',
        reenrollmentIntent: 'reenrollmentIntent',
        createdAt: 'CreatedAt',
        createdBy: 'CreatedBy',
        linkedPreviousRegistrationId: 'linkedPreviousRegistrationId'
      };
      const missingColumns = missing.map(field => fieldToColumnName[field]);
      throw new Error(`Required columns not found in ${this.sourceTable}: ${missingColumns.join(', ')}`);
    }
  }

  /**
   * Filter rows by intent and transform them (new ID, timestamps, linking, clear intent columns)
   * @private
   */
  _filterAndTransformRows(sourceSheet, headers, columnIndices, lastRow, lastCol) {
    const transformedRows = [];
    const now = new Date().toISOString();

    // Find indices of columns to clear
    const clearIndices = this.COLUMNS_TO_CLEAR.map(col => headers.indexOf(col)).filter(idx => idx !== -1);

    // Read data in batches for efficiency (skip header row)
    if (lastRow > 1) {
      const dataRange = sourceSheet.getRange(2, 1, lastRow - 1, lastCol);
      const data = dataRange.getValues();

      for (let i = 0; i < data.length; i++) {
        const sourceRow = data[i];
        const intent = sourceRow[columnIndices.reenrollmentIntent];

        // Check if intent matches our criteria
        if (intent && this.INTENTS_TO_COPY.includes(intent.toLowerCase())) {
          // Copy all columns from source row
          const newRow = [...sourceRow];

          // Transform specific fields
          const oldId = sourceRow[columnIndices.id];
          const newId = this._generateUuid();

          // Update ID, timestamps, linking
          newRow[columnIndices.id] = newId;
          newRow[columnIndices.createdAt] = now;
          newRow[columnIndices.createdBy] = 'system';
          newRow[columnIndices.linkedPreviousRegistrationId] = oldId;

          // Clear intent columns
          for (const clearIdx of clearIndices) {
            newRow[clearIdx] = '';
          }

          transformedRows.push(newRow);
        }
      }
    }

    return transformedRows;
  }

  /**
   * Generate a UUID v4
   * @private
   */
  _generateUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Apply migration - Make changes permanent
   * DESTRUCTIVE: Replaces target trimester table
   */
  apply() {
    Logger.log(`⚠️  APPLYING MIGRATION: ${this.migrationName}`);
    Logger.log('='.repeat(42 + this.migrationName.length));
    Logger.log(`⚠️  WARNING: This will REPLACE ${this.targetTable}!`);

    try {
      // Verify working copy exists
      const workingSheet = this.spreadsheet.getSheetByName(this.workingTable);
      if (!workingSheet) {
        throw new Error(`Working copy '${this.workingTable}' not found. Run runChangeTrimesterMigration() first.`);
      }

      // Get row count for confirmation
      const workingRowCount = workingSheet.getLastRow() - 1; // Exclude header
      Logger.log(`\n📊 Working copy has ${workingRowCount} rows ready to apply`);

      // Delete target if exists
      const targetSheet = this.spreadsheet.getSheetByName(this.targetTable);
      if (targetSheet) {
        Logger.log(`🗑️  Deleting original ${this.targetTable}`);
        this.spreadsheet.deleteSheet(targetSheet);
      }

      // Rename working copy to target
      Logger.log(`✏️  Renaming ${this.workingTable} → ${this.targetTable}`);
      workingSheet.setName(this.targetTable);

      Logger.log('\n🎉 MIGRATION APPLIED SUCCESSFULLY!');
      Logger.log(`   ${this.targetTable} now contains ${workingRowCount} registrations`);
      Logger.log(`   Source (${this.sourceTable}) remains unchanged`);
      Logger.log(`   Students can now be scheduled in ${this.TARGET_TRIMESTER} trimester`);

    } catch (error) {
      Logger.log(`\n❌ MIGRATION APPLY FAILED: ${error.message}`);
      Logger.log('   Original tables may still exist - check manually');
      throw error;
    }
  }
}
