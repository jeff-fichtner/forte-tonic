/**
 * Google Apps Script Migration 003: Convert All Tables to UUID Primary Keys
 *
 * 🎯 PURPOSE:
 * This migration converts all remaining tables to use UUID primary keys
 * for consistency across the entire system.
 *
 * 📋 TABLES TO MIGRATE:
 * - admins: Email-based IDs → UUIDs (e.g., email@example.com → uuid)
 * - instructors: Email-based IDs → UUIDs (e.g., instructor.email@example.com → uuid)
 * - parents: Composite email-name IDs → UUIDs (e.g., parent_email_john_doe → uuid)
 * - students: Numeric IDs → UUIDs (e.g., 12345 → uuid)
 * - classes: Alphanumeric codes → UUIDs (e.g., CLASS_ABC_2024 → uuid)
 * - rooms: Alphanumeric codes → UUIDs (e.g., ROOM_101 → uuid)
 *
 * ✅ FEATURES:
 * - Dependency-Aware Migration: Tables migrated in correct order for foreign keys
 * - Original ID Preservation: All original IDs preserved in LegacyId columns
 * - Foreign Key Updates: All references automatically updated to new UUIDs
 * - Comprehensive Validation: Ensures all UUIDs are properly formatted
 * - Full Rollback Support: Complete rollback capability with original ID restoration
 *
 * 🔄 MIGRATION STEPS:
 * 1. Create automatic backup of all affected tables
 * 2. Migrate tables in dependency order (rooms → instructors → parents → students → classes → admins)
 * 3. Update all foreign key references throughout the system
 * 4. Validate all UUIDs and relationships
 * 5. Provide comprehensive summary and verification
 *
 * 🚀 TO USE:
 * 1. Set spreadsheet ID in Config.js: const SPREADSHEET_ID = "your-id";
 * 2. Deploy with clasp push
 * 3. Run preview first: previewAllTablesToUuidMigration()
 * 4. Run migration: runAllTablesToUuidMigration()
 * 5. Verify results: verifyAllTablesUuidMigration()
 */

/**
 * Main function to execute the all tables to UUID migration
 */
function runAllTablesToUuidMigration() {
  const migration = new AllTablesToUuidMigration();
  migration.execute();
}

/**
 * Preview function to check what changes would be made
 */
function previewAllTablesToUuidMigration() {
  const migration = new AllTablesToUuidMigration();
  migration.preview();
}

/**
 * Rollback function to restore original IDs
 */
function rollbackAllTablesToUuidMigration() {
  const migration = new AllTablesToUuidMigration();
  migration.rollback();
}

/**
 * Restore from automatic backup and delete the backup
 */
function restoreAllTablesToUuidMigrationFromBackup() {
  return restoreFromBackup('Migration003_AllTablesToUuid');
}

/**
 * Comprehensive verification function for all tables UUID migration
 */
function verifyAllTablesUuidMigration() {
  console.log('🔍 VERIFYING ALL TABLES UUID MIGRATION');
  console.log('======================================');
  
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const verifier = new AllTablesUuidMigrationVerifier(spreadsheet);
    
    const results = verifier.runAllChecks();
    
    console.log('\n📊 VERIFICATION SUMMARY:');
    console.log('========================');
    console.log(`✅ Total checks passed: ${results.passed}`);
    console.log(`❌ Total checks failed: ${results.failed}`);
    console.log(`⚠️  Warnings: ${results.warnings}`);
    console.log(`📋 Tables checked: ${results.tablesChecked}`);
    console.log(`📊 Total records: ${results.totalRecords}`);
    console.log(`🔑 Valid UUIDs: ${results.validUuids}`);
    
    if (results.failed === 0) {
      console.log('\n🎉 Migration verification PASSED! All systems go.');
    } else {
      console.log('\n❌ Migration verification FAILED. Please review the issues above.');
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    throw error;
  }
}

/**
 * Quick verification function for basic checks
 */
