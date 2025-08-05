/**
 * Google Apps Script Configuration Management using Properties Service
 * 
 * This utility provides a persistent configuration system that maintains
 * settings across script executions and deployments, similar to environment
 * variables but stored in Google's Properties Service.
 * 
 * Features:
 * - Persistent storage across script runs
 * - Survives code deployments
 * - Secure storage for sensitive data
 * - Easy configuration management
 * - Environment-specific settings
 * 
 * Usage:
 * 1. Set configuration once: setConfig('SPREADSHEET_ID', 'your-id-here')
 * 2. Use in migrations: const config = getConfig()
 * 3. Update as needed: updateConfig({ENVIRONMENT: 'development'})
 * 4. Clear when needed: clearConfig() or clearConfigKey('SPREADSHEET_ID')
 */

/**
 * Configuration keys used throughout the application
 */
const CONFIG_KEYS = {
  SPREADSHEET_ID: 'SPREADSHEET_ID',
  ENVIRONMENT: 'ENVIRONMENT',
  BACKUP_RETENTION_DAYS: 'BACKUP_RETENTION_DAYS',
  DEBUG_MODE: 'DEBUG_MODE',
  NOTIFICATION_EMAIL: 'NOTIFICATION_EMAIL',
  MIGRATION_LOG_LEVEL: 'MIGRATION_LOG_LEVEL'
};

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  [CONFIG_KEYS.ENVIRONMENT]: 'development',
  [CONFIG_KEYS.BACKUP_RETENTION_DAYS]: '7',
  [CONFIG_KEYS.DEBUG_MODE]: 'true',
  [CONFIG_KEYS.MIGRATION_LOG_LEVEL]: 'info'
};

/**
 * Set a single configuration value
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
 * Get a single configuration value
 * @param {string} key - Configuration key
 * @param {string} defaultValue - Default value if key not found
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
 * @return {Object} Configuration object
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
 * Initialize configuration with required values
 * Call this once to set up your environment
 */
function initializeConfig() {
  console.log('🔧 Initializing configuration...');
  
  const currentConfig = getConfig();
  
  // Check if SPREADSHEET_ID is set
  if (!currentConfig.SPREADSHEET_ID) {
    console.log('⚠️  SPREADSHEET_ID not set. Please set it manually:');
    console.log('   setConfig("SPREADSHEET_ID", "your-spreadsheet-id-here")');
    return false;
  }
  
  // Set any missing defaults
  const missingKeys = Object.keys(DEFAULT_CONFIG).filter(key => 
    !currentConfig[key] || currentConfig[key] === 'undefined'
  );
  
  if (missingKeys.length > 0) {
    const updates = {};
    missingKeys.forEach(key => {
      updates[key] = DEFAULT_CONFIG[key];
    });
    updateConfig(updates);
    console.log(`✅ Set default values for: ${missingKeys.join(', ')}`);
  }
  
  console.log('✅ Configuration initialized successfully');
  return true;
}

/**
 * Display current configuration (masks sensitive values)
 */
function showConfig() {
  console.log('📋 Current Configuration:');
  const config = getConfig();
  
  Object.keys(config).forEach(key => {
    let value = config[key];
    
    // Mask sensitive values
    if (key.includes('ID') && value && value.length > 10) {
      value = value.substring(0, 8) + '...' + value.substring(value.length - 4);
    }
    
    console.log(`   ${key}: ${value}`);
  });
}

/**
 * Clear a specific configuration key
 * @param {string} key - Configuration key to clear
 */
function clearConfigKey(key) {
  try {
    PropertiesService.getScriptProperties().deleteProperty(key);
    console.log(`✅ Cleared config key: ${key}`);
  } catch (error) {
    console.error(`❌ Failed to clear config key ${key}:`, error.message);
  }
}

/**
 * Clear all configuration (use with caution!)
 */
function clearConfig() {
  try {
    const properties = PropertiesService.getScriptProperties().getProperties();
    const keys = Object.keys(properties);
    
    keys.forEach(key => {
      PropertiesService.getScriptProperties().deleteProperty(key);
    });
    
    console.log(`✅ Cleared all configuration (${keys.length} keys removed)`);
  } catch (error) {
    console.error('❌ Failed to clear config:', error.message);
  }
}

/**
 * Get spreadsheet ID from configuration
 * @return {string} Spreadsheet ID
 */
function getSpreadsheetId() {
  const spreadsheetId = getConfigValue(CONFIG_KEYS.SPREADSHEET_ID);
  
  if (!spreadsheetId) {
    throw new Error('SPREADSHEET_ID not configured. Please run: setConfig("SPREADSHEET_ID", "your-id-here")');
  }
  
  return spreadsheetId;
}

