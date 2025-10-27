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
 * 6. Formats StartTime to HH:mm format (fixes Google Sheets date serialization issue)
 * 7. Clears reenrollment intent columns (reenrollmentIntent, intentSubmittedAt, intentSubmittedBy set to blank)
 * 8. Creates audit records with TRANSFORMED data (new IDs, formatted times, cleared intents)
 *    - Audit records mirror exactly what the app would create when saving new registrations
 *    - Each audit record references the NEW registration ID, not the old one
 *    - updatedAt and updatedBy are left BLANK (they track updates, not creation)
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

    // Intent values to copy: 'keep', 'change', or BLANK (null/empty string)
    // Students marked 'drop' will NOT be copied (they are dropping the class)
    this.INTENTS_TO_COPY = ['keep', 'change', ''];
    this.INTENTS_TO_SKIP = ['drop'];  // Students marked 'drop' are not copied

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
   * Get column indices for required fields (case-insensitive)
   * @private
   */
  _getColumnIndices(headers) {
    const findColumn = (columnName) => {
      return headers.findIndex(h => h && h.toLowerCase() === columnName.toLowerCase());
    };

    return {
      id: findColumn('Id'),
      reenrollmentIntent: findColumn('reenrollmentIntent'),
      createdAt: findColumn('CreatedAt'),
      createdBy: findColumn('CreatedBy'),
      linkedPreviousRegistrationId: findColumn('linkedPreviousRegistrationId'),
      startTime: findColumn('StartTime')
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

    // Find indices of columns to clear (case-insensitive)
    const clearIndices = this.COLUMNS_TO_CLEAR.map(col => {
      return headers.findIndex(h => h && h.toLowerCase() === col.toLowerCase());
    }).filter(idx => idx !== -1);

    // Read data in batches for efficiency (skip header row)
    if (lastRow > 1) {
      const dataRange = sourceSheet.getRange(2, 1, lastRow - 1, lastCol);
      const data = dataRange.getValues();

      for (let i = 0; i < data.length; i++) {
        const sourceRow = data[i];
        const intent = sourceRow[columnIndices.reenrollmentIntent];

        // Check if intent matches our criteria (blank/empty, 'keep', or 'change')
        // Skip if intent is 'drop'
        const intentValue = intent ? intent.toLowerCase() : '';
        if (this.INTENTS_TO_COPY.includes(intentValue)) {
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

          // Format StartTime to HH:mm if it exists
          if (columnIndices.startTime !== -1) {
            newRow[columnIndices.startTime] = this._formatTimeValue(sourceRow[columnIndices.startTime]);
          }

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
   * Convert Google Sheets time value (Date object or serial number) to HH:mm format
   * @private
   */
  _formatTimeValue(value) {
    if (!value) return value;

    // If already a string in HH:mm format, return as-is
    if (typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value)) {
      return value;
    }

    // If it's a Date object or looks like a date
    if (value instanceof Date || (typeof value === 'object' && value.getHours)) {
      const hours = value.getHours();
      const minutes = value.getMinutes();
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // If it's a number (serial time value: fraction of day)
    if (typeof value === 'number' && value > 0 && value < 1) {
      const totalMinutes = Math.round(value * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // Return as-is if we can't convert it
    return value;
  }

  /**
   * Create audit records for all transformed registrations
   * These audit records should mirror exactly what the app would create when saving a new registration
   * @private
   */
  _createAuditRecords(transformedRows, registrationHeaders) {
    // Delete previous working copy if exists
    const existingWorkingAudit = this.spreadsheet.getSheetByName(this.workingAuditTable);
    if (existingWorkingAudit) {
      Logger.log(`   🗑️  Deleting previous ${this.workingAuditTable}`);
      this.spreadsheet.deleteSheet(existingWorkingAudit);
    }

    // Build audit headers to match googleSheetsDbClient.js structure
    // This duplicates the logic from googleSheetsDbClient.js so migration is self-contained
    // Audit table structure (26 columns):
    // Id, RegistrationId, StudentId, InstructorId, Day, StartTime, Length, RegistrationType,
    // RoomId, Instrument, TransportationType, Notes, ClassId, ClassTitle, ExpectedStartDate,
    // CreatedAt, CreatedBy, IsDeleted, DeletedAt, DeletedBy, reenrollmentIntent,
    // intentSubmittedAt, intentSubmittedBy, updatedAt, updatedBy, linkedPreviousRegistrationId

    const auditHeaders = [];
    auditHeaders.push('Id');  // Column 0: Audit record ID
    auditHeaders.push('RegistrationId');  // Column 1: Reference to registration

    // Add registration fields (except Id) with audit-specific fields inserted at correct positions
    for (let i = 0; i < registrationHeaders.length; i++) {
      const header = registrationHeaders[i];
      const headerLower = header ? header.toLowerCase() : '';

      // Skip the registration's Id (it goes into RegistrationId)
      if (headerLower === 'id') continue;

      // Add the registration field
      auditHeaders.push(header);

      // After CreatedBy, insert deletion tracking fields (IsDeleted, DeletedAt, DeletedBy)
      if (headerLower === 'createdby') {
        auditHeaders.push('IsDeleted', 'DeletedAt', 'DeletedBy');
      }

      // After intentSubmittedBy, insert update tracking fields (updatedAt, updatedBy)
      if (headerLower === 'intentsubmittedby') {
        auditHeaders.push('updatedAt', 'updatedBy');
      }
    }

    Logger.log(`   📋 Constructed audit headers: ${auditHeaders.length} columns (expected: 26)`);
    Logger.log(`   📋 First 5: ${auditHeaders.slice(0, 5).join(', ')}`);
    Logger.log(`   📋 Last 5: ${auditHeaders.slice(-5).join(', ')}`);

    // Create working audit sheet
    Logger.log(`   📊 Creating ${this.workingAuditTable}...`);
    const workingAuditSheet = this.spreadsheet.insertSheet(this.workingAuditTable);

    // Copy headers
    const auditHeaderRange = workingAuditSheet.getRange(1, 1, 1, auditHeaders.length);
    auditHeaderRange.setValues([auditHeaders]);
    auditHeaderRange.setFontWeight('bold');
    auditHeaderRange.setBackground('#e8eaf6');

    // Helper function for case-insensitive column lookup
    const findColumnIndex = (headers, columnName) => {
      return headers.findIndex(h => h && h.toLowerCase() === columnName.toLowerCase());
    };

    // Find column indices in audit table (case-insensitive)
    const auditIdIndex = findColumnIndex(auditHeaders, 'Id');
    const registrationIdIndex = findColumnIndex(auditHeaders, 'RegistrationId');

    // Find ID column in registration headers (case-insensitive)
    const regIdIndex = findColumnIndex(registrationHeaders, 'Id');

    // Debug: Show what we found
    Logger.log(`   🔍 Looking for required columns...`);
    Logger.log(`      Audit 'Id': ${auditIdIndex === -1 ? '❌ NOT FOUND' : '✅ found at index ' + auditIdIndex}`);
    Logger.log(`      Audit 'RegistrationId': ${registrationIdIndex === -1 ? '❌ NOT FOUND' : '✅ found at index ' + registrationIdIndex}`);
    Logger.log(`      Registration 'Id': ${regIdIndex === -1 ? '❌ NOT FOUND' : '✅ found at index ' + regIdIndex}`);

    if (auditIdIndex === -1 || registrationIdIndex === -1 || regIdIndex === -1) {
      Logger.log(`   ❌ STOPPING: Required columns missing in audit or registration table`);
      Logger.log(`   💡 Audit table first 10 columns: ${auditHeaders.slice(0, 10).join(', ')}`);
      Logger.log(`   💡 Registration table first 10 columns: ${registrationHeaders.slice(0, 10).join(', ')}`);
      return;
    }

    const auditRecords = [];

    Logger.log(`   📊 Processing ${transformedRows.length} transformed rows for audit records...`);
    Logger.log(`   📋 Audit table has ${auditHeaders.length} columns`);
    Logger.log(`   📋 Registration table has ${registrationHeaders.length} columns`);
    Logger.log(`   📋 Audit column indices: Id=${auditIdIndex}, RegistrationId=${registrationIdIndex}`);

    // Log first few audit and registration headers for debugging
    if (auditHeaders.length > 0) {
      Logger.log(`   📋 First 5 audit headers: ${auditHeaders.slice(0, 5).join(', ')}`);
      Logger.log(`   📋 First 5 reg headers: ${registrationHeaders.slice(0, 5).join(', ')}`);
    }

    // Create audit record for each transformed registration
    // IMPORTANT: Use the TRANSFORMED row data (with new ID, formatted times, etc.)
    let copiedFieldsCount = 0;
    for (const transformedRow of transformedRows) {
      // Create audit record matching the registration structure
      const auditRecord = new Array(auditHeaders.length).fill('');

      // Copy all fields from the TRANSFORMED registration row to audit
      // Audit table structure: Id (audit ID), RegistrationId (reg ID), then all registration fields
      let fieldsCopiedThisRow = 0;
      for (let i = 0; i < registrationHeaders.length; i++) {
        const regHeader = registrationHeaders[i];
        // Use case-insensitive lookup
        const auditIdx = findColumnIndex(auditHeaders, regHeader);

        // Copy the transformed value to audit table
        // Skip the Id field (it's used differently in audit: auditIdIndex vs regIdIndex)
        // Skip RegistrationId (we set it separately below)
        if (auditIdx !== -1 && auditIdx !== auditIdIndex && auditIdx !== registrationIdIndex) {
          auditRecord[auditIdx] = transformedRow[i];
          fieldsCopiedThisRow++;
        }
      }
      copiedFieldsCount = fieldsCopiedThisRow; // Track how many fields we're copying

      // Set audit-specific fields
      const newAuditId = this._generateUuid();
      const registrationId = transformedRow[regIdIndex];

      auditRecord[auditIdIndex] = newAuditId; // Unique audit record ID (NEW, not from registration)
      auditRecord[registrationIdIndex] = registrationId; // Reference to registration's ID

      // Note: updatedAt and updatedBy are left BLANK - these track updates, not creation
      // The audit record represents the state at creation time (via CreatedAt/CreatedBy from registration)

      // Debug first record
      if (auditRecords.length === 0) {
        Logger.log(`   🔍 Sample audit record (first one):`);
        Logger.log(`      Audit Id: ${newAuditId.substring(0, 8)}...`);
        Logger.log(`      RegistrationId: ${registrationId ? registrationId.substring(0, 8) + '...' : 'NULL'}`);
        Logger.log(`      StudentId: ${auditRecord[findColumnIndex(auditHeaders, 'StudentId')] || 'not found'}`);
        Logger.log(`      StartTime: ${auditRecord[findColumnIndex(auditHeaders, 'StartTime')] || 'not found'}`);
        Logger.log(`      CreatedAt: ${auditRecord[findColumnIndex(auditHeaders, 'CreatedAt')] || 'not found'}`);
        Logger.log(`      CreatedBy: ${auditRecord[findColumnIndex(auditHeaders, 'CreatedBy')] || 'not found'}`);
      }

      auditRecords.push(auditRecord);
    }

    // Write audit records
    if (auditRecords.length > 0) {
      Logger.log(`   📊 Writing ${auditRecords.length} audit records (${copiedFieldsCount} fields per record)...`);
      const auditDataRange = workingAuditSheet.getRange(2, 1, auditRecords.length, auditHeaders.length);
      auditDataRange.setValues(auditRecords);
      Logger.log(`   ✅ Created ${auditRecords.length} audit records in ${this.workingAuditTable}`);
      Logger.log(`   📋 Audit records contain TRANSFORMED data (new IDs, formatted times, cleared intents)`);
    } else {
      Logger.log(`   ⚠️  No audit records created - auditRecords array is empty!`);
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
