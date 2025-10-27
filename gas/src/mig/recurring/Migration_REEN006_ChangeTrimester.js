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
   * Create audit records for all transformed registrations
   * @private
   */
  _createAuditRecords(transformedRows, registrationHeaders) {
    // Get target audit sheet to determine structure
    const auditSheet = this.spreadsheet.getSheetByName(this.targetAuditTable);
    if (!auditSheet) {
      Logger.log(`   ⚠️  Audit table '${this.targetAuditTable}' not found, skipping audit records`);
      return;
    }

    // Delete previous working copy if exists
    const existingWorkingAudit = this.spreadsheet.getSheetByName(this.workingAuditTable);
    if (existingWorkingAudit) {
      Logger.log(`   🗑️  Deleting previous ${this.workingAuditTable}`);
      this.spreadsheet.deleteSheet(existingWorkingAudit);
    }

    // Get audit table structure
    const auditData = auditSheet.getDataRange().getValues();
    const auditHeaders = auditData[0];

    // Create working audit sheet
    Logger.log(`   📊 Creating ${this.workingAuditTable}...`);
    const workingAuditSheet = this.spreadsheet.insertSheet(this.workingAuditTable);

    // Copy headers
    const auditHeaderRange = workingAuditSheet.getRange(1, 1, 1, auditHeaders.length);
    auditHeaderRange.setValues([auditHeaders]);
    auditHeaderRange.setFontWeight('bold');
    auditHeaderRange.setBackground('#e8eaf6');

    // Find column indices in audit table
    const auditIdIndex = auditHeaders.indexOf('Id');
    const registrationIdIndex = auditHeaders.indexOf('RegistrationId');
    const updatedAtIndex = auditHeaders.indexOf('updatedAt');
    const updatedByIndex = auditHeaders.indexOf('updatedBy');

    // Find ID column in registration headers
    const regIdIndex = registrationHeaders.indexOf('Id');

    if (auditIdIndex === -1 || registrationIdIndex === -1 || regIdIndex === -1) {
      Logger.log(`   ⚠️  Required columns not found in audit table structure`);
      return;
    }

    const now = new Date().toISOString();
    const auditRecords = [];

    // Create audit record for each transformed registration
    for (const row of transformedRows) {
      // Create audit record matching the registration structure
      const auditRecord = new Array(auditHeaders.length).fill('');

      // Copy all fields from registration to audit (they have similar structure)
      // Audit has: Id (audit ID), RegistrationId (reg ID), then all reg fields
      for (let i = 0; i < registrationHeaders.length; i++) {
        const regHeader = registrationHeaders[i];
        const auditIdx = auditHeaders.indexOf(regHeader);
        if (auditIdx !== -1 && auditIdx > registrationIdIndex) {
          // Copy value from registration row to audit record
          auditRecord[auditIdx] = row[i];
        }
      }

      // Set audit-specific fields
      auditRecord[auditIdIndex] = this._generateUuid(); // Unique audit record ID
      auditRecord[registrationIdIndex] = row[regIdIndex]; // Reference to registration ID

      if (updatedAtIndex !== -1) {
        auditRecord[updatedAtIndex] = now;
      }
      if (updatedByIndex !== -1) {
        auditRecord[updatedByIndex] = 'Migration_REEN006';
      }

      auditRecords.push(auditRecord);
    }

    // Write audit records
    if (auditRecords.length > 0) {
      const auditDataRange = workingAuditSheet.getRange(2, 1, auditRecords.length, auditHeaders.length);
      auditDataRange.setValues(auditRecords);
      Logger.log(`   ✅ Created ${auditRecords.length} audit records in ${this.workingAuditTable}`);
    }
  }

  /**
   * Apply migration - Make changes permanent
   * DESTRUCTIVE: Replaces target trimester table and audit table
   */
  apply() {
    Logger.log(`⚠️  APPLYING MIGRATION: ${this.migrationName}`);
    Logger.log('='.repeat(42 + this.migrationName.length));
    Logger.log(`⚠️  WARNING: This will REPLACE ${this.targetTable} and ${this.targetAuditTable}!`);

    try {
      // Verify working copies exist
      const workingSheet = this.spreadsheet.getSheetByName(this.workingTable);
      if (!workingSheet) {
        throw new Error(`Working copy '${this.workingTable}' not found. Run runChangeTrimesterMigration() first.`);
      }

      const workingAuditSheet = this.spreadsheet.getSheetByName(this.workingAuditTable);
      if (!workingAuditSheet) {
        throw new Error(`Working audit copy '${this.workingAuditTable}' not found. Run runChangeTrimesterMigration() first.`);
      }

      // Get row counts for confirmation
      const workingRowCount = workingSheet.getLastRow() - 1; // Exclude header
      const workingAuditRowCount = workingAuditSheet.getLastRow() - 1; // Exclude header
      Logger.log(`\n📊 Working copies ready to apply:`);
      Logger.log(`   ${this.workingTable}: ${workingRowCount} rows`);
      Logger.log(`   ${this.workingAuditTable}: ${workingAuditRowCount} rows`);

      // Delete target if exists
      const targetSheet = this.spreadsheet.getSheetByName(this.targetTable);
      if (targetSheet) {
        Logger.log(`\n🗑️  Deleting original ${this.targetTable}`);
        this.spreadsheet.deleteSheet(targetSheet);
      }

      // Delete target audit if exists
      const targetAuditSheet = this.spreadsheet.getSheetByName(this.targetAuditTable);
      if (targetAuditSheet) {
        Logger.log(`🗑️  Deleting original ${this.targetAuditTable}`);
        this.spreadsheet.deleteSheet(targetAuditSheet);
      }

      // Rename working copies to targets
      Logger.log(`\n✏️  Renaming working copies to production:`);
      Logger.log(`   ${this.workingTable} → ${this.targetTable}`);
      workingSheet.setName(this.targetTable);

      Logger.log(`   ${this.workingAuditTable} → ${this.targetAuditTable}`);
      workingAuditSheet.setName(this.targetAuditTable);

      Logger.log('\n🎉 MIGRATION APPLIED SUCCESSFULLY!');
      Logger.log(`   ${this.targetTable} now contains ${workingRowCount} registrations`);
      Logger.log(`   ${this.targetAuditTable} now contains ${workingAuditRowCount} audit records`);
      Logger.log(`   Source (${this.sourceTable}) remains unchanged`);
      Logger.log(`   Students can now be scheduled in ${this.TARGET_TRIMESTER} trimester`);

    } catch (error) {
      Logger.log(`\n❌ MIGRATION APPLY FAILED: ${error.message}`);
      Logger.log('   Original tables may still exist - check manually');
      throw error;
    }
  }
}
