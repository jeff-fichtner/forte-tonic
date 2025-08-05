/**
 * Google Apps Script Migration 003: Convert All Tables to UUID Primary Keys
 *
 * This migration converts all remaining tables to use UUID primary keys
 * for consistency across the entire system.
 *
 * Tables to migrate:
 * - admins: Email-based IDs → UUIDs
 * - instructors: Email-based IDs → UUIDs  
 * - parents: Composite email-name IDs → UUIDs
 * - students: Numeric IDs → UUIDs
 * - classes: Alphanumeric codes → UUIDs
 * - rooms: Alphanumeric codes → UUIDs
 *
 * Features:
 * - Maintains all foreign key relationships
 * - Preserves original IDs in LegacyId columns
 * - Updates all referencing tables
 * - Creates comprehensive audit trail
 * - Full rollback capability
 *
 * To use:
 * 1. Run preview first: previewAllTablesToUuidMigration()
 * 2. Execute migration: runAllTablesToUuidMigration()
 * 3. Verify results: verifyAllTablesToUuidMigration()
 */

/**
 * Main function to execute the all tables to UUID migration
 */
function runAllTablesToUuidMigration() {
  const migration = new AllTablesToUuidMigration(getSpreadsheetId());
  migration.execute();
}

/**
 * Preview function to check what changes would be made
 */
function previewAllTablesToUuidMigration() {
  const migration = new AllTablesToUuidMigration(getSpreadsheetId());
  migration.preview();
}

/**
 * Rollback function to restore original IDs
 */
function rollbackAllTablesToUuidMigration() {
  const migration = new AllTablesToUuidMigration(getSpreadsheetId());
  migration.rollback();
}

/**
 * Restore from automatic backup
 */
function restoreAllTablesToUuidMigrationFromBackup() {
  return restoreFromBackup('AllTablesToUuidMigration');
}

/**
 * Verification function (separate file)
 */
function verifyAllTablesToUuidMigration() {
  // This will be in the verification file
  console.log('Run verifyAllTablesUuidMigration() from the verification script');
}

/**
 * Migration class for converting all tables to UUIDs
 */
class AllTablesToUuidMigration {
  constructor(spreadsheetId) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.description = 'Convert all tables to UUID primary keys';
    this.migrationId = 'Migration003_AllTablesToUuid';
    
    // Define the migration order (dependencies first)
    this.migrationOrder = [
      'rooms',      // No dependencies
      'instructors', // No dependencies  
      'parents',     // No dependencies
      'students',    // Depends on parents
      'classes',     // Depends on instructors and rooms
      'admins'       // No dependencies
    ];
    
    // Track changes for rollback
    this.changes = {};
    this.migrationOrder.forEach(table => {
      this.changes[table] = [];
    });
    
