/**
 * Verification Script for UUID Migration
 *
 * This script can be run after the migration to verify everything worked correctly.
 * It checks data integrity, validates UUIDs, and ensures relationships are preserved.
 */

/**
 * Main verification function
 */
function verifyUuidMigration() {
  console.log('🔍 VERIFYING UUID MIGRATION');
  console.log('============================');
  
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const verifier = new UuidMigrationVerifier(spreadsheet);
    
    const results = verifier.runAllChecks();
    
    console.log('\n📊 VERIFICATION SUMMARY:');
    console.log('========================');
    console.log(`✅ Total checks passed: ${results.passed}`);
    console.log(`❌ Total checks failed: ${results.failed}`);
    console.log(`⚠️  Warnings: ${results.warnings}`);
    
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
 * Quick check for UUID format validity
 */
function quickUuidCheck() {
  console.log('⚡ QUICK UUID CHECK');
  console.log('==================');
  
  const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
  const registrationsSheet = spreadsheet.getSheetByName('registrations');
  
  if (!registrationsSheet) {
    console.log('❌ registrations sheet not found');
    return;
  }
  
  const data = registrationsSheet.getDataRange().getValues();
  const headers = data[0];
  const dataRows = data.slice(1);
  
  const idColumnIndex = headers.indexOf('Id');
  let validUuids = 0;
  let invalidUuids = 0;
  
  for (const row of dataRows) {
    if (row.length === 0) continue;
    
    const id = row[idColumnIndex];
    if (isValidUuid(id)) {
      validUuids++;
    } else {
      invalidUuids++;
      console.log(`❌ Invalid UUID: "${id}"`);
    }
  }
  
  console.log(`✅ Valid UUIDs: ${validUuids}`);
  console.log(`❌ Invalid UUIDs: ${invalidUuids}`);
  
  return { validUuids, invalidUuids };
}

/**
 * Comprehensive migration verifier class
 */
class UuidMigrationVerifier {
  constructor(spreadsheet) {
    this.spreadsheet = spreadsheet;
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };
  }
  
  /**
   * Run all verification checks
   */
  runAllChecks() {
    console.log('🔍 Running comprehensive verification...\n');
    
    this.checkRegistrationsTable();
    this.checkAuditTable();
    this.checkDataIntegrity();
    this.checkLegacyIdPreservation();
    this.checkRelationshipIntegrity();
    
    return this.results;
  }
  
  /**
   * Check the main registrations table
   */
  checkRegistrationsTable() {
    console.log('📊 Checking registrations table...');
    
    const sheet = this.spreadsheet.getSheetByName('registrations');
    if (!sheet) {
      this.addResult(false, 'Registrations sheet not found');
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    // Check for required columns
    const hasIdColumn = headers.indexOf('Id') !== -1;
    const hasLegacyIdColumn = headers.indexOf('LegacyId') !== -1;
    
    this.addResult(hasIdColumn, 'Id column exists');
    this.addResult(hasLegacyIdColumn, 'LegacyId column exists');
    
    if (!hasIdColumn) return;
    
    // Check UUID format
    const idColumnIndex = headers.indexOf('Id');
    let validUuids = 0;
    let invalidUuids = 0;
    
    for (const row of dataRows) {
      if (row.length === 0) continue;
      
      const id = row[idColumnIndex];
      if (id && this.isValidUuid(id)) {
        validUuids++;
      } else if (id) {
        invalidUuids++;
      }
    }
    
    this.addResult(invalidUuids === 0, `All registration IDs are valid UUIDs (${validUuids} valid, ${invalidUuids} invalid)`);
    
    console.log(`   ✅ Valid UUIDs: ${validUuids}`);
    if (invalidUuids > 0) {
      console.log(`   ❌ Invalid UUIDs: ${invalidUuids}`);
    }
  }
  
  /**
   * Check the audit table
   */
  checkAuditTable() {
    console.log('📜 Checking registrations_audit table...');
    
    const sheet = this.spreadsheet.getSheetByName('registrations_audit');
    if (!sheet) {
      this.addResult(true, 'Audit table not found (optional)');
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    const idColumnIndex = headers.indexOf('Id');
    const registrationIdColumnIndex = headers.indexOf('RegistrationId');
    
    if (idColumnIndex === -1 || registrationIdColumnIndex === -1) {
      this.addResult(false, 'Required audit columns not found');
      return;
    }
    
    // Check audit UUIDs
    let validAuditUuids = 0;
    let validRegistrationRefs = 0;
    
    for (const row of dataRows) {
      if (row.length === 0) continue;
      
      const auditId = row[idColumnIndex];
      const registrationId = row[registrationIdColumnIndex];
      
      if (auditId && this.isValidUuid(auditId)) {
        validAuditUuids++;
      }
      
      if (registrationId && this.isValidUuid(registrationId)) {
        validRegistrationRefs++;
      }
    }
    
    this.addResult(true, `Audit table processed: ${validAuditUuids} audit UUIDs, ${validRegistrationRefs} registration references`);
  }
  
  /**
   * Check overall data integrity
   */
  checkDataIntegrity() {
    console.log('🔗 Checking data integrity...');
    
    const registrationsSheet = this.spreadsheet.getSheetByName('registrations');
    if (!registrationsSheet) return;
    
    const data = registrationsSheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    // Check for duplicate UUIDs
    const idColumnIndex = headers.indexOf('Id');
    const ids = dataRows.map(row => row[idColumnIndex]).filter(id => id);
    const uniqueIds = new Set(ids);
    
    this.addResult(ids.length === uniqueIds.size, `No duplicate UUIDs (${ids.length} total, ${uniqueIds.size} unique)`);
    
    // Check required fields are present
    const requiredFields = ['StudentId', 'InstructorId', 'Day', 'StartTime'];
    let completeRecords = 0;
    
    for (const row of dataRows) {
      if (row.length === 0) continue;
      
      let isComplete = true;
      for (const field of requiredFields) {
        const fieldIndex = headers.indexOf(field);
        if (fieldIndex === -1 || !row[fieldIndex]) {
          isComplete = false;
          break;
        }
      }
      
      if (isComplete) {
        completeRecords++;
      }
    }
    
    this.addResult(completeRecords === dataRows.filter(row => row.length > 0).length, 
                  `All records have required fields (${completeRecords} complete)`);
  }
  
  /**
   * Check that legacy IDs are preserved
   */
  checkLegacyIdPreservation() {
    console.log('🏛️  Checking legacy ID preservation...');
    
    const sheet = this.spreadsheet.getSheetByName('registrations');
    if (!sheet) return;
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    const legacyIdColumnIndex = headers.indexOf('LegacyId');
    if (legacyIdColumnIndex === -1) {
      this.addResult(false, 'LegacyId column not found');
      return;
    }
    
    let preservedLegacyIds = 0;
    let compositeLegacyIds = 0;
    
    for (const row of dataRows) {
      if (row.length === 0) continue;
      
      const legacyId = row[legacyIdColumnIndex];
      if (legacyId) {
        preservedLegacyIds++;
        
        // Check if it looks like a composite key
        if (legacyId.includes('_')) {
          compositeLegacyIds++;
        }
      }
    }
    
    this.addResult(preservedLegacyIds > 0, `Legacy IDs preserved (${preservedLegacyIds} total, ${compositeLegacyIds} composite)`);
  }
  
  /**
   * Check relationship integrity with other sheets
   */
  checkRelationshipIntegrity() {
    console.log('🔗 Checking relationship integrity...');
    
    const registrationsSheet = this.spreadsheet.getSheetByName('registrations');
    const studentsSheet = this.spreadsheet.getSheetByName('students');
    const instructorsSheet = this.spreadsheet.getSheetByName('instructors');
    
    if (!registrationsSheet) return;
    
    const regData = registrationsSheet.getDataRange().getValues();
    const regHeaders = regData[0];
    const regRows = regData.slice(1);
    
    const studentIdIndex = regHeaders.indexOf('StudentId');
    const instructorIdIndex = regHeaders.indexOf('InstructorId');
    
    if (studentIdIndex === -1 || instructorIdIndex === -1) {
      this.addResult(false, 'Required relationship columns not found');
      return;
    }
    
    // Get valid student and instructor IDs
    let validStudentIds = new Set();
    let validInstructorIds = new Set();
    
    if (studentsSheet) {
      const studentData = studentsSheet.getDataRange().getValues();
      const studentHeaders = studentData[0];
      const studentIdCol = studentHeaders.indexOf('Id');
      if (studentIdCol !== -1) {
        validStudentIds = new Set(studentData.slice(1).map(row => row[studentIdCol]).filter(id => id));
      }
    }
    
    if (instructorsSheet) {
      const instructorData = instructorsSheet.getDataRange().getValues();
      const instructorHeaders = instructorData[0];
      const instructorIdCol = instructorHeaders.indexOf('Id');
      if (instructorIdCol !== -1) {
        validInstructorIds = new Set(instructorData.slice(1).map(row => row[instructorIdCol]).filter(id => id));
      }
    }
    
    // Check relationships
    let validStudentRefs = 0;
    let validInstructorRefs = 0;
    let totalRefs = 0;
    
    for (const row of regRows) {
      if (row.length === 0) continue;
      
      const studentId = row[studentIdIndex];
      const instructorId = row[instructorIdIndex];
      
      if (studentId && instructorId) {
        totalRefs++;
        
        if (validStudentIds.has(studentId)) {
          validStudentRefs++;
        }
        
        if (validInstructorIds.has(instructorId)) {
          validInstructorRefs++;
        }
      }
    }
    
    if (totalRefs > 0) {
      this.addResult(validStudentRefs === totalRefs, `Student relationships intact (${validStudentRefs}/${totalRefs})`);
      this.addResult(validInstructorRefs === totalRefs, `Instructor relationships intact (${validInstructorRefs}/${totalRefs})`);
    } else {
      this.addResult(true, 'No registration relationships to verify');
    }
  }
  
  /**
   * Add a result to the verification
   */
  addResult(success, message) {
    if (success) {
      this.results.passed++;
      console.log(`   ✅ ${message}`);
    } else {
      this.results.failed++;
      console.log(`   ❌ ${message}`);
    }
    
    this.results.details.push({ success, message });
  }
  
  /**
   * Check if string is valid UUID
   */
  isValidUuid(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
}
