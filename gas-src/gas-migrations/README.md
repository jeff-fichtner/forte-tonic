# Gas Migrations

Google Apps Script migration system for Tonic spreadsheet data management.

## 🔐 SECURITY UPDATE

**GLOBAL CONFIGURATION - ONE PLACE FOR ALL SPREADSHEET IDS**

```javascript
// ✅ Configure once in Config.js - affects ALL migrations
var GLOBAL_SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE";

// All migrations automatically use the global configuration
runStructuralImprovements(); // Uses getSpreadsheetId()
runRealisticFakeDataMigration(); // Uses getSpreadsheetId()
validateConfiguration(); // Test your setup
```

## 🚀 Quick Start

1. **Get Spreadsheet ID** from your Google Sheets URL
2. **Open Google Sheets** → **Extensions** → **Apps Script**
3. **Copy ALL migration files** to your Apps Script project
4. **Configure ONCE**: Edit `Config.js` and replace `"YOUR_SPREADSHEET_ID_HERE"`
5. **Validate setup**: Run `validateConfiguration()` function
6. **Always run preview first**: `preview[MigrationName]()`
7. **Execute migration**: `run[MigrationName]()`
8. **Rollback if needed**: `rollback[MigrationName]()`

## 📁 Directory Structure

```
gas-migrations/
├── README.md                           # This file
├── TEMPLATE_Migration.js               # Template for new migrations
├── Migration001_StructuralImprovements.js  # Production ready
├── archive/                            # Completed/archived migrations
│   ├── Migration002_AddClassNamesToRegistration_ARCHIVED.js  # ⚠️ Not production ready
│   └── Migration003_ProcessParents_PROCESSED.js              # ✅ Processed successfully
└── dev/                               # Development-only migrations
    └── Migration_DEV001_RealisticFakeData.js  # Fake data replacement
```

## 🚀 Available Migrations

### Production Migrations
- **Migration001**: Structural Improvements ✅
  - Standardizes headers across all sheets
  - **Two StudentId options**: deprecate or delete completely
  - Adds data validation rules
  - Implements formatting improvements
  
  **StudentId Column Handling:**
  - `runStructuralImprovements()` - Marks StudentId as deprecated (safe)
  - `runStructuralImprovementsDeleteStudentId()` - **DELETES StudentId column entirely** (permanent)
  - Status: **Ready for production**

### Archived Migrations
- **Migration002**: Add Class Names to Registration ⚠️
  - Status: **NOT PRODUCTION READY** - Archived
  - Location: `archive/Migration002_AddClassNamesToRegistration_ARCHIVED.js`
  
- **Migration003**: Process Parents ✅
  - Status: **PROCESSED** - Completed and archived
  - Location: `archive/Migration003_ProcessParents_PROCESSED.js`

### Development Migrations
- **DEV001**: Realistic Fake Data Generation 🧪
  - Replaces "Teacher 1", "Parent 1" style fake data with realistic names
  - Maintains all relational integrity
  - Status: **Development only** - Never use in production
  - Location: `dev/Migration_DEV001_RealisticFakeData.js`

## 📋 How to Run Migrations

### 1. Setup Your Spreadsheet ID
In each migration file, replace the placeholder:
```javascript
// TODO: Replace with your actual spreadsheet ID
const spreadsheetId = "YOUR_SPREADSHEET_ID_HERE";
```

With your actual ID:
```javascript
const spreadsheetId = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";
```

### 2. Run Simple Functions
```javascript
// Preview first
previewStructuralImprovements();

// If preview looks good, execute
runStructuralImprovements();

// If you need to undo changes
rollbackStructuralImprovements();
```

### 3. Development Environment Validation
For development migrations, the system validates environment safety:
```javascript
// DEV migrations include environment checks
safeExecuteRealisticFakeDataMigration();
```

## ⚠️ **Important Safety Notes**

- **Always run `preview` first** to see what will change
- **Make a backup** of your spreadsheet before running (File → Make a copy)
- **Update spreadsheet ID** in the migration code
- **Test on a copy** if you're unsure about the changes

## 📋 **What Migration001 Does**

- Standardizes headers ("Last Name" → "LastName")
- Marks deprecated columns (StudentId → StudentId_DEPRECATED)
- Adds email validation to parent/instructor columns
- Adds grade dropdown validation (K, 1-12)
- Freezes header rows for better navigation
- Highlights duplicate IDs with red background

## 🛠️ Creating New Migrations

1. Copy `TEMPLATE_Migration.js`
2. Replace all `[PLACEHOLDER]` values:
   - `[MIGRATION_NUMBER]` → Migration number (e.g., "004")
   - `[MIGRATION_NAME]` → Descriptive name
   - `[MIGRATION_FUNCTION_NAME]` → CamelCase function name
   - `[MIGRATION_CLASS_NAME]` → Class name
   - `[MIGRATION_DESCRIPTION]` → What the migration does

3. Update the spreadsheet ID in all functions
4. Implement the three main methods:
   - `preview()` - Show what would change (read-only)
   - `execute()` - Perform the migration
   - `rollback()` - Undo the changes

5. Test thoroughly in development before production use

## 🔒 Security Features

- **Hardcoded Spreadsheet ID**: Prevents accidental execution on wrong sheets
- **Environment Validation**: DEV migrations check for production environments
- **Execution Blocking**: Archived migrations prevent re-execution
- **Preview Mode**: Always preview before executing

## 📚 Migration Guidelines

### Production Migrations
- Must have comprehensive preview functionality
- Must include rollback capability
- Must handle errors gracefully
- Must log all changes clearly

### Development Migrations
- Should include environment validation
- Should have safety checks
- Should never run in production
- Should generate realistic test data

### Archived Migrations
- **ARCHIVED**: Not production ready, moved to archive
- **PROCESSED**: Successfully completed, historical record only

## 🚨 Important Notes

1. **Always backup** your spreadsheet before running migrations
2. **Use preview first** to understand what will change
3. **Never run development migrations** in production
4. **Update spreadsheet ID** in migration code before running
5. **Test rollback functionality** in development

## 📞 Support

If you encounter issues:
1. Check the migration logs for error details
2. Use the rollback function if available
3. Restore from backup if needed
4. Review the migration preview before re-running
