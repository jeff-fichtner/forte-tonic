/**
 * Google Apps Script Development Migration: Rebuild Registration Audit Table
 *
 * This development migration completely wipes the registrations_audit table
 * and rebuilds it based on the current registrations table, creating audit
 * records as if they were properly added during the original registration process.
 *
 * Purpose:
 * - Clean up inconsistent or missing audit records
 * - Ensure every registration has a corresponding audit trail
 * - Standardize audit record format and data
 * - Provide a clean baseline for future audit functionality
 *
 * Process:
 * 1. Backup existing registrations_audit table
 * 2. Clear all data from registrations_audit (keeping headers)
 * 3. Read all records from registrations table
 * 4. Generate proper audit records for each registration
 * 5. Insert rebuilt audit records with consistent formatting
 *
 * Audit Record Structure:
 * - id: Unique audit ID (UUID)
 * - registration_id: Foreign key to registrations table
 * - action: 'INSERT' (since we're simulating initial creation)
 * - timestamp: Current timestamp (simulating when it was "originally" created)
 * - user: 'SYSTEM_REBUILD' (indicating this was a system rebuild)
 * - old_values: {} (empty for INSERT actions)
 * - new_values: Complete registration record data
 *
 * ⚠️  DEVELOPMENT ONLY - This should not be run in production
 *
 * To use:
 * 1. Open your Google Sheets document
 * 2. Go to Extensions > Apps Script
 * 3. Copy this file content into a new .gs file
 * 4. Configure spreadsheet ID in Config.js
 * 5. Run preview first: previewRebuildRegistrationAudit()
 * 6. Run migration: runRebuildRegistrationAudit()
 */

/**
 * Main function to execute the registration audit rebuild
 */
function runRebuildRegistrationAudit() {
  const migration = new RebuildRegistrationAuditMigration(getSpreadsheetId());
  migration.execute();
}

/**
 * Preview function to check what changes would be made
 * Run this first to see what the migration will do
 */
function previewRebuildRegistrationAudit() {
  const migration = new RebuildRegistrationAuditMigration(getSpreadsheetId());
  migration.preview();
}

/**
 * Development Migration Class: Rebuild Registration Audit Table
 */
class RebuildRegistrationAuditMigration {
  constructor(spreadsheetId) {
    this.spreadsheetId = spreadsheetId;
    this.description = 'Rebuild registrations_audit table from current registrations';
    this.migrationId = 'Migration_DEV003_RebuildRegistrationAudit';
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.changes = {
      auditRecordsRemoved: 0,
      auditRecordsCreated: 0,
      registrationsProcessed: 0
    };
  }

  /**
   * Execute the migration
   */
  execute() {
    console.log(`🚀 Starting Migration: ${this.description}`);
    console.log(`📋 Migration ID: ${this.migrationId}`);
    
    console.log('⚠️  DEV MIGRATION: This is a development-only migration');

    try {
      // Create backup
      this.createBackup();
      
      // Execute migration steps
      this.analyzeCurrentState();
      this.clearAuditTable();
      this.rebuildAuditRecords();
      
      // Report results
      console.log('\n📊 Migration completed successfully!');
      console.log(`   - Audit records removed: ${this.changes.auditRecordsRemoved}`);
      console.log(`   - Registrations processed: ${this.changes.registrationsProcessed}`);
      console.log(`   - New audit records created: ${this.changes.auditRecordsCreated}`);
      
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      console.log('🔄 Consider restoring from backup if needed');
      throw error;
    }
  }

  /**
   * Preview the migration without making changes
   */
  preview() {
    console.log(`🔍 Previewing Migration: ${this.description}`);
    console.log(`📋 Migration ID: ${this.migrationId}`);
    
    try {
      // Show table structure information
      this.showTableStructure();
      
      this.analyzeCurrentState();
      
      console.log('\n📊 Preview Summary:');
      console.log(`   - Current audit records: ${this.changes.auditRecordsRemoved}`);
      console.log(`   - Registrations to process: ${this.changes.registrationsProcessed}`);
      console.log(`   - New audit records to create: ${this.changes.registrationsProcessed}`);
      console.log('\n✅ Preview completed - run execute() to apply changes');
      
    } catch (error) {
      console.error('❌ Preview failed:', error.message);
      throw error;
    }
  }

