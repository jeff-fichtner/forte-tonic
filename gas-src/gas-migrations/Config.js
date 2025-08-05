/**
 * Google Apps Script Configuration Management using Properties Service
 *
 * This file provides configuration management using Google Apps Script's Properties Service
 * for persistent storage of settings that survive deployments and script updates.
 *
 * IMPORTANT: In Google Apps Script, files are loaded in alphabetical order.
 * This file is named "Config.js" to ensure it loads before other migration files.
 *
 * Setup Instructions:
 * 1. Run: quickSetupDev("your-spreadsheet-id") for development
 * 2. Run: quickSetupProd("your-spreadsheet-id") for production
 * 3. Or use: setConfig("SPREADSHEET_ID", "your-id") manually
 * 4. All migration functions will automatically use these persistent settings
 *
 * Properties Service Benefits:
 * - Settings persist across deployments
 * - No need to edit code for different environments
 * - Secure storage of sensitive data
 * - Easy switching between development/production
 */

// ========================================
// CONFIGURATION KEYS AND DEFAULTS
// ========================================

/**
 * Configuration keys used throughout the application
 */
const CONFIG_KEYS = {
  SPREADSHEET_ID: 'SPREADSHEET_ID',
  ENVIRONMENT: 'ENVIRONMENT',
  DEBUG_MODE: 'DEBUG_MODE',
  BACKUP_RETENTION_DAYS: 'BACKUP_RETENTION_DAYS',
  NOTIFICATION_EMAIL: 'NOTIFICATION_EMAIL',
  MIGRATION_LOG_LEVEL: 'MIGRATION_LOG_LEVEL'
};

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  [CONFIG_KEYS.ENVIRONMENT]: 'development',
  [CONFIG_KEYS.DEBUG_MODE]: 'true',
  [CONFIG_KEYS.BACKUP_RETENTION_DAYS]: '7',
  [CONFIG_KEYS.MIGRATION_LOG_LEVEL]: 'info'
};

// ========================================
// CORE CONFIGURATION FUNCTIONS
// ========================================

/**
 * Set a configuration value using Properties Service
 * @param {string} key - Configuration key
 * @param {string} value - Configuration value
 */
function setConfig(key, value) {
  try {
    PropertiesService.getScriptProperties().setProperty(key, value);
    console.log(`✅ Config set: ${key} = ${value}`);
  } catch (error) {
    console.error(`❌ Failed to set config ${key}:`, error.message);
    throw error;
  }
}

/**
 * Get a configuration value from Properties Service with defaults
 * @param {string} key - Configuration key
 * @param {string} defaultValue - Default value if not found
 * @return {string} Configuration value
 */
function getConfigValue(key, defaultValue = null) {
  try {
    const value = PropertiesService.getScriptProperties().getProperty(key);
    return value !== null ? value : (defaultValue || DEFAULT_CONFIG[key] || null);
  } catch (error) {
    console.error(`❌ Failed to get config ${key}:`, error.message);
    return defaultValue || DEFAULT_CONFIG[key] || null;
  }
}

/**
 * Get all configuration values as an object
 * @return {Object} Configuration object with defaults merged
 */
