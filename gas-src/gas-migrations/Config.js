/**
 * Global Configuration for Gas Migrations
 *
 * This file provides configuration management using Google Apps Script's Properties Service
 * for persistent storage, with fallback to hardcoded values for backward compatibility.
 *
 * IMPORTANT: In Google Apps Script, files are loaded in alphabetical order.
 * This file is named "Config.js" to ensure it loads before other migration files.
 *
 * Setup Instructions (Option 1 - Properties Service - RECOMMENDED):
 * 1. Run: setConfig("SPREADSHEET_ID", "your-actual-spreadsheet-id")
 * 2. Run: setConfig("ENVIRONMENT", "development") // or "production"
 * 3. All migration functions will automatically use these persistent settings
 *
 * Setup Instructions (Option 2 - Legacy hardcoded):
 * 1. Replace "YOUR_SPREADSHEET_ID_HERE" below with your actual spreadsheet ID
 * 2. All migration functions will use the hardcoded value
 *
 * Properties Service Benefits:
 * - Settings persist across deployments
 * - No need to edit code for different environments
 * - Secure storage of sensitive data
 * - Easy switching between development/production
 */

// ========================================
// CONFIGURATION SYSTEM
// ========================================

/**
 * Legacy fallback spreadsheet ID (used if Properties Service is not configured)
 * TODO: Replace with your actual spreadsheet ID if not using Properties Service
 */
var GLOBAL_SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

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
 * Get a configuration value from Properties Service with fallback
 * @param {string} key - Configuration key
 * @param {string} fallback - Fallback value if not found
 * @return {string} Configuration value
 */
function getConfigValue(key, fallback = null) {
  try {
    const value = PropertiesService.getScriptProperties().getProperty(key);
    return value !== null ? value : fallback;
  } catch (error) {
    console.warn(`⚠️  Failed to get config ${key}, using fallback:`, error.message);
    return fallback;
  }
}

/**
 * Utility function to get the configured spreadsheet ID
 * Uses Properties Service first, falls back to hardcoded value
 * All migrations should use this function to get the spreadsheet ID
 */
function getSpreadsheetId() {
  // Try Properties Service first
  let spreadsheetId = getConfigValue('SPREADSHEET_ID');
  
  // Fall back to hardcoded value
  if (!spreadsheetId) {
    spreadsheetId = GLOBAL_SPREADSHEET_ID;
  }
  
  // Validate we have a valid ID
  if (!spreadsheetId || spreadsheetId === 'YOUR_SPREADSHEET_ID_HERE') {
    const errorMsg = `❌ SPREADSHEET ID NOT CONFIGURED

Please choose one of these setup methods:

OPTION 1 (Recommended - Properties Service):
   setConfig("SPREADSHEET_ID", "your-actual-spreadsheet-id")

OPTION 2 (Legacy - Edit code):
   Edit Config.js and replace "YOUR_SPREADSHEET_ID_HERE" with your actual spreadsheet ID

Properties Service benefits:
- Settings persist across deployments
- No code changes needed for different environments
- More secure and flexible

Current status:
- Properties Service SPREADSHEET_ID: ${getConfigValue('SPREADSHEET_ID') || 'NOT SET'}
- Hardcoded fallback: ${GLOBAL_SPREADSHEET_ID}`;
    
    throw new Error(errorMsg);
  }
  
  return spreadsheetId;
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
 * Uses Properties Service configuration with fallback to spreadsheet name checking
 */
function validateDevelopmentEnvironment() {
  try {
    // Method 1: Check Properties Service environment setting
    const environment = getConfigValue('ENVIRONMENT');
    const debugMode = getConfigValue('DEBUG_MODE');
    
    if (environment) {
      const isDev = environment.toLowerCase() === 'development';
      const isDebug = debugMode && debugMode.toLowerCase() === 'true';
      
      if (isDev || isDebug) {
        console.log(`✅ Development environment validated via Properties Service (ENVIRONMENT=${environment}, DEBUG_MODE=${debugMode})`);
        return true;
      } else if (environment.toLowerCase() === 'production') {
        console.log('❌ PRODUCTION ENVIRONMENT SET IN PROPERTIES SERVICE');
        console.log(`Current settings: ENVIRONMENT=${environment}, DEBUG_MODE=${debugMode}`);
        console.log('Development migrations are blocked in production.');
        console.log('To enable development mode, run: setConfig("ENVIRONMENT", "development")');
        return false;
      }
    }
    
    // Method 2: Fallback to spreadsheet name checking (legacy method)
    console.log('⚠️  No ENVIRONMENT setting found in Properties Service, checking spreadsheet name...');
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
    
    console.log('\n📋 Fallback Configuration (hardcoded):');
    console.log(`   GLOBAL_SPREADSHEET_ID: ${GLOBAL_SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID_HERE' ? 'NOT SET' : GLOBAL_SPREADSHEET_ID.substring(0, 8) + '...'}`);
    
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