  /**
   * Show the structure of relevant tables for debugging
   */
  showTableStructure() {
    console.log('\n🔍 TABLE STRUCTURE ANALYSIS');
    console.log('============================');
    
    const registrationsSheet = this.spreadsheet.getSheetByName('registrations');
    const auditSheet = this.spreadsheet.getSheetByName('registrations_audit');
    
    if (registrationsSheet) {
      const regData = registrationsSheet.getDataRange().getValues();
      const regHeaders = regData[0];
      console.log(`\n📋 Registrations Table (${regData.length - 1} records):`);
      console.log(`   Columns: ${regHeaders.join(', ')}`);
      
      // Check for ID columns specifically
      const idColumns = regHeaders.filter(header => 
        header.toLowerCase().includes('id') || 
        header.endsWith('Id') || 
        header.endsWith('ID')
      );
      console.log(`   ID columns found: ${idColumns.join(', ')}`);
    } else {
      console.log('\n❌ Registrations table not found!');
    }
    
    if (auditSheet) {
      const auditData = auditSheet.getDataRange().getValues();
      const auditHeaders = auditData[0];
      console.log(`\n📜 Registrations Audit Table (${auditData.length - 1} records):`);
      console.log(`   Columns: ${auditHeaders.join(', ')}`);
    } else {
      console.log('\n❌ Registrations audit table not found!');
    }
  }

  /**
   * Analyze current state of registrations and audit tables
   */
  analyzeCurrentState() {
    console.log('\n🔍 Analyzing current table state...');
    
    // Check registrations table
    const registrationsSheet = this.spreadsheet.getSheetByName('registrations');
    if (!registrationsSheet) {
      throw new Error('registrations sheet not found');
    }
    
    const registrationsData = registrationsSheet.getDataRange().getValues();
    const registrationsCount = registrationsData.length - 1; // Exclude header
    this.changes.registrationsProcessed = registrationsCount;
    
    // Check audit table
    const auditSheet = this.spreadsheet.getSheetByName('registrations_audit');
    if (!auditSheet) {
      throw new Error('registrations_audit sheet not found');
    }
    
    const auditData = auditSheet.getDataRange().getValues();
    const auditCount = auditData.length - 1; // Exclude header
    this.changes.auditRecordsRemoved = auditCount;
    
    console.log(`   - Current registrations: ${registrationsCount}`);
    console.log(`   - Current audit records: ${auditCount}`);
    
    // Store headers for later use
    this.registrationsHeaders = registrationsData[0];
    this.auditHeaders = auditData[0];
    
    console.log('✅ Analysis complete');
  }

  /**
   * Clear the audit table but keep headers
   */
  clearAuditTable() {
    console.log('\n🧹 Clearing registrations_audit table...');
    
    const auditSheet = this.spreadsheet.getSheetByName('registrations_audit');
    const lastRow = auditSheet.getLastRow();
    
    if (lastRow > 1) {
      // Clear all data except headers (row 1)
      const range = auditSheet.getRange(2, 1, lastRow - 1, auditSheet.getLastColumn());
      range.clear();
      console.log(`   - Cleared ${lastRow - 1} audit records`);
    } else {
      console.log('   - Audit table was already empty');
    }
    
    console.log('✅ Audit table cleared');
  }