/**
 * Get spreadsheet object from configuration
 * @return {GoogleAppsScript.Spreadsheet.Spreadsheet} Spreadsheet object
 */
function getSpreadsheet() {
  const spreadsheetId = getSpreadsheetId();
  
  try {
    return SpreadsheetApp.openById(spreadsheetId);
  } catch (error) {
    throw new Error(`Failed to open spreadsheet with ID: ${spreadsheetId}. Error: ${error.message}`);
  }
}

/**
 * Validate development environment based on configuration
 * @return {boolean} True if in development environment
 */
function validateDevelopmentEnvironment() {
  const environment = getConfigValue(CONFIG_KEYS.ENVIRONMENT, 'production');
  const debugMode = getConfigValue(CONFIG_KEYS.DEBUG_MODE, 'false');
  
  const isDev = environment.toLowerCase() === 'development' || debugMode.toLowerCase() === 'true';
  
  if (!isDev) {
    console.log(`❌ Environment check failed: ENVIRONMENT=${environment}, DEBUG_MODE=${debugMode}`);
    console.log('To enable development mode, run:');
    console.log('   setConfig("ENVIRONMENT", "development")');
    console.log('   or setConfig("DEBUG_MODE", "true")');
  }
  
  return isDev;
}

/**
 * Setup wizard for new users
 */
function setupWizard() {
  console.log('🧙‍♂️ Configuration Setup Wizard');
  console.log('================================');
  
  // Step 1: Get current config
  const currentConfig = getConfig();
  
  // Step 2: Check spreadsheet ID
  if (!currentConfig.SPREADSHEET_ID) {
    console.log('📋 Step 1: Set your Google Sheets Spreadsheet ID');
    console.log('   1. Open your Google Sheets document');
    console.log('   2. Copy the ID from the URL (the long string between /d/ and /edit)');
    console.log('   3. Run: setConfig("SPREADSHEET_ID", "your-spreadsheet-id-here")');
    console.log('   4. Then run setupWizard() again');
    return;
  }
  
  // Step 3: Verify spreadsheet access
  try {
    const spreadsheet = getSpreadsheet();
    console.log(`✅ Step 1: Spreadsheet access verified: "${spreadsheet.getName()}"`);
  } catch (error) {
    console.log(`❌ Step 1: Cannot access spreadsheet: ${error.message}`);
    console.log('   Please check your SPREADSHEET_ID and ensure you have access');
    return;
  }
  
  // Step 4: Set environment
  console.log('🏗️  Step 2: Environment Configuration');
  if (currentConfig.ENVIRONMENT !== 'development') {
    console.log('   Setting environment to development mode...');
    setConfig(CONFIG_KEYS.ENVIRONMENT, 'development');
  }
  console.log(`✅ Step 2: Environment set to: ${getConfigValue(CONFIG_KEYS.ENVIRONMENT)}`);
  
  // Step 5: Initialize defaults
  console.log('⚙️  Step 3: Initialize default settings...');
  initializeConfig();
  
  // Step 6: Show final configuration
  console.log('📋 Step 4: Final Configuration:');
  showConfig();
  
  console.log('\n🎉 Setup complete! Your configuration is ready to use.');
  console.log('💡 Pro tip: Run showConfig() anytime to view your current settings');
}

/**
 * Quick configuration functions for common scenarios
 */

// Set up for development with a specific spreadsheet
function quickSetupDev(spreadsheetId) {
  setConfig(CONFIG_KEYS.SPREADSHEET_ID, spreadsheetId);
  setConfig(CONFIG_KEYS.ENVIRONMENT, 'development');
  setConfig(CONFIG_KEYS.DEBUG_MODE, 'true');
  console.log('✅ Quick development setup complete');
}

// Set up for production
function quickSetupProd(spreadsheetId) {
  setConfig(CONFIG_KEYS.SPREADSHEET_ID, spreadsheetId);
  setConfig(CONFIG_KEYS.ENVIRONMENT, 'production');
  setConfig(CONFIG_KEYS.DEBUG_MODE, 'false');
  console.log('✅ Quick production setup complete');
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CONFIG_KEYS,
    setConfig,
    getConfigValue,
    getConfig,
    updateConfig,
    initializeConfig,
    showConfig,
    clearConfigKey,
    clearConfig,
    getSpreadsheetId,
    getSpreadsheet,
    validateDevelopmentEnvironment,
    setupWizard,
    quickSetupDev,
    quickSetupProd
  };
}
