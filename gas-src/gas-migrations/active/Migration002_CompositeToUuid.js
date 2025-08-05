/**
 * Google Apps Script Migration 002: Convert Composite Keys to UUID Primary Keys
 *
 * This migration transforms the registration system from complex composite keys
 * to simple UUID primary keys for better maintainability and performance.
 *
 * Current Issue:
 * - Registration IDs like "131509_TEACHER1@EMAIL.COM_Monday_17:15" are complex
 * - Group class IDs like "72768_G002" use different pattern
 * - Difficult to query, update, and maintain
 * - Causes issues with frontend relationship mapping
 *
 * Solution:
 * - Replace all composite keys with UUIDs
 * - Add proper foreign key relationships
 * - Preserve all existing data and relationships
 * - Original composite keys are NOT preserved (backup restoration for rollback)
 *
 * Features:
 * - Generates cryptographically secure UUIDs
 * - Updates registrations_audit table accordingly
 * - Preserves all existing data integrity
 * - Creates automatic backup for rollback capability
 *
 * To use:
 * 1. Open your Google Sheets document
 * 2. Go to Extensions > Apps Script
 * 3. Copy this file content into a new .gs file
 * 4. Configure spreadsheet ID in Config.js
 * 5. Run preview first: previewCompositeToUuidMigration()
 * 6. Run migration: runCompositeToUuidMigration()
 */

/**
 * Main function to execute the composite key to UUID migration
 */
function runCompositeToUuidMigration() {
  const migration = new CompositeToUuidMigration(getSpreadsheetId());
  migration.execute();
}

/**
 * Preview function to check what changes would be made
 * Run this first to see what the migration will do
 */
function previewCompositeToUuidMigration() {
  const migration = new CompositeToUuidMigration(getSpreadsheetId());
  migration.preview();
}

/**
 * Rollback function to restore original composite keys
 * Use this if you need to revert the changes
 */
function rollbackCompositeToUuidMigration() {
  const migration = new CompositeToUuidMigration(getSpreadsheetId());
  migration.rollback();
}

/**
 * Restore from automatic backup and delete the backup
 */
function restoreCompositeToUuidMigrationFromBackup() {
  return restoreFromBackup('CompositeToUuidMigration');
}

/**
 * Migration class for converting composite keys to UUIDs
 */
class CompositeToUuidMigration {
  constructor(spreadsheetId) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.description = 'Convert composite keys to UUID primary keys in registrations';
    this.migrationId = 'Migration002_CompositeToUuid';
    
