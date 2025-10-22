/**
 * Configuration for GAS Migrations
 *
 * SETUP:
 * 1. Set your spreadsheet ID below
 * 2. Deploy with clasp push
 * 3. Run migrations
 *
 * The spreadsheet ID is saved to Properties Service after first use,
 * so you only need to set it once.
 */

// ============================================================================
// CONFIGURATION - SET YOUR SPREADSHEET ID HERE
// ============================================================================

/**
 * Your Google Sheets spreadsheet ID
 * Find it in the URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
 */
const SPREADSHEET_ID = "";

// ============================================================================
// HELPER FUNCTION - DO NOT MODIFY
// ============================================================================

/**
 * Get the configured spreadsheet ID
 * @returns {string} The spreadsheet ID
 * @throws {Error} If spreadsheet ID is not configured
 */
function getSpreadsheetId() {
  // First check the constant
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    // Save to Properties Service for future use
    PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', SPREADSHEET_ID);
    return SPREADSHEET_ID;
  }

  // If constant is empty, check Properties Service
  const properties = PropertiesService.getScriptProperties();
  const savedSpreadsheetId = properties.getProperty('SPREADSHEET_ID');

  if (savedSpreadsheetId) {
    return savedSpreadsheetId;
  }

  // Nothing found, throw error
  throw new Error(
    'No spreadsheet ID configured. Set SPREADSHEET_ID constant in Config.js or run:\n' +
    'PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", "your-spreadsheet-id")'
  );
}
