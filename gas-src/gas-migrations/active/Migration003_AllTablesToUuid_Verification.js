/**
 * Verification script for Migration 003: All Tables to UUID
 *
 * This script provides comprehensive verification that the UUID migration
 * was successful and all data integrity is maintained.
 *
 * Run this after executing Migration003_AllTablesToUuid
 */

/**
 * Main verification function
 */
function verifyAllTablesUuidMigration() {
  console.log('🔍 Starting comprehensive UUID migration verification...');
  console.log('=======================================================');
  
  const verification = new AllTablesUuidVerification(getSpreadsheetId());
  verification.runVerification();
}

/**
 * Quick verification function for basic checks
 */
function quickVerifyAllTablesUuid() {
  console.log('⚡ Quick UUID verification...');
  
  const verification = new AllTablesUuidVerification(getSpreadsheetId());
  verification.quickVerification();
}

/**
 * Verification class for all tables UUID migration
 */
class AllTablesUuidVerification {
  constructor(spreadsheetId) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.tables = ['admins', 'instructors', 'parents', 'students', 'classes', 'rooms'];
    this.auditTables = ['registrations_audit', 'attendance_audit'];
    this.results = {
      tablesChecked: 0,
      totalRecords: 0,
      validUuids: 0,
      invalidUuids: 0,
      foreignKeyErrors: 0,
      legacyIdsMissing: 0,
      errors: []
    };
  }

  /**
   * Run comprehensive verification
   */
  runVerification() {
    try {
      // Check each main table
      for (const tableName of this.tables) {
        this.verifyTable(tableName);
      }
      
      // Check audit tables (already had UUIDs)
      for (const tableName of this.auditTables) {
        this.verifyAuditTable(tableName);
      }
      
      // Verify foreign key relationships
      this.verifyForeignKeyRelationships();
      
      // Print comprehensive report
      this.printVerificationReport();
      
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      this.results.errors.push(`Verification error: ${error.message}`);
      this.printVerificationReport();
    }
  }

  /**
   * Run quick verification (UUID format only)
   */
  quickVerification() {
    try {
      for (const tableName of this.tables) {
        const result = this.quickCheckTable(tableName);
        console.log(`   ${result.valid ? '✅' : '❌'} ${tableName}: ${result.validCount}/${result.totalCount} valid UUIDs`);
      }
      
      console.log('⚡ Quick verification complete. Run verifyAllTablesUuidMigration() for full verification.');
      
    } catch (error) {
      console.error('❌ Quick verification failed:', error.message);
    }
  }

  /**
   * Verify a main table
   */
  verifyTable(tableName) {
    console.log(`\n📊 Verifying ${tableName} table...`);
    
    const sheet = this.spreadsheet.getSheetByName(tableName);
    if (!sheet) {
      console.log(`   ❌ Sheet not found: ${tableName}`);
      this.results.errors.push(`Sheet not found: ${tableName}`);
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    this.results.tablesChecked++;
    
    // Check for required columns
    const idColumnIndex = headers.indexOf('Id');
    const legacyIdColumnIndex = headers.indexOf('LegacyId');
    
    if (idColumnIndex === -1) {
      console.log(`   ❌ No Id column found`);
      this.results.errors.push(`${tableName}: No Id column found`);
      return;
    }
    
    if (legacyIdColumnIndex === -1) {
      console.log(`   ⚠️  No LegacyId column found (original IDs not preserved)`);
      this.results.legacyIdsMissing++;
    }
    
    // Verify each record
    let tableValidUuids = 0;
    let tableInvalidUuids = 0;
    let tableRecords = 0;
    
    for (const row of dataRows) {
      if (row.length === 0 || !row[idColumnIndex]) continue;
      
      tableRecords++;
      this.results.totalRecords++;
      
      const id = row[idColumnIndex];
      
      if (this.isValidUuid(id)) {
        tableValidUuids++;
        this.results.validUuids++;
      } else {
        tableInvalidUuids++;
        this.results.invalidUuids++;
        this.results.errors.push(`${tableName}: Invalid UUID "${id}"`);
      }
      
      // Check that LegacyId exists if column exists
      if (legacyIdColumnIndex !== -1) {
        const legacyId = row[legacyIdColumnIndex];
        if (!legacyId) {
          this.results.errors.push(`${tableName}: Missing LegacyId for record with UUID "${id}"`);
        }
      }
    }
    
    // Report table results
    if (tableInvalidUuids === 0) {
      console.log(`   ✅ All ${tableValidUuids} IDs are valid UUIDs`);
    } else {
      console.log(`   ❌ ${tableInvalidUuids} invalid UUIDs found (${tableValidUuids} valid)`);
    }
    
    if (legacyIdColumnIndex !== -1) {
      console.log(`   ✅ LegacyId column present for original ID preservation`);
    }
  }

  /**
   * Verify an audit table (should already have UUIDs)
   */
  verifyAuditTable(tableName) {
    console.log(`\n📊 Verifying ${tableName} audit table...`);
    
    const sheet = this.spreadsheet.getSheetByName(tableName);
    if (!sheet) {
      console.log(`   ⚠️  Audit table not found: ${tableName}`);
      return;
    }
    
    const result = this.quickCheckTable(tableName);
    console.log(`   ${result.valid ? '✅' : '❌'} ${result.validCount}/${result.totalCount} valid UUIDs in audit table`);
    
    this.results.validUuids += result.validCount;
    this.results.invalidUuids += (result.totalCount - result.validCount);
    this.results.totalRecords += result.totalCount;
  }

  /**
   * Quick check for UUID format in a table
   */
  quickCheckTable(tableName) {
    const sheet = this.spreadsheet.getSheetByName(tableName);
    if (!sheet) return { valid: false, validCount: 0, totalCount: 0 };
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    const idColumnIndex = headers.indexOf('Id') !== -1 ? headers.indexOf('Id') : headers.indexOf('id');
    if (idColumnIndex === -1) return { valid: false, validCount: 0, totalCount: 0 };
    
    let validCount = 0;
    let totalCount = 0;
    
    for (const row of dataRows) {
      if (row.length === 0 || !row[idColumnIndex]) continue;
      
      totalCount++;
      if (this.isValidUuid(row[idColumnIndex])) {
        validCount++;
      }
    }
    
    return {
      valid: validCount === totalCount && totalCount > 0,
      validCount,
      totalCount
    };
  }

  /**
   * Verify foreign key relationships
   */
  verifyForeignKeyRelationships() {
    console.log(`\n🔗 Verifying foreign key relationships...`);
    
    // Define foreign key relationships to check
    const foreignKeys = {
      students: [
        { column: 'Parent1Id', referencesTable: 'parents', required: false },
        { column: 'Parent2Id', referencesTable: 'parents', required: false }
      ],
      classes: [
        { column: 'InstructorId', referencesTable: 'instructors', required: true }
      ],
      registrations: [
        { column: 'StudentId', referencesTable: 'students', required: true },
        { column: 'InstructorId', referencesTable: 'instructors', required: true },
        { column: 'ClassId', referencesTable: 'classes', required: true },
        { column: 'RoomId', referencesTable: 'rooms', required: false }
      ]
    };
    
    // Get all valid IDs from each table for reference checking
    const tableIds = {};
    for (const tableName of this.tables) {
      tableIds[tableName] = this.getTableIds(tableName);
    }
    
    // Check each foreign key relationship
    Object.entries(foreignKeys).forEach(([tableName, fkDefinitions]) => {
      this.verifyTableForeignKeys(tableName, fkDefinitions, tableIds);
    });
  }

  /**
   * Get all valid IDs from a table
   */
  getTableIds(tableName) {
    const sheet = this.spreadsheet.getSheetByName(tableName);
    if (!sheet) return new Set();
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    const idColumnIndex = headers.indexOf('Id');
    if (idColumnIndex === -1) return new Set();
    
    const ids = new Set();
    for (const row of dataRows) {
      if (row.length > 0 && row[idColumnIndex]) {
        ids.add(row[idColumnIndex]);
      }
    }
    
    return ids;
  }

  /**
   * Verify foreign keys for a specific table
   */
  verifyTableForeignKeys(tableName, foreignKeyDefinitions, tableIds) {
    const sheet = this.spreadsheet.getSheetByName(tableName);
    if (!sheet) return;
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    let fkErrorsCount = 0;
    
    for (const fk of foreignKeyDefinitions) {
      const columnIndex = headers.indexOf(fk.column);
      if (columnIndex === -1) {
        if (fk.required) {
          console.log(`   ❌ ${tableName}.${fk.column}: Required foreign key column not found`);
          fkErrorsCount++;
        }
        continue;
      }
      
      const referencedIds = tableIds[fk.referencesTable];
      if (!referencedIds || referencedIds.size === 0) {
        console.log(`   ❌ ${tableName}.${fk.column}: Referenced table ${fk.referencesTable} has no valid IDs`);
        fkErrorsCount++;
        continue;
      }
      
      let invalidReferences = 0;
      let totalReferences = 0;
      
      for (const row of dataRows) {
        if (row.length === 0) continue;
        
        const foreignKeyValue = row[columnIndex];
        if (!foreignKeyValue) {
          if (fk.required) {
            invalidReferences++;
          }
          continue;
        }
        
        totalReferences++;
        if (!referencedIds.has(foreignKeyValue)) {
          invalidReferences++;
          this.results.errors.push(`${tableName}.${fk.column}: Invalid reference "${foreignKeyValue}" (not found in ${fk.referencesTable})`);
        }
      }
      
      if (invalidReferences === 0) {
        console.log(`   ✅ ${tableName}.${fk.column}: All ${totalReferences} references valid`);
      } else {
        console.log(`   ❌ ${tableName}.${fk.column}: ${invalidReferences} invalid references`);
        fkErrorsCount += invalidReferences;
      }
    }
    
    this.results.foreignKeyErrors += fkErrorsCount;
  }

  /**
   * Print comprehensive verification report
   */
  printVerificationReport() {
    console.log('\n📊 UUID Migration Verification Report');
    console.log('====================================');
    
    // Summary statistics
    console.log(`\n📈 Summary Statistics:`);
    console.log(`   - Tables checked: ${this.results.tablesChecked}`);
    console.log(`   - Total records: ${this.results.totalRecords}`);
    console.log(`   - Valid UUIDs: ${this.results.validUuids}`);
    console.log(`   - Invalid UUIDs: ${this.results.invalidUuids}`);
    console.log(`   - Foreign key errors: ${this.results.foreignKeyErrors}`);
    console.log(`   - Tables missing LegacyId: ${this.results.legacyIdsMissing}`);
    
    // Overall status
    const hasErrors = this.results.invalidUuids > 0 || this.results.foreignKeyErrors > 0 || this.results.errors.length > 0;
    
    if (hasErrors) {
      console.log(`\n❌ VERIFICATION FAILED`);
      console.log(`   Migration has issues that need to be addressed.`);
    } else {
      console.log(`\n✅ VERIFICATION PASSED`);
      console.log(`   All UUIDs are valid and foreign key relationships are intact.`);
    }
    
    // Detailed errors
    if (this.results.errors.length > 0) {
      console.log(`\n❗ Detailed Errors (${this.results.errors.length}):`);
      this.results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    // Recommendations
    console.log(`\n💡 Recommendations:`);
    if (hasErrors) {
      console.log(`   - Review and fix errors listed above`);
      console.log(`   - Consider rolling back migration if critical errors exist`);
      console.log(`   - Run rollbackAllTablesToUuidMigration() if needed`);
    } else {
      console.log(`   - Migration verification successful!`);
      console.log(`   - All systems can proceed with UUID-based operations`);
      if (this.results.legacyIdsMissing > 0) {
        console.log(`   - Some tables missing LegacyId columns (original IDs not preserved)`);
      }
    }
  }

  /**
   * Check if a string is a valid UUID v4
   */
  isValidUuid(str) {
    if (!str || typeof str !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
}
