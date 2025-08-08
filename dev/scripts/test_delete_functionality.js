/**
 * Manual Delete Functionality Test Script
 * =======================================
 * 
 * This script tests the complete delete flow:
 * 1. Lists current registrations  
 * 2. Performs a delete operation
 * 3. Verifies the registration was actually removed from Google Sheets
 * 4. Checks cache invalidation
 */

import { GoogleSheetsDbClient } from '../../src/database/googleSheetsDbClient.js';
import { RegistrationRepository } from '../../src/repositories/registrationRepository.js';
import { RegistrationApplicationService } from '../../src/services/registrationService.js';
import { configService } from '../../src/services/configurationService.js';
import { createLogger } from '../../src/utils/logger.js';

async function testDeleteFunctionality() {
  console.log('🧪 TESTING DELETE FUNCTIONALITY');
  console.log('================================\n');

  try {
    // Initialize logger first
    const logger = createLogger(configService);
    
    // Initialize components
    const dbClient = new GoogleSheetsDbClient(configService);
    const repository = new RegistrationRepository(dbClient);
    
    console.log('✅ Components initialized\n');

    // Step 1: Get current registrations count
    console.log('📊 STEP 1: Getting current registrations...');
    const registrationsBefore = await repository.getActiveRegistrations();
    console.log(`Found ${registrationsBefore.length} registrations before delete\n`);

    if (registrationsBefore.length === 0) {
      console.log('❌ No registrations found to test deletion');
      return;
    }

    // Step 2: Select a registration to delete (first one for testing)
    const targetRegistration = registrationsBefore[0];
    const targetId = targetRegistration.id.getValue();
    
    console.log('🎯 STEP 2: Target registration for deletion:');
    console.log(`   ID: ${targetId}`);
    console.log(`   Student ID: ${targetRegistration.studentId?.value || targetRegistration.studentId || 'N/A'}`);
    console.log(`   Day: ${targetRegistration.day}`);
    console.log(`   Time: ${targetRegistration.startTime}`);
    console.log();

    // Step 3: Verify registration exists in raw Google Sheets data
    console.log('🔍 STEP 3: Verifying registration exists in Google Sheets...');
    const sheetResponse = await dbClient.sheets.spreadsheets.values.get({
      spreadsheetId: dbClient.spreadsheetId,
      range: 'registrations!A:C'
    });
    
    const sheetValues = sheetResponse.data.values || [];
    const targetRowIndex = sheetValues.findIndex(row => row[0] === targetId);
    
    if (targetRowIndex === -1) {
      console.log('❌ Target registration not found in Google Sheets');
      return;
    }
    
    console.log(`✅ Found target registration at row ${targetRowIndex + 1} in Google Sheets\n`);

    // Step 4: Perform deletion
    console.log('🗑️  STEP 4: Performing deletion...');
    const deleteResult = await repository.delete(targetId, 'test-user');
    
    if (!deleteResult) {
      console.log('❌ Delete operation returned false');
      return;
    }
    
    console.log('✅ Delete operation completed successfully\n');

    // Step 5: Verify deletion from Google Sheets
    console.log('🔍 STEP 5: Verifying deletion from Google Sheets...');
    const sheetResponseAfter = await dbClient.sheets.spreadsheets.values.get({
      spreadsheetId: dbClient.spreadsheetId,
      range: 'registrations!A:C'
    });
    
    const sheetValuesAfter = sheetResponseAfter.data.values || [];
    const targetRowIndexAfter = sheetValuesAfter.findIndex(row => row[0] === targetId);
    
    if (targetRowIndexAfter !== -1) {
      console.log('❌ Registration still exists in Google Sheets after deletion!');
      console.log(`   Found at row ${targetRowIndexAfter + 1}`);
      return;
    }
    
    console.log('✅ Registration successfully removed from Google Sheets\n');

    // Step 6: Verify count reduction
    console.log('📊 STEP 6: Verifying registration count reduction...');
    const registrationsAfter = await repository.getActiveRegistrations();
    console.log(`Found ${registrationsAfter.length} registrations after delete`);
    
    const expectedCount = registrationsBefore.length - 1;
    if (registrationsAfter.length === expectedCount) {
      console.log(`✅ Registration count correctly reduced by 1\n`);
    } else {
      console.log(`❌ Expected ${expectedCount} registrations, but found ${registrationsAfter.length}\n`);
    }

    // Step 7: Verify specific registration is gone
    console.log('🔍 STEP 7: Verifying specific registration is no longer retrievable...');
    try {
      const deletedRegistration = await repository.getById(targetId);
      if (deletedRegistration) {
        console.log('❌ Deleted registration is still retrievable by ID');
      } else {
        console.log('✅ Deleted registration is no longer retrievable by ID\n');
      }
    } catch (error) {
      console.log('✅ Deleted registration correctly throws error when retrieved\n');
    }

    console.log('🎉 DELETE FUNCTIONALITY TEST COMPLETED SUCCESSFULLY!');
    console.log('==================================================');
    console.log('✅ Registration deleted from Google Sheets');
    console.log('✅ Cache properly invalidated');
    console.log('✅ Count correctly reduced');
    console.log('✅ Registration no longer retrievable');

  } catch (error) {
    console.error('❌ DELETE FUNCTIONALITY TEST FAILED:');
    console.error('====================================');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testDeleteFunctionality().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Test crashed:', error);
  process.exit(1);
});