function getConfig() {
  try {
    const properties = PropertiesService.getScriptProperties().getProperties();
    
    // Merge with defaults for any missing keys
    const config = { ...DEFAULT_CONFIG };
    Object.keys(properties).forEach(key => {
      config[key] = properties[key];
    });
    
    return config;
  } catch (error) {
    console.error('❌ Failed to get config:', error.message);
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Update multiple configuration values at once
 * @param {Object} configUpdates - Object with key-value pairs to update
 */
function updateConfig(configUpdates) {
  try {
    PropertiesService.getScriptProperties().setProperties(configUpdates);
    console.log(`✅ Config updated:`, Object.keys(configUpdates).join(', '));
  } catch (error) {
    console.error('❌ Failed to update config:', error.message);
    throw error;
  }
}

/**
 * Get the configured spreadsheet ID
 * @return {string} Spreadsheet ID
 */
function getSpreadsheetId() {
  const spreadsheetId = getConfigValue(CONFIG_KEYS.SPREADSHEET_ID);
  
  if (!spreadsheetId) {
    const errorMsg = `❌ SPREADSHEET ID NOT CONFIGURED

Please set your spreadsheet ID using one of these methods:

QUICK SETUP:
   quickSetupDev("your-spreadsheet-id")    // For development
   quickSetupProd("your-spreadsheet-id")   // For production

MANUAL SETUP:
   setConfig("SPREADSHEET_ID", "your-spreadsheet-id")

SETUP WIZARD:
   setupWizard()  // Interactive setup guide

The spreadsheet ID can be found in your Google Sheets URL:
https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit`;
    
    throw new Error(errorMsg);
  }
  
  return spreadsheetId;
}

/**
 * Get the configured spreadsheet object with validation
 * @return {GoogleAppsScript.Spreadsheet.Spreadsheet} Spreadsheet object
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
    
    const spreadsheetId = getConfigValue(CONFIG_KEYS.SPREADSHEET_ID);
    throw new Error(
      `❌ CANNOT ACCESS SPREADSHEET\n\nSpreadsheet ID: ${spreadsheetId}\nError: ${error.message}\n\nPlease check:\n1. Spreadsheet ID is correct\n2. You have access to the spreadsheet\n3. Spreadsheet still exists`
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
    console.log(`✅ Configuration loaded`);
    console.log(`   Spreadsheet ID: ${spreadsheetId.substring(0, 8)}...${spreadsheetId.substring(spreadsheetId.length - 4)}`);

    const spreadsheet = getSpreadsheet();
    console.log(`✅ Spreadsheet access verified`);
    console.log(`   Spreadsheet name: "${spreadsheet.getName()}"`);
    console.log(`   Number of sheets: ${spreadsheet.getSheets().length}`);

    const sheets = spreadsheet.getSheets().map(sheet => sheet.getName());
    console.log(`   Available sheets: ${sheets.join(', ')}`);

    console.log('\n🎉 CONFIGURATION VALIDATION SUCCESSFUL!');
    console.log('Your Gas migrations are ready to run.');

    return true;
  } catch (error) {
    console.log('\n❌ CONFIGURATION VALIDATION FAILED!');
    console.log(`Error: ${error.message}`);
    return false;
  }
}

// ========================================
// ENVIRONMENT VALIDATION
// ========================================

/**
 * Validate that this is a development environment
 * Uses Properties Service environment configuration
 */
function validateDevelopmentEnvironment() {
  try {
    // Check Properties Service environment setting
    const environment = getConfigValue(CONFIG_KEYS.ENVIRONMENT);
    const debugMode = getConfigValue(CONFIG_KEYS.DEBUG_MODE);
    
    if (environment) {
      const isDev = environment.toLowerCase() === 'development';
      const isDebug = debugMode && debugMode.toLowerCase() === 'true';
      
      if (isDev || isDebug) {
        console.log(`✅ Development environment validated (ENVIRONMENT=${environment}, DEBUG_MODE=${debugMode})`);
        return true;
      } else if (environment.toLowerCase() === 'production') {
        console.log('❌ PRODUCTION ENVIRONMENT SET');
        console.log(`Current settings: ENVIRONMENT=${environment}, DEBUG_MODE=${debugMode}`);
        console.log('Development migrations are blocked in production.');
        console.log('To enable development mode, run: setConfig("ENVIRONMENT", "development")');
        return false;
      }
    }
    
    // If no explicit environment is set, check spreadsheet name as fallback
    console.log('⚠️  No ENVIRONMENT setting found, checking spreadsheet name...');
    const spreadsheet = getSpreadsheet();
    const title = spreadsheet.getName().toLowerCase();

    // Check for production indicators in spreadsheet name
    const productionIndicators = ['production', 'prod', 'live', 'real', 'actual'];
    const hasProductionIndicator = productionIndicators.some(indicator =>
      title.includes(indicator)
    );

    if (hasProductionIndicator) {
      console.log('❌ PRODUCTION ENVIRONMENT DETECTED IN SPREADSHEET NAME');
      console.log(`Spreadsheet title: "${spreadsheet.getName()}"`);
      console.log('Development migrations are blocked in production.');
      console.log('To override, run: setConfig("ENVIRONMENT", "development")');
      return false;
    }

    console.log('✅ Development environment validated via spreadsheet name');
    console.log('💡 Tip: Set explicit environment with: setConfig("ENVIRONMENT", "development")');
    return true;
  } catch (error) {
    console.error('❌ Environment validation failed:', error.message);
    return false;
  }
}

// ========================================
// BACKUP AND RESTORE UTILITIES
// ========================================

/**
 * Create a backup of specified sheets before migration
 * Backup is stored as hidden sheets with prefix "BACKUP_[migrationName]_"
 */
function createMigrationBackup(migrationName, sheetNames = []) {
  try {
    // Validate inputs
    if (!migrationName) {
      throw new Error('Migration name is required');
    }
    
    if (!Array.isArray(sheetNames)) {
      throw new Error('sheetNames must be an array. Received: ' + typeof sheetNames);
    }
    
    const spreadsheet = getSpreadsheet();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPrefix = `BACKUP_${migrationName}_${timestamp}_`;
    
    console.log(`📦 Creating backup for migration: ${migrationName}`);
    console.log(`📦 Sheets to backup: [${sheetNames.join(', ')}]`);
    
    const backedUpSheets = [];
    
    for (const sheetName of sheetNames) {
      const originalSheet = spreadsheet.getSheetByName(sheetName);
      if (originalSheet) {
        // Copy the sheet
        const backupSheet = originalSheet.copyTo(spreadsheet);
        const backupName = `${backupPrefix}${sheetName}`;
        backupSheet.setName(backupName);
        
        // Hide the backup sheet
        backupSheet.hideSheet();
        
        backedUpSheets.push(backupName);
        console.log(`✅ Backed up sheet: ${sheetName} → ${backupName}`);
      } else {
        console.log(`⚠️  Sheet not found for backup: ${sheetName}`);
      }
    }
    
    // Create backup metadata sheet
    const metadataSheetName = `${backupPrefix}METADATA`;
    const metadataSheet = spreadsheet.insertSheet(metadataSheetName);
    metadataSheet.hideSheet();
    
    // Store backup information
    metadataSheet.getRange(1, 1, 1, 5).setValues([
      ['Migration', 'Timestamp', 'Original Sheets', 'Backup Sheets', 'Status']
    ]);
    metadataSheet.getRange(2, 1, 1, 5).setValues([
      [migrationName, timestamp, sheetNames.join(','), backedUpSheets.join(','), 'ACTIVE']
    ]);
    
    console.log(`✅ Backup created with metadata: ${metadataSheetName}`);
    return {
      success: true,
      migrationName,
      timestamp,
      backupPrefix,
      backedUpSheets,
      metadataSheet: metadataSheetName
    };
    
  } catch (error) {
    console.error(`❌ Backup creation failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Restore from backup and delete backup sheets
 */
function restoreFromBackup(migrationName) {
  try {
    const spreadsheet = getSpreadsheet();
    const backupInfo = findLatestBackup(migrationName);
    
    if (!backupInfo) {
      console.log(`❌ No backup found for migration: ${migrationName}`);
      return { success: false, error: 'No backup found' };
    }
    
    console.log(`🔄 Restoring from backup: ${backupInfo.timestamp}`);
    
    // Restore each backed up sheet
    for (const backupSheetName of backupInfo.backedUpSheets) {
      const backupSheet = spreadsheet.getSheetByName(backupSheetName);
      if (backupSheet) {
        const originalSheetName = backupSheetName.replace(backupInfo.backupPrefix, '');
        const originalSheet = spreadsheet.getSheetByName(originalSheetName);
        
        if (originalSheet) {
          // Delete current data and copy from backup
          originalSheet.clear();
          const backupData = backupSheet.getDataRange().getValues();
          if (backupData.length > 0) {
            originalSheet.getRange(1, 1, backupData.length, backupData[0].length).setValues(backupData);
          }
          console.log(`✅ Restored sheet: ${originalSheetName}`);
        }
      }
    }
    
    // Delete backup sheets
    deleteBackup(migrationName);
    
    console.log(`✅ Restore completed for migration: ${migrationName}`);
    return { success: true, migrationName, restoredSheets: backupInfo.originalSheets };
    
  } catch (error) {
    console.error(`❌ Restore failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Delete backup sheets for a migration
 */
function deleteBackup(migrationName) {
  try {
    const spreadsheet = getSpreadsheet();
    const backupInfo = findLatestBackup(migrationName);
    
    if (!backupInfo) {
      console.log(`ℹ️  No backup found to delete for migration: ${migrationName}`);
      return { success: true, message: 'No backup to delete' };
    }
    
    console.log(`🗑️  Deleting backup: ${backupInfo.timestamp}`);
    
    // Delete backup sheets
    for (const backupSheetName of backupInfo.backedUpSheets) {
      const backupSheet = spreadsheet.getSheetByName(backupSheetName);
      if (backupSheet) {
        spreadsheet.deleteSheet(backupSheet);
        console.log(`✅ Deleted backup sheet: ${backupSheetName}`);
      }
    }
    
    // Delete metadata sheet
    const metadataSheet = spreadsheet.getSheetByName(backupInfo.metadataSheet);
    if (metadataSheet) {
      spreadsheet.deleteSheet(metadataSheet);
      console.log(`✅ Deleted backup metadata: ${backupInfo.metadataSheet}`);
    }
    
    console.log(`✅ Backup deletion completed for migration: ${migrationName}`);
    return { success: true, migrationName };
    
  } catch (error) {
    console.error(`❌ Backup deletion failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Find the latest backup for a migration
 */
function findLatestBackup(migrationName) {
  try {
    const spreadsheet = getSpreadsheet();
    const sheets = spreadsheet.getSheets();
    
    // Find metadata sheets for this migration
    const metadataSheets = sheets
      .filter(sheet => sheet.getName().includes(`BACKUP_${migrationName}_`) && sheet.getName().endsWith('_METADATA'))
      .map(sheet => {
        const name = sheet.getName();
        const timestampMatch = name.match(/BACKUP_.*_(.+)_METADATA/);
        return {
          sheet,
          name,
          timestamp: timestampMatch ? timestampMatch[1] : null
        };
      })
      .sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''))
      .reverse(); // Latest first
    
    if (metadataSheets.length === 0) {
      return null;
    }
    
    const latestMetadata = metadataSheets[0];
    const metadataSheet = latestMetadata.sheet;
    
    // Read backup information
    const data = metadataSheet.getDataRange().getValues();
    if (data.length < 2) {
      return null;
    }
    
    const [, migration, timestamp, originalSheetsStr, backupSheetsStr, status] = data[1];
    const originalSheets = originalSheetsStr ? originalSheetsStr.split(',') : [];
    const backedUpSheets = backupSheetsStr ? backupSheetsStr.split(',') : [];
    const backupPrefix = `BACKUP_${migrationName}_${timestamp}_`;
    
    return {
      migrationName: migration,
      timestamp,
      backupPrefix,
      originalSheets,
      backedUpSheets,
      metadataSheet: latestMetadata.name,
      status
    };
    
  } catch (error) {
    console.error(`❌ Error finding backup: ${error.message}`);
    return null;
  }
}

/**
 * List all available backups
 */
function listAllBackups() {
  try {
    const spreadsheet = getSpreadsheet();
    const sheets = spreadsheet.getSheets();
    
    const backups = sheets
      .filter(sheet => sheet.getName().includes('BACKUP_') && sheet.getName().endsWith('_METADATA'))
      .map(sheet => {
        const data = sheet.getDataRange().getValues();
        if (data.length < 2) return null;
        
        const [, migration, timestamp, originalSheets, backupSheets, status] = data[1];
        return {
          migration,
          timestamp,
          originalSheets: originalSheets ? originalSheets.split(',') : [],
          backupSheets: backupSheets ? backupSheets.split(',') : [],
          status,
          metadataSheet: sheet.getName()
        };
      })
      .filter(backup => backup !== null)
      .sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''))
      .reverse();
    
    console.log('📋 Available Backups:');
    console.log('====================');
    
    if (backups.length === 0) {
      console.log('No backups found');
    } else {
      backups.forEach(backup => {
        console.log(`• ${backup.migration} (${backup.timestamp}) - ${backup.status}`);
        console.log(`  Sheets: ${backup.originalSheets.join(', ')}`);
      });
    }
    
    return backups;
    
  } catch (error) {
    console.error(`❌ Error listing backups: ${error.message}`);
    return [];
  }
}

// ========================================
// PROPERTIES SERVICE HELPER FUNCTIONS
// ========================================

/**
 * Show current configuration from Properties Service
 */
function showConfig() {
  console.log('📋 Current Configuration (Properties Service):');
  console.log('==============================================');
  
  try {
    const properties = PropertiesService.getScriptProperties().getProperties();
    
    if (Object.keys(properties).length === 0) {
      console.log('   No properties set. Use setConfig() to configure.');
      console.log('   Example: setConfig("SPREADSHEET_ID", "your-spreadsheet-id")');
    } else {
      Object.keys(properties).forEach(key => {
        let value = properties[key];
        
        // Mask sensitive values
        if (key.includes('ID') && value && value.length > 10) {
          value = value.substring(0, 8) + '...' + value.substring(value.length - 4);
        }
        
        console.log(`   ${key}: ${value}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Failed to show config:', error.message);
  }
}

/**
 * Quick setup for development environment
 * @param {string} spreadsheetId - Your Google Sheets spreadsheet ID
 */
function quickSetupDev(spreadsheetId) {
  console.log('🔧 Setting up development environment...');
  
  setConfig('SPREADSHEET_ID', spreadsheetId);
  setConfig('ENVIRONMENT', 'development');
  setConfig('DEBUG_MODE', 'true');
  
  console.log('✅ Development environment configured!');
  console.log('💡 Run validateConfiguration() to test your setup');
}

/**
 * Quick setup for production environment
 * @param {string} spreadsheetId - Your Google Sheets spreadsheet ID
 */
function quickSetupProd(spreadsheetId) {
  console.log('🔧 Setting up production environment...');
  
  setConfig('SPREADSHEET_ID', spreadsheetId);
  setConfig('ENVIRONMENT', 'production');
  setConfig('DEBUG_MODE', 'false');
  
  console.log('✅ Production environment configured!');
  console.log('⚠️  Development migrations will be blocked');
}

/**
 * Clear all Properties Service configuration
 * USE WITH CAUTION - This will clear all stored settings
 */
function clearAllConfig() {
  console.log('🗑️  Clearing all configuration...');
  
  try {
    const properties = PropertiesService.getScriptProperties().getProperties();
    const keys = Object.keys(properties);
    
    keys.forEach(key => {
      PropertiesService.getScriptProperties().deleteProperty(key);
    });
    
    console.log(`✅ Cleared ${keys.length} configuration keys`);
    console.log('Configuration reset to hardcoded fallbacks');
  } catch (error) {
    console.error('❌ Failed to clear config:', error.message);
  }
}

/**
 * Setup wizard for new users
 */
function setupWizard() {
  console.log('🧙‍♂️ Gas Migrations Configuration Wizard');
  console.log('========================================');
  
  // Step 1: Check current state
  const currentSpreadsheetId = getConfigValue('SPREADSHEET_ID');
  
  if (!currentSpreadsheetId) {
    console.log('📋 Step 1: Configure your Google Sheets Spreadsheet ID');
    console.log('   1. Open your Google Sheets document');
    console.log('   2. Copy the ID from the URL (the long string between /d/ and /edit)');
    console.log('   3. Run: quickSetupDev("your-spreadsheet-id-here")');
    console.log('   4. Or run: setConfig("SPREADSHEET_ID", "your-spreadsheet-id")');
    return;
  }
  
  // Step 2: Test spreadsheet access
  try {
    const spreadsheet = getSpreadsheet();
    console.log(`✅ Step 1: Spreadsheet access verified: "${spreadsheet.getName()}"`);
  } catch (error) {
    console.log(`❌ Step 1: Cannot access spreadsheet: ${error.message}`);
    console.log('   Please check your SPREADSHEET_ID and ensure you have access');
    return;
  }
  
  // Step 3: Check environment
  const environment = getConfigValue('ENVIRONMENT');
  if (!environment) {
    console.log('⚠️  Step 2: No environment set. Defaulting to development');
    setConfig('ENVIRONMENT', 'development');
  }
  console.log(`✅ Step 2: Environment: ${getConfigValue('ENVIRONMENT')}`);
  
  // Step 4: Show final config
  console.log('📋 Step 3: Current Configuration:');
  showConfig();
  
  console.log('\n🎉 Setup complete! Your configuration is ready.');
  console.log('💡 Available commands:');
  console.log('   - showConfig() - View current settings');
  console.log('   - validateConfiguration() - Test your setup');
  console.log('   - quickSetupDev("id") - Quick dev setup');
  console.log('   - quickSetupProd("id") - Quick prod setup');
}
