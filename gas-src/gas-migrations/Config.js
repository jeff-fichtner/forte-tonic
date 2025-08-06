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
 * @returns {Object} Backup result with success flag and metadata
 */
function createMigrationBackup(migrationName, sheetNames) {
  try {
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
    
    return {
      success: true,
      ...backupMetadata
    };
    
  } catch (error) {
    console.error('❌ Backup creation failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Simple restore function to restore from backup sheets
 * @param {string} migrationName - Name of the migration to restore
 * @param {boolean} deleteBackupAfterRestore - Whether to delete backup sheets after restore (default: false)
 * @returns {Object} Restore result
 */
function restoreFromBackup(migrationName, deleteBackupAfterRestore = false) {
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const allSheets = spreadsheet.getSheets();
    
    // Find backup sheets for this migration
    const backupSheets = allSheets.filter(sheet => 
      sheet.getName().includes(`BACKUP_${migrationName}_`)
    );
    
    if (backupSheets.length === 0) {
      return {
        success: false,
        error: `No backup sheets found for migration: ${migrationName}`
      };
    }
    
    console.log(`🔄 Found ${backupSheets.length} backup sheets for ${migrationName}`);
    
    // Restore each backup sheet
    let restoredCount = 0;
    const restoredSheetNames = [];
    for (const backupSheet of backupSheets) {
      const backupName = backupSheet.getName();
      // Extract original sheet name from backup name
      // Format: BACKUP_MigrationName_timestamp_OriginalName
      const parts = backupName.split('_');
      const originalName = parts.slice(3).join('_'); // Everything after the third underscore
      
      if (originalName) {
        const originalSheet = spreadsheet.getSheetByName(originalName);
        if (originalSheet) {
          // Clear original sheet and copy backup data
          originalSheet.clear();
          const backupData = backupSheet.getDataRange().getValues();
          if (backupData.length > 0) {
            originalSheet.getRange(1, 1, backupData.length, backupData[0].length).setValues(backupData);
          }
          console.log(`✅ Restored ${originalName} from backup`);
          restoredCount++;
          restoredSheetNames.push(originalName);
        }
      }
    }
    
    // Only delete backup sheets if explicitly requested
    if (deleteBackupAfterRestore) {
      console.log('🗑️  Deleting backup sheets as requested...');
      for (const backupSheet of backupSheets) {
        spreadsheet.deleteSheet(backupSheet);
      }
      console.log('✅ Backup sheets deleted');
    } else {
      console.log('💾 Backup sheets preserved for safety');
      console.log('📁 To manually delete backup, call deleteBackup() function');
    }
    
    console.log(`🎉 Restore completed: ${restoredCount} sheets restored`);
    return {
      success: true,
      restoredSheets: restoredSheetNames
    };
    
  } catch (error) {
    console.error('❌ Restore failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete backup sheets for a specific migration
 * @param {string} migrationName - Name of the migration to delete backups for
 * @returns {Object} Delete result
 */
function deleteBackup(migrationName) {
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const allSheets = spreadsheet.getSheets();
    
    // Find backup sheets for this migration
    const backupSheets = allSheets.filter(sheet => 
      sheet.getName().includes(`BACKUP_${migrationName}_`)
    );
    
    if (backupSheets.length === 0) {
      return {
        success: false,
        error: `No backup sheets found for migration: ${migrationName}`
      };
    }
    
    console.log(`🗑️  Found ${backupSheets.length} backup sheets for ${migrationName}`);
    
    // Delete backup sheets
    const deletedSheetNames = [];
    for (const backupSheet of backupSheets) {
      const backupName = backupSheet.getName();
      spreadsheet.deleteSheet(backupSheet);
      deletedSheetNames.push(backupName);
      console.log(`🗑️  Deleted backup sheet: ${backupName}`);
    }
    
    console.log(`🎉 Backup deletion completed: ${deletedSheetNames.length} sheets deleted`);
    return {
      success: true,
      deletedSheets: deletedSheetNames
    };
    
  } catch (error) {
    console.error('❌ Backup deletion failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Find the latest backup for a migration
 * @param {string} migrationName - Name of the migration
 * @returns {Object|null} Backup info or null if not found
 */
function findLatestBackup(migrationName) {
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const allSheets = spreadsheet.getSheets();
    
    // Find backup sheets for this migration
    const backupSheets = allSheets.filter(sheet => 
      sheet.getName().includes(`BACKUP_${migrationName}_`)
    );
    
    if (backupSheets.length === 0) {
      return null;
    }
    
    // Find the most recent backup (largest timestamp)
    let latestBackup = null;
    let latestTimestamp = '';
    
    for (const backupSheet of backupSheets) {
      const backupName = backupSheet.getName();
      // Extract timestamp from backup name
      // Format: BACKUP_MigrationName_timestamp_OriginalName
      const parts = backupName.split('_');
      if (parts.length >= 3) {
        const timestamp = parts[2]; // Should be the timestamp
        if (timestamp > latestTimestamp) {
          latestTimestamp = timestamp;
          latestBackup = {
            migrationName: migrationName,
            timestamp: timestamp,
            backupSheets: backupSheets.map(s => s.getName())
          };
        }
      }
    }
    
    return latestBackup;
    
  } catch (error) {
    console.error('❌ Finding latest backup failed:', error.message);
    return null;
  }
}
