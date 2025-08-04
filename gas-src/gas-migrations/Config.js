/**
 * Global Configuration for Gas Migrations
 *
 * This file MUST be loaded first in Google Apps Script.
 * It sets the spreadsheet ID that all migrations will use.
 *
 * IMPORTANT: In Google Apps Script, files are loaded in alphabetical order.
 * This file is named "Config.js" to ensure it loads before other migration files.
 *
 * Setup Instructions:
 * 1. Replace "YOUR_SPREADSHEET_ID_HERE" below with your actual spreadsheet ID
 * 2. All migration functions will automatically use this ID
 * 3. No need to modify individual migration files
 */

// ========================================
// GLOBAL SPREADSHEET CONFIGURATION
// ========================================

/**
 * Global spreadsheet ID used by all migrations
 * TODO: Replace with your actual spreadsheet ID
 */
var GLOBAL_SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

/**
 * Utility function to get the configured spreadsheet ID
 * All migrations should use this function to get the spreadsheet ID
 */
function getSpreadsheetId() {
  if (!GLOBAL_SPREADSHEET_ID || GLOBAL_SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID_HERE') {
    throw new Error(
      '❌ SPREADSHEET ID NOT CONFIGURED\n\nPlease edit Config.js and replace "YOUR_SPREADSHEET_ID_HERE" with your actual spreadsheet ID.'
    );
  }
  return GLOBAL_SPREADSHEET_ID;
}

/**
 * Utility function to get the configured spreadsheet object
 * Includes error handling and validation
 */
function getSpreadsheet() {
  try {
    const spreadsheetId = getSpreadsheetId();
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);

    // Validate we can access the spreadsheet
    spreadsheet.getName(); // This will throw an error if we can't access it

    return spreadsheet;
  } catch (error) {
    if (error.message.includes('SPREADSHEET ID NOT CONFIGURED')) {
      throw error; // Re-throw configuration errors
    }
    throw new Error(
      `❌ CANNOT ACCESS SPREADSHEET\n\nSpreadsheet ID: ${GLOBAL_SPREADSHEET_ID}\nError: ${error.message}\n\nPlease check:\n1. Spreadsheet ID is correct\n2. You have access to the spreadsheet\n3. Spreadsheet still exists`
    );
  }
}

/**
 * Configuration validation function
 * Call this to verify your setup is correct
 */
function validateConfiguration() {
  console.log('🔍 VALIDATING CONFIGURATION...');
  console.log('================================');

  try {
    const spreadsheetId = getSpreadsheetId();
    console.log(`✅ Spreadsheet ID configured: ${spreadsheetId}`);

    const spreadsheet = getSpreadsheet();
    const spreadsheetName = spreadsheet.getName();
    console.log(`✅ Spreadsheet accessible: "${spreadsheetName}"`);

    // Check for required sheets
    const requiredSheets = ['students', 'parents', 'instructors', 'registrations'];
    const availableSheets = spreadsheet.getSheets().map(sheet => sheet.getName());

    console.log('\n📋 SHEET VALIDATION:');
    requiredSheets.forEach(sheetName => {
      if (availableSheets.includes(sheetName)) {
        console.log(`✅ Found required sheet: ${sheetName}`);
      } else {
        console.log(`⚠️  Missing sheet: ${sheetName}`);
      }
    });

    console.log('\n🎉 CONFIGURATION VALIDATION COMPLETE');
    return {
      success: true,
      spreadsheetId: spreadsheetId,
      spreadsheetName: spreadsheetName,
      availableSheets: availableSheets,
    };
  } catch (error) {
    console.error('❌ CONFIGURATION VALIDATION FAILED:');
    console.error(error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ========================================
// DEVELOPMENT ENVIRONMENT VALIDATION
// ========================================

/**
 * Validate that this is a development environment
 * Used by development-only migrations
 */
function validateDevelopmentEnvironment() {
  try {
    const spreadsheet = getSpreadsheet();
    const title = spreadsheet.getName().toLowerCase();

    // Check for production indicators
    const productionIndicators = ['production', 'prod', 'live', 'real', 'actual'];
    const hasProductionIndicator = productionIndicators.some(indicator =>
      title.includes(indicator)
    );

    if (hasProductionIndicator) {
      console.log('❌ PRODUCTION ENVIRONMENT DETECTED');
      console.log(`Spreadsheet title: "${spreadsheet.getName()}"`);
      console.log('Development migrations are blocked in production.');
      return false;
    }

    console.log('✅ Development environment validated');
    return true;
  } catch (error) {
    console.error('❌ Environment validation failed:', error.message);
    return false;
  }
}