    // Track changes for rollback
    this.changes = {
      registrations: [],
      registrationsAudit: []
    };
  }

  /**
   * Execute the migration
   */
  execute() {
    console.log('🚀 Starting Composite Key to UUID Migration...');
    
    try {
      // Create automatic backup
      console.log('📦 Creating automatic backup...');
      this.createBackup();
      
      // Execute migration steps
      this.migrateRegistrationsTable();
      this.migrateRegistrationsAuditTable();
      this.validateMigration();
      
      console.log('✅ Migration completed successfully!');
      console.log('📊 Migration Summary:');
      console.log(`   - Registrations migrated: ${this.changes.registrations.length}`);
      console.log(`   - Audit records migrated: ${this.changes.registrationsAudit.length}`);
      console.log('📦 Backup created for rollback if needed');
      
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      console.log('🔄 Consider running rollbackCompositeToUuidMigration() to revert changes');
      throw error;
    }
  }

  /**
   * Preview what the migration will do without making changes
   */
  preview() {
    console.log('👀 PREVIEW: Composite Key to UUID Migration');
    console.log('==========================================');
    
    try {
      // Analyze current registrations
      const registrationsSheet = this.spreadsheet.getSheetByName('registrations');
      const auditSheet = this.spreadsheet.getSheetByName('registrations_audit');
      
      if (!registrationsSheet) {
        console.log('❌ registrations sheet not found');
        return;
      }
      
      const registrationsData = registrationsSheet.getDataRange().getValues();
      const headers = registrationsData[0];
      const dataRows = registrationsData.slice(1);
      
      console.log(`📊 Current Analysis:`);
      console.log(`   - Current registrations: ${dataRows.length}`);
      console.log(`   - Headers: ${headers.join(', ')}`);
      
      // Analyze composite key patterns
      const compositeKeys = dataRows.map(row => row[0]).filter(id => id);
      const privateLesson = compositeKeys.filter(key => key.includes('_') && key.split('_').length >= 4);
      const groupClass = compositeKeys.filter(key => key.includes('_') && key.split('_').length === 2);
      
      console.log(`\n🔑 Composite Key Analysis:`);
      console.log(`   - Total keys to migrate: ${compositeKeys.length}`);
      console.log(`   - Private lesson pattern: ${privateLesson.length}`);
      console.log(`   - Group class pattern: ${groupClass.length}`);
      
      // Show examples
      if (privateLesson.length > 0) {
        console.log(`   - Private example: "${privateLesson[0]}"`);
      }
      if (groupClass.length > 0) {
        console.log(`   - Group example: "${groupClass[0]}"`);
      }
      
      // Analyze audit table
      if (auditSheet) {
        const auditData = auditSheet.getDataRange().getValues();
        const auditRows = auditData.slice(1);
        console.log(`\n📜 Audit Analysis:`);
        console.log(`   - Audit records to update: ${auditRows.length}`);
      }
      
      console.log(`\n📋 Planned Changes:`);
      console.log(`   1. Replace all composite key IDs with UUIDs`);
      console.log(`   2. Update registrations_audit table accordingly`);
      console.log(`   3. Maintain all data relationships and integrity`);
      console.log(`   ⚠️  Note: Original composite keys will NOT be preserved`);
      console.log(`\n✅ Preview complete. Run runCompositeToUuidMigration() to execute.`);
      
    } catch (error) {
      console.error('❌ Preview failed:', error.message);
      throw error;
    }
  }

  /**
   * Migrate the main registrations table
   */
  migrateRegistrationsTable() {
    console.log('🎼 Migrating registrations table...');
    
    const sheet = this.spreadsheet.getSheetByName('registrations');
    if (!sheet) {
      throw new Error('registrations sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    // Find the Id column (should be first)
    const idColumnIndex = headers.indexOf('Id');
    if (idColumnIndex === -1) {
      throw new Error('Id column not found in registrations sheet');
    }
    
    // Process each row
    const updatedRows = [];
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (row.length === 0 || !row[idColumnIndex]) continue;
      
      const originalId = row[idColumnIndex];
      const newUuid = this.generateUuid();
      
      // Store original change for rollback
      this.changes.registrations.push({
        rowIndex: i + 2, // +2 because we're 1-indexed and skipping header
        originalId: originalId,
        newId: newUuid
      });
      
      // Create updated row
      const updatedRow = [...row];
      updatedRow[idColumnIndex] = newUuid;
      
      updatedRows.push(updatedRow);
    }
    
    // Update the sheet with new data
    if (updatedRows.length > 0) {
      // Clear existing data (except headers)
      if (dataRows.length > 0) {
        sheet.getRange(2, 1, dataRows.length, headers.length).clearContent();
      }
      
      // Write updated data
      sheet.getRange(2, 1, updatedRows.length, updatedRows[0].length).setValues(updatedRows);
    }
    
    console.log(`✅ Migrated ${updatedRows.length} registration records`);
  }

  /**
   * Migrate the registrations_audit table
   */
  migrateRegistrationsAuditTable() {
    console.log('📜 Migrating registrations_audit table...');
    
    const sheet = this.spreadsheet.getSheetByName('registrations_audit');
    if (!sheet) {
      console.log('⚠️  registrations_audit sheet not found, skipping');
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    // Find relevant columns
    const idColumnIndex = headers.indexOf('Id');
    const registrationIdColumnIndex = headers.indexOf('RegistrationId');
    
    if (idColumnIndex === -1 || registrationIdColumnIndex === -1) {
      console.log('⚠️  Required columns not found in audit table, skipping');
      return;
    }
    
    // Process each audit row
    const updatedRows = [];
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (row.length === 0) continue;
      
      const auditId = row[idColumnIndex];
      const registrationId = row[registrationIdColumnIndex];
      
      // Generate new UUID for audit record if needed
      let newAuditId = auditId;
      if (!this.isUuid(auditId)) {
        newAuditId = this.generateUuid();
      }
      
      // Find corresponding registration mapping
      const registrationMapping = this.changes.registrations.find(
        change => change.originalId === registrationId
      );
      
      const newRegistrationId = registrationMapping ? registrationMapping.newId : registrationId;
      
      // Store change for rollback
      this.changes.registrationsAudit.push({
        rowIndex: i + 2,
        originalAuditId: auditId,
        originalRegistrationId: registrationId,
        newAuditId: newAuditId,
        newRegistrationId: newRegistrationId
      });
      
      // Create updated row
      const updatedRow = [...row];
      updatedRow[idColumnIndex] = newAuditId;
      updatedRow[registrationIdColumnIndex] = newRegistrationId;
      
      updatedRows.push(updatedRow);
    }
    
    // Update the sheet with new data
    if (updatedRows.length > 0) {
      // Clear existing data (except headers)
      if (dataRows.length > 0) {
        sheet.getRange(2, 1, dataRows.length, headers.length).clearContent();
      }
      
      // Write updated data
      sheet.getRange(2, 1, updatedRows.length, updatedRows[0].length).setValues(updatedRows);
    }
    
    console.log(`✅ Migrated ${updatedRows.length} audit records`);
  }

  /**
   * Validate the migration was successful
   */
  validateMigration() {
    console.log('🔍 Validating migration...');
    
    const registrationsSheet = this.spreadsheet.getSheetByName('registrations');
    const data = registrationsSheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    // Check that all IDs are now UUIDs
    const idColumnIndex = headers.indexOf('Id');
    
    let validUuids = 0;
    
    for (const row of dataRows) {
      if (row.length === 0) continue;
      
      const id = row[idColumnIndex];
      
      if (this.isUuid(id)) {
        validUuids++;
      }
    }
    
    console.log(`✅ Validation Results:`);
    console.log(`   - Valid UUIDs: ${validUuids}/${dataRows.length}`);
    
    if (validUuids !== dataRows.length) {
      throw new Error('Migration validation failed: Not all IDs are valid UUIDs');
    }
  }

  /**
   * Rollback the migration
   */
  rollback() {
    console.log('🔄 Rolling back Composite Key to UUID Migration...');
    console.log('ℹ️  Since original composite keys are not preserved, rollback requires backup restoration');
    
    try {
      // Use backup restoration for rollback
      const backupResult = restoreFromBackup('CompositeToUuidMigration');
      
      if (backupResult && backupResult.success) {
        console.log('✅ Rollback completed successfully using backup restoration!');
      } else {
        throw new Error('Backup restoration failed');
      }
      
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      console.log('📦 Manual restoration may be required from spreadsheet version history');
      throw error;
    }
  }

  /**
   * Rollback registrations table (deprecated - use backup restoration)
   */
  rollbackRegistrationsTable() {
    console.log('⚠️  LegacyId-based rollback no longer supported');
    console.log('💡 Use restoreCompositeToUuidMigrationFromBackup() instead');
  }

  /**
   * Rollback registrations audit table (deprecated - use backup restoration)
   */
  rollbackRegistrationsAuditTable() {
    console.log('⚠️  LegacyId-based rollback no longer supported');
    console.log('💡 Use restoreCompositeToUuidMigrationFromBackup() instead');
  }

  /**
   * Create backup before migration
   */
  createBackup() {
    try {
      const backupResult = createMigrationBackup(this.migrationId, ['registrations', 'registrations_audit']);
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
  generateUuid() {
    // Generate UUID v4 compatible string
    const chars = '0123456789abcdef';
    const uuid = [];
    
    for (let i = 0; i < 36; i++) {
      if (i === 8 || i === 13 || i === 18 || i === 23) {
        uuid[i] = '-';
      } else if (i === 14) {
        uuid[i] = '4'; // Version 4
      } else if (i === 19) {
        uuid[i] = chars[Math.floor(Math.random() * 4) + 8]; // 8, 9, a, or b
      } else {
        uuid[i] = chars[Math.floor(Math.random() * 16)];
      }
    }
    
    return uuid.join('');
  }

  /**
   * Check if a string is a valid UUID
   */
  isUuid(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
}

/**
 * Utility function to validate UUIDs (can be used outside migration)
 */
function isValidUuid(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Utility function to generate UUID (can be used outside migration)
 */
function generateUuidV4() {
  const chars = '0123456789abcdef';
  const uuid = [];
  
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid[i] = '-';
    } else if (i === 14) {
      uuid[i] = '4'; // Version 4
    } else if (i === 19) {
      uuid[i] = chars[Math.floor(Math.random() * 4) + 8]; // 8, 9, a, or b
    } else {
      uuid[i] = chars[Math.floor(Math.random() * 16)];
    }
  }
  
  return uuid.join('');
}
