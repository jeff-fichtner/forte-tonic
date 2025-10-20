/**
 * Simple Configuration for GAS Migrations v2
 *
 * SETUP:
 * 1. Set your spreadsheet ID below
 * 2. Deploy with clasp push
 * 3. Run migrations
 *
 * That's it - no complex backup systems, no rollback, keep it simple.
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
 * Get the configured spreadsheet ID (v2 migrations)
 * @returns {string} The spreadsheet ID
 * @throws {Error} If spreadsheet ID is not configured
 */
function getSpreadsheetIdV2() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.trim() === "") {
    throw new Error(
      'Spreadsheet ID not configured. Please set SPREADSHEET_ID in Config_v2.js'
    );
  }

  return SPREADSHEET_ID;
}
