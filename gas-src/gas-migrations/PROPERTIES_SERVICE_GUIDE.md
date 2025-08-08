# Simple Configuration Guide

This guide shows how to configure the spreadsheet ID for Google Apps Script migrations.

## Quick Setup

### Method 1: Edit the constant (Recommended)
1. Open `Config.js`
2. Find the line: `const SPREADSHEET_ID = "";`
3. Replace with your spreadsheet ID: `const SPREADSHEET_ID = "your-spreadsheet-id-here";`
4. Save and `clasp push`

### Method 2: Use Properties Service directly
If you prefer not to edit code:
```javascript
PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", "your-spreadsheet-id-here");
```

## How it works

1. **First priority**: Uses the `SPREADSHEET_ID` constant if it's set
2. **Second priority**: Checks Properties Service if constant is empty  
3. **Auto-save**: When using the constant, it automatically saves to Properties Service
4. **Error**: Throws error if neither is configured

## Backup Functions Available

The simplified config also includes basic backup functions:

- `createMigrationBackup(migrationName, sheetNames)` - Creates timestamped backup sheets
- `restoreFromBackup(migrationName)` - Restores from backup and cleans up

## That's it!

No complex setup, no environment management, just one simple spreadsheet ID configuration.