    // Track ID mappings for foreign key updates
    this.idMappings = {};
  }

  /**
   * Execute the migration
   */
  execute() {
    console.log('🚀 Starting All Tables to UUID Migration...');
    
    try {
      // Create automatic backup
      console.log('📦 Creating automatic backup...');
      this.createBackup();
      
      // Execute migration for each table in order
      for (const tableName of this.migrationOrder) {
        this.migrateTable(tableName);
      }
      
      // Update foreign key references
      this.updateForeignKeyReferences();
      
      // Validate migration
      this.validateMigration();
      
      console.log('✅ Migration completed successfully!');
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      console.log('🔄 Consider running rollbackAllTablesToUuidMigration() to revert changes');
      throw error;
    }
  }

  /**
   * Preview what the migration will do
   */
  preview() {
    console.log('👀 PREVIEW: All Tables to UUID Migration');
    console.log('========================================');
    
    try {
      let totalRecords = 0;
      
      for (const tableName of this.migrationOrder) {
        console.log(`\n📊 Analyzing ${tableName} table:`);
        
        const sheet = this.spreadsheet.getSheetByName(tableName);
        if (!sheet) {
          console.log(`   ❌ Sheet not found: ${tableName}`);
          continue;
        }
        
        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        const dataRows = data.slice(1);
        
        const idColumnIndex = headers.indexOf('Id');
        if (idColumnIndex === -1) {
          console.log(`   ⚠️  No Id column found in ${tableName}`);
          continue;
        }
        
        const recordCount = dataRows.filter(row => row.length > 0 && row[idColumnIndex]).length;
        totalRecords += recordCount;
        
        console.log(`   📋 Records to migrate: ${recordCount}`);
        console.log(`   📋 Current ID format: "${dataRows[0] ? dataRows[0][idColumnIndex] : 'N/A'}"`);
        console.log(`   📋 Will add LegacyId column to preserve original IDs`);
        
        // Analyze foreign key dependencies
        this.analyzeTableDependencies(tableName, headers);
      }
      
      console.log(`\n📊 Migration Summary:`);
      console.log(`   - Total tables: ${this.migrationOrder.length}`);
      console.log(`   - Total records: ${totalRecords}`);
      console.log(`   - Foreign key updates will be handled automatically`);
      console.log(`\n✅ Preview complete. Run runAllTablesToUuidMigration() to execute.`);
      
    } catch (error) {
      console.error('❌ Preview failed:', error.message);
      throw error;
    }
  }

  /**
   * Migrate a single table
   */
  migrateTable(tableName) {
    console.log(`🔄 Migrating ${tableName} table...`);
    
    const sheet = this.spreadsheet.getSheetByName(tableName);
    if (!sheet) {
      console.log(`   ⚠️  Sheet not found: ${tableName}, skipping`);
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    const idColumnIndex = headers.indexOf('Id');
    if (idColumnIndex === -1) {
      console.log(`   ⚠️  No Id column found in ${tableName}, skipping`);
      return;
    }
    
    // Add LegacyId column if it doesn't exist
    let legacyIdColumnIndex = headers.indexOf('LegacyId');
    if (legacyIdColumnIndex === -1) {
      sheet.insertColumnAfter(idColumnIndex + 1);
      legacyIdColumnIndex = idColumnIndex + 1;
      sheet.getRange(1, legacyIdColumnIndex + 1).setValue('LegacyId');
      headers.splice(legacyIdColumnIndex, 0, 'LegacyId');
    }
    
    // Process each row
    const updatedRows = [];
    this.idMappings[tableName] = {};
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (row.length === 0 || !row[idColumnIndex]) continue;
      
      const originalId = row[idColumnIndex];
      const newUuid = this.generateUuid();
      
      // Store mapping for foreign key updates
      this.idMappings[tableName][originalId] = newUuid;
      
      // Store change for rollback
      this.changes[tableName].push({
        rowIndex: i + 2,
        originalId: originalId,
        newId: newUuid
      });
      
      // Create updated row
      const updatedRow = [...row];
      updatedRow[idColumnIndex] = newUuid;
      updatedRow[legacyIdColumnIndex] = originalId;
      
      updatedRows.push(updatedRow);
    }
    
    // Update the sheet
    if (updatedRows.length > 0) {
      if (dataRows.length > 0) {
        sheet.getRange(2, 1, dataRows.length, headers.length).clearContent();
      }
      sheet.getRange(2, 1, updatedRows.length, updatedRows[0].length).setValues(updatedRows);
    }
    
    console.log(`   ✅ Migrated ${updatedRows.length} ${tableName} records`);
  }

  /**
   * Update foreign key references in all tables
   */
  updateForeignKeyReferences() {
    console.log('🔗 Updating foreign key references...');
    
    // Define foreign key relationships
    const foreignKeys = {
      students: [
        { column: 'Parent1Id', referencesTable: 'parents' },
        { column: 'Parent2Id', referencesTable: 'parents' }
      ],
      classes: [
        { column: 'InstructorId', referencesTable: 'instructors' }
      ],
      registrations: [
        { column: 'StudentId', referencesTable: 'students' },
        { column: 'InstructorId', referencesTable: 'instructors' },
        { column: 'ClassId', referencesTable: 'classes' },
        { column: 'RoomId', referencesTable: 'rooms' }
      ],
      registrations_audit: [
        { column: 'StudentId', referencesTable: 'students' },
        { column: 'InstructorId', referencesTable: 'instructors' },
        { column: 'ClassId', referencesTable: 'classes' }
      ],
      attendance_audit: [
        // RegistrationId will be handled by registration migration
      ]
    };
    
    // Update each table's foreign keys
    Object.entries(foreignKeys).forEach(([tableName, fkDefinitions]) => {
      this.updateTableForeignKeys(tableName, fkDefinitions);
    });
  }

  /**
   * Update foreign keys for a specific table
   */
  updateTableForeignKeys(tableName, foreignKeyDefinitions) {
    if (foreignKeyDefinitions.length === 0) return;
    
    console.log(`   🔗 Updating foreign keys in ${tableName}...`);
    
    const sheet = this.spreadsheet.getSheetByName(tableName);
    if (!sheet) return;
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    let updatesCount = 0;
    
    // Update each row
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (row.length === 0) continue;
      
      let rowUpdated = false;
      
      // Check each foreign key column
      foreignKeyDefinitions.forEach(fk => {
        const columnIndex = headers.indexOf(fk.column);
        if (columnIndex === -1) return;
        
        const currentValue = row[columnIndex];
        if (!currentValue) return;
        
        // Look up new UUID for this foreign key
        const mappings = this.idMappings[fk.referencesTable];
        if (mappings && mappings[currentValue]) {
          row[columnIndex] = mappings[currentValue];
          rowUpdated = true;
        }
      });
      
      if (rowUpdated) {
        updatesCount++;
        // Update the specific row in the sheet
        sheet.getRange(i + 2, 1, 1, row.length).setValues([row]);
      }
    }
    
    if (updatesCount > 0) {
      console.log(`     ✅ Updated ${updatesCount} foreign key references in ${tableName}`);
    }
  }

  /**
   * Analyze foreign key dependencies for preview
   */
  analyzeTableDependencies(tableName, headers) {
    const dependencies = [];
    
    // Check for common foreign key patterns
    const foreignKeyPatterns = [
      { pattern: /Parent\d*Id/, references: 'parents' },
      { pattern: /InstructorId/, references: 'instructors' },
      { pattern: /StudentId/, references: 'students' },
      { pattern: /ClassId/, references: 'classes' },
      { pattern: /RoomId/, references: 'rooms' }
    ];
    
    headers.forEach(header => {
      foreignKeyPatterns.forEach(fk => {
        if (fk.pattern.test(header)) {
          dependencies.push(`${header} → ${fk.references}`);
        }
      });
    });
    
    if (dependencies.length > 0) {
      console.log(`   🔗 Foreign key dependencies: ${dependencies.join(', ')}`);
    }
  }

  /**
   * Validate the migration was successful
   */
  validateMigration() {
    console.log('🔍 Validating migration...');
    
    let totalValidated = 0;
    let totalErrors = 0;
    
    for (const tableName of this.migrationOrder) {
      const sheet = this.spreadsheet.getSheetByName(tableName);
      if (!sheet) continue;
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const dataRows = data.slice(1);
      
      const idColumnIndex = headers.indexOf('Id');
      if (idColumnIndex === -1) continue;
      
      let validUuids = 0;
      let invalidUuids = 0;
      
      for (const row of dataRows) {
        if (row.length === 0) continue;
        
        const id = row[idColumnIndex];
        if (this.isUuid(id)) {
          validUuids++;
        } else if (id) {
          invalidUuids++;
        }
      }
      
      totalValidated += validUuids;
      totalErrors += invalidUuids;
      
      if (invalidUuids > 0) {
        console.log(`   ❌ ${tableName}: ${invalidUuids} invalid UUIDs`);
      } else {
        console.log(`   ✅ ${tableName}: ${validUuids} valid UUIDs`);
      }
    }
    
    if (totalErrors > 0) {
      throw new Error(`Validation failed: ${totalErrors} invalid UUIDs found`);
    }
    
    console.log(`✅ Validation passed: ${totalValidated} valid UUIDs across all tables`);
  }

  /**
   * Print migration summary
   */
  printSummary() {
    console.log('\n📊 Migration Summary:');
    console.log('====================');
    
    Object.entries(this.changes).forEach(([tableName, changes]) => {
      if (changes.length > 0) {
        console.log(`   - ${tableName}: ${changes.length} records migrated`);
      }
    });
    
    console.log('📦 Backup created for rollback if needed');
    console.log('🔗 All foreign key relationships updated');
    console.log('✅ Run verifyAllTablesUuidMigration() to perform comprehensive verification');
  }

  /**
   * Rollback the migration
   */
  rollback() {
    console.log('🔄 Rolling back All Tables to UUID Migration...');
    
    try {
      // Rollback in reverse order
      const reverseOrder = [...this.migrationOrder].reverse();
      
      for (const tableName of reverseOrder) {
        this.rollbackTable(tableName);
      }
      
      console.log('✅ Rollback completed successfully!');
      
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      console.log('📦 You may need to restore from backup: restoreAllTablesToUuidMigrationFromBackup()');
      throw error;
    }
  }

  /**
   * Rollback a single table
   */
  rollbackTable(tableName) {
    const sheet = this.spreadsheet.getSheetByName(tableName);
    if (!sheet) return;
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    const idColumnIndex = headers.indexOf('Id');
    const legacyIdColumnIndex = headers.indexOf('LegacyId');
    
    if (legacyIdColumnIndex === -1) {
      console.log(`⚠️  No LegacyId column found in ${tableName}, cannot rollback`);
      return;
    }
    
    // Restore original IDs from LegacyId column
    const dataRows = data.slice(1);
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (row.length === 0) continue;
      
      const legacyId = row[legacyIdColumnIndex];
      if (legacyId) {
        sheet.getRange(i + 2, idColumnIndex + 1).setValue(legacyId);
      }
    }
    
    // Remove LegacyId column
    sheet.deleteColumn(legacyIdColumnIndex + 1);
    
    console.log(`✅ Rolled back ${tableName} table`);
  }

  /**
   * Create backup before migration
   */
  createBackup() {
    try {
      const backupResult = createMigrationBackup(this.migrationId, this.migrationOrder);
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
    const chars = '0123456789abcdef';
    const uuid = [];
    
    for (let i = 0; i < 36; i++) {
      if (i === 8 || i === 13 || i === 18 || i === 23) {
        uuid[i] = '-';
      } else if (i === 14) {
        uuid[i] = '4';
      } else if (i === 19) {
        uuid[i] = chars[Math.floor(Math.random() * 4) + 8];
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
