/**
 * Simple configuration for spreadsheet ID
 * 
 * 1. Set your spreadsheet ID in the constant below
 * 2. When you run any migration, it will use the constant
 * 3. If the constant is empty, it checks Properties Service
 * 4. If neither exists, it throws an error
 */

// 📝 PUT YOUR SPREADSHEET ID HERE:
const SPREADSHEET_ID = ""; // Replace with your spreadsheet ID

/**
 * Get the spreadsheet ID from constant or Properties Service
 * @returns {string} The spreadsheet ID
 * @throws {Error} If no spreadsheet ID is configured
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

/**
 * Create a backup of specified sheets before migration
 * @param {string} migrationName - Name of the migration
 * @param {Array<string>} sheetNames - Names of sheets to backup
 * @returns {Object} Backup result with metadata
 */
function createMigrationBackup(migrationName, sheetNames) {
  const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupId = `${migrationName}_${timestamp}`;
  
  console.log(`Creating backup: ${backupId}`);
  
  const backupMetadata = {
    migrationName: migrationName,
    timestamp: new Date().toISOString(),
    backupId: backupId,
    sheets: []
  };
  
  // Create backup sheets
  for (const sheetName of sheetNames) {
    const sourceSheet = spreadsheet.getSheetByName(sheetName);
    if (!sourceSheet) {
      console.warn(`Sheet ${sheetName} not found, skipping backup`);
      continue;
    }
    
    const backupSheetName = `BACKUP_${backupId}_${sheetName}`;
    const backupSheet = sourceSheet.copyTo(spreadsheet);
    backupSheet.setName(backupSheetName);
    backupSheet.hideSheet();
    
    backupMetadata.sheets.push({
      originalName: sheetName,
      backupName: backupSheetName
    });
    
    console.log(`Backed up ${sheetName} to ${backupSheetName}`);
  }
  
  console.log(`Backup completed: ${backupMetadata.sheets.length} sheets backed up`);
  return backupMetadata;
}