  /**
   * Rebuild audit records from current registrations
   */
  rebuildAuditRecords() {
    console.log('\n🔨 Rebuilding audit records...');
    
    const registrationsSheet = this.spreadsheet.getSheetByName('registrations');
    const auditSheet = this.spreadsheet.getSheetByName('registrations_audit');
    
    // Get all registrations data
    const registrationsData = registrationsSheet.getDataRange().getValues();
    const dataRows = registrationsData.slice(1); // Skip headers
    
    // Find column indices for registrations
    const regHeaders = this.registrationsHeaders;
    
    // Try different variations of ID column name
    let idIndex = regHeaders.indexOf('id');
    if (idIndex === -1) {
      idIndex = regHeaders.indexOf('Id');
    }
    if (idIndex === -1) {
      idIndex = regHeaders.indexOf('ID');
    }
    if (idIndex === -1) {
      // Try to find a column that might be an ID (contains 'id' or ends with 'Id')
      idIndex = regHeaders.findIndex(header => 
        header.toLowerCase().includes('id') || 
        header.endsWith('Id') || 
        header.endsWith('ID')
      );
    }
    
    if (idIndex === -1) {
      console.log('Available columns in registrations table:', regHeaders);
      throw new Error('No ID column found in registrations table. Available columns: ' + regHeaders.join(', '));
    }
    
    console.log(`Using ID column: "${regHeaders[idIndex]}" at index ${idIndex}`);
    
    // Find column indices for audit table
    const auditHeaders = this.auditHeaders;
    
    // Try different variations for audit table columns too
    let auditIdIndex = auditHeaders.indexOf('id');
    if (auditIdIndex === -1) {
      auditIdIndex = auditHeaders.indexOf('Id');
    }
    if (auditIdIndex === -1) {
      auditIdIndex = auditHeaders.indexOf('ID');
    }
    
    let registrationIdIndex = auditHeaders.indexOf('registration_id');
    if (registrationIdIndex === -1) {
      registrationIdIndex = auditHeaders.indexOf('RegistrationId');
    }
    if (registrationIdIndex === -1) {
      registrationIdIndex = auditHeaders.indexOf('registrationId');
    }
    
    const actionIndex = auditHeaders.indexOf('action') !== -1 ? auditHeaders.indexOf('action') : auditHeaders.indexOf('Action');
    const timestampIndex = auditHeaders.indexOf('timestamp') !== -1 ? auditHeaders.indexOf('timestamp') : auditHeaders.indexOf('Timestamp');
    const userIndex = auditHeaders.indexOf('user') !== -1 ? auditHeaders.indexOf('user') : auditHeaders.indexOf('User');
    const oldValuesIndex = auditHeaders.indexOf('old_values') !== -1 ? auditHeaders.indexOf('old_values') : auditHeaders.indexOf('OldValues');
    const newValuesIndex = auditHeaders.indexOf('new_values') !== -1 ? auditHeaders.indexOf('new_values') : auditHeaders.indexOf('NewValues');
    
    // Validate audit table structure with flexible column names
    const columnMappings = {
      'audit_id': auditIdIndex,
      'registration_id': registrationIdIndex,
      'action': actionIndex,
      'timestamp': timestampIndex,
      'user': userIndex,
      'old_values': oldValuesIndex,
      'new_values': newValuesIndex
    };
    
    const missingColumns = Object.entries(columnMappings)
      .filter(([name, index]) => index === -1)
      .map(([name]) => name);
    
    if (missingColumns.length > 0) {
      console.log('Available audit columns:', auditHeaders);
      throw new Error(`Missing required audit columns: ${missingColumns.join(', ')}. Available columns: ${auditHeaders.join(', ')}`);
    }
    
    // Prepare audit records
    const auditRecords = [];
    const currentTimestamp = new Date().toISOString();
    
    dataRows.forEach((row, index) => {
      const registrationId = row[idIndex];
      
      if (!registrationId) {
        console.log(`⚠️  Skipping row ${index + 2}: missing registration ID`);
        return;
      }
      
      // Create registration object for new_values
      const registrationObject = {};
      regHeaders.forEach((header, i) => {
        registrationObject[header] = row[i];
      });
      
      // Create audit record
      const auditRecord = new Array(auditHeaders.length).fill('');
      auditRecord[auditIdIndex] = this.generateUUID();
      auditRecord[registrationIdIndex] = registrationId;
      auditRecord[actionIndex] = 'INSERT';
      auditRecord[timestampIndex] = currentTimestamp;
      auditRecord[userIndex] = 'SYSTEM_REBUILD';
      auditRecord[oldValuesIndex] = '{}'; // Empty object for INSERT
      auditRecord[newValuesIndex] = JSON.stringify(registrationObject);
      
      auditRecords.push(auditRecord);
    });
    
    // Insert audit records in batches
    if (auditRecords.length > 0) {
      const batchSize = 100;
      let inserted = 0;
      
      for (let i = 0; i < auditRecords.length; i += batchSize) {
        const batch = auditRecords.slice(i, i + batchSize);
        const startRow = auditSheet.getLastRow() + 1;
        
        const range = auditSheet.getRange(startRow, 1, batch.length, auditHeaders.length);
        range.setValues(batch);
        
        inserted += batch.length;
        console.log(`   - Inserted batch: ${inserted}/${auditRecords.length} audit records`);
      }
      
      this.changes.auditRecordsCreated = inserted;
      console.log(`✅ Created ${inserted} audit records`);
    } else {
      console.log('⚠️  No audit records to create');
    }
  }

  /**
   * Create backup before migration
   */
  createBackup() {
    try {
      const backupResult = createMigrationBackup(this.migrationId, ['registrations_audit']);
      console.log(`✅ Backup created: ${backupResult.backupPrefix}`);
      return backupResult;
    } catch (error) {
      console.error('⚠️  Backup creation failed:', error.message);
      console.log('Continuing with migration (backup recommended but not required)');
    }
  }

  /**
   * Generate a UUID v4
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Rollback the migration by restoring from backup
   */
  rollback() {
    console.log(`🔄 Rolling back migration: ${this.migrationId}`);
    try {
      const result = restoreFromBackup(this.migrationId);
      if (result.success) {
        console.log('✅ Rollback completed successfully');
      } else {
        console.log('❌ Rollback failed:', result.error);
      }
      return result;
    } catch (error) {
      console.error('❌ Rollback error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

/**
 * Rollback function for this migration
 */
function rollbackRebuildRegistrationAudit() {
  const migration = new RebuildRegistrationAuditMigration(getSpreadsheetId());
  return migration.rollback();
}