function quickVerifyAllTablesUuid() {
  console.log('⚡ QUICK ALL TABLES UUID CHECK');
  console.log('==============================');
  
  const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
  const tables = ['admins', 'instructors', 'parents', 'students', 'classes', 'rooms'];
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  let totalValid = 0;
  let totalInvalid = 0;
  
  for (const tableName of tables) {
    const sheet = spreadsheet.getSheetByName(tableName);
    if (!sheet) {
      console.log(`⚠️  ${tableName} table not found`);
      continue;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('id') !== -1 ? headers.indexOf('id') : headers.indexOf('Id');
    
    if (idIndex === -1) {
      console.log(`❌ ${tableName}: No ID column found`);
      continue;
    }
    
    const sampleSize = Math.min(5, data.length - 1);
    let validCount = 0;
    
    for (let i = 1; i <= sampleSize; i++) {
      const id = data[i][idIndex];
      if (uuidRegex.test(id)) {
        validCount++;
        totalValid++;
      } else {
        totalInvalid++;
      }
    }
    
    console.log(`${tableName}: ${validCount}/${sampleSize} valid UUIDs`);
  }
  
  console.log(`\n📊 Quick check results: ${totalValid} valid, ${totalInvalid} invalid UUIDs`);
  return totalInvalid === 0;
}

/**
 * Migration class for converting all tables to UUIDs
 */
class AllTablesToUuidMigration {
  constructor() {
    this.spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    this.description = 'Convert all tables to UUID primary keys';
    this.migrationId = 'Migration003_AllTablesToUuid';
    
    // Define migration order based on dependencies
    this.migrationOrder = ['rooms', 'instructors', 'parents', 'students', 'classes', 'admins'];
    
    // Track changes for rollback
    this.changes = {};
    this.migrationOrder.forEach(table => {
      this.changes[table] = [];
    });
  }

  /**
   * Execute the migration
   */
  execute() {
    console.log('🚀 EXECUTING MIGRATION: All Tables to UUID');
    console.log('==========================================');

    // Create automatic backup before starting
    console.log('📦 Creating automatic backup...');
    const backupResult = createMigrationBackup(this.migrationId, this.migrationOrder);
    
    if (!backupResult.success) {
      console.error('❌ Failed to create backup, aborting migration');
      throw new Error(`Backup failed: ${backupResult.error}`);
    }
    
    console.log('✅ Backup created successfully');

    try {
      // Execute migration steps
      this.analyzeCurrentState();
      this.executeTableMigrations();
      this.updateForeignKeys();
      this.validateMigration();
      
      console.log('\n✅ Migration completed successfully!');
      console.log('📊 Migration Summary:');
      this.migrationOrder.forEach(table => {
        console.log(`   - ${table}: ${this.changes[table].length} records migrated`);
      });
      
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
    console.log('🔍 PREVIEWING MIGRATION: All Tables to UUID');
    console.log('============================================');
    
    try {
      this.analyzeCurrentState();
      
      console.log('\n📊 Preview Summary:');
      console.log('===================');
      console.log('✅ Preview completed - no changes made');
      console.log('📝 Run execute() to apply the migration');
      
    } catch (error) {
      console.error('❌ Preview failed:', error.message);
      throw error;
    }
  }

  /**
   * Analyze current state before migration
   */
  analyzeCurrentState() {
    console.log('\n📊 Analyzing current state...');
    
    let totalRecords = 0;
    
    for (const tableName of this.migrationOrder) {
      const sheet = this.spreadsheet.getSheetByName(tableName);
      if (!sheet) {
        console.log(`⚠️  ${tableName} sheet not found, skipping`);
        continue;
      }
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const dataRows = data.slice(1);
      
      console.log(`\n📋 ${tableName} Table:`);
      console.log(`   - Records: ${dataRows.length}`);
      console.log(`   - Headers: ${headers.join(', ')}`);
      
      // Check current ID format
      const idIndex = headers.indexOf('id') !== -1 ? headers.indexOf('id') : headers.indexOf('Id');
      if (idIndex !== -1 && dataRows.length > 0) {
        const sampleIds = dataRows.slice(0, 2).map(row => row[idIndex]);
        console.log(`   - Sample IDs: ${sampleIds.join(', ')}`);
      }
      
      totalRecords += dataRows.length;
    }
    
    console.log(`\n📊 Total records to migrate: ${totalRecords}`);
  }

  /**
   * Execute migrations for all tables in dependency order
   */
  executeTableMigrations() {
    console.log('\n🔄 Executing table migrations...');
    
    for (const tableName of this.migrationOrder) {
      this.migrateTable(tableName);
    }
  }

  /**
   * Migrate a specific table
   */
  migrateTable(tableName) {
    console.log(`\n📋 Migrating ${tableName} table...`);
    
    const sheet = this.spreadsheet.getSheetByName(tableName);
    if (!sheet) {
      console.log(`⚠️  ${tableName} sheet not found, skipping`);
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    // Find ID column
    const idIndex = headers.indexOf('id') !== -1 ? headers.indexOf('id') : headers.indexOf('Id');
    if (idIndex === -1) {
      console.log(`⚠️  ID column not found in ${tableName}, skipping`);
      return;
    }
    
    // Check if LegacyId column exists, if not add it
    let legacyIdIndex = headers.indexOf('LegacyId');
    if (legacyIdIndex === -1) {
      headers.push('LegacyId');
      legacyIdIndex = headers.length - 1;
      // Update headers in sheet
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    // Process each row
    const updatedRows = [];
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (row.length === 0) continue;
      
      const originalId = row[idIndex];
      const newId = this.generateUuid();
      
      // Store change for rollback
      this.changes[tableName].push({
        rowIndex: i + 2,
        originalId: originalId,
        newId: newId
      });
      
      // Create updated row
      const updatedRow = [...row];
      // Extend row if necessary for LegacyId column
      while (updatedRow.length < headers.length) {
        updatedRow.push('');
      }
      
      updatedRow[idIndex] = newId;
      updatedRow[legacyIdIndex] = originalId;
      
      updatedRows.push(updatedRow);
    }
    
    // Update the sheet with new data
    if (updatedRows.length > 0) {
      // Clear existing data (except headers)
      if (dataRows.length > 0) {
        sheet.getRange(2, 1, dataRows.length, Math.max(headers.length, updatedRows[0].length)).clearContent();
      }
      
      // Write updated data
      sheet.getRange(2, 1, updatedRows.length, updatedRows[0].length).setValues(updatedRows);
    }
    
    console.log(`✅ Migrated ${updatedRows.length} ${tableName} records`);
  }

  /**
   * Update foreign key references throughout the system
   */
  updateForeignKeys() {
    console.log('\n🔗 Updating foreign key references...');
    
    // Update student parent references
    this.updateStudentParentReferences();
    
    // Update class instructor and room references
    this.updateClassReferences();
    
    // Update any registration references (if they exist)
    this.updateRegistrationReferences();
    
    console.log('✅ Foreign key updates completed');
  }

  /**
   * Update student parent references
   */
  updateStudentParentReferences() {
    const studentsSheet = this.spreadsheet.getSheetByName('students');
    if (!studentsSheet) return;
    
    const data = studentsSheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    const parent1Index = headers.indexOf('Parent1Id');
    const parent2Index = headers.indexOf('Parent2Id');
    
    if (parent1Index === -1 && parent2Index === -1) return;
    
    // Get parent ID mappings
    const parentMappings = this.getIdMappings('parents');
    
    // Update references
    let updatesCount = 0;
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      let updated = false;
      
      if (parent1Index !== -1 && row[parent1Index] && parentMappings[row[parent1Index]]) {
        row[parent1Index] = parentMappings[row[parent1Index]];
        updated = true;
      }
      
      if (parent2Index !== -1 && row[parent2Index] && parentMappings[row[parent2Index]]) {
        row[parent2Index] = parentMappings[row[parent2Index]];
        updated = true;
      }
      
      if (updated) {
        updatesCount++;
        studentsSheet.getRange(i + 2, 1, 1, row.length).setValues([row]);
      }
    }
    
    console.log(`   - Updated ${updatesCount} student parent references`);
  }

  /**
   * Update class instructor and room references
   */
  updateClassReferences() {
    const classesSheet = this.spreadsheet.getSheetByName('classes');
    if (!classesSheet) return;
    
    const data = classesSheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    const instructorIndex = headers.indexOf('InstructorId');
    const roomIndex = headers.indexOf('RoomId');
    
    if (instructorIndex === -1 && roomIndex === -1) return;
    
    // Get mappings
    const instructorMappings = this.getIdMappings('instructors');
    const roomMappings = this.getIdMappings('rooms');
    
    // Update references
    let updatesCount = 0;
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      let updated = false;
      
      if (instructorIndex !== -1 && row[instructorIndex] && instructorMappings[row[instructorIndex]]) {
        row[instructorIndex] = instructorMappings[row[instructorIndex]];
        updated = true;
      }
      
      if (roomIndex !== -1 && row[roomIndex] && roomMappings[row[roomIndex]]) {
        row[roomIndex] = roomMappings[row[roomIndex]];
        updated = true;
      }
      
      if (updated) {
        updatesCount++;
        classesSheet.getRange(i + 2, 1, 1, row.length).setValues([row]);
      }
    }
    
    console.log(`   - Updated ${updatesCount} class references`);
  }

  /**
   * Update registration references if they exist
   */
  updateRegistrationReferences() {
    const registrationsSheet = this.spreadsheet.getSheetByName('registrations');
    if (!registrationsSheet) return;
    
    const data = registrationsSheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    // Get all table mappings
    const studentMappings = this.getIdMappings('students');
    const classMappings = this.getIdMappings('classes');
    const instructorMappings = this.getIdMappings('instructors');
    const roomMappings = this.getIdMappings('rooms');
    
    // Find relevant columns
    const updateColumns = {};
    if (headers.indexOf('StudentId') !== -1) updateColumns.StudentId = studentMappings;
    if (headers.indexOf('ClassId') !== -1) updateColumns.ClassId = classMappings;
    if (headers.indexOf('InstructorId') !== -1) updateColumns.InstructorId = instructorMappings;
    if (headers.indexOf('RoomId') !== -1) updateColumns.RoomId = roomMappings;
    
    let updatesCount = 0;
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      let updated = false;
      
      Object.entries(updateColumns).forEach(([columnName, mappings]) => {
        const columnIndex = headers.indexOf(columnName);
        if (columnIndex !== -1 && row[columnIndex] && mappings[row[columnIndex]]) {
          row[columnIndex] = mappings[row[columnIndex]];
          updated = true;
        }
      });
      
      if (updated) {
        updatesCount++;
        registrationsSheet.getRange(i + 2, 1, 1, row.length).setValues([row]);
      }
    }
    
    if (updatesCount > 0) {
      console.log(`   - Updated ${updatesCount} registration references`);
    }
  }

  /**
   * Get ID mappings for a table (original ID → new UUID)
   */
  getIdMappings(tableName) {
    const mappings = {};
    const changes = this.changes[tableName] || [];
    
    changes.forEach(change => {
      mappings[change.originalId] = change.newId;
    });
    
    return mappings;
  }

  /**
   * Validate the migration
   */
  validateMigration() {
    console.log('\n✅ Validating migration...');
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let totalValid = 0;
    let totalInvalid = 0;
    
    for (const tableName of this.migrationOrder) {
      const sheet = this.spreadsheet.getSheetByName(tableName);
      if (!sheet) continue;
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const dataRows = data.slice(1);
      
      const idIndex = headers.indexOf('id') !== -1 ? headers.indexOf('id') : headers.indexOf('Id');
      if (idIndex === -1) continue;
      
      let validCount = 0;
      let invalidCount = 0;
      
      for (const row of dataRows) {
        const id = row[idIndex];
        if (id && uuidRegex.test(id)) {
          validCount++;
          totalValid++;
        } else if (id) {
          invalidCount++;
          totalInvalid++;
        }
      }
      
      console.log(`   - ${tableName}: ${validCount} valid UUIDs, ${invalidCount} invalid`);
    }
    
    if (totalInvalid > 0) {
      throw new Error(`Validation failed: ${totalInvalid} invalid UUIDs found`);
    }
    
    console.log(`✅ Validation passed: ${totalValid} valid UUIDs`);
  }

  /**
   * Rollback the migration (restore from backup)
   */
  rollback() {
    console.log('🔄 Rolling back All Tables to UUID Migration...');
    
    try {
      const restoreResult = restoreFromBackup('Migration003_AllTablesToUuid');
      
      if (restoreResult.success) {
        console.log('✅ Rollback completed successfully');
        console.log(`📊 Restored ${restoreResult.restoredSheets} sheets from backup`);
      } else {
        console.error('❌ Rollback failed:', restoreResult.error);
      }
      
      return restoreResult;
      
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate a UUID v4
   */
  generateUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

/**
 * Verification class for all tables UUID migration
 */
class AllTablesUuidMigrationVerifier {
  constructor() {
    this.options = {
      spreadsheetId: getSpreadsheetId(),
      migrationId: 'Migration003_AllTablesToUuid',
      description: 'Convert all tables to UUID primary keys'
    };
    this.spreadsheet = SpreadsheetApp.openById(this.options.spreadsheetId);
    this.description = this.options.description;
    this.migrationId = this.options.migrationId;
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tablesChecked: 0,
      totalRecords: 0,
      validUuids: 0,
      invalidUuids: 0,
      foreignKeyErrors: 0,
      legacyIdsMissing: 0,
      errors: []
    };
    // ...existing code...
  }

  /**
   * Run all verification checks
   */
  runAllChecks() {
    console.log('Starting comprehensive verification...\n');
    
    this.checkTableStructures();
    this.checkUuidFormat();
    this.checkLegacyIds();
    this.checkForeignKeys();
    this.checkDataIntegrity();
    
    return this.results;
  }

  /**
   * Check table structures
   */
  checkTableStructures() {
    console.log('📋 Checking table structures...');
    
    for (const tableName of this.tables) {
      const sheet = this.spreadsheet.getSheetByName(tableName);
      if (!sheet) {
        console.log(`⚠️  ${tableName} table not found`);
        this.results.warnings++;
        continue;
      }
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const dataRows = data.slice(1);
      
      this.results.tablesChecked++;
      this.results.totalRecords += dataRows.length;
      
      // Check for ID column
      const idIndex = headers.indexOf('id') !== -1 ? headers.indexOf('id') : headers.indexOf('Id');
      if (idIndex === -1) {
        console.log(`❌ ${tableName}: ID column not found`);
        this.results.failed++;
        continue;
      }
      
      // Check for LegacyId column
      const legacyIdIndex = headers.indexOf('LegacyId');
      if (legacyIdIndex === -1) {
        console.log(`⚠️  ${tableName}: LegacyId column not found`);
        this.results.warnings++;
      }
      
      console.log(`✅ ${tableName}: ${dataRows.length} records, structure OK`);
      this.results.passed++;
    }
  }

  /**
   * Check UUID format validity
   */
  checkUuidFormat() {
    console.log('\n🔍 Checking UUID format validity...');
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    for (const tableName of this.tables) {
      const sheet = this.spreadsheet.getSheetByName(tableName);
      if (!sheet) continue;
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const dataRows = data.slice(1);
      
      const idIndex = headers.indexOf('id') !== -1 ? headers.indexOf('id') : headers.indexOf('Id');
      if (idIndex === -1) continue;
      
      let validCount = 0;
      let invalidCount = 0;
      
      for (let i = 0; i < dataRows.length; i++) {
        const id = dataRows[i][idIndex];
        if (id && uuidRegex.test(id)) {
          validCount++;
          this.results.validUuids++;
        } else if (id) {
          invalidCount++;
          this.results.invalidUuids++;
          if (invalidCount <= 3) {
            console.log(`❌ ${tableName} row ${i + 2}: Invalid UUID "${id}"`);
          }
        }
      }
      
      if (invalidCount > 0) {
        console.log(`❌ ${tableName}: ${invalidCount} invalid UUIDs`);
        this.results.failed++;
      } else {
        console.log(`✅ ${tableName}: ${validCount} valid UUIDs`);
        this.results.passed++;
      }
    }
  }

  /**
   * Check legacy IDs are preserved
   */
  checkLegacyIds() {
    console.log('\n📜 Checking legacy ID preservation...');
    
    for (const tableName of this.tables) {
      const sheet = this.spreadsheet.getSheetByName(tableName);
      if (!sheet) continue;
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const dataRows = data.slice(1);
      
      const legacyIdIndex = headers.indexOf('LegacyId');
      if (legacyIdIndex === -1) {
        console.log(`⚠️  ${tableName}: No LegacyId column`);
        this.results.warnings++;
        continue;
      }
      
      let missingCount = 0;
      for (const row of dataRows) {
        if (!row[legacyIdIndex]) {
          missingCount++;
        }
      }
      
      if (missingCount > 0) {
        console.log(`⚠️  ${tableName}: ${missingCount} missing legacy IDs`);
        this.results.legacyIdsMissing += missingCount;
        this.results.warnings++;
      } else {
        console.log(`✅ ${tableName}: All legacy IDs preserved`);
        this.results.passed++;
      }
    }
  }

  /**
   * Check foreign key relationships
   */
  checkForeignKeys() {
    console.log('\n🔗 Checking foreign key relationships...');
    
    // Check student-parent relationships
    this.checkStudentParentReferences();
    
    // Check class-instructor relationships
    this.checkClassInstructorReferences();
    
    // Check class-room relationships
    this.checkClassRoomReferences();
  }

  /**
   * Check student parent references
   */
  checkStudentParentReferences() {
    const studentsSheet = this.spreadsheet.getSheetByName('students');
    const parentsSheet = this.spreadsheet.getSheetByName('parents');
    
    if (!studentsSheet || !parentsSheet) return;
    
    const studentsData = studentsSheet.getDataRange().getValues();
    const parentsData = parentsSheet.getDataRange().getValues();
    
    const studentHeaders = studentsData[0];
    const parentHeaders = parentsData[0];
    
    const parent1Index = studentHeaders.indexOf('Parent1Id');
    const parent2Index = studentHeaders.indexOf('Parent2Id');
    const parentIdIndex = parentHeaders.indexOf('id') !== -1 ? parentHeaders.indexOf('id') : parentHeaders.indexOf('Id');
    
    if ((parent1Index === -1 && parent2Index === -1) || parentIdIndex === -1) return;
    
    // Build parent ID set
    const parentIds = new Set();
    parentsData.slice(1).forEach(row => {
      if (row[parentIdIndex]) {
        parentIds.add(row[parentIdIndex]);
      }
    });
    
    // Check student references
    let errorCount = 0;
    studentsData.slice(1).forEach((row, index) => {
      if (parent1Index !== -1 && row[parent1Index] && !parentIds.has(row[parent1Index])) {
        console.log(`❌ Student row ${index + 2}: Parent1Id "${row[parent1Index]}" not found`);
        errorCount++;
      }
      if (parent2Index !== -1 && row[parent2Index] && !parentIds.has(row[parent2Index])) {
        console.log(`❌ Student row ${index + 2}: Parent2Id "${row[parent2Index]}" not found`);
        errorCount++;
      }
    });
    
    if (errorCount > 0) {
      console.log(`❌ Student-Parent: ${errorCount} foreign key errors`);
      this.results.foreignKeyErrors += errorCount;
      this.results.failed++;
    } else {
      console.log('✅ Student-Parent: All foreign keys valid');
      this.results.passed++;
    }
  }

  /**
   * Check class instructor references
   */
  checkClassInstructorReferences() {
    const classesSheet = this.spreadsheet.getSheetByName('classes');
    const instructorsSheet = this.spreadsheet.getSheetByName('instructors');
    
    if (!classesSheet || !instructorsSheet) return;
    
    const classesData = classesSheet.getDataRange().getValues();
    const instructorsData = instructorsSheet.getDataRange().getValues();
    
    const classHeaders = classesData[0];
    const instructorHeaders = instructorsData[0];
    
    const instructorIndex = classHeaders.indexOf('InstructorId');
    const instructorIdIndex = instructorHeaders.indexOf('id') !== -1 ? instructorHeaders.indexOf('id') : instructorHeaders.indexOf('Id');
    
    if (instructorIndex === -1 || instructorIdIndex === -1) return;
    
    // Build instructor ID set
    const instructorIds = new Set();
    instructorsData.slice(1).forEach(row => {
      if (row[instructorIdIndex]) {
        instructorIds.add(row[instructorIdIndex]);
      }
    });
    
    // Check class references
    let errorCount = 0;
    classesData.slice(1).forEach((row, index) => {
      if (row[instructorIndex] && !instructorIds.has(row[instructorIndex])) {
        console.log(`❌ Class row ${index + 2}: InstructorId "${row[instructorIndex]}" not found`);
        errorCount++;
      }
    });
    
    if (errorCount > 0) {
      console.log(`❌ Class-Instructor: ${errorCount} foreign key errors`);
      this.results.foreignKeyErrors += errorCount;
      this.results.failed++;
    } else {
      console.log('✅ Class-Instructor: All foreign keys valid');
      this.results.passed++;
    }
  }

  /**
   * Check class room references
   */
  checkClassRoomReferences() {
    const classesSheet = this.spreadsheet.getSheetByName('classes');
    const roomsSheet = this.spreadsheet.getSheetByName('rooms');
    
    if (!classesSheet || !roomsSheet) return;
    
    const classesData = classesSheet.getDataRange().getValues();
    const roomsData = roomsSheet.getDataRange().getValues();
    
    const classHeaders = classesData[0];
    const roomHeaders = roomsData[0];
    
    const roomIndex = classHeaders.indexOf('RoomId');
    const roomIdIndex = roomHeaders.indexOf('id') !== -1 ? roomHeaders.indexOf('id') : roomHeaders.indexOf('Id');
    
    if (roomIndex === -1 || roomIdIndex === -1) return;
    
    // Build room ID set
    const roomIds = new Set();
    roomsData.slice(1).forEach(row => {
      if (row[roomIdIndex]) {
        roomIds.add(row[roomIdIndex]);
      }
    });
    
    // Check class references
    let errorCount = 0;
    classesData.slice(1).forEach((row, index) => {
      if (row[roomIndex] && !roomIds.has(row[roomIndex])) {
        console.log(`❌ Class row ${index + 2}: RoomId "${row[roomIndex]}" not found`);
        errorCount++;
      }
    });
    
    if (errorCount > 0) {
      console.log(`❌ Class-Room: ${errorCount} foreign key errors`);
      this.results.foreignKeyErrors += errorCount;
      this.results.failed++;
    } else {
      console.log('✅ Class-Room: All foreign keys valid');
      this.results.passed++;
    }
  }

  /**
   * Check overall data integrity
   */
  checkDataIntegrity() {
    console.log('\n🔐 Checking data integrity...');
    
    // Check for duplicate UUIDs across all tables
    const allUuids = new Set();
    let duplicateCount = 0;
    
    for (const tableName of this.tables) {
      const sheet = this.spreadsheet.getSheetByName(tableName);
      if (!sheet) continue;
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const dataRows = data.slice(1);
      
      const idIndex = headers.indexOf('id') !== -1 ? headers.indexOf('id') : headers.indexOf('Id');
      if (idIndex === -1) continue;
      
      for (const row of dataRows) {
        const id = row[idIndex];
        if (id) {
          if (allUuids.has(id)) {
            console.log(`❌ Duplicate UUID found: ${id} in ${tableName}`);
            duplicateCount++;
          } else {
            allUuids.add(id);
          }
        }
      }
    }
    
    if (duplicateCount > 0) {
      console.log(`❌ Found ${duplicateCount} duplicate UUIDs across all tables`);
      this.results.failed++;
    } else {
      console.log('✅ No duplicate UUIDs found across all tables');
      this.results.passed++;
    }
    
    console.log(`📊 Total unique UUIDs: ${allUuids.size}`);
  }
}
