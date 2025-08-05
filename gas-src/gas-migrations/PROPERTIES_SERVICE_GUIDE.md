# Google Apps Script Configuration with Properties Service

This Gas migration system uses **Properties Service ONLY** for configuration management. No more hardcoded values!

## 🚀 Quick Setup

### For Development
```javascript
quickSetupDev("your-spreadsheet-id-here")
```

### For Production  
```javascript
quickSetupProd("your-spreadsheet-id-here")
```

### Interactive Setup
```javascript
setupWizard()  // Guided setup process
```

## 📋 Essential Commands

| Command | Purpose |
|---------|---------|
| `setConfig("SPREADSHEET_ID", "your-id")` | Set spreadsheet ID |
| `setConfig("ENVIRONMENT", "development")` | Set environment |
| `showConfig()` | View current settings |
| `validateConfiguration()` | Test your setup |
| `clearAllConfig()` | Reset all settings |

## 🔄 Typical Workflow

### 1. Initial Setup (One Time)
```javascript
// Copy your spreadsheet ID from the URL
// https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit

quickSetupDev("1a2b3c4d5e6f7g8h9i0j")
```

### 2. Verify Setup
```javascript
validateConfiguration()  // Should show ✅ success
```

### 3. Run Migrations
```javascript
// All migrations automatically use your stored settings
runCompositeToUuidMigration()
runAllTablesToUuidMigration()
runRealisticFakeDataMigration()
```

### 4. Switch Environments
```javascript
// Switch to production (same code, different data)
setConfig("SPREADSHEET_ID", "production-spreadsheet-id")
setConfig("ENVIRONMENT", "production")

// Development migrations will be automatically blocked
```

## � Configuration Keys

| Key | Purpose | Example |
|-----|---------|---------|
| `SPREADSHEET_ID` | **Required** - Target spreadsheet | `"1a2b3c4d5e6f..."` |
| `ENVIRONMENT` | Environment type | `"development"` or `"production"` |
| `DEBUG_MODE` | Enable debug features | `"true"` or `"false"` |
| `BACKUP_RETENTION_DAYS` | Backup cleanup period | `"7"` |

## 🔒 Key Benefits

### ✅ **Persistent Across Deployments**
- Settings survive when you update your Apps Script code
- No need to edit configuration files after deployments
- Perfect for CI/CD workflows

### ✅ **Environment Safety**
- Development migrations automatically blocked in production
- Easy switching between development and production data
- No risk of running dev scripts on prod data

### ✅ **Secure Storage**  
- Sensitive data stored in Google's encrypted Properties Service
- Not visible in code or version control
- Access controlled by Apps Script permissions

### ✅ **Zero Code Changes**
- All existing migrations work without modifications
- No hardcoded values anywhere in the codebase
- Clean, maintainable configuration

## 🚨 Migration Protection

The system automatically prevents dangerous operations:

```javascript
// This will be BLOCKED if ENVIRONMENT=production
runRealisticFakeDataMigration()  // ❌ Blocked in production

// This works in any environment  
runCompositeToUuidMigration()    // ✅ Allowed
```

## 🔍 Troubleshooting

### Problem: "SPREADSHEET ID NOT CONFIGURED"
```javascript
// Solution: Set your spreadsheet ID
setConfig("SPREADSHEET_ID", "your-actual-spreadsheet-id")
```

### Problem: Cannot access spreadsheet
```javascript
// Check your configuration
validateConfiguration()

// Verify you have access to the spreadsheet
// Make sure the spreadsheet ID is correct
```

### Problem: Development migrations blocked
```javascript
// Check environment
showConfig()

// Enable development mode
setConfig("ENVIRONMENT", "development")
```

### Problem: Need to start over
```javascript
// Clear everything and restart
clearAllConfig()
quickSetupDev("your-spreadsheet-id")
```

## 🎯 Best Practices

### ✅ Always validate after setup
```javascript
quickSetupDev("your-id")
validateConfiguration()  // Verify it worked
```

### ✅ Use environment-specific spreadsheets
```javascript
// Development spreadsheet
quickSetupDev("dev-spreadsheet-id")

// Production spreadsheet  
quickSetupProd("prod-spreadsheet-id")
```

### ✅ Check configuration before major operations
```javascript
showConfig()  // See current settings
validateConfiguration()  // Test connectivity
```

### ✅ Set explicit environments
```javascript
// Be explicit about your environment
setConfig("ENVIRONMENT", "development")  // or "production"
```

This Properties Service configuration system gives you enterprise-level configuration management with zero complexity!
