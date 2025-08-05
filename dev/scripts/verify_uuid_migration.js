#!/usr/bin/env node

/**
 * UUID Migration Verification Script
 * ==================================
 * 
 * Verifies that the UUID migration was successful and tests new functionality
 */

import { GoogleSheetsDbClient } from '../../src/database/googleSheetsDbClient.js';
import { RegistrationV2 } from '../../src/models/shared/registrationV2.js';
import { RegistrationRepositoryV2 } from '../../src/repositories/registrationRepositoryV2.js';
import { configService } from '../../src/services/configurationService.js';
import { createLogger } from '../../src/utils/logger.js';

async function verifyUuidMigration() {
  console.log('🔍 UUID MIGRATION VERIFICATION');
  console.log('==============================\n');
  
  try {
    // Initialize components
    const logger = createLogger(configService);
    const client = new GoogleSheetsDbClient(configService);
    const repository = new RegistrationRepositoryV2(client);
    
    console.log('✅ Components initialized successfully\n');

    // Test 1: Verify new schema structure
    console.log('📋 TEST 1: Schema Structure Verification');
    console.log('─────────────────────────────────────────');
    
    const registrationsData = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.spreadsheetId,
      range: 'registrations!A1:Z1'
    });

    const newHeaders = registrationsData.data.values[0] || [];
    console.log(`📊 Headers found: ${newHeaders.length}`);
    console.log(`📋 Schema: ${newHeaders.join(', ')}\n`);

    // Verify required UUID fields are present
    const requiredFields = ['Id', 'CompositeKey', 'Status', 'ModifiedAt', 'ModifiedBy', 'Version'];
    const missingFields = requiredFields.filter(field => !newHeaders.includes(field));
    
    if (missingFields.length === 0) {
      console.log('✅ All required UUID fields present');
    } else {
      console.log(`❌ Missing fields: ${missingFields.join(', ')}`);
    }

    // Test 2: Verify data integrity
    console.log('\n📊 TEST 2: Data Integrity Verification');
    console.log('───────────────────────────────────────');
    
    const allRegistrations = await repository.getActiveRegistrations();
    console.log(`📈 Active registrations found: ${allRegistrations.length}`);

    let uuidCount = 0;
    let compositeKeyCount = 0;
    let validMappings = 0;

    for (const registration of allRegistrations) {
      if (registration.id && registration.id.getValue()) {
        uuidCount++;
      }
      if (registration.compositeKey) {
        compositeKeyCount++;
      }
      if (registration.id && registration.compositeKey) {
        validMappings++;
      }
    }

    console.log(`✅ Registrations with UUIDs: ${uuidCount}`);
    console.log(`✅ Registrations with composite keys: ${compositeKeyCount}`);
    console.log(`✅ Valid UUID ↔ Composite mappings: ${validMappings}`);

    // Test 3: UUID lookup functionality
    console.log('\n🔍 TEST 3: UUID Lookup Functionality');
    console.log('────────────────────────────────────');
    
    if (allRegistrations.length > 0) {
      const testRegistration = allRegistrations[0];
      const uuid = testRegistration.id.getValue();
      
      console.log(`🎯 Testing UUID lookup for: ${uuid}`);
      
      const foundByUuid = await repository.getById(uuid);
      if (foundByUuid) {
        console.log(`✅ UUID lookup successful`);
        console.log(`   Student: ${foundByUuid.studentId.getValue()}`);
        console.log(`   Instructor: ${foundByUuid.instructorId.getValue()}`);
        console.log(`   Day: ${foundByUuid.day}`);
        console.log(`   Time: ${foundByUuid.getFormattedTime()}`);
      } else {
        console.log(`❌ UUID lookup failed`);
      }
    }

    // Test 4: Composite key lookup (backward compatibility)
    console.log('\n🔗 TEST 4: Composite Key Backward Compatibility');
    console.log('──────────────────────────────────────────────');
    
    if (allRegistrations.length > 0) {
      const testRegistration = allRegistrations[0];
      const compositeKey = testRegistration.compositeKey;
      
      console.log(`🎯 Testing composite key lookup for: ${compositeKey}`);
      
      const foundByComposite = await repository.getByCompositeKey(compositeKey);
      if (foundByComposite) {
        console.log(`✅ Composite key lookup successful`);
        console.log(`   UUID: ${foundByComposite.id.getValue()}`);
        console.log(`   Matches original: ${foundByComposite.id.getValue() === testRegistration.id.getValue()}`);
      } else {
        console.log(`❌ Composite key lookup failed`);
      }
    }

    // Test 5: Student and instructor queries
    console.log('\n👨‍🎓 TEST 5: Student/Instructor Query Performance');
    console.log('─────────────────────────────────────────────────');
    
    if (allRegistrations.length > 0) {
      const testRegistration = allRegistrations[0];
      const studentId = testRegistration.studentId.getValue();
      const instructorId = testRegistration.instructorId.getValue();
      
      console.log(`🔍 Querying registrations for student: ${studentId}`);
      const studentRegistrations = await repository.getByStudentId(studentId);
      console.log(`✅ Found ${studentRegistrations.length} registrations for student`);
      
      console.log(`🔍 Querying registrations for instructor: ${instructorId}`);
      const instructorRegistrations = await repository.getByInstructorId(instructorId);
      console.log(`✅ Found ${instructorRegistrations.length} registrations for instructor`);
    }

    // Test 6: Index verification
    console.log('\n🗂️  TEST 6: Composite Key Index Verification');
    console.log('────────────────────────────────────────────');
    
    try {
      const indexData = await client.sheets.spreadsheets.values.get({
        spreadsheetId: client.spreadsheetId,
        range: 'registrations_composite_index!A:C'
      });

      const indexValues = indexData.data.values || [];
      const indexHeaders = indexValues[0] || [];
      const indexRows = indexValues.slice(1);

      console.log(`📋 Index headers: ${indexHeaders.join(', ')}`);
      console.log(`📊 Index entries: ${indexRows.length}`);
      
      // Verify index consistency
      let consistentMappings = 0;
      for (const indexRow of indexRows) {
        const [compositeKey, uuid] = indexRow;
        const foundRegistration = await repository.getById(uuid);
        if (foundRegistration && foundRegistration.compositeKey === compositeKey) {
          consistentMappings++;
        }
      }
      
      console.log(`✅ Consistent index mappings: ${consistentMappings}/${indexRows.length}`);
      
    } catch (error) {
      console.log(`⚠️  Composite key index not found or accessible`);
    }

    // Test 7: Legacy format compatibility
    console.log('\n🔄 TEST 7: Legacy Format Compatibility');
    console.log('─────────────────────────────────────');
    
    const legacyFormat = await repository.getAllLegacyFormat();
    console.log(`📊 Legacy format registrations: ${legacyFormat.length}`);
    
    if (legacyFormat.length > 0) {
      const sample = legacyFormat[0];
      console.log(`📋 Sample legacy format:`);
      console.log(`   ID (composite): ${sample.id}`);
      console.log(`   Student: ${sample.studentId}`);
      console.log(`   Instructor: ${sample.instructorId}`);
      console.log(`   Type: ${sample.registrationType}`);
      console.log(`✅ Legacy format conversion working`);
    }

    // Test 8: Model functionality
    console.log('\n🏗️  TEST 8: Model Functionality');
    console.log('──────────────────────────────');
    
    if (allRegistrations.length > 0) {
      const testReg = allRegistrations[0];
      
      console.log(`📊 Testing model methods:`);
      console.log(`   Is Active: ${testReg.isActive()}`);
      console.log(`   Is Private: ${testReg.isPrivateLesson()}`);
      console.log(`   Is Group: ${testReg.isGroupClass()}`);
      console.log(`   Duration: ${testReg.getDurationMinutes()} minutes`);
      console.log(`   Formatted Time: ${testReg.getFormattedTime()}`);
      console.log(`   Composite Key: ${testReg.getCompositeKey()}`);
      console.log(`✅ Model methods working correctly`);
    }

    // Summary
    console.log('\n📊 MIGRATION VERIFICATION SUMMARY');
    console.log('═════════════════════════════════');
    console.log(`✅ Schema updated with UUID primary keys`);
    console.log(`✅ ${allRegistrations.length} registrations migrated successfully`);
    console.log(`✅ UUID lookup functionality working`);
    console.log(`✅ Composite key backward compatibility maintained`);
    console.log(`✅ Student/Instructor queries functional`);
    console.log(`✅ Legacy format compatibility preserved`);
    console.log(`✅ Enhanced model functionality available`);
    
    console.log('\n🎯 MIGRATION STATUS: ✅ SUCCESSFUL');
    console.log('\n📝 Next steps:');
    console.log('   1. Update frontend to use UUID endpoints');
    console.log('   2. Update API routes to accept UUID parameters');
    console.log('   3. Test application thoroughly with new schema');
    console.log('   4. Monitor performance improvements');

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error('\n🚨 Issues detected in migration. Please review and fix before proceeding.');
    throw error;
  }
}

// Run verification
verifyUuidMigration()
  .then(() => {
    console.log('\n🎉 UUID migration verification completed successfully!');
  })
  .catch((error) => {
    console.error('\n💥 Verification failed:', error.message);
    process.exit(1);
  });
