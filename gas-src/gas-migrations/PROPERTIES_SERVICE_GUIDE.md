# Google Apps Script Properties Service Configuration

This enhanced configuration system uses Google Apps Script's Properties Service to store settings that persist across deployments and script executions.

## Quick Start

### Option 1: Quick Setup (Recommended)
```javascript
// For development
quickSetupDev("your-spreadsheet-id-here")

// For production  
quickSetupProd("your-spreadsheet-id-here")
```

### Option 2: Manual Setup
```javascript
// Set required configuration
setConfig("SPREADSHEET_ID", "your-spreadsheet-id-here")
setConfig("ENVIRONMENT", "development")  // or "production"

// Optional settings
setConfig("DEBUG_MODE", "true")
setConfig("BACKUP_RETENTION_DAYS", "7")
```

### Option 3: Setup Wizard
```javascript
setupWizard()  // Interactive setup guide
```

## Key Benefits

### 🔄 **Persistent Across Deployments**
- Settings survive when you update your Apps Script code
- No need to re-edit configuration files after each deployment
- Perfect for switching between development and production environments

### 🔒 **Secure Storage**
- Sensitive data like spreadsheet IDs stored securely
- Not visible in your code or version control
- Access controlled by Google Apps Script permissions

### 🏗️ **Environment Management**
```javascript
// Switch to development mode
setConfig("ENVIRONMENT", "development")

// Switch to production mode  
setConfig("ENVIRONMENT", "production")

// Development migrations will automatically be blocked in production
```

### 📊 **Easy Configuration Management**
```javascript
// View current settings
showConfig()

// Test your configuration
validateConfiguration()

// Clear all settings (use with caution)
clearAllConfig()
```

## Configuration Keys

| Key | Purpose | Example Values |
|-----|---------|----------------|
| `SPREADSHEET_ID` | Target Google Sheets ID | `"1a2b3c4d5e6f7g8h9i0j"` |
| `ENVIRONMENT` | Environment type | `"development"`, `"production"` |
| `DEBUG_MODE` | Enable debug features | `"true"`, `"false"` |
| `BACKUP_RETENTION_DAYS` | Backup cleanup | `"7"`, `"30"` |
| `NOTIFICATION_EMAIL` | Migration alerts | `"admin@example.com"` |

## Usage in Migrations

All existing migrations automatically work with this system:

```javascript
// This function now checks Properties Service first
const spreadsheetId = getSpreadsheetId();

// Environment validation uses Properties Service
if (!validateDevelopmentEnvironment()) {
  console.log('❌ Development migration blocked in production');
  return;
}
```

## Migration Workflows

### Development Workflow
```javascript
// One-time setup
quickSetupDev("your-dev-spreadsheet-id")

// Run development migrations
runRealisticFakeDataMigration()
runRebuildRegistrationAudit()
```

### Production Deployment
```javascript
// Switch to production (same code, different config)
quickSetupProd("your-production-spreadsheet-id")

// Run production migrations
runCompositeToUuidMigration()
runAllTablesToUuidMigration()
```

### Environment Switching
```javascript
// Check current environment
showConfig()

// Switch environments instantly
setConfig("ENVIRONMENT", "development")  // or "production"

// Development migrations will be automatically blocked/allowed
```

## Backward Compatibility

The system maintains full backward compatibility:

- ✅ Existing migrations work without changes
- ✅ Hardcoded `GLOBAL_SPREADSHEET_ID` still works as fallback
- ✅ No breaking changes to existing functions
- ✅ Gradual migration path available

## Troubleshooting

### Problem: "SPREADSHEET ID NOT CONFIGURED"
```javascript
// Solution: Set your spreadsheet ID
setConfig("SPREADSHEET_ID", "your-actual-spreadsheet-id")
```

### Problem: Development migrations blocked
```javascript
// Check environment
showConfig()

// Enable development mode
setConfig("ENVIRONMENT", "development")
```

### Problem: Cannot access spreadsheet
```javascript
// Verify configuration
validateConfiguration()

// Check if you have access to the spreadsheet
// Make sure the ID is correct
```

### Problem: Settings not persisting
```javascript
// Clear and reconfigure
clearAllConfig()
quickSetupDev("your-spreadsheet-id")
```

## Advanced Features

### Custom Configuration
```javascript
// Set custom values for your specific needs
setConfig("CUSTOM_SETTING", "my-value")
const customValue = getConfigValue("CUSTOM_SETTING", "default-value")
```

### Batch Configuration Updates
```javascript
// Update multiple settings at once
PropertiesService.getScriptProperties().setProperties({
  "SPREADSHEET_ID": "new-id",
  "ENVIRONMENT": "production",
  "DEBUG_MODE": "false"
})
```

### Configuration Validation
```javascript
// Built-in validation
validateConfiguration()

// Custom validation
const spreadsheetId = getConfigValue("SPREADSHEET_ID")
if (!spreadsheetId) {
  throw new Error("Spreadsheet ID required")
}
```

This Properties Service integration gives you the flexibility and persistence you need while maintaining all the existing functionality!
